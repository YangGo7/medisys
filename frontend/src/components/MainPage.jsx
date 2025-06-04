import React, { useState } from 'react';
import OrderForm from './LIS/OrderForm';
import SampleForm from './LIS/SampleForm';
import DicomViewer from './RIS/DicomViewer';
import LisHome from './LIS/LisHome';
import OCSLogPage from './OCS/OCSLogPage';
import LoginPage from './login/LoginPage';
import Calendar from 'react-calendar'; // 설치 필요: npm install react-calendar
import 'react-calendar/dist/Calendar.css';
import './MainPage.css'; // 스타일 분리 권장

export default function MainPage() {
  const [currentTab, setCurrentTab] = useState('order');
  const [username, setUsername] = useState('홍길동'); // 실제 로그인 상태에 따라 변경 필요

  const renderTab = () => {
    switch (currentTab) {
      case 'order': return <OrderForm />;
      case 'sample': return <SampleForm />;
      case 'dicom': return <DicomViewer />;
      case 'lis': return <LisHome />;
      case 'logs': return <OCSLogPage />;
      case 'logins': return <LoginPage />;
      default: return <OrderForm />;
    }
  };

  return (
    <div className="main-container">
      {/* 상단 Chart Header */}
      <header className="chart-header">
        <div className="search-bar">
          🔍 환자 검색: <input type="text" placeholder="환자 이름/번호 입력" />
        </div>
      </header>

      <div className="content-body">
        {/* 좌측 사이드바 */}
        <aside className="sidebar">
          <button onClick={() => setCurrentTab('order')}>💊 처방</button>
          <button onClick={() => setCurrentTab('sample')}>🧪 검체</button>
          <button onClick={() => setCurrentTab('dicom')}>🖼️ DICOM</button>
          <button onClick={() => setCurrentTab('lis')}>🏠 LIS</button>
          <button onClick={() => setCurrentTab('logs')}>📄 로그</button>
          <button onClick={() => setCurrentTab('logins')}>🔐 로그인</button>
          <a href="/emr"><button>📁 EMR 이동</button></a>
        </aside>

        {/* 메인 패널 */}
        <main className="main-panel">
          <h2>Welcome, Dr. {username}</h2>
          <div className="tab-content">{renderTab()}</div>
        </main>

        {/* 우측 하단 캘린더 */}
        <div className="calendar-container">
          <Calendar />
        </div>
      </div>
    </div>
  );
}
