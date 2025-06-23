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
        """🔥 P + 순차 숫자 생성 (중복 없음)"""
        try:
            # 1. DB에서 현재 최대 P 번호 찾기
            from django.db import transaction
            from .models import PatientMapping
            
            with transaction.atomic():
                # P로 시작하는 identifier 중 가장 큰 번호 찾기
                latest_mapping = PatientMapping.objects.filter(
                    patient_identifier__startswith='P',
                    patient_identifier__regex=r'^P[0-9]+$',  # P + 숫자만
                    is_active=True
                ).extra(
                    select={'num_part': 'CAST(SUBSTRING(patient_identifier, 2) AS UNSIGNED)'}
                ).order_by('-num_part').first()
                
                if latest_mapping:
                    try:
                        # P123 → 123 추출 → +1
                        current_number = int(latest_mapping.patient_identifier[1:])
                        next_number = current_number + 1
                        logger.info(f"🔖 현재 최대: {latest_mapping.patient_identifier}, 다음: P{next_number}")
                    except ValueError:
                        next_number = 1
                else:
                    next_number = 1
                    logger.info(f"🔖 첫 번째 환자: P{next_number}")
                
                # 2. 중복 확인 (혹시 모를 상황 대비)
                max_attempts = 10
                for attempt in range(max_attempts):
                    candidate = f"P{next_number + attempt}"
                    
                    # DB에서 중복 확인
                    if not PatientMapping.objects.filter(
                        patient_identifier=candidate, 
                        is_active=True
                    ).exists():
                        
                        # OpenMRS API에서도 중복 확인
                        if not self.check_identifier_exists_simple(candidate):
                            logger.info(f"✅ 고유 identifier 생성: {candidate}")
                            return candidate
                    
                    logger.warning(f"⚠️ {candidate} 중복, 다음 번호 시도...")
                
                # 최대 시도 후에도 실패하면 타임스탬프 기반
                timestamp = datetime.now().strftime("%m%d%H%M")
                fallback = f"P{timestamp}"
                logger.warning(f"🚨 fallback identifier: {fallback}")
                return fallback
                
        except Exception as e:
            logger.error(f"❌ P+숫자 생성 실패: {e}")
            # 최후의 수단
            import random
            emergency = f"P{random.randint(1000, 9999)}"
            logger.error(f"🆘 긴급 identifier: {emergency}")
            return emergency
    
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
    
    def get_patient_encounters(self, patient_uuid, limit=10):
        """환자의 Encounter 목록 조회"""
        try:
            params = {
                'patient': patient_uuid,
                'v': 'custom:(uuid,encounterDatetime,encounterType:(uuid,display),location:(uuid,display),provider:(uuid,display),obs:(uuid,concept:(uuid,display),value,valueText,valueDatetime,valueNumeric))',
                'limit': limit,
                'order': 'desc'
            }
            
            response = requests.get(
                f"{self.api_url}/encounter",
                auth=self.auth,
                headers={'Accept': 'application/json'},
                params=params,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get('results', [])
            else:
                logger.error(f"Encounter 조회 실패: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Encounter 조회 예외: {e}")
            return []

    def search_diagnosis_concepts(self, query, limit=20):
        """진단 관련 Concept 검색"""
        try:
            params = {
                'q': query,
                'conceptClasses': 'Diagnosis',
                'v': 'custom:(uuid,display,conceptClass:(uuid,display),names:(uuid,name,conceptNameType))',
                'limit': limit
            }
            
            response = requests.get(
                f"{self.api_url}/concept",
                auth=self.auth,
                headers={'Accept': 'application/json'},
                params=params,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                results = data.get('results', [])
                
                # 결과 정리 (한글명 우선)
                cleaned_results = []
                for concept in results:
                    names = concept.get('names', [])
                    display_name = concept.get('display', '')
                    
                    # 한글명이 있으면 우선 사용
                    for name in names:
                        if any('\uac00' <= char <= '\ud7af' for char in name.get('name', '')):
                            display_name = name['name']
                            break
                    
                    cleaned_results.append({
                        'uuid': concept['uuid'],
                        'display': display_name,
                        'conceptClass': concept.get('conceptClass', {}).get('display', ''),
                        'original_display': concept.get('display', '')
                    })
                
                return cleaned_results
            else:
                logger.error(f"진단 Concept 검색 실패: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"진단 Concept 검색 예외: {e}")
            return []

    def search_drug_concepts(self, query, limit=20):
        """약물 관련 Concept 검색"""
        try:
            params = {
                'q': query,
                'v': 'custom:(uuid,display,strength,dosageForm:(uuid,display),concept:(uuid,display))',
                'limit': limit
            }
            
            response = requests.get(
                f"{self.api_url}/drug",
                auth=self.auth,
                headers={'Accept': 'application/json'},
                params=params,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                results = data.get('results', [])
                
                # 약물 결과 정리
                cleaned_results = []
                for drug in results:
                    cleaned_results.append({
                        'uuid': drug['uuid'],
                        'display': drug.get('display', ''),
                        'strength': drug.get('strength', ''),
                        'dosageForm': drug.get('dosageForm', {}).get('display', ''),
                        'concept_uuid': drug.get('concept', {}).get('uuid', '')
                    })
                
                return cleaned_results
            else:
                logger.error(f"약물 검색 실패: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"약물 검색 예외: {e}")
            return []

    def create_encounter(self, patient_uuid, encounter_type_uuid=None, location_uuid=None, provider_uuid=None):
        """새 Encounter 생성"""
        try:
            # 기본값 설정
            if not encounter_type_uuid:
                encounter_type_uuid = "61ae96f4-6afe-4351-b6f8-cd4fc383cce1"  # Consultation
            if not location_uuid:
                location_uuid = self.get_default_location()
            if not provider_uuid:
                provider_uuid = self.get_default_provider()
            
            # ✅ OpenMRS가 요구하는 올바른 ISO8601 형식
            from datetime import datetime
            import pytz
            
            now_utc = datetime.now(pytz.UTC)
            encounter_datetime = now_utc.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
            
            encounter_data = {
                "patient": patient_uuid,
                "encounterType": encounter_type_uuid,
                "location": location_uuid,
                "provider": provider_uuid,
                "encounterDatetime": encounter_datetime  # ✅ 올바른 형식
            }
            
            print(f"🕐 Encounter 날짜 형식: {encounter_datetime}")  # 디버깅용
            
            response = requests.post(
                f"{self.api_url}/encounter",
                auth=self.auth,
                headers={'Content-Type': 'application/json', 'Accept': 'application/json'},
                json=encounter_data,
                timeout=15
            )
            
            if response.status_code == 201:
                return response.json()
            else:
                logger.error(f"Encounter 생성 실패: {response.status_code}, {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Encounter 생성 예외: {e}")
            return None

    def create_observation(self, obs_data):
        """Observation 생성"""
        try:
            # ✅ obsDatetime 올바른 형식으로 설정
            if 'obsDatetime' not in obs_data:
                from datetime import datetime
                import pytz
                
                now_utc = datetime.now(pytz.UTC)
                obs_data['obsDatetime'] = now_utc.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
            
            response = requests.post(
                f"{self.api_url}/obs",
                auth=self.auth,
                headers={'Content-Type': 'application/json', 'Accept': 'application/json'},
                json=obs_data,
                timeout=15
            )
            
            if response.status_code == 201:
                return response.json()
            else:
                logger.error(f"Observation 생성 실패: {response.status_code}, {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Observation 생성 예외: {e}")
            return None

    def create_diagnosis_obs(self, patient_uuid, encounter_uuid, diagnosis_concept_uuid, diagnosis_notes=""):
        """진단 Observation 생성"""
        try:
            # 진단용 Concept UUID (실제 OpenMRS 환경에 맞게 수정 필요)
            DIAGNOSIS_CONCEPT_UUID = "159947AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"  # Visit Diagnoses
            
            obs_data = {
                "person": patient_uuid,
                "encounter": encounter_uuid,
                "concept": DIAGNOSIS_CONCEPT_UUID,
                "value": diagnosis_concept_uuid,  # 진단 concept의 UUID
                "comment": diagnosis_notes,
                "obsDatetime": datetime.now().isoformat()
            }
            
            return self.create_observation(obs_data)
            
        except Exception as e:
            logger.error(f"진단 Observation 생성 예외: {e}")
            return None

    def create_prescription_obs_group(self, patient_uuid, encounter_uuid, prescription_data):
        """처방 관련 Observation 그룹 생성"""
        try:
            obs_list = []
            
            # 약물명 Observation
            if prescription_data.get('drug_uuid'):
                drug_obs = self.create_observation({
                    "person": patient_uuid,
                    "encounter": encounter_uuid,
                    "concept": "1282AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",  # Drug Orders
                    "value": prescription_data['drug_uuid'],
                    "comment": f"약물: {prescription_data.get('drug_name', '')}"
                })
                if drug_obs:
                    obs_list.append(drug_obs)
            
            # 용량 Observation
            if prescription_data.get('dosage'):
                dosage_obs = self.create_observation({
                    "person": patient_uuid,
                    "encounter": encounter_uuid,
                    "concept": "160856AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",  # Dosage
                    "valueText": f"{prescription_data['dosage']} {prescription_data.get('dose_units', 'mg')}",
                    "comment": "용량"
                })
                if dosage_obs:
                    obs_list.append(dosage_obs)
            
            # 복용 빈도 Observation
            if prescription_data.get('frequency'):
                frequency_obs = self.create_observation({
                    "person": patient_uuid,
                    "encounter": encounter_uuid,
                    "concept": "160855AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",  # Frequency
                    "valueText": prescription_data['frequency'],
                    "comment": "복용 빈도"
                })
                if frequency_obs:
                    obs_list.append(frequency_obs)
            
            # 복용 기간 Observation
            if prescription_data.get('duration'):
                duration_obs = self.create_observation({
                    "person": patient_uuid,
                    "encounter": encounter_uuid,
                    "concept": "159368AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",  # Duration
                    "valueText": prescription_data['duration'],
                    "comment": "복용 기간"
                })
                if duration_obs:
                    obs_list.append(duration_obs)
            
            # 복용 지시사항 Observation
            if prescription_data.get('instructions'):
                instructions_obs = self.create_observation({
                    "person": patient_uuid,
                    "encounter": encounter_uuid,
                    "concept": "162749AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",  # Instructions
                    "valueText": prescription_data['instructions'],
                    "comment": "복용 지시사항"
                })
                if instructions_obs:
                    obs_list.append(instructions_obs)
            
            return obs_list
            
        except Exception as e:
            logger.error(f"처방 Observation 그룹 생성 예외: {e}")
            return []

    def get_default_provider(self):
        """기본 Provider UUID 반환"""
        try:
            response = requests.get(
                f"{self.api_url}/provider",
                auth=self.auth,
                headers={'Accept': 'application/json'},
                params={'v': 'default', 'limit': 1},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                results = data.get('results', [])
                if results:
                    return results[0]['uuid']
            
            # 기본값 반환
            return "ae7a0028-dcc8-11e3-92bb-0800200c9a66"  # 실제 환경에 맞게 수정
            
        except Exception as e:
            logger.error(f"기본 Provider 조회 예외: {e}")
            return "ae7a0028-dcc8-11e3-92bb-0800200c9a66"

    def get_default_location(self):
        """기본 Location UUID 반환"""
        try:
            # 기존 get_locations 메서드 활용
            locations = self.get_locations()
            if locations:
                return locations[0]['uuid']
            
            # 기본값 반환
            return "aff27d58-a15c-49a6-9beb-d30dcfc0c66e"  # 실제 환경에 맞게 수정
            
        except Exception as e:
            logger.error(f"기본 Location 조회 예외: {e}")
            return "aff27d58-a15c-49a6-9beb-d30dcfc0c66e"

    def get_patient_clinical_summary(self, patient_uuid, limit=5):
        """환자의 최근 임상 데이터 요약"""
        try:
            encounters = self.get_patient_encounters(patient_uuid, limit)
            
            clinical_data = []
            for encounter in encounters:
                encounter_summary = {
                    'encounter_uuid': encounter['uuid'],
                    'encounter_datetime': encounter['encounterDatetime'],
                    'encounter_type': encounter.get('encounterType', {}).get('display', ''),
                    'location': encounter.get('location', {}).get('display', ''),
                    'provider': encounter.get('provider', {}).get('display', ''),
                    'diagnoses': [],
                    'prescriptions': [],
                    'other_obs': []
                }
                
                # Observations 분류
                for obs in encounter.get('obs', []):
                    concept_display = obs.get('concept', {}).get('display', '')
                    obs_value = obs.get('value') or obs.get('valueText') or obs.get('valueNumeric')
                    
                    if 'diagnosis' in concept_display.lower():
                        encounter_summary['diagnoses'].append({
                            'concept': concept_display,
                            'value': obs_value,
                            'obs_uuid': obs['uuid']
                        })
                    elif any(keyword in concept_display.lower() for keyword in ['drug', 'medication', 'dosage', 'frequency']):
                        encounter_summary['prescriptions'].append({
                            'concept': concept_display,
                            'value': obs_value,
                            'obs_uuid': obs['uuid']
                        })
                    else:
                        encounter_summary['other_obs'].append({
                            'concept': concept_display,
                            'value': obs_value,
                            'obs_uuid': obs['uuid']
                        })
                
                clinical_data.append(encounter_summary)
            
            return clinical_data
            
        except Exception as e:
            logger.error(f"환자 임상 요약 조회 예외: {e}")
            return []