# backend/medical_integration/openmrs_api.py

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
        """환자 검색 - 수정된 버전"""
        try:
            # OpenMRS REST API의 환자 검색 엔드포인트
            response = requests.get(
                f"{self.api_url}/patient",
                params={
                    'q': query,
                    'v': 'default'  # 기본 representation
                },
                auth=self.auth,
                timeout=15
            )
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"OpenMRS 검색 응답: {len(data.get('results', []))}명의 환자 발견")
            return data
            
        except requests.exceptions.Timeout:
            logger.error(f"환자 검색 타임아웃 (검색어: '{query}')")
            return None
        except requests.exceptions.ConnectionError:
            logger.error(f"OpenMRS 서버 연결 실패 (검색어: '{query}')")
            return None
        except Exception as e:
            logger.error(f"환자 검색 실패 (검색어: '{query}'): {e}")
            return None
    
    def create_patient(self, patient_data):
        """새 환자 생성"""
        try:
            response = requests.post(
                f"{self.api_url}/patient",
                json=patient_data,
                auth=self.auth,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"환자 생성 실패: {e}")
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