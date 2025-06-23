# views.py (CDSS 결과 및 시각화 관련 백엔드 전체 코드)

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import CDSSResult
from .serializers import CDSSResultSerializer
from lis_cdss.inference.blood_inference import run_blood_model, MODELS
from lis_cdss.inference.shap_lis import generate_shap_values  
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
    results = CDSSResult.objects.filter(sample__id=sample_id)
    if not results.exists():
        return Response({'error': '샘플 결과 없음'}, status=404)

    test_type = results.first().test_type
    model = MODELS.get(test_type)

    if not model:
        return Response({'error': '모델 없음'}, status=500)

    try:
        input_dict = {r.component_name: float(r.value) for r in results}
        df = pd.DataFrame([[input_dict.get(f, 0.0) for f in PANEL_ORDER[test_type]]], columns=PANEL_ORDER[test_type])

        # 예측
        prediction_prob = model.predict_proba(df)[0][1]
        prediction = int(prediction_prob >= 0.5)

        # SHAP
        shap_data = generate_shap_values(model, input_dict)

        # 결과 직렬화
        serializer = CDSSResultSerializer(results, many=True)

        return Response({
            "sample": sample_id,
            "test_type": test_type,
            "prediction": prediction,
            "prediction_prob": prediction_prob,
            "shap_data": shap_data,
            "results": serializer.data
        })

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
