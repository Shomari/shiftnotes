"""
Tests for User and Cohort models
"""
import pytest
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.utils import timezone

from users.models import Cohort, LoginAttempt
from users.validators import ComplexityValidator
from conftest import (
    OrganizationFactory, ProgramFactory, CohortFactory, UserFactory
)

User = get_user_model()


@pytest.mark.django_db
class TestUserModel:
    """Test User model functionality"""
    
    def test_create_user_with_email(self):
        """Test creating a user with email"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            name='Test User',
            organization=org,
            program=program
        )
        assert user.email == 'test@example.com'
        assert user.name == 'Test User'
        assert user.check_password('testpass123')
        assert not user.is_superuser
        assert user.organization == org
        assert user.program == program
    
    def test_create_user_without_email_raises_error(self):
        """Test creating user without email raises ValueError"""
        with pytest.raises(ValueError, match='The Email field must be set'):
            User.objects.create_user(email='', password='testpass123')
    
    def test_create_superuser(self):
        """Test creating a superuser"""
        user = User.objects.create_superuser(
            email='admin@example.com',
            password='adminpass123'
        )
        assert user.email == 'admin@example.com'
        assert user.is_superuser
        assert user.is_staff
        assert user.role == 'system-admin'
        assert user.name == 'System Administrator'
    
    def test_user_roles(self):
        """Test different user roles"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        
        roles = ['trainee', 'faculty', 'admin', 'leadership', 'system-admin']
        for role in roles:
            user = UserFactory(role=role, organization=org, program=program)
            assert user.role == role
    
    def test_user_is_trainee_property(self):
        """Test is_trainee property"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        
        trainee = UserFactory(role='trainee', organization=org, program=program)
        faculty = UserFactory(role='faculty', organization=org, program=program)
        
        assert trainee.is_trainee is True
        assert faculty.is_trainee is False
    
    def test_user_is_faculty_property(self):
        """Test is_faculty property"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        
        faculty = UserFactory(role='faculty', organization=org, program=program)
        leadership = UserFactory(role='leadership', organization=org, program=program)
        trainee = UserFactory(role='trainee', organization=org, program=program)
        
        assert faculty.is_faculty is True
        assert leadership.is_faculty is True
        assert trainee.is_faculty is False
    
    def test_user_is_admin_user_property(self):
        """Test is_admin_user property"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        
        admin = UserFactory(role='admin', organization=org, program=program)
        system_admin = UserFactory(role='system-admin', organization=org, program=program)
        trainee = UserFactory(role='trainee', organization=org, program=program)
        
        assert admin.is_admin_user is True
        assert system_admin.is_admin_user is True
        assert trainee.is_admin_user is False
    
    def test_user_is_active_user_property(self):
        """Test is_active_user property"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        user = UserFactory(organization=org, program=program)
        
        assert user.is_active_user is True
        
        user.deactivated_at = timezone.now()
        assert user.is_active_user is False
    
    def test_user_deactivate_method(self):
        """Test deactivate method"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        user = UserFactory(organization=org, program=program)
        
        assert user.deactivated_at is None
        user.deactivate()
        assert user.deactivated_at is not None
        assert user.is_active_user is False
    
    def test_user_reactivate_method(self):
        """Test reactivate method"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        user = UserFactory(organization=org, program=program)
        
        user.deactivate()
        assert user.deactivated_at is not None
        
        user.reactivate()
        assert user.deactivated_at is None
        assert user.is_active_user is True
    
    def test_user_validation_requires_organization_for_non_superuser(self):
        """Test that organization is required for non-superusers"""
        program = ProgramFactory()
        user = User(
            email='test@example.com',
            name='Test User',
            organization=None,
            program=program,
            is_superuser=False
        )
        with pytest.raises(ValidationError, match='Organization is required'):
            user.clean()
    
    def test_user_validation_requires_cohort_for_trainee(self):
        """Test that cohort is required for trainees"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        user = User(
            email='trainee@example.com',
            name='Trainee',
            role='trainee',
            organization=org,
            program=program,
            cohort=None
        )
        with pytest.raises(ValidationError, match='Cohort is required for trainees'):
            user.clean()
    
    def test_user_string_representation(self):
        """Test __str__ method"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        user = UserFactory(
            name='John Doe',
            role='faculty',
            organization=org,
            program=program
        )
        assert str(user) == 'John Doe (Faculty)'
    
    def test_email_is_username_field(self):
        """Test that email is used as USERNAME_FIELD"""
        assert User.USERNAME_FIELD == 'email'


@pytest.mark.django_db
class TestCohortModel:
    """Test Cohort model functionality"""
    
    def test_create_cohort(self):
        """Test creating a cohort"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        cohort = CohortFactory(org=org, program=program, name='Class of 2024')
        
        assert cohort.name == 'Class of 2024'
        assert cohort.org == org
        assert cohort.program == program
    
    def test_cohort_string_representation(self):
        """Test __str__ method"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org, name='Emergency Medicine')
        cohort = CohortFactory(
            org=org,
            program=program,
            name='Class of 2024'
        )
        assert str(cohort) == 'Class of 2024 - Emergency Medicine'
    
    def test_cohort_unique_together_constraint(self):
        """Test that cohort name must be unique within a program"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        CohortFactory(org=org, program=program, name='Class of 2024')
        
        # This should raise an IntegrityError
        from django.db import IntegrityError
        with pytest.raises(IntegrityError):
            CohortFactory(org=org, program=program, name='Class of 2024')


@pytest.mark.django_db
class TestLoginAttemptModel:
    """Test LoginAttempt model functionality (AU-14)"""
    
    def test_create_successful_login_attempt(self):
        """Test creating a successful login attempt record"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        user = UserFactory(organization=org, program=program)
        
        attempt = LoginAttempt.objects.create(
            email=user.email,
            user=user,
            success=True,
            ip_address='192.168.1.1',
            user_agent='Mozilla/5.0 Test Browser'
        )
        
        assert attempt.email == user.email
        assert attempt.user == user
        assert attempt.success is True
        assert attempt.ip_address == '192.168.1.1'
        assert 'Mozilla' in attempt.user_agent
        assert attempt.failure_reason == ''
        assert attempt.timestamp is not None
    
    def test_create_failed_login_attempt(self):
        """Test creating a failed login attempt record"""
        attempt = LoginAttempt.objects.create(
            email='nonexistent@example.com',
            user=None,
            success=False,
            ip_address='10.0.0.1',
            user_agent='Test Client',
            failure_reason='Invalid credentials'
        )
        
        assert attempt.email == 'nonexistent@example.com'
        assert attempt.user is None
        assert attempt.success is False
        assert attempt.failure_reason == 'Invalid credentials'
    
    def test_login_attempt_string_representation(self):
        """Test __str__ method for LoginAttempt"""
        attempt_success = LoginAttempt.objects.create(
            email='test@example.com',
            success=True
        )
        assert 'SUCCESS' in str(attempt_success)
        assert 'test@example.com' in str(attempt_success)
        
        attempt_failed = LoginAttempt.objects.create(
            email='failed@example.com',
            success=False
        )
        assert 'FAILED' in str(attempt_failed)
        assert 'failed@example.com' in str(attempt_failed)
    
    def test_login_attempts_ordered_by_timestamp_desc(self):
        """Test that login attempts are ordered newest first"""
        LoginAttempt.objects.create(email='first@example.com', success=True)
        LoginAttempt.objects.create(email='second@example.com', success=True)
        LoginAttempt.objects.create(email='third@example.com', success=True)
        
        attempts = list(LoginAttempt.objects.all())
        assert attempts[0].email == 'third@example.com'
        assert attempts[2].email == 'first@example.com'
    
    def test_login_attempt_user_set_null_on_delete(self):
        """Test that user is set to NULL when user is deleted"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        user = UserFactory(organization=org, program=program)
        user_id = user.id
        
        attempt = LoginAttempt.objects.create(
            email=user.email,
            user=user,
            success=True
        )
        attempt_id = attempt.id
        
        # Delete the user
        user.delete()
        
        # Refresh the attempt from DB
        attempt = LoginAttempt.objects.get(id=attempt_id)
        assert attempt.user is None
        assert attempt.email is not None  # Email is preserved


@pytest.mark.django_db
class TestPasswordComplexityValidator:
    """Test password complexity validator (AU-08)"""
    
    def test_valid_password_passes(self):
        """Test that a password meeting all requirements passes"""
        validator = ComplexityValidator()
        # Should not raise any exception
        validator.validate('MySecure1Password!')
    
    def test_password_without_uppercase_fails(self):
        """Test that password without uppercase fails"""
        validator = ComplexityValidator()
        with pytest.raises(ValidationError) as exc_info:
            validator.validate('mysecure1password!')
        assert 'uppercase' in str(exc_info.value).lower()
    
    def test_password_without_lowercase_fails(self):
        """Test that password without lowercase fails"""
        validator = ComplexityValidator()
        with pytest.raises(ValidationError) as exc_info:
            validator.validate('MYSECURE1PASSWORD!')
        assert 'lowercase' in str(exc_info.value).lower()
    
    def test_password_without_digit_fails(self):
        """Test that password without digit fails"""
        validator = ComplexityValidator()
        with pytest.raises(ValidationError) as exc_info:
            validator.validate('MySecurePassword!')
        assert 'digit' in str(exc_info.value).lower()
    
    def test_password_without_special_char_fails(self):
        """Test that password without special character fails"""
        validator = ComplexityValidator()
        with pytest.raises(ValidationError) as exc_info:
            validator.validate('MySecure1Password')
        assert 'special' in str(exc_info.value).lower()
    
    def test_password_with_multiple_issues_reports_all(self):
        """Test that all validation issues are reported"""
        validator = ComplexityValidator()
        with pytest.raises(ValidationError) as exc_info:
            validator.validate('password')  # Missing uppercase, digit, special
        errors = exc_info.value.messages
        assert len(errors) >= 3
    
    def test_custom_requirements(self):
        """Test validator with custom requirements"""
        validator = ComplexityValidator(
            min_uppercase=2,
            min_lowercase=2,
            min_digits=2,
            min_special=2
        )
        
        # This should fail - only 1 of each
        with pytest.raises(ValidationError):
            validator.validate('Aa1!')
        
        # This should pass - 2 of each
        validator.validate('AAaa11!!')
    
    def test_get_help_text(self):
        """Test help text generation"""
        validator = ComplexityValidator()
        help_text = validator.get_help_text()
        
        assert 'uppercase' in help_text.lower()
        assert 'lowercase' in help_text.lower()
        assert 'digit' in help_text.lower()
        assert 'special' in help_text.lower()

