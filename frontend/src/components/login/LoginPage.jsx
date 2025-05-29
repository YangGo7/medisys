import React, { useEffect, useState } from 'react';
import LoginForm from './LoginForm';
import NotificationBar from './NotificationBar';
import { autoLogin } from './auth';
import axios from 'axios';

function LoginPage() {
  const [userId, setUserId] = useState(null);
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState('');
  const [showAutoLogin, setShowAutoLogin] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const autoId = localStorage.getItem('autoLoginUser');
    if (autoId) {
      setShowAutoLogin(true);  // 자동 로그인 UI 표시
    }
  }, []);

  useEffect(() => {
    axios.get('/api/notice/')
      .then(res => setNotice(res.data.notice || ''))
      .catch(() => setNotice(''));
  }, []);

  const handleAutoLogin = async () => {
    try {
      const res = await autoLogin({ code });
      setUserId(res.data.user_id);
    } catch (err) {
      setError('자동 로그인 실패: 코드가 유효하지 않거나 만료됨');
    }
  };

  if (userId) {
    window.location.href = '/main';
    return null;
  }

  return (
    <div>
      <h2>Login page A</h2>
      <LoginForm onLoginSuccess={setUserId} />

      {showAutoLogin && (
        <div style={{ marginTop: '20px' }}>
          <h4>Auto login</h4>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="부여 코드 입력"
          />
          <button onClick={handleAutoLogin}>자동 로그인</button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
      )}

      <NotificationBar message={notice} />
    </div>
  );
}

export default LoginPage;
