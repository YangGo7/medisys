# backend/openmrs_models/models.py

from django.db import models

class Person(models.Model):
    """OpenMRS Person 모델"""
    person_id = models.AutoField(primary_key=True)
    gender = models.CharField(max_length=50)
    birthdate = models.DateField(null=True, blank=True)
    birthdate_estimated = models.BooleanField(default=False)
    dead = models.BooleanField(default=False)
    death_date = models.DateField(null=True, blank=True)
    cause_of_death = models.IntegerField(null=True)
    creator = models.IntegerField()
    date_created = models.DateTimeField()
    changed_by = models.IntegerField(null=True, blank=True)
    date_changed = models.DateTimeField(null=True, blank=True)
    voided = models.BooleanField(default=False)
    voided_by = models.IntegerField(null=True, blank=True)
    date_voided = models.DateTimeField(null=True, blank=True)
    void_reason = models.CharField(max_length=255, null=True, blank=True)
    uuid = models.CharField(max_length=38, unique=True)

    class Meta:
        db_table = 'person'
        managed = False
        app_label = 'openmrs_models'

    def __str__(self):
        return f"Person {self.person_id} ({self.uuid})"

class PersonName(models.Model):
    """OpenMRS PersonName 모델"""
    person_name_id = models.AutoField(primary_key=True)
    preferred = models.BooleanField(default=False)
    person = models.ForeignKey(Person, on_delete=models.CASCADE)
    prefix = models.CharField(max_length=50, null=True)
    given_name = models.CharField(max_length=50)
    middle_name = models.CharField(max_length=50, null=True, blank=True)
    family_name = models.CharField(max_length=50)
    family_name2 = models.CharField(max_length=50, null=True)
    family_name_suffix = models.CharField(max_length=50, null=True)
    creator = models.IntegerField()
    date_created = models.DateTimeField()
    voided = models.BooleanField(default=False)
    voided_by = models.IntegerField(null=True, blank=True)
    date_voided = models.DateTimeField(null=True, blank=True)
    void_reason = models.CharField(max_length=255, null=True, blank=True)
    changed_by = models.IntegerField(null=True, blank=True)
    date_changed = models.DateTimeField(null=True, blank=True)
    uuid = models.CharField(max_length=38, unique=True)

    class Meta:
        db_table = 'person_name'
        managed = False
        app_label = 'openmrs_models'

    def __str__(self):
        return f"{self.given_name} {self.family_name}"

    def get_full_name(self):
        """전체 이름을 반환"""
        name_parts = []
        if self.prefix:
            name_parts.append(self.prefix)
        name_parts.append(self.given_name)
        if self.middle_name:
            name_parts.append(self.middle_name)
        name_parts.append(self.family_name)
        if self.family_name2:
            name_parts.append(self.family_name2)
        if self.family_name_suffix:
            name_parts.append(self.family_name_suffix)
        return ' '.join(name_parts)

class Patient(models.Model):
    """OpenMRS Patient 모델"""
    patient_id = models.OneToOneField(Person, on_delete=models.CASCADE, primary_key=True, db_column='patient_id')
    creator = models.IntegerField()
    date_created = models.DateTimeField()
    changed_by = models.IntegerField(null=True, blank=True)
    date_changed = models.DateTimeField(null=True, blank=True)
    voided = models.BooleanField(default=False)
    voided_by = models.IntegerField(null=True, blank=True)
    date_voided = models.DateTimeField(null=True, blank=True)
    void_reason = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = 'patient'
        managed = False
        app_label = 'openmrs_models'

    def __str__(self):
        return f"Patient {self.patient_id}"

    def get_active_name(self):
        """환자의 활성화된 이름을 반환"""
        return PersonName.objects.filter(
            person=self.patient_id,
            voided=False,
            preferred=True
        ).first() or PersonName.objects.filter(
            person=self.patient_id,
            voided=False
        ).first()

class PatientIdentifier(models.Model):
    patient_identifier_id = models.AutoField(primary_key=True)
    patient = models.ForeignKey(Patient, on_delete=models.DO_NOTHING)
    identifier = models.CharField(max_length=50)
    identifier_type = models.IntegerField()
    preferred = models.BooleanField(default=False)
    location_id = models.IntegerField(null=True, blank=True)
    creator = models.IntegerField()
    date_created = models.DateTimeField()
    voided = models.BooleanField(default=False)
    voided_by = models.IntegerField(null=True, blank=True)
    date_voided = models.DateTimeField(null=True, blank=True)
    void_reason = models.CharField(max_length=255, null=True, blank=True)
    uuid = models.CharField(max_length=38, unique=True)

    class Meta:
        managed = False
        db_table = 'patient_identifier'
        app_label = 'openmrs_models'

class Encounter(models.Model):
    encounter_id = models.AutoField(primary_key=True)
    encounter_type = models.IntegerField()
    patient = models.ForeignKey(Patient, on_delete=models.DO_NOTHING)
    location_id = models.IntegerField(null=True, blank=True)
    form_id = models.IntegerField(null=True, blank=True)
    encounter_datetime = models.DateTimeField()
    creator = models.IntegerField()
    date_created = models.DateTimeField()
    voided = models.BooleanField(default=False)
    voided_by = models.IntegerField(null=True, blank=True)
    date_voided = models.DateTimeField(null=True, blank=True)
    void_reason = models.CharField(max_length=255, null=True, blank=True)
    changed_by = models.IntegerField(null=True, blank=True)
    date_changed = models.DateTimeField(null=True, blank=True)
    visit_id = models.IntegerField(null=True, blank=True)
    uuid = models.CharField(max_length=38, unique=True)

    class Meta:
        managed = False
        db_table = 'encounter'
        app_label = 'openmrs_models'


# openmrs_models/models.py - SOAP 진단 정보 저장 모델

from django.db import models
from django.utils import timezone
import uuid

class SoapDiagnosis(models.Model):
    """SOAP 형식 진단 정보 저장 모델 - OpenMRS Obs 기반"""
    
    SOAP_TYPE_CHOICES = [
        ('S', 'Subjective - 주관적 정보'),
        ('O', 'Objective - 객관적 정보'), 
        ('A', 'Assessment - 평가/진단'),
        ('P', 'Plan - 치료계획'),
    ]
    
    DIAGNOSIS_TYPE_CHOICES = [
        ('PRIMARY', '주진단'),
        ('SECONDARY', '부진단'),
        ('PROVISIONAL', '잠정진단'),
        ('DIFFERENTIAL', '감별진단'),
    ]
    
    # 기본 식별자
    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient_uuid = models.CharField(max_length=38, db_index=True, help_text="OpenMRS Patient UUID")
    encounter_uuid = models.CharField(max_length=38, db_index=True, help_text="OpenMRS Encounter UUID")
    
    # SOAP 분류
    soap_type = models.CharField(max_length=1, choices=SOAP_TYPE_CHOICES)
    sequence_number = models.IntegerField(default=1, help_text="같은 SOAP 타입 내 순서")
    
    # 진단 정보
    diagnosis_type = models.CharField(max_length=20, choices=DIAGNOSIS_TYPE_CHOICES, null=True, blank=True)
    icd10_code = models.CharField(max_length=10, null=True, blank=True, help_text="ICD-10 코드")
    icd10_name = models.CharField(max_length=255, null=True, blank=True, help_text="ICD-10 진단명")
    
    # 상세 내용
    content = models.TextField(help_text="SOAP 상세 내용")
    clinical_notes = models.TextField(null=True, blank=True, help_text="임상 메모")
    
    # OpenMRS 연동 정보
    concept_uuid = models.CharField(max_length=38, null=True, blank=True, help_text="OpenMRS Concept UUID")
    obs_uuid = models.CharField(max_length=38, null=True, blank=True, help_text="저장된 OpenMRS Obs UUID")
    
    # 의료영상 연동
    study_instance_uid = models.CharField(max_length=255, null=True, blank=True, help_text="DICOM Study UID")
    series_instance_uid = models.CharField(max_length=255, null=True, blank=True, help_text="DICOM Series UID")
    image_annotations = models.JSONField(null=True, blank=True, help_text="영상 주석 정보")
    
    # 메타데이터
    doctor_uuid = models.CharField(max_length=38, help_text="진단한 의사 UUID")
    created_date = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'soap_diagnosis'
        ordering = ['created_date', 'soap_type', 'sequence_number']
        indexes = [
            models.Index(fields=['patient_uuid', 'encounter_uuid']),
            models.Index(fields=['icd10_code']),
            models.Index(fields=['soap_type', 'sequence_number']),
        ]
    
    def __str__(self):
        return f"{self.get_soap_type_display()}: {self.icd10_name or self.content[:50]}"

    def save_to_openmrs(self):
        """OpenMRS Obs로 저장"""
        from .openmrs_api import OpenMRSAPI
        
        api = OpenMRSAPI()
        
        # SOAP 타입별 Concept UUID 매핑
        soap_concepts = {
            'S': '160531AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',  # Subjective
            'O': '160532AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',  # Objective  
            'A': '159395AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',  # Assessment
            'P': '160533AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',  # Plan
        }
        
        obs_data = {
            'concept': soap_concepts.get(self.soap_type),
            'person': self.patient_uuid,
            'encounter': self.encounter_uuid,
            'value': self.content,
            'obsDatetime': self.created_date.isoformat(),
        }
        
        # ICD-10 코드가 있는 경우 추가 정보 저장
        if self.icd10_code:
            obs_data['comment'] = f"ICD-10: {self.icd10_code} - {self.icd10_name}"
        
        try:
            result = api.create_obs(obs_data)
            if result and 'uuid' in result:
                self.obs_uuid = result['uuid']
                self.save(update_fields=['obs_uuid'])
                return True
        except Exception as e:
            print(f"OpenMRS 저장 실패: {e}")
            return False
        
        return False


class PatientVisitHistory(models.Model):
    """환자 내원 이력 모델"""
    
    VISIT_STATUS_CHOICES = [
        ('SCHEDULED', '예약됨'),
        ('ARRIVED', '도착'),
        ('IN_PROGRESS', '진료중'),
        ('COMPLETED', '완료'),
        ('CANCELLED', '취소'),
        ('NO_SHOW', '미출석'),
    ]
    
    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient_uuid = models.CharField(max_length=38, db_index=True)
    visit_uuid = models.CharField(max_length=38, null=True, blank=True, help_text="OpenMRS Visit UUID")
    encounter_uuid = models.CharField(max_length=38, null=True, blank=True, help_text="OpenMRS Encounter UUID")
    
    # 방문 정보
    visit_date = models.DateTimeField(default=timezone.now)
    visit_type = models.CharField(max_length=50, default='OUTPATIENT')
    status = models.CharField(max_length=20, choices=VISIT_STATUS_CHOICES, default='SCHEDULED')
    
    # 진료 정보
    chief_complaint = models.TextField(null=True, blank=True, help_text="주요 증상")
    department = models.CharField(max_length=100, null=True, blank=True)
    doctor_uuid = models.CharField(max_length=38, null=True, blank=True)
    
    # 진단 요약
    primary_diagnosis = models.CharField(max_length=255, null=True, blank=True)
    secondary_diagnoses = models.JSONField(null=True, blank=True)
    
    # 처방 정보
    prescriptions = models.JSONField(null=True, blank=True)
    procedures = models.JSONField(null=True, blank=True)
    
    # 영상 검사
    imaging_studies = models.JSONField(null=True, blank=True, help_text="연관된 영상 검사 목록")
    
    # 메타데이터
    created_date = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'patient_visit_history'
        ordering = ['-visit_date']
    
    def __str__(self):
        return f"Visit {self.visit_date.strftime('%Y-%m-%d')} - {self.primary_diagnosis or 'No diagnosis'}"
    
    def get_soap_diagnoses(self):
        """해당 방문의 모든 SOAP 진단 정보 조회"""
        return SoapDiagnosis.objects.filter(
            patient_uuid=self.patient_uuid,
            encounter_uuid=self.encounter_uuid,
            is_active=True
        ).order_by('soap_type', 'sequence_number')
    
    def get_diagnoses_by_soap_type(self, soap_type):
        """특정 SOAP 타입의 진단 정보만 조회"""
        return self.get_soap_diagnoses().filter(soap_type=soap_type)


class DiagnosisImageMapping(models.Model):
    """진단과 의료영상 매핑 모델"""
    
    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    soap_diagnosis = models.ForeignKey(SoapDiagnosis, on_delete=models.CASCADE, related_name='image_mappings')
    
    # DICOM 정보
    study_instance_uid = models.CharField(max_length=255, db_index=True)
    series_instance_uid = models.CharField(max_length=255, null=True, blank=True)
    sop_instance_uid = models.CharField(max_length=255, null=True, blank=True)
    
    # Orthanc 정보
    orthanc_study_id = models.CharField(max_length=255, null=True, blank=True)
    orthanc_series_id = models.CharField(max_length=255, null=True, blank=True)
    orthanc_instance_id = models.CharField(max_length=255, null=True, blank=True)
    
    # 주석 정보
    annotations = models.JSONField(null=True, blank=True, help_text="영상 주석 및 마킹")
    roi_coordinates = models.JSONField(null=True, blank=True, help_text="관심 영역 좌표")
    
    # 메타데이터
    created_date = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'diagnosis_image_mapping'
        unique_together = ['soap_diagnosis', 'study_instance_uid', 'series_instance_uid']
    
    def __str__(self):
        return f"Image mapping for {self.soap_diagnosis}"