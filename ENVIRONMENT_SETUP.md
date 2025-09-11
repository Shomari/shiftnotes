# Environment Setup for EPAnotes

This document explains how the app automatically connects to the right database based on the environment.

## 📋 How It Works

The app uses **automatic environment detection** to connect to the appropriate backend:

- **🏠 Local Development**: Uses `localhost:8000` with SQLite database
- **🚀 Production**: Uses EC2 instance with RDS database

## 🔧 Configuration Files

### `shiftnotes-mobile/env.config.js`
Main configuration file that manages environment detection:

```javascript
const ENV = {
  development: {
    API_BASE_URL: 'http://localhost:8000/api',  // Local Django with SQLite
    ENV_NAME: 'development',
    DEBUG: true,
  },
  production: {
    API_BASE_URL: 'http://44.197.181.141:8001/api', // EC2 with RDS
    ENV_NAME: 'production', 
    DEBUG: false,
  }
};
```

### Environment Detection Logic:
1. **NODE_ENV environment variable** (if explicitly set)
2. **Expo __DEV__ flag** (when running in development)
3. **Defaults to production** (for safety)

## 🚀 Running Local Development

### Option 1: Use the Local Development Script
```bash
# From project root
./start-local-dev.sh
```

This script will:
- Set up Python virtual environment
- Install dependencies 
- Run Django migrations
- Create test data
- Start Django on `localhost:8000`

### Option 2: Manual Setup
```bash
# Backend setup
cd shiftnotes-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-local.txt
python manage.py migrate
python manage.py create_complete_test_data
python manage.py runserver 127.0.0.1:8000

# Frontend setup (new terminal)
cd shiftnotes-mobile  
npm start
```

## 🌐 Production Deployment

When deployed to production (AWS Amplify, etc.), the app automatically detects it's not in development mode and uses the EC2/RDS endpoints.

## 🧪 Testing Configuration

To test the environment configuration:

```bash
cd shiftnotes-mobile
node test-env.js
```

## 📊 Database Differences

| Environment | Database | Location | Purpose |
|-------------|----------|----------|---------|
| Development | SQLite | Local file | Fast local development |
| Production | PostgreSQL | AWS RDS | Scalable, persistent data |

## 🔄 Switching Environments

The environment is detected automatically, but you can override it:

```bash
# Force development mode
NODE_ENV=development npm start

# Force production mode  
NODE_ENV=production npm start
```

## 📝 Demo Login Credentials

Both environments use the same demo credentials:

- **Admin**: `admin@johns-hopkins.com` / `demo`
- **Faculty**: `faculty@johns-hopkins.com` / `demo` 
- **Trainee**: `trainee@johns-hopkins.com` / `demo`
- **Leadership**: `leadership@johns-hopkins.com` / `demo`

## 🔍 Troubleshooting

### "Cannot connect to server"
- **Local**: Make sure Django is running on `localhost:8000`
- **Production**: Check EC2 instance is running

### "Network request failed"
- Check your internet connection
- Verify the correct API endpoint in browser
- Check firewall/antivirus settings

### "Database errors in local development"
- Delete `db.sqlite3` and run migrations again:
  ```bash
  rm db.sqlite3
  python manage.py migrate
  python manage.py create_complete_test_data
  ```

## 🎯 Next Steps

When ready for production deployment:
1. Set up your domain name
2. Update production API_BASE_URL in `env.config.js`
3. Deploy to AWS Amplify or your preferred platform
4. The app will automatically use production configuration
