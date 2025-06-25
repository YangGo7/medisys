# backend/openmrs_models/clinical_views.py
"""
OpenMRS Concept, Obs, Encounter를 활용한 진단/처방 API
"""
import time
from django.db.models import Q
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
def get_patient_visits_history(request, patient_uuid):
    """
    🔥 환자 방문 이력 조회 - 간단하고 안전한 버전
    """
    try:
        logger.info(f"📂 환자 방문 이력 조회: {patient_uuid}")
        
        from medical_integration.openmrs_api import OpenMRSAPI
        openmrs_api = OpenMRSAPI()
        
        if not openmrs_api.test_connection():
            logger.error("OpenMRS 연결 실패")
            return Response({
                'success': False,
                'error': 'OpenMRS 서버에 연결할 수 없습니다'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        # 환자 정보 확인
        patient_info = openmrs_api.get_patient(patient_uuid)
        if not patient_info:
            logger.error(f"환자를 찾을 수 없음: {patient_uuid}")
            return Response({
                'success': False,
                'error': '환자를 찾을 수 없습니다'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # 🔥 간단하고 안전한 Encounter 조회
        try:
            encounters = openmrs_api.get_patient_encounters(patient_uuid)
            
            if not encounters:
                logger.info(f"환자 {patient_uuid}의 Encounter가 없습니다")
                return Response({
                    'success': True,
                    'patient_uuid': patient_uuid,
                    'patient_display': patient_info.get('display', 'Unknown'),
                    'visits_history': [],
                    'total_visits': 0,
                    'message': '내원 이력이 없습니다'
                })
            
            logger.info(f"✅ {len(encounters)}개의 Encounter 조회됨")
            
            # 🔥 안전한 방문 이력 포맷팅
            visits_history = []
            for encounter in encounters:
                try:
                    # Provider 정보 안전하게 처리
                    provider_info = encounter.get('provider', [])
                    if isinstance(provider_info, list) and len(provider_info) > 0:
                        provider_display = provider_info[0].get('display', 'Unknown Provider')
                    elif isinstance(provider_info, dict):
                        provider_display = provider_info.get('display', 'Unknown Provider')
                    else:
                        provider_display = 'No Provider'
                    
                    # Observations 안전하게 처리
                    observations = encounter.get('obs', [])
                    processed_observations = []
                    
                    for obs in observations:
                        try:
                            obs_data = {
                                'uuid': obs.get('uuid', ''),
                                'concept': {
                                    'uuid': obs.get('concept', {}).get('uuid', ''),
                                    'display': obs.get('concept', {}).get('display', 'Unknown Concept')
                                },
                                'value': obs.get('value'),
                                'valueText': obs.get('valueText'),
                                'valueNumeric': obs.get('valueNumeric'),
                                'obsDatetime': obs.get('obsDatetime'),
                                'comment': obs.get('comment', '')
                            }
                            processed_observations.append(obs_data)
                        except Exception as obs_error:
                            logger.warning(f"Observation 처리 중 오류: {obs_error}")
                            continue
                    
                    visit_record = {
                        'encounter_uuid': encounter.get('uuid', ''),
                        'encounter_datetime': encounter.get('encounterDatetime', ''),
                        'encounter_type': encounter.get('encounterType', {}).get('display', 'Unknown'),
                        'location': encounter.get('location', {}).get('display', 'Unknown'),
                        'provider': provider_display,
                        'visit_date': encounter.get('encounterDatetime', '')[:10] if encounter.get('encounterDatetime') else '',
                        'visit_time': encounter.get('encounterDatetime', '')[11:16] if encounter.get('encounterDatetime') else '',
                        'observations': processed_observations,
                        'obs_count': len(processed_observations)
                    }
                    
                    visits_history.append(visit_record)
                    
                except Exception as encounter_error:
                    logger.warning(f"Encounter 처리 중 오류: {encounter_error}")
                    continue
            
            logger.info(f"🎯 최종 처리된 방문 이력: {len(visits_history)}건")
            
            return Response({
                'success': True,
                'patient_uuid': patient_uuid,
                'patient_display': patient_info.get('display', 'Unknown'),
                'visits_history': visits_history,
                'total_visits': len(visits_history),
                'message': f'{len(visits_history)}건의 내원 이력을 조회했습니다'
            })
            
        except Exception as e:
            logger.error(f"Encounter 조회 중 예외: {e}")
            import traceback
            logger.error(f"상세 에러: {traceback.format_exc()}")
            
            # 빈 결과 반환 (오류 대신)
            return Response({
                'success': True,
                'patient_uuid': patient_uuid,
                'patient_display': patient_info.get('display', 'Unknown'),
                'visits_history': [],
                'total_visits': 0,
                'error_message': f'Encounter 조회 중 오류: {str(e)}'
            })
            
    except Exception as e:
        logger.error(f"❌ 환자 방문 이력 조회 실패: {e}")
        import traceback
        logger.error(f"상세 에러: {traceback.format_exc()}")
        return Response({
            'success': False,
            'error': f'서버 오류: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def save_clinical_notes(request, patient_uuid):
    """
    🔥 완전 수정된 진료 기록 저장 함수 - Provider, Location 필수 필드 포함
    """
    try:
        logger.info(f"🩺 진료 기록 저장 시작: 환자 {patient_uuid}")
        logger.info(f"요청 데이터: {request.data}")
        
        # OpenMRS API 인스턴스 생성
        openmrs_api = OpenMRSAPI()
        
        # 연결 테스트
        if not openmrs_api.test_connection():
            logger.error("OpenMRS 서버 연결 실패")
            return Response({
                'success': False,
                'error': 'OpenMRS 서버에 연결할 수 없습니다'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        # 환자 존재 확인
        patient_info = openmrs_api.get_patient(patient_uuid)
        if not patient_info:
            logger.error(f"환자를 찾을 수 없음: {patient_uuid}")
            return Response({
                'success': False,
                'error': '환자를 찾을 수 없습니다'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # 🔥 필수 메타데이터 조회
        try:
            encounter_type_uuid = openmrs_api.get_default_encounter_type_uuid()
            location_uuid = openmrs_api.get_default_location_uuid()
            provider_uuid = openmrs_api.get_default_provider_uuid()
            
            logger.info(f"📋 메타데이터 조회:")
            logger.info(f"  Encounter Type: {encounter_type_uuid}")
            logger.info(f"  Location: {location_uuid}")
            logger.info(f"  Provider: {provider_uuid}")
            
            if not encounter_type_uuid:
                raise Exception("Encounter Type을 찾을 수 없습니다")
            if not location_uuid:
                raise Exception("Location을 찾을 수 없습니다")
            
        except Exception as e:
            logger.error(f"메타데이터 조회 실패: {e}")
            return Response({
                'success': False,
                'error': f'OpenMRS 메타데이터 조회 실패: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # 🔥 완전한 Encounter 데이터 구성
        encounter_data = {
            'patient': patient_uuid,
            'encounterType': encounter_type_uuid,
            'location': location_uuid,
            'encounterDatetime': None  # API가 자동으로 올바른 형식 설정
        }
        
        # Provider가 있으면 추가 (선택사항으로 처리)
        if provider_uuid:
            encounter_data['provider'] = provider_uuid
            logger.info(f"✅ Provider 추가: {provider_uuid}")
        else:
            logger.warning("⚠️ Provider 없이 진행")
        
        logger.info(f"🕐 완전한 Encounter 데이터: {encounter_data}")
        
        # Encounter 생성
        encounter_result = openmrs_api.create_encounter(encounter_data)
        if 'error' in encounter_result:
            logger.error(f"Encounter 생성 실패: {encounter_result['error']}")
            return Response({
                'success': False,
                'error': f"Encounter 생성 실패: {encounter_result['error']}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        encounter_uuid = encounter_result.get('uuid')
        logger.info(f"✅ Encounter 생성 성공: {encounter_uuid}")
        
        # 🔥 진단 정보 저장 (안전한 방식)
        diagnosis_data = request.data.get('diagnosis', [])
        saved_diagnoses = []
        for diag in diagnosis_data:
            if diag.get('value') and diag.get('value').strip():
                # 텍스트 기반 진단으로 저장
                obs_data = {
                    'person': patient_uuid,
                    'encounter': encounter_uuid,
                    'concept': '159947AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',  # Visit Diagnoses
                    'valueText': str(diag['value']).strip(),
                    'obsDatetime': None
                }
                
                obs_result = openmrs_api.create_obs(obs_data)
                if 'error' in obs_result:
                    logger.warning(f"진단 Obs 생성 실패: {obs_result['error']}")
                else:
                    saved_diagnoses.append(obs_result.get('uuid'))
                    logger.info(f"✅ 진단 Obs 생성 성공: {obs_result.get('uuid')}")
        
        # 🔥 처방 정보 저장 (안전한 방식)
        prescription_data = request.data.get('prescriptions', [])
        saved_prescriptions = []
        for prescription in prescription_data:
            if prescription.get('drug') and prescription.get('drug').strip():
                # 약물명을 텍스트로 저장
                drug_info = []
                if prescription.get('drug'):
                    drug_info.append(f"약물: {prescription['drug']}")
                if prescription.get('dosage'):
                    drug_info.append(f"용량: {prescription['dosage']}")
                if prescription.get('frequency'):
                    drug_info.append(f"빈도: {prescription['frequency']}")
                if prescription.get('duration'):
                    drug_info.append(f"기간: {prescription['duration']}")
                
                obs_data = {
                    'person': patient_uuid,
                    'encounter': encounter_uuid,
                    'concept': '1282AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',  # Drug Orders
                    'valueText': ' | '.join(drug_info),
                    'obsDatetime': None
                }
                
                obs_result = openmrs_api.create_obs(obs_data)
                if 'error' in obs_result:
                    logger.warning(f"처방 Obs 생성 실패: {obs_result['error']}")
                else:
                    saved_prescriptions.append(obs_result.get('uuid'))
                    logger.info(f"✅ 처방 Obs 생성 성공: {obs_result.get('uuid')}")
        
        # 🔥 임상 메모 저장 (필수)
        notes = request.data.get('notes', '').strip()
        saved_notes = None
        if notes:
            # Clinical Notes concept으로 저장
            obs_data = {
                'person': patient_uuid,
                'encounter': encounter_uuid,
                'concept': '160632AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',  # Clinical Notes
                'valueText': notes,
                'obsDatetime': None
            }
            
            obs_result = openmrs_api.create_obs(obs_data)
            if 'error' in obs_result:
                logger.warning(f"메모 Obs 생성 실패: {obs_result['error']}")
            else:
                saved_notes = obs_result.get('uuid')
                logger.info(f"✅ 메모 Obs 생성 성공: {obs_result.get('uuid')}")
        
        # 🔥 체중 정보 저장 (선택사항)
        weight = request.data.get('weight', '').strip()
        saved_weight = None
        if weight and weight.replace('.', '').isdigit():
            try:
                weight_value = float(weight)
                obs_data = {
                    'person': patient_uuid,
                    'encounter': encounter_uuid,
                    'concept': '5089AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',  # Weight (kg)
                    'value': weight_value,
                    'obsDatetime': None
                }
                
                obs_result = openmrs_api.create_obs(obs_data)
                if 'error' in obs_result:
                    logger.warning(f"체중 Obs 생성 실패: {obs_result['error']}")
                else:
                    saved_weight = obs_result.get('uuid')
                    logger.info(f"✅ 체중 Obs 생성 성공: {obs_result.get('uuid')}")
            except ValueError:
                logger.warning(f"⚠️ 잘못된 체중 값: {weight}")
        
        logger.info(f"🎉 진료 기록 저장 완료: Encounter {encounter_uuid}")
        
        return Response({
            'success': True,
            'encounter_uuid': encounter_uuid,
            'saved_data': {
                'diagnoses_count': len(saved_diagnoses),
                'prescriptions_count': len(saved_prescriptions),
                'notes_saved': saved_notes is not None,
                'weight_saved': saved_weight is not None,
                'total_observations': len(saved_diagnoses) + len(saved_prescriptions) + (1 if saved_notes else 0) + (1 if saved_weight else 0)
            },
            'message': '진료 기록이 성공적으로 저장되었습니다'
        })
        
    except Exception as e:
        logger.error(f"❌ save_clinical_notes_fixed 예외: {e}")
        import traceback
        logger.error(f"상세 에러: {traceback.format_exc()}")
        return Response({
            'success': False,
            'error': f'서버 오류: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
def get_patient_visits_history(request, patient_uuid):
    """
    🔥 환자 방문 이력 조회 - 간단하고 안전한 버전
    """
    try:
        logger.info(f"📂 환자 방문 이력 조회: {patient_uuid}")
        
        from medical_integration.openmrs_api import OpenMRSAPI
        openmrs_api = OpenMRSAPI()
        
        if not openmrs_api.test_connection():
            logger.error("OpenMRS 연결 실패")
            return Response({
                'success': False,
                'error': 'OpenMRS 서버에 연결할 수 없습니다'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        # 환자 정보 확인
        patient_info = openmrs_api.get_patient(patient_uuid)
        if not patient_info:
            logger.error(f"환자를 찾을 수 없음: {patient_uuid}")
            return Response({
                'success': False,
                'error': '환자를 찾을 수 없습니다'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # 🔥 간단하고 안전한 Encounter 조회
        try:
            encounters = openmrs_api.get_patient_encounters(patient_uuid)
            
            if not encounters:
                logger.info(f"환자 {patient_uuid}의 Encounter가 없습니다")
                return Response({
                    'success': True,
                    'patient_uuid': patient_uuid,
                    'patient_display': patient_info.get('display', 'Unknown'),
                    'visits_history': [],
                    'total_visits': 0,
                    'message': '내원 이력이 없습니다'
                })
            
            logger.info(f"✅ {len(encounters)}개의 Encounter 조회됨")
            
            # 🔥 안전한 방문 이력 포맷팅
            visits_history = []
            for encounter in encounters:
                try:
                    # Provider 정보 안전하게 처리
                    provider_info = encounter.get('provider', [])
                    if isinstance(provider_info, list) and len(provider_info) > 0:
                        provider_display = provider_info[0].get('display', 'Unknown Provider')
                    elif isinstance(provider_info, dict):
                        provider_display = provider_info.get('display', 'Unknown Provider')
                    else:
                        provider_display = 'No Provider'
                    
                    # Observations 안전하게 처리
                    observations = encounter.get('obs', [])
                    processed_observations = []
                    
                    for obs in observations:
                        try:
                            obs_data = {
                                'uuid': obs.get('uuid', ''),
                                'concept': {
                                    'uuid': obs.get('concept', {}).get('uuid', ''),
                                    'display': obs.get('concept', {}).get('display', 'Unknown Concept')
                                },
                                'value': obs.get('value'),
                                'valueText': obs.get('valueText'),
                                'valueNumeric': obs.get('valueNumeric'),
                                'obsDatetime': obs.get('obsDatetime'),
                                'comment': obs.get('comment', '')
                            }
                            processed_observations.append(obs_data)
                        except Exception as obs_error:
                            logger.warning(f"Observation 처리 중 오류: {obs_error}")
                            continue
                    
                    visit_record = {
                        'encounter_uuid': encounter.get('uuid', ''),
                        'encounter_datetime': encounter.get('encounterDatetime', ''),
                        'encounter_type': encounter.get('encounterType', {}).get('display', 'Unknown'),
                        'location': encounter.get('location', {}).get('display', 'Unknown'),
                        'provider': provider_display,
                        'visit_date': encounter.get('encounterDatetime', '')[:10] if encounter.get('encounterDatetime') else '',
                        'visit_time': encounter.get('encounterDatetime', '')[11:16] if encounter.get('encounterDatetime') else '',
                        'observations': processed_observations,
                        'obs_count': len(processed_observations)
                    }
                    
                    visits_history.append(visit_record)
                    
                except Exception as encounter_error:
                    logger.warning(f"Encounter 처리 중 오류: {encounter_error}")
                    continue
            
            logger.info(f"🎯 최종 처리된 방문 이력: {len(visits_history)}건")
            
            return Response({
                'success': True,
                'patient_uuid': patient_uuid,
                'patient_display': patient_info.get('display', 'Unknown'),
                'visits_history': visits_history,
                'total_visits': len(visits_history),
                'message': f'{len(visits_history)}건의 내원 이력을 조회했습니다'
            })
            
        except Exception as e:
            logger.error(f"Encounter 조회 중 예외: {e}")
            import traceback
            logger.error(f"상세 에러: {traceback.format_exc()}")
            
            # 빈 결과 반환 (오류 대신)
            return Response({
                'success': True,
                'patient_uuid': patient_uuid,
                'patient_display': patient_info.get('display', 'Unknown'),
                'visits_history': [],
                'total_visits': 0,
                'error_message': f'Encounter 조회 중 오류: {str(e)}'
            })
            
    except Exception as e:
        logger.error(f"❌ 환자 방문 이력 조회 실패: {e}")
        import traceback
        logger.error(f"상세 에러: {traceback.format_exc()}")
        return Response({
            'success': False,
            'error': f'서버 오류: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



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
        
        

@api_view(['POST'])
@permission_classes([AllowAny])
def test_minimal_encounter(request, patient_uuid):
    """최소한의 Encounter 생성 테스트"""
    try:
        logger.info(f"🧪 최소 Encounter 테스트: {patient_uuid}")
        
        openmrs_api = OpenMRSAPI()
        
        # 연결 테스트
        if not openmrs_api.test_connection():
            return Response({
                'success': False,
                'error': 'OpenMRS 연결 실패'
            })
        
        # 환자 확인
        patient = openmrs_api.get_patient(patient_uuid)
        if not patient:
            return Response({
                'success': False,
                'error': '환자를 찾을 수 없음'
            })
        
        # 메타데이터 수집
        encounter_type = openmrs_api.get_default_encounter_type_uuid()
        location = openmrs_api.get_default_location_uuid()
        provider = openmrs_api.get_default_provider_uuid()
        
        # 최소 데이터로 Encounter 생성
        encounter_data = {
            'patient': patient_uuid,
            'encounterType': encounter_type,
            'location': location,
            'encounterDatetime': None
        }
        
        # Provider는 선택사항으로 처리
        if provider:
            encounter_data['provider'] = provider
        
        logger.info(f"🔥 테스트 Encounter 데이터: {encounter_data}")
        
        result = openmrs_api.create_encounter(encounter_data)
        
        if 'error' in result:
            return Response({
                'success': False,
                'error': result['error'],
                'metadata': {
                    'encounter_type': encounter_type,
                    'location': location,
                    'provider': provider
                }
            })
        
        return Response({
            'success': True,
            'message': '최소 Encounter 생성 성공!',
            'encounter_uuid': result.get('uuid'),
            'metadata': {
                'encounter_type': encounter_type,
                'location': location,
                'provider': provider
            }
        })
        
    except Exception as e:
        logger.error(f"최소 Encounter 테스트 실패: {e}")
        return Response({
            'success': False,
            'error': f'테스트 중 오류: {str(e)}'
        })
        
# backend/openmrs_models/clinical_views.py
# 🔥 OpenMRS 내부 진단 코드 활용 중심으로 완전 재구성

import time
import logging
from django.db.models import Q, Count
from django.db import connections
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import Patient, Person, Encounter
from .obs_models import Concept, ConceptName, ConceptClass, Obs

logger = logging.getLogger('openmrs_models')

# =============================================================================
# 🏥 핵심 OpenMRS 진단 코드 검색 API들
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def search_openmrs_diagnosis_codes(request):
    """
    🔥 OpenMRS 내부 진단 코드 검색 - 메인 API
    실제 OpenMRS concept 테이블에서 진단 코드를 검색합니다.
    """
    try:
        query = request.GET.get('q', '').strip()
        limit = int(request.GET.get('limit', 20))
        locale = request.GET.get('locale', 'en')
        
        if len(query) < 1:
            return Response({
                'success': False,
                'results': [],
                'message': '검색어를 입력해주세요.'
            })

        logger.info(f"OpenMRS 진단 검색: '{query}', locale: {locale}")
        
        # OpenMRS 진단 관련 Concept Classes
        DIAGNOSIS_CLASSES = [
            'Diagnosis',     # 확정 진단
            'Finding',       # 임상 소견
            'Disease',       # 질병
            'Symptom',       # 증상
            'Condition',     # 상태
            'Problem'        # 문제
        ]
        
        results = []
        seen_uuids = set()
        
        # 1단계: 정확한 매칭 (높은 우선순위)
        exact_matches = ConceptName.objects.filter(
            name__iexact=query,
            concept__concept_class__name__in=DIAGNOSIS_CLASSES,
            concept__retired=False
        ).select_related('concept', 'concept__concept_class')[:5]
        
        # 2단계: 시작 매칭
        starts_with = ConceptName.objects.filter(
            name__istartswith=query,
            concept__concept_class__name__in=DIAGNOSIS_CLASSES,
            concept__retired=False
        ).exclude(name__iexact=query).select_related('concept', 'concept__concept_class')[:10]
        
        # 3단계: 포함 매칭
        contains = ConceptName.objects.filter(
            name__icontains=query,
            concept__concept_class__name__in=DIAGNOSIS_CLASSES,
            concept__retired=False
        ).exclude(
            Q(name__iexact=query) | Q(name__istartswith=query)
        ).select_related('concept', 'concept__concept_class')[:15]
        
        # 결과 합치기 (우선순위 순서)
        all_matches = list(exact_matches) + list(starts_with) + list(contains)
        
        for concept_name in all_matches[:limit]:
            concept = concept_name.concept
            concept_uuid = str(concept.uuid)
            
            if concept_uuid in seen_uuids:
                continue
            seen_uuids.add(concept_uuid)
            
            # 관련성 점수 계산
            relevance = calculate_relevance_score(query, concept_name.name)
            
            # 기본 진단 정보
            diagnosis_data = {
                'uuid': concept_uuid,
                'concept_id': concept.concept_id,
                'display': concept_name.name,
                'concept_class': concept.concept_class.name,
                'locale': getattr(concept_name, 'locale', 'en'),
                'relevance_score': relevance,
                'type': 'diagnosis'
            }
            
            # ICD-10 코드 매핑 (가능한 경우)
            try:
                icd_codes = get_icd_mappings(concept.concept_id)
                if icd_codes:
                    diagnosis_data['icd_codes'] = icd_codes
            except Exception as e:
                logger.warning(f"ICD 매핑 조회 실패: {e}")
            
            results.append(diagnosis_data)
        
        # 관련성 점수로 정렬
        results.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        return Response({
            'success': True,
            'results': results,
            'count': len(results),
            'query': query,
            'total_concepts': get_total_diagnosis_count(),
            'search_type': 'openmrs_native'
        })
        
    except Exception as e:
        logger.error(f"OpenMRS 진단 검색 실패: {e}")
        return Response({
            'success': False,
            'error': str(e),
            'results': []
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def search_diagnosis_by_prefix(request):
    """
    🔥 접두사 기반 빠른 진단 검색
    사용자가 'd' 입력시 'D'로 시작하는 모든 진단 반환
    """
    try:
        prefix = request.GET.get('prefix', '').strip()
        limit = int(request.GET.get('limit', 30))
        
        if len(prefix) < 1:
            return Response({
                'success': False,
                'results': [],
                'message': '접두사를 입력해주세요.'
            })

        logger.info(f"진단 접두사 검색: '{prefix}'")
        
        DIAGNOSIS_CLASSES = ['Diagnosis', 'Finding', 'Disease', 'Symptom', 'Condition']
        
        # 접두사로 시작하는 진단들 검색
        concept_names = ConceptName.objects.filter(
            name__istartswith=prefix,
            concept__concept_class__name__in=DIAGNOSIS_CLASSES,
            concept__retired=False
        ).select_related('concept', 'concept__concept_class').order_by('name')[:limit]
        
        results = []
        seen_uuids = set()
        
        for concept_name in concept_names:
            concept = concept_name.concept
            concept_uuid = str(concept.uuid)
            
            if concept_uuid in seen_uuids:
                continue
            seen_uuids.add(concept_uuid)
            
            results.append({
                'uuid': concept_uuid,
                'concept_id': concept.concept_id,
                'display': concept_name.name,
                'concept_class': concept.concept_class.name,
                'type': 'diagnosis',
                'prefix_match': True
            })
        
        return Response({
            'success': True,
            'results': results,
            'count': len(results),
            'prefix': prefix,
            'search_type': 'prefix'
        })
        
    except Exception as e:
        logger.error(f"접두사 검색 실패: {e}")
        return Response({
            'success': False,
            'error': str(e),
            'results': []
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_diagnosis_details(request, concept_uuid):
    """
    🔥 특정 진단 코드의 상세 정보 조회
    """
    try:
        concept = Concept.objects.get(uuid=concept_uuid, retired=False)
        
        # 모든 이름들 (다국어)
        all_names = concept.names.values('name', 'locale', 'locale_preferred', 'concept_name_type')
        
        # ICD-10 매핑
        icd_codes = get_icd_mappings(concept.concept_id)
        
        diagnosis_detail = {
            'uuid': str(concept.uuid),
            'concept_id': concept.concept_id,
            'concept_class': concept.concept_class.name,
            'short_name': concept.short_name,
            'description': concept.description,
            'all_names': list(all_names),
            'icd_codes': icd_codes,
            'is_retired': concept.retired,
            'date_created': concept.date_created.isoformat() if concept.date_created else None
        }
        
        return Response({
            'success': True,
            'diagnosis': diagnosis_detail
        })
        
    except Concept.DoesNotExist:
        return Response({
            'success': False,
            'error': '해당 진단 코드를 찾을 수 없습니다.'
        }, status=404)
    except Exception as e:
        logger.error(f"진단 상세 조회 실패: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)


# =============================================================================
# 💊 약물 검색 (간단하게)
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def search_openmrs_drug_codes(request):
    """
    💊 OpenMRS 내부 약물 코드 검색
    """
    try:
        query = request.GET.get('q', '').strip()
        limit = int(request.GET.get('limit', 20))
        
        if len(query) < 2:
            return Response({
                'success': False,
                'results': [],
                'message': '검색어는 2글자 이상 입력해주세요.'
            })

        DRUG_CLASSES = ['Drug', 'Medication']
        
        concept_names = ConceptName.objects.filter(
            Q(name__icontains=query) | Q(name__istartswith=query),
            concept__concept_class__name__in=DRUG_CLASSES,
            concept__retired=False
        ).select_related('concept', 'concept__concept_class')[:limit]
        
        results = []
        seen_uuids = set()
        
        for concept_name in concept_names:
            concept = concept_name.concept
            concept_uuid = str(concept.uuid)
            
            if concept_uuid in seen_uuids:
                continue
            seen_uuids.add(concept_uuid)
            
            results.append({
                'uuid': concept_uuid,
                'display': concept_name.name,
                'concept_class': concept.concept_class.name,
                'type': 'drug',
                'relevance_score': calculate_relevance_score(query, concept_name.name)
            })
        
        results.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        return Response({
            'success': True,
            'results': results,
            'count': len(results),
            'query': query
        })
        
    except Exception as e:
        logger.error(f"약물 검색 실패: {e}")
        return Response({
            'success': False,
            'error': str(e),
            'results': []
        }, status=500)


# =============================================================================
# 👨‍⚕️ 환자 진단 데이터 관리
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def get_patient_clinical_data(request, patient_uuid):
    """
    👨‍⚕️ 환자의 기존 진단/처방 데이터 조회
    """
    try:
        person = Person.objects.get(uuid=patient_uuid, voided=False)
        
        # 최근 진단 정보 조회
        recent_diagnoses = Obs.objects.filter(
            person=person,
            concept__concept_class__name__in=['Diagnosis', 'Finding'],
            voided=False
        ).select_related('concept').order_by('-obs_datetime')[:10]
        
        diagnoses_data = []
        for obs in recent_diagnoses:
            diagnoses_data.append({
                'uuid': str(obs.concept.uuid),
                'display': obs.get_concept_name(),
                'value': obs.get_display_value(),
                'date': obs.obs_datetime.isoformat() if obs.obs_datetime else None
            })
        
        return Response({
            'success': True,
            'patient_uuid': patient_uuid,
            'diagnoses': diagnoses_data,
            'count': len(diagnoses_data)
        })
        
    except Person.DoesNotExist:
        return Response({
            'success': False,
            'error': '환자를 찾을 수 없습니다.'
        }, status=404)
    except Exception as e:
        logger.error(f"환자 데이터 조회 실패: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def save_patient_diagnosis(request, patient_uuid):
    """
    💾 환자 진단 정보 저장
    """
    try:
        person = Person.objects.get(uuid=patient_uuid, voided=False)
        diagnoses = request.data.get('diagnoses', [])
        
        if not diagnoses:
            return Response({
                'success': False,
                'error': '저장할 진단 정보가 없습니다.'
            }, status=400)
        
        saved_count = 0
        
        for diagnosis in diagnoses:
            concept_uuid = diagnosis.get('uuid')
            if concept_uuid:
                try:
                    concept = Concept.objects.get(uuid=concept_uuid)
                    
                    # Obs 생성 (실제 구현시 Encounter도 필요)
                    obs = Obs.objects.create(
                        person=person,
                        concept=concept,
                        obs_datetime=timezone.now(),
                        value_text=diagnosis.get('display', ''),
                        creator=1  # 실제 사용자 ID 필요
                    )
                    saved_count += 1
                    
                except Concept.DoesNotExist:
                    logger.warning(f"진단 Concept을 찾을 수 없음: {concept_uuid}")
                    continue
        
        return Response({
            'success': True,
            'saved_count': saved_count,
            'total_diagnoses': len(diagnoses)
        })
        
    except Person.DoesNotExist:
        return Response({
            'success': False,
            'error': '환자를 찾을 수 없습니다.'
        }, status=404)
    except Exception as e:
        logger.error(f"진단 저장 실패: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)


# =============================================================================
# 📊 통계 및 유틸리티 함수들
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def get_diagnosis_statistics(request):
    """
    📊 OpenMRS 진단 코드 통계
    """
    try:
        stats = {}
        
        # Concept Class별 통계
        concept_class_stats = ConceptClass.objects.filter(
            name__in=['Diagnosis', 'Finding', 'Disease', 'Symptom', 'Condition']
        ).annotate(
            concept_count=Count('concepts', filter=Q(concepts__retired=False))
        ).values('name', 'concept_count')
        
        stats['concept_classes'] = list(concept_class_stats)
        
        # 전체 진단 수
        total_diagnoses = Concept.objects.filter(
            concept_class__name__in=['Diagnosis', 'Finding', 'Disease'],
            retired=False
        ).count()
        stats['total_diagnoses'] = total_diagnoses
        
        # 전체 진단명 수 (다국어 포함)
        total_names = ConceptName.objects.filter(
            concept__concept_class__name__in=['Diagnosis', 'Finding', 'Disease'],
            concept__retired=False
        ).count()
        stats['total_diagnosis_names'] = total_names
        
        return Response({
            'success': True,
            'statistics': stats
        })
        
    except Exception as e:
        logger.error(f"통계 조회 실패: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)


def calculate_relevance_score(query, text):
    """검색 관련성 점수 계산 (0-100)"""
    if not query or not text:
        return 0
        
    query_lower = query.lower()
    text_lower = text.lower()
    
    # 정확한 매칭
    if query_lower == text_lower:
        return 100
    
    # 시작 매칭
    if text_lower.startswith(query_lower):
        return 80
    
    # 단어 시작 매칭
    words = text_lower.split()
    for word in words:
        if word.startswith(query_lower):
            return 70
    
    # 포함 매칭
    if query_lower in text_lower:
        return 60
    
    # 부분 매칭
    query_words = query_lower.split()
    text_words = text_lower.split()
    
    matching_words = sum(1 for qword in query_words for tword in text_words if qword in tword)
    if matching_words > 0:
        return 40 + min(matching_words * 10, 20)
    
    return 0


def get_icd_mappings(concept_id):
    """Concept ID에 대한 ICD-10 매핑 조회"""
    try:
        with connections['openmrs'].cursor() as cursor:
            cursor.execute("""
                SELECT crt.code, crs.name as source_name
                FROM concept_reference_map crm
                JOIN concept_reference_term crt ON crm.concept_reference_term_id = crt.concept_reference_term_id
                JOIN concept_reference_source crs ON crt.concept_source_id = crs.concept_source_id
                WHERE crm.concept_id = %s
                AND (crs.name LIKE '%%ICD%%' OR crs.name LIKE '%%SNOMED%%')
            """, [concept_id])
            
            mappings = cursor.fetchall()
            return [{'code': code, 'source': source} for code, source in mappings]
    except:
        return []


def get_total_diagnosis_count():
    """전체 진단 Concept 수"""
    try:
        return Concept.objects.filter(
            concept_class__name__in=['Diagnosis', 'Finding', 'Disease'],
            retired=False
        ).count()
    except:
        return 0