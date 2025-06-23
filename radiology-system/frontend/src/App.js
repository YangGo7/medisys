import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Home from './pages/Home';
import './App.css';
import Dashboard from './pages/Dashboard';
import { DoctorProvider } from './contexts/DoctorContext'; // 추가
import PacsPage from './pages/PACS/PacsPage';


function App() {
  return (
    <DoctorProvider>
      <Router>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pacs" element={<PacsPage />} />
            <Route path="/statistics" element={
              <div style={{
                background: 'linear-gradient(45deg, #f9ca24, #f0932b)', 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '2rem',
                color: 'white',
                fontWeight: 'bold'
              }}>
                📊 STATISTICS 페이지
              </div>
            } />
            <Route path="/settings" element={
              <div style={{
                background: 'linear-gradient(45deg, #6c5ce7, #a55eea)', 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '2rem',
                color: 'white',
                fontWeight: 'bold'
              }}>
                ⚙️ SETTINGS 페이지
              </div>
            } />
          </Routes>
        </MainLayout>
      </Router>
    </DoctorProvider>
  );
}

export default App;