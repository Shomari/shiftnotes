"""
Django management command to onboard a new customer program.
Creates program with specialty-specific EPAs, competencies, and sub-competencies.

Usage: python manage.py onboard_customer
"""

import csv
import os
from pathlib import Path
from django.core.management.base import BaseCommand
from django.db import transaction
from django.conf import settings
from organizations.models import Organization, Program
from curriculum.models import CoreCompetency, SubCompetency, EPA, SubCompetencyEPA


class Command(BaseCommand):
    help = 'Onboard a new customer by creating program with specialty-specific curriculum'

    def __init__(self):
        super().__init__()
        self.project_root = Path(settings.BASE_DIR).parent
        
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🏥 EPAnotes Customer Onboarding'))
        self.stdout.write('=' * 60)
        self.stdout.write('')
        
        # Step 1: Select environment
        environment = self.select_environment()
        
        # Step 2: Collect program information
        program_data = self.collect_program_data()
        
        # Step 3: Confirm before proceeding
        if not self.confirm_data(environment, program_data):
            self.stdout.write(self.style.WARNING('❌ Onboarding cancelled by user'))
            return
        
        # Step 4: Get organization (required for program)
        organization = self.get_or_create_organization()
        
        # Step 5: Create program and curriculum
        try:
            with transaction.atomic():
                program = self.create_program(organization, program_data)
                
                if program_data['specialty'] == 'Emergency Medicine':
                    self.create_em_curriculum(program)
                else:
                    self.stdout.write(self.style.ERROR(f'❌ Specialty "{program_data["specialty"]}" not yet supported'))
                    return
                    
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error during onboarding: {str(e)}'))
            raise
        
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('✅ Onboarding Complete!'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write('')
        self.stdout.write(f'Program ID: {program.id}')
        self.stdout.write(f'Program Name: {program.name}')
        self.stdout.write('')
        self.stdout.write('💡 Next Steps:')
        self.stdout.write('  1. Create users through the Admin UI or User Management')
        self.stdout.write('  2. Create cohorts for trainees')
        self.stdout.write('  3. Begin assessments!')
        
    def select_environment(self):
        """Prompt user to select environment"""
        self.stdout.write('Select environment:')
        self.stdout.write('  (1) Local Development (SQLite/PostgreSQL)')
        self.stdout.write('  (2) Production (RDS PostgreSQL)')
        self.stdout.write('')
        
        while True:
            choice = input('Enter choice [1 or 2]: ').strip()
            if choice == '1':
                env = 'local'
                self.stdout.write(self.style.WARNING('⚠️  Environment: Local Development'))
                break
            elif choice == '2':
                env = 'production'
                self.stdout.write(self.style.WARNING('🚨 Environment: PRODUCTION'))
                self.stdout.write(self.style.WARNING('    Data will be created in production database!'))
                confirm = input('Are you sure? (yes/no): ').strip().lower()
                if confirm == 'yes':
                    break
                else:
                    self.stdout.write('Please select again.')
            else:
                self.stdout.write(self.style.ERROR('Invalid choice. Please enter 1 or 2.'))
        
        self.stdout.write('')
        return env
    
    def collect_program_data(self):
        """Collect program information from user"""
        self.stdout.write(self.style.SUCCESS('📋 Program Information'))
        self.stdout.write('-' * 60)
        
        # Program name
        while True:
            name = input('Program Name (e.g., Stanford Emergency Medicine Residency): ').strip()
            if name:
                break
            self.stdout.write(self.style.ERROR('Program name is required.'))
        
        # Abbreviation
        while True:
            abbreviation = input('Program Abbreviation (e.g., EM): ').strip().upper()
            if abbreviation:
                break
            self.stdout.write(self.style.ERROR('Program abbreviation is required.'))
        
        # Specialty
        self.stdout.write('')
        self.stdout.write('Select Specialty:')
        self.stdout.write('  (1) Emergency Medicine')
        self.stdout.write('  (2) Other (not yet supported)')
        self.stdout.write('')
        
        while True:
            choice = input('Enter choice [1 or 2]: ').strip()
            if choice == '1':
                specialty = 'Emergency Medicine'
                break
            elif choice == '2':
                self.stdout.write(self.style.ERROR('Only Emergency Medicine is currently supported.'))
                self.stdout.write('Please select option 1 or exit.')
            else:
                self.stdout.write(self.style.ERROR('Invalid choice. Please enter 1 or 2.'))
        
        self.stdout.write('')
        return {
            'name': name,
            'abbreviation': abbreviation,
            'specialty': specialty
        }
    
    def confirm_data(self, environment, program_data):
        """Show confirmation and get user approval"""
        self.stdout.write(self.style.SUCCESS('📝 Review Your Information'))
        self.stdout.write('=' * 60)
        self.stdout.write(f'Environment:         {environment.upper()}')
        self.stdout.write(f'Program Name:        {program_data["name"]}')
        self.stdout.write(f'Abbreviation:        {program_data["abbreviation"]}')
        self.stdout.write(f'Specialty:           {program_data["specialty"]}')
        self.stdout.write('=' * 60)
        self.stdout.write('')
        
        confirm = input('Create this program? (yes/no): ').strip().lower()
        return confirm == 'yes'
    
    def get_or_create_organization(self):
        """Get the first organization or create a default one"""
        org = Organization.objects.first()
        if not org:
            org = Organization.objects.create(
                name="Default Organization",
                slug="default-org",
                address_line1=""
            )
            self.stdout.write(f'🏥 Created default organization: {org.name}')
        else:
            self.stdout.write(f'🏥 Using organization: {org.name}')
        return org
    
    def create_program(self, organization, program_data):
        """Create the program"""
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('🚀 Creating Program...'))
        
        program = Program.objects.create(
            org=organization,
            name=program_data['name'],
            abbreviation=program_data['abbreviation'],
            specialty=program_data['specialty']
        )
        
        self.stdout.write(f'✅ Created program: {program.name} ({program.abbreviation})')
        return program
    
    def create_em_curriculum(self, program):
        """Create Emergency Medicine curriculum from CSV files"""
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('📚 Creating Emergency Medicine Curriculum...'))
        
        # Parse CSV files
        competencies_file = self.project_root / 'EM Competencies with EPA Mapping - EM Competencies with EPA Mapping.csv'
        epas_file = self.project_root / 'EM EPAs with Mapping - EM EPAs with Mapping.csv'
        
        if not competencies_file.exists():
            raise FileNotFoundError(f'Competencies CSV not found: {competencies_file}')
        if not epas_file.exists():
            raise FileNotFoundError(f'EPAs CSV not found: {epas_file}')
        
        # Parse competencies and sub-competencies
        subcomp_data = self.parse_competencies_csv(competencies_file)
        
        # Parse EPAs
        epa_data = self.parse_epas_csv(epas_file)
        
        # Create core competencies
        core_competencies = self.create_core_competencies(program)
        
        # Create sub-competencies
        sub_competencies = self.create_sub_competencies(program, core_competencies, subcomp_data)
        
        # Create EPAs
        epas = self.create_epas(program, epa_data)
        
        # Map EPAs to sub-competencies
        self.create_epa_mappings(epas, sub_competencies, epa_data, subcomp_data)
        
    def parse_competencies_csv(self, filepath):
        """Parse the EM Competencies CSV file"""
        self.stdout.write('📖 Parsing competencies CSV...')
        
        subcomp_data = []
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                subcomp_data.append({
                    'code': row['Code'],
                    'title': row['Sub-Competency'],
                    'level_1': row['Level 1'],
                    'level_2': row['Level 2'],
                    'level_3': row['Level 3'],
                    'level_4': row['Level 4'],
                    'level_5': row['Level 5'],
                    'epa_mappings': {f'EPA{i}': row[f'EPA{i}'] for i in range(1, 23) if f'EPA{i}' in row}
                })
        
        self.stdout.write(f'  ✓ Parsed {len(subcomp_data)} sub-competencies')
        return subcomp_data
    
    def parse_epas_csv(self, filepath):
        """Parse the EM EPAs CSV file"""
        self.stdout.write('📖 Parsing EPAs CSV...')
        
        epa_data = []
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                epa_data.append({
                    'code': row['EPA Code'],
                    'title': row['Title'],
                    'subcomp_mappings': {key: row[key] for key in row.keys() if key not in ['EPA Code', 'Title']}
                })
        
        self.stdout.write(f'  ✓ Parsed {len(epa_data)} EPAs')
        return epa_data
    
    def create_core_competencies(self, program):
        """Create the 6 ACGME core competencies"""
        self.stdout.write('🎯 Creating core competencies...')
        
        competencies_data = [
            {"code": "PC", "title": "Patient Care"},
            {"code": "MK", "title": "Medical Knowledge"},
            {"code": "SBP", "title": "Systems-Based Practice"},
            {"code": "PBLI", "title": "Practice-Based Learning and Improvement"},
            {"code": "P", "title": "Professionalism"},
            {"code": "ICS", "title": "Interpersonal and Communication Skills"},
        ]
        
        competencies = {}
        for comp_data in competencies_data:
            competency = CoreCompetency.objects.create(
                program=program,
                code=comp_data['code'],
                title=comp_data['title']
            )
            competencies[comp_data['code']] = competency
            self.stdout.write(f'  ✓ {comp_data["code"]}: {comp_data["title"]}')
        
        return competencies
    
    def create_sub_competencies(self, program, core_competencies, subcomp_data):
        """Create sub-competencies from CSV data"""
        self.stdout.write('📋 Creating sub-competencies...')
        
        sub_competencies = {}
        for data in subcomp_data:
            # Extract core competency code from sub-competency code
            # e.g., "PC1" -> "PC", "PBLI1" -> "PBLI"
            core_code = ''.join([c for c in data['code'] if not c.isdigit()])
            
            if core_code not in core_competencies:
                self.stdout.write(self.style.WARNING(f'  ⚠️  Unknown core competency: {core_code} for {data["code"]}'))
                continue
            
            subcomp = SubCompetency.objects.create(
                program=program,
                core_competency=core_competencies[core_code],
                code=data['code'],
                title=data['title'],
                milestone_level_1=data['level_1'],
                milestone_level_2=data['level_2'],
                milestone_level_3=data['level_3'],
                milestone_level_4=data['level_4'],
                milestone_level_5=data['level_5']
            )
            sub_competencies[data['code']] = subcomp
            self.stdout.write(f'  ✓ {data["code"]}: {data["title"][:60]}...' if len(data["title"]) > 60 else f'  ✓ {data["code"]}: {data["title"]}')
        
        return sub_competencies
    
    def create_epas(self, program, epa_data):
        """Create EPAs from CSV data"""
        self.stdout.write('⚡ Creating EPAs...')
        
        epas = {}
        for data in epa_data:
            # Format code to match standard (EPA1 -> EPA 1)
            code_num = data['code'].replace('EPA', '')
            formatted_code = f'EPA {code_num}'
            
            epa = EPA.objects.create(
                program=program,
                category=None,  # Not using categories for now
                code=formatted_code,
                title=data['title'],
                description='',
                is_active=True
            )
            epas[data['code']] = epa
            self.stdout.write(f'  ✓ {formatted_code}: {data["title"][:60]}...' if len(data["title"]) > 60 else f'  ✓ {formatted_code}: {data["title"]}')
        
        return epas
    
    def create_epa_mappings(self, epas, sub_competencies, epa_data, subcomp_data):
        """Create EPA to Sub-Competency mappings based on CSV matrix"""
        self.stdout.write('🔗 Creating EPA-SubCompetency mappings...')
        
        mapping_count = 0
        
        # For each EPA, check which sub-competencies it maps to
        for epa_dict in epa_data:
            epa_code = epa_dict['code']  # e.g., "EPA1"
            epa_obj = epas.get(epa_code)
            
            if not epa_obj:
                continue
            
            # Check each sub-competency column in the EPA row
            for subcomp_code, value in epa_dict['subcomp_mappings'].items():
                if value == '1':  # Mapping exists
                    subcomp_obj = sub_competencies.get(subcomp_code)
                    
                    if subcomp_obj:
                        SubCompetencyEPA.objects.create(
                            sub_competency=subcomp_obj,
                            epa=epa_obj
                        )
                        mapping_count += 1
        
        self.stdout.write(f'  ✓ Created {mapping_count} EPA-SubCompetency mappings')
        
    def get_or_create_organization(self):
        """Get the first organization or prompt to create one"""
        org = Organization.objects.first()
        
        if not org:
            self.stdout.write('')
            self.stdout.write(self.style.WARNING('⚠️  No organization found in database.'))
            org_name = input('Enter organization name: ').strip()
            if not org_name:
                org_name = "Default Organization"
            
            org_slug = org_name.lower().replace(' ', '-')
            org = Organization.objects.create(
                name=org_name,
                slug=org_slug,
                address_line1=""
            )
            self.stdout.write(f'✅ Created organization: {org.name}')
        else:
            self.stdout.write(f'🏥 Using organization: {org.name}')
        
        return org
    
    def create_program(self, organization, program_data):
        """Create the program"""
        program = Program.objects.create(
            org=organization,
            name=program_data['name'],
            abbreviation=program_data['abbreviation'],
            specialty=program_data['specialty']
        )
        
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'✅ Created program: {program.name}'))
        return program

