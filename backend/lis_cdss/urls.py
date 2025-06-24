from django.urls import path
from .views import (
    receive_test_result,
    receive_model_result,
    get_cdss_results,
    get_cdss_result_by_sample,
    delete_cdss_result,
    receive_full_sample,
    lft_statistics_summary
)

urlpatterns = [
    path('receive/', receive_test_result),  # 단순 저장 (모델 X)
    path('predict/', receive_model_result),  # 결과 저장 + 모델 예측 (POST)
    path('results/', get_cdss_results),  # 전체 조회 (GET)
    path('results/<int:sample_id>/', get_cdss_result_by_sample),  # 샘플 단일 조회 (GET)
    path('delete/<int:sample_id>/', delete_cdss_result),  # 삭제 (DELETE)
    path('receive_full_sample/', receive_full_sample),
    path('lft/stats/', lft_statistics_summary),
]
