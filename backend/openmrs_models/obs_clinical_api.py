# backend/openmrs_models/obs_clinical_api.py (새 파일)
"""
기존 obs_models.py 활용한 진단/처방 API
Django ORM으로 Obs 직접 조작
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db import transaction
from datetime import datetime
import logging
import requests
from .models import Person, Encounter
from .obs_models import Obs, Concept, ConceptName
from medical_integration.models import PatientMapping
from medical_integration.openmrs_api import OpenMRSAPI

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_patient_obs_clinical_data(request, patient_uuid):
    """✅ PatientMapping 중복 문제 해결"""
    try:
        # 환자 존재 확인
        try:
            person = Person.objects.get(uuid=patient_uuid, voided=False)
        except Person.DoesNotExist:
            return Response({
                'success': False,
                'error': '환자를 찾을 수 없습니다.'
            }, status=404)

        # ✅ PatientMapping 중복 문제 해결 - 더 안전한 방법
        mapping = None
        try:
            # 활성 매핑 중에서 가장 최근 것만 가져오기
            mapping = PatientMapping.objects.filter(
                openmrs_patient_uuid=patient_uuid,
                is_active=True
            ).order_by('-created_date', '-mapping_id').first()
            
            # 중복이 있다면 로그에 기록
            mapping_count = PatientMapping.objects.filter(
                openmrs_patient_uuid=patient_uuid,
                is_active=True
            ).count()
            
            if mapping_count > 1:
                logger.warning(f"⚠️ 환자 {patient_uuid}에 대해 {mapping_count}개의 활성 매핑이 발견됨. 최신 것을 사용.")
                
        except Exception as e:
            logger.warning(f"매핑 정보 조회 중 오류: {e}")
            mapping = None

        # Encounter 조회
        encounters = Encounter.objects.filter(
            patient__person=person,
            voided=False
        ).order_by('-encounter_datetime')[:5]

        clinical_history = []
        for encounter in encounters:
            encounter_obs = Obs.objects.filter(
                encounter=encounter,
                voided=False
            ).select_related('concept').order_by('-obs_datetime')

            # Obs 분류
            diagnoses = []
            prescriptions = []
            vitals = []
            notes = []

            for obs in encounter_obs:
                concept_name = (obs.concept.short_name or '').lower()
                
                obs_data = {
                    'obs_uuid': str(obs.uuid),
                    'concept_uuid': str(obs.concept.uuid),
                    'concept_name': obs.concept.fully_specified_name or obs.concept.short_name or '',
                    'value': obs.get_display_value(),
                    'datetime': obs.obs_datetime.isoformat() if obs.obs_datetime else None,
                    'comments': obs.comments or ''
                }

                # 분류 로직
                if any(word in concept_name for word in ['diagnosis', 'disease', 'condition']):
                    diagnoses.append(obs_data)
                elif any(word in concept_name for word in ['drug', 'medication', 'prescription']):
                    prescriptions.append(obs_data)
                elif any(word in concept_name for word in ['vital', 'temperature', 'pressure', 'pulse']):
                    vitals.append(obs_data)
                else:
                    notes.append(obs_data)

            clinical_history.append({
                'encounter_uuid': str(encounter.uuid),
                'encounter_datetime': encounter.encounter_datetime.isoformat() if encounter.encounter_datetime else '',
                'encounter_type': encounter.encounter_type.name if encounter.encounter_type else '',
                'provider': encounter.provider.display if encounter.provider else '',
                'diagnoses': diagnoses,
                'prescriptions': prescriptions,
                'vitals': vitals,
                'notes': notes,
                'total_obs_count': len(encounter_obs)
            })

        # 환자 기본 정보
        patient_info = {
            'uuid': patient_uuid,
            'display': f"{person.given_name or ''} {person.family_name or ''}".strip(),
            'gender': person.gender,
            'birthdate': person.birthdate.isoformat() if person.birthdate else None,
            'age': getattr(person, 'age', None)
        }

        # 매핑 정보
        mapping_info = {
            'patient_identifier': mapping.patient_identifier if mapping else None,
            'orthanc_patient_id': mapping.orthanc_patient_id if mapping else None,
            'status': mapping.status if mapping else 'unknown',
            'display': mapping.display if mapping else None,
            'mapping_count': mapping_count if 'mapping_count' in locals() else 1
        }

        return Response({
            'success': True,
            'patient_info': patient_info,
            'mapping_info': mapping_info,
            'clinical_history': clinical_history,
            'total_encounters': len(clinical_history),
            'has_recent_data': len(clinical_history) > 0
        })

    except Exception as e:
        logger.error(f"Obs 기반 임상 데이터 조회 실패: {e}")
        return Response({
            'success': False,
            'error': str(e),
            'patient_uuid': patient_uuid
        }, status=500)



@api_view(['POST'])
@permission_classes([AllowAny])
def save_obs_clinical_data(request, patient_uuid):
    """✅ 올바른 OpenMRS 호스트 사용"""
    try:
        # 환자 존재 확인
        try:
            person = Person.objects.get(uuid=patient_uuid, voided=False)
        except Person.DoesNotExist:
            return Response({
                'success': False,
                'error': '환자를 찾을 수 없습니다.'
            }, status=404)

        # 요청 데이터 파싱
        diagnoses = request.data.get('diagnoses', [])
        clinical_notes = request.data.get('clinical_notes', '')

        if not any([diagnoses, clinical_notes]):
            return Response({
                'success': False,
                'error': '저장할 데이터가 없습니다.'
            }, status=400)

        # ✅ OpenMRS 설정 사용
        from datetime import datetime
        import pytz
        
        now_utc = datetime.now(pytz.UTC)
        encounter_datetime = now_utc.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
        
        encounter_data = {
            'patient': patient_uuid,
            'encounterType': '61ae96f4-6afe-4351-b6f8-cd4fc383cce1',
            'encounterDatetime': encounter_datetime
        }

        print(f"🌐 사용할 OpenMRS URL: {OPENMRS_BASE_URL}")
        print(f"🏥 Encounter 생성 데이터: {encounter_data}")

        # ✅ 올바른 URL로 요청
        response = requests.post(
            f'{OPENMRS_BASE_URL}/encounter',
            headers=HEADERS,
            json=encounter_data,
            timeout=15
        )

        if response.status_code != 201:
            error_msg = f'Encounter 생성 실패: {response.status_code}, {response.text}'
            print(f"❌ {error_msg}")
            return Response({
                'success': False,
                'error': error_msg
            }, status=500)

        encounter_result = response.json()
        encounter_uuid = encounter_result['uuid']
        print(f"✅ Encounter 생성 성공: {encounter_uuid}")

        # 데이터 저장
        saved_items = []

        # 진단 저장
        for i, diagnosis in enumerate(diagnoses):
            if diagnosis.get('concept_uuid') and diagnosis.get('value'):
                obs_datetime = datetime.now(pytz.UTC).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
                
                obs_data = {
                    'person': patient_uuid,
                    'concept': diagnosis['concept_uuid'],
                    'encounter': encounter_uuid,
                    'obsDatetime': obs_datetime,
                    'value': diagnosis['value']
                }

                obs_response = requests.post(
                    f'{OPENMRS_BASE_URL}/obs',
                    headers=HEADERS,
                    json=obs_data,
                    timeout=15
                )

                if obs_response.status_code == 201:
                    saved_items.append(f'진단: {diagnosis["value"]}')
                    print(f"✅ 진단 저장 성공: {diagnosis['value']}")

        # 임상 노트 저장
        if clinical_notes.strip():
            obs_datetime = datetime.now(pytz.UTC).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
            
            notes_obs_data = {
                'person': patient_uuid,
                'concept': '160632AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
                'encounter': encounter_uuid,
                'obsDatetime': obs_datetime,
                'value': clinical_notes.strip()
            }

            notes_response = requests.post(
                f'{OPENMRS_BASE_URL}/obs',
                headers=HEADERS,
                json=notes_obs_data,
                timeout=15
            )

            if notes_response.status_code == 201:
                saved_items.append('임상 노트')
                print(f"✅ 임상 노트 저장 성공")

        return Response({
            'success': True,
            'message': f'{len(saved_items)}개 항목이 저장되었습니다.',
            'encounter_uuid': encounter_uuid,
            'saved_items': saved_items,
            'total_saved': len(saved_items)
        })

    except Exception as e:
        logger.error(f"save_obs_clinical_data 실패: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def search_concepts_for_obs(request):
    """Obs 생성용 Concept 검색"""
    try:
        query = request.GET.get('q', '').strip()
        concept_type = request.GET.get('type', 'all')  # diagnosis, drug, vital, all
        
        if len(query) < 2:
            return Response({
                'success': False,
                'results': [],
                'message': '검색어는 2글자 이상 입력해주세요.'
            })

        # ✅ ConceptName에서 voided 필드 제거 - 해당 필드가 존재하지 않음
        concept_names = ConceptName.objects.filter(
            name__icontains=query
            # voided=False  # ❌ 제거 - ConceptName 모델에 voided 필드가 없음
        ).select_related('concept')[:20]

        results = []
        seen_concepts = set()

        for concept_name in concept_names:
            concept = concept_name.concept
            
            # ✅ concept에서 retired 체크만 수행
            if concept.uuid in seen_concepts or (hasattr(concept, 'retired') and concept.retired):
                continue
                
            seen_concepts.add(concept.uuid)
            
            # 타입별 필터링 (간단한 키워드 기반)
            if concept_type == 'diagnosis':
                if not any(word in concept_name.name.lower() for word in ['diagnosis', 'disease', 'condition', 'disorder']):
                    continue
            elif concept_type == 'drug':
                if not any(word in concept_name.name.lower() for word in ['drug', 'medication', 'medicine']):
                    continue
            elif concept_type == 'vital':
                if not any(word in concept_name.name.lower() for word in ['vital', 'temperature', 'pressure', 'pulse', 'weight', 'height']):
                    continue

            results.append({
                'uuid': str(concept.uuid),
                'display': concept_name.name,
                'concept_class': concept.concept_class.name if hasattr(concept, 'concept_class') and concept.concept_class else '',
                'datatype': concept.datatype.name if hasattr(concept, 'datatype') and concept.datatype else '',
                'fully_specified_name': concept.fully_specified_name if hasattr(concept, 'fully_specified_name') else '',
                'short_name': concept.short_name if hasattr(concept, 'short_name') else '',
                'description': concept.description if hasattr(concept, 'description') else ''
            })

        return Response({
            'success': True,
            'results': results,
            'total_found': len(results),
            'query': query,
            'type_filter': concept_type
        })

    except Exception as e:
        logger.error(f"Concept 검색 실패: {e}")
        return Response({
            'success': False,
            'error': str(e),
            'results': []
        }, status=500)
        

@api_view(['GET'])
def get_patient_obs_clinical_data(request, patient_uuid):
    """
    기존 Obs 모델을 사용한 환자 임상 데이터 조회
    DiagnosisPanel, DiagnosisPrescriptionPanel용
    """
    try:
        # 환자 존재 확인
        try:
            person = Person.objects.get(uuid=patient_uuid, voided=False)
        except Person.DoesNotExist:
            return Response({
                'success': False,
                'error': '환자를 찾을 수 없습니다.'
            }, status=404)

        # 매핑 정보 조회
        try:
            mapping = PatientMapping.objects.get(
                openmrs_patient_uuid=patient_uuid,
                is_active=True
            )
        except PatientMapping.DoesNotExist:
            mapping = None

        # 최근 Encounter들 조회 (최근 5개)
        encounters = Encounter.objects.filter(
            patient__person=person,
            voided=False
        ).order_by('-encounter_datetime')[:5]

        clinical_history = []
        for encounter in encounters:
            # 해당 Encounter의 모든 Obs 조회
            encounter_obs = Obs.objects.filter(
                encounter=encounter,
                voided=False
            ).select_related('concept').order_by('-obs_datetime')

            # Obs를 카테고리별로 분류
            diagnoses = []
            prescriptions = []
            vitals = []
            notes = []

            for obs in encounter_obs:
                concept_name = obs.concept.short_name.lower() if obs.concept.short_name else ''
                
                obs_data = {
                    'obs_uuid': str(obs.uuid),
                    'concept_uuid': str(obs.concept.uuid),
                    'concept_name': obs.concept.fully_specified_name or obs.concept.short_name or '',
                    'value': obs.get_display_value(),
                    'datetime': obs.obs_datetime.isoformat() if obs.obs_datetime else None,
                    'comments': obs.comments or ''
                }

                # 간단한 분류 로직 (실제 환경에 맞게 조정 필요)
                if any(word in concept_name for word in ['diagnosis', 'disease', 'condition']):
                    diagnoses.append(obs_data)
                elif any(word in concept_name for word in ['drug', 'medication', 'prescription']):
                    prescriptions.append(obs_data)
                elif any(word in concept_name for word in ['vital', 'temperature', 'pressure', 'pulse']):
                    vitals.append(obs_data)
                else:
                    notes.append(obs_data)

            clinical_history.append({
                'encounter_uuid': str(encounter.uuid),
                'encounter_datetime': encounter.encounter_datetime.isoformat() if encounter.encounter_datetime else '',
                'encounter_type': encounter.encounter_type.name if encounter.encounter_type else '',
                'provider': encounter.provider.display if encounter.provider else '',
                'diagnoses': diagnoses,
                'prescriptions': prescriptions,
                'vitals': vitals,
                'notes': notes,
                'total_obs_count': len(encounter_obs)
            })

        # 환자 기본 정보
        patient_info = {
            'uuid': patient_uuid,
            'display': f"{person.given_name or ''} {person.family_name or ''}".strip(),
            'gender': person.gender,
            'birthdate': person.birthdate.isoformat() if person.birthdate else None,
            'age': person.age if hasattr(person, 'age') else None
        }

        # 매핑 정보
        mapping_info = {
            'patient_identifier': mapping.patient_identifier if mapping else None,
            'orthanc_patient_id': mapping.orthanc_patient_id if mapping else None,
            'status': mapping.status if mapping else 'unknown',
            'display': mapping.display if mapping else None
        }

        return Response({
            'success': True,
            'patient_info': patient_info,
            'mapping_info': mapping_info,
            'clinical_history': clinical_history,
            'total_encounters': len(clinical_history),
            'has_recent_data': len(clinical_history) > 0
        })

    except Exception as e:
        logger.error(f"Obs 기반 임상 데이터 조회 실패: {e}")
        return Response({
            'success': False,
            'error': str(e),
            'patient_uuid': patient_uuid
        }, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def save_obs_clinical_data(request, patient_uuid):
    """진단/처방 저장 - 최소한의 필드만 사용"""
    try:
        # 환자 존재 확인
        try:
            person = Person.objects.get(uuid=patient_uuid, voided=False)
        except Person.DoesNotExist:
            return Response({
                'success': False,
                'error': '환자를 찾을 수 없습니다.'
            }, status=404)

        # 요청 데이터 파싱
        diagnoses = request.data.get('diagnoses', [])
        clinical_notes = request.data.get('clinical_notes', '')

        if not any([diagnoses, clinical_notes]):
            return Response({
                'success': False,
                'error': '저장할 데이터가 없습니다.'
            }, status=400)

        # ✅ 최소한의 Encounter 생성
        from datetime import datetime
        import pytz
        
        now_utc = datetime.now(pytz.UTC)
        encounter_datetime = now_utc.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
        
        # ✅ 최소 필드만 사용
        encounter_data = {
            'patient': patient_uuid,
            'encounterType': '61ae96f4-6afe-4351-b6f8-cd4fc383cce1',
            'encounterDatetime': encounter_datetime
        }

        print(f"🏥 Encounter 생성 데이터: {encounter_data}")

        response = requests.post(
            'http://127.0.0.1:8082/openmrs/ws/rest/v1/encounter',
            headers={
                'Authorization': 'Basic YWRtaW46QWRtaW4xMjM=',
                'Content-Type': 'application/json'
            },
            json=encounter_data,
            timeout=10
        )

        if response.status_code != 201:
            error_msg = f'Encounter 생성 실패: {response.status_code}, {response.text}'
            print(f"❌ {error_msg}")
            return Response({
                'success': False,
                'error': error_msg
            }, status=500)

        encounter_result = response.json()
        encounter_uuid = encounter_result['uuid']
        print(f"✅ Encounter 생성 성공: {encounter_uuid}")

        # ✅ 데이터 저장
        saved_items = []

        # 진단 저장
        for i, diagnosis in enumerate(diagnoses):
            if diagnosis.get('concept_uuid') and diagnosis.get('value'):
                obs_datetime = datetime.now(pytz.UTC).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
                
                obs_data = {
                    'person': patient_uuid,
                    'concept': diagnosis['concept_uuid'],
                    'encounter': encounter_uuid,
                    'obsDatetime': obs_datetime,
                    'value': diagnosis['value']
                }

                obs_response = requests.post(
                    'http://127.0.0.1:8082/openmrs/ws/rest/v1/obs',
                    headers={
                        'Authorization': 'Basic YWRtaW46QWRtaW4xMjM=',
                        'Content-Type': 'application/json'
                    },
                    json=obs_data,
                    timeout=10
                )

                if obs_response.status_code == 201:
                    saved_items.append(f'진단: {diagnosis["value"]}')
                    print(f"✅ 진단 저장 성공: {diagnosis['value']}")

        # 임상 노트 저장
        if clinical_notes.strip():
            obs_datetime = datetime.now(pytz.UTC).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
            
            notes_obs_data = {
                'person': patient_uuid,
                'concept': '160632AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',  # Clinical Notes
                'encounter': encounter_uuid,
                'obsDatetime': obs_datetime,
                'value': clinical_notes.strip()
            }

            notes_response = requests.post(
                'http://127.0.0.1:8082/openmrs/ws/rest/v1/obs',
                headers={
                    'Authorization': 'Basic YWRtaW46QWRtaW4xMjM=',
                    'Content-Type': 'application/json'
                },
                json=notes_obs_data,
                timeout=10
            )

            if notes_response.status_code == 201:
                saved_items.append('임상 노트')
                print(f"✅ 임상 노트 저장 성공")

        return Response({
            'success': True,
            'message': f'{len(saved_items)}개 항목이 저장되었습니다.',
            'encounter_uuid': encounter_uuid,
            'saved_items': saved_items,
            'total_saved': len(saved_items)
        })

    except Exception as e:
        logger.error(f"save_obs_clinical_data 실패: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def search_concepts_for_obs(request):
    """✅ voided 필드 제거된 Concept 검색"""
    try:
        query = request.GET.get('q', '').strip()
        concept_type = request.GET.get('type', 'all')
        
        if len(query) < 2:
            return Response({
                'success': False,
                'results': [],
                'message': '검색어는 2글자 이상 입력해주세요.'
            })

        # ✅ ConceptName에서 voided 조건 제거
        concept_names = ConceptName.objects.filter(
            name__icontains=query
        ).select_related('concept')[:20]

        results = []
        seen_concepts = set()

        for concept_name in concept_names:
            concept = concept_name.concept
            
            # 이미 처리된 concept이거나 retired된 경우 스킵
            concept_uuid = str(concept.uuid)
            if concept_uuid in seen_concepts:
                continue
                
            # retired 체크 (안전하게)
            try:
                if hasattr(concept, 'retired') and concept.retired:
                    continue
            except:
                pass
                
            seen_concepts.add(concept_uuid)
            
            # 타입별 필터링
            concept_name_lower = concept_name.name.lower()
            if concept_type == 'diagnosis':
                if not any(word in concept_name_lower for word in ['diagnosis', 'disease', 'condition', 'disorder']):
                    continue
            elif concept_type == 'drug':
                if not any(word in concept_name_lower for word in ['drug', 'medication', 'medicine']):
                    continue
            elif concept_type == 'vital':
                if not any(word in concept_name_lower for word in ['vital', 'temperature', 'pressure', 'pulse', 'weight', 'height']):
                    continue

            # 안전한 속성 접근
            results.append({
                'uuid': concept_uuid,
                'display': concept_name.name,
                'concept_class': getattr(concept.concept_class, 'name', '') if hasattr(concept, 'concept_class') and concept.concept_class else '',
                'datatype': getattr(concept.datatype, 'name', '') if hasattr(concept, 'datatype') and concept.datatype else '',
                'fully_specified_name': getattr(concept, 'fully_specified_name', ''),
                'short_name': getattr(concept, 'short_name', ''),
                'description': getattr(concept, 'description', '')
            })

        return Response({
            'success': True,
            'results': results,
            'total_found': len(results),
            'query': query,
            'type_filter': concept_type
        })

    except Exception as e:
        logger.error(f"Concept 검색 실패: {e}")
        return Response({
            'success': False,
            'error': str(e),
            'results': []
        }, status=500)
    

@api_view(['POST'])
@permission_classes([AllowAny])
def test_minimal_encounter(request, patient_uuid):
    """최소한의 Encounter 생성 테스트"""
    try:
        from datetime import datetime
        import pytz
        
        now_utc = datetime.now(pytz.UTC)
        encounter_datetime = now_utc.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
        
        # 정말 최소한의 데이터
        encounter_data = {
            'patient': patient_uuid,
            'encounterDatetime': encounter_datetime
            # encounterType도 제거해서 기본값 사용
        }

        print(f"🧪 테스트 Encounter 데이터: {encounter_data}")

        response = requests.post(
            'http://127.0.0.1:8082/openmrs/ws/rest/v1/encounter',
            headers={
                'Authorization': 'Basic YWRtaW46QWRtaW4xMjM=',
                'Content-Type': 'application/json'
            },
            json=encounter_data,
            timeout=10
        )

        return Response({
            'status_code': response.status_code,
            'response_text': response.text,
            'success': response.status_code == 201
        })

    except Exception as e:
        return Response({
            'error': str(e),
            'success': False
        }, status=500)
        
    