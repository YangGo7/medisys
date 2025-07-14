import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import cv2
from PIL import Image
import io
import requests
import pickle
import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from datetime import datetime
import logging
from django.conf import settings
from sklearn.covariance import EmpiricalCovariance

# SwimSimCLR 모델 import (기존 코드 재사용)
from .swinsimclr_models import (
    SingleResolutionSwinSimCLR, 
    PaperBasedConfig,
    extract_patches_paper_way,
    compute_patch_anomaly_score_paper_way
)

logger = logging.getLogger(__name__)

class SimCLRInferenceService:
    """Django용 SimCLR 추론 서비스"""
    
    def __init__(self):
        self.config = PaperBasedConfig()
        self.models = {}
        self.reference_db = {}
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.is_loaded = False
        
        # Django 설정에서 경로 가져오기
        self.weights_dir = getattr(settings, 'SIMCLR_WEIGHTS_DIR', './weights')
        self.reference_db_dir = getattr(settings, 'SIMCLR_REFERENCE_DB_DIR', './reference_db')
        self.results_dir = getattr(settings, 'SIMCLR_RESULTS_DIR', './media/simclr_results')
        
        # 결과 디렉토리 생성
        os.makedirs(self.results_dir, exist_ok=True)
    
    def load_models(self):
        """모델과 참조 DB 로드"""
        try:
            logger.info("🚀 SimCLR 모델 로딩 시작...")
            
            # 각 해상도별 모델 로드
            for patch_size in self.config.patch_sizes:
                model_path = os.path.join(self.weights_dir, f'simclr_model_{patch_size}px.pth')
                
                if os.path.exists(model_path):
                    model = SingleResolutionSwinSimCLR(
                        patch_size=patch_size,
                        feature_dim=self.config.feature_dim,
                        projection_dim=self.config.projection_dim
                    ).to(self.device)
                    
                    checkpoint = torch.load(model_path, map_location=self.device)
                    model.load_state_dict(checkpoint['model_state_dict'])
                    model.eval()
                    
                    self.models[patch_size] = model
                    logger.info(f"✅ {patch_size}px 모델 로드 완료")
                else:
                    logger.warning(f"⚠️ {model_path} 모델 파일이 없습니다")
            
            # 참조 DB 로드
            self.load_reference_database()
            
            self.is_loaded = True
            logger.info("✅ SimCLR 서비스 초기화 완료")
            
        except Exception as e:
            logger.error(f"❌ 모델 로딩 실패: {e}")
            raise e
    
    def load_reference_database(self):
        """참조 데이터베이스 로드"""
        for patch_size in self.config.patch_sizes:
            ref_db_path = os.path.join(self.reference_db_dir, f'paper_reference_db_{patch_size}px.pkl')
            
            if os.path.exists(ref_db_path):
                with open(ref_db_path, 'rb') as f:
                    data = pickle.load(f)
                
                self.reference_db[patch_size] = data
                logger.info(f"✅ {patch_size}px 참조 DB 로드 완료")
            else:
                logger.warning(f"⚠️ {ref_db_path} 참조 DB가 없습니다")
    
    def preprocess_image(self, image_source):
        """이미지 전처리"""
        if isinstance(image_source, str):  # URL
            response = requests.get(image_source, timeout=30)
            response.raise_for_status()
            image_bytes = response.content
        else:  # 파일 객체
            image_bytes = image_source.read()
        
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        image_array = np.array(image)
        
        # 1024x1024로 리사이즈
        if image_array.shape[:2] != (1024, 1024):
            image_array = cv2.resize(image_array, (1024, 1024))
        
        return image_array
    
    def extract_multi_resolution_patches(self, image_array):
        """멀티해상도 패치 추출"""
        patches_dict = {}
        
        for patch_size in self.config.patch_sizes:
            patches = extract_patches_paper_way(image_array, patch_size)
            patches_dict[patch_size] = patches
            logger.info(f"📦 {patch_size}px: {len(patches)}개 패치 추출")
        
        return patches_dict
    
    def compute_anomaly_scores(self, patches_dict):
        """각 해상도별 이상점수 계산"""
        resolution_scores = {}
        detailed_results = {}
        
        from torchvision import transforms
        
        for patch_size, patches in patches_dict.items():
            if patch_size not in self.models or patch_size not in self.reference_db:
                continue
            
            model = self.models[patch_size]
            patch_scores = []
            patch_positions = []
            
            # 변환 정의
            transform = transforms.Compose([
                transforms.ToPILImage(),
                transforms.Resize((patch_size, patch_size)),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
            ])
            
            # 각 패치별 이상점수 계산
            for patch, position in patches:
                try:
                    patch_tensor = transform(patch).unsqueeze(0).to(self.device)
                    
                    with torch.no_grad():
                        features = model.get_features(patch_tensor)
                        features_np = features.cpu().numpy().flatten()
                    
                    # Mahalanobis 거리 기반 이상점수 계산
                    anomaly_score = self.compute_mahalanobis_score(
                        features_np, patch_size
                    )
                    
                    patch_scores.append(anomaly_score)
                    patch_positions.append(position)
                    
                except Exception as e:
                    logger.warning(f"패치 처리 실패: {e}")
                    continue
            
            if patch_scores:
                resolution_scores[patch_size] = max(patch_scores)
                detailed_results[patch_size] = {
                    'scores': patch_scores,
                    'positions': patch_positions,
                    'max_score': max(patch_scores),
                    'avg_score': np.mean(patch_scores),
                    'patch_count': len(patch_scores)
                }
        
        return resolution_scores, detailed_results
    
    def compute_mahalanobis_score(self, features, patch_size):
        """Mahalanobis 거리 기반 이상점수 계산"""
        ref_data = self.reference_db.get(patch_size)
        if not ref_data:
            return 0.0
        
        mean_features = ref_data['mean_features']
        covariance_matrix = ref_data['covariance_matrix']
        
        # Mahalanobis 거리 계산
        diff = features - mean_features
        try:
            inv_cov = np.linalg.pinv(covariance_matrix)
            mahal_dist = np.sqrt(diff.T @ inv_cov @ diff)
            
            # 정규화 (0-1 범위)
            normalized_score = min(mahal_dist / 10.0, 1.0)
            
            return float(normalized_score)
        except:
            return 0.0
    
    def compute_final_score(self, resolution_scores):
        """가중치 기반 최종 이상점수 계산"""
        weighted_score = 0.0
        total_weight = 0.0
        
        for patch_size, weight in self.config.resolution_weights.items():
            if patch_size in resolution_scores:
                weighted_score += weight * resolution_scores[patch_size]
                total_weight += weight
        
        return weighted_score / total_weight if total_weight > 0 else 0.0
    
    def generate_visualization(self, image_array, detailed_results, final_score, result_id):
        """시각화 생성"""
        fig, axes = plt.subplots(2, 2, figsize=(15, 15))
        fig.suptitle(f'SwimSimCLR 멀티해상도 이상탐지 결과 (점수: {final_score:.3f})', 
                    fontsize=16, color='white')
        fig.patch.set_facecolor('black')
        
        # 원본 이미지
        axes[0, 0].imshow(image_array)
        axes[0, 0].set_title('원본 이미지', color='white')
        axes[0, 0].axis('off')
        
        # 각 해상도별 히트맵
        for idx, (patch_size, results) in enumerate(detailed_results.items()):
            if idx >= 3:
                break
            
            ax = axes.flatten()[idx + 1]
            
            # 히트맵 생성
            heatmap = np.zeros((1024, 1024))
            
            for score, (x, y) in zip(results['scores'], results['positions']):
                end_x = min(x + patch_size, 1024)
                end_y = min(y + patch_size, 1024)
                heatmap[y:end_y, x:end_x] = max(heatmap[y:end_y, x:end_x], score)
            
            # 오버레이
            ax.imshow(image_array)
            ax.imshow(heatmap, alpha=0.6, cmap='jet', vmin=0, vmax=1)
            ax.set_title(f'{patch_size}px (최대: {results["max_score"]:.3f})', color='white')
            ax.axis('off')
            
            # 최고 점수 패치 박스
            if results['scores']:
                max_idx = np.argmax(results['scores'])
                max_pos = results['positions'][max_idx]
                rect = patches.Rectangle(
                    max_pos, patch_size, patch_size,
                    linewidth=3, edgecolor='red', facecolor='none'
                )
                ax.add_patch(rect)
        
        # 저장
        result_path = os.path.join(self.results_dir, f"result_{result_id}.png")
        plt.savefig(result_path, dpi=150, bbox_inches='tight', 
                   facecolor='black', edgecolor='none')
        plt.close()
        
        return result_path
    
    def analyze_image(self, image_source, **metadata):
        """메인 분석 함수"""
        if not self.is_loaded:
            self.load_models()
        
        start_time = datetime.now()
        
        # 이미지 전처리
        image_array = self.preprocess_image(image_source)
        
        # 패치 추출
        patches_dict = self.extract_multi_resolution_patches(image_array)
        
        # 이상점수 계산
        resolution_scores, detailed_results = self.compute_anomaly_scores(patches_dict)
        
        # 최종 점수
        final_score = self.compute_final_score(resolution_scores)
        
        # 결과 ID 생성
        import uuid
        result_id = str(uuid.uuid4())
        
        # 시각화 생성
        visualization_path = self.generate_visualization(
            image_array, detailed_results, final_score, result_id
        )
        
        # 분석 시간 계산
        analysis_duration = (datetime.now() - start_time).total_seconds()
        
        # 이상 여부 판정
        is_abnormal = final_score > self.config.anomaly_threshold
        
        return {
            'result_id': result_id,
            'final_score': final_score,
            'is_abnormal': is_abnormal,
            'threshold': self.config.anomaly_threshold,
            'resolution_scores': {str(k): float(v) for k, v in resolution_scores.items()},
            'detailed_results': {
                str(k): {
                    'max_score': float(v['max_score']),
                    'avg_score': float(v['avg_score']),
                    'patch_count': v['patch_count']
                } for k, v in detailed_results.items()
            },
            'visualization_path': visualization_path,
            'analysis_duration': analysis_duration,
            **metadata
        }

# 전역 서비스 인스턴스
simclr_service = SimCLRInferenceService()
