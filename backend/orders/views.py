from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import TestOrder
from .serializers import TestOrderSerializer
from django.shortcuts import get_object_or_404
import logging

logger = logging.getLogger('medical_integration')

@api_view(['GET'])
def list_orders(request):
    orders = TestOrder.objects.all()
    serializer = TestOrderSerializer(orders, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['POST']) # 요청 받아오기 
def create_order(request):
    logger.debug("✅ POST 요청 도착")
    logger.debug(f"받은 데이터: {request.data}")
    
    print("POST된 데이터:", request.data)
    serializer = TestOrderSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    print(serializer.errors)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET']) # 요청 확인하기 
def get_order(request, order_id):
    order = get_object_or_404(TestOrder, id=order_id)
    serializer = TestOrderSerializer(order)
    return Response(serializer.data, status=status.HTTP_200_OK)