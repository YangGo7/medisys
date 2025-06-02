from django.db import models
from django.utils import timezone

class TestOrder(models.Model):
    patient_id = models.CharField(max_length=50)
    doctor_id = models.CharField(max_length=50)
    test_type = models.CharField(max_length=50)
    order_date = models.DateTimeField()
