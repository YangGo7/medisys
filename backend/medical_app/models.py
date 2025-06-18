# backend/medical_records/models.py
"""
CDSS 의료 기록 관리 모델
OpenMRS Encounter와 통합되는 진료 기록 시스템
"""

from django.db import models
from django.utils import timezone
import uuid

class Visit(models.Model):
    """내원 정보 (OpenMRS Visit과 연동)"""
    
    STATUS_CHOICES = [
        ('waiting', '대기 중'),
        ('in_progress', '진료 중'),
        ('completed', '진료 완료'),
        ('cancelled', '취소됨'),
    ]
    
    visit_id = models.AutoField(primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    
    # OpenMRS 연동 정보
    openmrs_patient_uuid = models.CharField(max_length=38, db_index=True)
    openmrs_visit_uuid = models.CharField(max_length=38, null=True, blank=True)
    openmrs_encounter_uuid = models.CharField(max_length=38, null=True, blank=True)
    
    # 환자 기본 정보 (캐시용)
    patient_identifier = models.CharField(max_length=50, db_index=True)
    patient_name = models.CharField(max_length=100)
    
    # 진료 정보
    doctor_id = models.CharField(max_length=50)
    doctor_name = models.CharField(max_length=100)
    visit_date = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='waiting')
    
    # 주호소 및 현병력
    chief_complaint = models.TextField(null=True, blank=True, 
                                     help_text="환자의 주호소")
    present_illness = models.TextField(null=True, blank=True,
                                     help_text="현병력 상세 기록")
    
    # 메타데이터
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'medical_visit'
        ordering = ['-visit_date']
        indexes = [
            models.Index(fields=['openmrs_patient_uuid', 'visit_date']),
            models.Index(fields=['patient_identifier']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.patient_identifier} - {self.visit_date.strftime('%Y-%m-%d %H:%M')}"


class Diagnosis(models.Model):
    """진단 정보"""
    
    DIAGNOSIS_TYPE_CHOICES = [
        ('primary', '주진단'),
        ('secondary', '부진단'),
        ('differential', '감별진단'),
        ('rule_out', '배제진단'),
    ]
    
    CERTAINTY_CHOICES = [
        ('confirmed', '확진'),
        ('suspected', '의증'),
        ('probable', '추정'),
        ('possible', '가능성'),
    ]
    
    diagnosis_id = models.AutoField(primary_key=True)
    visit = models.ForeignKey(Visit, on_delete=models.CASCADE, related_name='diagnoses')
    
    # 진단 내용
    diagnosis_code = models.CharField(max_length=20, null=True, blank=True,
                                    help_text="ICD-10 코드")
    diagnosis_name = models.CharField(max_length=500)
    diagnosis_type = models.CharField(max_length=20, choices=DIAGNOSIS_TYPE_CHOICES, 
                                    default='primary')
    certainty = models.CharField(max_length=20, choices=CERTAINTY_CHOICES, 
                               default='confirmed')
    
    # AI 지원 정보
    ai_suggested = models.BooleanField(default=False, 
                                     help_text="AI가 제안한 진단인지 여부")
    ai_confidence = models.FloatField(null=True, blank=True,
                                    help_text="AI 진단 신뢰도 (0-1)")
    
    # 진단 근거
    clinical_notes = models.TextField(null=True, blank=True,
                                    help_text="진단 근거 및 소견")
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=50)
    
    class Meta:
        db_table = 'medical_diagnosis'
        ordering = ['diagnosis_type', '-created_at']
    
    def __str__(self):
        return f"{self.diagnosis_name} ({self.get_diagnosis_type_display()})"


class Prescription(models.Model):
    """처방 정보"""
    
    PRESCRIPTION_TYPE_CHOICES = [
        ('medication', '약물처방'),
        ('injection', '주사처방'),
        ('procedure', '처치'),
        ('therapy', '치료'),
    ]
    
    STATUS_CHOICES = [
        ('prescribed', '처방됨'),
        ('dispensed', '조제됨'),
        ('administered', '투여됨'),
        ('cancelled', '취소됨'),
    ]
    
    prescription_id = models.AutoField(primary_key=True)
    visit = models.ForeignKey(Visit, on_delete=models.CASCADE, related_name='prescriptions')
    
    # 처방 내용
    prescription_type = models.CharField(max_length=20, choices=PRESCRIPTION_TYPE_CHOICES)
    drug_code = models.CharField(max_length=50, null=True, blank=True,
                               help_text="약물 코드")
    drug_name = models.CharField(max_length=200)
    
    # 용법·용량
    dosage = models.CharField(max_length=100, null=True, blank=True,
                            help_text="1회 투여량")
    frequency = models.CharField(max_length=100, null=True, blank=True,
                               help_text="투여 횟수 (예: TID, BID)")
    duration = models.CharField(max_length=100, null=True, blank=True,
                              help_text="투여 기간")
    route = models.CharField(max_length=50, null=True, blank=True,
                           help_text="투여 경로 (PO, IV, IM 등)")
    
    # 처방 지시사항
    instructions = models.TextField(null=True, blank=True,
                                  help_text="복용법 및 주의사항")
    
    # 상태 관리
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, 
                            default='prescribed')
    
    # AI 지원 정보
    ai_suggested = models.BooleanField(default=False)
    drug_interaction_warning = models.TextField(null=True, blank=True,
                                              help_text="약물 상호작용 경고")
    allergy_warning = models.TextField(null=True, blank=True,
                                     help_text="알레르기 경고")
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=50)
    
    class Meta:
        db_table = 'medical_prescription'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.drug_name} - {self.dosage}"


class LaboratoryOrder(models.Model):
    """검사 오더 (LIS 연동)"""
    
    ORDER_STATUS_CHOICES = [
        ('ordered', '오더됨'),
        ('sample_collected', '검체 채취'),
        ('in_progress', '검사 중'),
        ('completed', '완료'),
        ('cancelled', '취소'),
    ]
    
    order_id = models.AutoField(primary_key=True)
    visit = models.ForeignKey(Visit, on_delete=models.CASCADE, related_name='lab_orders')
    
    # 검사 정보
    test_panel = models.CharField(max_length=100, 
                                help_text="검사 패널명 (CBC, LFT 등)")
    test_codes = models.JSONField(help_text="개별 검사 코드 목록")
    
    # 오더 상태
    status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, 
                            default='ordered')
    
    # LIS 연동 정보
    lis_order_id = models.CharField(max_length=100, null=True, blank=True)
    sample_id = models.CharField(max_length=100, null=True, blank=True)
    
    # 임상 정보
    clinical_info = models.TextField(null=True, blank=True,
                                   help_text="검사 의뢰 시 임상 정보")
    urgency = models.CharField(max_length=20, 
                             choices=[('routine', '일반'), ('urgent', '응급'), ('stat', 'STAT')],
                             default='routine')
    
    ordered_at = models.DateTimeField(default=timezone.now)
    ordered_by = models.CharField(max_length=50)
    
    class Meta:
        db_table = 'medical_lab_order'
        ordering = ['-ordered_at']
    
    def __str__(self):
        return f"{self.test_panel} - {self.status}"


class ImagingOrder(models.Model):
    """영상 검사 오더 (RIS/PACS 연동)"""
    
    ORDER_STATUS_CHOICES = [
        ('ordered', '오더됨'),
        ('scheduled', '예약됨'),
        ('in_progress', '촬영 중'),
        ('completed', '완료'),
        ('read', '판독 완료'),
        ('cancelled', '취소'),
    ]
    
    MODALITY_CHOICES = [
        ('CR', 'X-Ray'),
        ('CT', 'CT'),
        ('MR', 'MRI'),
        ('US', '초음파'),
        ('NM', '핵의학'),
        ('PT', 'PET'),
        ('MG', '유방촬영'),
    ]
    
    order_id = models.AutoField(primary_key=True)
    visit = models.ForeignKey(Visit, on_delete=models.CASCADE, related_name='imaging_orders')
    
    # 영상 검사 정보
    modality = models.CharField(max_length=10, choices=MODALITY_CHOICES)
    body_part = models.CharField(max_length=100)
    study_description = models.CharField(max_length=200)
    
    # 오더 상태
    status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, 
                            default='ordered')
    
    # PACS 연동 정보
    study_uid = models.CharField(max_length=255, null=True, blank=True,
                               help_text="DICOM StudyInstanceUID")
    accession_number = models.CharField(max_length=100, null=True, blank=True)
    
    # 임상 정보
    clinical_info = models.TextField(null=True, blank=True,
                                   help_text="영상 검사 의뢰 시 임상 정보")
    urgency = models.CharField(max_length=20, 
                             choices=[('routine', '일반'), ('urgent', '응급'), ('stat', 'STAT')],
                             default='routine')
    
    ordered_at = models.DateTimeField(default=timezone.now)
    ordered_by = models.CharField(max_length=50)
    
    # 판독 정보
    read_at = models.DateTimeField(null=True, blank=True)
    read_by = models.CharField(max_length=50, null=True, blank=True)
    findings = models.TextField(null=True, blank=True, help_text="영상 소견")
    impression = models.TextField(null=True, blank=True, help_text="판독 소견")
    
    class Meta:
        db_table = 'medical_imaging_order'
        ordering = ['-ordered_at']
    
    def __str__(self):
        return f"{self.modality} {self.body_part} - {self.status}"


class VitalSigns(models.Model):
    """활력징후"""
    
    vital_id = models.AutoField(primary_key=True)
    visit = models.ForeignKey(Visit, on_delete=models.CASCADE, related_name='vital_signs')
    
    # 활력징후 측정값
    systolic_bp = models.IntegerField(null=True, blank=True, help_text="수축기 혈압")
    diastolic_bp = models.IntegerField(null=True, blank=True, help_text="이완기 혈압")
    heart_rate = models.IntegerField(null=True, blank=True, help_text="맥박")
    respiratory_rate = models.IntegerField(null=True, blank=True, help_text="호흡수")
    temperature = models.FloatField(null=True, blank=True, help_text="체온")
    spo2 = models.IntegerField(null=True, blank=True, help_text="산소포화도")
    
    # 신체 계측
    weight = models.FloatField(null=True, blank=True, help_text="체중 (kg)")
    height = models.FloatField(null=True, blank=True, help_text="신장 (cm)")
    bmi = models.FloatField(null=True, blank=True, help_text="BMI (자동계산)")
    
    measured_at = models.DateTimeField(default=timezone.now)
    measured_by = models.CharField(max_length=50)
    
    class Meta:
        db_table = 'medical_vital_signs'
        ordering = ['-measured_at']
    
    def save(self, *args, **kwargs):
        # BMI 자동 계산
        if self.weight and self.height:
            height_m = self.height / 100
            self.bmi = round(self.weight / (height_m ** 2), 1)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"VS {self.visit.patient_identifier} - {self.measured_at.strftime('%Y-%m-%d %H:%M')}"


class ClinicalNote(models.Model):
    """임상 기록"""
    
    NOTE_TYPE_CHOICES = [
        ('soap', 'SOAP 노트'),
        ('progress', '경과 기록'),
        ('consultation', '협진 의견'),
        ('discharge', '퇴원 요약'),
        ('procedure', '시술 기록'),
    ]
    
    note_id = models.AutoField(primary_key=True)
    visit = models.ForeignKey(Visit, on_delete=models.CASCADE, related_name='clinical_notes')
    
    note_type = models.CharField(max_length=20, choices=NOTE_TYPE_CHOICES)
    title = models.CharField(max_length=200, null=True, blank=True)
    content = models.TextField(help_text="임상 기록 내용")
    
    # STT 연동
    is_voice_recorded = models.BooleanField(default=False)
    voice_file_path = models.CharField(max_length=500, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=50)
    
    class Meta:
        db_table = 'medical_clinical_note'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_note_type_display()} - {self.created_at.strftime('%Y-%m-%d')}"