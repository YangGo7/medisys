from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import CDSSRecord
from .serializers import CDSSRecordSerializer

@api_view(['GET'])
def get_cdss_results(request):
    results = CDSSRecord.objects.all().order_by('-id')[:30]  # 최근 30건
    serializer = CDSSRecordSerializer(results, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['POST'])
def receive_test_result(request):
    print("✅ CDSS 요청 수신 데이터:", request.data)  # 이 줄 로그 찍히는지 확인!
    serializer = CDSSRecordSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({"message": "저장 완료"}, status=201)
    return Response(serializer.errors, status=400)
    