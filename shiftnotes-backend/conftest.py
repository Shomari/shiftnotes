"""
Pytest configuration and shared fixtures for all tests
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
import factory
from factory.django import DjangoModelFactory
from faker import Faker

from organizations.models import Organization, Program, Site
from users.models import Cohort
from curriculum.models import EPA, EPACategory, CoreCompetency, SubCompetency, SubCompetencyEPA
from assessments.models import Assessment, AssessmentEPA

fake = Faker()
User = get_user_model()


# Factories for creating test data
class OrganizationFactory(DjangoModelFactory):
    class Meta:
        model = Organization
    
    name = factory.Faker('company')
    slug = factory.Sequence(lambda n: f'org-{n}')
    address_line1 = factory.Faker('street_address')


class ProgramFactory(DjangoModelFactory):
    class Meta:
        model = Program
    
    org = factory.SubFactory(OrganizationFactory)
    name = factory.Faker('bs')
    abbreviation = factory.Sequence(lambda n: f'PRG{n}')
    specialty = factory.Faker('job')


class SiteFactory(DjangoModelFactory):
    class Meta:
        model = Site
    
    org = factory.SubFactory(OrganizationFactory)
    program = factory.SubFactory(ProgramFactory)
    name = factory.Faker('company')


class CohortFactory(DjangoModelFactory):
    class Meta:
        model = Cohort
    
    org = factory.SubFactory(OrganizationFactory)
    program = factory.SubFactory(ProgramFactory)
    name = factory.Sequence(lambda n: f'Cohort {n}')
    start_date = factory.Faker('date_this_year')


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User
    
    email = factory.Faker('email')
    name = factory.Faker('name')
    role = 'trainee'
    organization = factory.SubFactory(OrganizationFactory)
    program = factory.SubFactory(ProgramFactory)
    department = factory.Faker('job')
    
    @factory.post_generation
    def password(obj, create, extracted, **kwargs):
        if create:
            password = extracted if extracted else 'testpass123'
            obj.set_password(password)
            obj.save()


class EPACategoryFactory(DjangoModelFactory):
    class Meta:
        model = EPACategory
    
    program = factory.SubFactory(ProgramFactory)
    title = factory.Faker('bs')


class EPAFactory(DjangoModelFactory):
    class Meta:
        model = EPA
    
    program = factory.SubFactory(ProgramFactory)
    category = factory.SubFactory(EPACategoryFactory)
    code = factory.Sequence(lambda n: f'EPA-{n:02d}')
    title = factory.Faker('catch_phrase')
    description = factory.Faker('text')
    is_active = True


class CoreCompetencyFactory(DjangoModelFactory):
    class Meta:
        model = CoreCompetency
    
    program = factory.SubFactory(ProgramFactory)
    code = factory.Sequence(lambda n: f'CC{n}')
    title = factory.Faker('bs')


class SubCompetencyFactory(DjangoModelFactory):
    class Meta:
        model = SubCompetency
    
    program = factory.SubFactory(ProgramFactory)
    core_competency = factory.SubFactory(CoreCompetencyFactory)
    code = factory.Sequence(lambda n: f'SC{n}')
    title = factory.Faker('bs')
    milestone_level_1 = factory.Faker('text', max_nb_chars=100)
    milestone_level_2 = factory.Faker('text', max_nb_chars=100)
    milestone_level_3 = factory.Faker('text', max_nb_chars=100)
    milestone_level_4 = factory.Faker('text', max_nb_chars=100)
    milestone_level_5 = factory.Faker('text', max_nb_chars=100)


class SubCompetencyEPAFactory(DjangoModelFactory):
    class Meta:
        model = SubCompetencyEPA
    
    sub_competency = factory.SubFactory(SubCompetencyFactory)
    epa = factory.SubFactory(EPAFactory)


class AssessmentFactory(DjangoModelFactory):
    class Meta:
        model = Assessment
    
    trainee = factory.SubFactory(UserFactory, role='trainee')
    evaluator = factory.SubFactory(UserFactory, role='faculty')
    shift_date = factory.Faker('date_this_year')
    location = factory.Faker('city')
    status = 'draft'
    private_comments = factory.Faker('text')
    what_went_well = factory.Faker('text')
    what_could_improve = factory.Faker('text')


class AssessmentEPAFactory(DjangoModelFactory):
    class Meta:
        model = AssessmentEPA
    
    assessment = factory.SubFactory(AssessmentFactory)
    epa = factory.SubFactory(EPAFactory)
    entrustment_level = 3


# Basic fixtures
@pytest.fixture
def api_client():
    """Unauthenticated API client"""
    return APIClient()


@pytest.fixture
def organization():
    """Create a test organization"""
    return OrganizationFactory()


@pytest.fixture
def program(organization):
    """Create a test program"""
    return ProgramFactory(org=organization)


@pytest.fixture
def cohort(organization, program):
    """Create a test cohort"""
    return CohortFactory(org=organization, program=program)


@pytest.fixture
def trainee_user(organization, program, cohort):
    """Create a trainee user"""
    return UserFactory(
        role='trainee',
        organization=organization,
        program=program,
        cohort=cohort,
        password='testpass123'
    )


@pytest.fixture
def faculty_user(organization, program):
    """Create a faculty user"""
    return UserFactory(
        role='faculty',
        organization=organization,
        program=program,
        password='testpass123'
    )


@pytest.fixture
def admin_user(organization, program):
    """Create an admin user"""
    return UserFactory(
        role='admin',
        organization=organization,
        program=program,
        password='testpass123'
    )


@pytest.fixture
def leadership_user(organization, program):
    """Create a leadership user"""
    return UserFactory(
        role='leadership',
        organization=organization,
        program=program,
        password='testpass123'
    )


@pytest.fixture
def authenticated_client(api_client, trainee_user):
    """API client authenticated as trainee"""
    token, _ = Token.objects.get_or_create(user=trainee_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    api_client.user = trainee_user
    return api_client


@pytest.fixture
def faculty_client(api_client, faculty_user):
    """API client authenticated as faculty"""
    token, _ = Token.objects.get_or_create(user=faculty_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    api_client.user = faculty_user
    return api_client


@pytest.fixture
def admin_client(api_client, admin_user):
    """API client authenticated as admin"""
    token, _ = Token.objects.get_or_create(user=admin_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    api_client.user = admin_user
    return api_client


@pytest.fixture
def leadership_client(api_client, leadership_user):
    """API client authenticated as leadership"""
    token, _ = Token.objects.get_or_create(user=leadership_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    api_client.user = leadership_user
    return api_client


@pytest.fixture
def epa(program):
    """Create a test EPA"""
    category = EPACategoryFactory(program=program)
    return EPAFactory(program=program, category=category)


@pytest.fixture
def assessment(trainee_user, faculty_user, epa):
    """Create a test assessment"""
    assessment = AssessmentFactory(
        trainee=trainee_user,
        evaluator=faculty_user,
        status='draft'
    )
    AssessmentEPAFactory(assessment=assessment, epa=epa, entrustment_level=3)
    return assessment

