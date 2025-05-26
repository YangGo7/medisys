# models/yolo_inference.py

import os
import cv2
import numpy as np
from PIL import Image
import torch
from ultralytics import YOLO
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import logging
from typing import List, Dict, Tuple, Optional
import pydicom
import requests
from io import BytesIO
import time

logger = logging.getLogger(__name__)

class YOLOInferenceService:
    """YOLO 모델을 사용한 의료영상 분석 서비스"""
    
    def __init__(self, model_path: str = None, confidence_threshold: float = 0.5):
        self.model_path = model_path or self._get_default_model_path()
        self.confidence_threshold = confidence_threshold
        self.model = None
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        
        if self.model_path and os.path.exists(self.model_path):
            self.load_model()
        else:
            logger.warning(f"YOLO model not found at {self.model_path}")
    
    def _get_default_model_path(self):
        """기본 모델 경로 반환"""
        base_dir = getattr(settings, 'BASE_DIR', os.path.dirname(os.path.dirname(__file__)))
        return os.path.join(base_dir, 'models', 'yolov8_best.pt')
    
    def load_model(self):
        """YOLO 모델 로드"""
        try:
            print(f"Loading YOLO model from: {self.model_path}")
            self.model = YOLO(self.model_path)
            self.model.to(self.device)
            logger.info(f"YOLO model loaded successfully from {self.model_path}")
            logger.info(f"Using device: {self.device}")
            logger.info(f"Model classes: {self.model.names}")
            print(f"Model classes: {self.model.names}")
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            print(f"Failed to load YOLO model: {e}")
            raise
    
    def preprocess_dicom_image(self, dicom_data) -> np.ndarray:
        """DICOM 이미지 전처리"""
        try:
            # DICOM에서 픽셀 데이터 추출
            if hasattr(dicom_data, 'pixel_array'):
                img_array = dicom_data.pixel_array
            else:
                # BytesIO에서 읽는 경우
                img_array = pydicom.dcmread(dicom_data).pixel_array
            
            # 16-bit에서 8-bit로 변환 (필요한 경우)
            if img_array.dtype == np.uint16:
                # Window/Level 적용 (간단한 방법)
                img_array = ((img_array - img_array.min()) / 
                           (img_array.max() - img_array.min()) * 255).astype(np.uint8)
            
            # Grayscale을 RGB로 변환
            if len(img_array.shape) == 2:
                img_array = cv2.cvtColor(img_array, cv2.COLOR_GRAY2RGB)
            elif len(img_array.shape) == 3 and img_array.shape[2] == 1:
                img_array = cv2.cvtColor(img_array.squeeze(), cv2.COLOR_GRAY2RGB)
            
            return img_array
            
        except Exception as e:
            logger.error(f"Failed to preprocess DICOM image: {e}")
            print(f"Failed to preprocess DICOM image: {e}")
            raise
    
    def preprocess_image_from_orthanc(self, orthanc_instance_id: str) -> Tuple[np.ndarray, dict]:
        """Orthanc에서 이미지 가져와서 전처리"""
        try:
            orthanc_url = getattr(settings, 'ORTHANC_SERVER_URL', 'http://localhost:8042')
            
            # Orthanc에서 DICOM 이미지 다운로드
            dicom_url = f"{orthanc_url}/instances/{orthanc_instance_id}/file"
            print(f"Fetching DICOM from: {dicom_url}")
            
            response = requests.get(dicom_url)
            response.raise_for_status()
            
            # DICOM 파싱
            dicom_data = pydicom.dcmread(BytesIO(response.content))
            
            # 이미지 전처리
            img_array = self.preprocess_dicom_image(dicom_data)
            
            # 메타데이터 추출
            metadata = {
                'study_uid': getattr(dicom_data, 'StudyInstanceUID', ''),
                'series_uid': getattr(dicom_data, 'SeriesInstanceUID', ''),
                'instance_uid': getattr(dicom_data, 'SOPInstanceUID', ''),
                'patient_id': getattr(dicom_data, 'PatientID', ''),
                'modality': getattr(dicom_data, 'Modality', ''),
                'image_width': img_array.shape[1],
                'image_height': img_array.shape[0],
                'accession_number': getattr(dicom_data, 'AccessionNumber', '')
            }
            
            print(f"Image preprocessed: {img_array.shape}, Metadata: {metadata}")
            return img_array, metadata
            
        except Exception as e:
            logger.error(f"Failed to get image from Orthanc: {e}")
            print(f"Failed to get image from Orthanc: {e}")
            raise
    
    def run_inference(self, image: np.ndarray) -> List[Dict]:
        """YOLO 추론 실행"""
        if self.model is None:
            raise RuntimeError("YOLO model is not loaded")
        
        try:
            print(f"Running YOLO inference on image shape: {image.shape}")
            
            # YOLO 추론
            results = self.model(image, conf=self.confidence_threshold, verbose=False)
            
            detections = []
            for result in results:
                boxes = result.boxes
                if boxes is not None and len(boxes) > 0:
                    for i in range(len(boxes)):
                        # 바운딩박스 좌표 (xyxy 형식)
                        x1, y1, x2, y2 = boxes.xyxy[i].cpu().numpy()
                        
                        # 신뢰도
                        confidence = float(boxes.conf[i].cpu().numpy())
                        
                        # 클래스
                        class_id = int(boxes.cls[i].cpu().numpy())
                        class_name = self.model.names[class_id]
                        
                        detection = {
                            'class_id': class_id,
                            'class_name': class_name,
                            'confidence': confidence,
                            'bbox': [float(x1), float(y1), float(x2), float(y2)],
                            'bbox_area': float((x2 - x1) * (y2 - y1))
                        }
                        
                        detections.append(detection)
            
            print(f"Found {len(detections)} detections")
            return detections
            
        except Exception as e:
            logger.error(f"YOLO inference failed: {e}")
            print(f"YOLO inference failed: {e}")
            raise
    
    def draw_annotations(self, image: np.ndarray, detections: List[Dict]) -> np.ndarray:
        """이미지에 바운딩박스와 라벨 그리기"""
        annotated_image = image.copy()
        
        # 클래스별 색상 정의 (BGR 형식)
        colors = {
            'pneumonia': (0, 0, 255),        # 빨간색
            'pneumothorax': (0, 165, 255),   # 주황색
            'nodule': (0, 255, 0),           # 초록색
            'fracture': (0, 255, 255),       # 노란색
            'atelectasis': (128, 0, 128),    # 보라색
            'consolidation': (255, 0, 0),    # 파란색
            'pleural_effusion': (255, 255, 0), # 시안색
            'default': (255, 255, 0)         # 시안색
        }
        
        for detection in detections:
            x1, y1, x2, y2 = [int(coord) for coord in detection['bbox']]
            class_name = detection['class_name']
            confidence = detection['confidence']
            
            # 색상 선택
            color = colors.get(class_name.lower(), colors['default'])
            
            # 바운딩박스 그리기 (두께 3)
            cv2.rectangle(annotated_image, (x1, y1), (x2, y2), color, 3)
            
            # 라벨 텍스트
            label = f"{class_name}: {confidence:.2f}"
            
            # 텍스트 크기 계산
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.7
            thickness = 2
            (text_width, text_height), baseline = cv2.getTextSize(label, font, font_scale, thickness)
            
            # 라벨 배경 그리기
            cv2.rectangle(annotated_image, 
                         (x1, y1 - text_height - baseline - 10), 
                         (x1 + text_width, y1), 
                         color, -1)
            
            # 라벨 텍스트 그리기
            cv2.putText(annotated_image, label, 
                       (x1, y1 - baseline - 5), 
                       font, font_scale, (255, 255, 255), thickness)
        
        return annotated_image
    
    def save_result_images(self, original_image: np.ndarray, 
                          annotated_image: np.ndarray,
                          patient_id: str, 
                          instance_uid: str) -> Tuple[str, str]:
        """분석 결과 이미지들을 저장"""
        try:
            # 파일명 생성
            timestamp = int(time.time())
            original_filename = f"original_{patient_id}_{instance_uid}_{timestamp}.png"
            annotated_filename = f"annotated_{patient_id}_{instance_uid}_{timestamp}.png"
            
            # 이미지를 PNG로 인코딩
            _, original_encoded = cv2.imencode('.png', original_image)
            _, annotated_encoded = cv2.imencode('.png', annotated_image)
            
            original_bytes = original_encoded.tobytes()
            annotated_bytes = annotated_encoded.tobytes()
            
            # Django 파일 저장
            original_path = default_storage.save(
                f"ai_results/original/{original_filename}",
                ContentFile(original_bytes)
            )
            
            annotated_path = default_storage.save(
                f"ai_results/annotated/{annotated_filename}",
                ContentFile(annotated_bytes)
            )
            
            print(f"Images saved: {original_path}, {annotated_path}")
            return original_path, annotated_path
            
        except Exception as e:
            logger.error(f"Failed to save result images: {e}")
            print(f"Failed to save result images: {e}")
            raise
    
    def analyze_dicom_instance(self, orthanc_instance_id: str) -> Dict:
        """DICOM 인스턴스 전체 분석 파이프라인"""
        try:
            start_time = time.time()
            print(f"Starting analysis for Orthanc instance: {orthanc_instance_id}")
            
            # 1. Orthanc에서 이미지 가져오기
            image, metadata = self.preprocess_image_from_orthanc(orthanc_instance_id)
            
            # 2. YOLO 추론
            detections = self.run_inference(image)
            
            # 3. 어노테이션 이미지 생성
            annotated_image = self.draw_annotations(image, detections)
            
            # 4. 이미지 저장
            original_path, annotated_path = self.save_result_images(
                image, annotated_image, 
                metadata['patient_id'], 
                metadata['instance_uid']
            )
            
            processing_time = time.time() - start_time
            
            # 5. 결과 반환
            result = {
                'metadata': metadata,
                'detections': detections,
                'processing_time': processing_time,
                'original_image_path': original_path,
                'annotated_image_path': annotated_path,
                'total_detections': len(detections),
                'max_confidence': max([d['confidence'] for d in detections]) if detections else 0.0,
                'has_abnormal_findings': len(detections) > 0
            }
            
            logger.info(f"Analysis completed for {orthanc_instance_id}: "
                       f"{len(detections)} detections in {processing_time:.2f}s")
            print(f"Analysis completed: {len(detections)} detections in {processing_time:.2f}s")
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to analyze DICOM instance {orthanc_instance_id}: {e}")
            print(f"Failed to analyze DICOM instance {orthanc_instance_id}: {e}")
            raise


# 싱글톤 패턴으로 YOLO 서비스 관리
_yolo_service_instance = None

def get_yolo_service(model_path: str = None, confidence_threshold: float = 0.5) -> YOLOInferenceService:
    """YOLO 서비스 인스턴스 가져오기 (싱글톤 패턴)"""
    global _yolo_service_instance
    
    if _yolo_service_instance is None:
        _yolo_service_instance = YOLOInferenceService(model_path, confidence_threshold)
    
    return _yolo_service_instance