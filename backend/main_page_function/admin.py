# backend/main_page_function/admin.py

from django.contrib import admin
from .models import Notice, DoctorStats

@admin.register(Notice)
class NoticeAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'notice_type', 'is_active', 'is_pinned', 
        'created_by', 'created_at', 'start_date', 'end_date'
    ]
    
    list_filter = [
        'notice_type', 'is_active', 'is_pinned', 'created_at'
    ]
    
    search_fields = [
        'title', 'content', 'created_by'
    ]
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('title', 'content', 'notice_type', 'created_by')
        }),
        ('표시 설정', {
            'fields': ('is_active', 'is_pinned', 'start_date', 'end_date')
        }),
    )
    
    ordering = ['-created_at']

@admin.register(DoctorStats)
class DoctorStatsAdmin(admin.ModelAdmin):
    list_display = [
        'doctor_name', 'department', 'today_patients', 
        'waiting_patients', 'status', 'last_updated'
    ]
    
    list_filter = [
        'department', 'status', 'last_updated'
    ]
    
    search_fields = [
        'doctor_name', 'doctor_id', 'department'
    ]
    
    readonly_fields = ['last_updated']
    
    ordering = ['-last_updated']
