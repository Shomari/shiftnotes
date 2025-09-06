from django.db import models
from django.contrib.auth import get_user_model
from curriculum.models import EPA
import uuid

User = get_user_model()

class Assessment(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('locked', 'Locked'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trainee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assessments_received')
    evaluator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assessments_given')
    shift_date = models.DateField()
    location = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    private_comments = models.TextField(blank=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    acknowledged_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assessments_acknowledged')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'assessments'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['trainee', 'shift_date']),
            models.Index(fields=['evaluator', 'created_at']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['shift_date']),
        ]

    def __str__(self):
        return f"Assessment {self.id} - {self.trainee.name} by {self.evaluator.name}"

class AssessmentEPA(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name='assessment_epas')
    epa = models.ForeignKey(EPA, on_delete=models.CASCADE)
    entrustment_level = models.IntegerField(choices=[
        (1, 'I had to do it (Requires constant direct supervision)'),
        (2, 'I helped a lot (Requires considerable direct supervision)'),
        (3, 'I helped a little (Requires minimal direct supervision)'),
        (4, 'I needed to be there but did not help (Requires indirect supervision)'),
        (5, 'I didn\'t need to be there at all (No supervision required)'),
    ])
    what_went_well = models.TextField()
    what_could_improve = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'assessment_epas'
        unique_together = [['assessment', 'epa']]
        indexes = [
            models.Index(fields=['assessment', 'epa']),
            models.Index(fields=['epa', 'entrustment_level']),
            models.Index(fields=['entrustment_level']),
        ]

    def __str__(self):
        return f"AssessmentEPA {self.id} - {self.epa.code} (Level {self.entrustment_level})"
