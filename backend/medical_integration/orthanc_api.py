from django.utils import timezone
import logging
from .models import PatientMapping
from .orthanc_api import OrthancAPI


logger = logging.getLogger('medical_integration')

class OrthancAPI:
    """Orthanc API 통합 클래스"""
    
    def __init__(self):
        self.base_url = f"http://{settings.EXTERNAL_SERVICES['orthanc']['host']}:{settings.EXTERNAL_SERVICES['orthanc']['port']}"
        self.username = settings.EXTERNAL_SERVICES['orthanc']['username']
        self.password = settings.EXTERNAL_SERVICES['orthanc']['password']
        self.auth = HTTPBasicAuth(self.username, self.password)
    
    def get(self, endpoint):
        """일반 GET 요청"""
        try:
            # endpoint가 /로 시작하면 제거
            if endpoint.startswith('/'):
                endpoint = endpoint[1:]
                
            response = requests.get(
                f"{self.base_url}/{endpoint}",
                auth=self.auth
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Orthanc GET 요청 실패 (endpoint: {endpoint}): {e}")
            return None
    
    def post(self, endpoint, data=None, files=None):
        """일반 POST 요청"""
        try:
            # endpoint가 /로 시작하면 제거
            if endpoint.startswith('/'):
                endpoint = endpoint[1:]
            
            response = requests.post(
                f"{self.base_url}/{endpoint}",
                json=data,
                files=files,
                auth=self.auth
            )
            response.raise_for_status()
            
            # 응답이 JSON인 경우만 파싱
            if response.headers.get('Content-Type', '').startswith('application/json'):
                return response.json()
            else:
                return response.content
                
        except Exception as e:
            logger.error(f"Orthanc POST 요청 실패 (endpoint: {endpoint}): {e}")
            return None
    
    def get_patients(self):
        """모든 환자 ID 목록 조회"""
        return self.get("patients")
    
    def get_patient(self, patient_id):
        """환자 ID로 환자 정보 조회"""
        return self.get(f"patients/{patient_id}")
    
    def get_patient_studies(self, patient_id):
        """환자 ID로 모든 Study 조회"""
        return self.get(f"patients/{patient_id}/studies")
    
    def get_study(self, study_id):
        """Study ID로 Study 정보 조회"""
        return self.get(f"studies/{study_id}")
    
    def get_study_series(self, study_id):
        """Study ID로 모든 Series 조회"""
        return self.get(f"studies/{study_id}/series")
    
    def get_instance(self, instance_id):
        """Instance ID로 Instance 정보 조회"""
        return self.get(f"instances/{instance_id}")
    
    def get_instance_tags(self, instance_id):
        """Instance ID로 DICOM 태그 조회"""
        return self.get(f"instances/{instance_id}/tags")
    
    def get_instance_preview(self, instance_id):
        """Instance ID로 미리보기 이미지 가져오기"""
        try:
            response = requests.get(
                f"{self.base_url}/instances/{instance_id}/preview",
                auth=self.auth
            )
            response.raise_for_status()
            return response.content  # 이미지 바이너리 반환
        except Exception as e:
            logger.error(f"인스턴스 미리보기 가져오기 실패 (instance_id: {instance_id}): {e}")
            return None