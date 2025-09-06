#!/bin/bash

# Django Shell Connection Script for ShiftNotes EC2
# Quick access to Django ORM and database queries

set -e

EC2_HOST="44.197.181.141"
KEY_PATH="~/.ssh/shiftnotes-key.pem"

echo "🐍 Connecting to ShiftNotes Django Shell on EC2..."
echo "📡 Host: $EC2_HOST"
echo ""

# Check if key file exists
if [ ! -f ~/.ssh/shiftnotes-key.pem ]; then
    echo "❌ SSH key not found at ~/.ssh/shiftnotes-key.pem"
    echo "Please ensure you have the EC2 key pair file"
    exit 1
fi

echo "🔗 Establishing SSH connection..."
echo "💡 Tip: Once in Django shell, try these commands:"
echo "   from accounts.models import User"
echo "   from assessments.models import Assessment, EPA, Cohort"
echo "   User.objects.all()"
echo "   Assessment.objects.count()"
echo ""
echo "📋 Starting Django shell..."

# Connect to EC2 and start Django shell
ssh -i ~/.ssh/shiftnotes-key.pem ec2-user@$EC2_HOST -t '
    echo "🚀 Connected to EC2 instance"
    echo "🔧 Activating Django environment..."
    
    sudo -u shiftnotes bash -c "
        cd /opt/shiftnotes/shiftnotes-backend
        source ../venv/bin/activate
        
        echo \"\"
        echo \"🐍 Django Shell Ready!\"
        echo \"📊 Database: Aurora PostgreSQL\"
        echo \"🏥 Project: ShiftNotes Medical Training Assessment\"
        echo \"\"
        echo \"Quick queries to try:\"
        echo \"  User.objects.count()\"
        echo \"  User.objects.filter(role=\\\"trainee\\\")\"
        echo \"  Assessment.objects.order_by(\\\"-shift_date\\\")[:5]\"
        echo \"  EPA.objects.all()\"
        echo \"\"
        echo \"Exit with: exit() or Ctrl+D\"
        echo \"\"
        
        # Create a startup script for Django shell
        cat > /tmp/django_startup.py << 'STARTUP_EOF'
from accounts.models import User
from assessments.models import Assessment, EPA, Cohort, AssessmentEPA, Milestone
from django.db import models
from django.utils import timezone

print(\"📊 Database Stats:\")
print(f\"   Users: {User.objects.count()}\")
print(f\"   Assessments: {Assessment.objects.count()}\")
print(f\"   EPAs: {EPA.objects.count()}\")
print(f\"   Cohorts: {Cohort.objects.count()}\")
print()
print(\"🔍 Models imported and ready to use!\")
print(\"Type your queries below...\")
print()

def show_stats():
    print(f\"Users: {User.objects.count()}\")
    print(f\"Assessments: {Assessment.objects.count()}\")
    print(f\"EPAs: {EPA.objects.count()}\")
    print(f\"Cohorts: {Cohort.objects.count()}\")

def recent_assessments():
    return Assessment.objects.select_related('trainee', 'evaluator').order_by('-shift_date')[:5]

print(\"Available functions: show_stats(), recent_assessments()\")
print()
STARTUP_EOF

        # Start Django shell with startup script
        PYTHONSTARTUP=/tmp/django_startup.py python manage.py shell
    "
'
