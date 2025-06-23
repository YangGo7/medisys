from rest_framework import serializers
from .models import NoticeCommon, NoticeRIS

class NoticeCommonSerializer(serializers.ModelSerializer):
    class Meta:
        model = NoticeCommon
        fields = '__all__'

class NoticeRISSerializer(serializers.ModelSerializer):
    class Meta:
        model = NoticeRIS
        fields = '__all__'