# airesults/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import JsonResponse, HttpResponse
from django.conf import settings
from django.core.files.storage import default_storage
import requests
import json
import logging
from typing import Dict, List
import os
import sys

# YOLO 서비스 import
sys.path.append(os.path.join(settings.BASE_DIR, 'models'))
from models.yolo_inference import get_yolo_service

from .models import AIResult, AIAnalysisSummary
from .serializers import AIResultSerializer

logger = logging.getLogger(__name__)

class AIResultViewSet(viewsets.ModelViewSet):
    """AI 분석 결과 API"""
    queryset = AIResult.objects.all()
    serializer_class = AIResultSerializer
    
    @action(detail=False, methods=['post'])
    def analyze_study(self, request):
        """Study UID로 전체 분석 실행"""
        try:
            study_uid = request.data.get('study_uid')
            if not study_uid:
                return Response({'error': 'study_uid가 필요합니다'}, status=400)
            
            # Orthanc에서 Study 정보 조회
            orthanc_url = getattr(settings, 'ORTHANC_SERVER_URL', 'http://localhost:8042')
            
            # Study의 모든 인스턴스 조회
            instances_url = f"{orthanc_url}/studies/{study_uid}/instances"
            response = requests.get(instances_url)
            
            if response.status_code != 200:
                return Response({'error': 'Orthanc에서 Study를 찾을 수 없습니다'}, status=404)
            
            instances = response.json()
            results = []
            
            # YOLO 서비스 가져오기
            yolo_service = get_yolo_service()
            
            for instance in instances:
                instance_id = instance['ID']
                try:
                    # YOLO 분석 실행
                    analysis_result = yolo_service.analyze_dicom_instance(instance_id)
                    
                    # 각 detection을 DB에 저장
                    for detection in analysis_result['detections']:
                        ai_result = AIResult.objects.create(
                            patient_id=analysis_result['metadata']['patient_id'],
                            study_uid=analysis_result['metadata']['study_uid'],
                            series_uid=analysis_result['metadata']['series_uid'],
                            instance_uid=analysis_result['metadata']['instance_uid'],
                            accession_number=analysis_result['metadata']['accession_number'],
                            label=detection['class_name'],
                            bbox=detection['bbox'],
                            confidence_score=detection['confidence'],
                            ai_text=f"Area: {detection['bbox_area']:.1f}px²",
                            model_version="yolov8",
                            processing_time=analysis_result['processing_time'],
                            image_width=analysis_result['metadata']['image_width'],
                            image_height=analysis_result['metadata']['image_height']
                        )
                        results.append({
                            'ai_result_id': ai_result.ai_result_id,
                            'instance_id': instance_id,
                            'detection': detection
                        })
                
                except Exception as e:
                    logger.error(f"Failed to analyze instance {instance_id}: {e}")
                    results.append({
                        'instance_id': instance_id,
                        'error': str(e)
                    })
            
            return Response({
                'study_uid': study_uid,
                'total_instances': len(instances),
                'results': results,
                'message': f'{len(results)}개 인스턴스 분석 완료'
            })
            
        except Exception as e:
            logger.error(f"Study analysis failed: {e}")
            return Response({'error': str(e)}, status=500)
    
    @action(detail=False, methods=['post'])
    def analyze_instance(self, request):
        """단일 인스턴스 분석"""
        try:
            orthanc_instance_id = request.data.get('orthanc_instance_id')
            if not orthanc_instance_id:
                return Response({'error': 'orthanc_instance_id가 필요합니다'}, status=400)
            
            # YOLO 분석 실행
            yolo_service = get_yolo_service()
            analysis_result = yolo_service.analyze_dicom_instance(orthanc_instance_id)
            
            # DB에 결과 저장
            saved_results = []
            for detection in analysis_result['detections']:
                ai_result = AIResult.objects.create(
                    patient_id=analysis_result['metadata']['patient_id'],
                    study_uid=analysis_result['metadata']['study_uid'],
                    series_uid=analysis_result['metadata']['series_uid'],
                    instance_uid=analysis_result['metadata']['instance_uid'],
                    accession_number=analysis_result['metadata']['accession_number'],
                    label=detection['class_name'],
                    bbox=detection['bbox'],
                    confidence_score=detection['confidence'],
                    ai_text=f"Area: {detection['bbox_area']:.1f}px², Confidence: {detection['confidence']:.3f}",
                    model_version="yolov8",
                    processing_time=analysis_result['processing_time'],
                    image_width=analysis_result['metadata']['image_width'],
                    image_height=analysis_result['metadata']['image_height']
                )
                saved_results.append(ai_result)
            
            return Response({
                'orthanc_instance_id': orthanc_instance_id,
                'analysis_result': analysis_result,
                'saved_results': AIResultSerializer(saved_results, many=True).data,
                'message': f'{len(saved_results)}개 detection 저장 완료'
            })
            
        except Exception as e:
            logger.error(f"Instance analysis failed: {e}")
            return Response({'error': str(e)}, status=500)
    
    @action(detail=False, methods=['get'])
    def get_study_results(self, request):
        """Study UID로 분석 결과 조회"""
        study_uid = request.query_params.get('study_uid')
        if not study_uid:
            return Response({'error': 'study_uid 파라미터가 필요합니다'}, status=400)
        
        results = AIResult.objects.filter(study_uid=study_uid).order_by('-confidence_score')
        serializer = AIResultSerializer(results, many=True)
        
        # 통계 정보 계산
        total_detections = results.count()
        if total_detections > 0:
            max_confidence = max([r.confidence_score for r in results])
            labels = list(set([r.label for r in results]))
            abnormal_count = results.filter(confidence_score__gte=0.7).count()
        else:
            max_confidence = 0
            labels = []
            abnormal_count = 0
        
        return Response({
            'study_uid': study_uid,
            'results': serializer.data,
            'statistics': {
                'total_detections': total_detections,
                'max_confidence': max_confidence,
                'detected_labels': labels,
                'high_confidence_count': abnormal_count
            }
        })


class OrthancAPIView(APIView):
    """Orthanc 연동 API"""
    
    def get_orthanc_url(self):
        return getattr(settings, 'ORTHANC_SERVER_URL', 'http://localhost:8042')
    
    def get(self, request, endpoint):
        """Orthanc REST API 프록시"""
        try:
            orthanc_url = f"{self.get_orthanc_url()}/{endpoint}"
            response = requests.get(orthanc_url)
            
            if response.status_code == 200:
                return JsonResponse(response.json(), safe=False)
            else:
                return JsonResponse({'error': 'Orthanc 요청 실패'}, status=response.status_code)
                
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)


class DicomImageAPIView(APIView):
    """DICOM 이미지 API"""
    
    def get_orthanc_url(self):
        return getattr(settings, 'ORTHANC_SERVER_URL', 'http://localhost:8042')
    
    def get(self, request, instance_id):
        """Orthanc에서 DICOM 이미지를 PNG로 변환해서 반환"""
        try:
            image_type = request.query_params.get('type', 'preview')  # preview, original, annotated
            
            if image_type == 'annotated':
                # AI 분석 결과 이미지 반환
                return self.get_annotated_image(instance_id)
            else:
                # Orthanc에서 원본 이미지 반환
                return self.get_original_image(instance_id)
                
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    def get_original_image(self, instance_id):
        """Orthanc에서 원본 이미지 가져오기"""
        try:
            orthanc_url = self.get_orthanc_url()
            
            # Orthanc에서 PNG 이미지 요청
            image_url = f"{orthanc_url}/instances/{instance_id}/preview"
            response = requests.get(image_url)
            
            if response.status_code == 200:
                return HttpResponse(response.content, content_type='image/png')
            else:
                return JsonResponse({'error': 'DICOM 이미지를 찾을 수 없습니다'}, status=404)
                
        except Exception as e:
            logger.error(f"Failed to get original image: {e}")
            return JsonResponse({'error': str(e)}, status=500)
    
    def get_annotated_image(self, instance_id):
        """AI 분석 결과 이미지 반환"""
        try:
            # DB에서 해당 인스턴스의 분석 결과 조회
            ai_results = AIResult.objects.filter(instance_uid__icontains=instance_id)
            
            if not ai_results.exists():
                return JsonResponse({'error': '분석 결과가 없습니다'}, status=404)
            
            # 가장 최근 분석 결과의 어노테이션 이미지 경로 찾기
            # 실제로는 파일 경로를 DB에 저장해야 함 (추후 구현)
            
            # 임시로 원본 이미지 반환
            return self.get_original_image(instance_id)
            
        except Exception as e:
            logger.error(f"Failed to get annotated image: {e}")
            return JsonResponse({'error': str(e)}, status=500)


class YOLOModelAPIView(APIView):
    """YOLO 모델 관리 API"""
    
    def get(self, request):
        """현재 로드된 모델 정보 반환"""
        try:
            yolo_service = get_yolo_service()
            
            model_info = {
                'model_loaded': yolo_service.model is not None,
                'model_path': yolo_service.model_path,
                'device': yolo_service.device,
                'confidence_threshold': yolo_service.confidence_threshold
            }
            
            if yolo_service.model:
                model_info['class_names'] = yolo_service.model.names
                model_info['num_classes'] = len(yolo_service.model.names)
            
            return JsonResponse(model_info)
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    def post(self, request):
        """모델 재로드 또는 설정 변경"""
        try:
            confidence_threshold = request.data.get('confidence_threshold')
            
            if confidence_threshold:
                yolo_service = get_yolo_service()
                yolo_service.confidence_threshold = float(confidence_threshold)
                
                return JsonResponse({
                    'message': '신뢰도 임계값이 변경되었습니다',
                    'confidence_threshold': yolo_service.confidence_threshold
                })
            
            return JsonResponse({'error': '변경할 설정이 없습니다'}, status=400)
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
        
        
        
# OpenMRS 설정 및 UUID
OPENMRS_API_BASE = "http://localhost:8082/openmrs/ws/rest/v1"
OPENMRS_AUTH = ("admin", "Admin123")

TEMP_UUID = "5088AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
SPO2_UUID = "5092AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
PULSE_UUID = "5087AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
SYSTOLIC_UUID = "5085AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
DIASTOLIC_UUID = "5086AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
RESP_UUID = "5242AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"  # 추가됨

# 환자 바이탈 알림 함수
def vital_alert(request):
    patient_uuid = request.GET.get("patient")
    if not patient_uuid:
        return JsonResponse({"error": "Missing patient UUID"}, status=400)

    obs_url = f"{OPENMRS_API_BASE}/obs?patient={patient_uuid}&v=full"
    headers = {"Accept": "application/json"}

    try:
        response = requests.get(obs_url, auth=OPENMRS_AUTH, headers=headers)
        data = response.json()
        results = data.get("results", [])

        def get_latest_value(uuid):
            filtered = [obs for obs in results if obs.get("concept", {}).get("uuid") == uuid]
            sorted_obs = sorted(filtered, key=lambda x: x.get("obsDatetime", ""), reverse=True)
            return sorted_obs[0].get("value") if sorted_obs else None

        temp = get_latest_value(TEMP_UUID)
        spo2 = get_latest_value(SPO2_UUID)
        pulse = get_latest_value(PULSE_UUID)
        sys = get_latest_value(SYSTOLIC_UUID)
        dia = get_latest_value(DIASTOLIC_UUID)
        resp = get_latest_value(RESP_UUID)

        bp = None
        if sys is not None and dia is not None:
            try:
                bp = f"{int(dia)}/{int(sys)}"
            except:
                bp = None

        return JsonResponse({
            "temp_alert": temp is not None and temp >= 38.0,
            "temp": temp,
            "spo2_alert": spo2 is not None and spo2 <= 90,
            "spo2": spo2,
            "pulse_alert": pulse is not None and pulse >= 100,
            "pulse": pulse,
            "bp_alert": sys is not None and dia is not None and (int(sys) >= 140 or int(dia) >= 90),
            "bp": bp,
            "resp_alert": resp is not None and resp >= 25,
            "resp": resp
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
