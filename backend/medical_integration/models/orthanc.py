from django.db import models

class Resources(models.Model):
    """Orthanc 리소스 모델"""
    internalId = models.AutoField(primary_key=True)
    resourceType = models.IntegerField()  # 0: Patient, 1: Study, 2: Series, 3: Instance
    publicId = models.CharField(max_length=255)
    parentId = models.IntegerField(null=True)

    class Meta:
        db_table = 'Resources'
        managed = False  # Orthanc가 관리하는 테이블이므로 Django에서는 관리하지 않음

    def __str__(self):
        return f"{self.get_resource_type_display()} - {self.publicId}"

    def get_resource_type_display(self):
        resource_types = {
            0: 'Patient',
            1: 'Study',
            2: 'Series',
            3: 'Instance'
        }
        return resource_types.get(self.resourceType, 'Unknown')

    @classmethod
    def get_patient_resources(cls):
        """환자 타입의 리소스만 조회"""
        return cls.objects.filter(resourceType=0)  # 0 = Patient type

    def get_studies(self):
        """해당 환자의 모든 검사(Study) 조회"""
        return Resources.objects.filter(
            resourceType=1,  # 1 = Study type
            parentId=self.internalId
        )

    def get_series(self):
        """해당 환자의 모든 시리즈(Series) 조회"""
        return Resources.objects.filter(
            resourceType=2,  # 2 = Series type
            parentId__in=self.get_studies().values_list('internalId', flat=True)
        )

    def get_instances(self):
        """해당 환자의 모든 인스턴스(Instance) 조회"""
        return Resources.objects.filter(
            resourceType=3,  # 3 = Instance type
            parentId__in=self.get_series().values_list('internalId', flat=True)
        ) 