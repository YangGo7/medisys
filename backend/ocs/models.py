# ocs/models.py
from django.db import models

class OCSLog(models.Model):
    patient_id = models.CharField(max_length=100)
    doctor_id = models.CharField(max_length=100, null=True, blank=True)
    department = models.CharField(max_length=100, null=True, blank=True)
    order_type = models.CharField(max_length=100)  # 예: Lab, Image # 여기가 request_type 역할
    result_summary = models.TextField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.patient_id} / {self.order_type} @ {self.timestamp}"