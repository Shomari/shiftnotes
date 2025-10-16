from django.shortcuts import render
from django.db import IntegrityError
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from .models import EPACategory, EPA, CoreCompetency, SubCompetency, SubCompetencyEPA
from .serializers import EPACategorySerializer, EPASerializer, CoreCompetencySerializer, SubCompetencySerializer, SubCompetencyEPASerializer

# Custom pagination for EPA endpoint to handle more EPAs per program
class EPAPagination(PageNumberPagination):
    page_size = 50  # Allow up to 50 EPAs per page
    page_size_query_param = 'limit'
    max_page_size = 100

# Create your views here.

class EPACategoryViewSet(viewsets.ModelViewSet):
    queryset = EPACategory.objects.all()
    serializer_class = EPACategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['program']
    search_fields = ['title']
    ordering = ['title']
    
    def get_queryset(self):
        """Filter EPA categories to only show items from the user's program"""
        # All users only see EPA categories from their program
        if self.request.user.program:
            return EPACategory.objects.filter(program=self.request.user.program)
        
        # If no program, return empty queryset
        return EPACategory.objects.none()

class EPAViewSet(viewsets.ModelViewSet):
    queryset = EPA.objects.all()
    serializer_class = EPASerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['program', 'category', 'is_active']
    search_fields = ['code', 'title', 'description']
    ordering = ['code']
    pagination_class = EPAPagination  # Use custom pagination for larger EPA sets
    
    def get_queryset(self):
        """Filter EPAs to only show items from the user's program"""
        # All users only see EPAs from their program
        if self.request.user.program:
            return EPA.objects.filter(program=self.request.user.program)
        
        # If no program, return empty queryset
        return EPA.objects.none()
    
    def destroy(self, request, *args, **kwargs):
        """Override delete to prevent deletion if EPA has been used in assessments"""
        epa = self.get_object()
        
        # Check if EPA has been used in any assessments
        from assessments.models import AssessmentEPA
        assessment_count = AssessmentEPA.objects.filter(epa=epa).count()
        
        if assessment_count > 0:
            return Response(
                {'error': f'Cannot delete this EPA: It has been used in {assessment_count} assessment(s).'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # If no assessments use this EPA, allow deletion
        return super().destroy(request, *args, **kwargs)

class CoreCompetencyViewSet(viewsets.ModelViewSet):
    queryset = CoreCompetency.objects.all()
    serializer_class = CoreCompetencySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['program']
    search_fields = ['code', 'title']
    ordering = ['code']
    
    def get_queryset(self):
        """Filter core competencies to only show items from the user's program"""
        # All users only see core competencies from their program
        if self.request.user.program:
            return CoreCompetency.objects.filter(program=self.request.user.program)
        
        # If no program, return empty queryset
        return CoreCompetency.objects.none()

class SubCompetencyViewSet(viewsets.ModelViewSet):
    queryset = SubCompetency.objects.all()
    serializer_class = SubCompetencySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['program', 'core_competency']
    search_fields = ['code', 'title']
    ordering = ['code']
    
    def get_queryset(self):
        """Filter sub-competencies to only show items from the user's program"""
        # All users only see sub-competencies from their program
        if self.request.user.program:
            return SubCompetency.objects.filter(program=self.request.user.program)
        
        # If no program, return empty queryset
        return SubCompetency.objects.none()

class SubCompetencyEPAViewSet(viewsets.ModelViewSet):
    queryset = SubCompetencyEPA.objects.all()
    serializer_class = SubCompetencyEPASerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['sub_competency', 'epa', 'sub_competency__program']
    search_fields = ['sub_competency__code', 'sub_competency__title', 'epa__code', 'epa__title']
    ordering = ['sub_competency__code', 'epa__code']
    
    def get_queryset(self):
        """Filter sub-competency-EPA relationships to only show items from the user's program"""
        # All users only see relationships from their program
        if self.request.user.program:
            return SubCompetencyEPA.objects.filter(sub_competency__program=self.request.user.program)
        
        # If no program, return empty queryset
        return SubCompetencyEPA.objects.none()
