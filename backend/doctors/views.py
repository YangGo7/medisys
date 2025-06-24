from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status  # 🆕 추가
from .models import Doctor
from .serializers import DoctorSerializer, RadiologistSerializer


class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
        
    @action(detail=False, methods=['get'])
    def current_user(self, request):
        # 현재는 첫 번째 의사 정보를 반환 (나중에 인증 시스템 연결)
        try:
            doctor = Doctor.objects.first()
            serializer = self.get_serializer(doctor)
            return Response(serializer.data)
        except Doctor.DoesNotExist:
            return Response({'error': '의사 정보를 찾을 수 없습니다.'}, status=404)
    
    @action(detail=False, methods=['get'])
    def radiologists(self, request):
        """React에서 사용할 방사선사 목록 (영상의학과 의사들)"""
        try:
            # 영상의학과 의사들만 필터링
            radiologists = Doctor.objects.filter(
                department="영상의학과",
                role="의사"
            ).order_by('id')
            
            serializer = RadiologistSerializer(radiologists, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # 🆕 상태 업데이트 액션 추가
    @action(detail=False, methods=['patch'], url_path='current_user/status')
    def update_current_user_status(self, request):
        try:
            # 현재는 첫 번째 의사 정보를 사용 (나중에 인증 시스템 연결)
            doctor = Doctor.objects.first()
            
            if not doctor:
                return Response(
                    {'error': '의사 정보를 찾을 수 없습니다.'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            new_status = request.data.get('status')
            
            # 유효한 상태인지 확인
            if new_status not in ['온라인', '자리 비움']:
                return Response(
                    {'error': '유효하지 않은 상태입니다.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 상태 업데이트
            doctor.status = new_status
            doctor.save()
            
            # 업데이트된 정보 반환
            serializer = self.get_serializer(doctor)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )