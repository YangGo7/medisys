
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DoctorViewSet

# 🆕 doctors 앱에 이 파일이 없으면 새로 생성
router = DefaultRouter()
router.register(r'doctors', DoctorViewSet, basename='doctor')

urlpatterns = [
    path('', include(router.urls)),
    # 🆕 current_user 엔드포인트 추가
    path('doctors/current_user/', DoctorViewSet.as_view({'get': 'current_user'}), name='current-user'),
]

# 4. doctors/views.py 수정
# backend/doctors/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Doctor
from .serializers import DoctorSerializer

class DoctorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    
    # 🆕 current_user 액션 추가
    @action(detail=False, methods=['get'])
    def current_user(self, request):
        """현재 사용자 정보 반환 (임시로 첫 번째 의사 반환)"""
        try:
            # 임시로 첫 번째 의사 정보 반환
            doctor = Doctor.objects.first()
            if doctor:
                serializer = self.get_serializer(doctor)
                return Response(serializer.data)
            else:
                # 의사가 없으면 기본 데이터 생성
                default_doctor = Doctor.objects.create(
                    name="기본 의사",
                    department="영상의학과", 
                    role="의사",
                    status="온라인"
                )
                serializer = self.get_serializer(default_doctor)
                return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': f'사용자 정보 조회 실패: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # 🆕 방사선사 목록 액션 추가
    @action(detail=False, methods=['get'])
    def radiologists(self, request):
        """방사선사 목록 반환"""
        try:
            radiologists = Doctor.objects.filter(department='영상의학과')
            
            # 방사선사가 없으면 기본 데이터 생성
            if not radiologists.exists():
                default_radiologists = [
                    Doctor(name="김영상", department="영상의학과", role="방사선사", status="온라인"),
                    Doctor(name="이촬영", department="영상의학과", role="방사선사", status="온라인"),  
                    Doctor(name="박판독", department="영상의학과", role="방사선사", status="자리비움"),
                ]
                Doctor.objects.bulk_create(default_radiologists)
                radiologists = Doctor.objects.filter(department='영상의학과')
            
            # 색상 정보 추가
            radiologist_data = []
            colors = ['radiologist-blue', 'radiologist-green', 'radiologist-purple', 'radiologist-orange']
            
            for i, doctor in enumerate(radiologists):
                doctor_data = DoctorSerializer(doctor).data
                doctor_data['color'] = colors[i % len(colors)]
                radiologist_data.append(doctor_data)
            
            return Response(radiologist_data)
        except Exception as e:
            return Response(
                {'error': f'방사선사 목록 조회 실패: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
