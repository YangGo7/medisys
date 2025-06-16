# backend/ocs/models.py
from django.db import models
import uuid

class OCSLog(models.Model):
    """
    실제 로그를 저장하는 모델
    """
    timestamp  = models.DateTimeField(auto_now_add=True)
    patient_id = models.UUIDField(null=True, blank=True)
    doctor_id  = models.UUIDField(null=True, blank=True)
    raw_data   = models.JSONField(help_text="요청 payload 전체")  # 형식 구애 없이 다 저장
    system     = models.CharField(max_length=50, default='OCS-Integration')

    class Meta:
        ordering = ['-timestamp']
