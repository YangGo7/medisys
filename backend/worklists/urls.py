from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudyRequestViewSet
from . import views

router = DefaultRouter()
router.register(r'', StudyRequestViewSet, basename='studyrequest')

urlpatterns = [
    
    path('debug/patient-mapping/', views.debug_patient_mapping, name='debug-patient-mapping'),
    path('sync/pacs-patient-ids/', views.sync_pacs_patient_ids, name='sync-pacs-patient-ids'),
    
    path('completed/', views.completed_studies_list, name='completed-studies-list'),
    path('completed/patient/<str:patient_id>/', views.completed_studies_by_patient, name='completed-studies-by-patient'),
    path('viewer/<str:study_uid>/', views.study_detail_for_viewer, name='study-detail-for-viewer'),
    # ✅ 날짜별 워크리스트 API - 이 부분을 추가해야 404 해결됨
    path('<int:year>-<int:month>-<int:day>/', views.worklist_by_date_specific, name='worklist-by-date-specific'),
    path('<str:target_date>/', views.worklist_by_date, name='worklist-by-date'),

    # 🆕 DMViewer용 완료된 검사 관련 API들 (최우선 순위)
    
    # 기존 WorkList API들 유지
    path('work-list/', views.work_list, name='work_list'),
    path('work-list/<int:pk>/', views.work_list_detail, name='work_list_detail'),

    # ViewSet URLs (맨 마지막에 배치 - 중요!)
    path('', include(router.urls)),
]
