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

ALLOWED_HOSTS = ['44.197.181.141', 'localhost', '127.0.0.1', '192.168.86.20']

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
# Use SQLite for development, PostgreSQL Aurora for production

if DEBUG:
    # Development - SQLite
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    # Production - Aurora PostgreSQL
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
    db_credentials = get_secret("shiftnotes/database/credentials")
    if db_credentials:
        DB_HOST = 'shiftnotes-aurora-public.cluster-czz7iet4urq4.us-east-1.rds.amazonaws.com'
        DB_NAME = 'shiftnotes'
        DB_USER = db_credentials.get('username', 'shiftnotes_admin')
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
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'  # For development - prints to console
DEFAULT_FROM_EMAIL = 'EPAnotes Team <noreply@aptitools.com>'
EMAIL_SUBJECT_PREFIX = '[EPAnotes] '

# Frontend domain for password reset links
FRONTEND_DOMAIN = 'localhost:8081'  # Change to your actual domain in production

# For production, use SMTP configuration like:
# EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
# EMAIL_HOST = 'smtp.your-provider.com'
# EMAIL_PORT = 587
# EMAIL_USE_TLS = True
# EMAIL_HOST_USER = 'your-email@aptitools.com'
# EMAIL_HOST_PASSWORD = 'your-password'

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
    "http://localhost:8001",      # For web mode testing
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:8081", 
    "http://127.0.0.1:8001",      # For web mode testing
    "http://192.168.86.20:8080",  # Expo development server
    "http://192.168.86.20:8081",  # Expo development server alternate port
    "http://192.168.86.20:8001",  # Local IP for physical device testing
    "http://44.197.181.141:8000",
    "http://44.197.181.141:8001",
    # Expo related origins - removed invalid entries
    # "exp://",                     # Expo development protocol (invalid format)
    # "exps://",                    # Expo secure protocol (invalid format)
]
CORS_ALLOW_CREDENTIALS = True

# For development - allow all origins temporarily
CORS_ALLOW_ALL_ORIGINS = True

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
