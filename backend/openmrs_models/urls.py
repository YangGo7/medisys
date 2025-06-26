# backend/openmrs_models/urls.py (저장 기능 완전 수정 버전)

from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

# SOAP ViewSet용 라우터
router = DefaultRouter()

# SOAP 관련 ViewSet들이 있다면 등록 (선택사항)
try:
    from .views import SoapDiagnosisViewSet, PatientVisitHistoryViewSet
    router.register(r'soap-diagnoses', SoapDiagnosisViewSet, basename='soap-diagnosis')
    router.register(r'visit-history', PatientVisitHistoryViewSet, basename='visit-history')
except ImportError:
    # SOAP ViewSet이 없어도 기본 기능은 작동
    pass

urlpatterns = [
    # 🏥 기존 기본 API들
    path('vitals/', views.openmrs_vitals, name='openmrs_vitals'),
    path('encounters/', views.openmrs_encounters, name='openmrs_encounters'),
    
    # 🔥 환자 정보 조회
    path('person-uuid-by-identifier/<str:patient_identifier>/', 
         views.get_person_uuid_by_identifier, 
         name='get_person_uuid_by_identifier'),
    
    # 🔥 진단/처방 저장 엔드포인트들 (프론트엔드에서 호출하는 경로)
    path('patient/<str:patient_uuid>/create-encounter/', 
         views.create_encounter_with_data, 
         name='create_encounter_with_data'),
    
    # 🔥 핵심: 프론트엔드가 호출하는 저장 엔드포인트
    path('patient/<str:patient_uuid>/save-obs-clinical/', 
         views.save_patient_clinical_data, 
         name='save_patient_clinical_data'),
         
    # 🔥 프론트엔드 호출 경로와 정확히 일치하는 URL
    path('openmrs-models/patient/<str:patient_uuid>/save-obs-clinical/',
         views.save_patient_clinical_data,
         name='frontend_save_clinical'),
    
    # 🔥 ICD-10 검색 (SOAP에서 사용)
    path('icd10-search/', 
         views.icd10_search, 
         name='icd10_search'),
]

# ViewSet URL들 추가 (있는 경우만)
urlpatterns += router.urls