from django.contrib import admin
from .models import Assessment, AssessmentEPA


class AssessmentEPAInline(admin.TabularInline):
    """Inline for AssessmentEPA - shows EPAs within an assessment"""
    model = AssessmentEPA
    extra = 0
    fields = ['epa', 'entrustment_level', 'created_at']
    readonly_fields = ['created_at']
    autocomplete_fields = ['epa']


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'trainee', 'evaluator', 'shift_date', 'status', 'location', 'created_at']
    list_filter = ['status', 'shift_date', 'trainee__program', 'created_at']
    search_fields = ['trainee__name', 'evaluator__name', 'location', 'what_went_well', 'what_could_improve']
    date_hierarchy = 'shift_date'
    ordering = ['-created_at']
    autocomplete_fields = ['trainee', 'evaluator']
    
    fieldsets = [
        ('Assessment Information', {
            'fields': ['trainee', 'evaluator', 'shift_date', 'location', 'status']
        }),
        ('Feedback', {
            'fields': ['what_went_well', 'what_could_improve', 'private_comments']
        }),
        ('Metadata', {
            'fields': ['acknowledged_by', 'created_at', 'updated_at'],
            'classes': ['collapse']
        })
    ]
    
    readonly_fields = ['created_at', 'updated_at']
    filter_horizontal = ['acknowledged_by']
    inlines = [AssessmentEPAInline]
    
    def get_queryset(self, request):
        """Optimize query to reduce database hits"""
        qs = super().get_queryset(request)
        return qs.select_related('trainee', 'evaluator', 'trainee__program')


@admin.register(AssessmentEPA)
class AssessmentEPAAdmin(admin.ModelAdmin):
    list_display = ['id', 'assessment', 'epa', 'entrustment_level', 'created_at']
    list_filter = ['entrustment_level', 'epa__program', 'created_at']
    search_fields = ['assessment__trainee__name', 'epa__code', 'epa__title']
    ordering = ['-created_at']
    autocomplete_fields = ['assessment', 'epa']
    
    fieldsets = [
        ('Assessment EPA', {
            'fields': ['assessment', 'epa', 'entrustment_level']
        }),
        ('Metadata', {
            'fields': ['created_at'],
            'classes': ['collapse']
        })
    ]
    
    readonly_fields = ['created_at']
    
    def get_queryset(self, request):
        """Optimize query to reduce database hits"""
        qs = super().get_queryset(request)
        return qs.select_related('assessment', 'epa', 'assessment__trainee', 'epa__program')
