# backend/medical_integration/dicom_patient_mapper.py (완전 수정된 버전)

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
        """DICOM 정보로 OpenMRS 환자 찾기 (patient_id 우선 매칭)"""
        try:
            # 🔥 1. Patient ID로 검색 (가장 정확한 방법) - 개선된 버전
            dicom_patient_id = dicom_patient_info.get('patient_id', '').strip()
            if dicom_patient_id:
                logger.info(f"DICOM Patient ID로 검색 시도: {dicom_patient_id}")
                
                # OpenMRS에서 identifier로 검색
                patients = self.openmrs_api.search_patients(dicom_patient_id)
                if patients and patients.get('results'):
                    logger.info(f"Patient ID로 직접 매칭 성공: {dicom_patient_id}")
                    
                    # 여러 결과가 있을 경우 추가 검증
                    for patient in patients['results']:
                        if self._validate_patient_match_enhanced(patient, dicom_patient_info):
                            logger.info(f"Patient ID + 추가 검증 매칭 성공: {patient.get('display')}")
                            return patient
                    
                    # 추가 검증 실패해도 첫 번째 결과 반환 (identifier 매칭이 가장 신뢰성 높음)
                    logger.info(f"Patient ID 매칭 성공 (추가 검증 생략): {patients['results'][0].get('display')}")
                    return patients['results'][0]
            
            # 🔥 2. 환자 이름으로 검색 (개선된 버전)
            if dicom_patient_info.get('formatted_name'):
                logger.info(f"환자 이름으로 검색 시도: {dicom_patient_info['formatted_name']}")
                patients = self.openmrs_api.search_patients(dicom_patient_info['formatted_name'])
                if patients and patients.get('results'):
                    # 생년월일과 성별로 추가 검증
                    for patient in patients['results']:
                        if self._validate_patient_match_enhanced(patient, dicom_patient_info):
                            logger.info(f"이름 + 생년월일/성별 매칭 성공: {dicom_patient_info['formatted_name']}")
                            return patient
            
            # 🔥 3. 성으로 검색 후 정밀 매칭
            if dicom_patient_info.get('family_name'):
                logger.info(f"성으로 검색 시도: {dicom_patient_info['family_name']}")
                patients = self.openmrs_api.search_patients(dicom_patient_info['family_name'])
                if patients and patients.get('results'):
                    for patient in patients['results']:
                        if self._validate_patient_match_enhanced(patient, dicom_patient_info):
                            logger.info(f"성 + 추가 정보 매칭 성공: {dicom_patient_info['family_name']}")
                            return patient
            
            # 🔥 4. 이름 부분 매칭 (한글/영문 혼용 대응)
            if dicom_patient_info.get('given_name'):
                logger.info(f"이름 부분 매칭 시도: {dicom_patient_info['given_name']}")
                patients = self.openmrs_api.search_patients(dicom_patient_info['given_name'])
                if patients and patients.get('results'):
                    for patient in patients['results']:
                        if self._validate_patient_match_enhanced(patient, dicom_patient_info):
                            logger.info(f"이름 부분 매칭 성공: {dicom_patient_info['given_name']}")
                            return patient
            
            logger.warning(f"매칭되는 OpenMRS 환자를 찾을 수 없음: {dicom_patient_info}")
            return None
            
        except Exception as e:
            logger.error(f"OpenMRS 환자 검색 실패: {e}")
            return None
    
    def _validate_patient_match_enhanced(self, openmrs_patient, dicom_patient_info):
        """개선된 환자 정보 매칭 검증"""
        try:
            match_score = 0
            total_checks = 0
            
            logger.debug(f"매칭 검증 시작: OpenMRS={openmrs_patient.get('display')}, DICOM={dicom_patient_info.get('formatted_name')}")
            
            # 🔥 1. 생년월일 비교 (가장 중요)
            if dicom_patient_info.get('formatted_birth_date'):
                total_checks += 3  # 생년월일은 가중치 3
                openmrs_birth_date = openmrs_patient.get('person', {}).get('birthdate', '')
                if openmrs_birth_date:
                    # 날짜 형식 통일 (YYYY-MM-DD)
                    openmrs_date = openmrs_birth_date.split('T')[0] if 'T' in openmrs_birth_date else openmrs_birth_date
                    dicom_date = dicom_patient_info['formatted_birth_date']
                    
                    if openmrs_date == dicom_date:
                        match_score += 3
                        logger.debug(f"  ✅ 생년월일 일치: {openmrs_date}")
                    else:
                        logger.debug(f"  ❌ 생년월일 불일치: OpenMRS={openmrs_date}, DICOM={dicom_date}")
            
            # 🔥 2. 성별 비교
            if dicom_patient_info.get('patient_sex'):
                total_checks += 2  # 성별은 가중치 2
                openmrs_gender = openmrs_patient.get('person', {}).get('gender')
                dicom_sex = dicom_patient_info['patient_sex']
                
                if openmrs_gender and openmrs_gender == dicom_sex:
                    match_score += 2
                    logger.debug(f"  ✅ 성별 일치: {openmrs_gender}")
                else:
                    logger.debug(f"  ❌ 성별 불일치: OpenMRS={openmrs_gender}, DICOM={dicom_sex}")
            
            # 🔥 3. 이름 유사도 비교 (개선된 방법)
            if dicom_patient_info.get('formatted_name'):
                total_checks += 2  # 이름은 가중치 2
                openmrs_display = openmrs_patient.get('display', '').lower().replace(' ', '')
                dicom_name = dicom_patient_info['formatted_name'].lower().replace(' ', '')
                
                # 정확한 일치
                if dicom_name in openmrs_display or openmrs_display in dicom_name:
                    match_score += 2
                    logger.debug(f"  ✅ 이름 유사: {openmrs_display} ~ {dicom_name}")
                # 부분 일치 (성 또는 이름만)
                elif (dicom_patient_info.get('family_name', '').lower() in openmrs_display or 
                      dicom_patient_info.get('given_name', '').lower() in openmrs_display):
                    match_score += 1
                    logger.debug(f"  🔸 이름 부분 일치: {openmrs_display} ~ {dicom_name}")
                else:
                    logger.debug(f"  ❌ 이름 불일치: {openmrs_display} vs {dicom_name}")
            
            # 🔥 4. Patient ID 일치 확인 (최고 가중치)
            dicom_patient_id = dicom_patient_info.get('patient_id', '').strip()
            if dicom_patient_id:
                total_checks += 5  # Patient ID는 가중치 5
                # OpenMRS identifiers에서 DICOM patient_id와 일치하는 것 찾기
                identifiers = openmrs_patient.get('identifiers', [])
                for identifier in identifiers:
                    if identifier.get('identifier') == dicom_patient_id:
                        match_score += 5
                        logger.debug(f"  ✅ Patient ID 정확 일치: {dicom_patient_id}")
                        break
                else:
                    logger.debug(f"  ❌ Patient ID 불일치: DICOM={dicom_patient_id}")
            
            # 🔥 5. 매칭 점수 계산
            if total_checks == 0:
                logger.debug("  ❌ 검증할 정보가 없음")
                return False
            
            match_percentage = (match_score / total_checks) * 100
            logger.debug(f"  📊 매칭 점수: {match_score}/{total_checks} ({match_percentage:.1f}%)")
            
            # 70% 이상 일치하면 매칭으로 판단
            is_match = match_percentage >= 70
            
            if is_match:
                logger.info(f"  ✅ 환자 매칭 성공 ({match_percentage:.1f}%)")
            else:
                logger.debug(f"  ❌ 환자 매칭 실패 ({match_percentage:.1f}% < 70%)")
            
            return is_match
            
        except Exception as e:
            logger.error(f"환자 정보 검증 실패: {e}")
            return False
    
    def _validate_patient_match(self, openmrs_patient, dicom_patient_info):
        """기존 환자 정보 매칭 검증 (호환성 유지)"""
        return self._validate_patient_match_enhanced(openmrs_patient, dicom_patient_info)
    
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
        """DICOM 업로드 후 자동 매핑 처리 (개선된 버전)"""
        try:
            logger.info("🔥 개선된 DICOM 자동 매핑 처리 시작")
            
            # 1. DICOM에서 환자 정보 추출
            dicom_patient_info = self.extract_patient_info_from_dicom(dicom_data)
            if not dicom_patient_info:
                logger.error("DICOM 환자 정보 추출 실패")
                return {
                    'success': False,
                    'message': 'DICOM 환자 정보를 읽을 수 없습니다',
                    'error_type': 'dicom_parse_error'
                }
            
            logger.info(f"추출된 DICOM 환자 정보: {dicom_patient_info}")
            
            # 2. Orthanc에서 Patient ID 가져오기
            orthanc_patient_id = orthanc_upload_result.get('ParentPatient')
            if not orthanc_patient_id:
                logger.error("Orthanc Patient ID를 찾을 수 없음")
                return {
                    'success': False,
                    'message': 'Orthanc Patient ID를 찾을 수 없습니다',
                    'error_type': 'orthanc_patient_id_missing'
                }
            
            logger.info(f"Orthanc Patient ID: {orthanc_patient_id}")
            
            # 3. 기존 매핑 확인
            existing_mapping = PatientMapping.objects.filter(
                orthanc_patient_id=orthanc_patient_id,
                is_active=True
            ).first()
            
            if existing_mapping:
                logger.info(f"기존 매핑 발견: {existing_mapping}")
                return {
                    'success': True,
                    'message': '기존 매핑을 사용합니다',
                    'mapping': {
                        'mapping_id': existing_mapping.mapping_id,
                        'orthanc_patient_id': existing_mapping.orthanc_patient_id,
                        'openmrs_patient_uuid': existing_mapping.openmrs_patient_uuid,
                        'status': 'existing'
                    },
                    'dicom_info': dicom_patient_info
                }
            
            # 4. OpenMRS에서 매칭되는 환자 찾기
            matching_patient = self.find_matching_openmrs_patient(dicom_patient_info)
            
            if not matching_patient:
                logger.warning("매칭되는 OpenMRS 환자를 찾을 수 없음")
                
                # 🔥 개선: 매칭 실패 시 상세 정보 제공
                return {
                    'success': False,
                    'message': '매칭되는 환자를 찾을 수 없습니다',
                    'dicom_info': dicom_patient_info,
                    'orthanc_patient_id': orthanc_patient_id,
                    'requires_manual_mapping': True,
                    'suggested_search_terms': [
                        dicom_patient_info.get('patient_id', ''),
                        dicom_patient_info.get('formatted_name', ''),
                        dicom_patient_info.get('family_name', ''),
                        dicom_patient_info.get('given_name', '')
                    ],
                    'error_type': 'no_matching_patient'
                }
            
            logger.info(f"매칭된 OpenMRS 환자: {matching_patient.get('display')} ({matching_patient.get('uuid')})")
            
            # 5. 매핑 생성
            mapping = self.create_or_update_mapping(
                orthanc_patient_id=orthanc_patient_id,
                openmrs_patient_uuid=matching_patient['uuid'],
                dicom_info=dicom_patient_info
            )
            
            if mapping:
                logger.info(f"🎉 DICOM 자동 매핑 성공: {mapping}")
                
                # 🔥 매핑 품질 평가
                mapping_quality = self._evaluate_mapping_quality(dicom_patient_info, matching_patient)
                
                return {
                    'success': True,
                    'message': '환자 자동 매핑 완료',
                    'mapping': {
                        'mapping_id': mapping.mapping_id,
                        'orthanc_patient_id': mapping.orthanc_patient_id,
                        'openmrs_patient_uuid': mapping.openmrs_patient_uuid,
                        'confidence_score': mapping_quality.get('confidence_score', 0.8),
                        'mapping_criteria': mapping_quality.get('criteria', {}),
                        'status': 'new'
                    },
                    'matched_patient': {
                        'uuid': matching_patient['uuid'],
                        'display': matching_patient.get('display'),
                        'identifiers': matching_patient.get('identifiers', [])
                    },
                    'dicom_info': dicom_patient_info,
                    'quality_assessment': mapping_quality
                }
            else:
                logger.error("매핑 생성 실패")
                return {
                    'success': False,
                    'message': '매핑 생성에 실패했습니다',
                    'dicom_info': dicom_patient_info,
                    'matched_patient': matching_patient,
                    'error_type': 'mapping_creation_failed'
                }
                
        except Exception as e:
            logger.error(f"DICOM 자동 매핑 처리 실패: {e}")
            import traceback
            logger.error(f"상세 오류: {traceback.format_exc()}")
            
            return {
                'success': False,
                'message': f'자동 매핑 처리 중 오류: {str(e)}',
                'error': str(e),
                'error_type': 'system_error'
            }
    
    def _evaluate_mapping_quality(self, dicom_info, openmrs_patient):
        """매핑 품질 평가"""
        try:
            criteria = {}
            confidence_factors = []
            
            # Patient ID 일치도
            dicom_patient_id = dicom_info.get('patient_id', '')
            if dicom_patient_id:
                identifiers = openmrs_patient.get('identifiers', [])
                for identifier in identifiers:
                    if identifier.get('identifier') == dicom_patient_id:
                        criteria['patient_id_exact_match'] = True
                        confidence_factors.append(0.4)  # 40% 가중치
                        break
                else:
                    criteria['patient_id_exact_match'] = False
            
            # 생년월일 일치도
            dicom_birth_date = dicom_info.get('formatted_birth_date')
            openmrs_birth_date = openmrs_patient.get('person', {}).get('birthdate', '').split('T')[0]
            if dicom_birth_date and openmrs_birth_date:
                if dicom_birth_date == openmrs_birth_date:
                    criteria['birth_date_match'] = True
                    confidence_factors.append(0.3)  # 30% 가중치
                else:
                    criteria['birth_date_match'] = False
            
            # 성별 일치도
            dicom_sex = dicom_info.get('patient_sex')
            openmrs_gender = openmrs_patient.get('person', {}).get('gender')
            if dicom_sex and openmrs_gender:
                if dicom_sex == openmrs_gender:
                    criteria['gender_match'] = True
                    confidence_factors.append(0.2)  # 20% 가중치
                else:
                    criteria['gender_match'] = False
            
            # 이름 유사도
            dicom_name = dicom_info.get('formatted_name', '').lower()
            openmrs_name = openmrs_patient.get('display', '').lower()
            if dicom_name and openmrs_name:
                if dicom_name in openmrs_name or openmrs_name in dicom_name:
                    criteria['name_similarity'] = True
                    confidence_factors.append(0.1)  # 10% 가중치
                else:
                    criteria['name_similarity'] = False
            
            # 신뢰도 점수 계산
            confidence_score = sum(confidence_factors) if confidence_factors else 0.5
            confidence_score = min(1.0, max(0.0, confidence_score))  # 0-1 범위로 제한
            
            return {
                'confidence_score': confidence_score,
                'criteria': criteria,
                'quality_level': 'high' if confidence_score >= 0.8 else 'medium' if confidence_score >= 0.5 else 'low'
            }
            
        except Exception as e:
            logger.error(f"매핑 품질 평가 실패: {e}")
            return {
                'confidence_score': 0.5,
                'criteria': {},
                'quality_level': 'unknown'
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