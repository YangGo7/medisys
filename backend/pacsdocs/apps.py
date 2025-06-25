# pacsdocs/apps.py

from django.apps import AppConfig


class PacsdocsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'pacsdocs'
    verbose_name = 'PACS 서류관리'
    
    def ready(self):
        """앱이 준비되면 시그널 등록"""
        try:
            # 시그널 import (앱 로딩 시점에 등록됨)
            import pacsdocs.signals
        except ImportError:
            pass