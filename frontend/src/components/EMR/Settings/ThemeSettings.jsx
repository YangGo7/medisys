// src/components/EMR/Settings/ThemeSettings.jsx
import React from 'react';
import { useTheme } from '../contexts/ThemeContext'; // 경로 꼭 맞춰줄 것!

const ThemeSettings = () => {
  const { theme, setTheme } = useTheme(); // 전역 테마 불러오기

  const handleChange = (e) => {
    setTheme(e.target.value); // 전역 테마 변경
  };

  return (
    <section style={{ marginBottom: '2rem' }}>
      <h3>◉ 테마 설정</h3>
      <label style={{ display: 'block', marginBottom: '0.5rem' }}>
        <input
          type="radio"
          name="theme"
          value="light"
          checked={theme === 'light'}
          onChange={handleChange}
        />
        {' '}라이트 모드
      </label>
    </section>
  );
};

export default ThemeSettings;
