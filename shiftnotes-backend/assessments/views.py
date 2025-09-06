from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
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
        # Users can see assessments they gave or received
        return Assessment.objects.filter(
            Q(trainee=user) | Q(evaluator=user)
        ).distinct()

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
        assessment.acknowledged_at = timezone.now()
        assessment.acknowledged_by = request.user
        assessment.save()
        
        serializer = self.get_serializer(assessment)
        return Response(serializer.data)