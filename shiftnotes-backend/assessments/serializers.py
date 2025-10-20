from rest_framework import serializers
from .models import Assessment, AssessmentEPA
from users.serializers import UserSerializer
from curriculum.serializers import EPASerializer

class AssessmentEPASerializer(serializers.ModelSerializer):
    epa_code = serializers.CharField(source='epa.code', read_only=True)
    epa_title = serializers.CharField(source='epa.title', read_only=True)
    epa_category = serializers.CharField(source='epa.category.title', read_only=True)
    entrustment_level_description = serializers.SerializerMethodField()

    class Meta:
        model = AssessmentEPA
        fields = [
            'id', 'epa', 'epa_code', 'epa_title', 'epa_category',
            'entrustment_level', 'entrustment_level_description', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_entrustment_level_description(self, obj):
        """Always use generic entrustment level descriptions for consistency"""
        # Use consistent generic descriptions across all EPAs
        generic_descriptions = {
            1: "I had to do it (Requires constant direct supervision and myself or others' hands-on action for completion)",
            2: "I helped a lot (Requires considerable direct supervision and myself or others' guidance for completion)",
            3: "I helped a little (Requires minimal direct supervision or guidance from myself or others for completion)",
            4: "I needed to be there but did not help (Requires indirect supervision and no guidance by myself or others)",
            5: "I didn't need to be there at all (Does not require any supervision or guidance by myself or others)"
        }
        return generic_descriptions.get(obj.entrustment_level, "Unknown level")

class AssessmentSerializer(serializers.ModelSerializer):
    trainee_name = serializers.CharField(source='trainee.name', read_only=True)
    evaluator_name = serializers.CharField(source='evaluator.name', read_only=True)
    assessment_epas = AssessmentEPASerializer(many=True, read_only=True)
    epa_count = serializers.SerializerMethodField()
    average_entrustment = serializers.SerializerMethodField()
    acknowledged_by_names = serializers.SerializerMethodField()
    is_read_by_current_user = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = Assessment
        fields = [
            'id', 'trainee', 'trainee_name', 'evaluator', 'evaluator_name',
            'shift_date', 'location', 'status', 'private_comments',
            'what_went_well', 'what_could_improve',
            'acknowledged_by', 'acknowledged_by_names', 'is_read_by_current_user',
            'created_at', 'updated_at', 'assessment_epas', 'epa_count', 'average_entrustment',
            'can_delete'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_epa_count(self, obj):
        return obj.assessment_epas.count()

    def get_average_entrustment(self, obj):
        epas = obj.assessment_epas.all()
        if not epas.exists():
            return None
        return sum(epa.entrustment_level for epa in epas) / epas.count()
    
    def get_acknowledged_by_names(self, obj):
        return [user.name for user in obj.acknowledged_by.all()]
    
    def get_is_read_by_current_user(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.acknowledged_by.filter(id=request.user.id).exists()
        return False
    
    def get_can_delete(self, obj):
        """Check if current user can delete this assessment"""
        from django.utils import timezone
        from datetime import timedelta
        
        request = self.context.get('request')
        if not request or not request.user:
            return False
        
        # Must be the evaluator (creator)
        if obj.evaluator != request.user:
            return False
        
        # Must be less than 7 days old
        assessment_age = timezone.now() - obj.created_at
        if assessment_age > timedelta(days=7):
            return False
        
        return True

class AssessmentCreateSerializer(serializers.ModelSerializer):
    assessment_epas = AssessmentEPASerializer(many=True)

    class Meta:
        model = Assessment
        fields = [
            'trainee', 'evaluator', 'shift_date', 'location', 'status',
            'private_comments', 'what_went_well', 'what_could_improve', 'assessment_epas'
        ]

    def create(self, validated_data):
        assessment_epas_data = validated_data.pop('assessment_epas')
        assessment = Assessment.objects.create(**validated_data)
        
        for epa_data in assessment_epas_data:
            AssessmentEPA.objects.create(assessment=assessment, **epa_data)
        
        return assessment
