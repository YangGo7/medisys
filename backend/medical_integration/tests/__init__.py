from django.test.runner import DiscoverRunner

class MedicalIntegrationTestRunner(DiscoverRunner):
    def setup_databases(self, **kwargs):
        """테스트 데이터베이스 설정"""
        from django.conf import settings
        settings.DATABASES = getattr(settings, 'TEST_DATABASES', settings.DATABASES)
        return super().setup_databases(**kwargs)

    def teardown_databases(self, old_config, **kwargs):
        """테스트 데이터베이스 정리"""
        super().teardown_databases(old_config, **kwargs)

"""
테스트 앱 초기화
""" 