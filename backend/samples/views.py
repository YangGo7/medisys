from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Sample, LOINCCode, AliasMapping
from orders.models import TestOrder
from .serializers import SampleSerializer
from django.core.exceptions import ValidationError
import traceback

@api_view(['GET'])
def alias_mapping_list(request):
    try:
        mappings = AliasMapping.objects.all()
        data = {}
        for mapping in mappings:
            print("🔍 Mapping:", mapping)  # ← 로그 추가
            print("    sample_type:", mapping.sample_type)
            print("    alias_name:", mapping.alias_name)
            print("    test_type_keywords:", mapping.test_type_keywords)
            
            if mapping.sample_type not in data:
                data[mapping.sample_type] = {}
            data[mapping.sample_type][mapping.alias_name] = mapping.test_type_keywords.split(',') if mapping.test_type_keywords else []
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_test_types_by_alias(request):
    sample_type = request.GET.get('sample_type')
    alias_name = request.GET.get('alias_name')

    if not sample_type or not alias_name:
        return Response({'error': 'sample_type과 alias_name 모두 필요합니다.'},
                        status=status.HTTP_400_BAD_REQUEST)

    test_types = LOINCCode.objects.filter(
        sample_type=sample_type,
        name__icontains=alias_name  # 또는 다른 로직으로도 OK
    ).values_list('test_type', flat=True).distinct()

    return Response(list(test_types))

@api_view(['GET'])
def get_loinc_by_sample_type(request):
    sample_type = request.GET.get('sample_type')
    test_type = request.GET.get('test_type')

    if not sample_type or not test_type:
        return Response({'error': 'sample_type과 test_type 모두 필요합니다.'},
                        status=status.HTTP_400_BAD_REQUEST)

    loinc = LOINCCode.objects.filter(sample_type=sample_type, test_type__iexact=test_type).first()
    if loinc:
        return Response([{
            'loinc_code': loinc.code,
            'test_type': loinc.test_type,
            'sample_type': loinc.sample_type
        }])
    else:
        return Response([], status=status.HTTP_200_OK)    
    
@api_view(['POST']) 
def create_sample(request): # 샘플 등록 
    loinc_code = request.data.get('loinc_code') # LOINC코드 매핑
    order_id = request.data.get('order')  
    if not LOINCCode.objects.filter(code=loinc_code).exists():
        return Response(
            {"error": f"LOINC 코드 '{loinc_code}'는 유효하지 않습니다."},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    if not TestOrder.objects.filter(id=order_id).exists():
        return Response(
            {"error": f"주문 ID '{order_id}'는 존재하지 않습니다."},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = SampleSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    print("🔥 serializer errors:", serializer.errors)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
 
@api_view(['GET']) # 샘플 리스트 불러오기 
def list_samples_by_order(request, order_id):
    samples = Sample.objects.filter(order_id=order_id)
    serializer = SampleSerializer(samples, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['GET'])
def list_all_samples(request):  # 전체 샘플 조회
    samples = Sample.objects.all()
    serializer = SampleSerializer(samples, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['GET'])
def get_sample_by_id(request, sample_id):
    try:
        sample = Sample.objects.get(id=sample_id)
        serializer = SampleSerializer(sample)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Sample.DoesNotExist:
        return Response({"error": "해당 샘플이 존재하지 않습니다."}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
def create_test_result_for_sample(request, sample_id):
    sample = get_object_or_404(Sample, id=sample_id)
    data = request.data.copy()
    data['sample'] = sample.id

    serializer = TestResultSerializer(data=data)
    if serializer.is_valid():
        serializer.save(result_status="recorded")
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)