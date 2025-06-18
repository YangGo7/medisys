# backend/medical_records/serializers.py
"""
CDSS 의료 기록 시리얼라이저
"""

from rest_framework import serializers
from .models import (
    Visit, Diagnosis, Prescription, LaboratoryOrder, 
    ImagingOrder, VitalSigns, ClinicalNote
)


class VisitSerializer(serializers.ModelSerializer):
    """내원 정보 시리얼라이저"""
    
    class Meta:
        model = Visit
        fields = [
            'visit_id', 'uuid', 'openmrs_patient_uuid', 'openmrs_visit_uuid',
            'openmrs_encounter_uuid', 'patient_identifier', 'patient_name',
            'doctor_id', 'doctor_name', 'visit_date', 'status',
            'chief_complaint', 'present_illness', 'created_at', 'updated_at'
        ]
        read_only_fields = ['visit_id', 'uuid', 'created_at', 'updated_at']


class DiagnosisSerializer(serializers.ModelSerializer):
    """진단 정보 시리얼라이저"""
    
    diagnosis_type_display = serializers.CharField(source='get_diagnosis_type_display', read_only=True)
    certainty_display = serializers.CharField(source='get_certainty_display', read_only=True)
    
    class Meta:
        model = Diagnosis
        fields = [
            'diagnosis_id', 'visit', 'diagnosis_code', 'diagnosis_name',
            'diagnosis_type', 'diagnosis_type_display', 'certainty', 'certainty_display',
            'ai_suggested', 'ai_confidence', 'clinical_notes', 'created_at', 'created_by'
        ]
        read_only_fields = ['diagnosis_id', 'created_at']


class PrescriptionSerializer(serializers.ModelSerializer):
    """처방 정보 시리얼라이저"""
    
    prescription_type_display = serializers.CharField(source='get_prescription_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Prescription
        fields = [
            'prescription_id', 'visit', 'prescription_type', 'prescription_type_display',
            'drug_code', 'drug_name', 'dosage', 'frequency', 'duration', 'route',
            'instructions', 'status', 'status_display', 'ai_suggested',
            'drug_interaction_warning', 'allergy_warning', 'created_at', 'created_by'
        ]
        read_only_fields = ['prescription_id', 'created_at']



class ClinicalNoteSerializer(serializers.ModelSerializer):
    """임상 기록 시리얼라이저"""
    
    note_type_display = serializers.CharField(source='get_note_type_display', read_only=True)
    
    class Meta:
        model = ClinicalNote
        fields = [
            'note_id', 'visit', 'note_type', 'note_type_display', 'title',
            'content', 'is_voice_recorded', 'voice_file_path', 'created_at', 'created_by'
        ]
        read_only_fields = ['note_id', 'created_at']


class VisitDetailSerializer(serializers.ModelSerializer):
    """내원 상세 정보 시리얼라이저 (관련 데이터 포함)"""
    
    diagnoses = DiagnosisSerializer(many=True, read_only=True)
    prescriptions = PrescriptionSerializer(many=True, read_only=True)
    lab_orders = LaboratoryOrderSerializer(many=True, read_only=True)
    imaging_orders = ImagingOrderSerializer(many=True, read_only=True)
    vital_signs = VitalSignsSerializer(many=True, read_only=True)
    clinical_notes = ClinicalNoteSerializer(many=True, read_only=True)
    
    class Meta:
        model = Visit
        fields = [
            'visit_id', 'uuid', 'openmrs_patient_uuid', 'openmrs_visit_uuid',
            'openmrs_encounter_uuid', 'patient_identifier', 'patient_name',
            'doctor_id', 'doctor_name', 'visit_date', 'status',
            'chief_complaint', 'present_illness', 'created_at', 'updated_at',
            'diagnoses', 'prescriptions', 'lab_orders', 'imaging_orders',
            'vital_signs', 'clinical_notes'
        ]
        read_only_fields = ['visit_id', 'uuid', 'created_at', 'updated_at']


class VisitSummarySerializer(serializers.ModelSerializer):
    """내원 요약 정보 시리얼라이저 (목록용)"""
    
    primary_diagnosis = serializers.SerializerMethodField()
    prescription_count = serializers.SerializerMethodField()
    lab_order_count = serializers.SerializerMethodField()
    imaging_order_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Visit
        fields = [
            'visit_id', 'uuid', 'patient_identifier', 'patient_name',
            'doctor_name', 'visit_date', 'status', 'chief_complaint',
            'primary_diagnosis', 'prescription_count', 'lab_order_count',
            'imaging_order_count'
        ]
    
    def get_primary_diagnosis(self, obj):
        """주진단 반환"""
        primary = obj.diagnoses.filter(diagnosis_type='primary').first()
        return primary.diagnosis_name if primary else None
    
    def get_prescription_count(self, obj):
        """처방 개수"""
        return obj.prescriptions.count()
    
    def get_lab_order_count(self, obj):
        """검사 오더 개수"""
        return obj.lab_orders.count()
    
    def get_imaging_order_count(self, obj):
        """영상 검사 오더 개수"""
        return obj.imaging_orders.count()