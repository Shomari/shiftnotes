"""
Tests for Assessment and AssessmentEPA models
"""
import pytest
from datetime import date

from assessments.models import Assessment, AssessmentEPA
from conftest import (
    OrganizationFactory, ProgramFactory, CohortFactory, 
    UserFactory, EPAFactory, EPACategoryFactory,
    AssessmentFactory, AssessmentEPAFactory
)


@pytest.mark.django_db
class TestAssessmentModel:
    """Test Assessment model functionality"""
    
    def test_create_assessment_with_required_fields(self):
        """Test creating an assessment with required fields"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        cohort = CohortFactory(org=org, program=program)
        
        trainee = UserFactory(
            role='trainee',
            organization=org,
            program=program,
            cohort=cohort
        )
        evaluator = UserFactory(
            role='faculty',
            organization=org,
            program=program
        )
        
        assessment = Assessment.objects.create(
            trainee=trainee,
            evaluator=evaluator,
            shift_date=date.today(),
            location='Emergency Department',
            status='draft'
        )
        
        assert assessment.trainee == trainee
        assert assessment.evaluator == evaluator
        assert assessment.shift_date == date.today()
        assert assessment.location == 'Emergency Department'
        assert assessment.status == 'draft'
    
    def test_assessment_status_choices(self):
        """Test assessment status choices"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        cohort = CohortFactory(org=org, program=program)
        
        trainee = UserFactory(role='trainee', organization=org, program=program, cohort=cohort)
        evaluator = UserFactory(role='faculty', organization=org, program=program)
        
        # Test valid statuses
        for status in ['draft', 'submitted', 'locked']:
            assessment = AssessmentFactory(
                trainee=trainee,
                evaluator=evaluator,
                status=status
            )
            assert assessment.status == status
    
    def test_assessment_default_status_is_draft(self):
        """Test that default status is draft"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        cohort = CohortFactory(org=org, program=program)
        
        trainee = UserFactory(role='trainee', organization=org, program=program, cohort=cohort)
        evaluator = UserFactory(role='faculty', organization=org, program=program)
        
        assessment = Assessment.objects.create(
            trainee=trainee,
            evaluator=evaluator,
            shift_date=date.today()
        )
        
        assert assessment.status == 'draft'
    
    def test_assessment_with_comments(self):
        """Test assessment with various comment fields"""
        assessment = AssessmentFactory(
            private_comments='Private feedback here',
            what_went_well='Great communication',
            what_could_improve='Time management'
        )
        
        assert assessment.private_comments == 'Private feedback here'
        assert assessment.what_went_well == 'Great communication'
        assert assessment.what_could_improve == 'Time management'
    
    def test_assessment_string_representation(self):
        """Test __str__ method"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        cohort = CohortFactory(org=org, program=program)
        
        trainee = UserFactory(
            name='Jane Trainee',
            role='trainee',
            organization=org,
            program=program,
            cohort=cohort
        )
        evaluator = UserFactory(
            name='Dr. Faculty',
            role='faculty',
            organization=org,
            program=program
        )
        
        assessment = AssessmentFactory(trainee=trainee, evaluator=evaluator)
        str_repr = str(assessment)
        
        assert 'Jane Trainee' in str_repr
        assert 'Dr. Faculty' in str_repr
    
    def test_assessment_acknowledged_by_many_to_many(self):
        """Test acknowledged_by many-to-many relationship"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        cohort = CohortFactory(org=org, program=program)
        
        trainee = UserFactory(role='trainee', organization=org, program=program, cohort=cohort)
        evaluator = UserFactory(role='faculty', organization=org, program=program)
        leadership1 = UserFactory(role='leadership', organization=org, program=program)
        leadership2 = UserFactory(role='leadership', organization=org, program=program)
        
        assessment = AssessmentFactory(trainee=trainee, evaluator=evaluator)
        assessment.acknowledged_by.add(leadership1, leadership2)
        
        assert assessment.acknowledged_by.count() == 2
        assert leadership1 in assessment.acknowledged_by.all()
        assert leadership2 in assessment.acknowledged_by.all()


@pytest.mark.django_db
class TestAssessmentEPAModel:
    """Test AssessmentEPA model functionality"""
    
    def test_create_assessment_epa(self):
        """Test creating an AssessmentEPA"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        cohort = CohortFactory(org=org, program=program)
        
        trainee = UserFactory(role='trainee', organization=org, program=program, cohort=cohort)
        evaluator = UserFactory(role='faculty', organization=org, program=program)
        
        assessment = AssessmentFactory(trainee=trainee, evaluator=evaluator)
        category = EPACategoryFactory(program=program)
        epa = EPAFactory(program=program, category=category, code='EPA-01')
        
        assessment_epa = AssessmentEPA.objects.create(
            assessment=assessment,
            epa=epa,
            entrustment_level=3
        )
        
        assert assessment_epa.assessment == assessment
        assert assessment_epa.epa == epa
        assert assessment_epa.entrustment_level == 3
    
    def test_assessment_epa_entrustment_levels(self):
        """Test all valid entrustment levels"""
        assessment = AssessmentFactory()
        
        # Test all 5 levels - create unique EPA for each to avoid unique constraint violation
        for level in range(1, 6):
            epa = EPAFactory(program=assessment.trainee.program)
            assessment_epa = AssessmentEPAFactory(
                assessment=assessment,
                epa=epa,
                entrustment_level=level
            )
            assert assessment_epa.entrustment_level == level
    
    def test_assessment_epa_unique_together_constraint(self):
        """Test that assessment-epa combination must be unique"""
        assessment = AssessmentFactory()
        epa = EPAFactory(program=assessment.trainee.program)
        
        # Create first AssessmentEPA
        AssessmentEPAFactory(
            assessment=assessment,
            epa=epa,
            entrustment_level=3
        )
        
        # Try to create duplicate - should raise IntegrityError
        from django.db import IntegrityError
        with pytest.raises(IntegrityError):
            AssessmentEPAFactory(
                assessment=assessment,
                epa=epa,
                entrustment_level=4
            )
    
    def test_assessment_epa_string_representation(self):
        """Test __str__ method"""
        epa = EPAFactory(code='EPA-EM-01')
        assessment_epa = AssessmentEPAFactory(
            epa=epa,
            entrustment_level=4
        )
        
        str_repr = str(assessment_epa)
        assert 'EPA-EM-01' in str_repr
        assert '4' in str_repr
    
    def test_assessment_with_multiple_epas(self):
        """Test assessment with multiple EPAs"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        cohort = CohortFactory(org=org, program=program)
        
        trainee = UserFactory(role='trainee', organization=org, program=program, cohort=cohort)
        evaluator = UserFactory(role='faculty', organization=org, program=program)
        assessment = AssessmentFactory(trainee=trainee, evaluator=evaluator)
        
        category = EPACategoryFactory(program=program)
        epa1 = EPAFactory(program=program, category=category, code='EPA-01')
        epa2 = EPAFactory(program=program, category=category, code='EPA-02')
        epa3 = EPAFactory(program=program, category=category, code='EPA-03')
        
        AssessmentEPAFactory(assessment=assessment, epa=epa1, entrustment_level=3)
        AssessmentEPAFactory(assessment=assessment, epa=epa2, entrustment_level=4)
        AssessmentEPAFactory(assessment=assessment, epa=epa3, entrustment_level=2)
        
        assert assessment.assessment_epas.count() == 3

