import os
import sys
import logging
import mysql.connector
import psycopg2
import pymongo
import requests
from requests.auth import HTTPBasicAuth
from datetime import datetime
import json

# 로깅 설정
log_dir = 'logs'
os.makedirs(log_dir, exist_ok=True)

# 로거 설정
logger = logging.getLogger('medical_integration_test')
logger.setLevel(logging.DEBUG)

# 파일 핸들러
file_handler = logging.FileHandler(os.path.join(log_dir, 'connection_test.log'))
file_handler.setLevel(logging.INFO)

# 콘솔 핸들러
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)

# 포맷 설정
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)

# 핸들러 추가
logger.addHandler(file_handler)
logger.addHandler(console_handler)

# 환경 변수 로드 (없으면 기본값 사용)
def get_env(key, default):
    return os.environ.get(key, default)

# 데이터베이스 접속 정보
DB_CONFIG = {
    'mariadb': {
        'host': get_env('MARIADB_HOST', '127.0.0.1'),
        'port': int(get_env('MARIADB_PORT', '3306')),
        'user': get_env('MARIADB_USER', 'root'),
        'password': get_env('MARIADB_PASSWORD', 'rootpassword'),
        'database': get_env('MARIADB_DATABASE', 'medical_platform')
    },
    'openmrs': {
        'host': get_env('OPENMRS_HOST', '127.0.0.1'),
        'port': int(get_env('OPENMRS_PORT', '3307')),
        'user': get_env('OPENMRS_USER', 'openmrs'),
        'password': get_env('OPENMRS_PASSWORD', 'Admin123'),
        'database': get_env('OPENMRS_DATABASE', 'openmrs')
    },
    'orthanc': {
        'host': get_env('ORTHANC_HOST', '127.0.0.1'),
        'port': int(get_env('ORTHANC_PORT', '5432')),
        'user': get_env('ORTHANC_USER', 'orthanc'),
        'password': get_env('ORTHANC_PASSWORD', 'orthanc'),
        'database': get_env('ORTHANC_DATABASE', 'orthanc')
    },
    'mongodb': {
        'host': get_env('MONGODB_HOST', '127.0.0.1'),
        'port': int(get_env('MONGODB_PORT', '27017')),
        'database': get_env('MONGODB_DATABASE', 'medical_system')
    }
}

# API 접속 정보
API_CONFIG = {
    'orthanc': {
        'url': f"http://{get_env('ORTHANC_API_HOST', '127.0.0.1')}:{get_env('ORTHANC_API_PORT', '8042')}",
        'user': get_env('ORTHANC_API_USER', 'orthanc'),
        'password': get_env('ORTHANC_API_PASSWORD', 'orthanc')
    },
    'openmrs': {
        'url': f"http://{get_env('OPENMRS_API_HOST', '127.0.0.1')}:{get_env('OPENMRS_API_PORT', '8082')}/openmrs/ws/rest/v1",
        'user': get_env('OPENMRS_API_USER', 'admin'),
        'password': get_env('OPENMRS_API_PASSWORD', 'Admin123')
    }
}

def test_mariadb():
    """MariaDB 연결 테스트"""
    logger.info("=== MariaDB 연결 테스트 (포트 %s) ===", DB_CONFIG['mariadb']['port'])
    conn = None
    try:
        conn = mysql.connector.connect(
            host=DB_CONFIG['mariadb']['host'],
            port=DB_CONFIG['mariadb']['port'],
            user=DB_CONFIG['mariadb']['user'],
            password=DB_CONFIG['mariadb']['password'],
            charset='utf8mb4'
        )
        cursor = conn.cursor()
        cursor.execute("SHOW DATABASES")
        databases = cursor.fetchall()
        db_list = [db[0] for db in databases]
        
        logger.info("✅ MariaDB 연결 성공! 데이터베이스 목록: %s", db_list)
        
        # 데이터베이스 존재 확인 및 생성
        if DB_CONFIG['mariadb']['database'] not in db_list:
            logger.info("%s 데이터베이스가 없습니다. 생성을 시도합니다.", DB_CONFIG['mariadb']['database'])
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_CONFIG['mariadb']['database']}")
            logger.info("%s 데이터베이스 생성 완료", DB_CONFIG['mariadb']['database'])
        else:
            logger.info("%s 데이터베이스가 이미 존재합니다.", DB_CONFIG['mariadb']['database'])
        
        # 버전 정보 로깅
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()[0]
        logger.info("MariaDB 버전: %s", version)
        
        return True, {"databases": db_list, "version": version}
    except Exception as e:
        logger.error("❌ MariaDB 연결 실패: %s", e)
        logger.error("MariaDB 설정을 확인하세요: %s", DB_CONFIG['mariadb'])
        return False, {"error": str(e)}
    finally:
        if conn:
            conn.close()

def test_openmrs_mysql():
    """OpenMRS MySQL 연결 테스트"""
    logger.info("\n=== OpenMRS MySQL 연결 테스트 (포트 %s) ===", DB_CONFIG['openmrs']['port'])
    conn = None
    try:
        conn = mysql.connector.connect(
            host=DB_CONFIG['openmrs']['host'],
            port=DB_CONFIG['openmrs']['port'],
            user=DB_CONFIG['openmrs']['user'],
            password=DB_CONFIG['openmrs']['password'],
            database=DB_CONFIG['openmrs']['database'],
            charset='utf8mb4'
        )
        cursor = conn.cursor()
        
        # 테이블 목록 확인
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = %s
        """, (DB_CONFIG['openmrs']['database'],))
        tables = [table[0] for table in cursor.fetchall()]
        logger.info("OpenMRS 테이블 목록: %s", tables)
        
        # 환자 수 확인 (patient 테이블)
        cursor.execute("SELECT COUNT(*) FROM patient WHERE voided = 0")
        patient_count = cursor.fetchone()[0]
        logger.info("✅ OpenMRS MySQL 연결 성공! 환자 수: %s", patient_count)
        
        # 환자 식별자 조회 (patient와 patient_identifier 테이블 조인)
        try:
            cursor.execute("""
                SELECT p.patient_id, p.creator, p.date_created, pi.identifier
                FROM patient p
                LEFT JOIN patient_identifier pi ON p.patient_id = pi.patient_id
                WHERE p.voided = 0 AND (pi.voided = 0 OR pi.voided IS NULL)
                LIMIT 5
            """)
            patients = cursor.fetchall()
            
            # 칼럼명 가져오기
            columns = [column[0] for column in cursor.description]
            
            # 환자 정보를 딕셔너리 리스트로 변환
            patient_data = []
            for patient in patients:
                patient_dict = dict(zip(columns, patient))
                # 날짜 객체를 문자열로 변환
                for key, value in patient_dict.items():
                    if isinstance(value, datetime):
                        patient_dict[key] = value.isoformat()
                patient_data.append(patient_dict)
            
            logger.info("환자 식별자 샘플 데이터: %s", json.dumps(patient_data, indent=2, ensure_ascii=False))
        except Exception as e:
            logger.warning("⚠️ 환자 식별자 조회 실패: %s", e)
            
            # 기본 환자 정보만 조회
            cursor.execute("""
                SELECT patient_id, creator, date_created
                FROM patient
                WHERE voided = 0
                LIMIT 5
            """)
            patients = cursor.fetchall()
            
            # 칼럼명 가져오기
            columns = [column[0] for column in cursor.description]
            
            # 환자 정보를 딕셔너리 리스트로 변환
            patient_data = []
            for patient in patients:
                patient_dict = dict(zip(columns, patient))
                # 날짜 객체를 문자열로 변환
                for key, value in patient_dict.items():
                    if isinstance(value, datetime):
                        patient_dict[key] = value.isoformat()
                patient_data.append(patient_dict)
            
            logger.info("환자 기본 정보 샘플 데이터: %s", json.dumps(patient_data, indent=2, ensure_ascii=False))
        
        # 실제 환자 정보 조회
        try:
            cursor.execute("""
                SELECT p.person_id, pn.given_name, pn.family_name, p.gender, p.birthdate
                FROM person p
                LEFT JOIN person_name pn ON p.person_id = pn.person_id
                WHERE p.voided = 0 AND (pn.voided = 0 OR pn.voided IS NULL)
                LIMIT 5
            """)
            people = cursor.fetchall()
            
            # 칼럼명 가져오기
            columns = [column[0] for column in cursor.description]
            
            # 사람 정보를 딕셔너리 리스트로 변환
            person_data = []
            for person in people:
                person_dict = dict(zip(columns, person))
                # 날짜 객체를 문자열로 변환
                for key, value in person_dict.items():
                    if isinstance(value, datetime):
                        person_dict[key] = value.isoformat()
                person_data.append(person_dict)
            
            logger.info("사람 정보 샘플 데이터: %s", json.dumps(person_data, indent=2, ensure_ascii=False))
        except Exception as e:
            logger.warning("⚠️ 사람 정보 조회 실패: %s", e)
        
        return True, {"patient_count": patient_count, "sample_data": patient_data}
    except Exception as e:
        logger.error("❌ OpenMRS MySQL 연결 실패: %s", e)
        logger.error("OpenMRS 설정을 확인하세요: %s", DB_CONFIG['openmrs'])
        return False, {"error": str(e)}
    finally:
        if conn:
            conn.close()

def test_orthanc_postgres():
    """Orthanc PostgreSQL 연결 테스트"""
    logger.info("\n=== Orthanc PostgreSQL 연결 테스트 (포트 %s) ===", DB_CONFIG['orthanc']['port'])
    conn = None
    try:
        conn = psycopg2.connect(
            host=DB_CONFIG['orthanc']['host'],
            port=DB_CONFIG['orthanc']['port'],
            user=DB_CONFIG['orthanc']['user'],
            password=DB_CONFIG['orthanc']['password'],
            database=DB_CONFIG['orthanc']['database']
        )
        cursor = conn.cursor()
        
        # PostgreSQL 버전 확인
        cursor.execute("SELECT version()")
        version = cursor.fetchone()[0]
        logger.info("PostgreSQL 버전: %s", version)
        
        # Orthanc 리소스 수 확인
        cursor.execute("SELECT COUNT(*) FROM Resources")
        resource_count = cursor.fetchone()[0]
        logger.info("✅ Orthanc PostgreSQL 연결 성공! 리소스 수: %s", resource_count)
        
        # 환자 수 확인 (resourceType 0은 환자)
        cursor.execute("SELECT COUNT(*) FROM Resources WHERE resourceType = 0")
        patient_count = cursor.fetchone()[0]
        logger.info("Orthanc 환자 수: %s", patient_count)
        
        # 테이블 목록 확인
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        tables = [table[0] for table in cursor.fetchall()]
        logger.info("테이블 목록: %s", tables)
        
        return True, {
            "version": version, 
            "resource_count": resource_count, 
            "patient_count": patient_count,
            "tables": tables
        }
    except Exception as e:
        logger.error("❌ Orthanc PostgreSQL 연결 실패: %s", e)
        logger.error("Orthanc 설정을 확인하세요: %s", DB_CONFIG['orthanc'])
        return False, {"error": str(e)}
    finally:
        if conn:
            conn.close()

def test_mongodb():
    """MongoDB 연결 테스트"""
    logger.info("\n=== MongoDB 연결 테스트 (포트 %s) ===", DB_CONFIG['mongodb']['port'])
    client = None
    try:
        # MongoDB 인증 정보 확인
        user = DB_CONFIG['mongodb'].get('user', '')
        password = DB_CONFIG['mongodb'].get('password', '')
        
        # 연결 문자열 생성
        if user and password:
            connection_string = f"mongodb://{user}:{password}@{DB_CONFIG['mongodb']['host']}:{DB_CONFIG['mongodb']['port']}/{DB_CONFIG['mongodb']['database']}?authSource=admin"
            logger.info("MongoDB 인증 정보 사용 (user: %s)", user)
        else:
            connection_string = f"mongodb://{DB_CONFIG['mongodb']['host']}:{DB_CONFIG['mongodb']['port']}"
            logger.info("MongoDB 인증 정보 없음 - 직접 데이터베이스 접근")
        
        # MongoDB 연결
        client = pymongo.MongoClient(connection_string, serverSelectionTimeoutMS=5000)
        
        # 서버 정보 확인
        server_info = client.server_info()
        logger.info("MongoDB 버전: %s", server_info.get('version', 'Unknown'))
        
        # 데이터베이스 접근
        db = client[DB_CONFIG['mongodb']['database']]
        
        # 컬렉션 목록 확인
        try:
            collections = db.list_collection_names()
            logger.info("✅ MongoDB 연결 성공! 컬렉션 목록: %s", collections)
            
            # 분석 결과 컬렉션 확인
            if 'analysis_results' in collections:
                count = db.analysis_results.count_documents({})
                logger.info("분석 결과 문서 수: %s", count)
                
                # 샘플 데이터 조회
                if count > 0:
                    sample = list(db.analysis_results.find().limit(2))
                    # ObjectId는 직렬화할 수 없으므로 문자열로 변환
                    for doc in sample:
                        if '_id' in doc:
                            doc['_id'] = str(doc['_id'])
                        if 'analysis_date' in doc and isinstance(doc['analysis_date'], datetime):
                            doc['analysis_date'] = doc['analysis_date'].isoformat()
                    
                    logger.info("분석 결과 샘플: %s", json.dumps(sample, indent=2, ensure_ascii=False))
                else:
                    logger.info("분석 결과 컬렉션이 비어 있습니다. 샘플 데이터를 생성합니다.")
                    result = db.analysis_results.insert_one({
                        "analysis_id": "test_analysis_001",
                        "instance_id": "test_instance_001",
                        "model_id": "test_model_v1",
                        "analysis_date": datetime.now(),
                        "status": "completed",
                        "processing_time_ms": 1250,
                        "confidence_score": 0.95,
                        "result_summary": "테스트 분석 결과",
                    })
                    logger.info("샘플 분석 결과 생성 완료: %s", result.inserted_id)
            else:
                logger.info("분석 결과 컬렉션이 없습니다. 생성합니다.")
                result = db.analysis_results.insert_one({
                    "analysis_id": "test_analysis_001",
                    "instance_id": "test_instance_001",
                    "model_id": "test_model_v1",
                    "analysis_date": datetime.now(),
                    "status": "completed",
                    "processing_time_ms": 1250,
                    "confidence_score": 0.95,
                    "result_summary": "테스트 분석 결과",
                })
                logger.info("샘플 분석 결과 생성 완료: %s", result.inserted_id)
        except Exception as e:
            logger.error("❌ MongoDB 컬렉션 접근 실패: %s", e)
            return False, {"error": str(e)}
        
        return True, {"server_info": server_info, "collections": collections if 'collections' in locals() else []}
    except Exception as e:
        logger.error("❌ MongoDB 연결 실패: %s", e)
        logger.error("MongoDB 설정을 확인하세요: %s", {k: v for k, v in DB_CONFIG['mongodb'].items() if k != 'password'})
        return False, {"error": str(e)}
    finally:
        if client:
            client.close()

def test_orthanc_api():
    """Orthanc API 연결 테스트"""
    logger.info("\n=== Orthanc API 연결 테스트 ===")
    try:
        # 시스템 정보 조회
        url = f"{API_CONFIG['orthanc']['url']}/system"
        response = requests.get(
            url, 
            auth=HTTPBasicAuth(
                API_CONFIG['orthanc']['user'], 
                API_CONFIG['orthanc']['password']
            )
        )
        response.raise_for_status()
        system_info = response.json()
        
        logger.info("✅ Orthanc API 연결 성공!")
        logger.info("Orthanc 버전: %s", system_info.get('Version', 'Unknown'))
        logger.info("AET: %s", system_info.get('DicomAet', 'Unknown'))
        
        # 환자 목록 조회
        patients_url = f"{API_CONFIG['orthanc']['url']}/patients"
        patients_response = requests.get(
            patients_url,
            auth=HTTPBasicAuth(
                API_CONFIG['orthanc']['user'], 
                API_CONFIG['orthanc']['password']
            )
        )
        patients_response.raise_for_status()
        patients = patients_response.json()
        
        logger.info("환자 ID 수: %s", len(patients))
        
        # 첫 번째 환자 상세 정보 조회 (있는 경우)
        patient_details = None
        if patients and len(patients) > 0:
            patient_id = patients[0]
            patient_url = f"{API_CONFIG['orthanc']['url']}/patients/{patient_id}"
            patient_response = requests.get(
                patient_url,
                auth=HTTPBasicAuth(
                    API_CONFIG['orthanc']['user'], 
                    API_CONFIG['orthanc']['password']
                )
            )
            patient_response.raise_for_status()
            patient_details = patient_response.json()
            logger.info("첫 번째 환자 ID: %s", patient_id)
            logger.info("첫 번째 환자 상세정보: %s", 
                       json.dumps(patient_details, indent=2, ensure_ascii=False))
        
        return True, {
            "version": system_info.get('Version', 'Unknown'),
            "patient_count": len(patients),
            "sample_patient": patient_details
        }
    except requests.exceptions.RequestException as e:
        logger.error("❌ Orthanc API 연결 실패: %s", e)
        logger.error("Orthanc API 설정을 확인하세요: %s", API_CONFIG['orthanc'])
        return False, {"error": str(e)}

def test_openmrs_api():
    """OpenMRS API 연결 테스트"""
    logger.info("\n=== OpenMRS API 연결 테스트 ===")
    try:
        # API URL에서 기본 URL 추출
        api_url = API_CONFIG['openmrs']['url']
        base_url = api_url.split('/ws/rest/')[0] if '/ws/rest/' in api_url else api_url
        
        logger.info("OpenMRS 기본 URL: %s", base_url)
        logger.info("OpenMRS API URL: %s", api_url)
        
        # 먼저 기본 URL에 접속 시도
        try:
            response = requests.get(base_url, timeout=5)
            if response.status_code == 200:
                logger.info("✅ OpenMRS 웹 서버 접속 성공!")
            else:
                logger.warning("⚠️ OpenMRS 웹 서버 응답 코드: %s", response.status_code)
        except Exception as e:
            logger.error("❌ OpenMRS 웹 서버 접속 실패: %s", e)
            return False, {"error": f"OpenMRS 웹 서버 접속 실패: {e}"}
        
        # 세션 API 접속 시도
        session_url = f"{api_url}/session"
        logger.info("OpenMRS 세션 API 접속 시도: %s", session_url)
        
        response = requests.get(
            session_url, 
            auth=HTTPBasicAuth(
                API_CONFIG['openmrs']['user'], 
                API_CONFIG['openmrs']['password']
            ),
            timeout=5
        )
        
        # 응답 상태 코드 확인
        if response.status_code != 200:
            logger.error("❌ OpenMRS API 응답 코드: %s", response.status_code)
            return False, {"error": f"API 응답 코드: {response.status_code}"}
        
        # 응답 내용 확인
        try:
            session_info = response.json()
            logger.info("✅ OpenMRS API 연결 성공!")
            logger.info("OpenMRS 인증 상태: %s", session_info.get('authenticated', False))
            
            return True, {
                "authenticated": session_info.get('authenticated', False),
                "session_info": session_info
            }
        except Exception as e:
            logger.error("❌ OpenMRS API 응답 파싱 실패: %s", e)
            logger.error("응답 내용: %s", response.text[:200])  # 처음 200자만 로깅
            return False, {"error": str(e), "response": response.text[:200]}
    except Exception as e:
        logger.error("❌ OpenMRS API 연결 실패: %s", e)
        logger.error("OpenMRS API 설정을 확인하세요: %s", API_CONFIG['openmrs'])
        return False, {"error": str(e)}
    
def test_data_integration():
    """데이터 통합 테스트 - OpenMRS와 Orthanc 환자 매핑 테스트"""
    logger.info("\n=== 데이터 통합 테스트 ===")
    
    # OpenMRS와 Orthanc에서 환자 정보 가져오기
    openmrs_success, openmrs_data = test_openmrs_mysql()
    orthanc_api_success, orthanc_data = test_orthanc_api()
    
    if not openmrs_success or not orthanc_api_success:
        logger.error("❌ 데이터 통합 테스트 실패: OpenMRS 또는 Orthanc 연결 문제")
        return False, {"error": "데이터베이스 연결 실패"}
    
    # 통합 테스트 결과
    logger.info("OpenMRS 환자 수: %s", openmrs_data.get('patient_count', 0))
    logger.info("Orthanc 환자 수: %s", orthanc_data.get('patient_count', 0))
    
    # MariaDB 연결하여 PatientMapping 테이블 확인
    logger.info("PatientMapping 테이블 확인 중...")
    conn = None
    try:
        conn = mysql.connector.connect(
            host=DB_CONFIG['mariadb']['host'],
            port=DB_CONFIG['mariadb']['port'],
            user=DB_CONFIG['mariadb']['user'],
            password=DB_CONFIG['mariadb']['password'],
            database=DB_CONFIG['mariadb']['database'],
            charset='utf8mb4'
        )
        cursor = conn.cursor()
        
        # PatientMapping 테이블이 있는지 확인
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = %s AND table_name = 'patient_mapping'
        """, (DB_CONFIG['mariadb']['database'],))
        
        table_exists = cursor.fetchone()[0] > 0
        
        if table_exists:
            cursor.execute("SELECT COUNT(*) FROM patient_mapping")
            mapping_count = cursor.fetchone()[0]
            logger.info("✅ PatientMapping 테이블 존재, 매핑 수: %s", mapping_count)
            
            # 매핑 데이터 샘플 확인
            cursor.execute("SELECT * FROM patient_mapping LIMIT 5")
            columns = [column[0] for column in cursor.description]
            mappings = []
            for row in cursor.fetchall():
                mapping = dict(zip(columns, row))
                # 날짜 객체를 문자열로 변환
                for key, value in mapping.items():
                    if isinstance(value, datetime):
                        mapping[key] = value.isoformat()
                mappings.append(mapping)
            
            logger.info("매핑 샘플: %s", json.dumps(mappings, indent=2, ensure_ascii=False))
            return True, {"mapping_count": mapping_count, "sample_mappings": mappings}
        else:
            # 테이블이 없으면 생성 (샘플 목적)
            logger.info("PatientMapping 테이블이 없습니다. 생성합니다...")
            cursor.execute("""
                CREATE TABLE patient_mapping (
                    mapping_id INT AUTO_INCREMENT PRIMARY KEY,
                    orthanc_patient_id VARCHAR(255) NOT NULL,
                    openmrs_patient_id INT NOT NULL,
                    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_sync TIMESTAMP NULL,
                    UNIQUE KEY (orthanc_patient_id),
                    UNIQUE KEY (openmrs_patient_id)
                )
            """)
            logger.info("✅ PatientMapping 테이블 생성 완료")
            
            # 샘플 매핑 데이터 추가 (테스트용)
            if orthanc_data.get('sample_patient') and openmrs_data.get('sample_data'):
                orthanc_patient_id = orthanc_data['sample_patient'].get('ID', 'test_orthanc_id')
                openmrs_patient_id = openmrs_data['sample_data'][0]['id'] if openmrs_data['sample_data'] else 1
                
                cursor.execute("""
                    INSERT INTO patient_mapping 
                    (orthanc_patient_id, openmrs_patient_id) VALUES (%s, %s)
                """, (orthanc_patient_id, openmrs_patient_id))
                conn.commit()
                logger.info("✅ 샘플 매핑 데이터 추가 완료")
                
                return True, {
                    "mapping_created": True, 
                    "orthanc_patient_id": orthanc_patient_id, 
                    "openmrs_patient_id": openmrs_patient_id
                }
            else:
                logger.warning("⚠️ 샘플 환자 데이터가 없어 매핑을 생성할 수 없습니다.")
                return False, {"error": "샘플 환자 데이터 없음"}
    except Exception as e:
        logger.error("❌ 데이터 통합 테스트 실패: %s", e)
        return False, {"error": str(e)}
    finally:
        if conn:
            conn.close()

def write_results_to_json(results):
    """테스트 결과를 JSON 파일로 저장"""
    try:
        output_file = os.path.join(log_dir, f'connection_test_results_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json')
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False, default=str)
        logger.info("✅ 테스트 결과가 %s에 저장되었습니다.", output_file)
        return output_file
    except Exception as e:
        logger.error("❌ 결과 저장 실패: %s", e)
        return None

def main():
    """메인 함수"""
    logger.info("=" * 50)
    logger.info("의료 통합 시스템 연결 테스트 시작")
    logger.info("테스트 시간: %s", datetime.now().isoformat())
    logger.info("=" * 50)
    
    # 결과 저장용 딕셔너리
    results = {
        "timestamp": datetime.now().isoformat(),
        "tests": {}
    }
    
    # MariaDB 테스트
    success, data = test_mariadb()
    results["tests"]["mariadb"] = {
        "success": success,
        "data": data
    }
    
    # OpenMRS MySQL 테스트
    success, data = test_openmrs_mysql()
    results["tests"]["openmrs_mysql"] = {
        "success": success,
        "data": data
    }
    
    # Orthanc PostgreSQL 테스트
    success, data = test_orthanc_postgres()
    results["tests"]["orthanc_postgres"] = {
        "success": success,
        "data": data
    }
    
    # MongoDB 테스트
    success, data = test_mongodb()
    results["tests"]["mongodb"] = {
        "success": success,
        "data": data
    }
    
    # Orthanc API 테스트
    success, data = test_orthanc_api()
    results["tests"]["orthanc_api"] = {
        "success": success,
        "data": data
    }
    
    # OpenMRS API 테스트
    success, data = test_openmrs_api()
    results["tests"]["openmrs_api"] = {
        "success": success,
        "data": data
    }
    
    # 데이터 통합 테스트
    success, data = test_data_integration()
    results["tests"]["data_integration"] = {
        "success": success,
        "data": data
    }
    
    # 전체 결과 요약
    successful_tests = sum(1 for test in results["tests"].values() if test["success"])
    total_tests = len(results["tests"])
    success_rate = (successful_tests / total_tests) * 100 if total_tests > 0 else 0
    
    results["summary"] = {
        "successful_tests": successful_tests,
        "total_tests": total_tests,
        "success_rate": success_rate,
        "status": "Success" if success_rate == 100 else "Partial Success" if success_rate > 0 else "Failure"
    }
    
    logger.info("=" * 50)
    logger.info("테스트 완료")
    logger.info("성공한 테스트: %s/%s (%.2f%%)", successful_tests, total_tests, success_rate)
    logger.info("상태: %s", results["summary"]["status"])
    logger.info("=" * 50)
    
    # 결과 JSON 파일로 저장
    output_file = write_results_to_json(results)
    if output_file:
        logger.info("결과 파일: %s", output_file)
    
    return results["summary"]["status"]

if __name__ == "__main__":
    status = main()
    sys.exit(0 if status == "Success" else 1)