from rest_framework import serializers
from .models import CDSSResult, LiverFunctionSample

class CDSSResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = CDSSResult
        fields = '__all__'

class LiverFunctionSampleSerializer(serializers.ModelSerializer):
    class Meta:
        model = LiverFunctionSample
        fields = ['ALT', 'AST', 'ALP', 'Albumin', 'Total_Bilirubin', 'Direct_Bilirubin']

    def to_internal_value(self, data):
        # 프론트에서 올 수 있는 공백 키 → 모델 필드명으로 변경
        key_map = {
            'Total Bilirubin': 'Total_Bilirubin',
            'Direct Bilirubin': 'Direct_Bilirubin'
        }
        # 키 변환 처리 (공백 제거 포함)
        new_data = {}
        for k, v in data.items():
            mapped_key = key_map.get(k, k)  # 매핑 없으면 그대로
            new_data[mapped_key] = v
        return super().to_internal_value(new_data)