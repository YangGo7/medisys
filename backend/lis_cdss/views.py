from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import CDSSResult
from .serializers import CDSSResultSerializer
from lis_cdss.inference.blood_inference import run_blood_model, MODELS
from lis_cdss.inference.shap_lis import generate_shap_values  

@api_view(['GET'])
def get_cdss_results(request):
    results = CDSSResult.objects.all().order_by('-id')[:30]  # 최근 30건
    serializer = CDSSResultSerializer(results, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

# 샘플 결과 단일 조회 + 예측 포함
@api_view(['GET'])
def get_cdss_result_by_sample(request, sample_id):
    results = CDSSResult.objects.filter(sample__id=sample_id)
    if not results.exists():
        return Response({'error': '샘플 결과 없음'}, status=status.HTTP_404_NOT_FOUND)

    serializer = CDSSResultSerializer(results, many=True)
    return Response({
        "sample": sample_id,
        "test_type": results.first().test_type,
        "prediction": results.first().prediction,
        "results": serializer.data
    })

@api_view(['POST'])
def receive_test_result(request):
    print("DEBUG: request.data =", request.data)  # ✅ 확인용 로그
    serializer = CDSSResultSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    else:
        print("ERROR: serializer.errors =", serializer.errors)  # ✅ 오류 로그
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    
@api_view(['DELETE'])
def delete_cdss_result(request, sample_id):
    try:
        print(f"🔍 삭제 요청 sample_id: {sample_id}")
        results = CDSSResult.objects.filter(sample__id=sample_id)
        print(f"🔍 찾은 개수: {results.count()}")
        if results.exists():
            results.delete()
            return Response({'message': 'CDSS 결과 삭제 완료'}, status=status.HTTP_204_NO_CONTENT)
        else:
            return Response({'error': '해당 샘플의 결과가 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print("❌ CDSS 삭제 오류:", str(e))
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    
@api_view(['POST'])
def receive_model_result(request):
    data = request.data
    sample = data.get("sample")
    test_type = data.get("test_type")
    component_name = data.get("component_name")

    # 기존 레코드 삭제 또는 갱신
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
            # 반드시 최신 상태로 DB에서 다시 조회
            related = CDSSResult.objects.filter(
                sample=sample,
                test_type=test_type
            ).order_by('component_name')
            values = {r.component_name: r.value for r in related}
            print("🧪 모델 입력값:", values)
            print("🧮 feature 수:", len(values))

            # SHAP 이미지 생성
            model = MODELS.get(test_type)
            prediction = run_blood_model(test_type, values) if model else None
            
            related.update(prediction=prediction)
            shap_data = generate_shap_values(model, values) if model else None
                
            # 응답 구성
            response_data = CDSSResultSerializer(instance).data
            response_data['shap_data'] = shap_data
            response_data['prediction'] = prediction

            return Response(response_data, status=201)
            
        except Exception as e:
            print("예측 오류:", e)

        return Response(CDSSResultSerializer(instance).data, status=201)

    return Response(serializer.errors, status=400)

@api_view(['POST'])
def receive_full_sample(request):
    data = request.data
    sample_id = data.get("sample")
    test_type = data.get("test_type")
    components = data.get("components", [])

    if not sample_id or not test_type or not components:
        return Response({"error": "샘플 ID, 검사 종류, 항목 정보가 모두 필요합니다."},
                        status=status.HTTP_400_BAD_REQUEST)

    values = {}

    # 항목별 저장
    for c in components:
        CDSSResult.objects.update_or_create(
            sample=sample_id,
            test_type=test_type,
            component_name=c["component_name"],
            defaults={
                "value": c["value"],
                "unit": c["unit"]
            }
        )
        values[c["component_name"]] = c["value"]

    # 예측 및 SHAP
    model = MODELS.get(test_type)
    prediction = run_blood_model(test_type, values) if model else None
    shap_data = generate_shap_values(model, values) if model else None

    # 예측값 저장
    CDSSResult.objects.filter(sample=sample_id, test_type=test_type).update(prediction=prediction)

    return Response({
        "sample": sample_id,
        "test_type": test_type,
        "prediction": prediction,
        "shap_data": shap_data,
        "message": f"{len(components)}개 항목 저장 완료"
    }, status=201)