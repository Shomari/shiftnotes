# EPAnotes PostgreSQL Setup Guide

This guide will help you migrate from SQLite to RDS PostgreSQL for **~$12/month** instead of Aurora's $25+/month.

## 🎯 **Important**: Database Architecture

- **🖥️ Local Development**: Continues using SQLite (no changes needed)
- **☁️ Production EC2**: Will use PostgreSQL RDS (~$12/month)

Your local development workflow remains exactly the same!

## 🚀 Quick Setup (5 Steps)

### Step 1: Create RDS PostgreSQL Instance
```bash
# Run the automated setup script
./setup-rds-postgres.sh
```

**What this does:**
- Creates RDS `t4g.micro` PostgreSQL instance (~$12/month)
- Sets up security groups for EC2 → RDS access
- Stores credentials in AWS Secrets Manager
- Configures 20GB storage with 7-day backups

### Step 2: Migrate Data from SQLite (Run on EC2)
```bash
# SSH into your EC2 instance first, then:
./migrate-to-postgres.sh
```

**What this does:**
- Exports all data from production SQLite
- Creates PostgreSQL schema on RDS
- Imports all existing data to RDS
- Verifies migration success
- **Local SQLite remains unchanged**

### Step 3: Update Production Docker
```bash
# Updated docker-compose.prod.yml (already done)
# - Removed SQLite database volume
# - Django will now use PostgreSQL in production
```

### Step 4: Deploy to EC2
```bash
# Deploy updated backend
./deploy-to-ec2-fixed.sh
```

### Step 5: Verify Everything Works
```bash
# Test the application
curl https://api.epanotes.com/api/users/
```

## 📊 Cost Breakdown

| Component | Monthly Cost |
|-----------|-------------|
| **RDS t4g.micro** | ~$10-12 |
| **20GB GP3 Storage** | ~$2-3 |
| **Total** | **~$12-15** |

**vs Aurora Serverless: $25+/month**

## 🔧 Technical Details

### Database Configuration
- **Instance**: `db.t4g.micro` (1 vCPU, 1 GB RAM)
- **Engine**: PostgreSQL 15.4
- **Storage**: 20GB GP3 (can scale to 65TB later)
- **Backups**: 7-day retention
- **Encryption**: At rest
- **Multi-AZ**: No (saves money, can enable later)

### Security
- ✅ **Not publicly accessible** (EC2 only)
- ✅ **VPC security groups** (port 5432 from EC2)
- ✅ **Encryption at rest**
- ✅ **Credentials in Secrets Manager**

### Performance
- **Perfect for MVP**: Handles 10,000+ queries/hour
- **Scales easily**: Can upgrade instance class anytime
- **ARM-based**: Better price/performance than x86

## 🎯 Scaling Path

As your app grows:

1. **More traffic**: Upgrade to `db.t4g.small` (~$25/month)
2. **More storage**: Add storage (pay per GB)
3. **High availability**: Enable Multi-AZ (~2x cost)
4. **Read replicas**: Add read-only replicas (~$12 each)

## 🔍 Monitoring & Maintenance

### Check RDS Status
```bash
aws rds describe-db-instances --db-instance-identifier epanotes-postgres
```

### View Logs
```bash
aws rds describe-db-log-files --db-instance-identifier epanotes-postgres
```

### Get Connection Info
```bash
aws secretsmanager get-secret-value --secret-id epanotes/rds/postgres
```

## 🚨 Troubleshooting

### Connection Issues
1. **Check security groups**: EC2 → RDS port 5432
2. **Verify VPC**: Both in same VPC
3. **Test connection**: Use `psql` from EC2

### Performance Issues
1. **Check CloudWatch metrics**: CPU, connections, IOPS
2. **Consider instance upgrade**: t4g.small for more power
3. **Optimize queries**: Use Django debug toolbar

### Cost Optimization
1. **Monitor storage**: Delete old backups if needed
2. **Right-size instance**: Start small, scale up
3. **Reserved instances**: 1-year commit saves 40%

## 📚 Next Steps

After setup:
1. ✅ **Test thoroughly**: All features working
2. ✅ **Monitor costs**: Set up billing alerts
3. ✅ **Plan scaling**: Know your upgrade path
4. ✅ **Backup strategy**: Verify automated backups
5. ✅ **Documentation**: Update team on new setup

---

**Questions?** Check AWS RDS documentation or contact support.
