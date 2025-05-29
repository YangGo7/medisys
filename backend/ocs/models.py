# ocs/models.py
from django.db import models

class OCSLog(models.Model):
    patient_id = models.CharField(max_length=100)
    doctor_id = models.CharField(max_length=100)

    # 요청 정보
    request_type = models.CharField(max_length=100)  # 예: 검사 요청, 처방 요청
    request_detail = models.TextField()
    request_time = models.DateTimeField()

    # 결과 정보 (optional)
    result_type = models.CharField(max_length=100, null=True, blank=True)  # 예: 검사 결과, 처방 결과
    result_detail = models.TextField(null=True, blank=True)
    result_time = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.patient_id} / {self.request_type} @ {self.request_time}"
