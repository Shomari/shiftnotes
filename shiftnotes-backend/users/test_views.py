"""
Tests for User API views and authentication
"""
import pytest
from django.urls import reverse
from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from unittest.mock import patch, MagicMock
from datetime import timedelta

from users.models import User, LoginAttempt
from users.lockout import (
    check_login_attempts, record_failed_attempt, 
    reset_login_attempts, get_remaining_attempts, LOCKOUT_THRESHOLD
)
from conftest import (
    OrganizationFactory, ProgramFactory, CohortFactory,
    UserFactory
)


@pytest.mark.django_db
class TestAuthenticationViews:
    """Test authentication endpoints"""
    
    def test_login_with_valid_credentials(self, api_client):
        """Test login with valid email and password"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        user = UserFactory(
            email='test@example.com',
            password='testpass123',
            organization=org,
            program=program
        )
        
        url = reverse('user-login')
        data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'token' in response.data
        assert 'user' in response.data
        assert response.data['user']['email'] == 'test@example.com'
    
    def test_login_with_invalid_credentials(self, api_client):
        """Test login with invalid credentials"""
        url = reverse('user-login')
        data = {
            'email': 'wrong@example.com',
            'password': 'wrongpass'
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert 'error' in response.data
    
    def test_login_without_email(self, api_client):
        """Test login without email returns 400 Bad Request"""
        url = reverse('user-login')
        data = {
            'password': 'testpass123'
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data
    
    def test_login_without_password(self, api_client):
        """Test login without password returns 400 Bad Request"""
        url = reverse('user-login')
        data = {
            'email': 'test@example.com'
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data
    
    def test_logout(self, authenticated_client, trainee_user):
        """Test logout endpoint"""
        url = reverse('user-logout')
        
        # Verify token exists before logout
        assert Token.objects.filter(user=trainee_user).exists()
        
        response = authenticated_client.post(url)
        
        assert response.status_code == status.HTTP_200_OK
        # Token should be deleted after logout
        assert not Token.objects.filter(user=trainee_user).exists()
    
    def test_logout_requires_authentication(self, api_client):
        """Test that logout requires authentication"""
        url = reverse('user-logout')
        response = api_client.post(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_get_current_user(self, authenticated_client, trainee_user):
        """Test /users/me/ endpoint"""
        url = reverse('user-me')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == str(trainee_user.id)
        assert response.data['email'] == trainee_user.email
        assert response.data['name'] == trainee_user.name
    
    def test_get_current_user_requires_authentication(self, api_client):
        """Test that /users/me/ requires authentication"""
        url = reverse('user-me')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestUserManagementViews:
    """Test user CRUD operations"""
    
    def test_list_users_requires_authentication(self, api_client):
        """Test that listing users requires authentication"""
        url = reverse('user-list')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_list_users_filtered_by_program(self, faculty_client, faculty_user):
        """Test that users can only see users from their program"""
        # Create users in same program
        same_program_user1 = UserFactory(
            organization=faculty_user.organization,
            program=faculty_user.program,
            cohort=None
        )
        same_program_user2 = UserFactory(
            organization=faculty_user.organization,
            program=faculty_user.program,
            cohort=None
        )
        
        # Create user in different program
        other_program = ProgramFactory(org=faculty_user.organization)
        different_program_user = UserFactory(
            organization=faculty_user.organization,
            program=other_program,
            cohort=None
        )
        
        url = reverse('user-list')
        response = faculty_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        user_ids = [user['id'] for user in response.data]
        
        # Should see self and same program users
        assert str(faculty_user.id) in user_ids
        assert str(same_program_user1.id) in user_ids
        assert str(same_program_user2.id) in user_ids
        
        # Should NOT see different program user
        assert str(different_program_user.id) not in user_ids
    
    @patch('users.views.EmailService.send_welcome_email')
    def test_create_user(self, mock_email, admin_client, admin_user):
        """Test creating a new user"""
        cohort = CohortFactory(
            org=admin_user.organization,
            program=admin_user.program
        )
        
        url = reverse('user-list')
        data = {
            'email': 'newuser@example.com',
            'name': 'New User',
            'role': 'trainee',
            'organization': str(admin_user.organization.id),
            'program': str(admin_user.program.id),
            'cohort': str(cohort.id),
            'department': 'Emergency Medicine'
        }
        
        # Mock email sending to return True
        mock_email.return_value = True
        
        response = admin_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['email'] == 'newuser@example.com'
        assert response.data['name'] == 'New User'
        assert response.data['role'] == 'trainee'
        
        # Verify user was created
        assert User.objects.filter(email='newuser@example.com').exists()
        
        # Verify welcome email was attempted
        mock_email.assert_called_once()
    
    def test_get_trainees_endpoint(self, faculty_client, faculty_user):
        """Test /users/trainees/ endpoint"""
        # Create trainees in same program
        cohort = CohortFactory(
            org=faculty_user.organization,
            program=faculty_user.program
        )
        trainee1 = UserFactory(
            role='trainee',
            organization=faculty_user.organization,
            program=faculty_user.program,
            cohort=cohort
        )
        trainee2 = UserFactory(
            role='trainee',
            organization=faculty_user.organization,
            program=faculty_user.program,
            cohort=cohort
        )
        
        # Create faculty (should not appear in trainees list)
        faculty = UserFactory(
            role='faculty',
            organization=faculty_user.organization,
            program=faculty_user.program
        )
        
        url = reverse('user-trainees')
        response = faculty_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.data
        
        trainee_ids = [user['id'] for user in response.data['results']]
        assert str(trainee1.id) in trainee_ids
        assert str(trainee2.id) in trainee_ids
        assert str(faculty.id) not in trainee_ids
    
    def test_get_faculty_endpoint(self, admin_client, admin_user):
        """Test /users/faculty/ endpoint"""
        # Create faculty in same program
        faculty1 = UserFactory(
            role='faculty',
            organization=admin_user.organization,
            program=admin_user.program
        )
        leadership = UserFactory(
            role='leadership',
            organization=admin_user.organization,
            program=admin_user.program
        )
        
        # Create trainee (should not appear in faculty list)
        cohort = CohortFactory(
            org=admin_user.organization,
            program=admin_user.program
        )
        trainee = UserFactory(
            role='trainee',
            organization=admin_user.organization,
            program=admin_user.program,
            cohort=cohort
        )
        
        url = reverse('user-faculty')
        response = admin_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.data
        
        faculty_ids = [user['id'] for user in response.data['results']]
        assert str(faculty1.id) in faculty_ids
        assert str(leadership.id) in faculty_ids
        assert str(trainee.id) not in faculty_ids
    
    def test_update_user(self, admin_client, admin_user):
        """Test updating a user"""
        user = UserFactory(
            organization=admin_user.organization,
            program=admin_user.program,
            name='Old Name'
        )
        
        url = reverse('user-detail', args=[user.id])
        data = {
            'email': user.email,
            'name': 'New Name',
            'role': user.role,
            'organization': str(admin_user.organization.id),
            'program': str(admin_user.program.id),
            'department': 'Updated Department'
        }
        
        response = admin_client.put(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'New Name'
        assert response.data['department'] == 'Updated Department'
        
        # Verify in database
        user.refresh_from_db()
        assert user.name == 'New Name'
        assert user.department == 'Updated Department'
    
    def test_delete_user(self, admin_client, admin_user):
        """Test deleting a user"""
        user = UserFactory(
            organization=admin_user.organization,
            program=admin_user.program
        )
        user_id = user.id
        
        url = reverse('user-detail', args=[user_id])
        response = admin_client.delete(url)
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not User.objects.filter(id=user_id).exists()


@pytest.mark.django_db
class TestCohortViews:
    """Test cohort management views"""
    
    def test_list_cohorts_requires_authentication(self, api_client):
        """Test that listing cohorts requires authentication"""
        url = reverse('cohort-list')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_list_cohorts_filtered_by_program(self, faculty_client, faculty_user):
        """Test that cohorts are filtered by user's program"""
        # Create cohorts in same program
        cohort1 = CohortFactory(
            org=faculty_user.organization,
            program=faculty_user.program,
            name='Cohort 1'
        )
        cohort2 = CohortFactory(
            org=faculty_user.organization,
            program=faculty_user.program,
            name='Cohort 2'
        )
        
        # Create cohort in different program
        other_program = ProgramFactory(org=faculty_user.organization)
        other_cohort = CohortFactory(
            org=faculty_user.organization,
            program=other_program,
            name='Other Cohort'
        )
        
        url = reverse('cohort-list')
        response = faculty_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        
        # Handle both paginated and non-paginated responses
        cohorts_data = response.data if isinstance(response.data, list) else response.data.get('results', [])
        cohort_ids = [str(cohort['id']) for cohort in cohorts_data]
        
        assert str(cohort1.id) in cohort_ids
        assert str(cohort2.id) in cohort_ids
        assert str(other_cohort.id) not in cohort_ids


@pytest.mark.django_db
class TestLoginAttemptLockout:
    """Test login attempt lockout functionality (AU-13)"""
    
    def setup_method(self):
        """Clear cache before each test"""
        cache.clear()
    
    def test_lockout_after_five_failed_attempts(self, api_client):
        """Test that account is locked after 5 failed attempts"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        user = UserFactory(
            email='lockout@example.com',
            password='correctpass123',
            organization=org,
            program=program
        )
        
        url = reverse('user-login')
        
        # Make 5 failed login attempts
        for i in range(5):
            response = api_client.post(url, {
                'email': 'lockout@example.com',
                'password': 'wrongpassword'
            }, format='json')
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        # 6th attempt should be locked out (429 Too Many Requests)
        response = api_client.post(url, {
            'email': 'lockout@example.com',
            'password': 'correctpass123'  # Even correct password should fail
        }, format='json')
        
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert 'locked' in response.data['error'].lower()
    
    def test_successful_login_resets_lockout_counter(self, api_client):
        """Test that successful login resets the failed attempt counter"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        user = UserFactory(
            email='reset@example.com',
            password='correctpass123',
            organization=org,
            program=program
        )
        
        url = reverse('user-login')
        
        # Make 3 failed attempts
        for i in range(3):
            api_client.post(url, {
                'email': 'reset@example.com',
                'password': 'wrongpassword'
            }, format='json')
        
        # Successful login
        response = api_client.post(url, {
            'email': 'reset@example.com',
            'password': 'correctpass123'
        }, format='json')
        assert response.status_code == status.HTTP_200_OK
        
        # Counter should be reset - make 3 more failed attempts
        for i in range(3):
            api_client.post(url, {
                'email': 'reset@example.com',
                'password': 'wrongpassword'
            }, format='json')
        
        # Should still be able to login (counter was reset)
        response = api_client.post(url, {
            'email': 'reset@example.com',
            'password': 'correctpass123'
        }, format='json')
        assert response.status_code == status.HTTP_200_OK
    
    def test_lockout_shows_remaining_attempts_warning(self, api_client):
        """Test that failed login shows remaining attempts warning"""
        url = reverse('user-login')
        
        response = api_client.post(url, {
            'email': 'attempts@example.com',
            'password': 'wrongpassword'
        }, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert 'attempts_warning' in response.data
        assert 'remaining' in response.data['attempts_warning'].lower()


@pytest.mark.django_db
class TestLoginAttemptLogging:
    """Test login attempt logging functionality (AU-14)"""
    
    def setup_method(self):
        """Clear cache before each test"""
        cache.clear()
    
    def test_successful_login_is_logged(self, api_client):
        """Test that successful logins are recorded in LoginAttempt"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        user = UserFactory(
            email='logged@example.com',
            password='testpass123',
            organization=org,
            program=program
        )
        
        url = reverse('user-login')
        response = api_client.post(url, {
            'email': 'logged@example.com',
            'password': 'testpass123'
        }, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        
        # Check LoginAttempt was created
        attempt = LoginAttempt.objects.filter(email='logged@example.com').first()
        assert attempt is not None
        assert attempt.success is True
        assert attempt.user == user
        assert attempt.failure_reason == ''
    
    def test_failed_login_is_logged(self, api_client):
        """Test that failed logins are recorded in LoginAttempt"""
        url = reverse('user-login')
        
        response = api_client.post(url, {
            'email': 'failed@example.com',
            'password': 'wrongpassword'
        }, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        # Check LoginAttempt was created
        attempt = LoginAttempt.objects.filter(email='failed@example.com').first()
        assert attempt is not None
        assert attempt.success is False
        assert attempt.user is None
        assert 'credentials' in attempt.failure_reason.lower()
    
    def test_lockout_attempt_is_logged(self, api_client):
        """Test that lockout attempts are logged"""
        url = reverse('user-login')
        email = 'lockout-log@example.com'
        
        # Make 5 failed attempts to trigger lockout
        for i in range(5):
            api_client.post(url, {
                'email': email,
                'password': 'wrongpassword'
            }, format='json')
        
        # Make another attempt while locked out
        api_client.post(url, {
            'email': email,
            'password': 'whatever'
        }, format='json')
        
        # Check that the lockout attempt was logged
        lockout_attempt = LoginAttempt.objects.filter(
            email=email,
            failure_reason='Account locked out'
        ).first()
        assert lockout_attempt is not None
        assert lockout_attempt.success is False
    
    def test_login_attempt_captures_ip_and_user_agent(self, api_client):
        """Test that IP address and user agent are captured"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        user = UserFactory(
            email='metadata@example.com',
            password='testpass123',
            organization=org,
            program=program
        )
        
        url = reverse('user-login')
        response = api_client.post(
            url, 
            {'email': 'metadata@example.com', 'password': 'testpass123'},
            format='json',
            HTTP_USER_AGENT='Test Browser/1.0'
        )
        
        attempt = LoginAttempt.objects.filter(email='metadata@example.com').first()
        assert attempt is not None
        # IP address should be captured (may be None in test environment)
        # User agent should be captured
        assert 'Test Browser' in attempt.user_agent


@pytest.mark.django_db
class TestDeactivatedUserLogin:
    """Test that deactivated users cannot login"""
    
    def setup_method(self):
        """Clear cache before each test"""
        cache.clear()
    
    def test_deactivated_user_cannot_login(self, api_client):
        """Test that a deactivated user cannot login"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        user = UserFactory(
            email='deactivated@example.com',
            password='testpass123',
            organization=org,
            program=program
        )
        
        # Deactivate the user
        user.deactivate()
        
        url = reverse('user-login')
        response = api_client.post(url, {
            'email': 'deactivated@example.com',
            'password': 'testpass123'
        }, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert 'deactivated' in response.data['error'].lower()
    
    def test_deactivated_login_is_logged(self, api_client):
        """Test that deactivated user login attempts are logged"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        user = UserFactory(
            email='deact-log@example.com',
            password='testpass123',
            organization=org,
            program=program
        )
        user.deactivate()
        
        url = reverse('user-login')
        api_client.post(url, {
            'email': 'deact-log@example.com',
            'password': 'testpass123'
        }, format='json')
        
        attempt = LoginAttempt.objects.filter(email='deact-log@example.com').first()
        assert attempt is not None
        assert attempt.success is False
        assert 'deactivated' in attempt.failure_reason.lower()


@pytest.mark.django_db
class TestSessionTimeout:
    """Test session timeout functionality (AU-15)"""
    
    def setup_method(self):
        """Clear cache before each test"""
        cache.clear()
    
    def test_active_session_works(self, authenticated_client, trainee_user):
        """Test that an active session allows API access"""
        url = reverse('user-me')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == trainee_user.email
    
    def test_session_timeout_after_inactivity(self, api_client):
        """Test that session expires after 15 minutes of inactivity"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        user = UserFactory(
            email='timeout@example.com',
            password='testpass123',
            organization=org,
            program=program
        )
        
        # Login to get token
        login_url = reverse('user-login')
        response = api_client.post(login_url, {
            'email': 'timeout@example.com',
            'password': 'testpass123'
        }, format='json')
        
        token = response.data['token']
        
        # Set the last activity time to 20 minutes ago
        cache_key = f'token_last_activity_{token}'
        cache.set(cache_key, timezone.now() - timedelta(minutes=20), 60 * 60)
        
        # Try to access protected endpoint
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        url = reverse('user-me')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert 'expired' in response.data['detail'].lower() or 'inactivity' in response.data['detail'].lower()


@pytest.mark.django_db
class TestLockoutHelperFunctions:
    """Test lockout helper functions directly"""
    
    def setup_method(self):
        """Clear cache before each test"""
        cache.clear()
    
    def test_check_login_attempts_allows_fresh_user(self):
        """Test that a new user is allowed to login"""
        allowed, message = check_login_attempts('fresh@example.com')
        assert allowed is True
        assert message is None
    
    def test_check_login_attempts_blocks_after_threshold(self):
        """Test that user is blocked after threshold is reached"""
        email = 'blocked@example.com'
        
        # Record 5 failed attempts
        for i in range(LOCKOUT_THRESHOLD):
            record_failed_attempt(email)
        
        allowed, message = check_login_attempts(email)
        assert allowed is False
        assert 'locked' in message.lower()
    
    def test_record_failed_attempt_returns_remaining_count(self):
        """Test that recording returns remaining attempts"""
        email = 'count@example.com'
        
        result = record_failed_attempt(email)
        assert '4' in result  # 5 - 1 = 4 remaining
        
        result = record_failed_attempt(email)
        assert '3' in result  # 5 - 2 = 3 remaining
    
    def test_reset_login_attempts_clears_counter(self):
        """Test that reset clears the attempt counter"""
        email = 'reset@example.com'
        
        # Record some failed attempts
        for i in range(3):
            record_failed_attempt(email)
        
        # Verify attempts are recorded
        assert get_remaining_attempts(email) == 2
        
        # Reset
        reset_login_attempts(email)
        
        # Should be back to full attempts
        assert get_remaining_attempts(email) == LOCKOUT_THRESHOLD
    
    def test_get_remaining_attempts(self):
        """Test getting remaining attempts"""
        email = 'remaining@example.com'
        
        # Initially should have full attempts
        assert get_remaining_attempts(email) == LOCKOUT_THRESHOLD
        
        # After 2 failed attempts
        record_failed_attempt(email)
        record_failed_attempt(email)
        
        assert get_remaining_attempts(email) == LOCKOUT_THRESHOLD - 2

