# backend/medical_integration/test_scripts/create_dummy_data_fixed.py

import os
import sys
import django
import pydicom
import tempfile
from datetime import datetime, timedelta
from io import BytesIO
import numpy as np

# Django 설정
sys.path.append('/home/medical_system/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from medical_integration.openmrs_api import OpenMRSAPI
from medical_integration.orthanc_api import OrthancAPI
from medical_integration.models import PatientMapping

class FixedDummyDataCreator:
    def __init__(self):
        self.openmrs_api = OpenMRSAPI()
        self.orthanc_api = OrthancAPI()
        
        # 테스트 환자 데이터
        self.test_patients = [
            {"givenName": "철수", "familyName": "김", "gender": "M", "birthdate": "1990-01-15"},
            {"givenName": "영희", "familyName": "이", "gender": "F", "birthdate": "1985-05-20"},
            {"givenName": "민수", "familyName": "박", "gender": "M", "birthdate": "1988-12-10"},
            {"givenName": "수영", "familyName": "최", "gender": "F", "birthdate": "1992-07-05"},
            {"givenName": "호석", "familyName": "정", "gender": "M", "birthdate": "1987-03-25"}
        ]
    
    def create_dicom_file(self, patient_name, patient_id, modality="CR", study_description="Chest X-ray"):
        """고정된 DICOM 파일 생성"""
        try:
            # 기본 DICOM 데이터셋 생성
            ds = pydicom.Dataset()
            
            # 필수 DICOM 태그들
            ds.PatientName = patient_name
            ds.PatientID = patient_id
            ds.PatientBirthDate = "19900101"
            ds.PatientSex = "M"
            
            # Study 정보
            ds.StudyInstanceUID = pydicom.uid.generate_uid()
            ds.StudyDescription = study_description
            ds.StudyDate = datetime.now().strftime("%Y%m%d")
            ds.StudyTime = datetime.now().strftime("%H%M%S")
            
            # Series 정보
            ds.SeriesInstanceUID = pydicom.uid.generate_uid()
            ds.SeriesDescription = f"{modality} Series"
            ds.SeriesNumber = 1
            ds.Modality = modality
            
            # Instance 정보
            ds.SOPInstanceUID = pydicom.uid.generate_uid()
            ds.SOPClassUID = "1.2.840.10008.5.1.4.1.1.1"  # CR Image Storage
            ds.InstanceNumber = 1
            
            # 기본 이미지 정보
            ds.Rows = 512
            ds.Columns = 512
            ds.BitsAllocated = 16
            ds.BitsStored = 12
            ds.HighBit = 11
            ds.PixelRepresentation = 0
            ds.SamplesPerPixel = 1
            ds.PhotometricInterpretation = "MONOCHROME2"
            
            # 더미 픽셀 데이터 생성
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
            
            return ds
            
        except Exception as e:
            print(f"    ❌ DICOM 생성 실패: {e}")
            return None
    
    def create_openmrs_patients(self):
        """OpenMRS 환자 생성"""
        print("👨‍⚕️ OpenMRS 환자 생성 중...")
        created_patients = []
        
        for patient_data in self.test_patients:
            try:
                result = self.openmrs_api.create_patient(patient_data)
                if result:
                    created_patients.append({
                        'openmrs_data': result,
                        'original_data': patient_data
                    })
                    patient_name = f"{patient_data['givenName']} {patient_data['familyName']}"
                    print(f"    ✅ 생성 성공: {patient_name}")
                else:
                    patient_name = f"{patient_data['givenName']} {patient_data['familyName']}"
                    print(f"    ❌ 생성 실패: {patient_name}")
                    
            except Exception as e:
                patient_name = f"{patient_data['givenName']} {patient_data['familyName']}"
                print(f"    ❌ 생성 실패: {patient_name} - {e}")
        
        print(f"✅ OpenMRS 환자 생성 완료: {len(created_patients)}명")
        return created_patients
    
    def create_orthanc_dicoms(self, openmrs_patients):
        """Orthanc DICOM 생성 및 업로드"""
        print("🖼️ Orthanc DICOM 생성 중...")
        uploaded_dicoms = []
        
        for patient_info in openmrs_patients:
            patient_data = patient_info['original_data']
            patient_name = f"{patient_data['familyName']}^{patient_data['givenName']}"
            
            # 각 환자당 3개의 DICOM 생성
            modalities = ["CR", "CT", "MR"]
            
            for modality in modalities:
                try:
                    # DICOM 데이터셋 생성
                    dicom_ds = self.create_dicom_file(
                        patient_name=patient_name,
                        patient_id=patient_info['openmrs_data']['uuid'],
                        modality=modality
                    )
                    
                    if not dicom_ds:
                        continue
                    
                    # 🔥 수정: 임시 파일로 저장 후 바이너리 읽기
                    with tempfile.NamedTemporaryFile(suffix='.dcm', delete=False) as temp_file:
                        dicom_ds.save_as(temp_file.name, enforce_file_format=True)
                        temp_file_path = temp_file.name
                    
                    # 파일을 바이너리로 읽기
                    with open(temp_file_path, 'rb') as f:
                        dicom_bytes = f.read()
                    
                    # 임시 파일 삭제
                    os.unlink(temp_file_path)
                    
                    print(f"  DICOM 업로드 중: {patient_name}")
                    upload_result = self.orthanc_api.upload_dicom(dicom_bytes)
                    
                    if upload_result:
                        uploaded_dicoms.append({
                            'upload_result': upload_result,
                            'patient_name': patient_name,
                            'openmrs_uuid': patient_info['openmrs_data']['uuid'],
                            'modality': modality
                        })
                        print(f"    ✅ 업로드 성공 - Patient: {upload_result.get('ParentPatient')}")
                    else:
                        print(f"    ❌ 업로드 실패")
                        
                except Exception as e:
                    print(f"    ❌ DICOM 처리 실패: {e}")
        
        print(f"✅ Orthanc DICOM 생성 완료: {len(uploaded_dicoms)}개")
        return uploaded_dicoms
    
    def create_patient_mappings(self, openmrs_patients, uploaded_dicoms):
        """환자 매핑 생성"""
        print("🔗 환자 매핑 생성 중...")
        created_mappings = 0
        
        # OpenMRS UUID별로 그룹화
        openmrs_by_uuid = {
            patient['openmrs_data']['uuid']: patient 
            for patient in openmrs_patients
        }
        
        # Orthanc Patient ID별로 그룹화
        orthanc_by_patient = {}
        for dicom_info in uploaded_dicoms:
            orthanc_patient_id = dicom_info['upload_result'].get('ParentPatient')
            openmrs_uuid = dicom_info['openmrs_uuid']
            
            if orthanc_patient_id and openmrs_uuid in openmrs_by_uuid:
                orthanc_by_patient[orthanc_patient_id] = openmrs_uuid
        
        # 매핑 생성
        for orthanc_patient_id, openmrs_uuid in orthanc_by_patient.items():
            try:
                # 기존 매핑 확인
                existing_mapping = PatientMapping.objects.filter(
                    orthanc_patient_id=orthanc_patient_id,
                    openmrs_patient_uuid=openmrs_uuid
                ).first()
                
                if existing_mapping:
                    print(f"  ⚠️ 기존 매핑 존재: {orthanc_patient_id} -> {openmrs_uuid}")
                    continue
                
                # 새 매핑 생성
                mapping = PatientMapping.objects.create(
                    orthanc_patient_id=orthanc_patient_id,
                    openmrs_patient_uuid=openmrs_uuid,
                    sync_status='SYNCED'
                )
                
                created_mappings += 1
                patient_name = openmrs_by_uuid[openmrs_uuid]['original_data']['givenName']
                print(f"  ✅ 매핑 생성: {patient_name} ({orthanc_patient_id[:8]}...)")
                
            except Exception as e:
                print(f"  ❌ 매핑 생성 실패: {e}")
        
        print(f"✅ 환자 매핑 생성 완료: {created_mappings}개")
        return created_mappings
    
    def verify_mappings(self):
        """매핑 검증 (수정된 버전)"""
        print("🔍 매핑 검증 중...")
        try:
            # 🔥 수정: mapping_type 필드 제거
            mappings = PatientMapping.objects.filter(is_active=True)
            print(f"활성 매핑 수: {len(mappings)}")
            
            valid_mappings = 0
            for mapping in mappings:
                try:
                    # OpenMRS 환자 확인
                    openmrs_patient = self.openmrs_api.get_patient(mapping.openmrs_patient_uuid)
                    
                    # Orthanc 환자 확인
                    orthanc_patient = self.orthanc_api.get_patient(mapping.orthanc_patient_id)
                    
                    if openmrs_patient and orthanc_patient:
                        valid_mappings += 1
                        print(f"  ✅ 유효한 매핑: {mapping.orthanc_patient_id[:8]}... -> {mapping.openmrs_patient_uuid[:8]}...")
                    else:
                        print(f"  ❌ 무효한 매핑: {mapping.mapping_id}")
                        
                except Exception as e:
                    print(f"  ❌ 매핑 검증 실패: {mapping.mapping_id} - {e}")
            
            print(f"✅ 유효한 매핑: {valid_mappings}/{len(mappings)}")
            
        except Exception as e:
            print(f"❌ 매핑 검증 실패: {e}")
    
    def cleanup_existing_data(self):
        """기존 테스트 데이터 정리"""
        print("🧹 기존 테스트 데이터 정리 중...")
        
        try:
            # 기존 매핑 삭제
            deleted_mappings = PatientMapping.objects.all().delete()
            print(f"  삭제된 매핑: {deleted_mappings[0]}개")
            
        except Exception as e:
            print(f"  ❌ 매핑 삭제 실패: {e}")
    
    def run_full_test(self):
        """전체 테스트 실행"""
        print("=" * 60)
        print("🧪 OpenMRS-Orthanc 통합 테스트 (수정된 버전)")
        print("=" * 60)
        
        try:
            # 1. 기존 데이터 정리
            self.cleanup_existing_data()
            
            # 2. OpenMRS 환자 생성
            openmrs_patients = self.create_openmrs_patients()
            
            if not openmrs_patients:
                print("❌ OpenMRS 환자 생성 실패로 테스트 중단")
                return False
            
            # 3. Orthanc DICOM 생성
            uploaded_dicoms = self.create_orthanc_dicoms(openmrs_patients)
            
            if not uploaded_dicoms:
                print("❌ Orthanc DICOM 생성 실패로 테스트 중단")
                return False
            
            # 4. 환자 매핑 생성
            mapping_count = self.create_patient_mappings(openmrs_patients, uploaded_dicoms)
            
            # 5. 매핑 검증
            self.verify_mappings()
            
            print("\n" + "=" * 60)
            print("🎉 테스트 완료 요약")
            print("=" * 60)
            print(f"OpenMRS 환자: {len(openmrs_patients)}명")
            print(f"Orthanc DICOM: {len(uploaded_dicoms)}개")
            print(f"환자 매핑: {mapping_count}개")
            
            return True
            
        except Exception as e:
            print(f"❌ 테스트 실행 중 오류 발생: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    creator = FixedDummyDataCreator()
    success = creator.run_full_test()
    
    if success:
        print("\n✅ 모든 테스트가 성공적으로 완료되었습니다!")
    else:
        print("\n❌ 테스트 중 오류가 발생했습니다.")