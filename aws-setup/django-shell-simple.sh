#!/bin/bash

# Simple Django Shell Connection Script
# Connects to EC2 and opens interactive Django shell

set -e

EC2_HOST="44.197.181.141"

echo "🐍 Connecting to Django Shell on EC2..."
echo ""

ssh -i ~/.ssh/shiftnotes-key.pem ec2-user@$EC2_HOST -t '
    echo "🚀 Connected to EC2"
    
    sudo -u shiftnotes bash -c "
        cd /opt/shiftnotes/shiftnotes-backend
        source ../venv/bin/activate
        
        echo \"🔧 Starting Django shell...\"
        echo \"\"
        echo \"💡 Quick start commands:\"
        echo \"   from accounts.models import User\"
        echo \"   from assessments.models import Assessment, EPA\"
        echo \"   User.objects.count()\"
        echo \"\"
        
        python manage.py shell
    "
'



