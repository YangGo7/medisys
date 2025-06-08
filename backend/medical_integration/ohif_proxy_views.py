# backend/medical_integration/ohif_proxy_views.py

import requests
import json
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
from requests.auth import HTTPBasicAuth
import logging

logger = logging.getLogger('medical_integration')

# Orthanc 설정
ORTHANC_HOST = "35.225.63.41"
ORTHANC_PORT = "8042"
ORTHANC_USER = "orthanc"
ORTHANC_PASSWORD = "orthanc"
ORTHANC_BASE_URL = f"http://{ORTHANC_HOST}:{ORTHANC_PORT}"

def add_cors_headers(response):
    """CORS 헤더 추가"""
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept, Origin'
    response['Access-Control-Max-Age'] = '86400'
    return response

@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def ohif_config(request):
    """OHIF 설정 제공"""
    if request.method == 'OPTIONS':
        response = HttpResponse()
        return add_cors_headers(response)
    
    config = {
        "routerBasename": "/",
        "extensions": [
            "@ohif/extension-default",
            "@ohif/extension-cornerstone"
        ],
        "modes": [
            "@ohif/mode-basic-viewer"
        ],
        "defaultMode": "@ohif/mode-basic-viewer",
        "showStudyList": True,
        "dataSources": [{
            "namespace": "@ohif/extension-default.dataSourcesModule.dicomweb",
            "sourceName": "dicomweb",
            "configuration": {
                "friendlyName": "Medical Platform Orthanc",
                "name": "orthanc",
                "wadoUriRoot": f"http://35.225.63.41:8000/api/ohif/wado",
                "qidoRoot": f"http://35.225.63.41:8000/api/ohif/dicom-web",
                "wadoRoot": f"http://35.225.63.41:8000/api/ohif/dicom-web",
                "qidoSupportsIncludeField": False,
                "supportsReject": False,
                "imageRendering": "wadors",
                "thumbnailRendering": "wadors",
                "enableStudyLazyLoad": True,
                "supportsFuzzyMatching": False,
                "supportsWildcard": True,
                "staticWado": True,
                "singlepart": "bulkdata,video",
                "requestOptions": {
                    "requestCredentials": "omit"
                }
            }
        }],
        "defaultDataSourceName": "dicomweb"
    }
    
    response = JsonResponse(config)
    return add_cors_headers(response)

@csrf_exempt
def orthanc_proxy(request, path=""):
    """Orthanc API 프록시"""
    if request.method == 'OPTIONS':
        response = HttpResponse()
        return add_cors_headers(response)
    
    try:
        # Orthanc URL 구성
        orthanc_url = f"{ORTHANC_BASE_URL}/{path}"
        if request.GET:
            query_string = request.GET.urlencode()
            orthanc_url = f"{orthanc_url}?{query_string}"
        
        logger.info(f"Orthanc 프록시 요청: {request.method} {orthanc_url}")
        
        # 요청 헤더 준비
        headers = {
            'Accept': request.META.get('HTTP_ACCEPT', 'application/json'),
            'User-Agent': 'Django-OHIF-Proxy/1.0'
        }
        
        # Content-Type이 있으면 추가
        if request.META.get('CONTENT_TYPE'):
            headers['Content-Type'] = request.META['CONTENT_TYPE']
        
        # Orthanc 요청
        auth = HTTPBasicAuth(ORTHANC_USER, ORTHANC_PASSWORD)
        
        if request.method == 'GET':
            response = requests.get(orthanc_url, headers=headers, auth=auth, timeout=30)
        elif request.method == 'POST':
            response = requests.post(orthanc_url, 
                                   data=request.body, 
                                   headers=headers, 
                                   auth=auth, 
                                   timeout=30)
        else:
            return JsonResponse({'error': 'Method not allowed'}, status=405)
        
        # 응답 처리
        if response.status_code == 200:
            content_type = response.headers.get('content-type', 'application/json')
            
            if 'application/json' in content_type:
                django_response = JsonResponse(response.json(), safe=False)
            else:
                django_response = HttpResponse(response.content, content_type=content_type)
        else:
            logger.error(f"Orthanc 오류: {response.status_code} - {response.text}")
            django_response = JsonResponse({
                'error': f'Orthanc request failed: {response.status_code}',
                'details': response.text
            }, status=response.status_code)
        
        return add_cors_headers(django_response)
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Orthanc 연결 실패: {e}")
        django_response = JsonResponse({
            'error': 'Orthanc connection failed',
            'details': str(e)
        }, status=503)
        return add_cors_headers(django_response)

@csrf_exempt
def dicom_web_proxy(request, path=""):
    """DICOMweb API 프록시 (QIDO-RS/WADO-RS)"""
    if request.method == 'OPTIONS':
        response = HttpResponse()
        return add_cors_headers(response)
    
    try:
        # DICOMweb 경로가 있으면 직접 사용, 없으면 일반 Orthanc API로
        if 'dicom-web' in path:
            orthanc_url = f"{ORTHANC_BASE_URL}/{path}"
        else:
            orthanc_url = f"{ORTHANC_BASE_URL}/dicom-web/{path}"
        
        if request.GET:
            query_string = request.GET.urlencode()
            orthanc_url = f"{orthanc_url}?{query_string}"
        
        logger.info(f"DICOMweb 프록시 요청: {request.method} {orthanc_url}")
        
        headers = {
            'Accept': request.META.get('HTTP_ACCEPT', 'application/dicom+json'),
            'User-Agent': 'Django-OHIF-Proxy/1.0'
        }
        
        auth = HTTPBasicAuth(ORTHANC_USER, ORTHANC_PASSWORD)
        
        if request.method == 'GET':
            response = requests.get(orthanc_url, headers=headers, auth=auth, timeout=60)
        else:
            return JsonResponse({'error': 'Method not allowed'}, status=405)
        
        if response.status_code == 200:
            content_type = response.headers.get('content-type', 'application/dicom+json')
            
            if 'json' in content_type:
                try:
                    django_response = JsonResponse(response.json(), safe=False)
                except:
                    django_response = HttpResponse(response.content, content_type=content_type)
            else:
                django_response = HttpResponse(response.content, content_type=content_type)
        else:
            logger.error(f"DICOMweb 오류: {response.status_code} - {response.text}")
            django_response = JsonResponse({
                'error': f'DICOMweb request failed: {response.status_code}',
                'details': response.text
            }, status=response.status_code)
        
        return add_cors_headers(django_response)
        
    except Exception as e:
        logger.error(f"DICOMweb 프록시 오류: {e}")
        django_response = JsonResponse({
            'error': 'DICOMweb proxy failed',
            'details': str(e)
        }, status=503)
        return add_cors_headers(django_response)

@csrf_exempt
def wado_proxy(request):
    """WADO-URI 프록시"""
    if request.method == 'OPTIONS':
        response = HttpResponse()
        return add_cors_headers(response)
    
    try:
        # WADO 파라미터 추출
        query_string = request.GET.urlencode()
        orthanc_url = f"{ORTHANC_BASE_URL}/wado?{query_string}"
        
        logger.info(f"WADO 프록시 요청: {orthanc_url}")
        
        headers = {
            'Accept': request.META.get('HTTP_ACCEPT', 'image/*'),
            'User-Agent': 'Django-OHIF-Proxy/1.0'
        }
        
        auth = HTTPBasicAuth(ORTHANC_USER, ORTHANC_PASSWORD)
        response = requests.get(orthanc_url, headers=headers, auth=auth, timeout=60)
        
        if response.status_code == 200:
            content_type = response.headers.get('content-type', 'application/octet-stream')
            django_response = HttpResponse(response.content, content_type=content_type)
        else:
            logger.error(f"WADO 오류: {response.status_code}")
            django_response = JsonResponse({
                'error': f'WADO request failed: {response.status_code}'
            }, status=response.status_code)
        
        return add_cors_headers(django_response)
        
    except Exception as e:
        logger.error(f"WADO 프록시 오류: {e}")
        django_response = JsonResponse({
            'error': 'WADO proxy failed',
            'details': str(e)
        }, status=503)
        return add_cors_headers(django_response)

@csrf_exempt
def ohif_studies_list(request):
    """OHIF용 Study 목록 조회"""
    if request.method == 'OPTIONS':
        response = HttpResponse()
        return add_cors_headers(response)
    
    try:
        # Orthanc에서 모든 Study 조회
        auth = HTTPBasicAuth(ORTHANC_USER, ORTHANC_PASSWORD)
        response = requests.get(f"{ORTHANC_BASE_URL}/studies", auth=auth, timeout=30)
        
        if response.status_code != 200:
            raise Exception(f"Orthanc studies request failed: {response.status_code}")
        
        study_ids = response.json()
        studies = []
        
        # 각 Study의 상세 정보 조회
        for study_id in study_ids[:20]:  # 최대 20개로 제한
            try:
                study_response = requests.get(f"{ORTHANC_BASE_URL}/studies/{study_id}", 
                                            auth=auth, timeout=10)
                if study_response.status_code == 200:
                    study_data = study_response.json()
                    main_tags = study_data.get('MainDicomTags', {})
                    patient_tags = study_data.get('PatientMainDicomTags', {})
                    
                    # OHIF 형식으로 변환
                    ohif_study = {
                        "00080020": {"Value": [main_tags.get('StudyDate', '')]},
                        "00080030": {"Value": [main_tags.get('StudyTime', '')]},
                        "00080050": {"Value": [main_tags.get('AccessionNumber', '')]},
                        "00080061": {"Value": [main_tags.get('ModalitiesInStudy', '')]},
                        "00080090": {"Value": [main_tags.get('ReferringPhysicianName', '')]},
                        "00100010": {"Value": [patient_tags.get('PatientName', '')]},
                        "00100020": {"Value": [patient_tags.get('PatientID', '')]},
                        "00100030": {"Value": [patient_tags.get('PatientBirthDate', '')]},
                        "00100040": {"Value": [patient_tags.get('PatientSex', '')]},
                        "0020000D": {"Value": [main_tags.get('StudyInstanceUID', '')]},
                        "00081030": {"Value": [main_tags.get('StudyDescription', '')]},
                        "00200010": {"Value": [main_tags.get('StudyID', '')]},
                        "00080052": {"Value": ["STUDY"]},
                        "00201206": {"Value": [len(study_data.get('Series', []))]},
                        "00201208": {"Value": [study_data.get('NumberOfInstances', 0)]}
                    }
                    studies.append(ohif_study)
            except Exception as e:
                logger.warning(f"Study {study_id} 조회 실패: {e}")
                continue
        
        django_response = JsonResponse(studies, safe=False)
        return add_cors_headers(django_response)
        
    except Exception as e:
        logger.error(f"Studies 목록 조회 실패: {e}")
        django_response = JsonResponse({
            'error': 'Failed to fetch studies',
            'details': str(e)
        }, status=503)
        return add_cors_headers(django_response)