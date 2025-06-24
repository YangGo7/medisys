# from rest_framework.routers import DefaultRouter
# from django.urls import path, include
# from .views import (
#     ScheduleCommonViewSet, 
#     ScheduleRISViewSet, 
#     PersonalScheduleViewSet,
#     ExamRoomViewSet  # 🆕 추가
# )

# router = DefaultRouter()

# router.register(r'schedules/common', ScheduleCommonViewSet)
# router.register(r'schedules/ris', ScheduleRISViewSet)
# router.register(r'schedules/personal', PersonalScheduleViewSet, basename='personal-schedule')
# router.register(r'rooms', ExamRoomViewSet)

# urlpatterns = [
#     path('', include(router.urls)),
# ]

from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import (
    ScheduleCommonViewSet, 
    ScheduleRISViewSet, 
    PersonalScheduleViewSet,
    ExamRoomViewSet,  # 🆕 추가
    get_room_schedules,  # 🆕 추가
    get_room_schedules_summary  # 🆕 추가
)

router = DefaultRouter()

router.register(r'schedules/common', ScheduleCommonViewSet)
router.register(r'schedules/ris', ScheduleRISViewSet)
router.register(r'schedules/personal', PersonalScheduleViewSet, basename='personal-schedule')
router.register(r'rooms', ExamRoomViewSet)

urlpatterns = [
    path('', include(router.urls)),
    # 🆕 검사실 스케줄 API 추가
    path('schedules/room-schedules/', get_room_schedules, name='room-schedules'),
    path('schedules/room-schedules-summary/', get_room_schedules_summary, name='room-schedules-summary'),
]