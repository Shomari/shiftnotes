from django.contrib import admin
from .models import EPACategory, EPA, CoreCompetency, SubCompetency, SubCompetencyEPA

@admin.register(EPACategory)
class EPACategoryAdmin(admin.ModelAdmin):
    list_display = ['title', 'program']
    list_filter = ['program']
    search_fields = ['title']
    ordering = ['title']

@admin.register(EPA)
class EPAAdmin(admin.ModelAdmin):
    list_display = ['code', 'title', 'category', 'program', 'is_active']
    list_filter = ['program', 'category', 'is_active']
    search_fields = ['code', 'title', 'description']
    ordering = ['code']
    list_editable = ['is_active']  # Allow quick toggle of active status
    
    fieldsets = [
        ('Basic Information', {
            'fields': ['program', 'category', 'code', 'title', 'is_active']
        }),
        ('Description', {
            'fields': ['description'],
            'classes': ['wide']
        })
    ]

@admin.register(CoreCompetency)
class CoreCompetencyAdmin(admin.ModelAdmin):
    list_display = ['code', 'title', 'program']
    list_filter = ['program']
    search_fields = ['code', 'title']
    ordering = ['code']

@admin.register(SubCompetency)
class SubCompetencyAdmin(admin.ModelAdmin):
    list_display = ['code', 'title', 'core_competency', 'get_epas', 'program']
    list_filter = ['program', 'core_competency']
    search_fields = ['code', 'title']
    ordering = ['code']
    
    fieldsets = [
        ('Basic Information', {
            'fields': ['program', 'core_competency', 'code', 'title']
        }),
        ('Milestone Levels', {
            'fields': [
                'milestone_level_1',
                'milestone_level_2', 
                'milestone_level_3',
                'milestone_level_4',
                'milestone_level_5'
            ],
            'classes': ['collapse']  # Collapsible section
        })
    ]
    
    def get_epas(self, obj):
        return ", ".join([epa.code for epa in obj.epas.all()])
    get_epas.short_description = 'EPAs'
    
    def program(self, obj):
        return obj.core_competency.program
    program.short_description = 'Program'
    program.admin_order_field = 'core_competency__program'


@admin.register(SubCompetencyEPA)
class SubCompetencyEPAAdmin(admin.ModelAdmin):
    list_display = ['sub_competency', 'epa', 'program']
    list_filter = ['sub_competency__program', 'sub_competency__core_competency']
    search_fields = ['sub_competency__code', 'sub_competency__title', 'epa__code', 'epa__title']
    ordering = ['sub_competency__code', 'epa__code']
    
    def program(self, obj):
        return obj.sub_competency.program
    program.short_description = 'Program'
    program.admin_order_field = 'sub_competency__program'
