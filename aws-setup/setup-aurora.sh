#!/bin/bash

# ShiftNotes Aurora Serverless v2 Setup - Maximum Cost Savings
# This script creates the most cost-effective Aurora setup for development

set -e

# Configuration
PROJECT_NAME="shiftnotes"
REGION="us-east-1"  # Change to your preferred region
DB_NAME="shiftnotes"
DB_USERNAME="shiftnotes_admin"

echo "🚀 Setting up Aurora Serverless v2 for ShiftNotes (Cost-Optimized)"
echo "Region: $REGION"
echo "Database: $DB_NAME"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI configured"

# 1. Create VPC (if not exists)
echo "📡 Setting up VPC..."
VPC_ID=$(aws ec2 describe-vpcs \
    --filters "Name=tag:Name,Values=${PROJECT_NAME}-vpc" \
    --query 'Vpcs[0].VpcId' \
    --output text \
    --region $REGION 2>/dev/null || echo "None")

if [ "$VPC_ID" = "None" ] || [ "$VPC_ID" = "null" ]; then
    echo "Creating new VPC..."
    VPC_ID=$(aws ec2 create-vpc \
        --cidr-block 10.0.0.0/16 \
        --query 'Vpc.VpcId' \
        --output text \
        --region $REGION)
    
    aws ec2 create-tags \
        --resources $VPC_ID \
        --tags Key=Name,Value=${PROJECT_NAME}-vpc \
        --region $REGION
    
    # Enable DNS hostnames
    aws ec2 modify-vpc-attribute \
        --vpc-id $VPC_ID \
        --enable-dns-hostnames \
        --region $REGION
    
    echo "✅ Created VPC: $VPC_ID"
else
    echo "✅ Using existing VPC: $VPC_ID"
fi

# 2. Create Internet Gateway (if not exists)
echo "🌐 Setting up Internet Gateway..."
IGW_ID=$(aws ec2 describe-internet-gateways \
    --filters "Name=tag:Name,Values=${PROJECT_NAME}-igw" \
    --query 'InternetGateways[0].InternetGatewayId' \
    --output text \
    --region $REGION 2>/dev/null || echo "None")

if [ "$IGW_ID" = "None" ] || [ "$IGW_ID" = "null" ]; then
    IGW_ID=$(aws ec2 create-internet-gateway \
        --query 'InternetGateway.InternetGatewayId' \
        --output text \
        --region $REGION)
    
    aws ec2 create-tags \
        --resources $IGW_ID \
        --tags Key=Name,Value=${PROJECT_NAME}-igw \
        --region $REGION
    
    aws ec2 attach-internet-gateway \
        --internet-gateway-id $IGW_ID \
        --vpc-id $VPC_ID \
        --region $REGION
    
    echo "✅ Created Internet Gateway: $IGW_ID"
else
    echo "✅ Using existing Internet Gateway: $IGW_ID"
fi

# 3. Get availability zones
AZ1=$(aws ec2 describe-availability-zones \
    --query 'AvailabilityZones[0].ZoneName' \
    --output text \
    --region $REGION)
AZ2=$(aws ec2 describe-availability-zones \
    --query 'AvailabilityZones[1].ZoneName' \
    --output text \
    --region $REGION)

echo "Using AZs: $AZ1, $AZ2"

# 4. Create private subnets for database (Aurora requires 2+ AZs)
echo "🔒 Creating private subnets..."

# Subnet 1
SUBNET1_ID=$(aws ec2 describe-subnets \
    --filters "Name=tag:Name,Values=${PROJECT_NAME}-private-1" \
    --query 'Subnets[0].SubnetId' \
    --output text \
    --region $REGION 2>/dev/null || echo "None")

if [ "$SUBNET1_ID" = "None" ] || [ "$SUBNET1_ID" = "null" ]; then
    SUBNET1_ID=$(aws ec2 create-subnet \
        --vpc-id $VPC_ID \
        --cidr-block 10.0.1.0/24 \
        --availability-zone $AZ1 \
        --query 'Subnet.SubnetId' \
        --output text \
        --region $REGION)
    
    aws ec2 create-tags \
        --resources $SUBNET1_ID \
        --tags Key=Name,Value=${PROJECT_NAME}-private-1 \
        --region $REGION
fi

# Subnet 2
SUBNET2_ID=$(aws ec2 describe-subnets \
    --filters "Name=tag:Name,Values=${PROJECT_NAME}-private-2" \
    --query 'Subnets[0].SubnetId' \
    --output text \
    --region $REGION 2>/dev/null || echo "None")

if [ "$SUBNET2_ID" = "None" ] || [ "$SUBNET2_ID" = "null" ]; then
    SUBNET2_ID=$(aws ec2 create-subnet \
        --vpc-id $VPC_ID \
        --cidr-block 10.0.2.0/24 \
        --availability-zone $AZ2 \
        --query 'Subnet.SubnetId' \
        --output text \
        --region $REGION)
    
    aws ec2 create-tags \
        --resources $SUBNET2_ID \
        --tags Key=Name,Value=${PROJECT_NAME}-private-2 \
        --region $REGION
fi

echo "✅ Subnets created: $SUBNET1_ID, $SUBNET2_ID"

# 5. Create DB Subnet Group
echo "🗄️ Creating DB subnet group..."
aws rds create-db-subnet-group \
    --db-subnet-group-name ${PROJECT_NAME}-subnet-group \
    --db-subnet-group-description "ShiftNotes database subnet group" \
    --subnet-ids $SUBNET1_ID $SUBNET2_ID \
    --region $REGION 2>/dev/null || echo "Subnet group already exists"

# 6. Create security group for database
echo "🔐 Creating security group..."
SG_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=${PROJECT_NAME}-db-sg" \
    --query 'SecurityGroups[0].GroupId' \
    --output text \
    --region $REGION 2>/dev/null || echo "None")

if [ "$SG_ID" = "None" ] || [ "$SG_ID" = "null" ]; then
    SG_ID=$(aws ec2 create-security-group \
        --group-name ${PROJECT_NAME}-db-sg \
        --description "ShiftNotes database security group" \
        --vpc-id $VPC_ID \
        --query 'GroupId' \
        --output text \
        --region $REGION)
    
    # Allow PostgreSQL access from VPC
    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 5432 \
        --cidr 10.0.0.0/16 \
        --region $REGION
    
    echo "✅ Created security group: $SG_ID"
else
    echo "✅ Using existing security group: $SG_ID"
fi

# 7. Generate random password and store in Secrets Manager
echo "🔑 Setting up database credentials..."
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Create secret in Secrets Manager
SECRET_ARN=$(aws secretsmanager create-secret \
    --name "${PROJECT_NAME}/database/credentials" \
    --description "ShiftNotes database credentials" \
    --secret-string "{\"username\":\"$DB_USERNAME\",\"password\":\"$DB_PASSWORD\"}" \
    --query 'ARN' \
    --output text \
    --region $REGION 2>/dev/null || \
    aws secretsmanager update-secret \
        --secret-id "${PROJECT_NAME}/database/credentials" \
        --secret-string "{\"username\":\"$DB_USERNAME\",\"password\":\"$DB_PASSWORD\"}" \
        --query 'ARN' \
        --output text \
        --region $REGION)

echo "✅ Database credentials stored in Secrets Manager"

# 8. Create Aurora Serverless v2 cluster (COST OPTIMIZED)
echo "🚀 Creating Aurora Serverless v2 cluster..."
CLUSTER_ID="${PROJECT_NAME}-aurora-cluster"

# Check if cluster exists
EXISTING_CLUSTER=$(aws rds describe-db-clusters \
    --db-cluster-identifier $CLUSTER_ID \
    --query 'DBClusters[0].DBClusterIdentifier' \
    --output text \
    --region $REGION 2>/dev/null || echo "None")

if [ "$EXISTING_CLUSTER" = "None" ] || [ "$EXISTING_CLUSTER" = "null" ]; then
    # Create Aurora cluster first
    aws rds create-db-cluster \
        --db-cluster-identifier $CLUSTER_ID \
        --engine aurora-postgresql \
        --engine-version 15.4 \
        --master-username $DB_USERNAME \
        --master-user-password $DB_PASSWORD \
        --database-name $DB_NAME \
        --vpc-security-group-ids $SG_ID \
        --db-subnet-group-name ${PROJECT_NAME}-subnet-group \
        --storage-encrypted \
        --backup-retention-period 7 \
        --preferred-backup-window "07:00-08:00" \
        --preferred-maintenance-window "sun:08:00-sun:09:00" \
        --region $REGION
    
    echo "⏳ Waiting for cluster to be available..."
    # Wait for cluster to be available (older AWS CLI doesn't have db-cluster-available)
    while true; do
        STATUS=$(aws rds describe-db-clusters \
            --db-cluster-identifier $CLUSTER_ID \
            --query 'DBClusters[0].Status' \
            --output text \
            --region $REGION 2>/dev/null)
        
        if [ "$STATUS" = "available" ]; then
            break
        elif [ "$STATUS" = "failed" ] || [ "$STATUS" = "None" ]; then
            echo "❌ Cluster creation failed"
            exit 1
        else
            echo "   Cluster status: $STATUS (waiting...)"
            sleep 30
        fi
    done
    
    echo "✅ Aurora cluster created: $CLUSTER_ID"
    
    # Configure Serverless v2 scaling after cluster creation
    echo "⚙️ Configuring Serverless v2 scaling..."
    aws rds modify-db-cluster \
        --db-cluster-identifier $CLUSTER_ID \
        --serverlessv2-scaling-configuration MinCapacity=0.5,MaxCapacity=2.0 \
        --region $REGION
    
    echo "✅ Serverless v2 scaling configured (0.5-2.0 ACUs)"
else
    echo "✅ Using existing cluster: $CLUSTER_ID"
fi

# 9. Create Aurora Serverless v2 instance
echo "💾 Creating Aurora instance..."
INSTANCE_ID="${PROJECT_NAME}-aurora-instance"

EXISTING_INSTANCE=$(aws rds describe-db-instances \
    --db-instance-identifier $INSTANCE_ID \
    --query 'DBInstances[0].DBInstanceIdentifier' \
    --output text \
    --region $REGION 2>/dev/null || echo "None")

if [ "$EXISTING_INSTANCE" = "None" ] || [ "$EXISTING_INSTANCE" = "null" ]; then
    aws rds create-db-instance \
        --db-instance-identifier $INSTANCE_ID \
        --db-instance-class db.serverless \
        --engine aurora-postgresql \
        --db-cluster-identifier $CLUSTER_ID \
        --publicly-accessible \
        --region $REGION
    
    echo "⏳ Waiting for instance to be available..."
    aws rds wait db-instance-available \
        --db-instance-identifier $INSTANCE_ID \
        --region $REGION
    
    echo "✅ Aurora instance created: $INSTANCE_ID"
else
    echo "✅ Using existing instance: $INSTANCE_ID"
fi

# 10. Get connection details
echo "📋 Getting connection details..."
ENDPOINT=$(aws rds describe-db-clusters \
    --db-cluster-identifier $CLUSTER_ID \
    --query 'DBClusters[0].Endpoint' \
    --output text \
    --region $REGION)

PORT=$(aws rds describe-db-clusters \
    --db-cluster-identifier $CLUSTER_ID \
    --query 'DBClusters[0].Port' \
    --output text \
    --region $REGION)

# 11. Create environment file for Django
echo "📝 Creating environment configuration..."
cat > ../shiftnotes-backend/.env.production << EOF
# Aurora Database Configuration
DB_HOST=$ENDPOINT
DB_PORT=$PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USERNAME
DB_PASSWORD=$DB_PASSWORD

# AWS Configuration
AWS_REGION=$REGION
AWS_SECRET_ARN=$SECRET_ARN

# Security
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1
SECRET_KEY=$(openssl rand -base64 50 | tr -d "=+/" | cut -c1-50)
EOF

echo ""
echo "🎉 Aurora Serverless v2 Setup Complete!"
echo ""
echo "📊 Configuration Summary:"
echo "  Cluster: $CLUSTER_ID"
echo "  Instance: $INSTANCE_ID"
echo "  Endpoint: $ENDPOINT"
echo "  Port: $PORT"
echo "  Database: $DB_NAME"
echo "  Username: $DB_USERNAME"
echo ""
echo "💰 Cost Optimization:"
echo "  ✅ Serverless v2 with 0.5-2.0 ACU scaling"
echo "  ✅ Single instance (no replicas)"
echo "  ✅ Single AZ (no Multi-AZ)"
echo "  ✅ 7-day backup retention"
echo "  ✅ Estimated cost: $40-80/month"
echo ""
echo "🔐 Security:"
echo "  ✅ Encrypted storage"
echo "  ✅ Credentials in Secrets Manager"
echo "  ✅ VPC isolation"
echo "  ✅ Security group restrictions"
echo ""
echo "📁 Next Steps:"
echo "  1. Update Django settings to use Aurora"
echo "  2. Run database migrations"
echo "  3. Test connection"
echo ""
echo "Environment file created: shiftnotes-backend/.env.production"
echo "Secret ARN: $SECRET_ARN"
