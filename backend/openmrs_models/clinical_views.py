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
from medical_integration.openmrs_api import OpenMRSAPI
from .models import Patient, Person, Encounter
from django.db import transaction
from .obs_models import Concept, Obs, ConceptName
from medical_integration.models import PatientMapping
import logging

# OpenMRS 기본 설정
OPENMRS_BASE_URL = 'http://openmrs:8080/openmrs/ws/rest/v1'
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
        
        if not notes:
            return Response({'error': '노트가 필요합니다.'}, status=400)

        # ✅ 새 Encounter 생성 (encounter_uuid가 없는 경우)
        if not encounter_uuid:
            # OpenMRS가 요구하는 올바른 ISO8601 형식으로 날짜 생성
            from datetime import datetime
            import pytz
            
            # UTC 시간으로 생성하고 Z를 붙임
            now_utc = datetime.now(pytz.UTC)
            encounter_datetime = now_utc.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
            
            encounter_data = {
                'patient': patient_uuid,
                'encounterType': '61ae96f4-6afe-4351-b6f8-cd4fc383cce1',  # Consultation
                'location': '8d6c993e-c2cc-11de-8d13-0010c6dffd0f',      # Default Location
                'encounterDatetime': encounter_datetime,  # ✅ 올바른 형식
            }

            print(f"🕐 보내는 날짜 형식: {encounter_datetime}")  # 디버깅용

            response = requests.post(
                f'{OPENMRS_BASE_URL}/encounter',
                headers=HEADERS,
                json=encounter_data,
                timeout=10
            )

            if response.status_code != 201:
                error_msg = f"Encounter 생성 실패: {response.status_code}, {response.text}"
                print(f"❌ {error_msg}")
                return Response({'error': error_msg}, status=400)

            encounter_uuid = response.json()['uuid']
            print(f"✅ Encounter 생성 성공: {encounter_uuid}")

        # ✅ Clinical Notes Obs 생성
        obs_datetime = datetime.now(pytz.UTC).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
        
        obs_data = {
            'person': patient_uuid,
            'concept': '160632AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',  # Clinical Notes Concept UUID
            'encounter': encounter_uuid,
            'obsDatetime': obs_datetime,  # ✅ 올바른 형식
            'value': notes
        }

        print(f"🩺 Obs 날짜 형식: {obs_datetime}")  # 디버깅용

        response = requests.post(
            f'{OPENMRS_BASE_URL}/obs',
            headers=HEADERS,
            json=obs_data,
            timeout=10
        )

        if response.status_code == 201:
            return Response({
                'success': True, 
                'message': '임상 기록이 저장되었습니다.',
                'encounter_uuid': encounter_uuid,
                'obs_uuid': response.json()['uuid']
            })
        else:
            error_msg = f"Obs 저장 실패: {response.status_code}, {response.text}"
            print(f"❌ {error_msg}")
            return Response({'error': error_msg}, status=400)

    except Exception as e:
        print(f"❌ save_clinical_notes 예외: {e}")
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

@api_view(['GET'])
@permission_classes([AllowAny])
def search_diagnosis_concepts(request):
    """진단 Concept 검색 API"""
    try:
        query = request.GET.get('q', '').strip()
        if len(query) < 2:
            return Response({
                'success': False,
                'results': [],
                'message': '검색어는 2글자 이상 입력해주세요.'
            })

        # OpenMRS API 사용
        api = OpenMRSAPI()
        concepts = api.search_diagnosis_concepts(query, limit=30)
        
        # 결과 포맷팅
        formatted_results = []
        for concept in concepts:
            formatted_results.append({
                'uuid': concept['uuid'],
                'display': concept['display'],
                'conceptClass': concept.get('conceptClass', ''),
                'searchRelevance': len([word for word in query.split() if word.lower() in concept['display'].lower()])
            })
        
        # 검색 관련성으로 정렬
        formatted_results.sort(key=lambda x: x['searchRelevance'], reverse=True)
        
        return Response({
            'success': True,
            'results': formatted_results,
            'count': len(formatted_results)
        })

    except Exception as e:
        logger.error(f"진단 검색 실패: {e}")
        return Response({
            'success': False,
            'error': str(e),
            'results': []
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def search_drug_concepts(request):
    """약물 Concept 검색 API"""
    try:
        query = request.GET.get('q', '').strip()
        if len(query) < 2:
            return Response({
                'success': False,
                'results': [],
                'message': '검색어는 2글자 이상 입력해주세요.'
            })

        # OpenMRS API 사용
        api = OpenMRSAPI()
        drugs = api.search_drug_concepts(query, limit=30)
        
        # 결과 포맷팅
        formatted_results = []
        for drug in drugs:
            formatted_results.append({
                'uuid': drug['uuid'],
                'display': drug['display'],
                'strength': drug.get('strength', ''),
                'dosageForm': drug.get('dosageForm', ''),
                'concept_uuid': drug.get('concept_uuid', ''),
                'searchRelevance': len([word for word in query.split() if word.lower() in drug['display'].lower()])
            })
        
        # 검색 관련성으로 정렬
        formatted_results.sort(key=lambda x: x['searchRelevance'], reverse=True)
        
        return Response({
            'success': True,
            'results': formatted_results,
            'count': len(formatted_results)
        })

    except Exception as e:
        logger.error(f"약물 검색 실패: {e}")
        return Response({
            'success': False,
            'error': str(e),
            'results': []
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_patient_clinical_data(request, patient_uuid):
    """환자의 진단/처방 이력 조회"""
    try:
        # 환자 존재 확인
        api = OpenMRSAPI()
        patient_data = api.get_patient(patient_uuid)
        
        if not patient_data:
            return Response({
                'success': False,
                'error': '환자를 찾을 수 없습니다.',
                'patient_uuid': patient_uuid
            }, status=404)

        # 임상 데이터 조회
        clinical_data = api.get_patient_clinical_summary(patient_uuid, limit=10)
        
        # PatientMapping에서 추가 정보 조회
        from medical_integration.models import PatientMapping
        mapping = PatientMapping.objects.filter(
            openmrs_patient_uuid=patient_uuid,
            is_active=True
        ).first()
        
        patient_info = {
            'uuid': patient_uuid,
            'display': mapping.display if mapping else patient_data.get('display', ''),
            'identifier': mapping.patient_identifier if mapping else '',
            'person': patient_data.get('person', {}),
            'mapping_status': mapping.sync_status if mapping else 'NO_MAPPING'
        }

        return Response({
            'success': True,
            'patient_info': patient_info,
            'clinical_data': clinical_data,
            'total_encounters': len(clinical_data)
        })

    except Exception as e:
        logger.error(f"환자 임상 데이터 조회 실패: {e}")
        return Response({
            'success': False,
            'error': str(e),
            'patient_uuid': patient_uuid
        }, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def create_encounter_with_data(request, patient_uuid):
    """새 Encounter 생성 및 진단/처방 데이터 저장"""
    try:
        # 요청 데이터 검증
        diagnoses = request.data.get('diagnoses', [])
        prescriptions = request.data.get('prescriptions', [])
        clinical_notes = request.data.get('clinical_notes', '')
        
        if not diagnoses and not prescriptions and not clinical_notes:
            return Response({
                'success': False,
                'error': '저장할 데이터가 없습니다.'
            }, status=400)

        # 환자 존재 확인
        api = OpenMRSAPI()
        patient_data = api.get_patient(patient_uuid)
        
        if not patient_data:
            return Response({
                'success': False,
                'error': '환자를 찾을 수 없습니다.'
            }, status=404)

        # 새 Encounter 생성
        encounter = api.create_encounter(patient_uuid)
        
        if not encounter:
            return Response({
                'success': False,
                'error': 'Encounter 생성에 실패했습니다.'
            }, status=500)

        encounter_uuid = encounter['uuid']
        saved_data = {
            'encounter_uuid': encounter_uuid,
            'diagnoses': [],
            'prescriptions': [],
            'clinical_notes': None,
            'errors': []
        }

        # 진단 데이터 저장
        for diagnosis in diagnoses:
            if diagnosis.get('concept_uuid') and diagnosis.get('value'):
                try:
                    diagnosis_obs = api.create_diagnosis_obs(
                        patient_uuid=patient_uuid,
                        encounter_uuid=encounter_uuid,
                        diagnosis_concept_uuid=diagnosis['concept_uuid'],
                        diagnosis_notes=diagnosis.get('notes', '')
                    )
                    
                    if diagnosis_obs:
                        saved_data['diagnoses'].append({
                            'obs_uuid': diagnosis_obs['uuid'],
                            'concept_uuid': diagnosis['concept_uuid'],
                            'value': diagnosis['value'],
                            'notes': diagnosis.get('notes', '')
                        })
                    else:
                        saved_data['errors'].append(f"진단 저장 실패: {diagnosis['value']}")
                        
                except Exception as e:
                    saved_data['errors'].append(f"진단 저장 오류: {str(e)}")

        # 처방 데이터 저장
        for prescription in prescriptions:
            if prescription.get('drug_uuid') and prescription.get('drug_name'):
                try:
                    prescription_obs_list = api.create_prescription_obs_group(
                        patient_uuid=patient_uuid,
                        encounter_uuid=encounter_uuid,
                        prescription_data={
                            'drug_uuid': prescription.get('drug_uuid') or prescription.get('drug_concept_uuid'),
                            'drug_name': prescription.get('drug_name'),
                            'dosage': prescription.get('dosage'),
                            'dose_units': prescription.get('dose_units', 'mg'),
                            'frequency': prescription.get('frequency'),
                            'duration': prescription.get('duration'),
                            'instructions': prescription.get('instructions')
                        }
                    )
                    
                    if prescription_obs_list:
                        saved_data['prescriptions'].append({
                            'obs_count': len(prescription_obs_list),
                            'drug_name': prescription['drug_name'],
                            'dosage': prescription.get('dosage'),
                            'frequency': prescription.get('frequency')
                        })
                    else:
                        saved_data['errors'].append(f"처방 저장 실패: {prescription['drug_name']}")
                        
                except Exception as e:
                    saved_data['errors'].append(f"처방 저장 오류: {str(e)}")

        # 임상 노트 저장
        if clinical_notes:
            try:
                notes_obs = api.create_observation({
                    "person": patient_uuid,
                    "encounter": encounter_uuid,
                    "concept": "162169AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",  # Clinical Notes
                    "valueText": clinical_notes,
                    "comment": "임상 노트"
                })
                
                if notes_obs:
                    saved_data['clinical_notes'] = {
                        'obs_uuid': notes_obs['uuid'],
                        'notes': clinical_notes
                    }
                else:
                    saved_data['errors'].append("임상 노트 저장 실패")
                    
            except Exception as e:
                saved_data['errors'].append(f"임상 노트 저장 오류: {str(e)}")

        # 결과 반환
        return Response({
            'success': True,
            'message': 'EMR 데이터가 저장되었습니다.',
            'encounter_uuid': encounter_uuid,
            'saved_data': saved_data
        })

    except Exception as e:
        logger.error(f"Encounter 생성 및 데이터 저장 실패: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_patient_visits_history(request, patient_uuid):
    """환자 내원이력 조회 (상세 정보 포함)"""
    try:
        # 환자 존재 확인
        api = OpenMRSAPI()
        patient_data = api.get_patient(patient_uuid)
        
        if not patient_data:
            return Response({
                'success': False,
                'error': '환자를 찾을 수 없습니다.'
            }, status=404)

        # 더 많은 이력 조회 (최대 50개)
        limit = int(request.GET.get('limit', 20))
        clinical_data = api.get_patient_clinical_summary(patient_uuid, limit=limit)
        
        # 이력 데이터 상세 포맷팅
        formatted_history = []
        for encounter in clinical_data:
            # 진단 요약
            diagnosis_summary = []
            for diag in encounter['diagnoses']:
                diagnosis_summary.append(diag['concept'])
            
            # 처방 요약
            prescription_summary = []
            for presc in encounter['prescriptions']:
                if 'drug' in presc['concept'].lower():
                    prescription_summary.append(presc['value'])
            
            formatted_history.append({
                'encounter_uuid': encounter['encounter_uuid'],
                'visit_date': encounter['encounter_datetime'][:10],  # YYYY-MM-DD
                'visit_time': encounter['encounter_datetime'][11:16],  # HH:MM
                'encounter_type': encounter['encounter_type'],
                'location': encounter['location'],
                'provider': encounter['provider'],
                'diagnosis_count': len(encounter['diagnoses']),
                'prescription_count': len(encounter['prescriptions']),
                'diagnosis_summary': ', '.join(diagnosis_summary) if diagnosis_summary else '진단 없음',
                'prescription_summary': ', '.join(prescription_summary) if prescription_summary else '처방 없음',
                'total_observations': len(encounter['diagnoses']) + len(encounter['prescriptions']) + len(encounter['other_obs'])
            })
        
        # 통계 정보
        stats = {
            'total_visits': len(formatted_history),
            'total_diagnoses': sum(visit['diagnosis_count'] for visit in formatted_history),
            'total_prescriptions': sum(visit['prescription_count'] for visit in formatted_history),
            'last_visit_date': formatted_history[0]['visit_date'] if formatted_history else None,
            'visit_frequency': len(formatted_history) / 12 if formatted_history else 0  # 연간 평균
        }

        return Response({
            'success': True,
            'patient_uuid': patient_uuid,
            'patient_display': patient_data.get('display', ''),
            'visits_history': formatted_history,
            'statistics': stats
        })

    except Exception as e:
        logger.error(f"환자 내원이력 조회 실패: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def save_clinical_notes(request, patient_uuid):
    """임상 기록 저장 - Provider 문제 완전 해결"""
    try:
        notes = request.data.get('notes', '')
        
        if not notes:
            return Response({'error': '노트가 필요합니다.'}, status=400)

        # ✅ 최소한의 Encounter 데이터만 사용 - Provider 완전 제거
        from datetime import datetime
        import pytz
        
        now_utc = datetime.now(pytz.UTC)
        encounter_datetime = now_utc.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
        
        # ✅ 기본 필드만 사용 - location도 제거하여 최소화
        encounter_data = {
            'patient': patient_uuid,
            'encounterType': '61ae96f4-6afe-4351-b6f8-cd4fc383cce1',  # Consultation
            'encounterDatetime': encounter_datetime
            # 'location': '8d6c993e-c2cc-11de-8d13-0010c6dffd0f',  # ❌ 이것도 제거해보자
            # 'provider': None,  # ❌ 완전 제거
        }

        print(f"🕐 최소 Encounter 데이터: {encounter_data}")

        response = requests.post(
            f'{OPENMRS_BASE_URL}/encounter',
            headers=HEADERS,
            json=encounter_data,
            timeout=10
        )

        if response.status_code != 201:
            error_msg = f"Encounter 생성 실패: {response.status_code}, {response.text}"
            print(f"❌ {error_msg}")
            return Response({'error': error_msg}, status=400)

        encounter_result = response.json()
        encounter_uuid = encounter_result['uuid']
        print(f"✅ Encounter 생성 성공: {encounter_uuid}")

        # ✅ Clinical Notes Obs 생성
        obs_datetime = datetime.now(pytz.UTC).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
        
        obs_data = {
            'person': patient_uuid,
            'concept': '160632AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',  # Clinical Notes Concept
            'encounter': encounter_uuid,
            'obsDatetime': obs_datetime,
            'value': notes
        }

        print(f"🩺 저장할 Obs 데이터: {obs_data}")

        obs_response = requests.post(
            f'{OPENMRS_BASE_URL}/obs',
            headers=HEADERS,
            json=obs_data,
            timeout=10
        )

        if obs_response.status_code == 201:
            obs_result = obs_response.json()
            return Response({
                'success': True, 
                'message': '임상 기록이 저장되었습니다.',
                'encounter_uuid': encounter_uuid,
                'obs_uuid': obs_result['uuid']
            })
        else:
            error_msg = f"Obs 저장 실패: {obs_response.status_code}, {obs_response.text}"
            print(f"❌ {error_msg}")
            return Response({'error': error_msg}, status=400)

    except Exception as e:
        print(f"❌ save_clinical_notes 예외: {e}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_recent_vitals(request, patient_uuid):
    """환자의 최근 생체징후 조회"""
    try:
        api = OpenMRSAPI()
        encounters = api.get_patient_encounters(patient_uuid, limit=5)
        
        vitals_data = []
        for encounter in encounters:
            encounter_vitals = {
                'encounter_uuid': encounter['uuid'],
                'encounter_date': encounter['encounterDatetime'][:10],
                'vitals': {}
            }
            
            # 생체징후 관련 Observation 추출
            for obs in encounter.get('obs', []):
                concept_display = obs.get('concept', {}).get('display', '').lower()
                value = obs.get('valueNumeric') or obs.get('valueText')
                
                if value:
                    if 'temperature' in concept_display or '체온' in concept_display:
                        encounter_vitals['vitals']['temperature'] = f"{value}°C"
                    elif 'pulse' in concept_display or '맥박' in concept_display:
                        encounter_vitals['vitals']['pulse'] = f"{value} bpm"
                    elif 'systolic' in concept_display or '수축기' in concept_display:
                        encounter_vitals['vitals']['systolic_bp'] = f"{value} mmHg"
                    elif 'diastolic' in concept_display or '이완기' in concept_display:
                        encounter_vitals['vitals']['diastolic_bp'] = f"{value} mmHg"
                    elif 'respiratory' in concept_display or '호흡' in concept_display:
                        encounter_vitals['vitals']['respiratory_rate'] = f"{value} /min"
                    elif 'oxygen' in concept_display or '산소포화도' in concept_display:
                        encounter_vitals['vitals']['oxygen_saturation'] = f"{value}%"
                    elif 'weight' in concept_display or '체중' in concept_display:
                        encounter_vitals['vitals']['weight'] = f"{value} kg"
                    elif 'height' in concept_display or '신장' in concept_display:
                        encounter_vitals['vitals']['height'] = f"{value} cm"
            
            if encounter_vitals['vitals']:
                vitals_data.append(encounter_vitals)
        
        return Response({
            'success': True,
            'patient_uuid': patient_uuid,
            'vitals_history': vitals_data
        })

    except Exception as e:
        logger.error(f"생체징후 조회 실패: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)