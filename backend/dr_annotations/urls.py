# dr_annotations/urls.py
from django.urls import path
from .views import (
    AnnotationSaveView,
    AnnotationLoadView, 
    AnnotationDetailView,
    AnnotationListView,
    AnnotationDeleteAllView,
    get_annotations_by_instances,
    get_annotations_by_study,
)

app_name = 'dr_annotations'

urlpatterns = [
    path('save/', AnnotationSaveView.as_view(), name='annotation-save'),
    path('list/', AnnotationListView.as_view(), name='annotation-list'),
    # path('summary/', AnnotationSummaryView.as_view(), name='annotation-summary'),  # 필요시
    path('by-instances/', get_annotations_by_instances, name='get_annotations_by_instances'),
    path('study/<str:study_uid>/', get_annotations_by_study, name='get_annotations_by_study'),
    
    # 어노테이션 저장/삭제 API  

    # study_uid 관련 패턴들
    path('<str:study_uid>/', AnnotationLoadView.as_view(), name='annotation-load'),
    path('<str:study_uid>/delete/', AnnotationDeleteAllView.as_view(), name='annotation-delete-all'),
    
    # ID 기반 패턴들
    path('detail/<int:annotation_id>/', AnnotationDetailView.as_view(), name='annotation-detail'),
]

