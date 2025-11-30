from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models
from django.conf import settings
import uuid

class CustomUserManager(UserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('name', 'System Administrator')
        extra_fields.setdefault('role', 'system-admin')
        # Superuser doesn't need organization
        extra_fields.setdefault('organization', None)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    ROLE_CHOICES = [
        ('trainee', 'Trainee'),
        ('faculty', 'Faculty'),
        ('admin', 'Admin'),
        ('leadership', 'Leadership'),
        ('system-admin', 'System Admin'),
    ]
    
    # Override username to make it optional/blank
    username = models.CharField(max_length=150, blank=True, null=True)
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=150)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='trainee')
    organization = models.ForeignKey(
        'organizations.Organization', 
        on_delete=models.CASCADE, 
        related_name='users',
        null=True,  # Allow null for superusers
        blank=True  # Allow blank in forms for superusers
    )
    program = models.ForeignKey(
        'organizations.Program',
        on_delete=models.CASCADE,
        related_name='users',
        null=True,
        blank=True,
        help_text='Program this user belongs to'
    )
    cohort = models.ForeignKey(
        'Cohort',
        on_delete=models.SET_NULL,
        related_name='users',
        null=True,
        blank=True,
        help_text='Cohort this user belongs to (required for trainees)'
    )
    department = models.CharField(max_length=100, blank=True)
    start_date = models.DateField(null=True, blank=True)
    deactivated_at = models.DateTimeField(
        null=True, 
        blank=True,
        help_text='When this user was deactivated. If null, user is active.'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = CustomUserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    
    class Meta:
        db_table = 'users'
        ordering = ['name']
    
    @property
    def is_active_user(self):
        """Check if user is active (not deactivated)"""
        return self.deactivated_at is None
    
    def deactivate(self):
        """Deactivate this user"""
        from django.utils import timezone
        self.deactivated_at = timezone.now()
        self.save()
    
    def reactivate(self):
        """Reactivate this user"""
        self.deactivated_at = None
        self.save()
    
    def __str__(self):
        return f"{self.name} ({self.get_role_display()})"
    
    def clean(self):
        from django.core.exceptions import ValidationError
        # Require organization for non-superusers
        if not self.is_superuser and not self.organization:
            raise ValidationError('Organization is required for all users except superusers.')
        
        # Require cohort for trainees
        if self.role == 'trainee' and not self.cohort:
            raise ValidationError('Cohort is required for trainees.')
    
    @property
    def is_trainee(self):
        return self.role == 'trainee'
    
    @property
    def is_faculty(self):
        return self.role in ['faculty', 'leadership']
    
    @property
    def is_admin_user(self):
        return self.role in ['admin', 'system-admin'] or self.is_superuser

class Cohort(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='cohorts')
    program = models.ForeignKey('organizations.Program', on_delete=models.CASCADE, related_name='cohorts')
    name = models.CharField(max_length=255)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    
    class Meta:
        db_table = 'cohorts'
        ordering = ['name']
        unique_together = ['program', 'name']
    
    def __str__(self):
        return f"{self.name} - {self.program.name}"


class LoginAttempt(models.Model):
    """
    Track all login attempts for security audit purposes.
    Implements hospital security requirement AU-14 (Login Attempt Logging).
    
    Records successful and failed login attempts with metadata including
    IP address, user agent, and timestamps for security monitoring.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='login_attempts',
        help_text='The user who attempted to login (null if user not found)'
    )
    success = models.BooleanField(
        help_text='Whether the login attempt was successful'
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text='IP address of the login attempt'
    )
    user_agent = models.TextField(
        blank=True,
        help_text='Browser/client user agent string'
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    failure_reason = models.CharField(
        max_length=200,
        blank=True,
        help_text='Reason for login failure (if applicable)'
    )
    
    class Meta:
        db_table = 'login_attempts'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['email', '-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['-timestamp']),
            models.Index(fields=['success', '-timestamp']),
        ]
    
    def __str__(self):
        status = 'SUCCESS' if self.success else 'FAILED'
        return f"{status}: {self.email} at {self.timestamp}"

