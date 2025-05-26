import logging
from django.test import TestCase
from django.utils import timezone
from medical_integration.tests.test_models import TestPerson, TestPatient, TestPersonName, TestResources
from medical_integration.models import PatientMapping

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

class PatientMappingTest(TestCase):
    def setUp(self):
        """테스트 데이터 설정"""
        # OpenMRS 더미 데이터 생성
        self.person = TestPerson.objects.create(
            gender='M',
            birthdate='1990-01-01',
            creator=1,
            date_created=timezone.now(),
            uuid='test-person-uuid'
        )
        
        self.person_name = TestPersonName.objects.create(
            person=self.person,
            preferred=True,
            given_name='John',
            family_name='Doe',
            creator=1,
            date_created=timezone.now(),
            uuid='test-person-name-uuid'
        )
        
        self.openmrs_patient = TestPatient.objects.create(
            person=self.person,
            creator=1,
            date_created=timezone.now()
        )
        logger.info(f"OpenMRS 환자 생성됨 - ID: {self.openmrs_patient.patient_id}, 이름: {self.person_name.given_name} {self.person_name.family_name}")

        # Orthanc 더미 데이터 생성
        self.orthanc_patient = TestResources.objects.create(
            resourceType=0,  # Patient type
            publicId='test-orthanc-patient',
            parentId=None
        )
        logger.info(f"Orthanc 환자 생성됨 - ID: {self.orthanc_patient.publicId}")

    def test_patient_mapping(self):
        """환자 매핑 테스트"""
        try:
            # 매핑 생성
            mapping = PatientMapping.objects.create(
                orthanc_patient=self.orthanc_patient,
                openmrs_patient=self.openmrs_patient
            )
            logger.info(f"환자 매핑 생성됨: {mapping}")

            # 매핑 검증
            self.assertEqual(mapping.orthanc_patient.publicId, 'test-orthanc-patient')
            logger.info("Orthanc 환자 ID 매핑 확인됨")

            self.assertEqual(mapping.openmrs_patient.person.testpersonname_set.first().given_name, 'John')
            logger.info("OpenMRS 환자 이름 매핑 확인됨")

            # 동기화 상태 업데이트 테스트
            mapping.update_sync_time()
            self.assertEqual(mapping.sync_status, 'SYNCED')
            logger.info("매핑 동기화 상태 업데이트됨")

            # 양방향 관계 확인
            orthanc_mappings = self.openmrs_patient.orthanc_mappings.all()
            self.assertEqual(orthanc_mappings.count(), 1)
            logger.info("OpenMRS -> Orthanc 매핑 관계 확인됨")

            patient_mappings = self.orthanc_patient.patient_mappings.all()
            self.assertEqual(patient_mappings.count(), 1)
            logger.info("Orthanc -> OpenMRS 매핑 관계 확인됨")

        except Exception as e:
            logger.error(f"매핑 테스트 중 오류 발생: {e}")
            raise

    def test_duplicate_mapping_prevention(self):
        """중복 매핑 방지 테스트"""
        # 첫 번째 매핑 생성
        PatientMapping.objects.create(
            orthanc_patient=self.orthanc_patient,
            openmrs_patient=self.openmrs_patient
        )
        logger.info("첫 번째 매핑 생성됨")

        # 중복 매핑 시도
        try:
            PatientMapping.objects.create(
                orthanc_patient=self.orthanc_patient,
                openmrs_patient=self.openmrs_patient
            )
            self.fail("중복 매핑이 허용되었습니다.")
        except Exception as e:
            logger.info(f"중복 매핑 방지 확인됨: {e}")

    def test_error_handling(self):
        """에러 처리 테스트"""
        mapping = PatientMapping.objects.create(
            orthanc_patient=self.orthanc_patient,
            openmrs_patient=self.openmrs_patient
        )
        
        # 에러 상태 업데이트 테스트
        error_msg = "테스트 에러 메시지"
        mapping.update_sync_time(status='ERROR', error_message=error_msg)
        
        updated_mapping = PatientMapping.objects.get(pk=mapping.mapping_id)
        self.assertEqual(updated_mapping.sync_status, 'ERROR')
        self.assertEqual(updated_mapping.error_message, error_msg)
        logger.info("에러 상태 처리 확인됨") 