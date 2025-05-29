from django.db import transaction
from django.utils import timezone
from .models import StudyRequest, WorkflowEvent, DICOMMapping
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

class WorkflowService:
    """워크플로우 관리 서비스"""
    
    @transaction.atomic
    def create_emr_request(self, request_data: Dict) -> StudyRequest:
        """EMR에서 새 검사 요청 생성"""
        
        try:
            study_request = StudyRequest.objects.create(
                patient_id=request_data['patient_id'],
                patient_name=request_data['patient_name'],
                birth_date=request_data['birth_date'],
                sex=request_data['sex'],
                body_part=request_data['body_part'],
                modality=request_data['modality'],
                requesting_physician=request_data['requesting_physician'],
                study_description=request_data.get('study_description', ''),
                clinical_info=request_data.get('clinical_info', ''),
                priority=request_data.get('priority', 'routine'),
                workflow_status='emr_requested',
                emr_requested_at=timezone.now()
            )
            
            logger.info(f"EMR 요청 생성: {study_request.workflow_id}")
            
            # 이벤트 로그
            WorkflowEvent.objects.create(
                study_request=study_request,
                event_type='workflow_created',
                to_status='emr_requested',
                notes=f"EMR에서 요청 생성 - 의사: {request_data['requesting_physician']}",
                created_by=request_data.get('created_by', 'system')
            )
            
            return study_request
            
        except Exception as e:
            logger.error(f"EMR 요청 생성 실패: {e}")
            raise
    
    @transaction.atomic  
    def receive_at_ris(self, workflow_id: str, received_by: str = None) -> StudyRequest:
        """RIS에서 요청 접수"""
        
        try:
            study_request = StudyRequest.objects.get(workflow_id=workflow_id)
            
            if not study_request.can_transition_to('ris_received'):
                raise ValueError(f"상태 전환 불가: {study_request.workflow_status} → ris_received")
            
            study_request.update_workflow_status(
                'ris_received',
                notes=f"RIS 접수 - 담당자: {received_by or 'system'}"
            )
            
            logger.info(f"RIS 접수 완료: {workflow_id}")
            return study_request
            
        except StudyRequest.DoesNotExist:
            logger.error(f"워크플로우 찾을 수 없음: {workflow_id}")
            raise
    
    @transaction.atomic
    def schedule_exam(self, workflow_id: str, scheduled_datetime: timezone.datetime, notes: str = None) -> StudyRequest:
        """검사 일정 예약"""
        
        try:
            study_request = StudyRequest.objects.get(workflow_id=workflow_id)
            
            if not study_request.can_transition_to('scheduled'):
                raise ValueError(f"상태 전환 불가: {study_request.workflow_status} → scheduled")
            
            study_request.scheduled_exam_datetime = scheduled_datetime
            study_request.update_workflow_status(
                'scheduled',
                notes=f"검사 예약 - {scheduled_datetime.strftime('%Y-%m-%d %H:%M')} {notes or ''}"
            )
            
            return study_request
            
        except StudyRequest.DoesNotExist:
            logger.error(f"워크플로우 찾을 수 없음: {workflow_id}")
            raise
    
    @transaction.atomic
    def start_exam(self, workflow_id: str, technologist: str = None) -> StudyRequest:
        """검사 시작"""
        
        try:
            study_request = StudyRequest.objects.get(workflow_id=workflow_id)
            
            if not study_request.can_transition_to('in_progress'):
                raise ValueError(f"상태 전환 불가: {study_request.workflow_status} → in_progress")
            
            study_request.update_workflow_status(
                'in_progress',
                notes=f"검사 시작 - 기사: {technologist or 'unknown'}"
            )
            
            return study_request
            
        except StudyRequest.DoesNotExist:
            logger.error(f"워크플로우 찾을 수 없음: {workflow_id}")
            raise
    
    @transaction.atomic
    def upload_dicom_images(self, workflow_id: str, dicom_mappings: List[Dict]) -> StudyRequest:
        """DICOM 이미지 업로드 완료 처리"""
        
        try:
            study_request = StudyRequest.objects.get(workflow_id=workflow_id)
            
            if not study_request.can_transition_to('image_uploaded'):
                raise ValueError(f"상태 전환 불가: {study_request.workflow_status} → image_uploaded")
            
            # DICOM 매핑 정보 저장
            for mapping_data in dicom_mappings:
                DICOMMapping.objects.create(
                    study_request=study_request,
                    orthanc_study_id=mapping_data['orthanc_study_id'],
                    orthanc_series_id=mapping_data['orthanc_series_id'],
                    orthanc_instance_id=mapping_data['orthanc_instance_id'],
                    study_instance_uid=mapping_data['study_instance_uid'],
                    series_instance_uid=mapping_data['series_instance_uid'],
                    sop_instance_uid=mapping_data['sop_instance_uid'],
                    series_description=mapping_data.get('series_description'),
                    series_number=mapping_data.get('series_number'),
                    instance_number=mapping_data.get('instance_number'),
                    file_size=mapping_data.get('file_size')
                )
            
            # Study UID 업데이트 (첫 번째 이미지의 Study UID 사용)
            if dicom_mappings and not study_request.study_uid:
                study_request.study_uid = dicom_mappings[0]['study_instance_uid']
            
            study_request.update_workflow_status(
                'image_uploaded',
                notes=f"DICOM 이미지 업로드 완료 - {len(dicom_mappings)}개 파일"
            )
            
            logger.info(f"DICOM 업로드 완료: {workflow_id}, {len(dicom_mappings)}개 파일")
            return study_request
            
        except StudyRequest.DoesNotExist:
            logger.error(f"워크플로우 찾을 수 없음: {workflow_id}")
            raise
    
    @transaction.atomic
    def start_ai_analysis(self, workflow_id: str) -> StudyRequest:
        """AI 분석 시작"""
        
        try:
            study_request = StudyRequest.objects.get(workflow_id=workflow_id)
            
            if not study_request.can_transition_to('ai_analyzing'):
                raise ValueError(f"상태 전환 불가: {study_request.workflow_status} → ai_analyzing")
            
            study_request.update_workflow_status(
                'ai_analyzing',
                notes="AI 분석 시작"
            )
            
            return study_request
            
        except StudyRequest.DoesNotExist:
            logger.error(f"워크플로우 찾을 수 없음: {workflow_id}")
            raise
    
    @transaction.atomic
    def complete_ai_analysis(self, workflow_id: str, ai_result: Dict) -> StudyRequest:
        """AI 분석 완료"""
        
        try:
            study_request = StudyRequest.objects.get(workflow_id=workflow_id)
            
            if study_request.workflow_status != 'ai_analyzing':
                raise ValueError(f"AI 분석 완료 처리 불가: 현재 상태 {study_request.workflow_status}")
            
            # AI 결과 저장
            study_request.ai_analysis_result = ai_result
            study_request.ai_confidence_score = ai_result.get('overall_confidence', 0)
            
            study_request.update_workflow_status(
                'ai_completed',
                notes=f"AI 분석 완료 - 신뢰도: {ai_result.get('overall_confidence', 0):.2f}"
            )
            
            logger.info(f"AI 분석 완료: {workflow_id}")
            return study_request
            
        except StudyRequest.DoesNotExist:
            logger.error(f"워크플로우 찾을 수 없음: {workflow_id}")
            raise
    
    @transaction.atomic
    def start_reading(self, workflow_id: str, radiologist: str) -> StudyRequest:
        """판독 시작"""
        
        try:
            study_request = StudyRequest.objects.get(workflow_id=workflow_id)
            
            valid_statuses = ['ai_completed', 'reading_pending', 'image_uploaded']
            if study_request.workflow_status not in valid_statuses:
                raise ValueError(f"판독 시작 불가: 현재 상태 {study_request.workflow_status}")
            
            study_request.interpreting_physician = radiologist
            study_request.update_workflow_status(
                'reading_in_progress',
                notes=f"판독 시작 - 판독의: {radiologist}"
            )
            
            return study_request
            
        except StudyRequest.DoesNotExist:
            logger.error(f"워크플로우 찾을 수 없음: {workflow_id}")
            raise
    
    @transaction.atomic
    def complete_reading(self, workflow_id: str, report_text: str, radiologist: str) -> StudyRequest:
        """판독 완료"""
        
        try:
            study_request = StudyRequest.objects.get(workflow_id=workflow_id)
            
            if study_request.workflow_status != 'reading_in_progress':
                raise ValueError(f"판독 완료 처리 불가: 현재 상태 {study_request.workflow_status}")
            
            study_request.report_text = report_text
            study_request.interpreting_physician = radiologist
            study_request.report_created_at = timezone.now()
            
            study_request.update_workflow_status(
                'reading_completed',
                notes=f"판독 완료 - 판독의: {radiologist}"
            )
            
            logger.info(f"판독 완료: {workflow_id}")
            return study_request
            
        except StudyRequest.DoesNotExist:
            logger.error(f"워크플로우 찾을 수 없음: {workflow_id}")
            raise
    
    @transaction.atomic
    def deliver_to_emr(self, workflow_id: str) -> StudyRequest:
        """EMR로 결과 전송"""
        
        try:
            study_request = StudyRequest.objects.get(workflow_id=workflow_id)
            
            if study_request.workflow_status != 'reading_completed':
                raise ValueError(f"EMR 전송 불가: 현재 상태 {study_request.workflow_status}")
            
            study_request.update_workflow_status(
                'emr_delivered',
                notes="EMR로 결과 전송 완료"
            )
            
            logger.info(f"EMR 전송 완료: {workflow_id}")
            return study_request
            
        except StudyRequest.DoesNotExist:
            logger.error(f"워크플로우 찾을 수 없음: {workflow_id}")
            raise
    
    def get_workflow_summary(self, workflow_id: str) -> Dict:
        """워크플로우 요약 정보"""
        
        try:
            study_request = StudyRequest.objects.get(workflow_id=workflow_id)
            
            return {
                'workflow_id': str(study_request.workflow_id),
                'patient_info': {
                    'id': study_request.patient_id,
                    'name': study_request.patient_name,
                    'birth_date': study_request.birth_date.isoformat(),
                    'sex': study_request.sex
                },
                'study_info': {
                    'modality': study_request.modality,
                    'body_part': study_request.body_part,
                    'description': study_request.study_description,
                    'accession_number': study_request.accession_number,
                    'study_uid': study_request.study_uid
                },
                'workflow': {
                    'status': study_request.workflow_status,
                    'progress': study_request.get_workflow_progress(),
                    'created_at': study_request.emr_requested_at.isoformat() if study_request.emr_requested_at else None,
                    'processing_time': str(study_request.get_processing_time()) if study_request.get_processing_time() else None,
                    'is_completed': study_request.is_completed,
                    'has_error': study_request.has_error
                },
                'personnel': {
                    'requesting_physician': study_request.requesting_physician,
                    'interpreting_physician': study_request.interpreting_physician
                },
                'ai_analysis': study_request.ai_analysis_result,
                'report': {
                    'text': study_request.report_text,
                    'created_at': study_request.report_created_at.isoformat() if study_request.report_created_at else None
                },
                'dicom_count': study_request.dicom_mappings.count()
            }
            
        except StudyRequest.DoesNotExist:
            return None
    
    def get_worklist_for_ris(self, filters: Dict = None) -> List[Dict]:
        """RIS용 워크리스트 조회"""
        
        # RIS에서 처리할 상태들
        ris_statuses = [
            'ris_received', 'scheduled', 'in_progress', 'image_uploaded',
            'ai_analyzing', 'ai_completed', 'reading_pending', 'reading_in_progress'
        ]
        
        queryset = StudyRequest.objects.filter(
            workflow_status__in=ris_statuses
        ).order_by('priority', 'emr_requested_at')
        
        # 필터 적용
        if filters:
            if filters.get('modality'):
                queryset = queryset.filter(modality=filters['modality'])
            if filters.get('status'):
                queryset = queryset.filter(workflow_status=filters['status'])
            if filters.get('priority'):
                queryset = queryset.filter(priority=filters['priority'])
        
        return [
            {
                'workflow_id': str(req.workflow_id),
                'accession_number': req.accession_number,
                'patient_id': req.patient_id,
                'patient_name': req.patient_name,
                'modality': req.modality,
                'body_part': req.body_part,
                'priority': req.priority,
                'workflow_status': req.workflow_status,
                'progress': req.get_workflow_progress(),
                'requested_at': req.emr_requested_at.isoformat() if req.emr_requested_at else None,
                'scheduled_at': req.scheduled_exam_datetime.isoformat() if req.scheduled_exam_datetime else None,
                'has_dicom': req.dicom_mappings.exists(),
                'has_ai_result': bool(req.ai_analysis_result),
                'study_uid': req.study_uid
            }
            for req in queryset
        ]
    
    def get_completed_studies_for_emr(self, patient_id: str = None) -> List[Dict]:
        """EMR용 완료된 검사 목록"""
        
        completed_statuses = ['reading_completed', 'emr_delivered', 'workflow_completed']
        
        queryset = StudyRequest.objects.filter(
            workflow_status__in=completed_statuses
        ).order_by('-reading_completed_at')
        
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        
        return [
            {
                'workflow_id': str(req.workflow_id),
                'accession_number': req.accession_number,
                'patient_id': req.patient_id,
                'patient_name': req.patient_name,
                'modality': req.modality,
                'body_part': req.body_part,
                'study_description': req.study_description,
                'requesting_physician': req.requesting_physician,
                'interpreting_physician': req.interpreting_physician,
                'report_text': req.report_text,
                'completed_at': req.reading_completed_at.isoformat() if req.reading_completed_at else None,
                'ai_analysis': req.ai_analysis_result,
                'study_uid': req.study_uid,
                'viewer_url': f"/viewer/{req.study_uid}" if req.study_uid else None
            }
            for req in queryset
        ]