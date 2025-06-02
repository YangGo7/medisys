# ocs/models.py
from django.db import models

class OCSLog(models.Model):
    patient_id = models.CharField(max_length=100)
    patient_name = models.CharField(max_length=100, null=True, blank=True)
    doctor_id = models.CharField(max_length=100)
    doctor_name = models.CharField(max_length=100, null=True, blank=True)
    request_type = models.CharField(max_length=100)
    request_detail = models.TextField()
    request_time = models.DateTimeField(auto_now_add=True)
    result_type = models.CharField(max_length=100, null=True, blank=True)
    result_time = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.patient_id} - {self.request_type}"