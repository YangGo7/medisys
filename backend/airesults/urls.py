# airesults/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AIResultViewSet, 
    OrthancAPIView, 
    DicomImageAPIView, 
    YOLOModelAPIView
)

router = DefaultRouter()
router.register(r'ai-results', AIResultViewSet)

urlpatterns = [
    # DRF Router URLs
    path('', include(router.urls)),
    
    # Orthanc 연동 API
    path('orthanc/<path:endpoint>/', OrthancAPIView.as_view(), name='orthanc-api'),
    
    # DICOM 이미지 API
    path('dicom-image/<str:instance_id>/', DicomImageAPIView.as_view(), name='dicom-image'),
    
    # YOLO 모델 API
    path('yolo-model/', YOLOModelAPIView.as_view(), name='yolo-model'),
]