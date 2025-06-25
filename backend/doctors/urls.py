
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DoctorViewSet

# 🆕 doctors 앱에 이 파일이 없으면 새로 생성
router = DefaultRouter()
router.register(r'doctors', DoctorViewSet, basename='doctor')

urlpatterns = [
    path('', include(router.urls)),
    # 🆕 current_user 엔드포인트 추가
    path('doctors/current_user/', DoctorViewSet.as_view({'get': 'current_user'}), name='current-user'),
]

