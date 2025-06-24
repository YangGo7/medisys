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

import TitlePage from './Main_page/TitlePage';
import StatisticsBoard from './Main_page/StatisticsBoard';
import Controlpage from './Main_page/Control_page';
import './MainPage.css';
import DocDashBoard from './DocDashBoard/DocDashBoard';

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
      case 'StatisticsBoard': return <StatisticsBoard />;
      case 'Controlpage': return <Controlpage />;
      case 'DocDashBoard': return <DocDashBoard />;
      default: return <TitlePage setCurrentTab={setCurrentTab} />;
    }
  };

  const menuItems = [
    { id: 'TitlePage', icon: '🏠', label: '홈' },
    { id: 'dicom', icon: '🖼️', label: 'DICOM(제거 예정)' },
    { id: 'DocDashBoard', icon: '🖥️', label: 'DocDashBoard' },
    { id: 'logins', icon: '🔐', label: '로그인' },
    { id: 'lis', icon: '🧪', label: 'LIS' },
    { id: 'RISPage', icon: '📋', label: 'RIS' },
    { id: 'Controlpage', label: 'Controlpage' },
  ];

  const handleMenuClick = (itemId) => {
    if (itemId === 'RISPage') {
      window.open('/ris', '_blank', 'noopener,noreferrer');
    } else if (itemId === 'lis') {
      window.open('/lis', '_blank', 'noopener,noreferrer');
    } else {
      setCurrentTab(itemId);
    }
  };

  return (
    <div className="main-container">
      {/* 사이드바 */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo">
            🔷 메디시스 v3.0
            <button
              className="sidebar-toggle-inline"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="사이드바 토글"
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>
          <div className="user">{username} 님</div>
        </div>

        <nav>
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item.id)}
              className={currentTab === item.id ? 'active' : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}

          {/* EMR은 새 탭 */}
          <a href="/emr" target="_blank" rel="noopener noreferrer">
            <button className="emr-link-btn">
              <span className="nav-icon">📁</span>
              <span className="nav-label">EMR 이동</span>
            </button>
          </a>
        </nav>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className={`main-panel ${sidebarOpen ? 'with-sidebar' : 'full-width'}`}>
        {!sidebarOpen && (
          <button
            className="sidebar-toggle-floating"
            onClick={() => setSidebarOpen(true)}
            aria-label="사이드바 열기"
          >
            ☰
          </button>
        )}

        <div className="tab-content">
          {renderTab()}
        </div>
      </main>
    </div>
  );
}
