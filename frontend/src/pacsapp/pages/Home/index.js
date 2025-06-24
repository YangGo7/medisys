import React from 'react';
import './Home.css';
import ProfileCard from '../../components/home/ProfileCard';  // 프로필 카드 추가
import NoticeSection from '../../components/home/NoticeSection'; // 공지사항 섹션 추가
import SystemShortcuts from '../../components/home/SystemShortcuts';
import NewsCarousel from '../../components/home/NewsCarousel'; 
import CalendarSection from '../../components/home/CalendarSection';


const Home = () => {
  return (
    <div className="home-container">
      <div className="profile-section">
        <ProfileCard />  {/* 색깔 박스를 실제 컴포넌트로 교체 */}
      </div>
      
     <div className="notices-section">
        <div className="system-notice">
          <NoticeSection type="system" title="📢 시스템 공지사항" />  {/* 변경 */}
        </div>
        <div className="ris-notice">
          <NoticeSection type="ris" title="📡 영상의학과 공지사항" />    {/* 변경 */}
        </div>
      </div>
        
      <div className="calendar-section">
        <CalendarSection />
      </div>
      
      <div className="bottom-section">
        <div className="carousel-section">
          <NewsCarousel />
        </div>
        <div className="shortcuts-section">
          <SystemShortcuts />
        </div>
      </div>
    </div>
  );
};

export default Home;