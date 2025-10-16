# EPAnotes Database Schema - Quick Reference

**Last Verified:** October 2025 - Verified from production Django models

## Key Field Names for Analytics

⚠️ **IMPORTANT**: Assessment ratings are stored in `AssessmentEPA.entrustment_level` (NOT `milestone_level`)               

### Assessment Model (`assessments` table)
- `id` (UUIDField, primary key)
- `trainee` (ForeignKey → User, related_name='assessments_received')                                                      
- `evaluator` (ForeignKey → User, related_name='assessments_given')                                                       
- `shift_date` (DateField)
- `location` (CharField, optional)
- `status` (CharField: 'draft', 'submitted', 'locked')
- `private_comments` (TextField, optional)
- `what_went_well` (TextField, optional) ← Moved from AssessmentEPA
- `what_could_improve` (TextField, optional) ← Moved from AssessmentEPA
- `acknowledged_by` (ManyToManyField → User, related_name='assessments_acknowledged')
- `created_at` (DateTimeField)
- `updated_at` (DateTimeField)

### AssessmentEPA Model (`assessment_epas` table)
- `assessment` (ForeignKey → Assessment, related_name='assessment_epas')                                                  
- `epa` (ForeignKey → EPA)
- `entrustment_level` (IntegerField, choices 1-5) ← **THIS IS THE RATING FIELD**                                          
- `created_at` (DateTimeField)

**Note:** Feedback fields (`what_went_well`, `what_could_improve`) are on the Assessment model, not AssessmentEPA

### User Model (`users` table)
- `id` (UUIDField, primary key)
- `email` (EmailField, unique) ← USERNAME_FIELD
- `name` (CharField)
- `role` (CharField: 'trainee', 'faculty', 'admin', 'leadership', 'system-admin')                                         
- `organization` (ForeignKey → Organization, nullable for superusers)
- `program` (ForeignKey → Program, NOT ManyToManyField anymore)                                                           
- `cohort` (ForeignKey → Cohort, required for trainees)
- `department` (CharField, optional)
- `start_date` (DateField, optional)
- `deactivated_at` (DateTimeField, optional) ← **If not null, user is deactivated**                                  
- `created_at` (DateTimeField)
- `updated_at` (DateTimeField)

### Program Model (`programs` table)
- `id` (UUIDField, primary key)
- `name` (CharField)
- `abbreviation` (CharField)
- `specialty` (CharField)
- `org` (ForeignKey → Organization)
- `created_at` (DateTimeField)

### CoreCompetency Model (`core_competencies` table)
- `id` (UUIDField, primary key)
- `program` (ForeignKey → Program)
- `code` (CharField) ← e.g., "PC"
- `title` (CharField) ← e.g., "Patient Care" (NOT `name`!)

### SubCompetency Model (`sub_competencies` table)  
- `id` (UUIDField, primary key)
- `program` (ForeignKey → Program)
- `core_competency` (ForeignKey → CoreCompetency, related_name='sub_competencies')                                        
- `code` (CharField) ← e.g., "PC1"
- `title` (CharField) ← e.g., "History Taking & Physical Examination"
- `milestone_level_1` through `milestone_level_5` (TextField) ← Milestone descriptions for each level
- `epas` (ManyToManyField → EPA, through='SubCompetencyEPA')                                                     

## Analytics Query Patterns

```python
# Get assessments with ratings for a program (UPDATED for single program)                                                 
assessments = Assessment.objects.filter(
    trainee__program=program,  # Changed from trainee__programs                                                           
    created_at__gte=start_date
)

# Get average entrustment level (NOT milestone_level!)
avg_score = assessments.aggregate(
    avg_score=Avg('assessment_epas__entrustment_level')
)['avg_score']

# Get distribution by entrustment level (1-5, not 1-6!)
for level in range(1, 6):  # 1-5 only
    count = assessments.filter(
        assessment_epas__entrustment_level=level
    ).count()

# Get active trainees with assessments in timeframe (UPDATED for single program)                                          
active_trainees = User.objects.filter(
    role='trainee',
    program=program,  # Changed from programs=program
    assessments_received__created_at__gte=start_date
).distinct()

# Get competency breakdown (using correct field names)
from curriculum.models import CoreCompetency
for competency in CoreCompetency.objects.filter(program=program):                                                         
    competency_assessments = assessments.filter(
        assessment_epas__epa__sub_competencies__core_competency=competency                                                
    ).distinct()
    # Use competency.title (NOT competency.name)
```

## Common Mistakes to Avoid

❌ `milestone_level` → ✅ `assessment_epas__entrustment_level`                                                            
❌ `range(1, 7)` → ✅ `range(1, 6)` (entrustment levels are 1-5)                                                          
❌ `trainee_assessments` → ✅ `assessments_received`
❌ `competency.name` → ✅ `competency.title`
❌ `trainee__programs=program` → ✅ `trainee__program=program` (single program now)                                       
❌ `assessment_epas__epa__subcompetencies__competency` → ✅ `assessment_epas__epa__sub_competencies__core_competency`     
❌ Direct Assessment.milestone_level → ✅ Assessment.assessment_epas.entrustment_level                                    
