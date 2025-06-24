// components/home/NoticeSection/index.js - 수정된 버전
import React, { useState, useEffect } from 'react';
// 🔧 올바른 경로에서 noticeService import
import { noticeService } from '../../../services/noticeService';
import Modal from '../../common/Modal';
import './NoticeSection.css';

const NoticeSection = ({ type, title }) => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
    
  useEffect(() => {
    const fetchNotices = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('📢 공지사항 조회 시작:', { type, title });
        
        let noticeData = [];
        
        // 🔧 main_page_function API 연결 - type에 따라 다른 필터 적용
        if (type === 'system') {
          // 시스템 공지사항 = important 타입
          console.log('🔗 Fetching system notices (important type)');
          noticeData = await noticeService.getMainPageNotices('important', 5);
        } else if (type === 'ris') {
          // RIS 공지사항 = general 타입
          console.log('🔗 Fetching RIS notices (general type)');
          noticeData = await noticeService.getMainPageNotices('general', 5);
        } else {
          // 기본: 모든 공지사항
          console.log('🔗 Fetching all notices');
          noticeData = await noticeService.getMainPageNotices('', 5);
        }
        
        console.log('📢 공지사항 조회 결과:', {
          type: type,
          dataLength: Array.isArray(noticeData) ? noticeData.length : 'not array',
          data: noticeData
        });
        
        // 🔧 API 응답 구조에 맞게 데이터 처리
        let processedNotices = [];
        
        if (Array.isArray(noticeData)) {
          processedNotices = noticeData;
        } else if (noticeData && noticeData.data && Array.isArray(noticeData.data)) {
          processedNotices = noticeData.data;
        } else if (noticeData && Array.isArray(noticeData.notices)) {
          processedNotices = noticeData.notices;
        } else {
          console.warn('⚠️ Unexpected data structure:', noticeData);
          processedNotices = [];
        }
        
        // 🔧 공지사항 정렬: 중요 공지 우선, 그 다음 최신순
        const sortedNotices = processedNotices.sort((a, b) => {
          // 1. 고정 공지사항 우선 (is_pinned)
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          
          // 2. 중요 공지사항 우선 (notice_type === 'important')
          const aImportant = a.notice_type === 'important' || a.is_important;
          const bImportant = b.notice_type === 'important' || b.is_important;
          if (aImportant && !bImportant) return -1;
          if (!aImportant && bImportant) return 1;
                   
          // 3. 같은 중요도면 최신순
          return new Date(b.created_at) - new Date(a.created_at);
        });
        
        console.log('📢 정렬된 공지사항:', sortedNotices);
        setNotices(sortedNotices);
        
      } catch (err) {
        console.error('📢 공지사항 조회 실패:', err);
        
        // 🔧 더 상세한 에러 분석
        if (err.response?.status === 404) {
          setError(`API 경로를 찾을 수 없습니다. (${type} 타입)`);
        } else if (err.response?.status >= 500) {
          setError(`서버 오류가 발생했습니다. (${type} 타입)`);
        } else if (err.code === 'NETWORK_ERROR') {
          setError(`네트워크 연결을 확인해주세요. (${type} 타입)`);
        } else {
          setError(`공지사항을 불러올 수 없습니다. (${type} 타입)`);
        }
        
        // 🔧 에러 시에도 빈 배열로 설정하여 UI가 깨지지 않도록
        setNotices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotices();
  }, [type]); // type이 변경될 때마다 다시 조회

  // 공지사항 클릭 핸들러
  const handleNoticeClick = async (notice) => {
    try {
      console.log('📰 공지사항 클릭:', notice.id);
      
      // 🆕 상세 조회 API 호출 (조회수 증가)
      const detailData = await noticeService.getNoticeDetail(notice.id);
      
      // 상세 데이터가 있으면 사용, 없으면 기본 데이터 사용
      const noticeDetail = detailData?.data || notice;
      
      setSelectedNotice(noticeDetail);
      setIsModalOpen(true);
    } catch (err) {
      console.error('📰 공지사항 상세 조회 실패:', err);
      // 에러가 발생해도 기본 데이터로 모달 열기
      setSelectedNotice(notice);
      setIsModalOpen(true);
    }
  };

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedNotice(null);
  };

  // 🔧 안전한 날짜 포맷팅
  const formatDate = (dateString) => {
    try {
      if (!dateString) return '날짜 없음';
      return new Date(dateString).toLocaleDateString('ko-KR');
    } catch (error) {
      return '날짜 없음';
    }
  };

  // 🔧 중요도 확인 함수
  const isImportantNotice = (notice) => {
    return notice.notice_type === 'important' || 
           notice.is_important === true ||
           notice.is_pinned === true;
  };

  if (loading) {
    return (
      <div className="notice-section">
        <div className="notice-header">{title}</div>
        <div className="loading">로딩 중... ({type})</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="notice-section">
        <div className="notice-header">{title}</div>
        <div className="error">{error}</div>
        {/* 🔧 재시도 버튼 추가 */}
        <button 
          onClick={() => window.location.reload()} 
          style={{
            margin: '1rem',
            padding: '0.5rem 1rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="notice-section">
      <div className="notice-header">{title}</div>
      <div className="notice-list">
        {notices && notices.length > 0 ? (
          notices.map((notice) => (
            <div 
              key={notice.id} 
              className={`notice-item ${isImportantNotice(notice) ? 'important' : ''}`}
              onClick={() => handleNoticeClick(notice)}
            >
              <div className="notice-date">
                {formatDate(notice.created_at)}
                {/* 🆕 중요 공지사항 표시 */}
                {isImportantNotice(notice) && (
                  <span className="important-badge" style={{
                    marginLeft: '0.5rem',
                    background: '#ef4444',
                    color: 'white',
                    fontSize: '0.625rem',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '0.25rem',
                    fontWeight: '600'
                  }}>
                    중요
                  </span>
                )}
                {/* 🆕 고정 공지사항 표시 */}
                {notice.is_pinned && (
                  <span className="pinned-badge" style={{
                    marginLeft: '0.25rem',
                    background: '#3b82f6',
                    color: 'white',
                    fontSize: '0.625rem',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '0.25rem',
                    fontWeight: '600'
                  }}>
                    📌
                  </span>
                )}
              </div>
              <div className="notice-title">{notice.title}</div>
            </div>
          ))
        ) : (
          <div className="notice-item" style={{ textAlign: 'center', color: '#6b7280' }}>
            등록된 {type === 'system' ? '시스템' : type === 'ris' ? 'RIS' : ''} 공지사항이 없습니다.
          </div>
        )}
      </div>

      {/* 공지사항 상세 모달 */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedNotice?.title}
      >
        {selectedNotice && (
          <div className="notice-modal-content">
            <div className="notice-modal-meta" style={{
              marginBottom: '1rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <div>
                <span className="notice-modal-date" style={{
                  fontSize: '0.875rem',
                  color: '#6b7280'
                }}>
                  작성일: {formatDate(selectedNotice.created_at)}
                </span>
                <br />
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  작성자: {selectedNotice.created_by || '관리자'}
                </span>
                {selectedNotice.views && (
                  <>
                    <br />
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      조회수: {selectedNotice.views}
                    </span>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {isImportantNotice(selectedNotice) && (
                  <span style={{
                    background: '#ef4444',
                    color: 'white',
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontWeight: '600'
                  }}>
                    중요 공지
                  </span>
                )}
                {selectedNotice.is_pinned && (
                  <span style={{
                    background: '#3b82f6',
                    color: 'white',
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontWeight: '600'
                  }}>
                    📌 고정
                  </span>
                )}
              </div>
            </div>
            <div className="notice-modal-text" style={{
              lineHeight: '1.6',
              color: '#374151',
              whiteSpace: 'pre-wrap' // 줄바꿈 유지
            }}>
              {selectedNotice.content || '내용이 없습니다.'}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default NoticeSection;