# Testing Guide for ShiftNotes

This guide covers how to run, write, and maintain tests for the ShiftNotes project.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Backend Testing (Django)](#backend-testing-django)
- [Mobile Testing (React Native)](#mobile-testing-react-native)
- [Writing Tests](#writing-tests)
- [Test Coverage Goals](#test-coverage-goals)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

---

## Overview

ShiftNotes uses comprehensive unit testing to ensure code quality and prevent regressions:

- **Backend**: Django REST Framework with pytest
- **Mobile**: React Native with Jest and React Testing Library
- **Coverage Target**: 60-70% for critical paths and core functionality

All tests run automatically before deployment to catch issues early.

---

## Quick Start

### Choose Your Testing Approach

**Option 1: Host-Based Testing (Recommended for Development)**
- ⚡ Faster execution
- 🐛 Easier debugging
- Uses SQLite for tests

**Option 2: Docker-Based Testing (Closer to Production)**
- 🐳 Uses PostgreSQL in Docker
- 📦 Matches production environment
- Requires Docker installed

### Run All Tests

**Host-based (fast)**:
```bash
./run_all_tests.sh
```

**Docker-based (production-like)**:
```bash
./run_all_tests_docker.sh
```

### Run Backend Tests Only

**Host-based**:
```bash
cd shiftnotes-backend
./run_tests.sh
```

**Docker-based**:
```bash
cd shiftnotes-backend
./run_tests_docker.sh
```

### Run Mobile Tests Only

```bash
cd shiftnotes-mobile
./run_tests.sh
```

*Note: Mobile tests always run on host (Node.js), not in Docker*

---

## When to Use Which Approach

### Use Host-Based Testing When:
- ✅ Developing new features (fastest feedback loop)
- ✅ Debugging test failures (easier access to debugger)
- ✅ Running tests frequently during development
- ✅ You don't have Docker installed
- ✅ You want 5-10 second test runs

### Use Docker-Based Testing When:
- ✅ Testing database-specific behavior
- ✅ Running in CI/CD pipeline
- ✅ Validating production environment parity
- ✅ Before major deployments
- ✅ You want to catch PostgreSQL-specific issues

**Recommendation**: Use **host-based** for daily development, **Docker-based** for final validation before deployment.

---

## Backend Testing (Django)

### Docker vs Host Testing

**Host-Based Testing** (Default):
- Tests run on your local machine
- Uses SQLite for test database (fast, in-memory)
- Requires Python and pip installed locally
- Best for rapid development and debugging

**Docker-Based Testing**:
- Tests run inside Docker containers
- Uses PostgreSQL (same as production)
- Requires Docker and Docker Compose
- Best for CI/CD and production parity

### Setup

**For host-based testing**:

1. **Install dependencies**:
   ```bash
   cd shiftnotes-backend
   pip install -r requirements-test.txt
   ```

2. **Dependencies include**:
   - pytest - Test framework
   - pytest-django - Django integration
   - pytest-cov - Coverage reporting
   - factory-boy - Test data factories
   - faker - Fake data generation

**For Docker-based testing**:

1. **Install Docker**:
   - [Docker Desktop](https://www.docker.com/products/docker-desktop)

2. **No other setup needed** - Docker handles everything

### Running Tests

**Quick test run (host-based)**:
```bash
./run_tests.sh
```

**Docker-based testing (uses PostgreSQL)**:
```bash
./run_tests_docker.sh
```

**Manual pytest (host-based)**:
```bash
pytest --cov=. --cov-report=term-missing --cov-report=html
```

**Specific test file**:
```bash
pytest users/test_models.py
```

**Specific test class**:
```bash
pytest users/test_models.py::TestUserModel
```

**Specific test method**:
```bash
pytest users/test_models.py::TestUserModel::test_create_user_with_email
```

**With verbose output**:
```bash
pytest -v
```

**Stop on first failure**:
```bash
pytest -x
```

### Test Structure

```
shiftnotes-backend/
├── conftest.py                    # Shared fixtures and factories
├── pytest.ini                     # Pytest configuration
├── requirements-test.txt          # Test dependencies
├── .coveragerc                    # Coverage configuration
├── users/
│   ├── test_models.py            # User model tests
│   └── test_views.py             # User API tests
├── assessments/
│   ├── test_models.py            # Assessment model tests
│   └── test_views.py             # Assessment API tests
├── organizations/
│   └── test_models.py            # Organization model tests
└── curriculum/
    └── test_models.py            # Curriculum model tests
```

### Key Test Files

- **`conftest.py`**: Contains reusable fixtures and factory classes
- **`test_models.py`**: Tests for database models (validation, methods, properties)
- **`test_views.py`**: Tests for API endpoints (permissions, CRUD operations, filtering)

### Common Fixtures

Available in all tests via `conftest.py`:

- `api_client` - Unauthenticated API client
- `authenticated_client` - Client authenticated as trainee
- `faculty_client` - Client authenticated as faculty
- `admin_client` - Client authenticated as admin
- `organization` - Test organization
- `program` - Test program
- `cohort` - Test cohort
- `trainee_user` - Test trainee user
- `faculty_user` - Test faculty user
- `admin_user` - Test admin user
- `epa` - Test EPA
- `assessment` - Test assessment

### Factory Classes

Use factories to create test data:

```python
from conftest import UserFactory, AssessmentFactory, EPAFactory

# Create a trainee
trainee = UserFactory(role='trainee')

# Create an assessment
assessment = AssessmentFactory(
    trainee=trainee,
    status='submitted'
)

# Create multiple EPAs
epas = EPAFactory.create_batch(5, program=program)
```

---

## Mobile Testing (React Native)

### Setup

1. **Install dependencies**:
   ```bash
   cd shiftnotes-mobile
   npm install
   ```

2. **Dependencies include**:
   - jest - Test framework
   - @testing-library/react-native - React Native testing utilities
   - @testing-library/jest-native - Custom matchers
   - react-test-renderer - React renderer for tests

### Running Tests

**All tests with coverage**:
```bash
npm test -- --coverage --watchAll=false
```

**Watch mode** (re-runs on file changes):
```bash
npm test
```

**Specific test file**:
```bash
npm test lib/__tests__/api.test.ts
```

**Update snapshots**:
```bash
npm test -- -u
```

### Test Structure

```
shiftnotes-mobile/
├── jest.config.js                 # Jest configuration
├── jest.setup.js                  # Test setup and mocks
├── lib/
│   └── __tests__/
│       └── api.test.ts           # API client tests
├── contexts/
│   └── __tests__/
│       └── AuthContext.test.tsx  # Auth context tests
└── components/
    ├── __tests__/
    │   └── LoginScreen.test.tsx  # LoginScreen tests
    └── ui/
        └── __tests__/
            ├── Button.test.tsx    # Button component tests
            └── Input.test.tsx     # Input component tests
```

### Testing Patterns

**Component testing**:
```typescript
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

test('should call onPress when pressed', () => {
  const mockOnPress = jest.fn();
  const { getByText } = render(
    <Button onPress={mockOnPress}>Click Me</Button>
  );
  
  fireEvent.press(getByText('Click Me'));
  
  expect(mockOnPress).toHaveBeenCalled();
});
```

**Context testing**:
```typescript
import { render, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../AuthContext';

const TestComponent = () => {
  const { user, login } = useAuth();
  return <Text>{user?.email}</Text>;
};

test('should login successfully', async () => {
  const { getByText } = render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  );
  
  // Test implementation...
});
```

**API testing**:
```typescript
import { apiClient } from '../api';

test('should fetch users', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ results: [] }),
  });
  
  const result = await apiClient.getUsers();
  
  expect(result.results).toEqual([]);
});
```

### Mocked Modules

The following are automatically mocked in `jest.setup.js`:

- `AsyncStorage` - Local storage
- `fetch` - Network requests
- React Native native modules

---

## Writing Tests

### Best Practices

1. **Test Behavior, Not Implementation**
   - Focus on what the code does, not how it does it
   - Test user-facing functionality

2. **Use Descriptive Test Names**
   ```python
   # Good
   def test_trainee_cannot_create_assessment():
       ...
   
   # Bad
   def test_assessment():
       ...
   ```

3. **Follow AAA Pattern**
   - **Arrange**: Set up test data
   - **Act**: Execute the code being tested
   - **Assert**: Verify the results

4. **Keep Tests Independent**
   - Each test should run in isolation
   - Use fixtures/factories for fresh data
   - Don't rely on test execution order

5. **Test Edge Cases**
   - Empty inputs
   - Invalid data
   - Boundary conditions
   - Error scenarios

6. **Mock External Dependencies**
   - API calls
   - Email services
   - File operations
   - Time-dependent code

### What to Test

**Backend**:
- ✅ Model validation and constraints
- ✅ Model methods and properties
- ✅ API endpoint responses
- ✅ Authentication and permissions
- ✅ Program isolation (data access control)
- ✅ Filtering and querying
- ✅ Error handling

**Mobile**:
- ✅ Component rendering
- ✅ User interactions (button clicks, form inputs)
- ✅ API calls and error handling
- ✅ Context state management
- ✅ Navigation flows
- ✅ Form validation
- ✅ Loading and error states

### What NOT to Test

- ❌ Third-party library internals
- ❌ Django/React framework code
- ❌ Trivial getters/setters
- ❌ Database migrations
- ❌ Configuration files

---

## Test Coverage Goals

### Target Coverage

- **Backend**: 60-70% line coverage
- **Mobile**: 60-70% line coverage

### Priority Areas (Must Have High Coverage)

**Backend**:
1. User authentication and permissions
2. Assessment CRUD operations
3. Program isolation logic
4. User management
5. Model validation

**Mobile**:
1. API client methods
2. Authentication context
3. Login flow
4. Critical user workflows

### Viewing Coverage Reports

**Backend**:
```bash
cd shiftnotes-backend
pytest --cov=. --cov-report=html
# Open htmlcov/index.html in browser
```

**Mobile**:
```bash
cd shiftnotes-mobile
npm test -- --coverage
# Open coverage/lcov-report/index.html in browser
```

---

## CI/CD Integration

### Pre-Deployment Testing

Tests run automatically before every deployment:

1. Developer runs `./deploy-with-cleanup.sh`
2. Script runs backend tests
3. If tests pass → Deployment proceeds
4. If tests fail → Deployment aborts

### Manual Test Run Before Deployment

Always run tests locally before pushing:

```bash
# Run all tests
./run_all_tests.sh

# Or run individually
cd shiftnotes-backend && ./run_tests.sh
cd shiftnotes-mobile && ./run_tests.sh
```

### Adding Tests to New Features

**Required**: Every new feature should include:
- Model tests (if new models)
- API endpoint tests (if new endpoints)
- Component tests (if new UI components)
- Integration tests for critical paths

**Recommended workflow**:
1. Write tests first (TDD approach)
2. Implement feature
3. Verify all tests pass
4. Check coverage report
5. Add more tests if coverage is low

---

## Troubleshooting

### Common Issues

#### Backend Tests

**Issue**: `ImportError: No module named 'pytest'`
```bash
pip install -r requirements-test.txt
```

**Issue**: `django.db.utils.OperationalError: no such table`
```bash
# Tests use a separate test database
# This is usually auto-created, but you can force it:
pytest --create-db
```

**Issue**: Tests hanging or slow
```bash
# Use --reuse-db to speed up tests
pytest --reuse-db

# Or add to pytest.ini (already configured)
```

**Issue**: Factory errors
```bash
# Make sure all required fields are provided
# Check factory relationships match model relationships
```

#### Mobile Tests

**Issue**: `Cannot find module 'AsyncStorage'`
```bash
# Already mocked in jest.setup.js
# Make sure jest.config.js has setupFilesAfterEnv configured
```

**Issue**: `fetch is not defined`
```bash
# Already mocked in jest.setup.js
# Global fetch mock is available
```

**Issue**: `invariant violation` or React Native errors
```bash
# Clear cache
npm test -- --clearCache

# Reinstall node_modules
rm -rf node_modules
npm install
```

**Issue**: Tests passing locally but failing in CI
```bash
# Check for timezone issues
# Check for hardcoded paths
# Check for race conditions
```

### Getting Help

1. **Check test output** - Error messages usually indicate the problem
2. **Run with verbose flag** - `pytest -v` or `npm test -- --verbose`
3. **Check coverage report** - Might reveal untested code paths
4. **Review similar tests** - Look at existing tests for patterns
5. **Read test documentation** - pytest and Jest have excellent docs

---

## Example Test Templates

### Backend Model Test

```python
@pytest.mark.django_db
class TestMyModel:
    def test_create_instance(self):
        """Test creating a model instance"""
        instance = MyModelFactory(name='Test')
        assert instance.name == 'Test'
        assert instance.id is not None
    
    def test_validation(self):
        """Test model validation"""
        with pytest.raises(ValidationError):
            instance = MyModel(invalid_field='bad')
            instance.full_clean()
```

### Backend API Test

```python
@pytest.mark.django_db
class TestMyAPIView:
    def test_list_endpoint(self, authenticated_client):
        """Test listing resources"""
        url = reverse('mymodel-list')
        response = authenticated_client.get(url)
        
        assert response.status_code == 200
        assert 'results' in response.data
    
    def test_create_endpoint(self, authenticated_client):
        """Test creating a resource"""
        url = reverse('mymodel-list')
        data = {'name': 'Test'}
        response = authenticated_client.post(url, data, format='json')
        
        assert response.status_code == 201
        assert response.data['name'] == 'Test'
```

### Mobile Component Test

```typescript
describe('MyComponent', () => {
  it('should render correctly', () => {
    const { getByText } = render(<MyComponent />);
    expect(getByText('Hello')).toBeTruthy();
  });
  
  it('should handle button press', () => {
    const mockFn = jest.fn();
    const { getByText } = render(<MyComponent onPress={mockFn} />);
    
    fireEvent.press(getByText('Click'));
    expect(mockFn).toHaveBeenCalled();
  });
});
```

---

## Continuous Improvement

### Monitoring Test Health

- Review coverage reports regularly
- Fix flaky tests immediately
- Keep test execution time reasonable (<5 minutes total)
- Update tests when requirements change
- Remove obsolete tests

### Adding Tests for Bugs

When a bug is found:
1. Write a test that reproduces the bug
2. Verify test fails
3. Fix the bug
4. Verify test passes
5. Commit both test and fix

This prevents regression.

---

## Resources

- [pytest Documentation](https://docs.pytest.org/)
- [Django Testing](https://docs.djangoproject.com/en/stable/topics/testing/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)

---

## Summary

✅ **Always run tests before deploying**  
✅ **Write tests for new features**  
✅ **Keep tests fast and focused**  
✅ **Aim for 60-70% coverage on critical paths**  
✅ **Fix failing tests immediately**  

Happy testing! 🧪

