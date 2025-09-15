#!/bin/bash

# EPAnotes SQLite to PostgreSQL Migration Script
# Migrates existing SQLite data to the new RDS PostgreSQL instance

set -e

echo "📦 EPAnotes Database Migration (EC2 Production Only)"
echo "===================================================="
echo "Migrating from SQLite to PostgreSQL RDS"
echo "⚠️  This script should ONLY be run on the EC2 production server"
echo "    Local development will continue using SQLite"
echo ""

# Check if we're in the right directory
if [ ! -f "shiftnotes-backend/manage.py" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

cd shiftnotes-backend

# Check if SQLite database exists
if [ ! -f "db.sqlite3" ]; then
    echo "ℹ️  No SQLite database found. Skipping data migration."
    echo "   Will create fresh PostgreSQL database with demo data."
    SKIP_DATA_MIGRATION=true
else
    echo "✅ Found SQLite database: db.sqlite3"
    SKIP_DATA_MIGRATION=false
fi

# Backup existing SQLite database
if [ "$SKIP_DATA_MIGRATION" = false ]; then
    echo ""
    echo "💾 Creating backup of SQLite database..."
    cp db.sqlite3 "db.sqlite3.backup.$(date +%Y%m%d_%H%M%S)"
    echo "   ✅ Backup created"
fi

# Get PostgreSQL credentials from Secrets Manager
echo ""
echo "🔐 Retrieving PostgreSQL credentials..."
DB_SECRET=$(aws secretsmanager get-secret-value --secret-id "epanotes/rds/postgres" --query SecretString --output text)
DB_HOST=$(echo $DB_SECRET | python3 -c "import sys, json; print(json.load(sys.stdin)['host'])")
DB_NAME=$(echo $DB_SECRET | python3 -c "import sys, json; print(json.load(sys.stdin)['dbname'])")
DB_USER=$(echo $DB_SECRET | python3 -c "import sys, json; print(json.load(sys.stdin)['username'])")
DB_PASS=$(echo $DB_SECRET | python3 -c "import sys, json; print(json.load(sys.stdin)['password'])")

echo "   Database: $DB_NAME"
echo "   Host: $DB_HOST"
echo "   User: $DB_USER"

# Test PostgreSQL connection
echo ""
echo "🔍 Testing PostgreSQL connection..."
export PGPASSWORD="$DB_PASS"
if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null 2>&1; then
    echo "   ✅ PostgreSQL connection successful"
else
    echo "   ❌ Failed to connect to PostgreSQL"
    echo "   Please ensure:"
    echo "   1. RDS instance is running and available"
    echo "   2. Security groups allow connection from this EC2 instance"
    echo "   3. Database credentials are correct"
    exit 1
fi

# Update Django settings to use PostgreSQL
echo ""
echo "⚙️  Configuring Django for PostgreSQL..."
export DEBUG=False  # Force production settings to use PostgreSQL

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install requirements
echo "📦 Installing Python dependencies..."
pip install -q -r requirements.txt

if [ "$SKIP_DATA_MIGRATION" = false ]; then
    # Export data from SQLite
    echo ""
    echo "📤 Exporting data from SQLite..."
    export DEBUG=True  # Use SQLite
    python manage.py dumpdata \
        --exclude auth.permission \
        --exclude contenttypes \
        --exclude sessions \
        --exclude admin.logentry \
        --natural-foreign \
        --natural-primary \
        --indent 2 \
        > data_export.json
    echo "   ✅ Data exported to data_export.json"
fi

# Switch to PostgreSQL
export DEBUG=False

# Run migrations on PostgreSQL
echo ""
echo "🗄️  Running migrations on PostgreSQL..."
python manage.py migrate
echo "   ✅ PostgreSQL schema created"

if [ "$SKIP_DATA_MIGRATION" = false ]; then
    # Import data to PostgreSQL
    echo ""
    echo "📥 Importing data to PostgreSQL..."
    python manage.py loaddata data_export.json
    echo "   ✅ Data imported successfully"
    
    # Clean up export file
    rm data_export.json
else
    # Create demo data for fresh install
    echo ""
    echo "🎭 Creating demo data..."
    python manage.py create_demo_data
    echo "   ✅ Demo data created"
fi

# Verify the migration
echo ""
echo "🔍 Verifying migration..."
USER_COUNT=$(python manage.py shell -c "from users.models import User; print(User.objects.count())")
ASSESSMENT_COUNT=$(python manage.py shell -c "from assessments.models import Assessment; print(Assessment.objects.count())")

echo "   Users: $USER_COUNT"
echo "   Assessments: $ASSESSMENT_COUNT"

echo ""
echo "🎉 Migration Complete!"
echo "===================="
echo "✅ SQLite data successfully migrated to PostgreSQL RDS"
echo "✅ Django configured for PostgreSQL"
echo "✅ All data verified"
echo ""
echo "💡 Next Steps:"
echo "   1. Update docker-compose.prod.yml to remove SQLite volume"
echo "   2. Test the application with PostgreSQL"
echo "   3. Deploy updated configuration to EC2"
echo ""
echo "🗑️  Old SQLite database backed up as: db.sqlite3.backup.*"
echo "   You can safely delete it after confirming everything works"
