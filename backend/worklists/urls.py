# # backend/worklists/urls.py - API 경로 수정
# from django.urls import path, include
# from rest_framework.routers import DefaultRouter
# from .views import StudyRequestViewSet
# from . import views

# router = DefaultRouter()
# router.register(r'', StudyRequestViewSet, basename='studyrequest')  # 경로 수정

# urlpatterns = [
#     path('', include(router.urls)),
#     # 🔧 Frontend가 호출하는 경로에 맞춰 수정
#     path('worklist/', views.work_list, name='work_list'),  # 새 경로 추가
#     path('worklist/<int:pk>/', views.work_list_detail, name='work_list_detail'),
# ]

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudyRequestViewSet
from . import views

router = DefaultRouter()
router.register(r'', StudyRequestViewSet, basename='studyrequest')

urlpatterns = [
    # 🆕 DMViewer용 완료된 검사 관련 API들 (최우선 순위)
    path('completed/', views.completed_studies_list, name='completed-studies-list'),
    path('completed/patient/<str:patient_id>/', views.completed_studies_by_patient, name='completed-studies-by-patient'),
    path('viewer/<str:study_uid>/', views.study_detail_for_viewer, name='study-detail-for-viewer'),
    
    # 기존 WorkList API들 유지
    path('work-list/', views.work_list, name='work_list'),
    path('work-list/<int:pk>/', views.work_list_detail, name='work_list_detail'),
    
    # ViewSet URLs (맨 마지막에 배치 - 중요!)
    path('', include(router.urls)),
]
