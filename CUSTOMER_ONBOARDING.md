# Customer Onboarding Guide

## Overview

The `onboard_customer` management command creates a new program with complete specialty-specific curriculum (EPAs, competencies, sub-competencies) for new customers.

## Prerequisites

1. **CSV Files Must Be Present** in the project root:
   - `EM Competencies with EPA Mapping - EM Competencies with EPA Mapping.csv`
   - `EM EPAs with Mapping - EM EPAs with Mapping.csv`

2. **Database Access:**
   - Local: Docker containers running
   - Production: AWS credentials configured for RDS access

## Usage

### Local Development

```bash
cd shiftnotes-backend
docker-compose exec web python manage.py onboard_customer
```

### Production (on EC2)

```bash
ssh -i ~/.ssh/shiftnotes-key.pem ubuntu@api.epanotes.com
cd shiftnotes-backend
docker-compose exec web python manage.py onboard_customer
```

## Interactive Prompts

The script will ask you:

1. **Environment Selection**
   - Option 1: Local Development
   - Option 2: Production (requires confirmation)

2. **Program Name**
   - Example: "Stanford Emergency Medicine Residency"

3. **Program Abbreviation**
   - Example: "EM"

4. **Specialty Selection**
   - Option 1: Emergency Medicine (fully supported)
   - Option 2: Other (not yet supported)

5. **Confirmation**
   - Reviews all entered data
   - Requires "yes" to proceed

## What Gets Created

For an Emergency Medicine program:

| Item | Count | Details |
|------|-------|---------|
| Program | 1 | The main program entity |
| Core Competencies | 6 | PC, MK, SBP, PBLI, P, ICS |
| Sub-Competencies | 23 | PC1-PC8, MK1-MK2, SBP1-SBP4, PBLI1-PBLI2, P1-P3, ICS1-ICS3 |
| EPAs | 22 | EPA 1 through EPA 22 |
| EPA Mappings | ~147 | Links between EPAs and sub-competencies |

## Example Session

```
🏥 EPAnotes Customer Onboarding
============================================================

Select environment:
  (1) Local Development (SQLite/PostgreSQL)
  (2) Production (RDS PostgreSQL)

Enter choice [1 or 2]: 2
🚨 Environment: PRODUCTION
    Data will be created in production database!
Are you sure? (yes/no): yes

📋 Program Information
------------------------------------------------------------
Program Name (e.g., Stanford Emergency Medicine Residency): Johns Hopkins EM Residency
Program Abbreviation (e.g., EM): EM

Select Specialty:
  (1) Emergency Medicine
  (2) Other (not yet supported)

Enter choice [1 or 2]: 1

📝 Review Your Information
============================================================
Environment:         PRODUCTION
Program Name:        Johns Hopkins EM Residency
Abbreviation:        EM
Specialty:           Emergency Medicine
============================================================

Create this program? (yes/no): yes

🏥 Using organization: Johns Hopkins University

🚀 Creating Program...
✅ Created program: Johns Hopkins EM Residency (EM)

📚 Creating Emergency Medicine Curriculum...
📖 Parsing competencies CSV...
  ✓ Parsed 23 sub-competencies
📖 Parsing EPAs CSV...
  ✓ Parsed 22 EPAs
🎯 Creating core competencies...
  ✓ PC: Patient Care
  ✓ MK: Medical Knowledge
  ✓ SBP: Systems-Based Practice
  ✓ PBLI: Practice-Based Learning and Improvement
  ✓ P: Professionalism
  ✓ ICS: Interpersonal and Communication Skills
📋 Creating sub-competencies...
  ✓ PC1: Patient Care 1: Emergency Stabilization
  ✓ PC2: Patient Care 2: Performance of a Focused History and...
  [... 21 more sub-competencies ...]
⚡ Creating EPAs...
  ✓ EPA 1: Initiate treatment for a patient requiring emerge...
  ✓ EPA 2: Lead the resuscitation of a critically ill or inju...
  [... 20 more EPAs ...]
🔗 Creating EPA-SubCompetency mappings...
  ✓ Created 147 EPA-SubCompetency mappings

============================================================
✅ Onboarding Complete!
============================================================

Program ID: abc123-def456-...
Program Name: Johns Hopkins EM Residency

💡 Next Steps:
  1. Create users through the Admin UI or User Management
  2. Create cohorts for trainees
  3. Begin assessments!
```

## Features

- ✅ **Transaction Safety** - All-or-nothing database operations
- ✅ **CSV-Driven** - Uses official ACGME competency mappings
- ✅ **Validated Input** - Ensures required fields are provided
- ✅ **Environment Aware** - Supports both local and production
- ✅ **Progress Indicators** - Shows what's being created in real-time
- ✅ **Error Handling** - Rolls back on failure with clear error messages

## Troubleshooting

### CSV Files Not Found
```
Error: Competencies CSV not found: /path/to/file
```
**Solution:** Ensure CSV files are in the project root directory (above shiftnotes-backend)

### Program Already Exists
```
Error: Duplicate entry for key 'program_code'
```
**Solution:** Program codes must be unique per organization. Choose a different abbreviation.

### Database Connection Failed
**Local:** Ensure Docker containers are running: `docker-compose up -d`
**Production:** Verify AWS credentials and RDS access

## Next Steps After Onboarding

1. **Create Users** - Use Admin UI or User Management to add:
   - Admin/Coordinator users
   - Leadership users
   - Faculty users
   - Trainee users

2. **Create Cohorts** - Set up cohorts (e.g., "PGY-1 2024", "PGY-2 2023")

3. **Assign Trainees** - Link trainees to their cohorts

4. **Begin Assessments** - Faculty can now create assessments using the EPAs

## Adding New Specialties

To support additional specialties:

1. Create CSV files following the EM format:
   - `[Specialty] Competencies with EPA Mapping.csv`
   - `[Specialty] EPAs with Mapping.csv`

2. Update `onboard_customer.py` to handle the new specialty

3. Add specialty option to the interactive menu

---

**Script Location:** `shiftnotes-backend/users/management/commands/onboard_customer.py`

