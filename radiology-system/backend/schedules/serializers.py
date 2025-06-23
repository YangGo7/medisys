# schedules/serializers.py - DateTime 처리 수정

from rest_framework import serializers
from .models import ScheduleCommon, ScheduleRIS, PersonalSchedule, ExamRoom
from doctors.models import Doctor
from datetime import datetime
from django.utils import timezone

class PersonalScheduleSerializer(serializers.ModelSerializer):
    time_display = serializers.SerializerMethodField()
    
    class Meta:
        model = PersonalSchedule
        fields = ['id', 'title', 'datetime', 'end_datetime', 'description', 'is_completed', 'time_display']
    
    def get_time_display(self, obj):
        try:
            # datetime이 문자열인 경우 파싱
            if isinstance(obj.datetime, str):
                start_dt = datetime.fromisoformat(obj.datetime.replace('Z', '+00:00'))
            else:
                start_dt = obj.datetime
            
            start_time = start_dt.strftime('%H:%M')
            
            # end_datetime 처리
            if obj.end_datetime:
                if isinstance(obj.end_datetime, str):
                    end_dt = datetime.fromisoformat(obj.end_datetime.replace('Z', '+00:00'))
                    end_time = end_dt.strftime('%H:%M')
                elif hasattr(obj.end_datetime, 'strftime'):
                    end_time = obj.end_datetime.strftime('%H:%M')
                else:
                    # end_datetime가 다른 형태인 경우
                    return start_time
                
                return f"{start_time} ~ {end_time}"
            
            return start_time
            
        except (ValueError, AttributeError) as e:
            # 오류 발생 시 기본값 반환
            return "시간 정보 없음"
    
    def validate_datetime(self, value):
        """datetime 필드 검증 및 timezone 처리"""
        if isinstance(value, str):
            try:
                # ISO 형식 문자열을 datetime 객체로 변환
                dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                # timezone aware로 변환
                if timezone.is_naive(dt):
                    dt = timezone.make_aware(dt)
                return dt
            except ValueError:
                raise serializers.ValidationError("올바른 datetime 형식이 아닙니다.")
        return value
    
    def validate_end_datetime(self, value):
        """end_datetime 필드 검증 및 timezone 처리"""
        if not value or value == '':
            return None
            
        if isinstance(value, str):
            try:
                dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                if timezone.is_naive(dt):
                    dt = timezone.make_aware(dt)
                return dt
            except ValueError:
                raise serializers.ValidationError("올바른 datetime 형식이 아닙니다.")
        return value

class ScheduleCommonSerializer(serializers.ModelSerializer):
    time_display = serializers.SerializerMethodField()
    
    class Meta:
        model = ScheduleCommon
        fields = ['id', 'title', 'datetime', 'end_datetime', 'description', 'time_display']
    
    def get_time_display(self, obj):
        try:
            if isinstance(obj.datetime, str):
                start_dt = datetime.fromisoformat(obj.datetime.replace('Z', '+00:00'))
            else:
                start_dt = obj.datetime
            
            start_time = start_dt.strftime('%H:%M')
            
            if obj.end_datetime:
                if isinstance(obj.end_datetime, str):
                    end_dt = datetime.fromisoformat(obj.end_datetime.replace('Z', '+00:00'))
                    end_time = end_dt.strftime('%H:%M')
                elif hasattr(obj.end_datetime, 'strftime'):
                    end_time = obj.end_datetime.strftime('%H:%M')
                else:
                    return start_time
                
                return f"{start_time} ~ {end_time}"
            
            return start_time
            
        except (ValueError, AttributeError):
            return "시간 정보 없음"

class ScheduleRISSerializer(serializers.ModelSerializer):
    time_display = serializers.SerializerMethodField()
    
    class Meta:
        model = ScheduleRIS
        fields = ['id', 'title', 'datetime', 'end_datetime', 'description', 'time_display']
    
    def get_time_display(self, obj):
        try:
            if isinstance(obj.datetime, str):
                start_dt = datetime.fromisoformat(obj.datetime.replace('Z', '+00:00'))
            else:
                start_dt = obj.datetime
            
            start_time = start_dt.strftime('%H:%M')
            
            if obj.end_datetime:
                if isinstance(obj.end_datetime, str):
                    end_dt = datetime.fromisoformat(obj.end_datetime.replace('Z', '+00:00'))
                    end_time = end_dt.strftime('%H:%M')
                elif hasattr(obj.end_datetime, 'strftime'):
                    end_time = obj.end_datetime.strftime('%H:%M')
                else:
                    return start_time
                
                return f"{start_time} ~ {end_time}"
            
            return start_time
            
        except (ValueError, AttributeError):
            return "시간 정보 없음"

class DoctorSerializer(serializers.ModelSerializer):
    today_personal_schedules = serializers.SerializerMethodField()
    
    class Meta:
        model = Doctor
        fields = ['id', 'name', 'department', 'role', 'status', 'today_personal_schedules']
    
    def get_today_personal_schedules(self, obj):
        from datetime import date
        today = date.today()
        schedules = PersonalSchedule.objects.filter(
            doctor=obj, 
            datetime__date=today
        ).order_by('datetime')
        return PersonalScheduleSerializer(schedules, many=True).data
    
    
class ExamRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamRoom
        fields = ['id', 'room_id', 'name', 'room_type', 'is_active', 'description']
        
    def to_representation(self, instance):
        """React에서 사용하기 쉽도록 데이터 형태 조정"""
        data = super().to_representation(instance)
        # React 코드와 일치하도록 필드명 조정
        return {
            'id': data['room_id'],  # React에서 사용하는 id
            'name': data['name'],
            'type': data['room_type'],  # React에서 사용하는 type
            'is_active': data['is_active'],
            'description': data['description']
        }