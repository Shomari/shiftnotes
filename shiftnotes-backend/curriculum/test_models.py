"""
Tests for Curriculum models (EPA, EPACategory, CoreCompetency, SubCompetency)
"""
import pytest

from curriculum.models import (
    EPA, EPACategory, CoreCompetency, SubCompetency, SubCompetencyEPA
)
from conftest import (
    OrganizationFactory, ProgramFactory,
    EPAFactory, EPACategoryFactory,
    CoreCompetencyFactory, SubCompetencyFactory
)


@pytest.mark.django_db
class TestEPACategoryModel:
    """Test EPACategory model functionality"""
    
    def test_create_epa_category(self):
        """Test creating an EPA category"""
        program = ProgramFactory()
        category = EPACategory.objects.create(
            program=program,
            title='Initial Patient Care'
        )
        
        assert category.title == 'Initial Patient Care'
        assert category.program == program
    
    def test_epa_category_string_representation(self):
        """Test __str__ method"""
        category = EPACategoryFactory(title='Emergency Procedures')
        assert str(category) == 'Emergency Procedures'
    
    def test_epa_category_ordering(self):
        """Test that categories are ordered by title"""
        program = ProgramFactory()
        cat_c = EPACategoryFactory(program=program, title='C Category')
        cat_a = EPACategoryFactory(program=program, title='A Category')
        cat_b = EPACategoryFactory(program=program, title='B Category')
        
        categories = list(EPACategory.objects.all())
        assert categories[0] == cat_a
        assert categories[1] == cat_b
        assert categories[2] == cat_c


@pytest.mark.django_db
class TestEPAModel:
    """Test EPA model functionality"""
    
    def test_create_epa(self):
        """Test creating an EPA"""
        program = ProgramFactory()
        category = EPACategoryFactory(program=program)
        
        epa = EPA.objects.create(
            program=program,
            category=category,
            code='EPA-EM-01',
            title='Triage patients',
            description='Assess and prioritize patient care',
            is_active=True
        )
        
        assert epa.code == 'EPA-EM-01'
        assert epa.title == 'Triage patients'
        assert epa.description == 'Assess and prioritize patient care'
        assert epa.is_active is True
        assert epa.program == program
        assert epa.category == category
    
    def test_epa_default_is_active(self):
        """Test that is_active defaults to True"""
        program = ProgramFactory()
        category = EPACategoryFactory(program=program)
        
        epa = EPA.objects.create(
            program=program,
            category=category,
            code='EPA-01',
            title='Test EPA'
        )
        
        assert epa.is_active is True
    
    def test_epa_unique_together_constraint(self):
        """Test that program-code combination must be unique"""
        program = ProgramFactory()
        category = EPACategoryFactory(program=program)
        
        EPAFactory(program=program, category=category, code='EPA-01')
        
        from django.db import IntegrityError
        with pytest.raises(IntegrityError):
            EPAFactory(program=program, category=category, code='EPA-01')
    
    def test_epa_same_code_different_programs(self):
        """Test that same code can exist in different programs"""
        program1 = ProgramFactory()
        program2 = ProgramFactory()
        
        category1 = EPACategoryFactory(program=program1)
        category2 = EPACategoryFactory(program=program2)
        
        epa1 = EPAFactory(program=program1, category=category1, code='EPA-01')
        epa2 = EPAFactory(program=program2, category=category2, code='EPA-01')
        
        assert epa1.code == epa2.code
        assert epa1.program != epa2.program
    
    def test_epa_string_representation(self):
        """Test __str__ method"""
        epa = EPAFactory(
            code='EPA-EM-01',
            title='Triage patients'
        )
        assert str(epa) == 'EPA-EM-01: Triage patients'
    
    def test_epa_ordering(self):
        """Test that EPAs are ordered by code"""
        program = ProgramFactory()
        category = EPACategoryFactory(program=program)
        
        epa_03 = EPAFactory(program=program, category=category, code='EPA-03')
        epa_01 = EPAFactory(program=program, category=category, code='EPA-01')
        epa_02 = EPAFactory(program=program, category=category, code='EPA-02')
        
        epas = list(EPA.objects.filter(program=program))
        assert epas[0] == epa_01
        assert epas[1] == epa_02
        assert epas[2] == epa_03


@pytest.mark.django_db
class TestCoreCompetencyModel:
    """Test CoreCompetency model functionality"""
    
    def test_create_core_competency(self):
        """Test creating a core competency"""
        program = ProgramFactory()
        
        competency = CoreCompetency.objects.create(
            program=program,
            code='PC',
            title='Patient Care'
        )
        
        assert competency.code == 'PC'
        assert competency.title == 'Patient Care'
        assert competency.program == program
    
    def test_core_competency_string_representation(self):
        """Test __str__ method"""
        competency = CoreCompetencyFactory(
            code='MK',
            title='Medical Knowledge'
        )
        assert str(competency) == 'MK: Medical Knowledge'
    
    def test_core_competency_ordering(self):
        """Test that competencies are ordered by code"""
        program = ProgramFactory()
        
        comp_pc = CoreCompetencyFactory(program=program, code='PC')
        comp_mk = CoreCompetencyFactory(program=program, code='MK')
        comp_pbli = CoreCompetencyFactory(program=program, code='PBLI')
        
        comps = list(CoreCompetency.objects.filter(program=program))
        assert comps[0] == comp_mk
        assert comps[1] == comp_pbli
        assert comps[2] == comp_pc


@pytest.mark.django_db
class TestSubCompetencyModel:
    """Test SubCompetency model functionality"""
    
    def test_create_sub_competency(self):
        """Test creating a sub-competency"""
        program = ProgramFactory()
        core_comp = CoreCompetencyFactory(program=program)
        
        sub_comp = SubCompetency.objects.create(
            program=program,
            core_competency=core_comp,
            code='PC1',
            title='Gather essential information',
            milestone_level_1='Level 1 description',
            milestone_level_2='Level 2 description',
            milestone_level_3='Level 3 description',
            milestone_level_4='Level 4 description',
            milestone_level_5='Level 5 description'
        )
        
        assert sub_comp.code == 'PC1'
        assert sub_comp.title == 'Gather essential information'
        assert sub_comp.program == program
        assert sub_comp.core_competency == core_comp
        assert sub_comp.milestone_level_1 == 'Level 1 description'
    
    def test_sub_competency_string_representation(self):
        """Test __str__ method"""
        sub_comp = SubCompetencyFactory(
            code='PC1',
            title='Patient assessment'
        )
        assert str(sub_comp) == 'PC1: Patient assessment'
    
    def test_sub_competency_core_competency_relationship(self):
        """Test relationship between sub and core competency"""
        program = ProgramFactory()
        core_comp = CoreCompetencyFactory(program=program)
        
        sub1 = SubCompetencyFactory(program=program, core_competency=core_comp)
        sub2 = SubCompetencyFactory(program=program, core_competency=core_comp)
        
        assert core_comp.sub_competencies.count() == 2
        assert sub1 in core_comp.sub_competencies.all()
        assert sub2 in core_comp.sub_competencies.all()
    
    def test_sub_competency_ordering(self):
        """Test that sub-competencies are ordered by code"""
        program = ProgramFactory()
        core_comp = CoreCompetencyFactory(program=program)
        
        sub_03 = SubCompetencyFactory(program=program, core_competency=core_comp, code='SC03')
        sub_01 = SubCompetencyFactory(program=program, core_competency=core_comp, code='SC01')
        sub_02 = SubCompetencyFactory(program=program, core_competency=core_comp, code='SC02')
        
        subs = list(SubCompetency.objects.filter(program=program))
        assert subs[0] == sub_01
        assert subs[1] == sub_02
        assert subs[2] == sub_03


@pytest.mark.django_db
class TestSubCompetencyEPAModel:
    """Test SubCompetencyEPA relationship model"""
    
    def test_create_sub_competency_epa_relationship(self):
        """Test creating a sub-competency to EPA relationship"""
        program = ProgramFactory()
        core_comp = CoreCompetencyFactory(program=program)
        sub_comp = SubCompetencyFactory(program=program, core_competency=core_comp)
        
        category = EPACategoryFactory(program=program)
        epa = EPAFactory(program=program, category=category)
        
        relationship = SubCompetencyEPA.objects.create(
            sub_competency=sub_comp,
            epa=epa
        )
        
        assert relationship.sub_competency == sub_comp
        assert relationship.epa == epa
    
    def test_sub_competency_epa_unique_together(self):
        """Test that sub-competency-epa combination must be unique"""
        program = ProgramFactory()
        core_comp = CoreCompetencyFactory(program=program)
        sub_comp = SubCompetencyFactory(program=program, core_competency=core_comp)
        
        category = EPACategoryFactory(program=program)
        epa = EPAFactory(program=program, category=category)
        
        SubCompetencyEPA.objects.create(
            sub_competency=sub_comp,
            epa=epa
        )
        
        from django.db import IntegrityError
        with pytest.raises(IntegrityError):
            SubCompetencyEPA.objects.create(
                sub_competency=sub_comp,
                epa=epa
            )
    
    def test_sub_competency_epa_many_to_many(self):
        """Test many-to-many relationship through SubCompetencyEPA"""
        program = ProgramFactory()
        core_comp = CoreCompetencyFactory(program=program)
        sub_comp = SubCompetencyFactory(program=program, core_competency=core_comp)
        
        category = EPACategoryFactory(program=program)
        epa1 = EPAFactory(program=program, category=category, code='EPA-01')
        epa2 = EPAFactory(program=program, category=category, code='EPA-02')
        
        sub_comp.epas.add(epa1, epa2)
        
        assert sub_comp.epas.count() == 2
        assert epa1 in sub_comp.epas.all()
        assert epa2 in sub_comp.epas.all()
    
    def test_sub_competency_epa_string_representation(self):
        """Test __str__ method"""
        program = ProgramFactory()
        core_comp = CoreCompetencyFactory(program=program)
        sub_comp = SubCompetencyFactory(
            program=program,
            core_competency=core_comp,
            code='PC1'
        )
        
        category = EPACategoryFactory(program=program)
        epa = EPAFactory(program=program, category=category, code='EPA-01')
        
        relationship = SubCompetencyEPA.objects.create(
            sub_competency=sub_comp,
            epa=epa
        )
        
        assert str(relationship) == 'PC1 - EPA-01'

