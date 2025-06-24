# from rest_framework import serializers
# from .models import StudyRequest

# class StudyRequestSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = StudyRequest
#         fields = '__all__'
        
#     def validate_birth_date(self, value):
#         if not value:
#             raise serializers.ValidationError("생년월일은 필수입니다.")
#         return value

# # 🆕 React Dashboard용 별도 시리얼라이저
# class WorklistSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = StudyRequest
#         fields = '__all__'
    
#     def to_representation(self, instance):
#         """React Dashboard 컴포넌트와 일치하도록 데이터 형태 조정"""
#         # 시간 포맷팅 함수
#         def format_datetime(dt):
#             if dt:
#                 return dt.strftime('%Y. %m. %d. %p %I:%M:%S').replace('AM', '오전').replace('PM', '오후')
#             return None
        
#         def format_time(dt):
#             if dt:
#                 return dt.strftime('%H:%M')
#             return None
        
#         return {
#             'id': instance.id,
#             'patientId': instance.patient_id,
#             'patientName': instance.patient_name,
#             'birthDate': instance.birth_date.strftime('%Y/%m/%d') if instance.birth_date else None,
#             'gender': '남' if instance.sex == 'M' else '여',
#             'examPart': instance.body_part,
#             'modality': instance.modality,
#             'requestDoctor': instance.requesting_physician,
#             'requestDateTime': format_datetime(instance.request_datetime),
#             'reportingDoctor': instance.interpreting_physician,
#             'examDateTime': format_datetime(instance.scheduled_exam_datetime),
#             'examStatus': instance.study_status,  # 🔥 Django 상태 그대로 사용
#             'reportStatus': instance.report_status,  # 🔥 Django 상태 그대로 사용
#             'priority': getattr(instance, 'priority', '일반'),
#             'estimatedDuration': instance.estimated_duration or 30,
#             'notes': instance.notes or '',
#             'radiologistId': instance.assigned_radiologist.id if instance.assigned_radiologist else None,
#             'roomId': instance.assigned_room.room_id if instance.assigned_room else None,
#             'startTime': format_time(instance.scheduled_exam_datetime)
#         }
        
from rest_framework import serializers
from .models import StudyRequest

class StudyRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudyRequest
        fields = '__all__'
        
    def validate_birth_date(self, value):
        if not value:
            raise serializers.ValidationError("생년월일은 필수입니다.")
        return value

# 🆕 React Dashboard용 별도 시리얼라이저
class WorklistSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudyRequest
        fields = '__all__'
    
    def to_representation(self, instance):
        """React Dashboard 컴포넌트와 일치하도록 데이터 형태 조정"""
        # 시간 포맷팅 함수 (안전한 방법)
        def format_datetime(dt):
            if dt:
                year = dt.year
                month = dt.month
                day = dt.day
                hour = dt.hour
                minute = dt.minute
                
                # 12시간 형태로 변환
                if hour == 0:
                    display_hour = 12
                    period = '오전'
                elif hour < 12:
                    display_hour = hour
                    period = '오전'
                elif hour == 12:
                    display_hour = 12
                    period = '오후'
                else:
                    display_hour = hour - 12
                    period = '오후'
                
                return f"{year}. {month}. {day}. {period} {display_hour}:{minute:02d}"
            return None
        
        def format_time(dt):
            if dt:
                return dt.strftime('%H:%M')
            return None
        
        return {
            'id': instance.id,
            'patientId': instance.patient_id,
            'patientName': instance.patient_name,
            'birthDate': instance.birth_date.strftime('%Y/%m/%d') if instance.birth_date else None,
            'gender': '남' if instance.sex == 'M' else '여',
            'examPart': instance.body_part,
            'modality': instance.modality,
            'requestDoctor': instance.requesting_physician,
            'requestDateTime': format_datetime(instance.request_datetime),
            'reportingDoctor': instance.interpreting_physician,
            'examDateTime': format_datetime(instance.scheduled_exam_datetime),
            'examStatus': instance.study_status,  # 🔥 Django 상태 그대로 사용
            'reportStatus': instance.report_status,  # 🔥 Django 상태 그대로 사용
            'priority': getattr(instance, 'priority', '일반'),
            'estimatedDuration': instance.estimated_duration or 30,
            'notes': instance.notes or '',
            'radiologistId': instance.assigned_radiologist.id if instance.assigned_radiologist else None,
            'roomId': instance.assigned_room.room_id if instance.assigned_room else None,
            'startTime': format_time(instance.scheduled_exam_datetime)
        }