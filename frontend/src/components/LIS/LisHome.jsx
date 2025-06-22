import React from 'react';
import { Outlet } from 'react-router-dom';
import LISSidebar from './LISSidebar';

const LisHome = () => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', overflowX: 'hidden' }}>
      
      {/* ✅ 상단 전체 헤더 */}
      <header
        style={{
          width: '100%',
          height: '64px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span role="img" aria-label="icon" style={{ fontSize: '24px', marginRight: '0.6rem' }}>🧪</span>
          <span style={{ fontSize: '20px', fontWeight: 600, color: '#1f2937' }}>LIS 시스템</span>
        </div>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>
          1조 메디컬
        </div>
      </header>

      {/* ✅ 콘텐츠 영역 */}
      <div style={{
        display: 'flex',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        <LISSidebar />

        <main
          style={{
            flex: 1,
            padding: '2rem',
            backgroundColor: '#f3f4f6',
            minHeight: 'calc(100vh - 64px)',
            overflowX: 'auto',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
              padding: '2rem',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default LisHome;
