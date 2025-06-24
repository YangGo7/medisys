// src/components/DoctorDashboardOnly.jsx
import React from 'react';
import EmrMainPage from './EMR/EmrMainPage';

const DoctorDashboardOnly = () => {
  return (
    <div style={{ height: '100vh' }}>
      <EmrMainPage defaultTab="의사 대시보드" />
    </div>
  );
};

export default DoctorDashboardOnly;
