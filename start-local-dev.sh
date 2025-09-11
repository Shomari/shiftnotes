#!/bin/bash

# Start Local Development Environment for EPAnotes
# This script starts the Django backend with SQLite for local development

echo "🚀 Starting EPAnotes Local Development Environment..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -i:$1 >/dev/null 2>&1
}

# Check if Python 3 is installed
if ! command_exists python3; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -d "shiftnotes-backend" ] || [ ! -d "shiftnotes-mobile" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Navigate to backend directory
cd shiftnotes-backend

echo "📦 Setting up Python virtual environment..."

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Created virtual environment"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
source venv/bin/activate

echo "📚 Installing/updating Python dependencies..."

# Install dependencies
pip install --upgrade pip
pip install -r requirements-local.txt

echo "🗄️ Setting up local SQLite database..."

# Run migrations to set up database
python manage.py migrate

echo "📊 Creating test data..."

# Create comprehensive test data
python manage.py create_complete_test_data

echo "🔧 Collecting static files..."

# Collect static files for admin interface
python manage.py collectstatic --noinput

# Check if port 8000 is in use
if port_in_use 8000; then
    echo "⚠️ Port 8000 is already in use. Stopping existing Django server..."
    pkill -f "python manage.py runserver"
    sleep 2
fi

echo "🌟 Starting Django development server..."
echo ""
echo "🔗 Backend API will be available at: http://localhost:8000/api"
echo "🔗 Django Admin will be available at: http://localhost:8000/admin"
echo ""
echo "👤 Demo login credentials:"
echo "   Admin: admin@johns-hopkins.com / demo"
echo "   Faculty: faculty@johns-hopkins.com / demo"
echo "   Trainee: trainee@johns-hopkins.com / demo"
echo "   Leadership: leadership@johns-hopkins.com / demo"
echo ""
echo "📱 To start the mobile app:"
echo "   cd shiftnotes-mobile"
echo "   npm start"
echo ""
echo "Press Ctrl+C to stop the server"
echo "----------------------------------------"

# Start Django development server
python manage.py runserver 127.0.0.1:8000
