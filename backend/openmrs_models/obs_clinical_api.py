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
                'error': '환자를 찾을 수 없습니다.',
                'patient_uuid': patient_uuid
            }, status=404)

        # PatientMapping 정보
        mapping = PatientMapping.objects.filter(
            openmrs_patient_uuid=patient_uuid,
            is_active=True
        ).first()

        # 최근 Encounter들 조회 (최근 10개)
        recent_encounters = Encounter.objects.filter(
            patient__uuid=patient_uuid,
            voided=False
        ).order_by('-encounter_datetime')[:10]

        # 각 Encounter별로 Obs 조회
        clinical_history = []
        for encounter in recent_encounters:
            # 해당 Encounter의 모든 Obs 조회
            encounter_obs = Obs.objects.filter(
                encounter=encounter,
                voided=False
            ).select_related('concept', 'value_coded').order_by('-obs_datetime')

            # Obs를 카테고리별로 분류
            diagnoses = []
            prescriptions = []
            vitals = []
            notes = []

            for obs in encounter_obs:
                concept_name = obs.get_concept_name('ko') or obs.get_concept_name('en')
                
                # 진단 관련 Obs
                if any(keyword in concept_name.lower() for keyword in ['diagnosis', '진단', 'problem']):
                    diagnoses.append({
                        'obs_id': obs.obs_id,
                        'concept_name': concept_name,
                        'concept_uuid': obs.concept.uuid,
                        'value': obs.get_display_value(),
                        'value_coded_uuid': obs.value_coded.uuid if obs.value_coded else None,
                        'comments': obs.comments,
                        'datetime': obs.obs_datetime.isoformat()
                    })
                
                # 처방 관련 Obs
                elif any(keyword in concept_name.lower() for keyword in ['drug', 'medication', '약물', '처방', 'dosage', 'frequency']):
                    prescriptions.append({
                        'obs_id': obs.obs_id,
                        'concept_name': concept_name,
                        'concept_uuid': obs.concept.uuid,
                        'value': obs.get_display_value(),
                        'value_drug': obs.value_drug,
                        'comments': obs.comments,
                        'datetime': obs.obs_datetime.isoformat()
                    })
                
                # 생체징후 관련 Obs
                elif any(keyword in concept_name.lower() for keyword in ['temperature', 'pulse', 'pressure', 'weight', '체온', '맥박', '혈압', '체중']):
                    vitals.append({
                        'obs_id': obs.obs_id,
                        'concept_name': concept_name,
                        'concept_uuid': obs.concept.uuid,
                        'value': obs.get_display_value(),
                        'value_numeric': float(obs.value_numeric) if obs.value_numeric else None,
                        'datetime': obs.obs_datetime.isoformat()
                    })
                
                # 임상 노트
                elif any(keyword in concept_name.lower() for keyword in ['notes', 'comment', '노트', '메모']):
                    notes.append({
                        'obs_id': obs.obs_id,
                        'concept_name': concept_name,
                        'value': obs.get_display_value(),
                        'datetime': obs.obs_datetime.isoformat()
                    })

            clinical_history.append({
                'encounter_id': encounter.encounter_id,
                'encounter_uuid': encounter.uuid,
                'encounter_datetime': encounter.encounter_datetime.isoformat(),
                'encounter_type': encounter.encounter_type.name if encounter.encounter_type else '',
                'location': encounter.location.name if encounter.location else '',
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
    """기존 Obs 모델을 사용한 진단/처방 저장"""
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
        prescriptions = request.data.get('prescriptions', [])
        clinical_notes = request.data.get('clinical_notes', '')

        if not any([diagnoses, prescriptions, clinical_notes]):
            return Response({
                'success': False,
                'error': '저장할 데이터가 없습니다.'
            }, status=400)

        # ✅ OpenMRS API로 새 Encounter 생성
        from datetime import datetime
        import pytz
        
        now_utc = datetime.now(pytz.UTC)
        encounter_datetime = now_utc.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
        
        # OpenMRS API 호출
        encounter_data = {
            'patient': patient_uuid,
            'encounterType': '61ae96f4-6afe-4351-b6f8-cd4fc383cce1',  # Consultation
            'location': '8d6c993e-c2cc-11de-8d13-0010c6dffd0f',      # Default Location
            'encounterDatetime': encounter_datetime,
        }

        response = requests.post(
            'http://openmrs:8080/openmrs/ws/rest/v1/encounter',
            headers={
                'Authorization': 'Basic YWRtaW46QWRtaW4xMjM=',  # admin:Admin123
                'Content-Type': 'application/json'
            },
            json=encounter_data,
            timeout=10
        )

        if response.status_code != 201:
            return Response({
                'success': False,
                'error': f'Encounter 생성 실패: {response.status_code}'
            }, status=500)

        encounter_result = response.json()
        encounter_uuid = encounter_result['uuid']

        # ✅ 진단 및 노트 저장
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
                    'http://openmrs:8080/openmrs/ws/rest/v1/obs',
                    headers={
                        'Authorization': 'Basic YWRtaW46QWRtaW4xMjM=',
                        'Content-Type': 'application/json'
                    },
                    json=obs_data,
                    timeout=10
                )

                if obs_response.status_code == 201:
                    saved_items.append(f'진단: {diagnosis["value"]}')

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
                'http://openmrs:8080/openmrs/ws/rest/v1/obs',
                headers={
                    'Authorization': 'Basic YWRtaW46QWRtaW4xMjM=',
                    'Content-Type': 'application/json'
                },
                json=notes_obs_data,
                timeout=10
            )

            if notes_response.status_code == 201:
                saved_items.append('임상 노트')

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
def search_concepts_for_obs(request):
    """
    Obs 생성용 Concept 검색
    """
    try:
        query = request.GET.get('q', '').strip()
        concept_type = request.GET.get('type', 'all')  # diagnosis, drug, vital, all
        
        if len(query) < 2:
            return Response({
                'success': False,
                'results': [],
                'message': '검색어는 2글자 이상 입력해주세요.'
            })

        # Concept 검색 (ConceptName 포함)
        concepts_query = Concept.objects.filter(
            retired=False
        ).select_related().prefetch_related('names')

        # ConceptName에서 검색
        concept_names = ConceptName.objects.filter(
            name__icontains=query,
            concept__retired=False
        ).select_related('concept')

        # 결과 수집
        concept_results = []
        processed_uuids = set()

        # ConceptName 결과 처리
        for concept_name in concept_names[:20]:
            if concept_name.concept.uuid not in processed_uuids:
                concept_results.append({
                    'uuid': concept_name.concept.uuid,
                    'display': concept_name.name,
                    'concept_id': concept_name.concept.concept_id,
                    'locale': concept_name.locale,
                    'short_name': concept_name.concept.short_name,
                    'description': concept_name.concept.description
                })
                processed_uuids.add(concept_name.concept.uuid)

        # short_name에서도 검색
        for concept in concepts_query.filter(short_name__icontains=query)[:10]:
            if concept.uuid not in processed_uuids:
                concept_results.append({
                    'uuid': concept.uuid,
                    'display': concept.short_name,
                    'concept_id': concept.concept_id,
                    'locale': 'en',
                    'short_name': concept.short_name,
                    'description': concept.description
                })
                processed_uuids.add(concept.uuid)

        return Response({
            'success': True,
            'results': concept_results,
            'count': len(concept_results),
            'query': query
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
def save_obs_clinical_data(request, patient_uuid):
    """
    기존 Obs 모델을 사용한 진단/처방 저장
    """
    import uuid as uuid_gen
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
        prescriptions = request.data.get('prescriptions', [])
        clinical_notes = request.data.get('clinical_notes', '')
        encounter_uuid = request.data.get('encounter_uuid')

        if not any([diagnoses, prescriptions, clinical_notes]):
            return Response({
                'success': False,
                'error': '저장할 데이터가 없습니다.'
            }, status=400)

        saved_obs = []
        errors = []

        with transaction.atomic():
            # Encounter 생성 또는 기존 것 사용
            if encounter_uuid:
                try:
                    encounter = Encounter.objects.get(uuid=encounter_uuid, voided=False)
                except Encounter.DoesNotExist:
                    encounter = None
            else:
                encounter = None

            # 새 Encounter 생성 (환자에 연결된 Patient 모델 필요)
            if not encounter:
                try:
                    # Person에서 Patient 찾기
                    from .models import Patient
                    patient = Patient.objects.get(person=person, voided=False)
                    
                    # 기본 Encounter Type 찾기
                    from .models import EncounterType
                    encounter_type = EncounterType.objects.filter(
                        name__icontains='consultation'
                    ).first()
                    
                    if not encounter_type:
                        encounter_type = EncounterType.objects.first()

                    encounter = Encounter.objects.create(
                        encounter_type=encounter_type,
                        patient=patient,
                        encounter_datetime=timezone.now(),
                        creator=1,
                        date_created=timezone.now(),
                        uuid=str(uuid.uuid4())
                    )
                except Exception as e:
                    return Response({
                        'success': False,
                        'error': f'Encounter 생성 실패: {str(e)}'
                    }, status=500)

            # 진단 데이터 저장
            for diagnosis in diagnoses:
                if diagnosis.get('concept_uuid') and diagnosis.get('value'):
                    try:
                        concept = Concept.objects.get(uuid=diagnosis['concept_uuid'])
                        
                        obs = Obs.objects.create(
                            person=person,
                            concept=concept,
                            encounter=encounter,
                            obs_datetime=timezone.now(),
                            value_text=diagnosis['value'],
                            comments=diagnosis.get('notes', ''),
                            creator=1,
                            date_created=timezone.now(),
                            uuid=str(uuid_gen.uuid4())
                        )

                        saved_obs.append({
                            'type': 'diagnosis',
                            'obs_id': obs.obs_id,
                            'concept_name': concept.short_name or concept.fully_specified_name,
                            'value': obs.get_display_value()
                        })

                    except Concept.DoesNotExist:
                        errors.append(f"진단 Concept을 찾을 수 없음: {diagnosis['concept_uuid']}")
                    except Exception as e:
                        errors.append(f"진단 저장 오류: {str(e)}")

            # 처방 데이터 저장
            for prescription in prescriptions:
                if prescription.get('concept_uuid') and prescription.get('value'):
                    try:
                        concept = Concept.objects.get(uuid=prescription['concept_uuid'])
                        
                        obs = Obs.objects.create(
                            person=person,
                            concept=concept,
                            encounter=encounter,
                            obs_datetime=timezone.now(),
                            value_text=prescription['value'],
                            comments=prescription.get('notes', ''),
                            creator=1,
                            date_created=timezone.now(),
                            uuid=str(uuid_gen.uuid4())
                        )

                        saved_obs.append({
                            'type': 'prescription',
                            'obs_id': obs.obs_id,
                            'concept_name': concept.short_name or concept.fully_specified_name,
                            'value': obs.get_display_value()
                        })

                    except Concept.DoesNotExist:
                        errors.append(f"처방 Concept을 찾을 수 없음: {prescription['concept_uuid']}")
                    except Exception as e:
                        errors.append(f"처방 저장 오류: {str(e)}")

            # 임상 노트 저장
            if clinical_notes.strip():
                try:
                    # 임상 노트용 Concept 찾기 (OpenMRS 표준 Concept 사용)
                    note_concept = Concept.objects.filter(
                        uuid='160632AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'  # Clinical Notes
                    ).first()
                    
                    if not note_concept:
                        # 대체 Concept 찾기
                        note_concept = Concept.objects.filter(
                            short_name__icontains='note'
                        ).first() or Concept.objects.filter(
                            fully_specified_name__icontains='note'
                        ).first()

                    if note_concept:
                        obs = Obs.objects.create(
                            person=person,
                            concept=note_concept,
                            encounter=encounter,
                            obs_datetime=timezone.now(),
                            value_text=clinical_notes.strip(),
                            comments='임상 노트',
                            creator=1,
                            date_created=timezone.now(),
                            uuid=str(uuid_gen.uuid4())
                        )

                        saved_obs.append({
                            'type': 'clinical_notes',
                            'obs_id': obs.obs_id,
                            'concept_name': note_concept.short_name or note_concept.fully_specified_name,
                            'value': obs.get_display_value()
                        })
                    else:
                        errors.append("임상 노트용 Concept을 찾을 수 없습니다.")

                except Exception as e:
                    errors.append(f"임상 노트 저장 오류: {str(e)}")

        # PatientMapping 상태 업데이트
        try:
            mapping = PatientMapping.objects.get(
                openmrs_patient_uuid=patient_uuid,
                is_active=True
            )
            mapping.status = 'in_progress'
            mapping.last_sync = timezone.now()
            mapping.save(update_fields=['status', 'last_sync'])
        except PatientMapping.DoesNotExist:
            pass

        # 결과 반환
        return Response({
            'success': True,
            'message': f'{len(saved_obs)}개의 임상 데이터가 저장되었습니다.',
            'encounter_uuid': str(encounter.uuid),
            'saved_obs': saved_obs,
            'errors': errors,
            'total_saved': len(saved_obs),
            'total_errors': len(errors)
        })

    except Exception as e:
        logger.error(f"Obs 기반 임상 데이터 저장 실패: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)


@api_view(['GET'])
def search_concepts_for_obs(request):
    """
    Obs 생성용 Concept 검색
    """
    try:
        query = request.GET.get('q', '').strip()
        concept_type = request.GET.get('type', 'all')  # diagnosis, drug, vital, all
        
        if len(query) < 2:
            return Response({
                'success': False,
                'results': [],
                'message': '검색어는 2글자 이상 입력해주세요.'
            })

        # Concept 검색 (ConceptName을 통해)
        concept_names = ConceptName.objects.filter(
            name__icontains=query,
            voided=False
        ).select_related('concept')[:20]

        results = []
        seen_concepts = set()

        for concept_name in concept_names:
            concept = concept_name.concept
            if concept.uuid in seen_concepts or concept.retired:
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
                'concept_class': concept.concept_class.name if concept.concept_class else '',
                'datatype': concept.datatype.name if concept.datatype else '',
                'fully_specified_name': concept.fully_specified_name,
                'short_name': concept.short_name,
                'description': concept.description
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