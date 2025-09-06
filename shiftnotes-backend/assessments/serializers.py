from rest_framework import serializers
from .models import Assessment, AssessmentEPA
from users.serializers import UserSerializer
from curriculum.serializers import EPASerializer

class AssessmentEPASerializer(serializers.ModelSerializer):
    epa_code = serializers.CharField(source='epa.code', read_only=True)
    epa_title = serializers.CharField(source='epa.title', read_only=True)
    epa_category = serializers.CharField(source='epa.category.title', read_only=True)

    class Meta:
        model = AssessmentEPA
        fields = [
            'id', 'epa', 'epa_code', 'epa_title', 'epa_category',
            'entrustment_level', 'what_went_well', 'what_could_improve', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class AssessmentSerializer(serializers.ModelSerializer):
    trainee_name = serializers.CharField(source='trainee.name', read_only=True)
    evaluator_name = serializers.CharField(source='evaluator.name', read_only=True)
    assessment_epas = AssessmentEPASerializer(many=True, read_only=True)
    epa_count = serializers.SerializerMethodField()
    average_entrustment = serializers.SerializerMethodField()

    class Meta:
        model = Assessment
        fields = [
            'id', 'trainee', 'trainee_name', 'evaluator', 'evaluator_name',
            'shift_date', 'location', 'status', 'private_comments',
            'acknowledged_at', 'acknowledged_by', 'created_at', 'updated_at',
            'assessment_epas', 'epa_count', 'average_entrustment'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'acknowledged_at']

    def get_epa_count(self, obj):
        return obj.assessment_epas.count()

    def get_average_entrustment(self, obj):
        epas = obj.assessment_epas.all()
        if not epas.exists():
            return None
        return sum(epa.entrustment_level for epa in epas) / epas.count()

class AssessmentCreateSerializer(serializers.ModelSerializer):
    assessment_epas = AssessmentEPASerializer(many=True)

    class Meta:
        model = Assessment
        fields = [
            'trainee', 'evaluator', 'shift_date', 'location', 'status',
            'private_comments', 'assessment_epas'
        ]

    def create(self, validated_data):
        assessment_epas_data = validated_data.pop('assessment_epas')
        assessment = Assessment.objects.create(**validated_data)
        
        for epa_data in assessment_epas_data:
            AssessmentEPA.objects.create(assessment=assessment, **epa_data)
        
        return assessment
