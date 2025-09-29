"""
Create realistic demo data for Emergency Medicine residency program
Based on actual EM competencies and EPA mapping from CSV files
"""

import random
import csv
import os
from datetime import datetime, timedelta, date
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from organizations.models import Organization, Program, Site
from curriculum.models import CoreCompetency, SubCompetency, EPA, EPACategory, SubCompetencyEPA
from assessments.models import Assessment, AssessmentEPA
from users.models import Cohort

User = get_user_model()

class Command(BaseCommand):
    help = 'Create realistic demo data based on actual EM competency structure'
    
    def __init__(self):
        super().__init__()
        self.epa_competency_descriptions = self.load_epa_competency_descriptions()

    def handle(self, *args, **options):
        with transaction.atomic():
            self.stdout.write('🚀 Creating realistic Emergency Medicine demo data...')
            
            # Clear existing data
            self.clear_existing_data()
            
            # Create organization and program
            organization = self.create_organization()
            program = self.create_em_program(organization)
            sites = self.create_sites(organization, program)
            
            # Create curriculum based on CSV data
            competencies = self.create_competencies_from_csv(program)
            subcompetencies = self.create_subcompetencies_from_csv(program, competencies)
            epa_categories = self.create_epa_categories(program)
            epas = self.create_epas_from_csv(program, epa_categories)
            self.map_epas_to_subcompetencies_from_csv(epas, subcompetencies)
            
            # Create cohorts (3 cohorts)
            cohorts = self.create_realistic_cohorts(organization, program)
            
            # Create users (including demo users as regular users)
            trainees, faculty, leadership, coordinator = self.create_all_users(organization, program, cohorts)
            
            # Create realistic assessments with progression
            all_evaluators = faculty + leadership
            all_trainees = trainees
            self.create_realistic_assessments(all_trainees, all_evaluators, sites, epas, program)
            
            self.stdout.write(self.style.SUCCESS('✅ Realistic demo data created successfully!'))
            self.stdout.write(f'📊 Created {len(trainees)} trainees, {len(faculty)} faculty, {len(leadership)} leadership')
            self.stdout.write(f'📋 Created {Assessment.objects.count()} assessments with realistic progression')

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
        Cohort.objects.all().delete()
        Site.objects.all().delete()
        Program.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        Organization.objects.all().delete()

    def create_organization(self):
        """Create demo organization"""
        organization = Organization.objects.create(
            name='Metro General Hospital',
            slug='metro-general-hospital'
        )
        self.stdout.write(f'🏥 Created organization: {organization.name}')
        return organization

    def create_em_program(self, organization):
        """Create Emergency Medicine program"""
        program = Program.objects.create(
            org=organization,
            name='Emergency Medicine',
            abbreviation='EM',
            specialty='Emergency Medicine'
        )
        self.stdout.write(f'🎓 Created program: {program.name} ({program.abbreviation})')
        return program

    def create_sites(self, organization, program):
        """Create realistic clinical sites"""
        sites_data = [
            'Metro General Emergency Department',
            'Metro General Trauma Center', 
            'Metro General Pediatric ED',
            'Community Hospital Emergency Department',
            'Metro General Urgent Care',
        ]
        
        sites = []
        for site_name in sites_data:
            site = Site.objects.create(
                org=organization,
                program=program,
                name=site_name
            )
            sites.append(site)
            self.stdout.write(f'🏥 Created site: {site_name}')
        
        return sites

    def create_competencies_from_csv(self, program):
        """Create core competencies based on CSV structure"""
        # Extract unique competency categories from CSV data
        competency_categories = {
            'PC': 'Patient Care',
            'MK': 'Medical Knowledge', 
            'SBP': 'Systems-Based Practice',
            'PBLI': 'Practice-Based Learning and Improvement',
            'P': 'Professionalism',
            'ICS': 'Interpersonal and Communication Skills'
        }
        
        competencies = {}
        for code, title in competency_categories.items():
            competency = CoreCompetency.objects.create(
                program=program,
                code=code,
                title=title
            )
            competencies[code] = competency
            self.stdout.write(f'📚 Created core competency: {code} - {title}')
        
        return competencies

    def create_subcompetencies_from_csv(self, program, competencies):
        """Create sub-competencies from CSV data"""
        csv_data = [
            ('PC1', 'Patient Care 1: Emergency Stabilization', 'PC', 'Detects when a patient\'s vital signs are abnormal; assesses ABCs and performs basic interventions', 'Identifies a patient who is unstable and requires immediate intervention; addresses unstable vital signs and initiates advanced resuscitation', 'Identifies occult presentations at risk for instability; reassesses after interventions', 'Ascertains futility of interventions; integrates hospital support services in management', 'Manages rare/complex presentations requiring stabilization'),
            ('PC2', 'Patient Care 2: Performance of a Focused History and Physical Exam', 'PC', 'Elicits/communicates reliable comprehensive history and physical', 'Focused history/PE that addresses chief complaint & urgent issues', 'Prioritizes essential components in limited/dynamic circumstances', 'Uses all potential sources of data for beneficial management', 'Models effective use of H&P to minimize diagnostic testing'),
            ('PC3', 'Patient Care 3: Diagnostic Studies', 'PC', 'Determines need for diagnostic studies; understands testing principles', 'Selects appropriate studies, reviews risks/benefits; interprets results (EKG, imaging, POCUS)', 'Prioritizes essential studies in limited/dynamic situations; orders with pre-test probability in mind', 'Practices cost-effective ordering; considers post-test probability', 'Proposes alternatives when barriers exist; discriminates subtle/conflicting results'),
            ('PC4', 'Patient Care 4: Diagnosis', 'PC', 'Constructs list of potential diagnoses from chief complaint/initial assessment', 'Provides prioritized differential', 'Provides diagnosis for common conditions; modifies with clinical course/data', 'Provides diagnosis for multiple comorbidities/uncommon conditions; recognizes reasoning errors', 'Serves as role model/educator in deriving diagnoses & recognizing errors'),
            ('PC5', 'Patient Care 5: Pharmacotherapy', 'PC', 'Describes drug classifications; asks about allergies', 'Selects appropriate therapeutic agent; evaluates for adverse effects/interactions', 'Considers array of therapy based on mechanism/intended effect; recognizes common adverse effects', 'Selects agents considering patient preferences, allergies, cost, policy, guidelines; recognizes uncommon adverse effects', 'Participates in departmental/institutional policy on pharmacy/therapeutics'),
            ('PC6', 'Patient Care 6: Reassessment and Disposition', 'PC', 'Describes resources, basic patient education; identifies need for re-eval', 'Makes disposition for routine conditions needing minimal resources; educates on simple discharge/admission; monitors interventions', 'Makes dispo for routine conditions with resource utilization; educates on diagnosis, plan, meds, follow-up; identifies need for ongoing ED evaluation', 'Makes dispo for complex conditions; educates on complex plans/transfers; evaluates changes in clinical status', 'Participates in institutional committees/protocol development to enhance safe dispo'),
            ('PC7', 'Patient Care 7: Multitasking (Task Switching)', 'PC', 'Manages single patient amidst distractions', 'Task-switches between patients of similar acuity', 'Task-switches efficiently to manage multiple patients of varying acuity/work-up stage', 'Task-switches efficiently to manage the ED', 'Task-switches efficiently under surge/high volume'),
            ('PC8', 'Patient Care 8: General Approach to Procedures', 'PC', 'Identifies indications and anatomy/physiology; performs basic procedures (suturing, splinting)', 'Assesses indications, risks/benefits, obtains consent in low–moderate risk; performs/interprets basic procedures with assistance; recognizes common complications', 'Assesses risks/benefits in high-risk situations; performs/interprets advanced procedures with guidance; manages common complications', 'Mitigates modifiable risk factors; independently performs/interprets advanced procedures; manages uncommon complications', 'Teaches advanced procedures; independently performs rare, time-sensitive procedures; participates in peer review'),
            ('MK1', 'Medical Knowledge 1: Scientific Knowledge', 'MK', 'Demonstrates scientific knowledge of common presentations and conditions', 'Demonstrates scientific knowledge of complex presentations and conditions', 'Integrates knowledge of comorbid conditions for complex presentations', 'Integrates knowledge of uncommon/atypical/complex comorbid conditions', 'Pursues and integrates new and emerging knowledge'),
            ('MK2', 'Medical Knowledge 2: Treatment and Clinical Reasoning', 'MK', 'Knowledge of treatment for common conditions; identifies reasoning errors with substantial guidance', 'Knowledge of treatment for complex conditions; identifies reasoning errors', 'Knowledge of impact of patient factors; retrospectively identifies cognitive errors', 'Comprehensive knowledge of varying presentations and treatments; re-appraises reasoning prospectively', 'Contributes to body of knowledge on disease patterns/treatments; coaches others to avoid cognitive errors'),
            ('SBP1', 'Systems-Based Practice 1: Patient Safety', 'SBP', 'Knowledge of common patient safety events; knowledge of reporting', 'Identifies system factors; reports safety events through institutional systems', 'Participates in analysis of events; participates in disclosure to patients/families', 'Conducts analysis and offers prevention strategies; discloses to patients/families', 'Engages teams/processes to modify systems; role models/mentors in disclosure'),
            ('SBP2', 'Systems-Based Practice 2: Quality Improvement', 'SBP', 'Knowledge of QI methodologies/metrics', 'Describes local QI initiatives', 'Participates in local QI initiatives', 'Demonstrates skills in developing/implementing/analyzing a QI project', 'Creates, implements, assesses QI initiatives at institutional/community level'),
            ('SBP3', 'Systems-Based Practice 3: System Navigation for Patient-Centered Care', 'SBP', 'Knowledge of care coordination, transitions of care, and population/community needs', 'Coordinates care in routine situations; enables safe transitions; identifies local population needs', 'Coordinates care in complex situations; enables complex transitions; uses local resources', 'Role models coordination of care; advocates for transitions; adapts practice to population needs', 'Analyzes/improves care coordination; leads innovations; advocates for populations/communities'),
            ('SBP4', 'Systems-Based Practice 4: Physician Role in Health Care Systems', 'SBP', 'Identifies components of health care system; describes payment systems', 'Describes interrelationships of system components; delivers care with consideration of payment models; identifies practice knowledge domains', 'Discusses practice impact on broader system; engages patients in shared decision making; integrates IT for practice', 'Manages system components; advocates for patient needs within payment models; describes core administrative knowledge', 'Leads systems change; participates in health policy advocacy; analyzes practice patterns and requirements'),
            ('PBLI1', 'Practice-Based Learning and Improvement 1: Evidence-Based and Informed Practice', 'PBLI', 'Demonstrates how to access/use evidence', 'Articulates clinical questions', 'Locates/applies best evidence, integrates with patient preferences', 'Critically appraises/applies evidence in uncertainty/conflicting contexts', 'Coaches others in appraisal/application; develops guidelines'),
            ('PBLI2', 'Practice-Based Learning and Improvement 2: Reflective Practice and Commitment to Personal Growth', 'PBLI', 'Open to performance data', 'Uses performance data to develop goals; identifies performance gaps', 'Seeks/accepts performance data; analyzes contributing factors', 'Continually improves goals using data; institutes behavioral changes', 'Role models personal/professional goal development; coaches others in reflective practice'),
            ('P1', 'Professionalism 1: Professional Behavior and Ethical Principles', 'P', 'Professional behavior in routine situations; knowledge of ethics principles', 'Identifies triggers; takes responsibility for lapses; analyzes straightforward ethical situations', 'Professional behavior in complex/stressful situations; analyzes complex situations; seeks help', 'Prevents lapses in self/others; uses resources to resolve dilemmas', 'Coaches others; addresses system-level ethical factors'),
            ('P2', 'Professionalism 2: Accountability/Conscientiousness', 'P', 'Performs tasks with attention to detail; responds promptly', 'Performs tasks timely with detail; takes responsibility for failures', 'Performs in complex/stressful situations; recognizes factors affecting own performance', 'Recognizes factors affecting others\' performance; ensures needs of patients/teams/systems met', 'Takes ownership of system outcomes'),
            ('P3', 'Professionalism 3: Self-Awareness and Well-Being', 'P', 'Recognizes personal/professional well-being status (with assistance)', 'Independently recognizes well-being status; engages in help-seeking', 'Proposes plan to optimize well-being (with assistance)', 'Independently develops plan to optimize well-being', 'Coaches others when emotional responses/skills do not meet expectations'),
            ('ICS1', 'Interpersonal and Communication Skills 1: Patient and Family Centered Communication', 'ICS', 'Uses respectful language/behavior; identifies common communication barriers', 'Establishes therapeutic relationship in straightforward encounters; identifies complex barriers', 'Establishes therapeutic relationship in challenging encounters; reflects on biases; delivers information with guidance', 'Easily establishes relationships regardless of complexity; independently uses shared decision making', 'Mentors others in therapeutic relationships, reflection, and shared decision making'),
            ('ICS2', 'Interpersonal and Communication Skills 2: Interprofessional and Team Communication', 'ICS', 'Respectfully requests consultation; uses respectful language; receives feedback', 'Clearly requests consultation/resources; communicates effectively with team; solicits feedback', 'Integrates recommendations from team; engages in active listening; communicates concerns/feedback to peers/learners', 'Role models flexible communication; leads/manages teams; communicates feedback/criticism to superiors', 'Role models leadership communication; facilitates team feedback in complex situations'),
            ('ICS3', 'Interpersonal and Communication Skills 3: Communication within Health Care Systems', 'ICS', 'Documents accurately; safeguards patient info; communicates via institutional channels', 'Organized reasoning in patient record; respectfully communicates system concerns', 'Concisely reports reasoning; offers suggestions to improve system', 'Clear/contemporaneous written communication; initiates difficult system conversations', 'Models feedback for others\' communication; facilitates dialogue with broader stakeholders'),
        ]
        
        subcompetencies = {}
        for code, title, core_code, level1, level2, level3, level4, level5 in csv_data:
            core_competency = competencies[core_code]
            subcompetency = SubCompetency.objects.create(
                program=program,
                core_competency=core_competency,
                code=code,
                title=title,
                milestone_level_1=level1,
                milestone_level_2=level2,
                milestone_level_3=level3,
                milestone_level_4=level4,
                milestone_level_5=level5
            )
            subcompetencies[code] = subcompetency
            self.stdout.write(f'📋 Created subcompetency: {code} - {title[:50]}...')
        
        return subcompetencies

    def create_epa_categories(self, program):
        """Create EPA categories"""
        categories_data = [
            'Clinical Assessment and Management',
            'Procedures and Technical Skills',
            'Communication and Professionalism',
            'Systems-Based Practice',
            'Quality and Safety'
        ]
        
        categories = {}
        for cat_title in categories_data:
            category = EPACategory.objects.create(
                program=program,
                title=cat_title
            )
            categories[cat_title] = category
            self.stdout.write(f'📂 Created EPA category: {cat_title}')
        
        return categories

    def create_epas_from_csv(self, program, epa_categories):
        """Create EPAs from CSV data"""
        epa_data = [
            ('EPA1', 'Initiate treatment for a patient requiring emergent/immediate intervention.', 'Clinical Assessment and Management'),
            ('EPA2', 'Lead the resuscitation of a critically ill or injured patient.', 'Clinical Assessment and Management'),
            ('EPA3', 'Obtain and interpret a focused history using data from all necessary sources.', 'Clinical Assessment and Management'),
            ('EPA4', 'Perform and interpret a focused physical examination.', 'Clinical Assessment and Management'),
            ('EPA5', 'Create and prioritize a differential diagnosis.', 'Clinical Assessment and Management'),
            ('EPA6', 'Order and interpret diagnostic tests.', 'Clinical Assessment and Management'),
            ('EPA7', 'Apply best available evidence to guide patient care.', 'Quality and Safety'),
            ('EPA8', 'Manage clinical or diagnostic uncertainty when caring for patients.', 'Clinical Assessment and Management'),
            ('EPA9', 'Utilize observation and reassessment to guide decision making.', 'Clinical Assessment and Management'),
            ('EPA10', 'Develop and implement an appropriate disposition and aftercare plan.', 'Systems-Based Practice'),
            ('EPA11', 'Perform the diagnostic and therapeutic procedures of an emergency physician.', 'Procedures and Technical Skills'),
            ('EPA12', 'Provide invasive and noninvasive airway management.', 'Procedures and Technical Skills'),
            ('EPA13', 'Perform and interpret point‐of‐care ultrasound.', 'Procedures and Technical Skills'),
            ('EPA14', 'Perform procedural sedation.', 'Procedures and Technical Skills'),
            ('EPA15', 'Implement pharmacologic and therapeutic management plans.', 'Clinical Assessment and Management'),
            ('EPA16', 'Provide palliative and end‐of‐life care for patients and their families.', 'Communication and Professionalism'),
            ('EPA17', 'Document the patient encounter.', 'Communication and Professionalism'),
            ('EPA18', 'Communicate with other health care professionals about patient care.', 'Communication and Professionalism'),
            ('EPA19', 'Communicate with the patient, family, and caregivers.', 'Communication and Professionalism'),
            ('EPA20', 'Provide supervision or consultation for other health care professionals.', 'Systems-Based Practice'),
            ('EPA21', 'Manage the ED flow to optimize patient care.', 'Systems-Based Practice'),
            ('EPA22', 'Fulfill professional obligations and adhere to professional standards.', 'Communication and Professionalism'),
        ]
        
        epas = {}
        for code, title, category_name in epa_data:
            category = epa_categories[category_name]
            epa = EPA.objects.create(
                program=program,
                category=category,
                code=code,
                title=title,
                description=f'Detailed description for {title}',
                is_active=True
            )
            epas[code] = epa
            self.stdout.write(f'📝 Created EPA: {code} - {title[:50]}...')
        
        return epas

    def map_epas_to_subcompetencies_from_csv(self, epas, subcompetencies):
        """Map EPAs to subcompetencies based on CSV mapping data"""
        # Mapping data from the EPA CSV (1 = mapped, 0 = not mapped)
        mapping_data = {
            'EPA1': ['PC1', 'PC2', 'PC5', 'MK2', 'ICS2'],
            'EPA2': ['PC1', 'PC2', 'PC3', 'PC4', 'PC6', 'MK1', 'MK2', 'ICS1', 'ICS2'],
            'EPA3': ['PC2', 'MK1', 'MK2', 'ICS1'],
            'EPA4': ['PC2', 'PC4', 'MK1', 'MK2'],
            'EPA5': ['PC2', 'PC3', 'PC4', 'MK1', 'MK2'],
            'EPA6': ['PC3', 'PC4', 'MK1', 'MK2', 'PBLI1'],
            'EPA7': ['MK1', 'MK2', 'SBP1', 'PBLI1'],  # Removed SBP2, PBLI2 (not in CSV mapping)
            'EPA8': ['PC3', 'PC4', 'PC5', 'PC6', 'MK1', 'MK2', 'PBLI1', 'ICS1'],  # Removed PBLI2 (not in CSV mapping)
            'EPA9': ['PC2', 'PC6', 'MK2'],
            'EPA10': ['PC6', 'MK2', 'SBP3', 'SBP4', 'ICS1', 'ICS3'],
            'EPA11': ['PC8', 'MK2', 'ICS1', 'ICS2'],
            'EPA12': ['PC1', 'PC5', 'PC8', 'MK2'],
            'EPA13': ['PC3', 'PC8'],
            'EPA14': ['PC5', 'PC6', 'PC8', 'MK1', 'MK2', 'ICS1', 'ICS2'],
            'EPA15': ['PC5', 'MK1', 'MK2'],
            'EPA16': ['PC5', 'PC6', 'MK2', 'SBP1', 'P1', 'P2', 'P3', 'ICS1', 'ICS2'],  # Added P3
            'EPA17': ['SBP1', 'SBP4', 'P1', 'P2', 'ICS3'],
            'EPA18': ['SBP1', 'SBP3', 'SBP4', 'P1', 'P2', 'ICS2', 'ICS3'],
            'EPA19': ['P1', 'P2', 'P3', 'ICS1'],  # Added P3
            'EPA20': ['MK2', 'SBP1', 'SBP4', 'ICS2', 'ICS3'],
            'EPA21': ['PC6', 'PC7', 'SBP1', 'SBP3', 'P2', 'ICS2', 'ICS3'],  # Removed SBP2 (not in CSV mapping)
            'EPA22': ['P1', 'P2', 'P3'],  # Added P3
        }
        
        for epa_code, subcomp_codes in mapping_data.items():
            epa = epas[epa_code]
            for subcomp_code in subcomp_codes:
                if subcomp_code in subcompetencies:
                    SubCompetencyEPA.objects.create(
                        sub_competency=subcompetencies[subcomp_code],
                        epa=epa
                    )
                    self.stdout.write(f'🔗 Mapped {epa_code} to {subcomp_code}')

    def create_realistic_cohorts(self, organization, program):
        """Create 3 cohorts representing different residency years"""
        current_year = date.today().year
        cohorts_data = [
            {
                'name': f'Class of {current_year + 1}',  # PGY-3 (graduating next year)
                'start_date': date(current_year - 2, 7, 1),
                'end_date': date(current_year + 1, 6, 30),
                'year_in_program': 3
            },
            {
                'name': f'Class of {current_year + 2}',  # PGY-2  
                'start_date': date(current_year - 1, 7, 1),
                'end_date': date(current_year + 2, 6, 30),
                'year_in_program': 2
            },
            {
                'name': f'Class of {current_year + 3}',  # PGY-1 (interns)
                'start_date': date(current_year, 7, 1),
                'end_date': date(current_year + 3, 6, 30),
                'year_in_program': 1
            },
        ]
        
        cohorts = []
        for cohort_data in cohorts_data:
            year_in_program = cohort_data.pop('year_in_program')
            cohort = Cohort.objects.create(
                org=organization,
                program=program,
                **cohort_data
            )
            cohort.year_in_program = year_in_program  # Store for assessment creation
            cohorts.append(cohort)
            self.stdout.write(f'🎓 Created cohort: {cohort.name} (PGY-{year_in_program})')
        
        return cohorts

    def create_all_users(self, organization, program, cohorts):
        """Create all users including demo users integrated as regular users"""
        
        # Create regular users
        trainees = self.create_realistic_trainees(organization, program, cohorts)
        faculty = self.create_realistic_faculty(organization, program)
        leadership = self.create_realistic_leadership(organization, program)
        coordinator = self.create_coordinator(organization, program)
        
        # Create demo users and integrate them into the regular user lists
        demo_accounts = self.create_demo_login_accounts(organization, program, cohorts)
        
        # Add demo users to their respective lists so they participate like regular users
        trainees.append(demo_accounts['trainee'])
        faculty.append(demo_accounts['faculty'])
        leadership.append(demo_accounts['leadership'])
        # coordinator and system_admin are handled separately as they don't participate in assessments
        
        return trainees, faculty, leadership, coordinator

    def create_realistic_trainees(self, organization, program, cohorts):
        """Create 14 trainees per cohort (42 total)"""
        trainee_names = [
            # PGY-3 (Class of 2026) - 14 trainees
            'Dr. Sarah Chen', 'Dr. Michael Rodriguez', 'Dr. Emily Johnson', 'Dr. David Kim',
            'Dr. Jessica Williams', 'Dr. Robert Taylor', 'Dr. Amanda Davis', 'Dr. Christopher Lee',
            'Dr. Maria Garcia', 'Dr. James Wilson', 'Dr. Lisa Anderson', 'Dr. Kevin Brown',
            'Dr. Rachel Martinez', 'Dr. Daniel Thompson',
            
            # PGY-2 (Class of 2027) - 14 trainees  
            'Dr. Ashley White', 'Dr. Jonathan Harris', 'Dr. Stephanie Clark', 'Dr. Matthew Lewis',
            'Dr. Nicole Walker', 'Dr. Ryan Hall', 'Dr. Samantha Allen', 'Dr. Brandon Young',
            'Dr. Victoria King', 'Dr. Tyler Wright', 'Dr. Megan Lopez', 'Dr. Austin Hill',
            'Dr. Courtney Green', 'Dr. Jordan Adams',
            
            # PGY-1 (Class of 2028) - 14 trainees
            'Dr. Hannah Baker', 'Dr. Zachary Nelson', 'Dr. Olivia Carter', 'Dr. Ethan Mitchell',
            'Dr. Sophia Perez', 'Dr. Noah Roberts', 'Dr. Isabella Turner', 'Dr. Mason Phillips',
            'Dr. Ava Campbell', 'Dr. Logan Parker', 'Dr. Emma Evans', 'Dr. Lucas Edwards',
            'Dr. Chloe Collins', 'Dr. Owen Stewart'
        ]
        
        trainees = []
        trainee_index = 0
        
        for cohort in cohorts:
            cohort_trainees = []
            for i in range(14):  # 14 trainees per cohort
                if trainee_index < len(trainee_names):
                    name = trainee_names[trainee_index]
                    email = f'trainee{trainee_index + 1}@demo.com'
                    
                    trainee = User.objects.create_user(
                        email=email,
                        password='password123',
                        name=name,
                        role='trainee',
                        organization=organization,
                        program=program,
                        cohort=cohort
                    )
                    trainees.append(trainee)
                    cohort_trainees.append(trainee)
                    trainee_index += 1
                    
            self.stdout.write(f'👨‍⚕️ Created {len(cohort_trainees)} trainees for {cohort.name}')
        
        return trainees

    def create_realistic_faculty(self, organization, program):
        """Create 35 faculty members"""
        faculty_names = [
            'Dr. Jennifer Thompson', 'Dr. Mark Stevens', 'Dr. Lisa Chang', 'Dr. Andrew Miller',
            'Dr. Patricia Wilson', 'Dr. Thomas Anderson', 'Dr. Michelle Davis', 'Dr. Brian Johnson',
            'Dr. Karen Martinez', 'Dr. Steven Brown', 'Dr. Nancy Garcia', 'Dr. Paul Rodriguez',
            'Dr. Sandra Taylor', 'Dr. Kenneth White', 'Dr. Donna Lewis', 'Dr. Charles Hall',
            'Dr. Helen Clark', 'Dr. Gary Walker', 'Dr. Betty Young', 'Dr. Frank Allen',
            'Dr. Deborah King', 'Dr. Jeffrey Wright', 'Dr. Linda Lopez', 'Dr. Raymond Hill',
            'Dr. Barbara Green', 'Dr. Anthony Adams', 'Dr. Susan Baker', 'Dr. William Nelson',
            'Dr. Margaret Carter', 'Dr. Joseph Mitchell', 'Dr. Dorothy Perez', 'Dr. Richard Roberts',
            'Dr. Carol Turner', 'Dr. Daniel Phillips', 'Dr. Ruth Campbell'
        ]
        
        faculty = []
        for i, name in enumerate(faculty_names):
            email = f'faculty{i + 1}@demo.com'
            faculty_member = User.objects.create_user(
                email=email,
                password='password123',
                name=name,
                role='faculty',
                department='Emergency Medicine',
                organization=organization,
                program=program
            )
            faculty.append(faculty_member)
        
        self.stdout.write(f'👨‍🏫 Created {len(faculty)} faculty members')
        return faculty

    def create_realistic_leadership(self, organization, program):
        """Create 4 leadership members"""
        leadership_names = [
            'Dr. Elizabeth Morgan (Program Director)',
            'Dr. Robert Chen (Associate Program Director)', 
            'Dr. Sarah Williams (Clerkship Director)',
            'Dr. Michael Davis (Research Director)'
        ]
        
        leadership = []
        for i, name in enumerate(leadership_names):
            email = f'leadership{i + 1}@demo.com'
            leader = User.objects.create_user(
                email=email,
                password='password123',
                name=name,
                role='leadership',
                department='Emergency Medicine Leadership',
                organization=organization,
                program=program
            )
            leadership.append(leader)
        
        self.stdout.write(f'👑 Created {len(leadership)} leadership members')
        return leadership

    def create_coordinator(self, organization, program):
        """Create 1 coordinator"""
        coordinator = User.objects.create_user(
            email='coordinator@demo.com',
            password='password123',
            name='Dr. Amanda Foster (Program Coordinator)',
            role='admin',
            department='Emergency Medicine Administration',
            organization=organization,
            program=program
        )
        
        self.stdout.write(f'👩‍💼 Created coordinator: {coordinator.name}')
        return coordinator

    def create_demo_login_accounts(self, organization, program, cohorts):
        """Create specific demo login accounts for each user type"""
        self.stdout.write('🔑 Creating demo login accounts...')
        
        # Demo Trainee (PGY-2)
        pgy2_cohort = next((c for c in cohorts if '2027' in c.name), cohorts[1])
        demo_trainee = User.objects.create_user(
            email='trainee@demo.com',
            password='password123',
            name='Dr. Alex Martinez',
            role='trainee',
            organization=organization,
            program=program,
            cohort=pgy2_cohort
        )
        self.stdout.write(f'👨‍⚕️ Created demo trainee: {demo_trainee.email} / password123')
        
        # Demo Faculty
        demo_faculty = User.objects.create_user(
            email='faculty@demo.com',
            password='password123',
            name='Dr. Jennifer Smith',
            role='faculty',
            department='Emergency Medicine',
            organization=organization,
            program=program
        )
        self.stdout.write(f'👨‍🏫 Created demo faculty: {demo_faculty.email} / password123')
        
        # Demo Leadership
        demo_leadership = User.objects.create_user(
            email='leadership@demo.com',
            password='password123',
            name='Dr. Michael Johnson',
            role='leadership',
            department='Emergency Medicine Leadership',
            organization=organization,
            program=program
        )
        self.stdout.write(f'👑 Created demo leadership: {demo_leadership.email} / password123')
        
        # Demo Coordinator (Admin)
        demo_admin = User.objects.create_user(
            email='admin@demo.com',
            password='password123',
            name='Dr. Sarah Wilson',
            role='admin',
            department='Emergency Medicine Administration',
            organization=organization,
            program=program
        )
        self.stdout.write(f'👩‍💼 Created demo coordinator: {demo_admin.email} / password123')
        
        # Demo System Admin
        demo_system_admin = User.objects.create_user(
            email='system-admin@demo.com',
            password='password123',
            name='Dr. Robert Chen',
            role='system-admin',
            department='IT Administration',
            organization=organization,
            program=program
        )
        self.stdout.write(f'🔧 Created demo system admin: {demo_system_admin.email} / password123')
        
        self.stdout.write('📋 Demo Login Summary:')
        self.stdout.write('  trainee@demo.com / password123 (PGY-2 resident)')
        self.stdout.write('  faculty@demo.com / password123 (attending physician)')
        self.stdout.write('  leadership@demo.com / password123 (program director)')
        self.stdout.write('  admin@demo.com / password123 (program coordinator)')
        self.stdout.write('  system-admin@demo.com / password123 (system administrator)')
        
        return {
            'trainee': demo_trainee,
            'faculty': demo_faculty,
            'leadership': demo_leadership,
            'admin': demo_admin,
            'system_admin': demo_system_admin
        }

    def create_realistic_assessments(self, trainees, evaluators, sites, epas, program):
        """Create realistic assessments with progression over time"""
        self.stdout.write('📊 Creating realistic assessments with progression...')
        
        # Group trainees by cohort for different assessment patterns
        trainees_by_cohort = {}
        for trainee in trainees:
            cohort_name = trainee.cohort.name
            if cohort_name not in trainees_by_cohort:
                trainees_by_cohort[cohort_name] = []
            trainees_by_cohort[cohort_name].append(trainee)
        
        current_date = datetime.now().date()
        epa_list = list(epas.values())
        
        # Track private comments for leadership mailbox
        total_assessments_created = 0
        private_comment_assessments = []
        
        for cohort_name, cohort_trainees in trainees_by_cohort.items():
            # Determine years in program and assessment counts based on cohort start dates
            cohort = cohort_trainees[0].cohort  # Get cohort from first trainee
            cohort_start_date = cohort.start_date
            
            # Calculate how long this cohort has been in the program
            days_in_program = (current_date - cohort_start_date).days
            months_in_program = max(1, days_in_program // 30)  # At least 1 month
            
            if '2026' in cohort_name:  # PGY-3, started July 2022
                avg_assessments_per_month = 18  # Increased significantly for better variance coverage
                base_entrustment = 4.0  # Higher scores for senior residents (+0.5)
                progression_factor = 0.8  # Strong progression over time
            elif '2027' in cohort_name:  # PGY-2, started July 2023
                avg_assessments_per_month = 16  # Increased significantly for better variance coverage
                base_entrustment = 3.3  # Medium scores (+0.5)
                progression_factor = 0.6
            else:  # PGY-1, started July 2025 (recent interns)
                avg_assessments_per_month = 14  # Increased significantly for better variance coverage
                base_entrustment = 2.5  # Lower scores for interns (+0.5)
                progression_factor = 0.4
            
            self.stdout.write(f'📈 Creating assessments for {cohort_name}: {months_in_program} months, avg {avg_assessments_per_month}/month')
            
            for trainee in cohort_trainees:
                # Create assessments distributed over time
                total_assessments = int(months_in_program * avg_assessments_per_month * random.uniform(0.8, 1.2))
                
                for assessment_num in range(total_assessments):
                    # Distribute assessments from cohort start date to now
                    # Generate random date between cohort start and current date
                    days_since_start = (current_date - cohort_start_date).days
                    random_days_from_start = random.randint(0, max(1, days_since_start - 7))  # Leave recent week for realistic "recent" data
                    shift_date = cohort_start_date + timedelta(days=random_days_from_start)
                    
                    # Calculate base progression level for this time point
                    # time_factor: 0 (start of program) to 1 (current time)
                    time_factor = random_days_from_start / max(1, days_since_start)
                    base_level_for_time = base_entrustment + (progression_factor * time_factor)
                    
                    # Select random evaluator and site
                    evaluator = random.choice(evaluators)
                    site = random.choice(sites)
                    
                    # Determine how many EPAs to assess (1-3 EPAs per assessment for better coverage)
                    num_epas = random.choices([1, 2, 3], weights=[60, 30, 10])[0]  # Most assessments have 1 EPA, some have 2-3
                    
                    # Create private comments - limit to 5 total for leadership mailbox
                    private_comment = ""
                    # Only add to first 5 assessments that don't already have private comments
                    if len(private_comment_assessments) < 5 and random.random() < 0.05:  # 5% chance, but cap at 5 total
                        private_comments_options = [
                            f"{trainee.name} demonstrated exceptional clinical reasoning during this challenging case. Ready for increased autonomy.",
                            f"Excellent performance by {trainee.name}. Showed strong leadership during the resuscitation.",
                            f"{trainee.name} struggled with time management during busy shift. Recommend discussion with attending.",
                            f"Outstanding procedural skills demonstrated by {trainee.name}. Consider for advanced procedure training.",
                            f"{trainee.name} showed excellent communication with difficult family. Great empathy and professionalism.",
                            f"Need to discuss {trainee.name}'s approach to diagnostic uncertainty. Could benefit from additional mentoring.",
                            f"{trainee.name} excelled in multitasking during high-volume shift. Strong ED management skills.",
                            f"Concerning incident: {trainee.name} missed critical lab values. Requires program director discussion.",
                        ]
                        private_comment = random.choice(private_comments_options)
                    
                    # Create assessment with realistic creation date (1-4 days after shift)
                    creation_delay = random.randint(1, 4)  # 1-4 days as requested
                    creation_date = shift_date + timedelta(days=creation_delay)
                    
                    # Ensure creation date doesn't exceed current date
                    if creation_date > current_date:
                        creation_date = current_date
                    
                    # Create realistic creation datetime (distributed over time, not just recent)
                    creation_datetime = datetime.combine(
                        creation_date, 
                        datetime.min.time().replace(hour=random.randint(8, 18), minute=random.randint(0, 59))
                    )
                    
                    # Create multiple EPAs with individual variance for realistic competency distribution
                    selected_epas = random.sample(epa_list, min(num_epas, len(epa_list)))
                    
                    # Pre-calculate entrustment levels for feedback generation
                    epa_data_for_feedback = []
                    for epa in selected_epas:
                        # Create trainee-specific competency bias
                        trainee_seed = hash(f"{trainee.id}_{epa.code}") % 1000
                        random.seed(trainee_seed)
                        
                        # EPA difficulty modifier
                        epa_difficulty_modifier = self.get_epa_difficulty_modifier(epa.code)
                        
                        # Individual trainee variance (realistic distribution)
                        variance_type = random.choices(
                            ['normal', 'moderate', 'strong', 'extreme'], 
                            weights=[40, 35, 20, 5]
                        )[0]
                        
                        if variance_type == 'normal':
                            variance = random.uniform(-0.8, 0.8)
                        elif variance_type == 'moderate':
                            variance = random.choice([
                                random.uniform(-1.8, -1.2),  # Moderate low
                                random.uniform(1.2, 1.8)     # Moderate high
                            ])
                        elif variance_type == 'strong':
                            variance = random.choice([
                                random.uniform(-2.8, -2.0),  # Strong low
                                random.uniform(2.0, 2.8)     # Strong high
                            ])
                        else:  # extreme
                            variance = random.choice([
                                random.uniform(-3.5, -3.0),  # Extreme low
                                random.uniform(3.0, 3.5)     # Extreme high
                            ])
                        
                        # Reset random seed to global state
                        random.seed()
                        
                        # Apply all variance factors
                        final_level = base_level_for_time + variance + epa_difficulty_modifier + random.uniform(-0.3, 0.3)
                        epa_entrustment_level = min(5, max(1, round(final_level)))
                        
                        epa_data_for_feedback.append({
                            'epa': epa,
                            'entrustment_level': epa_entrustment_level
                        })
                    
                    # Generate overall feedback for the assessment
                    overall_feedback = self.generate_overall_assessment_feedback(epa_data_for_feedback, trainee, evaluator)
                    
                    # Create assessment (created_at will be auto-set, then we'll update it)
                    assessment = Assessment.objects.create(
                        trainee=trainee,
                        evaluator=evaluator,
                        shift_date=shift_date,
                        location=site.name,
                        status='submitted',
                        private_comments=private_comment,
                        what_went_well=overall_feedback['what_went_well'],
                        what_could_improve=overall_feedback['what_could_improve']
                    )
                    
                    # Update created_at to our realistic date (bypassing auto_now_add)
                    Assessment.objects.filter(id=assessment.id).update(created_at=creation_datetime)
                    
                    for epa_data in epa_data_for_feedback:
                        AssessmentEPA.objects.create(
                            assessment=assessment,
                            epa=epa_data['epa'],
                            entrustment_level=epa_data['entrustment_level']
                        )
                    
                    if private_comment:
                        private_comment_assessments.append(assessment)
                    
                    total_assessments_created += 1
                
                self.stdout.write(f'📋 Created {total_assessments} assessments for {trainee.name}')
        
        # Mark 2 private comment assessments as read, leaving 3 unread (total: 5 with private comments)
        if private_comment_assessments:
            leadership_users = User.objects.filter(role__in=['leadership', 'admin'], program=program)
            
            # Mark only the first 2 assessments as read, leave the last 3 unread
            assessments_to_mark_read = private_comment_assessments[:2]  # First 2 are read
            
            for assessment in assessments_to_mark_read:
                # Mark as read by all leadership (for demo purposes)
                assessment.acknowledged_by.set(leadership_users)
            
            self.stdout.write(f'📬 Created {len(private_comment_assessments)} assessments with private comments')
            self.stdout.write(f'📖 Marked {len(assessments_to_mark_read)} as read, leaving {len(private_comment_assessments) - len(assessments_to_mark_read)} unread for demo')
        
        self.stdout.write(f'🎯 Total assessments created: {total_assessments_created}')

    def generate_realistic_feedback(self, epa, entrustment_level):
        """Generate realistic, varied feedback based on EPA type and entrustment level"""
        
        # EPA-specific feedback templates organized by category
        epa_feedback_templates = {
            # Clinical Assessment and Management EPAs
            'clinical': {
                'what_went_well': {
                    1: [
                        "Demonstrated basic understanding of patient presentation.",
                        "Showed willingness to learn and ask questions.",
                        "Recognized the need for help appropriately.",
                        "Maintained professional demeanor throughout the case."
                    ],
                    2: [
                        "Gathered relevant history with some prompting.",
                        "Identified key clinical findings with guidance.",
                        "Demonstrated improving clinical reasoning skills.",
                        "Showed good communication with the patient."
                    ],
                    3: [
                        "Conducted thorough assessment independently.",
                        "Developed appropriate differential diagnosis.",
                        "Demonstrated solid clinical knowledge base.",
                        "Managed time effectively during evaluation."
                    ],
                    4: [
                        "Excellent clinical assessment and decision-making.",
                        "Efficiently prioritized multiple patient needs.",
                        "Demonstrated strong diagnostic reasoning.",
                        "Effectively communicated findings to team."
                    ],
                    5: [
                        "Exemplary clinical performance and leadership.",
                        "Seamlessly managed complex patient presentation.",
                        "Demonstrated advanced clinical reasoning skills.",
                        "Served as excellent role model for junior learners."
                    ]
                },
                'what_could_improve': {
                    1: [
                        "Focus on developing systematic approach to patient assessment. Practice basic history-taking skills with supervision.",
                        "Work on recognizing abnormal vital signs and their significance. Review fundamental clinical knowledge.",
                        "Practice organizing clinical information more clearly. Seek feedback on diagnostic reasoning process.",
                        "Develop confidence in basic patient interactions. Review approach to physical examination techniques."
                    ],
                    2: [
                        "Continue developing independence in clinical assessment. Practice differential diagnosis formation.",
                        "Work on time management during patient evaluations. Focus on prioritizing key clinical questions.",
                        "Strengthen knowledge of common emergency presentations. Practice presenting cases more concisely.",
                        "Develop more systematic approach to physical examination. Work on clinical documentation skills."
                    ],
                    3: [
                        "Consider broader differential diagnoses in complex cases. Continue building confidence in decision-making.",
                        "Work on efficiency when managing multiple patients. Practice communication with consultants.",
                        "Focus on developing teaching skills with junior learners. Consider advanced diagnostic approaches.",
                        "Strengthen knowledge of less common presentations. Practice leadership during busy shifts."
                    ],
                    4: [
                        "Continue developing expertise in complex cases. Consider pursuing advanced training opportunities.",
                        "Focus on mentoring junior residents more actively. Work on quality improvement initiatives.",
                        "Develop skills in handling difficult family discussions. Consider research or scholarly activities.",
                        "Continue building leadership skills during high-acuity situations. Focus on system-based improvements."
                    ],
                    5: [
                        "Consider taking on more teaching responsibilities. Explore opportunities for curriculum development.",
                        "Focus on mentoring faculty development activities. Consider research or quality improvement leadership.",
                        "Continue advancing expertise in subspecialty areas. Take on more administrative responsibilities.",
                        "Develop skills in program leadership and assessment. Consider academic medicine career development."
                    ]
                }
            },
            
            # Procedures and Technical Skills EPAs
            'procedures': {
                'what_went_well': {
                    1: [
                        "Understood basic procedural indications and anatomy.",
                        "Maintained sterile technique throughout procedure.",
                        "Demonstrated careful attention to patient safety.",
                        "Asked appropriate questions before proceeding."
                    ],
                    2: [
                        "Successfully completed procedure with guidance.",
                        "Showed improving technical skills and confidence.",
                        "Appropriately obtained informed consent.",
                        "Demonstrated good hand-eye coordination."
                    ],
                    3: [
                        "Performed procedure independently with good technique.",
                        "Effectively managed minor complications.",
                        "Demonstrated solid understanding of anatomy.",
                        "Provided clear explanations to patient and family."
                    ],
                    4: [
                        "Excellent procedural skills and efficiency.",
                        "Smoothly handled unexpected challenges.",
                        "Demonstrated advanced technical expertise.",
                        "Effectively taught procedure to junior learner."
                    ],
                    5: [
                        "Exceptional procedural performance and innovation.",
                        "Masterfully managed complex procedural case.",
                        "Demonstrated teaching excellence during procedure.",
                        "Showed expertise in difficult anatomical conditions."
                    ]
                },
                'what_could_improve': {
                    1: [
                        "Practice basic procedural skills in simulation lab. Review anatomical landmarks and technique.",
                        "Focus on developing confidence with routine procedures. Study indications and contraindications.",
                        "Work on patient positioning and preparation. Practice explaining procedures to patients.",
                        "Develop systematic approach to procedural safety. Review complications and management strategies."
                    ],
                    2: [
                        "Continue practicing to build technical proficiency. Focus on developing procedural speed safely.",
                        "Work on recognizing complications earlier. Practice troubleshooting common technical difficulties.",
                        "Strengthen knowledge of alternative techniques. Focus on improving patient communication during procedures.",
                        "Develop confidence in more complex cases. Practice teaching basic procedures to medical students."
                    ],
                    3: [
                        "Focus on advanced procedural techniques. Work on efficiency during high-pressure situations.",
                        "Develop expertise in ultrasound-guided procedures. Practice managing procedural complications.",
                        "Strengthen teaching skills during procedures. Consider pursuing additional procedural training.",
                        "Work on innovation and quality improvement in procedural care. Focus on patient comfort techniques."
                    ],
                    4: [
                        "Consider subspecialty procedural training. Focus on developing expertise in rare procedures.",
                        "Work on teaching advanced techniques to residents. Develop quality metrics for procedural outcomes.",
                        "Focus on research in procedural innovation. Consider leadership in procedural education.",
                        "Develop skills in procedural simulation training. Work on departmental procedure protocols."
                    ],
                    5: [
                        "Focus on developing new procedural techniques. Consider research in procedural innovation.",
                        "Take leadership in departmental procedural training. Develop expertise in procedural simulation.",
                        "Consider national speaking on procedural topics. Focus on mentoring procedural faculty.",
                        "Develop advanced procedural research programs. Lead institutional procedural quality initiatives."
                    ]
                }
            },
            
            # Communication and Professionalism EPAs  
            'communication': {
                'what_went_well': {
                    1: [
                        "Maintained professional demeanor with patients and families.",
                        "Demonstrated empathy and compassion appropriately.",
                        "Showed respect for patient privacy and dignity.",
                        "Communicated clearly and used appropriate language."
                    ],
                    2: [
                        "Built good rapport with patients and families.",
                        "Effectively delivered routine medical information.",
                        "Demonstrated active listening skills.",
                        "Showed cultural sensitivity in patient interactions."
                    ],
                    3: [
                        "Skillfully navigated difficult patient conversations.",
                        "Effectively communicated with interdisciplinary team.",
                        "Demonstrated strong emotional intelligence.",
                        "Provided clear discharge instructions and follow-up."
                    ],
                    4: [
                        "Exceptional communication in challenging situations.",
                        "Effectively led difficult family meetings.",
                        "Demonstrated advanced conflict resolution skills.",
                        "Served as communication role model for team."
                    ],
                    5: [
                        "Masterful communication across all situations.",
                        "Expertly handled complex ethical discussions.",
                        "Demonstrated leadership in communication training.",
                        "Showed exceptional skill in crisis communication."
                    ]
                },
                'what_could_improve': {
                    1: [
                        "Practice delivering bad news with appropriate supervision. Work on developing empathetic responses.",
                        "Focus on active listening skills development. Practice explaining medical concepts in lay terms.",
                        "Work on managing emotional responses professionally. Study cultural competency in healthcare.",
                        "Develop confidence in difficult conversations. Practice therapeutic communication techniques."
                    ],
                    2: [
                        "Continue building skills in challenging conversations. Practice shared decision-making approaches.",
                        "Work on reading nonverbal communication cues. Focus on family dynamics understanding.",
                        "Develop expertise in breaking bad news. Practice managing angry or upset patients.",
                        "Strengthen interdisciplinary communication skills. Work on conflict resolution techniques."
                    ],
                    3: [
                        "Focus on advanced communication in crisis situations. Develop skills in ethical consultation.",
                        "Work on leading family meetings effectively. Practice communication with difficult personalities.",
                        "Strengthen skills in end-of-life discussions. Focus on cultural competency advancement.",
                        "Develop teaching skills for communication training. Practice media communication if relevant."
                    ],
                    4: [
                        "Consider advanced training in communication skills. Focus on developing communication curricula.",
                        "Work on research in patient communication outcomes. Develop expertise in conflict mediation.",
                        "Focus on teaching communication to medical students. Consider communication consultation services.",
                        "Develop skills in organizational communication. Work on public speaking and presentation skills."
                    ],
                    5: [
                        "Focus on developing communication research programs. Consider national leadership in communication training.",
                        "Work on innovative communication technologies. Develop expertise in communication assessment.",
                        "Consider writing or speaking on communication topics. Focus on mentoring communication faculty.",
                        "Develop advanced communication simulation programs. Lead institutional communication initiatives."
                    ]
                }
            },
            
            # Systems-Based Practice EPAs
            'systems': {
                'what_went_well': {
                    1: [
                        "Recognized importance of care coordination.",
                        "Demonstrated understanding of basic hospital systems.",
                        "Showed awareness of resource utilization.",
                        "Followed established protocols appropriately."
                    ],
                    2: [
                        "Effectively coordinated care with multiple services.",
                        "Demonstrated improving understanding of healthcare systems.",
                        "Showed good judgment in resource utilization.",
                        "Participated actively in quality improvement discussions."
                    ],
                    3: [
                        "Efficiently managed patient flow and disposition.",
                        "Demonstrated solid understanding of healthcare economics.",
                        "Effectively worked within system constraints.",
                        "Contributed meaningfully to quality improvement efforts."
                    ],
                    4: [
                        "Excellent systems thinking and process improvement.",
                        "Effectively led initiatives to improve patient care.",
                        "Demonstrated advanced understanding of healthcare policy.",
                        "Served as systems advocate for patients and families."
                    ],
                    5: [
                        "Exceptional leadership in systems improvement.",
                        "Innovatively addressed complex systems challenges.",
                        "Demonstrated expertise in healthcare transformation.",
                        "Showed mastery of population health approaches."
                    ]
                },
                'what_could_improve': {
                    1: [
                        "Study healthcare systems and care coordination basics. Learn about quality improvement methodologies.",
                        "Focus on understanding resource utilization impact. Practice working with case management services.",
                        "Develop awareness of healthcare economics. Study patient safety and quality metrics.",
                        "Learn about healthcare policy and regulations. Practice systems thinking in patient care."
                    ],
                    2: [
                        "Continue developing systems thinking skills. Practice leading quality improvement projects.",
                        "Work on understanding healthcare disparities. Focus on population health approaches.",
                        "Develop expertise in care transitions. Practice working with complex social situations.",
                        "Strengthen knowledge of healthcare financing. Work on advocacy skills for patients."
                    ],
                    3: [
                        "Focus on advanced quality improvement techniques. Develop skills in healthcare innovation.",
                        "Work on understanding policy implications. Practice leading systems change initiatives.",
                        "Develop expertise in healthcare informatics. Focus on population health management.",
                        "Strengthen skills in healthcare economics. Work on interdisciplinary collaboration."
                    ],
                    4: [
                        "Consider advanced training in healthcare administration. Focus on developing policy expertise.",
                        "Work on research in healthcare delivery. Develop skills in organizational leadership.",
                        "Focus on innovation in healthcare systems. Consider healthcare entrepreneurship opportunities.",
                        "Develop expertise in healthcare quality measurement. Work on national quality initiatives."
                    ],
                    5: [
                        "Focus on healthcare transformation leadership. Consider policy development and advocacy roles.",
                        "Work on developing innovative care models. Focus on national healthcare improvement initiatives.",
                        "Consider academic leadership in healthcare systems. Develop expertise in healthcare research.",
                        "Focus on mentoring healthcare systems leaders. Work on healthcare policy and regulation."
                    ]
                }
            }
        }
        
        # Determine EPA category based on EPA code/title
        epa_category = 'clinical'  # default
        if any(keyword in epa.title.lower() for keyword in ['procedure', 'airway', 'ultrasound', 'sedation']):
            epa_category = 'procedures'
        elif any(keyword in epa.title.lower() for keyword in ['communicate', 'document', 'palliative', 'end-of-life']):
            epa_category = 'communication'
        elif any(keyword in epa.title.lower() for keyword in ['flow', 'system', 'supervision', 'professional']):
            epa_category = 'systems'
        
        # Get feedback templates for this category
        templates = epa_feedback_templates[epa_category]
        
        # Randomly select feedback for the given entrustment level
        what_went_well = random.choice(templates['what_went_well'][entrustment_level])
        what_could_improve = random.choice(templates['what_could_improve'][entrustment_level])
        
        return what_went_well, what_could_improve

    def load_epa_competency_descriptions(self):
        """Load EPA-specific competency descriptions from CSV file"""
        descriptions = {}
        
        # Path to the CSV file (relative to project root)
        csv_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
            'EM Competencies with EPA Mapping - EM Competencies with EPA Mapping.csv'
        )
        
        try:
            with open(csv_path, 'r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                
                for row in reader:
                    code = row['Code']
                    sub_competency = row['Sub-Competency']
                    
                    # Store level descriptions for each competency
                    descriptions[code] = {
                        'sub_competency': sub_competency,
                        'levels': {
                            1: row['Level 1'],
                            2: row['Level 2'], 
                            3: row['Level 3'],
                            4: row['Level 4'],
                            5: row['Level 5']
                        }
                    }
                    
                    # Map which EPAs use this competency (1 = mapped, 0 = not mapped)
                    for epa_num in range(1, 23):  # EPA1 through EPA22
                        epa_col = f'EPA{epa_num}'
                        if epa_col in row and row[epa_col] == '1':
                            if f'EPA{epa_num}' not in descriptions:
                                descriptions[f'EPA{epa_num}'] = {}
                            descriptions[f'EPA{epa_num}'][code] = descriptions[code]
                            
            self.stdout.write(f'📋 Loaded entrustment level descriptions for {len([k for k in descriptions.keys() if k.startswith("EPA")])} EPAs')
            return descriptions
            
        except FileNotFoundError:
            self.stdout.write(self.style.WARNING(f'⚠️  CSV file not found at {csv_path}. Using generic descriptions.'))
            return {}
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error loading CSV: {e}. Using generic descriptions.'))
            return {}

    def get_epa_entrustment_description(self, epa_code, entrustment_level):
        """Get the appropriate entrustment level description for a specific EPA"""
        if not self.epa_competency_descriptions or epa_code not in self.epa_competency_descriptions:
            # Fallback to generic descriptions
            generic_descriptions = {
                1: "I had to do it (Requires constant direct supervision and myself or others' hands-on action for completion)",
                2: "I helped a lot (Requires considerable direct supervision and myself or others' guidance for completion)",
                3: "I helped a little (Requires minimal direct supervision or guidance from myself or others for completion)",
                4: "I needed to be there but did not help (Requires indirect supervision and no guidance by myself or others)",
                5: "I didn't need to be there at all (Does not require any supervision or guidance by myself or others)"
            }
            return generic_descriptions.get(entrustment_level, "Unknown level")
        
        # Get all competencies mapped to this EPA
        epa_competencies = self.epa_competency_descriptions[epa_code]
        
        # For now, use the first competency's description
        # In a more sophisticated implementation, you might want to:
        # 1. Use the most relevant competency based on assessment context
        # 2. Combine multiple competency descriptions
        # 3. Let evaluators choose which competency they're assessing
        
        first_competency_code = list(epa_competencies.keys())[0]
        competency_data = epa_competencies[first_competency_code]
        
        return competency_data['levels'].get(entrustment_level, "Unknown level")

    def generate_overall_assessment_feedback(self, selected_epas, trainee, evaluator):
        """Generate overall feedback for the entire assessment based on selected EPAs"""
        
        # Calculate average performance across all EPAs for this assessment
        avg_performance = sum(epa['entrustment_level'] for epa in selected_epas) / len(selected_epas)
        
        # Generate what went well based on overall performance
        what_went_well_options = {
            'high': [
                "Excellent clinical reasoning and decision-making throughout the shift.",
                "Demonstrated strong leadership and communication skills.",
                "Showed exceptional professionalism and patient care.",
                "Efficiently managed multiple complex cases with minimal supervision.",
                "Excellent teaching and mentoring of junior staff."
            ],
            'good': [
                "Good clinical performance with appropriate decision-making.",
                "Effective communication with patients and team members.",
                "Demonstrated solid medical knowledge and application.",
                "Worked well independently on most cases.",
                "Showed good judgment in seeking help when needed."
            ],
            'average': [
                "Demonstrated basic competency in clinical tasks.",
                "Showed willingness to learn and improve.",
                "Maintained professional behavior throughout the shift.",
                "Completed assigned tasks with appropriate supervision.",
                "Asked relevant questions when uncertain."
            ],
            'needs_improvement': [
                "Showed effort but needs continued development.",
                "Demonstrated basic understanding of clinical concepts.",
                "Maintained professional demeanor despite challenges.",
                "Recognized limitations and sought help appropriately.",
                "Showed commitment to learning and improvement."
            ]
        }
        
        # Generate what could improve based on overall performance
        what_could_improve_options = {
            'high': [
                "Continue developing expertise in complex case management.",
                "Consider taking on more teaching responsibilities.",
                "Explore opportunities for research or quality improvement.",
                "Focus on advanced procedural skills development.",
                "Continue excellent work with minor refinements."
            ],
            'good': [
                "Work on efficiency in clinical decision-making.",
                "Develop more systematic approach to patient assessment.",
                "Improve confidence in independent decision-making.",
                "Focus on advanced clinical skills development.",
                "Enhance teaching skills with junior colleagues."
            ],
            'average': [
                "Improve clinical reasoning and differential diagnosis skills.",
                "Work on efficiency and time management.",
                "Develop more confidence in patient interactions.",
                "Focus on strengthening medical knowledge base.",
                "Practice more systematic approach to patient care."
            ],
            'needs_improvement': [
                "Focus on fundamental clinical knowledge review.",
                "Work on basic patient assessment skills.",
                "Improve organization and time management.",
                "Develop better communication strategies.",
                "Seek additional mentoring and educational opportunities."
            ]
        }
        
        # Determine performance category
        if avg_performance >= 4.5:
            category = 'high'
        elif avg_performance >= 3.5:
            category = 'good'
        elif avg_performance >= 2.5:
            category = 'average'
        else:
            category = 'needs_improvement'
        
        # Select random feedback from appropriate category
        what_went_well = random.choice(what_went_well_options[category])
        what_could_improve = random.choice(what_could_improve_options[category])
        
        return {
            'what_went_well': what_went_well,
            'what_could_improve': what_could_improve
        }

    def get_epa_difficulty_modifier(self, epa_code):
        """Get difficulty modifier for specific EPAs"""
        epa_difficulty_modifiers = {
            # Clinical EPAs tend to have higher scores
            'EPA1': 0.2, 'EPA2': 0.1, 'EPA3': 0.0, 'EPA4': 0.1,
            # Procedure EPAs more variable
            'EPA10': -0.3, 'EPA11': -0.2, 'EPA12': -0.1, 'EPA13': -0.2,
            # Communication generally good
            'EPA18': 0.3, 'EPA19': 0.2,
            # Systems-based practice often lower
            'EPA17': -0.4, 'EPA20': -0.3, 'EPA21': -0.5, 'EPA22': -0.2
        }
        return epa_difficulty_modifiers.get(epa_code, 0.0)

    def select_balanced_epa(self, epa_list, assessment_num, total_assessments):
        """Select EPA with better distribution to ensure all EPAs get coverage"""
        # For the first part of assessments, use round-robin to ensure coverage
        if assessment_num < len(epa_list):
            # Round-robin selection for first pass
            return epa_list[assessment_num % len(epa_list)]
        else:
            # After ensuring each EPA gets at least one assessment, use weighted random
            # Give slightly higher weight to EPAs that map to fewer sub-competencies
            # to balance out the overall sub-competency coverage
            
            # Simple approach: 70% random, 30% round-robin for continued balance
            if random.random() < 0.7:
                return random.choice(epa_list)
            else:
                return epa_list[assessment_num % len(epa_list)]
