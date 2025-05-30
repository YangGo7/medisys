from django.urls import path
from . import views

app_name = 'medical_integration'

urlpatterns = [
    # 시스템 상태
    path('health/', views.health_check, name='health_check'),
    path('test-connections/', views.test_all_connections, name='test_connections'),
    path('check-openmrs-status/', views.check_openmrs_status, name='check_openmrs_status'),  # 👈 추가
    
    # OpenMRS 환자 관리
    path('openmrs/patients/search/', views.search_patients, name='search_openmrs_patients'),
    path('openmrs/patients/create/', views.create_patient, name='create_openmrs_patient'),
    path('openmrs/patients/<str:uuid>/', views.get_patient, name='get_openmrs_patient'),
    
    # Orthanc 환자 관리
    path('orthanc/patients/search/', views.search_orthanc_patients, name='search_orthanc_patients'),
    path('orthanc/patients/<str:patient_id>/', views.get_orthanc_patient, name='get_orthanc_patient'),
    
    # 환자 매핑 관리
    path('patient-mappings/', views.get_patient_mappings, name='get_patient_mappings'),
    path('patient-mappings/create/', views.create_patient_mapping, name='create_patient_mapping'),
    path('patient-mappings/<int:mapping_id>/', views.get_patient_mapping, name='get_patient_mapping'),
    path('patient-mappings/<int:mapping_id>/delete/', views.delete_patient_mapping, name='delete_patient_mapping'),
    path('patient-mappings/<int:mapping_id>/sync/', views.sync_patient_mapping, name='sync_patient_mapping'),
]