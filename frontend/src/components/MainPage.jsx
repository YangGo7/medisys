// MainPage.js (src/components/MainPage.js)
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
import './MainPage.css';

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
          <button onClick={() => setCurrentTab('TitlePage')}>🏠 홈</button>
          <button onClick={() => setCurrentTab('order')}>💊 처방</button>
          <button onClick={() => setCurrentTab('sample')}>🧪 검체</button>
          <button onClick={() => setCurrentTab('dicom')}>🖼️ DICOM</button>
          <button onClick={() => setCurrentTab('logs')}>📄 로그</button>
          <button onClick={() => setCurrentTab('logins')}>🔐 로그인</button>
          <button onClick={() => setCurrentTab('patientsList')}>🧑‍🤝‍🧑 환자 목록</button>
          <button onClick={() => setCurrentTab('Medicalemployee')}>👨‍⚕️ 의료인 정보</button>
          <button onClick={() => setCurrentTab('lis')}>🧪 LIS 홈</button>
          <button onClick={() => setCurrentTab('RISPage')}>📋 RIS</button>
          <Link to="/emr"><button>📁 EMR 이동</button></Link>
        </nav>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="main-panel ivory">
        {!sidebarOpen && (
          <button
            className="sidebar-toggle-floating"
            onClick={() => setSidebarOpen(true)}
            aria-label="사이드바 열기"
          >
            ▶
          </button>
        )}
        <div className="tab-content">
          {renderTab()}
        </div>
      </main>
    </div>
  );
}
