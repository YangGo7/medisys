#!/usr/bin/env python3
"""
Django URL 구성 확인 스크립트
405 Method Not Allowed 문제 진단
"""

import sys
import os
import django
from django.conf import settings

# Django 설정
sys.path.append('/home/medical_system/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

try:
    django.setup()
except Exception as e:
    print(f"Django 설정 오류: {e}")
    sys.exit(1)

def check_urls():
    """URL 구성 확인"""
    print("=" * 60)
    print("🔍 Django URL 구성 확인")
    print("=" * 60)
    
    try:
        from django.urls import get_resolver
        
        # URL resolver 가져오기
        resolver = get_resolver()
        
        print("\n📋 등록된 URL 패턴:")
        print("-" * 40)
        
        # 메인 URL 패턴 확인
        for pattern in resolver.url_patterns:
            print(f"✓ {pattern.pattern}")
            
            # include된 URL 확인
            if hasattr(pattern, 'url_patterns'):
                for sub_pattern in pattern.url_patterns:
                    print(f"  └─ {sub_pattern.pattern}")
                    if hasattr(sub_pattern, 'callback'):
                        callback = sub_pattern.callback
                        if hasattr(callback, 'view_class'):
                            print(f"     View: {callback.view_class}")
                        elif hasattr(callback, '__name__'):
                            print(f"     Function: {callback.__name__}")
        
        print("\n🎯 특정 URL 확인:")
        print("-" * 40)
        
        # 특정 URL들 확인
        test_urls = [
            '/api/health/',
            '/api/integration/health/',
            '/api/integration/openmrs/patients/create/',
            '/api/integration/openmrs/patients/search/',
            '/api/integration/test-api/',
        ]
        
        for url in test_urls:
            try:
                match = resolver.resolve(url)
                print(f"✅ {url}")
                print(f"   View: {match.func.__name__}")
                if hasattr(match.func, 'view_class'):
                    print(f"   Class: {match.func.view_class}")
                if hasattr(match.func, 'actions'):
                    print(f"   Actions: {match.func.actions}")
            except Exception as e:
                print(f"❌ {url} - {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ URL 확인 실패: {e}")
        return False

def check_view_methods():
    """뷰 메서드 확인"""
    print("\n🔧 뷰 메서드 확인:")
    print("-" * 40)
    
    try:
        from medical_integration.views import create_patient, search_patients, health_check
        
        # create_patient 뷰 확인
        if hasattr(create_patient, 'bind_to_methods'):
            print(f"✓ create_patient 허용 메서드: {create_patient.bind_to_methods}")
        else:
            print("❌ create_patient 메서드 정보 없음")
        
        # DRF 데코레이터 확인
        if hasattr(create_patient, 'cls'):
            print(f"✓ create_patient DRF 클래스: {create_patient.cls}")
        
        if hasattr(create_patient, 'actions'):
            print(f"✓ create_patient 액션: {create_patient.actions}")
            
        # 뷰 함수의 메타데이터 확인
        if hasattr(create_patient, '__wrapped__'):
            print("✓ create_patient는 데코레이터로 래핑됨")
        
        return True
        
    except Exception as e:
        print(f"❌ 뷰 메서드 확인 실패: {e}")
        return False

def test_direct_import():
    """직접 import 테스트"""
    print("\n📦 모듈 import 테스트:")
    print("-" * 40)
    
    try:
        # medical_integration 앱 확인
        import medical_integration
        print(f"✅ medical_integration 모듈: {medical_integration}")
        
        from medical_integration import views
        print(f"✅ medical_integration.views: {views}")
        
        from medical_integration import urls
        print(f"✅ medical_integration.urls: {urls}")
        
        # URL 패턴 확인
        print(f"✅ URL 패턴 수: {len(urls.urlpatterns)}")
        for i, pattern in enumerate(urls.urlpatterns):
            print(f"   {i+1}. {pattern.pattern} -> {pattern.callback.__name__}")
        
        return True
        
    except Exception as e:
        print(f"❌ 모듈 import 실패: {e}")
        return False

def check_settings():
    """설정 확인"""
    print("\n⚙️ Django 설정 확인:")
    print("-" * 40)
    
    try:
        print(f"✓ DEBUG: {settings.DEBUG}")
        print(f"✓ ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
        
        if hasattr(settings, 'CORS_ALLOW_ALL_ORIGINS'):
            print(f"✓ CORS_ALLOW_ALL_ORIGINS: {settings.CORS_ALLOW_ALL_ORIGINS}")
        
        if hasattr(settings, 'REST_FRAMEWORK'):
            print(f"✓ REST_FRAMEWORK: {settings.REST_FRAMEWORK}")
        
        # INSTALLED_APPS 확인
        if 'medical_integration' in settings.INSTALLED_APPS:
            print("✅ medical_integration 앱이 INSTALLED_APPS에 등록됨")
        else:
            print("❌ medical_integration 앱이 INSTALLED_APPS에 없음")
        
        if 'rest_framework' in settings.INSTALLED_APPS:
            print("✅ rest_framework가 INSTALLED_APPS에 등록됨")
        else:
            print("❌ rest_framework가 INSTALLED_APPS에 없음")
        
        return True
        
    except Exception as e:
        print(f"❌ 설정 확인 실패: {e}")
        return False

def main():
    """메인 실행 함수"""
    
    # 1. 설정 확인
    settings_ok = check_settings()
    
    # 2. 모듈 import 테스트
    import_ok = test_direct_import()
    
    # 3. URL 구성 확인
    urls_ok = check_urls()
    
    # 4. 뷰 메서드 확인
    methods_ok = check_view_methods()
    
    # 결과 요약
    print("\n" + "=" * 60)
    print("📊 진단 결과 요약")
    print("=" * 60)
    
    results = {
        "Django 설정": settings_ok,
        "모듈 Import": import_ok,
        "URL 구성": urls_ok,
        "뷰 메서드": methods_ok
    }
    
    for test_name, result in results.items():
        status = "✅ 정상" if result else "❌ 오류"
        print(f"{test_name}: {status}")
    
    if all(results.values()):
        print("\n🎉 모든 검사 통과! URL 구성이 올바릅니다.")
        print("\n🔧 그래도 405 오류가 발생한다면:")
        print("1. Django 서버 재시작: python manage.py runserver 0.0.0.0:8000")
        print("2. 브라우저 캐시 클리어")
        print("3. 다른 터미널에서 curl 테스트:")
        print("   curl -X POST -H 'Content-Type: application/json' \\")
        print("        -d '{\"test\":\"data\"}' \\")
        print("        http://localhost:8000/api/integration/test-api/")
    else:
        print("\n⚠️ 일부 검사에서 문제가 발견되었습니다.")
        print("위의 오류 메시지를 확인하고 수정해주세요.")

if __name__ == "__main__":
    main()