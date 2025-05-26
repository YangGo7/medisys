# backend/orthanc_models/models.py

from django.db import models

class Resources(models.Model):
    internalId = models.AutoField(primary_key=True)
    resourceType = models.IntegerField()  # 0: Patient, 1: Study, 2: Series, 3: Instance
    publicId = models.CharField(max_length=255)
    parentId = models.IntegerField(null=True, blank=True)
    
    dicom_tags = models.ManyToManyField(
        'MainDicomTags',
        through='ResourceTags',
        related_name='resources'
    )
    metadata = models.ManyToManyField(
        'Metadata',
        through='ResourceMetadata',
        related_name='resources'
    )

    class Meta:
        managed = False
        db_table = 'Resources'
        app_label = 'orthanc_models'

class ResourceTags(models.Model):
    """Resources와 MainDicomTags 간의 관계 테이블"""
    resource = models.ForeignKey(Resources, on_delete=models.CASCADE)
    tag = models.ForeignKey('MainDicomTags', on_delete=models.CASCADE)

    class Meta:
        managed = False
        db_table = 'ResourceTags'
        app_label = 'orthanc_models'

class ResourceMetadata(models.Model):
    """Resources와 Metadata 간의 관계 테이블"""
    resource = models.ForeignKey(Resources, on_delete=models.CASCADE)
    metadata = models.ForeignKey('Metadata', on_delete=models.CASCADE)

    class Meta:
        managed = False
        db_table = 'ResourceMetadata'
        app_label = 'orthanc_models'

class MainDicomTags(models.Model):
    id = models.AutoField(primary_key=True)
    tagGroup = models.IntegerField()
    tagElement = models.IntegerField()
    value = models.TextField()

    class Meta:
        managed = False
        db_table = 'MainDicomTags'
        app_label = 'orthanc_models'

class DicomIdentifiers(models.Model):
    id = models.AutoField(primary_key=True)
    tagGroup = models.IntegerField()
    tagElement = models.IntegerField()
    value = models.TextField()

    class Meta:
        managed = False
        db_table = 'DicomIdentifiers'
        app_label = 'orthanc_models'

class Metadata(models.Model):
    id = models.AutoField(primary_key=True)
    type = models.IntegerField()
    value = models.TextField()

    class Meta:
        managed = False
        db_table = 'Metadata'
        app_label = 'orthanc_models'