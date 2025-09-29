from django.db import models
import uuid


class EPACategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    program = models.ForeignKey('organizations.Program', on_delete=models.CASCADE, related_name='epa_categories')
    title = models.CharField(max_length=255)
    
    class Meta:
        db_table = 'epa_categories'
        ordering = ['title']
        verbose_name_plural = 'EPA Categories'
    
    def __str__(self):
        return self.title

class EPA(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    program = models.ForeignKey('organizations.Program', on_delete=models.CASCADE, related_name='epas')
    category = models.ForeignKey(EPACategory, on_delete=models.CASCADE, related_name='epas', null=True, blank=True)
    code = models.CharField(max_length=20)  # e.g., "EPA-EM-01"
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'epas'
        ordering = ['code']
        unique_together = ['program', 'code']
    
    def __str__(self):
        return f"{self.code}: {self.title}"

class CoreCompetency(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    program = models.ForeignKey('organizations.Program', on_delete=models.CASCADE, related_name='core_competencies')
    code = models.CharField(max_length=10)  # e.g., "PC"
    title = models.CharField(max_length=255)  # e.g., "Patient Care"
    
    class Meta:
        db_table = 'core_competencies'
        ordering = ['code']
        verbose_name_plural = 'Core Competencies'
    
    def __str__(self):
        return f"{self.code}: {self.title}"

class SubCompetency(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    program = models.ForeignKey('organizations.Program', on_delete=models.CASCADE, related_name='sub_competencies')
    core_competency = models.ForeignKey(CoreCompetency, on_delete=models.CASCADE, related_name='sub_competencies')
    epas = models.ManyToManyField(EPA, through='SubCompetencyEPA', related_name='sub_competencies')
    code = models.CharField(max_length=10)  # e.g., "PC1"
    title = models.CharField(max_length=255)
    milestone_level_1 = models.TextField()
    milestone_level_2 = models.TextField()
    milestone_level_3 = models.TextField()
    milestone_level_4 = models.TextField()
    milestone_level_5 = models.TextField()
    
    class Meta:
        db_table = 'sub_competencies'
        ordering = ['code']
        verbose_name_plural = 'Sub Competencies'
    
    def __str__(self):
        return f"{self.code}: {self.title}"


class SubCompetencyEPA(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sub_competency = models.ForeignKey(SubCompetency, on_delete=models.CASCADE, related_name='sub_competency_epas')
    epa = models.ForeignKey(EPA, on_delete=models.CASCADE, related_name='sub_competency_epas')
    
    class Meta:
        db_table = 'sub_competency_epas'
        unique_together = ['sub_competency', 'epa']
    
    def __str__(self):
        return f"{self.sub_competency.code} - {self.epa.code}"