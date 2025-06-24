from django.contrib import admin
from .models import NoticeCommon, NoticeRIS

@admin.register(NoticeCommon)
class NoticeCommonAdmin(admin.ModelAdmin):
    list_display = ['title', 'is_important', 'created_at']
    list_filter = ['is_important', 'created_at']

@admin.register(NoticeRIS)
class NoticeRISAdmin(admin.ModelAdmin):
    list_display = ['title', 'is_important', 'created_at']
    list_filter = ['is_important', 'created_at']