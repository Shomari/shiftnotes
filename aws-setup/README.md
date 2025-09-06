# ShiftNotes Aurora Setup - Maximum Cost Savings

This setup creates the most cost-effective Aurora Serverless v2 configuration for development, with AWS handling all database management.

## 💰 Cost Optimization Features

- ✅ **Aurora Serverless v2** with 0.5-2.0 ACU scaling
- ✅ **Single instance** (no replicas for dev)
- ✅ **Single AZ** (no Multi-AZ for dev)
- ✅ **7-day backup retention** (minimum for safety)
- ✅ **Auto-scaling** down to 0.5 ACUs when idle
- ✅ **Encrypted storage** for security

**Expected Monthly Cost: $40-80** (vs $200+ for traditional RDS)

## 🚀 Quick Setup (3 Steps)

### Prerequisites
```bash
# Install AWS CLI and configure
aws configure
# Enter your AWS Access Key, Secret Key, Region (us-east-1), and output format (json)

# Verify configuration
aws sts get-caller-identity
```

### Step 1: Update Django Settings
```bash
./update-django-settings.py
```
This script:
- Updates Django settings for Aurora PostgreSQL
- Adds required database packages
- Creates migration script

### Step 2: Create Aurora Infrastructure
```bash
./setup-aurora.sh
```
This script creates:
- VPC with private subnets (Aurora requires 2+ AZs)
- Security groups (PostgreSQL access only from VPC)
- Aurora Serverless v2 cluster with cost optimization
- Secrets Manager for database credentials
- Environment file for Django

### Step 3: Run Django Migrations
```bash
./run-migrations.sh
```
This script:
- Tests database connection
- Runs Django migrations
- Optionally creates superuser

## 📊 Aurora Serverless v2 Scaling

### How Auto-Scaling Works
```yaml
Minimum Capacity: 0.5 ACUs (~$43/month baseline)
Maximum Capacity: 2.0 ACUs (~$172/month at peak)

Scaling Triggers:
  - CPU utilization > 70%
  - Active database connections
  - Memory usage
  - I/O activity

Scaling Speed:
  - Scale up: 15-30 seconds
  - Scale down: 15 minutes (prevents thrashing)
```

### Cost Examples
```
Idle (0.5 ACUs): $43/month
Light development (avg 0.8 ACUs): $69/month  
Active development (avg 1.2 ACUs): $103/month
Peak usage (2.0 ACUs): $172/month
```

## 🔧 Cost Management

### Monitor Costs
```bash
./monitor-costs.sh
```

### Adjust Scaling (if needed)
```bash
# Ultra-low cost (0.5-1.0 ACUs max)
aws rds modify-db-cluster \
  --db-cluster-identifier shiftnotes-aurora-cluster \
  --serverlessv2-scaling-configuration MinCapacity=0.5,MaxCapacity=1.0

# Normal development (0.5-2.0 ACUs)
aws rds modify-db-cluster \
  --db-cluster-identifier shiftnotes-aurora-cluster \
  --serverlessv2-scaling-configuration MinCapacity=0.5,MaxCapacity=2.0

# Active development (0.5-4.0 ACUs)
aws rds modify-db-cluster \
  --db-cluster-identifier shiftnotes-aurora-cluster \
  --serverlessv2-scaling-configuration MinCapacity=0.5,MaxCapacity=4.0
```

## 🔐 Security Features

- ✅ **Encrypted storage** with AWS KMS
- ✅ **VPC isolation** (database in private subnets)
- ✅ **Security groups** (PostgreSQL port 5432 only from VPC)
- ✅ **Secrets Manager** for credential management
- ✅ **SSL/TLS** connections required
- ✅ **Backup encryption** enabled

## 📁 Files Created

```
aws-setup/
├── setup-aurora.sh           # Main Aurora setup script
├── update-django-settings.py # Django configuration updater
├── run-migrations.sh         # Django migration runner
├── monitor-costs.sh          # Cost monitoring tools
└── README.md                 # This file

shiftnotes-backend/
└── .env.production          # Environment variables (created by setup)
```

## 🔌 Connection Details

After setup, your Django app connects using:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'shiftnotes',
        'USER': 'shiftnotes_admin',
        'PASSWORD': '[from Secrets Manager]',
        'HOST': '[aurora-cluster-endpoint]',
        'PORT': '5432',
        'OPTIONS': {
            'sslmode': 'require',
            'connect_timeout': 60,
        }
    }
}
```

## 🚨 Important Notes

### Aurora Serverless v2 vs v1
- **v2 (recommended)**: No cold starts, always available, scales 0.5-128 ACUs
- **v1 (deprecated)**: True pause to $0, but cold starts and being phased out

### Development vs Production
```yaml
Development (current setup):
  ✅ Single instance
  ✅ Single AZ  
  ✅ 0.5-2.0 ACU scaling
  ✅ 7-day backups
  
Production (future):
  🔄 Multi-AZ deployment
  🔄 Read replicas
  🔄 Higher ACU limits
  🔄 35-day backups
  🔄 Enhanced monitoring
```

## 🆘 Troubleshooting

### Connection Issues
```bash
# Test connection from EC2 instance
psql -h [aurora-endpoint] -U shiftnotes_admin -d shiftnotes

# Check security groups
aws ec2 describe-security-groups --group-ids [sg-id]

# Check cluster status
aws rds describe-db-clusters --db-cluster-identifier shiftnotes-aurora-cluster
```

### Cost Concerns
```bash
# Check current scaling
aws rds describe-db-clusters \
  --db-cluster-identifier shiftnotes-aurora-cluster \
  --query 'DBClusters[0].ServerlessV2ScalingConfiguration'

# View CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name ServerlessDatabaseCapacity \
  --dimensions Name=DBClusterIdentifier,Value=shiftnotes-aurora-cluster
```

## 🎯 Next Steps

1. **Run the setup** (3 commands above)
2. **Test your Django app** with Aurora
3. **Monitor costs** for first month
4. **Adjust scaling** based on usage patterns
5. **Plan production upgrade** when ready

## 💡 Alternative Approaches

If Aurora costs are still too high:
```yaml
Option 1: Local Development
  Database: Docker PostgreSQL
  Cost: $0
  Trade-off: No cloud integration

Option 2: RDS Free Tier
  Database: db.t3.micro PostgreSQL
  Cost: $0 (first 12 months)
  Trade-off: Limited resources

Option 3: Containerized PostgreSQL
  Database: PostgreSQL on EC2 t3.micro
  Cost: ~$15/month
  Trade-off: Manual management
```

**Recommendation**: Start with Aurora Serverless v2 for the managed experience, then optimize based on actual usage patterns.



