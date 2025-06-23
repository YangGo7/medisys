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
    
    
    
]

# backend/backend/urls.py (메인 URL 설정에 추가)
"""
기존 urlpatterns에 추가:
    path('api/', include('openmrs_models.urls')),
"""