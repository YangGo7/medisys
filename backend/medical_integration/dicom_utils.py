# backend/medical_integration/dicom_utils.py

import numpy as np
import pydicom
import cv2
import logging
from typing import Optional, Tuple
from .orthanc_api import OrthancAPI
import requests
from io import BytesIO

logger = logging.getLogger('medical_integration')

def get_dicom_image_from_orthanc(study_uid: str, series_uid: str = None, instance_uid: str = None) -> Optional[np.ndarray]:
    """
    Orthanc에서 DICOM 이미지를 가져와서 numpy 배열로 변환
    
    Args:
        study_uid: Study Instance UID
        series_uid: Series Instance UID (선택사항)
        instance_uid: SOP Instance UID (선택사항)
    
    Returns:
        numpy.ndarray: DICOM 이미지 데이터 (2D 또는 3D)
        None: 이미지를 가져올 수 없는 경우
    """
    try:
        orthanc_api = OrthancAPI()
        
        # 1. Study UID로 Study ID 찾기 (기존 OrthancAPI 사용)
        target_instance_id = None
        
        if instance_uid:
            # 특정 Instance UID가 주어진 경우
            target_instance_id = _find_instance_by_uid_optimized(orthanc_api, instance_uid)
        else:
            # Study 또는 Series 기준으로 Instance 찾기
            target_instance_id = _find_instance_by_study_series(orthanc_api, study_uid, series_uid)
        
        if not target_instance_id:
            logger.error(f"No instance found for study_uid: {study_uid}")
            return None
        
        logger.info(f"Found instance ID: {target_instance_id}")
        
        # 2. DICOM 파일 데이터 가져오기 (기존 API 활용)
        dicom_data = orthanc_api.get_instance_file(target_instance_id)
        
        if not dicom_data:
            logger.error(f"Failed to get DICOM data for instance: {target_instance_id}")
            return None
        
        # 3. DICOM 파싱 및 이미지 추출
        dicom_ds = pydicom.dcmread(BytesIO(dicom_data))
        image_array = _extract_image_from_dicom(dicom_ds)
        
        if image_array is not None:
            logger.info(f"Successfully extracted image: shape={image_array.shape}, dtype={image_array.dtype}")
        
        return image_array
        
    except Exception as e:
        logger.error(f"Error getting DICOM image from Orthanc: {str(e)}")
        return None

def _find_instance_by_uid_optimized(orthanc_api: OrthancAPI, instance_uid: str) -> Optional[str]:
    """
    Instance UID로 Instance ID를 효율적으로 찾기
    Orthanc의 find API를 활용
    """
    try:
        # Orthanc의 find API 사용 (기존 프로젝트에서 사용하는 방식)
        find_result = orthanc_api.post("tools/find", {
            "Level": "Instance",
            "Query": {
                "SOPInstanceUID": instance_uid
            }
        })
        
        if find_result and len(find_result) > 0:
            return find_result[0]  # 첫 번째 결과 반환
        
        return None
        
    except Exception as e:
        logger.error(f"Error finding instance by UID: {str(e)}")
        return None

def _find_instance_by_study_series(orthanc_api: OrthancAPI, study_uid: str, series_uid: str = None) -> Optional[str]:
    """
    Study UID와 Series UID로 Instance 찾기
    """
    try:
        # Study 찾기
        study_find_result = orthanc_api.post("tools/find", {
            "Level": "Study",
            "Query": {
                "StudyInstanceUID": study_uid
            }
        })
        
        if not study_find_result or len(study_find_result) == 0:
            logger.error(f"Study not found for UID: {study_uid}")
            return None
        
        study_id = study_find_result[0]
        
        if series_uid:
            # 특정 Series 찾기
            series_find_result = orthanc_api.post("tools/find", {
                "Level": "Series",
                "Query": {
                    "StudyInstanceUID": study_uid,
                    "SeriesInstanceUID": series_uid
                }
            })
            
            if series_find_result and len(series_find_result) > 0:
                series_id = series_find_result[0]
                # Series의 첫 번째 Instance 가져오기
                instances = orthanc_api.get_series_instances(series_id)
                if instances and len(instances) > 0:
                    return instances[0]
        else:
            # Study의 첫 번째 Series, 첫 번째 Instance
            series_list = orthanc_api.get_study_series(study_id)
            if series_list and len(series_list) > 0:
                first_series = series_list[0]
                instances = orthanc_api.get_series_instances(first_series)
                if instances and len(instances) > 0:
                    return instances[0]
        
        return None
        
    except Exception as e:
        logger.error(f"Error finding instance by study/series: {str(e)}")
        return None

def _extract_image_from_dicom(dicom_ds) -> Optional[np.ndarray]:
    """DICOM 데이터셋에서 이미지 배열 추출"""
    try:
        # 이미지 데이터 확인
        if not hasattr(dicom_ds, 'pixel_array'):
            logger.error("DICOM does not contain pixel data")
            return None
        
        # 픽셀 배열 가져오기
        pixel_array = dicom_ds.pixel_array
        
        # 데이터 타입 처리
        if pixel_array.dtype == np.uint16:
            # 16비트 이미지를 8비트로 변환
            if hasattr(dicom_ds, 'WindowCenter') and hasattr(dicom_ds, 'WindowWidth'):
                # Window Level 적용
                center = float(dicom_ds.WindowCenter) if isinstance(dicom_ds.WindowCenter, (int, float)) else float(dicom_ds.WindowCenter[0])
                width = float(dicom_ds.WindowWidth) if isinstance(dicom_ds.WindowWidth, (int, float)) else float(dicom_ds.WindowWidth[0])
                
                min_val = center - width / 2
                max_val = center + width / 2
                
                # 윈도우 레벨 적용
                pixel_array = np.clip(pixel_array, min_val, max_val)
                pixel_array = ((pixel_array - min_val) / (max_val - min_val) * 255).astype(np.uint8)
            else:
                # 자동 스케일링
                pixel_array = ((pixel_array - pixel_array.min()) / (pixel_array.max() - pixel_array.min()) * 255).astype(np.uint8)
        
        elif pixel_array.dtype != np.uint8:
            # 다른 데이터 타입을 uint8로 변환
            pixel_array = ((pixel_array - pixel_array.min()) / (pixel_array.max() - pixel_array.min()) * 255).astype(np.uint8)
        
        # 이미지 방향 보정
        if hasattr(dicom_ds, 'PhotometricInterpretation'):
            if dicom_ds.PhotometricInterpretation == 'MONOCHROME1':
                # MONOCHROME1인 경우 흑백 반전
                pixel_array = 255 - pixel_array
        
        # 다차원 이미지 처리 (예: 컬러 이미지)
        if len(pixel_array.shape) == 3:
            # RGB 이미지인 경우 그레이스케일로 변환
            if pixel_array.shape[2] == 3:
                pixel_array = cv2.cvtColor(pixel_array, cv2.COLOR_RGB2GRAY)
            elif pixel_array.shape[0] == 3:  # 채널이 첫 번째 축인 경우
                pixel_array = np.moveaxis(pixel_array, 0, -1)
                pixel_array = cv2.cvtColor(pixel_array, cv2.COLOR_RGB2GRAY)
            else:
                # 첫 번째 슬라이스만 사용
                pixel_array = pixel_array[0]
        
        logger.info(f"Extracted image: shape={pixel_array.shape}, dtype={pixel_array.dtype}, range=[{pixel_array.min()}, {pixel_array.max()}]")
        
        return pixel_array
        
    except Exception as e:
        logger.error(f"Error extracting image from DICOM: {str(e)}")
        return None

def get_dicom_metadata(study_uid: str, series_uid: str = None, instance_uid: str = None) -> Optional[dict]:
    """DICOM 메타데이터 추출"""
    try:
        orthanc_api = OrthancAPI()
        
        # Study 정보 가져오기
        studies = orthanc_api.get("studies") or []
        study_info = None
        
        for study_id in studies:
            study_data = orthanc_api.get(f"studies/{study_id}")
            if study_data and study_data.get('MainDicomTags', {}).get('StudyInstanceUID') == study_uid:
                study_info = study_data
                break
        
        if not study_info:
            return None
        
        metadata = {
            'study_uid': study_uid,
            'study_id': study_id,
            'patient_info': study_info.get('PatientMainDicomTags', {}),
            'study_info': study_info.get('MainDicomTags', {}),
            'series_count': len(study_info.get('Series', [])),
            'last_update': study_info.get('LastUpdate', ''),
            'is_stable': study_info.get('IsStable', False)
        }
        
        return metadata
        
    except Exception as e:
        logger.error(f"Error getting DICOM metadata: {str(e)}")
        return None

def validate_dicom_image(image_array: np.ndarray) -> bool:
    """DICOM 이미지 유효성 검사"""
    if image_array is None:
        return False
    
    if not isinstance(image_array, np.ndarray):
        return False
    
    if image_array.size == 0:
        return False
    
    if len(image_array.shape) not in [2, 3]:
        return False
    
    # 최소 크기 확인 (예: 64x64)
    if any(dim < 64 for dim in image_array.shape[:2]):
        logger.warning(f"Image too small: {image_array.shape}")
        return False
    
    return True