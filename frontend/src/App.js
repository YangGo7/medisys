import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import StudyRequestForm from './components/StudyRequestForm';
import WorkList from './components/WorkList';
import StudyDetail from './components/StudyDetail';
import SampleForm from './components/SampleForm';
import LisHome from './components/LisHome';
import OrderForm from './components/OrderForm';
import OrderListPage from './components/OrderListPage';
import SampleListPage from './components/SampleListPage';

import './App.css';
import OpenMRSPatientList from './components/tests';

function MainApp() {
  const [currentPage, setCurrentPage] = useState('request');
  const [selectedStudyId, setSelectedStudyId] = useState(null);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setSelectedStudyId(null); // 페이지 전환 시 선택된 검사 초기화
    console.log('페이지 변경:', page);
  };

  const handleStudySelect = (studyId) => {
    setSelectedStudyId(studyId);
    console.log('선택된 검사 ID:', studyId);
  };

  const handleBackToList = () => {
    setSelectedStudyId(null);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'request':
        return <StudyRequestForm />;
      case 'results':
        return selectedStudyId
          ? <StudyDetail studyId={selectedStudyId} onBack={handleBackToList} />
          : <WorkList onStudySelect={handleStudySelect} />;
      case 'schedule':
        return (
          <div style={{ 
            padding: '2rem', 
            textAlign: 'center',
            backgroundColor: '#f8f9fa',
            minHeight: '400px',
            borderRadius: '8px',
            margin: '0 20px'
          }}>
            <h2 style={{ color: '#2c3e50', marginBottom: '1rem' }}>일정 관리</h2>
            <p style={{ color: '#6c757d' }}>일정 관리 페이지가 여기에 표시됩니다.</p>
          </div>
        );
      case 'settings':
        return (
          <div style={{ 
            padding: '2rem', 
            textAlign: 'center',
            backgroundColor: '#f8f9fa',
            minHeight: '400px',
            borderRadius: '8px',
            margin: '0 20px'
          }}>
            <h2 style={{ color: '#2c3e50', marginBottom: '1rem' }}>설정</h2>
            <p style={{ color: '#6c757d' }}>설정 페이지가 여기에 표시됩니다.</p>
          </div>
        );
      default:
        return <StudyRequestForm />;
    }
  };

  return (
    <div className="App" style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
      <Navigation currentPage={currentPage} onPageChange={handlePageChange} />
      <main>
        {renderCurrentPage()}
      </main>
    </div>
  );
}

function App() {
  console.log("✅ API URL:", process.env.REACT_APP_API_URL);

  return (
    <Router>
      <Routes>
        <Route path="/lis" element={<LisHome />} />
        <Route path="/order/new" element={<OrderForm />} />
        <Route path="/orders" element={<OrderListPage />} />
        <Route path="/sample/new" element={<SampleForm />} />
        <Route path="/samples" element={<SampleListPage />} />
        <Route path="/tests" element={<OpenMRSPatientList />} />
        <Route path="*" element={<MainApp />} />
      </Routes>
    </Router>
  );
}

export default App;
