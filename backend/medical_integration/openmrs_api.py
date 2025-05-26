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
                auth=self.auth
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
                auth=self.auth
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
                f"{self.api_url}/patient?q={query}&v=full",
                auth=self.auth
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"환자 검색 실패 (검색어: '{query}'): {e}")
            return None
    
    def create_patient(self, patient_data):
        """새 환자 생성"""
        try:
            response = requests.post(
                f"{self.api_url}/patient",
                json=patient_data,
                auth=self.auth
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
                auth=self.auth
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"진료 내역 조회 실패 (환자 UUID: {patient_uuid}): {e}")
            return None