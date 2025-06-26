# from rest_framework import viewsets, status
# from rest_framework.response import Response
# from rest_framework.decorators import api_view, action
# from .models import StudyRequest
# from .serializers import StudyRequestSerializer, WorklistSerializer


# #영상 검사 요청
# class StudyRequestViewSet(viewsets.ModelViewSet):
#     queryset = StudyRequest.objects.all()
#     serializer_class = StudyRequestSerializer
    
#     def create(self, request, *args, **kwargs):
#         print("받은 데이터:", request.data)  # 디버깅용
#         serializer = self.get_serializer(data=request.data)
#         if serializer.is_valid():
#             serializer.save()
#             return Response(
#                 {"status": "success", "data": serializer.data}, 
#                 status=status.HTTP_201_CREATED
#             )
#         else:
#             print("Serializer 에러:", serializer.errors)  # 디버깅용
#             return Response(
#                 {"status": "error", "errors": serializer.errors}, 
#                 status=status.HTTP_400_BAD_REQUEST
#             )
    
#     # 🆕 React Dashboard용 워크리스트 API
#     @action(detail=False, methods=['get'])
#     def worklist(self, request):
#         """React Dashboard에서 사용할 워크리스트 데이터"""
#         try:
#             # 최신순으로 정렬
#             study_requests = StudyRequest.objects.all().order_by('-request_datetime')
#             serializer = WorklistSerializer(study_requests, many=True)
#             return Response(serializer.data)
#         except Exception as e:
#             return Response(
#                 {'error': str(e)}, 
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )
    
#     # 🆕 검사 배정 API
#     @action(detail=True, methods=['post'])
#     def assign(self, request, pk=None):
#         """드래그앤드롭으로 검사 배정"""
#         try:
#             study_request = self.get_object()
            
#             # 요청 데이터 추출
#             room_id = request.data.get('roomId')
#             radiologist_id = request.data.get('radiologistId')
#             start_time = request.data.get('startTime')
#             duration = request.data.get('duration')
            
#             # 검증
#             if not all([room_id, radiologist_id, start_time, duration]):
#                 return Response(
#                     {'error': '필수 정보가 누락되었습니다.'}, 
#                     status=status.HTTP_400_BAD_REQUEST
#                 )
            
#             # 관련 객체 가져오기
#             from schedules.models import ExamRoom
#             from doctors.models import Doctor
#             from datetime import datetime
#             from django.utils import timezone
            
#             room = ExamRoom.objects.get(room_id=room_id)
#             radiologist = Doctor.objects.get(id=radiologist_id)
            
#             # 시간 파싱 및 timezone 처리
#             if isinstance(start_time, str):
#                 # 시간만 주어진 경우 (예: "09:00")
#                 from datetime import date, time
#                 today = date.today()
#                 time_obj = datetime.strptime(start_time, '%H:%M').time()
#                 start_datetime = datetime.combine(today, time_obj)
#                 start_datetime = timezone.make_aware(start_datetime)
#             else:
#                 start_datetime = start_time
            
#             # 배정 실행
#             study_request.assign_schedule(room, radiologist, start_datetime, int(duration))
            
#             # 업데이트된 데이터 반환
#             serializer = WorklistSerializer(study_request)
#             return Response(serializer.data)
            
#         except ExamRoom.DoesNotExist:
#             return Response(
#                 {'error': '검사실을 찾을 수 없습니다.'}, 
#                 status=status.HTTP_404_NOT_FOUND
#             )
#         except Doctor.DoesNotExist:
#             return Response(
#                 {'error': '영상전문의를 찾을 수 없습니다.'}, 
#                 status=status.HTTP_404_NOT_FOUND
#             )
#         except Exception as e:
#             return Response(
#                 {'error': str(e)}, 
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )
    
#     # 🆕 검사 시작 API
#     @action(detail=True, methods=['post'])
#     def start_exam(self, request, pk=None):
#         """검사 시작"""
#         try:
#             study_request = self.get_object()
            
#             if not study_request.can_start_exam():
#                 return Response(
#                     {'error': '검사 시작이 불가능한 상태입니다.'}, 
#                     status=status.HTTP_400_BAD_REQUEST
#                 )
            
#             study_request.start_exam()
#             serializer = WorklistSerializer(study_request)
#             return Response(serializer.data)
            
#         except Exception as e:
#             return Response(
#                 {'error': str(e)}, 
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )
    
#     # 🆕 검사 완료 API
#     @action(detail=True, methods=['post'])
#     def complete_exam(self, request, pk=None):
#         """검사 완료"""
#         try:
#             study_request = self.get_object()
            
#             if not study_request.can_complete_exam():
#                 return Response(
#                     {'error': '검사 완료가 불가능한 상태입니다.'}, 
#                     status=status.HTTP_400_BAD_REQUEST
#                 )
            
#             study_request.complete_exam()
#             serializer = WorklistSerializer(study_request)
#             return Response(serializer.data)
            
#         except Exception as e:
#             return Response(
#                 {'error': str(e)}, 
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )
    
#     # 🆕 검사 취소 API
#     @action(detail=True, methods=['post'])
#     def cancel_exam(self, request, pk=None):
#         """검사 취소 (스케줄 삭제)"""
#         try:
#             study_request = self.get_object()
#             study_request.cancel_schedule()
#             serializer = WorklistSerializer(study_request)
#             return Response(serializer.data)
            
#         except Exception as e:
#             return Response(
#                 {'error': str(e)}, 
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )


# # WorkList용 API (모든 필드 조회) - 기존 API 유지
# @api_view(['GET'])
# def work_list(request):
#     """
#     WorkList 페이지용 - 모든 StudyRequest 데이터를 모든 필드와 함께 반환
#     """
#     try:
#         # created_at 대신 request_datetime으로 정렬 (실제 모델 필드 사용)
#         study_requests = StudyRequest.objects.all().order_by('-request_datetime')
        
#         # 실제 모델 필드에 맞게 데이터 구성
#         work_list_data = []
#         for request_obj in study_requests:
#             data = {
#                 'id': request_obj.id,
#                 'patient_id': request_obj.patient_id,
#                 'patient_name': request_obj.patient_name,
#                 'birth_date': request_obj.birth_date.strftime('%Y-%m-%d') if request_obj.birth_date else None,
#                 'sex': request_obj.sex,
#                 'body_part': request_obj.body_part,
#                 'modality': request_obj.modality,
#                 'requesting_physician': request_obj.requesting_physician,
#                 'request_datetime': request_obj.request_datetime.strftime('%Y-%m-%d %H:%M:%S') if request_obj.request_datetime else None,
#                 'scheduled_exam_datetime': request_obj.scheduled_exam_datetime.strftime('%Y-%m-%d %H:%M:%S') if request_obj.scheduled_exam_datetime else None,
#                 'interpreting_physician': request_obj.interpreting_physician,
#                 'study_uid': request_obj.study_uid,
#                 'accession_number': request_obj.accession_number,
#                 'study_status': request_obj.study_status,
#                 'report_status': request_obj.report_status,
#             }
#             work_list_data.append(data)
        
#         return Response({
#             'status': 'success',
#             'count': len(work_list_data),
#             'data': work_list_data
#         })
        
#     except Exception as e:
#         print(f"WorkList API 에러: {e}")
#         return Response({
#             'status': 'error',
#             'message': '데이터를 불러오는데 실패했습니다.'
#         }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# # 특정 StudyRequest 상세 조회 (WorkList에서 클릭시 사용) - 기존 API 유지
# @api_view(['GET'])
# def work_list_detail(request, pk):
#     """
#     특정 StudyRequest의 모든 상세 정보 반환
#     """
#     try:
#         study_request = StudyRequest.objects.get(pk=pk)
        
#         # 모든 필드 데이터 반환
#         data = {
#             'id': study_request.id,
#             'patient_id': study_request.patient_id,
#             'patient_name': study_request.patient_name,
#             'birth_date': study_request.birth_date.strftime('%Y-%m-%d') if study_request.birth_date else None,
#             'sex': study_request.sex,
#             'body_part': study_request.body_part,
#             'modality': study_request.modality,
#             'requesting_physician': study_request.requesting_physician
#             # 'created_at': study_request.created_at.strftime('%Y-%m-%d %H:%M:%S') if study_request.created_at else None,
#             # 'updated_at': study_request.updated_at.strftime('%Y-%m-%d %H:%M:%S') if study_request.updated_at else None,
#             # 실제 모델의 모든 필드 추가
#         }
        
#         return Response({
#             'status': 'success',
#             'data': data
#         })
        
#     except StudyRequest.DoesNotExist:
#         return Response({
#             'status': 'error',
#             'message': '해당 요청을 찾을 수 없습니다.'
#         }, status=status.HTTP_404_NOT_FOUND)
#     except Exception as e:
#         return Response({
#             'status': 'error',
#             'message': '데이터를 불러오는데 실패했습니다.'
#         }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, action
from .models import StudyRequest
from .serializers import StudyRequestSerializer, WorklistSerializer


#영상 검사 요청
class StudyRequestViewSet(viewsets.ModelViewSet):
    queryset = StudyRequest.objects.all()
    serializer_class = StudyRequestSerializer
    
    def create(self, request, *args, **kwargs):
        print("받은 데이터:", request.data)  # 디버깅용
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"status": "success", "data": serializer.data}, 
                status=status.HTTP_201_CREATED
            )
        else:
            print("Serializer 에러:", serializer.errors)  # 디버깅용
            return Response(
                {"status": "error", "errors": serializer.errors}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    # 🆕 React Dashboard용 워크리스트 API
    @action(detail=False, methods=['get'])
    def worklist(self, request):
        """React Dashboard에서 사용할 워크리스트 데이터"""
        try:
            # 최신순으로 정렬
            study_requests = StudyRequest.objects.all().order_by('-request_datetime')
            serializer = WorklistSerializer(study_requests, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # 🆕 검사 배정 API - 시간대 문제 해결
    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """드래그앤드롭으로 검사 배정"""
        try:
            study_request = self.get_object()
            
            # 요청 데이터 추출
            room_id = request.data.get('roomId')
            radiologist_id = request.data.get('radiologistId')
            start_time = request.data.get('startTime')
            duration = request.data.get('duration')
            
            print(f"받은 시간 데이터: {start_time}")  # 디버깅용
            
            # 검증
            if not all([room_id, radiologist_id, start_time, duration]):
                return Response(
                    {'error': '필수 정보가 누락되었습니다.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 관련 객체 가져오기
            from schedules.models import ExamRoom
            from doctors.models import Doctor
            from datetime import datetime
            from django.utils import timezone
            import pytz
            
            room = ExamRoom.objects.get(room_id=room_id)
            radiologist = Doctor.objects.get(id=radiologist_id)
            
            # 🔥 시간 파싱 개선 - KST 시간대 명시적 처리
            if isinstance(start_time, str):
                # KST 시간대 설정
                kst = pytz.timezone('Asia/Seoul')
                
                if 'T' in start_time and ('+' in start_time or 'Z' in start_time):
                    # ISO 형식인 경우 (예: "2025-06-26T14:00:00+09:00")
                    start_datetime = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                    if start_datetime.tzinfo is None:
                        start_datetime = kst.localize(start_datetime)
                else:
                    # 시간만 주어진 경우 (예: "14:00")
                    from datetime import date, time
                    today = date.today()
                    time_obj = datetime.strptime(start_time, '%H:%M').time()
                    naive_datetime = datetime.combine(today, time_obj)
                    # KST로 직접 localize (UTC 변환 방지)
                    start_datetime = kst.localize(naive_datetime)
            else:
                start_datetime = start_time
            
            print(f"파싱된 시간: {start_datetime}")  # 디버깅용
            
            # 배정 실행
            study_request.assign_schedule(room, radiologist, start_datetime, int(duration))
            
            # 업데이트된 데이터 반환
            serializer = WorklistSerializer(study_request)
            return Response(serializer.data)
            
        except ExamRoom.DoesNotExist:
            return Response(
                {'error': '검사실을 찾을 수 없습니다.'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Doctor.DoesNotExist:
            return Response(
                {'error': '영상전문의를 찾을 수 없습니다.'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            print(f"배정 에러: {e}")  # 디버깅용
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # 🆕 검사 시작 API
    @action(detail=True, methods=['post'])
    def start_exam(self, request, pk=None):
        """검사 시작"""
        try:
            study_request = self.get_object()
            
            if not study_request.can_start_exam():
                return Response(
                    {'error': '검사 시작이 불가능한 상태입니다.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            study_request.start_exam()
            serializer = WorklistSerializer(study_request)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # 🆕 검사 완료 API
    @action(detail=True, methods=['post'])
    def complete_exam(self, request, pk=None):
        """검사 완료"""
        try:
            study_request = self.get_object()
            
            if not study_request.can_complete_exam():
                return Response(
                    {'error': '검사 완료가 불가능한 상태입니다.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            study_request.complete_exam()
            serializer = WorklistSerializer(study_request)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # 🆕 검사 취소 API
    @action(detail=True, methods=['post'])
    def cancel_exam(self, request, pk=None):
        """검사 취소 (스케줄 삭제)"""
        try:
            study_request = self.get_object()
            study_request.cancel_schedule()
            serializer = WorklistSerializer(study_request)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# WorkList용 API (모든 필드 조회) - 기존 API 유지
@api_view(['GET'])
def work_list(request):
    """
    WorkList 페이지용 - 모든 StudyRequest 데이터를 모든 필드와 함께 반환
    """
    try:
        # created_at 대신 request_datetime으로 정렬 (실제 모델 필드 사용)
        study_requests = StudyRequest.objects.all().order_by('-request_datetime')
        
        # 실제 모델 필드에 맞게 데이터 구성
        work_list_data = []
        for request_obj in study_requests:
            data = {
                'id': request_obj.id,
                'patient_id': request_obj.patient_id,
                'patient_name': request_obj.patient_name,
                'birth_date': request_obj.birth_date.strftime('%Y-%m-%d') if request_obj.birth_date else None,
                'sex': request_obj.sex,
                'body_part': request_obj.body_part,
                'modality': request_obj.modality,
                'requesting_physician': request_obj.requesting_physician,
                'request_datetime': request_obj.request_datetime.strftime('%Y-%m-%d %H:%M:%S') if request_obj.request_datetime else None,
                'scheduled_exam_datetime': request_obj.scheduled_exam_datetime.strftime('%Y-%m-%d %H:%M:%S') if request_obj.scheduled_exam_datetime else None,
                'interpreting_physician': request_obj.interpreting_physician,
                'study_uid': request_obj.study_uid,
                'accession_number': request_obj.accession_number,
                'study_status': request_obj.study_status,
                'report_status': request_obj.report_status,
            }
            work_list_data.append(data)
        
        return Response({
            'status': 'success',
            'count': len(work_list_data),
            'data': work_list_data
        })
        
    except Exception as e:
        print(f"WorkList API 에러: {e}")
        return Response({
            'status': 'error',
            'message': '데이터를 불러오는데 실패했습니다.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# 특정 StudyRequest 상세 조회 (WorkList에서 클릭시 사용) - 기존 API 유지
@api_view(['GET'])
def work_list_detail(request, pk):
    """
    특정 StudyRequest의 모든 상세 정보 반환
    """
    try:
        study_request = StudyRequest.objects.get(pk=pk)
        
        # 모든 필드 데이터 반환
        data = {
            'id': study_request.id,
            'patient_id': study_request.patient_id,
            'patient_name': study_request.patient_name,
            'birth_date': study_request.birth_date.strftime('%Y-%m-%d') if study_request.birth_date else None,
            'sex': study_request.sex,
            'body_part': study_request.body_part,
            'modality': study_request.modality,
            'requesting_physician': study_request.requesting_physician
            # 'created_at': study_request.created_at.strftime('%Y-%m-%d %H:%M:%S') if study_request.created_at else None,
            # 'updated_at': study_request.updated_at.strftime('%Y-%m-%d %H:%M:%S') if study_request.updated_at else None,
            # 실제 모델의 모든 필드 추가
        }
        
        return Response({
            'status': 'success',
            'data': data
        })
        
    except StudyRequest.DoesNotExist:
        return Response({
            'status': 'error',
            'message': '해당 요청을 찾을 수 없습니다.'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'status': 'error',
            'message': '데이터를 불러오는데 실패했습니다.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)