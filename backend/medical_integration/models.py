# backend/medical_integration/models.py (PatientMapping 모델 수정)

from django.db import models
from django.utils import timezone
import json
import logging

logger = logging.getLogger('medical_integration')

class PatientMapping(models.Model):
    """🔥 수정: OpenMRS patient_identifier와 Orthanc 환자 ID 간의 매핑"""
    SYNC_STATUS_CHOICES = [
        ('PENDING', '대기중'),
        ('SYNCED', '동기화됨'),
        ('ERROR', '오류'),
        ('AUTO_MAPPED', '자동매핑됨'),
        ('MANUAL_MAPPED', '수동매핑됨'),
        ('IDENTIFIER_MATCHED', 'Patient ID 매칭됨'),  # 🔥 추가
    ]

    MAPPING_TYPE_CHOICES = [
        ('AUTO', '자동'),
        ('MANUAL', '수동'),
        ('BATCH', '일괄'),
        ('IDENTIFIER_BASED', 'Patient ID 기반'),  # 🔥 추가
    ]

    mapping_id = models.AutoField(primary_key=True)
    
    # 외래키 대신 문자열 ID로 저장
    orthanc_patient_id = models.CharField(
        max_length=255, 
        verbose_name='Orthanc 환자 PublicId',
        db_index=True
    )
    openmrs_patient_uuid = models.CharField(
        max_length=38, 
        verbose_name='OpenMRS 환자 UUID',
        db_index=True
    )
    
    # 🔥 핵심 추가: Patient Identifier 필드
    patient_identifier = models.CharField(
        max_length=255,
        verbose_name='Patient Identifier (DICOM Patient ID)',
        db_index=True,
        null=True,
        blank=True,
        help_text='DICOM Patient ID 또는 OpenMRS Patient Identifier'
    )
    
    # 매핑 타입 및 상태
    mapping_type = models.CharField(
        max_length=20,  # 🔥 길이 증가
        choices=MAPPING_TYPE_CHOICES,
        default='MANUAL',
        verbose_name='매핑 타입'
    )
    sync_status = models.CharField(
        max_length=20,
        choices=SYNC_STATUS_CHOICES,
        default='PENDING'
    )
    
    # 매핑 신뢰도 (자동 매핑 시)
    confidence_score = models.FloatField(
        null=True, 
        blank=True,
        help_text='자동 매핑 신뢰도 (0.0-1.0)'
    )
    
    # 매핑 근거 정보
    mapping_criteria = models.JSONField(
        null=True, 
        blank=True,
        help_text='매핑에 사용된 기준 정보 (JSON)'
    )
    
    # 메타데이터
    created_date = models.DateTimeField(auto_now_add=True)
    last_sync = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    error_message = models.TextField(null=True, blank=True)
    
    # 추가 정보
    created_by = models.CharField(
        max_length=100, 
        null=True, 
        blank=True,
        help_text='매핑을 생성한 사용자 또는 시스템'
    )
    notes = models.TextField(
        null=True, 
        blank=True,
        help_text='매핑에 대한 추가 메모'
    )

    class Meta:
        db_table = 'patient_mapping'
        unique_together = [
            ('orthanc_patient_id', 'openmrs_patient_uuid'),
        ]
        indexes = [
            models.Index(fields=['orthanc_patient_id']),
            models.Index(fields=['openmrs_patient_uuid']),
            models.Index(fields=['patient_identifier']),  # 🔥 추가
            models.Index(fields=['created_date']),
            models.Index(fields=['last_sync']),
            models.Index(fields=['sync_status']),
            models.Index(fields=['mapping_type']),
            models.Index(fields=['confidence_score']),
        ]

    def __str__(self):
        identifier_info = f" (ID: {self.patient_identifier})" if self.patient_identifier else ""
        return f"매핑({self.mapping_type}): Orthanc {self.orthanc_patient_id} -> OpenMRS {self.openmrs_patient_uuid}{identifier_info}"

    def update_sync_time(self, status='SYNCED', error_message=None, confidence_score=None):
        """동기화 상태 및 시간 업데이트"""
        self.last_sync = timezone.now()
        self.sync_status = status
        self.error_message = error_message
        if confidence_score is not None:
            self.confidence_score = confidence_score
        self.save(update_fields=['last_sync', 'sync_status', 'error_message', 'confidence_score'])

    def set_mapping_criteria(self, criteria_dict):
        """매핑 기준 정보 설정"""
        self.mapping_criteria = criteria_dict
        self.save(update_fields=['mapping_criteria'])

    def get_mapping_criteria_display(self):
        """🔥 수정: patient_identifier 기반 매핑 기준 정보 표시"""
        if not self.mapping_criteria:
            return "기준 정보 없음"
        
        try:
            criteria = self.mapping_criteria if isinstance(self.mapping_criteria, dict) else json.loads(self.mapping_criteria)
            display_parts = []
            
            # 🔥 Patient Identifier 매칭 우선 표시
            if criteria.get('matched_by_identifier') or criteria.get('dicom_patient_identifier'):
                display_parts.append(f"Patient ID 일치 ({criteria.get('dicom_patient_identifier', 'N/A')})")
            
            if criteria.get('matched_by_name'):
                display_parts.append(f"이름 일치 ({criteria.get('name_similarity', 0):.2f})")
            if criteria.get('matched_by_birth_date'):
                display_parts.append("생년월일 일치")
            if criteria.get('matched_by_gender'):
                display_parts.append("성별 일치")
            
            # 매핑 방법 표시
            if criteria.get('mapping_method'):
                display_parts.append(f"방법: {criteria.get('mapping_method')}")
            
            return ", ".join(display_parts) if display_parts else "기타 기준"
        except:
            return "기준 정보 파싱 오류"

    @classmethod
    def get_active_mappings(cls):
        """활성화된 매핑만 조회"""
        return cls.objects.filter(is_active=True)

    @classmethod
    def get_identifier_based_mappings(cls):
        """🔥 추가: Patient Identifier 기반 매핑만 조회"""
        return cls.objects.filter(
            mapping_type='IDENTIFIER_BASED',
            is_active=True
        ).exclude(patient_identifier__isnull=True)

    @classmethod
    def find_by_orthanc_id(cls, orthanc_id):
        """Orthanc Patient ID로 매핑 찾기"""
        return cls.objects.filter(
            orthanc_patient_id=orthanc_id, 
            is_active=True
        ).first()

    @classmethod
    def find_by_openmrs_uuid(cls, openmrs_uuid):
        """OpenMRS Patient UUID로 매핑 찾기"""
        return cls.objects.filter(
            openmrs_patient_uuid=openmrs_uuid, 
            is_active=True
        ).first()

    @classmethod
    def find_by_patient_identifier(cls, patient_identifier):
        """🔥 추가: Patient Identifier로 매핑 찾기"""
        return cls.objects.filter(
            patient_identifier=patient_identifier,
            is_active=True
        ).first()

    def get_orthanc_patient_info(self):
        """Orthanc 환자 정보 조회"""
        try:
            from .orthanc_api import OrthancAPI
            api = OrthancAPI()
            return api.get_patient(self.orthanc_patient_id)
        except Exception as e:
            logger.error(f"Orthanc 환자 정보 조회 실패: {e}")
            return None

    def get_openmrs_patient_info(self):
        """OpenMRS 환자 정보 조회"""
        try:
            from .openmrs_api import OpenMRSAPI
            api = OpenMRSAPI()
            return api.get_patient(self.openmrs_patient_uuid)
        except Exception as e:
            logger.error(f"OpenMRS 환자 정보 조회 실패: {e}")
            return None

    def validate_mapping(self):
        """🔥 수정: patient_identifier 포함 매핑 검증"""
        errors = []
        
        # Orthanc 환자 존재 확인
        orthanc_info = self.get_orthanc_patient_info()
        if not orthanc_info:
            errors.append(f"Orthanc 환자를 찾을 수 없습니다: {self.orthanc_patient_id}")
        
        # OpenMRS 환자 존재 확인
        openmrs_info = self.get_openmrs_patient_info()
        if not openmrs_info:
            errors.append(f"OpenMRS 환자를 찾을 수 없습니다: {self.openmrs_patient_uuid}")
        
        # 🔥 Patient Identifier 일치성 확인
        if self.patient_identifier and orthanc_info and openmrs_info:
            # Orthanc의 Patient ID 확인
            orthanc_patient_id = orthanc_info.get('MainDicomTags', {}).get('PatientID', '')
            if orthanc_patient_id != self.patient_identifier:
                errors.append(f"Orthanc Patient ID 불일치: {orthanc_patient_id} != {self.patient_identifier}")
            
            # OpenMRS의 patient_identifier 확인
            from .openmrs_api import OpenMRSAPI
            api = OpenMRSAPI()
            patient_by_identifier = api.get_patient_by_identifier(self.patient_identifier)
            if not patient_by_identifier or patient_by_identifier.get('uuid') != self.openmrs_patient_uuid:
                errors.append(f"OpenMRS Patient Identifier 불일치: {self.patient_identifier}")
        
        return errors

    def get_mapping_summary(self):
        """🔥 수정: patient_identifier 포함 매핑 요약 정보"""
        return {
            'mapping_id': self.mapping_id,
            'orthanc_patient_id': self.orthanc_patient_id,
            'openmrs_patient_uuid': self.openmrs_patient_uuid,
            'patient_identifier': self.patient_identifier,  # 🔥 추가
            'mapping_type': self.get_mapping_type_display(),
            'sync_status': self.get_sync_status_display(),
            'confidence_score': self.confidence_score,
            'mapping_criteria': self.get_mapping_criteria_display(),
            'dicom_studies_count': self.get_dicom_studies_count(),
            'created_date': self.created_date.isoformat() if self.created_date else None,
            'last_sync': self.last_sync.isoformat() if self.last_sync else None,
            'created_by': self.created_by,
            'notes': self.notes
        }

    @classmethod
    def create_identifier_based_mapping(cls, orthanc_patient_id, openmrs_patient_uuid, 
                                      patient_identifier, confidence_score=None, 
                                      criteria=None, created_by='identifier_mapper'):
        """🔥 추가: Patient Identifier 기반 매핑 생성"""
        try:
            mapping = cls.objects.create(
                orthanc_patient_id=orthanc_patient_id,
                openmrs_patient_uuid=openmrs_patient_uuid,
                patient_identifier=patient_identifier,
                mapping_type='IDENTIFIER_BASED',
                sync_status='IDENTIFIER_MATCHED',
                confidence_score=confidence_score or 0.9,  # identifier 매칭은 높은 신뢰도
                mapping_criteria=criteria,
                created_by=created_by
            )
            logger.info(f"Patient Identifier 기반 매핑 생성: {mapping}")
            return mapping
        except Exception as e:
            logger.error(f"Patient Identifier 기반 매핑 생성 실패: {e}")
            return None

    @classmethod
    def get_mapping_statistics(cls):
        """🔥 수정: patient_identifier 기반 통계 포함"""
        from django.db.models import Count, Avg
        
        stats = cls.objects.filter(is_active=True).aggregate(
            total_mappings=Count('mapping_id'),
            auto_mappings=Count('mapping_id', filter=models.Q(mapping_type='AUTO')),
            manual_mappings=Count('mapping_id', filter=models.Q(mapping_type='MANUAL')),
            identifier_mappings=Count('mapping_id', filter=models.Q(mapping_type='IDENTIFIER_BASED')),  # 🔥 추가
            avg_confidence=Avg('confidence_score', filter=models.Q(mapping_type__in=['AUTO', 'IDENTIFIER_BASED']))
        )
        
        # 상태별 통계
        status_stats = dict(
            cls.objects.filter(is_active=True)
            .values('sync_status')
            .annotate(count=Count('mapping_id'))
            .values_list('sync_status', 'count')
        )
        
        return {
            'total_mappings': stats['total_mappings'] or 0,
            'auto_mappings': stats['auto_mappings'] or 0,
            'manual_mappings': stats['manual_mappings'] or 0,
            'identifier_mappings': stats['identifier_mappings'] or 0,  # 🔥 추가
            'average_confidence': round(stats['avg_confidence'] or 0, 3),
            'status_breakdown': status_stats
        }
        

from django.db import models

class Person(models.Model):
    uuid = models.CharField(max_length=38, primary_key=True)
    gender = models.CharField(max_length=1, null=True, blank=True)
    birthdate = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.uuid}"


class Provider(models.Model):
    uuid = models.CharField(max_length=38, primary_key=True)
    identifier = models.CharField(max_length=255)
    person = models.ForeignKey(Person, on_delete=models.SET_NULL, null=True, related_name='providers')
    retired = models.BooleanField(default=False)

    def __str__(self):
        return self.identifier
