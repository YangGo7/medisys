from django.db import models
from django.utils import timezone


class PatientMapping(models.Model):
    """OpenMRS와 Orthanc 환자 ID 간의 매핑"""
    SYNC_STATUS_CHOICES = [
        ('PENDING', '대기중'),
        ('SYNCED', '동기화됨'),
        ('ERROR', '오류'),
    ]

    mapping_id = models.AutoField(primary_key=True)
    
    # 외래키 대신 문자열 ID로 저장 (다른 DB 테이블이므로)
    orthanc_patient_id = models.CharField(
        max_length=255, 
        verbose_name='Orthanc 환자 PublicId'
    )
    openmrs_patient_uuid = models.CharField(
        max_length=38, 
        verbose_name='OpenMRS 환자 UUID'
    )
    
    # 메타데이터
    created_date = models.DateTimeField(auto_now_add=True)
    last_sync = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    sync_status = models.CharField(
        max_length=20,
        choices=SYNC_STATUS_CHOICES,
        default='PENDING'
    )
    error_message = models.TextField(null=True, blank=True)

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
        ]

    def __str__(self):
        return f"매핑: Orthanc {self.orthanc_patient_id} -> OpenMRS {self.openmrs_patient_uuid}"

    def update_sync_time(self, status='SYNCED', error_message=None):
        """동기화 상태 및 시간 업데이트"""
        self.last_sync = timezone.now()
        self.sync_status = status
        self.error_message = error_message
        self.save(update_fields=['last_sync', 'sync_status', 'error_message'])

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
        from .orthanc_api import OrthancAPI
        api = OrthancAPI()
        return api.get_patient(self.orthanc_patient_id)

    def get_openmrs_patient_info(self):
        """OpenMRS 환자 정보 조회"""
        from .openmrs_api import OpenMRSAPI
        api = OpenMRSAPI()
        return api.get_patient(self.openmrs_patient_uuid)

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