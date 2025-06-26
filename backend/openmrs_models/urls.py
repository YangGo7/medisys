# backend/openmrs_models/urls.py
# 🔥 OpenMRS 진단 코드 중심으로 완전 정리된 URL 패턴

from django.urls import path
from . import views
from rest_framework.routers import DefaultRouter
from .views import (
    # SOAP 진단 관련 새 뷰들
    SoapDiagnosisViewSet,
    PatientVisitHistoryViewSet,
    doctor_dashboard_data,
    icd10_search,
    create_encounter_with_soap,
)
router = DefaultRouter()
router.register(r'soap-diagnoses', SoapDiagnosisViewSet, basename='soap-diagnosis')
router.register(r'visit-history', PatientVisitHistoryViewSet, basename='visit-history')


urlpatterns = [
    # 🏥 기존 기본 API들
    path('vitals/', views.openmrs_vitals, name='openmrs_vitals'),
    path('encounters/', views.openmrs_encounters, name='openmrs_encounters'),
    path('person-uuid-by-identifier/<str:patient_identifier>/', views.get_person_uuid_by_identifier, name='get_person_uuid_by_identifier'),
    path('patient/<str:patient_uuid>/create-encounter/', views.create_encounter_with_data, name='create_encounter_with_data'),
# SOAP 진단 특별 기능들
    path('doctor-dashboard/', doctor_dashboard_data, name='doctor_dashboard'),
    path('icd10-search/', icd10_search, name='icd10_search'),
    path('create-encounter-soap/', create_encounter_with_soap, name='create_encounter_soap'),
    
    # 환자별 진단 이력 조회 (단축 URL)
    path('patient/<str:patient_uuid>/diagnoses/', 
         SoapDiagnosisViewSet.as_view({'get': 'by_patient'}), 
         name='patient_diagnoses'),
    
    # 진료별 진단 조회 (단축 URL)  
    path('encounter/<str:encounter_uuid>/diagnoses/',
         SoapDiagnosisViewSet.as_view({'get': 'by_encounter'}),
         name='encounter_diagnoses'),
    
    # 방문별 SOAP 요약 (단축 URL)
    path('visit/<str:visit_uuid>/soap-summary/',
         PatientVisitHistoryViewSet.as_view({'get': 'soap_summary'}),
         name='visit_soap_summary'),
]