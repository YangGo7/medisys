from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from .views import login_view, auto_login_view, update_notice

urlpatterns = [
    path('login/', login_view),
    path('auto-login/', auto_login_view),
    path('notice/update/', update_notice),  # 공지사항 수정용 POST
]

# 개발 환경에서 정적/미디어 파일 서빙
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
