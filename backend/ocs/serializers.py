# ocs/serializers.py
from rest_framework import serializers
from .models import OCSLog

class OCSLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = OCSLog
        fields = '__all__'