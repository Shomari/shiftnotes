#!/bin/bash
# Master test runner script (Docker version)
# Runs backend tests in Docker, mobile tests on host

set -e

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   ShiftNotes Test Suite (Docker)       ║"
echo "╚════════════════════════════════════════╝"
echo ""

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

BACKEND_FAILED=0
MOBILE_FAILED=0

# Run backend tests in Docker
echo "┌────────────────────────────────────────┐"
echo "│ 1/2: Running Backend Tests (Docker)   │"
echo "└────────────────────────────────────────┘"
echo ""

cd "$PROJECT_ROOT/shiftnotes-backend"
if bash run_tests_docker.sh; then
    echo "✓ Backend tests passed"
else
    echo "✗ Backend tests failed"
    BACKEND_FAILED=1
fi

echo ""
echo ""

# Run mobile tests on host (no Docker needed)
echo "┌────────────────────────────────────────┐"
echo "│ 2/2: Running Mobile Tests (Host)      │"
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

