# EPAnotes Database Schema - Quick Reference

## Key Field Names for Analytics

⚠️ **IMPORTANT**: Assessment ratings are stored in `AssessmentEPA.entrustment_level` (NOT `milestone_level`)

### Assessment Model (`assessments` table)
- `id` (UUIDField, primary key)
- `trainee` (ForeignKey → User, related_name='assessments_received')
- `evaluator` (ForeignKey → User, related_name='assessments_given') 
- `shift_date` (DateField)
- `status` (CharField: 'draft', 'submitted', 'locked')
- `created_at` (DateTimeField)
- `updated_at` (DateTimeField)

### AssessmentEPA Model (`assessment_epas` table)
- `assessment` (ForeignKey → Assessment, related_name='assessment_epas')
- `epa` (ForeignKey → EPA)
- `entrustment_level` (IntegerField, choices 1-5) ← **THIS IS THE RATING FIELD**
- `what_went_well` (TextField)
- `what_could_improve` (TextField)

### User Model (`users` table)
- `id` (UUIDField, primary key)
- `email` (EmailField, unique)
- `role` (CharField: 'trainee', 'faculty', 'admin', 'leadership', 'system-admin')
- `organization` (ForeignKey → Organization)
- `programs` (ManyToManyField → Program)

### Program Model (`programs` table)
- `id` (UUIDField, primary key)
- `name` (CharField)
- `abbreviation` (CharField)
- `org` (ForeignKey → Organization)

## Analytics Query Patterns

```python
# Get assessments with ratings for a program
assessments = Assessment.objects.filter(
    trainee__programs=program,
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

# Get active trainees with assessments in timeframe
active_trainees = User.objects.filter(
    role='trainee',
    programs=program,
    assessments_received__created_at__gte=start_date
).distinct()
```

## Common Mistakes to Avoid

❌ `milestone_level` → ✅ `assessment_epas__entrustment_level`
❌ `range(1, 7)` → ✅ `range(1, 6)` (entrustment levels are 1-5)
❌ `trainee_assessments` → ✅ `assessments_received`
❌ Direct Assessment.milestone_level → ✅ Assessment.assessment_epas.entrustment_level
