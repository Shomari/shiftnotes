"""
Django management command to create comprehensive demo data for EPAnotes.
This creates a realistic hospital environment for client demonstrations.

Usage: python manage.py create_demo_data
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from organizations.models import Organization, Program
from curriculum.models import CoreCompetency, SubCompetency, EPA, EPACategory, SubCompetencyEPA
from assessments.models import Assessment, AssessmentEPA
import random
from datetime import datetime, timedelta

User = get_user_model()

class Command(BaseCommand):
    help = 'Create comprehensive demo data for EPAnotes client demonstrations'

    def handle(self, *args, **options):
        self.stdout.write('🏥 Creating EPAnotes Demo Environment...')
        
        with transaction.atomic():
            # Clear existing data
            self.clear_existing_data()
            
            # Create organization and programs
            organization = self.create_organization()
            programs = self.create_programs(organization)
            
            # Create curriculum
            competencies = self.create_competencies(programs)
            subcompetencies = self.create_subcompetencies(programs, competencies)
            epa_categories = self.create_epa_categories(programs)
            epas = self.create_epas(programs, epa_categories)
            self.map_epas_to_subcompetencies(epas, subcompetencies)
            
            # Create users
            admin_user = self.create_admin_user(organization)
            doctors = self.create_doctor_users(organization, programs)
            leadership = self.create_leadership_user(organization)
            trainees = self.create_trainee_users(organization, programs)
            
            # Create assessments
            self.create_assessments(doctors, trainees, epas)
            
        self.stdout.write(self.style.SUCCESS('✅ Demo data created successfully!'))
        self.print_login_credentials()

    def clear_existing_data(self):
        """Clear all existing data"""
        self.stdout.write('🧹 Clearing existing data...')
        Assessment.objects.all().delete()
        AssessmentEPA.objects.all().delete()
        SubCompetencyEPA.objects.all().delete()
        EPA.objects.all().delete()
        EPACategory.objects.all().delete()
        SubCompetency.objects.all().delete()
        CoreCompetency.objects.all().delete()
        Program.objects.all().delete()
        User.objects.all().delete()
        Organization.objects.all().delete()

    def create_organization(self):
        """Create demo hospital organization"""
        organization = Organization.objects.create(
            name="Metropolitan Medical Center",
            slug="metro-medical-center",
            address_line1="123 Healthcare Drive, Medical District, NY 10001"
        )
        self.stdout.write(f'🏥 Created organization: {organization.name}')
        return organization

    def create_programs(self, organization):
        """Create 3 medical training programs"""
        programs_data = [
            {"name": "Emergency Medicine Residency", "abbreviation": "EM", "specialty": "Emergency Medicine", "acgme_id": "EM-001"},
            {"name": "Family Medicine Residency", "abbreviation": "FM", "specialty": "Family Medicine", "acgme_id": "FM-001"},
            {"name": "Internal Medicine Residency", "abbreviation": "IM", "specialty": "Internal Medicine", "acgme_id": "IM-001"},
        ]
        
        programs = []
        for program_data in programs_data:
            program = Program.objects.create(
                org=organization,
                **program_data
            )
            programs.append(program)
            self.stdout.write(f'📚 Created program: {program.name}')
        
        return programs

    def create_competencies(self, programs):
        """Create 6 core competencies for each program"""
        competencies_data = [
            {"code": "PC", "title": "Patient Care"},
            {"code": "MK", "title": "Medical Knowledge"},
            {"code": "PBL", "title": "Practice-Based Learning"},
            {"code": "ICS", "title": "Interpersonal Skills"},
            {"code": "PROF", "title": "Professionalism"},
            {"code": "SBP", "title": "Systems-Based Practice"},
        ]
        
        all_competencies = []
        for program in programs:
            program_competencies = []
            for comp_data in competencies_data:
                competency = CoreCompetency.objects.create(
                    program=program,
                    **comp_data
                )
                program_competencies.append(competency)
                all_competencies.append(competency)
                self.stdout.write(f'🎯 Created competency: {competency.title} ({program.abbreviation})')
            
        return all_competencies

    def create_subcompetencies(self, programs, competencies):
        """Create 2 subcompetencies for each core competency"""
        subcompetencies_data = {
            "PC": [
                {"code": "PC1", "title": "History Taking & Physical Examination"},
                {"code": "PC2", "title": "Clinical Decision Making"},
            ],
            "MK": [
                {"code": "MK1", "title": "Diagnostic Reasoning"},
                {"code": "MK2", "title": "Therapeutic Knowledge"},
            ],
            "PBL": [
                {"code": "PBL1", "title": "Self-Assessment"},
                {"code": "PBL2", "title": "Evidence-Based Medicine"},
            ],
            "ICS": [
                {"code": "ICS1", "title": "Patient Communication"},
                {"code": "ICS2", "title": "Team Collaboration"},
            ],
            "PROF": [
                {"code": "PROF1", "title": "Ethical Practice"},
                {"code": "PROF2", "title": "Professional Development"},
            ],
            "SBP": [
                {"code": "SBP1", "title": "Quality Improvement"},
                {"code": "SBP2", "title": "Healthcare Systems"},
            ],
        }
        
        milestone_descriptions = {
            1: "Novice - requires direct supervision",
            2: "Advanced Beginner - requires close supervision",
            3: "Competent - requires minimal supervision",
            4: "Proficient - practices independently",
            5: "Expert - teaches and supervises others"
        }
        
        all_subcompetencies = []
        for competency in competencies:
            for sub_data in subcompetencies_data[competency.code]:
                subcompetency = SubCompetency.objects.create(
                    program=competency.program,
                    core_competency=competency,
                    code=sub_data["code"],
                    title=sub_data["title"],
                    milestone_level_1=milestone_descriptions[1],
                    milestone_level_2=milestone_descriptions[2],
                    milestone_level_3=milestone_descriptions[3],
                    milestone_level_4=milestone_descriptions[4],
                    milestone_level_5=milestone_descriptions[5],
                )
                all_subcompetencies.append(subcompetency)
                self.stdout.write(f'📋 Created subcompetency: {subcompetency.title} ({competency.program.abbreviation})')
        
        return all_subcompetencies

    def create_epa_categories(self, programs):
        """Create EPA categories for each program"""
        categories_data = [
            "Clinical Skills",
            "Diagnostic Procedures", 
            "Therapeutic Procedures",
            "Communication & Professionalism",
            "Systems & Quality"
        ]
        
        all_categories = []
        for program in programs:
            for cat_title in categories_data:
                category = EPACategory.objects.create(
                    program=program,
                    title=cat_title
                )
                all_categories.append(category)
                self.stdout.write(f'📂 Created EPA category: {cat_title} ({program.abbreviation})')
        
        return all_categories

    def create_epas(self, programs, epa_categories):
        """Create 15 EPAs distributed across programs and categories"""
        epas_data = [
            {"code": "EPA-1", "title": "Obtain comprehensive patient history", "description": "Gather accurate and complete patient history"},
            {"code": "EPA-2", "title": "Perform focused physical examination", "description": "Conduct appropriate physical examination"},
            {"code": "EPA-3", "title": "Interpret basic diagnostic tests", "description": "Analyze and interpret common diagnostic studies"},
            {"code": "EPA-4", "title": "Develop differential diagnosis", "description": "Create and prioritize differential diagnosis"},
            {"code": "EPA-5", "title": "Present patient cases effectively", "description": "Communicate patient information clearly and concisely"},
            {"code": "EPA-6", "title": "Write comprehensive patient notes", "description": "Document patient encounters thoroughly"},
            {"code": "EPA-7", "title": "Communicate with patients and families", "description": "Engage in effective patient communication"},
            {"code": "EPA-8", "title": "Collaborate with healthcare team", "description": "Work effectively with multidisciplinary teams"},
            {"code": "EPA-9", "title": "Practice evidence-based medicine", "description": "Apply current evidence to patient care"},
            {"code": "EPA-10", "title": "Perform basic procedures safely", "description": "Execute common procedures with appropriate technique"},
            {"code": "EPA-11", "title": "Manage time and prioritize tasks", "description": "Efficiently organize clinical responsibilities"},
            {"code": "EPA-12", "title": "Demonstrate professional behavior", "description": "Exhibit appropriate professional conduct"},
            {"code": "EPA-13", "title": "Participate in quality improvement", "description": "Engage in systematic quality improvement activities"},
            {"code": "EPA-14", "title": "Teach and mentor students", "description": "Provide effective teaching and mentorship"},
            {"code": "EPA-15", "title": "Practice cost-conscious care", "description": "Consider healthcare economics in decision-making"},
        ]
        
        all_epas = []
        epa_index = 0
        
        for program in programs:
            program_categories = [cat for cat in epa_categories if cat.program == program]
            epas_per_program = 5  # 15 EPAs / 3 programs = 5 each
            
            for i in range(epas_per_program):
                if epa_index < len(epas_data):
                    category = program_categories[i % len(program_categories)]
                    epa_data = epas_data[epa_index]
                    
                    epa = EPA.objects.create(
                        program=program,
                        category=category,
                        code=f"{program.abbreviation}-{epa_data['code']}",
                        title=epa_data["title"],
                        description=epa_data["description"],
                        is_active=True
                    )
                    all_epas.append(epa)
                    self.stdout.write(f'⚡ Created EPA: {epa.code} - {epa.title}')
                    epa_index += 1
        
        return all_epas

    def map_epas_to_subcompetencies(self, epas, subcompetencies):
        """Map EPAs to subcompetencies"""
        self.stdout.write('🔗 Mapping EPAs to subcompetencies...')
        
        # Group subcompetencies by program
        subcomps_by_program = {}
        for subcomp in subcompetencies:
            program_id = subcomp.program.id
            if program_id not in subcomps_by_program:
                subcomps_by_program[program_id] = []
            subcomps_by_program[program_id].append(subcomp)
        
        # Map each EPA to 1-2 random subcompetencies from the same program
        for epa in epas:
            program_subcomps = subcomps_by_program.get(epa.program.id, [])
            if program_subcomps:
                # Each EPA maps to 1-2 subcompetencies
                num_mappings = random.randint(1, 2)
                selected_subcomps = random.sample(program_subcomps, min(num_mappings, len(program_subcomps)))
                
                for subcomp in selected_subcomps:
                    SubCompetencyEPA.objects.create(
                        sub_competency=subcomp,
                        epa=epa
                    )
                
                self.stdout.write(f'  ↳ {epa.code}: {len(selected_subcomps)} mappings')

    def create_admin_user(self, organization):
        """Create admin user for demo"""
        admin = User.objects.create_user(
            email='admin@demo.com',
            password='password123',
            name='Dr. Sarah Chen',
            role='admin',
            department='Administration',
            organization=organization,
            is_staff=True
        )
        self.stdout.write(f'👤 Created admin: {admin.name}')
        return admin

    def create_doctor_users(self, organization, programs):
        """Create 4 doctor users"""
        doctors_data = [
            {"name": "Dr. Michael Rodriguez", "email": "faculty@demo.com", "department": "Emergency Medicine", "programs": [0]},
            {"name": "Dr. Jennifer Kim", "email": "doctor2@demo.com", "department": "Family Medicine", "programs": [1]},
            {"name": "Dr. Robert Johnson", "email": "doctor3@demo.com", "department": "Internal Medicine", "programs": [2]},
            {"name": "Dr. Emily Zhang", "email": "doctor4@demo.com", "department": "Emergency Medicine", "programs": [0, 2]},
        ]
        
        doctors = []
        for doc_data in doctors_data:
            doctor = User.objects.create_user(
                email=doc_data["email"],
                password='password123',
                name=doc_data["name"],
                role='faculty',
                department=doc_data["department"],
                organization=organization
            )
            # Add to programs
            for prog_index in doc_data["programs"]:
                if prog_index < len(programs):
                    doctor.programs.add(programs[prog_index])
            
            doctors.append(doctor)
            self.stdout.write(f'👨‍⚕️ Created doctor: {doctor.name}')
        
        return doctors

    def create_leadership_user(self, organization):
        """Create leadership user for demo"""
        leadership = User.objects.create_user(
            email='leadership@demo.com',
            password='password123',
            name='Dr. Amanda Thompson',
            role='leadership',
            department='Administration',
            organization=organization
        )
        self.stdout.write(f'👔 Created leadership: {leadership.name}')
        return leadership

    def create_trainee_users(self, organization, programs):
        """Create 3 trainee users with different skill levels"""
        trainees_data = [
            {"name": "Dr. Alex Martinez", "email": "trainee@demo.com", "level": "strong", "department": "Emergency Medicine", "program": 0},
            {"name": "Dr. Sam Patel", "email": "trainee2@demo.com", "level": "average", "department": "Family Medicine", "program": 1},
            {"name": "Dr. Jordan Lee", "email": "trainee3@demo.com", "level": "developing", "department": "Internal Medicine", "program": 2},
        ]
        
        trainees = []
        for trainee_data in trainees_data:
            trainee = User.objects.create_user(
                email=trainee_data["email"],
                password='password123',
                name=trainee_data["name"],
                role='trainee',
                department=trainee_data["department"],
                organization=organization
            )
            if trainee_data["program"] < len(programs):
                trainee.programs.add(programs[trainee_data["program"]])
            trainee.skill_level = trainee_data["level"]  # Store for assessment creation
            
            trainees.append(trainee)
            self.stdout.write(f'🎓 Created trainee: {trainee.name} ({trainee_data["level"]})')
        
        return trainees

    def create_assessments(self, doctors, trainees, epas):
        """Create realistic assessments for each trainee"""
        self.stdout.write('📊 Creating assessments...')
        
        # Assessment patterns for different skill levels
        rating_patterns = {
            "strong": [3, 4, 4, 5, 5, 5],      # Mostly 4s and 5s
            "average": [2, 3, 3, 4, 4, 4],     # Mostly 3s and 4s  
            "developing": [1, 2, 2, 3, 3, 3],  # Mostly 2s and 3s
        }
        
        locations = ["Emergency Department", "Medical ICU", "General Medicine Ward", "Outpatient Clinic", "Family Medicine Clinic"]
        
        for trainee in trainees:
            skill_level = getattr(trainee, 'skill_level', 'average')
            pattern = rating_patterns[skill_level]
            
            # Get EPAs from trainee's programs
            trainee_programs = trainee.programs.all()
            available_epas = EPA.objects.filter(program__in=trainee_programs)
            
            if not available_epas:
                continue
            
            # Create 20-25 assessments for each trainee
            num_assessments = random.randint(20, 25)
            
            for i in range(num_assessments):
                # Random date in last 6 months
                days_ago = random.randint(1, 180)
                assessment_date = datetime.now().date() - timedelta(days=days_ago)
                
                # Random doctor from same programs
                program_doctors = [d for d in doctors if any(prog in trainee_programs for prog in d.programs.all())]
                if not program_doctors:
                    program_doctors = doctors
                
                assessor = random.choice(program_doctors)
                location = random.choice(locations)
                
                # Create assessment
                assessment = Assessment.objects.create(
                    trainee=trainee,
                    evaluator=assessor,  # Note: field name is 'evaluator' not 'assessor'
                    shift_date=assessment_date,
                    location=location,
                    status='submitted',
                    private_comments=f"Assessment for {trainee.name} on {assessment_date}"
                )
                
                # Create 2-4 EPA ratings per assessment
                num_epa_ratings = random.randint(2, 4)
                selected_epas = random.sample(list(available_epas), min(num_epa_ratings, len(available_epas)))
                
                for epa in selected_epas:
                    # Get rating based on skill level with some variation
                    base_rating = random.choice(pattern)
                    # Add slight variation (±1, but keep within 1-5 range)
                    rating = max(1, min(5, base_rating + random.randint(-1, 1)))
                    
                    AssessmentEPA.objects.create(
                        assessment=assessment,
                        epa=epa,
                        entrustment_level=rating,
                        what_went_well=f"Good performance in {epa.title.lower()}",
                        what_could_improve="Continue practicing and refining skills"
                    )
            
            self.stdout.write(f'  ↳ Created {num_assessments} assessments for {trainee.name}')

    def print_login_credentials(self):
        """Print demo login credentials"""
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('🔑 DEMO LOGIN CREDENTIALS'))
        self.stdout.write('='*60)
        self.stdout.write(f'{"Role":<15} {"Email":<25} {"Password":<15} {"Name"}')
        self.stdout.write('-'*60)
        self.stdout.write(f'{"Admin":<15} {"admin@demo.com":<25} {"password123":<15} {"Dr. Sarah Chen"}')
        self.stdout.write(f'{"Faculty":<15} {"faculty@demo.com":<25} {"password123":<15} {"Dr. Michael Rodriguez"}')
        self.stdout.write(f'{"Leadership":<15} {"leadership@demo.com":<25} {"password123":<15} {"Dr. Amanda Thompson"}')
        self.stdout.write(f'{"Trainee":<15} {"trainee@demo.com":<25} {"password123":<15} {"Dr. Alex Martinez (Strong)"}')
        self.stdout.write('='*60)
        self.stdout.write('\n🌐 Frontend URL: https://app.epanotes.com')
        self.stdout.write('🔗 API URL: https://api.epanotes.com/api/')
        self.stdout.write('⚙️  Admin Panel: https://api.epanotes.com/admin/')
        self.stdout.write('\n💡 Use these credentials to demonstrate EPAnotes to potential clients!')
        self.stdout.write('\n📊 Demo Features:')
        self.stdout.write('  • 3 Programs: Emergency Medicine, Family Medicine, Internal Medicine')
        self.stdout.write('  • 6 Core Competencies per program (18 total)')
        self.stdout.write('  • 12 Sub-competencies per program (36 total)')  
        self.stdout.write('  • 5 EPAs per program (15 total)')
        self.stdout.write('  • 3 Trainees with varying skill levels')
        self.stdout.write('  • 60-75 Total assessments with realistic data distribution')