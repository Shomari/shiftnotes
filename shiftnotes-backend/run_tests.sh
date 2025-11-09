#!/bin/bash
# Backend test runner script
# Runs all Django backend tests with pytest

set -e  # Exit on error

echo "========================================="
echo "Running Backend Tests (Django + Pytest)"
echo "========================================="
echo ""

# Navigate to backend directory
cd "$(dirname "$0")"

# Check if virtual environment exists and activate it
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
elif [ -d ".venv" ]; then
    echo "Activating virtual environment..."
    source .venv/bin/activate
fi

# Install test dependencies if needed
if ! python -c "import pytest" 2>/dev/null; then
    echo "Installing test dependencies..."
    pip install -r requirements-test.txt
fi

echo ""
echo "Running pytest with coverage..."
echo ""

# Run pytest with coverage
pytest \
    --verbose \
    --cov=. \
    --cov-report=term-missing \
    --cov-report=html:htmlcov \
    --cov-config=.coveragerc \
    --tb=short \
    --color=yes

echo ""
echo "========================================="
echo "Backend Tests Complete!"
echo "========================================="
echo ""
echo "Coverage report saved to: htmlcov/index.html"
echo ""

