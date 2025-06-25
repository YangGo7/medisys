# backend/openmrs_models/urls.py
# 🔥 OpenMRS 진단 코드 중심으로 완전 정리된 URL 패턴

from django.urls import path
from . import views, clinical_views, obs_clinical_api

urlpatterns = [
    # 🏥 기존 기본 API들
    path('vitals/', views.openmrs_vitals, name='openmrs_vitals'),
    path('encounters/', views.openmrs_encounters, name='openmrs_encounters'),
    path('person-uuid-by-identifier/<str:patient_identifier>/', 
         views.get_person_uuid_by_identifier, 
         name='get_person_uuid_by_identifier'),
    
    # 🔍 핵심 OpenMRS 진단 코드 검색 API들 (새로 추가)
    path('diagnosis-search/', 
         clinical_views.search_openmrs_diagnosis_codes, 
         name='search_openmrs_diagnosis'),
    
    path('diagnosis-prefix/', 
         clinical_views.search_diagnosis_by_prefix, 
         name='search_diagnosis_prefix'),
    
    path('diagnosis/<str:concept_uuid>/', 
         clinical_views.get_diagnosis_details, 
         name='get_diagnosis_details'),
    
    # 💊 약물 검색 API들 (새로 추가)
    path('drug-search/', 
         clinical_views.search_openmrs_drug_codes, 
         name='search_openmrs_drugs'),
    
    # 📊 통계 및 디버깅 (새로 추가)
    path('diagnosis-stats/', 
         clinical_views.get_diagnosis_statistics, 
         name='diagnosis_statistics'),
    
    # 👨‍⚕️ 환자 임상 데이터 관리
    path('patient/<str:patient_uuid>/clinical-data/', 
         clinical_views.get_patient_clinical_data, 
         name='patient_clinical_data'),
    
    path('patient/<str:patient_uuid>/save-diagnosis/', 
         clinical_views.save_patient_diagnosis, 
         name='save_patient_diagnosis'),
    
    path('patient/<str:patient_uuid>/create-encounter/', 
         clinical_views.create_encounter_with_data, 
         name='create_encounter_with_data'),
    
    path('patient/<str:patient_uuid>/visits-history/', 
         clinical_views.get_patient_visits_history, 
         name='patient_visits_history'),
    
    path('patient/<str:patient_uuid>/save-notes/', 
         clinical_views.save_clinical_notes, 
         name='save_clinical_notes'),
    
    path('patient/<str:patient_uuid>/vitals/', 
         clinical_views.get_recent_vitals, 
         name='get_recent_vitals'),
    
    # 📋 OBS 및 임상 데이터 API (기존 유지)
    path('patient/<str:patient_uuid>/obs-clinical-data/', 
         obs_clinical_api.get_patient_obs_clinical_data, 
         name='patient_obs_clinical_data'),
    
    path('patient/<str:patient_uuid>/save-obs-clinical/', 
         obs_clinical_api.save_obs_clinical_data, 
         name='save_obs_clinical_data'),
    
    path('search-concepts-obs/', 
         obs_clinical_api.search_concepts_for_obs, 
         name='search_concepts_obs'),
    
    # 🧪 테스트 API
    path('test/minimal-encounter/<str:patient_uuid>/', 
         obs_clinical_api.test_minimal_encounter, 
         name='test_minimal_encounter'),
]