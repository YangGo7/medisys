# backend/main_page_function/views.py

from django.db.models import Count, Sum
from django.utils import timezone
from datetime import datetime, timedelta, date
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
import logging

# 기존 모델들 import
from openmrs_models.models import Patient, Person, Encounter
from worklist.models import StudyRequest
from orders_emr.models import Order
from .models import Notice, DoctorStats
from .serializers import NoticeSerializer, DoctorStatsSerializer

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_main_page_data(request):
    """메인 페이지에 필요한 모든 데이터 조회"""
    try:
        doctor_id = request.GET.get('doctor_id', 'default_doctor')
        
        # 1. 의사 정보 및 통계
        doctor_stats = get_or_create_doctor_stats(doctor_id)
        
        # 2. 활성 공지사항 (최대 5개)
        active_notices = Notice.objects.filter(
            is_active=True,
            start_date__lte=timezone.now()
        ).filter(
            models.Q(end_date__isnull=True) | models.Q(end_date__gte=timezone.now())
        )[:5]
        
        # 3. 오늘 일정 (더미 데이터, 실제로는 Encounter나 별도 Schedule 모델에서)
        today_schedule = get_today_schedule(doctor_id)
        
        # 4. 메시지 수 (더미 데이터)
        unread_messages = 7  # 실제로는 메시지 시스템에서 조회
        
        response_data = {
            'doctor_info': {
                'name': doctor_stats.doctor_name,
                'department': doctor_stats.department,
                'status': doctor_stats.status,
                'status_display': doctor_stats.get_status_display()
            },
            'stats': {
                'today_patients': doctor_stats.today_patients,
                'waiting_patients': doctor_stats.waiting_patients,
                'unread_messages': unread_messages
            },
            'notices': NoticeSerializer(active_notices, many=True).data,
            'schedule': today_schedule,
            'last_updated': timezone.now().isoformat()
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"메인 페이지 데이터 조회 오류: {str(e)}")
        return Response({
            'error': f'메인 페이지 데이터 조회 실패: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def get_or_create_doctor_stats(doctor_id):
    """의사 통계 조회 또는 생성"""
    try:
        doctor_stats = DoctorStats.objects.get(doctor_id=doctor_id)
        
        # 오늘 데이터가 아니면 업데이트
        if doctor_stats.last_updated.date() != timezone.now().date():
            update_doctor_stats(doctor_stats)
        
        return doctor_stats
        
    except DoctorStats.DoesNotExist:
        # 새로 생성
        return create_doctor_stats(doctor_id)

def create_doctor_stats(doctor_id):
    """새 의사 통계 생성"""
    # 실제 환경에서는 User 모델에서 의사 정보 조회
    doctor_mapping = {
        'default_doctor': {'name': '김의사', 'department': '내과'},
        'doctor_1': {'name': '이의사', 'department': '외과'},
        'doctor_2': {'name': '박의사', 'department': '소아과'},
    }
    
    doctor_info = doctor_mapping.get(doctor_id, {'name': '김의사', 'department': '내과'})
    
    # 오늘 통계 계산
    today = timezone.now().date()
    
    # 오늘 진료한 환자 수 (Encounter 기준)
    today_patients = Encounter.objects.filter(
        encounter_datetime__date=today,
        voided=False,
        creator=1  # 실제로는 doctor_id 매핑 필요
    ).count()
    
    # 대기 환자 수 (StudyRequest 기준)
    waiting_patients = StudyRequest.objects.filter(
        study_status='requested',
        requesting_physician=doctor_info['name']
    ).count()
    
    doctor_stats = DoctorStats.objects.create(
        doctor_id=doctor_id,
        doctor_name=doctor_info['name'],
        department=doctor_info['department'],
        today_patients=today_patients,
        waiting_patients=waiting_patients,
        status='online'
    )
    
    return doctor_stats

def update_doctor_stats(doctor_stats):
    """의사 통계 업데이트"""
    today = timezone.now().date()
    
    # 오늘 진료한 환자 수 업데이트
    today_patients = Encounter.objects.filter(
        encounter_datetime__date=today,
        voided=False,
        creator=1  # 실제로는 doctor_id 매핑 필요
    ).count()
    
    # 대기 환자 수 업데이트
    waiting_patients = StudyRequest.objects.filter(
        study_status='requested',
        requesting_physician=doctor_stats.doctor_name
    ).count()
    
    doctor_stats.today_patients = today_patients
    doctor_stats.waiting_patients = waiting_patients
    doctor_stats.save()

def get_today_schedule(doctor_id):
    """오늘 일정 조회 (더미 데이터)"""
    # 실제로는 Schedule 모델이나 Encounter 예약 데이터에서 조회
    return [
        {
            'time': '14:00',
            'type': '진료',
            'description': '고혈압 환자',
            'patient_id': 'P001'
        },
        {
            'time': '16:00', 
            'type': '진료',
            'description': '두통 환자',
            'patient_id': 'P002'
        },
        {
            'time': '18:00',
            'type': '회의',
            'description': '의료진 미팅',
            'patient_id': None
        }
    ]

@api_view(['GET'])
@permission_classes([AllowAny])
def get_notices(request):
    """공지사항 목록 조회"""
    try:
        notices = Notice.objects.filter(
            is_active=True,
            start_date__lte=timezone.now()
        ).filter(
            models.Q(end_date__isnull=True) | models.Q(end_date__gte=timezone.now())
        )
        
        # 쿼리 파라미터 처리
        notice_type = request.GET.get('type')
        if notice_type:
            notices = notices.filter(notice_type=notice_type)
            
        page_size = int(request.GET.get('page_size', 10))
        notices = notices[:page_size]
        
        serializer = NoticeSerializer(notices, many=True)
        return Response({
            'status': 'success',
            'data': serializer.data,
            'count': len(serializer.data)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"공지사항 조회 오류: {str(e)}")
        return Response({
            'error': f'공지사항 조회 실패: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def create_notice(request):
    """공지사항 생성"""
    try:
        serializer = NoticeSerializer(data=request.data)
        if serializer.is_valid():
            # 작성자 정보 추가 (실제로는 request.user에서)
            serializer.save(created_by=request.data.get('created_by', 'system'))
            
            return Response({
                'status': 'success',
                'message': '공지사항이 생성되었습니다.',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'status': 'error',
                'message': '공지사항 생성 실패',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"공지사항 생성 오류: {str(e)}")
        return Response({
            'error': f'공지사항 생성 실패: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@permission_classes([AllowAny])
def update_doctor_status(request, doctor_id):
    """의사 상태 업데이트"""
    try:
        doctor_stats = DoctorStats.objects.get(doctor_id=doctor_id)
        new_status = request.data.get('status')
        
        if new_status in ['online', 'busy', 'break', 'offline']:
            doctor_stats.status = new_status
            doctor_stats.save()
            
            return Response({
                'status': 'success',
                'message': f'상태가 {doctor_stats.get_status_display()}로 변경되었습니다.',
                'data': DoctorStatsSerializer(doctor_stats).data
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'status': 'error',
                'message': '유효하지 않은 상태값입니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except DoctorStats.DoesNotExist:
        return Response({
            'status': 'error',
            'message': '의사 정보를 찾을 수 없습니다.'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"의사 상태 업데이트 오류: {str(e)}")
        return Response({
            'error': f'상태 업데이트 실패: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# backend/main_page_function/urls.py

from django.urls import path
from . import views

app_name = 'main_page_function'

urlpatterns = [
    # 메인 페이지 데이터
    path('main-data/', views.get_main_page_data, name='main_page_data'),
    
    # 공지사항 관련
    path('notices/', views.get_notices, name='notices'),
    path('notices/create/', views.create_notice, name='create_notice'),
    
    # 의사 상태 관리
    path('doctor/<str:doctor_id>/status/', views.update_doctor_status, name='update_doctor_status'),
]

