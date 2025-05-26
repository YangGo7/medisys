import requests
from requests.auth import HTTPBasicAuth
from django.conf import settings
import logging

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
                auth=self.auth,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Orthanc GET 요청 실패 (endpoint: {endpoint}): {e}")
            return None
        except Exception as e:
            logger.error(f"Orthanc GET 요청 처리 중 오류 (endpoint: {endpoint}): {e}")
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
                auth=self.auth,
                timeout=30
            )
            response.raise_for_status()
            
            # 응답이 JSON인 경우만 파싱
            content_type = response.headers.get('Content-Type', '')
            if 'application/json' in content_type:
                return response.json()
            else:
                return response.content
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Orthanc POST 요청 실패 (endpoint: {endpoint}): {e}")
            return None
        except Exception as e:
            logger.error(f"Orthanc POST 요청 처리 중 오류 (endpoint: {endpoint}): {e}")
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
    
    def get_series(self, series_id):
        """Series ID로 Series 정보 조회"""
        return self.get(f"series/{series_id}")
    
    def get_series_instances(self, series_id):
        """Series ID로 모든 Instance 조회"""
        return self.get(f"series/{series_id}/instances")
    
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
                auth=self.auth,
                timeout=30
            )
            response.raise_for_status()
            return response.content  # 이미지 바이너리 반환
        except requests.exceptions.RequestException as e:
            logger.error(f"인스턴스 미리보기 가져오기 실패 (instance_id: {instance_id}): {e}")
            return None
        except Exception as e:
            logger.error(f"인스턴스 미리보기 처리 중 오류 (instance_id: {instance_id}): {e}")
            return None
    
    def search_patients_by_name(self, patient_name):
        """환자 이름으로 검색"""
        try:
            # Orthanc의 경우 직접 검색 API가 제한적이므로 
            # 모든 환자를 가져와서 필터링
            all_patients = self.get_patients()
            if not all_patients:
                return []
            
            matching_patients = []
            for patient_id in all_patients:
                patient_info = self.get_patient(patient_id)
                if patient_info and 'MainDicomTags' in patient_info:
                    patient_name_in_dicom = patient_info['MainDicomTags'].get('PatientName', '')
                    if patient_name.lower() in patient_name_in_dicom.lower():
                        matching_patients.append({
                            'patient_id': patient_id,
                            'patient_info': patient_info
                        })
            
            return matching_patients
        except Exception as e:
            logger.error(f"환자 이름 검색 실패 (name: {patient_name}): {e}")
            return []
    
    def test_connection(self):
        """Orthanc 서버 연결 테스트"""
        try:
            response = requests.get(
                f"{self.base_url}/system",
                auth=self.auth,
                timeout=10
            )
            response.raise_for_status()
            system_info = response.json()
            logger.info(f"Orthanc 연결 성공: {system_info.get('Name', 'Unknown')} "
                       f"버전 {system_info.get('Version', 'Unknown')}")
            return True
        except Exception as e:
            logger.error(f"Orthanc 연결 실패: {e}")
            return False