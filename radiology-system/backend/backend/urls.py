# from django.contrib import admin
# from django.urls import path, include

# urlpatterns = [
#     path('admin/', admin.site.urls),
#     path('', include('doctors.urls')),
#     path('', include('notices.urls')),
#     path('', include('schedules.urls')),
    
# ]

# backend/urls.py - 수정된 버전

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # 🔥 API 엔드포인트들을 /api/ 경로 하위로 정리
    path('api/', include('doctors.urls')),
    path('api/', include('notices.urls')),
    path('api/', include('schedules.urls')),
    path('api/', include('worklists.urls')),
    
    # 또는 더 명확하게 각 앱별로 분리:
    # path('api/doctors/', include('doctors.urls')),
    # path('api/notices/', include('notices.urls')),
    # path('api/schedules/', include('schedules.urls')),
]