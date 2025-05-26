from django.urls import path
from .views import create_test_result

urlpatterns = [
    path('tests/run', create_test_result)
]