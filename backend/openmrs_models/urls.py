# backend/openmrs_models/urls.py (저장 기능 완전 수정 버전)

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# SOAP ViewSet용 라우터
router = DefaultRouter()

# SOAP 관련 ViewSet들이 있다면 등록 (선택사항)
try:
    router.register(r'soap-diagnoses', views.SoapDiagnosisViewSet, basename='soap-diagnosis')
except ImportError:
    # SOAP ViewSet이 없어도 기본 기능은 작동
    pass

urlpatterns = [
    # 🏥 기존 기본 API들
    path('', include(router.urls)),
    path('vitals/', views.openmrs_vitals, name='openmrs_vitals'),
    path('encounters/', views.openmrs_encounters, name='openmrs_encounters'),
    
    # 🔥 환자 정보 조회
    path('person-uuid-by-identifier/<str:patient_identifier>/', 
         views.get_person_uuid_by_identifier, 
         name='get_person_uuid_by_identifier'),
         
    # 🔥 ICD-10 검색 (SOAP에서 사용)
    path('icd10-search/', 
         views.icd10_search, 
         name='icd10_search'),
]

# ViewSet URL들 추가 (있는 경우만)
urlpatterns += router.urls