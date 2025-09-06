from rest_framework import serializers
from .models import Organization, Program, Site

class OrganizationSerializer(serializers.ModelSerializer):
    programs_count = serializers.SerializerMethodField()
    users_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Organization
        fields = ['id', 'name', 'slug', 'address_line1', 'created_at', 'programs_count', 'users_count']
        read_only_fields = ['id', 'created_at']
    
    def get_programs_count(self, obj):
        return obj.programs.count()
    
    def get_users_count(self, obj):
        return obj.users.count()

class ProgramSerializer(serializers.ModelSerializer):
    org_name = serializers.CharField(source='org.name', read_only=True)
    director_name = serializers.CharField(source='director_user.name', read_only=True)
    coordinator_name = serializers.CharField(source='coordinator_user.name', read_only=True)
    
    class Meta:
        model = Program
        fields = [
            'id', 'name', 'abbreviation', 'specialty', 'acgme_id',
            'org', 'org_name', 'director_user', 'director_name', 
            'coordinator_user', 'coordinator_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class SiteSerializer(serializers.ModelSerializer):
    org_name = serializers.CharField(source='org.name', read_only=True)
    program_name = serializers.CharField(source='program.name', read_only=True)
    
    class Meta:
        model = Site
        fields = ['id', 'name', 'org', 'org_name', 'program', 'program_name']
