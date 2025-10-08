"""
Django settings for shiftnotes_backend project.
Medical Training Assessment System
"""

from pathlib import Path
import os
import json
import boto3
from decouple import config

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-dev-key-change-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = ['44.197.181.141', 'localhost', '127.0.0.1', '192.168.86.20', 'main.d3c6p9x33k6b3.amplifyapp.com', 'app.epanotes.com', 'api.epanotes.com']

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'django_filters',
    
    # Local apps
    'users',
    'organizations', 
    'curriculum',
    'assessments',
    'analytics',
]

AUTH_USER_MODEL = 'users.User'

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database Configuration
# Local Development: SQLite (DEBUG=True)
# Production EC2: PostgreSQL RDS (DEBUG=False)

if DEBUG:
    # Development - SQLite
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    # Production EC2 - PostgreSQL RDS
    def get_secret(secret_name):
        """Get secret from AWS Secrets Manager."""
        try:
            session = boto3.Session()
            client = session.client('secretsmanager', region_name='us-east-1')
            response = client.get_secret_value(SecretId=secret_name)
            return json.loads(response['SecretString'])
        except Exception as e:
            print(f"Error retrieving secret {secret_name}: {e}")
            return None

    # Try to get database credentials from Secrets Manager
    db_credentials = get_secret("epanotes/rds/postgres")
    if db_credentials:
        DB_HOST = db_credentials.get('host')
        DB_NAME = db_credentials.get('dbname', 'epanotes')
        DB_USER = db_credentials.get('username', 'postgres')
        DB_PASSWORD = db_credentials.get('password', '')
    else:
        # Fallback to environment variables
        DB_HOST = config('DB_HOST', default='shiftnotes-aurora-public.cluster-czz7iet4urq4.us-east-1.rds.amazonaws.com')
        DB_NAME = config('DB_NAME', default='shiftnotes')
        DB_USER = config('DB_USER', default='shiftnotes_admin')
        DB_PASSWORD = config('DB_PASSWORD', default='85jfFs5JDDFDKpviBf28vsFvQ')

    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': DB_NAME,
            'USER': DB_USER,
            'PASSWORD': DB_PASSWORD,
            'HOST': DB_HOST,
            'PORT': '5432',
            'OPTIONS': {
                'sslmode': 'require',
            },
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    # {
    #     'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    # },
    # {
    #     'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    # },
    # {
    #     'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    # },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_L10N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Email Configuration
DEFAULT_FROM_EMAIL = 'EPAnotes Team <support@epanotes.com>'
EMAIL_SUBJECT_PREFIX = '[EPAnotes] '

# Frontend domain for password reset links
FRONTEND_DOMAIN = 'app.epanotes.com'  # Production frontend domain

# SMTP Configuration with Amazon SES
# Set this to True to test real email sending in development
USE_REAL_EMAIL_IN_DEV = config('USE_REAL_EMAIL', default=False, cast=bool)

if DEBUG and not USE_REAL_EMAIL_IN_DEV:
    # Development - print emails to console
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
    print("📧 Email Backend: Console (emails will be printed to terminal)")
else:
    # Use Amazon SES SMTP
    if DEBUG and USE_REAL_EMAIL_IN_DEV:
        # Development with real email - use environment variables
        EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
        EMAIL_HOST = config('EMAIL_HOST', default='email-smtp.us-east-1.amazonaws.com')
        EMAIL_PORT = 587
        EMAIL_USE_TLS = True
        EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
        EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
        print(f"📧 Email Backend: SMTP (Amazon SES)")
        print(f"📧 Email Host: {EMAIL_HOST}")
        print(f"📧 Email User: {EMAIL_HOST_USER[:10]}..." if EMAIL_HOST_USER else "⚠️  EMAIL_HOST_USER not set")
    else:
        # Production - use Amazon SES SMTP with Secrets Manager
        try:
            # Get SMTP credentials from Secrets Manager
            smtp_credentials = get_secret("epanotes/email/smtp")
            if smtp_credentials:
                EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
                EMAIL_HOST = 'email-smtp.us-east-1.amazonaws.com'
                EMAIL_PORT = 587
                EMAIL_USE_TLS = True
                EMAIL_HOST_USER = smtp_credentials.get('smtp_username_epanotes')
                EMAIL_HOST_PASSWORD = smtp_credentials.get('smtp_password_epanotes')
                print("📧 Email Backend: SMTP via Secrets Manager (Amazon SES)")
            else:
                # Fallback to console if secrets not available
                EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
                print("⚠️  Warning: Could not retrieve SMTP credentials, falling back to console backend")
        except Exception as e:
            # Fallback to console if there's an error
            EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
            print(f"⚠️  Warning: Error retrieving SMTP credentials: {e}")
            print("📧 Falling back to console email backend")

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost:8082",      # Additional Expo port
    "http://localhost:8001",      # For web mode testing
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:8081", 
    "http://127.0.0.1:8082",      # Additional Expo port
    "http://127.0.0.1:8001",      # For web mode testing
    "http://192.168.86.20:8080",  # Expo development server
    "http://192.168.86.20:8081",  # Expo development server alternate port
    "http://192.168.86.20:8082",  # Expo development server additional port
    "http://192.168.86.20:8001",  # Local IP for physical device testing
    "http://44.197.181.141:8000",
    "http://44.197.181.141:8001",
    "https://44.197.181.141:8443",  # HTTPS backend
    # AWS Amplify domains
    "https://main.d3c6p9x33k6b3.amplifyapp.com",
    "https://app.epanotes.com",  # Production frontend domain
]

# Production CORS settings - temporarily allow all origins for mixed content
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Additional settings for React Native/Expo
CORS_ALLOW_PRIVATE_NETWORK = True

# Additional CORS settings for React Native/Expo
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]
