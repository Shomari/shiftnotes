#!/bin/bash

# EPAnotes PostgreSQL Fresh Setup
# Sets up fresh PostgreSQL database with demo data

set -e

echo "🗄️  Setting up fresh PostgreSQL database"
echo "========================================"
echo ""

cd shiftnotes-backend

# Test PostgreSQL connection first
echo "🔍 Testing PostgreSQL connection..."
DB_SECRET=$(aws secretsmanager get-secret-value --secret-id epanotes/rds/postgres --query SecretString --output text)
DB_HOST=$(echo $DB_SECRET | python3 -c "import sys, json; print(json.load(sys.stdin)['host'])")
DB_NAME=$(echo $DB_SECRET | python3 -c "import sys, json; print(json.load(sys.stdin)['dbname'])")
DB_USER=$(echo $DB_SECRET | python3 -c "import sys, json; print(json.load(sys.stdin)['username'])")
DB_PASS=$(echo $DB_SECRET | python3 -c "import sys, json; print(json.load(sys.stdin)['password'])")

echo "   Database: $DB_NAME"
echo "   Host: $DB_HOST"

# Test connection
export PGPASSWORD="$DB_PASS"
if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null 2>&1; then
    echo "   ✅ PostgreSQL connection successful"
else
    echo "   ❌ Failed to connect to PostgreSQL"
    echo "   Please check the RDS instance status and security groups"
    exit 1
fi

# Set Django to production mode (uses PostgreSQL)
export DEBUG=False

# Install requirements in virtual environment
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

echo "📦 Installing dependencies..."
source venv/bin/activate
pip install -q -r requirements.txt

# Run migrations
echo ""
echo "🗄️  Running migrations on PostgreSQL..."
python manage.py migrate
echo "   ✅ PostgreSQL schema created"

# Create demo data
echo ""
echo "🎭 Creating demo data..."
python manage.py create_demo_data
echo "   ✅ Demo data created"

# Verify setup
echo ""
echo "🔍 Verifying setup..."
USER_COUNT=$(python manage.py shell -c "from users.models import User; print(User.objects.count())")
ASSESSMENT_COUNT=$(python manage.py shell -c "from assessments.models import Assessment; print(Assessment.objects.count())")

echo "   Users: $USER_COUNT"
echo "   Assessments: $ASSESSMENT_COUNT"

echo ""
echo "🎉 PostgreSQL Setup Complete!"
echo "============================="
echo "✅ Database schema created"
echo "✅ Demo data populated"
echo "✅ Ready for production use"
echo ""
echo "💡 Next: Deploy to EC2 with ./deploy-to-ec2-fixed.sh"
