#!/bin/bash
# Mobile app test runner script
# Runs all React Native / Jest tests

set -e  # Exit on error

echo "========================================="
echo "Running Mobile Tests (Jest)"
echo "========================================="
echo ""

# Navigate to mobile directory
cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo ""
echo "Running Jest tests with coverage..."
echo ""

# Run Jest with coverage
npm test -- \
    --coverage \
    --watchAll=false \
    --verbose \
    --colors

echo ""
echo "========================================="
echo "Mobile Tests Complete!"
echo "========================================="
echo ""
echo "Coverage report saved to: coverage/lcov-report/index.html"
echo ""

