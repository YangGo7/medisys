# backend/openmrs_models/urls.py
# 🔥 OpenMRS 진단 코드 중심으로 완전 정리된 URL 패턴

from django.urls import path
from . import views
urlpatterns = [
    # 🏥 기존 기본 API들
    path('vitals/', views.openmrs_vitals, name='openmrs_vitals'),
    path('encounters/', views.openmrs_encounters, name='openmrs_encounters'),
    path('person-uuid-by-identifier/<str:patient_identifier>/', views.get_person_uuid_by_identifier, name='get_person_uuid_by_identifier'),
    path('patient/<str:patient_uuid>/create-encounter/', views.create_encounter_with_data, name='create_encounter_with_data'),
]