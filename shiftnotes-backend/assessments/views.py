from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.http import JsonResponse
from .models import Assessment, AssessmentEPA
from .serializers import AssessmentSerializer, AssessmentCreateSerializer

class AssessmentViewSet(viewsets.ModelViewSet):
    queryset = Assessment.objects.all()
    serializer_class = AssessmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['trainee', 'evaluator', 'status', 'shift_date']
    ordering = ['-created_at']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Security: filter by user's organization and program
        if user.role == 'system-admin':
            # System admins can see all submitted assessments + their own drafts
            queryset = queryset.filter(
                Q(status='submitted') | Q(status='draft', evaluator=user)
            )
        elif not user.program:
            # No program = no assessments
            return Assessment.objects.none()
        elif user.role in ['admin', 'leadership']:
            # Admin/leadership see all submitted assessments in their program + their own drafts
            queryset = queryset.filter(
                trainee__program=user.program
            ).filter(
                Q(status='submitted') | Q(status='draft', evaluator=user)
            )
        else:
            # Faculty see submitted assessments they gave/received + their own drafts
            queryset = queryset.filter(
                Q(trainee=user) | Q(evaluator=user)
            ).filter(
                Q(status='submitted') | Q(status='draft', evaluator=user)
            )
        
        # Handle ID-based filtering (much more reliable)
        trainee_id = self.request.query_params.get('trainee_id')
        if trainee_id:
            queryset = queryset.filter(trainee_id=trainee_id)
        
        evaluator_id = self.request.query_params.get('evaluator_id')
        if evaluator_id:
            queryset = queryset.filter(evaluator_id=evaluator_id)
        
        epa_id = self.request.query_params.get('epa_id')
        if epa_id:
            queryset = queryset.filter(assessment_epas__epa_id=epa_id).distinct()
        
        return queryset

    def get_serializer_class(self):
        if self.action == 'create':
            return AssessmentCreateSerializer
        return AssessmentSerializer


    @action(detail=False, methods=['get'])
    def my_assessments(self, request):
        """Get assessments for the current user"""
        user = request.user
        
        # Get assessments where user is either trainee or evaluator
        assessments = Assessment.objects.filter(
            Q(trainee=user) | Q(evaluator=user)
        ).order_by('-created_at')
        
        serializer = self.get_serializer(assessments, many=True)
        return Response({
            'results': serializer.data,
            'count': assessments.count()
        })

    @action(detail=False, methods=['get'])
    def given_assessments(self, request):
        """Get assessments given by the current user"""
        user = request.user
        assessments = Assessment.objects.filter(evaluator=user).order_by('-created_at')
        serializer = self.get_serializer(assessments, many=True)
        return Response({
            'results': serializer.data,
            'count': assessments.count()
        })

    @action(detail=False, methods=['get'])
    def received_assessments(self, request):
        """Get assessments received by the current user"""
        user = request.user
        assessments = Assessment.objects.filter(trainee=user).order_by('-created_at')
        serializer = self.get_serializer(assessments, many=True)
        return Response({
            'results': serializer.data,
            'count': assessments.count()
        })

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """Acknowledge an assessment (for trainees)"""
        assessment = self.get_object()
        
        if assessment.trainee != request.user:
            return Response(
                {'detail': 'Only the trainee can acknowledge this assessment.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if assessment.acknowledged_at:
            return Response(
                {'detail': 'Assessment already acknowledged.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from django.utils import timezone
        # Note: acknowledged_by is now a ManyToManyField, keeping this for backward compatibility
        # but should be updated to use the new mailbox system
        assessment.acknowledged_by.add(request.user)
        assessment.save()
        
        serializer = self.get_serializer(assessment)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='mailbox')
    def mailbox(self, request):
        """Get assessments with private comments that haven't been read by current leadership user"""
        user = request.user
        
        # Only leadership can access mailbox
        if user.role not in ['leadership', 'admin', 'system-admin']:
            return Response(
                {'detail': 'Only leadership can access the mailbox.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get assessments with private comments that current user hasn't acknowledged
        assessments_queryset = Assessment.objects.filter(
            private_comments__isnull=False,
            private_comments__gt='',  # Has non-empty private comments
            status='submitted'  # Only submitted assessments
        ).exclude(
            acknowledged_by=user  # Exclude assessments already acknowledged by this user
        ).select_related(
            'trainee', 'evaluator'
        ).prefetch_related(
            'assessment_epas__epa'
        ).order_by('-created_at')
        
        # Filter by program if not system admin
        if user.role != 'system-admin' and user.program:
            assessments_queryset = assessments_queryset.filter(trainee__program=user.program)
        
        # Manual pagination implementation
        from django.core.paginator import Paginator
        page_number = request.GET.get('page', 1)
        page_size = int(request.GET.get('limit', 20))
        
        paginator = Paginator(assessments_queryset, page_size)
        page_obj = paginator.get_page(page_number)
        
        serializer = self.get_serializer(page_obj.object_list, many=True)
        
        # Build pagination URLs
        next_url = None
        previous_url = None
        if page_obj.has_next():
            next_url = f"{request.build_absolute_uri()}?page={page_obj.next_page_number()}&limit={page_size}"
        if page_obj.has_previous():
            previous_url = f"{request.build_absolute_uri()}?page={page_obj.previous_page_number()}&limit={page_size}"
        
        return Response({
            'results': serializer.data,
            'count': paginator.count,
            'unread_count': paginator.count,
            'next': next_url,
            'previous': previous_url
        })
    
    @action(detail=False, methods=['get'], url_path='mailbox/read')
    def mailbox_read(self, request):
        """Get assessments with private comments that have been read by current leadership user"""
        user = request.user
        
        # Only leadership can access mailbox
        if user.role not in ['leadership', 'admin', 'system-admin']:
            return Response(
                {'detail': 'Only leadership can access the mailbox.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get assessments with private comments that current user HAS acknowledged
        assessments_queryset = Assessment.objects.filter(
            private_comments__isnull=False,
            private_comments__gt='',  # Has non-empty private comments
            status='submitted',  # Only submitted assessments
            acknowledged_by=user  # Only assessments acknowledged by this user
        ).select_related(
            'trainee', 'evaluator'
        ).prefetch_related(
            'assessment_epas__epa'
        ).order_by('-created_at')
        
        # Filter by program if not system admin
        if user.role != 'system-admin' and user.program:
            assessments_queryset = assessments_queryset.filter(trainee__program=user.program)
        
        # Manual pagination implementation
        from django.core.paginator import Paginator
        page_number = request.GET.get('page', 1)
        page_size = int(request.GET.get('limit', 20))
        
        paginator = Paginator(assessments_queryset, page_size)
        page_obj = paginator.get_page(page_number)
        
        serializer = self.get_serializer(page_obj.object_list, many=True)
        
        # Build pagination URLs
        next_url = None
        previous_url = None
        if page_obj.has_next():
            next_url = f"{request.build_absolute_uri()}?page={page_obj.next_page_number()}&limit={page_size}"
        if page_obj.has_previous():
            previous_url = f"{request.build_absolute_uri()}?page={page_obj.previous_page_number()}&limit={page_size}"
        
        return Response({
            'results': serializer.data,
            'count': paginator.count,
            'read_count': paginator.count,
            'next': next_url,
            'previous': previous_url
        })
    
    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        """Mark an assessment as read (acknowledged) by current leadership user"""
        user = request.user
        assessment = self.get_object()
        
        # Only leadership can mark as read
        if user.role not in ['leadership', 'admin', 'system-admin']:
            return Response(
                {'detail': 'Only leadership can mark assessments as read.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Add current user to acknowledged_by
        assessment.acknowledged_by.add(user)
        
        return Response({'detail': 'Assessment marked as read.'})
    
    @action(detail=False, methods=['get'], url_path='mailbox/count')
    def mailbox_count(self, request):
        """Get count of unread assessments for current leadership user"""
        user = request.user
        
        # Only leadership can access mailbox count
        if user.role not in ['leadership', 'admin', 'system-admin']:
            return Response({'unread_count': 0})
        
        # Count assessments with private comments that current user hasn't acknowledged
        unread_count = Assessment.objects.filter(
            private_comments__isnull=False,
            private_comments__gt='',  # Has non-empty private comments
            status='submitted'  # Only submitted assessments
        ).exclude(
            acknowledged_by=user  # Exclude assessments already acknowledged by this user
        ).count()
        
        # Filter by program if not system admin
        if user.role != 'system-admin' and user.program:
            unread_count = Assessment.objects.filter(
                private_comments__isnull=False,
                private_comments__gt='',
                status='submitted',
                trainee__program=user.program
            ).exclude(acknowledged_by=user).count()
        
        return Response({'unread_count': unread_count})