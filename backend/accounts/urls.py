from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from .views import (
    login_view, auto_login_view, update_notice, get_notice,
    get_csrf_token, user_info_view, logout_view
)

urlpatterns = [
    path('login/', login_view, name='login'),
    path('auto-login/', auto_login_view, name='auto_login'),
    path('notice/update/', update_notice, name='update_notice'),
    path('notice/', get_notice, name='get_notice'),
    path('get-csrf/', get_csrf_token),  # ✅ 여기만 수정
    path('user-info/', user_info_view),
    path('logout/', logout_view),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
