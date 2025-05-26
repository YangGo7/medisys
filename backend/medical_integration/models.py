# backend/medical_integration/models.py

from django.db import models

class PatientMapping(models.Model):
    """OpenMRS와 Orthanc 환자 ID 간의 매핑"""
    mapping_id = models.AutoField(primary_key=True)
    orthanc_patient_id = models.CharField(max_length=255, unique=True)
    openmrs_patient_id = models.IntegerField(unique=True)
    created_date = models.DateTimeField(auto_now_add=True)
    last_sync = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"매핑: Orthanc {self.orthanc_patient_id} -> OpenMRS {self.openmrs_patient_id}"

    def update_sync_time(self):
        """동기화 시간 업데이트"""
        self.last_sync = timezone.now()
        self.save()