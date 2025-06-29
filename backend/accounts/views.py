# accounts/views.py - 개선된 캐시 기반 인증 시스템
from django.core.cache import cache
from django.contrib.auth import authenticate, login, logout
from django.contrib.sessions.models import Session
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from .models import UserProfile, Notice
import json
import logging

logger = logging.getLogger(__name__)

# ===============================
# 캐시 관리 함수들
# ===============================

def get_user_cache_key(user_id):
    """사용자 정보 캐시 키"""
    return f"user_info_{user_id}"

def get_session_cache_key(user_id):
    """세션 상태 캐시 키"""
    return f"user_session_{user_id}"

def get_active_users_key():
    """활성 사용자 목록 캐시 키"""
    return "active_users_list"

def cache_user_info(user, profile=None):
    """사용자 정보를 캐시에 저장 (30분 유지)"""
    try:
        if not profile:
            profile = UserProfile.objects.get(user=user)
        
        user_data = {
            "user_id": user.id,
            "username": user.username,
            "code": profile.code,
            "display": f"{user.last_name}{user.first_name}" or user.username,
            "uuid": f"user_{user.id}",
            "email": user.email,
            "is_doctor": getattr(profile, 'is_doctor', False),
            "department": getattr(profile, 'department', ''),
            "position": getattr(profile, 'position', ''),
            "permissions": list(user.user_permissions.values_list('codename', flat=True)),
            "cached_at": timezone.now().isoformat(),
            "session_active": True,
            "auto_logout_disabled": True  # 캐시 기반 로그아웃 방지
        }
        
        # 사용자 정보 캐싱 (30분)
        cache_key = get_user_cache_key(user.id)
        cache.set(cache_key, user_data, timeout=1800)
        
        # 세션 상태 캐싱 (30분)
        session_key = get_session_cache_key(user.id)
        session_data = {
            "user_id": user.id,
            "login_time": timezone.now().isoformat(),
            "last_activity": timezone.now().isoformat(),
            "cache_protected": True
        }
        cache.set(session_key, session_data, timeout=1800)
        
        # 활성 사용자 목록에 추가
        add_to_active_users(user.id)
        
        logger.info(f"사용자 {user.username}(ID: {user.id}) 정보가 캐시에 저장됨")
        return user_data
        
    except Exception as e:
        logger.error(f"사용자 정보 캐싱 실패: {str(e)}")
        return None

def get_cached_user_info(user_id):
    """캐시에서 사용자 정보 조회"""
    cache_key = get_user_cache_key(user_id)
    cached_data = cache.get(cache_key)
    
    if cached_data:
        # 마지막 활동 시간 업데이트
        update_user_activity(user_id)
        
    return cached_data

def update_user_activity(user_id):
    """사용자 활동 시간 업데이트"""
    session_key = get_session_cache_key(user_id)
    session_data = cache.get(session_key)
    
    if session_data:
        session_data['last_activity'] = timezone.now().isoformat()
        cache.set(session_key, session_data, timeout=1800)

def add_to_active_users(user_id):
    """활성 사용자 목록에 추가"""
    active_users = cache.get(get_active_users_key(), [])
    if user_id not in active_users:
        active_users.append(user_id)
        cache.set(get_active_users_key(), active_users, timeout=1800)

def remove_from_active_users(user_id):
    """활성 사용자 목록에서 제거"""
    active_users = cache.get(get_active_users_key(), [])
    if user_id in active_users:
        active_users.remove(user_id)
        cache.set(get_active_users_key(), active_users, timeout=1800)

def is_cache_protected_user(user_id):
    """캐시 보호된 사용자인지 확인"""
    session_key = get_session_cache_key(user_id)
    session_data = cache.get(session_key)
    return session_data and session_data.get('cache_protected', False)

def force_invalidate_user_cache(user_id):
    """관리자 권한으로 사용자 캐시 강제 무효화"""
    cache_key = get_user_cache_key(user_id)
    session_key = get_session_cache_key(user_id)
    
    cache.delete(cache_key)
    cache.delete(session_key)
    remove_from_active_users(user_id)
    
    logger.info(f"사용자 {user_id} 캐시가 강제 무효화됨")

# ===============================
# 인증 관련 뷰
# ===============================

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """일반 로그인 (캐시 기반)"""
    try:
        username = request.data.get("username")
        password = request.data.get("password")
        code = request.data.get("code")
        
        if not all([username, password, code]):
            return Response({"error": "모든 필드를 입력해주세요"}, status=400)
        
        # 사용자 인증
        user = authenticate(request, username=username, password=password)
        if not user:
            return Response({"error": "인증 실패"}, status=401)
        
        try:
            profile = UserProfile.objects.select_related('user').get(user=user)
            
            # 코드 검증
            if profile.code != code:
                return Response({"error": "코드 불일치"}, status=401)
            
            # Django 세션 로그인
            login(request, user)
            
            # 사용자 정보 캐싱
            cached_data = cache_user_info(user, profile)
            
            if cached_data:
                return Response({
                    "message": "로그인 성공",
                    "user_info": cached_data,
                    "cache_protected": True
                })
            else:
                return Response({
                    "message": "로그인 성공 (캐시 실패)",
                    "user_info": {
                        "user_id": user.id,
                        "username": user.username,
                        "display": f"{user.last_name}{user.first_name}" or user.username
                    }
                })
                
        except UserProfile.DoesNotExist:
            return Response({"error": "사용자 프로필이 존재하지 않습니다"}, status=400)
            
    except Exception as e:
        logger.error(f"로그인 처리 중 오류: {str(e)}")
        return Response({"error": "로그인 처리 중 오류가 발생했습니다"}, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def auto_login_view(request):
    """자동 로그인 (캐시 기반)"""
    try:
        code = request.data.get('code')
        if not code:
            return Response({"error": "코드를 입력해주세요"}, status=400)
        
        profile = UserProfile.objects.select_related('user').get(code=code)
        
        # 자동 로그인 세션 만료 체크
        now = timezone.now()
        if profile.last_auto_login:
            if (now - profile.last_auto_login).days > 7:
                return Response({"error": "자동 로그인 세션이 만료되었습니다"}, status=401)
        
        # 로그인 처리
        profile.last_auto_login = now
        profile.save()
        login(request, profile.user)
        
        # 캐시에 사용자 정보 저장
        cached_data = cache_user_info(profile.user, profile)
        
        return Response({
            "message": "자동 로그인 성공",
            "user_info": cached_data,
            "cache_protected": True
        })
        
    except UserProfile.DoesNotExist:
        return Response({"error": "코드 불일치"}, status=401)
    except Exception as e:
        logger.error(f"자동 로그인 오류: {str(e)}")
        return Response({"error": "자동 로그인 처리 중 오류가 발생했습니다"}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_info_view(request):
    """사용자 정보 조회 (캐시 우선)"""
    user = request.user
    
    # 캐시에서 먼저 조회
    cached_data = get_cached_user_info(user.id)
    if cached_data:
        return Response(cached_data)
    
    # 캐시에 없으면 DB에서 조회 후 캐싱
    try:
        profile = UserProfile.objects.get(user=user)
        cached_data = cache_user_info(user, profile)
        
        if cached_data:
            return Response(cached_data)
        else:
            # 캐싱 실패 시 기본 정보 반환
            return Response({
                "user_id": user.id,
                "username": user.username,
                "code": profile.code,
                "display": f"{user.last_name}{user.first_name}" or user.username,
                "uuid": f"user_{user.id}"
            })
            
    except UserProfile.DoesNotExist:
        return Response({
            "user_id": user.id,
            "username": user.username,
            "code": None,
            "display": user.username,
            "uuid": f"user_{user.id}"
        })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """로그아웃 (캐시 보호 체크)"""
    user = request.user
    
    # 캐시 보호된 사용자인지 확인
    if is_cache_protected_user(user.id):
        return Response({
            "error": "캐시가 활성화된 동안에는 로그아웃할 수 없습니다",
            "message": "시스템 보안을 위해 캐시 만료 후 다시 시도해주세요",
            "cache_protected": True
        }, status=403)
    
    # 일반 로그아웃 처리
    logout(request)
    force_invalidate_user_cache(user.id)
    
    return Response({"message": "로그아웃 성공"})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def force_logout_view(request):
    """강제 로그아웃 (관리자 전용)"""
    if not request.user.is_staff:
        return Response({"error": "관리자 권한이 필요합니다"}, status=403)
    
    target_user_id = request.data.get('user_id')
    if not target_user_id:
        return Response({"error": "사용자 ID가 필요합니다"}, status=400)
    
    # 강제 캐시 무효화
    force_invalidate_user_cache(target_user_id)
    
    return Response({"message": f"사용자 {target_user_id} 강제 로그아웃 성공"})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cache_status_view(request):
    """현재 사용자의 캐시 상태 확인"""
    user = request.user
    
    cached_data = get_cached_user_info(user.id)
    session_data = cache.get(get_session_cache_key(user.id))
    
    return Response({
        "user_id": user.id,
        "cache_exists": cached_data is not None,
        "cache_protected": is_cache_protected_user(user.id),
        "session_data": session_data,
        "cached_at": cached_data.get('cached_at') if cached_data else None
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def active_users_view(request):
    """활성 사용자 목록 조회 (관리자 전용)"""
    if not request.user.is_staff:
        return Response({"error": "관리자 권한이 필요합니다"}, status=403)
    
    active_users = cache.get(get_active_users_key(), [])
    user_details = []
    
    for user_id in active_users:
        cached_info = get_cached_user_info(user_id)
        if cached_info:
            user_details.append({
                "user_id": user_id,
                "username": cached_info.get('username'),
                "display": cached_info.get('display'),
                "cached_at": cached_info.get('cached_at'),
                "cache_protected": is_cache_protected_user(user_id)
            })
    
    return Response({
        "active_users_count": len(active_users),
        "users": user_details
    })

# ===============================
# 기타 뷰 (기존 유지)
# ===============================

@ensure_csrf_cookie
@api_view(['GET'])
@permission_classes([AllowAny])
def get_csrf_token(request):
    """CSRF 토큰 조회"""
    return JsonResponse({'csrfToken': get_token(request)})

@api_view(['GET'])
@permission_classes([AllowAny])
def get_notice(request):
    """공지사항 조회"""
    try:
        notice = Notice.objects.latest('created_at')
        return Response({"notice": notice.message})
    except Notice.DoesNotExist:
        return Response({"notice": ""})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_notice(request):
    """공지사항 업데이트 (관리자 전용)"""
    if not request.user.is_staff:
        return Response({"error": "관리자 권한이 필요합니다"}, status=403)
        
    message = request.data.get("message")
    Notice.objects.all().delete()
    Notice.objects.create(message=message)
    return Response({"message": "공지 등록 완료"})