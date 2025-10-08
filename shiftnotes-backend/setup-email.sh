#!/bin/bash
# Quick setup script for email configuration

echo "🔧 EPAnotes Email Setup"
echo "======================="
echo ""
echo "This script will help you configure AWS SES for local development."
echo ""

# Check if .env already exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists. Backing it up to .env.backup"
    cp .env .env.backup
fi

# Prompt for credentials
echo "Please enter your AWS SES SMTP credentials:"
echo "(Get these from AWS Console > SES > SMTP Settings > Create SMTP Credentials)"
echo ""

read -p "SMTP Username: " smtp_user
read -sp "SMTP Password: " smtp_pass
echo ""
echo ""

# Create .env file
cat > .env << EOF
# Enable real email sending in development
USE_REAL_EMAIL=True

# AWS SES SMTP Configuration
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_HOST_USER=$smtp_user
EMAIL_HOST_PASSWORD=$smtp_pass
EOF

echo "✅ .env file created successfully!"
echo ""
echo "Next steps:"
echo "1. Restart Docker: docker-compose down && docker-compose up -d"
echo "2. Test email: docker-compose exec web python manage.py test_email"
echo ""
echo "📧 Emails will be sent from: support@epanotes.com"
echo "📬 Test email will go to: shomari.ewing@gmail.com"
