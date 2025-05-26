from django.db import models

class TestOrder(models.Model):
    patient_id = models.IntegerField()
    doctor_id = models.IntegerField()
    test_type = models.CharField(max_length=50)
    order_date = models.DateTimeField()
