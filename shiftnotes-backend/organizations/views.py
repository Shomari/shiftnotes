from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Organization, Program, Site
from .serializers import OrganizationSerializer, ProgramSerializer, SiteSerializer

class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['name']
    ordering = ['name']
    
    def get_queryset(self):
        """Filter organizations to only show the user's organization"""
        # All users only see their own organization
        if self.request.user.organization:
            return Organization.objects.filter(id=self.request.user.organization.id)
        
        # If no organization, return empty queryset
        return Organization.objects.none()

class ProgramViewSet(viewsets.ModelViewSet):
    queryset = Program.objects.all()
    serializer_class = ProgramSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['org', 'specialty']
    search_fields = ['name', 'specialty']
    ordering = ['name']
    
    def get_queryset(self):
        """Filter programs to only show the user's program"""
        # All users only see their own program
        if self.request.user.program:
            return Program.objects.filter(id=self.request.user.program.id)
        
        # If no program, return empty queryset
        return Program.objects.none()

class SiteViewSet(viewsets.ModelViewSet):
    queryset = Site.objects.all()
    serializer_class = SiteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['org', 'program']
    ordering = ['name']
    
    def get_queryset(self):
        """Filter sites to only show sites from the user's program"""
        # All users only see sites from their program
        if self.request.user.program:
            return Site.objects.filter(program=self.request.user.program)
        
        # If no program, return empty queryset
        return Site.objects.none()
