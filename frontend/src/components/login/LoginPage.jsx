// frontend/src/components/Login/LoginPage.jsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from './LoginForm';
import NotificationBar from './NotificationBar';
import './LoginPage.css';

function LoginPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState('');
  const [showAutoLogin, setShowAutoLogin] = useState(false);
  const [error, setError] = useState('');
  const [isAutoLoginLoading, setIsAutoLoginLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  // ✅ CSRF 토큰 가져오기
  const getCSRFToken = async () => {
    try {
      const res = await fetch('/api/account/get-csrf/', {
        credentials: 'include',
      });
      const data = await res.json();
      return data.csrfToken;
    } catch (err) {
      console.error('CSRF 토큰 가져오기 실패:', err);
      return null;
    }
  };

  // 자동 로그인
  const handleAutoLogin = async () => {
    if (!code) {
      setError('코드를 입력해주세요.');
      return;
    }

    setIsAutoLoginLoading(true);
    setError('');

    try {
      const csrfToken = await getCSRFToken();

      const res = await fetch('/api/account/auto-login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });

      if (!res.ok) throw new Error('자동 로그인 실패');

      const data = await res.json();
      setUserId(data.user_id);
    } catch (err) {
      console.error('자동 로그인 오류:', err);
      setError('자동 로그인 실패: 코드가 유효하지 않거나 만료됨');
    } finally {
      setIsAutoLoginLoading(false);
    }
  };

  // 더미 로그인 (개발용)
  const handleDummyLogin = () => {
    const dummyUser = {
      uuid: 'user_dummy',
      display: '더미 사용자',
      username: 'dummy_user'
    };
    setUserInfo(dummyUser);
    setUserId('dummy');
    navigate('/Main_page/TitlePage');
  };

  const handleLoginOther = () => {
    localStorage.removeItem('autoLoginUser');
    setShowAutoLogin(false);
    setUserId(null);
    setUserInfo(null);
    setCode('');
    setError('');
  };

  // 로그인 성공 후 사용자 정보 조회
  useEffect(() => {
    if (!userId || userId === 'dummy') return;

    const fetchUserInfo = async () => {
      try {
        const res = await fetch('/api/account/user-info/', {
          credentials: 'include',
        });
        const data = await res.json();
        setUserInfo(data);
        navigate('/Main_page/TitlePage');
      } catch (err) {
        console.error('사용자 정보 조회 실패:', err);
        setError('로그인 후 사용자 정보를 불러오는 데 실패했습니다.');
      }
    };

    fetchUserInfo();
  }, [userId, navigate]);

  // 자동 로그인 UI 표시
  useEffect(() => {
    if (localStorage.getItem('autoLoginUser')) {
      setShowAutoLogin(true);
    }
  }, []);

  // 공지사항 불러오기
  useEffect(() => {
    const fetchNotice = async () => {
      try {
        const response = await fetch('/api/account/notice/', { credentials: 'include' });
        const data = await response.json();
        setNotice(data.notice || '');
      } catch {
        try {
          const response = await fetch('/api/notice/', { credentials: 'include' });
          const data = await response.json();
          setNotice(data.notice || '');
        } catch (error2) {
          console.log('공지 가져오기 실패:', error2);
          setNotice('공지사항을 불러올 수 없습니다.');
        }
      }
    };

    fetchNotice();
  }, []);

  return (
    <div className="medisys-container">
      <div className="medisys-content">
        <div className="medisys-left-side">
          <div className="medisys-logo-container">
            <div className="medisys-logo-icon">M</div>
            <div>
              <h1 className="medisys-brand-title">LaCID</h1>
              <p className="medisys-brand-subtitle">의료진 포털 시스템</p>
            </div>
          </div>

          <div className="medisys-branding-text">
            <h2 className="medisys-welcome-title">의료진 포털에 오신 것을 환영합니다</h2>
            <p className="medisys-welcome-subtitle">
              안전하고 효율적인 의료 정보 시스템으로<br />
              더 나은 환자 케어를 제공하세요
            </p>
          </div>

          <div className="medisys-features">
            <div className="medisys-feature-item">🏥 통합 의료 정보 시스템</div>
            <div className="medisys-feature-item">🔒 보안 강화된 환자 데이터</div>
            <div className="medisys-feature-item">📊 실시간 의료 통계 및 분석</div>
          </div>
        </div>

        <div className="medisys-right-side">
          <NotificationBar message={notice} />

          {userInfo && (
            <div className="medisys-success-box">
              <h3 className="medisys-success-title">로그인 성공!</h3>
              <p className="medisys-success-text">
                환영합니다, {userInfo.display}님<br />
                사용자 ID: {userInfo.uuid}
              </p>
            </div>
          )}

          <div className="medisys-dummy-login">
            <button onClick={handleDummyLogin} className="medisys-dummy-login-button">
              🚀 더미 로그인 (개발용)
            </button>
            <p className="medisys-dummy-info">
              ID: aa | PW: qq11ww22 | Code: a114e97d
            </p>
          </div>

          {/* 실제 로그인 폼 (세션 기반 처리되도록 별도 구현 필요) */}
          <LoginForm onLoginSuccess={setUserId} />

          {/* 자동 로그인 */}
          {showAutoLogin && (
            <div className="medisys-auto-login">
              <h4 className="medisys-auto-login-title">자동 로그인</h4>
              <div className="medisys-auto-login-form">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
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
                  <button onClick={handleLoginOther} className="medisys-other-account-button">
                    다른 계정
                  </button>
                </div>
                {error && <div className="medisys-error-box">{error}</div>}
              </div>
            </div>
          )}

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
          © 2025 LaCID. 모든 권리 보유. | 개인정보처리방침 | 이용약관
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
