import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './titlepage.css';
import { useNavigate } from 'react-router-dom';

export default function TitlePage() {
  const navigate = useNavigate();

  return (
    <div className="title-page">
      {/* 좌측 정보 카드 */}
      <div className="main-left">
        <div className="doctor-card">
          <h3>김의사</h3>
          <p>내과 전문의</p>
          <p className="status">● 온라인</p>
          <p>오늘 진료: <strong>24</strong></p>
          <p>대기: <strong>3</strong></p>
          <p>새 메시지: <strong>7</strong></p>
          <h5>📅 오늘 일정</h5>
          <ul>
            <li>14:00 진료 - 고혈압</li>
            <li>16:00 진료 - 두통</li>
          </ul>
        </div>
      </div>

      {/* 중앙 공지/배너/링크 */}
      <div className="main-middle">
        <div className="notice-card">
          <h4>📢 시스템 공지사항</h4>
          <ul>
            <li>23:00~24:00 시스템 점검 예정</li>
            <li>ICD-11 코드 적용 완료</li>
          </ul>
        </div>
        <div className="banner">
          <img src="/banner.png" alt="공지 배너" />
        </div>
        <div className="quick-links">
          <button onClick={() => navigate('/logins')}>🔐 로그인</button>
          <button onClick={() => navigate('/lis')}>✏️ LIS</button>
          <button onClick={() => navigate('/ris')}>📋 RIS</button>
          <button onClick={() => navigate('/order')}>💊 처방</button>
        </div>
      </div>

      {/* 우측 달력/채팅 */}
      <div className="main-right">
        <div className="calendar-box">
          <h4>📅 월 달력 / 부서 일정</h4>
          <Calendar />
        </div>
        <div className="chat-widget">
          <button>💬 채팅</button>
        </div>
      </div>
    </div>
  );
}
