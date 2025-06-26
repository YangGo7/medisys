// src/components/Sidebar.jsx
import React from 'react';
import NotificationBell from './NotificationBell';

const Sidebar = ({ activeTab, setActiveTab, onBellClick }) => {
  // ✅ 대기 목록과 완료 환자 목록 제거, 진료 대시보드 추가
  const menus = [
    '홈',
    '접수',
    '환자 관리',  // ✅ 통합된 환자 상태 관리
    '의사 대시보드',
    '설정',
  ];

  const isActive = (menu) => activeTab === menu;

  return (
    <div
      className="sidebar"
      style={{
        width: '180px',
        backgroundColor: '#f2f2f2',
        padding: '1rem 0.5rem',
      }}
    >
      {/* ─── 제목 박스 ─── */}
      <div
        style={{
          border: '1px solid #d9d9d9',
          backgroundColor: '#ffffff',
          borderRadius: '6px',
          padding: '0.5rem 0.75rem',
          margin: '0 0 1rem',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <h2 style={{ fontSize: '18px', margin: 0, color: '#333' }}>1조 메디컬</h2>
      </div>

      {/* ─── 알림 벨 ─── */}
      <div
        className="notif-wrapper"
        role="button"
        aria-label="알림 열기"
        onClick={onBellClick}
        style={{
          margin: '0 auto 1.5rem',
          textAlign: 'center',
          cursor: 'pointer',
        }}
      >
        <NotificationBell />
      </div>

      {/* ─── 메뉴 리스트 ─── */}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {menus.map(menu => (
          <li
            key={menu}
            onClick={() => setActiveTab(menu)}
            style={{
              padding: '0.5rem 0.75rem',
              cursor: 'pointer',
              fontWeight: isActive(menu) ? 'bold' : 'normal',
              backgroundColor: isActive(menu) ? '#e6f7ff' : 'transparent',
              borderRadius: '4px',
              marginBottom: '0.25rem',
            }}
          >
            {menu}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;