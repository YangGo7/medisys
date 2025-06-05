// App.js - ThemeContext 적용 + 테마 클래스 적용 버전
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import SampleForm from './components/LIS/SampleForm';
import LisHome from './components/LIS/LisHome';
import OrderForm from './components/LIS/OrderForm';
import OrderListPage from './components/LIS/OrderListPage';
import SampleListPage from './components/LIS/SampleListPage';
import ResultInputForm from './components/LIS/ResultInputForm';
import OpenMRSPatientList from './components/LIS/tests';
import OCSLogPage from './components/OCS/OCSLogPage';
import VitalAlertBanner from './components/EMR/VitalAlert';
import MainPage from './components/MainPage';
import EmrMainPage from './components/EMR/EmrMainPage';
import PatientList from './components/patientsList';
import SettingsPage from './components/EMR/SettingsPage';
import LisResult from './components/LIS/ResultCdss';
import { ThemeProvider, useTheme } from './components/EMR/contexts/ThemeContext';

import './App.css';

// ⭐ 테마 적용을 위한 래퍼 컴포넌트
const ThemedApp = () => {
  const { theme } = useTheme(); // 'light' or 'dark'

  return (
    <div className={`app-wrapper ${theme}`}>
      <Router>
        <Routes>
          {/* 기존 메인 페이지 */}
          <Route path="/" element={<Navigate to="/main" />} />
          <Route path="/main" element={<MainPage />} />

          {/* EMR 페이지 */}
          <Route path="/emr" element={<EmrMainPage />} />
          <Route path="/emr/Settings" element={<SettingsPage />} />

          {/* LIS 관련 페이지 */}
          <Route path="/lis" element={<LisHome />} />
          <Route path="/order/new" element={<OrderForm />} />
          <Route path="/orders" element={<OrderListPage />} />
          <Route path="/sample/new" element={<SampleForm />} />
          <Route path="/sample/new/:orderId" element={<SampleForm />} />
          <Route path="/samples" element={<SampleListPage />} />
          <Route path="/result/new" element={<ResultInputForm />} />
          <Route path="/result/new/:sampleId" element={<ResultInputForm />} />
          <Route path="/results" element={<LisResult />} />
          <Route path="/tests" element={<OpenMRSPatientList />} />
          <Route path="/ocs/log" element={<OCSLogPage />} />
          <Route path="/patients" element={<PatientList />} />

          {/* 예외 경로는 메인으로 */}
          <Route path="*" element={<Navigate to="/main" />} />
        </Routes>
      </Router>
    </div>
  );
};

function App() {
  console.log("✅ API URL:", process.env.REACT_APP_API_URL);

  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

export default App;
