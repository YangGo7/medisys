# backend/worklist/urls.py - URL 패턴 업데이트

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# 기존 ViewSet 라우터
router = DefaultRouter()
router.register(r'study-requests', views.StudyRequestViewSet)

urlpatterns = [
    # 기존 ViewSet URLs
    path('', include(router.urls)),
    
    # 워크플로우 관리 API
    path('workflow/', views.WorkflowAPIView.as_view(), name='workflow-create'),
    path('workflow/<uuid:workflow_id>/', views.WorkflowDetailAPIView.as_view(), name='workflow-detail'),
    path('workflow/<uuid:workflow_id>/events/', views.get_workflow_events, name='workflow-events'),
    path('workflow/<uuid:workflow_id>/upload-dicom/', views.upload_dicom_files, name='upload-dicom'),
    
    # 워크리스트 API
    path('ris/worklist/', views.get_ris_worklist, name='ris-worklist'),
    path('emr/completed-studies/', views.get_emr_completed_studies, name='emr-completed-studies'),
]