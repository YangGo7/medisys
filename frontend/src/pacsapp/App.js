// src/viewerApp/App.js
import React, { useState } from 'react';
import Navigation from './components/Navigation/Navigation';
import StudyRequestForm from './components/WorkList/StudyRequestForm';
import WorkList from './components/WorkList/WorkList';
import OHIFViewer from './components/OHIFViewer';
import PacsExplorer2 from './components/PacsExplorer2/PacsExplorer2';

import './App.css';

function ViewerApp() {
  const [currentPage, setCurrentPage] = useState('request');

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'request':
        return <StudyRequestForm />;
      case 'results':
        return <WorkList />;
      case 'schedule':
        return <OHIFViewer />;
      case 'pacs':
        return <PacsExplorer2 />;
      case 'settings':
        return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2>⚙️ 설정 페이지</h2>
            <p>시스템 설정이 여기에 들어갑니다.</p>
            <div style={{
              marginTop: '30px',
              padding: '20px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #dee2e6'
            }}>
              <h3>시스템 정보</h3>
              <p>• Django Backend: localhost:8000</p>
              <p>• React Frontend: localhost:3000</p>
              <p>• Orthanc PACS: localhost:8042</p>
              <p>• PACS Explorer 2: localhost:8042/ui/app/</p>
            </div>
          </div>
        );
      default:
        return <StudyRequestForm />;
    }
  };

  return (
    <div className="viewer-app">
      <Navigation 
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
      {renderCurrentPage()}
    </div>
  );
}

export default ViewerApp;
