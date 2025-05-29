# ocs/urls.py

from django.urls import path
from .views import (
    OrderReceiveView,
    OCSLogListAPIView,
    # proxy_openmrs_patients,  # OpenMRS 환자 프록시 함수 추가
)

urlpatterns = [
    path('order/', OrderReceiveView.as_view(), name='order-receive'),      # POST 요청 (저장)
    path('logs/', OCSLogListAPIView.as_view(), name='ocs-log-list'),          # GET 요청 (조회)
    # path('proxy-patients/', proxy_openmrs_patients, name='proxy-patients'),  # OpenMRS 환자 조회용
]