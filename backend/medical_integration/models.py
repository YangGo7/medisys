# backend/medical_integration/models.py (업데이트)

from django.db import models
from django.utils import timezone
import json
import logging

logger = logging.getLogger('medical_integration')

class PatientMapping(models.Model):
    """OpenMRS와 Orthanc 환자 ID 간의 매핑 (향상된 버전)"""
    SYNC_STATUS_CHOICES = [
        ('PENDING', '대기중'),
        ('SYNCED', '동기화됨'),
        ('ERROR', '오류'),
        ('AUTO_MAPPED', '자동매핑됨'),
        ('MANUAL_MAPPED', '수동매핑됨'),
    ]

    MAPPING_TYPE_CHOICES = [
        ('AUTO', '자동'),
        ('MANUAL', '수동'),
        ('BATCH', '일괄'),
    ]

    mapping_id = models.AutoField(primary_key=True)
    
    # 외래키 대신 문자열 ID로 저장 (다른 DB 테이블이므로)
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
    
    # 매핑 타입 및 상태
    mapping_type = models.CharField(
        max_length=10,
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
            models.Index(fields=['created_date']),
            models.Index(fields=['last_sync']),
            models.Index(fields=['sync_status']),
            models.Index(fields=['mapping_type']),
            models.Index(fields=['confidence_score']),
        ]

    def __str__(self):
        return f"매핑({self.mapping_type}): Orthanc {self.orthanc_patient_id} -> OpenMRS {self.openmrs_patient_uuid}"

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
        """매핑 기준 정보를 읽기 쉬운 형태로 반환"""
        if not self.mapping_criteria:
            return "기준 정보 없음"
        
        try:
            criteria = self.mapping_criteria if isinstance(self.mapping_criteria, dict) else json.loads(self.mapping_criteria)
            display_parts = []
            
            if criteria.get('matched_by_patient_id'):
                display_parts.append("환자ID 일치")
            if criteria.get('matched_by_name'):
                display_parts.append(f"이름 일치 ({criteria.get('name_similarity', 0):.2f})")
            if criteria.get('matched_by_birth_date'):
                display_parts.append("생년월일 일치")
            if criteria.get('matched_by_gender'):
                display_parts.append("성별 일치")
            
            return ", ".join(display_parts) if display_parts else "기타 기준"
        except:
            return "기준 정보 파싱 오류"

    @classmethod
    def get_active_mappings(cls):
        """활성화된 매핑만 조회"""
        return cls.objects.filter(is_active=True)

    @classmethod
    def get_pending_mappings(cls):
        """대기 중인 매핑만 조회"""
        return cls.objects.filter(sync_status='PENDING', is_active=True)

    @classmethod
    def get_error_mappings(cls):
        """오류 상태의 매핑만 조회"""
        return cls.objects.filter(sync_status='ERROR', is_active=True)

    @classmethod
    def get_auto_mappings(cls):
        """자동 생성된 매핑만 조회"""
        return cls.objects.filter(mapping_type='AUTO', is_active=True)

    @classmethod
    def get_high_confidence_mappings(cls, threshold=0.8):
        """높은 신뢰도의 매핑만 조회"""
        return cls.objects.filter(
            mapping_type='AUTO',
            confidence_score__gte=threshold,
            is_active=True
        )

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
        """매핑된 환자들이 실제로 존재하는지 검증"""
        errors = []
        
        # Orthanc 환자 존재 확인
        orthanc_info = self.get_orthanc_patient_info()
        if not orthanc_info:
            errors.append(f"Orthanc 환자를 찾을 수 없습니다: {self.orthanc_patient_id}")
        
        # OpenMRS 환자 존재 확인
        openmrs_info = self.get_openmrs_patient_info()
        if not openmrs_info:
            errors.append(f"OpenMRS 환자를 찾을 수 없습니다: {self.openmrs_patient_uuid}")
        
        return errors

    def get_dicom_studies_count(self):
        """연결된 DICOM Study 수 조회"""
        try:
            from .orthanc_api import OrthancAPI
            api = OrthancAPI()
            studies = api.get_patient_studies(self.orthanc_patient_id)
            return len(studies) if studies else 0
        except Exception as e:
            logger.error(f"DICOM Study 수 조회 실패: {e}")
            return 0

    def get_mapping_summary(self):
        """매핑 요약 정보 반환"""
        return {
            'mapping_id': self.mapping_id,
            'orthanc_patient_id': self.orthanc_patient_id,
            'openmrs_patient_uuid': self.openmrs_patient_uuid,
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
    def create_auto_mapping(cls, orthanc_patient_id, openmrs_patient_uuid, 
                           confidence_score=None, criteria=None, created_by='auto_system'):
        """자동 매핑 생성 헬퍼 메서드"""
        try:
            mapping = cls.objects.create(
                orthanc_patient_id=orthanc_patient_id,
                openmrs_patient_uuid=openmrs_patient_uuid,
                mapping_type='AUTO',
                sync_status='AUTO_MAPPED',
                confidence_score=confidence_score,
                mapping_criteria=criteria,
                created_by=created_by
            )
            logger.info(f"자동 매핑 생성됨: {mapping}")
            return mapping
        except Exception as e:
            logger.error(f"자동 매핑 생성 실패: {e}")
            return None

    @classmethod
    def create_manual_mapping(cls, orthanc_patient_id, openmrs_patient_uuid, 
                             created_by='manual_user', notes=None):
        """수동 매핑 생성 헬퍼 메서드"""
        try:
            mapping = cls.objects.create(
                orthanc_patient_id=orthanc_patient_id,
                openmrs_patient_uuid=openmrs_patient_uuid,
                mapping_type='MANUAL',
                sync_status='MANUAL_MAPPED',
                created_by=created_by,
                notes=notes
            )
            logger.info(f"수동 매핑 생성됨: {mapping}")
            return mapping
        except Exception as e:
            logger.error(f"수동 매핑 생성 실패: {e}")
            return None

    @classmethod
    def get_mapping_statistics(cls):
        """매핑 통계 정보 반환"""
        from django.db.models import Count, Avg
        
        stats = cls.objects.filter(is_active=True).aggregate(
            total_mappings=Count('mapping_id'),
            auto_mappings=Count('mapping_id', filter=models.Q(mapping_type='AUTO')),
            manual_mappings=Count('mapping_id', filter=models.Q(mapping_type='MANUAL')),
            avg_confidence=Avg('confidence_score', filter=models.Q(mapping_type='AUTO'))
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
            'average_confidence': round(stats['avg_confidence'] or 0, 3),
            'status_breakdown': status_stats
        }