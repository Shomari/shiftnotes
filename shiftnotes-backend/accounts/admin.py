from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import User as CustomUser

# Unregister the default User admin
admin.site.unregister(User)

@admin.register(CustomUser)
class UserAdmin(BaseUserAdmin):
    """User admin with all custom fields"""
    
    # List display - show key fields
    list_display = ['email', 'name', 'role', 'cohort', 'department', 'is_active', 'date_joined']
    list_filter = ['role', 'is_active', 'cohort', 'department', 'date_joined']
    search_fields = ['email', 'name', 'username', 'department']
    ordering = ['-date_joined']
    
    # Fields for editing existing users
    fieldsets = (
        (None, {
            'fields': ('email', 'password')
        }),
        ('Personal Info', {
            'fields': ('name', 'username')
        }),
        ('Medical Info', {
            'fields': ('role', 'cohort', 'department', 'specialties', 'start_date')
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
            'classes': ('collapse',)
        }),
        ('Important Dates', {
            'fields': ('last_login', 'date_joined'),
            'classes': ('collapse',)
        }),
    )
    
    # Fields for creating new users - include ALL required fields
    add_fieldsets = (
        ('Required Information', {
            'classes': ('wide',),
            'fields': ('email', 'name', 'role', 'password_set_by_admin'),
        }),
        ('Optional Information', {
            'classes': ('wide',),
            'fields': ('cohort', 'department', 'start_date'),
        }),
        ('Advanced', {
            'classes': ('wide', 'collapse'),
            'fields': ('is_active', 'is_staff'),
        }),
    )
    
    # Make readonly fields that are auto-generated
    readonly_fields = ['date_joined', 'last_login', 'created_at', 'updated_at']
    
    # Ensure username gets set automatically from email
    def save_model(self, request, obj, form, change):
        if not change:  # Only for new users
            if not obj.username:
                obj.username = obj.email
            # Ensure specialties is an empty list if not provided
            if not obj.specialties:
                obj.specialties = []
        super().save_model(request, obj, form, change)
    
    # Custom form handling for specialties field
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        # Make specialties field optional and help with JSON input
        if 'specialties' in form.base_fields:
            form.base_fields['specialties'].help_text = "Enter as JSON list, e.g., [\"Emergency Medicine\", \"Cardiology\"] or leave empty for []"
            form.base_fields['specialties'].required = False
        return form