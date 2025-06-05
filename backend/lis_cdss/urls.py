from django.urls import path
from .views import receive_test_result, get_cdss_results
from django.urls import path
from .views import receive_test_result, get_cdss_results

urlpatterns = [
    path('predict/', receive_test_result),
    path('receive/', receive_test_result), #  <-- Add this if 'receive' should do the same as 'predict'
    path('results/', get_cdss_results),
]