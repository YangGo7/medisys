# airesults/serializers.py

from rest_framework import serializers
from .models import AIResult, AIAnalysisSummary

class AIResultSerializer(serializers.ModelSerializer):
    """AI 분석 결과 시리얼라이저"""
    
    bbox_coordinates = serializers.ReadOnlyField()
    bbox_area = serializers.ReadOnlyField()
    is_high_confidence = serializers.SerializerMethodField()
    is_abnormal = serializers.ReadOnlyField()
    
    class Meta:
        model = AIResult
        fields = [
            'ai_result_id',
            'patient_id',
            'study_uid',
            'accession_number',
            'series_uid',
            'instance_uid',
            'label',
            'bbox',
            'bbox_coordinates',
            'bbox_area',
            'confidence_score',
            'ai_text',
            'model_version',
            'analysis_datetime',
            'processing_time',
            'image_width',
            'image_height',
            'review_status',
            'review_comment',
            'reviewed_by',
            'reviewed_at',
            'is_high_confidence',
            'is_abnormal',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['ai_result_id', 'analysis_datetime', 'created_at', 'updated_at']
    
    def get_is_high_confidence(self, obj):
        """높은 신뢰도 여부 (0.8 이상)"""
        return obj.is_high_confidence(0.8)


class AIAnalysisSummarySerializer(serializers.ModelSerializer):
    """AI 분석 요약 시리얼라이저"""
    
    class Meta:
        model = AIAnalysisSummary
        fields = [
            'summary_id',
            'patient_id',
            'study_uid',
            'series_uid',
            'total_instances',
            'total_detections',
            'abnormal_instances',
            'max_confidence',
            'avg_confidence',
            'detected_labels',
            'analysis_status',
            'final_diagnosis',
            'has_critical_findings',
            'analysis_started_at',
            'analysis_completed_at',
            'total_processing_time',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['summary_id', 'created_at', 'updated_at']