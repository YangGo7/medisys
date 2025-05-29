"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from rest_framework.routers import DefaultRouter
from django.conf.urls.static import static
from openmrs_models.views import openmrs_vitals, openmrs_encounters

# 추후 dicom_process 연결 
urlpatterns = [
    path('admin/', admin.site.urls),

    # 각 앱별 prefix로 충돌 방지
    path('api/integration/', include('medical_integration.urls')),
    path('api/orders/', include('orders.urls')),
    path('api/worklist/', include('worklist.urls')),
    path('api/samples/', include('samples.urls')),
    path('api/tests/', include('tests.urls')),
    path('api/logs/', include('ocs.urls')),
    path('api/account/', include('accounts.urls')),
    path('api/openmrs-vitals/', openmrs_vitals),
    path('api/openmrs-encounters/', openmrs_encounters),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)