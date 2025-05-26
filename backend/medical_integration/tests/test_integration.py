from django.test import TestCase
from django.utils import timezone
from medical_integration.models.patient import Person, PersonName, Patient
from medical_integration.models.orthanc import Resources
from medical_integration.models.mapping import PatientMapping
from django.db import connections
import logging
import uuid

logger = logging.getLogger(__name__)

class IntegrationTest(TestCase):
    databases = {'default', 'openmrs', 'orthanc'}

    @classmethod
    def setUpClass(cls):
        """테스트 클래스 설정 - 필요한 테이블 생성"""
        super().setUpClass()
        
        # OpenMRS 테이블 생성
        with connections['openmrs'].cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS person (
                    person_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    gender VARCHAR(50),
                    birthdate DATE,
                    birthdate_estimated BOOLEAN DEFAULT 0,
                    dead BOOLEAN DEFAULT 0,
                    death_date DATE,
                    cause_of_death INTEGER,
                    creator INTEGER,
                    date_created DATETIME,
                    changed_by INTEGER,
                    date_changed DATETIME,
                    voided BOOLEAN DEFAULT 0,
                    voided_by INTEGER,
                    date_voided DATETIME,
                    void_reason VARCHAR(255),
                    uuid VARCHAR(38) UNIQUE
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS person_name (
                    person_name_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    preferred BOOLEAN DEFAULT 0,
                    person_id INTEGER,
                    prefix VARCHAR(50),
                    given_name VARCHAR(50),
                    middle_name VARCHAR(50),
                    family_name VARCHAR(50),
                    family_name2 VARCHAR(50),
                    family_name_suffix VARCHAR(50),
                    creator INTEGER,
                    date_created DATETIME,
                    voided BOOLEAN DEFAULT 0,
                    voided_by INTEGER,
                    date_voided DATETIME,
                    void_reason VARCHAR(255),
                    changed_by INTEGER,
                    date_changed DATETIME,
                    uuid VARCHAR(38) UNIQUE,
                    FOREIGN KEY (person_id) REFERENCES person(person_id)
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS patient (
                    patient_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    person_id INTEGER UNIQUE,
                    creator INTEGER,
                    date_created DATETIME,
                    changed_by INTEGER,
                    date_changed DATETIME,
                    voided BOOLEAN DEFAULT 0,
                    voided_by INTEGER,
                    date_voided DATETIME,
                    void_reason VARCHAR(255),
                    FOREIGN KEY (person_id) REFERENCES person(person_id)
                )
            """)

        # Orthanc 테이블 생성
        with connections['orthanc'].cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS Resources (
                    internalId INTEGER PRIMARY KEY AUTOINCREMENT,
                    resourceType INTEGER,
                    publicId VARCHAR(255),
                    parentId INTEGER
                )
            """)

        # PatientMapping 테이블 생성
        with connections['default'].cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS patient_mapping (
                    mapping_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    orthanc_patient_id INTEGER NOT NULL,
                    openmrs_patient_id INTEGER NOT NULL,
                    created_date DATETIME NOT NULL,
                    last_sync DATETIME,
                    is_active BOOLEAN NOT NULL,
                    sync_status VARCHAR(20) NOT NULL,
                    error_message TEXT
                )
            """)

    def setUp(self):
        """테스트 데이터 설정"""
        # OpenMRS 테스트 데이터 생성
        try:
            # Person 생성
            self.person = Person.objects.using('openmrs').create(
                gender='M',
                birthdate='1990-01-01',
                creator=1,
                date_created=timezone.now(),
                uuid=str(uuid.uuid4())
            )
            logger.info(f"OpenMRS Person 생성됨: {self.person.person_id}")

            # PersonName 생성
            self.person_name = PersonName.objects.using('openmrs').create(
                person=self.person,
                preferred=True,
                given_name='John',
                family_name='Doe',
                creator=1,
                date_created=timezone.now(),
                uuid=str(uuid.uuid4())
            )
            logger.info(f"OpenMRS PersonName 생성됨: {self.person_name.given_name} {self.person_name.family_name}")

            # Patient 생성
            self.openmrs_patient = Patient.objects.using('openmrs').create(
                person=self.person,
                creator=1,
                date_created=timezone.now()
            )
            logger.info(f"OpenMRS Patient 생성됨: {self.openmrs_patient.patient_id}")

        except Exception as e:
            logger.error(f"OpenMRS 테스트 데이터 생성 실패: {e}")
            raise

        # Orthanc 테스트 데이터 생성
        try:
            self.orthanc_patient = Resources.objects.using('orthanc').create(
                resourceType=0,  # Patient type
                publicId=str(uuid.uuid4()),
                parentId=None
            )
            logger.info(f"Orthanc Patient Resource 생성됨: {self.orthanc_patient.publicId}")

        except Exception as e:
            logger.error(f"Orthanc 테스트 데이터 생성 실패: {e}")
            raise

    def test_patient_data_access(self):
        """환자 데이터 접근 테스트"""
        try:
            # OpenMRS 환자 데이터 조회
            patient = Patient.objects.using('openmrs').select_related('person').get(
                patient_id=self.openmrs_patient.patient_id
            )
            person_name = PersonName.objects.using('openmrs').get(
                person=patient.person,
                voided=False
            )
            logger.info(f"환자 정보 조회: {person_name.given_name} {person_name.family_name}")

            # Orthanc 환자 리소스 조회
            resource = Resources.objects.using('orthanc').get(
                internalId=self.orthanc_patient.internalId
            )
            logger.info(f"Orthanc 환자 ID 조회: {resource.publicId}")

            self.assertEqual(person_name.given_name, 'John')
            self.assertEqual(person_name.family_name, 'Doe')

        except Exception as e:
            logger.error(f"데이터 접근 테스트 실패: {e}")
            raise

    def test_mapping_creation(self):
        """매핑 생성 테스트"""
        try:
            # 매핑 생성
            mapping = PatientMapping.objects.using('default').create(
                orthanc_patient=self.orthanc_patient,
                openmrs_patient=self.openmrs_patient
            )
            logger.info(f"매핑 생성 성공: {mapping}")

            # 매핑 조회 테스트
            retrieved_mapping = PatientMapping.objects.using('default').get(mapping_id=mapping.mapping_id)
            logger.info(f"매핑 조회 성공: {retrieved_mapping}")

            self.assertEqual(retrieved_mapping.orthanc_patient.publicId, self.orthanc_patient.publicId)
            self.assertEqual(retrieved_mapping.openmrs_patient.patient_id, self.openmrs_patient.patient_id)

        except Exception as e:
            logger.error(f"매핑 생성 테스트 실패: {e}")
            raise

    def test_sync_status_update(self):
        """동기화 상태 업데이트 테스트"""
        try:
            # 매핑 생성
            mapping = PatientMapping.objects.using('default').create(
                orthanc_patient=self.orthanc_patient,
                openmrs_patient=self.openmrs_patient
            )

            # 동기화 상태 업데이트
            mapping.update_sync_time(status='SYNCED')
            logger.info("동기화 상태 업데이트 성공")

            # 상태 확인
            updated_mapping = PatientMapping.objects.using('default').get(mapping_id=mapping.mapping_id)
            self.assertEqual(updated_mapping.sync_status, 'SYNCED')

            # 에러 상태 테스트
            mapping.update_sync_time(
                status='ERROR',
                error_message='테스트 에러 메시지'
            )
            logger.info("에러 상태 업데이트 성공")

            # 에러 상태 확인
            error_mapping = PatientMapping.objects.using('default').get(mapping_id=mapping.mapping_id)
            self.assertEqual(error_mapping.sync_status, 'ERROR')
            self.assertEqual(error_mapping.error_message, '테스트 에러 메시지')

        except Exception as e:
            logger.error(f"동기화 상태 업데이트 테스트 실패: {e}")
            raise 