from rest_framework import serializers
from .models import CDSSRecord

class CDSSRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = CDSSRecord
        fields = '__all__'
