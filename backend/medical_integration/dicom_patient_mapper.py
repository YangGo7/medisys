# backend/medical_integration/dicom_patient_mapper.py

import logging
import pydicom
from datetime import datetime
from django.db import transaction
from .models import PatientMapping
from .openmrs_api import OpenMRSAPI
from .orthanc_api import OrthancAPI

logger = logging.getLogger('medical_integration')

class DicomPatientMapper:
    """DICOM과 OpenMRS 환자 자동 매핑 클래스"""
    
    def __init__(self):
        self.openmrs_api = OpenMRSAPI()
        self.orthanc_api = OrthancAPI()
    
    def extract_patient_info_from_dicom(self, dicom_data):
        """DICOM 파일에서 환자 정보 추출"""
        try:
            ds = pydicom.dcmread(dicom_data, force=True)
            
            patient_info = {
                'patient_id': getattr(ds, 'PatientID', ''),
                'patient_name': str(getattr(ds, 'PatientName', '')),
                'patient_birth_date': getattr(ds, 'PatientBirthDate', ''),
                'patient_sex': getattr(ds, 'PatientSex', ''),
                'study_instance_uid': getattr(ds, 'StudyInstanceUID', ''),
                'study_date': getattr(ds, 'StudyDate', ''),
                'modality': getattr(ds, 'Modality', ''),
                'study_description': getattr(ds, 'StudyDescription', ''),
                'accession_number': getattr(ds, 'AccessionNumber', '')
            }
            
            # 환자 이름 포맷 정리 (DICOM 표준: Last^First^Middle)
            if patient_info['patient_name']:
                name_parts = str(patient_info['patient_name']).split('^')
                if len(name_parts) >= 2:
                    patient_info['family_name'] = name_parts[0].strip()
                    patient_info['given_name'] = name_parts[1].strip()
                    patient_info['formatted_name'] = f"{patient_info['given_name']} {patient_info['family_name']}"
                else:
                    patient_info['formatted_name'] = patient_info['patient_name']
            
            # 생년월일 포맷 변환 (YYYYMMDD -> YYYY-MM-DD)
            if patient_info['patient_birth_date'] and len(patient_info['patient_birth_date']) == 8:
                date_str = patient_info['patient_birth_date']
                patient_info['formatted_birth_date'] = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
            
            logger.info(f"DICOM에서 추출된 환자 정보: {patient_info}")
            return patient_info
            
        except Exception as e:
            logger.error(f"DICOM 환자 정보 추출 실패: {e}")
            return None
    
    def find_matching_openmrs_patient(self, dicom_patient_info):
        """DICOM 정보로 OpenMRS 환자 찾기"""
        try:
            # 1. Patient ID로 검색 (가장 정확한 방법)
            if dicom_patient_info.get('patient_id'):
                patients = self.openmrs_api.search_patients(dicom_patient_info['patient_id'])
                if patients and patients.get('results'):
                    logger.info(f"Patient ID로 매칭 성공: {dicom_patient_info['patient_id']}")
                    return patients['results'][0]
            
            # 2. 환자 이름으로 검색
            if dicom_patient_info.get('formatted_name'):
                patients = self.openmrs_api.search_patients(dicom_patient_info['formatted_name'])
                if patients and patients.get('results'):
                    # 생년월일로 추가 검증
                    for patient in patients['results']:
                        if self._validate_patient_match(patient, dicom_patient_info):
                            logger.info(f"이름과 생년월일로 매칭 성공: {dicom_patient_info['formatted_name']}")
                            return patient
            
            # 3. 성/이름 따로 검색
            if dicom_patient_info.get('family_name'):
                patients = self.openmrs_api.search_patients(dicom_patient_info['family_name'])
                if patients and patients.get('results'):
                    for patient in patients['results']:
                        if self._validate_patient_match(patient, dicom_patient_info):
                            logger.info(f"성으로 매칭 성공: {dicom_patient_info['family_name']}")
                            return patient
            
            logger.warning(f"매칭되는 OpenMRS 환자를 찾을 수 없음: {dicom_patient_info}")
            return None
            
        except Exception as e:
            logger.error(f"OpenMRS 환자 검색 실패: {e}")
            return None
    
    def _validate_patient_match(self, openmrs_patient, dicom_patient_info):
        """OpenMRS 환자와 DICOM 정보가 일치하는지 검증"""
        try:
            # 생년월일 비교
            if dicom_patient_info.get('formatted_birth_date'):
                openmrs_birth_date = openmrs_patient.get('person', {}).get('birthdate')
                if openmrs_birth_date:
                    # 날짜 형식 통일 (YYYY-MM-DD)
                    openmrs_date = openmrs_birth_date.split('T')[0] if 'T' in openmrs_birth_date else openmrs_birth_date
                    if openmrs_date == dicom_patient_info['formatted_birth_date']:
                        return True
            
            # 성별 비교
            if dicom_patient_info.get('patient_sex'):
                openmrs_gender = openmrs_patient.get('person', {}).get('gender')
                if openmrs_gender and openmrs_gender == dicom_patient_info['patient_sex']:
                    return True
            
            # 이름 유사도 비교 (간단한 방법)
            if dicom_patient_info.get('formatted_name'):
                openmrs_display = openmrs_patient.get('display', '').lower()
                dicom_name = dicom_patient_info['formatted_name'].lower()
                if dicom_name in openmrs_display or openmrs_display in dicom_name:
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"환자 정보 검증 실패: {e}")
            return False
    
    def create_or_update_mapping(self, orthanc_patient_id, openmrs_patient_uuid, dicom_info=None):
        """환자 매핑 생성 또는 업데이트"""
        try:
            with transaction.atomic():
                # 기존 매핑 확인
                existing_mapping = PatientMapping.objects.filter(
                    orthanc_patient_id=orthanc_patient_id,
                    is_active=True
                ).first()
                
                if existing_mapping:
                    # 기존 매핑 업데이트
                    if existing_mapping.openmrs_patient_uuid != openmrs_patient_uuid:
                        existing_mapping.openmrs_patient_uuid = openmrs_patient_uuid
                        existing_mapping.update_sync_time('SYNCED')
                        logger.info(f"기존 매핑 업데이트: {existing_mapping}")
                    return existing_mapping
                else:
                    # 새 매핑 생성
                    new_mapping = PatientMapping.objects.create(
                        orthanc_patient_id=orthanc_patient_id,
                        openmrs_patient_uuid=openmrs_patient_uuid,
                        sync_status='SYNCED'
                    )
                    logger.info(f"새 환자 매핑 생성: {new_mapping}")
                    return new_mapping
                    
        except Exception as e:
            logger.error(f"환자 매핑 생성/업데이트 실패: {e}")
            return None
    
    def process_dicom_upload(self, dicom_data, orthanc_upload_result):
        """DICOM 업로드 후 자동 매핑 처리"""
        try:
            logger.info("DICOM 업로드 후 자동 매핑 처리 시작")
            
            # 1. DICOM에서 환자 정보 추출
            dicom_patient_info = self.extract_patient_info_from_dicom(dicom_data)
            if not dicom_patient_info:
                logger.error("DICOM 환자 정보 추출 실패")
                return None
            
            # 2. Orthanc에서 Patient ID 가져오기
            orthanc_patient_id = orthanc_upload_result.get('ParentPatient')
            if not orthanc_patient_id:
                logger.error("Orthanc Patient ID를 찾을 수 없음")
                return None
            
            # 3. OpenMRS에서 매칭되는 환자 찾기
            matching_patient = self.find_matching_openmrs_patient(dicom_patient_info)
            if not matching_patient:
                logger.warning("매칭되는 OpenMRS 환자를 찾을 수 없음 - 수동 매핑 필요")
                return {
                    'success': False,
                    'message': '매칭되는 환자를 찾을 수 없습니다',
                    'dicom_info': dicom_patient_info,
                    'orthanc_patient_id': orthanc_patient_id,
                    'requires_manual_mapping': True
                }
            
            # 4. 매핑 생성
            mapping = self.create_or_update_mapping(
                orthanc_patient_id=orthanc_patient_id,
                openmrs_patient_uuid=matching_patient['uuid'],
                dicom_info=dicom_patient_info
            )
            
            if mapping:
                logger.info(f"DICOM 자동 매핑 성공: {mapping}")
                return {
                    'success': True,
                    'message': '환자 자동 매핑 완료',
                    'mapping': {
                        'mapping_id': mapping.mapping_id,
                        'orthanc_patient_id': mapping.orthanc_patient_id,
                        'openmrs_patient_uuid': mapping.openmrs_patient_uuid
                    },
                    'matched_patient': matching_patient,
                    'dicom_info': dicom_patient_info
                }
            else:
                logger.error("매핑 생성 실패")
                return {
                    'success': False,
                    'message': '매핑 생성에 실패했습니다',
                    'dicom_info': dicom_patient_info
                }
                
        except Exception as e:
            logger.error(f"DICOM 자동 매핑 처리 실패: {e}")
            return {
                'success': False,
                'message': f'자동 매핑 처리 중 오류: {str(e)}',
                'error': str(e)
            }
    
    def get_patient_dicom_studies(self, openmrs_patient_uuid):
        """OpenMRS 환자 UUID로 연결된 모든 DICOM Study 조회"""
        try:
            # 매핑 정보 조회
            mapping = PatientMapping.objects.filter(
                openmrs_patient_uuid=openmrs_patient_uuid,
                is_active=True
            ).first()
            
            if not mapping:
                logger.warning(f"환자 매핑을 찾을 수 없음: {openmrs_patient_uuid}")
                return []
            
            # Orthanc에서 환자의 Study 목록 조회
            studies = self.orthanc_api.get_patient_studies(mapping.orthanc_patient_id)
            if not studies:
                logger.info(f"환자의 Study를 찾을 수 없음: {mapping.orthanc_patient_id}")
                return []
            
            # Study 상세 정보 가져오기
            study_details = []
            for study_id in studies:
                study_info = self.orthanc_api.get_study(study_id)
                if study_info:
                    study_details.append({
                        'study_id': study_id,
                        'study_instance_uid': study_info.get('MainDicomTags', {}).get('StudyInstanceUID'),
                        'study_date': study_info.get('MainDicomTags', {}).get('StudyDate'),
                        'study_time': study_info.get('MainDicomTags', {}).get('StudyTime'),
                        'study_description': study_info.get('MainDicomTags', {}).get('StudyDescription'),
                        'modality': study_info.get('MainDicomTags', {}).get('Modality'),
                        'accession_number': study_info.get('MainDicomTags', {}).get('AccessionNumber'),
                        'series_count': len(study_info.get('Series', [])),
                        'last_update': study_info.get('LastUpdate')
                    })
            
            logger.info(f"환자 {openmrs_patient_uuid}의 DICOM Study {len(study_details)}개 조회")
            return study_details
            
        except Exception as e:
            logger.error(f"환자 DICOM Study 조회 실패: {e}")
            return []
    
    def create_manual_mapping(self, orthanc_patient_id, openmrs_patient_uuid):
        """수동 매핑 생성"""
        try:
            # OpenMRS 환자 존재 확인
            patient_info = self.openmrs_api.get_patient(openmrs_patient_uuid)
            if not patient_info:
                return {
                    'success': False,
                    'message': f'OpenMRS 환자를 찾을 수 없음: {openmrs_patient_uuid}'
                }
            
            # Orthanc 환자 존재 확인
            orthanc_info = self.orthanc_api.get_patient(orthanc_patient_id)
            if not orthanc_info:
                return {
                    'success': False,
                    'message': f'Orthanc 환자를 찾을 수 없음: {orthanc_patient_id}'
                }
            
            # 매핑 생성
            mapping = self.create_or_update_mapping(orthanc_patient_id, openmrs_patient_uuid)
            if mapping:
                return {
                    'success': True,
                    'message': '수동 매핑 생성 완료',
                    'mapping': {
                        'mapping_id': mapping.mapping_id,
                        'orthanc_patient_id': mapping.orthanc_patient_id,
                        'openmrs_patient_uuid': mapping.openmrs_patient_uuid
                    }
                }
            else:
                return {
                    'success': False,
                    'message': '매핑 생성 실패'
                }
                
        except Exception as e:
            logger.error(f"수동 매핑 생성 실패: {e}")
            return {
                'success': False,
                'message': f'수동 매핑 생성 중 오류: {str(e)}'
            }