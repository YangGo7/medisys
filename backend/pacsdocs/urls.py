from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# DRF Router 설정
router = DefaultRouter()
router.register(r'document-types', views.DocumentTypeViewSet, basename='documenttype')
router.register(r'document-requests', views.DocumentRequestViewSet, basename='documentrequest')
router.register(r'study-documents', views.StudyDocumentsViewSet, basename='studydocuments')
router.register(r'document-templates', views.DocumentTemplateViewSet, basename='documenttemplate')

app_name = 'pacsdocs'

urlpatterns = [
    # DRF ViewSet URLs
    path('api/', include(router.urls)),
    
    # 통계 API
    path('api/statistics/', views.get_document_statistics, name='document-statistics'),
]

# 생성되는 API 엔드포인트들:
"""
GET    /pacsdocs/api/document-types/                    # 서류 종류 목록
GET    /pacsdocs/api/document-types/{id}/               # 특정 서류 종류 조회

GET    /pacsdocs/api/document-requests/                 # 서류 요청 목록
POST   /pacsdocs/api/document-requests/                 # 서류 요청 생성
GET    /pacsdocs/api/document-requests/{id}/            # 특정 서류 요청 조회
PUT    /pacsdocs/api/document-requests/{id}/            # 서류 요청 수정
DELETE /pacsdocs/api/document-requests/{id}/            # 서류 요청 삭제
PATCH  /pacsdocs/api/document-requests/{id}/update_status/  # 서류 상태 변경

GET    /pacsdocs/api/study-documents/                   # 검사별 서류 목록 (React UI용)
GET    /pacsdocs/api/study-documents/{study_id}/        # 특정 검사의 서류들
POST   /pacsdocs/api/study-documents/{study_id}/create_documents/     # 서류 자동 생성
POST   /pacsdocs/api/study-documents/{study_id}/process_documents/    # 서류 일괄 처리
GET    /pacsdocs/api/study-documents/{study_id}/preview_document/     # 서류 미리보기

GET    /pacsdocs/api/document-templates/               # 서류 템플릿 목록
POST   /pacsdocs/api/document-templates/               # 템플릿 생성
GET    /pacsdocs/api/document-templates/{id}/          # 특정 템플릿 조회
PUT    /pacsdocs/api/document-templates/{id}/          # 템플릿 수정
DELETE /pacsdocs/api/document-templates/{id}/          # 템플릿 삭제

GET    /pacsdocs/api/statistics/                       # 서류 발급 통계
"""