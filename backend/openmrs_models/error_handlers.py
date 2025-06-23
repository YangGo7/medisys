# backend/openmrs_models/error_handlers.py (새 파일)
"""
OpenMRS Clinical API 에러 핸들링 및 로깅 강화
"""

import logging
import traceback
import json
from datetime import datetime
from functools import wraps
from django.http import JsonResponse
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from django.utils import timezone

# 로거 설정
clinical_logger = logging.getLogger('openmrs_clinical')
error_logger = logging.getLogger('openmrs_errors')
audit_logger = logging.getLogger('openmrs_audit')

class OpenMRSError(Exception):
    """OpenMRS 관련 커스텀 예외"""
    def __init__(self, message, error_code=None, details=None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)

class ConceptNotFoundError(OpenMRSError):
    """Concept를 찾을 수 없는 경우"""
    def __init__(self, concept_uuid):
        super().__init__(
            f"Concept not found: {concept_uuid}",
            error_code="CONCEPT_NOT_FOUND",
            details={"concept_uuid": concept_uuid}
        )

class PatientNotFoundError(OpenMRSError):
    """환자를 찾을 수 없는 경우"""
    def __init__(self, patient_uuid):
        super().__init__(
            f"Patient not found: {patient_uuid}",
            error_code="PATIENT_NOT_FOUND",
            details={"patient_uuid": patient_uuid}
        )

class EncounterCreationError(OpenMRSError):
    """Encounter 생성 실패"""
    def __init__(self, patient_uuid, reason=None):
        super().__init__(
            f"Failed to create encounter for patient: {patient_uuid}",
            error_code="ENCOUNTER_CREATION_FAILED",
            details={"patient_uuid": patient_uuid, "reason": reason}
        )

class ObsValidationError(OpenMRSError):
    """Obs 데이터 검증 실패"""
    def __init__(self, field, value, reason):
        super().__init__(
            f"Obs validation failed for {field}: {reason}",
            error_code="OBS_VALIDATION_FAILED",
            details={"field": field, "value": value, "reason": reason}
        )

def log_clinical_activity(func):
    """임상 활동 로깅 데코레이터"""
    @wraps(func)
    def wrapper(request, *args, **kwargs):
        start_time = timezone.now()
        
        # 요청 정보 로깅
        audit_data = {
            'function': func.__name__,
            'user_id': getattr(request.user, 'id', 'anonymous'),
            'ip_address': get_client_ip(request),
            'timestamp': start_time.isoformat(),
            'method': request.method,
            'path': request.path,
            'args': args,
            'patient_uuid': kwargs.get('patient_uuid') or request.data.get('patient_uuid')
        }
        
        audit_logger.info(f"Clinical API Call: {json.dumps(audit_data, default=str)}")
        
        try:
            # 실제 함수 실행
            response = func(request, *args, **kwargs)
            
            # 성공 로깅
            end_time = timezone.now()
            duration = (end_time - start_time).total_seconds()
            
            audit_data.update({
                'status': 'success',
                'duration_seconds': duration,
                'response_status': getattr(response, 'status_code', 200)
            })
            
            clinical_logger.info(f"Clinical API Success: {func.__name__} - {duration:.2f}s")
            audit_logger.info(f"Clinical API Success: {json.dumps(audit_data, default=str)}")
            
            return response
            
        except Exception as e:
            # 에러 로깅
            end_time = timezone.now()
            duration = (end_time - start_time).total_seconds()
            
            error_data = {
                'function': func.__name__,
                'error_type': type(e).__name__,
                'error_message': str(e),
                'traceback': traceback.format_exc(),
                'duration_seconds': duration,
                'request_data': request.data if hasattr(request, 'data') else None
            }
            
            audit_data.update({
                'status': 'error',
                'duration_seconds': duration,
                'error_type': type(e).__name__,
                'error_message': str(e)
            })
            
            error_logger.error(f"Clinical API Error: {json.dumps(error_data, default=str)}")
            audit_logger.error(f"Clinical API Error: {json.dumps(audit_data, default=str)}")
            
            # 에러 응답 생성
            if isinstance(e, OpenMRSError):
                return Response({
                    'success': False,
                    'error': e.message,
                    'error_code': e.error_code,
                    'details': e.details,
                    'timestamp': timezone.now().isoformat()
                }, status=400)
            else:
                return Response({
                    'success': False,
                    'error': 'Internal server error',
                    'error_code': 'INTERNAL_ERROR',
                    'message': str(e) if settings.DEBUG else 'An unexpected error occurred',
                    'timestamp': timezone.now().isoformat()
                }, status=500)
    
    return wrapper

def get_client_ip(request):
    """클라이언트 IP 주소 추출"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def validate_obs_data(obs_data):
    """Obs 데이터 검증"""
    required_fields = ['person', 'concept', 'obs_datetime']
    
    for field in required_fields:
        if field not in obs_data or obs_data[field] is None:
            raise ObsValidationError(field, obs_data.get(field), "Required field is missing or null")
    
    # 값 타입 검증
    value_fields = ['value_text', 'value_numeric', 'value_boolean', 'value_coded', 'value_datetime']
    has_value = any(obs_data.get(field) is not None for field in value_fields)
    
    if not has_value:
        raise ObsValidationError('value', None, "At least one value field must be provided")
    
    # datetime 형식 검증
    if isinstance(obs_data.get('obs_datetime'), str):
        try:
            datetime.fromisoformat(obs_data['obs_datetime'].replace('Z', '+00:00'))
        except ValueError:
            raise ObsValidationError('obs_datetime', obs_data['obs_datetime'], "Invalid datetime format")

def sanitize_clinical_data(data):
    """임상 데이터 정제"""
    if isinstance(data, dict):
        sanitized = {}
        for key, value in data.items():
            if isinstance(value, str):
                # HTML 태그 제거
                import re
                value = re.sub(r'<[^>]+>', '', value)
                # 특수 문자 정제
                value = value.strip()
            elif isinstance(value, (dict, list)):
                value = sanitize_clinical_data(value)
            sanitized[key] = value
        return sanitized
    elif isinstance(data, list):
        return [sanitize_clinical_data(item) for item in data]
    else:
        return data

class ClinicalDataValidator:
    """임상 데이터 검증 클래스"""
    
    @staticmethod
    def validate_diagnosis(diagnosis_data):
        """진단 데이터 검증"""
        errors = []
        
        if not diagnosis_data.get('concept_uuid'):
            errors.append("진단 concept_uuid가 필요합니다.")
        
        if not diagnosis_data.get('value'):
            errors.append("진단 값이 필요합니다.")
        
        # concept_uuid 형식 검증
        concept_uuid = diagnosis_data.get('concept_uuid')
        if concept_uuid and len(concept_uuid) != 38:
            errors.append("유효하지 않은 concept_uuid 형식입니다.")
        
        return errors
    
    @staticmethod
    def validate_prescription(prescription_data):
        """처방 데이터 검증"""
        errors = []
        
        if not prescription_data.get('drug_concept_uuid') and not prescription_data.get('drug_uuid'):
            errors.append("약물 concept_uuid가 필요합니다.")
        
        if not prescription_data.get('drug_name'):
            errors.append("약물명이 필요합니다.")
        
        # 용량 검증
        dosage = prescription_data.get('dosage')
        if dosage:
            try:
                float(dosage)
            except (ValueError, TypeError):
                errors.append("용량은 숫자여야 합니다.")
        
        return errors
    
    @staticmethod
    def validate_clinical_notes(notes):
        """임상 노트 검증"""
        errors = []
        
        if not isinstance(notes, str):
            errors.append("임상 노트는 문자열이어야 합니다.")
        
        if len(notes.strip()) > 10000:
            errors.append("임상 노트는 10,000자를 초과할 수 없습니다.")
        
        return errors

def retry_on_failure(max_retries=3, delay=1):
    """실패시 재시도 데코레이터"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            import time
            
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:
                        clinical_logger.error(f"Function {func.__name__} failed after {max_retries} attempts: {str(e)}")
                        raise
                    else:
                        clinical_logger.warning(f"Function {func.__name__} failed (attempt {attempt + 1}/{max_retries}): {str(e)}")
                        time.sleep(delay)
            
        return wrapper
    return decorator

class PerformanceMonitor:
    """성능 모니터링 클래스"""
    
    @staticmethod
    def log_slow_query(query_type, duration, details=None):
        """느린 쿼리 로깅"""
        if duration > 5.0:  # 5초 이상
            clinical_logger.warning(f"Slow query detected: {query_type} took {duration:.2f}s", extra={
                'query_type': query_type,
                'duration': duration,
                'details': details
            })
    
    @staticmethod
    def log_memory_usage():
        """메모리 사용량 로깅"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        memory_mb = process.memory_info().rss / 1024 / 1024
        
        if memory_mb > 500:  # 500MB 이상
            clinical_logger.warning(f"High memory usage: {memory_mb:.2f}MB")

# 로깅 설정 (settings.py에 추가할 내용)
CLINICAL_LOGGING_CONFIG = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'detailed': {
            'format': '{levelname} {asctime} {name} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'clinical': {
            'format': '[{asctime}] {levelname} {name}: {message}',
            'style': '{',
        },
    },
    'handlers': {
        'clinical_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'logs/openmrs_clinical.log',
            'maxBytes': 50*1024*1024,  # 50MB
            'backupCount': 5,
            'formatter': 'clinical',
        },
        'error_file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'logs/openmrs_errors.log',
            'maxBytes': 50*1024*1024,
            'backupCount': 5,
            'formatter': 'detailed',
        },
        'audit_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'logs/openmrs_audit.log',
            'maxBytes': 100*1024*1024,  # 100MB
            'backupCount': 10,
            'formatter': 'detailed',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'clinical',
        },
    },
    'loggers': {
        'openmrs_clinical': {
            'handlers': ['clinical_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'openmrs_errors': {
            'handlers': ['error_file', 'console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'openmrs_audit': {
            'handlers': ['audit_file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# ===================================================================
# backend/openmrs_models/obs_clinical_api.py (기존 파일 수정)
"""
기존 obs_clinical_api.py에 에러 핸들링 적용
"""

# 기존 import에 추가
from .error_handlers import (
    log_clinical_activity, 
    validate_obs_data, 
    sanitize_clinical_data,
    ClinicalDataValidator,
    ConceptNotFoundError,
    PatientNotFoundError,
    EncounterCreationError,
    retry_on_failure,
    PerformanceMonitor
)

# 기존 함수들에 데코레이터 적용 예시:

@api_view(['GET'])
@permission_classes([AllowAny])
@log_clinical_activity
def get_patient_obs_clinical_data(request, patient_uuid):
    """
    기존 함수에 에러 핸들링 적용
    """
    start_time = timezone.now()
    
    try:
        # 환자 존재 확인 (개선된 에러 처리)
        try:
            person = Person.objects.get(uuid=patient_uuid, voided=False)
        except Person.DoesNotExist:
            raise PatientNotFoundError(patient_uuid)

        # 기존 로직...
        # ... (기존 코드 유지)
        
        # 성능 모니터링
        duration = (timezone.now() - start_time).total_seconds()
        PerformanceMonitor.log_slow_query('get_patient_obs_clinical_data', duration, {
            'patient_uuid': patient_uuid,
            'encounter_count': len(clinical_history) if 'clinical_history' in locals() else 0
        })
        
        return Response({
            'success': True,
            # ... 기존 응답 데이터
        })
        
    except Exception as e:
        # 에러는 데코레이터에서 자동 처리됨
        raise

@api_view(['POST'])
@permission_classes([AllowAny])
@log_clinical_activity
def save_obs_clinical_data(request, patient_uuid):
    """
    기존 저장 함수에 검증 및 에러 핸들링 적용
    """
    try:
        # 입력 데이터 정제
        cleaned_data = sanitize_clinical_data(request.data)
        
        # 데이터 검증
        diagnoses = cleaned_data.get('diagnoses', [])
        prescriptions = cleaned_data.get('prescriptions', [])
        clinical_notes = cleaned_data.get('clinical_notes', '')
        
        validation_errors = []
        
        # 진단 데이터 검증
        for i, diagnosis in enumerate(diagnoses):
            errors = ClinicalDataValidator.validate_diagnosis(diagnosis)
            for error in errors:
                validation_errors.append(f"진단 {i+1}: {error}")
        
        # 처방 데이터 검증
        for i, prescription in enumerate(prescriptions):
            errors = ClinicalDataValidator.validate_prescription(prescription)
            for error in errors:
                validation_errors.append(f"처방 {i+1}: {error}")
        
        # 임상 노트 검증
        if clinical_notes:
            errors = ClinicalDataValidator.validate_clinical_notes(clinical_notes)
            validation_errors.extend(errors)
        
        if validation_errors:
            return Response({
                'success': False,
                'error': 'Validation failed',
                'validation_errors': validation_errors
            }, status=400)
        
        # 환자 존재 확인
        try:
            person = Person.objects.get(uuid=patient_uuid, voided=False)
        except Person.DoesNotExist:
            raise PatientNotFoundError(patient_uuid)
        
        # 기존 저장 로직...
        # ... (기존 코드에 try-catch 및 검증 추가)
        
        return Response({
            'success': True,
            # ... 기존 응답 데이터
        })
        
    except Exception as e:
        # 에러는 데코레이터에서 자동 처리됨
        raise

# ===================================================================
# backend/backend/settings.py (추가 설정)
"""
settings.py에 추가할 로깅 설정
"""

import os

# 로그 디렉토리 생성
os.makedirs('logs', exist_ok=True)

# 기존 LOGGING 설정에 추가하거나 병합
LOGGING = CLINICAL_LOGGING_CONFIG

# 추가 설정
OPENMRS_CLINICAL_CONFIG = {
    'ENABLE_AUDIT_LOGGING': True,
    'ENABLE_PERFORMANCE_MONITORING': True,
    'MAX_CLINICAL_NOTE_LENGTH': 10000,
    'API_TIMEOUT_SECONDS': 30,
    'MAX_RETRIES': 3,
    'SLOW_QUERY_THRESHOLD': 5.0,  # seconds
}