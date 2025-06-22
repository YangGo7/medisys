import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './titlepage.css';
import { useNavigate } from 'react-router-dom';

export default function TitlePage({ setCurrentTab }) {
  const navigate = useNavigate();

  const handleQuickAction = (action) => {
    switch(action) {
      case 'RIS':
        setCurrentTab('RISPage');
        break;
      case 'LIS':
        setCurrentTab('lis');
        break;
      case 'EMR':
        navigate('/emr');
        break;
      case '설정':
        // 설정 페이지로 이동 (추후 구현)
        console.log('설정 페이지로 이동');
        break;
      default:
        break;
    }
  };

  return (
    <div className="title-page">
      {/* 좌측 정보 카드 */}
      <div className="main-left">
        <div className="doctor-card">
          <div className="doctor-header">
            <h3>김의사</h3>
            <p className="department">내과 전문의</p>
            <p className="status">● 온라인</p>
          </div>
          
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-number">24</span>
              <span className="stat-label">오늘 진료</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">3</span>
              <span className="stat-label">대기</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">7</span>
              <span className="stat-label">새 메시지</span>
            </div>
          </div>

          <div className="schedule-section">
            <h5>📅 오늘 일정</h5>
            <ul className="schedule-list">
              <li>14:00 진료 - 고혈압 환자</li>
              <li>16:00 진료 - 두통 환자</li>
              <li>18:00 회의 - 의료진 미팅</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 중앙 공지/배너/링크 */}
      <div className="main-middle">
        <div className="notice-card">
          <h4>📢 시스템 공지사항</h4>
          <ul className="notice-list">
            <li>
              <span className="notice-badge">중요</span>
              23:00~24:00 시스템 점검 예정
            </li>
            <li>
              <span className="notice-badge">업데이트</span>
              ICD-11 코드 적용 완료
            </li>
          </ul>
        </div>

        <div className="banner">
          <div className="banner-content">
            <h3>시스템 업데이트</h3>
            <p>새로운 기능이 추가되었습니다</p>
          </div>
        </div>

        <div className="quick-links">
          <h4>바로가기</h4>
          <div className="quick-grid">
            <button 
              className="quick-btn ris-btn"
              onClick={() => handleQuickAction('RIS')}
            >
              <span className="btn-icon">📋</span>
              <span className="btn-text">RIS</span>
            </button>
            <button 
              className="quick-btn lis-btn"
              onClick={() => handleQuickAction('LIS')}
            >
              <span className="btn-icon">🧪</span>
              <span className="btn-text">LIS</span>
            </button>
            <button 
              className="quick-btn emr-btn"
              onClick={() => handleQuickAction('EMR')}
            >
              <span className="btn-icon">📁</span>
              <span className="btn-text">EMR</span>
            </button>
            <button 
              className="quick-btn settings-btn"
              onClick={() => handleQuickAction('설정')}
            >
              <span className="btn-icon">⚙️</span>
              <span className="btn-text">설정</span>
            </button>
          </div>
        </div>
      </div>

      {/* 우측 달력/채팅 */}
      <div className="main-right">
        <div className="calendar-box">
          <h4>📅 월 달력 / 부서 일정</h4>
          <Calendar className="custom-calendar" />
        </div>
        <div className="chat-widget">
          <div className="chat-header">
            <span>💬 채팅</span>
            <span className="chat-count">7</span>
          </div>
          <div className="chat-preview">
            새로운 메시지가 있습니다.
          </div>
        </div>
      </div>
    </div>
  );
}