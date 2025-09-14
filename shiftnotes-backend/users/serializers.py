from rest_framework import serializers
from .models import User, Cohort

class UserSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    program_name = serializers.CharField(source='program.name', read_only=True)
    program_abbreviation = serializers.CharField(source='program.abbreviation', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'name', 'role', 'organization', 'organization_name',
            'program', 'program_name', 'program_abbreviation', 'department', 
            'start_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['email', 'name', 'role', 'organization', 'department', 'password']
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

class CohortSerializer(serializers.ModelSerializer):
    org_name = serializers.CharField(source='org.name', read_only=True)
    program_name = serializers.CharField(source='program.name', read_only=True)
    
    class Meta:
        model = Cohort
        fields = [
            'id', 'name', 'start_date', 'end_date', 
            'org', 'org_name', 'program', 'program_name'
        ]
