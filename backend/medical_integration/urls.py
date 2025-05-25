from django.urls import path
from . import views

app_name = 'medical_integration'

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
    path('test-connections/', views.test_all_connections, name='test_connections'),
]