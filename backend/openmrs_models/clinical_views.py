# backend/openmrs_models/clinical_views.py
"""
OpenMRS Concept, Obs, Encounter를 활용한 진단/처방 API
"""

import requests
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from base64 import b64encode
from django.utils import timezone
from datetime import datetime
import json

from .models import Patient, Person, Encounter
from .obs_models import Concept, Obs, ConceptName
from medical_integration.models import PatientMapping

# OpenMRS 기본 설정
OPENMRS_BASE_URL = 'http://openmrs:8080/openmrs/ws/rest/v1'
OPENMRS_AUTH = b64encode(b'admin:Admin123').decode()
HEADERS = {'Authorization': f'Basic {OPENMRS_AUTH}', 'Content-Type': 'application/json'}

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

@api_view(['GET'])
@permission_classes([AllowAny])
def get_patient_clinical_data(request, patient_uuid):
    """환자의 진단/처방 이력 조회"""
    try:
        # 환자 정보 확인
        try:
            person = Person.objects.get(uuid=patient_uuid, voided=False)
        except Person.DoesNotExist:
            return Response({'error': '환자를 찾을 수 없습니다.'}, status=404)

        # 최근 Encounter들 조회
        encounters = Encounter.objects.filter(
            patient__patient_id=person,
            voided=False
        ).order_by('-encounter_datetime')[:10]

        # 진단 및 처방 데이터 수집
        clinical_data = []
        
        for encounter in encounters:
            # 해당 Encounter의 Obs들 조회
            observations = Obs.objects.filter(
                encounter=encounter,
                person=person,
                voided=False
            ).select_related('concept').order_by('-obs_datetime')

            # 진단 데이터 추출
            diagnoses = []
            prescriptions = []
            
            for obs in observations:
                concept_name = obs.get_concept_name()
                
                # 진단 관련 Concept인지 확인
                if any(diag in concept_name.lower() for diag in ['diagnosis', '진단', 'condition', '질병']):
                    diagnoses.append({
                        'concept': concept_name,
                        'value': obs.get_display_value(),
                        'datetime': obs.obs_datetime.isoformat(),
                        'type': 'diagnosis'
                    })
                
                # 처방 관련 Concept인지 확인
                elif any(drug in concept_name.lower() for drug in ['drug', '약물', 'medication', '처방']):
                    prescriptions.append({
                        'concept': concept_name,
                        'value': obs.get_display_value(),
                        'datetime': obs.obs_datetime.isoformat(),
                        'type': 'prescription'
                    })

            if diagnoses or prescriptions:
                clinical_data.append({
                    'encounter_uuid': encounter.uuid,
                    'encounter_datetime': encounter.encounter_datetime.isoformat(),
                    'diagnoses': diagnoses,
                    'prescriptions': prescriptions
                })

        return Response({
            'patient_uuid': patient_uuid,
            'clinical_data': clinical_data
        })

    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
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


@api_view(['GET'])
@permission_classes([AllowAny])
def search_diagnosis_concepts(request):
    """진단 Concept 검색"""
    try:
        query = request.GET.get('q', '')
        if len(query) < 2:
            return Response({'results': []})

        # OpenMRS API로 Concept 검색
        params = {
            'q': query,
            'conceptClasses': 'Diagnosis',
            'v': 'custom:(uuid,display,conceptClass)',
            'limit': 20
        }

        response = requests.get(
            f'{OPENMRS_BASE_URL}/concept',
            headers=HEADERS,
            params=params,
            timeout=10
        )

        if response.status_code == 200:
            concepts = response.json().get('results', [])
            return Response({'results': concepts})
        else:
            return Response({'results': []})

    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def search_drug_concepts(request):
    """약물 Concept 검색"""
    try:
        query = request.GET.get('q', '')
        if len(query) < 2:
            return Response({'results': []})

        # OpenMRS API로 Drug 검색
        params = {
            'q': query,
            'v': 'custom:(uuid,display,strength,dosageForm)',
            'limit': 20
        }

        response = requests.get(
            f'{OPENMRS_BASE_URL}/drug',
            headers=HEADERS,
            params=params,
            timeout=10
        )

        if response.status_code == 200:
            drugs = response.json().get('results', [])
            return Response({'results': drugs})
        else:
            return Response({'results': []})

    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_patient_visits_history(request, patient_uuid):
    """환자 내원 이력 (Encounter 기반)"""
    try:
        # OpenMRS API로 Visit 조회
        params = {
            'patient': patient_uuid,
            'v': 'custom:(uuid,display,startDatetime,stopDatetime,encounters:(uuid,display,encounterDatetime,encounterType,provider))',
            'includeInactive': 'false'
        }

        response = requests.get(
            f'{OPENMRS_BASE_URL}/visit',
            headers=HEADERS,
            params=params,
            timeout=10
        )

        visits_data = []
        if response.status_code == 200:
            visits = response.json().get('results', [])
            
            for visit in visits:
                encounters = visit.get('encounters', [])
                
                # 각 Encounter의 진단/처방 정보 수집
                encounter_details = []
                for encounter in encounters:
                    # Encounter의 Obs 조회
                    obs_params = {
                        'encounter': encounter['uuid'],
                        'v': 'custom:(uuid,concept:(uuid,display),value,obsDatetime)',
                        'limit': 100
                    }
                    
                    obs_response = requests.get(
                        f'{OPENMRS_BASE_URL}/obs',
                        headers=HEADERS,
                        params=obs_params,
                        timeout=10
                    )
                    
                    observations = []
                    if obs_response.status_code == 200:
                        observations = obs_response.json().get('results', [])
                    
                    encounter_details.append({
                        'encounter_uuid': encounter['uuid'],
                        'encounter_datetime': encounter['encounterDatetime'],
                        'encounter_type': encounter.get('encounterType', {}).get('display', ''),
                        'provider': encounter.get('provider', {}).get('display', ''),
                        'observations': observations
                    })
                
                visits_data.append({
                    'visit_uuid': visit['uuid'],
                    'start_datetime': visit['startDatetime'],
                    'stop_datetime': visit.get('stopDatetime'),
                    'encounters': encounter_details
                })

        return Response({
            'patient_uuid': patient_uuid,
            'visits': visits_data
        })

    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def save_clinical_notes(request, patient_uuid):
    """임상 기록 저장 (간단한 텍스트 형태)"""
    try:
        notes = request.data.get('notes', '')
        encounter_uuid = request.data.get('encounter_uuid')
        
        if not notes or not encounter_uuid:
            return Response({'error': '노트와 Encounter UUID가 필요합니다.'}, status=400)

        # Clinical Notes Concept으로 Obs 생성
        obs_data = {
            'person': patient_uuid,
            'concept': '160632AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',  # Clinical Notes Concept UUID
            'encounter': encounter_uuid,
            'obsDatetime': timezone.now().isoformat(),
            'value': notes
        }

        response = requests.post(
            f'{OPENMRS_BASE_URL}/obs',
            headers=HEADERS,
            json=obs_data,
            timeout=10
        )

        if response.status_code == 201:
            return Response({'success': True, 'message': '임상 기록이 저장되었습니다.'})
        else:
            return Response({'error': '임상 기록 저장 실패'}, status=400)

    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_recent_vitals(request, patient_uuid):
    """최근 활력징후 조회"""
    try:
        # OpenMRS API로 최근 Obs 조회 (활력징후 관련)
        vital_concepts = [
            '5085AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',  # Systolic BP
            '5086AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',  # Diastolic BP
            '5087AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',  # Pulse
            '5088AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',  # Temperature
            '5242AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',  # Respiratory Rate
            '5092AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',  # SpO2
        ]

        vitals_data = {}
        
        for concept_uuid in vital_concepts:
            params = {
                'patient': patient_uuid,
                'concept': concept_uuid,
                'v': 'custom:(uuid,value,obsDatetime,concept:(display))',
                'limit': 1,
                'order': 'desc'
            }
            
            response = requests.get(
                f'{OPENMRS_BASE_URL}/obs',
                headers=HEADERS,
                params=params,
                timeout=10
            )
            
            if response.status_code == 200:
                results = response.json().get('results', [])
                if results:
                    obs = results[0]
                    concept_name = obs['concept']['display']
                    vitals_data[concept_name] = {
                        'value': obs['value'],
                        'datetime': obs['obsDatetime']
                    }

        return Response({
            'patient_uuid': patient_uuid,
            'vitals': vitals_data
        })

    except Exception as e:
        return Response({'error': str(e)}, status=500)