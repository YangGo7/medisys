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
    """
    ✅ 향상된 진단 Concept 검색
    OpenMRS 내부 데이터베이스 직접 활용
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

        # 성능 측정 시작
        start_time = time.time()
        
        # 🔥 진단 관련 ConceptClass들
        diagnosis_classes = [
            'Diagnosis', 'Finding', 'Symptom', 'Disease', 
            'Condition', 'Problem', 'Disorder'
        ]
        
        # ConceptName을 통한 검색 (가장 효율적)
        concept_names = ConceptName.objects.filter(
            Q(name__icontains=query) |
            Q(name__istartswith=query),
            concept__concept_class__name__in=diagnosis_classes,
            concept__retired=False
        ).select_related(
            'concept', 
            'concept__concept_class',
            'concept__datatype'
        ).prefetch_related(
            'concept__conceptname_set'
        ).distinct().order_by('name')[:limit]

        results = []
        seen_concepts = set()

        for concept_name in concept_names:
            concept = concept_name.concept
            concept_uuid = str(concept.uuid)
            
            if concept_uuid in seen_concepts:
                continue
            seen_concepts.add(concept_uuid)
            
            # 모든 이름들 수집 (다국어 지원)
            all_names = list(concept.conceptname_set.values_list('name', flat=True))
            
            # 검색 관련성 점수 계산
            relevance_score = 0
            if query.lower() in concept_name.name.lower():
                relevance_score += 10
            if concept_name.name.lower().startswith(query.lower()):
                relevance_score += 20
            
            results.append({
                'uuid': concept_uuid,
                'display': concept_name.name,
                'preferred_name': concept_name.name,
                'all_names': all_names,
                'concept_class': concept.concept_class.name if concept.concept_class else '',
                'datatype': concept.datatype.name if concept.datatype else '',
                'relevance_score': relevance_score,
                'is_fully_specified': getattr(concept_name, 'concept_name_type', '') == 'FULLY_SPECIFIED'
            })

        # 관련성 점수로 정렬
        results.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        # 성능 측정 종료
        execution_time = time.time() - start_time
        
        return Response({
            'success': True,
            'results': results,
            'count': len(results),
            'query': query,
            'execution_time': round(execution_time, 3),
            'concept_classes_searched': diagnosis_classes
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
    """
    ✅ 향상된 약물 검색
    Drug 테이블과 Concept 테이블 조합 사용
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

        start_time = time.time()
        
        results = []
        
        # 1. Drug 테이블에서 직접 검색
        if hasattr(Drug, 'objects'):
            try:
                drugs = Drug.objects.filter(
                    Q(name__icontains=query) |
                    Q(name__istartswith=query),
                    retired=False
                ).select_related('concept').order_by('name')[:limit]
                
                for drug in drugs:
                    concept_uuid = str(drug.concept.uuid) if drug.concept else str(drug.uuid)
                    
                    # 관련성 점수
                    relevance_score = 0
                    if query.lower() in drug.name.lower():
                        relevance_score += 10
                    if drug.name.lower().startswith(query.lower()):
                        relevance_score += 20
                    
                    results.append({
                        'uuid': concept_uuid,
                        'display': drug.name,
                        'drug_name': drug.name,
                        'strength': getattr(drug, 'strength', ''),
                        'dosage_form': getattr(drug, 'dosage_form', ''),
                        'concept_class': 'Drug',
                        'datatype': 'N/A',
                        'relevance_score': relevance_score,
                        'source': 'drug_table'
                    })
            except Exception as drug_error:
                logger.warning(f"Drug 테이블 검색 실패: {drug_error}")
        
        # 2. Concept에서 약물 관련 검색
        drug_classes = ['Drug', 'Medication', 'Med set']
        
        concept_names = ConceptName.objects.filter(
            Q(name__icontains=query) |
            Q(name__istartswith=query),
            concept__concept_class__name__in=drug_classes,
            concept__retired=False
        ).select_related(
            'concept', 
            'concept__concept_class'
        ).distinct().order_by('name')[:limit]

        seen_concepts = {r['uuid'] for r in results}  # 중복 제거용
        
        for concept_name in concept_names:
            concept = concept_name.concept
            concept_uuid = str(concept.uuid)
            
            if concept_uuid in seen_concepts:
                continue
            seen_concepts.add(concept_uuid)
            
            # 관련성 점수
            relevance_score = 0
            if query.lower() in concept_name.name.lower():
                relevance_score += 5
            if concept_name.name.lower().startswith(query.lower()):
                relevance_score += 15
            
            results.append({
                'uuid': concept_uuid,
                'display': concept_name.name,
                'drug_name': concept_name.name,
                'strength': '',
                'dosage_form': '',
                'concept_class': concept.concept_class.name if concept.concept_class else '',
                'datatype': concept.datatype.name if concept.datatype else '',
                'relevance_score': relevance_score,
                'source': 'concept_table'
            })

        # 관련성 점수로 정렬
        results.sort(key=lambda x: x['relevance_score'], reverse=True)
        results = results[:limit]  # 최종 limit 적용
        
        execution_time = time.time() - start_time
        
        return Response({
            'success': True,
            'results': results,
            'count': len(results),
            'query': query,
            'execution_time': round(execution_time, 3),
            'sources_used': ['drug_table', 'concept_table']
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
        

@api_view(['GET'])
@permission_classes([AllowAny])
def search_concepts_by_prefix(request):
    """
    ✅ 접두사 기반 빠른 검색
    사용자가 요청한 'd' -> 'd'로 시작하는 모든 질병/약물 검색
    """
    try:
        prefix = request.GET.get('prefix', '').strip().lower()
        concept_type = request.GET.get('type', 'diagnosis')  # diagnosis, drug, all
        limit = int(request.GET.get('limit', 50))
        
        if len(prefix) < 1:
            return Response({
                'success': False,
                'results': [],
                'message': '최소 1글자 이상 입력해주세요.'
            })

        start_time = time.time()
        results = []
        
        if concept_type in ['diagnosis', 'all']:
            # 진단 검색
            diagnosis_classes = ['Diagnosis', 'Finding', 'Symptom', 'Disease', 'Condition']
            
            diagnosis_names = ConceptName.objects.filter(
                name__istartswith=prefix,
                concept__concept_class__name__in=diagnosis_classes,
                concept__retired=False
            ).select_related('concept', 'concept__concept_class')[:limit//2 if concept_type == 'all' else limit]
            
            for concept_name in diagnosis_names:
                results.append({
                    'uuid': str(concept_name.concept.uuid),
                    'display': concept_name.name,
                    'type': 'diagnosis',
                    'concept_class': concept_name.concept.concept_class.name if concept_name.concept.concept_class else '',
                    'prefix_match': True
                })

        if concept_type in ['drug', 'all']:
            # 약물 검색
            drug_classes = ['Drug', 'Medication']
            
            drug_names = ConceptName.objects.filter(
                name__istartswith=prefix,
                concept__concept_class__name__in=drug_classes,
                concept__retired=False
            ).select_related('concept', 'concept__concept_class')[:limit//2 if concept_type == 'all' else limit]
            
            for concept_name in drug_names:
                results.append({
                    'uuid': str(concept_name.concept.uuid),
                    'display': concept_name.name,
                    'type': 'drug',
                    'concept_class': concept_name.concept.concept_class.name if concept_name.concept.concept_class else '',
                    'prefix_match': True
                })

        # 알파벳 순으로 정렬
        results.sort(key=lambda x: x['display'].lower())
        
        execution_time = time.time() - start_time
        
        return Response({
            'success': True,
            'results': results[:limit],
            'count': len(results[:limit]),
            'prefix': prefix,
            'type': concept_type,
            'execution_time': round(execution_time, 3)
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
def get_concept_details(request, concept_uuid):
    """
    ✅ 특정 Concept의 상세 정보 조회
    """
    try:
        concept = Concept.objects.select_related(
            'concept_class', 
            'datatype'
        ).prefetch_related(
            'conceptname_set'
        ).get(uuid=concept_uuid, retired=False)
        
        # 모든 이름들 수집
        names = []
        for name in concept.conceptname_set.all():
            names.append({
                'name': name.name,
                'type': getattr(name, 'concept_name_type', ''),
                'locale': getattr(name, 'locale', '')
            })
        
        details = {
            'uuid': str(concept.uuid),
            'concept_class': concept.concept_class.name if concept.concept_class else '',
            'datatype': concept.datatype.name if concept.datatype else '',
            'names': names,
            'version': getattr(concept, 'version', ''),
            'description': getattr(concept, 'description', ''),
            'fully_specified_name': getattr(concept, 'fully_specified_name', ''),
            'short_name': getattr(concept, 'short_name', '')
        }
        
        return Response({
            'success': True,
            'concept': details
        })
        
    except Concept.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Concept를 찾을 수 없습니다.'
        }, status=404)
    except Exception as e:
        logger.error(f"Concept 상세 조회 실패: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)
        
        

# backend/openmrs_models/clinical_views.py (기존 파일에 함수 추가)
"""
기존 clinical_views.py에 추가할 개선된 검색 함수들
"""

# 기존 import에 추가
from django.db.models import Q

@api_view(['GET'])
@permission_classes([AllowAny])
def search_diagnosis_concepts_enhanced(request):
    """✅ 향상된 진단 검색 - 단일 문자도 지원"""
    try:
        query = request.GET.get('q', '').strip()
        if len(query) < 1:
            return Response({
                'success': False,
                'results': [],
                'message': '검색어를 입력해주세요.'
            })

        # 🔥 단일 문자는 접두사 검색, 2글자 이상은 포함 검색
        if len(query) == 1:
            # ConceptName 테이블에서 직접 검색 (접두사)
            try:
                from .obs_models import ConceptName
                
                concept_names = ConceptName.objects.filter(
                    name__istartswith=query,
                    concept__concept_class__name__in=['Diagnosis', 'Finding', 'Symptom', 'Disease', 'Condition'],
                    concept__retired=False
                ).select_related('concept', 'concept__concept_class')[:20]
                
                results = []
                seen_concepts = set()
                
                for concept_name in concept_names:
                    concept = concept_name.concept
                    concept_uuid = str(concept.uuid)
                    
                    if concept_uuid not in seen_concepts:
                        seen_concepts.add(concept_uuid)
                        results.append({
                            'uuid': concept_uuid,
                            'display': concept_name.name,
                            'conceptClass': concept.concept_class.name if concept.concept_class else '',
                            'searchType': 'prefix_match'
                        })
                
                return Response({
                    'success': True,
                    'results': results,
                    'count': len(results),
                    'query': query,
                    'search_type': 'prefix'
                })
                
            except Exception as db_error:
                logger.warning(f"데이터베이스 검색 실패, OpenMRS API 사용: {db_error}")
                # 실패시 기존 OpenMRS API 사용
                pass

        # 기존 OpenMRS API 검색 (2글자 이상 또는 DB 검색 실패시)
        try:
            api = OpenMRSAPI()
            concepts = api.search_diagnosis_concepts(query, limit=20)
            
            formatted_results = []
            for concept in concepts:
                formatted_results.append({
                    'uuid': concept['uuid'],
                    'display': concept['display'],
                    'conceptClass': concept.get('conceptClass', ''),
                    'searchRelevance': len([word for word in query.split() if word.lower() in concept['display'].lower()]),
                    'searchType': 'openmrs_api'
                })
            
            formatted_results.sort(key=lambda x: x['searchRelevance'], reverse=True)
            
            return Response({
                'success': True,
                'results': formatted_results,
                'count': len(formatted_results),
                'query': query,
                'search_type': 'openmrs_api'
            })
            
        except Exception as api_error:
            logger.error(f"OpenMRS API 검색도 실패: {api_error}")
            
            # 최후 수단: 간단한 더미 데이터
            if query.lower().startswith('d'):
                dummy_results = [
                    {'uuid': 'dummy-1', 'display': 'Diabetes mellitus', 'conceptClass': 'Diagnosis'},
                    {'uuid': 'dummy-2', 'display': 'Depression', 'conceptClass': 'Diagnosis'},
                    {'uuid': 'dummy-3', 'display': 'Dermatitis', 'conceptClass': 'Diagnosis'},
                ]
                return Response({
                    'success': True,
                    'results': dummy_results,
                    'count': len(dummy_results),
                    'query': query,
                    'search_type': 'fallback'
                })
            
            return Response({
                'success': False,
                'error': '검색 서비스를 사용할 수 없습니다.',
                'results': []
            }, status=500)

    except Exception as e:
        logger.error(f"진단 검색 실패: {e}")
        return Response({
            'success': False,
            'error': str(e),
            'results': []
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def search_drug_concepts_enhanced(request):
    """✅ 향상된 약물 검색 - 단일 문자도 지원"""
    try:
        query = request.GET.get('q', '').strip()
        if len(query) < 1:
            return Response({
                'success': False,
                'results': [],
                'message': '검색어를 입력해주세요.'
            })

        # 🔥 단일 문자는 접두사 검색
        if len(query) == 1:
            try:
                from .obs_models import ConceptName
                
                concept_names = ConceptName.objects.filter(
                    name__istartswith=query,
                    concept__concept_class__name__in=['Drug', 'Medication'],
                    concept__retired=False
                ).select_related('concept', 'concept__concept_class')[:20]
                
                results = []
                seen_concepts = set()
                
                for concept_name in concept_names:
                    concept = concept_name.concept
                    concept_uuid = str(concept.uuid)
                    
                    if concept_uuid not in seen_concepts:
                        seen_concepts.add(concept_uuid)
                        results.append({
                            'uuid': concept_uuid,
                            'display': concept_name.name,
                            'conceptClass': concept.concept_class.name if concept.concept_class else '',
                            'searchType': 'prefix_match'
                        })
                
                return Response({
                    'success': True,
                    'results': results,
                    'count': len(results),
                    'query': query,
                    'search_type': 'prefix'
                })
                
            except Exception as db_error:
                logger.warning(f"데이터베이스 약물 검색 실패: {db_error}")

        # 기존 OpenMRS API 검색
        try:
            api = OpenMRSAPI()
            drugs = api.search_drug_concepts(query, limit=20)
            
            formatted_results = []
            for drug in drugs:
                formatted_results.append({
                    'uuid': drug['uuid'],
                    'display': drug['display'],
                    'strength': drug.get('strength', ''),
                    'dosageForm': drug.get('dosageForm', ''),
                    'concept_uuid': drug.get('concept_uuid', ''),
                    'searchRelevance': len([word for word in query.split() if word.lower() in drug['display'].lower()]),
                    'searchType': 'openmrs_api'
                })
            
            formatted_results.sort(key=lambda x: x['searchRelevance'], reverse=True)
            
            return Response({
                'success': True,
                'results': formatted_results,
                'count': len(formatted_results),
                'query': query,
                'search_type': 'openmrs_api'
            })
            
        except Exception as api_error:
            logger.error(f"OpenMRS 약물 API 검색 실패: {api_error}")
            
            # 최후 수단: 더미 데이터
            if query.lower().startswith('a'):
                dummy_results = [
                    {'uuid': 'dummy-1', 'display': 'Aspirin', 'conceptClass': 'Drug', 'strength': '325mg'},
                    {'uuid': 'dummy-2', 'display': 'Acetaminophen', 'conceptClass': 'Drug', 'strength': '500mg'},
                    {'uuid': 'dummy-3', 'display': 'Amoxicillin', 'conceptClass': 'Drug', 'strength': '250mg'},
                ]
                return Response({
                    'success': True,
                    'results': dummy_results,
                    'count': len(dummy_results),
                    'query': query,
                    'search_type': 'fallback'
                })
            
            return Response({
                'success': False,
                'error': '약물 검색 서비스를 사용할 수 없습니다.',
                'results': []
            }, status=500)

    except Exception as e:
        logger.error(f"약물 검색 실패: {e}")
        return Response({
            'success': False,
            'error': str(e),
            'results': []
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def search_concepts_prefix(request):
    """✅ 접두사 기반 빠른 검색"""
    try:
        prefix = request.GET.get('prefix', '').strip().lower()
        concept_type = request.GET.get('type', 'diagnosis')
        limit = int(request.GET.get('limit', 30))
        
        if len(prefix) < 1:
            return Response({
                'success': False,
                'results': [],
                'message': '접두사를 입력해주세요.'
            })

        results = []
        
        try:
            from .obs_models import ConceptName
            
            if concept_type == 'diagnosis':
                class_names = ['Diagnosis', 'Finding', 'Symptom', 'Disease', 'Condition']
            elif concept_type == 'drug':
                class_names = ['Drug', 'Medication']
            else:
                class_names = ['Diagnosis', 'Finding', 'Drug', 'Medication']
            
            concept_names = ConceptName.objects.filter(
                name__istartswith=prefix,
                concept__concept_class__name__in=class_names,
                concept__retired=False
            ).select_related('concept', 'concept__concept_class')[:limit]
            
            seen_concepts = set()
            
            for concept_name in concept_names:
                concept = concept_name.concept
                concept_uuid = str(concept.uuid)
                
                if concept_uuid not in seen_concepts:
                    seen_concepts.add(concept_uuid)
                    results.append({
                        'uuid': concept_uuid,
                        'display': concept_name.name,
                        'type': 'diagnosis' if concept.concept_class.name in ['Diagnosis', 'Finding', 'Symptom', 'Disease', 'Condition'] else 'drug',
                        'concept_class': concept.concept_class.name,
                        'prefix_match': True
                    })
            
        except Exception as db_error:
            logger.warning(f"데이터베이스 접두사 검색 실패: {db_error}")
            
            # 더미 데이터로 대체
            if prefix == 'd':
                results = [
                    {'uuid': 'dummy-1', 'display': 'Diabetes mellitus', 'type': 'diagnosis', 'concept_class': 'Diagnosis'},
                    {'uuid': 'dummy-2', 'display': 'Depression', 'type': 'diagnosis', 'concept_class': 'Diagnosis'},
                    {'uuid': 'dummy-3', 'display': 'Dermatitis', 'type': 'diagnosis', 'concept_class': 'Diagnosis'},
                ]
            elif prefix == 'a':
                results = [
                    {'uuid': 'dummy-1', 'display': 'Aspirin', 'type': 'drug', 'concept_class': 'Drug'},
                    {'uuid': 'dummy-2', 'display': 'Acetaminophen', 'type': 'drug', 'concept_class': 'Drug'},
                    {'uuid': 'dummy-3', 'display': 'Amoxicillin', 'type': 'drug', 'concept_class': 'Drug'},
                ]

        # 알파벳 순으로 정렬
        results.sort(key=lambda x: x['display'].lower())
        
        return Response({
            'success': True,
            'results': results[:limit],
            'count': len(results[:limit]),
            'prefix': prefix,
            'type': concept_type
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
def get_search_statistics(request):
    """
    ✅ 검색 통계 정보
    """
    try:
        # Concept 통계
        total_concepts = Concept.objects.filter(retired=False).count()
        
        # ConceptClass별 통계
        class_stats = ConceptClass.objects.annotate(
            concept_count=Count('concept', filter=Q(concept__retired=False))
        ).order_by('-concept_count')
        
        # 자주 사용되는 클래스들
        common_classes = []
        for cls in class_stats[:10]:
            common_classes.append({
                'name': cls.name,
                'count': cls.concept_count,
                'description': getattr(cls, 'description', '')
            })
        
        return Response({
            'success': True,
            'statistics': {
                'total_concepts': total_concepts,
                'total_concept_classes': class_stats.count(),
                'common_classes': common_classes,
                'last_updated': 'Real-time from database'
            }
        })
        
    except Exception as e:
        logger.error(f"통계 조회 실패: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)
        

@api_view(['GET'])
@permission_classes([AllowAny])
def search_concepts_raw_sql(request):
    """
    ✅ Raw SQL을 사용한 고성능 검색
    매우 큰 데이터베이스에서 유용
    """
    try:
        query = request.GET.get('q', '').strip()
        concept_type = request.GET.get('type', 'diagnosis')
        limit = int(request.GET.get('limit', 20))
        
        if len(query) < 2:
            return Response({
                'success': False,
                'results': [],
                'message': '검색어는 2글자 이상 입력해주세요.'
            })

        # SQL 쿼리 작성
        if concept_type == 'diagnosis':
            sql = """
            SELECT DISTINCT 
                c.uuid,
                cn.name as display,
                cc.name as concept_class,
                cd.name as datatype
            FROM concept c
            JOIN concept_name cn ON c.concept_id = cn.concept_id
            JOIN concept_class cc ON c.class_id = cc.concept_class_id
            LEFT JOIN concept_datatype cd ON c.datatype_id = cd.concept_datatype_id
            WHERE c.retired = 0 
            AND cc.name IN ('Diagnosis', 'Finding', 'Symptom', 'Disease', 'Condition')
            AND (cn.name LIKE %s OR cn.name LIKE %s)
            ORDER BY 
                CASE WHEN cn.name LIKE %s THEN 1 ELSE 2 END,
                cn.name
            LIMIT %s
            """
            params = [f'%{query}%', f'{query}%', f'{query}%', limit]
        else:  # drug
            sql = """
            SELECT DISTINCT 
                c.uuid,
                cn.name as display,
                cc.name as concept_class,
                cd.name as datatype
            FROM concept c
            JOIN concept_name cn ON c.concept_id = cn.concept_id
            JOIN concept_class cc ON c.class_id = cc.concept_class_id
            LEFT JOIN concept_datatype cd ON c.datatype_id = cd.concept_datatype_id
            WHERE c.retired = 0 
            AND cc.name IN ('Drug', 'Medication')
            AND (cn.name LIKE %s OR cn.name LIKE %s)
            ORDER BY 
                CASE WHEN cn.name LIKE %s THEN 1 ELSE 2 END,
                cn.name
            LIMIT %s
            """
            params = [f'%{query}%', f'{query}%', f'{query}%', limit]

        start_time = time.time()
        
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            
        results = []
        for row in rows:
            results.append({
                'uuid': row[0],
                'display': row[1],
                'concept_class': row[2] or '',
                'datatype': row[3] or ''
            })
        
        execution_time = time.time() - start_time
        
        return Response({
            'success': True,
            'results': results,
            'count': len(results),
            'query': query,
            'execution_time': round(execution_time, 3),
            'method': 'raw_sql'
        })

    except Exception as e:
        logger.error(f"Raw SQL 검색 실패: {e}")
        return Response({
            'success': False,
            'error': str(e),
            'results': []
        }, status=500)