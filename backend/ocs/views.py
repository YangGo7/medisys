# ocs/views.py

import json
import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.decorators import api_view

from .models import OCSLog
from .serializers import OCSLogSerializer
from medical_integration.openmrs_api import OpenMRSAPI # OpenMRSAPI 클래스 임포트

# OpenMRSAPI 인스턴스 생성
# 이 인스턴스는 한 번만 생성하여 재사용하는 것이 효율적입니다.
openmrs_client = OpenMRSAPI()

# OpenMRS 환자 목록을 불러오는 프록시 API
@api_view(['GET'])
def proxy_openmrs_patients(request):
    # 프론트엔드에서 넘어오는 검색어 'q' 파라미터 활용 (없으면 빈 문자열)
    search_query = request.query_params.get('q', '')

    try:
        # OpenMRSAPI 클래스의 search_patients 메서드 활용
        # 이 메서드는 openmrs_api.py에 정의되어 있으며, v=full 파라미터 사용
        patients_data = openmrs_client.search_patients(search_query)

        # OpenMRSAPI 내부에서 에러 로깅이 되었을 경우 None을 반환할 수 있음
        if patients_data is None:
            return Response({"error": "OpenMRS 환자 검색에 실패했습니다. 백엔드 로그를 확인하세요."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # OpenMRS 응답에서 필요한 정보만 추출하여 프론트엔드 형식에 맞춰 반환
        results = []
        if 'results' in patients_data:
            for patient in patients_data['results']:
                patient_name = '이름 없음'
                if patient.get('display'):
                    # OpenMRS 'display' 필드에서 이름 추출 (예: "UUID - 이름")
                    parts = patient['display'].split(' - ')
                    if len(parts) > 1:
                        patient_name = parts[1].strip()
                # 'person' 객체 안에 'display'가 있을 경우를 대비
                elif patient.get('person') and patient['person'].get('display'):
                     parts = patient['person']['display'].split(' - ')
                     if len(parts) > 1:
                        patient_name = parts[1].strip()

                identifier = 'N/A'
                # identifiers 배열에서 실제 식별자 찾기 (tests.jsx와 openmrs_api.py 참고)
                if patient.get('identifiers') and len(patient['identifiers']) > 0:
                    # 첫 번째 식별자를 사용한다고 가정. 실제 시스템에서는 특정 identifierType을 찾을 수 있음.
                    identifier = patient['identifiers'][0].get('identifier', 'N/A')

                gender = patient.get('person', {}).get('gender', 'U') # 'U' for Unknown
                birthdate = patient.get('person', {}).get('birthdate')
                
                results.append({
                    'uuid': patient.get('uuid'),
                    'name': patient_name,
                    'identifier': identifier,
                    'gender': gender,
                    'birthdate': birthdate,
                    # 필요한 다른 정보도 추가할 수 있음
                })
        
        # tests.jsx의 응답 형태와 유사하게 results를 감싸서 반환합니다.
        return Response({"results": results})

    except requests.exceptions.HTTPError as http_err:
        # HTTP 오류 (4xx, 5xx)
        print(f"OpenMRS HTTP 오류: {http_err} - 응답 내용: {http_err.response.text}")
        return Response({"error": f"OpenMRS HTTP 오류 ({http_err.response.status_code}): {http_err.response.text}"}, status=http_err.response.status_code)
    except requests.exceptions.ConnectionError as conn_err:
        # 연결 오류 (OpenMRS 서버에 접근 불가)
        print(f"OpenMRS 연결 오류: {conn_err}")
        return Response({"error": "OpenMRS 서버에 연결할 수 없습니다. OpenMRS 서버가 실행 중인지 확인하세요."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except requests.exceptions.Timeout as timeout_err:
        # 타임아웃 오류
        print(f"OpenMRS API 요청 타임아웃: {timeout_err}")
        return Response({"error": "OpenMRS API 요청 시간 초과."}, status=status.HTTP_504_GATEWAY_TIMEOUT)
    except requests.exceptions.RequestException as req_err:
        # 기타 requests 라이브러리 관련 오류
        print(f"Requests 오류: {req_err}")
        return Response({"error": f"OpenMRS API 요청 중 알 수 없는 오류 발생: {req_err}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except json.JSONDecodeError:
        # OpenMRS 응답이 JSON 형식이 아닐 때
        print(f"OpenMRS API 응답 파싱 오류: {patients_data if isinstance(patients_data, str) else '응답 내용 없음'}")
        return Response({"error": "OpenMRS API 응답 형식 오류. 유효한 JSON이 아닙니다."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        # 예측하지 못한 다른 모든 오류
        print(f"예상치 못한 오류: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 📥 OpenMRS에서 로그 저장 POST 요청 처리
class OrderReceiveView(APIView):
    def post(self, request):
        print("📥 요청 수신:", request.data)
        # 여기서는 단순히 메시지만 반환하지만, 실제 로그 저장 로직은 middleware.py에서 처리됨
        return Response({"message": "Order received!"}, status=status.HTTP_200_OK)

# 📤 React에서 환자 ID별 로그 조회용 API
class OCSLogListAPIView(ListAPIView):
    serializer_class = OCSLogSerializer

    def get_queryset(self):
        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            return OCSLog.objects.filter(patient_id=patient_id).order_by('-timestamp')
        return OCSLog.objects.all().order_by('-timestamp')