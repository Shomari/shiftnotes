#!/bin/bash

# EC2 User Data Script for ShiftNotes Django Backend
# This script runs when the instance first starts

# Log everything
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "🚀 Starting ShiftNotes EC2 setup..."

# Update system
echo "📦 Updating system packages..."
dnf update -y

# Install required packages
echo "📦 Installing Python, Git, and other dependencies..."
dnf install -y python3 python3-pip git nginx
dnf install -y postgresql15

# Install development tools for psycopg2
dnf groupinstall -y "Development Tools"
dnf install -y postgresql15-devel python3-devel

# Create application user
echo "👤 Creating shiftnotes user..."
useradd -m -s /bin/bash shiftnotes
usermod -aG wheel shiftnotes

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /opt/shiftnotes
chown shiftnotes:shiftnotes /opt/shiftnotes

# Install Python packages globally for now
echo "🐍 Installing Python packages..."
pip3 install virtualenv

# Set up basic nginx configuration
echo "🌐 Setting up basic Nginx configuration..."
cat > /etc/nginx/conf.d/shiftnotes.conf << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /opt/shiftnotes/staticfiles/;
    }
}
EOF

# Enable and start nginx
systemctl enable nginx
systemctl start nginx

# Create a deployment script for the application
cat > /opt/shiftnotes/deploy.sh << 'EOF'
#!/bin/bash

# Deployment script for ShiftNotes Django backend
# Run this script to deploy/update the application

set -e

APP_DIR="/opt/shiftnotes"
REPO_URL="https://github.com/your-username/shiftnotes.git"  # Update this
VENV_DIR="$APP_DIR/venv"
PROJECT_DIR="$APP_DIR/shiftnotes-backend"

echo "🚀 Deploying ShiftNotes Django backend..."

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo "🐍 Creating Python virtual environment..."
    python3 -m venv $VENV_DIR
fi

# Activate virtual environment
source $VENV_DIR/bin/activate

# Update pip
pip install --upgrade pip

# Create project directory if needed
mkdir -p $PROJECT_DIR

echo "✅ Virtual environment ready"
echo "📁 Project directory: $PROJECT_DIR"
echo ""
echo "📋 Next steps:"
echo "   1. Upload your Django code to $PROJECT_DIR"
echo "   2. Install requirements: pip install -r requirements.txt"
echo "   3. Set up environment variables"
echo "   4. Run migrations: python manage.py migrate"
echo "   5. Start server: python manage.py runserver 0.0.0.0:8000"
EOF

chmod +x /opt/shiftnotes/deploy.sh
chown shiftnotes:shiftnotes /opt/shiftnotes/deploy.sh

# Create environment file template
cat > /opt/shiftnotes/.env.production << 'EOF'
# ShiftNotes Production Environment Variables
DEBUG=False
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=*

# Database (Aurora RDS)
DB_HOST=shiftnotes-aurora-public.cluster-czz7iet4urq4.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=shiftnotes
DB_USER=shiftnotes_admin
DB_PASSWORD=your-password-here

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://your-frontend-domain.com
EOF

chown shiftnotes:shiftnotes /opt/shiftnotes/.env.production

# Create systemd service file for Django
cat > /etc/systemd/system/shiftnotes.service << 'EOF'
[Unit]
Description=ShiftNotes Django Backend
After=network.target

[Service]
Type=simple
User=shiftnotes
Group=shiftnotes
WorkingDirectory=/opt/shiftnotes/shiftnotes-backend
Environment=PATH=/opt/shiftnotes/venv/bin
ExecStart=/opt/shiftnotes/venv/bin/python manage.py runserver 0.0.0.0:8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Set proper permissions
chown -R shiftnotes:shiftnotes /opt/shiftnotes

echo "✅ EC2 setup completed!"
echo "📁 Application directory: /opt/shiftnotes"
echo "🔧 Run /opt/shiftnotes/deploy.sh to continue setup"
echo "📋 Check logs: tail -f /var/log/user-data.log"



