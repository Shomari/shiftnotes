from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.http import JsonResponse
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from django.utils import timezone
from datetime import datetime, timedelta
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
        
        # Security: filter by user's program
        if not user.program:
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
            # Faculty/trainees see submitted assessments they gave/received + their own drafts
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
        
        # Handle date filtering
        start_date_str = self.request.query_params.get('start_date')
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                queryset = queryset.filter(shift_date__gte=start_date)
            except ValueError:
                pass  # Ignore invalid date format
        
        end_date_str = self.request.query_params.get('end_date')
        if end_date_str:
            try:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                queryset = queryset.filter(shift_date__lte=end_date)
            except ValueError:
                pass  # Ignore invalid date format
        
        return queryset

    def get_serializer_class(self):
        if self.action == 'create':
            return AssessmentCreateSerializer
        return AssessmentSerializer

    def destroy(self, request, *args, **kwargs):
        """
        Delete an assessment with validation:
        - Only the evaluator (creator) can delete their own assessment
        - Assessment must be less than 7 days old
        """
        assessment = self.get_object()
        user = request.user
        
        # Check if user is the evaluator
        if assessment.evaluator != user:
            return Response(
                {
                    'detail': 'You can only delete assessments you created.',
                    'error_code': 'not_evaluator'
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if assessment is less than 7 days old
        assessment_age = timezone.now() - assessment.created_at
        max_age_days = 7
        
        if assessment_age > timedelta(days=max_age_days):
            days_old = assessment_age.days
            return Response(
                {
                    'detail': f'Cannot delete assessment. It is {days_old} days old. Only assessments less than {max_age_days} days old can be deleted.',
                    'error_code': 'too_old',
                    'days_old': days_old,
                    'max_age_days': max_age_days
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        # All checks passed, delete the assessment
        assessment_id = str(assessment.id)
        trainee_name = assessment.trainee.name
        
        # Perform the deletion
        self.perform_destroy(assessment)
        
        return Response(
            {
                'detail': f'Assessment for {trainee_name} deleted successfully.',
                'deleted_id': assessment_id
            },
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'])
    def my_assessments(self, request):
        """Get assessments for the current user with pagination support"""
        user = request.user
        
        # Get assessments where user is either trainee or evaluator
        assessments_queryset = Assessment.objects.filter(
            Q(trainee=user) | Q(evaluator=user)
        )
        
        # Apply ID-based filters
        trainee_id = request.GET.get('trainee_id')
        evaluator_id = request.GET.get('evaluator_id')
        epa_id = request.GET.get('epa_id')
        
        if trainee_id:
            assessments_queryset = assessments_queryset.filter(trainee_id=trainee_id)
        
        if evaluator_id:
            assessments_queryset = assessments_queryset.filter(evaluator_id=evaluator_id)
            
        if epa_id:
            assessments_queryset = assessments_queryset.filter(assessment_epas__epa_id=epa_id)
        
        # Apply date filters if provided
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                assessments_queryset = assessments_queryset.filter(shift_date__gte=start_date)
            except ValueError:
                pass
                
        if end_date_str:
            try:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                assessments_queryset = assessments_queryset.filter(shift_date__lte=end_date)
            except ValueError:
                pass
        
        assessments_queryset = assessments_queryset.order_by('-created_at')
        
        # Manual pagination
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('limit', 20))
        
        paginator = Paginator(assessments_queryset, page_size)
        try:
            assessments_page = paginator.page(page)
        except PageNotAnInteger:
            assessments_page = paginator.page(1)
        except EmptyPage:
            assessments_page = paginator.page(paginator.num_pages)
        
        # Build URLs for pagination
        request_url = request.build_absolute_uri().split('?')[0]
        query_params = request.GET.copy()
        
        next_url = None
        if assessments_page.has_next():
            query_params['page'] = assessments_page.next_page_number()
            next_url = f"{request_url}?{query_params.urlencode()}"
            
        previous_url = None
        if assessments_page.has_previous():
            query_params['page'] = assessments_page.previous_page_number()
            previous_url = f"{request_url}?{query_params.urlencode()}"
        
        serializer = self.get_serializer(assessments_page.object_list, many=True)
        return Response({
            'results': serializer.data,
            'count': paginator.count,
            'next': next_url,
            'previous': previous_url,
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
        """Get assessments received by the current user with pagination support"""
        user = request.user
        
        assessments_queryset = Assessment.objects.filter(trainee=user)
        
        # Apply ID-based filters
        trainee_id = request.GET.get('trainee_id')
        evaluator_id = request.GET.get('evaluator_id')
        epa_id = request.GET.get('epa_id')
        
        if trainee_id:
            assessments_queryset = assessments_queryset.filter(trainee_id=trainee_id)
        
        if evaluator_id:
            assessments_queryset = assessments_queryset.filter(evaluator_id=evaluator_id)
            
        if epa_id:
            assessments_queryset = assessments_queryset.filter(assessment_epas__epa_id=epa_id)
        
        # Apply date filters if provided
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                assessments_queryset = assessments_queryset.filter(shift_date__gte=start_date)
            except ValueError:
                pass
                
        if end_date_str:
            try:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                assessments_queryset = assessments_queryset.filter(shift_date__lte=end_date)
            except ValueError:
                pass
        
        assessments_queryset = assessments_queryset.order_by('-created_at')
        
        # Manual pagination
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('limit', 20))
        
        paginator = Paginator(assessments_queryset, page_size)
        try:
            assessments_page = paginator.page(page)
        except PageNotAnInteger:
            assessments_page = paginator.page(1)
        except EmptyPage:
            assessments_page = paginator.page(paginator.num_pages)
        
        # Build URLs for pagination
        request_url = request.build_absolute_uri().split('?')[0]
        query_params = request.GET.copy()
        
        next_url = None
        if assessments_page.has_next():
            query_params['page'] = assessments_page.next_page_number()
            next_url = f"{request_url}?{query_params.urlencode()}"
            
        previous_url = None
        if assessments_page.has_previous():
            query_params['page'] = assessments_page.previous_page_number()
            previous_url = f"{request_url}?{query_params.urlencode()}"
        
        serializer = self.get_serializer(assessments_page.object_list, many=True)
        return Response({
            'results': serializer.data,
            'count': paginator.count,
            'next': next_url,
            'previous': previous_url,
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
        
        # Only leadership and admins can access mailbox
        if user.role not in ['leadership', 'admin']:
            return Response(
                {'detail': 'Only leadership and admins can access the mailbox.'},
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
        
        # Filter by program
        if user.program:
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
        
        # Only leadership and admins can access mailbox
        if user.role not in ['leadership', 'admin']:
            return Response(
                {'detail': 'Only leadership and admins can access the mailbox.'},
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
        
        # Filter by program
        if user.program:
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
        
        # Only leadership and admins can mark as read
        if user.role not in ['leadership', 'admin']:
            return Response(
                {'detail': 'Only leadership and admins can mark assessments as read.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Add current user to acknowledged_by
        assessment.acknowledged_by.add(user)
        
        return Response({'detail': 'Assessment marked as read.'})
    
    @action(detail=False, methods=['get'], url_path='mailbox/count')
    def mailbox_count(self, request):
        """Get count of unread assessments for current leadership user"""
        user = request.user
        
        # Only leadership and admins can access mailbox count
        if user.role not in ['leadership', 'admin']:
            return Response({'unread_count': 0})
        
        # Count assessments with private comments that current user hasn't acknowledged
        unread_count = Assessment.objects.filter(
            private_comments__isnull=False,
            private_comments__gt='',  # Has non-empty private comments
            status='submitted'  # Only submitted assessments
        ).exclude(
            acknowledged_by=user  # Exclude assessments already acknowledged by this user
        ).count()
        
        # Filter by program
        if user.program:
            unread_count = Assessment.objects.filter(
                private_comments__isnull=False,
                private_comments__gt='',
                status='submitted',
                trainee__program=user.program
            ).exclude(acknowledged_by=user).count()
        
        return Response({'unread_count': unread_count})