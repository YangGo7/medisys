# backend/ai_services/simclr_inference_service.py

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import cv2
import pickle
import logging
from typing import Dict, List, Tuple, Optional
from torchvision import transforms
from efficientnet_pytorch import EfficientNet
import faiss
from pathlib import Path
import json
from datetime import datetime
import base64
from io import BytesIO
from PIL import Image
import matplotlib.pyplot as plt
import matplotlib.cm as cm

logger = logging.getLogger(__name__)

class EfficientNetSimCLR(nn.Module):
    """원본 SimCLR_Patched 모델 구조 그대로"""
    
    def __init__(self, feature_dim=512, projection_dim=128):
        super().__init__()
        self.feature_dim = feature_dim
        
        # EfficientNet-B2 백본
        self.backbone = EfficientNet.from_pretrained('efficientnet-b2')
        self.backbone._fc = nn.Identity()  # 분류 레이어 제거
        
        # Projection head (학습 시와 동일)
        backbone_dim = 1408  # EfficientNet-B2의 feature dimension
        self.projection = nn.Sequential(
            nn.Linear(backbone_dim, feature_dim),
            nn.ReLU(),
            nn.Linear(feature_dim, projection_dim)
        )
    
    def forward(self, x):
        # Backbone에서 특징 추출
        features = self.backbone(x)  # [batch, 1408]
        
        # Projection
        projected = self.projection(features)  # [batch, 128]
        
        return features, projected

class GradCAMGenerator:
    """Grad-CAM 생성기 (원본 코드 기반)"""
    
    def __init__(self, model, device='cpu'):
        self.model = model
        self.device = device
        self.gradients = None
        self.activations = None
        
        # EfficientNet의 마지막 conv layer에 hook 등록
        self.target_layer = self.model.backbone._conv_head
        self.target_layer.register_forward_hook(self._save_activation)
        self.target_layer.register_backward_hook(self._save_gradient)
    
    def _save_activation(self, module, input, output):
        self.activations = output
    
    def _save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0]
    
    def generate_cam(self, input_tensor, anomaly_score):
        """Grad-CAM 생성"""
        self.model.eval()
        
        # Forward pass
        features, projected = self.model(input_tensor)
        
        # Backward pass (anomaly score에 대해)
        self.model.zero_grad()
        if anomaly_score.requires_grad:
            anomaly_score.backward(retain_graph=True)
        
        # Grad-CAM 계산
        gradients = self.gradients  # [1, C, H, W]
        activations = self.activations  # [1, C, H, W]
        
        if gradients is None or activations is None:
            # Fallback: 단순히 activations의 평균 사용
            cam = torch.mean(activations[0], dim=0)
        else:
            # Global average pooling of gradients
            weights = torch.mean(gradients[0], dim=(1, 2))  # [C]
            
            # Weighted combination
            cam = torch.zeros(activations.shape[2:], device=self.device)
            for i, w in enumerate(weights):
                cam += w * activations[0, i, :, :]
        
        # ReLU and normalize
        cam = F.relu(cam)
        if cam.max() > 0:
            cam = cam / cam.max()
        
        return cam.detach().cpu().numpy()

class SimCLRPatchInference:
    """SimCLR 패치 기반 이상탐지 추론"""
    
    def __init__(self, model_path: str, features_path: str, device='cpu'):
        self.device = device
        self.model = None
        self.reference_features = None
        self.faiss_index = None
        self.grad_cam = None
        
        # 이미지 전처리 (학습 시와 동일)
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])
        
        self._load_model(model_path)
        self._load_features(features_path)
        
    def _load_model(self, model_path: str):
        """모델 로드"""
        try:
            checkpoint = torch.load(model_path, map_location=self.device)
            
            # 모델 설정 추출
            model_config = checkpoint.get('model_config', {})
            feature_dim = model_config.get('feature_dim', 512)
            projection_dim = model_config.get('projection_dim', 128)
            
            # 모델 생성 및 가중치 로드
            self.model = EfficientNetSimCLR(feature_dim, projection_dim)
            self.model.load_state_dict(checkpoint['model_state_dict'])
            self.model.to(self.device)
            self.model.eval()
            
            # Grad-CAM 초기화
            self.grad_cam = GradCAMGenerator(self.model, self.device)
            
            logger.info(f"✅ SimCLR 모델 로드 완료: {model_path}")
            
        except Exception as e:
            logger.error(f"❌ 모델 로드 실패: {e}")
            raise
    
    def _load_features(self, features_path: str):
        """정상 특징벡터 로드"""
        try:
            with open(features_path, 'rb') as f:
                features_data = pickle.load(f)
            
            # 특징벡터 추출
            if isinstance(features_data, dict):
                self.reference_features = features_data.get('features', features_data)
            else:
                self.reference_features = features_data
            
            # FAISS 인덱스 구성
            dimension = self.reference_features.shape[1]
            self.faiss_index = faiss.IndexFlatL2(dimension)
            self.faiss_index.add(self.reference_features.astype(np.float32))
            
            logger.info(f"✅ 정상 특징벡터 로드 완료: {self.reference_features.shape[0]}개 패치")
            
        except Exception as e:
            logger.error(f"❌ 특징벡터 로드 실패: {e}")
            raise
    
    def extract_patches(self, image: np.ndarray, patch_size: int = 224, stride: int = 112):
        """이미지에서 패치 추출 (학습 시와 동일한 방식)"""
        h, w = image.shape[:2]
        patches = []
        positions = []
        
        for y in range(0, h - patch_size + 1, stride):
            for x in range(0, w - patch_size + 1, stride):
                patch = image[y:y+patch_size, x:x+patch_size]
                if patch.shape[:2] == (patch_size, patch_size):
                    patches.append(patch)
                    positions.append((x, y, x+patch_size, y+patch_size))
        
        return patches, positions
    
    def compute_patch_anomaly_scores(self, patches: List[np.ndarray]) -> np.ndarray:
        """패치들의 이상도 점수 계산"""
        anomaly_scores = []
        
        for patch in patches:
            # 패치를 PIL Image로 변환
            if len(patch.shape) == 2:  # 그레이스케일
                patch_pil = Image.fromarray(patch).convert('RGB')
            else:
                patch_pil = Image.fromarray(patch)
            
            # 전처리
            patch_tensor = self.transform(patch_pil).unsqueeze(0).to(self.device)
            
            # 특징 추출
            with torch.no_grad():
                features, projected = self.model(patch_tensor)
                features_np = features.cpu().numpy().astype(np.float32)
            
            # FAISS로 최근접 이웃 거리 계산
            distances, _ = self.faiss_index.search(features_np, k=1)
            anomaly_score = distances[0][0]  # L2 거리
            
            anomaly_scores.append(anomaly_score)
        
        return np.array(anomaly_scores)
    
    def generate_heatmap(self, image: np.ndarray, patches: List[np.ndarray], 
                        positions: List[Tuple], anomaly_scores: np.ndarray) -> np.ndarray:
        """이상도 히트맵 생성"""
        h, w = image.shape[:2]
        heatmap = np.zeros((h, w), dtype=np.float32)
        count_map = np.zeros((h, w), dtype=np.float32)
        
        # 각 패치의 이상도를 해당 위치에 누적
        for (x1, y1, x2, y2), score in zip(positions, anomaly_scores):
            heatmap[y1:y2, x1:x2] += score
            count_map[y1:y2, x1:x2] += 1
        
        # 평균화 (겹치는 부분)
        mask = count_map > 0
        heatmap[mask] = heatmap[mask] / count_map[mask]
        
        # 정규화
        if heatmap.max() > 0:
            heatmap = heatmap / heatmap.max()
        
        return heatmap
    
    def generate_gradcam_for_image(self, image: np.ndarray) -> np.ndarray:
        """전체 이미지에 대한 Grad-CAM 생성"""
        # 이미지 전처리
        if len(image.shape) == 2:
            image_pil = Image.fromarray(image).convert('RGB')
        else:
            image_pil = Image.fromarray(image)
        
        # 224x224로 리사이즈
        image_resized = image_pil.resize((224, 224))
        input_tensor = self.transform(image_resized).unsqueeze(0).to(self.device)
        
        # 특징 추출 및 이상도 계산
        with torch.enable_grad():
            input_tensor.requires_grad_()
            features, projected = self.model(input_tensor)
            
            # 정상 특징과의 거리 계산
            features_np = features.detach().cpu().numpy().astype(np.float32)
            distances, _ = self.faiss_index.search(features_np, k=1)
            anomaly_score = torch.tensor(distances[0][0], requires_grad=True)
            
            # Grad-CAM 생성
            cam = self.grad_cam.generate_cam(input_tensor, anomaly_score)
        
        # 원본 크기로 복원
        cam_resized = cv2.resize(cam, (image.shape[1], image.shape[0]))
        
        return cam_resized
    
    def analyze_image(self, image: np.ndarray) -> Dict:
        """이미지 분석 (패치 기반 + Grad-CAM)"""
        try:
            # 1. 패치 추출
            patches, positions = self.extract_patches(image)
            
            if not patches:
                return {
                    'status': 'error',
                    'message': '패치를 추출할 수 없습니다.'
                }
            
            # 2. 패치별 이상도 계산
            anomaly_scores = self.compute_patch_anomaly_scores(patches)
            
            # 3. 전체 이상도 점수
            overall_anomaly_score = np.mean(anomaly_scores)
            max_anomaly_score = np.max(anomaly_scores)
            
            # 4. 이상 패치 식별 (상위 10%)
            threshold = np.percentile(anomaly_scores, 90)
            anomaly_patches = []
            
            for i, (pos, score) in enumerate(zip(positions, anomaly_scores)):
                if score > threshold:
                    anomaly_patches.append({
                        'position': pos,
                        'score': float(score),
                        'patch_index': i
                    })
            
            # 5. 패치 기반 히트맵 생성
            patch_heatmap = self.generate_heatmap(image, patches, positions, anomaly_scores)
            
            # 6. Grad-CAM 생성
            gradcam_heatmap = self.generate_gradcam_for_image(image)
            
            # 7. 히트맵 오버레이 생성
            overlay_image = self._create_overlay(image, gradcam_heatmap)
            
            # 8. Base64 인코딩
            overlay_base64 = self._encode_image_to_base64(overlay_image)
            
            return {
                'status': 'success',
                'results': {
                    'overall_anomaly_score': float(overall_anomaly_score),
                    'max_anomaly_score': float(max_anomaly_score),
                    'num_patches': len(patches),
                    'num_anomaly_patches': len(anomaly_patches),
                    'anomaly_patches': anomaly_patches,
                    'threshold': float(threshold),
                    'is_abnormal': overall_anomaly_score > 0.5,  # 임계값 조정 가능
                    'confidence': float(min(overall_anomaly_score * 100, 100)),
                    'heatmap_overlay': f"data:image/png;base64,{overlay_base64}",
                    'image_size': image.shape[:2]
                },
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ 이미지 분석 실패: {e}")
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def _create_overlay(self, original_image: np.ndarray, heatmap: np.ndarray) -> np.ndarray:
        """원본 이미지에 히트맵 오버레이"""
        # 히트맵 정규화
        heatmap_normalized = ((heatmap - heatmap.min()) / (heatmap.max() - heatmap.min()) * 255).astype(np.uint8)
        
        # 컬러맵 적용
        heatmap_colored = cv2.applyColorMap(heatmap_normalized, cv2.COLORMAP_JET)
        
        # 원본 이미지 준비
        if len(original_image.shape) == 2:
            original_rgb = cv2.cvtColor(original_image, cv2.COLOR_GRAY2RGB)
        else:
            original_rgb = original_image
        
        # 오버레이 (70% 원본 + 30% 히트맵)
        overlay = cv2.addWeighted(original_rgb, 0.7, heatmap_colored, 0.3, 0)
        
        return overlay
    
    def _encode_image_to_base64(self, image: np.ndarray) -> str:
        """이미지를 Base64로 인코딩"""
        _, buffer = cv2.imencode('.png', image)
        return base64.b64encode(buffer).decode('utf-8')

# Django 서비스 래퍼
class SimCLRInferenceService:
    """Django용 SimCLR 추론 서비스"""
    
    def __init__(self):
        self.inference = None
        self.model_loaded = False
        
        # 모델 파일 경로
        self.model_path = Path("ai_models/sim_patch/final_efficientnet_simclr.pth")
        self.features_path = Path("ai_models/sim_patch/patch_features.pkl")
        
        self._initialize()
    
    def _initialize(self):
        """서비스 초기화"""
        try:
            if self.model_path.exists() and self.features_path.exists():
                device = 'cuda' if torch.cuda.is_available() else 'cpu'
                self.inference = SimCLRPatchInference(
                    str(self.model_path), 
                    str(self.features_path), 
                    device
                )
                self.model_loaded = True
                logger.info("✅ SimCLR 추론 서비스 초기화 완료")
            else:
                logger.warning("⚠️ SimCLR 모델 파일이 없습니다.")
                
        except Exception as e:
            logger.error(f"❌ SimCLR 서비스 초기화 실패: {e}")
    
    def analyze_dicom_image(self, image_array: np.ndarray, study_uid: str) -> Dict:
        """DICOM 이미지 분석"""
        if not self.model_loaded or self.inference is None:
            return {
                'status': 'error',
                'message': 'SimCLR 모델이 로드되지 않았습니다.'
            }
        
        try:
            result = self.inference.analyze_image(image_array)
            
            # 추가 메타데이터
            if result['status'] == 'success':
                result['study_uid'] = study_uid
                result['analysis_type'] = 'simclr_patch_based'
                result['model_type'] = 'EfficientNet-B2 SimCLR'
            
            return result
            
        except Exception as e:
            logger.error(f"❌ DICOM 이미지 분석 실패: {e}")
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def get_model_status(self) -> Dict:
        """모델 상태 반환"""
        return {
            'loaded': self.model_loaded,
            'model_path_exists': self.model_path.exists(),
            'features_path_exists': self.features_path.exists(),
            'device': self.inference.device if self.inference else 'unknown'
        }

# 싱글톤 인스턴스
simclr_inference_service = SimCLRInferenceService()