# ocs/urls.py
from django.urls import path
from .views import test_logs_view, create_log_view, OCSLogListAPIView

urlpatterns = [
    path('', OCSLogListAPIView.as_view(), name='ocs-log-list'), # MariaDB 조회용
    path('test-logs/', test_logs_view, name='ocs-mongo-test-logs'), # MongoDB 로그 테스트용 API
    path('create', create_log_view, name='create-log'), # POST 요청용   
] 
