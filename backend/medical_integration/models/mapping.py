from django.db import models
from django.utils import timezone
from medical_integration.models.patient import Patient
from medical_integration.models.orthanc import Resources

class PatientMapping(models.Model):
    """OpenMRS와 Orthanc 환자 ID 간의 매핑"""
    mapping_id = models.AutoField(primary_key=True)
    orthanc_patient = models.ForeignKey(
        Resources,
        on_delete=models.PROTECT,
        limit_choices_to={'resourceType': 0},  # Patient type only
        related_name='patient_mappings',
        db_constraint=False  # 다른 데이터베이스의 테이블이므로 제약 조건 비활성화
    )
    openmrs_patient = models.ForeignKey(
        Patient,
        on_delete=models.PROTECT,
        related_name='orthanc_mappings',
        db_constraint=False  # 다른 데이터베이스의 테이블이므로 제약 조건 비활성화
    )
    created_date = models.DateTimeField(auto_now_add=True)
    last_sync = models.DateTimeField(null=True)
    is_active = models.BooleanField(default=True)
    sync_status = models.CharField(
        max_length=20,
        choices=[
            ('SYNCED', '동기화됨'),
            ('PENDING', '대기중'),
            ('ERROR', '오류'),
        ],
        default='PENDING'
    )
    error_message = models.TextField(null=True)

    class Meta:
        db_table = 'patient_mapping'
        managed = True  # Django가 테이블을 관리
        unique_together = [
            ('orthanc_patient', 'openmrs_patient'),
        ]
        indexes = [
            models.Index(fields=['created_date']),
            models.Index(fields=['last_sync']),
            models.Index(fields=['sync_status']),
        ]

    def __str__(self):
        return f"매핑: Orthanc {self.orthanc_patient.publicId} -> OpenMRS {self.openmrs_patient.patient_id}"

    def save(self, *args, **kwargs):
        """저장 시 각 관련 모델의 데이터베이스에서 객체 존재 여부 확인"""
        # Orthanc 환자 확인
        if not Resources.objects.using('orthanc').filter(
            internalId=self.orthanc_patient.internalId,
            resourceType=0  # Patient type
        ).exists():
            raise Resources.DoesNotExist("Orthanc 환자를 찾을 수 없습니다.")

        # OpenMRS 환자 확인
        if not Patient.objects.using('openmrs').filter(
            patient_id=self.openmrs_patient.patient_id,
            voided=False
        ).exists():
            raise Patient.DoesNotExist("OpenMRS 환자를 찾을 수 없습니다.")

        super().save(*args, **kwargs)

    def update_sync_time(self, status='SYNCED', error_message=None):
        """동기화 상태 및 시간 업데이트"""
        self.last_sync = timezone.now()
        self.sync_status = status
        self.error_message = error_message
        self.save()

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