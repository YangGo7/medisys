# backend/openmrs_models/models.py

from django.db import models

class Person(models.Model):
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
        managed = False  # 기존 테이블 사용
        db_table = 'person'
        app_label = 'openmrs_models'

class PersonName(models.Model):
    person_name_id = models.AutoField(primary_key=True)
    preferred = models.BooleanField(default=False)
    person = models.ForeignKey(Person, on_delete=models.DO_NOTHING)
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
        managed = False
        db_table = 'person_name'
        app_label = 'openmrs_models'

class Patient(models.Model):
    patient_id = models.AutoField(primary_key=True)
    person = models.OneToOneField(Person, on_delete=models.DO_NOTHING)
    creator = models.IntegerField()
    date_created = models.DateTimeField()
    changed_by = models.IntegerField(null=True, blank=True)
    date_changed = models.DateTimeField(null=True, blank=True)
    voided = models.BooleanField(default=False)
    voided_by = models.IntegerField(null=True, blank=True)
    date_voided = models.DateTimeField(null=True, blank=True)
    void_reason = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'patient'
        app_label = 'openmrs_models'

class PatientIdentifier(models.Model):
    patient_identifier_id = models.AutoField(primary_key=True)
    patient = models.ForeignKey(Patient, on_delete=models.DO_NOTHING)
    identifier = models.CharField(max_length=50)
    identifier_type = models.IntegerField()
    preferred = models.BooleanField(default=False)
    location_id = models.IntegerField(null=True, blank=True)
    creator = models.IntegerField()
    date_created = models.DateTimeField()
    voided = models.BooleanField(default=False)
    voided_by = models.IntegerField(null=True, blank=True)
    date_voided = models.DateTimeField(null=True, blank=True)
    void_reason = models.CharField(max_length=255, null=True, blank=True)
    uuid = models.CharField(max_length=38, unique=True)

    class Meta:
        managed = False
        db_table = 'patient_identifier'
        app_label = 'openmrs_models'

class Encounter(models.Model):
    encounter_id = models.AutoField(primary_key=True)
    encounter_type = models.IntegerField()
    patient = models.ForeignKey(Patient, on_delete=models.DO_NOTHING)
    location_id = models.IntegerField(null=True, blank=True)
    form_id = models.IntegerField(null=True, blank=True)
    encounter_datetime = models.DateTimeField()
    creator = models.IntegerField()
    date_created = models.DateTimeField()
    voided = models.BooleanField(default=False)
    voided_by = models.IntegerField(null=True, blank=True)
    date_voided = models.DateTimeField(null=True, blank=True)
    void_reason = models.CharField(max_length=255, null=True, blank=True)
    changed_by = models.IntegerField(null=True, blank=True)
    date_changed = models.DateTimeField(null=True, blank=True)
    visit_id = models.IntegerField(null=True, blank=True)
    uuid = models.CharField(max_length=38, unique=True)

    class Meta:
        managed = False
        db_table = 'encounter'
        app_label = 'openmrs_models'