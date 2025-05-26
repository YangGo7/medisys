
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import json

class AIResult(models.Model):
    """AI 분석 결과 테이블"""
    ai_result_id = models.AutoField(primary_key=True)
    
    # DICOM 관련 외래키들 (실제로는 다른 테이블과 연결)
    patient_id = models.CharField(max_length=100, db_index=True, help_text="환자 고유 아이디 (P12345)")
    study_uid = models.CharField(max_length=255, db_index=True, help_text="DICOM StudyInstanceUID")
    accession_number = models.CharField(max_length=100, null=True, blank=True, db_index=True, 
                                      help_text="검사 고유번호로 StudyUID 대신 사용 가능")
    series_uid = models.CharField(max_length=255, db_index=True, help_text="DICOM Series Instance UID")
    instance_uid = models.CharField(max_length=255, db_index=True, help_text="DICOM SOP Instance UID")
    
    # AI 분석 결과
    label = models.CharField(max_length=200, help_text="라벨 (예: Pneumothorax, Nodule)")
    bbox = models.JSONField(help_text="바운딩박스 좌표 [x1, y1, x2, y2]")
    confidence_score = models.FloatField(help_text="신뢰도 (0.0 ~ 1.0)")
    ai_text = models.TextField(null=True, blank=True, 
                              help_text="요약 소견, radiomics 정량적 수치 등")
    
    # 추가 메타데이터
    model_version = models.CharField(max_length=100, default="yolov8", help_text="사용된 AI 모델 버전")
    analysis_datetime = models.DateTimeField(default=timezone.now, help_text="분석 수행 시간")
    processing_time = models.FloatField(null=True, blank=True, help_text="처리 시간(초)")
    
    # 이미지 정보
    image_width = models.IntegerField(null=True, blank=True)
    image_height = models.IntegerField(null=True, blank=True)
    
    # 검토 상태
    REVIEW_STATUS_CHOICES = [
        ('pending', '검토대기'),
        ('confirmed', '확인됨'),
        ('rejected', '거부됨'),
        ('modified', '수정됨'),
    ]
    review_status = models.CharField(max_length=20, choices=REVIEW_STATUS_CHOICES, 
                                   default='pending', help_text="의사 검토 상태")
    review_comment = models.TextField(null=True, blank=True)
    reviewed_by = models.CharField(max_length=200, null=True, blank=True, help_text="검토한 의사")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'ai_results'
        ordering = ['-analysis_datetime', '-confidence_score']
        indexes = [
            models.Index(fields=['patient_id', 'study_uid']),
            models.Index(fields=['study_uid', 'series_uid']),
            models.Index(fields=['label', 'confidence_score']),
            models.Index(fields=['analysis_datetime']),
        ]
    
    def __str__(self):
        return f"{self.label} - {self.confidence_score:.2f} - {self.patient_id}"
    
    @property
    def bbox_coordinates(self):
        """바운딩박스 좌표를 딕셔너리로 반환"""
        if isinstance(self.bbox, list) and len(self.bbox) == 4:
            return {
                'x1': self.bbox[0],
                'y1': self.bbox[1], 
                'x2': self.bbox[2],
                'y2': self.bbox[3],
                'width': self.bbox[2] - self.bbox[0],
                'height': self.bbox[3] - self.bbox[1]
            }
        return None
    
    @property
    def bbox_area(self):
        """바운딩박스 면적 계산"""
        coords = self.bbox_coordinates
        if coords:
            return coords['width'] * coords['height']
        return 0
    
    def get_normalized_bbox(self):
        """정규화된 바운딩박스 좌표 (0~1 사이값)"""
        if self.image_width and self.image_height and self.bbox_coordinates:
            coords = self.bbox_coordinates
            return {
                'x1': coords['x1'] / self.image_width,
                'y1': coords['y1'] / self.image_height,
                'x2': coords['x2'] / self.image_width,
                'y2': coords['y2'] / self.image_height
            }
        return None
    
    def set_bbox_from_coords(self, x1, y1, x2, y2):
        """좌표로부터 바운딩박스 설정"""
        self.bbox = [float(x1), float(y1), float(x2), float(y2)]
    
    def is_high_confidence(self, threshold=0.8):
        """높은 신뢰도 여부 확인"""
        return self.confidence_score >= threshold
    
    def is_abnormal(self):
        """이상 소견 여부 확인"""
        abnormal_labels = ['pneumothorax', 'nodule', 'fracture', 'pneumonia']
        return any(label.lower() in self.label.lower() for label in abnormal_labels)


class AIAnalysisSummary(models.Model):
    """Study/Series 단위 AI 분석 요약"""
    summary_id = models.AutoField(primary_key=True)
    
    # 기본 정보
    patient_id = models.CharField(max_length=100, db_index=True)
    study_uid = models.CharField(max_length=255, db_index=True)
    series_uid = models.CharField(max_length=255, null=True, blank=True)
    
    # 분석 통계
    total_instances = models.IntegerField(default=0, help_text="분석된 총 인스턴스 수")
    total_detections = models.IntegerField(default=0, help_text="총 detection 수")
    abnormal_instances = models.IntegerField(default=0, help_text="이상 소견이 있는 인스턴스 수")
    max_confidence = models.FloatField(default=0.0, help_text="최고 신뢰도")
    avg_confidence = models.FloatField(default=0.0, help_text="평균 신뢰도")
    
    # 발견된 라벨들과 개수
    detected_labels = models.JSONField(default=dict, help_text="발견된 라벨별 개수 {'pneumonia': 3, 'nodule': 1}")
    
    # 전체 분석 상태
    STATUS_CHOICES = [
        ('pending', '대기중'),
        ('processing', '분석중'),
        ('completed', '완료'),
        ('failed', '실패'),
    ]
    analysis_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # 의사 최종 판단
    final_diagnosis = models.TextField(null=True, blank=True, help_text="의사의 최종 판단")
    has_critical_findings = models.BooleanField(default=False, help_text="심각한 소견 여부")
    
    # 시간 정보
    analysis_started_at = models.DateTimeField(null=True, blank=True)
    analysis_completed_at = models.DateTimeField(null=True, blank=True)
    total_processing_time = models.FloatField(null=True, blank=True, help_text="총 처리 시간(초)")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'ai_analysis_summary'
        unique_together = ['study_uid', 'series_uid']
        ordering = ['-analysis_completed_at']
    
    def __str__(self):
        return f"Summary - {self.patient_id} - {self.study_uid}"
    
    def update_statistics(self):
        """관련된 AIResult들로부터 통계 업데이트"""
        results = AIResult.objects.filter(
            patient_id=self.patient_id,
            study_uid=self.study_uid
        )
        
        if self.series_uid:
            results = results.filter(series_uid=self.series_uid)
        
        self.total_detections = results.count()
        
        if self.total_detections > 0:
            self.max_confidence = results.aggregate(models.Max('confidence_score'))['confidence_score__max']
            self.avg_confidence = results.aggregate(models.Avg('confidence_score'))['confidence_score__avg']
            
            # 라벨별 개수 계산
            label_counts = {}
            for result in results:
                label = result.label
                label_counts[label] = label_counts.get(label, 0) + 1
            self.detected_labels = label_counts
            
            # 이상 소견 있는 인스턴스 개수
            abnormal_instances = results.filter(
                models.Q(label__icontains='pneumonia') |
                models.Q(label__icontains='pneumothorax') |
                models.Q(label__icontains='nodule') |
                models.Q(label__icontains='fracture')
            ).values('instance_uid').distinct().count()
            self.abnormal_instances = abnormal_instances
            
            # 심각한 소견 여부
            high_confidence_abnormal = results.filter(
                confidence_score__gte=0.8
            ).filter(
                models.Q(label__icontains='pneumonia') |
                models.Q(label__icontains='pneumothorax') |
                models.Q(label__icontains='fracture')
            ).exists()
            self.has_critical_findings = high_confidence_abnormal
        
        self.save()


class YOLOModelInfo(models.Model):
    """YOLO 모델 정보 관리"""
    model_id = models.AutoField(primary_key=True)
    model_name = models.CharField(max_length=200, unique=True)
    model_version = models.CharField(max_length=100)
    model_path = models.CharField(max_length=500, help_text="모델 파일 경로")
    
    # 모델 메타데이터
    model_type = models.CharField(max_length=50, default="detection", 
                                choices=[('detection', 'Object Detection'), 
                                       ('classification', 'Classification')])
    target_modality = models.CharField(max_length=50, help_text="대상 Modality (CT, X-ray, MRI)")
    target_body_part = models.CharField(max_length=100, help_text="대상 부위")
    
    # 성능 지표
    map_50 = models.FloatField(null=True, blank=True, help_text="mAP@0.5")
    map_95 = models.FloatField(null=True, blank=True, help_text="mAP@0.5:0.95")
    
    # 설정값
    default_confidence_threshold = models.FloatField(default=0.5)
    default_iou_threshold = models.FloatField(default=0.45)
    
    # 클래스 정보
    class_names = models.JSONField(default=list, help_text="클래스 이름 리스트")
    class_colors = models.JSONField(default=dict, help_text="클래스별 색상 매핑")
    
    # 상태
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'yolo_model_info'
        ordering = ['-is_default', '-created_at']
    
    def __str__(self):
        return f"{self.model_name} v{self.model_version}"
    
    def save(self, *args, **kwargs):
        # 기본 모델 설정시 다른 모델들의 is_default를 False로 변경
        if self.is_default:
            YOLOModelInfo.objects.exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)