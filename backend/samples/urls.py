from django.urls import path
from .views import create_sample, list_samples_by_order, get_loinc_by_sample_type, alias_mapping_list

urlpatterns = [
    path('create', create_sample),
    path('<int:order_id>', list_samples_by_order),
    path('alias-mapping/', alias_mapping_list),
    path('loinc-by-sample-type', get_loinc_by_sample_type),
]