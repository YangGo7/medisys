# views.py (CDSS 결과 및 시각화 관련 백엔드 전체 코드)

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import CDSSResult, LiverFunctionSample
from .serializers import CDSSResultSerializer
from lis_cdss.inference.blood_inference import run_blood_model, MODELS
from lis_cdss.inference.shap_lis import generate_shap_values  
from django.db.models import Avg, Count
from django.utils.timezone import localtime
from collections import defaultdict
import numpy as np
import pandas as pd
import shap

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
@api_view(['POST'])
def receive_model_result(request):
    data = request.data
    sample = data.get("sample")
    test_type = data.get("test_type")
    component_name = data.get("component_name")

    existing = CDSSResult.objects.filter(
        sample=sample,
        test_type=test_type,
        component_name=component_name
    ).first()

    if existing:
        serializer = CDSSResultSerializer(existing, data=request.data)
    else:
        serializer = CDSSResultSerializer(data=request.data)

    if serializer.is_valid():
        instance = serializer.save()

        try:
            related = CDSSResult.objects.filter(
                sample=sample,
                test_type=test_type
            ).order_by('component_name')
            values = {r.component_name: r.value for r in related}

            model = MODELS.get(test_type)
            prediction = run_blood_model(test_type, values) if model else None
            shap_data = generate_shap_values(model, values) if model else None
            related.update(prediction=prediction)
            
            # ✅ LFT일 경우 LiverFunctionSample에도 저장
            if test_type == "LFT":
                lft_components = {
                    "ALT": None,
                    "AST": None,
                    "ALP": None,
                    "Albumin": None,
                    "Total Bilirubin": None,
                    "Direct Bilirubin": None
                }

                for comp in related:
                    if comp.component_name in lft_components:
                        lft_components[comp.component_name] = comp.value

                if all(v is not None for v in lft_components.values()):
                    LiverFunctionSample.objects.create(
                        ALT=lft_components["ALT"],
                        AST=lft_components["AST"],
                        ALP=lft_components["ALP"],
                        Albumin=lft_components["Albumin"],
                       Total_Bilirubin=lft_components["Total Bilirubin"],
                        Direct_Bilirubin=lft_components["Direct Bilirubin"],
                        prediction=prediction,
                        probability=instance.prediction_prob  # prob 저장 필요 시
                    )

            response_data = CDSSResultSerializer(instance).data
            response_data['shap_data'] = shap_data
            response_data['prediction'] = prediction

            return Response(response_data, status=201)

        except Exception as e:
            print("예측 오류:", e)

        return Response(CDSSResultSerializer(instance).data, status=201)

    return Response(serializer.errors, status=400)

# ✅ 슬라이더 기반 전체 시뮬레이션 입력 처리 (시각화용)
@api_view(['POST'])
def receive_full_sample(request):
    try:
        sample_id = request.data.get('sample')
        test_type = request.data.get('test_type')
        components = request.data.get('components', [])

        input_dict = {comp['component_name']: float(comp['value']) for comp in components}
        features = ['ALT', 'AST', 'ALP', 'Total Bilirubin', 'Direct Bilirubin', 'Albumin']
        df = pd.DataFrame([[input_dict.get(f, 0.0) for f in features]], columns=features)

        model = MODELS.get(test_type)
        if not model:
            return Response({'error': '해당 test_type 모델이 없습니다.'}, status=400)

        prob = model.predict_proba(df)[0][1]
        pred = int(prob >= 0.5)

        explainer = shap.Explainer(model.predict_proba, df)
        shap_values = explainer(df)

        response = {
            'sample': sample_id,
            'test_type': test_type,
            'prediction': pred,
            'prediction_prob': prob,
            'shap_data': {
                'features': features,
                'shap_values': shap_values.values[0][1].tolist()
            }
        }
        return Response(response, status=200)

    except Exception as e:
        print("❌ CDSS 시뮬레이션 에러:", e)
        return Response({'error': str(e)}, status=500)

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