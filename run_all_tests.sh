#!/bin/bash
# Master test runner script
# Runs all tests for the entire ShiftNotes project (backend + mobile)

set -e  # Exit on any error

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   ShiftNotes Test Suite Runner        ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

# Track test failures
BACKEND_FAILED=0
MOBILE_FAILED=0

# Run backend tests
echo "┌────────────────────────────────────────┐"
echo "│ 1/2: Running Backend Tests            │"
echo "└────────────────────────────────────────┘"
echo ""

cd "$PROJECT_ROOT/shiftnotes-backend"
if bash run_tests.sh; then
    echo "✓ Backend tests passed"
else
    echo "✗ Backend tests failed"
    BACKEND_FAILED=1
fi

echo ""
echo ""

# Run mobile tests
echo "┌────────────────────────────────────────┐"
echo "│ 2/2: Running Mobile Tests              │"
echo "└────────────────────────────────────────┘"
echo ""

cd "$PROJECT_ROOT/shiftnotes-mobile"
if bash run_tests.sh; then
    echo "✓ Mobile tests passed"
else
    echo "✗ Mobile tests failed"
    MOBILE_FAILED=1
fi

echo ""
echo ""

# Summary
echo "╔════════════════════════════════════════╗"
echo "║          Test Summary                  ║"
echo "╚════════════════════════════════════════╝"
echo ""

if [ $BACKEND_FAILED -eq 0 ] && [ $MOBILE_FAILED -eq 0 ]; then
    echo "✓ All tests passed successfully!"
    echo ""
    echo "Coverage Reports:"
    echo "  - Backend: shiftnotes-backend/htmlcov/index.html"
    echo "  - Mobile:  shiftnotes-mobile/coverage/lcov-report/index.html"
    echo ""
    exit 0
else
    echo "✗ Some tests failed:"
    if [ $BACKEND_FAILED -eq 1 ]; then
        echo "  - Backend tests failed"
    fi
    if [ $MOBILE_FAILED -eq 1 ]; then
        echo "  - Mobile tests failed"
    fi
    echo ""
    exit 1
fi

