"""
Tests for Organization, Program, and Site models
"""
import pytest

from organizations.models import Organization, Program, Site
from conftest import OrganizationFactory, ProgramFactory, SiteFactory


@pytest.mark.django_db
class TestOrganizationModel:
    """Test Organization model functionality"""
    
    def test_create_organization(self):
        """Test creating an organization"""
        org = Organization.objects.create(
            name='University Hospital',
            slug='university-hospital',
            address_line1='123 Medical Drive'
        )
        
        assert org.name == 'University Hospital'
        assert org.slug == 'university-hospital'
        assert org.address_line1 == '123 Medical Drive'
    
    def test_organization_slug_is_unique(self):
        """Test that slug must be unique"""
        OrganizationFactory(slug='test-org')
        
        from django.db import IntegrityError
        with pytest.raises(IntegrityError):
            OrganizationFactory(slug='test-org')
    
    def test_organization_string_representation(self):
        """Test __str__ method"""
        org = OrganizationFactory(name='Test Hospital')
        assert str(org) == 'Test Hospital'
    
    def test_organization_ordering(self):
        """Test that organizations are ordered by name"""
        org_c = OrganizationFactory(name='C Hospital')
        org_a = OrganizationFactory(name='A Hospital')
        org_b = OrganizationFactory(name='B Hospital')
        
        orgs = list(Organization.objects.all())
        assert orgs[0] == org_a
        assert orgs[1] == org_b
        assert orgs[2] == org_c


@pytest.mark.django_db
class TestProgramModel:
    """Test Program model functionality"""
    
    def test_create_program(self):
        """Test creating a program"""
        org = OrganizationFactory()
        program = Program.objects.create(
            org=org,
            name='Emergency Medicine Residency',
            abbreviation='EM',
            specialty='Emergency Medicine'
        )
        
        assert program.name == 'Emergency Medicine Residency'
        assert program.abbreviation == 'EM'
        assert program.specialty == 'Emergency Medicine'
        assert program.org == org
    
    def test_program_organization_relationship(self):
        """Test program-organization relationship"""
        org = OrganizationFactory()
        program1 = ProgramFactory(org=org)
        program2 = ProgramFactory(org=org)
        
        assert program1.org == org
        assert program2.org == org
        assert org.programs.count() == 2
        assert program1 in org.programs.all()
        assert program2 in org.programs.all()
    
    def test_program_string_representation(self):
        """Test __str__ method"""
        org = OrganizationFactory(name='University Hospital')
        program = ProgramFactory(
            org=org,
            name='Emergency Medicine'
        )
        
        assert str(program) == 'Emergency Medicine (University Hospital)'
    
    def test_program_ordering(self):
        """Test that programs are ordered by name"""
        org = OrganizationFactory()
        prog_c = ProgramFactory(org=org, name='C Program')
        prog_a = ProgramFactory(org=org, name='A Program')
        prog_b = ProgramFactory(org=org, name='B Program')
        
        programs = list(Program.objects.all())
        assert programs[0] == prog_a
        assert programs[1] == prog_b
        assert programs[2] == prog_c


@pytest.mark.django_db
class TestSiteModel:
    """Test Site model functionality"""
    
    def test_create_site(self):
        """Test creating a site"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        
        site = Site.objects.create(
            org=org,
            program=program,
            name='Main Hospital ED'
        )
        
        assert site.name == 'Main Hospital ED'
        assert site.org == org
        assert site.program == program
    
    def test_site_relationships(self):
        """Test site relationships with org and program"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        
        site1 = SiteFactory(org=org, program=program)
        site2 = SiteFactory(org=org, program=program)
        
        assert org.sites.count() == 2
        assert program.sites.count() == 2
        assert site1 in org.sites.all()
        assert site2 in program.sites.all()
    
    def test_site_string_representation(self):
        """Test __str__ method"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org, name='EM Residency')
        site = SiteFactory(
            org=org,
            program=program,
            name='Downtown ED'
        )
        
        assert str(site) == 'Downtown ED - EM Residency'
    
    def test_site_ordering(self):
        """Test that sites are ordered by name"""
        org = OrganizationFactory()
        program = ProgramFactory(org=org)
        
        site_c = SiteFactory(org=org, program=program, name='C Site')
        site_a = SiteFactory(org=org, program=program, name='A Site')
        site_b = SiteFactory(org=org, program=program, name='B Site')
        
        sites = list(Site.objects.all())
        assert sites[0] == site_a
        assert sites[1] == site_b
        assert sites[2] == site_c

