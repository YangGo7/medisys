# views.py (CDSS 결과 및 시각화 관련 백엔드 전체 코드)

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import CDSSResult, LiverFunctionSample
from .serializers import CDSSResultSerializer
from lis_cdss.inference.manual_contributions import get_manual_contributions
from lis_cdss.inference.blood_inference import run_blood_model, MODELS
# from lis_cdss.inference.shap_lis import generate_shap_values  
from django.db.models import Avg, Count
from django.utils.timezone import localtime
from collections import defaultdict
import numpy as np
import pandas as pd
import shap
import requests
import joblib
from datetime import datetime

# ✅ 최근 결과 리스트 조회
@api_view(['GET'])
def get_cdss_results(request):
    results = CDSSResult.objects.all().order_by('-id')[:30]
    serializer = CDSSResultSerializer(results, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

# ✅ 단일 샘플 결과 + 예측 포함
@api_view(['GET'])
def get_cdss_result_by_sample(request, sample_id):
    try:
        results = CDSSResult.objects.filter(sample__id=sample_id)
        if not results.exists():
            return Response({'error': '샘플 결과 없음'}, status=404)

        serializer = CDSSResultSerializer(results, many=True)
        first = results.first()

        return Response({
            "sample": sample_id,
            "test_type": getattr(first, 'test_type', 'UNKNOWN'),
            "prediction": getattr(first, 'prediction', None),
            "prediction_prob": getattr(first, 'prediction_prob', None),
            "results": serializer.data,
            "shap_data": getattr(first, 'shap_data', None),
        })

    except Exception as e:
        print("❌ get_cdss_result_by_sample 에러:", e)
        return Response({'error': str(e)}, status=500)

    except Exception as e:
        print("❌ CDSS 분석 오류:", str(e))
        return Response({'error': str(e)}, status=500)
    
# ✅ 단일 결과 수신
@api_view(['POST'])
def receive_test_result(request):
    serializer = CDSSResultSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ✅ 전체 삭제
@api_view(['DELETE'])
def delete_cdss_result(request, sample_id):
    try:
        results = CDSSResult.objects.filter(sample__id=sample_id)
        if results.exists():
            results.delete()
            return Response({'message': 'CDSS 결과 삭제 완료'}, status=status.HTTP_204_NO_CONTENT)
        else:
            return Response({'error': '해당 샘플의 결과가 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ✅ 검사 항목별 개별 등록 → 전체 결과 갱신 및 SHAP 생성 포함

def normalize_component_name(raw_name):
    """
    예: 'Sample 3 - 혈액 - LFT - ALP' → 'ALP'
    """
    if not raw_name:
        return None
    parts = raw_name.strip().split(" - ")
    # 마지막 항목을 반환 (대부분 검사 항목이 마지막)
    return parts[-1].strip()

def send_result_to_emr(patient_id, sample_id, test_type, prediction, result_dict, created_at):
    emr_url = "http://<EMR_API_HOST>/api/emr/receive_cdss_result/"  # ⬅️ 실제 URL로 변경
    payload = {
        "patient_id": patient_id,
        "sample_id": sample_id,
        "panel": test_type,
        "prediction": "abnormal" if prediction == 1 else "normal",
        "results": result_dict,
        "created_at": created_at.isoformat() if isinstance(created_at, datetime) else str(created_at)
    }

    print("📤 EMR 전송 payload:", payload)  # 디버깅 로그

    try:
        response = requests.post(emr_url, json=payload, timeout=5)
        response.raise_for_status()
        print(f"✅ EMR 전송 성공: {response.status_code}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"❌ EMR 전송 실패: {e}")
        return False
    
@api_view(['POST'])
def receive_model_result(request):
    data = request.data
    sample = data.get("sample")
    test_type = data.get("test_type")
    component_name = normalize_component_name(data.get("component_name"))

    print("📥 [CDSS 수신] sample:", sample, "| test_type:", test_type, "| component:", component_name)

    existing = CDSSResult.objects.filter(
        sample=sample,
        test_type=test_type,
        component_name=component_name
    ).first()

    request_data = request.data.copy()
    request_data["component_name"] = component_name

    if existing:
        serializer = CDSSResultSerializer(existing, data=request_data)
    else:
        serializer = CDSSResultSerializer(data=request_data)
        
    prediction = None

    if serializer.is_valid():
        instance = serializer.save()
        
        print("✅ 응답에 포함될 prediction:", prediction)
        print("✅ 저장된 instance.prediction:", instance.prediction)

        try:
            related = CDSSResult.objects.filter(
                sample=sample,
                test_type=test_type
            ).order_by('component_name')

            values = {
                normalize_component_name(r.component_name): r.value
                for r in related
            }

            model = MODELS.get(test_type.upper())
            prediction = run_blood_model(test_type, values) if model else None
            related.update(prediction=prediction)
            
            print(f"📌 계산된 prediction: {prediction}")
            
            instance.prediction = prediction
            instance.save()
        

            # ✅ LFT 저장
            if test_type.strip().lower() == "lft":
                lft_components = {
                    "ALT": None, "AST": None, "ALP": None,
                    "Albumin": None, "Total Bilirubin": None, "Direct Bilirubin": None
                }

                for comp in related:
                    cname = normalize_component_name(comp.component_name)
                    if cname in lft_components:
                        lft_components[cname] = comp.value

                if all(v is not None for v in lft_components.values()):
                    LiverFunctionSample.objects.filter(
                        sample_id=sample, prediction=prediction
                    ).delete()

                    LiverFunctionSample.objects.create(
                        sample_id=sample,
                        ALT=lft_components["ALT"],
                        AST=lft_components["AST"],
                        ALP=lft_components["ALP"],
                        Albumin=lft_components["Albumin"],
                        Total_Bilirubin=lft_components["Total Bilirubin"],
                        Direct_Bilirubin=lft_components["Direct Bilirubin"],
                        prediction=prediction,
                        probability=instance.prediction_prob
                    )

            # ✅ EMR 전송 시도
            try:
                sample_obj = instance.sample
                patient_id = getattr(sample_obj, 'patient_id', None)
                created_at = getattr(sample_obj, 'created_at', datetime.now())

                send_result_to_emr(
                    patient_id=patient_id,
                    sample_id=sample,
                    test_type=test_type,
                    prediction=prediction,
                    result_dict=values,
                    created_at=created_at
                )
            except Exception as e:
                print(f"❌ EMR 전송 오류: {e}")

            # ✅ 기여도 계산 대체 방식
            background_df = pd.read_csv("lis_cdss/inference/lft_background.csv")
            contribution_result = get_manual_contributions(model, values, background_df)
            
            response_data = CDSSResultSerializer(instance).data
            response_data['shap_data'] = contribution_result  # ← SHAP 대체
            response_data['prediction'] = prediction
            response_data['lfs_saved'] = True

            return Response(response_data, status=201)

        except Exception as e:
            print("❌ 예측/저장 중 오류:", e)
            return Response({'error': str(e)}, status=500)

    print("❌ CDSSResult 저장 실패:", serializer.errors)
    return Response(serializer.errors, status=400)

# ✅ 슬라이더 기반 전체 시뮬레이션 입력 처리 (시각화용)
@api_view(['POST'])
def receive_full_sample(request):
    try:
        sample_id = request.data.get("sample")
        test_type = request.data.get("test_type")
        components = request.data.get("components", [])

        # 입력값 구성
        input_dict = {
            comp["component_name"]: float(comp["value"])
            for comp in components
            if comp["value"] not in [None, "", "NaN"]
        }

        feature_names = joblib.load("lis_cdss/inference/lft_feature_names.joblib")
        model = joblib.load("lis_cdss/inference/lft_logistic_model.pkl")
        background_df = pd.read_csv("lis_cdss/inference/lft_background.csv")

        # 예측
        df = pd.DataFrame([input_dict], columns=feature_names)
        prob = model.predict_proba(df)[0][1]
        pred = int(prob >= 0.5)

        # 기여도 계산
        contrib_result = get_manual_contributions(model, input_dict, background_df)
        if not contrib_result:
            contrib_result = {
                "features": feature_names,
                "contributions": [0.0] * len(feature_names)
            }

        return Response({
            "sample": sample_id,
            "test_type": test_type,
            "prediction": pred,
            "prediction_prob": prob,
            "shap_data": contrib_result
        }, status=200)

    except Exception as e:
        print("❌ 시뮬레이션 오류:", e)
        return Response({"error": str(e)}, status=500)
    
        # try:
        #     explainer = shap.Explainer(model.predict_proba, df)
        #     shap_values = explainer(df)
        #     shap_output = shap_values.values[0][1].tolist()
        # except Exception as e:
        #     print(f"⚠️ SHAP 계산 실패: {e}")
        #     shap_output = [0.0] * len(features)  # 또는 None
        
        


@api_view(['GET'])
def lft_statistics_summary(request):
    samples = LiverFunctionSample.objects.all()
    total = samples.count()
    abnormal = samples.filter(prediction=1).count()
    normal = total - abnormal

    # 평균값 계산
    fields = ['ALT', 'AST', 'ALP', 'Albumin', 'Total_Bilirubin', 'Direct_Bilirubin']
    mean_values = {}

    for field in fields:
        mean_values[field] = {
            'normal': round(samples.filter(prediction=0).aggregate(avg=Avg(field))['avg'] or 0, 2),
            'abnormal': round(samples.filter(prediction=1).aggregate(avg=Avg(field))['avg'] or 0, 2)
        }

    # 확률 히스토그램 (10개 구간)
    probs = list(samples.exclude(probability__isnull=True).values_list('probability', flat=True))
    hist, _ = np.histogram(probs, bins=10, range=(0, 1))
    probability_histogram = hist.tolist()

    # 주간 이상 발생 추이
    trend = defaultdict(int)
    for s in samples.filter(prediction=1):
        week = localtime(s.created_at).strftime("%Y-W%U")
        trend[week] += 1
    weekly_abnormal_trend = [{'week': k, 'abnormal_count': v} for k, v in sorted(trend.items())]

    return Response({
        'total': total,
        'normal': normal,
        'abnormal': abnormal,
        'mean_values': mean_values,
        'probability_histogram': probability_histogram,
        'weekly_abnormal_trend': weekly_abnormal_trend
    })