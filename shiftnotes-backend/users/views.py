from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from .models import User, Cohort, LoginAttempt
from .serializers import UserSerializer, UserCreateSerializer, CohortSerializer
from .email_service import EmailService
from .lockout import check_login_attempts, record_failed_attempt, reset_login_attempts
from .authentication import clear_session_activity
import logging

logger = logging.getLogger(__name__)


def get_client_ip(request):
    """
    Get the client's IP address from the request.
    Handles proxy forwarding headers.
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

# Create your views here.

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['role', 'program', 'department']
    search_fields = ['name', 'email']
    ordering_fields = ['name', 'created_at', 'email']
    ordering = ['name']
    pagination_class = None  # Disable pagination to return all users
    
    def get_queryset(self):
        """Filter users by the requesting user's program"""
        # All users only see users from their program
        if self.request.user.program:
            return User.objects.filter(program=self.request.user.program)
        
        # If no program, return empty queryset
        return User.objects.none()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer
    
    def perform_create(self, serializer):
        """Override to send welcome email after user creation"""
        user = serializer.save()
        
        # Send welcome email to newly created user
        try:
            email_sent = EmailService.send_welcome_email(user, self.request)
            if email_sent:
                logger.info(f"Welcome email sent to new user: {user.email}")
            else:
                logger.warning(f"Failed to send welcome email to: {user.email}")
        except Exception as e:
            logger.error(f"Error sending welcome email to {user.email}: {str(e)}")
            # Don't fail user creation if email fails
        
        return user
    
    @action(detail=False, methods=['post'], permission_classes=[])
    def login(self, request):
        """
        Authenticate user with email and password.
        
        Implements security requirements:
        - AU-13: Account lockout after 5 failed attempts
        - AU-14: Login attempt logging for audit
        """
        email = request.data.get('email')
        password = request.data.get('password')
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]  # Limit length
        
        if not email or not password:
            return Response(
                {'error': 'Email and password required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if account is locked out (AU-13)
        allowed, lockout_message = check_login_attempts(email)
        if not allowed:
            # Log the lockout attempt
            LoginAttempt.objects.create(
                email=email,
                user=None,
                success=False,
                ip_address=ip_address,
                user_agent=user_agent,
                failure_reason='Account locked out'
            )
            logger.warning(f"Blocked login attempt for locked account: {email} from {ip_address}")
            return Response(
                {'error': lockout_message},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        # Attempt authentication
        user = authenticate(email=email, password=password)
        
        if user:
            # Check if user is deactivated
            if hasattr(user, 'deactivated_at') and user.deactivated_at is not None:
                LoginAttempt.objects.create(
                    email=email,
                    user=user,
                    success=False,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    failure_reason='Account deactivated'
                )
                logger.warning(f"Login attempt for deactivated account: {email} from {ip_address}")
                return Response(
                    {'error': 'Account has been deactivated. Please contact your administrator.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Successful login
            reset_login_attempts(email)  # Reset lockout counter
            token, created = Token.objects.get_or_create(user=user)
            
            # Log successful login (AU-14)
            LoginAttempt.objects.create(
                email=email,
                user=user,
                success=True,
                ip_address=ip_address,
                user_agent=user_agent
            )
            logger.info(f"Successful login: {email} from {ip_address}")
            
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data
            })
        else:
            # Failed login - record attempt and check remaining
            attempts_warning = record_failed_attempt(email)
            
            # Log failed login (AU-14)
            LoginAttempt.objects.create(
                email=email,
                user=None,
                success=False,
                ip_address=ip_address,
                user_agent=user_agent,
                failure_reason='Invalid credentials'
            )
            logger.warning(f"Failed login attempt: {email} from {ip_address}")
            
            return Response(
                {
                    'error': 'Invalid credentials',
                    'attempts_warning': attempts_warning
                },
                status=status.HTTP_401_UNAUTHORIZED
            )
    
    @action(detail=False, methods=['post'])
    def logout(self, request):
        """
        Log out the user by deleting their auth token.
        Also clears the session activity cache for clean session management.
        """
        try:
            token_key = request.user.auth_token.key
            clear_session_activity(token_key)  # Clear session timeout tracking
            request.user.auth_token.delete()
            logger.info(f"User logged out: {request.user.email}")
            return Response({'message': 'Logged out successfully'})
        except Exception as e:
            logger.error(f"Error during logout for {request.user.email}: {str(e)}")
            return Response({'error': 'Error logging out'})
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        return Response(UserSerializer(request.user).data)
    
    @action(detail=False, methods=['get'])
    def trainees(self, request):
        """Get trainee users from the requesting user's program"""
        # Get the requesting user's program
        if not request.user.program:
            # If user has no program, return empty result
            return Response({
                'results': [],
                'count': 0
            })
        
        # Get trainees from the same program
        trainees = User.objects.filter(
            role='trainee',
            program=request.user.program
        )
        
        serializer = UserSerializer(trainees, many=True)
        return Response({
            'results': serializer.data,
            'count': trainees.count()
        })
    
    @action(detail=False, methods=['get'])
    def faculty(self, request):
        """Get faculty and leadership users from the requesting user's program"""
        # Get the requesting user's program
        if not request.user.program:
            # If user has no program, return empty result
            return Response({
                'results': [],
                'count': 0
            })
        
        # Get faculty and leadership from the same program
        faculty = User.objects.filter(
            role__in=['faculty', 'leadership'],
            program=request.user.program
        )
        
        serializer = UserSerializer(faculty, many=True)
        return Response({
            'results': serializer.data,
            'count': faculty.count()
        })

class CohortViewSet(viewsets.ModelViewSet):
    queryset = Cohort.objects.all()
    serializer_class = CohortSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['program']
    ordering = ['-start_date']
    
    def get_queryset(self):
        """Filter cohorts by the requesting user's program"""
        # All users only see cohorts from their program
        if self.request.user.program:
            return Cohort.objects.filter(program=self.request.user.program)
        
        # If no program, return empty queryset
        return Cohort.objects.none()
    
    @action(detail=True, methods=['get'])
    def users(self, request, pk=None):
        """Get all users (trainees) for a specific cohort"""
        cohort = self.get_object()
        
        # Get users for this cohort, filtered by program for security
        users = User.objects.filter(
            cohort=cohort,
            program=request.user.program  # Security: only users from same program
        ).order_by('name')
        
        serializer = UserSerializer(users, many=True)
        return Response({
            'results': serializer.data,
            'count': users.count(),
            'cohort': CohortSerializer(cohort).data
        })