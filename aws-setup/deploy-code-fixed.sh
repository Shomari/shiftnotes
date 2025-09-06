#!/bin/bash

# Fixed script to deploy Django code to EC2 instance
# Usage: ./deploy-code-fixed.sh <EC2_PUBLIC_IP>

set -e

if [ -z "$1" ]; then
    echo "❌ Usage: $0 <EC2_PUBLIC_IP>"
    echo "Example: $0 54.123.45.67"
    exit 1
fi

EC2_IP="$1"
KEY_FILE="$HOME/.ssh/shiftnotes-key.pem"
EC2_USER="ec2-user"

echo "🚀 Deploying ShiftNotes Django code to EC2..."
echo "📡 Target: $EC2_IP"

# Check if key file exists
if [ ! -f "$KEY_FILE" ]; then
    echo "❌ Key file not found: $KEY_FILE"
    exit 1
fi

# Create deployment package
echo "📦 Creating deployment package..."
cd "$(dirname "$0")/.."

# Create temporary directory for deployment
TEMP_DIR=$(mktemp -d)
echo "📁 Temporary directory: $TEMP_DIR"

# Copy Django backend code
echo "📋 Copying Django backend code..."
cp -r shiftnotes-backend "$TEMP_DIR/"

# Create deployment archive
echo "🗜️ Creating deployment archive..."
cd "$TEMP_DIR"
tar -czf shiftnotes-backend.tar.gz shiftnotes-backend/

# Upload to EC2
echo "⬆️ Uploading to EC2 instance..."
scp -i "$KEY_FILE" -o StrictHostKeyChecking=no \
    shiftnotes-backend.tar.gz \
    "$EC2_USER@$EC2_IP:/tmp/"

# Connect to EC2 and deploy
echo "🔧 Connecting to EC2 and deploying..."
ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" << 'REMOTE_SCRIPT'
set -e

echo "📦 Extracting deployment package..."
cd /tmp
tar -xzf shiftnotes-backend.tar.gz

echo "📁 Setting up application directory..."
sudo rm -rf /opt/shiftnotes/shiftnotes-backend
sudo mv shiftnotes-backend /opt/shiftnotes/
sudo chown -R shiftnotes:shiftnotes /opt/shiftnotes/

echo "🐍 Setting up Python environment as shiftnotes user..."
sudo -u shiftnotes bash << 'SHIFTNOTES_SCRIPT'
cd /opt/shiftnotes

# Create virtual environment with Python 3.9+ (EC2 has Python 3.9)
echo "🐍 Creating virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Verify Python version
echo "📋 Python version: $(python --version)"

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install dependencies
cd shiftnotes-backend
echo "📦 Installing requirements..."
pip install -r requirements.txt

# Create environment file with correct Aurora endpoint
echo "🔧 Creating environment file..."
cat > .env.production << 'ENV_FILE'
DEBUG=False
SECRET_KEY=django-secret-key-production-change-this-in-production
ALLOWED_HOSTS=*

# Database (Aurora RDS)
DB_HOST=shiftnotes-aurora-public.cluster-czz7iet4urq4.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=shiftnotes
DB_USER=shiftnotes_admin
DB_PASSWORD=

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
ENV_FILE

# Try to get database credentials from Secrets Manager
echo "🔧 Attempting to get Aurora database credentials..."
python3 << 'PYTHON_SCRIPT'
import boto3
import json
import os

try:
    session = boto3.session.Session()
    client = session.client('secretsmanager', region_name='us-east-1')
    response = client.get_secret_value(SecretId='shiftnotes/database/credentials')
    secret = json.loads(response['SecretString'])
    
    # Update .env.production with real credentials
    with open('.env.production', 'r') as f:
        content = f.read()
    
    content = content.replace('DB_PASSWORD=', f"DB_PASSWORD={secret['password']}")
    
    with open('.env.production', 'w') as f:
        f.write(content)
    
    print('✅ Updated environment file with database credentials')
except Exception as e:
    print(f'⚠️ Could not retrieve database credentials: {e}')
    print('⚠️ You may need to update .env.production manually with the database password')
PYTHON_SCRIPT

echo "🗄️ Running database migrations..."
python manage.py migrate --settings=shiftnotes.settings

echo "📊 Collecting static files..."
python manage.py collectstatic --noinput --settings=shiftnotes.settings

echo "✅ Django setup completed!"
SHIFTNOTES_SCRIPT

echo "🔧 Restarting systemd service..."
sudo systemctl daemon-reload
sudo systemctl stop shiftnotes.service 2>/dev/null || true
sudo systemctl start shiftnotes.service

echo "⏳ Waiting for service to start..."
sleep 5

# Check service status
echo "📊 Service status:"
sudo systemctl status shiftnotes.service --no-pager || true

echo "📋 Service logs (last 10 lines):"
sudo journalctl -u shiftnotes.service -n 10 --no-pager || true

REMOTE_SCRIPT

# Clean up
echo "🧹 Cleaning up temporary files..."
rm -rf "$TEMP_DIR"

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📋 Testing the deployment..."
echo "🔍 Testing API root endpoint..."
curl -s "http://$EC2_IP:8000/api/v1/" | head -20 || echo "⚠️ API test failed"

echo ""
echo "🔍 Testing health endpoint..."
curl -s "http://$EC2_IP:8000/health/" || echo "⚠️ Health check failed"

echo ""
echo "📋 Deployment Summary:"
echo "   Django API: http://$EC2_IP:8000/api/v1/"
echo "   Admin Panel: http://$EC2_IP:8000/admin/"
echo "   Health Check: http://$EC2_IP:8000/health/"
echo ""
echo "🔧 Useful Commands:"
echo "   SSH: ssh -i $KEY_FILE $EC2_USER@$EC2_IP"
echo "   Check logs: ssh -i $KEY_FILE $EC2_USER@$EC2_IP 'sudo journalctl -u shiftnotes.service -f'"
echo "   Restart service: ssh -i $KEY_FILE $EC2_USER@$EC2_IP 'sudo systemctl restart shiftnotes.service'"
echo ""



