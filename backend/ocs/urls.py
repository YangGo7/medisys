# ocs/urls.py
from django.urls import path
from .views import OCSLogListAPIView

urlpatterns = [
    # path('logs/', OCSLogListAPIView.as_view(), name='ocs-log-list'),
    path('', OCSLogListAPIView.as_view(), name='ocs-log-list'),
]