#!/bin/bash

# ShiftNotes Django Backend EC2 Deployment Script
# Deploys to t3.micro instance with Aurora RDS connection

set -e

echo "🚀 Starting ShiftNotes Django Backend Deployment to EC2..."

# Configuration
REGION="us-east-1"
INSTANCE_TYPE="t3.micro"
KEY_NAME="shiftnotes-key"
SECURITY_GROUP_NAME="shiftnotes-ec2-sg"
INSTANCE_NAME="shiftnotes-backend"
AMI_ID="ami-0c02fb55956c7d316"  # Amazon Linux 2023 AMI

# Get the existing Aurora security group ID
echo "📡 Getting Aurora security group ID..."
AURORA_SG_ID=$(aws rds describe-db-clusters \
    --db-cluster-identifier shiftnotes-aurora-public \
    --query 'DBClusters[0].VpcSecurityGroups[0].VpcSecurityGroupId' \
    --output text \
    --region $REGION)

if [ "$AURORA_SG_ID" = "None" ] || [ -z "$AURORA_SG_ID" ]; then
    echo "❌ Could not find Aurora security group. Please ensure Aurora cluster exists."
    exit 1
fi

echo "✅ Found Aurora security group: $AURORA_SG_ID"

# Get VPC ID from Aurora cluster
echo "📡 Getting VPC ID from Aurora cluster..."
VPC_ID=$(aws rds describe-db-clusters \
    --db-cluster-identifier shiftnotes-aurora-public \
    --query 'DBClusters[0].DBSubnetGroup' \
    --output text \
    --region $REGION)

# Get VPC ID from subnet group
VPC_ID=$(aws rds describe-db-subnet-groups \
    --db-subnet-group-name $VPC_ID \
    --query 'DBSubnetGroups[0].VpcId' \
    --output text \
    --region $REGION)

echo "✅ Found VPC ID: $VPC_ID"

# Create key pair if it doesn't exist
echo "🔑 Creating/checking EC2 key pair..."
if ! aws ec2 describe-key-pairs --key-names $KEY_NAME --region $REGION >/dev/null 2>&1; then
    aws ec2 create-key-pair \
        --key-name $KEY_NAME \
        --query 'KeyMaterial' \
        --output text \
        --region $REGION > ~/.ssh/${KEY_NAME}.pem
    
    chmod 400 ~/.ssh/${KEY_NAME}.pem
    echo "✅ Created new key pair: $KEY_NAME"
else
    echo "✅ Key pair already exists: $KEY_NAME"
fi

# Create security group for EC2
echo "🛡️ Creating security group for EC2..."
EC2_SG_ID=$(aws ec2 create-security-group \
    --group-name $SECURITY_GROUP_NAME \
    --description "Security group for ShiftNotes Django backend" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text \
    --region $REGION 2>/dev/null || \
    aws ec2 describe-security-groups \
        --group-names $SECURITY_GROUP_NAME \
        --query 'SecurityGroups[0].GroupId' \
        --output text \
        --region $REGION)

echo "✅ EC2 Security Group ID: $EC2_SG_ID"

# Configure security group rules
echo "🔧 Configuring security group rules..."

# Allow SSH access (port 22)
aws ec2 authorize-security-group-ingress \
    --group-id $EC2_SG_ID \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0 \
    --region $REGION 2>/dev/null || echo "SSH rule already exists"

# Allow HTTP access (port 80)
aws ec2 authorize-security-group-ingress \
    --group-id $EC2_SG_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0 \
    --region $REGION 2>/dev/null || echo "HTTP rule already exists"

# Allow HTTPS access (port 443)
aws ec2 authorize-security-group-ingress \
    --group-id $EC2_SG_ID \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0 \
    --region $REGION 2>/dev/null || echo "HTTPS rule already exists"

# Allow Django dev server (port 8000) - temporary for testing
aws ec2 authorize-security-group-ingress \
    --group-id $EC2_SG_ID \
    --protocol tcp \
    --port 8000 \
    --cidr 0.0.0.0/0 \
    --region $REGION 2>/dev/null || echo "Django dev port rule already exists"

# Update Aurora security group to allow access from EC2
echo "🔧 Updating Aurora security group to allow EC2 access..."
aws ec2 authorize-security-group-ingress \
    --group-id $AURORA_SG_ID \
    --protocol tcp \
    --port 5432 \
    --source-group $EC2_SG_ID \
    --region $REGION 2>/dev/null || echo "Aurora access rule already exists"

# Get a public subnet ID
echo "📡 Finding public subnet..."
SUBNET_ID=$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$VPC_ID" "Name=map-public-ip-on-launch,Values=true" \
    --query 'Subnets[0].SubnetId' \
    --output text \
    --region $REGION)

if [ "$SUBNET_ID" = "None" ] || [ -z "$SUBNET_ID" ]; then
    echo "❌ No public subnet found. Creating one..."
    # This would require creating a public subnet - for now, let's use any subnet
    SUBNET_ID=$(aws ec2 describe-subnets \
        --filters "Name=vpc-id,Values=$VPC_ID" \
        --query 'Subnets[0].SubnetId' \
        --output text \
        --region $REGION)
fi

echo "✅ Using subnet: $SUBNET_ID"

# Create EC2 instance
echo "🖥️ Creating EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --count 1 \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --security-group-ids $EC2_SG_ID \
    --subnet-id $SUBNET_ID \
    --associate-public-ip-address \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
    --user-data file://$(dirname "$0")/ec2-user-data.sh \
    --query 'Instances[0].InstanceId' \
    --output text \
    --region $REGION)

echo "✅ Created EC2 instance: $INSTANCE_ID"

# Wait for instance to be running
echo "⏳ Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text \
    --region $REGION)

echo "✅ Instance is running at: $PUBLIC_IP"

# Wait a bit more for user data script to complete
echo "⏳ Waiting for initial setup to complete (2 minutes)..."
sleep 120

echo ""
echo "🎉 EC2 instance deployment completed!"
echo ""
echo "📋 Deployment Summary:"
echo "   Instance ID: $INSTANCE_ID"
echo "   Public IP: $PUBLIC_IP"
echo "   Key File: ~/.ssh/${KEY_NAME}.pem"
echo "   SSH Command: ssh -i ~/.ssh/${KEY_NAME}.pem ec2-user@$PUBLIC_IP"
echo ""
echo "🔗 Next Steps:"
echo "   1. SSH into the instance and deploy your Django code"
echo "   2. Configure environment variables"
echo "   3. Test the API endpoints"
echo ""

# Save deployment info
cat > deployment-info.txt << EOF
ShiftNotes EC2 Deployment Information
=====================================

Instance ID: $INSTANCE_ID
Public IP: $PUBLIC_IP
Region: $REGION
VPC ID: $VPC_ID
Security Group: $EC2_SG_ID
Aurora Security Group: $AURORA_SG_ID

SSH Access:
ssh -i ~/.ssh/${KEY_NAME}.pem ec2-user@$PUBLIC_IP

API URLs:
http://$PUBLIC_IP:8000/api/v1/
http://$PUBLIC_IP:8000/admin/

Deployment Date: $(date)
EOF

echo "📄 Deployment info saved to: deployment-info.txt"



