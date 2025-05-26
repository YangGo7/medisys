from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import TestResult
from .serializers import TestResultSerializer

@api_view(['POST']) # 결과 생성하기 
def create_test_result(request):
    serializer = TestResultSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(result_status="recorded")
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)