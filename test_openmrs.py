#!/usr/bin/env python3
"""
OpenMRS API 경로 확인 스크립트
- OpenMRS 서버 연결 확인
- 다양한 API 경로 테스트
- 올바른 API 경로 찾기
"""
import os
import sys
import requests
from requests.auth import HTTPBasicAuth
import json

# 환경 변수 로드 (없으면 기본값 사용)
def get_env(key, default):
    return os.environ.get(key, default)

# OpenMRS 연결 정보
OPENMRS_HOST = get_env('OPENMRS_API_HOST', '127.0.0.1')
OPENMRS_PORT = get_env('OPENMRS_API_PORT', '8082')
OPENMRS_USER = get_env('OPENMRS_API_USER', 'admin')
OPENMRS_PASSWORD = get_env('OPENMRS_API_PASSWORD', 'Admin123')

# OpenMRS 기본 URL
BASE_URL = f"http://{OPENMRS_HOST}:{OPENMRS_PORT}"

# 가능한 API 경로 목록
API_PATHS = [
    "/openmrs/ws/rest/v1",
    "/openmrs/api",
    "/openmrs/module/webservices/rest/v1",
    "/openmrs/ws/fhir2/R4",
    "/openmrs/ws/fhir/v1",
    "/openmrs/moduleServlet/restServices/rest/v1",
    "/openmrs/rest/v1"
]

def check_server_connection():
    """OpenMRS 서버 연결 확인"""
    try:
        response = requests.get(f"{BASE_URL}/openmrs", timeout=5)
        if response.status_code == 200:
            print(f"✅ OpenMRS 서버 연결 성공: {BASE_URL}/openmrs")
            print(f"응답 코드: {response.status_code}")
            return True
        else:
            print(f"⚠️ OpenMRS 서버 응답: {response.status_code}")
            print("서버가 실행 중이지만 예상과 다른 응답입니다.")
            return True
    except requests.exceptions.RequestException as e:
        print(f"❌ OpenMRS 서버 연결 실패: {e}")
        return False

def test_api_paths():
    """다양한 API 경로 테스트"""
    working_paths = []
    
    for path in API_PATHS:
        full_url = f"{BASE_URL}{path}/session"
        print(f"\n테스트 중: {full_url}")
        
        try:
            # 세션 API는 인증이 필요한 경우가 많으므로 인증 정보 포함
            response = requests.get(
                full_url,
                auth=HTTPBasicAuth(OPENMRS_USER, OPENMRS_PASSWORD),
                timeout=5
            )
            
            print(f"응답 코드: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ API 경로 작동 확인!")
                try:
                    data = response.json()
                    print(f"응답 데이터: {json.dumps(data, indent=2)}")
                    working_paths.append({
                        "path": path,
                        "full_url": full_url,
                        "authenticated": data.get("authenticated", False)
                    })
                except json.JSONDecodeError:
                    print("⚠️ 응답이 JSON 형식이 아닙니다.")
                    print(f"응답 내용: {response.text[:200]}...")  # 처음 200자만 출력
            else:
                print(f"⚠️ 응답 코드: {response.status_code}")
                try:
                    print(f"응답 내용: {response.text[:200]}...")  # 처음 200자만 출력
                except:
                    print("응답 내용을 표시할 수 없습니다.")
        except requests.exceptions.RequestException as e:
            print(f"❌ 요청 실패: {e}")
    
    return working_paths

def test_api_endpoint(path, endpoint):
    """특정 API 엔드포인트 테스트"""
    full_url = f"{BASE_URL}{path}/{endpoint}"
    print(f"\n엔드포인트 테스트: {full_url}")
    
    try:
        response = requests.get(
            full_url,
            auth=HTTPBasicAuth(OPENMRS_USER, OPENMRS_PASSWORD),
            timeout=5
        )
        
        print(f"응답 코드: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ API 엔드포인트 작동 확인!")
            try:
                data = response.json()
                # 결과가 너무 길면 요약 정보만 표시
                if 'results' in data and len(data['results']) > 2:
                    result_count = len(data['results'])
                    data['results'] = data['results'][:2]  # 처음 2개만 표시
                    data['results'].append(f"... 외 {result_count - 2}개 항목")
                
                print(f"응답 데이터: {json.dumps(data, indent=2)}")
                return True
            except json.JSONDecodeError:
                print("⚠️ 응답이 JSON 형식이 아닙니다.")
                print(f"응답 내용: {response.text[:200]}...")  # 처음 200자만 출력
                return False
        else:
            print(f"⚠️ 응답 코드: {response.status_code}")
            try:
                print(f"응답 내용: {response.text[:200]}...")  # 처음 200자만 출력
            except:
                print("응답 내용을 표시할 수 없습니다.")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ 요청 실패: {e}")
        return False

def update_env_file(api_path):
    """환경 변수 파일 업데이트"""
    try:
        env_file_path = os.path.join(os.getcwd(), '.env')
        
        # .env 파일이 존재하는지 확인
        if not os.path.isfile(env_file_path):
            # 상위 디렉토리 확인
            parent_env = os.path.join(os.path.dirname(os.getcwd()), '.env')
            if os.path.isfile(parent_env):
                env_file_path = parent_env
            else:
                print(f"❌ .env 파일을 찾을 수 없습니다.")
                return False
        
        # 파일 읽기
        with open(env_file_path, 'r') as f:
            lines = f.readlines()
        
        # OPENMRS_API_URL 찾기 또는 추가
        api_url_found = False
        new_lines = []
        
        for line in lines:
            if line.startswith('OPENMRS_API_URL='):
                new_lines.append(f'OPENMRS_API_URL={BASE_URL}{api_path}\n')
                api_url_found = True
            else:
                new_lines.append(line)
        
        # 없으면 추가
        if not api_url_found:
            new_lines.append(f'\n# OpenMRS API URL\nOPENMRS_API_URL={BASE_URL}{api_path}\n')
        
        # 파일 쓰기
        with open(env_file_path, 'w') as f:
            f.writelines(new_lines)
        
        print(f"✅ OpenMRS API URL이 .env 파일에 업데이트되었습니다.")
        print(f"새 API URL: {BASE_URL}{api_path}")
        return True
    except Exception as e:
        print(f"❌ .env 파일 업데이트 실패: {e}")
        return False

def main():
    """메인 함수"""
    print("=" * 50)
    print("OpenMRS API 경로 확인 시작")
    print("=" * 50)
    
    # OpenMRS 서버 연결 확인
    if not check_server_connection():
        print("❌ OpenMRS 서버에 연결할 수 없습니다. 종료합니다.")
        return
    
    # 다양한 API 경로 테스트
    print("\n다양한 API 경로 테스트 중...")
    working_paths = test_api_paths()
    
    if working_paths:
        print("\n=" * 50)
        print(f"작동하는 API 경로 발견: {len(working_paths)}개")
        print("=" * 50)
        
        for i, path_info in enumerate(working_paths):
            print(f"{i+1}. {path_info['path']} - 인증 상태: {path_info['authenticated']}")
        
        # 첫 번째 작동하는 경로 선택
        selected_path = working_paths[0]['path']
        print(f"\n선택된 API 경로: {selected_path}")
        
        # 추가 엔드포인트 테스트
        print("\n추가 API 엔드포인트 테스트 중...")
        endpoints = ['patient', 'person', 'concept', 'user']
        
        for endpoint in endpoints:
            test_api_endpoint(selected_path, endpoint)
        
        # .env 파일 업데이트
        print("\n.env 파일 업데이트 중...")
        update_env_file(selected_path)
        
        # 테스트 스크립트 업데이트 안내
        print("\n테스트 스크립트 업데이트를 위한 안내:")
        print(f"1. test_connections.py 파일에서 API_CONFIG 변수를 수정합니다.")
        print(f"2. 'openmrs' > 'url' 값을 '{BASE_URL}{selected_path}'로 변경합니다.")
        
        print("\n=" * 50)
        print("OpenMRS API 테스트 완료")
        print("=" * 50)
        print(f"작동하는 API 경로: {selected_path}")
        print("테스트 스크립트를 업데이트한 후 다시 실행하세요:")
        print("python test_connections.py")
        print("=" * 50)
    else:
        print("\n=" * 50)
        print("❌ 작동하는 API 경로를 찾을 수 없습니다.")
        print("=" * 50)
        print("OpenMRS API 모듈이 활성화되어 있는지 확인하세요.")
        print("또는 다른 API 경로를 확인해보세요.")
        
        # OpenMRS 버전 확인
        print("\nOpenMRS 버전 확인 중...")
        try:
            response = requests.get(f"{BASE_URL}/openmrs/ms/legacyui/loginServlet")
            if response.status_code == 200:
                print("✅ OpenMRS 로그인 페이지 발견")
                print("OpenMRS Legacy UI가 활성화된 것으로 보입니다.")
                print("REST API 모듈이 설치되어 있는지 확인하세요.")
            else:
                print(f"⚠️ OpenMRS 로그인 페이지 응답 코드: {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"❌ OpenMRS 로그인 페이지 요청 실패: {e}")
        
        print("=" * 50)

if __name__ == "__main__":
    main()