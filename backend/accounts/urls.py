from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from .views import login_view, auto_login_view, update_notice ,get_notice ,get_csrf_token
# from medical_integration import views

urlpatterns = [
    path('login/', login_view, name='login'),
    path('auto-login/', auto_login_view, name='auto_login'),
    path('notice/update/', update_notice, name='update_notice'),
    path('notice/', get_notice, name='get_notice'),  # ✅ FIXED: Add GET notice endpoint
    path('api/account/get-csrf/', get_csrf_token),
]

# 개발 환경에서 정적/미디어 파일 서빙
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
