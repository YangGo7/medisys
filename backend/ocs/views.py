# backend > ocs > views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions    import AllowAny
from rest_framework.response       import Response
from rest_framework                import status
from django.core.paginator         import Paginator
from .models                       import OCSLog
from .serializers                 import OCSLogSerializer
from orders.models                import TestOrder

@api_view(['POST'])
@permission_classes([AllowAny])
def create_integration_log(request):
    """
    POST: 들어온 payload(raw_data)를 그대로 OCSLog에 저장
    """
    data = request.data
    try:
        log = OCSLog.objects.create(
            raw_data   = data,
            patient_id = data.get('patient_id'),
            doctor_id  = data.get('doctor_id'),
            system     = data.get('system', 'OCS-Integration')
        )
        return Response({
            'status': 'success',
            'message': '로그가 저장되었습니다.',
            'data': {
                'id':        log.id,
                'timestamp': log.timestamp.isoformat(),
            }
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({
            'status': 'error',
            'message': f'로그 생성 실패: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def integration_logs(request):
    """
    GET: 저장된 OCSLog 조회
    - 필터: ?patient=이름, ?doctor=이름 (TestOrder에서 UUID 찾아서 매핑)
    """
    qs = OCSLog.objects.all().order_by('-timestamp')

    # 이름 → UUID 매핑 후 필터링
    patient = request.GET.get('patient')
    if patient:
        uuids = TestOrder.objects.filter(
            patient_name__icontains=patient
        ).values_list('patient_id', flat=True).distinct()
        qs = qs.filter(patient_id__in=uuids)

    doctor = request.GET.get('doctor')
    if doctor:
        uuids = TestOrder.objects.filter(
            doctor_name__icontains=doctor
        ).values_list('doctor_id', flat=True).distinct()
        qs = qs.filter(doctor_id__in=uuids)

    # 페이징 처리
    page      = int(request.GET.get('page', 1))
    page_size = int(request.GET.get('page_size', 50))
    paginator = Paginator(qs, page_size)
    page_obj  = paginator.get_page(page)

    serializer = OCSLogSerializer(page_obj, many=True)
    return Response({
        'status':    'success',
        'data':      serializer.data,
        'total':     paginator.count,
        'page':      page,
        'page_size': page_size
    }, status=status.HTTP_200_OK)


