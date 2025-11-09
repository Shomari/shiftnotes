#!/bin/bash
# Docker-based test runner for backend
# Uses PostgreSQL in Docker (closer to production)

set -e

echo "========================================="
echo "Running Backend Tests (Docker + PostgreSQL)"
echo "========================================="
echo ""

# Navigate to backend directory
cd "$(dirname "$0")"

echo "Starting test database container..."
docker-compose -f docker-compose.test.yml up -d test-db

echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Check if database is actually ready
echo "Verifying database connection..."
for i in {1..30}; do
    if docker-compose -f docker-compose.test.yml exec -T test-db pg_isready -U shiftnotes_test > /dev/null 2>&1; then
        echo "✓ Database is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "✗ Database failed to start in time"
        docker-compose -f docker-compose.test.yml down -v
        exit 1
    fi
    sleep 1
done

echo ""
echo "Installing test dependencies and running tests..."
echo ""

# Run tests in container
docker-compose -f docker-compose.test.yml run --rm test

# Capture exit code
TEST_EXIT_CODE=$?

echo ""
echo "Cleaning up test containers..."
docker-compose -f docker-compose.test.yml down -v

echo ""
echo "========================================="
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ Backend Tests Complete (Docker)!"
else
    echo "❌ Backend Tests Failed (Docker)!"
fi
echo "========================================="
echo ""

exit $TEST_EXIT_CODE

