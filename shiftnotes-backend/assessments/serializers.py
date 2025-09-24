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
            'entrustment_level', 'entrustment_level_description', 'what_went_well', 'what_could_improve', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_entrustment_level_description(self, obj):
        """Get the appropriate milestone level description from SubCompetency"""
        # Get the first SubCompetency mapped to this EPA
        # In a more sophisticated implementation, you might want to:
        # 1. Let evaluators choose which specific competency they're assessing
        # 2. Use the most relevant competency based on assessment context
        # 3. Combine multiple competency descriptions
        
        sub_competency = obj.epa.sub_competencies.first()
        if not sub_competency:
            # Fallback to generic descriptions if no SubCompetency is mapped
            generic_descriptions = {
                1: "I had to do it (Requires constant direct supervision)",
                2: "I helped a lot (Requires considerable direct supervision)",
                3: "I helped a little (Requires minimal direct supervision)",
                4: "I needed to be there but did not help (Requires indirect supervision)",
                5: "I didn't need to be there at all (No supervision required)"
            }
            return generic_descriptions.get(obj.entrustment_level, "Unknown level")
        
        # Get the appropriate milestone level description
        level_field = f'milestone_level_{obj.entrustment_level}'
        return getattr(sub_competency, level_field, "Unknown level")

class AssessmentSerializer(serializers.ModelSerializer):
    trainee_name = serializers.CharField(source='trainee.name', read_only=True)
    evaluator_name = serializers.CharField(source='evaluator.name', read_only=True)
    assessment_epas = AssessmentEPASerializer(many=True, read_only=True)
    epa_count = serializers.SerializerMethodField()
    average_entrustment = serializers.SerializerMethodField()
    acknowledged_by_names = serializers.SerializerMethodField()
    is_read_by_current_user = serializers.SerializerMethodField()

    class Meta:
        model = Assessment
        fields = [
            'id', 'trainee', 'trainee_name', 'evaluator', 'evaluator_name',
            'shift_date', 'location', 'status', 'private_comments',
            'acknowledged_by', 'acknowledged_by_names', 'is_read_by_current_user',
            'created_at', 'updated_at', 'assessment_epas', 'epa_count', 'average_entrustment'
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
