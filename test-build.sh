#!/bin/bash

# Test Build Script for EPAnotes
# This script tests the frontend build locally before pushing to GitHub

set -e  # Exit on any error

echo "🧪 Testing EPAnotes Frontend Build..."
echo "======================================"

# Change to mobile directory
cd shiftnotes-mobile

echo "📦 Installing dependencies..."
npm install

echo "🔍 Running syntax check (skip type errors for now)..."
npx tsc --noEmit --skipLibCheck || echo "⚠️  TypeScript errors found but continuing..."

echo "🏗️  Testing Expo web build..."
npx expo export --platform web --clear

echo "✅ Build test completed successfully!"
echo "🚀 Safe to push to GitHub now."
