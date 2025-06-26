# backend/openmrs_models/views.py

from django.shortcuts import render

# Create your views here.
# backend/openmrs_models/views.py
import requests
from rest_framework.decorators import api_view
from rest_framework.response import Response
from base64 import b64encode
from .models import PatientIdentifier, Patient, Person, PersonName
# 알림 기능 연결
from medical_integration.models import Alert  # Alert 모델 import
import os
import logging
from django.utils import timezone

logger = logging.getLogger(__name__)

# OpenMRS 기본 설정
OPENMRS_BASE_URL = 'http://127.0.0.1:8082/openmrs/ws/rest/v1'
OPENMRS_AUTH = b64encode(b'admin:Admin123').decode()
HEADERS = {'Authorization': f'Basic {OPENMRS_AUTH}', 'Content-Type': 'application/json'}

logger = logging.getLogger('openmrs_models')
# 미리 정의된 Concept UUID들 (실제 OpenMRS 환경에 맞게 수정 필요)
DIAGNOSIS_CONCEPTS = {
    'primary_diagnosis': '159947AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'secondary_diagnosis': '159946AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'provisional_diagnosis': '159394AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
}

PRESCRIPTION_CONCEPTS = {
    'drug_order': '1282AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'dosage': '160856AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'frequency': '160855AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'duration': '159368AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
}

def get_openmrs_config():
    """OpenMRS 설정을 환경변수에서 안전하게 가져오기"""
    try:
        # 환경 변수에서 각각 분리해서 가져오기
        host = os.getenv('OPENMRS_API_HOST', '127.0.0.1')
        port = os.getenv('OPENMRS_API_PORT', '8082')
        username = os.getenv('OPENMRS_API_USER', 'admin')
        password = os.getenv('OPENMRS_API_PASSWORD', 'Admin123')
        
        # 🔥 올바른 URL 형식으로 조합 - 이중 http 방지
        if host.startswith('http://') or host.startswith('https://'):
            base_url = f"{host}:{port}/openmrs/ws/rest/v1"
        else:
            base_url = f"http://{host}:{port}/openmrs/ws/rest/v1"
        
        # 인증 문자열 생성
        auth_string = f"{username}:{password}"
        auth_header = b64encode(auth_string.encode()).decode()
        
        logger.info(f"OpenMRS 설정 - Host: {host}, Port: {port}, Base URL: {base_url}")
        
        return {
            'base_url': base_url,
            'host': host,
            'port': port,
            'username': username,
            'password': password,
            'auth': auth_header,
            'headers': {
                'Authorization': f'Basic {auth_header}',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        }
        
    except Exception as e:
        logger.error(f"OpenMRS 설정 로드 실패: {e}")
        # 기본값으로 폴백
        return {
            'base_url': 'http://127.0.0.1:8082/openmrs/ws/rest/v1',
            'host': '127.0.0.1',
            'port': '8082',
            'username': 'admin',
            'password': 'Admin123',
            'auth': b64encode(b'admin:Admin123').decode(),
            'headers': {
                'Authorization': 'Basic YWRtaW46QWRtaW4xMjM=',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        }

@api_view(['GET'])
def openmrs_vitals(request):
    uuid = request.GET.get('uuid')
    if not uuid:
        return Response({"error": "Missing uuid"}, status=400)

    auth = b64encode(b'admin:Admin123').decode()
    headers = {'Authorization': f'Basic {auth}'}
    url = 'http://127.0.0.1:8082/openmrs/ws/rest/v1/obs'
    res = requests.get(url, headers=headers, params={'patient': uuid})
    data = res.json()

    # 코드명 또는 이름으로 항목 추출
    vitals = {
        'temp': None,
        'bp': None,
        'spo2': None,
        'resp': None,
    }

    for obs in data.get('results', []):
        concept = obs.get('concept', {}).get('display', '')
        value = obs.get('value', '')

        if '체온' in concept or 'Temperature' in concept:
            vitals['temp'] = value
        elif '혈압' in concept or 'Blood Pressure' in concept:
            vitals['bp'] = value
        elif 'SpO2' in concept:
            vitals['spo2'] = value
        elif 'Respiratory Rate' in concept or '호흡수' in concept:
            vitals['resp'] = value

    # SpO2 경고: 85% 이하
    try:
        spo2_val = float(vitals['spo2']) if vitals['spo2'] is not None else None
    except (ValueError, TypeError):
        spo2_val = None
    if spo2_val is not None and spo2_val < 85:
        Alert.objects.create(
            type='SPO2',
            message=f'환자 {uuid} SpO₂ 경고: {spo2_val}%'
        )

    # 발열 경고: 체온 38°C 이상
    try:
        temp_val = float(vitals['temp']) if vitals['temp'] is not None else None
    except (ValueError, TypeError):
        temp_val = None
    if temp_val is not None and temp_val >= 38.0:
        Alert.objects.create(
            type='DELAY',  # ALERT_TYPES에 'FEVER' 추가 권장
            message=f'환자 {uuid} 발열 경고: 체온 {temp_val}°C'
        )

    # 혈압 경고: 고/저혈압
    bp_raw = vitals['bp']
    if bp_raw:
        try:
            sys_bp, dia_bp = map(int, bp_raw.split('/'))
        except Exception:
            sys_bp = dia_bp = None
        if sys_bp is not None and dia_bp is not None:
            if sys_bp >= 140 or dia_bp >= 90:
                Alert.objects.create(
                    type='DELAY',  # 'HYPERTENSION' 추가 가능
                    message=f'환자 {uuid} 고혈압 경고: {sys_bp}/{dia_bp} mmHg'
                )
            elif sys_bp <= 90 or dia_bp <= 60:
                Alert.objects.create(
                    type='DELAY',  # 'HYPOTENSION' 추가 가능
                    message=f'환자 {uuid} 저혈압 경고: {sys_bp}/{dia_bp} mmHg'
                )

    # 호흡수 경고: 과다/저호흡
    try:
        resp_val = float(vitals['resp']) if vitals['resp'] is not None else None
    except (ValueError, TypeError):
        resp_val = None
    if resp_val is not None:
        if resp_val > 20:
            Alert.objects.create(
                type='AI_ERR',  # 'TACHYPNEA' 추가 가능
                message=f'환자 {uuid} 빈호흡 경고: 호흡수 {resp_val}회/분'
            )
        elif resp_val < 10:
            Alert.objects.create(
                type='AI_ERR',  # 'BRADYPNEA' 추가 가능
                message=f'환자 {uuid} 서호흡 경고: 호흡수 {resp_val}회/분'
            )

    return Response(vitals)


@api_view(['GET'])
def openmrs_encounters(request):
    uuid = request.GET.get('uuid')
    if not uuid:
        return Response({"error": "Missing uuid"}, status=400)

    auth = b64encode(b'admin:Admin123').decode()
    headers = {'Authorization': f'Basic {auth}'}
    url = 'http://http://127.0.0.1:8082/openmrs/ws/rest/v1/encounter'
    res = requests.get(url, headers=headers, params={'patient': uuid})
    data = res.json()

    history = []
    for encounter in data.get('results', []):
        history.append({
            'uuid': encounter['uuid'],
            'display': encounter.get('display', ''),
            'encounterDatetime': encounter.get('encounterDatetime', ''),
            'provider': encounter.get('provider', {}).get('display', 'N/A'),
        })

    return Response(history)

@api_view(['POST'])
def create_encounter_with_data(request, patient_uuid):
    """새 Encounter 생성 및 진단/처방 데이터 저장"""
    try:
        # OpenMRS API로 Encounter 생성
        encounter_data = {
            'patient': patient_uuid,
            'encounterType': '61ae96f4-6afe-4351-b6f8-cd4fc383cce1',  # 실제 encounter type UUID
            'location': '8d6c993e-c2cc-11de-8d13-0010c6dffd0f',     # 실제 location UUID
            'encounterDatetime': timezone.now().isoformat(),
        }

        response = requests.post(
            f'{OPENMRS_BASE_URL}/encounter',
            headers=HEADERS,
            json=encounter_data,
            timeout=10
        )

        if response.status_code != 201:
            return Response({'error': 'Encounter 생성 실패'}, status=400)

        encounter_uuid = response.json()['uuid']

        # 진단 데이터 저장
        diagnoses = request.data.get('diagnoses', [])
        for diagnosis in diagnoses:
            obs_data = {
                'person': patient_uuid,
                'concept': diagnosis.get('concept_uuid', DIAGNOSIS_CONCEPTS['primary_diagnosis']),
                'encounter': encounter_uuid,
                'obsDatetime': timezone.now().isoformat(),
                'value': diagnosis.get('value', ''),
                'comment': diagnosis.get('notes', '')
            }

            requests.post(
                f'{OPENMRS_BASE_URL}/obs',
                headers=HEADERS,
                json=obs_data,
                timeout=10
            )

        # 처방 데이터 저장
        prescriptions = request.data.get('prescriptions', [])
        for prescription in prescriptions:
            # Drug Order 생성
            drug_order_data = {
                'patient': patient_uuid,
                'encounter': encounter_uuid,
                'orderType': '131168f4-15f5-102d-96e4-000c29c2a5d7',  # Drug Order Type UUID
                'concept': prescription.get('drug_concept_uuid'),
                'dose': prescription.get('dosage', ''),
                'doseUnits': prescription.get('dose_units', ''),
                'frequency': prescription.get('frequency', ''),
                'route': prescription.get('route', ''),
                'duration': prescription.get('duration', ''),
                'instructions': prescription.get('instructions', ''),
                'dateActivated': timezone.now().isoformat(),
            }

            requests.post(
                f'{OPENMRS_BASE_URL}/drugorder',
                headers=HEADERS,
                json=drug_order_data,
                timeout=10
            )

        return Response({
            'success': True,
            'encounter_uuid': encounter_uuid,
            'message': '진료 기록이 저장되었습니다.'
        })

    except Exception as e:
        return Response({'error': str(e)}, status=500)

def get_person_uuid_by_identifier(request, patient_identifier):
    """
    patient_identifier로 OpenMRS DB에서 직접 person.uuid 조회
    /api/person-uuid-by-identifier/P8644/
    
    경로: patient_identifier → patient → person → person.uuid
    """
    try:
        logger.info(f"🔍 Finding person UUID for identifier: {patient_identifier}")
        
        # PatientIdentifier → Patient → Person 조인해서 조회
        patient_id_obj = PatientIdentifier.objects.select_related(
            'patient',           # PatientIdentifier → Patient
            'patient__patient_id'  # Patient → Person (patient_id는 Person의 FK)
        ).filter(
            identifier=patient_identifier,
            voided=False
        ).first()
        
        if not patient_id_obj:
            logger.warning(f"❌ Patient identifier '{patient_identifier}' not found")
            return Response({
                'success': False,
                'error': f'Patient identifier "{patient_identifier}" not found'
            }, status=404)
        
        # Person 객체 추출 (patient.patient_id가 Person 객체)
        person = patient_id_obj.patient.patient_id
        person_uuid = person.uuid
        
        logger.info(f"✅ Found person UUID: {person_uuid}")
        
        # Person 이름 정보 가져오기
        try:
            person_name = PersonName.objects.filter(
                person=person,
                voided=False,
                preferred=True
            ).first()
            
            if person_name:
                display_name = f"{person_name.given_name or ''} {person_name.family_name or ''}".strip()
            else:
                display_name = f"Patient {patient_identifier}"
        except Exception as name_error:
            logger.warning(f"⚠️ Could not get person name: {name_error}")
            display_name = f"Patient {patient_identifier}"
        
        # 환자 기본 정보도 함께 반환
        patient_info = {
            'uuid': person_uuid,
            'patient_identifier': patient_identifier,
            'display': display_name,
            'person': {
                'gender': person.gender,
                'birthdate': person.birthdate.isoformat() if person.birthdate else None,
                'age': getattr(person, 'age', None)
            }
        }
        
        logger.info(f"✅ Person info: {display_name} (UUID: {person_uuid})")
        
        return Response({
            'success': True,
            'person_uuid': person_uuid,
            'patient_info': patient_info
        })
        
    except Exception as e:
        logger.error(f"❌ Error finding person UUID for {patient_identifier}: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)


# openmrs_models/views.py - SOAP 진단 API 뷰 추가

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Prefetch
from django.utils import timezone
from datetime import datetime, timedelta

from .models import SoapDiagnosis, PatientVisitHistory, DiagnosisImageMapping
from .serializers import (
    SoapDiagnosisSerializer, 
    SoapDiagnosisCreateSerializer,
    PatientVisitHistorySerializer,
    DiagnosisImageMappingSerializer
)
from medical_integration.openmrs_api import OpenMRSAPI

import logging
logger = logging.getLogger('openmrs_models')


class SoapDiagnosisPagination(PageNumberPagination):
    """SOAP 진단 페이지네이션"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class SoapDiagnosisViewSet(viewsets.ModelViewSet):
    """SOAP 진단 정보 ViewSet"""
    
    queryset = SoapDiagnosis.objects.filter(is_active=True)
    pagination_class = SoapDiagnosisPagination
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SoapDiagnosisCreateSerializer
        return SoapDiagnosisSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # 필터링 파라미터
        patient_uuid = self.request.query_params.get('patient_uuid')
        encounter_uuid = self.request.query_params.get('encounter_uuid')
        soap_type = self.request.query_params.get('soap_type')
        diagnosis_type = self.request.query_params.get('diagnosis_type')
        icd10_code = self.request.query_params.get('icd10_code')
        
        if patient_uuid:
            queryset = queryset.filter(patient_uuid=patient_uuid)
        if encounter_uuid:
            queryset = queryset.filter(encounter_uuid=encounter_uuid)
        if soap_type:
            queryset = queryset.filter(soap_type=soap_type)
        if diagnosis_type:
            queryset = queryset.filter(diagnosis_type=diagnosis_type)
        if icd10_code:
            queryset = queryset.filter(icd10_code__icontains=icd10_code)
        
        return queryset.select_related().prefetch_related('image_mappings')
    
    @action(detail=False, methods=['get'])
    def by_patient(self, request):
        """환자별 모든 SOAP 진단 조회"""
        patient_uuid = request.query_params.get('patient_uuid')
        if not patient_uuid:
            return Response(
                {'error': 'patient_uuid 파라미터가 필요합니다.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # SOAP 타입별로 그룹화
        diagnoses = self.get_queryset().filter(patient_uuid=patient_uuid)
        
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
            'patient_uuid': patient_uuid,
            'soap_diagnoses': grouped_data,
            'total_count': diagnoses.count()
        })
    
    @action(detail=False, methods=['get'])
    def by_encounter(self, request):
        """진료별 SOAP 진단 조회"""
        encounter_uuid = request.query_params.get('encounter_uuid')
        if not encounter_uuid:
            return Response(
                {'error': 'encounter_uuid 파라미터가 필요합니다.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        diagnoses = self.get_queryset().filter(encounter_uuid=encounter_uuid)
        serializer = SoapDiagnosisSerializer(diagnoses, many=True)
        
        return Response({
            'encounter_uuid': encounter_uuid,
            'diagnoses': serializer.data,
            'count': diagnoses.count()
        })
    
    @action(detail=True, methods=['post'])
    def sync_to_openmrs(self, request, pk=None):
        """개별 SOAP 진단을 OpenMRS에 수동 동기화"""
        soap_diagnosis = self.get_object()
        
        try:
            success = soap_diagnosis.save_to_openmrs()
            if success:
                return Response({
                    'status': 'success',
                    'message': 'OpenMRS 동기화 완료',
                    'obs_uuid': soap_diagnosis.obs_uuid
                })
            else:
                return Response({
                    'status': 'error',
                    'message': 'OpenMRS 동기화 실패'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.error(f"OpenMRS 동기화 실패: {e}")
            return Response({
                'status': 'error',
                'message': f'동기화 중 오류 발생: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """SOAP 진단 일괄 생성"""
        if not isinstance(request.data, list):
            return Response(
                {'error': '배열 형태의 데이터가 필요합니다.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created_diagnoses = []
        errors = []
        
        for i, item in enumerate(request.data):
            serializer = SoapDiagnosisCreateSerializer(data=item)
            if serializer.is_valid():
                try:
                    diagnosis = serializer.save()
                    created_diagnoses.append(SoapDiagnosisSerializer(diagnosis).data)
                except Exception as e:
                    errors.append({
                        'index': i,
                        'error': str(e),
                        'data': item
                    })
            else:
                errors.append({
                    'index': i,
                    'error': serializer.errors,
                    'data': item
                })
        
        return Response({
            'created': created_diagnoses,
            'errors': errors,
            'created_count': len(created_diagnoses),
            'error_count': len(errors)
        })


class PatientVisitHistoryViewSet(viewsets.ModelViewSet):
    """환자 내원이력 ViewSet"""
    
    queryset = PatientVisitHistory.objects.all()
    serializer_class = PatientVisitHistorySerializer
    pagination_class = SoapDiagnosisPagination
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        patient_uuid = self.request.query_params.get('patient_uuid')
        visit_status = self.request.query_params.get('status')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if patient_uuid:
            queryset = queryset.filter(patient_uuid=patient_uuid)
        if visit_status:
            queryset = queryset.filter(status=visit_status)
        if date_from:
            queryset = queryset.filter(visit_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(visit_date__lte=date_to)
        
        return queryset
    
    @action(detail=True, methods=['get'])
    def soap_summary(self, request, pk=None):
        """방문별 SOAP 요약"""
        visit = self.get_object()
        soap_diagnoses = visit.get_soap_diagnoses()
        
        summary = {
            'visit_info': PatientVisitHistorySerializer(visit).data,
            'soap_counts': {
                'S': soap_diagnoses.filter(soap_type='S').count(),
                'O': soap_diagnoses.filter(soap_type='O').count(),
                'A': soap_diagnoses.filter(soap_type='A').count(),
                'P': soap_diagnoses.filter(soap_type='P').count(),
            },
            'primary_diagnoses': [
                {
                    'icd10_code': diag.icd10_code,
                    'icd10_name': diag.icd10_name,
                    'diagnosis_type': diag.diagnosis_type
                }
                for diag in soap_diagnoses.filter(
                    soap_type='A', 
                    diagnosis_type='PRIMARY'
                )
            ],
            'imaging_studies': soap_diagnoses.exclude(
                study_instance_uid__isnull=True
            ).values_list('study_instance_uid', flat=True).distinct()
        }
        
        return Response(summary)


@api_view(['GET'])
def doctor_dashboard_data(request):
    """의사 대시보드용 SOAP 진단 데이터"""
    doctor_uuid = request.query_params.get('doctor_uuid')
    if not doctor_uuid:
        return Response(
            {'error': 'doctor_uuid 파라미터가 필요합니다.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 오늘 날짜
    today = timezone.now().date()
    week_ago = today - timedelta(days=7)
    
    # 의사의 최근 진단 통계
    recent_diagnoses = SoapDiagnosis.objects.filter(
        doctor_uuid=doctor_uuid,
        created_date__date__gte=week_ago,
        is_active=True
    )
    
    # 통계 데이터
    stats = {
        'total_diagnoses': recent_diagnoses.count(),
        'today_diagnoses': recent_diagnoses.filter(created_date__date=today).count(),
        'soap_breakdown': {
            'S': recent_diagnoses.filter(soap_type='S').count(),
            'O': recent_diagnoses.filter(soap_type='O').count(),
            'A': recent_diagnoses.filter(soap_type='A').count(),
            'P': recent_diagnoses.filter(soap_type='P').count(),
        },
        'top_diagnoses': list(
            recent_diagnoses.filter(soap_type='A')
            .values('icd10_code', 'icd10_name')
            .annotate(count=Count('icd10_code'))
            .order_by('-count')[:10]
        ),
        'patients_treated': recent_diagnoses.values('patient_uuid').distinct().count(),
        'imaging_cases': recent_diagnoses.exclude(study_instance_uid__isnull=True).count()
    }
    
    # 최근 환자 목록
    recent_patients = (
        PatientVisitHistory.objects
        .filter(doctor_uuid=doctor_uuid, visit_date__date__gte=week_ago)
        .order_by('-visit_date')[:10]
    )
    
    patient_serializer = PatientVisitHistorySerializer(recent_patients, many=True)
    
    return Response({
        'statistics': stats,
        'recent_patients': patient_serializer.data,
        'period': f'{week_ago} ~ {today}'
    })


@api_view(['GET'])
def icd10_search(request):
    """ICD-10 코드 검색"""
    query = request.query_params.get('q', '').strip()
    if len(query) < 2:
        return Response({'results': []})
    
    # 실제 환경에서는 ICD-10 데이터베이스에서 검색
    # 여기서는 샘플 데이터 반환
    sample_icd10 = [
        {'code': 'J44.1', 'name': '급성 악화를 동반한 만성 폐쇄성 폐질환'},
        {'code': 'I50.9', 'name': '상세불명의 심부전'},
        {'code': 'E11.9', 'name': '합병증이 없는 제2형 당뇨병'},
        {'code': 'M54.5', 'name': '요통'},
        {'code': 'K59.0', 'name': '변비'},
    ]
    
    results = [
        item for item in sample_icd10 
        if query.upper() in item['code'].upper() or query in item['name']
    ]
    
    return Response({'results': results[:20]})


@api_view(['POST'])
def create_encounter_with_soap(request):
    """진료 생성과 동시에 SOAP 진단 추가"""
    try:
        patient_uuid = request.data.get('patient_uuid')
        doctor_uuid = request.data.get('doctor_uuid')
        soap_diagnoses_data = request.data.get('soap_diagnoses', [])
        
        if not all([patient_uuid, doctor_uuid]):
            return Response(
                {'error': 'patient_uuid와 doctor_uuid가 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # OpenMRS Encounter 생성
        openmrs_api = OpenMRSAPI()
        encounter_data = {
            'patient': patient_uuid,
            'encounterProviders': [{'provider': doctor_uuid}],
            'encounterDatetime': timezone.now().isoformat(),
            'encounterType': '61ae96f4-6afe-4351-b6f8-cd4fc383cce1'  # 기본 진료 타입
        }
        
        encounter_result = openmrs_api.create_encounter(encounter_data)
        if not encounter_result:
            return Response(
                {'error': 'OpenMRS Encounter 생성 실패'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        encounter_uuid = encounter_result['uuid']
        
        # 내원이력 생성
        visit_history = PatientVisitHistory.objects.create(
            patient_uuid=patient_uuid,
            encounter_uuid=encounter_uuid,
            visit_date=timezone.now(),
            status='IN_PROGRESS',
            doctor_uuid=doctor_uuid
        )
        
        # SOAP 진단 생성
        created_diagnoses = []
        for soap_data in soap_diagnoses_data:
            soap_data['patient_uuid'] = patient_uuid
            soap_data['encounter_uuid'] = encounter_uuid
            soap_data['doctor_uuid'] = doctor_uuid
            
            serializer = SoapDiagnosisCreateSerializer(data=soap_data)
            if serializer.is_valid():
                diagnosis = serializer.save()
                created_diagnoses.append(diagnosis)
        
        return Response({
            'encounter_uuid': encounter_uuid,
            'visit_history': PatientVisitHistorySerializer(visit_history).data,
            'soap_diagnoses': SoapDiagnosisSerializer(created_diagnoses, many=True).data,
            'created_count': len(created_diagnoses)
        })
        
    except Exception as e:
        logger.error(f"진료 생성 실패: {e}")
        return Response(
            {'error': f'진료 생성 중 오류: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )