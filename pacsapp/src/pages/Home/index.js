// pacsapp/src/pages/Home/index.js - 디버깅 버전

import React from 'react';
import './Home.css';

// 🔍 각 import를 하나씩 확인하기 위해 console.log 추가
console.log('🔍 Home 컴포넌트 imports 확인 중...');

// 1. ProfileCard 확인
let ProfileCard;
try {
  ProfileCard = require('../../components/home/ProfileCard').default;
  console.log('✅ ProfileCard import 성공:', typeof ProfileCard);
} catch (error) {
  console.error('❌ ProfileCard import 실패:', error);
  ProfileCard = () => <div style={{padding: '1rem', background: '#f8fafc', borderRadius: '8px'}}>ProfileCard 로딩 실패</div>;
}

// 2. NoticeSection 확인
let NoticeSection;
try {
  NoticeSection = require('../../components/home/NoticeSection').default;
  console.log('✅ NoticeSection import 성공:', typeof NoticeSection);
} catch (error) {
  console.error('❌ NoticeSection import 실패:', error);
  // 임시 컴포넌트로 대체
  NoticeSection = ({ type, title }) => (
    <div style={{
      height: '100%',
      background: 'white',
      borderRadius: '8px',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        fontSize: '1rem',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '1rem',
        paddingBottom: '0.5rem',
        borderBottom: '2px solid #e5e7eb'
      }}>
        {title}
      </div>
      <div style={{
        padding: '0.75rem',
        backgroundColor: '#fef2f2',
        borderRadius: '6px',
        borderLeft: '3px solid #ef4444',
        color: '#dc2626'
      }}>
        컴포넌트 로딩 실패 - NoticeSection을 찾을 수 없습니다.
      </div>
    </div>
  );
}

// 3. SystemShortcuts 확인
let SystemShortcuts;
try {
  SystemShortcuts = require('../../components/home/SystemShortcuts').default;
  console.log('✅ SystemShortcuts import 성공:', typeof SystemShortcuts);
} catch (error) {
  console.error('❌ SystemShortcuts import 실패:', error);
  SystemShortcuts = () => <div style={{padding: '1rem', background: '#f8fafc', borderRadius: '8px'}}>SystemShortcuts 로딩 실패</div>;
}

// 4. NewsCarousel 확인
let NewsCarousel;
try {
  NewsCarousel = require('../../components/home/NewsCarousel').default;
  console.log('✅ NewsCarousel import 성공:', typeof NewsCarousel);
} catch (error) {
  console.error('❌ NewsCarousel import 실패:', error);
  NewsCarousel = () => <div style={{padding: '1rem', background: '#f8fafc', borderRadius: '8px'}}>NewsCarousel 로딩 실패</div>;
}

// 5. CalendarSection 확인
let CalendarSection;
try {
  CalendarSection = require('../../components/home/CalendarSection').default;
  console.log('✅ CalendarSection import 성공:', typeof CalendarSection);
} catch (error) {
  console.error('❌ CalendarSection import 실패:', error);
  CalendarSection = () => <div style={{padding: '1rem', background: '#f8fafc', borderRadius: '8px'}}>CalendarSection 로딩 실패</div>;
}

const Home = () => {
  console.log('🏠 Home 컴포넌트 렌더링 시작');
  
  // 모든 컴포넌트가 제대로 로드되었는지 확인
  console.log('🔍 컴포넌트 타입 확인:', {
    ProfileCard: typeof ProfileCard,
    NoticeSection: typeof NoticeSection,
    SystemShortcuts: typeof SystemShortcuts,
    NewsCarousel: typeof NewsCarousel,
    CalendarSection: typeof CalendarSection
  });

  return (
    <div className="home-container">
      <div className="profile-section">
        <ProfileCard />
      </div>
      
      <div className="notices-section">
        <div className="system-notice">
          <NoticeSection type="system" title="📢 시스템 공지사항" />
        </div>
        <div className="ris-notice">
          <NoticeSection type="ris" title="📡 영상의학과 공지사항" />
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