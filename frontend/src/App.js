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

import './App.css';

function App() {
  console.log("✅ API URL:", process.env.REACT_APP_API_URL);

  return (
    <Router>
      <Routes>
        {/* 기존 메인 페이지 */}
        <Route path="/" element={<Navigate to="/main" />} />
        <Route path="/main" element={<MainPage />} />

        {/* EMR 페이지 */}
        <Route path="/emr" element={<EmrMainPage />} />

        {/* 나머지 페이지 유지 */}
        <Route path="/lis" element={<LisHome />} />
        <Route path="/order/new" element={<OrderForm />} />
        <Route path="/orders" element={<OrderListPage />} />
        <Route path="/sample/new" element={<SampleForm />} />
        <Route path="/samples" element={<SampleListPage />} />
        <Route path="/result/new" element={<ResultInputForm />} />
        <Route path="/tests" element={<OpenMRSPatientList />} />
        <Route path="/ocs" element={<OCSLogPage />} />

        {/* 예외 경로는 메인으로 */}
        <Route path="*" element={<Navigate to="/main" />} />
      </Routes>
    </Router>
  );
}

export default App;
