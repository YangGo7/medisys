from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import CDSSResult
from .serializers import CDSSResultSerializer
from lis_cdss.inference.blood_inference import run_blood_model

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
    serializer = CDSSResultSerializer(data=request.data)
    if serializer.is_valid():
        instance = serializer.save()

        try:
            # 해당 샘플의 전체 결과 가져오기
            related = CDSSResult.objects.filter(
                sample=instance.sample,
                test_type=instance.test_type
            )
            values = {r.component_name: r.value for r in related}

            # 예측 실행
            prediction = run_blood_model(instance.test_type, values)
            instance.prediction = prediction
            instance.save()
        except Exception as e:
            print("예측 오류:", e)

        return Response(CDSSResultSerializer(instance).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)