from django.db import models
from samples.models import Sample
print("=== lis_cdss/models.py loaded ===")
class CDSSResult(models.Model):
    sample = models.ForeignKey(Sample, on_delete=models.CASCADE)
    test_type = models.CharField(max_length=100)
    component_name = models.CharField(max_length=50)
    value = models.CharField(max_length=50)
    unit = models.CharField(max_length=20)
    verified_by = models.IntegerField()
    verified_date = models.DateTimeField()
    prediction = models.CharField(max_length=100, null=True, blank=True)


    def __str__(self):
        return f"{self.sample} - {self.test_type} - {self.component_name}"

    class Meta:
        db_table = "lis_cdss_cdssresult"  # 원하는 테이블 이름 지정 (실제 테이블명이 이걸로 생김)

class LiverFunctionSample(models.Model):
    sample = models.ForeignKey(Sample, on_delete=models.CASCADE, null=True, blank=True)  # ✅ optional 연결
    
    # 입력값들
    ALT = models.FloatField()
    AST = models.FloatField()
    ALP = models.FloatField()
    Albumin = models.FloatField()
    Total_Bilirubin = models.FloatField()
    Direct_Bilirubin = models.FloatField()

    # 예측 결과
    prediction = models.BooleanField(null=True, blank=True)  # 0: 정상, 1: 이상
    probability = models.FloatField(null=True, blank=True)   # 예측 확률

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Sample#{self.id} - ALT:{self.ALT}, AST:{self.AST}"