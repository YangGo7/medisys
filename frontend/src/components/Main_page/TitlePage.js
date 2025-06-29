// frontend/src/components/Main_page/TitlePage.js

import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './titlepage.css';
import { useNavigate } from 'react-router-dom';

// API 서비스 클래스
class MainPageAPI {
  static BASE_URL = process.env.REACT_APP_API_URL || 'http://35.225.63.41:8000/api';

  static async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API 요청 오류:', error);
      throw error;
    }
  }

  // 메인 페이지 데이터 조회
  static async getMainPageData(doctorId = 'default_doctor') {
    return await this.request(`main-page-function/main-data/?doctor_id=${doctorId}`);
  }

  // 공지사항 조회
  static async getNotices(pageSize = 5) {
    return await this.request(`main-page-function/notices/?page_size=${pageSize}`);
  }

  // 의사 상태 업데이트
  static async updateDoctorStatus(doctorId, status) {
    return await this.request(`main-page-function/doctor/${doctorId}/status/`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }
}

export default function TitlePage() {
  const navigate = useNavigate();
  
  // 상태 관리
  const [mainData, setMainData] = useState({
    doctor_info: {
      name: '사용자', // 초기값
      department: '내과',
      status: 'online',
      status_display: '온라인'
    },
    stats: {
      today_patients: 0,
      waiting_patients: 0,
      unread_messages: 0
    },
    notices: [],
    schedule: []
  });
  const loadUserInfo = async () => {
    try {
      const res = await fetch('/api/account/user-info/', {
        method: 'GET',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('사용자 정보 없음');
      const user = await res.json();

      setMainData(prev => ({
        ...prev,
        doctor_info: {
          ...prev.doctor_info,
          name: user.display || user.username
        }
      }));
    } catch (err) {
      console.error('❌ 사용자 정보 불러오기 실패:', err);
      setError('로그인 정보를 확인할 수 없습니다.');
    }
  };
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/account/logout/', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        console.log('✅ 로그아웃 완료');
        navigate('/'); // 로그인 페이지로
      } else {
        console.warn('❌ 로그아웃 실패');
      }
    } catch (err) {
      console.error('❌ 로그아웃 오류:', err);
    }
  };
  const loadMainData = async () => {
    try {
      const response = await MainPageAPI.getMainPageData(); // 기본 doctor_id는 서버 내부 로직으로 처리
      setMainData(prev => ({
        ...prev,
        ...response
      }));
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('❌ 메인 페이지 데이터 로드 실패:', err);
      setError(err.message);

      // fallback 더미 데이터 유지
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserInfo();   // ✅ 유저 정보 먼저
    loadMainData();   // 📊 메인 데이터 로드

    const interval = setInterval(loadMainData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);


  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  

  // 의사 상태 변경
  const handleStatusChange = async (newStatus) => {
    try {
      await MainPageAPI.updateDoctorStatus('default_doctor', newStatus);
      
      // 상태 업데이트
      setMainData(prev => ({
        ...prev,
        doctor_info: {
          ...prev.doctor_info,
          status: newStatus,
          status_display: getStatusDisplay(newStatus)
        }
      }));
      
      console.log(`✅ 의사 상태 변경: ${newStatus}`);
      
    } catch (error) {
      console.error('❌ 상태 변경 실패:', error);
    }
  };

  // 상태 표시 텍스트 변환
  const getStatusDisplay = (status) => {
    const statusMap = {
      'online': '온라인',
      'busy': '진료중',
      'break': '휴식',
      'offline': '오프라인'
    };
    return statusMap[status] || '온라인';
  };

  // 상태 색상 반환
  const getStatusColor = (status) => {
    const colorMap = {
      'online': '#2ecc71',
      'busy': '#f39c12',
      'break': '#3498db',
      'offline': '#95a5a6'
    };
    return colorMap[status] || '#2ecc71';
  };

  // 공지사항 타입별 배지 색상
  const getNoticeBadgeColor = (type) => {
    const colorMap = {
      'important': '#e74c3c',
      'update': '#3498db',
      'maintenance': '#f39c12',
      'general': '#95a5a6'
    };
    return colorMap[type] || '#95a5a6';
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadMainData();
    
    // 자동 새로고침 (5분마다)
    const interval = setInterval(loadMainData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleQuickAction = (action) => {
    console.log('Quick action clicked:', action);
    switch(action) {
      case 'RIS':
        console.log('Opening RIS');
        const risURL = `${window.location.protocol}//${window.location.hostname}:3020`;
        window.open(risURL, '_blank', 'noopener,noreferrer');
        break;
      case 'LIS':
        console.log('Opening LIS');
        const lisURL = `${window.location.protocol}//${window.location.hostname}:3000/lis`;
        window.open(lisURL, '_blank', 'noopener,noreferrer');
        break;
      case 'EMR':
        console.log('Navigating to EMR');
        navigate('/emr');
        break;
      case '설정':
        console.log('Navigating to Settings');
        navigate('/emr/Settings');
        break;
      case '통계':
        console.log('Navigating to Statistics Board');
        navigate('/Main_page/StatisticsBoard');
        break;
      case '메인페이지기능':
        console.log('Navigating to Main Page Function');
        navigate('/Main_page/main_page_function');
        break;
      case '공지사항':
        console.log('Navigating to Notice Board');
        navigate('/Main_page/notices');
        break;
      default:
        console.log('Unknown action:', action);
        break;
    }
  };


  // 공지사항 클릭 핸들러
  const handleNoticeClick = () => {
    navigate('/Main_page/notices');
  };

  return (
  <div className="title-page">
    {/* 좌측 정보 카드 */}
    <div className="main-left">
      <div className="doctor-card">
        <div className="doctor-header">
          {/* 이름 + 로그아웃을 상단 우측에 배치 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>{mainData.doctor_info.name}</h3>
              <p className="department">{mainData.doctor_info.department} 전문의</p>
            </div>
            <button 
              onClick={handleLogout}
              style={{
                background: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              로그아웃
            </button>
          </div>

          <div className="status-container">
            <p 
              className="status" 
              style={{ color: getStatusColor(mainData.doctor_info.status) }}
            >
              ● {mainData.doctor_info.status_display}
            </p>
            <div className="status-buttons">
              <button 
                className={`status-btn ${mainData.doctor_info.status === 'online' ? 'active' : ''}`}
                onClick={() => handleStatusChange('online')}
              >
                온라인
              </button>
              <button 
                className={`status-btn ${mainData.doctor_info.status === 'busy' ? 'active' : ''}`}
                onClick={() => handleStatusChange('busy')}
              >
                진료중
              </button>
              <button 
                className={`status-btn ${mainData.doctor_info.status === 'break' ? 'active' : ''}`}
                onClick={() => handleStatusChange('break')}
              >
                휴식
              </button>
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-number">{mainData.stats.today_patients}</span>
            <span className="stat-label">오늘 진료</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{mainData.stats.waiting_patients}</span>
            <span className="stat-label">대기</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{mainData.stats.unread_messages}</span>
            <span className="stat-label">새 메시지</span>
          </div>
        </div>

        <div className="schedule-section">
          <h5>📅 오늘 일정</h5>
          <ul className="schedule-list">
            {mainData.schedule.length > 0 ? (
              mainData.schedule.map((item, index) => (
                <li key={index}>
                  {item.time} {item.type} - {item.description}
                </li>
              ))
            ) : (
              <li>오늘 일정이 없습니다.</li>
            )}
          </ul>
        </div>

        {/* 새로고침 버튼 */}
        <div className="refresh-section">
          <button 
            className="refresh-btn"
            onClick={loadMainData}
            disabled={isLoading}
          >
            🔄 새로고침
          </button>
          {lastUpdate && (
            <p className="last-update">
              마지막 업데이트: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
    </div>


      {/* 중앙 공지/배너/링크 */}
      <div className="main-middle">
        <div className="notice-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4>📢 시스템 공지사항</h4>
            <button
              onClick={handleNoticeClick}
              style={{
                padding: '0.5rem 1rem',
                background: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.target.style.background = '#2980b9'}
              onMouseOut={(e) => e.target.style.background = '#3498db'}
            >
              전체 보기
            </button>
          </div>
          <ul className="notice-list">
            {mainData.notices.length > 0 ? (
              mainData.notices.map((notice) => (
                <li key={notice.id} onClick={handleNoticeClick} style={{ cursor: 'pointer' }}>
                  <span 
                    className="notice-badge"
                    style={{ backgroundColor: getNoticeBadgeColor(notice.notice_type) }}
                  >
                    {notice.notice_type_display}
                  </span>
                  <span className="notice-content">
                    {notice.title}
                  </span>
                  <span className="notice-date">
                    {new Date(notice.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))
            ) : (
              <li>
                <span className="notice-badge" style={{ backgroundColor: '#95a5a6' }}>
                  정보
                </span>
                <span className="notice-content">
                  새로운 공지사항이 없습니다.
                </span>
              </li>
            )}
          </ul>
        </div>

        <div className="banner">
          <div className="banner-content">
            <h3>EMR 통합 시스템</h3>
            <p>모든 의료 데이터를 한 곳에서 관리하세요</p>
            <button 
              className="banner-btn"
              onClick={() => handleQuickAction('통계')}
            >
              통계 대시보드 보기
            </button>
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
              <span className="btn-subtitle">영상의학과</span>
            </button>
            <button 
              className="quick-btn lis-btn"
              onClick={() => handleQuickAction('LIS')}
            >
              <span className="btn-icon">🧪</span>
              <span className="btn-text">LIS</span>
              <span className="btn-subtitle">검사실</span>
            </button>
            <button 
              className="quick-btn emr-btn"
              onClick={() => handleQuickAction('EMR')}
            >
              <span className="btn-icon">📁</span>
              <span className="btn-text">EMR</span>
              <span className="btn-subtitle">전자차트</span>
            </button>
            <button 
              className="quick-btn stats-btn"
              onClick={() => handleQuickAction('통계')}
            >
              <span className="btn-icon">📊</span>
              <span className="btn-text">통계</span>
              <span className="btn-subtitle">대시보드</span>
            </button>
          </div>
        </div>

        {/* 새로 추가된 메인페이지 기능 섹션 */}
        <div className="main-functions">
          <h4>메인페이지 기능</h4>
          <div className="quick-grid">
            <button 
              className="quick-btn function-btn"
              onClick={() => handleQuickAction('메인페이지기능')}
              style={{ borderLeft: '4px solid #e74c3c' }}
            >
              <span className="btn-icon">🏥</span>
              <span className="btn-text">메인 기능</span>
              <span className="btn-subtitle">시스템 관리</span>
            </button>
            <button 
              className="quick-btn notice-btn"
              onClick={() => handleQuickAction('공지사항')}
              style={{ borderLeft: '4px solid #8e44ad' }}
            >
              <span className="btn-icon">📢</span>
              <span className="btn-text">공지사항</span>
              <span className="btn-subtitle">게시판 관리</span>
            </button>
          </div>
        </div>

        {/* 에러 표시 */}
        {error && (
          <div className="error-notice">
            <p>⚠️ 데이터 로드 중 오류가 발생했습니다.</p>
            <p className="error-detail">{error}</p>
            <button onClick={loadMainData}>다시 시도</button>
          </div>
        )}
      </div>

      {/* 우측 달력/채팅 */}
      <div className="main-right">
        <div className="calendar-box">
          <h4>📅 월 달력 / 부서 일정</h4>
          <Calendar 
            className="custom-calendar"
            tileContent={({ date, view }) => {
              // 특정 날짜에 일정 표시 (더미 데이터)
              const today = new Date();
              if (date.toDateString() === today.toDateString()) {
                return <div className="calendar-badge">일정</div>;
              }
              return null;
            }}
          />
        </div>
        
        <div className="chat-widget">
          <div className="chat-header">
            <span>💬 채팅</span>
            <span className="chat-count">{mainData.stats.unread_messages}</span>
          </div>
          <div className="chat-preview">
            {mainData.stats.unread_messages > 0 ? (
              `${mainData.stats.unread_messages}개의 새로운 메시지가 있습니다.`
            ) : (
              '새로운 메시지가 없습니다.'
            )}
          </div>
          <button className="chat-btn">채팅방 열기</button>
        </div>

        {/* 시스템 상태 */}
        <div className="system-status">
          <h4>🔧 시스템 상태</h4>
          <div className="status-items">
            <div className="status-item">
              <span className="status-dot online"></span>
              <span>EMR 시스템</span>
              <span className="status-text">정상</span>
            </div>
            <div className="status-item">
              <span className="status-dot online"></span>
              <span>RIS 시스템</span>
              <span className="status-text">정상</span>
            </div>
            <div className="status-item">
              <span className="status-dot online"></span>
              <span>LIS 시스템</span>
              <span className="status-text">정상</span>
            </div>
            <div className="status-item">
              <span className="status-dot online"></span>
              <span>공지사항 시스템</span>
              <span className="status-text">정상</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}