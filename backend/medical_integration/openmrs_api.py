# backend/medical_integration/openmrs_api.py (최종 수정 버전)
import requests
import logging
import os
from datetime import datetime, timezone
from django.conf import settings

logger = logging.getLogger(__name__)

class OpenMRSAPI:
    def __init__(self):
        """🔥 환경변수 우선 사용 - settings 의존성 제거"""
        # 환경변수에서 직접 로드 (settings.py 문제 회피)
        self.api_host = os.getenv('OPENMRS_API_HOST', '127.0.0.1')
        self.api_port = os.getenv('OPENMRS_API_PORT', '8082')
        self.username = os.getenv('OPENMRS_API_USER', 'admin')
        self.password = os.getenv('OPENMRS_API_PASSWORD', 'Admin123')
        
        # Base URL 구성
        self.api_url = f"http://{self.api_host}:{self.api_port}/openmrs/ws/rest/v1"
        self.auth = (self.username, self.password)
        
        logger.info(f"🏥 OpenMRS API 초기화: {self.api_url}")
        logger.info(f"👤 인증 사용자: {self.username}")
        
        self._identifier_types = None
        self._locations = None
        self._session_checked = False
    
    def _format_openmrs_datetime(self, dt=None):
        """OpenMRS가 요구하는 정확한 datetime 형식으로 변환"""
        if dt is None:
            dt = datetime.now(timezone.utc)
        
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        
        # 밀리초는 3자리만 유지
        milliseconds = dt.microsecond // 1000
        formatted = dt.strftime('%Y-%m-%dT%H:%M:%S') + f'.{milliseconds:03d}Z'
        
        logger.debug(f"🕐 DateTime 변환: {dt} → {formatted}")
        return formatted
    
    def test_connection(self):
        """기본 연결 테스트"""
        try:
            logger.info(f"🔗 OpenMRS 연결 테스트: {self.api_url}/session")
            
            response = requests.get(
                f"{self.api_url}/session",
                auth=self.auth,
                headers={'Accept': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                session_data = response.json()
                logger.info(f"✅ OpenMRS 연결 성공: {session_data.get('user', {}).get('display', 'Unknown')}")
                return True
            else:
                logger.error(f"❌ OpenMRS 연결 실패: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ OpenMRS 연결 실패: {e}")
            return False
    
    def test_connection_detailed(self):
        """🔥 상세한 연결 및 메타데이터 테스트"""
        try:
            logger.info("🔄 OpenMRS 연결 및 메타데이터 테스트 시작...")
            
            # 1. 세션 확인
            session_response = requests.get(
                f"{self.api_url}/session",
                auth=self.auth,
                headers={'Accept': 'application/json'},
                timeout=10
            )
            
            if session_response.status_code != 200:
                logger.error(f"❌ 세션 확인 실패: {session_response.status_code}")
                return {
                    'success': False,
                    'error': f'OpenMRS 인증 실패: {session_response.status_code}',
                    'details': {}
                }
            
            session_info = session_response.json()
            logger.info(f"✅ 세션 확인 성공: {session_info.get('user', {}).get('display', 'Unknown')}")
            
            # 2. 식별자 타입 확인
            identifier_types = self.get_identifier_types()
            if not identifier_types:
                logger.error("❌ 식별자 타입을 찾을 수 없음")
                return {
                    'success': False,
                    'error': 'OpenMRS에서 유효한 식별자 타입을 찾을 수 없습니다',
                    'details': {'session': session_info}
                }
            
            default_id_type = self.get_default_identifier_type()
            logger.info(f"✅ 기본 식별자 타입: {default_id_type}")
            
            # 3. 위치 확인  
            locations = self.get_locations()
            if not locations:
                logger.error("❌ 위치 정보를 찾을 수 없음")
                return {
                    'success': False,
                    'error': 'OpenMRS에서 유효한 위치 정보를 찾을 수 없습니다',
                    'details': {
                        'session': session_info,
                        'identifier_types_count': len(identifier_types)
                    }
                }
            
            default_location = self.get_default_location()
            logger.info(f"✅ 기본 위치: {default_location}")
            
            return {
                'success': True,
                'message': 'OpenMRS 연결 및 메타데이터 확인 완료',
                'details': {
                    'session': session_info,
                    'identifier_types_count': len(identifier_types),
                    'locations_count': len(locations),
                    'default_identifier_type': default_id_type,
                    'default_location': default_location
                }
            }
            
        except Exception as e:
            logger.error(f"❌ OpenMRS 연결 테스트 실패: {e}")
            return {
                'success': False,
                'error': f'OpenMRS 연결 테스트 중 오류: {str(e)}',
                'details': {}
            }
    
    def get_identifier_types(self):
        """식별자 타입 목록 조회 (상세 로깅)"""
        if self._identifier_types is None:
            try:
                logger.info("🔄 식별자 타입 조회 중...")
                response = requests.get(
                    f"{self.api_url}/patientidentifiertype",
                    auth=self.auth,
                    headers={'Accept': 'application/json'},
                    timeout=15
                )
                
                logger.info(f"식별자 타입 API 응답: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    self._identifier_types = data.get('results', [])
                    logger.info(f"✅ 식별자 타입 조회 성공: {len(self._identifier_types)}개")
                    
                    # 🔥 상세 정보 로깅
                    for i, id_type in enumerate(self._identifier_types[:3]):  # 처음 3개만
                        logger.info(f"  [{i}] {id_type.get('display')} (UUID: {id_type.get('uuid')})")
                else:
                    logger.error(f"❌ 식별자 타입 조회 실패: {response.status_code}")
                    logger.error(f"응답 내용: {response.text[:500]}...")
                    self._identifier_types = []
            except Exception as e:
                logger.error(f"❌ 식별자 타입 조회 예외: {e}")
                self._identifier_types = []
        return self._identifier_types
    
    def get_locations(self):
        """위치 목록 조회 (상세 로깅)"""
        if self._locations is None:
            try:
                logger.info("🔄 위치 정보 조회 중...")
                response = requests.get(
                    f"{self.api_url}/location",
                    auth=self.auth,
                    headers={'Accept': 'application/json'},
                    timeout=15
                )
                
                logger.info(f"위치 API 응답: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    self._locations = data.get('results', [])
                    logger.info(f"✅ 위치 조회 성공: {len(self._locations)}개")
                    
                    # 🔥 상세 정보 로깅
                    for i, location in enumerate(self._locations[:3]):  # 처음 3개만
                        logger.info(f"  [{i}] {location.get('display')} (UUID: {location.get('uuid')})")
                else:
                    logger.error(f"❌ 위치 조회 실패: {response.status_code}")
                    logger.error(f"응답 내용: {response.text[:500]}...")
                    self._locations = []
            except Exception as e:
                logger.error(f"❌ 위치 조회 예외: {e}")
                self._locations = []
        return self._locations
    
    def get_default_identifier_type(self):
        """안전한 기본 식별자 타입 선택"""
        identifier_types = self.get_identifier_types()
        if not identifier_types:
            return None
            
        # 우선순위: OpenMRS ID > Old ID > 첫 번째
        for id_type in identifier_types:
            display = id_type.get('display', '').lower()
            if 'openmrs' in display:
                return id_type.get('uuid')
        
        for id_type in identifier_types:
            display = id_type.get('display', '').lower()
            if 'old' in display or 'patient' in display:
                return id_type.get('uuid')
        
        return identifier_types[0].get('uuid')
    
    def get_default_location(self):
        """안전한 기본 위치 선택"""
        locations = self.get_locations()
        if not locations:
            return None
            
        # 우선순위: Registration > Unknown > Default > 첫 번째
        priority_keywords = ['registration', 'unknown', 'default']
        
        for keyword in priority_keywords:
            for location in locations:
                display = location.get('display', '').lower()
                if keyword in display:
                    return location.get('uuid')
        
        return locations[0].get('uuid')
    
    def get_default_encounter_type_uuid(self):
        """기본 Encounter Type UUID 조회"""
        try:
            response = requests.get(
                f"{self.api_url}/encountertype?q=Admission",
                auth=self.auth,
                headers={'Accept': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('results'):
                    uuid = data['results'][0]['uuid']
                    logger.info(f"📋 기본 Encounter Type: {uuid}")
                    return uuid
            
            # 기본값 반환
            default_uuid = "61ae96f4-6afe-4351-b6f8-cd4fc383cce1"
            logger.warning(f"⚠️ 기본 Encounter Type 사용: {default_uuid}")
            return default_uuid
            
        except Exception as e:
            logger.error(f"❌ Encounter Type 조회 실패: {e}")
            return "61ae96f4-6afe-4351-b6f8-cd4fc383cce1"
    
    def get_default_location_uuid(self):
        """기본 Location UUID 조회"""
        try:
            location_uuid = self.get_default_location()
            if location_uuid:
                return location_uuid
            
            # 환경변수에서 기본값 가져오기
            default_uuid = os.getenv('DEFAULT_LOCATION_TYPE_UUID', 'aff27d58-a15c-49a6-9beb-d30dcfc0c66e')
            logger.warning(f"⚠️ 기본 Location 사용: {default_uuid}")
            return default_uuid
            
        except Exception as e:
            logger.error(f"❌ Location 조회 실패: {e}")
            return os.getenv('DEFAULT_LOCATION_TYPE_UUID', 'aff27d58-a15c-49a6-9beb-d30dcfc0c66e')
    
    def get_default_provider_uuid(self):
        """기본 Provider UUID 조회"""
        try:
            response = requests.get(
                f"{self.api_url}/provider?q=admin",
                auth=self.auth,
                headers={'Accept': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('results'):
                    uuid = data['results'][0]['uuid']
                    logger.info(f"👨‍⚕️ 기본 Provider: {uuid}")
                    return uuid
            
            logger.warning("⚠️ 기본 Provider를 찾을 수 없음")
            return None
            
        except Exception as e:
            logger.error(f"❌ Provider 조회 실패: {e}")
            return None
    
    def get_patient(self, patient_uuid):
        """환자 정보 조회"""
        try:
            logger.info(f"👤 환자 정보 조회: {patient_uuid}")
            
            response = requests.get(
                f"{self.api_url}/patient/{patient_uuid}?v=full",
                auth=self.auth,
                headers={'Accept': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                patient_data = response.json()
                logger.info(f"✅ 환자 조회 성공: {patient_data.get('display', 'Unknown')}")
                return patient_data
            else:
                logger.error(f"❌ 환자 조회 실패: HTTP {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"❌ 환자 조회 예외: {e}")
            return None
    
    def create_encounter(self, encounter_data):
        """🔥 Encounter 생성 - DateTime 형식 자동 처리"""
        try:
            # DateTime 형식 자동 설정
            if not encounter_data.get('encounterDatetime'):
                encounter_data['encounterDatetime'] = self._format_openmrs_datetime()
            
            logger.info(f"🏥 Encounter 생성 데이터: {encounter_data}")
            
            response = requests.post(
                f"{self.api_url}/encounter",
                auth=self.auth,
                headers={
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                json=encounter_data,
                timeout=30
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                logger.info(f"✅ Encounter 생성 성공: {result.get('uuid')}")
                return result
            else:
                logger.error(f"❌ Encounter 생성 실패: HTTP {response.status_code}")
                logger.error(f"응답 내용: {response.text}")
                return {
                    'error': f'HTTP {response.status_code}: {response.text[:200]}'
                }
                
        except Exception as e:
            logger.error(f"❌ Encounter 생성 예외: {e}")
            return {'error': f'Encounter 생성 중 예외: {str(e)}'}
    
    def create_obs(self, obs_data):
        """🔥 Observation 생성"""
        try:
            # DateTime 형식 자동 설정
            if not obs_data.get('obsDatetime'):
                obs_data['obsDatetime'] = self._format_openmrs_datetime()
            
            logger.info(f"📊 Obs 생성 데이터: {obs_data}")
            
            response = requests.post(
                f"{self.api_url}/obs",
                auth=self.auth,
                headers={
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                json=obs_data,
                timeout=30
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                logger.info(f"✅ Obs 생성 성공: {result.get('uuid')}")
                return result
            else:
                logger.error(f"❌ Obs 생성 실패: HTTP {response.status_code}")
                logger.error(f"응답 내용: {response.text}")
                return {
                    'error': f'HTTP {response.status_code}: {response.text[:200]}'
                }
                
        except Exception as e:
            logger.error(f"❌ Obs 생성 예외: {e}")
            return {'error': f'Obs 생성 중 예외: {str(e)}'}
    
    # 기존 메서드들도 유지...
    def search_concepts(self, query, concept_class=None):
        """Concept 검색"""
        try:
            url = f"{self.api_url}/concept?q={query}"
            if concept_class:
                url += f"&conceptClass={concept_class}"
            
            response = requests.get(
                url,
                auth=self.auth,
                headers={'Accept': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json().get('results', [])
            return []
            
        except Exception as e:
            logger.error(f"❌ Concept 검색 실패: {e}")
            return []
    
    def get_patient_encounters(self, patient_uuid):
        """환자의 Encounter 목록 조회"""
        try:
            response = requests.get(
                f"{self.api_url}/encounter?patient={patient_uuid}&v=full",
                auth=self.auth,
                headers={'Accept': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json().get('results', [])
            return []
            
        except Exception as e:
            logger.error(f"❌ Patient Encounters 조회 실패: {e}")
            return []