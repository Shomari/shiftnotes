#!/bin/bash

# Configuration
KEY_PATH="~/.ssh/shiftnotes-key.pem"
USER="ec2-user"
HOST="52.200.99.7"
PROJECT_DIR="shiftnotes"
BACKEND_DIR="shiftnotes-backend"

set -e  # Exit on any error

EC2_HOST="52.200.99.7"
EC2_USER="ec2-user"
KEY_PATH="~/.ssh/shiftnotes-key.pem"
APP_DIR="~/app"

echo "🚀 Starting EPAnotes Backend Deployment with Cleanup..."

# Step 1: Stop running containers
echo "📦 Stopping running containers..."
ssh -i $KEY_PATH $EC2_USER@$EC2_HOST "cd $APP_DIR && docker-compose -f docker-compose.prod.yml down" || true

# Step 2: Aggressive Docker cleanup
echo "🧹 Cleaning up Docker resources..."
ssh -i $KEY_PATH $EC2_USER@$EC2_HOST "
# Stop all running containers
docker stop \$(docker ps -aq) 2>/dev/null || true

# Remove all containers (running and stopped)
docker rm \$(docker ps -aq) 2>/dev/null || true

# Remove all images
docker rmi \$(docker images -aq) 2>/dev/null || true

# Remove all volumes
docker volume rm \$(docker volume ls -q) 2>/dev/null || true

# Remove all networks (except default ones)
docker network rm \$(docker network ls -q) 2>/dev/null || true

# System prune to remove everything
docker system prune -a -f --volumes

# Show disk usage after cleanup
echo '📊 Disk usage after cleanup:'
df -h /
echo '💾 Docker system usage:'
docker system df
"

# Step 3: Deploy backend files
echo "📁 Deploying backend files..."
rsync -avz --delete -e "ssh -i $KEY_PATH" \
  --exclude='db.sqlite3' \
  --exclude='logs/' \
  --exclude='static/' \
  --exclude='__pycache__/' \
  --exclude='*.pyc' \
  shiftnotes-backend/ $EC2_USER@$EC2_HOST:$APP_DIR/

# Step 4: Build and start fresh containers
echo "🔨 Building and starting fresh containers..."
ssh -i $KEY_PATH $EC2_USER@$EC2_HOST "
cd $APP_DIR

# Build with no cache to ensure fresh build
docker-compose -f docker-compose.prod.yml build --no-cache

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Show final status
echo '✅ Deployment complete!'
echo '📊 Final disk usage:'
df -h /
echo '🐳 Running containers:'
docker ps
echo '💾 Docker system usage:'
docker system df
"

echo "🎉 Deployment completed successfully!"
echo "🌐 API should be available at: https://api.epanotes.com"

