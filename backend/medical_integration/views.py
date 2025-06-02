from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import logging
from datetime import datetime
from .openmrs_api import OpenMRSAPI
from .orthanc_api import OrthancAPI
from .models import PatientMapping
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

logger = logging.getLogger('medical_integration')

@api_view(['GET'])
def health_check(request):
    """시스템 상태 확인"""
    return Response({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'Django 의료 통합 API'
    })

@api_view(['GET'])
def test_all_connections(request):
    """모든 외부 서비스 연결 테스트"""
    results = {
        'openmrs': False,
        'orthanc': False
    }

    try:
        # OpenMRS 연결 테스트
        openmrs_api = OpenMRSAPI()
        session_info = openmrs_api.get_session()
        if session_info and not session_info.get('error'):
            results['openmrs'] = True
            logger.info("OpenMRS 연결 성공")
        else:
            logger.error("OpenMRS 세션 정보 조회 실패")
    except Exception as e:
        logger.error(f"OpenMRS 연결 실패: {e}")

    try:
        # Orthanc 연결 테스트
        orthanc_api = OrthancAPI()
        if orthanc_api.test_connection():
            results['orthanc'] = True
            logger.info("Orthanc 연결 성공")
        else:
            logger.error("Orthanc 연결 실패")
    except Exception as e:
        logger.error(f"Orthanc 연결 실패: {e}")

    return Response({
        'status': 'success' if all(results.values()) else 'partial' if any(results.values()) else 'failure',
        'connections': results
    })

@api_view(['GET'])
def search_patients(request):
    """OpenMRS에서 환자 검색"""
    query = request.GET.get('q', '')
    if not query:
        return Response({'error': '검색어(q)가 필요합니다'}, status=status.HTTP_400_BAD_REQUEST)

    api = OpenMRSAPI()
    results = api.search_patients(query)

    if results is None:
        return Response({'error': '환자 검색에 실패했습니다'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # OpenMRS의 실제 응답 구조에 맞게 파싱
    patients = []
    for result in results.get('results', []):
        # OpenMRS는 보통 display 필드에 환자 이름이 들어있음
        display_name = result.get('display', '')
        
        # person 객체에서 세부 정보 추출
        person_data = result.get('person', {})
        
        # 첫 번째 식별자 가져오기
        identifiers = result.get('identifiers', [])
        identifier = identifiers[0].get('identifier') if identifiers else None
        
        patient = {
            'uuid': result.get('uuid'),
            'identifier': identifier,
            'name': display_name,
            'display': display_name,  # ChartHeader.jsx에서 사용하는 필드
            'gender': person_data.get('gender'),
            'birthdate': person_data.get('birthdate'),
            'age': person_data.get('age'),
            'identifiers': identifiers
        }
        patients.append(patient)

    logger.info(f"환자 검색 결과: {len(patients)}명")
    return Response({
        'results': patients,
        'total': len(patients)
    })

@api_view(['GET'])
def get_patient(request, uuid):
    """UUID로 환자 상세 정보 조회"""
    api = OpenMRSAPI()
    patient = api.get_patient(uuid)
    
    if patient is None:
        return Response({'error': f'UUID {uuid}인 환자를 찾을 수 없습니다'}, status=status.HTTP_404_NOT_FOUND)
    
    # 환자 데이터 형식 지정
    formatted_patient = {
        'uuid': patient.get('uuid'),
        'identifier': next((id.get('identifier') for id in patient.get('identifiers', [])), None),
        'identifiers': [
            {
                'identifier': id.get('identifier'),
                'identifierType': id.get('identifierType', {}).get('display')
            } for id in patient.get('identifiers', [])
        ],
        'name': f"{patient.get('person', {}).get('preferredName', {}).get('givenName', '')} {patient.get('person', {}).get('preferredName', {}).get('familyName', '')}",
        'names': [
            {
                'givenName': name.get('givenName'),
                'middleName': name.get('middleName'),
                'familyName': name.get('familyName'),
                'preferred': name.get('preferred', False)
            } for name in patient.get('person', {}).get('names', [])
        ],
        'gender': patient.get('person', {}).get('gender'),
        'birthdate': patient.get('person', {}).get('birthdate'),
        'age': patient.get('person', {}).get('age'),
        'addresses': [
            {
                'address1': addr.get('address1'),
                'address2': addr.get('address2'),
                'cityVillage': addr.get('cityVillage'),
                'stateProvince': addr.get('stateProvince'),
                'country': addr.get('country'),
                'postalCode': addr.get('postalCode'),
                'preferred': addr.get('preferred', False)
            } for addr in patient.get('person', {}).get('addresses', [])
        ],
        'attributes': [
            {
                'attributeType': attr.get('attributeType', {}).get('display'),
                'value': attr.get('value')
            } for attr in patient.get('person', {}).get('attributes', [])
        ],
        'dead': patient.get('person', {}).get('dead', False),
        'deathDate': patient.get('person', {}).get('deathDate'),
        'causeOfDeath': patient.get('person', {}).get('causeOfDeath', {}).get('display') if patient.get('person', {}).get('causeOfDeath') else None
    }
    
    return Response(formatted_patient)

@csrf_exempt
@api_view(['POST', 'OPTIONS'])
def create_patient(request):
    """OpenMRS에 새 환자 생성 - 고유 식별자 자동 생성"""
    
    if request.method == 'OPTIONS':
        response = Response(status=status.HTTP_200_OK)
        response['Allow'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response
    
    api = OpenMRSAPI()
    
    try:
        data = request.data
        logger.info(f"환자 생성 요청 데이터: {data}")
        
        # 필수 필드 검증
        required_fields = ['givenName', 'familyName', 'gender', 'birthdate']
        missing_fields = [field for field in required_fields if field not in data or not data[field]]
        
        if missing_fields:
            return Response({
                'error': f'필수 필드가 누락되었습니다: {", ".join(missing_fields)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 고유한 식별자 생성
        auto_identifier = api.generate_unique_identifier()
        logger.info(f"생성된 고유 식별자: {auto_identifier}")
        
        # 환자 데이터 구성
        patient_data = {
            'person': {
                'names': [{
                    'givenName': data['givenName'],
                    'familyName': data['familyName'],
                    'middleName': data.get('middleName', ''),
                    'preferred': True
                }],
                'gender': data['gender'],
                'birthdate': data['birthdate']
            }
        }
        
        # 주소 정보 추가
        if 'address' in data and any(data['address'].values()):
            patient_data['person']['addresses'] = [{
                'address1': data['address'].get('address1', ''),
                'address2': data['address'].get('address2', ''),
                'cityVillage': data['address'].get('cityVillage', ''),
                'stateProvince': data['address'].get('stateProvince', ''),
                'country': data['address'].get('country', ''),
                'postalCode': data['address'].get('postalCode', ''),
                'preferred': True
            }]
        
        # 식별자 타입과 위치 정보 가져오기
        identifier_type = api.get_default_identifier_type()
        location = api.get_default_location()
        
        if identifier_type and location:
            patient_data['identifiers'] = [{
                'identifier': auto_identifier,  # 자동 생성된 고유 식별자
                'identifierType': identifier_type,
                'location': location,
                'preferred': True
            }]
            logger.info(f"식별자 정보 추가: {patient_data['identifiers']}")
        else:
            logger.warning("기본 식별자 타입 또는 위치를 찾을 수 없음")
        
        logger.info(f"OpenMRS로 전송할 데이터: {patient_data}")
        
        # 환자 생성
        result = api.create_patient(patient_data)
        
        if result is None:
            return Response({
                'success': False,
                'error': '환자 생성에 실패했습니다.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'success': True,
            'message': '환자가 성공적으로 생성되었습니다',
            'patient': {
                'uuid': result.get('uuid'),
                'display': result.get('display'),
                'identifiers': result.get('identifiers', []),
                'auto_generated_id': auto_identifier
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"환자 생성 실패: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        return Response({
            'success': False,
            'error': f'서버 오류: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
# 환자 매핑 관련 API

@api_view(['GET'])
def get_patient_mappings(request):
    """모든 환자 매핑 조회"""
    try:
        mappings = PatientMapping.get_active_mappings()
        
        data = []
        for mapping in mappings:
            mapping_data = {
                'mapping_id': mapping.mapping_id,
                'orthanc_patient_id': mapping.orthanc_patient_id,
                'openmrs_patient_uuid': mapping.openmrs_patient_uuid,
                'created_date': mapping.created_date.isoformat() if mapping.created_date else None,
                'last_sync': mapping.last_sync.isoformat() if mapping.last_sync else None,
                'sync_status': mapping.sync_status,
                'error_message': mapping.error_message,
                'is_active': mapping.is_active
            }
            data.append(mapping_data)
        
        return Response({
            'results': data,
            'total': len(data)
        })
        
    except Exception as e:
        logger.error(f"환자 매핑 조회 실패: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def create_patient_mapping(request):
    """새 환자 매핑 생성"""
    try:
        orthanc_patient_id = request.data.get('orthanc_patient_id')
        openmrs_patient_uuid = request.data.get('openmrs_patient_uuid')
        
        if not orthanc_patient_id or not openmrs_patient_uuid:
            return Response({
                'error': 'orthanc_patient_id와 openmrs_patient_uuid가 모두 필요합니다'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 중복 매핑 확인
        existing_mapping = PatientMapping.objects.filter(
            orthanc_patient_id=orthanc_patient_id,
            openmrs_patient_uuid=openmrs_patient_uuid
        ).first()
        
        if existing_mapping:
            return Response({
                'error': '이미 존재하는 매핑입니다',
                'existing_mapping_id': existing_mapping.mapping_id
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 새 매핑 생성
        mapping = PatientMapping.objects.create(
            orthanc_patient_id=orthanc_patient_id,
            openmrs_patient_uuid=openmrs_patient_uuid
        )
        
        # 매핑 검증
        validation_errors = mapping.validate_mapping()
        if validation_errors:
            mapping.update_sync_time(status='ERROR', error_message='; '.join(validation_errors))
            logger.warning(f"매핑 검증 실패: {validation_errors}")
        else:
            mapping.update_sync_time(status='SYNCED')
            logger.info(f"새 환자 매핑 생성됨: {mapping}")
        
        return Response({
            'mapping_id': mapping.mapping_id,
            'orthanc_patient_id': mapping.orthanc_patient_id,
            'openmrs_patient_uuid': mapping.openmrs_patient_uuid,
            'created_date': mapping.created_date.isoformat(),
            'sync_status': mapping.sync_status,
            'validation_errors': validation_errors if validation_errors else None
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"환자 매핑 생성 실패: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_patient_mapping(request, mapping_id):
    """특정 환자 매핑 조회"""
    try:
        mapping = PatientMapping.objects.get(mapping_id=mapping_id, is_active=True)
        
        # 연결된 환자 정보도 함께 조회
        orthanc_info = mapping.get_orthanc_patient_info()
        openmrs_info = mapping.get_openmrs_patient_info()
        
        return Response({
            'mapping': {
                'mapping_id': mapping.mapping_id,
                'orthanc_patient_id': mapping.orthanc_patient_id,
                'openmrs_patient_uuid': mapping.openmrs_patient_uuid,
                'created_date': mapping.created_date.isoformat(),
                'last_sync': mapping.last_sync.isoformat() if mapping.last_sync else None,
                'sync_status': mapping.sync_status,
                'error_message': mapping.error_message,
            },
            'orthanc_patient': orthanc_info,
            'openmrs_patient': openmrs_info
        })
        
    except PatientMapping.DoesNotExist:
        return Response({'error': '매핑을 찾을 수 없습니다'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"환자 매핑 조회 실패: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
def delete_patient_mapping(request, mapping_id):
    """환자 매핑 삭제 (비활성화)"""
    try:
        mapping = PatientMapping.objects.get(mapping_id=mapping_id, is_active=True)
        mapping.is_active = False
        mapping.save(update_fields=['is_active'])
        
        logger.info(f"환자 매핑 비활성화됨: {mapping}")
        
        return Response({
            'success': True,
            'message': '매핑이 비활성화되었습니다'
        })
        
    except PatientMapping.DoesNotExist:
        return Response({'error': '매핑을 찾을 수 없습니다'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"환자 매핑 삭제 실패: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def sync_patient_mapping(request, mapping_id):
    """환자 매핑 동기화 상태 업데이트"""
    try:
        mapping = PatientMapping.objects.get(mapping_id=mapping_id, is_active=True)
        
        # 매핑 검증
        validation_errors = mapping.validate_mapping()
        
        if validation_errors:
            mapping.update_sync_time(status='ERROR', error_message='; '.join(validation_errors))
            return Response({
                'success': False,
                'sync_status': 'ERROR',
                'error_message': '; '.join(validation_errors),
                'last_sync': mapping.last_sync.isoformat()
            })
        else:
            mapping.update_sync_time(status='SYNCED')
            return Response({
                'success': True,
                'sync_status': 'SYNCED',
                'last_sync': mapping.last_sync.isoformat()
            })
        
    except PatientMapping.DoesNotExist:
        return Response({'error': '매핑을 찾을 수 없습니다'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"환자 매핑 동기화 실패: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def search_orthanc_patients(request):
    """Orthanc에서 환자 검색"""
    query = request.query_params.get('q', '')
    if not query:
        return Response({'error': '검색어(q)가 필요합니다'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        orthanc_api = OrthancAPI()
        results = orthanc_api.search_patients_by_name(query)
        
        patients = []
        for result in results:
            patient_info = result.get('patient_info', {})
            main_tags = patient_info.get('MainDicomTags', {})
            
            patient = {
                'patient_id': result.get('patient_id'),
                'patient_name': main_tags.get('PatientName', ''),
                'patient_birth_date': main_tags.get('PatientBirthDate', ''),
                'patient_sex': main_tags.get('PatientSex', ''),
                'patient_id_dicom': main_tags.get('PatientID', ''),
                'studies_count': len(patient_info.get('Studies', [])),
                'last_update': patient_info.get('LastUpdate', '')
            }
            patients.append(patient)
        
        return Response({
            'results': patients,
            'total': len(patients)
        })
        
    except Exception as e:
        logger.error(f"Orthanc 환자 검색 실패: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_orthanc_patient(request, patient_id):
    """Orthanc 환자 상세 정보 조회"""
    try:
        orthanc_api = OrthancAPI()
        patient_info = orthanc_api.get_patient(patient_id)
        
        if not patient_info:
            return Response({'error': f'Orthanc에서 환자 {patient_id}를 찾을 수 없습니다'}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        # Studies 정보도 함께 조회
        studies = orthanc_api.get_patient_studies(patient_id)
        
        formatted_patient = {
            'patient_id': patient_id,
            'main_dicom_tags': patient_info.get('MainDicomTags', {}),
            'studies': studies or [],
            'studies_count': len(studies) if studies else 0,
            'last_update': patient_info.get('LastUpdate', ''),
            'type': patient_info.get('Type', ''),
            'is_stable': patient_info.get('IsStable', False)
        }
        
        return Response(formatted_patient)
        
    except Exception as e:
        logger.error(f"Orthanc 환자 조회 실패: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
# backend/medical_integration/views.py에 추가

import tempfile
import os
import pydicom
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

@csrf_exempt
@api_view(['POST'])
def upload_dicom_with_mapping(request):
    """DICOM 파일 업로드 및 환자 UUID 매핑"""
    try:
        # 파일 및 환자 정보 확인
        if 'dicom_file' not in request.FILES:
            return Response({
                'error': 'DICOM 파일이 없습니다'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        patient_uuid = request.POST.get('patient_uuid')
        if not patient_uuid:
            return Response({
                'error': '환자 UUID가 필요합니다'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        dicom_file = request.FILES['dicom_file']
        
        logger.info(f"DICOM 업로드 시작: {dicom_file.name}, 환자 UUID: {patient_uuid}")
        
        # 1. OpenMRS 환자 정보 확인
        openmrs_api = OpenMRSAPI()
        patient_info = openmrs_api.get_patient(patient_uuid)
        
        if not patient_info:
            return Response({
                'error': f'환자 UUID {patient_uuid}를 찾을 수 없습니다'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # 환자 이름 추출
        person = patient_info.get('person', {})
        names = person.get('names', [])
        if names:
            name_obj = names[0]
            patient_name = f"{name_obj.get('familyName', '')}^{name_obj.get('givenName', '')}".strip()
        else:
            patient_name = "Unknown^Patient"
        
        patient_birth_date = person.get('birthdate', '')
        patient_sex = person.get('gender', 'O')
        
        logger.info(f"환자 정보: {patient_name}, {patient_birth_date}, {patient_sex}")
        
        # 2. 임시 파일로 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix='.dcm') as temp_file:
            for chunk in dicom_file.chunks():
                temp_file.write(chunk)
            temp_file_path = temp_file.name
        
        try:
            # 3. DICOM 파일 수정 (환자 정보 업데이트)
            ds = pydicom.dcmread(temp_file_path)
            
            # 환자 정보 업데이트
            ds.PatientName = patient_name
            ds.PatientID = patient_uuid  # OpenMRS UUID를 Patient ID로 사용
            ds.PatientBirthDate = patient_birth_date.replace('-', '') if patient_birth_date else ''
            ds.PatientSex = patient_sex
            
            # Study 정보 업데이트 (필요시)
            if not hasattr(ds, 'StudyInstanceUID') or not ds.StudyInstanceUID:
                ds.StudyInstanceUID = pydicom.uid.generate_uid()
            
            if not hasattr(ds, 'SeriesInstanceUID') or not ds.SeriesInstanceUID:
                ds.SeriesInstanceUID = pydicom.uid.generate_uid()
            
            if not hasattr(ds, 'SOPInstanceUID') or not ds.SOPInstanceUID:
                ds.SOPInstanceUID = pydicom.uid.generate_uid()
            
            # 수정된 DICOM 저장
            modified_file_path = temp_file_path + '_modified.dcm'
            ds.save_as(modified_file_path)
            
            logger.info(f"DICOM 파일 수정 완료: {modified_file_path}")
            
            # 4. Orthanc에 업로드
            orthanc_api = OrthancAPI()
            
            with open(modified_file_path, 'rb') as f:
                dicom_data = f.read()
            
            # Orthanc에 DICOM 업로드
            upload_result = orthanc_api.upload_dicom(dicom_data)
            
            if not upload_result:
                return Response({
                    'error': 'Orthanc 업로드에 실패했습니다'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            logger.info(f"Orthanc 업로드 성공: {upload_result}")
            
            # 5. 매핑 생성 또는 업데이트
            orthanc_patient_id = upload_result.get('ParentPatient')
            
            if orthanc_patient_id:
                mapping, created = PatientMapping.objects.get_or_create(
                    openmrs_patient_uuid=patient_uuid,
                    defaults={
                        'orthanc_patient_id': orthanc_patient_id,
                        'sync_status': 'SYNCED'
                    }
                )
                
                if not created and mapping.orthanc_patient_id != orthanc_patient_id:
                    # 기존 매핑의 Orthanc ID 업데이트
                    mapping.orthanc_patient_id = orthanc_patient_id
                    mapping.update_sync_time('SYNCED')
                
                logger.info(f"환자 매핑 {'생성' if created else '업데이트'}: {mapping}")
            
            # 6. 업로드 결과 반환
            return Response({
                'success': True,
                'message': 'DICOM 파일이 성공적으로 업로드되었습니다',
                'upload_result': {
                    'orthanc_instance_id': upload_result.get('ID'),
                    'orthanc_patient_id': orthanc_patient_id,
                    'study_instance_uid': ds.StudyInstanceUID,
                    'series_instance_uid': ds.SeriesInstanceUID,
                    'sop_instance_uid': ds.SOPInstanceUID
                },
                'patient_info': {
                    'uuid': patient_uuid,
                    'name': patient_name,
                    'modified_dicom_tags': {
                        'PatientName': ds.PatientName,
                        'PatientID': ds.PatientID,
                        'PatientBirthDate': ds.PatientBirthDate,
                        'PatientSex': ds.PatientSex
                    }
                },
                'mapping': {
                    'mapping_id': mapping.mapping_id if 'mapping' in locals() else None,
                    'created': created if 'created' in locals() else False
                }
            }, status=status.HTTP_201_CREATED)
            
        finally:
            # 임시 파일 정리
            try:
                os.unlink(temp_file_path)
                if 'modified_file_path' in locals():
                    os.unlink(modified_file_path)
            except:
                pass
        
    except Exception as e:
        logger.error(f"DICOM 업로드 실패: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        return Response({
            'error': str(e),
            'traceback': traceback.format_exc() if settings.DEBUG else None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)