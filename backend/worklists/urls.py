# # backend/worklists/urls.py - API 경로 수정
# from django.urls import path, include
# from rest_framework.routers import DefaultRouter
# from .views import StudyRequestViewSet
# from . import views

# router = DefaultRouter()
# router.register(r'', StudyRequestViewSet, basename='studyrequest')  # 경로 수정

# urlpatterns = [
#     path('', include(router.urls)),
#     # 🔧 Frontend가 호출하는 경로에 맞춰 수정
#     path('worklist/', views.work_list, name='work_list'),  # 새 경로 추가
#     path('worklist/<int:pk>/', views.work_list_detail, name='work_list_detail'),
# ]

# backend/worklists/urls.py
# backend/worklists/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudyRequestViewSet
from . import views

router = DefaultRouter()
router.register(r'', StudyRequestViewSet, basename='studyrequest')

urlpatterns = [
    # ✅ 날짜 패턴을 맨 앞에 (중요!)
    path('<int:year>-<int:month>-<int:day>/', views.worklist_by_date_specific, name='worklist_by_date_specific'),
    
    # 기존 function-based views
    path('worklists/', views.work_list, name='work_list'),
    path('worklists/<int:pk>/', views.work_list_detail, name='work_list_detail'),
    
    # ViewSet URLs를 마지막에 (중요!)
    path('', include(router.urls)),
]