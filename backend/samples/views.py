from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Sample, LOINCCode, AliasMapping
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
    if not LOINCCode.objects.filter(code=loinc_code).exists():
        return Response(
            {"error": f"LOINC 코드 '{loinc_code}'는 유효하지 않습니다."},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = SampleSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
 
@api_view(['GET']) # 샘플 리스트 불러오기 
def list_samples_by_order(request, order_id):
    samples = Sample.objects.filter(order_id=order_id)
    serializer = SampleSerializer(samples, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)