// src/pages/MainPage.jsx
import React, { useState } from 'react';
import OrderForm from './LIS/OrderForm';
import SampleForm from './LIS/SampleForm';
import DicomViewer from './RIS/DicomViewer';
import LisHome from './LIS/LisHome';
import OCSLogPage from './OCS/OCSLogPage';
import LoginPage from './login/LoginPage';
// ❌ EmrMainPage import 제거

export default function MainPage() {
  const [currentTab, setCurrentTab] = useState('order');

  const renderTab = () => {
    switch (currentTab) {
      case 'order':
        return <OrderForm />;
      case 'sample':
        return <SampleForm />;
      case 'dicom':
        return <DicomViewer />;
      case 'lis':
        return <LisHome />;
      case 'logs':
        return <OCSLogPage />;
      case 'logins':
        return <LoginPage/>;
      default:
        return <OrderForm />;  // 기본 탭 설정
    }
  };

  return (
    <div className="App" style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
      <div style={{ display: 'flex', gap: '10px', padding: '1rem' }}>
        <button onClick={() => setCurrentTab('order')}>처방</button>
        <button onClick={() => setCurrentTab('sample')}>검체</button>
        <button onClick={() => setCurrentTab('dicom')}>DICOM 뷰어</button>
        <button onClick={() => setCurrentTab('lis')}>LIS 홈</button>
        <button onClick={() => setCurrentTab('logs')}>로그</button>
        <button onClick={()=>setCurrentTab('logins')}>로그인</button>
        {/* EMR은 React Router의 별도 path로 이동 */}
        <a href="/emr"><button>EMR 페이지 이동</button></a>
      </div>
      <main style={{ padding: '1rem' }}>
        {renderTab()}
      </main>
    </div>
  );
}
