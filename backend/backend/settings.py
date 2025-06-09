# backend/backend/settings.py (CORS 및 연결 설정 수정)

import os
from pathlib import Path
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv(dotenv_path='.env')
OPENMRS_API_BASE = os.getenv("OPENMRS_API_BASE")
OPENMRS_USERNAME = os.getenv("OPENMRS_USERNAME")
OPENMRS_PASSWORD = os.getenv("OPENMRS_PASSWORD")
DEFAULT_IDENTIFIER_TYPE_UUID = os.getenv("82f18b44-6814-11e8-923f-e9a88dcb533f")
# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-change-me-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

# ✅ 수정: ALLOWED_HOSTS 확장
ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '35.225.63.41',
    '0.0.0.0',  # Docker 컨테이너용
    '*'  # 개발 환경용 (운영환경에서는 제거)
]

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
    'worklist',
    'pacs_model',
    'accounts',
    'orders',
    'samples',
    'tests',
    'ocs.apps.OcsConfig',
    'lis_cdss',
    

]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # CORS를 맨 위에
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

# ✅ 수정: 외부 서비스 API 설정 - 정확한 호스트 주소 사용
EXTERNAL_SERVICES = {
    'openmrs': {
        'host': '35.225.63.41',  # 고정된 올바른 주소
        'port': '8082',
        'username': 'admin',
        'password': 'Admin123',
    },
    'orthanc': {
        'host': '35.225.63.41',  # 고정된 올바른 주소
        'port': '8042',
        'username': 'orthanc',
        'password': 'orthanc',
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
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# ✅ 수정: CORS 설정 확장
CORS_ALLOWED_ORIGINS = [
    "http://35.225.63.41:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://0.0.0.0:3000",
    "http://35.225.63.41:8000",
]

# ✅ 추가: 개발 환경에서 모든 오리진 허용 (주의: 운영환경에서는 제거)
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# ✅ 추가: CORS 헤더 설정
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

# ✅ 추가: CSRF 설정
CSRF_TRUSTED_ORIGINS = [
    "http://35.225.63.41:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://35.225.63.41:8000",
]



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
            'level': 'DEBUG',  # 디버그 레벨로 변경
            'propagate': False,
        },
    },
}

# 로그 디렉토리 생성
os.makedirs(BASE_DIR / 'logs', exist_ok=True)
