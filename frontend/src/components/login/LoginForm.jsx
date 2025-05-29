import React, { useState } from 'react';
import { login, autoLogin } from './auth';

function LoginForm({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [autoLoginChecked, setAutoLoginChecked] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      const res = await login({ username, password, code });
      if (autoLoginChecked) {
        localStorage.setItem('autoLoginUser', res.data.user_id);
      }
      onLoginSuccess(res.data.user_id);
    } catch (err) {
      setError('로그인 실패: 아이디/비번/코드 확인');
    }
  };

  return (
    <div className="login-box">
      <div>ID <input value={username} onChange={e => setUsername(e.target.value)} /></div>
      <div>PW <input type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
      <div>Code <input value={code} onChange={e => setCode(e.target.value)} /></div>

      <div>
        <label>
          <input type="checkbox" checked={autoLoginChecked} onChange={e => setAutoLoginChecked(e.target.checked)} />
          Auto login
        </label>
        <button onClick={handleLogin}>login</button>
      </div>

      <div>
        <button onClick={() => localStorage.removeItem('autoLoginUser')}>Login-other</button>
        <div>Forgot code</div>
      </div>

      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
}

export default LoginForm;
