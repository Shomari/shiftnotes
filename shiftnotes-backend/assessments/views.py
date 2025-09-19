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

    def get_serializer_class(self):
        if self.action == 'create':
            return AssessmentCreateSerializer
        return AssessmentSerializer

    def get_queryset(self):
        user = self.request.user
        
        # System admins can see all assessments
        if user.role == 'system-admin':
            queryset = Assessment.objects.all()
        elif not user.program:
            # All other users need a program
            queryset = Assessment.objects.none()
        elif user.role in ['admin', 'leadership']:
            # Admins and leadership can see all assessments in their program
            queryset = Assessment.objects.filter(
                Q(trainee__program=user.program) | 
                Q(evaluator__program=user.program)
            ).distinct()
        else:
            # Faculty and trainees can see assessments they gave or received
            queryset = Assessment.objects.filter(
                Q(trainee=user) | Q(evaluator=user)
            ).distinct()
        
        # Apply date range filtering if provided
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(shift_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(shift_date__lte=end_date)
        
        return queryset

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
        assessments = Assessment.objects.filter(
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
            assessments = assessments.filter(trainee__program=user.program)
        
        serializer = self.get_serializer(assessments, many=True)
        return Response({
            'results': serializer.data,
            'count': assessments.count(),
            'unread_count': assessments.count()
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