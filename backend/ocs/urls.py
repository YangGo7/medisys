# ocs/urls.py

# from django.urls import path
# from .views import (
#     OrderReceiveView,
#     OCSLogListAPIView,
#     proxy_openmrs_patient,
#     # OpenMRS 환자 프록시 함수 추가
# )

# urlpatterns = [
#     path('order/', OrderReceiveView.as_view(), name='order-receive'),      # POST 요청 (저장)
#     path('logs/', OCSLogListAPIView.as_view(), name='ocs-log-list'),          # GET 요청 (조회)
#     # OpenMRS 환자 조회용
#     path("openmrs/patients/search/", proxy_openmrs_patient),
# ]

from django.urls import path
from .views import OCSLogListAPIView

urlpatterns = [
    path('logs/', OCSLogListAPIView.as_view(), name='ocs-log-list'),
]