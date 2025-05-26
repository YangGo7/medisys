import os
from pathlib import Path
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-your-secret-key-here'
DEBUG = True
ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'medical_integration',
    'worklist',             
    'airesults',
    'orders',
    'samples',
    'tests',
    'openmrs_models',
    'orthanc_models',
]


MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
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

WSGI_APPLICATION = 'backend.wsgi.application'

# 다중 데이터베이스 설정
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': config('MARIADB_DATABASE', default='medical_system'),
        'USER': config('MARIADB_USER', default='root'),
        'PASSWORD': config('MARIADB_PASSWORD', default='password'),
        'HOST': config('MARIADB_HOST', default='localhost'),
        'PORT': config('MARIADB_PORT', default='3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
        },
    },
    'openmrs': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': config('OPENMRS_DATABASE', default='openmrs'),
        'USER': config('OPENMRS_USER', default='openmrs'),
        'PASSWORD': config('OPENMRS_PASSWORD', default='Admin123'),
        'HOST': config('OPENMRS_HOST', default='localhost'),
        'PORT': config('OPENMRS_PORT', default='3307'),
        'OPTIONS': {
            'charset': 'utf8mb4',
        },
    },
    'orthanc': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('ORTHANC_DATABASE', default='orthanc'),
        'USER': config('ORTHANC_USER', default='orthanc'),
        'PASSWORD': config('ORTHANC_PASSWORD', default='orthanc'),
        'HOST': config('ORTHANC_HOST', default='localhost'),
        'PORT': config('ORTHANC_PORT', default='5432'),
    }
}

# ⭐ 데이터베이스 라우터 설정
DATABASE_ROUTERS = ['backend.db_router.DatabaseRouter']

# MongoDB 설정 (Django ORM 외부)
MONGODB_SETTINGS = {
    'host': config('MONGODB_HOST', default='localhost'),
    'port': int(config('MONGODB_PORT', default='27017')),
    'db': config('MONGODB_DATABASE', default='medical_system'),
    'username': config('MONGODB_USER', default=''),
    'password': config('MONGODB_PASSWORD', default=''),
}

# 외부 서비스 설정
EXTERNAL_SERVICES = {
    'orthanc': {
        'host': config('ORTHANC_API_HOST', default='localhost'),
        'port': config('ORTHANC_API_PORT', default='8042'),
        'username': config('ORTHANC_API_USER', default='orthanc'),
        'password': config('ORTHANC_API_PASSWORD', default='orthanc'),
    },
    'openmrs': {
        'host': config('OPENMRS_API_HOST', default='localhost'),
        'port': config('OPENMRS_API_PORT', default='8082'),
        'username': config('OPENMRS_API_USER', default='admin'),
        'password': config('OPENMRS_API_PASSWORD', default='Admin123'),
    }
}

# 로깅 설정
os.makedirs(BASE_DIR / 'logs', exist_ok=True)
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'medical_integration': {
            'handlers': ['file', 'console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# REST Framework 설정
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}

# CORS 설정
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

LANGUAGE_CODE = 'ko-kr'
TIME_ZONE = 'Asia/Seoul'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'