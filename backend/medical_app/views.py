# backend/medical_records/views.py
"""
CDSS 의료 기록 API Views
OpenMRS, Orthanc PACS와 연동되는 진료 플로우 관리
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404
from datetime import datetime, timedelta
import logging
import json

from .models import (
    Visit, Diagnosis, Prescription, LaboratoryOrder, 
    ImagingOrder, VitalSigns, ClinicalNote
)
from .serializers import (
    VisitSerializer, DiagnosisSerializer, PrescriptionSerializer,
    ClinicalNoteSerializer
)
from medical_integration.openmrs_api import OpenMRSAPI
from medical_integration.models import PatientMapping

logger = logging.getLogger('medical_records')



@api_view(['GET'])
@permission_classes([AllowAny])
def get_lab_results(request, visit_id):
    """검사 결과 조회 (LIS 연동)"""
    visit = get_object_or_404(Visit, visit_id=visit_id)
    
    try:
        # 기존 LIS CDSS 결과와 연동
        from lis_cdss.models import CDSSResult
        
        # 환자 매칭을 위한 로직 필요 (patient_identifier 기반)
        lab_results = CDSSResult.objects.filter(
            # 실제 매칭 로직 구현 필요
        ).order_by('-created_at')
        
        results_data = []
        for result in lab_results:
            results_data.append({
                'id': result.id,
                'test_name': result.component_name,
                'value': result.value,
                'unit': result.unit,
                'reference_range': result.reference_range,
                'flag': result.flag,
                'created_at': result.created_at.isoformat()
            })
        
        return Response({
            'visit_id': visit_id,
            'patient_identifier': visit.patient_identifier,
            'results': results_data
        })
        
    except Exception as e:
        logger.error(f"검사 결과 조회 실패: {str(e)}")
        return Response(
            {'error': '검사 결과 조회 중 오류가 발생했습니다.'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )




@api_view(['POST'])
@permission_classes([AllowAny])
def quick_prescription(request, visit_id):
    """빠른 처방 (자주 쓰는 약물)"""
    visit = get_object_or_404(Visit, visit_id=visit_id)
    
    try:
        # 자주 사용하는 약물 템플릿
        drug_templates = {
            'acetaminophen': {
                'drug_name': '아세트아미노펜 500mg',
                'dosage': '1정',
                'frequency': 'TID',
                'duration': '3일',
                'route': 'PO',
                'instructions': '식후 30분에 복용'
            },
            'amoxicillin': {
                'drug_name': '아목시실린 250mg',
                'dosage': '2캡슐',
                'frequency': 'TID',
                'duration': '7일',
                'route': 'PO',
                'instructions': '식후 복용, 전 과정 복용 완료'
            },
            'omeprazole': {
                'drug_name': '오메프라졸 20mg',
                'dosage': '1캡슐',
                'frequency': 'QD',
                'duration': '14일',
                'route': 'PO',
                'instructions': '아침 식전 30분'
            }
        }
        
        template_name = request.data.get('template')
        if template_name not in drug_templates:
            return Response(
                {'error': '지원하지 않는 약물 템플릿입니다.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        template = drug_templates[template_name]
        
        # 처방 데이터 생성
        prescription_data = {
            'visit': visit.visit_id,
            'prescription_type': 'medication',
            'created_by': request.data.get('doctor_id', 'system'),
            **template
        }
        
        # 약물 상호작용 및 알레르기 체크
        prescription_data['drug_interaction_warning'] = check_drug_interactions(
            visit, template['drug_name']
        )
        prescription_data['allergy_warning'] = check_drug_allergies(
            visit, template['drug_name']
        )
        
        serializer = PrescriptionSerializer(data=prescription_data)
        if serializer.is_valid():
            prescription = serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        logger.error(f"빠른 처방 실패: {str(e)}")
        return Response(
            {'error': '빠른 처방 중 오류가 발생했습니다.'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def get_drug_templates(request):
    """처방 템플릿 목록 조회"""
    templates = [
        {
            'id': 'acetaminophen',
            'name': '아세트아미노펜 500mg',
            'category': '해열진통제',
            'description': '발열, 두통, 근육통'
        },
        {
            'id': 'amoxicillin',
            'name': '아목시실린 250mg',
            'category': '항생제',
            'description': '세균 감염'
        },
        {
            'id': 'omeprazole',
            'name': '오메프라졸 20mg',
            'category': '위장약',
            'description': '위염, 위궤양'
        },
        {
            'id': 'cetirizine',
            'name': '세티리진 10mg',
            'category': '항히스타민제',
            'description': '알레르기, 두드러기'
        },
        {
            'id': 'dextromethorphan',
            'name': '덱스트로메토르판 15mg',
            'category': '진해제',
            'description': '기침'
        }
    ]
    
    return Response({'templates': templates})


@api_view(['GET'])
@permission_classes([AllowAny])
def export_visit_summary(request, visit_id):
    """진료 요약서 내보내기"""
    visit = get_object_or_404(Visit, visit_id=visit_id)
    
    try:
        # 진료 요약 데이터 생성
        summary_data = {
            'visit_info': {
                'visit_date': visit.visit_date.strftime('%Y-%m-%d %H:%M'),
                'patient_name': visit.patient_name,
                'patient_id': visit.patient_identifier,
                'doctor_name': visit.doctor_name
            },
            'chief_complaint': visit.chief_complaint,
            'present_illness': visit.present_illness,
            'diagnoses': [
                {
                    'name': d.diagnosis_name,
                    'code': d.diagnosis_code,
                    'type': d.get_diagnosis_type_display(),
                    'certainty': d.get_certainty_display()
                }
                for d in visit.diagnoses.all()
            ],
            'prescriptions': [
                {
                    'drug_name': p.drug_name,
                    'dosage': p.dosage,
                    'frequency': p.frequency,
                    'duration': p.duration,
                    'instructions': p.instructions
                }
                for p in visit.prescriptions.all()
            ],
            'lab_orders': [
                {
                    'test_panel': lo.test_panel,
                    'status': lo.get_status_display(),
                    'ordered_at': lo.ordered_at.strftime('%Y-%m-%d %H:%M')
                }
                for lo in visit.lab_orders.all()
            ],
            'imaging_orders': [
                {
                    'modality': io.get_modality_display(),
                    'body_part': io.body_part,
                    'status': io.get_status_display(),
                    'ordered_at': io.ordered_at.strftime('%Y-%m-%d %H:%M')
                }
                for io in visit.imaging_orders.all()
            ]
        }
        
        return Response(summary_data)
        
    except Exception as e:
        logger.error(f"진료 요약서 생성 실패: {str(e)}")
        return Response(
            {'error': '진료 요약서 생성 중 오류가 발생했습니다.'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )(['POST'])




@api_view(['POST'])
@permission_classes([AllowAny])
def add_clinical_note(request, visit_id):
    """임상 기록 추가"""
    visit = get_object_or_404(Visit, visit_id=visit_id)
    
    data = request.data.copy()
    data['visit'] = visit.visit_id
    data['created_by'] = request.data.get('doctor_id', 'system')
    
    serializer = ClinicalNoteSerializer(data=data)
    if serializer.is_valid():
        note = serializer.save()
        logger.info(f"임상 기록 추가: {note.note_type}")
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def patient_visit_history(request, patient_uuid):
    """환자 내원 이력 조회"""
    try:
        visits = Visit.objects.filter(
            openmrs_patient_uuid=patient_uuid
        ).order_by('-visit_date')
        
        # 페이징 처리
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 10))
        start = (page - 1) * page_size
        end = start + page_size
        
        total_count = visits.count()
        paginated_visits = visits[start:end]
        
        # 각 내원에 대한 상세 정보 포함
        visit_data = []
        for visit in paginated_visits:
            serializer = VisitSerializer(visit)
            data = serializer.data
            
            # 진단 요약
            diagnoses = visit.diagnoses.filter(diagnosis_type='primary')[:3]
            data['primary_diagnoses'] = [d.diagnosis_name for d in diagnoses]
            
            # 처방 요약
            prescriptions = visit.prescriptions.all()[:5]
            data['prescription_count'] = prescriptions.count()
            
            # 검사 요약
            data['lab_order_count'] = visit.lab_orders.count()
            data['imaging_order_count'] = visit.imaging_orders.count()
            
            visit_data.append(data)
        
        return Response({
            'total_count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size,
            'visits': visit_data
        })
        
    except Exception as e:
        logger.error(f"내원 이력 조회 실패: {str(e)}")
        return Response(
            {'error': '내원 이력 조회 중 오류가 발생했습니다.'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )



@api_view(['GET'])
@permission_classes([AllowAny])
def imaging_studies_with_ai(request, visit_id):
    """AI 분석이 포함된 영상 검사 결과"""
    visit = get_object_or_404(Visit, visit_id=visit_id)
    
    try:
        imaging_orders = visit.imaging_orders.filter(status='completed')
        results = []
        
        for order in imaging_orders:
            if order.study_uid:
                # PACS에서 이미지 가져오기
                images = get_dicom_images(order.study_uid)
                
                # AI 분석 결과 가져오기
                ai_analysis = get_ai_analysis_results(order.study_uid)
                
                results.append({
                    'order_id': order.order_id,
                    'modality': order.modality,
                    'body_part': order.body_part,
                    'study_uid': order.study_uid,
                    'ordered_at': order.ordered_at.isoformat(),
                    'findings': order.findings,
                    'impression': order.impression,
                    'images': images,
                    'ai_analysis': ai_analysis
                })
        
        return Response(results)
        
    except Exception as e:
        logger.error(f"영상 검사 결과 조회 실패: {str(e)}")
        return Response(
            {'error': '영상 검사 결과 조회 중 오류가 발생했습니다.'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# 헬퍼 함수들
def sync_to_openmrs(visit):
    """진료 완료 시 OpenMRS에 모든 데이터 동기화"""
    try:
        openmrs_api = OpenMRSAPI()
        
        # 진단 동기화
        for diagnosis in visit.diagnoses.all():
            obs_data = {
                'concept': 'DIAGNOSIS',
                'value': diagnosis.diagnosis_name,
                'obsDatetime': diagnosis.created_at.isoformat(),
                'encounter': visit.openmrs_encounter_uuid
            }
            openmrs_api.create_observation(obs_data)
        
        # 처방 동기화
        for prescription in visit.prescriptions.all():
            drug_order_data = {
                'patient': visit.openmrs_patient_uuid,
                'concept': prescription.drug_name,
                'dose': prescription.dosage,
                'frequency': prescription.frequency,
                'route': prescription.route
            }
            openmrs_api.create_drug_order(drug_order_data)
        
        logger.info(f"OpenMRS 동기화 완료: {visit.patient_identifier}")
        
    except Exception as e:
        logger.error(f"OpenMRS 동기화 실패: {str(e)}")



def send_to_ris(imaging_order):
    """RIS 시스템으로 영상 검사 오더 전송"""
    try:
        # 기존 RIS 연동 코드와 통합
        from worklist.models import StudyRequest
        
        study_request = StudyRequest.objects.create(
            patient_id=imaging_order.visit.patient_identifier,
            patient_name=imaging_order.visit.patient_name,
            birth_date=datetime.now().date(),  # 실제로는 환자 생년월일 가져와야 함
            sex='M',  # 실제로는 환자 성별 가져와야 함
            body_part=imaging_order.body_part,
            modality=imaging_order.modality,
            requesting_physician=imaging_order.ordered_by,
            study_status='requested'
        )
        
        imaging_order.accession_number = str(study_request.id)
        imaging_order.save()
        
    except Exception as e:
        logger.error(f"RIS 전송 실패: {str(e)}")
        raise


def check_drug_interactions(visit, drug_name):
    """약물 상호작용 체크"""
    try:
        # 기존 처방 약물 조회
        existing_drugs = visit.prescriptions.values_list('drug_name', flat=True)
        
        # AI 기반 약물 상호작용 분석
        # 실제로는 외부 약물 데이터베이스 API 호출
        interactions = []
        for existing_drug in existing_drugs:
            if check_interaction_database(drug_name, existing_drug):
                interactions.append(f"{drug_name}과 {existing_drug} 상호작용 주의")
        
        return '; '.join(interactions) if interactions else None
        
    except Exception as e:
        logger.error(f"약물 상호작용 체크 실패: {str(e)}")
        return None


def check_drug_allergies(visit, drug_name):
    """알레르기 체크"""
    try:
        # OpenMRS에서 환자 알레르기 정보 조회
        openmrs_api = OpenMRSAPI()
        allergies = openmrs_api.get_patient_allergies(visit.openmrs_patient_uuid)
        
        # 약물 알레르기 체크
        for allergy in allergies:
            if drug_name.lower() in allergy.get('allergen', '').lower():
                return f"{drug_name}에 대한 알레르기 이력이 있습니다."
        
        return None
        
    except Exception as e:
        logger.error(f"알레르기 체크 실패: {str(e)}")
        return None


def get_recent_lab_results(visit):
    """최근 검사 결과 조회"""
    try:
        # 기존 CDSS 결과와 연동
        from lis_cdss.models import CDSSResult
        
        results = CDSSResult.objects.filter(
            # 환자 매칭 로직 필요
        ).order_by('-created_at')[:10]
        
        return [
            {
                'test_name': result.component_name,
                'value': result.value,
                'unit': result.unit,
                'date': result.created_at.isoformat()
            }
            for result in results
        ]
        
    except Exception as e:
        logger.error(f"검사 결과 조회 실패: {str(e)}")
        return []


def get_recent_imaging_results(visit):
    """최근 영상 검사 결과 조회"""
    try:
        # DR Annotations와 연동
        from dr_annotations.models import AnnotationResult
        
        annotations = AnnotationResult.objects.filter(
            patient_id=visit.patient_identifier
        ).order_by('-created_at')[:5]
        
        return [
            {
                'study_uid': ann.study_uid,
                'label': ann.label,
                'bbox': ann.bbox,
                'comment': ann.dr_text,
                'date': ann.created_at.isoformat()
            }
            for ann in annotations
        ]
        
    except Exception as e:
        logger.error(f"영상 검사 결과 조회 실패: {str(e)}")
        return []


def call_ai_diagnosis_engine(patient_data):
    """AI 진단 엔진 호출"""
    try:
        # 실제로는 AI 모델 API 호출
        # 예시 응답
        return [
            {
                'diagnosis': '급성 상기도 감염',
                'confidence': 0.85,
                'reasoning': '발열, 기침, 인후통 증상으로 판단',
                'icd10_code': 'J06.9'
            },
            {
                'diagnosis': '바이러스성 인두염',
                'confidence': 0.72,
                'reasoning': '인후 발적 및 통증 소견',
                'icd10_code': 'J02.9'
            }
        ]
        
    except Exception as e:
        logger.error(f"AI 진단 엔진 호출 실패: {str(e)}")
        return []


def get_dicom_images(study_uid):
    """PACS에서 DICOM 이미지 조회"""
    try:
        # Orthanc API 연동
        from medical_integration.orthanc_api import OrthancAPI
        
        orthanc_api = OrthancAPI()
        studies = orthanc_api.search_studies({'StudyInstanceUID': study_uid})
        
        images = []
        for study in studies:
            series_list = orthanc_api.get_study_series(study['ID'])
            for series in series_list:
                instances = orthanc_api.get_series_instances(series['ID'])
                for instance in instances[:5]:  # 최대 5개 이미지만
                    images.append({
                        'instance_id': instance['ID'],
                        'preview_url': f"/api/orthanc/instances/{instance['ID']}/preview"
                    })
        
        return images
        
    except Exception as e:
        logger.error(f"DICOM 이미지 조회 실패: {str(e)}")
        return []


def get_ai_analysis_results(study_uid):
    """AI 분석 결과 조회"""
    try:
        # AI 분석 결과 DB에서 조회
        from dr_annotations.models import AnnotationResult
        
        annotations = AnnotationResult.objects.filter(study_uid=study_uid)
        
        return [
            {
                'label': ann.label,
                'bbox': ann.bbox,
                'confidence': 0.9,  # 실제로는 AI 모델에서 제공
                'comment': ann.dr_text
            }
            for ann in annotations
        ]
        
    except Exception as e:
        logger.error(f"AI 분석 결과 조회 실패: {str(e)}")
        return []


def check_interaction_database(drug1, drug2):
    """약물 상호작용 데이터베이스 체크"""
    # 실제로는 외부 약물 데이터베이스 API 호출
    # 예시로 간단한 룰 기반 체크
    dangerous_combinations = [
        ('warfarin', 'aspirin'),
        ('metformin', 'contrast'),
        # 더 많은 조합 추가
    ]
    
    for combo in dangerous_combinations:
        if (drug1.lower() in combo[0] and drug2.lower() in combo[1]) or \
           (drug1.lower() in combo[1] and drug2.lower() in combo[0]):
            return True
    
    return False


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def visit_list_create(request):
    """
    GET: 진료 대기 환자 목록 조회
    POST: 새로운 내원 등록
    """
    if request.method == 'GET':
        # 쿼리 파라미터 처리
        status_filter = request.GET.get('status', 'waiting')
        doctor_id = request.GET.get('doctor_id')
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        
        visits = Visit.objects.all()
        
        if status_filter:
            visits = visits.filter(status=status_filter)
        if doctor_id:
            visits = visits.filter(doctor_id=doctor_id)
        if date_from:
            visits = visits.filter(visit_date__gte=date_from)
        if date_to:
            visits = visits.filter(visit_date__lte=date_to)
        
        serializer = VisitSerializer(visits, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        try:
            with transaction.atomic():
                # OpenMRS API 연동
                openmrs_api = OpenMRSAPI()
                
                # 환자 정보 검증
                patient_uuid = request.data.get('openmrs_patient_uuid')
                patient_data = openmrs_api.get_patient(patient_uuid)
                
                if not patient_data:
                    return Response(
                        {'error': 'OpenMRS에서 환자 정보를 찾을 수 없습니다.'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # 내원 기록 생성
                visit_data = {
                    'openmrs_patient_uuid': patient_uuid,
                    'patient_identifier': patient_data['identifiers'][0]['identifier'],
                    'patient_name': patient_data['person']['display'],
                    'doctor_id': request.data.get('doctor_id'),
                    'doctor_name': request.data.get('doctor_name'),
                    'chief_complaint': request.data.get('chief_complaint', ''),
                    'status': 'waiting'
                }
                
                serializer = VisitSerializer(data=visit_data)
                if serializer.is_valid():
                    visit = serializer.save()
                    
                    # OpenMRS Visit 생성
                    openmrs_visit = openmrs_api.create_visit({
                        'patient': patient_uuid,
                        'visitType': 'outpatient',
                        'location': 'clinic'
                    })
                    
                    if openmrs_visit:
                        visit.openmrs_visit_uuid = openmrs_visit.get('uuid')
                        visit.save()
                    
                    logger.info(f"새로운 내원 등록: {visit.patient_identifier}")
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
                
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"내원 등록 실패: {str(e)}")
            return Response(
                {'error': '내원 등록 중 오류가 발생했습니다.'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([AllowAny])
def visit_detail(request, visit_id):
    """진료 상세 정보 조회/수정"""
    visit = get_object_or_404(Visit, visit_id=visit_id)
    
    if request.method == 'GET':
        # 진료 상세 정보와 관련 데이터 포함
        serializer = VisitSerializer(visit)
        data = serializer.data
        
        # 진단 정보 추가
        data['diagnoses'] = DiagnosisSerializer(
            visit.diagnoses.all(), many=True
        ).data
        
        # 처방 정보 추가
        data['prescriptions'] = PrescriptionSerializer(
            visit.prescriptions.all(), many=True
        ).data
        
        # 검사 오더 추가
        data['lab_orders'] = LaboratoryOrderSerializer(
            visit.lab_orders.all(), many=True
        ).data
        
        data['imaging_orders'] = ImagingOrderSerializer(
            visit.imaging_orders.all(), many=True
        ).data
        
        # 활력징후 추가
        data['vital_signs'] = VitalSignsSerializer(
            visit.vital_signs.all(), many=True
        ).data
        
        # 임상 기록 추가
        data['clinical_notes'] = ClinicalNoteSerializer(
            visit.clinical_notes.all(), many=True
        ).data
        
        return Response(data)
    
    elif request.method in ['PUT', 'PATCH']:
        serializer = VisitSerializer(visit, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def start_consultation(request, visit_id):
    """진료 시작"""
    visit = get_object_or_404(Visit, visit_id=visit_id)
    
    if visit.status != 'waiting':
        return Response(
            {'error': '대기 중인 환자만 진료를 시작할 수 있습니다.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        with transaction.atomic():
            visit.status = 'in_progress'
            visit.save()
            
            # OpenMRS Encounter 생성
            openmrs_api = OpenMRSAPI()
            encounter_data = {
                'patient': visit.openmrs_patient_uuid,
                'encounterType': 'consultation',
                'location': 'clinic',
                'encounterDatetime': timezone.now().isoformat()
            }
            
            encounter = openmrs_api.create_encounter(encounter_data)
            if encounter:
                visit.openmrs_encounter_uuid = encounter.get('uuid')
                visit.save()
            
            logger.info(f"진료 시작: {visit.patient_identifier}")
            return Response({'message': '진료가 시작되었습니다.'})
            
    except Exception as e:
        logger.error(f"진료 시작 실패: {str(e)}")
        return Response(
            {'error': '진료 시작 중 오류가 발생했습니다.'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def complete_consultation(request, visit_id):
    """진료 완료"""
    visit = get_object_or_404(Visit, visit_id=visit_id)
    
    if visit.status != 'in_progress':
        return Response(
            {'error': '진행 중인 진료만 완료할 수 있습니다.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        with transaction.atomic():
            visit.status = 'completed'
            visit.save()
            
            # 진료 완료 시 OpenMRS에 모든 데이터 동기화
            sync_to_openmrs(visit)
            
            logger.info(f"진료 완료: {visit.patient_identifier}")
            return Response({'message': '진료가 완료되었습니다.'})
            
    except Exception as e:
        logger.error(f"진료 완료 실패: {str(e)}")
        return Response(
            {'error': '진료 완료 중 오류가 발생했습니다.'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def add_diagnosis(request, visit_id):
    """진단 추가"""
    visit = get_object_or_404(Visit, visit_id=visit_id)
    
    data = request.data.copy()
    data['visit'] = visit.visit_id
    data['created_by'] = request.data.get('doctor_id', 'system')
    
    serializer = DiagnosisSerializer(data=data)
    if serializer.is_valid():
        diagnosis = serializer.save()
        logger.info(f"진단 추가: {diagnosis.diagnosis_name}")
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def add_prescription(request, visit_id):
    """처방 추가"""
    visit = get_object_or_404(Visit, visit_id=visit_id)
    
    data = request.data.copy()
    data['visit'] = visit.visit_id
    data['created_by'] = request.data.get('doctor_id', 'system')
    
    # AI 기반 약물 상호작용 및 알레르기 체크
    drug_name = data.get('drug_name')
    if drug_name:
        # 여기에 AI 기반 약물 상호작용 체크 로직 추가
        data['drug_interaction_warning'] = check_drug_interactions(visit, drug_name)
        data['allergy_warning'] = check_drug_allergies(visit, drug_name)
    
    serializer = PrescriptionSerializer(data=data)
    if serializer.is_valid():
        prescription = serializer.save()
        logger.info(f"처방 추가: {prescription.drug_name}")
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)