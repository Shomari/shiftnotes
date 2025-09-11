#!/bin/bash

# Simple Python 3.13 installation with SSL support on EC2
# This script focuses on getting SSL working properly

set -e  # Exit on any error

# Configuration
EC2_HOST="44.197.181.141"
EC2_USER="ec2-user"
EC2_KEY_PATH="/Users/shomariewing/.ssh/shiftnotes-key.pem"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Install Python 3.13 with SSL support
install_python_3_13() {
    log_info "Installing Python 3.13 with SSL support on EC2..."
    
    ssh -i "$EC2_KEY_PATH" "$EC2_USER@$EC2_HOST" << 'EOF'
        echo "=== Updating system packages ==="
        sudo yum update -y
        
        echo "=== Installing essential build tools ==="
        sudo yum groupinstall -y "Development Tools"
        sudo yum install -y openssl-devel openssl-static libffi-devel zlib-devel readline-devel sqlite-devel wget curl gcc gcc-c++ make
        
        echo "=== Installing additional required libraries ==="
        sudo yum install -y expat-devel libuuid-devel libdb-devel gdbm-devel ncurses-devel xz-devel tk-devel tcl-devel
        
        echo "=== Downloading Python 3.13.1 ==="
        cd /tmp
        wget https://www.python.org/ftp/python/3.13.1/Python-3.13.1.tgz
        tar xzf Python-3.13.1.tgz
        cd Python-3.13.1
        
        echo "=== Configuring Python with SSL support ==="
        # Simple configuration focused on SSL
        ./configure \
            --enable-optimizations \
            --with-ensurepip=install \
            --with-openssl=/usr \
            --enable-shared \
            --enable-loadable-sqlite-extensions
        
        echo "=== Compiling Python (this may take several minutes) ==="
        # Use single thread to avoid memory issues
        make -j 1
        
        echo "=== Installing Python 3.13.1 ==="
        sudo make altinstall
        
        echo "=== Creating symlinks ==="
        sudo ln -sf /usr/local/bin/python3.13 /usr/local/bin/python3
        sudo ln -sf /usr/local/bin/python3.13 /usr/local/bin/python
        sudo ln -sf /usr/local/bin/pip3.13 /usr/local/bin/pip3
        sudo ln -sf /usr/local/bin/pip3.13 /usr/local/bin/pip
        
        echo "=== Updating shared library cache ==="
        sudo ldconfig
        
        echo "=== Verifying Python installation ==="
        python3 --version
        pip3 --version
        
        echo "=== Testing SSL support ==="
        python3 -c "import ssl; print('SSL version:', ssl.OPENSSL_VERSION); print('SSL support: OK')"
        
        echo "=== Testing pip connectivity ==="
        pip3 install --upgrade pip setuptools wheel
        
        echo "=== Testing package installation ==="
        pip3 install requests
        
        echo "=== Python 3.13.1 with SSL support installed successfully ==="
EOF
    
    log_success "Python 3.13.1 with SSL support installed"
}

# Main function
main() {
    echo ""
    echo "🐍 Installing Python 3.13.1 with SSL Support on EC2"
    echo "=================================================="
    echo ""
    
    install_python_3_13
    
    echo ""
    log_success "🎉 Python 3.13.1 with SSL support installed successfully!"
    echo ""
    echo "📊 Next steps:"
    echo "   1. Update the deployment script to use Python 3.13"
    echo "   2. Run the deployment script to redeploy with Python 3.13"
    echo "   3. Test that pip can install packages from PyPI"
    echo ""
    echo "=================================================="
}

main "$@"
