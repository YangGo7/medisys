import os
from pathlib import Path
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-change-me-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# Application definition
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

ROOT_URLCONF = 'urls'

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

WSGI_APPLICATION = 'wsgi.application'

# Database Configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.getenv('MARIADB_DATABASE', 'medical_platform'),
        'USER': os.getenv('MARIADB_USER', 'root'),
        'PASSWORD': os.getenv('MARIADB_PASSWORD', 'rootpassword'),
        'HOST': os.getenv('MARIADB_HOST', '127.0.0.1'),
        'PORT': os.getenv('MARIADB_PORT', '3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    },
    'openmrs': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.getenv('OPENMRS_DATABASE', 'openmrs'),
        'USER': os.getenv('OPENMRS_USER', 'openmrs'),
        'PASSWORD': os.getenv('OPENMRS_PASSWORD', 'Admin123'),
        'HOST': os.getenv('OPENMRS_HOST', '127.0.0.1'),
        'PORT': os.getenv('OPENMRS_PORT', '3307'),
        'OPTIONS': {
            'charset': 'utf8mb4',
        },
    },
    'orthanc': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('ORTHANC_DATABASE', 'orthanc'),
        'USER': os.getenv('ORTHANC_USER', 'orthanc'),
        'PASSWORD': os.getenv('ORTHANC_PASSWORD', 'orthanc'),
        'HOST': os.getenv('ORTHANC_HOST', '127.0.0.1'),
        'PORT': os.getenv('ORTHANC_PORT', '5432'),
    },
}

# 데이터베이스 라우터 설정
DATABASE_ROUTERS = ['db_router.DatabaseRouter']

# 외부 서비스 API 설정
EXTERNAL_SERVICES = {
    'openmrs': {
        'host': os.getenv('OPENMRS_API_HOST', '127.0.0.1'),
        'port': os.getenv('OPENMRS_API_PORT', '8082'),
        'username': os.getenv('OPENMRS_API_USER', 'admin'),
        'password': os.getenv('OPENMRS_API_PASSWORD', 'Admin123'),
    },
    'orthanc': {
        'host': os.getenv('ORTHANC_API_HOST', '127.0.0.1'),
        'port': os.getenv('ORTHANC_API_PORT', '8042'),
        'username': os.getenv('ORTHANC_API_USER', 'orthanc'),
        'password': os.getenv('ORTHANC_API_PASSWORD', 'orthanc'),
    }
}

# MongoDB 설정 (필요한 경우)
MONGODB_SETTINGS = {
    'host': os.getenv('MONGODB_HOST', '127.0.0.1'),
    'port': int(os.getenv('MONGODB_PORT', '27017')),
    'database': os.getenv('MONGODB_DATABASE', 'medical_system'),
    'username': os.getenv('MONGODB_USER', ''),
    'password': os.getenv('MONGODB_PASSWORD', ''),
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'ko-kr'
TIME_ZONE = 'Asia/Seoul'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework 설정
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# CORS 설정
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_CREDENTIALS = True

# 로깅 설정
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'medical_integration.log',
            'maxBytes': 1024*1024*15,  # 15MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'medical_integration': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# 로그 디렉토리 생성
os.makedirs(BASE_DIR / 'logs', exist_ok=True)