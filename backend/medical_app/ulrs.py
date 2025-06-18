# backend/medical_records/urls.py
"""
CDSS 의료 기록 URL 패턴
"""

from django.urls import path
from . import views

urlpatterns = [
    # 내원 관리
    path('visits/', views.visit_list_create, name='visit_list_create'),
    path('visits/<int:visit_id>/', views.visit_detail, name='visit_detail'),
    path('visits/<int:visit_id>/start/', views.start_consultation, name='start_consultation'),
    path('visits/<int:visit_id>/complete/', views.complete_consultation, name='complete_consultation'),
    
    # 진단 관리
    path('visits/<int:visit_id>/diagnoses/', views.add_diagnosis, name='add_diagnosis'),
    
    # 처방 관리
    path('visits/<int:visit_id>/prescriptions/', views.add_prescription, name='add_prescription'),
    
    # 임상 기록
    path('visits/<int:visit_id>/notes/', views.add_clinical_note, name='add_clinical_note'),
    
    # 환자 내원 이력
    path('patients/<str:patient_uuid>/history/', views.patient_visit_history, name='patient_visit_history'),
]