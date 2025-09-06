# ShiftNotes Database Schema

## Overview
Medical training assessment system for tracking trainee performance via EPA (Entrustable Professional Activities) evaluations.

## Core Tables

### 1. Users Table (`users`)
Custom user model extending Django's AbstractUser.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | Primary key |
| email | EmailField | Unique institutional email |
| name | CharField(150) | Full name |
| role | CharField(20) | faculty, trainee, admin, leadership, system-admin |
| is_active | BooleanField | Account status |
| cohort_id | UUID (FK) | Reference to cohort (for trainees) |
| start_date | DateField | Training start date |
| department | CharField(100) | Department/specialty |
| specialties | JSONField | List of specialties |
| created_at | DateTimeField | Account creation timestamp |
| updated_at | DateTimeField | Last update timestamp |

**Indexes**: role, is_active, cohort

### 2. Cohorts Table (`cohorts`)
Groups of trainees starting together.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | Primary key |
| name | CharField(100) | Cohort name (e.g., "2024-A") |
| year | IntegerField | Academic year |
| start_date | DateField | Cohort start date |
| is_active | BooleanField | Active status |
| created_at | DateTimeField | Creation timestamp |
| updated_at | DateTimeField | Last update timestamp |

**Indexes**: year, is_active

### 3. EPAs Table (`epas`)
Entrustable Professional Activities - core competencies.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | Primary key |
| code | CharField(20) | EPA code (e.g., "EPA-1") |
| title | CharField(300) | EPA title |
| description | TextField | Detailed description |
| category | CharField(100) | Category (e.g., "Resuscitation") |
| is_active | BooleanField | Active status |
| milestone_mappings | JSONField | ACGME milestone mappings |
| created_at | DateTimeField | Creation timestamp |
| updated_at | DateTimeField | Last update timestamp |

**Indexes**: category, is_active, code

### 4. Assessments Table (`assessments`)
Individual trainee assessments.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | Primary key |
| trainee_id | UUID (FK) | Reference to trainee user |
| evaluator_id | UUID (FK) | Reference to faculty user |
| shift_date | DateField | Date of assessed shift |
| location | CharField(200) | Assessment location |
| status | CharField(20) | draft, submitted, locked |
| private_comments | TextField | Private faculty comments |
| acknowledged_at | DateTimeField | Trainee acknowledgment timestamp |
| acknowledged_by_id | UUID (FK) | Who acknowledged |
| created_at | DateTimeField | Creation timestamp |
| updated_at | DateTimeField | Last update timestamp |

**Indexes**: (trainee, shift_date), (evaluator, created_at), (status, created_at), shift_date

**Constraints**: shift_date cannot be in future

### 5. Assessment EPAs Table (`assessment_epas`)
Individual EPA evaluations within assessments.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | Primary key |
| assessment_id | UUID (FK) | Reference to assessment |
| epa_id | UUID (FK) | Reference to EPA |
| entrustment_level | IntegerField | 1-5 supervision level |
| what_went_well | TextField | Positive feedback |
| what_could_improve | TextField | Improvement areas |
| created_at | DateTimeField | Creation timestamp |

**Unique Constraint**: (assessment, epa) - one rating per EPA per assessment

**Indexes**: (assessment, epa), (epa, entrustment_level), entrustment_level

#### Entrustment Levels:
1. "I had to do it (Requires constant direct supervision)"
2. "I helped a lot (Requires considerable direct supervision)"  
3. "I helped a little (Requires minimal direct supervision)"
4. "I needed to be there but did not help (Requires indirect supervision)"
5. "I didn't need to be there at all (No supervision required)"

### 6. Milestones Table (`milestones`)
ACGME milestones mapping to EPAs.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | Primary key |
| title | CharField(200) | Milestone title |
| category | CharField(100) | Competency category |
| level | IntegerField | Milestone level (1-5) |
| is_active | BooleanField | Active status |
| competency_data | JSONField | Additional framework data |
| created_at | DateTimeField | Creation timestamp |
| updated_at | DateTimeField | Last update timestamp |

**Indexes**: category, level, is_active

### 7. Milestone-EPA Mapping (`milestones_mapped_epas`)
Many-to-many relationship between milestones and EPAs.

| Field | Type | Description |
|-------|------|-------------|
| id | Integer (PK) | Primary key |
| milestone_id | UUID (FK) | Reference to milestone |
| epa_id | UUID (FK) | Reference to EPA |

## Relationships

```
User (trainee) 1:N Assessment N:M EPA (via AssessmentEPA)
User (evaluator) 1:N Assessment
User (trainee) N:1 Cohort
EPA N:M Milestone
Assessment 1:N AssessmentEPA
EPA 1:N AssessmentEPA
```

## Key Features

- **UUID Primary Keys**: All tables use UUIDs for better scalability
- **Soft Deletes**: Most models use `is_active` flags instead of hard deletes
- **Audit Trail**: All models include created_at/updated_at timestamps
- **JSON Fields**: Flexible data storage for specialties, milestone mappings, competency data
- **Database Constraints**: Ensures data integrity (e.g., shift dates can't be future)
- **Optimized Indexes**: Performance optimization for common queries

## Access Patterns

- **Faculty**: View/create assessments for trainees they supervise
- **Trainees**: View their own assessments and acknowledge them
- **Admins**: Full access to all data and user management
- **Leadership**: Analytics and reporting across cohorts

## Security

- **Role-based Access Control**: Enforced at application level
- **Data Protection**: Private comments only visible to faculty/admin
- **Audit Logging**: Track who acknowledged assessments and when



