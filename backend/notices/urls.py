from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NoticeCommonViewSet, NoticeRISViewSet

router = DefaultRouter()
router.register(r'notices/common', NoticeCommonViewSet)
router.register(r'notices/ris', NoticeRISViewSet)

urlpatterns = [
    path('', include(router.urls)),
]