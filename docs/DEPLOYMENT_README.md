# ShiftNotes Django Deployment Guide

## Quick Setup

### 1. Update Configuration

Edit `deploy-config.sh` and update:
```bash
export EC2_KEY_PATH="~/.ssh/your-actual-key.pem"  # Your SSH key path
```

### 2. Make Script Executable

```bash
chmod +x deploy-to-ec2.sh
```

### 3. Deploy

```bash
./deploy-to-ec2.sh
```

## Available Commands

### Full Deployment
```bash
./deploy-to-ec2.sh deploy    # Complete deployment (default)
```

### Server Management
```bash
./deploy-to-ec2.sh restart   # Restart Django server only
./deploy-to-ec2.sh stop      # Stop Django server
./deploy-to-ec2.sh status    # Check if server is running
```

### Debugging
```bash
./deploy-to-ec2.sh logs      # View live Django logs
```

### Help
```bash
./deploy-to-ec2.sh help      # Show all available commands
```

## What the Script Does

1. **✅ Checks Prerequisites** - Verifies files and SSH connection
2. **📁 Sets Up Directories** - Creates backup and log directories
3. **⬆️ Uploads Code** - Syncs your local Django code to EC2
4. **🐍 Python Setup** - Creates virtual environment and installs dependencies
5. **⚙️ Django Commands** - Runs migrations and collects static files
6. **🔄 Server Management** - Stops old server and starts new one
7. **🧪 Testing** - Verifies the deployment works

## After Deployment

### Update Your Expo App

Change your API URL in `shiftnotes-mobile/lib/api.ts`:

```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://44.197.181.141:8001/api'  // EC2 server
  : 'http://44.197.181.141:8001/api';
```

### Access Your Application

- **API**: http://44.197.181.141:8001/api/
- **Admin**: http://44.197.181.141:8001/admin/
- **Login Endpoint**: http://44.197.181.141:8001/api/users/login/

## Troubleshooting

### Server Not Responding
```bash
./deploy-to-ec2.sh logs      # Check Django logs
./deploy-to-ec2.sh status    # Check if server is running
./deploy-to-ec2.sh restart   # Restart the server
```

### SSH Connection Issues
- Verify your EC2 key path in `deploy-config.sh`
- Ensure EC2 instance is running
- Check security group allows SSH (port 22)

### Permission Issues
```bash
chmod 400 ~/.ssh/your-key.pem  # Fix key permissions
```

### Port Access Issues
- Ensure EC2 security group allows port 8001
- Check if Django is binding to 0.0.0.0:8001 (not 127.0.0.1)

## Manual SSH Commands

If you need to SSH manually:

```bash
# Connect to EC2
ssh -i ~/.ssh/your-key.pem ec2-user@44.197.181.141

# Navigate to project
cd ~/shiftnotes-backend

# Activate virtual environment
source venv/bin/activate

# Run Django commands
python manage.py runserver 0.0.0.0:8001

# View logs
tail -f ~/logs/django.log
```


