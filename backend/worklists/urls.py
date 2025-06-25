# backend/worklists/urls.py - API 경로 수정
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudyRequestViewSet
from . import views

router = DefaultRouter()
router.register(r'', StudyRequestViewSet, basename='studyrequest')  # 경로 수정

urlpatterns = [
    path('', include(router.urls)),
    # 🔧 Frontend가 호출하는 경로에 맞춰 수정
    path('worklist/', views.work_list, name='work_list'),  # 새 경로 추가
    path('worklist/<int:pk>/', views.work_list_detail, name='work_list_detail'),
]