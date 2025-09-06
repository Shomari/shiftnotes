#!/bin/bash

# Aurora Cost Monitoring Script
# Helps track and optimize Aurora Serverless v2 costs

PROJECT_NAME="shiftnotes"
REGION="us-east-1"

echo "💰 Aurora Cost Monitoring for ShiftNotes"
echo "========================================"

# Get cluster status
CLUSTER_ID="${PROJECT_NAME}-aurora-cluster"
echo "📊 Cluster Status:"
aws rds describe-db-clusters \
    --db-cluster-identifier $CLUSTER_ID \
    --query 'DBClusters[0].{Status:Status,Engine:Engine,Capacity:ServerlessV2ScalingConfiguration}' \
    --output table \
    --region $REGION 2>/dev/null || echo "❌ Cluster not found"

echo ""

# Get current scaling configuration
echo "⚡ Current Scaling Configuration:"
aws rds describe-db-clusters \
    --db-cluster-identifier $CLUSTER_ID \
    --query 'DBClusters[0].ServerlessV2ScalingConfiguration' \
    --output table \
    --region $REGION 2>/dev/null || echo "❌ No scaling configuration found"

echo ""

# Get recent CloudWatch metrics (if available)
echo "📈 Recent Activity (Last 24 hours):"
END_TIME=$(date -u +"%Y-%m-%dT%H:%M:%S")
START_TIME=$(date -u -d '24 hours ago' +"%Y-%m-%dT%H:%M:%S")

echo "Checking CPU utilization..."
aws cloudwatch get-metric-statistics \
    --namespace AWS/RDS \
    --metric-name CPUUtilization \
    --dimensions Name=DBClusterIdentifier,Value=$CLUSTER_ID \
    --start-time $START_TIME \
    --end-time $END_TIME \
    --period 3600 \
    --statistics Average \
    --query 'Datapoints[?Average>`0`].{Time:Timestamp,CPU:Average}' \
    --output table \
    --region $REGION 2>/dev/null || echo "No CPU data available yet"

echo ""

# Cost optimization recommendations
echo "💡 Cost Optimization Tips:"
echo "========================="
echo "✅ Current setup is optimized for development:"
echo "   • Serverless v2 with 0.5-2.0 ACU scaling"
echo "   • Single instance (no replicas)"
echo "   • 7-day backup retention"
echo ""
echo "📊 Expected Monthly Costs:"
echo "   • Minimum (idle): ~$43/month (0.5 ACUs)"
echo "   • Light usage: ~$50-70/month"
echo "   • Active development: ~$80-120/month"
echo ""
echo "🔧 To reduce costs further:"
echo "   1. Pause development when not in use"
echo "   2. Use local PostgreSQL for initial development"
echo "   3. Monitor ACU usage and adjust max capacity"
echo ""

# Scaling adjustment functions
echo "⚙️  Quick Actions:"
echo "=================="
echo "To scale down to absolute minimum:"
echo "aws rds modify-db-cluster --db-cluster-identifier $CLUSTER_ID --serverlessv2-scaling-configuration MinCapacity=0.5,MaxCapacity=1.0 --region $REGION"
echo ""
echo "To scale up for active development:"
echo "aws rds modify-db-cluster --db-cluster-identifier $CLUSTER_ID --serverlessv2-scaling-configuration MinCapacity=0.5,MaxCapacity=4.0 --region $REGION"
echo ""
echo "To check current costs:"
echo "aws ce get-cost-and-usage --time-period Start=2024-08-01,End=2024-08-31 --granularity MONTHLY --metrics BlendedCost --group-by Type=DIMENSION,Key=SERVICE"



