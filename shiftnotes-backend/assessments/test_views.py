"""
Tests for Assessment API views
"""
import pytest
import csv
from datetime import date, timedelta
from django.urls import reverse
from rest_framework import status

from assessments.models import Assessment, AssessmentEPA
from conftest import (
    OrganizationFactory, ProgramFactory, CohortFactory,
    UserFactory, EPAFactory, EPACategoryFactory,
    AssessmentFactory, AssessmentEPAFactory,
    CoreCompetencyFactory, SubCompetencyFactory, SubCompetencyEPAFactory
)


@pytest.mark.django_db
class TestAssessmentListViews:
    """Test assessment listing and filtering"""
    
    def test_list_assessments_requires_authentication(self, api_client):
        """Test that listing assessments requires authentication"""
        url = reverse('assessment-list')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_trainee_sees_own_assessments(self, authenticated_client, trainee_user, faculty_user):
        """Test that trainee sees assessments they received"""
        # Create assessment for trainee
        assessment = AssessmentFactory(
            trainee=trainee_user,
            evaluator=faculty_user,
            status='submitted'
        )
        
        # Create assessment for another trainee (should not see)
        other_cohort = CohortFactory(
            org=trainee_user.organization,
            program=trainee_user.program
        )
        other_trainee = UserFactory(
            role='trainee',
            organization=trainee_user.organization,
            program=trainee_user.program,
            cohort=other_cohort
        )
        other_assessment = AssessmentFactory(
            trainee=other_trainee,
            evaluator=faculty_user,
            status='submitted'
        )
        
        url = reverse('assessment-list')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assessment_ids = [a['id'] for a in response.data['results']]
        
        assert str(assessment.id) in assessment_ids
        assert str(other_assessment.id) not in assessment_ids
    
    def test_faculty_sees_own_assessments(self, faculty_client, faculty_user):
        """Test that faculty sees assessments they created"""
        cohort = CohortFactory(
            org=faculty_user.organization,
            program=faculty_user.program
        )
        trainee = UserFactory(
            role='trainee',
            organization=faculty_user.organization,
            program=faculty_user.program,
            cohort=cohort
        )
        
        # Create assessment by faculty
        assessment = AssessmentFactory(
            trainee=trainee,
            evaluator=faculty_user,
            status='submitted'
        )
        
        # Create assessment by another faculty (should not see)
        other_faculty = UserFactory(
            role='faculty',
            organization=faculty_user.organization,
            program=faculty_user.program
        )
        other_assessment = AssessmentFactory(
            trainee=trainee,
            evaluator=other_faculty,
            status='submitted'
        )
        
        url = reverse('assessment-list')
        response = faculty_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assessment_ids = [a['id'] for a in response.data['results']]
        
        assert str(assessment.id) in assessment_ids
        assert str(other_assessment.id) not in assessment_ids
    
    def test_admin_sees_all_program_assessments(self, admin_client, admin_user):
        """Test that admin sees all submitted assessments in their program"""
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
        faculty = UserFactory(
            role='faculty',
            organization=admin_user.organization,
            program=admin_user.program
        )
        
        # Create submitted assessment (should see)
        submitted_assessment = AssessmentFactory(
            trainee=trainee,
            evaluator=faculty,
            status='submitted'
        )
        
        # Create draft by another faculty (should NOT see unless it's their own)
        draft_assessment = AssessmentFactory(
            trainee=trainee,
            evaluator=faculty,
            status='draft'
        )
        
        url = reverse('assessment-list')
        response = admin_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assessment_ids = [a['id'] for a in response.data['results']]
        
        assert str(submitted_assessment.id) in assessment_ids
        assert str(draft_assessment.id) not in assessment_ids
    
    def test_assessments_filtered_by_program(self, faculty_client, faculty_user):
        """Test that assessments are filtered by program (program isolation)"""
        # Create assessment in user's program
        cohort = CohortFactory(
            org=faculty_user.organization,
            program=faculty_user.program
        )
        trainee = UserFactory(
            role='trainee',
            organization=faculty_user.organization,
            program=faculty_user.program,
            cohort=cohort
        )
        same_program_assessment = AssessmentFactory(
            trainee=trainee,
            evaluator=faculty_user,
            status='submitted'
        )
        
        # Create assessment in different program
        other_program = ProgramFactory(org=faculty_user.organization)
        other_cohort = CohortFactory(
            org=faculty_user.organization,
            program=other_program
        )
        other_trainee = UserFactory(
            role='trainee',
            organization=faculty_user.organization,
            program=other_program,
            cohort=other_cohort
        )
        other_faculty = UserFactory(
            role='faculty',
            organization=faculty_user.organization,
            program=other_program
        )
        different_program_assessment = AssessmentFactory(
            trainee=other_trainee,
            evaluator=other_faculty,
            status='submitted'
        )
        
        url = reverse('assessment-list')
        response = faculty_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assessment_ids = [a['id'] for a in response.data['results']]
        
        assert str(same_program_assessment.id) in assessment_ids
        assert str(different_program_assessment.id) not in assessment_ids


@pytest.mark.django_db
class TestAssessmentCRUDOperations:
    """Test assessment create, read, update, delete operations"""
    
    def test_create_assessment_draft(self, faculty_client, faculty_user):
        """Test creating a draft assessment"""
        cohort = CohortFactory(
            org=faculty_user.organization,
            program=faculty_user.program
        )
        trainee = UserFactory(
            role='trainee',
            organization=faculty_user.organization,
            program=faculty_user.program,
            cohort=cohort
        )
        category = EPACategoryFactory(program=faculty_user.program)
        epa = EPAFactory(program=faculty_user.program, category=category)
        
        url = reverse('assessment-list')
        data = {
            'trainee': str(trainee.id),
            'evaluator': str(faculty_user.id),
            'shift_date': str(date.today()),
            'location': 'Emergency Department',
            'status': 'draft',
            'what_went_well': 'Great work',
            'what_could_improve': 'Time management',
            'assessment_epas': [
                {
                    'epa': str(epa.id),
                    'entrustment_level': 3
                }
            ]
        }
        
        response = faculty_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['status'] == 'draft'
        # Compare UUIDs properly - response may return UUID object or string
        assert str(response.data['trainee']) == str(trainee.id)
    
    def test_create_assessment_submitted(self, faculty_client, faculty_user):
        """Test creating a submitted assessment"""
        cohort = CohortFactory(
            org=faculty_user.organization,
            program=faculty_user.program
        )
        trainee = UserFactory(
            role='trainee',
            organization=faculty_user.organization,
            program=faculty_user.program,
            cohort=cohort
        )
        category = EPACategoryFactory(program=faculty_user.program)
        epa = EPAFactory(program=faculty_user.program, category=category)
        
        url = reverse('assessment-list')
        data = {
            'trainee': str(trainee.id),
            'evaluator': str(faculty_user.id),
            'shift_date': str(date.today()),
            'location': 'Emergency Department',
            'status': 'submitted',
            'assessment_epas': [
                {
                    'epa': str(epa.id),
                    'entrustment_level': 4
                }
            ]
        }
        
        response = faculty_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['status'] == 'submitted'
    
    def test_get_assessment_detail(self, faculty_client, faculty_user):
        """Test retrieving assessment details"""
        cohort = CohortFactory(
            org=faculty_user.organization,
            program=faculty_user.program
        )
        trainee = UserFactory(
            role='trainee',
            organization=faculty_user.organization,
            program=faculty_user.program,
            cohort=cohort
        )
        assessment = AssessmentFactory(
            trainee=trainee,
            evaluator=faculty_user,
            status='submitted'
        )
        
        category = EPACategoryFactory(program=faculty_user.program)
        epa = EPAFactory(program=faculty_user.program, category=category)
        AssessmentEPAFactory(
            assessment=assessment,
            epa=epa,
            entrustment_level=3
        )
        
        url = reverse('assessment-detail', args=[assessment.id])
        response = faculty_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == str(assessment.id)
        assert len(response.data['assessment_epas']) == 1
    
    def test_update_own_draft_assessment(self, faculty_client, faculty_user):
        """Test updating own draft assessment"""
        cohort = CohortFactory(
            org=faculty_user.organization,
            program=faculty_user.program
        )
        trainee = UserFactory(
            role='trainee',
            organization=faculty_user.organization,
            program=faculty_user.program,
            cohort=cohort
        )
        assessment = AssessmentFactory(
            trainee=trainee,
            evaluator=faculty_user,
            status='draft',
            what_went_well='Original comment'
        )
        
        url = reverse('assessment-detail', args=[assessment.id])
        data = {
            'trainee': str(trainee.id),
            'evaluator': str(faculty_user.id),
            'shift_date': str(assessment.shift_date),
            'location': assessment.location,
            'status': 'draft',
            'what_went_well': 'Updated comment',
            'assessment_epas': []
        }
        
        response = faculty_client.put(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['what_went_well'] == 'Updated comment'
    
    def test_delete_own_draft_assessment(self, faculty_client, faculty_user):
        """Test deleting own draft assessment"""
        cohort = CohortFactory(
            org=faculty_user.organization,
            program=faculty_user.program
        )
        trainee = UserFactory(
            role='trainee',
            organization=faculty_user.organization,
            program=faculty_user.program,
            cohort=cohort
        )
        assessment = AssessmentFactory(
            trainee=trainee,
            evaluator=faculty_user,
            status='draft'
        )
        assessment_id = assessment.id
        
        url = reverse('assessment-detail', args=[assessment_id])
        response = faculty_client.delete(url)
        
        # Accept both 200 and 204 as successful deletion
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT]
        assert not Assessment.objects.filter(id=assessment_id).exists()


@pytest.mark.django_db
class TestAssessmentFiltering:
    """Test assessment filtering functionality"""
    
    def test_filter_by_trainee_id(self, faculty_client, faculty_user):
        """Test filtering assessments by trainee"""
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
        
        assessment1 = AssessmentFactory(
            trainee=trainee1,
            evaluator=faculty_user,
            status='submitted'
        )
        assessment2 = AssessmentFactory(
            trainee=trainee2,
            evaluator=faculty_user,
            status='submitted'
        )
        
        url = reverse('assessment-list')
        response = faculty_client.get(url, {'trainee_id': str(trainee1.id)})
        
        assert response.status_code == status.HTTP_200_OK
        assessment_ids = [a['id'] for a in response.data['results']]
        
        assert str(assessment1.id) in assessment_ids
        assert str(assessment2.id) not in assessment_ids
    
    def test_filter_by_date_range(self, faculty_client, faculty_user):
        """Test filtering assessments by date range"""
        cohort = CohortFactory(
            org=faculty_user.organization,
            program=faculty_user.program
        )
        trainee = UserFactory(
            role='trainee',
            organization=faculty_user.organization,
            program=faculty_user.program,
            cohort=cohort
        )
        
        today = date.today()
        past_date = today - timedelta(days=30)
        future_date = today + timedelta(days=30)
        
        old_assessment = AssessmentFactory(
            trainee=trainee,
            evaluator=faculty_user,
            shift_date=past_date,
            status='submitted'
        )
        recent_assessment = AssessmentFactory(
            trainee=trainee,
            evaluator=faculty_user,
            shift_date=today,
            status='submitted'
        )
        
        url = reverse('assessment-list')
        # Filter for assessments from today onwards
        response = faculty_client.get(url, {
            'start_date': str(today)
        })
        
        assert response.status_code == status.HTTP_200_OK
        assessment_ids = [a['id'] for a in response.data['results']]
        
        assert str(recent_assessment.id) in assessment_ids
        assert str(old_assessment.id) not in assessment_ids
    
    def test_filter_by_epa(self, faculty_client, faculty_user):
        """Test filtering assessments by EPA"""
        cohort = CohortFactory(
            org=faculty_user.organization,
            program=faculty_user.program
        )
        trainee = UserFactory(
            role='trainee',
            organization=faculty_user.organization,
            program=faculty_user.program,
            cohort=cohort
        )
        
        category = EPACategoryFactory(program=faculty_user.program)
        epa1 = EPAFactory(program=faculty_user.program, category=category, code='EPA-01')
        epa2 = EPAFactory(program=faculty_user.program, category=category, code='EPA-02')
        
        assessment1 = AssessmentFactory(
            trainee=trainee,
            evaluator=faculty_user,
            status='submitted'
        )
        AssessmentEPAFactory(assessment=assessment1, epa=epa1)
        
        assessment2 = AssessmentFactory(
            trainee=trainee,
            evaluator=faculty_user,
            status='submitted'
        )
        AssessmentEPAFactory(assessment=assessment2, epa=epa2)
        
        url = reverse('assessment-list')
        response = faculty_client.get(url, {'epa_id': str(epa1.id)})
        
        assert response.status_code == status.HTTP_200_OK
        assessment_ids = [a['id'] for a in response.data['results']]
        
        assert str(assessment1.id) in assessment_ids
        assert str(assessment2.id) not in assessment_ids


@pytest.mark.django_db
class TestAssessmentPermissions:
    """Test assessment permission logic"""
    
    def test_trainee_cannot_create_assessment(self, authenticated_client, trainee_user):
        """Test that trainees cannot create assessments"""
        url = reverse('assessment-list')
        data = {
            'trainee': str(trainee_user.id),
            'evaluator': str(trainee_user.id),
            'shift_date': str(date.today()),
            'status': 'draft'
        }
        
        response = authenticated_client.post(url, data, format='json')
        
        # This may vary based on your permission implementation
        # Adjust the expected status code based on your actual permissions
        assert response.status_code in [
            status.HTTP_403_FORBIDDEN,
            status.HTTP_400_BAD_REQUEST
        ]
    
    def test_cannot_access_assessment_from_different_program(self, faculty_client, faculty_user):
        """Test that users cannot access assessments from different programs"""
        # Create assessment in different program
        other_program = ProgramFactory(org=faculty_user.organization)
        other_cohort = CohortFactory(
            org=faculty_user.organization,
            program=other_program
        )
        other_trainee = UserFactory(
            role='trainee',
            organization=faculty_user.organization,
            program=other_program,
            cohort=other_cohort
        )
        other_faculty = UserFactory(
            role='faculty',
            organization=faculty_user.organization,
            program=other_program
        )
        other_assessment = AssessmentFactory(
            trainee=other_trainee,
            evaluator=other_faculty,
            status='submitted'
        )
        
        url = reverse('assessment-detail', args=[other_assessment.id])
        response = faculty_client.get(url)
        
        # Should not be able to access
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestExportViews:
    """Test CSV export functionality"""
    
    def test_leadership_can_export(self, leadership_client, leadership_user, faculty_user):
        """Test that leadership user can export assessments"""
        # Create some test data
        trainee = UserFactory(
            role='trainee',
            organization=leadership_user.organization,
            program=leadership_user.program,
            cohort=CohortFactory(org=leadership_user.organization, program=leadership_user.program)
        )
        
        epa = EPAFactory(program=leadership_user.program)
        
        assessment = AssessmentFactory(
            trainee=trainee,
            evaluator=faculty_user,
            status='submitted',
            shift_date=date.today()
        )
        
        assessment_epa = AssessmentEPAFactory(
            assessment=assessment,
            epa=epa,
            entrustment_level=4
        )
        
        # Make request
        url = reverse('export_assessments')
        response = leadership_client.get(url, {
            'start_date': (date.today() - timedelta(days=7)).strftime('%Y-%m-%d'),
            'end_date': (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')
        })
        
        assert response.status_code == 200
        assert response['Content-Type'] == 'text/csv'
        assert 'attachment' in response['Content-Disposition']
        
        # Check CSV content
        content = response.content.decode('utf-8')
        assert trainee.name in content
        assert trainee.email in content
    
    def test_admin_can_export(self, admin_client, admin_user, faculty_user):
        """Test that admin user can export assessments"""
        trainee = UserFactory(
            role='trainee',
            organization=admin_user.organization,
            program=admin_user.program,
            cohort=CohortFactory(org=admin_user.organization, program=admin_user.program)
        )
        
        epa = EPAFactory(program=admin_user.program)
        
        assessment = AssessmentFactory(
            trainee=trainee,
            evaluator=faculty_user,
            status='submitted',
            shift_date=date.today()
        )
        
        assessment_epa = AssessmentEPAFactory(
            assessment=assessment,
            epa=epa,
            entrustment_level=3
        )
        
        url = reverse('export_assessments')
        response = admin_client.get(url, {
            'start_date': (date.today() - timedelta(days=7)).strftime('%Y-%m-%d'),
            'end_date': (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')
        })
        
        assert response.status_code == 200
        assert response['Content-Type'] == 'text/csv'
    
    def test_faculty_cannot_export(self, faculty_client, faculty_user):
        """Test that faculty user cannot export (403)"""
        url = reverse('export_assessments')
        response = faculty_client.get(url, {
            'start_date': date.today().strftime('%Y-%m-%d'),
            'end_date': date.today().strftime('%Y-%m-%d')
        })
        
        assert response.status_code == 403
        assert 'error' in response.json()
    
    def test_trainee_cannot_export(self, authenticated_client, trainee_user):
        """Test that trainee user cannot export (403)"""
        url = reverse('export_assessments')
        response = authenticated_client.get(url, {
            'start_date': date.today().strftime('%Y-%m-%d'),
            'end_date': date.today().strftime('%Y-%m-%d')
        })
        
        assert response.status_code == 403
        assert 'error' in response.json()
    
    def test_export_requires_dates(self, leadership_client, leadership_user):
        """Test that export requires start_date and end_date parameters"""
        url = reverse('export_assessments')
        
        # Missing both dates
        response = leadership_client.get(url)
        assert response.status_code == 400
        assert 'error' in response.json()
        
        # Missing end_date
        response = leadership_client.get(url, {'start_date': date.today().strftime('%Y-%m-%d')})
        assert response.status_code == 400
        
        # Missing start_date
        response = leadership_client.get(url, {'end_date': date.today().strftime('%Y-%m-%d')})
        assert response.status_code == 400
    
    def test_export_invalid_date_format(self, leadership_client, leadership_user):
        """Test that invalid date format returns 400"""
        url = reverse('export_assessments')
        response = leadership_client.get(url, {
            'start_date': '2024/01/01',  # Wrong format
            'end_date': '2024-01-31'
        })
        
        assert response.status_code == 400
        assert 'Invalid date format' in response.json()['error']
    
    def test_export_filters_by_program(self, leadership_client, leadership_user, faculty_user):
        """Test that export only includes assessments from user's program"""
        # Create assessment in user's program
        trainee_own = UserFactory(
            role='trainee',
            organization=leadership_user.organization,
            program=leadership_user.program,
            cohort=CohortFactory(org=leadership_user.organization, program=leadership_user.program)
        )
        
        epa_own = EPAFactory(program=leadership_user.program)
        
        assessment_own = AssessmentFactory(
            trainee=trainee_own,
            evaluator=faculty_user,
            status='submitted',
            shift_date=date.today()
        )
        
        assessment_epa_own = AssessmentEPAFactory(
            assessment=assessment_own,
            epa=epa_own,
            entrustment_level=4
        )
        
        # Create assessment in different program
        other_program = ProgramFactory(org=leadership_user.organization)
        trainee_other = UserFactory(
            role='trainee',
            organization=leadership_user.organization,
            program=other_program,
            cohort=CohortFactory(org=leadership_user.organization, program=other_program)
        )
        
        epa_other = EPAFactory(program=other_program)
        
        assessment_other = AssessmentFactory(
            trainee=trainee_other,
            evaluator=faculty_user,
            status='submitted',
            shift_date=date.today()
        )
        
        assessment_epa_other = AssessmentEPAFactory(
            assessment=assessment_other,
            epa=epa_other,
            entrustment_level=3
        )
        
        # Export
        url = reverse('export_assessments')
        response = leadership_client.get(url, {
            'start_date': (date.today() - timedelta(days=1)).strftime('%Y-%m-%d'),
            'end_date': (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')
        })
        
        assert response.status_code == 200
        content = response.content.decode('utf-8')
        
        # Should include own program's trainee
        assert trainee_own.name in content
        
        # Should NOT include other program's trainee
        assert trainee_other.name not in content
    
    def test_export_filters_by_cohort(self, leadership_client, leadership_user, faculty_user):
        """Test that cohort_id filter works"""
        cohort1 = CohortFactory(org=leadership_user.organization, program=leadership_user.program)
        cohort2 = CohortFactory(org=leadership_user.organization, program=leadership_user.program)
        
        trainee1 = UserFactory(
            role='trainee',
            organization=leadership_user.organization,
            program=leadership_user.program,
            cohort=cohort1
        )
        
        trainee2 = UserFactory(
            role='trainee',
            organization=leadership_user.organization,
            program=leadership_user.program,
            cohort=cohort2
        )
        
        epa = EPAFactory(program=leadership_user.program)
        
        assessment1 = AssessmentFactory(
            trainee=trainee1,
            evaluator=faculty_user,
            status='submitted',
            shift_date=date.today()
        )
        AssessmentEPAFactory(assessment=assessment1, epa=epa, entrustment_level=4)
        
        assessment2 = AssessmentFactory(
            trainee=trainee2,
            evaluator=faculty_user,
            status='submitted',
            shift_date=date.today()
        )
        AssessmentEPAFactory(assessment=assessment2, epa=epa, entrustment_level=3)
        
        # Export with cohort filter
        url = reverse('export_assessments')
        response = leadership_client.get(url, {
            'start_date': (date.today() - timedelta(days=1)).strftime('%Y-%m-%d'),
            'end_date': (date.today() + timedelta(days=1)).strftime('%Y-%m-%d'),
            'cohort_id': str(cohort1.id)
        })
        
        assert response.status_code == 200
        content = response.content.decode('utf-8')
        
        # Should include trainee from cohort1
        assert trainee1.name in content
        
        # Should NOT include trainee from cohort2
        assert trainee2.name not in content
    
    def test_export_csv_format(self, leadership_client, leadership_user, faculty_user):
        """Test that CSV has correct structure and all required columns"""
        trainee = UserFactory(
            role='trainee',
            organization=leadership_user.organization,
            program=leadership_user.program,
            cohort=CohortFactory(org=leadership_user.organization, program=leadership_user.program)
        )
        
        category = EPACategoryFactory(program=leadership_user.program)
        epa = EPAFactory(program=leadership_user.program, category=category)
        
        assessment = AssessmentFactory(
            trainee=trainee,
            evaluator=faculty_user,
            status='submitted',
            shift_date=date.today(),
            location='Emergency Department',
            what_went_well='Great assessment',
            what_could_improve='Minor improvements needed',
            private_comments='Leadership eyes only'
        )
        
        assessment_epa = AssessmentEPAFactory(
            assessment=assessment,
            epa=epa,
            entrustment_level=4
        )
        
        url = reverse('export_assessments')
        response = leadership_client.get(url, {
            'start_date': (date.today() - timedelta(days=1)).strftime('%Y-%m-%d'),
            'end_date': (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')
        })
        
        assert response.status_code == 200
        content = response.content.decode('utf-8')
        lines = content.strip().split('\n')
        
        # Should have header + at least 1 data row
        assert len(lines) >= 2
        
        # Check header
        header = lines[0]
        assert 'Trainee Name' in header
        assert 'Trainee Email' in header
        assert 'Cohort' in header
        assert 'Evaluator Name' in header
        assert 'Assessment Date' in header
        assert 'Location' in header
        assert 'EPA Code' in header
        assert 'EPA Title' in header
        assert 'EPA Category' in header
        assert 'Entrustment Level' in header
        assert 'What Went Well' in header
        assert 'What Could Improve' in header
        assert 'Private Comments' in header
        assert 'Assessment Created' in header
        
        # Check data row includes key info
        data_row = lines[1]
        assert trainee.name in data_row
        assert trainee.email in data_row
        assert faculty_user.name in data_row
        assert epa.code in data_row
        assert '4' in data_row  # Entrustment level
    
    def test_export_only_submitted_assessments(self, leadership_client, leadership_user, faculty_user):
        """Test that only submitted/locked assessments are exported (draft excluded)"""
        trainee = UserFactory(
            role='trainee',
            organization=leadership_user.organization,
            program=leadership_user.program,
            cohort=CohortFactory(org=leadership_user.organization, program=leadership_user.program)
        )
        
        epa1 = EPAFactory(program=leadership_user.program)
        epa2 = EPAFactory(program=leadership_user.program)
        
        # Create submitted assessment (should be included)
        assessment_submitted = AssessmentFactory(
            trainee=trainee,
            evaluator=faculty_user,
            status='submitted',
            shift_date=date.today()
        )
        AssessmentEPAFactory(assessment=assessment_submitted, epa=epa1, entrustment_level=4)
        
        # Create draft assessment (should NOT be included)
        assessment_draft = AssessmentFactory(
            trainee=trainee,
            evaluator=faculty_user,
            status='draft',
            shift_date=date.today()
        )
        AssessmentEPAFactory(assessment=assessment_draft, epa=epa2, entrustment_level=3)
        
        # Export
        url = reverse('export_assessments')
        response = leadership_client.get(url, {
            'start_date': (date.today() - timedelta(days=1)).strftime('%Y-%m-%d'),
            'end_date': (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')
        })
        
        assert response.status_code == 200
        content = response.content.decode('utf-8')
        
        # Verify submitted EPA data is present
        assert epa1.code in content
        
        # Verify draft EPA data is NOT present
        assert epa2.code not in content


@pytest.mark.django_db
class TestCompetencyGridExportViews:
    """Test competency grid CSV export functionality"""
    
    def test_leadership_can_export_competency_grid(self, leadership_client, leadership_user):
        """Test that leadership user can export competency grid"""
        # Create test data structure
        trainee = UserFactory(
            role='trainee',
            organization=leadership_user.organization,
            program=leadership_user.program,
            cohort=CohortFactory(org=leadership_user.organization, program=leadership_user.program)
        )
        
        competency = CoreCompetencyFactory(program=leadership_user.program)
        subcompetency = SubCompetencyFactory(core_competency=competency)
        epa = EPAFactory(program=leadership_user.program)
        
        # Link EPA to sub-competency
        SubCompetencyEPAFactory(sub_competency=subcompetency, epa=epa)
        
        # Create assessment
        faculty = UserFactory(
            role='faculty',
            organization=leadership_user.organization,
            program=leadership_user.program
        )
        assessment = AssessmentFactory(
            trainee=trainee,
            evaluator=faculty,
            status='submitted',
            shift_date=date.today()
        )
        AssessmentEPAFactory(assessment=assessment, epa=epa, entrustment_level=4)
        
        # Export
        url = reverse('export_competency_grid')
        response = leadership_client.get(url)
        
        assert response.status_code == 200
        assert response['Content-Type'] == 'text/csv'
        
        # Check content
        content = response.content.decode('utf-8')
        assert 'Trainee Name' in content
        assert trainee.name in content
        assert competency.title in content
        assert subcompetency.title in content
    
    def test_non_leadership_cannot_export_competency_grid(self, api_client, admin_user, faculty_user, trainee_user):
        """Test that non-leadership users cannot export competency grid"""
        url = reverse('export_competency_grid')
        
        # Test admin user
        from rest_framework.authtoken.models import Token
        token, _ = Token.objects.get_or_create(user=admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        response = api_client.get(url)
        assert response.status_code == 403
        
        # Test faculty user
        token, _ = Token.objects.get_or_create(user=faculty_user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        response = api_client.get(url)
        assert response.status_code == 403
        
        # Test trainee user
        token, _ = Token.objects.get_or_create(user=trainee_user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        response = api_client.get(url)
        assert response.status_code == 403
    
    def test_program_isolation_enforced(self, leadership_client, leadership_user):
        """Test that export only includes trainees from leader's program"""
        # Create competency structure for leadership user's program
        competency = CoreCompetencyFactory(program=leadership_user.program)
        subcompetency = SubCompetencyFactory(core_competency=competency, program=leadership_user.program)
        
        # Create trainee in same program
        trainee_same_program = UserFactory(
            role='trainee',
            organization=leadership_user.organization,
            program=leadership_user.program
        )
        
        # Create trainee in different program with different competency structure
        other_program = ProgramFactory(org=leadership_user.organization)
        other_competency = CoreCompetencyFactory(program=other_program)
        other_subcompetency = SubCompetencyFactory(core_competency=other_competency, program=other_program)
        trainee_other_program = UserFactory(
            role='trainee',
            organization=leadership_user.organization,
            program=other_program
        )
        
        # Export
        url = reverse('export_competency_grid')
        response = leadership_client.get(url)
        
        assert response.status_code == 200
        content = response.content.decode('utf-8')
        
        # Should include trainee from same program
        assert trainee_same_program.name in content
        
        # Should NOT include trainee from other program
        assert trainee_other_program.name not in content
    
    def test_date_filtering_works(self, leadership_client, leadership_user):
        """Test that start_date and end_date filters work correctly"""
        # Create test data
        trainee = UserFactory(
            role='trainee',
            organization=leadership_user.organization,
            program=leadership_user.program
        )
        
        competency = CoreCompetencyFactory(program=leadership_user.program)
        subcompetency = SubCompetencyFactory(core_competency=competency)
        epa = EPAFactory(program=leadership_user.program)
        SubCompetencyEPAFactory(sub_competency=subcompetency, epa=epa)
        
        faculty = UserFactory(role='faculty', organization=leadership_user.organization, program=leadership_user.program)
        
        # Create assessment from 10 days ago (should be excluded)
        old_date = date.today() - timedelta(days=10)
        assessment_old = AssessmentFactory(
            trainee=trainee,
            evaluator=faculty,
            status='submitted',
            shift_date=old_date
        )
        AssessmentEPAFactory(assessment=assessment_old, epa=epa, entrustment_level=2)
        
        # Create recent assessment (should be included)
        recent_date = date.today() - timedelta(days=2)
        assessment_recent = AssessmentFactory(
            trainee=trainee,
            evaluator=faculty,
            status='submitted',
            shift_date=recent_date
        )
        AssessmentEPAFactory(assessment=assessment_recent, epa=epa, entrustment_level=4)
        
        # Export with date filter
        url = reverse('export_competency_grid')
        response = leadership_client.get(url, {
            'start_date': (date.today() - timedelta(days=5)).strftime('%Y-%m-%d'),
            'end_date': date.today().strftime('%Y-%m-%d')
        })
        
        assert response.status_code == 200
        content = response.content.decode('utf-8')
        
        # Parse CSV to find the row with this trainee and subcompetency
        reader = csv.DictReader(content.splitlines())
        rows = list(reader)
        
        # Find row for this trainee/subcompetency
        trainee_rows = [r for r in rows if r['Trainee Name'] == trainee.name and r['Sub-Competency'] == subcompetency.title]
        assert len(trainee_rows) > 0
        
        # Should only have the recent assessment (entrustment 4)
        avg_entrustment = float(trainee_rows[0]['Avg Entrustment'])
        assert avg_entrustment == 4.0  # Only recent assessment included
    
    def test_cohort_filtering_works(self, leadership_client, leadership_user):
        """Test that cohort_id filter works correctly"""
        # Create competency structure
        competency = CoreCompetencyFactory(program=leadership_user.program)
        subcompetency = SubCompetencyFactory(core_competency=competency, program=leadership_user.program)
        
        # Create two cohorts with distinct names
        cohort1 = CohortFactory(org=leadership_user.organization, program=leadership_user.program, name='Cohort Alpha 2024')
        cohort2 = CohortFactory(org=leadership_user.organization, program=leadership_user.program, name='Cohort Beta 2024')
        
        # Create trainees in different cohorts
        trainee1 = UserFactory(
            role='trainee',
            organization=leadership_user.organization,
            program=leadership_user.program,
            cohort=cohort1
        )
        trainee2 = UserFactory(
            role='trainee',
            organization=leadership_user.organization,
            program=leadership_user.program,
            cohort=cohort2
        )
        
        # Export with cohort filter
        url = reverse('export_competency_grid')
        response = leadership_client.get(url, {'cohort_id': str(cohort1.id)})
        
        assert response.status_code == 200
        content = response.content.decode('utf-8')
        
        # Should include cohort1 name
        assert cohort1.name in content
        
        # Should NOT include cohort2 name
        assert cohort2.name not in content
    
    def test_csv_format_correct(self, leadership_client, leadership_user):
        """Test that CSV has correct structure with all required columns"""
        # Create test data
        trainee = UserFactory(
            role='trainee',
            organization=leadership_user.organization,
            program=leadership_user.program,
            cohort=CohortFactory(org=leadership_user.organization, program=leadership_user.program)
        )
        
        competency = CoreCompetencyFactory(program=leadership_user.program, title='Patient Care')
        subcompetency = SubCompetencyFactory(core_competency=competency, title='History Taking')
        epa = EPAFactory(program=leadership_user.program)
        SubCompetencyEPAFactory(sub_competency=subcompetency, epa=epa)
        
        faculty = UserFactory(role='faculty', organization=leadership_user.organization, program=leadership_user.program)
        assessment = AssessmentFactory(
            trainee=trainee,
            evaluator=faculty,
            status='submitted',
            shift_date=date.today()
        )
        AssessmentEPAFactory(assessment=assessment, epa=epa, entrustment_level=3)
        
        # Export
        url = reverse('export_competency_grid')
        response = leadership_client.get(url)
        
        assert response.status_code == 200
        content = response.content.decode('utf-8')
        
        # Check header row
        lines = content.strip().split('\n')
        header = lines[0]
        assert 'Trainee Name' in header
        assert 'Cohort' in header
        assert 'Core Competency' in header
        assert 'Sub-Competency' in header
        assert 'Avg Entrustment' in header
        assert 'Assessment Count' in header
        
        # Check data row format using CSV reader
        reader = csv.DictReader(content.splitlines())
        rows = list(reader)
        
        # Find row for our trainee/subcompetency
        trainee_rows = [r for r in rows if r['Trainee Name'] == trainee.name and r['Sub-Competency'] == 'History Taking']
        assert len(trainee_rows) > 0
        
        data_row = trainee_rows[0]
        assert data_row['Trainee Name'] == trainee.name
        assert data_row['Cohort'] == trainee.cohort.name
        assert data_row['Core Competency'] == 'Patient Care'
        assert data_row['Sub-Competency'] == 'History Taking'
        assert data_row['Avg Entrustment'] == '3.0'
        assert data_row['Assessment Count'] == '1'
    
    def test_empty_data_handling(self, leadership_client, leadership_user):
        """Test export handles trainees with no assessment data"""
        # Create trainee with no assessments
        trainee = UserFactory(
            role='trainee',
            organization=leadership_user.organization,
            program=leadership_user.program
        )
        
        # Create competency structure
        competency = CoreCompetencyFactory(program=leadership_user.program)
        subcompetency = SubCompetencyFactory(core_competency=competency)
        
        # Export should work even with no assessments
        url = reverse('export_competency_grid')
        response = leadership_client.get(url)
        
        assert response.status_code == 200
        content = response.content.decode('utf-8')
        
        # Should include trainee name
        assert trainee.name in content
        
        # Parse CSV to check empty values
        reader = csv.DictReader(content.splitlines())
        rows = list(reader)
        
        # Find rows for this trainee
        trainee_rows = [r for r in rows if r['Trainee Name'] == trainee.name]
        assert len(trainee_rows) > 0
        
        # Should have empty entrustment and 0 assessments
        for row in trainee_rows:
            assert row['Avg Entrustment'] == ''
            assert row['Assessment Count'] == '0'
    
    def test_invalid_date_format_error(self, leadership_client):
        """Test that invalid date formats return proper error"""
        url = reverse('export_competency_grid')
        
        # Invalid start_date
        response = leadership_client.get(url, {'start_date': 'invalid-date'})
        assert response.status_code == 400
        data = response.json()
        assert 'Invalid start_date format' in data['error']
        
        # Invalid end_date
        response = leadership_client.get(url, {'end_date': '2024/01/01'})
        assert response.status_code == 400
        data = response.json()
        assert 'Invalid end_date format' in data['error']

