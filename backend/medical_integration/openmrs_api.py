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
        """🔥 수정: 실제 존재하는 위치 UUID 반환"""
        locations = self.get_locations()
        if not locations:
            logger.error("❌ 사용 가능한 위치가 없습니다")
            return None
        
        # 🔥 실제 조회된 위치 목록 출력
        logger.info(f"📍 사용 가능한 위치들:")
        for i, location in enumerate(locations):
            uuid = location.get('uuid')
            display = location.get('display')
            retired = location.get('retired', False)
            logger.info(f"  [{i}] {display} (UUID: {uuid}) {'[비활성]' if retired else '[활성]'}")
        
        # 🔥 활성화된 위치들만 필터링
        active_locations = [loc for loc in locations if not loc.get('retired', False)]
        
        if not active_locations:
            logger.warning("⚠️ 활성화된 위치가 없어서 모든 위치 중에서 선택")
            active_locations = locations
        
        # 🔥 우선순위 키워드로 검색 (순서대로)
        priority_keywords = [
            'unknown',
            'amani',  # 1 관련
            'outpatient',    # 외래 관련
            'clinic',        # 클리닉
            'hospital',      # 병원
        ]
        
        for keyword in priority_keywords:
            for location in active_locations:
                display = location.get('display', '').lower()
                if keyword in display:
                    selected_uuid = location.get('uuid')
                    logger.info(f"✅ 키워드 '{keyword}' 매칭 위치 선택: {location['display']} (UUID: {selected_uuid})")
                    return selected_uuid
        
        # 🔥 키워드 매칭이 안되면 첫 번째 활성 위치 선택
        first_location = active_locations[0]
        selected_uuid = first_location.get('uuid')
        logger.info(f"✅ 첫 번째 활성 위치 선택: {first_location['display']} (UUID: {selected_uuid})")
        return selected_uuid
    
    def get_safe_location(self):
        """🔥 안전한 위치 선택 - get_default_location과 동일하게 수정"""
        return self.get_default_location()
    
    def get_next_sequential_identifier(self):
        """🔥 P10000, P10001, P10002... 형식의 순차적 identifier 생성"""
        try:
            # 1. 현재 가장 큰 번호 조회
            response = requests.get(
                f"{self.api_url}/patient",
                params={
                    'q': 'P1',  # P1로 시작하는 identifier 검색
                    'v': 'default',
                    'limit': 100
                },
                auth=self.auth,
                headers={'Accept': 'application/json'},
                timeout=15
            )
            
            max_number = 10000  # 시작 번호
            
            if response.status_code == 200:
                results = response.json().get('results', [])
                
                # 기존 P1xxxx 형식의 identifier들에서 최대 번호 찾기
                for patient in results:
                    identifiers = patient.get('identifiers', [])
                    for id_info in identifiers:
                        identifier = id_info.get('identifier', '')
                        if identifier.startswith('P1') and len(identifier) >= 6:
                            try:
                                # P10000 -> 10000 추출
                                number_part = identifier[1:]  # P 제거
                                if number_part.isdigit():
                                    current_number = int(number_part)
                                    if current_number >= 10000:  # P1xxxx 형식만
                                        max_number = max(max_number, current_number)
                            except ValueError:
                                continue
            
            # 다음 번호 생성
            next_number = max_number + 1
            next_identifier = f"P{next_number}"
            
            logger.info(f"🔖 순차적 identifier 생성: {next_identifier} (이전 최대: P{max_number})")
            return next_identifier
            
        except Exception as e:
            logger.error(f"❌ 순차적 identifier 생성 실패: {e}")
            # 실패시 안전한 fallback
            import random
            fallback_number = 10000 + random.randint(1, 9999)
            fallback_identifier = f"P{fallback_number}"
            logger.warning(f"⚠️ fallback identifier 사용: {fallback_identifier}")
            return fallback_identifier

    def verify_identifier_unique(self, identifier, max_attempts=3):
        """identifier 고유성 확인 및 중복시 새 번호 생성"""
        for attempt in range(max_attempts):
            try:
                # 중복 확인
                response = requests.get(
                    f"{self.api_url}/patient",
                    params={'identifier': identifier},
                    auth=self.auth,
                    headers={'Accept': 'application/json'},
                    timeout=10
                )
                
                if response.status_code == 200:
                    results = response.json().get('results', [])
                    
                    if not results:
                        # 중복 없음 - 사용 가능
                        logger.info(f"✅ identifier 고유성 확인: {identifier}")
                        return identifier
                    else:
                        # 중복 발견 - 번호 증가
                        logger.warning(f"⚠️ identifier 중복: {identifier}")
                        
                        # P10001 -> 10001 추출하고 +1
                        try:
                            number_part = int(identifier[1:])
                            new_number = number_part + 1
                            identifier = f"P{new_number}"
                            logger.info(f"🔄 새로운 identifier 시도: {identifier}")
                        except ValueError:
                            # 파싱 실패시 랜덤
                            import random
                            identifier = f"P{10000 + random.randint(1, 9999)}"
                            logger.warning(f"🎲 랜덤 identifier 시도: {identifier}")
                else:
                    logger.error(f"❌ identifier 확인 API 오류: {response.status_code}")
                    break
                    
            except Exception as e:
                logger.error(f"❌ identifier 확인 실패: {e}")
                break
        
        # 최대 시도 후에도 실패시 타임스탬프 기반으로 생성
        from datetime import datetime
        timestamp_suffix = datetime.now().strftime("%m%d%H%M")
        fallback_identifier = f"P1{timestamp_suffix}"
        logger.warning(f"🚨 최종 fallback identifier: {fallback_identifier}")
        return fallback_identifier

    def generate_unique_identifier(self):
        """기존 호환성을 위한 메서드"""
        return self.get_next_identifier_from_db()

    # 🔥 데이터베이스 기반 순차 번호 관리 (더 안전한 방법)
    def get_next_identifier_from_db(self):
        """🔥 Django DB를 이용한 더 안전한 순차 번호 관리"""
        try:
            from django.db import transaction
            from .models import PatientMapping
            
            with transaction.atomic():
                # 가장 큰 P1xxxx 형식의 identifier 찾기
                latest_mapping = PatientMapping.objects.filter(
                    patient_identifier__startswith='P1',
                    patient_identifier__regex=r'^P1[0-9]{4,}$'
                ).order_by('-patient_identifier').first()
                
                if latest_mapping:
                    try:
                        # P10001 -> 10001 추출
                        current_number = int(latest_mapping.patient_identifier[1:])
                        next_number = current_number + 1
                    except ValueError:
                        next_number = 10000
                else:
                    next_number = 10000
                
                next_identifier = f"P{next_number}"
                logger.info(f"🔖 DB 기반 순차 identifier: {next_identifier}")
                return next_identifier
                
        except Exception as e:
            logger.error(f"❌ DB 기반 identifier 생성 실패: {e}")
            # fallback to API 방식
            return self.get_next_sequential_identifier()

    # 메인 환자 생성 메서드에서 사용
    def create_patient_with_auto_openmrs_id(self, patient_data, custom_identifier=None):
        """🔥 수정된 환자 생성 메서드 - 에러 수정"""
        try:
            logger.info(f"🔄 순차적 identifier로 환자 생성 시작...")
            
            # 연결 테스트
            connection_test = self.test_connection_detailed()
            if not connection_test['success']:
                return {
                    'success': False,
                    'error': connection_test['error']
                }
            
            # identifier 생성
            if custom_identifier and custom_identifier.strip():
                patient_identifier = custom_identifier.strip()
                logger.info(f"🔖 사용자 지정 identifier: {patient_identifier}")
            else:
                # 🔥 DB 기반으로 먼저 시도
                try:
                    patient_identifier = self.get_next_identifier_from_db()
                except Exception as db_error:
                    logger.warning(f"⚠️ DB 기반 실패, API 기반으로 fallback: {db_error}")
                    patient_identifier = self.get_next_sequential_identifier()
                
                # 🔥 중복 확인 (이제 메서드가 있음)
                if self.check_identifier_exists(patient_identifier):
                    logger.warning(f"⚠️ 생성된 identifier 중복, 다시 시도...")
                    patient_identifier = self.get_next_sequential_identifier()
                    
                    # 한 번 더 중복 확인
                    if self.check_identifier_exists(patient_identifier):
                        # 최후의 수단: 타임스탬프 추가
                        from datetime import datetime
                        timestamp = datetime.now().strftime("%H%M%S")
                        patient_identifier = f"P1{timestamp}"
                        logger.warning(f"🚨 최후의 수단 identifier: {patient_identifier}")
            
            # 메타데이터 가져오기
            identifier_type = self.get_default_identifier_type()
            location = self.get_default_location()
            
            if not identifier_type or not location:
                return {
                    'success': False,
                    'error': 'OpenMRS 메타데이터 조회 실패'
                }
            
            # 환자 데이터 구성
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
            
            # middleName 추가
            if patient_data.get('middleName'):
                openmrs_patient_data['person']['names'][0]['middleName'] = str(patient_data['middleName']).strip()
            
            logger.info(f"📤 최종 전송 데이터: identifier={patient_identifier}")
            logger.info(f"📤 전송 데이터: {openmrs_patient_data}")
            
            # API 호출
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
                logger.info(f"✅ 환자 생성 성공: UUID={result.get('uuid')}, ID={patient_identifier}")
                
                return {
                    'success': True,
                    'message': f'환자 생성 성공 (ID: {patient_identifier})',
                    'patient': {
                        'uuid': result.get('uuid'),
                        'display': result.get('display'),
                        'identifiers': result.get('identifiers', []),
                        'patient_identifier': patient_identifier
                    },
                    'auto_generated': not bool(custom_identifier),
                    'identifier_format': 'P_sequential'
                }
            else:
                error_content = response.text
                logger.error(f"❌ 환자 생성 실패: {response.status_code}")
                logger.error(f"❌ 응답 내용: {error_content[:500]}")
                
                return {
                    'success': False,
                    'error': f'OpenMRS API 오류 (코드: {response.status_code})'
                }
                
        except Exception as e:
            logger.error(f"❌ 환자 생성 예외: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {
                'success': False,
                'error': f'환자 생성 중 오류: {str(e)}'
            }
    def check_identifier_exists(self, identifier):
        """🔥 추가: identifier 중복 확인 메서드"""
        try:
            logger.info(f"🔍 identifier 중복 확인: {identifier}")
            
            response = requests.get(
                f"{self.api_url}/patient",
                params={
                    'identifier': identifier,
                    'v': 'default'
                },
                auth=self.auth,
                headers={'Accept': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                results = response.json().get('results', [])
                
                if results:
                    logger.warning(f"⚠️ identifier 중복 발견: {identifier}")
                    for patient in results:
                        logger.warning(f"   기존 환자: {patient.get('display')} ({patient.get('uuid')})")
                    return True
                else:
                    logger.info(f"✅ identifier 사용 가능: {identifier}")
                    return False
            else:
                logger.warning(f"⚠️ identifier 확인 API 오류: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ identifier 중복 확인 실패: {e}")
            # 에러 시 안전하게 중복 없음으로 처리
            return False

    def get_next_identifier_from_db(self):
        """🔥 DB 기반 순차 identifier 생성"""
        try:
            from django.db import transaction
            from .models import PatientMapping
            
            with transaction.atomic():
                # P1로 시작하는 identifier 중 가장 큰 번호 찾기
                latest_mapping = PatientMapping.objects.filter(
                    patient_identifier__startswith='P1',
                    patient_identifier__regex=r'^P1[0-9]{4,}$',
                    is_active=True
                ).order_by('-patient_identifier').first()
                
                if latest_mapping:
                    try:
                        # P10001 -> 10001 추출
                        current_number = int(latest_mapping.patient_identifier[1:])
                        next_number = current_number + 1
                        logger.info(f"🔖 현재 최대 번호: P{current_number}, 다음: P{next_number}")
                    except ValueError:
                        next_number = 10000
                        logger.info(f"🔖 번호 파싱 실패, 기본값 사용: P{next_number}")
                else:
                    next_number = 10000
                    logger.info(f"🔖 첫 번째 환자, 시작 번호: P{next_number}")
                
                next_identifier = f"P{next_number}"
                logger.info(f"🎯 DB 기반 생성된 identifier: {next_identifier}")
                return next_identifier
                
        except Exception as e:
            logger.error(f"❌ DB 기반 identifier 생성 실패: {e}")
            # fallback: 간단한 방식
            return "P10000"

    def get_next_sequential_identifier(self):
        """🔥 API 기반 순차 identifier 생성 (fallback)"""
        try:
            logger.info(f"🔄 API 기반 순차 identifier 조회...")
            
            response = requests.get(
                f"{self.api_url}/patient",
                params={
                    'q': 'P1',
                    'v': 'default',
                    'limit': 50
                },
                auth=self.auth,
                headers={'Accept': 'application/json'},
                timeout=15
            )
            
            max_number = 10000  # 기본 시작 번호
            
            if response.status_code == 200:
                results = response.json().get('results', [])
                logger.info(f"🔍 API에서 {len(results)}개 환자 조회됨")
                
                for patient in results:
                    identifiers = patient.get('identifiers', [])
                    for id_info in identifiers:
                        identifier = id_info.get('identifier', '')
                        if identifier.startswith('P1') and len(identifier) >= 6:
                            try:
                                number_part = identifier[1:]  # P 제거
                                if number_part.isdigit():
                                    current_number = int(number_part)
                                    if current_number >= 10000:
                                        max_number = max(max_number, current_number)
                                        logger.info(f"   발견된 번호: {identifier} -> {current_number}")
                            except ValueError:
                                continue
            
            next_number = max_number + 1
            next_identifier = f"P{next_number}"
            
            logger.info(f"🎯 API 기반 생성된 identifier: {next_identifier} (이전 최대: P{max_number})")
            return next_identifier
            
        except Exception as e:
            logger.error(f"❌ API 기반 identifier 생성 실패: {e}")
            return "P10000"
    
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