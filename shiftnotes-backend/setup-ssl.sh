#!/bin/bash

# SSL Certificate Setup for EPAnotes Production

echo "🔒 Setting up SSL certificates for EPAnotes..."

# Create SSL directory
mkdir -p ssl/{certs,private}

# Generate self-signed certificate for development/testing
# In production, you'd want to use Let's Encrypt or a proper CA

echo "📜 Generating self-signed SSL certificate..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/private/epanotes.key \
    -out ssl/certs/epanotes.crt \
    -subj "/C=US/ST=MD/L=Baltimore/O=AptiTools/OU=EPAnotes/CN=44.197.181.141"

# Set proper permissions
chmod 600 ssl/private/epanotes.key
chmod 644 ssl/certs/epanotes.crt

echo "✅ SSL certificates generated successfully!"
echo ""
echo "🔧 Next steps:"
echo "1. Deploy the updated configuration to EC2"
echo "2. Run this script on EC2 to generate certificates"
echo "3. Restart Docker containers"
echo ""
echo "📝 Certificate details:"
echo "   - Certificate: ssl/certs/epanotes.crt"
echo "   - Private Key: ssl/private/epanotes.key"
echo "   - Valid for: 365 days"
echo "   - Domain: 44.197.181.141"
echo ""
echo "⚠️  Production Note:"
echo "   For production, replace with Let's Encrypt certificates using certbot"
