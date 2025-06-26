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