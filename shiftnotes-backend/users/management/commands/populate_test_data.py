"""
Management command to populate the database with test data for development.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from organizations.models import Organization, Program, Site
from curriculum.models import EPACategory, EPA, CoreCompetency, SubCompetency
from users.models import Cohort
from datetime import date, timedelta
import uuid

User = get_user_model()


class Command(BaseCommand):
    help = 'Populate the database with test data for development'

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

        self.stdout.write('Creating test data...')
        
        # Create organizations
        organizations = self.create_organizations()
        
        # Create users
        users, faculty_users = self.create_users(organizations)
        
        # Create programs
        programs = self.create_programs(organizations, users)
        
        # Associate faculty with programs
        self.associate_faculty_with_programs(faculty_users, programs)
        
        # Associate trainees with programs
        self.associate_trainees_with_programs(users, programs)
        
        # Create sites
        sites = self.create_sites(organizations, programs)
        
        # Create cohorts
        cohorts = self.create_cohorts(organizations, programs)
        
        # Create curriculum data
        self.create_curriculum_data(programs)

        self.stdout.write(
            self.style.SUCCESS(
                'Successfully populated database with test data!'
            )
        )

    def clear_data(self):
        """Clear existing data"""
        SubCompetency.objects.all().delete()
        CoreCompetency.objects.all().delete()
        EPA.objects.all().delete()
        EPACategory.objects.all().delete()
        Cohort.objects.all().delete()
        Site.objects.all().delete()
        Program.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        Organization.objects.all().delete()

    def create_organizations(self):
        """Create test organizations"""
        organizations = []
        
        org_data = [
            {
                'name': 'Johns Hopkins Hospital',
                'slug': 'johns-hopkins',
                'address_line1': '1800 Orleans St, Baltimore, MD 21287'
            },
            {
                'name': 'Mayo Clinic',
                'slug': 'mayo-clinic',
                'address_line1': '200 First St SW, Rochester, MN 55905'
            },
            {
                'name': 'Cleveland Clinic',
                'slug': 'cleveland-clinic',
                'address_line1': '9500 Euclid Ave, Cleveland, OH 44195'
            }
        ]
        
        for data in org_data:
            org, created = Organization.objects.get_or_create(
                slug=data['slug'],
                defaults=data
            )
            organizations.append(org)
            if created:
                self.stdout.write(f'Created organization: {org.name}')
        
        return organizations

    def create_users(self, organizations):
        """Create test users"""
        users = []
        faculty_users = []
        
        # Create superuser if not exists
        if not User.objects.filter(is_superuser=True).exists():
            superuser = User.objects.create_superuser(
                email='admin@shiftnotes.com',
                password='demo',
                name='System Administrator'
            )
            users.append(superuser)
            self.stdout.write('Created superuser: admin@shiftnotes.com')

        # Create users for each organization
        for org in organizations:
            user_data = [
                {
                    'email': f'admin@{org.slug}.com',
                    'name': f'{org.name} Admin',
                    'role': 'admin',
                    'organization': org
                },
                {
                    'email': f'faculty@{org.slug}.com',
                    'name': f'Dr. Faculty {org.name}',
                    'role': 'faculty',
                    'organization': org
                },
                {
                    'email': f'trainee@{org.slug}.com',
                    'name': f'Trainee {org.name}',
                    'role': 'trainee',
                    'organization': org,
                    'start_date': date.today() - timedelta(days=30)
                },
                {
                    'email': f'leadership@{org.slug}.com',
                    'name': f'Dr. Leadership {org.name}',
                    'role': 'leadership',
                    'organization': org
                }
            ]
            
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
                    self.stdout.write(f'Created user: {user.email}')
        
        return users, faculty_users

    def create_programs(self, organizations, users):
        """Create test programs - each organization gets distinct programs"""
        programs = []
        
        # Define distinct programs for each organization
        org_program_mapping = {
            'johns-hopkins': [
                {
                    'name': 'Emergency Medicine Residency',
                    'abbreviation': 'EM',
                    'specialty': 'Emergency Medicine',
                    'acgme_id': 'JH-EM-001'
                },
                {
                    'name': 'Cardiology Fellowship',
                    'abbreviation': 'CARD',
                    'specialty': 'Cardiology',
                    'acgme_id': 'JH-CARD-001'
                },
                {
                    'name': 'Neurology Residency',
                    'abbreviation': 'NEURO',
                    'specialty': 'Neurology',
                    'acgme_id': 'JH-NEURO-001'
                }
            ],
            'mayo-clinic': [
                {
                    'name': 'Internal Medicine Residency',
                    'abbreviation': 'IM',
                    'specialty': 'Internal Medicine',
                    'acgme_id': 'MC-IM-001'
                },
                {
                    'name': 'Oncology Fellowship',
                    'abbreviation': 'ONC',
                    'specialty': 'Oncology',
                    'acgme_id': 'MC-ONC-001'
                },
                {
                    'name': 'Radiology Residency',
                    'abbreviation': 'RAD',
                    'specialty': 'Radiology',
                    'acgme_id': 'MC-RAD-001'
                }
            ],
            'cleveland-clinic': [
                {
                    'name': 'Family Medicine Residency',
                    'abbreviation': 'FM',
                    'specialty': 'Family Medicine',
                    'acgme_id': 'CC-FM-001'
                },
                {
                    'name': 'Orthopedic Surgery Residency',
                    'abbreviation': 'ORTHO',
                    'specialty': 'Orthopedic Surgery',
                    'acgme_id': 'CC-ORTHO-001'
                },
                {
                    'name': 'Anesthesiology Residency',
                    'abbreviation': 'ANES',
                    'specialty': 'Anesthesiology',
                    'acgme_id': 'CC-ANES-001'
                }
            ]
        }
        
        for org in organizations:
            org_programs = org_program_mapping.get(org.slug, [])
            
            for data in org_programs:
                # Find faculty users for this org
                faculty_users = [u for u in users if u.organization == org and u.role in ['faculty', 'leadership']]
                
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
                    self.stdout.write(f'Created program: {program.name} at {org.name}')
        
        return programs

    def associate_faculty_with_programs(self, faculty_users, programs):
        """Associate faculty users with programs from their organization"""
        for faculty in faculty_users:
            # Get all programs for this faculty member's organization
            org_programs = [p for p in programs if p.org == faculty.organization]
            
            # Associate faculty with all programs in their organization
            faculty.programs.set(org_programs)
            self.stdout.write(f'Associated {faculty.name} with {len(org_programs)} programs')

    def associate_trainees_with_programs(self, users, programs):
        """Associate trainee users with programs from their organization"""
        trainees = [u for u in users if u.role == 'trainee']
        
        for trainee in trainees:
            # Get all programs for this trainee's organization
            org_programs = [p for p in programs if p.org == trainee.organization]
            
            # Associate trainee with all programs in their organization
            trainee.programs.set(org_programs)
            self.stdout.write(f'Associated {trainee.name} with {len(org_programs)} programs')

    def create_sites(self, organizations, programs):
        """Create test sites"""
        sites = []
        
        site_names = [
            'Main Hospital',
            'Outpatient Clinic',
            'Emergency Department',
            'ICU Unit'
        ]
        
        for org in organizations:
            org_programs = [p for p in programs if p.org == org]
            
            for site_name in site_names:
                for program in org_programs:
                    site, created = Site.objects.get_or_create(
                        name=site_name,
                        org=org,
                        program=program
                    )
                    sites.append(site)
                    if created:
                        self.stdout.write(f'Created site: {site.name} for {program.name}')
        
        return sites

    def create_cohorts(self, organizations, programs):
        """Create test cohorts"""
        cohorts = []
        
        for org in organizations:
            org_programs = [p for p in programs if p.org == org]
            
            for program in org_programs:
                # Create cohorts for different years
                for year_offset in [0, 1, 2]:
                    start_date = date(2024 - year_offset, 7, 1)
                    end_date = date(2027 - year_offset, 6, 30)
                    
                    cohort, created = Cohort.objects.get_or_create(
                        org=org,
                        program=program,
                        name=f'Class of {end_date.year}',
                        defaults={
                            'start_date': start_date,
                            'end_date': end_date
                        }
                    )
                    cohorts.append(cohort)
                    if created:
                        self.stdout.write(f'Created cohort: {cohort.name} for {program.name}')
        
        return cohorts

    def create_curriculum_data(self, programs):
        """Create curriculum data with distinct EPAs for each program"""
        
        for program in programs:
            self.stdout.write(f'Creating curriculum data for {program.name} at {program.org.name}')
            
            # Create EPA Categories
            epa_categories = [
                'Emergency Care',
                'Patient Assessment',
                'Procedural Skills',
                'Communication',
                'Professionalism',
                'Systems-Based Practice'
            ]
            
            for category_name in epa_categories:
                category, created = EPACategory.objects.get_or_create(
                    title=category_name,
                    program=program
                )
                if created:
                    self.stdout.write(f'Created EPA category: {category_name} for {program.name}')
                
                # Create distinct EPAs based on program and organization
                epa_data = self.get_program_specific_epas(program, category_name)
                
                for epa_info in epa_data:
                    epa, created = EPA.objects.get_or_create(
                        code=epa_info['code'],
                        program=program,
                        defaults={
                            **epa_info,
                            'category': category,
                            'is_active': True
                        }
                    )
                    if created:
                        self.stdout.write(f'Created EPA: {epa.code} - {epa.title}')

            # Create Core Competencies
            core_competencies = [
                'Patient Care and Procedural Skills',
                'Medical Knowledge',
                'Practice-Based Learning and Improvement',
                'Interpersonal and Communication Skills',
                'Professionalism',
                'Systems-Based Practice'
            ]
            
            for i, comp_name in enumerate(core_competencies, 1):
                comp, created = CoreCompetency.objects.get_or_create(
                    code=f'{program.abbreviation}-COMP{i}',
                    program=program,
                    defaults={
                        'title': comp_name
                    }
                )
                if created:
                    self.stdout.write(f'Created core competency: {comp.code} - {comp.title}')
                
                # Create sub-competencies
                for j in range(1, 4):  # 3 sub-competencies per core competency
                    sub_comp, created = SubCompetency.objects.get_or_create(
                        code=f'{comp.code}.{j}',
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
                    if created:
                        self.stdout.write(f'Created sub-competency: {sub_comp.code}')

    def get_program_specific_epas(self, program, category_name):
        """Get EPAs specific to each program and organization"""
        org_prefix = program.org.slug.upper().replace('-', '')
        prog_prefix = program.abbreviation
        
        if category_name == 'Emergency Care':
            return [
                {
                    'code': f'{org_prefix}-{prog_prefix}-EPA-1',
                    'title': f'Manage acute emergencies in {program.specialty}',
                    'description': f'Recognize and respond to acute medical emergencies specific to {program.specialty} practice'
                },
                {
                    'code': f'{org_prefix}-{prog_prefix}-EPA-2',
                    'title': f'Lead resuscitation in {program.specialty} setting',
                    'description': f'Coordinate and lead resuscitation efforts in {program.specialty} clinical settings'
                }
            ]
        elif category_name == 'Patient Assessment':
            return [
                {
                    'code': f'{org_prefix}-{prog_prefix}-EPA-3',
                    'title': f'Perform {program.specialty} focused assessment',
                    'description': f'Conduct comprehensive assessment specific to {program.specialty} patients'
                },
                {
                    'code': f'{org_prefix}-{prog_prefix}-EPA-4',
                    'title': f'Interpret {program.specialty} diagnostic tests',
                    'description': f'Order and interpret diagnostic studies relevant to {program.specialty} practice'
                }
            ]
        elif category_name == 'Procedural Skills':
            return [
                {
                    'code': f'{org_prefix}-{prog_prefix}-EPA-5',
                    'title': f'Perform {program.specialty} procedures',
                    'description': f'Execute procedures commonly performed in {program.specialty} practice'
                },
                {
                    'code': f'{org_prefix}-{prog_prefix}-EPA-6',
                    'title': f'Manage {program.specialty} procedural complications',
                    'description': f'Recognize and manage complications specific to {program.specialty} procedures'
                }
            ]
        elif category_name == 'Communication':
            return [
                {
                    'code': f'{org_prefix}-{prog_prefix}-EPA-7',
                    'title': f'Communicate with {program.specialty} patients',
                    'description': f'Engage in effective communication with {program.specialty} patients and families'
                },
                {
                    'code': f'{org_prefix}-{prog_prefix}-EPA-8',
                    'title': f'Present {program.specialty} cases',
                    'description': f'Present cases and findings to {program.specialty} colleagues and consultants'
                }
            ]
        elif category_name == 'Professionalism':
            return [
                {
                    'code': f'{org_prefix}-{prog_prefix}-EPA-9',
                    'title': f'Demonstrate {program.specialty} professionalism',
                    'description': f'Maintain professional standards in {program.specialty} practice'
                },
                {
                    'code': f'{org_prefix}-{prog_prefix}-EPA-10',
                    'title': f'Participate in {program.specialty} quality improvement',
                    'description': f'Engage in quality improvement activities specific to {program.specialty}'
                }
            ]
        else:  # Systems-Based Practice
            return [
                {
                    'code': f'{org_prefix}-{prog_prefix}-EPA-11',
                    'title': f'Coordinate {program.specialty} care transitions',
                    'description': f'Manage patient transitions in {program.specialty} practice'
                },
                {
                    'code': f'{org_prefix}-{prog_prefix}-EPA-12',
                    'title': f'Utilize {program.specialty} resources',
                    'description': f'Make appropriate resource utilization decisions in {program.specialty} practice'
                }
            ]