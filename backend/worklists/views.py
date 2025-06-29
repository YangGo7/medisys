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
from datetime import datetime, date
from .models import StudyRequest
from .serializers import StudyRequestSerializer, WorklistSerializer
from django.db.models import Q

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
    
@api_view(['GET'])
def worklist_by_date(request, target_date):
    """
    ✅ React가 호출하는 날짜별 워크리스트 API
    URL: /api/worklists/2025-06-26/
    """
    try:
        print(f"📅 날짜별 워크리스트 요청: {target_date}")
        
        # 날짜 파싱
        try:
            target_date_obj = datetime.strptime(target_date, '%Y-%m-%d').date()
        except ValueError:
            return Response({
                'status': 'error',
                'message': '잘못된 날짜 형식입니다. YYYY-MM-DD 형식을 사용하세요.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # ✅ 해당 날짜의 요청들 필터링
        # request_datetime이 해당 날짜인 것들 + scheduled_exam_datetime이 해당 날짜인 것들
        from django.db.models import Q
        
        study_requests = StudyRequest.objects.filter(
            Q(request_datetime__date=target_date_obj) |  # 요청일이 해당 날짜
            Q(scheduled_exam_datetime__date=target_date_obj)  # 예정 검사일이 해당 날짜
        ).order_by('-request_datetime')
        
        print(f"📊 필터링된 데이터 개수: {study_requests.count()}")
        
        # 디버깅: 각 요청의 시간 정보 출력
        for req in study_requests[:3]:  # 처음 3개만
            print(f"ID: {req.id}, 요청일: {req.request_datetime}, 예정일: {req.scheduled_exam_datetime}")
        
        # ✅ WorklistSerializer 사용 (requestDateTime 포함)
        serializer = WorklistSerializer(study_requests, many=True)
        
        return Response({
            'status': 'success',
            'date': target_date,
            'count': len(serializer.data),
            'data': serializer.data
        })
        
    except Exception as e:
        print(f"❌ 날짜별 워크리스트 API 에러: {e}")
        return Response({
            'status': 'error',
            'message': f'데이터를 불러오는데 실패했습니다: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def worklist_by_date_specific(request, year, month, day):
    """
    ✅ 구체적인 날짜별 워크리스트 API (URL 충돌 방지)
    URL: /api/worklists/2025-06-26/
    """
    try:
        # 날짜 객체 생성
        target_date_obj = date(year, month, day)
        target_date = target_date_obj.strftime('%Y-%m-%d')
        
        print(f"📅 구체적 날짜별 워크리스트 요청: {target_date}")
        
        # ✅ 해당 날짜의 요청들 필터링
        from django.db.models import Q
        
        study_requests = StudyRequest.objects.filter(
            Q(request_datetime__date=target_date_obj) |  # 요청일이 해당 날짜
            Q(scheduled_exam_datetime__date=target_date_obj)  # 예정 검사일이 해당 날짜
        ).order_by('-request_datetime')
        
        print(f"📊 필터링된 데이터 개수: {study_requests.count()}")
        
        # 디버깅: 각 요청의 시간 정보 출력
        for req in study_requests[:3]:  # 처음 3개만
            print(f"ID: {req.id}, 요청일: {req.request_datetime}, 예정일: {req.scheduled_exam_datetime}")
        
        # ✅ WorklistSerializer 사용 (requestDateTime 포함)
        serializer = WorklistSerializer(study_requests, many=True)
        
        return Response({
            'status': 'success',
            'date': target_date,
            'count': len(serializer.data),
            'data': serializer.data
        })
        
    except ValueError as e:
        print(f"❌ 잘못된 날짜: {year}-{month}-{day}")
        return Response({
            'status': 'error',
            'message': f'잘못된 날짜입니다: {year}-{month}-{day}'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        print(f"❌ 구체적 날짜별 워크리스트 API 에러: {e}")
        return Response({
            'status': 'error',
            'message': f'데이터를 불러오는데 실패했습니다: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
@api_view(['GET'])
def completed_studies_list(request):
    """
    DMViewer용 - 검사와 리포트가 모두 완료된 환자들의 study 목록 반환
    """
    try:
        # 완료 상태 정의 (한국어 + 영어 모든 경우 처리)
        study_completed_statuses = [
            '검사완료',     # 한국어 (worklists 앱)
            'completed',   # 영어 (worklist 앱)
            'COMPLETED',   # 대문자
            'Completed'    # 첫글자 대문자
        ]
        
        report_completed_statuses = [
            '작성완료',     # 한국어 (worklists 앱) 
            'completed',   # 영어 (worklist 앱)
            'COMPLETED',   # 대문자
            'Completed'    # 첫글자 대문자
        ]
        
        # 검사상태와 리포트상태가 모두 완료된 항목 조회
        completed_studies = StudyRequest.objects.filter(
            study_status__in=study_completed_statuses,
            report_status__in=report_completed_statuses
        ).exclude(
            study_uid__isnull=True  # study_uid가 있는 것만 (실제 검사가 진행된 것)
        ).exclude(
            study_uid__exact=''     # 빈 문자열 제외
        ).order_by('-request_datetime')

        # DMViewer에서 필요한 데이터 구성
        completed_data = []
        for study in completed_studies:
            data = {
                'id': study.id,
                'patient_id': study.patient_id,
                'patient_name': study.patient_name,
                'birth_date': study.birth_date.strftime('%Y-%m-%d') if study.birth_date else None,
                'sex': study.sex,
                'modality': study.modality,
                'body_part': study.body_part,
                'study_uid': study.study_uid,
                'accession_number': study.accession_number,
                'requesting_physician': study.requesting_physician,
                'interpreting_physician': study.interpreting_physician,
                'request_datetime': study.request_datetime.strftime('%Y-%m-%d %H:%M:%S') if study.request_datetime else None,
                'scheduled_exam_datetime': study.scheduled_exam_datetime.strftime('%Y-%m-%d %H:%M:%S') if study.scheduled_exam_datetime else None,
                'study_status': study.study_status,
                'report_status': study.report_status,
                # DMViewer에서 필요한 추가 정보
                'completion_date': study.request_datetime.strftime('%Y-%m-%d') if study.request_datetime else None,
            }
            completed_data.append(data)

        return Response({
            'status': 'success',
            'count': len(completed_data),
            'message': f'{len(completed_data)}건의 완료된 검사를 찾았습니다.',
            'data': completed_data
        })

    except Exception as e:
        print(f"완료된 스터디 목록 조회 에러: {e}")
        return Response({
            'status': 'error',
            'message': '완료된 검사 데이터를 불러오는데 실패했습니다.',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def completed_studies_by_patient(request, patient_id):
    """
    특정 환자의 완료된 모든 study 목록 반환 (환자 내원이력용)
    """
    try:
        study_completed_statuses = [
            '검사완료', 'completed', 'COMPLETED', 'Completed'
        ]
        report_completed_statuses = [
            '작성완료', 'completed', 'COMPLETED', 'Completed'  
        ]
        
        patient_studies = StudyRequest.objects.filter(
            patient_id=patient_id,
            study_status__in=study_completed_statuses,
            report_status__in=report_completed_statuses
        ).exclude(
            study_uid__isnull=True
        ).exclude(
            study_uid__exact=''
        ).order_by('-request_datetime')

        studies_data = []
        for study in patient_studies:
            data = {
                'id': study.id,
                'study_uid': study.study_uid,
                'accession_number': study.accession_number,
                'modality': study.modality,
                'body_part': study.body_part,
                'exam_date': study.request_datetime.strftime('%Y-%m-%d') if study.request_datetime else None,
                'exam_datetime': study.request_datetime.strftime('%Y-%m-%d %H:%M:%S') if study.request_datetime else None,
                'interpreting_physician': study.interpreting_physician,
                'requesting_physician': study.requesting_physician,
                'study_status': study.study_status,
                'report_status': study.report_status,
            }
            studies_data.append(data)

        return Response({
            'status': 'success',
            'patient_id': patient_id,
            'count': len(studies_data),
            'data': studies_data
        })

    except Exception as e:
        return Response({
            'status': 'error',
            'message': f'환자 {patient_id}의 검사 이력을 불러오는데 실패했습니다.',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def study_detail_for_viewer(request, study_uid):
    """
    DMViewer에서 특정 study 클릭시 필요한 모든 정보 반환
    (Orthanc DICOM 정보 + Django annotation 정보 + 리포트 정보)
    """
    try:
        # StudyRequest에서 기본 정보 조회
        study_request = StudyRequest.objects.get(study_uid=study_uid)
        
        # 기본 study 정보
        study_info = {
            'id': study_request.id,
            'patient_id': study_request.patient_id,
            'patient_name': study_request.patient_name,
            'birth_date': study_request.birth_date.strftime('%Y-%m-%d') if study_request.birth_date else None,
            'sex': study_request.sex,
            'study_uid': study_request.study_uid,
            'accession_number': study_request.accession_number,
            'modality': study_request.modality,
            'body_part': study_request.body_part,
            'exam_datetime': study_request.request_datetime.strftime('%Y-%m-%d %H:%M:%S') if study_request.request_datetime else None,
            'requesting_physician': study_request.requesting_physician,
            'interpreting_physician': study_request.interpreting_physician,
            'study_status': study_request.study_status,
            'report_status': study_request.report_status,
        }

        # TODO: 여기에 Orthanc에서 DICOM 이미지 정보 가져오는 로직 추가
        # orthanc_info = get_study_from_orthanc(study_uid)
        
        # TODO: 여기에 annotation 정보 가져오는 로직 추가 (dr_annotations 앱 활용)
        # annotations = get_annotations_for_study(study_uid)

        return Response({
            'status': 'success',
            'study_info': study_info,
            'has_images': bool(study_request.study_uid),  # study_uid가 있으면 이미지 존재
            'has_annotations': False,  # TODO: annotation 존재 여부 확인
            'has_report': study_request.report_status in ['작성완료', 'completed', 'COMPLETED', 'Completed'],
            # 'orthanc_info': orthanc_info,    # TODO: 구현 후 추가
            # 'annotations': annotations,       # TODO: 구현 후 추가
        })

    except StudyRequest.DoesNotExist:
        return Response({
            'status': 'error',
            'message': f'Study UID {study_uid}에 해당하는 검사를 찾을 수 없습니다.'
        }, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        return Response({
            'status': 'error',
            'message': '검사 상세 정보를 불러오는데 실패했습니다.',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)