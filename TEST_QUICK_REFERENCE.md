# Test Suite Quick Reference

## TL;DR - How to Run Tests

### Fastest (Host-Based) - Recommended for Development
```bash
# All tests
./run_all_tests.sh

# Backend only
cd shiftnotes-backend && ./run_tests.sh

# Mobile only
cd shiftnotes-mobile && ./run_tests.sh
```

### Docker-Based - Recommended Before Deployment
```bash
# All tests
./run_all_tests_docker.sh

# Backend only
cd shiftnotes-backend && ./run_tests_docker.sh
```

---

## What's the Difference?

### Host-Based Testing (Default)
- **Speed**: ⚡⚡⚡ Lightning fast (5-10 seconds)
- **Database**: SQLite (in-memory)
- **Environment**: Your local machine
- **Setup**: `pip install -r requirements-test.txt`
- **When**: Daily development, rapid iteration

### Docker-Based Testing
- **Speed**: 🐢 Slower (30-60 seconds)
- **Database**: PostgreSQL (same as production)
- **Environment**: Docker containers
- **Setup**: Just need Docker installed
- **When**: Before deployment, CI/CD, final validation

---

## Do Tests Need Docker?

**Short answer: No** (but you can use Docker if you want)

### Why Tests Run Outside Docker

1. **Speed** - No container startup time
2. **Simplicity** - Just Python/Node installed
3. **Standard practice** - Django/Jest tests typically run on host
4. **Development workflow** - Instant feedback while coding

### Your Dockerized App Still Works Fine

- **Production**: Runs in Docker with PostgreSQL ✅
- **Tests**: Run on host with SQLite ✅
- **No conflict**: Django ORM abstracts database differences

### When You Might Want Docker Tests

- ✅ Testing PostgreSQL-specific features (e.g., JSON fields, full-text search)
- ✅ Exact production environment simulation
- ✅ CI/CD pipeline (GitHub Actions, GitLab CI, etc.)
- ✅ Final validation before deployment

---

## Test Files Created

### Backend Tests
```
shiftnotes-backend/
├── conftest.py                    # Test fixtures & factories
├── pytest.ini                     # Pytest config
├── run_tests.sh                   # Host-based runner ⚡
├── run_tests_docker.sh           # Docker-based runner 🐳
├── docker-compose.test.yml       # Docker test config
├── users/test_*.py               # User tests
├── assessments/test_*.py         # Assessment tests
├── organizations/test_*.py       # Organization tests
└── curriculum/test_*.py          # Curriculum tests
```

### Mobile Tests
```
shiftnotes-mobile/
├── jest.config.js                # Jest config
├── jest.setup.js                 # Test mocks
├── run_tests.sh                  # Test runner
├── lib/__tests__/                # API tests
├── contexts/__tests__/           # Context tests
└── components/__tests__/         # Component tests
```

---

## Pre-Deployment Testing

**Current deployment script runs host-based tests**:
```bash
./deploy-with-cleanup.sh
# ↳ Runs backend tests before deploying
# ↳ Aborts if tests fail
```

**To use Docker tests instead**, edit `deploy-with-cleanup.sh`:
```bash
# Change this line:
cd shiftnotes-backend && bash run_tests.sh

# To this:
cd shiftnotes-backend && bash run_tests_docker.sh
```

---

## Troubleshooting

### Host-Based Tests

**Problem**: `ImportError: No module named 'pytest'`
```bash
cd shiftnotes-backend
pip install -r requirements-test.txt
```

**Problem**: Tests are slow
```bash
# Already configured for speed:
# - Uses SQLite (in-memory)
# - Reuses test DB (--reuse-db in pytest.ini)
```

### Docker-Based Tests

**Problem**: `Cannot connect to Docker daemon`
```bash
# Make sure Docker Desktop is running
open -a Docker
```

**Problem**: Tests timeout or hang
```bash
# Clean up old containers
cd shiftnotes-backend
docker-compose -f docker-compose.test.yml down -v
```

**Problem**: Port conflicts
```bash
# Test DB uses random ports, shouldn't conflict
# But you can change in docker-compose.test.yml if needed
```

---

## Best Practice Workflow

### During Development (Fast Iteration)
```bash
# Make code changes...
./run_all_tests.sh        # Quick validation
# Continue coding...
```

### Before Committing
```bash
./run_all_tests.sh        # Ensure all tests pass
git add .
git commit -m "Add feature"
```

### Before Deploying
```bash
./run_all_tests_docker.sh # Final validation with PostgreSQL
./deploy-with-cleanup.sh  # Deploy if tests pass
```

---

## Coverage Reports

### Backend
```bash
cd shiftnotes-backend
./run_tests.sh
# Open: htmlcov/index.html
```

### Mobile
```bash
cd shiftnotes-mobile
./run_tests.sh
# Open: coverage/lcov-report/index.html
```

---

## Need More Info?

See full documentation: [`docs/TESTING.md`](docs/TESTING.md)

