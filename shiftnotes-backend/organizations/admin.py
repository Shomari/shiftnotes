from django.contrib import admin
from .models import Organization, Program, Site

@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'address_line1', 'created_at']
    search_fields = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}  # Auto-generate slug from name
    ordering = ['name']
    
    fieldsets = [
        ('Basic Information', {
            'fields': ['name', 'slug', 'address_line1']
        })
    ]

@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ['name', 'org', 'specialty', 'abbreviation', 'created_at']
    list_filter = ['org', 'specialty']
    search_fields = ['name', 'abbreviation', 'specialty']
    ordering = ['org', 'name']
    
    fieldsets = [
        ('Basic Information', {
            'fields': ['org', 'name', 'abbreviation', 'specialty']
        })
    ]

@admin.register(Site)
class SiteAdmin(admin.ModelAdmin):
    list_display = ['name', 'org', 'program']
    list_filter = ['org', 'program']
    search_fields = ['name']
    ordering = ['org', 'program', 'name']
    
    # Filter programs to only show those from the selected organization
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'program':
            # This will show all programs, but you could filter by org if needed
            pass
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
