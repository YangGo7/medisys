# backend/medical_integration/openmrs_api.py (긴급 수정 버전)
import requests
import logging
from datetime import datetime
from django.conf import settings

logger = logging.getLogger(__name__)

class OpenMRSAPI:
    def __init__(self):
        try:
            config = settings.EXTERNAL_SERVICES['openmrs']
            self.api_url = f"http://{config['host']}:{config['port']}/openmrs/ws/rest/v1"
            self.auth = (config['username'], config['password'])
        except (KeyError, AttributeError):
            self.api_url = "http://127.0.0.1:8082/openmrs/ws/rest/v1"
            self.auth = ('admin', 'Admin123')
        
        self._identifier_types = None
        self._locations = None
        self._session_checked = False
        logger.info(f"🔧 OpenMRS API 초기화: {self.api_url}")
    
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
    
    def generate_unique_identifier(self):
        """더 안전한 식별자 생성"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        return f"1{timestamp}"  # OpenMRS 호환 형식
    
    def create_patient_with_auto_openmrs_id(self, patient_data, custom_identifier=None):
        """🔥 안전 모드 환자 생성"""
        try:
            logger.info(f"🔄 안전 모드 환자 생성 시작...")
            
            # 1. 상세 연결 테스트
            connection_test = self.test_connection_detailed()
            if not connection_test['success']:
                return {
                    'success': False,
                    'error': connection_test['error']
                }
            
            logger.info("✅ 연결 및 메타데이터 테스트 통과")
            
            # 2. 환자 데이터 검증
            required_fields = ['givenName', 'familyName', 'gender', 'birthdate']
            for field in required_fields:
                if not patient_data.get(field):
                    return {
                        'success': False,
                        'error': f'필수 필드 누락: {field}'
                    }
            
            # 3. 식별자 처리
            if custom_identifier and custom_identifier.strip():
                patient_identifier = custom_identifier.strip()
                logger.info(f"🔖 사용자 지정 식별자: {patient_identifier}")
            else:
                patient_identifier = self.generate_unique_identifier()
                logger.info(f"🔖 자동 생성 식별자: {patient_identifier}")
            
            # 4. 메타데이터 가져오기
            identifier_type = self.get_default_identifier_type()
            location = self.get_default_location()
            
            # 🔥 핵심: 메타데이터 검증
            if not identifier_type:
                return {
                    'success': False,
                    'error': 'OpenMRS에서 유효한 식별자 타입을 찾을 수 없습니다. OpenMRS 설정을 확인해주세요.'
                }
                
            if not location:
                return {
                    'success': False,
                    'error': 'OpenMRS에서 유효한 위치를 찾을 수 없습니다. OpenMRS 설정을 확인해주세요.'
                }
            
            # 5. 최소한의 안전한 데이터 구성
            openmrs_patient_data = {
                'person': {
                    'names': [{
                        'givenName': str(patient_data['givenName']).strip(),
                        'familyName': str(patient_data['familyName']).strip(),
                        'preferred': True
                    }],
                    'gender': str(patient_data['gender']).upper(),
                    'birthdate': str(patient_data['birthdate'])
                },
                'identifiers': [{
                    'identifier': patient_identifier,
                    'identifierType': identifier_type,
                    'location': location,
                    'preferred': True
                }]
            }
            
            # middleName 추가 (있는 경우에만)
            if patient_data.get('middleName'):
                openmrs_patient_data['person']['names'][0]['middleName'] = str(patient_data['middleName']).strip()
            
            logger.info(f"📤 최종 전송 데이터: {openmrs_patient_data}")
            
            # 6. 환자 생성 API 호출
            response = requests.post(
                f"{self.api_url}/patient",
                json=openmrs_patient_data,
                auth=self.auth,
                headers={
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout=30
            )
            
            logger.info(f"📥 OpenMRS 응답: {response.status_code}")
            
            if response.status_code in [200, 201]:
                result = response.json()
                logger.info(f"✅ 환자 생성 성공: {result.get('uuid')}")
                
                return {
                    'success': True,
                    'message': '환자가 성공적으로 생성되었습니다',
                    'patient': {
                        'uuid': result.get('uuid'),
                        'display': result.get('display'),
                        'identifiers': result.get('identifiers', []),
                        'patient_identifier': patient_identifier
                    },
                    'auto_generated': not bool(custom_identifier)
                }
            else:
                # 🔥 상세 에러 로깅
                error_content = response.text
                logger.error(f"❌ 환자 생성 실패: {response.status_code}")
                logger.error(f"❌ 응답 내용 (처음 1000자): {error_content[:1000]}")
                
                # HTML 에러 페이지인 경우 간단한 메시지로 변환
                if 'Internal Server Error' in error_content:
                    error_msg = 'OpenMRS 서버 내부 오류가 발생했습니다. 관리자에게 문의하세요.'
                else:
                    try:
                        error_data = response.json()
                        error_msg = error_data.get('error', {}).get('message', '알 수 없는 오류')
                    except:
                        error_msg = f'OpenMRS API 오류 (코드: {response.status_code})'
                
                return {
                    'success': False,
                    'error': error_msg
                }
                
        except requests.exceptions.Timeout:
            logger.error("❌ OpenMRS API 타임아웃")
            return {
                'success': False,
                'error': 'OpenMRS 서버 응답 시간이 초과되었습니다'
            }
        except requests.exceptions.ConnectionError:
            logger.error("❌ OpenMRS 연결 실패")
            return {
                'success': False,
                'error': 'OpenMRS 서버에 연결할 수 없습니다'
            }
        except Exception as e:
            logger.error(f"❌ 예상치 못한 오류: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                'success': False,
                'error': f'예상치 못한 오류가 발생했습니다: {str(e)}'
            }
    
    # 기존 메서드들...
    def create_patient_with_manual_id(self, patient_data, manual_identifier):
        return self.create_patient_with_auto_openmrs_id(patient_data, manual_identifier)
    
    # 기존 메서드들도 유지
    def create_patient_with_manual_id(self, patient_data, manual_identifier):
        """수동 ID로 환자 생성"""
        return self.create_patient_with_auto_openmrs_id(patient_data, manual_identifier)
    
    def get_patient(self, patient_uuid):
        """환자 정보 조회"""
        try:
            response = requests.get(
                f"{self.api_url}/patient/{patient_uuid}",
                auth=self.auth,
                headers={'Accept': 'application/json'},
                timeout=15
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"환자 조회 실패: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"환자 조회 실패: {e}")
            return None
    
    def search_patients(self, query):
        """환자 검색"""
        try:
            response = requests.get(
                f"{self.api_url}/patient",
                params={'q': query, 'v': 'default'},
                auth=self.auth,
                headers={'Accept': 'application/json'},
                timeout=15
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"환자 검색 실패: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"환자 검색 실패: {e}")
            return None
    
    def get_session(self):
        """현재 세션 정보 조회"""
        try:
            response = requests.get(
                f"{self.api_url}/session",
                auth=self.auth,
                headers={'Accept': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return {'error': f'세션 조회 실패: {response.status_code}'}
                
        except Exception as e:
            return {'error': f'세션 조회 예외: {str(e)}'}