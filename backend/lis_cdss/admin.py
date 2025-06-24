# lis_cdss/admin.py
from django.contrib import admin
from .models import CDSSResult, LiverFunctionSample

admin.site.register(CDSSResult)

@admin.register(LiverFunctionSample)
class LiverFunctionSampleAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'ALT', 'AST', 'ALP',
        'Albumin', 'Total_Bilirubin', 'Direct_Bilirubin',
        'prediction', 'probability', 'created_at'
    ]
    list_filter = ['prediction']