# backend/medical_integration/urls.py

from django.urls import path
from . import views

app_name = 'medical_integration'

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
    path('test-connections/', views.test_all_connections, name='test_connections'),
    path('patients/search/', views.search_patients, name='search_patients'),
    path('patients/<str:uuid>/', views.get_patient, name='get_patient'),
    path('patients/create/', views.create_patient, name='create_patient'),
    path('patient-mappings/', views.get_patient_mappings, name='get_patient_mappings'),
    path('patient-mappings/create/', views.create_patient_mapping, name='create_patient_mapping'),
]