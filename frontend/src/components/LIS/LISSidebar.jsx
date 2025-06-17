// LISSidebar.jsx (사이드바 전용)
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import NotificationBell from '../EMR/NotificationBell';

const LISSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menus = [
    // { name: '오더 생성하기', path: '/lis/order/new' },
    { name: '오더 목록 확인', path: '/lis/orders' },
    { name: '샘플 생성하기', path: '/lis/sample/new' },
    { name: '샘플 목록 확인', path: '/lis/samples' },
    { name: '결과 기록하기', path: '/lis/result/new' },
    { name: '결과 목록 확인', path: '/lis/result-list' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div style={{ width: '200px', backgroundColor: '#f2f2f2', padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: '6px', textAlign: 'center', marginBottom: '1rem', padding: '0.5rem' }}>
        <h2 style={{ fontSize: '16px' }}>1조 메디컬</h2>
      </div>
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <NotificationBell />
      </div>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {menus.map(menu => (
          <li
            key={menu.path}
            onClick={() => navigate(menu.path)}
            style={{
              padding: '0.5rem',
              cursor: 'pointer',
              backgroundColor: isActive(menu.path) ? '#e6f7ff' : 'transparent',
              fontWeight: isActive(menu.path) ? 'bold' : 'normal',
              borderRadius: '4px',
              marginBottom: '0.25rem',
            }}
          >
            {menu.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LISSidebar;
