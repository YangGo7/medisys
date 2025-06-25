// import React, { useState } from 'react';
// import { Link } from 'react-router-dom';
// import './MainLayout.css';

// const MainLayout = ({ children }) => {
//   const [showProfileMenu, setShowProfileMenu] = useState(false);
//   const [showNotifications, setShowNotifications] = useState(false); 
//   const [showChat, setShowChat] = useState(false);

//   return (
//     <div className="dashboard-container">
//       {/* 사이드바 */}
//       <div className="sidebar">
//         <div className="sidebar-header">
//           <h2>메디시스 v1.0</h2>
//           <p>심보람 님</p>
//         </div>
//         <nav className="nav-menu">
//             <Link to="/">Home</Link>
//             <Link to="/dashboard">Work Station</Link>
//             <Link to="/pacs">PACS</Link>
//             <Link to="/statistics">Statistics</Link>
//             <Link to="/settings">Settings</Link>
//         </nav>
//       </div>

//       {/* 상단바 */}
//       <div className="topbar">
//         <h1>영상의학과 포털에 오신 것을 환영합니다</h1>
//         <div className="topbar-controls">
//           <button title="새로고침">🔄</button>
//           <button title="설정">⚙️</button>
          
//           {/* 알림 버튼 */}
//           <button 
//             className="notification-btn" 
//             title="알림"
//             onClick={() => setShowNotifications(!showNotifications)}
//           >
//             🔔
//             <span className="notification-badge">3</span>
//           </button>

//           {/* 알림 드롭다운 */}
//           {showNotifications && (
//             <div className="notification-dropdown">
//               <div className="notification-header">알림 팝업(하드코딩)</div>
//             </div>
//           )}
          
//           {/* 프로필 메뉴 */}
//           <div className="profile-menu">
//             <button 
//               className="profile-avatar"
//               onClick={() => setShowProfileMenu(!showProfileMenu)}
//               title="계정"
//             >
//               심
//             </button>
            
//             {showProfileMenu && (
//               <div className="profile-dropdown">
//                 <div className="profile-info">
//                   <div className="profile-avatar-large">심</div>
//                   <div className="profile-details">
//                     <p className="profile-name">안녕하세요, 심보람님.</p>
//                     <p className="profile-email">brsim13@mediis.com</p>
//                   </div>
//                 </div>
//                 <div className="profile-actions">
//                   <button className="profile-action-btn">계정 관리</button>
//                   <button className="profile-action-btn">로그아웃</button>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* 메인 콘텐츠 영역 */}
//       <div className="content-area">
//         {children}
//       </div>

//       {/* 하단바 */}
//       <div className="statusbar">
//         <span>시스템 상태: 정상 운영 중</span>
//         <span>현재 시간: 2025-06-21</span>
//       </div>

//       {/* 플로팅 채팅 */}
//       <div 
//         className="floating-chat"
//         onClick={() => setShowChat(!showChat)}
//       >
//         💬
//       </div>

//       {/* 채팅 드롭다운 */}
//       {showChat && (
//         <div className="chat-dropdown">
//           <div className="chat-header">메신저 팝업(하드코딩)</div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default MainLayout;

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './MainLayout.css';
import MessengerSystem from '../../messenger/MessengerSystem';

const MainLayout = ({ children }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false); 

  return (
    <div className="dashboard-container">
      {/* 사이드바 */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>메디시스 v1.0</h2>
          <p>심보람 님</p>
        </div>
        <nav className="nav-menu">
            <Link to="/">Home</Link>
            <Link to="/dashboard">Work Station</Link>
            <Link to="/pacs">PACS</Link>
            <Link to="/pacsdocs">PacsDocs</Link>
            <Link to="/ohifviewer">OHIFViewer</Link>
        </nav>
      </div>

      {/* 상단바 */}
      <div className="topbar">
        <h1>영상의학과 포털에 오신 것을 환영합니다</h1>
        <div className="topbar-controls">
          <button title="새로고침">🔄</button>
          <button title="설정">⚙️</button>
          
          {/* 알림 버튼 */}
          <button 
            className="notification-btn" 
            title="알림"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            🔔
            <span className="notification-badge">3</span>
          </button>

          {/* 알림 드롭다운 */}
          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">알림 팝업(하드코딩)</div>
            </div>
          )}
          
          {/* 프로필 메뉴 */}
          <div className="profile-menu">
            <button 
              className="profile-avatar"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              title="계정"
            >
              심
            </button>
            
            {showProfileMenu && (
              <div className="profile-dropdown">
                <div className="profile-info">
                  <div className="profile-avatar-large">심</div>
                  <div className="profile-details">
                    <p className="profile-name">안녕하세요, 심보람님.</p>
                    <p className="profile-email">brsim13@mediis.com</p>
                  </div>
                </div>
                <div className="profile-actions">
                  <button className="profile-action-btn">계정 관리</button>
                  <button className="profile-action-btn">로그아웃</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 영역 */}
      <div className="content-area">
        {children}
      </div>

      {/* 하단바 */}
      <div className="statusbar">
        <span>시스템 상태: 정상 운영 중</span>
        <span>현재 시간: 2025-06-21</span>
      </div>

      {/* 🚀 새로운 메신저 시스템 - 기존 하드코딩 채팅 대체 */}
      <MessengerSystem />
    </div>
  );
};

export default MainLayout;