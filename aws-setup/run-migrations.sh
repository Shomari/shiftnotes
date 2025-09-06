#!/bin/bash

# Django Migration Script for Aurora
set -e

echo "🔄 Running Django migrations for Aurora..."

# Navigate to Django backend
cd "$(dirname "$0")/../shiftnotes-backend"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "✅ Activated virtual environment"
fi

# Install/upgrade requirements
echo "📦 Installing requirements..."
pip install -r requirements.txt

# Test database connection
echo "🔌 Testing database connection..."
python manage.py check --database default

# Run migrations
echo "🗄️ Running migrations..."
python manage.py migrate

# Create superuser (optional)
echo "👤 Creating superuser (optional)..."
echo "You can create a superuser now or skip this step."
read -p "Create superuser? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    python manage.py createsuperuser
fi

echo ""
echo "🎉 Django setup complete!"
echo "Your Aurora database is ready to use."
