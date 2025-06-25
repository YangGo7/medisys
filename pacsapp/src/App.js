// // pacsapp/src/App.js - 새로운 라우트 추가
// import React from 'react';
// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import MainLayout from './components/layout/MainLayout';
// import Home from './pages/Home';
// import Dashboard from './pages/Dashboard';
// import PacsPage from './pages/PACS/PacsPage';
// import { DoctorProvider } from './contexts/DoctorContext';
// import './App.css';

// function App() {
//   return (
//     <DoctorProvider>
//       <Router>
//         <MainLayout>
//           <Routes>
//             <Route path="/" element={<Home />} />
//             <Route path="/dashboard" element={<Dashboard />} />
//             <Route path="/pacs" element={<PacsPage />} />
            
//             {/* 🆕 새로운 라우트들 추가 */}
//             <Route path="/emr" element={
//               <div style={{
//                 background: 'linear-gradient(45deg, #3b82f6, #1d4ed8)', 
//                 height: '100%', 
//                 display: 'flex', 
//                 alignItems: 'center', 
//                 justifyContent: 'center',
//                 fontSize: '2rem',
//                 color: 'white',
//                 fontWeight: 'bold',
//                 flexDirection: 'column',
//                 gap: '1rem'
//               }}>
//                 <div>🏥 EMR 시스템</div>
//                 <div style={{ fontSize: '1rem', opacity: 0.8 }}>
//                   Electronic Medical Record
//                 </div>
//               </div>
//             } />
            
//             <Route path="/lis" element={
//               <div style={{
//                 background: 'linear-gradient(45deg, #10b981, #059669)', 
//                 height: '100%', 
//                 display: 'flex', 
//                 alignItems: 'center', 
//                 justifyContent: 'center',
//                 fontSize: '2rem',
//                 color: 'white',
//                 fontWeight: 'bold',
//                 flexDirection: 'column',
//                 gap: '1rem'
//               }}>
//                 <div>🧪 LIS 시스템</div>
//                 <div style={{ fontSize: '1rem', opacity: 0.8 }}>
//                   Laboratory Information System
//                 </div>
//               </div>
//             } />
            
//             <Route path="/control" element={
//               <div style={{
//                 background: 'linear-gradient(45deg, #8b5cf6, #7c3aed)', 
//                 height: '100%', 
//                 display: 'flex', 
//                 alignItems: 'center', 
//                 justifyContent: 'center',
//                 fontSize: '2rem',
//                 color: 'white',
//                 fontWeight: 'bold',
//                 flexDirection: 'column',
//                 gap: '1rem'
//               }}>
//                 <div>🎛️ Control Page</div>
//                 <div style={{ fontSize: '1rem', opacity: 0.8 }}>
//                   System Control Panel
//                 </div>
//               </div>
//             } />
            
//             {/* 기존 라우트들 */}
//             <Route path="/statistics" element={
//               <div style={{
//                 background: 'linear-gradient(45deg, #f9ca24, #f0932b)', 
//                 height: '100%', 
//                 display: 'flex', 
//                 alignItems: 'center', 
//                 justifyContent: 'center',
//                 fontSize: '2rem',
//                 color: 'white',
//                 fontWeight: 'bold',
//                 flexDirection: 'column',
//                 gap: '1rem'
//               }}>
//                 <div>📊 STATISTICS 페이지</div>
//                 <div style={{ fontSize: '1rem', opacity: 0.8 }}>
//                   통계 및 리포트 시스템
//                 </div>
//               </div>
//             } />
            
//             <Route path="/settings" element={
//               <div style={{
//                 background: 'linear-gradient(45deg, #6c5ce7, #a55eea)', 
//                 height: '100%', 
//                 display: 'flex', 
//                 alignItems: 'center', 
//                 justifyContent: 'center',
//                 fontSize: '2rem',
//                 color: 'white',
//                 fontWeight: 'bold',
//                 flexDirection: 'column',
//                 gap: '1rem'
//               }}>
//                 <div>⚙️ SETTINGS 페이지</div>
//                 <div style={{ fontSize: '1rem', opacity: 0.8 }}>
//                   시스템 설정 및 환경 구성
//                 </div>
//               </div>
//             } />
            
//             {/* 🆕 404 페이지 추가 */}
//             <Route path="*" element={
//               <div style={{
//                 background: 'linear-gradient(45deg, #ef4444, #dc2626)', 
//                 height: '100%', 
//                 display: 'flex', 
//                 alignItems: 'center', 
//                 justifyContent: 'center',
//                 fontSize: '2rem',
//                 color: 'white',
//                 fontWeight: 'bold',
//                 flexDirection: 'column',
//                 gap: '1rem'
//               }}>
//                 <div>❌ 페이지를 찾을 수 없습니다</div>
//                 <div style={{ fontSize: '1rem', opacity: 0.8 }}>
//                   요청하신 페이지가 존재하지 않습니다
//                 </div>
//                 <button 
//                   onClick={() => window.location.href = '/'}
//                   style={{
//                     padding: '0.75rem 1.5rem',
//                     background: 'white',
//                     color: '#ef4444',
//                     border: 'none',
//                     borderRadius: '8px',
//                     fontSize: '1rem',
//                     fontWeight: '600',
//                     cursor: 'pointer',
//                     marginTop: '1rem'
//                   }}
//                 >
//                   홈으로 돌아가기
//                 </button>
//               </div>
//             } />
//           </Routes>
//         </MainLayout>
//       </Router>
//     </DoctorProvider>
//   );
// }

// export default App;

// pacsapp/src/App.js - pacsdocs 라우트 추가
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import PacsPage from './pages/PACS/PacsPage';
import PacsDocs from './pages/PacsDocs'; // 🆕 PacsDocs 추가
import OHIFViewer from './pages/OHIFViewer'; // 🆕 OHIF 추가
import { DoctorProvider } from './contexts/DoctorContext';
import './App.css';

function App() {
  return (
    <DoctorProvider>
      <Router>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pacs" element={<PacsPage />} />
            <Route path="/pacsdocs" element={<PacsDocs />} />
            <Route path="/ohif" element={<OHIF />} />
            
            {/* 🆕 새로운 라우트들 추가 */}
            <Route path="/emr" element={
              <div style={{
                background: 'linear-gradient(45deg, #3b82f6, #1d4ed8)', 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '2rem',
                color: 'white',
                fontWeight: 'bold',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div>🏥 EMR 시스템</div>
                <div style={{ fontSize: '1rem', opacity: 0.8 }}>
                  Electronic Medical Record
                </div>
              </div>
            } />
            
            <Route path="/lis" element={
              <div style={{
                background: 'linear-gradient(45deg, #10b981, #059669)', 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '2rem',
                color: 'white',
                fontWeight: 'bold',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div>🧪 LIS 시스템</div>
                <div style={{ fontSize: '1rem', opacity: 0.8 }}>
                  Laboratory Information System
                </div>
              </div>
            } />
            
            <Route path="/control" element={
              <div style={{
                background: 'linear-gradient(45deg, #8b5cf6, #7c3aed)', 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '2rem',
                color: 'white',
                fontWeight: 'bold',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div>🎛️ Control Page</div>
                <div style={{ fontSize: '1rem', opacity: 0.8 }}>
                  System Control Panel
                </div>
              </div>
            } />
            
            {/* 🆕 404 페이지 추가 */}
            <Route path="*" element={
              <div style={{
                background: 'linear-gradient(45deg, #ef4444, #dc2626)', 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '2rem',
                color: 'white',
                fontWeight: 'bold',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div>❌ 페이지를 찾을 수 없습니다</div>
                <div style={{ fontSize: '1rem', opacity: 0.8 }}>
                  요청하신 페이지가 존재하지 않습니다
                </div>
                <button 
                  onClick={() => window.location.href = '/'}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'white',
                    color: '#ef4444',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginTop: '1rem'
                  }}
                >
                  홈으로 돌아가기
                </button>
              </div>
            } />
          </Routes>
        </MainLayout>
      </Router>
    </DoctorProvider>
  );
}

export default App;