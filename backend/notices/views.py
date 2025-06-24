from rest_framework import viewsets
from .models import NoticeCommon, NoticeRIS
from .serializers import NoticeCommonSerializer, NoticeRISSerializer

class NoticeCommonViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = NoticeCommon.objects.all()
    serializer_class = NoticeCommonSerializer

class NoticeRISViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = NoticeRIS.objects.all()
    serializer_class = NoticeRISSerializer