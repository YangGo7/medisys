from django.urls import path
from . import views
from .views import (
    get_all_openmrs_patients,
    proxy_openmrs_providers,
    identifier_based_waiting_list,
    create_identifier_based_mapping,
    reception_list_view,             # ✅ 추가
    UrgentAlertList,
    UrgentAlertCount,
    AlertMarkRead,
    unassign_room,
    get_patient_mapping,
    assign_room,
    completed_patients_list          # ✅ 완료 환자 리스트 view
)
# from .views import update_patient_status  # ✅ 진료 상태 업데이트 API <-- 이 줄을 삭제합니다.

app_name = 'medical_integration'

urlpatterns = [
    # 시스템 상태
    path('health/', views.health_check, name='health_check'),
    path('test-connections/', views.test_all_connections, name='test_connections'),

    # OCS 매핑관련
    path('openmrs/patients/map/',   views.list_openmrs_patients_map,     name='list_openmrs_patients_map'),
    path('openmrs/providers/map/',  views.list_openmrs_providers_map,    name='list_openmrs_providers_map'),

    # OpenMRS 환자 관리
    path('openmrs/patients/create/', views.create_patient, name='create_openmrs_patient'),
    path('openmrs/patients/search/', views.search_patients, name='search_openmrs_patients'),
    path('openmrs/patients/<str:uuid>/', views.get_patient, name='get_openmrs_patient'),
    path('openmrs/patients/', views.get_all_patients_simple, name='get_all_patients'),

    # Orthanc 환자 관리
    path('orthanc/studies/', views.get_orthanc_studies, name='get_orthanc_studies'),
    path('orthanc/patients/search/', views.search_orthanc_patients, name='search_orthanc_patients'),
    path('orthanc/patients/<str:patient_id>/', views.get_orthanc_patient, name='get_orthanc_patient'),

    # DICOM 업로드 및 자동 매핑
    path('dicom/upload-with-mapping/', views.upload_dicom_with_auto_mapping, name='upload_dicom_with_auto_mapping'),
    path('dicom/upload/', views.upload_dicom_with_auto_mapping, name='upload_dicom'),

    # 환자별 DICOM 조회
    path('patients/<str:patient_uuid>/dicom-studies/', views.get_patient_dicom_studies, name='get_patient_dicom_studies'),
    path('dicom/studies/<str:study_id>/details/', views.get_dicom_study_details, name='get_dicom_study_details'),

    # 환자 매핑 관리
    path('patient-mappings/', views.get_patient_mappings, name='get_patient_mappings'),
    path('patient-mappings/create/', views.create_patient_mapping, name='create_patient_mapping'),
    path('patient-mappings/manual/', views.create_manual_patient_mapping, name='create_manual_patient_mapping'),
    path('patient-mappings/<int:mapping_id>/', views.get_patient_mapping, name='get_patient_mapping'),
    path('patient-mappings/<int:mapping_id>/delete/', views.delete_patient_mapping, name='delete_patient_mapping'),
    path('patient-mappings/<int:mapping_id>/sync/', views.sync_patient_mapping, name='sync_patient_mapping'),

    # 매핑되지 않은 환자 관리
    path('orthanc/unmapped-patients/', views.get_unmapped_orthanc_patients, name='get_unmapped_orthanc_patients'),
    path('mappings/batch-auto-mapping/', views.batch_auto_mapping, name='batch_auto_mapping'),

    # 더미 데이터 및 테스트
    path('dummy-data/create/', views.create_dummy_data, name='create_dummy_data'),
    path('dummy-data/clear/', views.clear_dummy_data, name='clear_dummy_data'),
    path('mappings/test-status/', views.get_mapping_test_status, name='get_mapping_test_status'),
    path('openmrs/providers/', proxy_openmrs_providers, name='openmrs_providers'),
    path('openmrs-patients/', get_all_openmrs_patients, name='get_all_openmrs_patients'),
    path('identifier-waiting/', identifier_based_waiting_list, name='identifier_based_waiting'),
    path('reception-list/', reception_list_view, name='reception_list'),                 # ✅ 오늘 접수 리스트
    path('identifier-based/', create_identifier_based_mapping, name='create_identifier_based_mapping'),

    # 알림 API
    path('alerts/urgent/', UrgentAlertList.as_view(), name='urgent_alert_list'),
    path('alerts/urgent/count/', UrgentAlertCount.as_view(), name='urgent_alert_count'),
    path('alerts/<int:pk>/mark-read/', AlertMarkRead.as_view(), name='alert_mark_read'),

    # 환자 배정
    path('assign-room/', assign_room, name='assign_room'),
    path('unassign-room/', unassign_room, name='unassign-room'),
    path('delete-mapping/<str:mapping_id>/', views.delete_patient_mapping, name='delete_patient_mapping'),
    path('waiting-board/', views.waiting_board_view, name='waiting_board'),
    path('patients/create-auto-id/', views.create_patient_auto_id, name='create_patient_auto_id'),
    path('patients/create/', views.create_patient, name='create_patient'),  # 기존 함수 (자동/수동 모두 지원)
    
    # OpenMRS 환자 관리 (기존)
    path('openmrs/patients/create/', views.create_patient, name='create_openmrs_patient'),

    # 진료 상태 업데이트 <-- 이 섹션 전체를 삭제합니다.
    # path('patient-mappings/update-status/', update_patient_status, name='update_patient_status'),

    # 완료된 환자 리스트 조회
    path('completed-patients/', completed_patients_list, name='completed_patients_list'),
    
    path('daily-summary-stats/', views.get_daily_summary_stats, name='daily_summary_stats'),
    path('debug/openmrs-metadata/', views.debug_openmrs_metadata, name='debug_openmrs_metadata'),
    path('debug/test-minimal-patient/', views.test_minimal_patient_creation, name='test_minimal_patient'),

    path('update-patient-status/', views.update_patient_status, name='update_patient_status'),
    path('complete-visit/', views.complete_visit, name='complete_visit'),
    path('room-status/', views.get_room_status, name='get_room_status'),
    path('batch-update-status/', views.batch_update_status, name='batch_update_status'),
    
    # ✅ 환자 이름 관리 API 추가
    path('update-all-patient-names/', views.update_all_patient_names, name='update_all_patient_names'),

]