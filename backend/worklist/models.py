from django.db import models
from django.utils import timezone
import uuid

class StudyRequest(models.Model):
    """기존 StudyRequest 모델 확장 - 워크플로우 상태 추가"""
    
    # 워크플로우 상태 정의
    WORKFLOW_STATUS_CHOICES = [
        ('emr_requested', 'EMR 요청'),
        ('ris_received', 'RIS 접수'),
        ('scheduled', '검사 예약'),
        ('in_progress', '검사 진행중'),
        ('image_uploaded', '영상 업로드'),
        ('ai_analyzing', 'AI 분석중'),
        ('ai_completed', 'AI 분석완료'),
        ('reading_pending', '판독 대기'),
        ('reading_in_progress', '판독 진행중'),
        ('reading_completed', '판독 완료'),
        ('report_approved', '리포트 승인'),
        ('emr_delivered', 'EMR 전송완료'),
        ('workflow_completed', '워크플로우 완료'),
        ('cancelled', '취소'),
        ('error', '오류')
    ]
    
    # 기존 필드들 (이미 있는 것들)
    id = models.AutoField(primary_key=True)
    patient_id = models.CharField(max_length=50)
    patient_name = models.CharField(max_length=100)
    birth_date = models.DateField()
    sex = models.CharField(max_length=1, choices=[('M', 'Male'), ('F', 'Female')])
    body_part = models.CharField(max_length=100)
    modality = models.CharField(max_length=10)
    requesting_physician = models.CharField(max_length=100)
    request_datetime = models.DateTimeField(auto_now_add=True)  # 기존 필드명 유지
    scheduled_exam_datetime = models.DateTimeField(null=True, blank=True)
    interpreting_physician = models.CharField(max_length=100, null=True, blank=True)
    study_uid = models.CharField(max_length=255, null=True, blank=True)
    accession_number = models.CharField(max_length=50, null=True, blank=True)
    study_status = models.CharField(max_length=20, default='requested')
    report_status = models.CharField(max_length=20, default='pending')
    
    # 새로 추가할 워크플로우 필드들
    workflow_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    workflow_status = models.CharField(
        max_length=30, 
        choices=WORKFLOW_STATUS_CHOICES, 
        default='emr_requested'
    )
    
    # 각 단계별 시간 추적
    emr_requested_at = models.DateTimeField(null=True, blank=True)
    ris_received_at = models.DateTimeField(null=True, blank=True)
    image_uploaded_at = models.DateTimeField(null=True, blank=True)
    ai_analysis_started_at = models.DateTimeField(null=True, blank=True)
    ai_analysis_completed_at = models.DateTimeField(null=True, blank=True)
    reading_started_at = models.DateTimeField(null=True, blank=True)
    reading_completed_at = models.DateTimeField(null=True, blank=True)
    emr_delivered_at = models.DateTimeField(null=True, blank=True)
    
    # 추가 메타데이터
    study_description = models.TextField(null=True, blank=True)
    clinical_info = models.TextField(null=True, blank=True)
    priority = models.CharField(
        max_length=10, 
        choices=[('routine', 'Routine'), ('urgent', 'Urgent'), ('stat', 'STAT')],
        default='routine'
    )
    
    # AI 분석 결과 저장용
    ai_analysis_result = models.JSONField(null=True, blank=True)
    ai_confidence_score = models.FloatField(null=True, blank=True)
    
    # 판독 관련
    report_text = models.TextField(null=True, blank=True)
    report_created_at = models.DateTimeField(null=True, blank=True)
    
    # 오류 및 메모
    error_message = models.TextField(null=True, blank=True)
    workflow_notes = models.TextField(null=True, blank=True)
    
    def save(self, *args, **kwargs):
        # 첫 생성시 EMR 요청 시간 설정
        if not self.pk and not self.emr_requested_at:
            self.emr_requested_at = timezone.now()
        
        # Accession Number 자동 생성
        if not self.accession_number:
            self.accession_number = self.generate_accession_number()
            
        super().save(*args, **kwargs)
    
    def update_workflow_status(self, new_status, notes=None):
        """워크플로우 상태 업데이트 및 시간 기록"""
        old_status = self.workflow_status
        self.workflow_status = new_status
        
        # 상태별 시간 기록
        now = timezone.now()
        status_time_mapping = {
            'emr_requested': 'emr_requested_at',
            'ris_received': 'ris_received_at', 
            'image_uploaded': 'image_uploaded_at',
            'ai_analyzing': 'ai_analysis_started_at',
            'ai_completed': 'ai_analysis_completed_at',
            'reading_in_progress': 'reading_started_at',
            'reading_completed': 'reading_completed_at',
            'emr_delivered': 'emr_delivered_at'
        }
        
        if new_status in status_time_mapping:
            setattr(self, status_time_mapping[new_status], now)
        
        # 기존 study_status, report_status도 동기화
        if new_status in ['scheduled', 'in_progress', 'image_uploaded']:
            self.study_status = 'in_progress'
        elif new_status in ['reading_completed', 'report_approved']:
            self.study_status = 'completed'
            self.report_status = 'completed'
        elif new_status == 'cancelled':
            self.study_status = 'cancelled'
            
        if notes:
            self.workflow_notes = f"{self.workflow_notes or ''}\n[{now}] {old_status} → {new_status}: {notes}".strip()
        
        self.save()
        
        # 워크플로우 이벤트 로그 생성
        WorkflowEvent.objects.create(
            study_request=self,
            event_type='status_change',
            from_status=old_status,
            to_status=new_status,
            notes=notes
        )
        
        return self
    
    def get_workflow_progress(self):
        """워크플로우 진행률 계산"""
        status_order = [
            'emr_requested', 'ris_received', 'scheduled', 'in_progress',
            'image_uploaded', 'ai_analyzing', 'ai_completed', 'reading_pending',
            'reading_in_progress', 'reading_completed', 'emr_delivered', 'workflow_completed'
        ]
        
        try:
            current_index = status_order.index(self.workflow_status)
            progress = ((current_index + 1) / len(status_order)) * 100
            return min(progress, 100)
        except ValueError:
            return 0
    
    def get_processing_time(self):
        """총 처리 시간 계산"""
        if self.emr_requested_at and self.workflow_status != 'emr_requested':
            end_time = self.emr_delivered_at or timezone.now()
            return end_time - self.emr_requested_at
        return None
    
    def generate_accession_number(self):
        """Accession Number 생성"""
        import time
        timestamp = int(time.time())
        return f"AC{timestamp}{self.pk or ''}"
    
    def can_transition_to(self, target_status):
        """상태 전환 가능 여부 확인"""
        valid_transitions = {
            'emr_requested': ['ris_received', 'cancelled'],
            'ris_received': ['scheduled', 'cancelled'],
            'scheduled': ['in_progress', 'cancelled'],
            'in_progress': ['image_uploaded', 'cancelled'],
            'image_uploaded': ['ai_analyzing', 'reading_pending'],
            'ai_analyzing': ['ai_completed', 'error'],
            'ai_completed': ['reading_pending'],
            'reading_pending': ['reading_in_progress', 'cancelled'],
            'reading_in_progress': ['reading_completed', 'reading_pending'],
            'reading_completed': ['report_approved', 'reading_in_progress'],
            'report_approved': ['emr_delivered'],
            'emr_delivered': ['workflow_completed'],
        }
        
        return target_status in valid_transitions.get(self.workflow_status, [])
    
    @property
    def is_completed(self):
        return self.workflow_status in ['workflow_completed', 'emr_delivered']
    
    @property 
    def is_cancelled(self):
        return self.workflow_status == 'cancelled'
    
    @property
    def has_error(self):
        return self.workflow_status == 'error' or bool(self.error_message)
    
    class Meta:
        db_table = 'worklist_studyrequest'  # 기존 테이블명 유지
        indexes = [
            models.Index(fields=['workflow_status', 'request_datetime'], name='workflow_status_time_idx'),
            models.Index(fields=['patient_id', 'workflow_status'], name='patient_workflow_idx'),
            models.Index(fields=['modality', 'workflow_status'], name='modality_workflow_idx'),
            models.Index(fields=['requesting_physician'], name='requesting_physician_idx'),
            models.Index(fields=['workflow_id'], name='workflow_id_idx'),
        ]


class WorkflowEvent(models.Model):
    """워크플로우 상태 변경 이벤트 로그"""
    
    study_request = models.ForeignKey(StudyRequest, on_delete=models.CASCADE, related_name='workflow_events')
    event_type = models.CharField(max_length=30)  # status_change, error, note, etc.
    from_status = models.CharField(max_length=30, null=True, blank=True)
    to_status = models.CharField(max_length=30, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_by = models.CharField(max_length=100, null=True, blank=True)  # 이벤트 생성자
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'workflow_event'
        ordering = ['-created_at']


class DICOMMapping(models.Model):
    """DICOM 이미지와 StudyRequest 매핑"""
    
    study_request = models.ForeignKey(StudyRequest, on_delete=models.CASCADE, related_name='dicom_mappings')
    
    # Orthanc 정보
    orthanc_study_id = models.CharField(max_length=255)
    orthanc_series_id = models.CharField(max_length=255)  
    orthanc_instance_id = models.CharField(max_length=255)
    
    # DICOM 메타데이터
    study_instance_uid = models.CharField(max_length=255)
    series_instance_uid = models.CharField(max_length=255)
    sop_instance_uid = models.CharField(max_length=255)
    
    series_description = models.CharField(max_length=255, null=True, blank=True)
    series_number = models.IntegerField(null=True, blank=True)
    instance_number = models.IntegerField(null=True, blank=True)
    
    # 파일 정보
    file_size = models.BigIntegerField(null=True, blank=True)
    image_type = models.CharField(max_length=100, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'dicom_mapping'
        unique_together = [
            ('study_request', 'orthanc_instance_id'),
        ]