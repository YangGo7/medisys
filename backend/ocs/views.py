# ocs/views.py

import json
import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.decorators import api_view

from .models import OCSLog
from .serializers import OCSLogSerializer
from medical_integration.openmrs_api import OpenMRSAPI # OpenMRSAPI 클래스 임포트

# OpenMRSAPI 인스턴스 생성
# 이 인스턴스는 한 번만 생성하여 재사용하는 것이 효율적입니다.
openmrs_client = OpenMRSAPI()

# OpenMRS 환자 목록을 불러오는 프록시 API
@api_view(['GET'])
def get_ocs_logs(request):
    patient_id = request.GET.get('patient_id')
    doctor_id = request.GET.get('doctor_id')

    logs = OCSLog.objects.all()
    if patient_id:
        logs = logs.filter(patient_id__icontains=patient_id)
    if doctor_id:
        logs = logs.filter(doctor_id__icontains=doctor_id)

    logs = logs.order_by('-timestamp')
    data = [
        {
            'id': log.id,
            'patient_id': log.patient_id,
            'doctor_id': log.doctor_id,
            'action_type': log.action_type,
            'detail': log.detail,
            'timestamp': log.timestamp.strftime('%Y. %m. %d. %p %I:%M:%S')
        }
        for log in logs
    ]
    return Response(data)


# 📥 OpenMRS에서 로그 저장 POST 요청 처리
class OrderReceiveView(APIView):
    def post(self, request):
        print("📥 요청 수신:", request.data)
        # 여기서는 단순히 메시지만 반환하지만, 실제 로그 저장 로직은 middleware.py에서 처리됨
        return Response({"message": "Order received!"}, status=status.HTTP_200_OK)

# 📤 React에서 환자 ID별 로그 조회용 API
class OCSLogListAPIView(ListAPIView):
    serializer_class = OCSLogSerializer

    def get_queryset(self):
        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            return OCSLog.objects.filter(patient_id=patient_id).order_by('-timestamp')
        return OCSLog.objects.all().order_by('-timestamp')