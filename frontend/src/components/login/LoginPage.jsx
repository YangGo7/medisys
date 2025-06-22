// LoginPage.jsx
import React, { useEffect, useState } from 'react';
import LoginForm from './LoginForm';
import NotificationBar from './NotificationBar';
import { autoLogin } from './auth';
import axios from 'axios';
import './LoginPage.css'; // CSS 파일 import

function LoginPage() {
  const [userId, setUserId] = useState(null);
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState('');
  const [showAutoLogin, setShowAutoLogin] = useState(false);
  const [error, setError] = useState('');
  const [isAutoLoginLoading, setIsAutoLoginLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  // 자동 로그인 UI 토글
  useEffect(() => {
    if (localStorage.getItem('autoLoginUser')) {
      setShowAutoLogin(true);
    }
  }, []);

  // 공지 가져오기
  useEffect(() => {
    axios.get('/api/notice/')
      .then(res => setNotice(res.data.notice || ''))
      .catch(() => setNotice(''));
  }, []);

  // 자동 로그인 처리
  const handleAutoLogin = async () => {
    if (!code) {
      setError('코드를 입력해주세요.');
      return;
    }

    setIsAutoLoginLoading(true);
    setError('');

    try {
      const res = await autoLogin({ code });
      setUserId(res.data.user_id);
    } catch {
      setError('자동 로그인 실패: 코드가 유효하지 않거나 만료됨');
    } finally {
      setIsAutoLoginLoading(false);
    }
  };

  // 다른 계정으로 로그인
  const handleLoginOther = () => {
    localStorage.removeItem('autoLoginUser');
    setShowAutoLogin(false);
    setUserId(null);
    setUserInfo(null);
    setCode('');
    setError('');
  };

  // userId가 세팅되면 OpenMRS에서 사용자 정보 조회
  useEffect(() => {
    if (!userId) return;

    axios.get(`/openmrs/ws/rest/v1/user/${userId}`)
      .then(res => {
        const user = res.data;
        localStorage.setItem('doctor_id', user.uuid);
        localStorage.setItem('doctor_name', user.display);
        setUserInfo(user);
        // 메인 페이지로 이동
        // window.location.href = '/emr';
      })
      .catch(err => {
        console.error('사용자 정보 조회 실패', err);
        alert('로그인 후 사용자 정보를 불러오는 데 실패했습니다.');
      });
  }, [userId]);

  return (
    <div className="medisys-container">
      <div className="medisys-content">
        {/* Left Side - Branding */}
        <div className="medisys-left-side">
          <div className="medisys-logo-container">
            <div className="medisys-logo-icon">M</div>
            <div>
              <h1 className="medisys-brand-title">메디시스 v3.0</h1>
              <p className="medisys-brand-subtitle">의료진 포털 시스템</p>
            </div>
          </div>
          
          <div className="medisys-branding-text">
            <h2 className="medisys-welcome-title">의료진 포털에 오신 것을 환영합니다</h2>
            <p className="medisys-welcome-subtitle">
              안전하고 효율적인 의료 정보 시스템으로<br/>
              더 나은 환자 케어를 제공하세요
            </p>
          </div>

          <div className="medisys-features">
            <div className="medisys-feature-item">
              <span className="medisys-feature-icon">🏥</span>
              <span>통합 의료 정보 시스템</span>
            </div>
            <div className="medisys-feature-item">
              <span className="medisys-feature-icon">🔒</span>
              <span>보안 강화된 환자 데이터</span>
            </div>
            <div className="medisys-feature-item">
              <span className="medisys-feature-icon">📊</span>
              <span>실시간 의료 통계 및 분석</span>
            </div>
          </div>
        </div>

        {/* Right Side - Login Area */}
        <div className="medisys-right-side">
          {/* 공지사항 */}
          <NotificationBar message={notice} />

          {/* 로그인 성공 시 사용자 정보 표시 */}
          {userInfo && (
            <div className="medisys-success-box">
              <h3 className="medisys-success-title">로그인 성공!</h3>
              <p className="medisys-success-text">
                환영합니다, {userInfo.display}님<br/>
                사용자 ID: {userInfo.uuid}
              </p>
            </div>
          )}

          {/* 메인 로그인 폼 */}
          <LoginForm onLoginSuccess={setUserId} />

          {/* 자동 로그인 섹션 */}
          {showAutoLogin && (
            <div className="medisys-auto-login">
              <h4 className="medisys-auto-login-title">자동 로그인</h4>
              
              <div className="medisys-auto-login-form">
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="부여 코드 입력"
                  className="medisys-input"
                />
                
                <div className="medisys-auto-login-buttons">
                  <button
                    onClick={handleAutoLogin}
                    disabled={isAutoLoginLoading}
                    className="medisys-auto-login-button"
                  >
                    {isAutoLoginLoading ? '로그인 중...' : '자동 로그인'}
                  </button>
                  
                  <button
                    onClick={handleLoginOther}
                    className="medisys-other-account-button"
                  >
                    다른 계정
                  </button>
                </div>
                
                {error && <div className="medisys-error-box">{error}</div>}
              </div>
            </div>
          )}

          {/* 시스템 상태 */}
          <div className="medisys-system-status">
            <div className="medisys-status-item">
              <div className="medisys-status-dot"></div>
              <span>시스템 정상 운영 중</span>
            </div>
            <div className="medisys-status-item">
              <span>서버 응답 시간: 12ms</span>
            </div>
          </div>
        </div>
      </div>

      <div className="medisys-footer">
        <p className="medisys-footer-text">
          © 2025 메디시스. 모든 권리 보유. | 개인정보처리방침 | 이용약관
        </p>
      </div>
    </div>
  );
}

export default LoginPage;