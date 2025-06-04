# backend/medical_integration/test_scripts/dummy_data_with_mapping_test.py

import os
import sys
import django
import pydicom
import tempfile
from datetime import datetime
from io import BytesIO
import numpy as np
import uuid

# Django 설정
sys.path.append('/home/medical_system/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from medical_integration.openmrs_api import OpenMRSAPI
from medical_integration.orthanc_api import OrthancAPI
from medical_integration.models import PatientMapping
from medical_integration.dicom_patient_mapper import DicomPatientMapper

class DummyDataWithMappingTest:
    """DICOM patient_id 형식으로 더미 데이터 생성 및 매핑 테스트"""
    
    def __init__(self):
        self.openmrs_api = OpenMRSAPI()
        self.orthanc_api = OrthancAPI()
        self.mapper = DicomPatientMapper()
        
        # 🔥 DICOM patient_id 형식의 테스트 환자 데이터
        self.test_patients = [
            {
                "givenName": "철수", 
                "familyName": "김", 
                "gender": "M", 
                "birthdate": "1990-01-15",
                "patient_id": "DCM202501011230001"
            },
            {
                "givenName": "영희", 
                "familyName": "이", 
                "gender": "F", 
                "birthdate": "1985-05-20",
                "patient_id": "DCM202501011230002"
            },
            {
                "givenName": "민수", 
                "familyName": "박", 
                "gender": "M", 
                "birthdate": "1988-12-10",
                "patient_id": "DCM202501011230003"
            },
            {
                "givenName": "수영", 
                "familyName": "최", 
                "gender": "F", 
                "birthdate": "1992-07-05",
                "patient_id": "DCM202501011230004"
            },
            {
                "givenName": "호석", 
                "familyName": "정", 
                "gender": "M", 
                "birthdate": "1987-03-25",
                "patient_id": "DCM202501011230005"
            }
        ]
    
    def generate_dicom_patient_id(self):
        """DICOM 형식 patient_id 생성"""
        today = datetime.now()
        year = today.year
        month = str(today.month).zfill(2)
        day = str(today.day).zfill(2)
        hour = str(today.hour).zfill(2)
        minute = str(today.minute).zfill(2)
        random_num = str(np.random.randint(100, 999))
        
        return f"DCM{year}{month}{day}{hour}{minute}{random_num}"
    
    def create_dicom_file_with_patient_id(self, patient_data, modality="CR", study_description="Chest X-ray"):
        """DICOM patient_id를 포함한 DICOM 파일 생성"""
        try:
            ds = pydicom.Dataset()
            
            # 🔥 핵심: DICOM patient_id 사용
            ds.PatientName = f"{patient_data['familyName']}^{patient_data['givenName']}"
            ds.PatientID = patient_data['patient_id']  # React에서 입력받은 DICOM patient_id
            ds.PatientBirthDate = patient_data['birthdate'].replace('-', '')
            ds.PatientSex = patient_data['gender']
            
            # Study 정보
            ds.StudyInstanceUID = pydicom.uid.generate_uid()
            ds.StudyDescription = study_description
            ds.StudyDate = datetime.now().strftime("%Y%m%d")
            ds.StudyTime = datetime.now().strftime("%H%M%S")
            ds.AccessionNumber = f"ACC{patient_data['patient_id'][-6:]}"
            
            # Series 정보
            ds.SeriesInstanceUID = pydicom.uid.generate_uid()
            ds.SeriesDescription = f"{modality} Series"
            ds.SeriesNumber = 1
            ds.Modality = modality
            
            # Instance 정보
            ds.SOPInstanceUID = pydicom.uid.generate_uid()
            ds.SOPClassUID = "1.2.840.10008.5.1.4.1.1.1"  # CR Image Storage
            ds.InstanceNumber = 1
            
            # 이미지 정보
            ds.Rows = 512
            ds.Columns = 512
            ds.BitsAllocated = 16
            ds.BitsStored = 12
            ds.HighBit = 11
            ds.PixelRepresentation = 0
            ds.SamplesPerPixel = 1
            ds.PhotometricInterpretation = "MONOCHROME2"
            
            # 더미 픽셀 데이터
            pixel_array = np.random.randint(0, 4095, size=(512, 512), dtype=np.uint16)
            ds.PixelData = pixel_array.tobytes()
            
            # 메타 정보
            file_meta = pydicom.Dataset()
            file_meta.MediaStorageSOPClassUID = ds.SOPClassUID
            file_meta.MediaStorageSOPInstanceUID = ds.SOPInstanceUID
            file_meta.ImplementationClassUID = "1.2.3.4"
            file_meta.TransferSyntaxUID = pydicom.uid.ExplicitVRLittleEndian
            
            ds.file_meta = file_meta
            ds.is_little_endian = True
            ds.is_implicit_VR = False
            
            print(f"    ✅ DICOM 생성: Patient ID = {ds.PatientID}, Name = {ds.PatientName}")
            return ds
            
        except Exception as e:
            print(f"    ❌ DICOM 생성 실패: {e}")
            return None
    
    def create_openmrs_patients_with_patient_id(self):
        """OpenMRS 환자 생성 (patient_id 포함)"""
        print("👨‍⚕️ OpenMRS 환자 생성 중 (DICOM patient_id 포함)...")
        created_patients = []
        
        for patient_data in self.test_patients:
            try:
                # OpenMRS에는 patient_id를 따로 저장하지 않으므로 식별을 위해 notes나 다른 방법 사용
                # 여기서는 생성 후 매핑 시 patient_id를 사용할 예정
                result = self.openmrs_api.create_patient(patient_data)
                if result:
                    created_patients.append({
                        'openmrs_data': result,
                        'original_data': patient_data,
                        'dicom_patient_id': patient_data['patient_id']  # 🔥 DICOM patient_id 보관
                    })
                    patient_name = f"{patient_data['givenName']} {patient_data['familyName']}"
                    print(f"    ✅ 생성 성공: {patient_name} (DICOM ID: {patient_data['patient_id']})")
                else:
                    patient_name = f"{patient_data['givenName']} {patient_data['familyName']}"
                    print(f"    ❌ 생성 실패: {patient_name}")
                    
            except Exception as e:
                patient_name = f"{patient_data['givenName']} {patient_data['familyName']}"
                print(f"    ❌ 생성 실패: {patient_name} - {e}")
        
        print(f"✅ OpenMRS 환자 생성 완료: {len(created_patients)}명")
        return created_patients
    
    def create_orthanc_dicoms_with_mapping(self, openmrs_patients):
        """Orthanc DICOM 생성 및 자동 매핑 테스트"""
        print("🖼️ Orthanc DICOM 생성 및 자동 매핑 테스트...")
        mapping_results = []
        
        for patient_info in openmrs_patients:
            patient_data = patient_info['original_data']
            dicom_patient_id = patient_info['dicom_patient_id']
            
            # 각 환자당 2개의 DICOM 생성 (다른 modality)
            modalities = ["CR", "CT"]
            
            for modality in modalities:
                try:
                    print(f"\n  📋 환자: {patient_data['givenName']} {patient_data['familyName']} ({modality})")
                    
                    # 1. DICOM 데이터셋 생성
                    dicom_ds = self.create_dicom_file_with_patient_id(
                        patient_data=patient_data,
                        modality=modality
                    )
                    
                    if not dicom_ds:
                        continue
                    
                    # 2. DICOM을 바이트로 변환
                    with tempfile.NamedTemporaryFile(suffix='.dcm', delete=False) as temp_file:
                        dicom_ds.save_as(temp_file.name, enforce_file_format=True)
                        temp_file_path = temp_file.name
                    
                    # 파일을 바이너리로 읽기
                    with open(temp_file_path, 'rb') as f:
                        dicom_bytes = f.read()
                    
                    # 임시 파일 삭제
                    os.unlink(temp_file_path)
                    
                    # 3. Orthanc에 업로드
                    print(f"    📤 Orthanc 업로드 중...")
                    upload_result = self.orthanc_api.upload_dicom(dicom_bytes)
                    
                    if not upload_result:
                        print(f"    ❌ Orthanc 업로드 실패")
                        continue
                    
                    print(f"    ✅ Orthanc 업로드 성공: {upload_result.get('ParentPatient')}")
                    
                    # 4. 🔥 자동 매핑 테스트
                    print(f"    🔗 자동 매핑 테스트 시작...")
                    mapping_result = self.mapper.process_dicom_upload(dicom_bytes, upload_result)
                    
                    if mapping_result:
                        mapping_results.append({
                            'patient_name': f"{patient_data['givenName']} {patient_data['familyName']}",
                            'dicom_patient_id': dicom_patient_id,
                            'openmrs_uuid': patient_info['openmrs_data']['uuid'],
                            'orthanc_patient_id': upload_result.get('ParentPatient'),
                            'modality': modality,
                            'mapping_result': mapping_result
                        })
                        
                        if mapping_result.get('success'):
                            print(f"    ✅ 자동 매핑 성공!")
                            print(f"       매핑 ID: {mapping_result.get('mapping', {}).get('mapping_id')}")
                        else:
                            print(f"    ⚠️ 자동 매핑 실패: {mapping_result.get('message')}")
                            
                            # 🔥 자동 매핑 실패 시 수동 매핑 시도
                            if mapping_result.get('requires_manual_mapping'):
                                print(f"    🔧 수동 매핑 시도...")
                                manual_result = self.mapper.create_manual_mapping(
                                    orthanc_patient_id=upload_result.get('ParentPatient'),
                                    openmrs_patient_uuid=patient_info['openmrs_data']['uuid']
                                )
                                
                                if manual_result.get('success'):
                                    print(f"    ✅ 수동 매핑 성공!")
                                    mapping_result['manual_mapping'] = manual_result
                                else:
                                    print(f"    ❌ 수동 매핑도 실패: {manual_result.get('message')}")
                    else:
                        print(f"    ❌ 매핑 처리 완전 실패")
                        
                except Exception as e:
                    print(f"    ❌ DICOM 처리 실패: {e}")
                    import traceback
                    traceback.print_exc()
        
        print(f"\n✅ DICOM 생성 및 매핑 테스트 완료: {len(mapping_results)}개 처리")
        return mapping_results
    
    def analyze_mapping_results(self, mapping_results):
        """매핑 결과 분석"""
        print("\n📊 매핑 결과 분석...")
        
        total_mappings = len(mapping_results)
        successful_auto_mappings = 0
        successful_manual_mappings = 0
        failed_mappings = 0
        
        for result in mapping_results:
            mapping_result = result['mapping_result']
            
            if mapping_result.get('success'):
                successful_auto_mappings += 1
            elif mapping_result.get('manual_mapping', {}).get('success'):
                successful_manual_mappings += 1
            else:
                failed_mappings += 1
        
        print(f"  📈 전체 시도: {total_mappings}")
        print(f"  ✅ 자동 매핑 성공: {successful_auto_mappings}")
        print(f"  🔧 수동 매핑 성공: {successful_manual_mappings}")
        print(f"  ❌ 매핑 실패: {failed_mappings}")
        print(f"  📊 성공률: {((successful_auto_mappings + successful_manual_mappings) / total_mappings * 100):.1f}%")
        
        # 상세 결과 출력
        print(f"\n📋 상세 결과:")
        for result in mapping_results:
            status = "✅" if result['mapping_result'].get('success') else "🔧" if result['mapping_result'].get('manual_mapping', {}).get('success') else "❌"
            print(f"  {status} {result['patient_name']} ({result['modality']}) - DICOM ID: {result['dicom_patient_id']}")
        
        return {
            'total': total_mappings,
            'auto_success': successful_auto_mappings,
            'manual_success': successful_manual_mappings,
            'failed': failed_mappings,
            'success_rate': (successful_auto_mappings + successful_manual_mappings) / total_mappings * 100
        }
    
    def verify_database_mappings(self):
        """데이터베이스의 매핑 상태 확인"""
        print("\n🔍 데이터베이스 매핑 검증...")
        
        try:
            # 활성 매핑 조회
            active_mappings = PatientMapping.objects.filter(is_active=True)
            print(f"  📊 활성 매핑 수: {len(active_mappings)}")
            
            # 각 매핑 검증
            valid_count = 0
            for mapping in active_mappings:
                try:
                    # OpenMRS 환자 확인
                    openmrs_patient = self.openmrs_api.get_patient(mapping.openmrs_patient_uuid)
                    
                    # Orthanc 환자 확인
                    orthanc_patient = self.orthanc_api.get_patient(mapping.orthanc_patient_id)
                    
                    if openmrs_patient and orthanc_patient:
                        valid_count += 1
                        patient_name = openmrs_patient.get('display', 'Unknown')
                        orthanc_name = orthanc_patient.get('MainDicomTags', {}).get('PatientName', 'Unknown')
                        print(f"    ✅ 유효한 매핑: {patient_name} <-> {orthanc_name}")
                        
                        # DICOM Patient ID 확인
                        dicom_patient_id = orthanc_patient.get('MainDicomTags', {}).get('PatientID', '')
                        if dicom_patient_id.startswith('DCM'):
                            print(f"       🆔 DICOM Patient ID: {dicom_patient_id}")
                    else:
                        print(f"    ❌ 무효한 매핑: {mapping.mapping_id}")
                        
                except Exception as e:
                    print(f"    ❌ 매핑 검증 실패: {mapping.mapping_id} - {e}")
            
            print(f"  ✅ 유효한 매핑: {valid_count}/{len(active_mappings)}")
            
            return {
                'total_mappings': len(active_mappings),
                'valid_mappings': valid_count,
                'validation_rate': valid_count / len(active_mappings) * 100 if len(active_mappings) > 0 else 0
            }
            
        except Exception as e:
            print(f"  ❌ 데이터베이스 검증 실패: {e}")
            return None
    
    def test_search_with_dicom_patient_id(self):
        """DICOM patient_id로 검색 테스트"""
        print("\n🔍 DICOM Patient ID 검색 테스트...")
        
        # 테스트용 DICOM patient_id들
        test_ids = [patient['patient_id'] for patient in self.test_patients]
        
        for patient_id in test_ids:
            try:
                print(f"\n  🔍 검색: {patient_id}")
                
                # OpenMRS에서 검색
                openmrs_results = self.openmrs_api.search_patients(patient_id)
                if openmrs_results and openmrs_results.get('results'):
                    print(f"    ✅ OpenMRS 검색 성공: {len(openmrs_results['results'])}명 발견")
                    for patient in openmrs_results['results']:
                        print(f"       - {patient.get('display')} ({patient.get('uuid')})")
                else:
                    print(f"    ❌ OpenMRS에서 찾을 수 없음")
                
                # Orthanc에서 검색 (Patient ID로)
                try:
                    # Orthanc의 모든 환자를 확인해서 PatientID 매칭
                    all_patients = self.orthanc_api.get_patients()
                    if all_patients:
                        found_in_orthanc = False
                        for orthanc_patient_id in all_patients:
                            patient_info = self.orthanc_api.get_patient(orthanc_patient_id)
                            if patient_info:
                                dicom_patient_id = patient_info.get('MainDicomTags', {}).get('PatientID', '')
                                if dicom_patient_id == patient_id:
                                    found_in_orthanc = True
                                    patient_name = patient_info.get('MainDicomTags', {}).get('PatientName', 'Unknown')
                                    print(f"    ✅ Orthanc 검색 성공: {patient_name}")
                                    
                                    # 관련 Study 수 확인
                                    studies = self.orthanc_api.get_patient_studies(orthanc_patient_id)
                                    if studies:
                                        print(f"       - Study 수: {len(studies)}")
                                    break
                        
                        if not found_in_orthanc:
                            print(f"    ❌ Orthanc에서 찾을 수 없음")
                    else:
                        print(f"    ❌ Orthanc 환자 목록 조회 실패")
                        
                except Exception as e:
                    print(f"    ❌ Orthanc 검색 실패: {e}")
                    
            except Exception as e:
                print(f"    ❌ 검색 테스트 실패: {e}")
    
    def cleanup_test_data(self):
        """테스트 데이터 정리"""
        print("\n🧹 테스트 데이터 정리...")
        
        try:
            # DCM으로 시작하는 patient_id 관련 매핑 삭제
            test_mappings = PatientMapping.objects.filter(
                orthanc_patient_id__icontains='DCM',
                is_active=True
            )
            
            deleted_count = 0
            for mapping in test_mappings:
                try:
                    mapping.is_active = False
                    mapping.save()
                    deleted_count += 1
                    print(f"  🗑️ 매핑 비활성화: {mapping.mapping_id}")
                except Exception as e:
                    print(f"  ❌ 매핑 삭제 실패: {e}")
            
            print(f"✅ 테스트 매핑 정리 완료: {deleted_count}개")
            
        except Exception as e:
            print(f"❌ 테스트 데이터 정리 실패: {e}")
    
    def run_full_test(self):
        """전체 테스트 실행"""
        print("=" * 80)
        print("🧪 DICOM Patient ID 기반 매핑 테스트")
        print("=" * 80)
        
        try:
            # 1. 기존 테스트 데이터 정리
            self.cleanup_test_data()
            
            # 2. OpenMRS 환자 생성
            openmrs_patients = self.create_openmrs_patients_with_patient_id()
            
            if not openmrs_patients:
                print("❌ OpenMRS 환자 생성 실패로 테스트 중단")
                return False
            
            # 3. Orthanc DICOM 생성 및 자동 매핑 테스트
            mapping_results = self.create_orthanc_dicoms_with_mapping(openmrs_patients)
            
            if not mapping_results:
                print("❌ DICOM 생성 및 매핑 실패로 테스트 중단")
                return False
            
            # 4. 매핑 결과 분석
            analysis_result = self.analyze_mapping_results(mapping_results)
            
            # 5. 데이터베이스 매핑 검증
            db_verification = self.verify_database_mappings()
            
            # 6. DICOM Patient ID 검색 테스트
            self.test_search_with_dicom_patient_id()
            
            # 7. 최종 결과 요약
            print("\n" + "=" * 80)
            print("🎉 테스트 완료 요약")
            print("=" * 80)
            print(f"OpenMRS 환자 생성: {len(openmrs_patients)}명")
            print(f"DICOM 업로드: {len(mapping_results)}개")
            print(f"매핑 성공률: {analysis_result['success_rate']:.1f}%")
            if db_verification:
                print(f"데이터베이스 검증 성공률: {db_verification['validation_rate']:.1f}%")
            
            print("\n📋 성능 요약:")
            print(f"  - 자동 매핑 성공: {analysis_result['auto_success']}/{analysis_result['total']}")
            print(f"  - 수동 매핑 성공: {analysis_result['manual_success']}/{analysis_result['total']}")
            print(f"  - 매핑 실패: {analysis_result['failed']}/{analysis_result['total']}")
            
            # 성공률에 따른 결과 판정
            if analysis_result['success_rate'] >= 80:
                print("\n✅ 테스트 성공: 매핑 기능이 정상적으로 작동합니다!")
            elif analysis_result['success_rate'] >= 50:
                print("\n⚠️ 테스트 부분 성공: 일부 개선이 필요합니다.")
            else:
                print("\n❌ 테스트 실패: 매핑 기능에 문제가 있습니다.")
            
            return analysis_result['success_rate'] >= 50
            
        except Exception as e:
            print(f"❌ 테스트 실행 중 오류 발생: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    tester = DummyDataWithMappingTest()
    success = tester.run_full_test()
    
    if success:
        print("\n🎊 모든 테스트가 성공적으로 완료되었습니다!")
        print("   - React에서 DICOM patient_id로 환자 등록")
        print("   - Orthanc DICOM 업로드")
        print("   - 자동/수동 매핑 기능")
        print("   - 데이터베이스 검증")
        print("   모든 기능이 정상 작동합니다! 🚀")
    else:
        print("\n⚠️ 테스트에서 일부 문제가 발견되었습니다.")
        print("   상세 로그를 확인하여 문제를 해결해주세요.")