#!/bin/bash
# Setup AWS Secrets Manager secret for SES SMTP credentials

echo "🔐 Setting up SES SMTP credentials in AWS Secrets Manager"
echo "=========================================================="
echo ""
echo "This will store your SES SMTP credentials in AWS Secrets Manager"
echo "for production use on EC2."
echo ""

read -p "SMTP Username: " smtp_user
read -sp "SMTP Password: " smtp_pass
echo ""
echo ""

# Create the secret in AWS Secrets Manager
aws secretsmanager create-secret \
    --name "epanotes/email/smtp" \
    --description "SES SMTP credentials for EPAnotes email sending" \
    --secret-string "{\"smtp_username_epanotes\":\"$smtp_user\",\"smtp_password_epanotes\":\"$smtp_pass\"}" \
    --region us-east-1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Secret created successfully in AWS Secrets Manager!"
    echo ""
    echo "Production EC2 will now:"
    echo "  - Automatically retrieve these credentials"
    echo "  - Send emails from: support@epanotes.com"
    echo "  - Use Amazon SES SMTP"
    echo ""
    echo "Note: Make sure your EC2 instance IAM role has permission to read Secrets Manager"
else
    echo ""
    echo "❌ Failed to create secret"
    echo ""
    echo "If secret already exists, update it instead:"
    echo "aws secretsmanager update-secret --secret-id epanotes/email/smtp --secret-string '{\"smtp_username_epanotes\":\"$smtp_user\",\"smtp_password_epanotes\":\"$smtp_pass\"}' --region us-east-1"
fi
