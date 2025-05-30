from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import logging
from datetime import datetime, date  # 👈 date import 추가!
from .openmrs_api import OpenMRSAPI
from .orthanc_api import OrthancAPI
from .models import PatientMapping
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.conf import settings
import requests
from requests.auth import HTTPBasicAuth
import uuid


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
    query = request.GET.get('q', '')  # 수정된 부분
    if not query:
        return Response({'error': '검색어(q)가 필요합니다'}, status=status.HTTP_400_BAD_REQUEST)

    api = OpenMRSAPI()
    results = api.search_patients(query)

    if results is None:
        return Response({'error': '환자 검색에 실패했습니다'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # 결과를 더 간단한 형식으로 변환
    patients = []
    for result in results.get('results', []):
        patient = {
            'uuid': result.get('uuid'),
            'identifier': next((id.get('identifier') for id in result.get('identifiers', [])), None),
            'name': f"{result.get('person', {}).get('preferredName', {}).get('givenName', '')} {result.get('person', {}).get('preferredName', {}).get('familyName', '')}",
            'gender': result.get('person', {}).get('gender'),
            'birthdate': result.get('person', {}).get('birthdate'),
            'age': result.get('person', {}).get('age')
        }
        patients.append(patient)

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

logger = logging.getLogger('medical_integration')

@api_view(['POST'])
def create_patient(request):
    """OpenMRS에 새 환자 생성"""
    
    try:
        data = request.data
        logger.info(f"환자 생성 요청: {data}")
        
        # 필수 필드 검증
        required_fields = ['givenName', 'familyName', 'gender', 'birthdate']
        for field in required_fields:
            if field not in data or not data[field]:
                logger.error(f'필수 필드 누락: {field}')
                return Response({'error': f'필수 필드가 누락되었습니다: {field}'}, status=status.HTTP_400_BAD_REQUEST)
        
        # 생년월일 유효성 검사
        try:
            birth_date = datetime.strptime(data['birthdate'], '%Y-%m-%d').date()
            today = date.today()
            
            if birth_date > today:
                return Response({
                    'error': f'생년월일은 오늘({today}) 이전이어야 합니다. 입력된 날짜: {birth_date}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if birth_date < date(1900, 1, 1):
                return Response({
                    'error': '생년월일은 1900년 이후여야 합니다.'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except ValueError:
            return Response({
                'error': '올바른 날짜 형식(YYYY-MM-DD)으로 입력해주세요.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # OpenMRS 연결 확인
        try:
            config = settings.EXTERNAL_SERVICES['openmrs']
            base_url = f"http://{config['host']}:{config['port']}/openmrs"
            auth = HTTPBasicAuth(config['username'], config['password'])
            
            # 세션 확인
            session_response = requests.get(
                f"{base_url}/ws/rest/v1/session",
                auth=auth,
                timeout=10
            )
            
            if session_response.status_code != 200:
                logger.error(f"OpenMRS 세션 확인 실패: {session_response.status_code}")
                return Response({
                    'error': 'OpenMRS 서버에 연결할 수 없습니다.'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
            session_data = session_response.json()
            logger.info(f"OpenMRS 세션 확인: {session_data.get('user', {}).get('display', 'Unknown')}")
            
        except requests.exceptions.RequestException as e:
            logger.error(f"OpenMRS 연결 오류: {e}")
            return Response({
                'error': 'OpenMRS 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        # 환자 데이터 준비 (최소한의 정보만)
        patient_data = {
            "person": {
                "names": [
                    {
                        "givenName": data['givenName'].strip(),
                        "familyName": data['familyName'].strip(),
                        "preferred": True
                    }
                ],
                "gender": data['gender'],
                "birthdate": data['birthdate']
            }
        }
        
        # 중간 이름이 있으면 추가
        if data.get('middleName', '').strip():
            patient_data["person"]["names"][0]["middleName"] = data['middleName'].strip()
        
        logger.info(f"OpenMRS 전송 데이터: {patient_data}")
        
        # 환자 생성 API 호출
        try:
            patient_response = requests.post(
                f"{base_url}/ws/rest/v1/patient",
                json=patient_data,
                auth=auth,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            logger.info(f"OpenMRS 응답 상태: {patient_response.status_code}")
            
            if patient_response.status_code == 201:
                result = patient_response.json()
                logger.info("환자 생성 성공!")
                
                return Response({
                    'success': True,
                    'patient': {
                        'uuid': result.get('uuid'),
                        'identifiers': [
                            {
                                'identifier': id.get('identifier'),
                                'identifierType': id.get('identifierType', {}).get('display', 'OpenMRS ID')
                            } for id in result.get('identifiers', [])
                        ]
                    }
                }, status=status.HTTP_201_CREATED)
            
            else:
                # 오류 응답 파싱
                logger.error(f"OpenMRS 환자 생성 실패: {patient_response.status_code}")
                logger.error(f"응답 내용: {patient_response.text}")
                
                try:
                    error_data = patient_response.json()
                    error_message = error_data.get('error', {}).get('message', patient_response.text)
                except:
                    error_message = patient_response.text
                
                return Response({
                    'error': f'OpenMRS 환자 생성 실패: {error_message}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except requests.exceptions.RequestException as e:
            logger.error(f"OpenMRS 요청 오류: {str(e)}")
            return Response({
                'error': f'OpenMRS 서버 요청 실패: {str(e)}'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
    except Exception as e:
        logger.error(f"환자 생성 실패: {str(e)}", exc_info=True)
        return Response({'error': f'서버 오류: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 추가: OpenMRS 상태 확인 API
@api_view(['GET'])
def check_openmrs_status(request):
    """OpenMRS 서버 연결 상태 확인"""
    try:
        config = settings.EXTERNAL_SERVICES['openmrs']
        base_url = f"http://{config['host']}:{config['port']}/openmrs"
        
        response = requests.get(
            f"{base_url}/ws/rest/v1/session",
            auth=HTTPBasicAuth(config['username'], config['password']),
            timeout=10
        )
        
        if response.status_code == 200:
            session_data = response.json()
            return Response({
                'status': 'connected',
                'openmrs_version': session_data.get('version', 'Unknown'),
                'user': session_data.get('user', {}).get('display', 'Unknown'),
                'message': 'OpenMRS 서버 연결 정상'
            })
        else:
            return Response({
                'status': 'error',
                'message': f'OpenMRS 연결 실패: HTTP {response.status_code}',
                'details': response.text
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
    except requests.exceptions.ConnectionError:
        return Response({
            'status': 'offline',
            'message': 'OpenMRS 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        return Response({
            'status': 'error',
            'message': f'오류 발생: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 추가: OpenMRS 연결 및 설정 테스트 함수
@api_view(['GET'])
def test_openmrs_configuration(request):
    """OpenMRS 설정 및 연결 상태 상세 테스트"""
    import requests
    from requests.auth import HTTPBasicAuth
    from django.conf import settings
    
    try:
        config = settings.EXTERNAL_SERVICES['openmrs']
        base_url = f"http://{config['host']}:{config['port']}/openmrs"
        
        results = {
            'config': config,
            'base_url': base_url,
            'tests': {}
        }
        
        auth = HTTPBasicAuth(config['username'], config['password'])
        
        # 1. 기본 연결 테스트
        try:
            response = requests.get(f"{base_url}/ws/rest/v1/session", auth=auth, timeout=10)
            results['tests']['session'] = {
                'status': response.status_code,
                'success': response.status_code == 200,
                'data': response.json() if response.status_code == 200 else response.text
            }
        except Exception as e:
            results['tests']['session'] = {'success': False, 'error': str(e)}
        
        # 2. 환자 목록 테스트
        try:
            response = requests.get(f"{base_url}/ws/rest/v1/patient", auth=auth, timeout=10)
            results['tests']['patient_list'] = {
                'status': response.status_code,
                'success': response.status_code == 200,
                'data': response.json() if response.status_code == 200 else response.text[:500]
            }
        except Exception as e:
            results['tests']['patient_list'] = {'success': False, 'error': str(e)}
        
        # 3. 식별자 타입 조회
        try:
            response = requests.get(f"{base_url}/ws/rest/v1/patientidentifiertype", auth=auth, timeout=10)
            results['tests']['identifier_types'] = {
                'status': response.status_code,
                'success': response.status_code == 200,
                'data': response.json() if response.status_code == 200 else response.text[:500]
            }
        except Exception as e:
            results['tests']['identifier_types'] = {'success': False, 'error': str(e)}
        
        # 4. 위치 정보 조회
        try:
            response = requests.get(f"{base_url}/ws/rest/v1/location", auth=auth, timeout=10)
            results['tests']['locations'] = {
                'status': response.status_code,
                'success': response.status_code == 200,
                'data': response.json() if response.status_code == 200 else response.text[:500]
            }
        except Exception as e:
            results['tests']['locations'] = {'success': False, 'error': str(e)}
        
        return Response(results)
        
    except Exception as e:
        return Response({
            'error': f'설정 테스트 실패: {str(e)}'
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