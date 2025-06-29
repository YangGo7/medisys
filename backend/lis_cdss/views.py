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

def generate_explanation(results: dict, panel: str) -> str:
    """
    검사 결과 dict와 패널명을 받아 rule 기반 explanation 생성
    """
    panel = panel.upper()

    if panel == 'PNEUMONIA':
        crp = results.get('CRP')
        if crp is not None and crp > 5.0:
            return f"CRP 수치({crp})가 5.0을 초과하여 폐렴 가능성이 있습니다."

    elif panel == 'CHF':
        bnp = results.get('NT-proBNP')
        if bnp is not None and bnp > 125:
            return f"NT-proBNP 수치({bnp})가 125를 초과하여 심부전 가능성이 있습니다."

    elif panel == 'PE':
        d_dimer = results.get('D-dimer')
        if d_dimer is not None and d_dimer > 0.5:
            return f"D-dimer 수치({d_dimer})가 0.5를 초과하여 폐색전증 가능성이 있습니다."

    elif panel == 'COPD':
        pco2 = results.get('pCO2')
        if pco2 is not None and pco2 > 45:
            return f"pCO₂ 수치({pco2})가 45를 초과하여 COPD 가능성이 있습니다."

    elif panel == 'ASTHMA':
        eos = results.get('Eosinophils')
        if eos is not None and eos > 300:
            return f"Eosinophil 수치({eos})가 300을 초과하여 천식 가능성이 있습니다."

    return "검사 수치에 기반한 이상 소견이 탐지되었습니다."


@api_view(['POST'])
def send_cdss_result_to_emr(request):
    try:
        # CDSS 내부에서 예측 결과 확보
        patient_id = request.data.get('patient_id')
        prediction = request.data.get('prediction')  # 'normal' or 'abnormal'
        panel = request.data.get('panel')            # 예: 'LFT'
        results = request.data.get('results')        # Dict of lab values
        
        explanation = generate_explanation(results, panel)
        
        payload = {
            "patient_id": patient_id,
            "prediction": prediction,
            "panel": panel,
            "results": results,
            "explanation": "Eosinophil 수치가 비정상적으로 높습니다"
        }

        # 🔗 EMR API URL 설정
        EMR_URL = "http://<EMR_SERVER>:8000/api/emr/receive_cdss_result/"  # 실제 주소로 변경

        response = requests.post(EMR_URL, json=payload)
        response.raise_for_status()

        return Response({'message': 'EMR 전송 성공', 'response': response.json()}, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
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
            prediction, probability = run_blood_model(test_type, values) if model else (None, None)
            related.update(prediction=prediction)
            
            print(f"📌 계산된 prediction: {prediction}")
            
            instance.prediction = prediction
            instance.prediction_prob = probability
            instance.save()

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
            response_data['results'] = [
                {"component_name": r.component_name, "value": r.value, "unit": r.unit}
                for r in related
            ]  # ← 프론트에서 data.results로 사용할 수 있게 추가
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