# backend/medical_integration/views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import logging
from datetime import datetime
from .openmrs_api import OpenMRSAPI
from .db_utils import DatabaseManager
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

logger = logging.getLogger('medical_integration')

@api_view(['GET'])
def health_check(request):
    """시스템 상태 확인"""
    return Response({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'Django 의료 통합 API'
    })

@api_view(['GET'])
def search_patients(request):
    """OpenMRS에서 환자 검색"""
    query = request.query_params.get('q', '')
    if not query:
        return Response({'error': '검색어(q)가 필요합니다'}, status=status.HTTP_400_BAD_REQUEST)
    
    api = OpenMRSAPI()
    results = api.search_patients(query)
    
    if results is None:
        return Response({'error': '환자 검색에 실패했습니다'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # 결과를 더 간단한 형식으로 변환
    patients = []
    for result in results.get('results', []):
        patient = {
            'uuid': result.get('uuid'),
            'identifier': next((id.get('identifier') for id in result.get('identifiers', [])), None),
            'name': f"{result.get('person', {}).get('preferredName', {}).get('givenName', '')} {result.get('person', {}).get('preferredName', {}).get('familyName', '')}",
            'gender': result.get('person', {}).get('gender'),
            'birthdate': result.get('person', {}).get('birthdate'),
            'age': result.get('person', {}).get('age')
        }
        patients.append(patient)
    
    return Response({
        'results': patients,
        'total': len(patients)
    })

@api_view(['GET'])
def get_patient(request, uuid):
    """UUID로 환자 상세 정보 조회"""
    api = OpenMRSAPI()
    patient = api.get_patient(uuid)
    
    if patient is None:
        return Response({'error': f'UUID {uuid}인 환자를 찾을 수 없습니다'}, status=status.HTTP_404_NOT_FOUND)
    
    # 환자 데이터 형식 지정
    formatted_patient = {
        'uuid': patient.get('uuid'),
        'identifier': next((id.get('identifier') for id in patient.get('identifiers', [])), None),
        'identifiers': [
            {
                'identifier': id.get('identifier'),
                'identifierType': id.get('identifierType', {}).get('display')
            } for id in patient.get('identifiers', [])
        ],
        'name': f"{patient.get('person', {}).get('preferredName', {}).get('givenName', '')} {patient.get('person', {}).get('preferredName', {}).get('familyName', '')}",
        'names': [
            {
                'givenName': name.get('givenName'),
                'middleName': name.get('middleName'),
                'familyName': name.get('familyName'),
                'preferred': name.get('preferred', False)
            } for name in patient.get('person', {}).get('names', [])
        ],
        'gender': patient.get('person', {}).get('gender'),
        'birthdate': patient.get('person', {}).get('birthdate'),
        'age': patient.get('person', {}).get('age'),
        'addresses': [
            {
                'address1': addr.get('address1'),
                'address2': addr.get('address2'),
                'cityVillage': addr.get('cityVillage'),
                'stateProvince': addr.get('stateProvince'),
                'country': addr.get('country'),
                'postalCode': addr.get('postalCode'),
                'preferred': addr.get('preferred', False)
            } for addr in patient.get('person', {}).get('addresses', [])
        ],
        'attributes': [
            {
                'attributeType': attr.get('attributeType', {}).get('display'),
                'value': attr.get('value')
            } for attr in patient.get('person', {}).get('attributes', [])
        ],
        'dead': patient.get('person', {}).get('dead', False),
        'deathDate': patient.get('person', {}).get('deathDate'),
        'causeOfDeath': patient.get('person', {}).get('causeOfDeath', {}).get('display') if patient.get('person', {}).get('causeOfDeath') else None
    }
    
    return Response(formatted_patient)

@api_view(['POST'])
def create_patient(request):
    """OpenMRS에 새 환자 생성"""
    api = OpenMRSAPI()
    
    # 요청에서 환자 데이터 구성
    try:
        data = request.data
        
        # 필수 필드 검증
        required_fields = ['givenName', 'familyName', 'gender', 'birthdate']
        for field in required_fields:
            if field not in data:
                return Response({'error': f'필수 필드가 누락되었습니다: {field}'}, status=status.HTTP_400_BAD_REQUEST)
        
        # 환자 데이터 객체 구성
        patient_data = {
            'person': {
                'names': [
                    {
                        'givenName': data['givenName'],
                        'familyName': data['familyName'],
                        'middleName': data.get('middleName', ''),
                        'preferred': True
                    }
                ],
                'gender': data['gender'],
                'birthdate': data['birthdate'],
                'addresses': []
            },
            'identifiers': [
                {
                    'identifier': data.get('identifier', f'GEN-{datetime.now().strftime("%Y%m%d%H%M%S")}'),
                    'identifierType': '05a29f94-c0ed-11e2-94be-8c13b969e334',  # 기본 식별자 유형 UUID
                    'location': '8d6c993e-c2cc-11de-8d13-0010c6dffd0f'  # 기본 위치 UUID
                }
            ]
        }
        
        # 주소 정보가 있으면 추가
        if 'address' in data:
            patient_data['person']['addresses'].append({
                'address1': data['address'].get('address1', ''),
                'address2': data['address'].get('address2', ''),
                'cityVillage': data['address'].get('cityVillage', ''),
                'stateProvince': data['address'].get('stateProvince', ''),
                'country': data['address'].get('country', ''),
                'postalCode': data['address'].get('postalCode', ''),
                'preferred': True
            })
        
        # 환자 생성
        result = api.create_patient(patient_data)
        if result is None:
            return Response({'error': '환자 생성에 실패했습니다'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'success': True,
            'patient': {
                'uuid': result.get('uuid'),
                'identifiers': [
                    {
                        'identifier': id.get('identifier'),
                        'identifierType': id.get('identifierType', {}).get('display')
                    } for id in result.get('identifiers', [])
                ]
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"환자 생성 실패: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# backend/medical_integration/views.py (추가 함수)

@api_view(['GET'])
def get_patient_mappings(request):
    """모든 환자 매핑 조회"""
    from .models import PatientMapping
    
    mappings = PatientMapping.objects.all()
    data = [
        {
            'mapping_id': mapping.mapping_id,
            'orthanc_patient_id': mapping.orthanc_patient_id,
            'openmrs_patient_id': mapping.openmrs_patient_id,
            'created_date': mapping.created_date.isoformat() if mapping.created_date else None,
            'last_sync': mapping.last_sync.isoformat() if mapping.last_sync else None
        }
        for mapping in mappings
    ]
    
    return Response(data)

@api_view(['POST'])
def create_patient_mapping(request):
    """새 환자 매핑 생성"""
    from .models import PatientMapping
    from django.utils import timezone
    
    try:
        orthanc_patient_id = request.data.get('orthanc_patient_id')
        openmrs_patient_id = request.data.get('openmrs_patient_id')
        
        if not orthanc_patient_id or not openmrs_patient_id:
            return Response({
                'error': 'orthanc_patient_id와 openmrs_patient_id가 모두 필요합니다'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 이미 매핑이 있는지 확인
        existing_orthanc = PatientMapping.objects.filter(orthanc_patient_id=orthanc_patient_id).first()
        existing_openmrs = PatientMapping.objects.filter(openmrs_patient_id=openmrs_patient_id).first()
        
        if existing_orthanc or existing_openmrs:
            return Response({
                'error': '제공된 ID 중 하나에 대한 매핑이 이미 존재합니다',
                'existing_orthanc': existing_orthanc.mapping_id if existing_orthanc else None,
                'existing_openmrs': existing_openmrs.mapping_id if existing_openmrs else None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 새 매핑 생성
        mapping = PatientMapping.objects.create(
            orthanc_patient_id=orthanc_patient_id,
            openmrs_patient_id=openmrs_patient_id,
            last_sync=timezone.now()
        )
        
        return Response({
            'mapping_id': mapping.mapping_id,
            'orthanc_patient_id': mapping.orthanc_patient_id,
            'openmrs_patient_id': mapping.openmrs_patient_id,
            'created_date': mapping.created_date.isoformat() if mapping.created_date else None,
            'last_sync': mapping.last_sync.isoformat() if mapping.last_sync else None
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"환자 매핑 생성 실패: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@require_http_methods(["GET"])
def test_all_connections(request):
    """모든 데이터베이스 연결 테스트"""
    results = {
        'openmrs': False,
        'orthanc': False,
        'mongodb': False
    }
    
    try:
        # OpenMRS 연결 테스트
        openmrs_conn = DatabaseManager.get_openmrs_connection()
        with openmrs_conn.cursor() as cursor:
            cursor.execute("SELECT 1")
            results['openmrs'] = True
            logger.info("OpenMRS 연결 성공")
    except Exception as e:
        logger.error(f"OpenMRS 연결 실패: {e}")

    try:
        # Orthanc 연결 테스트
        orthanc_conn = DatabaseManager.get_orthanc_connection()
        with orthanc_conn.cursor() as cursor:
            cursor.execute("SELECT 1")
            results['orthanc'] = True
            logger.info("Orthanc 연결 성공")
    except Exception as e:
        logger.error(f"Orthanc 연결 실패: {e}")

    try:
        # MongoDB 연결 테스트
        with DatabaseManager.get_mongodb_connection() as (client, db):
            db.command('ping')
            results['mongodb'] = True
            logger.info("MongoDB 연결 성공")
    except Exception as e:
        logger.error(f"MongoDB 연결 실패: {e}")

    return JsonResponse({
        'status': 'success' if all(results.values()) else 'partial' if any(results.values()) else 'failure',
        'connections': results
    })