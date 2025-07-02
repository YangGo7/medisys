# backend/medical_integration/simclr_views.py

import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from ai_analysis.simclr_inference_service import simclr_inference_service
from .dicom_utils import get_dicom_image_from_orthanc

logger = logging.getLogger('medical_integration')

@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def simclr_patch_analysis(request):
    """SimCLR 패치 기반 이상탐지 분석"""
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response
    
    try:
        data = json.loads(request.body)
        study_uid = data.get('studyUID')
        series_uid = data.get('seriesUID', '')
        instance_uid = data.get('instanceUID', '')
        
        if not study_uid:
            return JsonResponse({
                'status': 'error',
                'message': 'studyUID가 필요합니다.'
            }, status=400)
        
        logger.info(f"🧠 SimCLR 분석 시작: {study_uid}")
        
        # DICOM 이미지 가져오기
        dicom_image = get_dicom_image_from_orthanc(
            study_uid=study_uid,
            series_uid=series_uid,
            instance_uid=instance_uid
        )
        
        if dicom_image is None:
            return JsonResponse({
                'status': 'error',
                'message': 'DICOM 이미지를 가져올 수 없습니다.'
            }, status=404)
        
        # SimCLR 분석 수행
        analysis_result = simclr_inference_service.analyze_dicom_image(
            image_array=dicom_image,
            study_uid=study_uid
        )
        
        response = JsonResponse(analysis_result)
        response['Access-Control-Allow-Origin'] = '*'
        
        if analysis_result['status'] == 'success':
            logger.info(f"✅ SimCLR 분석 완료: {analysis_result['results']['overall_anomaly_score']:.3f}")
        
        return response
        
    except Exception as e:
        logger.error(f"❌ SimCLR 분석 오류: {str(e)}")
        return JsonResponse({
            'status': 'error',
            'message': f'분석 중 오류: {str(e)}'
        }, status=500)

@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def simclr_model_status(request):
    """SimCLR 모델 상태 확인"""
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        return response
    
    try:
        model_status = simclr_inference_service.get_model_status()
        
        response_data = {
            'status': 'loaded' if model_status['loaded'] else 'not_loaded',
            'model_available': model_status['loaded'],
            'model_type': 'SimCLR EfficientNet-B2',
            'device': model_status.get('device', 'unknown')
        }
        
        response = JsonResponse(response_data)
        response['Access-Control-Allow-Origin'] = '*'
        return response
        
    except Exception as e:
        logger.error(f"❌ 모델 상태 확인 오류: {str(e)}")
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)

@csrf_exempt 
@require_http_methods(["POST", "OPTIONS"])
def reload_simclr_model(request):
    """SimCLR 모델 재로드"""
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        response['Access-Control-Allow-Origin'] = '*'
        return response
    
    try:
        logger.info("🔄 SimCLR 모델 재로드...")
        simclr_inference_service._initialize()
        
        model_status = simclr_inference_service.get_model_status()
        message = "모델 재로드 성공" if model_status['loaded'] else "모델 재로드 실패"
        
        response_data = {
            'status': 'success' if model_status['loaded'] else 'error',
            'message': message,
            'model_available': model_status['loaded']
        }
        
        response = JsonResponse(response_data)
        response['Access-Control-Allow-Origin'] = '*'
        return response
        
    except Exception as e:
        logger.error(f"❌ 모델 재로드 오류: {str(e)}")
        return JsonResponse({
            'status': 'error',
            'message': f'재로드 실패: {str(e)}'
        }, status=500)