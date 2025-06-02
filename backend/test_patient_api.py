#!/usr/bin/env python3
# test_patient_api_fixed.py

import requests
import json
from datetime import datetime

def test_patient_creation():
    """CSRF 해결 후 환자 생성 테스트"""
    
    base_url = "http://35.225.63.41:8000/api/integration"
    
    print("🔍 CSRF 해결 후 환자 생성 테스트...")
    
    # 1. 먼저 연결 테스트
    print("1. 연결 테스트")
    try:
        response = requests.get(f"{base_url}/test-connections/", timeout=10)
        print(f"   상태: {response.status_code}")
        if response.status_code == 200:
            connections = response.json().get('connections', {})
            print(f"   OpenMRS: {connections.get('openmrs', False)}")
            print(f"   Orthanc: {connections.get('orthanc', False)}")
        else:
            print(f"   응답: {response.text[:200]}")
    except Exception as e:
        print(f"   연결 테스트 실패: {e}")
    
    # 2. CSRF 토큰 없이 직접 POST 요청
    print("\n2. CSRF 토큰 없이 POST 요청 (수정된 버전)")
    
    # 테스트용 환자 데이터
    patient_data = {
        "givenName": "테스트",
        "familyName": "환자",
        "gender": "M",
        "birthdate": "1990-01-01",
        "identifier": f"TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "address": {
            "address1": "서울시 강남구",
            "cityVillage": "서울시",
            "country": "South Korea"
        }
    }
    
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        # CSRF 관련 헤더는 제거
    }
    
    try:
        response = requests.post(
            f"{base_url}/openmrs/patients/create/",
            json=patient_data,
            headers=headers,
            timeout=30
        )
        
        print(f"   상태: {response.status_code}")
        print(f"   헤더: {dict(response.headers)}")
        
        if response.status_code == 201:
            result = response.json()
            print(f"   ✅ 환자 생성 성공!")
            print(f"   UUID: {result.get('patient', {}).get('uuid')}")
            print(f"   식별자: {result.get('patient', {}).get('identifiers')}")
            return True
        else:
            print(f"   ❌ 환자 생성 실패: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   오류 내용: {error_data}")
            except:
                print(f"   응답 텍스트: {response.text[:500]}")
            return False
            
    except Exception as e:
        print(f"   요청 실패: {e}")
        return False
    
    # 3. 생성된 환자 검색 테스트
    print("\n3. 생성된 환자 검색 테스트")
    try:
        search_response = requests.get(
            f"{base_url}/openmrs/patients/search/",
            params={'q': '테스트'},
            timeout=15
        )
        
        print(f"   검색 상태: {search_response.status_code}")
        if search_response.status_code == 200:
            search_results = search_response.json()
            patients_found = len(search_results.get('results', []))
            print(f"   검색된 환자 수: {patients_found}")
            
            if patients_found > 0:
                first_patient = search_results['results'][0]
                print(f"   첫 번째 환자: {first_patient.get('name')} ({first_patient.get('uuid')})")
        else:
            print(f"   검색 실패: {search_response.text[:200]}")
            
    except Exception as e:
        print(f"   검색 실패: {e}")

def test_simple_get_requests():
    """간단한 GET 요청들 테스트"""
    base_url = "http://35.225.63.41:8000/api/integration"
    
    print("\n🔍 간단한 GET 요청들 테스트...")
    
    endpoints = [
        "/health/",
        "/test-connections/",
        "/openmrs/patients/search/?q=test"
    ]
    
    for endpoint in endpoints:
        print(f"\n테스트: {endpoint}")
        try:
            response = requests.get(f"{base_url}{endpoint}", timeout=10)
            print(f"   상태: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    print(f"   응답 키: {list(data.keys()) if isinstance(data, dict) else 'not dict'}")
                except:
                    print(f"   응답: {response.text[:100]}...")
            else:
                print(f"   오류: {response.text[:200]}")
                
        except Exception as e:
            print(f"   예외: {e}")

if __name__ == "__main__":
    test_simple_get_requests()
    test_patient_creation()