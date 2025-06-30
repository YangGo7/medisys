# dr_reports/urls.py
from django.urls import path
from .views import (
    ReportSaveView,
    ReportLoadView,
    ReportListView,
    ReportDetailView,
    ReportDeleteView,
    ReportStatusUpdateView,
    ReportSummaryView
)

app_name = 'dr_reports'

urlpatterns = [
    path('save/', ReportSaveView.as_view(), name='report-save'),
    path('<str:study_uid>/', ReportLoadView.as_view(), name='report-load'),
    path('<str:study_uid>/delete/', ReportDeleteView.as_view(), name='report-delete'),
    path('<str:study_uid>/status/', ReportStatusUpdateView.as_view(), name='report-status-update'),
    path('list/', ReportListView.as_view(), name='report-list'),
    path('detail/<int:report_id>/', ReportDetailView.as_view(), name='report-detail'),
    path('summary/', ReportSummaryView.as_view(), name='report-summary'),
]
