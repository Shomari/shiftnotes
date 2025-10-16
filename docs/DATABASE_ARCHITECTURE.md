# EPAnotes Database Architecture

## 🎯 **Two-Environment Setup**

### 🖥️ **Local Development**
- **Database**: SQLite (`db.sqlite3`)
- **Location**: Your local machine
- **Purpose**: Development, testing, debugging
- **Cost**: Free
- **Setup**: No changes needed - works as before

### ☁️ **Production (EC2)**
- **Database**: PostgreSQL RDS (`db.t4g.micro`)
- **Location**: AWS RDS
- **Purpose**: Live application data
- **Cost**: ~$12-15/month
- **Setup**: Use provided scripts

## 🔧 **How It Works**

Django automatically chooses the database based on the `DEBUG` setting:

```python
if DEBUG:  # Local development
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:  # Production EC2
    # Use PostgreSQL RDS with credentials from AWS Secrets Manager
```

## 🚀 **Developer Workflow**

### Local Development (Unchanged)
```bash
# Same as always - uses SQLite
cd shiftnotes-backend
python manage.py runserver
python manage.py migrate
python manage.py create_demo_data
```

### Production Deployment
```bash
# Deploy to EC2 - automatically uses PostgreSQL
./deploy-to-ec2-fixed.sh
```

## 📊 **Data Flow**

```
┌─────────────────┐    ┌─────────────────┐
│ Local Dev       │    │ Production EC2  │
│                 │    │                 │
│ SQLite          │    │ PostgreSQL RDS  │
│ (db.sqlite3)    │    │ (t4g.micro)     │
│                 │    │                 │
│ DEBUG=True      │    │ DEBUG=False     │
│ Free            │    │ ~$12/month      │
└─────────────────┘    └─────────────────┘
```

## ✅ **Benefits**

- **Fast Local Development**: SQLite is perfect for development
- **Production-Ready**: PostgreSQL handles real workloads
- **Cost Effective**: Only pay for production database
- **Easy Testing**: Local data separate from production
- **Automatic**: Django handles the switching

## 🔄 **Data Sync**

- **Production → Local**: Export from RDS, import to SQLite (for debugging)
- **Local → Production**: Deploy code, run migrations on production
- **Demo Data**: Both environments can use `create_demo_data` command

---

**Bottom Line**: Your development workflow doesn't change at all. Production just gets a proper database!
