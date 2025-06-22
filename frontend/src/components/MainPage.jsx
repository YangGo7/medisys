import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import OrderForm from './LIS/OrderForm';
import SampleForm from './LIS/SampleForm';
import LisHome from './LIS/LisHome';
import OCSLogPage from './OCS/OCSLogPage';
import LoginPage from './login/LoginPage';
import PatientsList from './patientsList';
import Medicalemployee from './Medicalemployee';
import DicomViewer from './OHIF/OHIFViewer';
import RISPage from '../pacsapp';
import TitlePage from './Main_page/TitlePage';

export default function MainPage() {
  const [currentTab, setCurrentTab] = useState('TitlePage');
  const [username, setUsername] = useState('홍길동');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderTab = () => {
    switch (currentTab) {
      case 'logins': return <LoginPage />;
      case 'order': return <OrderForm />;
      case 'sample': return <SampleForm />;
      case 'dicom': return <DicomViewer />;
      case 'lis': return <LisHome />;
      case 'logs': return <OCSLogPage />;
      case 'TitlePage': return <TitlePage setCurrentTab={setCurrentTab} />;
      case 'patientsList': return <PatientsList />;
      case 'Medicalemployee': return <Medicalemployee />;
      case 'RISPage': return <RISPage />;
      default: return <TitlePage setCurrentTab={setCurrentTab} />;
    }
  };

  const menuItems = [
    { id: 'TitlePage', icon: '🏠', label: '홈', color: '#3498db' },
    { id: 'order', icon: '💊', label: '처방', color: '#e74c3c' },
    { id: 'sample', icon: '🧪', label: '검체', color: '#2ecc71' },
    { id: 'dicom', icon: '🖼️', label: 'DICOM', color: '#9b59b6' },
    { id: 'logs', icon: '📄', label: '로그', color: '#f39c12' },
    { id: 'logins', icon: '🔐', label: '로그인', color: '#34495e' },
    { id: 'patientsList', icon: '🧑‍🤝‍🧑', label: '환자 목록', color: '#16a085' },
    { id: 'Medicalemployee', icon: '👨‍⚕️', label: '의료인 정보', color: '#8e44ad' },
    { id: 'lis', icon: '🧪', label: 'LIS 홈', color: '#27ae60' },
    { id: 'RISPage', icon: '📋', label: 'RIS', color: '#2980b9' }
  ];

  return (
    <div className="modern-main-container">
      {/* 현대적 사이드바 */}
      <aside className={`modern-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo-section">
            <div className="logo-icon">🔷</div>
            <div className={`logo-text ${!sidebarOpen ? 'hidden' : ''}`}>
              <h3>메디시스</h3>
              <span>v3.0</span>
            </div>
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="사이드바 토글"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <div className="user-profile">
          <div className="user-avatar">
            <span>{username.charAt(0)}</span>
          </div>
          <div className={`user-info ${!sidebarOpen ? 'hidden' : ''}`}>
            <h4>{username}</h4>
            <span>의사</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${currentTab === item.id ? 'active' : ''}`}
              onClick={() => setCurrentTab(item.id)}
              style={{ '--item-color': item.color }}
              title={!sidebarOpen ? item.label : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className={`nav-label ${!sidebarOpen ? 'hidden' : ''}`}>
                {item.label}
              </span>
              {currentTab === item.id && <div className="active-indicator"></div>}
            </button>
          ))}
          
          <div className="nav-divider"></div>
          
          <Link to="/emr" className="nav-item emr-link">
            <span className="nav-icon">📁</span>
            <span className={`nav-label ${!sidebarOpen ? 'hidden' : ''}`}>
              EMR 이동
            </span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className={`system-status ${!sidebarOpen ? 'hidden' : ''}`}>
            <div className="status-indicator">
              <span className="status-dot"></span>
              <span>시스템 정상</span>
            </div>
          </div>
        </div>
      </aside>

      {/* 메인 콘텐츠 영역 */}
      <main className="modern-main-content">
        {!sidebarOpen && (
          <button
            className="floating-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="메뉴 열기"
          >
            ☰
          </button>
        )}
        
        <div className="content-wrapper">
          {renderTab()}
        </div>
      </main>
    </div>
  );
}