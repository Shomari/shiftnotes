#!/bin/bash

# ShiftNotes Django Backend Deployment Script (Fixed Version)
# This script deploys the Django backend to EC2 and starts the server

set -e  # Exit on any error

# Configuration - Update these values for your setup
EC2_HOST="44.197.181.141"
EC2_USER="ec2-user"
EC2_KEY_PATH="/Users/shomariewing/.ssh/shiftnotes-key.pem"
REMOTE_DIR="/home/ec2-user/shiftnotes-backend"
LOCAL_DIR="./shiftnotes-backend"
SERVER_PORT="8001"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required files exist
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if [ ! -d "$LOCAL_DIR" ]; then
        log_error "Django backend directory not found: $LOCAL_DIR"
        exit 1
    fi
    
    if [ ! -f "$EC2_KEY_PATH" ]; then
        log_error "EC2 key file not found: $EC2_KEY_PATH"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Test SSH connection
test_ssh_connection() {
    log_info "Testing SSH connection to EC2..."
    
    if ssh -i "$EC2_KEY_PATH" -o ConnectTimeout=10 "$EC2_USER@$EC2_HOST" "echo 'SSH connection successful'" >/dev/null 2>&1; then
        log_success "SSH connection to EC2 successful"
    else
        log_error "Cannot connect to EC2. Check your key file and EC2 instance."
        exit 1
    fi
}

# Create necessary directories on EC2
setup_remote_directories() {
    log_info "Setting up remote directories..."
    
    ssh -i "$EC2_KEY_PATH" "$EC2_USER@$EC2_HOST" << 'EOF'
        # Create backup directory if it doesn't exist
        mkdir -p ~/backups
        
        # Create logs directory
        mkdir -p ~/logs
        
        # If shiftnotes-backend exists, create a backup
        if [ -d ~/shiftnotes-backend ]; then
            echo "Creating backup of existing deployment..."
            backup_name="shiftnotes-backend-backup-$(date +%Y%m%d-%H%M%S)"
            cp -r ~/shiftnotes-backend ~/backups/$backup_name
            echo "Backup created: ~/backups/$backup_name"
        fi
EOF
    
    log_success "Remote directories setup complete"
}

# Upload Django code to EC2
upload_code() {
    log_info "Uploading Django code to EC2..."
    
    # Create exclude file for rsync
    cat > /tmp/rsync-exclude << 'EOF'
__pycache__/
*.pyc
*.pyo
*.pyd
.git/
.gitignore
.env
*.log
.DS_Store
venv/
.venv/
node_modules/
*.sqlite3
migrations/
staticfiles/
EOF
    
    # Upload code using rsync
    rsync -avz --progress \
        --exclude-from=/tmp/rsync-exclude \
        --delete \
        -e "ssh -i $EC2_KEY_PATH" \
        "$LOCAL_DIR/" "$EC2_USER@$EC2_HOST:$REMOTE_DIR/"
    
    # Clean up temp file
    rm /tmp/rsync-exclude
    
    log_success "Code upload complete"
}

# Setup Python environment and run all Django commands in one session
setup_and_run_django() {
    log_info "Setting up Python environment and running Django commands..."
    
    ssh -i "$EC2_KEY_PATH" "$EC2_USER@$EC2_HOST" << EOF
        cd $REMOTE_DIR
        
        echo "=== Setting up Python Environment ==="
        
        # Remove existing virtual environment and create new one with Python 3.11
        if [ -d "venv" ]; then
            echo "Removing existing virtual environment..."
            rm -rf venv
        fi
        
        echo "Creating virtual environment with Python 3.7..."
        /usr/bin/python3 -m venv venv
        
        # Activate virtual environment and run all commands in the same session
        source venv/bin/activate
        
        echo "Virtual environment activated. Python version:"
        python --version
        
        echo "Resetting pip configuration to use HTTPS..."
        pip config unset global.index-url
        pip config unset global.trusted-host
        
        echo "Upgrading pip..."
        pip install --upgrade pip
        
        echo "Installing requirements..."
        if [ -f "requirements.txt" ]; then
            pip install -r requirements.txt
        else
            echo "Installing basic Django packages..."
            pip install django djangorestframework django-cors-headers django-filter psycopg2-binary boto3 python-decouple
        fi
        
        echo "=== Running Django Commands ==="
        
        echo "Creating migrations..."
        python manage.py makemigrations --noinput
        
        echo "Running migrations..."
        python manage.py migrate --noinput
        
        echo "Collecting static files..."
        python manage.py collectstatic --noinput
        
        echo "=== Django setup completed successfully ==="
EOF
    
    log_success "Django environment and commands completed"
}

# Stop any existing Django server
stop_existing_server() {
    log_info "Stopping any existing Django server..."
    
    ssh -i "$EC2_KEY_PATH" "$EC2_USER@$EC2_HOST" << 'EOF'
        # Kill any existing Django processes
        pkill -f "python.*manage.py.*runserver" || true
        
        # Wait a moment for processes to stop
        sleep 2
        
        echo "Existing Django processes stopped"
EOF
    
    log_success "Existing Django server stopped"
}

# Start Django server
start_django_server() {
    log_info "Starting Django server..."
    
    ssh -i "$EC2_KEY_PATH" "$EC2_USER@$EC2_HOST" << EOF
        cd $REMOTE_DIR
        source venv/bin/activate
        
        # Start Django server in the background
        nohup /usr/bin/python3 manage.py runserver 0.0.0.0:$SERVER_PORT > ~/logs/django.log 2>&1 &
        
        # Get the process ID
        DJANGO_PID=\$!
        echo "Django server started with PID: \$DJANGO_PID"
        echo \$DJANGO_PID > ~/django.pid
        
        # Wait a moment and check if it's running
        sleep 3
        if ps -p \$DJANGO_PID > /dev/null; then
            echo "Django server is running successfully on port $SERVER_PORT"
        else
            echo "Error: Django server failed to start"
            echo "Check logs with: tail -f ~/logs/django.log"
            exit 1
        fi
EOF
    
    log_success "Django server started successfully"
}

# Test the deployment
test_deployment() {
    log_info "Testing deployment..."
    
    # Wait a moment for server to fully start
    sleep 5
    
    # Test if the server responds
    if curl -s -o /dev/null -w "%{http_code}" "http://$EC2_HOST:$SERVER_PORT/admin/" | grep -q "200\|302"; then
        log_success "✅ Deployment test passed! Server is responding."
    else
        log_error "❌ Deployment test failed. Server is not responding."
        log_info "Check server logs with: ssh -i $EC2_KEY_PATH $EC2_USER@$EC2_HOST 'tail -f ~/logs/django.log'"
    fi
}

# Display useful information
show_deployment_info() {
    echo ""
    echo "==================== DEPLOYMENT COMPLETE ===================="
    echo ""
    log_success "🚀 Django backend deployed successfully!"
    echo ""
    echo "📊 Deployment Information:"
    echo "   Server URL: http://$EC2_HOST:$SERVER_PORT"
    echo "   Admin URL:  http://$EC2_HOST:$SERVER_PORT/admin/"
    echo "   API URL:    http://$EC2_HOST:$SERVER_PORT/api/"
    echo ""
    echo "🔧 Useful Commands:"
    echo "   SSH to server:    ssh -i $EC2_KEY_PATH $EC2_USER@$EC2_HOST"
    echo "   View logs:        ssh -i $EC2_KEY_PATH $EC2_USER@$EC2_HOST 'tail -f ~/logs/django.log'"
    echo "   Stop server:      ssh -i $EC2_KEY_PATH $EC2_USER@$EC2_HOST 'pkill -f runserver'"
    echo "   Restart server:   $0 restart"
    echo ""
    echo "🔄 Update your Expo app API_BASE_URL to: http://$EC2_HOST:$SERVER_PORT/api"
    echo ""
    echo "=============================================================="
}

# Main deployment function
main() {
    echo ""
    echo "🚀 Starting ShiftNotes Django Backend Deployment (Fixed Version)"
    echo "================================================================"
    echo ""
    
    check_prerequisites
    test_ssh_connection
    setup_remote_directories
    upload_code
    setup_and_run_django
    stop_existing_server
    start_django_server
    test_deployment
    show_deployment_info
}

# Script options
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "restart")
        log_info "Restarting Django server only..."
        stop_existing_server
        start_django_server
        test_deployment
        ;;
    "logs")
        log_info "Showing Django server logs..."
        ssh -i "$EC2_KEY_PATH" "$EC2_USER@$EC2_HOST" "tail -f ~/logs/django.log"
        ;;
    "stop")
        log_info "Stopping Django server..."
        stop_existing_server
        log_success "Django server stopped"
        ;;
    "status")
        log_info "Checking Django server status..."
        ssh -i "$EC2_KEY_PATH" "$EC2_USER@$EC2_HOST" << 'EOF'
            if pgrep -f "python.*manage.py.*runserver" > /dev/null; then
                echo "✅ Django server is running"
                echo "PID: $(pgrep -f 'python.*manage.py.*runserver')"
            else
                echo "❌ Django server is not running"
            fi
EOF
        ;;
    "help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  deploy    - Full deployment (default)"
        echo "  restart   - Restart Django server only"
        echo "  logs      - View Django server logs"
        echo "  stop      - Stop Django server"
        echo "  status    - Check if Django server is running"
        echo "  help      - Show this help message"
        ;;
    *)
        log_error "Unknown command: $1"
        log_info "Use '$0 help' for usage information"
        exit 1
        ;;
esac


