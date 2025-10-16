# EPAnotes Project Context Guide

🚨 **READ THIS FIRST** - Review this file before making any changes to avoid context mistakes!

## 🎯 Project Overview
**EPAnotes** is a medical training assessment system for tracking trainee performance via EPA (Entrustable Professional Activities) evaluations. It's designed for medical residency programs to assess residents on clinical competencies.

## 🏗️ Architecture Overview

### **Deployment Architecture**
- **Frontend**: Expo React Native app deployed on AWS Amplify (`app.epanotes.com`)
- **Backend**: Django REST API containerized with Docker on EC2 (`api.epanotes.com`)
- **Database**: Two-tier setup:
  - **Local Dev**: SQLite (`db.sqlite3`)
  - **Production**: PostgreSQL RDS (`db.t4g.micro` in same VPC as EC2)

### **Key Infrastructure**
- **EC2**: `52.200.99.7` (EPAnotes backend server)
- **Domain**: `epanotes.com` (frontend: `app.`, backend: `api.`)
- **HTTPS**: Let's Encrypt SSL certificates via Nginx
- **Email**: Amazon SES with IAM role authentication
- **Secrets**: AWS Secrets Manager for database credentials

## 🗄️ Database Schema Quick Reference

### **Critical Field Names** (Common Mistakes!)
- ✅ `AssessmentEPA.entrustment_level` (1-5) ← **THE RATING FIELD**
- ❌ NOT `milestone_level` (this doesn't exist!)
- ✅ `CoreCompetency.title` (NOT `name`)
- ✅ `User.program` (ForeignKey, NOT ManyToMany - single program per user)
- ✅ `User.deactivated_at` (DateTimeField, null = active)

### **Key Models**
```python
# User (Custom AbstractUser)
- id: UUID (PK)
- email: EmailField (unique)
- role: 'trainee', 'faculty', 'admin', 'leadership', 'system-admin'
- program: ForeignKey → Program (SINGLE program per user!)
- deactivated_at: DateTimeField (null = active)

# Assessment 
- trainee: ForeignKey → User (related_name='assessments_received')
- evaluator: ForeignKey → User (related_name='assessments_given')
- status: 'draft', 'submitted', 'locked'

# AssessmentEPA (The ratings!)
- assessment: ForeignKey → Assessment
- epa: ForeignKey → EPA  
- entrustment_level: IntegerField (1-5) ← THIS IS THE RATING!
```

## 🐍 Django Backend Structure

### **Apps & Purposes**
```
shiftnotes-backend/
├── config/           # Django settings, main URLs
├── users/           # Custom user model, auth, email service
├── organizations/   # Organizations, Programs, Sites
├── curriculum/      # Competencies, Sub-competencies, EPAs
├── assessments/     # Assessment creation and management
└── analytics/       # Program performance dashboard data
```

### **Key APIs** (`/api/`)
- `users/` - User CRUD, login, password reset
- `assessments/` - Assessment CRUD operations
- `analytics/program-performance/` - Dashboard metrics
- `core-competencies/`, `sub-competencies/`, `epas/` - Curriculum
- `programs/`, `organizations/`, `sites/` - Org structure

### **Authentication**
- Token-based auth (`rest_framework.authtoken`)
- Email as username (`EMAIL_FIELD = 'email'`)
- Custom user model with roles & single program assignment

## ⚛️ Expo Frontend Structure

### **Tech Stack**
- **Framework**: Expo (React Native for web/mobile)
- **UI Library**: Tamagui (cross-platform design system)
- **Navigation**: Custom sidebar navigation (no React Navigation)
- **Forms**: React Hook Form with validation
- **State**: React Context for auth, local state for everything else

### **Main Components**
```
shiftnotes-mobile/
├── App.tsx                     # Main app with navigation logic
├── contexts/AuthContext.tsx    # Authentication state management
├── components/
│   ├── ui/                     # Reusable UI components (Sidebar, Header, etc.)
│   ├── admin/                  # Admin screens (UserManagement, etc.)
│   ├── analytics/              # ProgramPerformanceDashboard
│   ├── assessments/            # NewAssessmentForm
│   └── auth/                   # Login, password reset screens
└── lib/
    ├── api.ts                  # API client for Django backend
    └── types.ts                # TypeScript type definitions
```

### **Navigation Structure**
- **Route-based**: Uses string-based routing (`currentRoute` state)
- **Role-based menus**: Different nav items per user role
- **Responsive**: Permanent sidebar on desktop, modal on mobile

### **User Roles & Access**
- **trainee**: Overview, My Assessments
- **faculty**: + New Assessment  
- **admin/system-admin**: + User Management, EPA/Competency Management
- **leadership**: + Program Performance Dashboard

## 🚀 Deployment Process

### **Essential Scripts**
- `deploy-with-cleanup.sh` - **Main deployment script** (EC2 Docker deployment)
- `amplify.yml` - **Frontend deployment config** (AWS Amplify)
- `api.epanotes.com.nginx` - **Nginx configuration** (HTTPS proxy)

### **Deploy Backend (EC2)**
```bash
./deploy-with-cleanup.sh
# - Stops containers, cleans Docker, deploys new code
# - Handles Docker resource exhaustion on t3.micro
# - Uses ~/.ssh/shiftnotes-key.pem for SSH
```

### **Deploy Frontend (Amplify)**
```bash
# Automatically triggers on git push to main branch
# Uses amplify.yml configuration
# Builds from shiftnotes-mobile/ directory
```

## ⚠️ Common Pitfalls & Mistakes

### **Database Queries** 
❌ `assessment_epas__milestone_level` → ✅ `assessment_epas__entrustment_level`
❌ `trainee__programs=program` → ✅ `trainee__program=program` 
❌ `range(1, 7)` → ✅ `range(1, 6)` (entrustment levels are 1-5)
❌ `competency.name` → ✅ `competency.title`

### **User Model**
❌ `user.programs.all()` → ✅ `user.program` (single program now!)
❌ Checking `is_active` → ✅ Check `deactivated_at is None`

### **Frontend**
❌ Using React Navigation → ✅ Custom string-based routing
❌ Removing program dropdowns → ✅ Program is auto-determined from user

## 📊 Demo Data
- **Script**: `shiftnotes-backend/users/management/commands/create_demo_data.py`
- **Usage**: `python manage.py create_demo_data`
- **Accounts**: admin@demo.com, faculty@demo.com, trainee@demo.com (all `password123`)
- **Data**: 3 trainees, 60+ assessments, realistic competency distribution

## 🔧 Local Development

### **Backend**
```bash
cd shiftnotes-backend
python manage.py runserver  # Uses SQLite
```

### **Frontend** 
```bash
cd shiftnotes-mobile
npm start  # or expo start --web
```

### **Database**
- **Local**: SQLite (no setup needed)
- **Production**: PostgreSQL RDS (configured via AWS Secrets Manager)

## 🌐 Live URLs
- **Frontend**: https://app.epanotes.com
- **Backend API**: https://api.epanotes.com/api/
- **Admin Panel**: https://api.epanotes.com/admin/

---

💡 **Before making changes**: Always check SCHEMA_QUICK_REF.md for database field names and relationships!
