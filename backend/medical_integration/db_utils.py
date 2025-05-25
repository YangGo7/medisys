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