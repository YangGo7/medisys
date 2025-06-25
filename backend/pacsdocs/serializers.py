from rest_framework import serializers
from .models import DocumentType, DocumentRequest, DocumentTemplate
from worklists.models import StudyRequest

class DocumentTypeSerializer(serializers.ModelSerializer):
    """서류 종류 시리얼라이저"""
    
    class Meta:
        model = DocumentType
        fields = [
            'id', 'code', 'name', 'requires_signature', 
            'is_active', 'sort_order', 'description'
        ]


class DocumentRequestSerializer(serializers.ModelSerializer):
    """서류 요청 시리얼라이저"""
    
    document_type = DocumentTypeSerializer(read_only=True)
    document_type_id = serializers.IntegerField(write_only=True)
    
    # 추가 정보 필드들
    patient_name = serializers.CharField(source='study_request.patient_name', read_only=True)
    patient_id = serializers.CharField(source='study_request.patient_id', read_only=True)
    modality = serializers.CharField(source='study_request.modality', read_only=True)
    exam_part = serializers.CharField(source='study_request.body_part', read_only=True)
    
    class Meta:
        model = DocumentRequest
        fields = [
            'id', 'study_request', 'document_type', 'document_type_id',
            'status', 'requested_at', 'generated_at', 'completed_at',
            'generated_file_path', 'scanned_file_path', 'processed_by', 'notes',
            # 추가 정보
            'patient_name', 'patient_id', 'modality', 'exam_part'
        ]
        read_only_fields = ['requested_at', 'generated_at', 'completed_at']
    
    def create(self, validated_data):
        """서류 요청 생성"""
        document_type_id = validated_data.pop('document_type_id')
        document_type = DocumentType.objects.get(id=document_type_id)
        validated_data['document_type'] = document_type
        return super().create(validated_data)


class StudyDocumentsSerializer(serializers.ModelSerializer):
    """검사별 서류 목록용 시리얼라이저 (React 프론트엔드용)"""
    
    documents = serializers.SerializerMethodField()
    
    class Meta:
        model = StudyRequest
        fields = [
            'id', 'patient_id', 'patient_name', 'birth_date',
            'body_part', 'modality', 'interpreting_physician',
            'request_datetime', 'priority', 'study_status',
            'documents'
        ]
    
    def get_documents(self, obj):
        """해당 검사의 모든 서류 요청 반환"""
        document_requests = obj.document_requests.all().order_by('document_type__sort_order')
        return DocumentRequestSerializer(document_requests, many=True).data


class DocumentProcessRequestSerializer(serializers.Serializer):
    """서류 일괄 처리 요청용 시리얼라이저"""
    
    document_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        help_text="처리할 서류 ID 목록"
    )
    action = serializers.ChoiceField(
        choices=['select', 'generate', 'complete', 'cancel'],
        default='select',
        help_text="수행할 액션"
    )
    processed_by = serializers.CharField(
        max_length=100,
        required=False,
        help_text="처리자 이름"
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="처리 비고"
    )


class DocumentStatusUpdateSerializer(serializers.Serializer):
    """개별 서류 상태 변경용 시리얼라이저"""
    
    status = serializers.ChoiceField(
        choices=DocumentRequest.STATUS_CHOICES,
        help_text="변경할 상태"
    )
    processed_by = serializers.CharField(
        max_length=100,
        required=False,
        help_text="처리자 이름"
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="처리 비고"
    )
    file_path = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True,
        help_text="파일 경로 (생성된 파일 또는 스캔된 파일)"
    )


class DocumentPreviewSerializer(serializers.Serializer):
    """서류 미리보기용 시리얼라이저"""
    
    document_type = serializers.CharField(help_text="서류 종류 코드")
    patient_name = serializers.CharField(help_text="환자명")
    modality = serializers.CharField(help_text="검사 장비")
    body_part = serializers.CharField(help_text="검사 부위")
    
    def to_representation(self, instance):
        """미리보기용 데이터 생성"""
        if isinstance(instance, DocumentRequest):
            study = instance.study_request
            return {
                'document_type': instance.document_type.code,
                'document_name': instance.document_type.name,
                'patient_name': study.patient_name,
                'patient_id': study.patient_id,
                'modality': study.modality,
                'body_part': study.body_part,
                'birth_date': study.birth_date.strftime('%Y-%m-%d') if study.birth_date else None,
                'request_date': study.request_datetime.strftime('%Y-%m-%d') if study.request_datetime else None,
                'requires_signature': instance.document_type.requires_signature
            }
        return super().to_representation(instance)


class DocumentTemplateSerializer(serializers.ModelSerializer):
    """서류 템플릿 시리얼라이저"""
    
    document_type = DocumentTypeSerializer(read_only=True)
    
    class Meta:
        model = DocumentTemplate
        fields = [
            'id', 'document_type', 'template_content', 
            'is_active', 'created_at', 'updated_at'
        ]