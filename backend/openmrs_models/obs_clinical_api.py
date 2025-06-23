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

from .models import Person, Encounter
from .obs_models import Obs, Concept, ConceptName
from medical_integration.models import PatientMapping
from medical_integration.openmrs_api import OpenMRSAPI

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([AllowAny])
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
    """
    기존 Obs 모델을 사용한 진단/처방 저장
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

        # Encounter 처리
        encounter = None
        if encounter_uuid:
            try:
                encounter = Encounter.objects.get(uuid=encounter_uuid, voided=False)
            except Encounter.DoesNotExist:
                encounter = None

        # 새 Encounter 생성 (필요시)
        if not encounter:
            # OpenMRS API로 Encounter 생성
            api = OpenMRSAPI()
            encounter_data = api.create_encounter(patient_uuid)
            if encounter_data:
                try:
                    encounter = Encounter.objects.get(uuid=encounter_data['uuid'])
                except Encounter.DoesNotExist:
                    return Response({
                        'success': False,
                        'error': 'Encounter 생성 후 조회 실패'
                    }, status=500)
            else:
                return Response({
                    'success': False,
                    'error': 'Encounter 생성 실패'
                }, status=500)

        # 저장 결과 추적
        saved_obs = []
        errors = []

        with transaction.atomic():
            # 진단 Obs 저장
            for i, diagnosis in enumerate(diagnoses):
                try:
                    if not diagnosis.get('concept_uuid'):
                        errors.append(f"진단 {i+1}: concept_uuid 누락")
                        continue

                    # Concept 조회
                    try:
                        concept = Concept.objects.get(uuid=diagnosis['concept_uuid'])
                    except Concept.DoesNotExist:
                        errors.append(f"진단 {i+1}: 유효하지 않은 concept_uuid")
                        continue

                    # 진단값이 Concept UUID인 경우 value_coded로 저장
                    obs_data = {
                        'person': person,
                        'concept': concept,
                        'encounter': encounter,
                        'obs_datetime': timezone.now(),
                        'creator': 1,  # 기본 사용자 ID
                        'date_created': timezone.now(),
                        'uuid': None,  # Django가 자동 생성
                        'comments': diagnosis.get('notes', '')
                    }

                    # 값 설정 (concept UUID 또는 텍스트)
                    if diagnosis.get('value_concept_uuid'):
                        try:
                            value_concept = Concept.objects.get(uuid=diagnosis['value_concept_uuid'])
                            obs_data['value_coded'] = value_concept
                        except Concept.DoesNotExist:
                            obs_data['value_text'] = diagnosis.get('value', '')
                    else:
                        obs_data['value_text'] = diagnosis.get('value', '')

                    # UUID 생성 (OpenMRS 스타일)
                    import uuid
                    obs_data['uuid'] = str(uuid.uuid4())

                    # Obs 생성 (Django ORM 사용)
                    obs = Obs.objects.create(**obs_data)
                    saved_obs.append({
                        'type': 'diagnosis',
                        'obs_id': obs.obs_id,
                        'concept_name': concept.short_name,
                        'value': obs.get_display_value()
                    })

                except Exception as e:
                    errors.append(f"진단 {i+1} 저장 오류: {str(e)}")

            # 처방 Obs 저장
            for i, prescription in enumerate(prescriptions):
                try:
                    if not prescription.get('drug_concept_uuid'):
                        errors.append(f"처방 {i+1}: drug_concept_uuid 누락")
                        continue

                    # 약물 정보로 여러 Obs 생성
                    prescription_obs_data = [
                        # 약물명
                        {
                            'concept_search': 'drug',
                            'value_text': prescription.get('drug_name', ''),
                            'comments': '처방 약물'
                        },
                        # 용량
                        {
                            'concept_search': 'dosage',
                            'value_text': f"{prescription.get('dosage', '')} {prescription.get('dose_units', 'mg')}",
                            'comments': '용량'
                        },
                        # 복용 빈도
                        {
                            'concept_search': 'frequency',
                            'value_text': prescription.get('frequency', ''),
                            'comments': '복용 빈도'
                        },
                        # 복용 기간
                        {
                            'concept_search': 'duration',
                            'value_text': prescription.get('duration', ''),
                            'comments': '복용 기간'
                        }
                    ]

                    for obs_info in prescription_obs_data:
                        if not obs_info['value_text']:
                            continue

                        # 적절한 Concept 찾기 (간단한 매칭)
                        concept = None
                        search_term = obs_info['concept_search']
                        
                        # 기본 처방 관련 Concept 사용 (실제로는 더 정확한 매칭 필요)
                        if search_term == 'drug':
                            concept_uuid = '1282AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'  # Drug order
                        elif search_term == 'dosage':
                            concept_uuid = '160856AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'  # Dosage
                        elif search_term == 'frequency':
                            concept_uuid = '160855AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'  # Frequency
                        elif search_term == 'duration':
                            concept_uuid = '159368AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'  # Duration
                        else:
                            continue

                        try:
                            concept = Concept.objects.get(uuid=concept_uuid)
                        except Concept.DoesNotExist:
                            # Concept가 없으면 스킵
                            continue

                        # Obs 생성
                        import uuid
                        obs = Obs.objects.create(
                            person=person,
                            concept=concept,
                            encounter=encounter,
                            obs_datetime=timezone.now(),
                            value_text=obs_info['value_text'],
                            comments=obs_info['comments'],
                            creator=1,
                            date_created=timezone.now(),
                            uuid=str(uuid.uuid4())
                        )

                        saved_obs.append({
                            'type': 'prescription',
                            'obs_id': obs.obs_id,
                            'concept_name': concept.short_name,
                            'value': obs.get_display_value()
                        })

                except Exception as e:
                    errors.append(f"처방 {i+1} 저장 오류: {str(e)}")

            # 임상 노트 저장
            if clinical_notes.strip():
                try:
                    # 임상 노트용 Concept 찾기
                    notes_concept_uuid = '162169AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'  # Clinical notes
                    try:
                        concept = Concept.objects.get(uuid=notes_concept_uuid)
                    except Concept.DoesNotExist:
                        # 기본 텍스트 Concept 사용
                        concept = Concept.objects.filter(
                            short_name__icontains='note'
                        ).first()
                        
                        if not concept:
                            errors.append("임상 노트용 Concept를 찾을 수 없음")
                        else:
                            import uuid
                            obs = Obs.objects.create(
                                person=person,
                                concept=concept,
                                encounter=encounter,
                                obs_datetime=timezone.now(),
                                value_text=clinical_notes.strip(),
                                comments='임상 노트',
                                creator=1,
                                date_created=timezone.now(),
                                uuid=str(uuid.uuid4())
                            )

                            saved_obs.append({
                                'type': 'clinical_notes',
                                'obs_id': obs.obs_id,
                                'concept_name': concept.short_name,
                                'value': obs.get_display_value()
                            })
                    else:
                        import uuid
                        obs = Obs.objects.create(
                            person=person,
                            concept=concept,
                            encounter=encounter,
                            obs_datetime=timezone.now(),
                            value_text=clinical_notes.strip(),
                            comments='임상 노트',
                            creator=1,
                            date_created=timezone.now(),
                            uuid=str(uuid.uuid4())
                        )

                        saved_obs.append({
                            'type': 'clinical_notes',
                            'obs_id': obs.obs_id,
                            'concept_name': concept.short_name,
                            'value': obs.get_display_value()
                        })

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
            'encounter_uuid': encounter.uuid,
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
@permission_classes([AllowAny])
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