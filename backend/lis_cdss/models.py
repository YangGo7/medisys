from django.db import models

class CDSSRecord(models.Model):
    sample_id = models.IntegerField()
    test_type = models.CharField(max_length=100)
    component_name = models.CharField(max_length=50)
    value = models.CharField(max_length=50)
    unit = models.CharField(max_length=20)
    verified_by = models.IntegerField()
    verified_date = models.DateTimeField()

    def __str__(self):
        return f"{self.sample_id} - {self.test_type} - {self.component_name}"

    class Meta:
        db_table = "lis_cdss_cdssrecord"  # 원하는 테이블 이름으로 지정
