# backend/main_page_function/apps.py

from django.apps import AppConfig

class MainPageFunctionConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'main_page_function'
    verbose_name = '메인 페이지 기능'


# backend/main_page_function/models.py (업데이트)

from django.db import models
from django.utils import timezone

class Notice(models.Model):
    """공지사항 모델 (업데이트)"""
    NOTICE_TYPES = [
        ('important', '중요'),
        ('update', '업데이트'),
        ('maintenance', '점검'),
        ('general', '일반'),
    ]
    
    title = models.CharField(max_length=200, verbose_name='제목')
    content = models.TextField(verbose_name='내용')
    notice_type = models.CharField(
        max_length=20, 
        choices=NOTICE_TYPES, 
        default='general',
        verbose_name='공지 유형'
    )
    is_active = models.BooleanField(default=True, verbose_name='활성화')
    is_pinned = models.BooleanField(default=False, verbose_name='상단 고정')
    created_by = models.CharField(max_length=100, verbose_name='작성자')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='작성일')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='수정일')
    start_date = models.DateTimeField(default=timezone.now, verbose_name='시작일')
    end_date = models.DateTimeField(null=True, blank=True, verbose_name='종료일')
    views = models.IntegerField(default=0, verbose_name='조회수')  # 새로 추가
    
    class Meta:
        ordering = ['-is_pinned', '-created_at']
        verbose_name = '공지사항'
        verbose_name_plural = '공지사항'
    
    def __str__(self):
        return f"[{self.get_notice_type_display()}] {self.title}"
    
    def is_valid(self):
        """현재 시간에 유효한 공지인지 확인"""
        now = timezone.now()
        if self.end_date and now > self.end_date:
            return False
        return self.is_active and now >= self.start_date
    
    def increment_views(self):
        """조회수 증가"""
        self.views += 1
        self.save(update_fields=['views'])
