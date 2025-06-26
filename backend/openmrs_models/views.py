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
logger = logging.getLogger(__name__)

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

def get_patient_name_by_uuid(patient_uuid):
    """
    🔥 수정된 UUID 기반 환자 이름 조회
    UUID는 Person 테이블에 있으므로 Person → Patient → PatientIdentifier 순으로 조회
    """
    try:
        from openmrs_models.models import Person, Patient, PatientIdentifier, PersonName
        
        # 1. Person 테이블에서 UUID로 조회
        try:
            person = Person.objects.get(uuid=patient_uuid, voided=False)
            logger.info(f"✅ Person 발견: {person.person_id}")
        except Person.DoesNotExist:
            logger.error(f"❌ Person not found for UUID: {patient_uuid}")
            return None
        
        # 2. Person → Patient 관계 조회
        try:
            patient = Patient.objects.get(patient_id=person, voided=False)
            logger.info(f"✅ Patient 발견: {patient.patient_id}")
        except Patient.DoesNotExist:
            logger.error(f"❌ Patient not found for Person: {person.person_id}")
            return None
        
        # 3. Patient → PatientIdentifier 조회
        try:
            patient_identifier = PatientIdentifier.objects.filter(
                patient=patient,
                voided=False,
                preferred=True
            ).first()
            
            if not patient_identifier:
                # preferred가 없으면 아무거나
                patient_identifier = PatientIdentifier.objects.filter(
                    patient=patient,
                    voided=False
                ).first()
                
            identifier_value = patient_identifier.identifier if patient_identifier else f"Patient_{person.person_id}"
            logger.info(f"✅ Patient Identifier: {identifier_value}")
        except Exception as e:
            logger.warning(f"⚠️ PatientIdentifier 조회 실패: {e}")
            identifier_value = f"Patient_{person.person_id}"
        
        # 4. PersonName 조회
        try:
            person_name = PersonName.objects.filter(
                person=person,
                voided=False,
                preferred=True
            ).first()
            
            if not person_name:
                # preferred가 없으면 아무거나
                person_name = PersonName.objects.filter(
                    person=person,
                    voided=False
                ).first()
            
            if person_name:
                full_name = f"{person_name.given_name or ''} {person_name.family_name or ''}".strip()
                if not full_name:
                    full_name = person_name.given_name or person_name.family_name or f"Patient {identifier_value}"
            else:
                full_name = f"Patient {identifier_value}"
                
            logger.info(f"✅ Person Name: {full_name}")
        except Exception as e:
            logger.warning(f"⚠️ PersonName 조회 실패: {e}")
            full_name = f"Patient {identifier_value}"
        
        # 5. 최종 결과 반환
        result = {
            'uuid': patient_uuid,
            'patient_identifier': identifier_value,
            'name': full_name,
            'display': f"{identifier_value} - {full_name}",
            'gender': person.gender,
            'birthdate': person.birthdate.isoformat() if person.birthdate else None,
            'person_id': person.person_id,
            'patient_id': patient.patient_id if patient else None
        }
        
        logger.info(f"🎉 환자 정보 조회 성공: {result['display']}")
        return result
        
    except Exception as e:
        logger.error(f"❌ DB에서 환자 이름 조회 실패 (UUID: {patient_uuid}): {e}")
        return None
    
@api_view(['GET'])
def get_patient_info_by_uuid(request, patient_uuid):
    """UUID 기반 환자 정보 조회 API"""
    try:
        patient_info = get_patient_name_by_uuid(patient_uuid)
        
        if patient_info:
            return Response({
                'success': True,
                'patient': patient_info
            })
        else:
            return Response({
                'success': False,
                'error': f'UUID {patient_uuid}에 해당하는 환자를 찾을 수 없습니다.'
            }, status=404)
            
    except Exception as e:
        logger.error(f"환자 정보 조회 API 실패: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)