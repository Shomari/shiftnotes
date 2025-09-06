#!/bin/bash

# ShiftNotes Deployment Configuration
# Update these values for your specific setup

# EC2 Instance Configuration
export EC2_HOST="44.197.181.141"
export EC2_USER="ec2-user"
export EC2_KEY_PATH="~/.ssh/shiftnotes-key.pem"  # UPDATE THIS TO YOUR ACTUAL KEY PATH

# Deployment Paths
export REMOTE_DIR="/home/ec2-user/shiftnotes-backend"
export LOCAL_DIR="./shiftnotes-backend"

# Server Configuration
export SERVER_PORT="8001"
export PYTHON_PATH="/usr/bin/python3"

# Optional: Database Configuration (if using environment variables)
# export DB_HOST="your-aurora-endpoint"
# export DB_PASSWORD="your-db-password"
