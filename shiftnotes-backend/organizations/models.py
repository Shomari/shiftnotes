from django.db import models
import uuid

class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    address_line1 = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'organizations'
        ordering = ['name']
    
    def __str__(self):
        return self.name

class Program(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='programs')
    name = models.CharField(max_length=255)
    abbreviation = models.CharField(max_length=10, blank=True)
    specialty = models.CharField(max_length=100)
    acgme_id = models.CharField(max_length=20, blank=True)
    director_user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='directed_programs')
    coordinator_user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='coordinated_programs')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'programs'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.org.name})"

class Site(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='sites')
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='sites')
    name = models.CharField(max_length=255)
    
    class Meta:
        db_table = 'sites'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} - {self.program.name}"