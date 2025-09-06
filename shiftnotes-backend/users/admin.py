from django.contrib import admin
from .models import User, Cohort

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'role', 'organization', 'created_at']
    list_filter = ['role', 'organization']
    search_fields = ['name', 'email']
    
    # Fields for adding new users (organization admins)
    fields = ['email', 'name', 'role', 'organization']
    
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
