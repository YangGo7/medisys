from django.db import models

class NoticeCommon(models.Model):
    title = models.CharField(max_length=200, verbose_name="제목")
    content = models.TextField(verbose_name="내용")
    is_important = models.BooleanField(default=False, verbose_name="중요 공지")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="작성일시")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정일시") 
    
    class Meta:
        verbose_name = "시스템 공지사항"
        verbose_name_plural = "시스템 공지사항들"
        ordering = ['-created_at']
        db_table = "notice_common"
    
    def __str__(self):
        return self.title

class NoticeRIS(models.Model):
    title = models.CharField(max_length=200, verbose_name="제목")
    content = models.TextField(verbose_name="내용")
    is_important = models.BooleanField(default=False, verbose_name="중요 공지")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="작성일시")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정일시") 
    
    class Meta:
        verbose_name = " 영상의학과 공지사항"
        verbose_name_plural = "영상의학과 공지사항들"
        ordering = ['-created_at']
        db_table = "notice_ris"
    
    def __str__(self):
        return self.title