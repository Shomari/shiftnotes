"""
Management command to create comprehensive, focused test data for the competency grid.
One organization, focused programs, complete data flow from users to assessments.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from organizations.models import Organization, Program, Site
from curriculum.models import EPACategory, EPA, CoreCompetency, SubCompetency, SubCompetencyEPA
from users.models import Cohort
from assessments.models import Assessment, AssessmentEPA
from datetime import date, timedelta, datetime
import uuid
import random

User = get_user_model()


class Command(BaseCommand):
    help = 'Create comprehensive test data for competency grid demonstration'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before populating',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing data...')
            self.clear_data()

        self.stdout.write('Creating comprehensive test data...')
        
        # Create single organization with complete data
        org = self.create_organization()
        users, faculty_users, trainee = self.create_users(org)
        programs = self.create_programs(org, users)
        self.associate_users_with_programs(users, faculty_users, trainee, programs)
        sites = self.create_sites(org, programs)
        cohorts = self.create_cohorts(org, programs)
        
        # Create curriculum with proper mappings
        epas, sub_competencies = self.create_curriculum_data(programs)
        self.create_epa_subcompetency_mappings(programs, epas, sub_competencies)
        
        # Create comprehensive assessments
        self.create_comprehensive_assessments(trainee, faculty_users, epas)

        self.stdout.write(
            self.style.SUCCESS(
                'Successfully created comprehensive test data!'
            )
        )

    def clear_data(self):
        """Clear all existing data"""
        # Clear in dependency order
        AssessmentEPA.objects.all().delete()
        Assessment.objects.all().delete()
        SubCompetencyEPA.objects.all().delete()
        SubCompetency.objects.all().delete()
        CoreCompetency.objects.all().delete()
        EPA.objects.all().delete()
        EPACategory.objects.all().delete()
        Cohort.objects.all().delete()
        Site.objects.all().delete()
        Program.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        Organization.objects.all().delete()
        self.stdout.write('✓ Cleared all existing data')

    def create_organization(self):
        """Create single test organization"""
        org, created = Organization.objects.get_or_create(
            slug='johns-hopkins',
            defaults={
                'name': 'Johns Hopkins Hospital',
                'address_line1': '1800 Orleans St, Baltimore, MD 21287'
            }
        )
        if created:
            self.stdout.write(f'✓ Created organization: {org.name}')
        return org

    def create_users(self, org):
        """Create test users with standard logins"""
        users = []
        faculty_users = []
        
        # Create superuser
        if not User.objects.filter(is_superuser=True).exists():
            superuser = User.objects.create_superuser(
                email='admin@shiftnotes.com',
                password='demo',
                name='System Administrator'
            )
            users.append(superuser)
            self.stdout.write('✓ Created superuser: admin@shiftnotes.com / demo')

        # Create org-specific users
        user_data = [
            {
                'email': 'admin@johns-hopkins.com',
                'name': 'Johns Hopkins Admin',
                'role': 'admin',
                'organization': org
            },
            {
                'email': 'faculty@johns-hopkins.com',
                'name': 'Dr. Sarah Johnson',
                'role': 'faculty',
                'organization': org
            },
            {
                'email': 'faculty2@johns-hopkins.com',
                'name': 'Dr. Michael Chen',
                'role': 'faculty',
                'organization': org
            },
            {
                'email': 'leadership@johns-hopkins.com',
                'name': 'Dr. Emily Rodriguez',
                'role': 'leadership',
                'organization': org
            },
            {
                'email': 'trainee@johns-hopkins.com',
                'name': 'Alex Thompson',
                'role': 'trainee',
                'organization': org,
                'start_date': date.today() - timedelta(days=30)
            }
        ]
        
        trainee = None
        
        for data in user_data:
            user, created = User.objects.get_or_create(
                email=data['email'],
                defaults={**data, 'password': 'demo'}
            )
            if created:
                user.set_password('demo')
                user.save()
                users.append(user)
                if user.role in ['faculty', 'leadership']:
                    faculty_users.append(user)
                elif user.role == 'trainee':
                    trainee = user
                self.stdout.write(f'✓ Created user: {user.email} / demo')
        
        return users, faculty_users, trainee

    def create_programs(self, org, users):
        """Create focused programs"""
        programs = []
        
        program_data = [
            {
                'name': 'Emergency Medicine Residency',
                'abbreviation': 'EM',
                'specialty': 'Emergency Medicine',
                'acgme_id': 'JH-EM-001'
            },
            {
                'name': 'Internal Medicine Residency',
                'abbreviation': 'IM',
                'specialty': 'Internal Medicine',
                'acgme_id': 'JH-IM-001'
            }
        ]
        
        faculty_users = [u for u in users if u.role in ['faculty', 'leadership']]
        
        for data in program_data:
            program_defaults = {
                **data,
                'org': org,
                'director_user': faculty_users[0] if faculty_users else None,
                'coordinator_user': faculty_users[1] if len(faculty_users) > 1 else None
            }
            
            program, created = Program.objects.get_or_create(
                org=org,
                abbreviation=data['abbreviation'],
                defaults=program_defaults
            )
            programs.append(program)
            if created:
                self.stdout.write(f'✓ Created program: {program.name}')
        
        return programs

    def associate_users_with_programs(self, users, faculty_users, trainee, programs):
        """Associate users with programs"""
        # Associate faculty with all programs
        for faculty in faculty_users:
            faculty.programs.set(programs)
            self.stdout.write(f'✓ Associated {faculty.name} with {len(programs)} programs')
        
        # Associate trainee with all programs
        if trainee:
            trainee.programs.set(programs)
            self.stdout.write(f'✓ Associated {trainee.name} with {len(programs)} programs')

    def create_sites(self, org, programs):
        """Create test sites"""
        sites = []
        site_names = ['Emergency Department', 'Internal Medicine Ward', 'ICU']
        
        for program in programs:
            for site_name in site_names:
                site, created = Site.objects.get_or_create(
                    name=site_name,
                    org=org,
                    program=program
                )
                sites.append(site)
                if created:
                    self.stdout.write(f'✓ Created site: {site.name} for {program.name}')
        
        return sites

    def create_cohorts(self, org, programs):
        """Create test cohorts"""
        cohorts = []
        
        for program in programs:
            cohort, created = Cohort.objects.get_or_create(
                org=org,
                program=program,
                name=f'Class of 2027',
                defaults={
                    'start_date': date(2024, 7, 1),
                    'end_date': date(2027, 6, 30)
                }
            )
            cohorts.append(cohort)
            if created:
                self.stdout.write(f'✓ Created cohort: {cohort.name} for {program.name}')
        
        return cohorts

    def create_curriculum_data(self, programs):
        """Create curriculum data with proper structure"""
        all_epas = []
        all_sub_competencies = []
        
        for program in programs:
            self.stdout.write(f'Creating curriculum for {program.name}...')
            
            # Create EPA Categories
            categories = ['Patient Care', 'Medical Knowledge', 'Communication', 'Professionalism']
            
            program_epas = []
            
            for i, category_name in enumerate(categories, 1):
                category, created = EPACategory.objects.get_or_create(
                    title=category_name,
                    program=program
                )
                
                # Create 3 EPAs per category
                for j in range(1, 4):
                    epa_code = f'{program.abbreviation}-EPA-{i}.{j}'
                    epa, created = EPA.objects.get_or_create(
                        code=epa_code,
                        program=program,
                        defaults={
                            'title': f'{category_name} EPA {j} for {program.specialty}',
                            'description': f'Demonstrates competency in {category_name.lower()} for {program.specialty}',
                            'category': category,
                            'is_active': True
                        }
                    )
                    program_epas.append(epa)
                    all_epas.append(epa)
                    if created:
                        self.stdout.write(f'  ✓ Created EPA: {epa.code}')

            # Create Core Competencies (ACGME 6)
            core_competencies = [
                'Patient Care and Procedural Skills',
                'Medical Knowledge',
                'Practice-Based Learning and Improvement',
                'Interpersonal and Communication Skills',
                'Professionalism',
                'Systems-Based Practice'
            ]
            
            program_sub_competencies = []
            
            for i, comp_name in enumerate(core_competencies, 1):
                comp_code = f'{program.abbreviation}-C{i}'
                
                comp, created = CoreCompetency.objects.get_or_create(
                    code=comp_code,
                    program=program,
                    defaults={'title': comp_name}
                )
                if created:
                    self.stdout.write(f'  ✓ Created core competency: {comp.code}')
                
                # Create 3 sub-competencies per core competency
                for j in range(1, 4):
                    sub_code = f'{comp_code}.{j}'
                    
                    sub_comp, created = SubCompetency.objects.get_or_create(
                        code=sub_code,
                        core_competency=comp,
                        program=program,
                        defaults={
                            'title': f'{comp_name} - Sub-competency {j}',
                            'milestone_level_1': 'Novice level performance',
                            'milestone_level_2': 'Advanced beginner performance',
                            'milestone_level_3': 'Competent level performance',
                            'milestone_level_4': 'Proficient level performance',
                            'milestone_level_5': 'Expert level performance'
                        }
                    )
                    program_sub_competencies.append(sub_comp)
                    all_sub_competencies.append(sub_comp)
                    if created:
                        self.stdout.write(f'    ✓ Created sub-competency: {sub_comp.code}')
        
        return all_epas, all_sub_competencies

    def create_epa_subcompetency_mappings(self, programs, epas, sub_competencies):
        """Create comprehensive EPA-SubCompetency mappings"""
        mappings_created = 0
        
        for program in programs:
            program_epas = [epa for epa in epas if epa.program == program]
            program_sub_comps = [sc for sc in sub_competencies if sc.program == program]
            
            # Map each EPA to 2-3 sub-competencies for rich data
            for epa in program_epas:
                num_mappings = random.randint(2, 3)
                selected_sub_comps = random.sample(program_sub_comps, min(num_mappings, len(program_sub_comps)))
                
                for sub_comp in selected_sub_comps:
                    mapping, created = SubCompetencyEPA.objects.get_or_create(
                        sub_competency=sub_comp,
                        epa=epa
                    )
                    if created:
                        mappings_created += 1
            
            self.stdout.write(f'✓ Created EPA mappings for {program.name}')
        
        self.stdout.write(f'✓ Total EPA-SubCompetency mappings created: {mappings_created}')

    def create_comprehensive_assessments(self, trainee, faculty_users, epas):
        """Create realistic assessment data for the trainee"""
        if not trainee or not faculty_users or not epas:
            self.stdout.write('Missing trainee, faculty, or EPAs - skipping assessments')
            return
        
        self.stdout.write(f'Creating assessments for {trainee.name}...')
        
        # Get EPAs for trainee's programs
        trainee_epas = [epa for epa in epas if epa.program in trainee.programs.all()]
        
        # Create 15 assessments over the past 3 months
        assessments_created = 0
        
        for i in range(15):
            # Progressive dates - more recent assessments
            days_ago = random.randint(1, 90)
            assessment_date = date.today() - timedelta(days=days_ago)
            
            # Random faculty evaluator
            evaluator = random.choice(faculty_users)
            
            # Create assessment
            assessment = Assessment.objects.create(
                trainee=trainee,
                evaluator=evaluator,
                shift_date=assessment_date,
                location=random.choice(['Emergency Department', 'Internal Medicine Ward', 'ICU']),
                status='submitted',
                private_comments=f'Assessment #{i+1} - Trainee showing good progression'
            )
            
            # Add 2-3 EPAs per assessment with realistic progression
            num_epas = random.randint(2, 3)
            selected_epas = random.sample(trainee_epas, min(num_epas, len(trainee_epas)))
            
            for epa in selected_epas:
                # Create realistic entrustment levels with progression over time
                # Recent assessments should trend higher
                if days_ago > 60:
                    base_level = random.randint(2, 3)  # Early: 2-3
                elif days_ago > 30:
                    base_level = random.randint(3, 4)  # Middle: 3-4
                else:
                    base_level = random.randint(4, 5)  # Recent: 4-5
                
                entrustment_level = max(1, min(5, base_level + random.randint(-1, 1)))
                
                AssessmentEPA.objects.create(
                    assessment=assessment,
                    epa=epa,
                    entrustment_level=entrustment_level,
                    what_went_well=f'Demonstrated {epa.title.lower()} at level {entrustment_level}',
                    what_could_improve='Continue developing clinical skills and confidence'
                )
            
            assessments_created += 1
            
            if assessments_created % 5 == 0:
                self.stdout.write(f'  Created {assessments_created}/15 assessments...')
        
        # Final verification
        total_assessments = Assessment.objects.filter(trainee=trainee).count()
        total_epa_assessments = AssessmentEPA.objects.filter(assessment__trainee=trainee).count()
        
        self.stdout.write(f'✓ Created {total_assessments} assessments with {total_epa_assessments} EPA evaluations')
        self.stdout.write(f'✓ Assessment data ready for competency grid visualization!')
