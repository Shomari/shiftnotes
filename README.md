# 🏥 ShiftNotes - Medical Training Assessment System

A progressive web app system for competency-based, EPA-driven trainee assessments completed after each shift, streamlining faculty documentation, trainee feedback, and leadership oversight.

## 🏗️ Architecture

**Mobile-First Design**
- **Frontend**: Expo React Native (iOS, Android, Web)
- **Backend**: Django REST API with PostgreSQL
- **Infrastructure**: AWS EC2 + Aurora RDS

## 📁 Repository Structure

```
shiftnotes/
├── shiftnotes-mobile/          # Expo React Native app
│   ├── components/             # React Native components
│   ├── contexts/              # React contexts (Auth)
│   ├── lib/                   # API client and utilities
│   └── package.json           # Mobile dependencies
├── shiftnotes-backend/        # Django REST API
│   ├── accounts/              # User authentication
│   ├── assessments/           # Core assessment models
│   ├── api/                   # API permissions
│   └── requirements.txt       # Python dependencies
├── aws-setup/                 # Infrastructure automation
│   ├── deploy-ec2.sh          # EC2 instance creation
│   ├── setup-aurora.sh        # Aurora RDS setup
│   └── deploy-code-fixed.sh   # Code deployment
└── docs/                      # Documentation
    ├── DATABASE_SCHEMA.md     # Database schema
    ├── DEPLOYMENT_SUCCESS.md  # Deployment guide
    └── PRD.md                 # Product requirements
```

## 🚀 Quick Start

### Mobile App (Development)
```bash
cd shiftnotes-mobile
npm install
npx expo start
```

### Backend (Local Development)
```bash
cd shiftnotes-backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Production Deployment
```bash
# Deploy to AWS EC2
cd aws-setup
./deploy-ec2.sh
./deploy-code-fixed.sh
```

## 🔑 Key Features

- **Role-Based Authentication** (Faculty, Trainee, Admin, Leadership)
- **EPA Assessment Creation** with entrustment levels and feedback
- **Real-time Progress Tracking** for trainees and cohorts
- **Mobile-First Design** for clinical environments
- **HIPAA-Compliant** data handling and audit trails

## 🌐 Live Environment

- **API**: http://44.197.181.141:8000/api/v1/
- **Admin**: http://44.197.181.141:8000/admin/
- **Mobile App**: Accessible via Expo Go or web build

## 📖 Documentation

- [Database Schema](DATABASE_SCHEMA.md) - Complete database documentation
- [Deployment Guide](DEPLOYMENT_SUCCESS.md) - AWS deployment instructions
- [Product Requirements](PRD.md) - Feature specifications and requirements

## 🛠️ Technology Stack

**Frontend (Mobile)**
- Expo React Native
- TypeScript
- Tamagui UI
- React Navigation
- AsyncStorage

**Backend (API)**
- Django 3.2
- Django REST Framework
- PostgreSQL (Aurora)
- JWT Authentication

**Infrastructure**
- AWS EC2 (t3.micro)
- AWS Aurora PostgreSQL
- AWS Secrets Manager
- systemd service management

## 🔐 Security & Compliance

- Role-based access control
- Encrypted data storage
- Audit trail logging
- HIPAA-compliant infrastructure
- Secure API token authentication

## 📱 Mobile App Features

- Cross-platform (iOS, Android, Web)
- Offline-capable assessments
- Touch-optimized interface
- Real-time sync with backend
- Push notifications (planned)

## 🏥 Medical Education Focus

- **EPA-Driven**: Based on Entrustable Professional Activities
- **Competency Tracking**: ACGME milestone integration
- **Clinical Workflow**: Designed for post-shift documentation
- **Multi-Role Support**: Faculty, trainees, and leadership

---

*Built for modern medical education with a focus on efficiency, transparency, and clinical excellence.*



