from django.db import models

class TestPerson(models.Model):
    """테스트용 Person 모델"""
    person_id = models.AutoField(primary_key=True)
    gender = models.CharField(max_length=50)
    birthdate = models.DateField(null=True, blank=True)
    birthdate_estimated = models.BooleanField(default=False)
    dead = models.BooleanField(default=False)
    death_date = models.DateField(null=True, blank=True)
    cause_of_death = models.IntegerField(null=True, blank=True)
    creator = models.IntegerField()
    date_created = models.DateTimeField()
    changed_by = models.IntegerField(null=True, blank=True)
    date_changed = models.DateTimeField(null=True, blank=True)
    voided = models.BooleanField(default=False)
    voided_by = models.IntegerField(null=True, blank=True)
    date_voided = models.DateTimeField(null=True, blank=True)
    void_reason = models.CharField(max_length=255, null=True, blank=True)
    uuid = models.CharField(max_length=38, unique=True)

    class Meta:
        app_label = 'medical_integration'
        managed = True

class TestPersonName(models.Model):
    """테스트용 PersonName 모델"""
    person_name_id = models.AutoField(primary_key=True)
    preferred = models.BooleanField(default=False)
    person = models.ForeignKey(TestPerson, on_delete=models.CASCADE)
    prefix = models.CharField(max_length=50, null=True, blank=True)
    given_name = models.CharField(max_length=50)
    middle_name = models.CharField(max_length=50, null=True, blank=True)
    family_name = models.CharField(max_length=50)
    family_name2 = models.CharField(max_length=50, null=True, blank=True)
    family_name_suffix = models.CharField(max_length=50, null=True, blank=True)
    creator = models.IntegerField()
    date_created = models.DateTimeField()
    voided = models.BooleanField(default=False)
    voided_by = models.IntegerField(null=True, blank=True)
    date_voided = models.DateTimeField(null=True, blank=True)
    void_reason = models.CharField(max_length=255, null=True, blank=True)
    changed_by = models.IntegerField(null=True, blank=True)
    date_changed = models.DateTimeField(null=True, blank=True)
    uuid = models.CharField(max_length=38, unique=True)

    class Meta:
        app_label = 'medical_integration'
        managed = True

class TestPatient(models.Model):
    """테스트용 Patient 모델"""
    patient_id = models.AutoField(primary_key=True)
    person = models.OneToOneField(TestPerson, on_delete=models.CASCADE)
    creator = models.IntegerField()
    date_created = models.DateTimeField()
    changed_by = models.IntegerField(null=True, blank=True)
    date_changed = models.DateTimeField(null=True, blank=True)
    voided = models.BooleanField(default=False)
    voided_by = models.IntegerField(null=True, blank=True)
    date_voided = models.DateTimeField(null=True, blank=True)
    void_reason = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        app_label = 'medical_integration'
        managed = True

class TestResources(models.Model):
    """테스트용 Orthanc Resources 모델"""
    internalId = models.AutoField(primary_key=True)
    resourceType = models.IntegerField()
    publicId = models.CharField(max_length=255)
    parentId = models.IntegerField(null=True, blank=True)

    class Meta:
        app_label = 'medical_integration'
        managed = True 