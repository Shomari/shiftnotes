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
from users.models import Cohort
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
            
            # Create cohorts
            cohorts = self.create_cohorts(organization, programs)
            
            # Create users
            admin_user = self.create_admin_user(organization, programs)
            doctors = self.create_doctor_users(organization, programs)
            leadership = self.create_leadership_user(organization, programs)
            trainees = self.create_trainee_users(organization, programs, cohorts)
            
            # Create assessments (include both doctors and leadership as evaluators)
            all_evaluators = doctors + [leadership]
            self.create_assessments(all_evaluators, trainees, epas)
            
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
            {"name": "Emergency Medicine Residency", "abbreviation": "EM", "specialty": "Emergency Medicine"},
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

    def create_cohorts(self, organization, programs):
        """Create demo cohorts for each program"""
        from datetime import date, timedelta
        
        cohorts = []
        current_year = date.today().year
        
        for program in programs:
            # Create 3 cohorts per program with different years
            cohorts_data = [
                {
                    "name": f"Class of {current_year + 2}",
                    "start_date": date(current_year - 2, 7, 1),
                    "end_date": date(current_year + 2, 6, 30),
                },
                {
                    "name": f"Class of {current_year + 3}",
                    "start_date": date(current_year - 1, 7, 1),
                    "end_date": date(current_year + 3, 6, 30),
                },
                {
                    "name": f"Class of {current_year + 4}",
                    "start_date": date(current_year, 7, 1),
                    "end_date": date(current_year + 4, 6, 30),
                },
            ]
            
            for cohort_data in cohorts_data:
                cohort = Cohort.objects.create(
                    org=organization,
                    program=program,
                    **cohort_data
                )
                cohorts.append(cohort)
                self.stdout.write(f'🎓 Created cohort: {cohort.name} - {program.name}')
        
        return cohorts

    def create_admin_user(self, organization, programs):
        """Create admin user for demo"""
        admin = User.objects.create_user(
            email='admin@demo.com',
            password='password123',
            name='Dr. Sarah Chen',
            role='admin',
            department='Administration',
            organization=organization,
            program=programs[0],  # Assign to first program
            is_staff=True
        )
        self.stdout.write(f'👤 Created admin: {admin.name}')
        return admin

    def create_doctor_users(self, organization, programs):
        """Create 4 doctor users"""
        doctors_data = [
            {"name": "Dr. Michael Rodriguez", "email": "faculty@demo.com", "department": "Emergency Medicine", "program": 0},
            {"name": "Dr. Jennifer Kim", "email": "doctor2@demo.com", "department": "Family Medicine", "program": 0},
            {"name": "Dr. Robert Johnson", "email": "doctor3@demo.com", "department": "Internal Medicine", "program": 0},
            {"name": "Dr. Emily Zhang", "email": "doctor4@demo.com", "department": "Emergency Medicine", "program": 0},
        ]
        
        doctors = []
        for doc_data in doctors_data:
            doctor = User.objects.create_user(
                email=doc_data["email"],
                password='password123',
                name=doc_data["name"],
                role='faculty',
                department=doc_data["department"],
                organization=organization,
                program=programs[doc_data["program"]] if doc_data["program"] < len(programs) else programs[0]
            )
            
            doctors.append(doctor)
            self.stdout.write(f'👨‍⚕️ Created doctor: {doctor.name}')
        
        return doctors

    def create_leadership_user(self, organization, programs):
        """Create leadership user for demo"""
        leadership = User.objects.create_user(
            email='leadership@demo.com',
            password='password123',
            name='Dr. Amanda Thompson',
            role='leadership',
            department='Administration',
            organization=organization,
            program=programs[0]  # Assign to first program
        )
        self.stdout.write(f'👔 Created leadership: {leadership.name}')
        return leadership

    def create_trainee_users(self, organization, programs, cohorts):
        """Create 3 trainee users with different skill levels distributed across cohorts"""
        trainees_data = [
            {"name": "Dr. Alex Martinez", "email": "trainee@demo.com", "level": "strong", "department": "Emergency Medicine", "program": 0},
            {"name": "Dr. Sam Patel", "email": "trainee2@demo.com", "level": "average", "department": "Family Medicine", "program": 0},
            {"name": "Dr. Jordan Lee", "email": "trainee3@demo.com", "level": "developing", "department": "Internal Medicine", "program": 0},
        ]
        
        trainees = []
        for i, trainee_data in enumerate(trainees_data):
            # Get cohorts for the trainee's program
            program = programs[trainee_data["program"]] if trainee_data["program"] < len(programs) else programs[0]
            program_cohorts = [c for c in cohorts if c.program == program]
            
            # Distribute trainees evenly across cohorts
            selected_cohort = program_cohorts[i % len(program_cohorts)] if program_cohorts else None
            
            trainee = User.objects.create_user(
                email=trainee_data["email"],
                password='password123',
                name=trainee_data["name"],
                role='trainee',
                department=trainee_data["department"],
                organization=organization,
                program=program,
                cohort=selected_cohort
            )
            trainee.skill_level = trainee_data["level"]  # Store for assessment creation
            
            trainees.append(trainee)
            cohort_name = selected_cohort.name if selected_cohort else "No cohort"
            self.stdout.write(f'🎓 Created trainee: {trainee.name} ({trainee_data["level"]}) - {cohort_name}')
        
        return trainees

    def create_assessments(self, evaluators, trainees, epas):
        """Create realistic assessments with varied patterns per evaluator"""
        self.stdout.write('📊 Creating assessments...')
        
        # Assessment patterns for different skill levels
        rating_patterns = {
            "strong": [3, 4, 4, 5, 5, 5],      # Mostly 4s and 5s
            "average": [2, 3, 3, 4, 4, 4],     # Mostly 3s and 4s  
            "developing": [1, 2, 2, 3, 3, 3],  # Mostly 2s and 3s
        }
        
        locations = ["Emergency Department", "Medical ICU", "General Medicine Ward", "Outpatient Clinic", "Family Medicine Clinic"]
        
        # Define evaluator-specific patterns for realism
        evaluator_patterns = {}
        for evaluator in evaluators:
            # Each evaluator has their own assessment habits
            evaluator_patterns[evaluator.id] = {
                'assessments_per_month': random.randint(2, 7),  # 2-7 assessments per month
                'avg_turnaround_bias': random.uniform(0.3, 1.8),  # Multiplier for turnaround (creates varied averages)
                'consistency': random.uniform(0.3, 1.0)  # How consistent their turnaround is
            }
        
        # Generate assessments for the last 6 months
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=180)  # 6 months ago
        
        total_assessments = 0
        
        for evaluator in evaluators:
            if not evaluator.program:
                continue
                
            pattern = evaluator_patterns[evaluator.id]
            program_trainees = [t for t in trainees if t.program == evaluator.program]
            
            if not program_trainees:
                continue
            
            # Get EPAs from evaluator's program
            available_epas = EPA.objects.filter(program=evaluator.program)
            if not available_epas:
                continue
            
            # Create assessments for each month
            current_month = start_date.replace(day=1)
            evaluator_total = 0
            
            while current_month <= end_date:
                # Calculate next month
                if current_month.month == 12:
                    next_month = current_month.replace(year=current_month.year + 1, month=1)
                else:
                    next_month = current_month.replace(month=current_month.month + 1)
                
                month_end = min(next_month - timedelta(days=1), end_date)
                
                # Vary the number of assessments per month (±1-2 from base)
                base_count = pattern['assessments_per_month']
                month_assessments = max(1, base_count + random.randint(-2, 2))
                
                # Create assessments for this month
                for i in range(month_assessments):
                    # Random shift date within the month
                    days_in_month = (month_end - current_month).days + 1
                    shift_day_offset = random.randint(0, days_in_month - 1)
                    shift_date = current_month + timedelta(days=shift_day_offset)
                    
                    # Make sure shift date doesn't exceed our end date
                    if shift_date > end_date:
                        shift_date = end_date
                    
                    # Calculate turnaround time based on evaluator's pattern
                    base_turnaround = random.randint(1, 4)
                    turnaround_variance = random.uniform(-pattern['consistency'], pattern['consistency'])
                    actual_turnaround = max(1, int(base_turnaround * pattern['avg_turnaround_bias'] + turnaround_variance))
                    actual_turnaround = min(actual_turnaround, 7)  # Cap at 7 days
                    
                    # Assessment created after the shift date
                    created_date = shift_date + timedelta(days=actual_turnaround)
                    
                    # Don't create assessments in the future
                    if created_date > end_date:
                        created_date = end_date
                    
                    # Random trainee from same program
                    trainee = random.choice(program_trainees)
                    location = random.choice(locations)
                    
                    # Get skill level and rating pattern
                    skill_level = getattr(trainee, 'skill_level', 'average')
                    pattern_ratings = rating_patterns[skill_level]
                    
                    # Add some private comments to random assessments for mailbox testing
                    private_comment = ""
                    if random.choice([True, False, False, False]):  # 25% chance of having private comments
                        private_comments_options = [
                            f"{trainee.name} struggled with patient communication during this shift. Recommend additional training in this area.",
                            f"Excellent performance by {trainee.name}. Ready for increased autonomy in similar cases.",
                            f"{trainee.name} showed good clinical reasoning but needs to work on time management. Shift ran 30 minutes over.",
                            f"Concerning incident: {trainee.name} missed critical lab values. Requires discussion with program director.",
                            f"{trainee.name} demonstrated exceptional leadership during busy period. Consider for chief resident track.",
                            f"Need to discuss {trainee.name}'s approach to difficult family conversations. Showed some difficulty with empathy.",
                            f"{trainee.name} excelled in emergency procedures today. Recommend advanced procedure training.",
                        ]
                        private_comment = random.choice(private_comments_options)
                    
                    # Create assessment
                    assessment = Assessment.objects.create(
                        trainee=trainee,
                        evaluator=evaluator,
                        shift_date=shift_date,
                        location=location,
                        status='submitted',
                        private_comments=private_comment
                    )
                    
                    # Override the created_at timestamp to match our calculated date
                    assessment.created_at = datetime.combine(created_date, datetime.now().time())
                    assessment.save()
                    
                    # Create 1 EPA rating per assessment (business rule: single EPA per assessment)
                    epa = random.choice(list(available_epas))
                    
                    # Get rating based on skill level with some variation
                    base_rating = random.choice(pattern_ratings)
                    # Add slight variation (±1, but keep within 1-5 range)
                    rating = max(1, min(5, base_rating + random.randint(-1, 1)))
                    
                    AssessmentEPA.objects.create(
                        assessment=assessment,
                        epa=epa,
                        entrustment_level=rating,
                        what_went_well=f"Good performance in {epa.title.lower()}",
                        what_could_improve="Continue practicing and refining skills"
                    )
                    
                    evaluator_total += 1
                    total_assessments += 1
                
                current_month = next_month
            
            self.stdout.write(f'  ↳ Created {evaluator_total} assessments for {evaluator.name}')
        
        self.stdout.write(f'📊 Total assessments created: {total_assessments}')

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