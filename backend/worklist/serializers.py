# backend/worklist/serializers.py - 시리얼라이저

from rest_framework import serializers
from .models import StudyRequest, WorkflowEvent, DICOMMapping

class StudyRequestSerializer(serializers.ModelSerializer):
    """확장된 StudyRequest 시리얼라이저"""
    
    workflow_progress = serializers.ReadOnlyField(source='get_workflow_progress')
    processing_time = serializers.ReadOnlyField(source='get_processing_time')
    is_completed = serializers.ReadOnlyField()
    has_error = serializers.ReadOnlyField()
    dicom_count = serializers.SerializerMethodField()
    
    class Meta:
        model = StudyRequest
        fields = '__all__'
    
    def get_dicom_count(self, obj):
        return obj.dicom_mappings.count()


class WorkflowEventSerializer(serializers.ModelSerializer):
    """워크플로우 이벤트 시리얼라이저"""
    
    class Meta:
        model = WorkflowEvent
        fields = '__all__'


class DICOMMappinoSerializer(serializers.ModelSerializer):
    """DICOM 매핑 시리얼라이저"""
    
    class Meta:
        model = DICOMMapping
        fields = '__all__'