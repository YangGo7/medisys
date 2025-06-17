#!/usr/bin/env python3
"""
SSD300 기반 DICOM 이미지 분석 모듈 (PyTorch 버전) - 의료 영상 특화
"""

import os
import cv2
import numpy as np
import pydicom
import logging
import traceback
from datetime import datetime
import io
import sys # sys 모듈 임포트 추가 (로깅 핸들러에서 사용)

try:
    import torch
    import torch.nn as nn
    import torchvision
    import torchvision.transforms as transforms
    from torchvision.models.detection import ssd300_vgg16
    from torchvision.models.detection.ssd import SSDClassificationHead
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logging.warning("torch/torchvision 패키지가 설치되어 있지 않습니다. pip install torch torchvision")

logger = logging.getLogger('SSDInference')
# SSDInference 로거에 StreamHandler 추가 및 인코딩 설정
if not logger.handlers: 
    log_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(log_formatter)
    stream_handler.encoding = 'utf-8' # <-- 인코딩 설정
    logger.addHandler(stream_handler)
    logger.setLevel(logging.INFO) # DEBUG로 설정하면 더미 모델 결과 생성 과정도 볼 수 있음


class SSDAnalyzer:
    """SSD300 모델을 사용한 DICOM 이미지 분석 클래스"""
    
    def __init__(self, model_path='/models/ssd/ssd.pth'):
        self.model_path = model_path
        self.model = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.confidence_threshold = 0.3
        self.input_size = 300  # SSD300 입력 크기
        
        # ai_service의 MEDICAL_CLASSES와 동일하게 14개 클래스 (배경 제외, ID 0부터 13까지)
        self.num_classes = 14 
        self.class_names = self._get_class_names()

        self._load_model()
    
    def _get_class_names(self):
        """의료 영상 클래스 이름 정의 (ai_service와 동일한 14개 클래스)"""
        return {
            0: 'Aortic enlargement',
            1: 'Atelectasis',
            2: 'Calcification',
            3: 'Cardiomegaly',
            4: 'Consolidation',
            5: 'ILD',
            6: 'Infiltration',
            7: 'Lung Opacity',
            8: 'Nodule/Mass',
            9: 'Other lesion',
            10: 'Pleural effusion',
            11: 'Pleural thickening',
            12: 'Pulmonary fibrosis',
            13: 'Normal'
        }
    
    def _load_model(self):
        """SSD300 모델 로드"""
        try:
            if not TORCH_AVAILABLE:
                logger.error("PyTorch/torchvision 패키지를 사용할 수 없습니다.")
                return False
            
            logger.info(f"🔍 SSD300 모델 로드 시도: {self.model_path}")
            

            
            try:
                # 커스텀 모델 로드
                logger.info("🏗️ SSD300 모델 구조 생성 중...")
                
                # 기본 SSD300 모델 생성 (weights는 torchvision 0.13.0+에서 ENUM 사용 권장)
                self.model = ssd300_vgg16(weights=torchvision.models.detection.SSD300_VGG16_Weights.DEFAULT)
                
                # 기존 정보 얻기
                in_channels = [512, 1024, 512, 256, 256, 256] 
                num_anchors = self.model.anchor_generator.num_anchors_per_location()
                
                # classification head 재정의 (커스텀 클래스 수에 맞게)
                self.model.head.classification_head = SSDClassificationHead(
                    in_channels, num_anchors, self.num_classes
                )
                
                # 체크포인트 로드
                checkpoint = torch.load(str(self.model_path), map_location=self.device)
                
                # 체크포인트가 state_dict를 포함하는 딕셔너리 형태인지 확인하여 로드
                if isinstance(checkpoint, dict) and 'state_dict' in checkpoint:
                     self.model.load_state_dict(checkpoint['state_dict'])
                     logger.info("✅ 체크포인트 (state_dict 키 포함) 로드 성공!")
                elif isinstance(checkpoint, dict): # state_dict만 직접 저장된 경우
                     self.model.load_state_dict(checkpoint)
                     logger.info("✅ 체크포인트 (state_dict 직접) 로드 성공!")
                else: # 기타 예상치 못한 형태
                    logger.warning("❌ 예상치 못한 체크포인트 형태.")
                    return False
                
                # 모델 설정
                self.model = self.model.to(self.device)
                self.model.eval()
                
                logger.info(f"✅ SSD300 커스텀 모델 로드 완료: {self.model_path}")
                
                # 모델 정보 로깅
                logger.info(f"로드된 모델 클래스 수: {self.num_classes}")
                logger.info(f"로드된 모델 클래스들: {list(self.class_names.values())}")
                
                
                return True
                
            except Exception as e:
                logger.error(f"❌ 커스텀 SSD300 모델 로드 중 오류 발생: {e}")
                logger.error(f"상세 에러: {traceback.format_exc()}")

                return False
                
        except Exception as e: 
            logger.error(f"❌ SSD 모델 로드 최종 실패: {e}")
            logger.error(f"상세 에러: {traceback.format_exc()}")

            
            return False
    

    def _load_dicom_from_bytes(self, dicom_bytes):
        """바이너리 DICOM 데이터에서 이미지 추출 (Flask AI Service 호환)"""
        try:
            dicom_buffer = io.BytesIO(dicom_bytes)
            dicom_data = pydicom.dcmread(dicom_buffer)
            pixel_array = dicom_data.pixel_array
            
            if hasattr(dicom_data, 'WindowCenter') and hasattr(dicom_data, 'WindowWidth'):
                # WindowCenter와 WindowWidth가 MultiValue일 수 있으므로 첫 번째 값만 사용
                window_center = float(dicom_data.WindowCenter[0] if isinstance(dicom_data.WindowCenter, pydicom.multival.MultiValue) else dicom_data.WindowCenter)
                window_width = float(dicom_data.WindowWidth[0] if isinstance(dicom_data.WindowWidth, pydicom.multival.MultiValue) else dicom_data.WindowWidth)
                
                img_min = window_center - window_width // 2
                img_max = window_center + window_width // 2
                pixel_array = np.clip(pixel_array, img_min, img_max)
            
            # 8비트 정규화 (0~255 범위로 변환)
            if pixel_array.dtype != np.uint8:
                if pixel_array.max() == pixel_array.min():
                    pixel_array = np.zeros_like(pixel_array, dtype=np.uint8)
                else:
                    pixel_array = ((pixel_array - pixel_array.min()) / 
                                 (pixel_array.max() - pixel_array.min()) * 255).astype(np.uint8)
            
            # 그레이스케일 → RGB 변환
            if len(pixel_array.shape) == 2:
                rgb_image = cv2.cvtColor(pixel_array, cv2.COLOR_GRAY2RGB)
            else:
                rgb_image = pixel_array
            
            return rgb_image, dicom_data
            
        except Exception as e:
            logger.error(f"DICOM 이미지 로드 실패: {str(e)}")
            logger.error(traceback.format_exc())
            return None, None
    
    
    ## 아래 부분 삭제 가능 ----------------------------------------------------------------------------- ##
    def _enhance_medical_image(self, image):
        """의료 영상에 특화된 이미지 향상"""
        try:
            enhanced_image = image.copy()
            
            # CLAHE 적용
            if len(image.shape) == 3 and image.shape[2] == 3: # RGB 이미지
                lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
                lab[:,:,0] = clahe.apply(lab[:,:,0])
                enhanced_image = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
            elif len(image.shape) == 2: # 그레이스케일 이미지 (RGB로 변환 후 CLAHE)
                temp_rgb = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
                lab = cv2.cvtColor(temp_rgb, cv2.COLOR_RGB2LAB)
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
                lab[:,:,0] = clahe.apply(lab[:,:,0])
                enhanced_image = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
            else:
                logger.warning("이미지 향상: 예상치 못한 이미지 채널 수. CLAHE 건너뜀.")
                if len(image.shape) == 2:
                    enhanced_image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
            
            # 노이즈 제거
            if len(enhanced_image.shape) == 3 and enhanced_image.shape[2] == 3:
                enhanced_image = cv2.bilateralFilter(enhanced_image, 9, 75, 75)
            else:
                logger.warning("노이즈 제거: 이미지 채널이 3개가 아님. bilateralFilter 건너뜀.")
            
            # 샤프닝 필터 적용
            if len(enhanced_image.shape) == 3 and enhanced_image.shape[2] == 3:
                kernel = np.array([[-1,-1,-1], [-1, 9,-1], [-1,-1,-1]])
                enhanced_image = cv2.filter2D(enhanced_image, -1, kernel)
            else:
                logger.warning("샤프닝: 이미지 채널이 3개가 아님. filter2D 건너뜀.")
            
            return enhanced_image
            
        except Exception as e:
            logger.warning(f"이미지 향상 처리 실패: {str(e)}")
            logger.warning(traceback.format_exc())
            return image

    ## ---------------------------------------------------------------------------------------------- ##

    
    def _preprocess_image(self, image):
        """SSD300 입력을 위한 이미지 전처리"""
        try:
            original_height, original_width = image.shape[:2]
            
            # OpenCV BGR을 RGB로 변환 (PIL로 넘어가기 전에)
            if len(image.shape) == 3 and image.shape[2] == 3:
                image_for_pil = cv2.cvtColor(image, cv2.COLOR_BGR2RGB) 
            elif len(image.shape) == 2: # 그레이스케일인 경우
                image_for_pil = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
            else:
                image_for_pil = image # 이미 3채널이면 그대로 사용
            
            transform = transforms.Compose([
                transforms.ToPILImage(),
                transforms.Resize((self.input_size, self.input_size)),
                transforms.ToTensor(),
            ])
            
            input_tensor = transform(image_for_pil).unsqueeze(0).to(self.device)
            
            return input_tensor, (original_width, original_height)
            
        except Exception as e:
            logger.error(f"이미지 전처리 실패: {str(e)}")
            logger.error(traceback.format_exc())
            return None, None
    
    def _run_inference(self, input_tensor):
        """SSD300 모델 추론 실행"""
        try:
            if self.model is None:
                raise ValueError("모델이 로드되지 않았습니다.")
            
            logger.info(f"🎯 SSD 추론 시작 - 입력 크기: {input_tensor.shape}")
            
            self.model.eval()
            with torch.no_grad():
                predictions = self.model(input_tensor)
            
            return predictions
            
        except Exception as e:
            logger.error(f"모델 추론 실패: {str(e)}")
            logger.error(traceback.format_exc())
            return None
    
    def _parse_ssd_outputs(self, predictions, original_size):
        """SSD300 출력 파싱 및 ai_service.py 형식에 맞게 변환"""
        detections = []
        try:
            original_width, original_height = original_size
            
            if not predictions or len(predictions) == 0:
                logger.info("모델 예측 결과가 없습니다.")
                return detections
                
            pred = predictions[0] # 첫 번째 이미지에 대한 예측 결과
            
            if not isinstance(pred, dict):
                logger.warning(f"예상치 못한 예측 형태: {type(pred)}. 딕셔너리가 아닙니다.")
                return detections
                
            boxes = pred.get('boxes', torch.empty((0, 4)))
            labels = pred.get('labels', torch.empty((0,)))
            scores = pred.get('scores', torch.empty((0,)))
            
            logger.info(f"📊 SSD 출력: boxes={boxes.shape}, labels={labels.shape}, scores={scores.shape}")
            
            if len(boxes) == 0:
                logger.info("검출된 객체 없음.")
                return detections
                
            valid_indices = scores > self.confidence_threshold
            valid_boxes = boxes[valid_indices]
            valid_labels = labels[valid_indices]
            valid_scores = scores[valid_indices]
            
            logger.info(f"🔍 임계값 {self.confidence_threshold} 이상: {len(valid_boxes)}개")
            
            scale_x = original_width / self.input_size
            scale_y = original_height / self.input_size
            
            for i in range(len(valid_boxes)):
                # 모든 텐서 값을 파이썬 기본 타입으로 완전히 변환
                box = valid_boxes[i].cpu().numpy().tolist() # [x1, y1, x2, y2]
                label_id = int(valid_labels[i].cpu().numpy().item())
                score = float(valid_scores[i].cpu().numpy().item())
                
                x1, y1, x2, y2 = box
                
                orig_x1 = int(x1 * scale_x)
                orig_y1 = int(y1 * scale_y)
                orig_x2 = int(x2 * scale_x)
                orig_y2 = int(y2 * scale_y)
                
                orig_x1 = max(0, min(orig_x1, original_width))
                orig_y1 = max(0, min(orig_y1, original_height))
                orig_x2 = max(0, min(orig_x2, original_width))
                orig_y2 = max(0, min(orig_y2, original_height))
                
                if orig_x2 > orig_x1 + 5 and orig_y2 > orig_y1 + 5:
                    class_name = self.class_names.get(label_id, f'Unknown_class_{label_id}')
                    
                    # ai_service.py의 save_analysis_result가 기대하는 형식으로 변경
                    detection_item = {
                        'bbox': {
                            'x': float(orig_x1),
                            'y': float(orig_y1),
                            'width': float(orig_x2 - orig_x1),
                            'height': float(orig_y2 - orig_y1)
                        },
                        'confidence': score,
                        'label': class_name,  # ai_service에서 'class_name' 대신 'label'을 사용
                        'confidence_score': score, # ai_service에서 'confidence_score'도 사용
                        'ai_text': f'SSD300 검출: {class_name} (정확도: {score:.3f})', # ai_service에서 'description' 대신 'ai_text' 사용
                        'area': float((orig_x2 - orig_x1) * (orig_y2 - orig_y1)) # area는 ai_service에서 계산해도 되지만, 여기 있으면 편리
                    }
                    
                    # 의료 영상 특화 정보 추가
                    # _extract_medical_features 함수가 기대하는 detection 형식에 맞춰 데이터 전달
                    # _extract_medical_features 내부에서 bbox는 {x,y,width,height}를 기대하므로 detection_item 그대로 전달
                    detection_item['medical_info'] = self._extract_medical_features(detection_item, (original_height, original_width))
                    
                    detections.append(detection_item)
                    
                    logger.info(f"✅ SSD 검출: {class_name} ({score:.3f}) [x:{orig_x1},y:{orig_y1},w:{(orig_x2-orig_x1)},h:{(orig_y2-orig_y1)}]")
            
            return detections
            
        except Exception as e:
            logger.error(f"SSD 출력 파싱 실패: {e}")
            logger.error(f"상세 에러: {traceback.format_exc()}")
            return []
    
    def _extract_medical_features(self, detection, image_shape):
        """의료 영상 특화 특징 추출"""
        try:
            height, width = image_shape # image_shape는 (height, width)
            bbox = detection['bbox'] # bbox는 {x, y, width, height} 형식
            
            center_x = (bbox['x'] + bbox['width'] / 2) / width
            center_y = (bbox['y'] + bbox['height'] / 2) / height
            
            area_ratio = detection['area'] / (width * height)
            
            aspect_ratio = bbox['width'] / bbox['height'] if bbox['height'] > 0 else 0
            
            anatomical_region = self._determine_anatomical_region(center_x, center_y)
            
            return {
                'relative_position': {
                    'center_x': center_x,
                    'center_y': center_y
                },
                'size_metrics': {
                    'area_ratio': area_ratio,
                    'aspect_ratio': aspect_ratio,
                    'is_large_finding': area_ratio > 0.1,  
                    'is_elongated': aspect_ratio > 2.0 or aspect_ratio < 0.5
                },
                'anatomical_info': {
                    'region': anatomical_region,
                    'is_central': 0.3 < center_x < 0.7 and 0.3 < center_y < 0.7,
                    'quadrant': self._get_quadrant(center_x, center_y)
                },
                'clinical_relevance': {
                    'attention_score': min(area_ratio * 10 + detection['confidence'], 1.0),
                    'priority_level': 'high' if area_ratio > 0.1 else 'medium' if area_ratio > 0.05 else 'low'
                }
            }
            
        except Exception as e:
            logger.warning(f"의료 특징 추출 실패: {str(e)}")
            logger.warning(traceback.format_exc())
            return {}
    
    def _determine_anatomical_region(self, center_x, center_y):
        """해부학적 위치 결정"""
        positions = []
        
        if center_x < 0.33:
            positions.append('left')
        elif center_x > 0.67:
            positions.append('right')
        else:
            positions.append('center')
        
        if center_y < 0.33:
            positions.append('upper')
        elif center_y > 0.67:
            positions.append('lower')
        else:
            positions.append('middle')
        
        return '_'.join(positions)
    
    def _get_quadrant(self, center_x, center_y):
        """사분면 결정"""
        if center_x < 0.5 and center_y < 0.5:
            return 'upper_left'
        elif center_x >= 0.5 and center_y < 0.5:
            return 'upper_right'
        elif center_x < 0.5 and center_y >= 0.5:
            return 'lower_left'
        else:
            return 'lower_right'

    
    
    def analyze(self, dicom_data_bytes): # 인풋을 dicom_path 대신 bytes로 받도록 변경
        """DICOM 이미지 분석 메인 함수"""
        try:
            start_time = datetime.now()
            
            if self.model is None:
                logger.error("SSD300 모델이 로드되지 않았습니다. 분석을 수행할 수 없습니다.")
                return {
                    'success': False,
                    'error': 'SSD300 모델이 로드되지 않았습니다.',
                    'detections': []
                }
            
            # DICOM 이미지 로드
            image, dicom_dataset = self._load_dicom_from_bytes(dicom_data_bytes) # 변경된 함수 호출
            if image is None:
                return {
                    'success': False,
                    'error': 'DICOM 이미지를 로드할 수 없습니다.',
                    'detections': []
                }
            
            # 의료 영상 향상
            enhanced_image = self._enhance_medical_image(image)
            
            # 이미지 전처리
            input_tensor, original_size = self._preprocess_image(enhanced_image)
            if input_tensor is None:
                return {
                    'success': False,
                    'error': '이미지 전처리에 실패했습니다.',
                    'detections': []
                }
            
            # 모델 추론
            predictions = self._run_inference(input_tensor)
            if predictions is None:
                return {
                    'success': False,
                    'error': '모델 추론에 실패했습니다.',
                    'detections': []
                }
            
            # 결과 파싱
            detections = self._parse_ssd_outputs(predictions, original_size)
        
            
            # 처리 시간 계산
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # DICOM 메타데이터 추출
            dicom_info = {}
            if dicom_dataset:
                try:
                    dicom_info = {
                        'patient_id': str(getattr(dicom_dataset, 'PatientID', 'Unknown')),
                        'study_date': str(getattr(dicom_dataset, 'StudyDate', 'Unknown')),
                        'modality': str(getattr(dicom_dataset, 'Modality', 'UNKNOWN')), 
                        'body_part': str(getattr(dicom_dataset, 'BodyPartExamined', 'Unknown')),
                        'image_size': {
                            'width': int(getattr(dicom_dataset, 'Columns', 0)),
                            'height': int(getattr(dicom_dataset, 'Rows', 0))
                        }
                    }
                except Exception as e:
                    logger.warning(f"DICOM 메타데이터 추출 실패: {str(e)}")
                    logger.warning(traceback.format_exc())
            
            # 결과 구성
            result = {
                'success': True,
                'detections': detections, 
                'analysis_info': {
                    'model_type': 'SSD300',
                    'device': str(self.device),
                    'processing_time_seconds': processing_time,
                    'detection_count': len(detections),
                    'confidence_threshold': self.confidence_threshold,
                    'input_size': self.input_size
                },
                'dicom_info': dicom_info,
                'image_info': {
                    'original_shape': image.shape,
                    'processed_shape': enhanced_image.shape
                },
                'message': f"SSD 분석 완료: {len(detections)}개 검출." 
            }
            
            logger.info(f"✅ SSD 분석 완료: {len(detections)}개 검출, 처리시간: {processing_time:.2f}초")
            return result
            
        except Exception as e:
            logger.error(f"❌ SSD 분석 중 오류 발생: {str(e)}")
            logger.error(f"❌ 상세 에러: {traceback.format_exc()}")
            return {
                'success': False,
                'error': str(e),
                'detections': []
            }

# 전역 분석기 인스턴스
_analyzer = None

def get_analyzer():
    """전역 분석기 인스턴스 반환"""
    global _analyzer
    if _analyzer is None:
        _analyzer = SSDAnalyzer()
    return _analyzer

def analyze(dicom_data): 
    """외부에서 호출하는 분석 함수"""
    analyzer = get_analyzer()
    return analyzer.analyze(dicom_data)