from django.shortcuts import render
from django.db import IntegrityError
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import EPACategory, EPA, CoreCompetency, SubCompetency, SubCompetencyEPA
from .serializers import EPACategorySerializer, EPASerializer, CoreCompetencySerializer, SubCompetencySerializer, SubCompetencyEPASerializer

# Create your views here.

class EPACategoryViewSet(viewsets.ModelViewSet):
    queryset = EPACategory.objects.all()
    serializer_class = EPACategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['program']
    search_fields = ['title']
    ordering = ['title']

class EPAViewSet(viewsets.ModelViewSet):
    queryset = EPA.objects.all()
    serializer_class = EPASerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['program', 'category', 'is_active']
    search_fields = ['code', 'title', 'description']
    ordering = ['code']
    
    # Clean ViewSet - validation is handled by the serializer

class CoreCompetencyViewSet(viewsets.ModelViewSet):
    queryset = CoreCompetency.objects.all()
    serializer_class = CoreCompetencySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['program']
    search_fields = ['code', 'title']
    ordering = ['code']

class SubCompetencyViewSet(viewsets.ModelViewSet):
    queryset = SubCompetency.objects.all()
    serializer_class = SubCompetencySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['program', 'core_competency']
    search_fields = ['code', 'title']
    ordering = ['code']

class SubCompetencyEPAViewSet(viewsets.ModelViewSet):
    queryset = SubCompetencyEPA.objects.all()
    serializer_class = SubCompetencyEPASerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['sub_competency', 'epa', 'sub_competency__program']
    search_fields = ['sub_competency__code', 'sub_competency__title', 'epa__code', 'epa__title']
    ordering = ['sub_competency__code', 'epa__code']
