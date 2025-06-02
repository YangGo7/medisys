# backend/medical_integration/openmrs_api.py - 수정된 버전

import requests
from requests.auth import HTTPBasicAuth
from django.conf import settings
import logging

logger = logging.getLogger('medical_integration')

class OpenMRSAPI:
    """OpenMRS API 통합 클래스"""
    
    def __init__(self):
        self.base_url = f"http://{settings.EXTERNAL_SERVICES['openmrs']['host']}:{settings.EXTERNAL_SERVICES['openmrs']['port']}/openmrs"
        self.api_url = f"{self.base_url}/ws/rest/v1"
        self.username = settings.EXTERNAL_SERVICES['openmrs']['username']
        self.password = settings.EXTERNAL_SERVICES['openmrs']['password']
        self.auth = HTTPBasicAuth(self.username, self.password)
        
        # 캐시된 식별자 및 위치 정보
        self._identifier_types = None
        self._locations = None
    
    def get_session(self):
        """현재 세션 정보 조회"""
        try:
            response = requests.get(
                f"{self.api_url}/session",
                auth=self.auth,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"OpenMRS 세션 조회 실패: {e}")
            return None
    
    def get_identifier_types(self):
        """사용 가능한 식별자 타입 조회"""
        if self._identifier_types is None:
            try:
                response = requests.get(
                    f"{self.api_url}/patientidentifiertype",
                    auth=self.auth,
                    timeout=10
                )
                response.raise_for_status()
                self._identifier_types = response.json().get('results', [])
            except Exception as e:
                logger.error(f"식별자 타입 조회 실패: {e}")
                self._identifier_types = []
        return self._identifier_types
    
    def get_locations(self):
        """사용 가능한 위치 조회"""
        if self._locations is None:
            try:
                response = requests.get(
                    f"{self.api_url}/location",
                    auth=self.auth,
                    timeout=10
                )
                response.raise_for_status()
                self._locations = response.json().get('results', [])
            except Exception as e:
                logger.error(f"위치 조회 실패: {e}")
                self._locations = []
        return self._locations
    
    def get_default_identifier_type(self):
        """기본 식별자 타입 가져오기"""
        identifier_types = self.get_identifier_types()
        if identifier_types:
            # 첫 번째 식별자 타입 사용
            return identifier_types[0].get('uuid')
        return None
    
    def get_default_location(self):
        """기본 위치 가져오기"""
        locations = self.get_locations()
        if locations:
            # 첫 번째 위치 사용
            return locations[0].get('uuid')
        return None
    
    def create_patient(self, patient_data):
        """새 환자 생성 - 수정된 버전"""
        try:
            logger.info(f"환자 생성 요청: {patient_data}")
            
            # 식별자가 제공되지 않은 경우 자동 생성하지 않음 (OpenMRS에서 처리)
            if 'identifiers' in patient_data and patient_data['identifiers']:
                # 식별자 타입과 위치가 없으면 기본값 사용
                for identifier in patient_data['identifiers']:
                    if 'identifierType' not in identifier:
                        default_type = self.get_default_identifier_type()
                        if default_type:
                            identifier['identifierType'] = default_type
                    
                    if 'location' not in identifier:
                        default_location = self.get_default_location()
                        if default_location:
                            identifier['location'] = default_location
            
            response = requests.post(
                f"{self.api_url}/patient",
                json=patient_data,
                auth=self.auth,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            logger.info(f"OpenMRS 응답 상태: {response.status_code}")
            logger.info(f"OpenMRS 응답 내용: {response.text}")
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.HTTPError as e:
            logger.error(f"HTTP 오류 - 상태코드: {e.response.status_code}")
            logger.error(f"HTTP 오류 - 응답 내용: {e.response.text}")
            return None
        except Exception as e:
            logger.error(f"환자 생성 실패: {e}")
            return None
    
    def get_patient(self, patient_uuid):
        """환자 UUID로 환자 정보 조회"""
        try:
            response = requests.get(
                f"{self.api_url}/patient/{patient_uuid}?v=full",
                auth=self.auth,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"환자 정보 조회 실패 (UUID: {patient_uuid}): {e}")
            return None
    
    def search_patients(self, query):
        """환자 검색"""
        try:
            response = requests.get(
                f"{self.api_url}/patient",
                params={
                    'q': query,
                    'v': 'default'
                },
                auth=self.auth,
                timeout=15
            )
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"OpenMRS 검색 응답: {len(data.get('results', []))}명의 환자 발견")
            return data
            
        except Exception as e:
            logger.error(f"환자 검색 실패 (검색어: '{query}'): {e}")
            return None
    
    def get_encounters(self, patient_uuid):
        """환자의 모든 진료 내역 조회"""
        try:
            response = requests.get(
                f"{self.api_url}/encounter?patient={patient_uuid}&v=full",
                auth=self.auth,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"진료 내역 조회 실패 (환자 UUID: {patient_uuid}): {e}")
            return None
    
    def test_connection(self):
        """연결 테스트"""
        try:
            session_info = self.get_session()
            return session_info is not None and 'user' in session_info
        except Exception as e:
            logger.error(f"OpenMRS 연결 테스트 실패: {e}")
            return False