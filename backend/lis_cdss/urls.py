from django.urls import path
from .views import receive_test_result, get_cdss_results
from django.urls import path
from .views import receive_test_result, get_cdss_results, delete_cdss_result

urlpatterns = [
    path('predict/', receive_test_result),
    path('receive/', receive_test_result), 
    path('results/', get_cdss_results),
    path('cdss/delete/<int:sample_id>', delete_cdss_result),
]