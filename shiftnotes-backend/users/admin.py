from django.contrib import admin
from .models import User, Cohort, LoginAttempt


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'role', 'organization', 'program', 'cohort', 'created_at']
    list_filter = ['role', 'organization', 'program', 'cohort']
    search_fields = ['name', 'email']
    
    # Fields for adding new users (organization admins)
    fields = ['email', 'name', 'role', 'organization', 'program', 'cohort', 'department', 'start_date']
    
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if not obj:  # Adding new user
            # Make organization required for new users (except superusers)
            form.base_fields['organization'].required = True
        return form
    
    def save_model(self, request, obj, form, change):
        if not change:  # New user
            obj.set_password('temppass123')  # Set temporary password
            if obj.role in ['admin', 'system-admin']:
                obj.is_staff = True  # Allow admin access
        super().save_model(request, obj, form, change)


@admin.register(Cohort)  
class CohortAdmin(admin.ModelAdmin):
    list_display = ['name', 'program', 'start_date', 'end_date']
    list_filter = ['program', 'start_date']
    search_fields = ['name']


@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    """
    Admin view for login attempts - Security Audit (AU-14).
    Read-only view for security monitoring and compliance.
    """
    list_display = ['timestamp', 'email', 'user', 'success', 'ip_address', 'failure_reason']
    list_filter = ['success', 'timestamp']
    search_fields = ['email', 'ip_address', 'user__email', 'user__name']
    readonly_fields = ['id', 'email', 'user', 'success', 'ip_address', 'user_agent', 'timestamp', 'failure_reason']
    date_hierarchy = 'timestamp'
    ordering = ['-timestamp']
    
    # Make this admin read-only for security purposes
    def has_add_permission(self, request):
        """Don't allow manual creation of login attempts."""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Login attempts are read-only for audit integrity."""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Only superusers can delete login attempts (for data retention policies)."""
        return request.user.is_superuser
