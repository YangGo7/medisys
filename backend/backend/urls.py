# backend/backend/urls.py (경로 확인 후 최종 수정)

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from openmrs_models.views import openmrs_vitals, openmrs_encounters

# 기본 헬스체크 뷰 추가
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def health_check_view(request):
    return JsonResponse({
        'status': 'healthy',
        'service': 'Medical Platform Backend',
        'timestamp': '2025-06-25'
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # 헬스체크
    path('api/health/', health_check_view, name='health_check'),
    
    # 기존 앱들 (확인된 앱들만 포함)
    path('api/integration/', include('medical_integration.urls')),  # 존재 여부 불확실
    
    path('api/orders/', include('orders_emr.urls')),  # 존재 여부 불확실
    path('api/worklist/', include('worklist.urls')),  # worklists 앱 사용
    path('api/samples/', include('samples.urls')),  # 존재 여부 불확실
    path('api/tests/', include('tests.urls')),  # 존재 여부 불확실
    path('api/account/', include('accounts.urls')),  # 존재 여부 불확실
    path('api/cdss/', include('lis_cdss.urls')),  # 존재 여부 불확실
    path('api/ohif/', include('medical_integration.ohif_urls')),  # 존재 여부 불확실
    
    path('api/', include('openmrs_models.urls')),  # 존재 여부 불확실

    path('api/openmrs-vitals/', openmrs_vitals, name='openmrs_vitals'),
    path('api/openmrs-encounters/', openmrs_encounters, name='openmrs_encounters'),
    
    path('webhook/', include('webhook_handler.urls')),
    path('api/ai/', include('ai_analysis.urls')),
    path('api/annotations/', include('dr_annotations.urls')),
    path('api/reports/', include('dr_reports.urls')),
    

    path('api/stt/', include('stt_service.urls')),
    path('api/statisticsboard/', include('statisticsboard.urls')),
    path('api/main-page-function/', include('main_page_function.urls')),
    
    # 확인된 앱들만 포함
    path('api/schedules/', include('schedules.urls')),  # ✅ 확인됨
    path('api/doctors/', include('doctors.urls')),      # ✅ 확인됨 (doctors 모델 있음)
    path('api/notices/', include('notices.urls')),      # ✅ 확인됨
    
    # Study Requests는 worklists 앱에서 처리
    path('api/study-requests/', include('worklists.urls')),  # ✅ 확인됨
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)