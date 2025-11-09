"""
Tests for User API views and authentication
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.authtoken.models import Token
from unittest.mock import patch, MagicMock

from users.models import User
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
        """Test login without email"""
        url = reverse('user-login')
        data = {
            'password': 'testpass123'
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_login_without_password(self, api_client):
        """Test login without password"""
        url = reverse('user-login')
        data = {
            'email': 'test@example.com'
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
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

