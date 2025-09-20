from rest_framework import serializers
from .models import EPACategory, EPA, CoreCompetency, SubCompetency, SubCompetencyEPA

class EPACategorySerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source='program.name', read_only=True)
    epas_count = serializers.SerializerMethodField()
    
    class Meta:
        model = EPACategory
        fields = ['id', 'title', 'program', 'program_name', 'epas_count']
    
    def get_epas_count(self, obj):
        return obj.epas.count()

class EPASerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source='program.name', read_only=True)
    category_title = serializers.CharField(source='category.title', read_only=True)
    
    class Meta:
        model = EPA
        fields = [
            'id', 'code', 'title', 'description', 'is_active',
            'program', 'program_name', 'category', 'category_title'
        ]
        
    def validate(self, data):
        """Validate that EPA code is unique within the program"""
        code = data.get('code')
        program = data.get('program')
        
        # For create operations, check if EPA with same code exists in same program
        if self.instance is None:  # Creating new EPA
            if code and program:
                if EPA.objects.filter(code=code, program=program).exists():
                    raise serializers.ValidationError({
                        'code': f'EPA code "{code}" is already in use. Please choose a different code.'
                    })
        else:  # Updating existing EPA
            if code and program:
                existing = EPA.objects.filter(code=code, program=program).exclude(id=self.instance.id)
                if existing.exists():
                    raise serializers.ValidationError({
                        'code': f'EPA code "{code}" is already in use. Please choose a different code.'
                    })
        
        return data

class CoreCompetencySerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source='program.name', read_only=True)
    
    class Meta:
        model = CoreCompetency
        fields = ['id', 'code', 'title', 'program', 'program_name']

class SubCompetencySerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source='program.name', read_only=True)
    core_competency_title = serializers.CharField(source='core_competency.title', read_only=True)
    epas = serializers.SerializerMethodField()
    
    class Meta:
        model = SubCompetency
        fields = [
            'id', 'code', 'title', 'program', 'program_name',
            'core_competency', 'core_competency_title', 'epas',
            'milestone_level_1', 'milestone_level_2', 'milestone_level_3',
            'milestone_level_4', 'milestone_level_5'
        ]
    
    def get_epas(self, obj):
        return [{'id': epa.id, 'code': epa.code, 'title': epa.title} for epa in obj.epas.all()]


class SubCompetencyEPASerializer(serializers.ModelSerializer):
    sub_competency_code = serializers.CharField(source='sub_competency.code', read_only=True)
    sub_competency_title = serializers.CharField(source='sub_competency.title', read_only=True)
    epa_code = serializers.CharField(source='epa.code', read_only=True)
    epa_title = serializers.CharField(source='epa.title', read_only=True)
    program_name = serializers.CharField(source='sub_competency.program.name', read_only=True)
    
    class Meta:
        model = SubCompetencyEPA
        fields = [
            'id', 'sub_competency', 'sub_competency_code', 'sub_competency_title',
            'epa', 'epa_code', 'epa_title', 'program_name'
        ]
