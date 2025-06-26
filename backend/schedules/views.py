# # schedules/views.py - DateTime 처리 개선 + 의사 정보 문제 해결

# from rest_framework import viewsets, status
# from rest_framework.decorators import action, api_view
# from rest_framework.response import Response
# from datetime import datetime, date
# from django.utils import timezone
# from .models import ScheduleCommon, ScheduleRIS, PersonalSchedule, ExamRoom
# from .serializers import ScheduleCommonSerializer, ScheduleRISSerializer, PersonalScheduleSerializer, ExamRoomSerializer
# import logging

# logger = logging.getLogger(__name__)

# class ScheduleCommonViewSet(viewsets.ReadOnlyModelViewSet):
#     queryset = ScheduleCommon.objects.all().order_by('datetime')
#     serializer_class = ScheduleCommonSerializer

# class ScheduleRISViewSet(viewsets.ReadOnlyModelViewSet):
#     queryset = ScheduleRIS.objects.all().order_by('datetime')
#     serializer_class = ScheduleRISSerializer

# class PersonalScheduleViewSet(viewsets.ModelViewSet):
#     queryset = PersonalSchedule.objects.all()
#     serializer_class = PersonalScheduleSerializer
    
#     def get_queryset(self):
#         try:
#             doctor = self.get_current_doctor()
#             if doctor:
#                 return PersonalSchedule.objects.filter(doctor=doctor).order_by('datetime')
#             return PersonalSchedule.objects.none()
#         except Exception as e:
#             logger.error(f"Error in get_queryset: {e}")
#             return PersonalSchedule.objects.none()
    
#     # 🔧 의사 정보 조회 로직 개선
#     def get_current_doctor(self):
#         """현재 의사 정보 조회 - 여러 방법으로 시도"""
#         try:
#             from doctors.models import Doctor
            
#             # 방법 1: 첫 번째 의사 조회
#             doctor = Doctor.objects.first()
#             if doctor:
#                 logger.info(f"Doctor found: {doctor.name} (ID: {doctor.id})")
#                 return doctor
            
#             # 방법 2: 의사가 없으면 생성 (개발용)
#             logger.warning("No doctor found in database. Creating default doctor...")
#             doctor = Doctor.objects.create(
#                 name="기본의사",
#                 department="영상의학과",
#                 role="의사",
#                 status="온라인"
#             )
#             logger.info(f"Default doctor created: {doctor.name} (ID: {doctor.id})")
#             return doctor
            
#         except ImportError:
#             logger.error("doctors.models.Doctor import failed")
#             return None
#         except Exception as e:
#             logger.error(f"Error getting current doctor: {e}")
#             return None
    
#     def perform_create(self, serializer):
#         try:
#             doctor = self.get_current_doctor()
            
#             if not doctor:
#                 # 🔧 더 구체적인 에러 메시지와 함께 JSON 응답 반환
#                 from rest_framework.exceptions import ValidationError
#                 raise ValidationError({
#                     'error': '의사 정보를 찾을 수 없습니다.',
#                     'detail': 'Doctor 테이블에 데이터가 없거나 doctors 앱이 설정되지 않았습니다.',
#                     'suggestion': 'Django admin에서 Doctor 정보를 추가하거나 doctors 앱을 확인하세요.'
#                 })
            
#             # datetime 처리
#             datetime_str = self.request.data.get('datetime')
#             end_datetime_str = self.request.data.get('end_datetime')
            
#             # datetime 변환
#             if isinstance(datetime_str, str):
#                 try:
#                     dt = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
#                     if timezone.is_naive(dt):
#                         dt = timezone.make_aware(dt)
#                     datetime_value = dt
#                 except ValueError:
#                     # 다른 형식 시도
#                     dt = datetime.strptime(datetime_str, '%Y-%m-%dT%H:%M')
#                     datetime_value = timezone.make_aware(dt)
#             else:
#                 datetime_value = datetime_str
            
#             # end_datetime 처리
#             end_datetime_value = None
#             if end_datetime_str and end_datetime_str != '':
#                 try:
#                     if isinstance(end_datetime_str, str):
#                         end_dt = datetime.fromisoformat(end_datetime_str.replace('Z', '+00:00'))
#                         if timezone.is_naive(end_dt):
#                             end_dt = timezone.make_aware(end_dt)
#                         end_datetime_value = end_dt
#                     else:
#                         end_datetime_value = end_datetime_str
#                 except ValueError:
#                     try:
#                         end_dt = datetime.strptime(end_datetime_str, '%Y-%m-%dT%H:%M')
#                         end_datetime_value = timezone.make_aware(end_dt)
#                     except ValueError:
#                         logger.warning(f"Invalid end_datetime format: {end_datetime_str}")
#                         end_datetime_value = None
            
#             logger.info(f"Creating schedule - doctor: {doctor.name}, datetime: {datetime_value}, end_datetime: {end_datetime_value}")
            
#             serializer.save(
#                 doctor=doctor,
#                 datetime=datetime_value,
#                 end_datetime=end_datetime_value
#             )
            
#         except Exception as e:
#             logger.error(f"Error in perform_create: {e}")
#             logger.error(f"Request data: {self.request.data}")
#             raise
    
#     def perform_update(self, serializer):
#         try:
#             # 수정 시에도 동일한 datetime 처리
#             datetime_str = self.request.data.get('datetime')
#             end_datetime_str = self.request.data.get('end_datetime')
            
#             update_data = {}
            
#             if datetime_str:
#                 if isinstance(datetime_str, str):
#                     try:
#                         dt = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
#                         if timezone.is_naive(dt):
#                             dt = timezone.make_aware(dt)
#                         update_data['datetime'] = dt
#                     except ValueError:
#                         dt = datetime.strptime(datetime_str, '%Y-%m-%dT%H:%M')
#                         update_data['datetime'] = timezone.make_aware(dt)
            
#             if end_datetime_str == '' or end_datetime_str is None:
#                 update_data['end_datetime'] = None
#             elif end_datetime_str:
#                 try:
#                     if isinstance(end_datetime_str, str):
#                         end_dt = datetime.fromisoformat(end_datetime_str.replace('Z', '+00:00'))
#                         if timezone.is_naive(end_dt):
#                             end_dt = timezone.make_aware(end_dt)
#                         update_data['end_datetime'] = end_dt
#                 except ValueError:
#                     try:
#                         end_dt = datetime.strptime(end_datetime_str, '%Y-%m-%dT%H:%M')
#                         update_data['end_datetime'] = timezone.make_aware(end_dt)
#                     except ValueError:
#                         update_data['end_datetime'] = None
            
#             logger.info(f"Updating schedule {serializer.instance.id}: {update_data}")
#             serializer.save(**update_data)
            
#         except Exception as e:
#             logger.error(f"Error in perform_update: {e}")
#             raise
    
#     def create(self, request, *args, **kwargs):
#         try:
#             logger.info(f"POST request data: {request.data}")
            
#             # 기본 검증
#             if not request.data.get('title'):
#                 return Response({
#                     'error': '제목은 필수입니다.',
#                     'field': 'title'
#                 }, status=status.HTTP_400_BAD_REQUEST)
            
#             if not request.data.get('datetime'):
#                 return Response({
#                     'error': '날짜/시간은 필수입니다.',
#                     'field': 'datetime'
#                 }, status=status.HTTP_400_BAD_REQUEST)
            
#             return super().create(request, *args, **kwargs)
            
#         except Exception as e:
#             logger.error(f"Error in create: {e}")
#             return Response({
#                 'error': str(e),
#                 'type': 'create_error'
#             }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
#     @action(detail=False, methods=['get'])
#     def my_schedules(self, request):
#         try:
#             doctor = self.get_current_doctor()
            
#             if not doctor:
#                 return Response({
#                     'error': '의사 정보를 찾을 수 없습니다.',
#                     'suggestion': 'Doctor 정보를 생성하거나 확인하세요.'
#                 }, status=status.HTTP_404_NOT_FOUND)
            
#             schedules = PersonalSchedule.objects.filter(doctor=doctor).order_by('datetime')
#             serializer = self.get_serializer(schedules, many=True)
#             return Response(serializer.data)
            
#         except Exception as e:
#             logger.error(f"Error in my_schedules: {e}")
#             return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
#     @action(detail=False, methods=['get'])
#     def today_schedules(self, request):
#         try:
#             from datetime import date
            
#             doctor = self.get_current_doctor()
#             if not doctor:
#                 return Response({
#                     'error': '의사 정보를 찾을 수 없습니다.'
#                 }, status=status.HTTP_404_NOT_FOUND)
            
#             today = date.today()
#             schedules = PersonalSchedule.objects.filter(
#                 doctor=doctor,
#                 datetime__date=today
#             ).order_by('datetime')
            
#             serializer = self.get_serializer(schedules, many=True)
#             return Response(serializer.data)
            
#         except Exception as e:
#             logger.error(f"Error in today_schedules: {e}")
#             return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
#     @action(detail=False, methods=['get'], url_path='date/(?P<target_date>[^/.]+)')
#     def schedules_by_date(self, request, target_date=None):
#         try:
#             target_date = datetime.strptime(target_date, '%Y-%m-%d').date()
#             doctor = self.get_current_doctor()
            
#             if not doctor:
#                 return Response({
#                     'error': '의사 정보를 찾을 수 없습니다.'
#                 }, status=status.HTTP_404_NOT_FOUND)
            
#             # 전체 일정
#             common_schedules = ScheduleCommon.objects.filter(
#                 datetime__date=target_date
#             ).order_by('datetime')
            
#             # 부서 일정  
#             ris_schedules = ScheduleRIS.objects.filter(
#                 datetime__date=target_date
#             ).order_by('datetime')
            
#             # 개인 일정
#             personal_schedules = PersonalSchedule.objects.filter(
#                 doctor=doctor,
#                 datetime__date=target_date
#             ).order_by('datetime')
            
#             return Response({
#                 'date': target_date,
#                 'common_schedules': ScheduleCommonSerializer(common_schedules, many=True).data,
#                 'ris_schedules': ScheduleRISSerializer(ris_schedules, many=True).data,
#                 'personal_schedules': PersonalScheduleSerializer(personal_schedules, many=True).data
#             })
            
#         except ValueError as e:
#             logger.error(f"Invalid date format: {target_date}")
#             return Response({'error': '잘못된 날짜 형식입니다. YYYY-MM-DD 형식을 사용하세요.'}, status=status.HTTP_400_BAD_REQUEST)
#         except Exception as e:
#             logger.error(f"Error in schedules_by_date: {e}")
#             return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

#     @action(detail=False, methods=['get'], url_path='month/(?P<year>[^/.]+)/(?P<month>[^/.]+)')
#     def month_summary(self, request, year=None, month=None):
#         try:
#             from calendar import monthrange
            
#             doctor = self.get_current_doctor()
#             if not doctor:
#                 return Response({
#                     'error': '의사 정보를 찾을 수 없습니다.'
#                 }, status=status.HTTP_404_NOT_FOUND)
            
#             year, month = int(year), int(month)
            
#             if month < 1 or month > 12:
#                 return Response({'error': '잘못된 월입니다.'}, status=status.HTTP_400_BAD_REQUEST)
                
#             if year < 2000 or year > 2100:
#                 return Response({'error': '잘못된 년도입니다.'}, status=status.HTTP_400_BAD_REQUEST)
            
#             month_data = {}
#             _, last_day = monthrange(year, month)
            
#             for day in range(1, last_day + 1):
#                 target_date = date(year, month, day)
                
#                 common_count = ScheduleCommon.objects.filter(datetime__date=target_date).count()
#                 ris_count = ScheduleRIS.objects.filter(datetime__date=target_date).count()
#                 personal_count = PersonalSchedule.objects.filter(
#                     doctor=doctor, datetime__date=target_date
#                 ).count()
                
#                 if common_count > 0 or ris_count > 0 or personal_count > 0:
#                     month_data[str(day)] = {
#                         'common': common_count,
#                         'ris': ris_count,
#                         'personal': personal_count,
#                         'total': common_count + ris_count + personal_count
#                     }
            
#             return Response({
#                 'year': year,
#                 'month': month,
#                 'schedules': month_data
#             })
            
#         except ValueError as e:
#             logger.error(f"Invalid year/month: {year}/{month}")
#             return Response({'error': '잘못된 년도/월 형식입니다.'}, status=status.HTTP_400_BAD_REQUEST)
#         except Exception as e:
#             logger.error(f"Error in month_summary: {e}")
#             return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

# class ExamRoomViewSet(viewsets.ReadOnlyModelViewSet):
#     """검사실 목록 API (읽기 전용)"""
#     queryset = ExamRoom.objects.filter(is_active=True).order_by('room_id')
#     serializer_class = ExamRoomSerializer
    
#     @action(detail=False, methods=['get'])
#     def active_rooms(self, request):
#         """활성화된 검사실만 조회"""
#         rooms = ExamRoom.objects.filter(is_active=True).order_by('room_id')
#         serializer = self.get_serializer(rooms, many=True)
#         return Response(serializer.data)


# # 🆕 검사실별 스케줄 API 추가
# @api_view(['GET'])
# def get_room_schedules(request):
#     """
#     검사실별 스케줄 조회 API
#     GET /api/schedules/room-schedules/?date=2025-06-23&rooms=1,2,3
#     """
#     try:
#         from worklists.models import StudyRequest
        
#         # 날짜 파라미터 (기본값: 오늘)
#         date_param = request.GET.get('date', timezone.now().date())
#         if isinstance(date_param, str):
#             target_date = datetime.strptime(date_param, '%Y-%m-%d').date()
#         else:
#             target_date = date_param
        
#         # 검사실 필터 (옵션)
#         rooms_param = request.GET.get('rooms')  # "1,2,3" 형태
#         room_ids = None
#         if rooms_param:
#             room_ids = [int(x.strip()) for x in rooms_param.split(',') if x.strip().isdigit()]
        
#         # 해당 날짜의 배정된 검사들 조회
#         query = StudyRequest.objects.filter(
#             scheduled_exam_datetime__date=target_date,
#             study_status__in=['검사대기', '검사중', '검사완료'],
#             assigned_room__isnull=False
#         ).select_related('assigned_room', 'assigned_radiologist')
        
#         # 검사실 필터 적용
#         if room_ids:
#             query = query.filter(assigned_room__id__in=room_ids)
        
#         schedules = query.order_by('scheduled_exam_datetime')
        
#         # 검사실별로 그룹화
#         room_schedules = {}
#         for schedule in schedules:
#             room_id = str(schedule.assigned_room.id)  # 문자열로 변환
            
#             if room_id not in room_schedules:
#                 room_schedules[room_id] = []
            
#             # 시간 계산
#             start_time = schedule.scheduled_exam_datetime.strftime('%H:%M')
#             duration = schedule.estimated_duration or 30
            
#             room_schedules[room_id].append({
#                 'examId': schedule.id,
#                 'patientName': schedule.patient_name,
#                 'examType': f"{schedule.body_part} {schedule.modality}",
#                 'time': start_time,
#                 'duration': duration,
#                 'status': schedule.study_status,
#                 'radiologistId': schedule.assigned_radiologist.id if schedule.assigned_radiologist else None,
#                 'radiologistName': schedule.assigned_radiologist.name if schedule.assigned_radiologist else None,
#                 'roomId': schedule.assigned_room.id,
#                 'roomName': schedule.assigned_room.name,
#                 'scheduledDateTime': schedule.scheduled_exam_datetime.isoformat(),
#                 'patientId': schedule.patient_id,
#                 'priority': getattr(schedule, 'priority', '일반')
#             })
        
#         logger.info(f"Room schedules loaded for date {target_date}: {len(schedules)} total schedules")
        
#         return Response({
#             'date': target_date,
#             'room_schedules': room_schedules,
#             'total_count': len(schedules)
#         })
        
#     except ValueError as e:
#         logger.error(f"Invalid date format: {date_param}")
#         return Response(
#             {'error': '잘못된 날짜 형식입니다. YYYY-MM-DD 형식을 사용하세요.'}, 
#             status=status.HTTP_400_BAD_REQUEST
#         )
#     except Exception as e:
#         logger.error(f"Error in get_room_schedules: {e}")
#         return Response(
#             {'error': f'스케줄 조회 중 오류가 발생했습니다: {str(e)}'}, 
#             status=status.HTTP_500_INTERNAL_SERVER_ERROR
#         )


# @api_view(['GET'])
# def get_room_schedules_summary(request):
#     """
#     검사실별 스케줄 요약 정보
#     GET /api/schedules/room-schedules-summary/?date=2025-06-23
#     """
#     try:
#         from worklists.models import StudyRequest
#         from django.db.models import Count, Q
        
#         # 날짜 파라미터
#         date_param = request.GET.get('date', timezone.now().date())
#         if isinstance(date_param, str):
#             target_date = datetime.strptime(date_param, '%Y-%m-%d').date()
#         else:
#             target_date = date_param
        
#         # 검사실별 스케줄 통계
#         room_stats = StudyRequest.objects.filter(
#             scheduled_exam_datetime__date=target_date,
#             assigned_room__isnull=False
#         ).values(
#             'assigned_room__id', 
#             'assigned_room__name',
#             'assigned_room__room_type'
#         ).annotate(
#             total_count=Count('id'),
#             waiting_count=Count('id', filter=Q(study_status='검사대기')),
#             in_progress_count=Count('id', filter=Q(study_status='검사중')),
#             completed_count=Count('id', filter=Q(study_status='검사완료'))
#         ).order_by('assigned_room__id')
        
#         return Response({
#             'date': target_date,
#             'room_statistics': list(room_stats)
#         })
        
#     except Exception as e:
#         logger.error(f"Error in get_room_schedules_summary: {e}")
#         return Response(
#             {'error': f'스케줄 요약 조회 중 오류가 발생했습니다: {str(e)}'}, 
#             status=status.HTTP_500_INTERNAL_SERVER_ERROR
#         )
# from django.http import JsonResponse        
# def get_month_schedules_summary(request, year, month):
#     # 예시 응답
#     return JsonResponse({
#         'status': 'success',
#         'year': year,
#         'month': month,
#         'appointments': [],  # 또는 실제 데이터
#     })


# schedules/views.py - DateTime 처리 개선 + 검사실 스케줄 API 추가

# from rest_framework import viewsets, status
# from rest_framework.decorators import action, api_view
# from rest_framework.response import Response
# from datetime import datetime, date
# from django.utils import timezone
# from .models import ScheduleCommon, ScheduleRIS, PersonalSchedule, ExamRoom
# from .serializers import ScheduleCommonSerializer, ScheduleRISSerializer, PersonalScheduleSerializer, ExamRoomSerializer
# import logging

# logger = logging.getLogger(__name__)

# class ScheduleCommonViewSet(viewsets.ReadOnlyModelViewSet):
#     queryset = ScheduleCommon.objects.all().order_by('datetime')
#     serializer_class = ScheduleCommonSerializer

# class ScheduleRISViewSet(viewsets.ReadOnlyModelViewSet):
#     queryset = ScheduleRIS.objects.all().order_by('datetime')
#     serializer_class = ScheduleRISSerializer

# class PersonalScheduleViewSet(viewsets.ModelViewSet):
#     queryset = PersonalSchedule.objects.all()
#     serializer_class = PersonalScheduleSerializer
    
#     def get_queryset(self):
#         try:
#             from doctors.models import Doctor
#             doctor = Doctor.objects.first()
#             if doctor:
#                 return PersonalSchedule.objects.filter(doctor=doctor).order_by('datetime')
#             return PersonalSchedule.objects.none()
#         except Exception as e:
#             logger.error(f"Error in get_queryset: {e}")
#             return PersonalSchedule.objects.none()
    
#     def perform_create(self, serializer):
#         try:
#             from doctors.models import Doctor
#             doctor = Doctor.objects.first()
            
#             if not doctor:
#                 raise ValueError("의사 정보를 찾을 수 없습니다.")
            
#             # datetime 처리
#             datetime_str = self.request.data.get('datetime')
#             end_datetime_str = self.request.data.get('end_datetime')
            
#             # datetime 변환
#             if isinstance(datetime_str, str):
#                 try:
#                     dt = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
#                     if timezone.is_naive(dt):
#                         dt = timezone.make_aware(dt)
#                     datetime_value = dt
#                 except ValueError:
#                     # 다른 형식 시도
#                     dt = datetime.strptime(datetime_str, '%Y-%m-%dT%H:%M')
#                     datetime_value = timezone.make_aware(dt)
#             else:
#                 datetime_value = datetime_str
            
#             # end_datetime 처리
#             end_datetime_value = None
#             if end_datetime_str and end_datetime_str != '':
#                 try:
#                     if isinstance(end_datetime_str, str):
#                         end_dt = datetime.fromisoformat(end_datetime_str.replace('Z', '+00:00'))
#                         if timezone.is_naive(end_dt):
#                             end_dt = timezone.make_aware(end_dt)
#                         end_datetime_value = end_dt
#                     else:
#                         end_datetime_value = end_datetime_str
#                 except ValueError:
#                     try:
#                         end_dt = datetime.strptime(end_datetime_str, '%Y-%m-%dT%H:%M')
#                         end_datetime_value = timezone.make_aware(end_dt)
#                     except ValueError:
#                         logger.warning(f"Invalid end_datetime format: {end_datetime_str}")
#                         end_datetime_value = None
            
#             logger.info(f"Creating schedule - datetime: {datetime_value}, end_datetime: {end_datetime_value}")
            
#             serializer.save(
#                 doctor=doctor,
#                 datetime=datetime_value,
#                 end_datetime=end_datetime_value
#             )
            
#         except Exception as e:
#             logger.error(f"Error in perform_create: {e}")
#             logger.error(f"Request data: {self.request.data}")
#             raise
    
#     def perform_update(self, serializer):
#         try:
#             # 수정 시에도 동일한 datetime 처리
#             datetime_str = self.request.data.get('datetime')
#             end_datetime_str = self.request.data.get('end_datetime')
            
#             update_data = {}
            
#             if datetime_str:
#                 if isinstance(datetime_str, str):
#                     try:
#                         dt = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
#                         if timezone.is_naive(dt):
#                             dt = timezone.make_aware(dt)
#                         update_data['datetime'] = dt
#                     except ValueError:
#                         dt = datetime.strptime(datetime_str, '%Y-%m-%dT%H:%M')
#                         update_data['datetime'] = timezone.make_aware(dt)
            
#             if end_datetime_str == '' or end_datetime_str is None:
#                 update_data['end_datetime'] = None
#             elif end_datetime_str:
#                 try:
#                     if isinstance(end_datetime_str, str):
#                         end_dt = datetime.fromisoformat(end_datetime_str.replace('Z', '+00:00'))
#                         if timezone.is_naive(end_dt):
#                             end_dt = timezone.make_aware(end_dt)
#                         update_data['end_datetime'] = end_dt
#                 except ValueError:
#                     try:
#                         end_dt = datetime.strptime(end_datetime_str, '%Y-%m-%dT%H:%M')
#                         update_data['end_datetime'] = timezone.make_aware(end_dt)
#                     except ValueError:
#                         update_data['end_datetime'] = None
            
#             logger.info(f"Updating schedule {serializer.instance.id}: {update_data}")
#             serializer.save(**update_data)
            
#         except Exception as e:
#             logger.error(f"Error in perform_update: {e}")
#             raise
    
#     def create(self, request, *args, **kwargs):
#         try:
#             logger.info(f"POST request data: {request.data}")
            
#             # 기본 검증
#             if not request.data.get('title'):
#                 return Response({'error': '제목은 필수입니다.'}, status=status.HTTP_400_BAD_REQUEST)
            
#             if not request.data.get('datetime'):
#                 return Response({'error': '날짜/시간은 필수입니다.'}, status=status.HTTP_400_BAD_REQUEST)
            
#             return super().create(request, *args, **kwargs)
            
#         except Exception as e:
#             logger.error(f"Error in create: {e}")
#             return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
#     @action(detail=False, methods=['get'])
#     def my_schedules(self, request):
#         try:
#             from doctors.models import Doctor
#             doctor = Doctor.objects.first()
            
#             if not doctor:
#                 return Response({'error': '의사 정보를 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
            
#             schedules = PersonalSchedule.objects.filter(doctor=doctor).order_by('datetime')
#             serializer = self.get_serializer(schedules, many=True)
#             return Response(serializer.data)
            
#         except Exception as e:
#             logger.error(f"Error in my_schedules: {e}")
#             return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
#     @action(detail=False, methods=['get'])
#     def today_schedules(self, request):
#         try:
#             from datetime import date
#             from doctors.models import Doctor
            
#             doctor = Doctor.objects.first()
#             if not doctor:
#                 return Response({'error': '의사 정보를 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
            
#             today = date.today()
#             schedules = PersonalSchedule.objects.filter(
#                 doctor=doctor,
#                 datetime__date=today
#             ).order_by('datetime')
            
#             serializer = self.get_serializer(schedules, many=True)
#             return Response(serializer.data)
            
#         except Exception as e:
#             logger.error(f"Error in today_schedules: {e}")
#             return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
#     @action(detail=False, methods=['get'], url_path='date/(?P<target_date>[^/.]+)')
#     def schedules_by_date(self, request, target_date=None):
#         try:
#             target_date = datetime.strptime(target_date, '%Y-%m-%d').date()
#             from doctors.models import Doctor
#             doctor = Doctor.objects.first()
            
#             if not doctor:
#                 return Response({'error': '의사 정보를 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
            
#             # 전체 일정
#             common_schedules = ScheduleCommon.objects.filter(
#                 datetime__date=target_date
#             ).order_by('datetime')
            
#             # 부서 일정  
#             ris_schedules = ScheduleRIS.objects.filter(
#                 datetime__date=target_date
#             ).order_by('datetime')
            
#             # 개인 일정
#             personal_schedules = PersonalSchedule.objects.filter(
#                 doctor=doctor,
#                 datetime__date=target_date
#             ).order_by('datetime')
            
#             return Response({
#                 'date': target_date,
#                 'common_schedules': ScheduleCommonSerializer(common_schedules, many=True).data,
#                 'ris_schedules': ScheduleRISSerializer(ris_schedules, many=True).data,
#                 'personal_schedules': PersonalScheduleSerializer(personal_schedules, many=True).data
#             })
            
#         except ValueError as e:
#             logger.error(f"Invalid date format: {target_date}")
#             return Response({'error': '잘못된 날짜 형식입니다. YYYY-MM-DD 형식을 사용하세요.'}, status=status.HTTP_400_BAD_REQUEST)
#         except Exception as e:
#             logger.error(f"Error in schedules_by_date: {e}")
#             return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

#     @action(detail=False, methods=['get'], url_path='month/(?P<year>[^/.]+)/(?P<month>[^/.]+)')
#     def month_summary(self, request, year=None, month=None):
#         try:
#             from doctors.models import Doctor
#             from calendar import monthrange
            
#             doctor = Doctor.objects.first()
#             if not doctor:
#                 return Response({'error': '의사 정보를 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
            
#             year, month = int(year), int(month)
            
#             if month < 1 or month > 12:
#                 return Response({'error': '잘못된 월입니다.'}, status=status.HTTP_400_BAD_REQUEST)
                
#             if year < 2000 or year > 2100:
#                 return Response({'error': '잘못된 년도입니다.'}, status=status.HTTP_400_BAD_REQUEST)
            
#             month_data = {}
#             _, last_day = monthrange(year, month)
            
#             for day in range(1, last_day + 1):
#                 target_date = date(year, month, day)
                
#                 common_count = ScheduleCommon.objects.filter(datetime__date=target_date).count()
#                 ris_count = ScheduleRIS.objects.filter(datetime__date=target_date).count()
#                 personal_count = PersonalSchedule.objects.filter(
#                     doctor=doctor, datetime__date=target_date
#                 ).count()
                
#                 if common_count > 0 or ris_count > 0 or personal_count > 0:
#                     month_data[str(day)] = {
#                         'common': common_count,
#                         'ris': ris_count,
#                         'personal': personal_count,
#                         'total': common_count + ris_count + personal_count
#                     }
            
#             return Response({
#                 'year': year,
#                 'month': month,
#                 'schedules': month_data
#             })
            
#         except ValueError as e:
#             logger.error(f"Invalid year/month: {year}/{month}")
#             return Response({'error': '잘못된 년도/월 형식입니다.'}, status=status.HTTP_400_BAD_REQUEST)
#         except Exception as e:
#             logger.error(f"Error in month_summary: {e}")
#             return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

# class ExamRoomViewSet(viewsets.ReadOnlyModelViewSet):
#     """검사실 목록 API (읽기 전용)"""
#     queryset = ExamRoom.objects.filter(is_active=True).order_by('room_id')
#     serializer_class = ExamRoomSerializer
    
#     @action(detail=False, methods=['get'])
#     def active_rooms(self, request):
#         """활성화된 검사실만 조회"""
#         rooms = ExamRoom.objects.filter(is_active=True).order_by('room_id')
#         serializer = self.get_serializer(rooms, many=True)
#         return Response(serializer.data)


# # 🆕 검사실별 스케줄 API 추가 (디버깅 강화)
# @api_view(['GET'])
# def get_room_schedules(request):
#     """
#     검사실별 스케줄 조회 API
#     GET /api/schedules/room-schedules/?date=2025-06-23&rooms=1,2,3
#     """
#     try:
#         from worklists.models import StudyRequest
        
#         # 날짜 파라미터 (기본값: 오늘)
#         date_param = request.GET.get('date', timezone.now().date())
#         if isinstance(date_param, str):
#             target_date = datetime.strptime(date_param, '%Y-%m-%d').date()
#         else:
#             target_date = date_param
        
#         print(f"🔍 target_date: {target_date}")
        
#         # 검사실 필터 (옵션)
#         rooms_param = request.GET.get('rooms')  # "1,2,3" 형태
#         room_ids = None
#         if rooms_param:
#             room_ids = [int(x.strip()) for x in rooms_param.split(',') if x.strip().isdigit()]
        
#         # 해당 날짜의 배정된 검사들 조회
#         query = StudyRequest.objects.filter(
#             scheduled_exam_datetime__date=target_date,
#             study_status__in=['검사대기', '검사중', '검사완료'],
#             assigned_room__isnull=False
#         ).select_related('assigned_room', 'assigned_radiologist')
        
#         # 검사실 필터 적용
#         if room_ids:
#             query = query.filter(assigned_room__id__in=room_ids)
        
#         schedules = query.order_by('scheduled_exam_datetime')
        
#         print(f"🔍 조회된 스케줄 수: {schedules.count()}")
        
#         # 검사실별로 그룹화
#         room_schedules = {}
#         for schedule in schedules:
#             print(f"🔍 처리 중인 스케줄:")
#             print(f"  - 환자: {schedule.patient_name}")
#             print(f"  - scheduled_exam_datetime: {schedule.scheduled_exam_datetime}")
#             print(f"  - scheduled_exam_datetime type: {type(schedule.scheduled_exam_datetime)}")
#             print(f"  - timezone: {schedule.scheduled_exam_datetime.tzinfo}")
            
#             room_id = str(schedule.assigned_room.id)  # 문자열로 변환
            
#             if room_id not in room_schedules:
#                 room_schedules[room_id] = []
            
#             # 🔍 시간 계산 디버깅
#             raw_datetime = schedule.scheduled_exam_datetime
#             start_time = raw_datetime.strftime('%H:%M')
            
#             print(f"  - raw_datetime: {raw_datetime}")
#             print(f"  - start_time (strftime): {start_time}")
            
#             # 🔧 시간대 변환 시도
#             from django.utils import timezone as django_timezone
#             if raw_datetime.tzinfo:
#                 local_time = django_timezone.localtime(raw_datetime)
#                 local_start_time = local_time.strftime('%H:%M')
#                 print(f"  - local_time: {local_time}")
#                 print(f"  - local_start_time: {local_start_time}")
#             else:
#                 local_start_time = start_time
#                 print(f"  - no timezone info, using original")
            
#             duration = schedule.estimated_duration or 30
            
#             room_schedules[room_id].append({
#                 'examId': schedule.id,
#                 'patientName': schedule.patient_name,
#                 'examType': f"{schedule.body_part} {schedule.modality}",
#                 'time': local_start_time,  # 🔧 로컬 시간 사용
#                 'duration': duration,
#                 'status': schedule.study_status,
#                 'radiologistId': schedule.assigned_radiologist.id if schedule.assigned_radiologist else None,
#                 'radiologistName': schedule.assigned_radiologist.name if schedule.assigned_radiologist else None,
#                 'roomId': schedule.assigned_room.id,
#                 'roomName': schedule.assigned_room.name,
#                 'scheduledDateTime': local_time.isoformat(),  # 🔧 로컬 시간으로 변환
#                 'patientId': schedule.patient_id,
#                 'priority': getattr(schedule, 'priority', '일반')
#             })
            
#             print(f"  - 최종 time 값: {local_start_time}")
#             print("=" * 50)
        
#         logger.info(f"Room schedules loaded for date {target_date}: {len(schedules)} total schedules")
        
#         return Response({
#             'date': target_date,
#             'room_schedules': room_schedules,
#             'total_count': len(schedules)
#         })
        
#     except ValueError as e:
#         logger.error(f"Invalid date format: {date_param}")
#         return Response(
#             {'error': '잘못된 날짜 형식입니다. YYYY-MM-DD 형식을 사용하세요.'}, 
#             status=status.HTTP_400_BAD_REQUEST
#         )
#     except Exception as e:
#         logger.error(f"Error in get_room_schedules: {e}")
#         return Response(
#             {'error': f'스케줄 조회 중 오류가 발생했습니다: {str(e)}'}, 
#             status=status.HTTP_500_INTERNAL_SERVER_ERROR
#         )


# @api_view(['GET'])
# def get_room_schedules_summary(request):
#     """
#     검사실별 스케줄 요약 정보
#     GET /api/schedules/room-schedules-summary/?date=2025-06-23
#     """
#     try:
#         from worklists.models import StudyRequest
#         from django.db.models import Count
        
#         # 날짜 파라미터
#         date_param = request.GET.get('date', timezone.now().date())
#         if isinstance(date_param, str):
#             target_date = datetime.strptime(date_param, '%Y-%m-%d').date()
#         else:
#             target_date = date_param
        
#         # 검사실별 스케줄 통계
#         room_stats = StudyRequest.objects.filter(
#             scheduled_exam_datetime__date=target_date,
#             assigned_room__isnull=False
#         ).values(
#             'assigned_room__id', 
#             'assigned_room__name',
#             'assigned_room__room_type'
#         ).annotate(
#             total_count=Count('id'),
#             waiting_count=Count('id', filter=models.Q(study_status='검사대기')),
#             in_progress_count=Count('id', filter=models.Q(study_status='검사중')),
#             completed_count=Count('id', filter=models.Q(study_status='검사완료'))
#         ).order_by('assigned_room__id')
        
#         return Response({
#             'date': target_date,
#             'room_statistics': list(room_stats)
#         })
        
#     except Exception as e:
#         logger.error(f"Error in get_room_schedules_summary: {e}")
#         return Response(
#             {'error': f'스케줄 요약 조회 중 오류가 발생했습니다: {str(e)}'}, 
#             status=status.HTTP_500_INTERNAL_SERVER_ERROR
#         )

# backend/schedules/views.py - 시간 처리 수정

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from datetime import datetime, date
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.db.models import Count, Q
from .models import ScheduleCommon, ScheduleRIS, PersonalSchedule, ExamRoom
from .serializers import ScheduleCommonSerializer, ScheduleRISSerializer, PersonalScheduleSerializer, ExamRoomSerializer
import logging

logger = logging.getLogger(__name__)

# 누락된 ViewSet들 추가
class ScheduleCommonViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ScheduleCommon.objects.all().order_by('datetime')
    serializer_class = ScheduleCommonSerializer

class ScheduleRISViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ScheduleRIS.objects.all().order_by('datetime')
    serializer_class = ScheduleRISSerializer

class ExamRoomViewSet(viewsets.ReadOnlyModelViewSet):
    """검사실 목록 API (읽기 전용)"""
    queryset = ExamRoom.objects.filter(is_active=True).order_by('room_id')
    serializer_class = ExamRoomSerializer
    
    @action(detail=False, methods=['get'])
    def active_rooms(self, request):
        """활성화된 검사실만 조회"""
        rooms = ExamRoom.objects.filter(is_active=True).order_by('room_id')
        serializer = self.get_serializer(rooms, many=True)
        return Response(serializer.data)

class PersonalScheduleViewSet(viewsets.ModelViewSet):
    queryset = PersonalSchedule.objects.all()
    serializer_class = PersonalScheduleSerializer
    
    def get_queryset(self):
        try:
            from doctors.models import Doctor
            doctor = Doctor.objects.first()
            if doctor:
                return PersonalSchedule.objects.filter(doctor=doctor).order_by('datetime')
            return PersonalSchedule.objects.none()
        except Exception as e:
            logger.error(f"Error in get_queryset: {e}")
            return PersonalSchedule.objects.none()
    
    def perform_create(self, serializer):
        try:
            from doctors.models import Doctor
            doctor = Doctor.objects.first()
            
            if not doctor:
                raise ValueError("의사 정보를 찾을 수 없습니다.")
            
            # 🔧 시간 처리 개선
            datetime_str = self.request.data.get('datetime')
            end_datetime_str = self.request.data.get('end_datetime')
            
            logger.info(f"🕐 받은 datetime: {datetime_str} (type: {type(datetime_str)})")
            logger.info(f"🕐 받은 end_datetime: {end_datetime_str} (type: {type(end_datetime_str)})")
            
            # datetime 처리 - naive datetime으로 받아서 Django 설정 시간대로 해석
            datetime_value = None
            if datetime_str:
                try:
                    # 🔧 parse_datetime 사용 (Django 권장)
                    datetime_value = parse_datetime(datetime_str)
                    
                    if datetime_value is None:
                        # 수동 파싱 시도
                        if 'T' in datetime_str:
                            datetime_value = datetime.fromisoformat(datetime_str.replace('Z', ''))
                        else:
                            datetime_value = datetime.strptime(datetime_str, '%Y-%m-%d %H:%M:%S')
                    
                    # 🔧 중요: naive datetime이면 현재 시간대(Asia/Seoul)로 인식
                    if datetime_value and timezone.is_naive(datetime_value):
                        datetime_value = timezone.make_aware(datetime_value)
                    
                    logger.info(f"🕐 변환된 datetime: {datetime_value} (timezone: {datetime_value.tzinfo})")
                    
                except (ValueError, TypeError) as e:
                    logger.error(f"datetime 파싱 오류: {e}")
                    raise ValueError(f"올바르지 않은 datetime 형식: {datetime_str}")
            
            # end_datetime 처리
            end_datetime_value = None
            if end_datetime_str and end_datetime_str != '':
                try:
                    end_datetime_value = parse_datetime(end_datetime_str)
                    
                    if end_datetime_value is None and 'T' in end_datetime_str:
                        end_datetime_value = datetime.fromisoformat(end_datetime_str.replace('Z', ''))
                    
                    if end_datetime_value and timezone.is_naive(end_datetime_value):
                        end_datetime_value = timezone.make_aware(end_datetime_value)
                    
                    logger.info(f"🕐 변환된 end_datetime: {end_datetime_value}")
                    
                except (ValueError, TypeError) as e:
                    logger.error(f"end_datetime 파싱 오류: {e}")
                    end_datetime_value = None
            
            # 저장
            serializer.save(
                doctor=doctor,
                datetime=datetime_value,
                end_datetime=end_datetime_value
            )
            
            logger.info(f"🕐 저장 완료: {datetime_value}")
            
        except Exception as e:
            logger.error(f"Error in perform_create: {e}")
            logger.error(f"Request data: {self.request.data}")
            raise
    
    def perform_update(self, serializer):
        try:
            datetime_str = self.request.data.get('datetime')
            end_datetime_str = self.request.data.get('end_datetime')
            
            logger.info(f"🕐 수정 - datetime: {datetime_str}")
            logger.info(f"🕐 수정 - end_datetime: {end_datetime_str}")
            
            update_data = {}
            
            # datetime 처리
            if datetime_str:
                try:
                    datetime_value = parse_datetime(datetime_str)
                    
                    if datetime_value is None and 'T' in datetime_str:
                        datetime_value = datetime.fromisoformat(datetime_str.replace('Z', ''))
                    
                    if datetime_value and timezone.is_naive(datetime_value):
                        datetime_value = timezone.make_aware(datetime_value)
                    
                    update_data['datetime'] = datetime_value
                    logger.info(f"🕐 수정된 datetime: {datetime_value}")
                    
                except (ValueError, TypeError) as e:
                    logger.error(f"datetime 수정 파싱 오류: {e}")
            
            # end_datetime 처리
            if end_datetime_str == '' or end_datetime_str is None:
                update_data['end_datetime'] = None
            elif end_datetime_str:
                try:
                    end_datetime_value = parse_datetime(end_datetime_str)
                    
                    if end_datetime_value is None and 'T' in end_datetime_str:
                        end_datetime_value = datetime.fromisoformat(end_datetime_str.replace('Z', ''))
                    
                    if end_datetime_value and timezone.is_naive(end_datetime_value):
                        end_datetime_value = timezone.make_aware(end_datetime_value)
                    
                    update_data['end_datetime'] = end_datetime_value
                    logger.info(f"🕐 수정된 end_datetime: {end_datetime_value}")
                    
                except (ValueError, TypeError) as e:
                    logger.error(f"end_datetime 수정 파싱 오류: {e}")
                    update_data['end_datetime'] = None
            
            serializer.save(**update_data)
            
        except Exception as e:
            logger.error(f"Error in perform_update: {e}")
            raise

    def create(self, request, *args, **kwargs):
        try:
            logger.info(f"🕐 POST request data: {request.data}")
            
            # 기본 검증
            if not request.data.get('title'):
                return Response({'error': '제목은 필수입니다.'}, status=status.HTTP_400_BAD_REQUEST)
            
            if not request.data.get('datetime'):
                return Response({'error': '날짜/시간은 필수입니다.'}, status=status.HTTP_400_BAD_REQUEST)
            
            return super().create(request, *args, **kwargs)
            
        except Exception as e:
            logger.error(f"Error in create: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    @action(detail=False, methods=['get'])
    def my_schedules(self, request):
        try:
            from doctors.models import Doctor
            doctor = Doctor.objects.first()
            
            if not doctor:
                return Response({'error': '의사 정보를 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
            
            schedules = PersonalSchedule.objects.filter(doctor=doctor).order_by('datetime')
            serializer = self.get_serializer(schedules, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error in my_schedules: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    @action(detail=False, methods=['get'])
    def today_schedules(self, request):
        try:
            from datetime import date
            from doctors.models import Doctor
            
            doctor = Doctor.objects.first()
            if not doctor:
                return Response({'error': '의사 정보를 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
            
            today = date.today()
            schedules = PersonalSchedule.objects.filter(
                doctor=doctor,
                datetime__date=today
            ).order_by('datetime')
            
            serializer = self.get_serializer(schedules, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error in today_schedules: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='date/(?P<target_date>[^/.]+)')
    def schedules_by_date(self, request, target_date=None):
        try:
            target_date = datetime.strptime(target_date, '%Y-%m-%d').date()
            from doctors.models import Doctor
            doctor = Doctor.objects.first()
            
            if not doctor:
                return Response({'error': '의사 정보를 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
            
            # 전체 일정
            common_schedules = ScheduleCommon.objects.filter(
                datetime__date=target_date
            ).order_by('datetime')
            
            # 부서 일정  
            ris_schedules = ScheduleRIS.objects.filter(
                datetime__date=target_date
            ).order_by('datetime')
            
            # 개인 일정
            personal_schedules = PersonalSchedule.objects.filter(
                doctor=doctor,
                datetime__date=target_date
            ).order_by('datetime')
            
            return Response({
                'date': target_date,
                'common_schedules': ScheduleCommonSerializer(common_schedules, many=True).data,
                'ris_schedules': ScheduleRISSerializer(ris_schedules, many=True).data,
                'personal_schedules': PersonalScheduleSerializer(personal_schedules, many=True).data
            })
            
        except ValueError as e:
            logger.error(f"Invalid date format: {target_date}")
            return Response({'error': '잘못된 날짜 형식입니다. YYYY-MM-DD 형식을 사용하세요.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error in schedules_by_date: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='month/(?P<year>[^/.]+)/(?P<month>[^/.]+)')
    def month_summary(self, request, year=None, month=None):
        try:
            from doctors.models import Doctor
            from calendar import monthrange
            
            doctor = Doctor.objects.first()
            if not doctor:
                return Response({'error': '의사 정보를 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
            
            year, month = int(year), int(month)
            
            if month < 1 or month > 12:
                return Response({'error': '잘못된 월입니다.'}, status=status.HTTP_400_BAD_REQUEST)
                
            if year < 2000 or year > 2100:
                return Response({'error': '잘못된 년도입니다.'}, status=status.HTTP_400_BAD_REQUEST)
            
            month_data = {}
            _, last_day = monthrange(year, month)
            
            for day in range(1, last_day + 1):
                target_date = date(year, month, day)
                
                common_count = ScheduleCommon.objects.filter(datetime__date=target_date).count()
                ris_count = ScheduleRIS.objects.filter(datetime__date=target_date).count()
                personal_count = PersonalSchedule.objects.filter(
                    doctor=doctor, datetime__date=target_date
                ).count()
                
                if common_count > 0 or ris_count > 0 or personal_count > 0:
                    month_data[str(day)] = {
                        'common': common_count,
                        'ris': ris_count,
                        'personal': personal_count,
                        'total': common_count + ris_count + personal_count
                    }
            
            return Response({
                'year': year,
                'month': month,
                'schedules': month_data
            })
            
        except ValueError as e:
            logger.error(f"Invalid year/month: {year}/{month}")
            return Response({'error': '잘못된 년도/월 형식입니다.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error in month_summary: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 검사실별 스케줄 API
@api_view(['GET'])
def get_room_schedules(request):
    """
    검사실별 스케줄 조회 API
    GET /api/schedules/room-schedules/?date=2025-06-23&rooms=1,2,3
    """
    try:
        from worklists.models import StudyRequest
        
        # 날짜 파라미터 (기본값: 오늘)
        date_param = request.GET.get('date', timezone.now().date())
        if isinstance(date_param, str):
            target_date = datetime.strptime(date_param, '%Y-%m-%d').date()
        else:
            target_date = date_param
        
        # 검사실 필터 (옵션)
        rooms_param = request.GET.get('rooms')
        room_ids = None
        if rooms_param:
            room_ids = [int(x.strip()) for x in rooms_param.split(',') if x.strip().isdigit()]
        
        # 해당 날짜의 배정된 검사들 조회
        query = StudyRequest.objects.filter(
            scheduled_exam_datetime__date=target_date,
            study_status__in=['검사대기', '검사중', '검사완료'],
            assigned_room__isnull=False
        ).select_related('assigned_room', 'assigned_radiologist')
        
        # 검사실 필터 적용
        if room_ids:
            query = query.filter(assigned_room__id__in=room_ids)
        
        schedules = query.order_by('scheduled_exam_datetime')
        
        # 검사실별로 그룹화
        room_schedules = {}
        for schedule in schedules:
            room_id = str(schedule.assigned_room.id)
            
            if room_id not in room_schedules:
                room_schedules[room_id] = []
            
            # 시간 계산
            start_time = schedule.scheduled_exam_datetime.strftime('%H:%M')
            duration = schedule.estimated_duration or 30
            
            room_schedules[room_id].append({
                'examId': schedule.id,
                'patientName': schedule.patient_name,
                'examType': f"{schedule.body_part} {schedule.modality}",
                'time': start_time,
                'duration': duration,
                'status': schedule.study_status,
                'radiologistId': schedule.assigned_radiologist.id if schedule.assigned_radiologist else None,
                'radiologistName': schedule.assigned_radiologist.name if schedule.assigned_radiologist else None,
                'roomId': schedule.assigned_room.id,
                'roomName': schedule.assigned_room.name,
                'scheduledDateTime': schedule.scheduled_exam_datetime.isoformat(),
                'patientId': schedule.patient_id,
                'priority': getattr(schedule, 'priority', '일반')
            })
        
        logger.info(f"Room schedules loaded for date {target_date}: {len(schedules)} total schedules")
        
        return Response({
            'date': target_date,
            'room_schedules': room_schedules,
            'total_count': len(schedules)
        })
        
    except ValueError as e:
        logger.error(f"Invalid date format: {date_param}")
        return Response(
            {'error': '잘못된 날짜 형식입니다. YYYY-MM-DD 형식을 사용하세요.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Error in get_room_schedules: {e}")
        return Response(
            {'error': f'스케줄 조회 중 오류가 발생했습니다: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_room_schedules_summary(request):
    """
    검사실별 스케줄 요약 정보
    GET /api/schedules/room-schedules-summary/?date=2025-06-23
    """
    try:
        from worklists.models import StudyRequest
        
        # 날짜 파라미터
        date_param = request.GET.get('date', timezone.now().date())
        if isinstance(date_param, str):
            target_date = datetime.strptime(date_param, '%Y-%m-%d').date()
        else:
            target_date = date_param
        
        # 검사실별 스케줄 통계
        room_stats = StudyRequest.objects.filter(
            scheduled_exam_datetime__date=target_date,
            assigned_room__isnull=False
        ).values(
            'assigned_room__id', 
            'assigned_room__name',
            'assigned_room__room_type'
        ).annotate(
            total_count=Count('id'),
            waiting_count=Count('id', filter=Q(study_status='검사대기')),
            in_progress_count=Count('id', filter=Q(study_status='검사중')),
            completed_count=Count('id', filter=Q(study_status='검사완료'))
        ).order_by('assigned_room__id')
        
        return Response({
            'date': target_date,
            'room_statistics': list(room_stats)
        })
        
    except Exception as e:
        logger.error(f"Error in get_room_schedules_summary: {e}")
        return Response(
            {'error': f'스케줄 요약 조회 중 오류가 발생했습니다: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )