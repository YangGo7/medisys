# 1. backend/db_router.py 생성 (새 파일)

class DatabaseRouter:
    """
    다중 데이터베이스 라우팅 클래스
    각 모델을 적절한 데이터베이스로 라우팅
    """
    
    # 각 데이터베이스에 해당하는 앱들
    route_app_labels = {
        'default': ['auth', 'contenttypes', 'sessions', 'admin', 'medical_integration'],
        'openmrs': ['openmrs_models'],  # OpenMRS 관련 모델들
        'orthanc': ['orthanc_models'],  # Orthanc 관련 모델들
    }

    def db_for_read(self, model, **hints):
        """읽기 작업을 위한 데이터베이스 선택"""
        if model._meta.app_label == 'openmrs_models':
            return 'openmrs'
        elif model._meta.app_label == 'orthanc_models':
            return 'orthanc'
        return 'default'

    def db_for_write(self, model, **hints):
        """쓰기 작업을 위한 데이터베이스 선택"""
        if model._meta.app_label == 'openmrs_models':
            return 'openmrs'
        elif model._meta.app_label == 'orthanc_models':
            return 'orthanc'
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        """관계 허용 여부 결정"""
        db_set = {'default', 'openmrs', 'orthanc'}
        if obj1._state.db in db_set and obj2._state.db in db_set:
            return True
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """마이그레이션 허용 여부 결정"""
        if db == 'openmrs':
            return app_label == 'openmrs_models'
        elif db == 'orthanc':
            return app_label == 'orthanc_models'
        elif db == 'default':
            return app_label in ['auth', 'contenttypes', 'sessions', 'admin', 'medical_integration']
        return False

# 2. backend/settings.py 수정 (DATABASE_ROUTERS 추가)

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

# ⭐ 데이터베이스 라우터 설정 (이 부분이 누락되었음!)
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

# 3. medical_integration/db_utils.py 생성 (데이터베이스 유틸리티)

from django.db import connections
import pymongo
import logging
from django.conf import settings

logger = logging.getLogger('medical_integration')

class DatabaseManager:
    """다중 데이터베이스 관리 클래스"""
    
    @staticmethod
    def get_openmrs_connection():
        """OpenMRS 데이터베이스 연결"""
        return connections['openmrs']
    
    @staticmethod
    def get_orthanc_connection():
        """Orthanc 데이터베이스 연결"""
        return connections['orthanc']
    
    @staticmethod
    def get_default_connection():
        """기본 데이터베이스 연결"""
        return connections['default']
    
    @staticmethod
    def get_mongodb_connection():
        """MongoDB 연결"""
        try:
            mongo_config = settings.MONGODB_SETTINGS
            if mongo_config.get('username'):
                connection_string = f"mongodb://{mongo_config['username']}:{mongo_config['password']}@{mongo_config['host']}:{mongo_config['port']}"
            else:
                connection_string = f"mongodb://{mongo_config['host']}:{mongo_config['port']}"
            
            client = pymongo.MongoClient(connection_string)
            db = client[mongo_config['db']]
            logger.info("MongoDB 연결 성공")
            return client, db
        except Exception as e:
            logger.error(f"MongoDB 연결 실패: {e}")
            raise

    @staticmethod
    def execute_raw_query(database, query, params=None):
        """Raw SQL 쿼리 실행"""
        try:
            connection = connections[database]
            with connection.cursor() as cursor:
                cursor.execute(query, params or [])
                if query.strip().upper().startswith('SELECT'):
                    columns = [col[0] for col in cursor.description]
                    return [dict(zip(columns, row)) for row in cursor.fetchall()]
                else:
                    return cursor.rowcount
        except Exception as e:
            logger.error(f"Database query error: {e}")
            raise

# 4. medical_integration/views.py 수정 (다중 DB 사용)

from django.http import JsonResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from datetime import datetime
import logging
from .db_utils import DatabaseManager

logger = logging.getLogger('medical_integration')

@api_view(['GET'])
def health_check(request):
    """시스템 상태 확인"""
    return Response({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'Django Medical Integration API'
    })

@api_view(['GET'])
def test_all_connections(request):
    """모든 연결 테스트 (다중 데이터베이스 포함)"""
    results = {
        'timestamp': datetime.now().isoformat(),
        'connections': {}
    }
    
    # 기본 MariaDB 테스트
    try:
        connection = DatabaseManager.get_default_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()[0]
            results['connections']['default_db'] = {
                'status': 'success',
                'message': 'Default MariaDB 연결 성공',
                'version': version
            }
    except Exception as e:
        results['connections']['default_db'] = {
            'status': 'error',
            'message': str(e)
        }
    
    # OpenMRS 데이터베이스 테스트
    try:
        query = "SELECT COUNT(*) as patient_count FROM patient_data WHERE voided = 0"
        result = DatabaseManager.execute_raw_query('openmrs', query)
        patient_count = result[0]['patient_count'] if result else 0
        
        results['connections']['openmrs_db'] = {
            'status': 'success',
            'message': 'OpenMRS DB 연결 성공',
            'patient_count': patient_count
        }
    except Exception as e:
        results['connections']['openmrs_db'] = {
            'status': 'error',
            'message': str(e)
        }
    
    # Orthanc 데이터베이스 테스트
    try:
        query = "SELECT COUNT(*) as patient_count FROM Resources WHERE resourceType = 0"
        result = DatabaseManager.execute_raw_query('orthanc', query)
        patient_count = result[0]['patient_count'] if result else 0
        
        results['connections']['orthanc_db'] = {
            'status': 'success',
            'message': 'Orthanc DB 연결 성공',
            'patient_count': patient_count
        }
    except Exception as e:
        results['connections']['orthanc_db'] = {
            'status': 'error',
            'message': str(e)
        }
    
    # MongoDB 테스트
    try:
        client, db = DatabaseManager.get_mongodb_connection()
        db.command('ping')
        collections = db.list_collection_names()
        client.close()
        
        results['connections']['mongodb'] = {
            'status': 'success',
            'message': 'MongoDB 연결 성공',
            'collections_count': len(collections)
        }
    except Exception as e:
        results['connections']['mongodb'] = {
            'status': 'error',
            'message': str(e)
        }
    
    # 전체 상태 판단
    all_success = all(
        conn['status'] == 'success' 
        for conn in results['connections'].values()
    )
    results['overall_status'] = 'success' if all_success else 'partial_failure'
    
    return Response(results)

@api_view(['GET'])
def get_database_info(request):
    """데이터베이스 정보 조회"""
    try:
        info = {
            'databases': {
                'default': 'MariaDB (Django 기본 테이블)',
                'openmrs': 'OpenMRS MySQL (환자 정보)',
                'orthanc': 'Orthanc PostgreSQL (DICOM 데이터)',
                'mongodb': 'MongoDB (분석 결과)'
            },
            'routing': {
                'default': ['auth', 'sessions', 'admin', 'medical_integration'],
                'openmrs': ['patient_data', 'encounter', 'billing'],
                'orthanc': ['Resources', 'MainDicomTags', 'Metadata'],
                'mongodb': ['analysis_results', 'segmentation_masks']
            },
            'timestamp': datetime.now().isoformat()
        }
        return Response(info)
    except Exception as e:
        return Response({'error': str(e)}, status=500)