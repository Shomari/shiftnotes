#!/bin/bash

# Quick HTTPS tunnel setup for EPAnotes backend
# This creates an HTTPS endpoint for the HTTP backend

echo "🚀 Setting up HTTPS tunnel for EPAnotes backend..."

# Install cloudflared on EC2
echo "📦 Installing cloudflared tunnel..."

ssh -i ~/.ssh/shiftnotes-key.pem ec2-user@44.197.181.141 '
    # Download and install cloudflared
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i cloudflared-linux-amd64.deb || sudo apt-get install -f -y
    
    # Create tunnel to local Django app
    echo "🔗 Starting HTTPS tunnel to localhost:8001..."
    
    # Kill any existing tunnel
    sudo pkill cloudflared || true
    
    # Start tunnel in background
    nohup cloudflared tunnel --url http://localhost:8001 > /tmp/cloudflared.log 2>&1 &
    
    # Wait a moment for tunnel to start
    sleep 5
    
    # Extract the tunnel URL
    TUNNEL_URL=$(grep -o "https://[^[:space:]]*\.trycloudflare\.com" /tmp/cloudflared.log | head -1)
    
    echo "✅ Tunnel started!"
    echo "🔗 HTTPS URL: $TUNNEL_URL"
    echo "📝 Full API URL: $TUNNEL_URL/api"
    echo ""
    echo "💡 Update your frontend to use: $TUNNEL_URL/api"
    echo ""
    echo "🔍 Tunnel logs: tail -f /tmp/cloudflared.log"
'

echo "🎯 Next steps:"
echo "1. Copy the HTTPS URL from above"
echo "2. Update env.config.js with the new HTTPS URL"
echo "3. Redeploy your Amplify app"
echo ""
echo "⚠️  Note: The tunnel URL changes each restart. For production, set up a proper domain."
