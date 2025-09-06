#!/usr/bin/env python3
"""
Quick Database Queries for ShiftNotes
Run this script inside Django shell for common database operations
"""

# Import models (run this first in Django shell)
from accounts.models import User
from assessments.models import Assessment, EPA, Cohort, AssessmentEPA, Milestone
from django.db import models
from django.utils import timezone

def show_stats():
    """Display basic database statistics"""
    print("📊 ShiftNotes Database Statistics")
    print("=" * 40)
    print(f"👥 Total Users: {User.objects.count()}")
    print(f"   - Trainees: {User.objects.filter(role='trainee').count()}")
    print(f"   - Faculty: {User.objects.filter(role='faculty').count()}")
    print(f"   - Admins: {User.objects.filter(role='admin').count()}")
    print()
    print(f"📋 Total Assessments: {Assessment.objects.count()}")
    print(f"📝 Total EPAs: {EPA.objects.count()}")
    print(f"🎓 Total Cohorts: {Cohort.objects.count()}")
    print(f"🏆 Total Milestones: {Milestone.objects.count()}")
    print()

def show_recent_assessments(limit=5):
    """Show recent assessments"""
    print(f"📋 Last {limit} Assessments")
    print("=" * 50)
    assessments = Assessment.objects.select_related('trainee', 'evaluator').order_by('-shift_date')[:limit]
    
    for assessment in assessments:
        print(f"🗓️  {assessment.shift_date} | {assessment.trainee.name} → {assessment.evaluator.name}")
        print(f"    Status: {assessment.status} | EPAs: {assessment.epa_count}")
    print()

def show_users_by_role():
    """Show users grouped by role"""
    print("👥 Users by Role")
    print("=" * 30)
    
    roles = User.objects.values('role').annotate(count=models.Count('role')).order_by('role')
    for role in roles:
        print(f"   {role['role'].title()}: {role['count']}")
    print()

def show_epa_stats():
    """Show EPA statistics"""
    print("📝 EPA Statistics")
    print("=" * 25)
    
    epas = EPA.objects.annotate(
        assessment_count=models.Count('assessment_epas')
    ).order_by('-assessment_count')
    
    for epa in epas[:10]:  # Top 10 most assessed EPAs
        print(f"   {epa.code}: {epa.assessment_count} assessments")
    print()

def show_active_trainees():
    """Show active trainees with their cohorts"""
    print("🎓 Active Trainees")
    print("=" * 25)
    
    trainees = User.objects.filter(role='trainee', is_active=True).select_related('cohort')
    for trainee in trainees:
        cohort_name = trainee.cohort.name if trainee.cohort else "No Cohort"
        print(f"   {trainee.name} ({cohort_name})")
    print()

def run_all_reports():
    """Run all standard reports"""
    show_stats()
    show_users_by_role()
    show_recent_assessments()
    show_epa_stats()
    show_active_trainees()

# Quick commands for copy-paste
print("""
🔍 Quick Commands (copy and paste these):

# Basic stats
show_stats()

# Recent activity  
show_recent_assessments(10)

# User breakdown
show_users_by_role()

# EPA usage
show_epa_stats()

# Active trainees
show_active_trainees()

# All reports
run_all_reports()

# Custom queries
User.objects.filter(role='trainee', is_active=True)
Assessment.objects.filter(shift_date__gte='2024-01-01')
EPA.objects.filter(category__icontains='resuscitation')

""")



