// src/components/EMR/Sidebar.jsx - 깔끔한 의료 전문가용 사이드바
import React from 'react';
import NotificationBell from './NotificationBell';
import { 
  Home, 
  Users, 
  Stethoscope, 
  Monitor, 
  Settings,
  Activity,
  Calendar,
  FileText
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, onBellClick }) => {
  // 의료 전문가용 메뉴 구성
  const menus = [
    { 
      name: '홈', 
      icon: Home,
      description: '대시보드'
    },
    { 
      name: '환자 관리', 
      icon: Users,
      description: '환자 현황'
    },
    { 
      name: '의사 대시보드', 
      icon: Stethoscope,
      description: '진료 관리'
    },
    { 
      name: '의료영상 뷰어', 
      icon: Monitor,
      description: '영상 진단'
    },
    { 
      name: '설정', 
      icon: Settings,
      description: '시스템 설정'
    },
  ];

  const isActive = (menu) => activeTab === menu;

  return (
    <div className="medical-sidebar">
      {/* 🏥 Doc Board 로고 */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Activity size={28} style={{ color: 'var(--primary-purple)' }} />
          <div className="logo-text">
            <h2>Doc Board</h2>
            <p>의료 관리 시스템</p>
          </div>
        </div>
      </div>

      {/* 🔔 알림 벨 */}
      <div className="sidebar-notification">
        <div
          className="notification-wrapper"
          role="button"
          aria-label="알림 열기"
          onClick={onBellClick}
        >
          <NotificationBell />
        </div>
      </div>

      {/* 📋 메뉴 리스트 */}
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {menus.map(menu => {
            const IconComponent = menu.icon;
            const active = isActive(menu.name);
            
            return (
              <li
                key={menu.name}
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={() => setActiveTab(menu.name)}
              >
                <div className="nav-link">
                  <div className="nav-icon">
                    <IconComponent size={20} />
                  </div>
                  <div className="nav-content">
                    <span className="nav-title">{menu.name}</span>
                    <span className="nav-description">{menu.description}</span>
                  </div>
                  {active && <div className="nav-indicator" />}
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 🩺 의료진 정보 (하단) */}
      <div className="sidebar-footer">
        <div className="doctor-info">
          <div className="doctor-avatar">
            <Stethoscope size={20} />
          </div>
          <div className="doctor-details">
            <h4>의료진</h4>
            <p>온라인</p>
          </div>
        </div>
      </div>

      {/* CSS 스타일 */}
      <style jsx>{`
        .medical-sidebar {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--background-card);
          border-right: 1px solid var(--border-gray);
          overflow: hidden;
        }

        .sidebar-header {
          padding: 2rem 1.5rem 1.5rem;
          border-bottom: 1px solid var(--border-gray);
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .logo-text h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-dark);
          letter-spacing: -0.5px;
        }

        .logo-text p {
          margin: 0;
          font-size: 0.75rem;
          color: var(--text-medium);
          margin-top: 0.25rem;
        }

        .sidebar-notification {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border-gray);
          display: flex;
          justify-content: center;
        }

        .notification-wrapper {
          cursor: pointer;
          padding: 0.75rem;
          border-radius: var(--border-radius);
          transition: var(--transition-base);
          background: var(--light-gray);
          border: 1px solid var(--border-gray);
        }

        .notification-wrapper:hover {
          background: var(--primary-purple);
          border-color: var(--primary-purple);
          transform: translateY(-1px);
        }

        .notification-wrapper:hover :global(.notification-bell) {
          color: var(--text-primary);
        }

        .sidebar-nav {
          flex: 1;
          padding: 1.5rem 1rem;
          overflow-y: auto;
        }

        .nav-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-item {
          cursor: pointer;
          border-radius: var(--border-radius);
          transition: var(--transition-base);
          position: relative;
          overflow: hidden;
        }

        .nav-item:hover {
          background: var(--light-gray);
        }

        .nav-item.active {
          background: var(--primary-purple);
          box-shadow: var(--shadow-card);
        }

        .nav-item.active:hover {
          background: var(--primary-purple-dark);
        }

        .nav-link {
          display: flex;
          align-items: center;
          padding: 1rem 1.25rem;
          gap: 1rem;
          position: relative;
        }

        .nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          color: var(--text-medium);
          transition: var(--transition-base);
        }

        .nav-item.active .nav-icon {
          color: var(--text-primary);
        }

        .nav-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          flex: 1;
        }

        .nav-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-dark);
          transition: var(--transition-base);
          letter-spacing: -0.3px;
        }

        .nav-item.active .nav-title {
          color: var(--text-primary);
        }

        .nav-description {
          font-size: 0.75rem;
          color: var(--text-medium);
          transition: var(--transition-base);
        }

        .nav-item.active .nav-description {
          color: var(--text-secondary);
        }

        .nav-indicator {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 60%;
          background: var(--text-primary);
          border-radius: 2px 0 0 2px;
        }

        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid var(--border-gray);
          background: var(--light-gray);
        }

        .doctor-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: var(--background-card);
          border-radius: var(--border-radius);
          border: 1px solid var(--border-gray);
        }

        .doctor-avatar {
          width: 40px;
          height: 40px;
          background: var(--primary-purple);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
        }

        .doctor-details h4 {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-dark);
        }

        .doctor-details p {
          margin: 0;
          font-size: 0.75rem;
          color: var(--primary-purple);
          margin-top: 0.25rem;
        }

        /* 반응형 디자인 */
        @media (max-width: 1024px) {
          .sidebar-header {
            padding: 1.5rem 1rem;
          }

          .sidebar-logo {
            gap: 0.75rem;
          }

          .logo-text h2 {
            font-size: 1.1rem;
          }

          .nav-link {
            padding: 0.875rem 1rem;
          }

          .sidebar-footer {
            padding: 1rem;
          }
        }

        @media (max-width: 768px) {
          .medical-sidebar {
            width: 60px;
            overflow: visible;
          }

          .logo-text,
          .nav-content,
          .nav-description,
          .doctor-details {
            display: none;
          }

          .sidebar-header {
            padding: 1rem 0.5rem;
            text-align: center;
          }

          .sidebar-notification {
            padding: 0.75rem 0.5rem;
          }

          .nav-link {
            padding: 1rem 0.5rem;
            justify-content: center;
          }

          .nav-indicator {
            display: none;
          }

          .doctor-info {
            justify-content: center;
            padding: 0.75rem;
          }

          .doctor-avatar {
            width: 32px;
            height: 32px;
          }
        }

        /* 스크롤바 스타일 */
        .sidebar-nav::-webkit-scrollbar {
          width: 4px;
        }

        .sidebar-nav::-webkit-scrollbar-track {
          background: transparent;
        }

        .sidebar-nav::-webkit-scrollbar-thumb {
          background: var(--border-gray);
          border-radius: 2px;
        }

        .sidebar-nav::-webkit-scrollbar-thumb:hover {
          background: var(--primary-purple-light);
        }

        /* 호버 애니메이션 */
        .nav-item:not(.active):hover .nav-icon {
          color: var(--primary-purple);
          transform: scale(1.1);
        }

        .nav-item:not(.active):hover .nav-title {
          color: var(--primary-purple);
        }

        /* 활성 상태 애니메이션 */
        .nav-item.active {
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            transform: translateX(-5px);
            opacity: 0.8;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* 포커스 스타일 접근성 */
        .nav-item:focus {
          outline: 2px solid var(--primary-purple);
          outline-offset: 2px;
        }

        .notification-wrapper:focus {
          outline: 2px solid var(--primary-purple);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
};

export default Sidebar;