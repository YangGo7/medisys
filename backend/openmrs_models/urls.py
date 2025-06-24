# backend/openmrs_models/urls.py (기존 파일에 추가)
from django.urls import path
from . import views, clinical_views
from . import obs_clinical_api  # 🔥 추가
urlpatterns = [
    # 기존 URL들...
    path('vitals/', views.openmrs_vitals, name='openmrs_vitals'),
    path('encounters/', views.openmrs_encounters, name='openmrs_encounters'),
    
    # 새로운 임상 API들
    
    
    path('patient/<str:patient_uuid>/obs-clinical-data/', 
         obs_clinical_api.get_patient_obs_clinical_data, name='patient_obs_clinical_data'),
    
    path('patient/<str:patient_uuid>/save-obs-clinical/', 
         obs_clinical_api.save_obs_clinical_data, name='save_obs_clinical_data'),
    
    path('search-concepts-obs/', 
         obs_clinical_api.search_concepts_for_obs, name='search_concepts_obs'),
    
    path('openmrs-clinical/patient/<str:patient_uuid>/clinical-data/', 
         clinical_views.get_patient_clinical_data, name='patient_clinical_data'),
    
    path('openmrs-clinical/patient/<str:patient_uuid>/create-encounter/', 
         clinical_views.create_encounter_with_data, name='create_encounter_with_data'),
    
    path('openmrs-clinical/patient/<str:patient_uuid>/visits-history/', 
         clinical_views.get_patient_visits_history, name='patient_visits_history'),
    
    path('openmrs-clinical/search-diagnosis/', 
         clinical_views.search_diagnosis_concepts, name='search_diagnosis_concepts'),
    
    path('openmrs-clinical/search-drugs/', 
         clinical_views.search_drug_concepts, name='search_drug_concepts'),
    
    path('openmrs-clinical/patient/<str:patient_uuid>/save-notes/', 
         clinical_views.save_clinical_notes, name='save_clinical_notes'),
    
    path('openmrs-clinical/patient/<str:patient_uuid>/vitals/', 
         clinical_views.get_recent_vitals, name='get_recent_vitals'),
    
    
    path('openmrs-clinical/search-diagnosis/', 
         clinical_views.search_diagnosis_concepts, 
         name='search_diagnosis_concepts'),
    
    path('openmrs-clinical/search-drugs/', 
         clinical_views.search_drug_concepts, 
         name='search_drug_concepts'),
    
    # 📋 환자 임상 데이터 관리
    path('openmrs-clinical/patient/<str:patient_uuid>/clinical-data/', 
         clinical_views.get_patient_clinical_data, 
         name='patient_clinical_data'),
    
    path('openmrs-clinical/patient/<str:patient_uuid>/create-encounter/', 
         clinical_views.create_encounter_with_data, 
         name='create_encounter_with_data'),
    
    path('openmrs-clinical/patient/<str:patient_uuid>/visits-history/', 
         clinical_views.get_patient_visits_history, 
         name='patient_visits_history'),
    
    # 📝 임상 노트 관리
    path('openmrs-clinical/patient/<str:patient_uuid>/save-notes/', 
         clinical_views.save_clinical_notes, 
         name='save_clinical_notes'),
    
    # 🩺 생체징후
    path('openmrs-clinical/patient/<str:patient_uuid>/vitals/', 
         clinical_views.get_recent_vitals, 
         name='get_recent_vitals'),
    
    path('person-uuid-by-identifier/<str:patient_identifier>/', 
         views.get_person_uuid_by_identifier, 
         name='get_person_uuid_by_identifier'),
    
    
    path('test/minimal-encounter/<str:patient_uuid>/', 
         obs_clinical_api.test_minimal_encounter, name='test_minimal_encounter'),
    
    
     path('enhanced-search/prefix/', 
         clinical_views.search_concepts_by_prefix, 
         name='search_by_prefix'),
    
    path('enhanced-search/concept/<str:concept_uuid>/', 
         clinical_views.get_concept_details, 
         name='concept_details'),
    
    path('enhanced-search/statistics/', 
         clinical_views.get_search_statistics, 
         name='search_statistics'),
    
    path('enhanced-search/raw-sql/', 
         clinical_views.search_concepts_raw_sql, 
         name='search_raw_sql'),
    
        # 🔥 NEW: 향상된 검색 API들
    path('enhanced-search/diagnosis/', 
         clinical_views.search_diagnosis_concepts_enhanced, 
         name='enhanced_search_diagnosis'),
    
    path('enhanced-search/drugs/', 
         clinical_views.search_drug_concepts_enhanced, 
         name='enhanced_search_drugs'),
    
    path('enhanced-search/prefix/', 
         clinical_views.search_concepts_prefix,
         name='search_by_prefix')
]
