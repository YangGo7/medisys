import React from 'react';
import { Outlet } from 'react-router-dom';
import LISSidebar from './LISSidebar';

const LisHome = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* 상단 헤더 */}
      <div
        style={{
          width: '100%',
          padding: '1rem 2rem',
          backgroundColor: '#fff',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 'bold',
          fontSize: '18px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        }}>
         <span role="img" aria-label="flask" style={{ marginRight: '0.5rem' }}>
            🧪 LIS 시스템
         </span>
        
      </div>

      {/* 콘텐츠 영역 */}
      <div style={{ display: 'flex', flex: 1 }}>
        <LISSidebar />
        <div style={{ flex: 1, padding: '2rem' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default LisHome;
