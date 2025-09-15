#!/bin/bash

# EPAnotes RDS PostgreSQL Setup Script
# Creates the cheapest possible PostgreSQL setup on AWS (~$12/month)

set -e

echo "🚀 Setting up RDS PostgreSQL for EPAnotes"
echo "========================================="

# Configuration
DB_INSTANCE_ID="epanotes-postgres"
DB_NAME="epanotes"
DB_USERNAME="postgres"
DB_ENGINE="postgres"
DB_ENGINE_VERSION="15.8"
DB_INSTANCE_CLASS="db.t4g.micro"
ALLOCATED_STORAGE="20"
STORAGE_TYPE="gp3"

# Generate a secure random password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

echo "📋 Configuration:"
echo "   Instance ID: $DB_INSTANCE_ID"
echo "   Database: $DB_NAME"
echo "   Username: $DB_USERNAME"
echo "   Password: [Generated - will be stored in Secrets Manager]"
echo "   Instance: $DB_INSTANCE_CLASS"
echo "   Storage: ${ALLOCATED_STORAGE}GB $STORAGE_TYPE"
echo ""

# Check if AWS CLI is configured
echo "🔍 Checking AWS CLI configuration..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

AWS_REGION=$(aws configure get region)
echo "   Region: $AWS_REGION"
echo ""

# Get VPC and Security Group info
echo "🔍 Getting VPC information..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text)
if [ "$VPC_ID" = "None" ]; then
    echo "❌ No default VPC found. Creating one..."
    aws ec2 create-default-vpc
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text)
fi
echo "   VPC ID: $VPC_ID"

# Get subnets
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[].SubnetId' --output text)
SUBNET_ARRAY=($SUBNET_IDS)
echo "   Subnets: ${SUBNET_ARRAY[@]}"

# Create DB subnet group if it doesn't exist
DB_SUBNET_GROUP="epanotes-db-subnet-group"
echo ""
echo "🔍 Checking DB subnet group..."
if ! aws rds describe-db-subnet-groups --db-subnet-group-name $DB_SUBNET_GROUP &> /dev/null; then
    echo "📦 Creating DB subnet group..."
    aws rds create-db-subnet-group \
        --db-subnet-group-name $DB_SUBNET_GROUP \
        --db-subnet-group-description "EPAnotes database subnet group" \
        --subnet-ids $SUBNET_IDS
    echo "   ✅ DB subnet group created: $DB_SUBNET_GROUP"
else
    echo "   ✅ DB subnet group exists: $DB_SUBNET_GROUP"
fi

# Get default security group
DEFAULT_SG=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=default" --query 'SecurityGroups[0].GroupId' --output text)
echo "   Default Security Group: $DEFAULT_SG"

# Create or get RDS security group
RDS_SG_NAME="epanotes-rds-sg"
echo ""
echo "🔍 Checking RDS security group..."
RDS_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$RDS_SG_NAME" "Name=vpc-id,Values=$VPC_ID" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "None")

if [ "$RDS_SG_ID" = "None" ]; then
    echo "📦 Creating RDS security group..."
    RDS_SG_ID=$(aws ec2 create-security-group \
        --group-name $RDS_SG_NAME \
        --description "EPAnotes RDS PostgreSQL security group" \
        --vpc-id $VPC_ID \
        --query 'GroupId' --output text)
    
    echo "📦 Adding PostgreSQL rule (port 5432) from EC2 security group..."
    aws ec2 authorize-security-group-ingress \
        --group-id $RDS_SG_ID \
        --protocol tcp \
        --port 5432 \
        --source-group $DEFAULT_SG
    
    echo "   ✅ RDS security group created: $RDS_SG_ID"
else
    echo "   ✅ RDS security group exists: $RDS_SG_ID"
fi

# Store password in AWS Secrets Manager
SECRET_NAME="epanotes/rds/postgres"
echo ""
echo "🔐 Storing database credentials in Secrets Manager..."
if aws secretsmanager describe-secret --secret-id $SECRET_NAME &> /dev/null; then
    echo "📦 Updating existing secret..."
    aws secretsmanager update-secret \
        --secret-id $SECRET_NAME \
        --secret-string "{\"username\":\"$DB_USERNAME\",\"password\":\"$DB_PASSWORD\",\"host\":\"$DB_INSTANCE_ID.$AWS_REGION.rds.amazonaws.com\",\"port\":5432,\"dbname\":\"$DB_NAME\"}"
else
    echo "📦 Creating new secret..."
    aws secretsmanager create-secret \
        --name $SECRET_NAME \
        --description "EPAnotes RDS PostgreSQL credentials" \
        --secret-string "{\"username\":\"$DB_USERNAME\",\"password\":\"$DB_PASSWORD\",\"host\":\"$DB_INSTANCE_ID.$AWS_REGION.rds.amazonaws.com\",\"port\":5432,\"dbname\":\"$DB_NAME\"}"
fi
echo "   ✅ Credentials stored in: $SECRET_NAME"

# Create RDS instance
echo ""
echo "🗄️  Creating RDS PostgreSQL instance..."
echo "   This will take 5-10 minutes..."

if aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_ID &> /dev/null; then
    echo "   ⚠️  RDS instance already exists: $DB_INSTANCE_ID"
    INSTANCE_STATUS=$(aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_ID --query 'DBInstances[0].DBInstanceStatus' --output text)
    echo "   Status: $INSTANCE_STATUS"
else
    aws rds create-db-instance \
        --db-instance-identifier $DB_INSTANCE_ID \
        --db-instance-class $DB_INSTANCE_CLASS \
        --engine $DB_ENGINE \
        --engine-version $DB_ENGINE_VERSION \
        --master-username $DB_USERNAME \
        --master-user-password $DB_PASSWORD \
        --allocated-storage $ALLOCATED_STORAGE \
        --storage-type $STORAGE_TYPE \
        --vpc-security-group-ids $RDS_SG_ID \
        --db-subnet-group-name $DB_SUBNET_GROUP \
        --backup-retention-period 7 \
        --storage-encrypted \
        --no-multi-az \
        --no-publicly-accessible \
        --db-name $DB_NAME \
        --port 5432

    echo "   ✅ RDS instance creation initiated: $DB_INSTANCE_ID"
    echo ""
    echo "⏳ Waiting for RDS instance to become available..."
    echo "   This usually takes 5-10 minutes. You can check status with:"
    echo "   aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_ID"
    
    # Wait for instance to be available
    aws rds wait db-instance-available --db-instance-identifier $DB_INSTANCE_ID
fi

# Get final endpoint
DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_ID --query 'DBInstances[0].Endpoint.Address' --output text)

echo ""
echo "🎉 RDS PostgreSQL Setup Complete!"
echo "================================="
echo "📊 Instance Details:"
echo "   Endpoint: $DB_ENDPOINT"
echo "   Port: 5432"
echo "   Database: $DB_NAME"
echo "   Username: $DB_USERNAME"
echo "   Secret: $SECRET_NAME"
echo ""
echo "💰 Expected Monthly Cost: ~$12-15"
echo "   - RDS t4g.micro: ~$10-12"
echo "   - 20GB GP3 storage: ~$2-3"
echo ""
echo "🔧 Next Steps:"
echo "   1. Update Django settings to use PostgreSQL"
echo "   2. Install psycopg2 in requirements.txt"
echo "   3. Run migrations to create schema"
echo "   4. Import existing data (if any)"
echo ""
echo "🔐 Database Connection String:"
echo "   postgresql://$DB_USERNAME:[password]@$DB_ENDPOINT:5432/$DB_NAME"
echo ""
echo "   Get the password with:"
echo "   aws secretsmanager get-secret-value --secret-id $SECRET_NAME --query SecretString --output text"
