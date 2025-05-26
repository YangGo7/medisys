# backend/medical_integration/db_utils.py
from django.db import connections
import pymongo
import logging
from django.conf import settings
from contextlib import contextmanager
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from typing import Dict, Any, Tuple, Optional

logger = logging.getLogger('medical_integration')

class DatabaseConfig:
    """데이터베이스 설정 상수"""
    DEFAULT_MONGODB_TIMEOUT_MS = 5000
    
    # 로깅 메시지
    class LogMessages:
        MONGODB_CONNECTED = "MongoDB 연결 성공"
        MONGODB_AUTH_ERROR = "MongoDB 연결 실패 (인증 오류): {}"
        MONGODB_TIMEOUT = "MongoDB 서버 선택 타임아웃: {}"
        MONGODB_UNEXPECTED = "MongoDB 연결 중 예상치 못한 오류: {}"
        MONGODB_OPERATION_ERROR = "MongoDB 작업 중 오류: {}"
        MONGODB_CLOSED = "MongoDB 연결 닫힘"
        DB_QUERY_ERROR = "Database query error ({}): {}"

class DatabaseManager:
    """다중 데이터베이스 관리 클래스"""
    
    _mongo_client = None
    _supported_dbs = {'openmrs', 'orthanc', 'default'}
    
    @classmethod
    def _get_connection(cls, db_name: str):
        """데이터베이스 연결 가져오기"""
        if db_name not in cls._supported_dbs:
            raise ValueError(f"지원되지 않는 데이터베이스: {db_name}")
        return connections[db_name]
    
    @staticmethod
    def get_openmrs_connection():
        """OpenMRS 데이터베이스 연결"""
        return DatabaseManager._get_connection('openmrs')
    
    @staticmethod
    def get_orthanc_connection():
        """Orthanc 데이터베이스 연결"""
        return DatabaseManager._get_connection('orthanc')
    
    @staticmethod
    def get_default_connection():
        """기본 데이터베이스 연결"""
        return DatabaseManager._get_connection('default')
    
    @classmethod
    def _build_mongodb_uri(cls, config: Dict[str, Any]) -> str:
        """MongoDB URI 생성"""
        if config.get('username'):
            return f"mongodb://{config['username']}:{config['password']}@{config['host']}:{config['port']}"
        return f"mongodb://{config['host']}:{config['port']}"
    
    @classmethod
    def get_mongodb_client(cls) -> pymongo.MongoClient:
        """MongoDB 클라이언트 가져오기 (싱글톤 패턴)"""
        if cls._mongo_client is None:
            try:
                mongo_config = settings.MONGODB_SETTINGS
                connection_string = cls._build_mongodb_uri(mongo_config)
                timeout = mongo_config.get('timeout_ms', DatabaseConfig.DEFAULT_MONGODB_TIMEOUT_MS)
                
                cls._mongo_client = pymongo.MongoClient(
                    connection_string,
                    serverSelectionTimeoutMS=timeout
                )
                cls._mongo_client.admin.command('ping')
                logger.info(DatabaseConfig.LogMessages.MONGODB_CONNECTED)
            except ConnectionFailure as e:
                logger.error(DatabaseConfig.LogMessages.MONGODB_AUTH_ERROR.format(e))
                raise
            except ServerSelectionTimeoutError as e:
                logger.error(DatabaseConfig.LogMessages.MONGODB_TIMEOUT.format(e))
                raise
            except Exception as e:
                logger.error(DatabaseConfig.LogMessages.MONGODB_UNEXPECTED.format(e))
                raise
        return cls._mongo_client
    
    @classmethod
    @contextmanager
    def get_mongodb_connection(cls) -> Tuple[pymongo.MongoClient, pymongo.database.Database]:
        """MongoDB 연결 컨텍스트 관리자"""
        client = cls.get_mongodb_client()
        db = client[settings.MONGODB_SETTINGS['db']]
        try:
            yield client, db
        except Exception as e:
            logger.error(DatabaseConfig.LogMessages.MONGODB_OPERATION_ERROR.format(e))
            raise
    
    @staticmethod
    def execute_raw_query(database: str, query: str, params: Optional[list] = None) -> Any:
        """Raw SQL 쿼리 실행"""
        try:
            connection = connections[database]
            with connection.cursor() as cursor:
                cursor.execute(query, params or [])
                if query.strip().upper().startswith('SELECT'):
                    columns = [col[0] for col in cursor.description]
                    return [dict(zip(columns, row)) for row in cursor.fetchall()]
                return cursor.rowcount
        except Exception as e:
            logger.error(DatabaseConfig.LogMessages.DB_QUERY_ERROR.format(database, e))
            raise
    
    @classmethod
    def close_all_connections(cls) -> None:
        """모든 데이터베이스 연결 닫기"""
        for conn in connections.all():
            conn.close()
        
        if cls._mongo_client:
            cls._mongo_client.close()
            cls._mongo_client = None
            logger.info(DatabaseConfig.LogMessages.MONGODB_CLOSED)