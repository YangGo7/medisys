# backend/openmrs_models/views.py - Encounter + SOAP 진단 저장

import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from .models import SoapDiagnosis
from .serializers import SoapDiagnosisSerializer, SoapDiagnosisCreateSerializer
from django.utils import timezone
import requests
from base64 import b64encode
import os
from medical_integration.openmrs_api import OpenMRSAPI
logger = logging.getLogger(__name__)


def get_clean_openmrs_config():
    """OpenMRS 설정"""
    host = os.getenv('OPENMRS_API_HOST', '127.0.0.1')
    port = os.getenv('OPENMRS_API_PORT', '8082')
    username = os.getenv('OPENMRS_API_USER', 'admin')
    password = os.getenv('OPENMRS_API_PASSWORD', 'Admin123')
    
    clean_host = host.replace('http://', '').replace('https://', '').strip()
    base_url = f"http://{clean_host}:{port}/openmrs/ws/rest/v1"
    
    auth_string = f"{username}:{password}"
    auth_header = b64encode(auth_string.encode()).decode()
    
    headers = {
        'Authorization': f'Basic {auth_header}',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    return base_url, headers

OPENMRS_BASE_URL, HEADERS = get_clean_openmrs_config()

class SoapDiagnosisPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class SoapDiagnosisViewSet(viewsets.ModelViewSet):
    """🔥 SOAP 진단 정보 ViewSet - Encounter 기반 저장"""
    
    queryset = SoapDiagnosis.objects.filter(is_active=True)
    pagination_class = SoapDiagnosisPagination
    
    def get_serializer_class(self):
        if self.action == 'create' or self.action == 'bulk_create':
            return SoapDiagnosisCreateSerializer
        return SoapDiagnosisSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        patient_uuid = self.request.query_params.get('patient_uuid')
        encounter_uuid = self.request.query_params.get('encounter_uuid')
        soap_type = self.request.query_params.get('soap_type')
        
        if patient_uuid:
            queryset = queryset.filter(patient_uuid=patient_uuid)
        if encounter_uuid:
            queryset = queryset.filter(encounter_uuid=encounter_uuid)
        if soap_type:
            queryset = queryset.filter(soap_type=soap_type)
        
        return queryset.order_by('soap_type', 'sequence_number')
    
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Encounter 생성 + SOAP 진단 일괄 저장"""
        try:
            logger.info("Encounter + SOAP 진단 저장 시작")

            if not isinstance(request.data, dict):
                return Response({
                    'status': 'error',
                    'message': '객체 형태의 데이터가 필요합니다. {patient_uuid, soap_diagnoses} 형식'
                }, status=status.HTTP_400_BAD_REQUEST)

            patient_uuid = request.data.get('patient_uuid')
            soap_diagnoses_data = request.data.get('soap_diagnoses', [])
            doctor_uuid = request.data.get('doctor_uuid', 'admin')

            if not patient_uuid:
                return Response({'status': 'error', 'message': 'patient_uuid가 필요합니다.'}, status=400)
            if not soap_diagnoses_data:
                return Response({'status': 'error', 'message': '저장할 SOAP 진단 데이터가 없습니다.'}, status=400)

            # 1. Encounter 생성 API 호출
            encounter_data = {
                'patient': patient_uuid,
                'encounterType': '5021b1a1-e7f6-44b4-ba02-da2f2bcf8718',  # 필요에 따라 변경
                'location': '8d6c993e-c2cc-11de-8d13-0010c6dffd0f',      # 필요에 따라 변경
                'encounterDatetime': '2025-06-26T08:44:01.440Z',
                'encounterProviders': [
                    {
                        'provider': 'f9badd80-ab76-11e2-9e96-0800200c9a66',
                        'encounterRole': '240b26f9-dd88-4172-823d-4a8bfeb7841f'
                    }
                ]
            }
            api = OpenMRSAPI()
            encounter_result = api.create_encounter(encounter_data)
            if 'error' in encounter_result:
                return Response({'status': 'error', 'message': 'Encounter 생성 실패', 'details': encounter_result['error']}, status=500)

            encounter_uuid = encounter_result.get('uuid')
            logger.info(f"Encounter 생성 성공: {encounter_uuid}")

            # 2. SOAP 진단 데이터 저장
            created_diagnoses = []
            errors = []

            for i, soap_item in enumerate(soap_diagnoses_data):
                try:
                    soap_item['patient_uuid'] = patient_uuid
                    soap_item['encounter_uuid'] = encounter_uuid
                    soap_item['doctor_uuid'] = doctor_uuid

                    serializer = SoapDiagnosisCreateSerializer(data=soap_item)
                    if serializer.is_valid():
                        diagnosis = serializer.save()
                        created_diagnoses.append(SoapDiagnosisSerializer(diagnosis).data)
                        logger.info(f"SOAP 진단 생성 성공 [{i}]: {diagnosis.uuid}")
                    else:
                        errors.append({'index': i, 'errors': serializer.errors, 'data': soap_item})
                        logger.warning(f"SOAP 진단 유효성 검증 실패 [{i}]: {serializer.errors}")
                except Exception as e:
                    errors.append({'index': i, 'error': str(e), 'data': soap_item})
                    logger.error(f"SOAP 진단 생성 실패 [{i}]: {e}")

            total = len(soap_diagnoses_data)
            success_count = len(created_diagnoses)
            error_count = len(errors)

            return Response({
                'status': 'success' if success_count > 0 else 'error',
                'message': f'Encounter 생성 완료, {success_count}/{total}개 SOAP 진단 저장 성공',
                'encounter_uuid': encounter_uuid,
                'summary': {
                    'total_items': total,
                    'created_count': success_count,
                    'error_count': error_count,
                    'success_rate': f"{(success_count / total) * 100:.1f}%" if total > 0 else "0%"
                },
                'created_diagnoses': created_diagnoses,
                'errors': errors
            }, status=201 if success_count > 0 else 400)

        except requests.exceptions.RequestException as e:
            logger.error(f"OpenMRS 연결 실패: {e}")
            return Response({'status': 'error', 'message': f'OpenMRS 서버 연결 실패: {str(e)}'}, status=503)
        except Exception as e:
            logger.error(f"Encounter + SOAP 진단 저장 오류: {e}")
            return Response({'status': 'error', 'message': f'시스템 오류: {str(e)}'}, status=500)
            
    @action(detail=False, methods=['get'])
    def by_encounter(self, request):
        """🔥 특정 Encounter의 모든 SOAP 진단 조회 (내원이력용)"""
        encounter_uuid = request.query_params.get('encounter_uuid')
        
        if not encounter_uuid:
            return Response({
                'error': 'encounter_uuid 파라미터가 필요합니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Encounter별 SOAP 진단 조회
        diagnoses = self.get_queryset().filter(encounter_uuid=encounter_uuid)
        
        # SOAP 타입별로 그룹화
        grouped_data = {
            'S': [],  # Subjective
            'O': [],  # Objective  
            'A': [],  # Assessment
            'P': []   # Plan
        }
        
        for diagnosis in diagnoses:
            soap_type = diagnosis.soap_type
            if soap_type in grouped_data:
                serializer = SoapDiagnosisSerializer(diagnosis)
                grouped_data[soap_type].append(serializer.data)
        
        return Response({
            'encounter_uuid': encounter_uuid,
            'soap_diagnoses': grouped_data,
            'total_count': diagnoses.count(),
            'by_type_count': {
                'S': len(grouped_data['S']),
                'O': len(grouped_data['O']),
                'A': len(grouped_data['A']),
                'P': len(grouped_data['P']),
            }
        })

# 🔥 기존 function-based view들 (필요 최소한만)
@api_view(['GET'])
def openmrs_encounters(request):
    """환자 encounter 목록 조회 (내원이력용)"""
    uuid = request.GET.get('uuid')
    if not uuid:
        return Response({"error": "Missing uuid"}, status=400)

    try:
        url = f"{OPENMRS_BASE_URL}/encounter"
        params = {'patient': uuid}
        response = requests.get(url, headers=HEADERS, params=params, timeout=30)
        
        if response.status_code != 200:
            return Response({"error": f"OpenMRS API 오류: {response.status_code}"}, status=response.status_code)
        
        data = response.json()
        history = []
        for encounter in data.get('results', []):
            history.append({
                'uuid': encounter.get('uuid', ''),
                'display': encounter.get('display', ''),
                'encounterDatetime': encounter.get('encounterDatetime', ''),
                'provider': encounter.get('provider', {}).get('display', 'N/A'),
                'encounterType': encounter.get('encounterType', {}).get('display', 'N/A'),
            })

        return Response(history)
        
    except requests.exceptions.RequestException as e:
        return Response({"error": "OpenMRS 서버 연결 실패"}, status=503)

@api_view(['GET'])
def get_person_uuid_by_identifier(request, patient_identifier):
    """환자 식별자로 Person UUID 조회"""
    try:
        url = f"{OPENMRS_BASE_URL}/person"
        params = {'q': patient_identifier}
        response = requests.get(url, headers=HEADERS, params=params, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('results'):
                return Response({'uuid': data['results'][0]['uuid']})
            else:
                return Response({'error': '환자를 찾을 수 없습니다.'}, status=404)
        else:
            return Response({'error': f'OpenMRS API 오류: {response.status_code}'}, status=response.status_code)
            
    except Exception as e:
        return Response({'error': f'환자 조회 중 오류: {str(e)}'}, status=500)

@api_view(['GET'])
def icd10_search(request):
    """ICD-10 코드 검색"""
    query = request.GET.get('q', '')
    if not query:
        return Response({'results': []})
    
    mock_results = [
        {'code': 'A00.0', 'name': 'Cholera due to Vibrio cholerae 01, biovar cholerae'},
        {'code': 'A00.1', 'name': 'Cholera due to Vibrio cholerae 01, biovar eltor'},
        {'code': 'A00.9', 'name': 'Cholera, unspecified'},
    ]
    
    filtered_results = [
        r for r in mock_results 
        if query.lower() in r['code'].lower() or query.lower() in r['name'].lower()
    ]
    
    return Response({'results': filtered_results})

@api_view(['GET'])
def openmrs_vitals(request):
    """환자 바이탈 정보 조회"""
    uuid = request.GET.get('uuid')
    if not uuid:
        return Response({"error": "Missing uuid"}, status=400)

    try:
        url = f"{OPENMRS_BASE_URL}/obs"
        params = {'patient': uuid, 'concept': 'vital'}
        response = requests.get(url, headers=HEADERS, params=params, timeout=30)
        
        if response.status_code == 200:
            return Response(response.json())
        else:
            return Response({"error": f"OpenMRS API 오류: {response.status_code}"}, status=response.status_code)
            
    except requests.exceptions.RequestException as e:
        return Response({"error": "OpenMRS 서버 연결 실패"}, status=503)