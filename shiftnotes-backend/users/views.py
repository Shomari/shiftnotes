from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from .models import User, Cohort
from .serializers import UserSerializer, UserCreateSerializer, CohortSerializer
from .email_service import EmailService
import logging

logger = logging.getLogger(__name__)

# Create your views here.

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['role', 'organization', 'department']
    search_fields = ['name', 'email']
    ordering_fields = ['name', 'created_at', 'email']
    ordering = ['name']
    
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
        email = request.data.get('email')
        password = request.data.get('password')
        
        if email and password:
            user = authenticate(email=email, password=password)
            if user:
                token, created = Token.objects.get_or_create(user=user)
                return Response({
                    'token': token.key,
                    'user': UserSerializer(user).data
                })
        
        return Response(
            {'error': 'Invalid credentials'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    @action(detail=False, methods=['post'])
    def logout(self, request):
        try:
            request.user.auth_token.delete()
            return Response({'message': 'Logged out successfully'})
        except:
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

class CohortViewSet(viewsets.ModelViewSet):
    queryset = Cohort.objects.all()
    serializer_class = CohortSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['org', 'program']
    ordering = ['-start_date']
