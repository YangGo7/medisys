# 백엔드에서 사용할 OpenMRS 연결 테스트 및 수정

import requests
import os
from urllib.parse import urljoin

class OpenMRSConnection:
    def __init__(self):
        # 다양한 OpenMRS URL 시도
        self.possible_urls = [
            "http://35.225.63.41:8082/openmrs/",
            "http://openmrs-server:8080/openmrs/",  # 컨테이너 이름으로 접근
            "http://localhost:8082/openmrs/",
        ]
        self.auth = ('admin', 'Admin123')
        self.working_url = None
        
    def test_connection(self):
        for url in self.possible_urls:
            try:
                print(f"Testing {url}...")
                response = requests.get(
                    urljoin(url, "ws/rest/v1/"),
                    auth=self.auth,
                    timeout=10
                )
                if response.status_code == 200:
                    print(f"✅ 연결 성공: {url}")
                    self.working_url = url
                    return url
                else:
                    print(f"❌ HTTP {response.status_code}: {url}")
            except Exception as e:
                print(f"❌ 연결 실패 {url}: {e}")
        
        return None
    
    def create_patient(self, patient_data):
        if not self.working_url:
            self.test_connection()
            
        if not self.working_url:
            raise Exception("OpenMRS 서버에 연결할 수 없습니다")
            
        url = urljoin(self.working_url, "ws/rest/v1/patient")
        
        payload = {
            "person": {
                "gender": patient_data.get("gender"),
                "birthdate": patient_data.get("birthdate"),
                "names": [{
                    "givenName": patient_data.get("givenName"),
                    "familyName": patient_data.get("familyName"),
                    "preferred": True
                }]
            }
        }
        
        try:
            response = requests.post(
                url,
                json=payload,
                auth=self.auth,
                timeout=30
            )
            
            if response.status_code == 201:
                return response.json()
            else:
                raise Exception(f"Patient 생성 실패: HTTP {response.status_code}")
                
        except Exception as e:
            raise Exception(f"OpenMRS API 호출 실패: {e}")

# 테스트 실행
if __name__ == "__main__":
    conn = OpenMRSConnection()
    working_url = conn.test_connection()
    
    if working_url:
        print(f"\n✅ 사용 가능한 OpenMRS URL: {working_url}")
        
        # 테스트 환자 생성
        test_patient = {
            "givenName": "테스트",
            "familyName": "환자",
            "gender": "M",
            "birthdate": "1990-01-01"
        }
        
        try:
            result = conn.create_patient(test_patient)
            print("✅ 환자 생성 성공!")
            print(result)
        except Exception as e:
            print(f"❌ 환자 생성 실패: {e}")
    else:
        print("❌ OpenMRS 서버에 연결할 수 없습니다")
