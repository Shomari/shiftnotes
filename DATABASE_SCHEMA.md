# ShiftNotes Database Schema

**Last Verified:** October 2025  
**Source:** Verified from production Django models

## Overview
Medical training assessment system for tracking trainee performance via EPA (Entrustable Professional Activities) evaluations.

---

## Core Tables

### 1. Users Table (`users`)
Custom user model extending Django's AbstractUser.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | UUID (PK) | Primary key | Auto-generated |
| email | EmailField | Unique institutional email | Unique, required |
| name | CharField(150) | Full name | Required |
| role | CharField(20) | User role | Choices: trainee, faculty, admin, leadership, system-admin |
| organization | UUID (FK) | Reference to Organization | Nullable for superusers |
| program | UUID (FK) | Reference to Program | Nullable |
| cohort | UUID (FK) | Reference to Cohort | Required for trainees |
| department | CharField(100) | Department/specialty | Optional |
| start_date | DateField | Training start date | Optional |
| deactivated_at | DateTimeField | Deactivation timestamp | Null = active user |
| created_at | DateTimeField | Account creation timestamp | Auto-generated |
| updated_at | DateTimeField | Last update timestamp | Auto-updated |

**Indexes:** name, role, organization, program, cohort

**Important Notes:**
- Email is used as username (USERNAME_FIELD)
- `deactivated_at` null = active, non-null = deactivated
- Role choices: trainee, faculty, admin, leadership, system-admin

---

### 2. Cohorts Table (`cohorts`)
Groups of trainees starting together.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | UUID (PK) | Primary key | Auto-generated |
| org | UUID (FK) | Reference to Organization | Required |
| program | UUID (FK) | Reference to Program | Required |
| name | CharField(255) | Cohort name (e.g., "PGY-1 2024") | Required |
| start_date | DateField | Cohort start date | Required |
| end_date | DateField | Cohort end date | Required |

**Indexes:** start_date (descending)

**Unique Constraint:** (program, name) - unique cohort names per program

---

### 3. Organizations Table (`organizations`)
Top-level organizations (hospitals, medical schools).

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | UUID (PK) | Primary key | Auto-generated |
| name | CharField(255) | Organization name | Required |
| slug | SlugField | URL-friendly identifier | Unique |
| address_line1 | CharField(255) | Address | Optional |
| created_at | DateTimeField | Creation timestamp | Auto-generated |

**Indexes:** name

---

### 4. Programs Table (`programs`)
Training programs within organizations.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | UUID (PK) | Primary key | Auto-generated |
| org | UUID (FK) | Reference to Organization | Required |
| name | CharField(255) | Program name | Required |
| abbreviation | CharField(10) | Short name (e.g., "EM") | Optional |
| specialty | CharField(100) | Medical specialty | Required |
| created_at | DateTimeField | Creation timestamp | Auto-generated |

**Indexes:** name

---

### 5. Sites Table (`sites`)
Clinical training sites.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | UUID (PK) | Primary key | Auto-generated |
| org | UUID (FK) | Reference to Organization | Required |
| program | UUID (FK) | Reference to Program | Required |
| name | CharField(255) | Site name | Required |

**Indexes:** name

---

### 6. EPAs Table (`epas`)
Entrustable Professional Activities - core competencies.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | UUID (PK) | Primary key | Auto-generated |
| program | UUID (FK) | Reference to Program | Required |
| category | UUID (FK) | Reference to EPACategory | Optional |
| code | CharField(20) | EPA code (e.g., "EPA 1") | Required |
| title | CharField(500) | EPA title | Required |
| description | TextField | Detailed description | Optional |
| is_active | BooleanField | Active status | Default: True |

**Indexes:** code, is_active

**Unique Constraint:** (program, code) - unique EPA codes per program

---

### 7. EPA Categories Table (`epa_categories`)
Categories for organizing EPAs.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | UUID (PK) | Primary key | Auto-generated |
| program | UUID (FK) | Reference to Program | Required |
| title | CharField(255) | Category title | Required |

**Indexes:** title

---

### 8. Core Competencies Table (`core_competencies`)
ACGME core competencies.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | UUID (PK) | Primary key | Auto-generated |
| program | UUID (FK) | Reference to Program | Required |
| code | CharField(10) | Competency code (e.g., "PC", "MK") | Required |
| title | CharField(255) | Competency title (e.g., "Patient Care") | Required |

**Indexes:** code

---

### 9. Sub-Competencies Table (`sub_competencies`)
ACGME sub-competencies with milestone levels.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | UUID (PK) | Primary key | Auto-generated |
| program | UUID (FK) | Reference to Program | Required |
| core_competency | UUID (FK) | Reference to CoreCompetency | Required |
| code | CharField(10) | Sub-competency code (e.g., "PC1") | Required |
| title | CharField(255) | Sub-competency title | Required |
| milestone_level_1 | TextField | Level 1 milestone description | Required |
| milestone_level_2 | TextField | Level 2 milestone description | Required |
| milestone_level_3 | TextField | Level 3 milestone description | Required |
| milestone_level_4 | TextField | Level 4 milestone description | Required |
| milestone_level_5 | TextField | Level 5 milestone description | Required |

**Indexes:** code

**Relationships:** Many-to-many with EPAs through SubCompetencyEPA

---

### 10. Sub-Competency EPA Mapping (`sub_competency_epas`)
Many-to-many relationship between sub-competencies and EPAs.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | UUID (PK) | Primary key | Auto-generated |
| sub_competency | UUID (FK) | Reference to SubCompetency | Required |
| epa | UUID (FK) | Reference to EPA | Required |

**Unique Constraint:** (sub_competency, epa)

---

### 11. Assessments Table (`assessments`)
Individual trainee assessments.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | UUID (PK) | Primary key | Auto-generated |
| trainee | UUID (FK) | Reference to User (trainee) | Required |
| evaluator | UUID (FK) | Reference to User (faculty) | Required |
| shift_date | DateField | Date of assessed shift | Required |
| location | CharField(200) | Assessment location | Optional |
| status | CharField(20) | Assessment status | Choices: draft, submitted, locked |
| private_comments | TextField | Private faculty comments | Optional |
| what_went_well | TextField | Positive feedback | Optional |
| what_could_improve | TextField | Improvement areas | Optional |
| acknowledged_by | ManyToMany | Leadership who acknowledged | Optional |
| created_at | DateTimeField | Creation timestamp | Auto-generated |
| updated_at | DateTimeField | Last update timestamp | Auto-updated |

**Indexes:** 
- (trainee, shift_date)
- (evaluator, created_at)
- (status, created_at)
- shift_date

**Related Names:**
- trainee → assessments_received
- evaluator → assessments_given
- acknowledged_by → assessments_acknowledged

---

### 12. Assessment EPAs Table (`assessment_epas`)
Individual EPA evaluations within assessments.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | UUID (PK) | Primary key | Auto-generated |
| assessment | UUID (FK) | Reference to Assessment | Required |
| epa | UUID (FK) | Reference to EPA | Required |
| entrustment_level | IntegerField | 1-5 supervision level | Required, choices 1-5 |
| created_at | DateTimeField | Creation timestamp | Auto-generated |

**Unique Constraint:** (assessment, epa) - one rating per EPA per assessment

**Indexes:** 
- (assessment, epa)
- (epa, entrustment_level)
- entrustment_level

#### Entrustment Levels:
1. "I had to do it (Requires constant direct supervision)"
2. "I helped a lot (Requires considerable direct supervision)"
3. "I helped a little (Requires minimal direct supervision)"
4. "I needed to be there but did not help (Requires indirect supervision)"
5. "I didn't need to be there at all (No supervision required)"

---

## Key Relationships

```
Organization 1:N Program 1:N User
Organization 1:N Cohort
Program 1:N Cohort
Program 1:N EPA
Program 1:N CoreCompetency
Program 1:N SubCompetency
CoreCompetency 1:N SubCompetency
SubCompetency N:M EPA (via SubCompetencyEPA)
User (trainee) 1:N Assessment
User (evaluator) 1:N Assessment
Assessment 1:N AssessmentEPA
EPA 1:N AssessmentEPA
```

---

## Important Field Notes

### Critical Field Names (Common Mistakes!)
- ✅ `AssessmentEPA.entrustment_level` (1-5) ← **THE RATING FIELD**
- ❌ NOT `milestone_level` (this doesn't exist in AssessmentEPA!)
- ✅ `CoreCompetency.title` (NOT `name`)
- ✅ `SubCompetency.title` (NOT `name`)
- ✅ `User.program` (ForeignKey, single program per user)
- ✅ `User.deactivated_at` (DateTimeField, null = active)
- ✅ `Assessment.acknowledged_by` (ManyToManyField for leadership)

### Status Choices
**Assessment.status:**
- `draft` - In progress, can be edited
- `submitted` - Completed and visible to trainee
- `locked` - Cannot be modified

**User.role:**
- `trainee` - Resident/trainee
- `faculty` - Attending physician
- `admin` - Program coordinator
- `leadership` - Program director/leadership
- `system-admin` - System administrator

---

## Database Features

- **UUID Primary Keys**: All tables use UUIDs for better scalability and security
- **Soft Deletes**: Models use `is_active` or `deactivated_at` instead of hard deletes
- **Audit Trail**: All models include created_at/updated_at timestamps
- **Unique Constraints**: Prevent duplicate data (e.g., EPA codes per program)
- **Indexes**: Optimized for common query patterns
- **Foreign Key Cascades**: Maintains referential integrity

---

## Access Patterns

### By Role:
- **Trainees**: View their own assessments and acknowledge them
- **Faculty**: Create/view assessments for trainees they supervise
- **Coordinators (Admin)**: Manage users, cohorts, sites
- **Leadership**: Manage EPAs, competencies, view analytics, acknowledge flagged assessments
- **System Admin**: Full access across all organizations

### Common Queries:
- Get assessments for a trainee: `Assessment.objects.filter(trainee=user)`
- Get assessments by evaluator: `Assessment.objects.filter(evaluator=user)`
- Get active EPAs for program: `EPA.objects.filter(program=program, is_active=True)`
- Get trainee's entrustment levels: `AssessmentEPA.objects.filter(assessment__trainee=user)`

---

## Security Considerations

- **Organization Isolation**: Users can only access data from their organization
- **Program Isolation**: Most data is program-specific
- **Role-Based Access**: Enforced at API level
- **Audit Trail**: Track who created/modified assessments
- **Soft Deletes**: Preserve data integrity for historical records

---

## Field Size Limits

| Field Type | Max Length |
|-----------|------------|
| User.email | EmailField (254 chars) |
| User.name | 150 chars |
| User.role | 20 chars |
| User.department | 100 chars |
| Program.name | 255 chars |
| Program.abbreviation | 10 chars |
| Program.specialty | 100 chars |
| EPA.code | 20 chars |
| EPA.title | 500 chars |
| CoreCompetency.code | 10 chars |
| SubCompetency.code | 10 chars |
| Assessment.location | 200 chars |

---

**Note:** This schema documentation is verified against actual Django models in production. For implementation details, see the model files in `shiftnotes-backend/*/models.py`.
