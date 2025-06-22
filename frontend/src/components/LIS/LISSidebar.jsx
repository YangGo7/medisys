import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import NotificationBell from '../EMR/NotificationBell';
import { FaFlask, FaVial, FaClipboardList, FaFileAlt, FaCheckCircle } from 'react-icons/fa';

const LISSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menus = [
    { name: '오더 목록 확인', path: '/lis/orders', icon: <FaClipboardList /> },
    { name: '샘플 생성하기', path: '/lis/sample/new', icon: <FaVial /> },
    { name: '샘플 목록 확인', path: '/lis/samples', icon: <FaFlask /> },
    { name: '결과 기록하기', path: '/lis/result/new', icon: <FaFileAlt /> },
    { name: '결과 목록 확인', path: '/lis/result-list', icon: <FaCheckCircle /> },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <aside
      style={{
        width: '270px',
        backgroundColor: '#ffffff',
        height: '100vh',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 1rem',
        boxSizing: 'border-box',
      }}
    >
      {/* 상단 타이틀 */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '0.25rem' }}></h1>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>1조 메디컬</div>
      </div>

      {/* 알림 */}
      <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
        <NotificationBell />
      </div>

      {/* 메뉴 */}
      <nav style={{ flex: 1 }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {menus.map((menu) => (
            <li
              key={menu.path}
              onClick={() => navigate(menu.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                marginBottom: '0.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: isActive(menu.path) ? '#e0f2fe' : 'transparent',
                color: isActive(menu.path) ? '#2563eb' : '#374151',
                fontWeight: isActive(menu.path) ? '600' : '500',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isActive(menu.path)) e.target.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                if (!isActive(menu.path)) e.target.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ marginRight: '0.75rem', fontSize: '16px' }}>{menu.icon}</span>
              {menu.name}
            </li>
          ))}
        </ul>
      </nav>

      {/* 하단 시스템 상태 */}
      <footer style={{ fontSize: '12px', color: '#9ca3af', marginTop: 'auto', paddingTop: '2rem' }}>
        병원 시스템 상태: 정상 운영 중
      </footer>
    </aside>
  );
};

export default LISSidebar;
