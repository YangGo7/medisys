// frontend/src/utils/authCache.js - 캐시 관리 유틸리티

class AuthCache {
  constructor() {
    this.CACHE_KEY = 'medical_user_cache';
    this.CACHE_STATUS_KEY = 'medical_cache_status';
    this.CACHE_DURATION = 30 * 60 * 1000; // 30분
  }

  // 사용자 정보 캐시 저장
  setUserCache(userData) {
    const cacheData = {
      ...userData,
      cached_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + this.CACHE_DURATION).toISOString()
    };
    
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
    localStorage.setItem(this.CACHE_STATUS_KEY, 'active');
    
    console.log('사용자 정보가 캐시에 저장됨:', cacheData.username);
  }

  // 캐시된 사용자 정보 조회
  getUserCache() {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const userData = JSON.parse(cached);
      
      // 만료 체크
      if (new Date() > new Date(userData.expires_at)) {
        this.clearCache();
        return null;
      }

      return userData;
    } catch (error) {
      console.error('캐시 조회 오류:', error);
      return null;
    }
  }

  // 캐시 상태 확인
  isCacheActive() {
    const status = localStorage.getItem(this.CACHE_STATUS_KEY);
    const userData = this.getUserCache();
    return status === 'active' && userData !== null;
  }

  // 캐시 보호 상태 확인
  isCacheProtected() {
    const userData = this.getUserCache();
    return userData && userData.auto_logout_disabled === true;
  }

  // 캐시 클리어 (보호 상태에서는 제한)
  clearCache(force = false) {
    if (!force && this.isCacheProtected()) {
      console.warn('캐시가 보호된 상태입니다. 강제 클리어가 필요합니다.');
      return false;
    }

    localStorage.removeItem(this.CACHE_KEY);
    localStorage.removeItem(this.CACHE_STATUS_KEY);
    console.log('캐시가 클리어됨');
    return true;
  }

  // 캐시 강제 클리어 (관리자 권한)
  forceClearCache() {
    return this.clearCache(true);
  }

  // 캐시 갱신
  refreshCache() {
    const userData = this.getUserCache();
    if (userData) {
      this.setUserCache(userData);
    }
  }
}

export default new AuthCache();
