// pacsapp/src/components/home/NoticeSection/index.js
// 이 파일을 완전히 새로 만들어주세요

import React, { useState, useEffect } from 'react';
import './NoticeSection.css';

// 🔧 noticeService import를 안전하게 처리
let noticeService;
try {
  const noticeServiceModule = require('../../../services/noticeService');
  noticeService = noticeServiceModule.noticeService;
  console.log('✅ noticeService import 성공');
} catch (error) {
  console.error('❌ noticeService import 실패:', error);
  // 더미 서비스 생성
  noticeService = {
    getSystemNotices: async () => {
      return [
        {
          id: 1,
          title: '[서비스 연결 오류] noticeService를 불러올 수 없습니다',
          content: 'noticeService 파일을 확인하세요.',
          created_at: new Date().toISOString(),
          is_important: true
        }
      ];
    },
    getRISNotices: async () => {
      return [
        {
          id: 2,
          title: '[서비스 연결 오류] noticeService를 불러올 수 없습니다',
          content: 'noticeService 파일을 확인하세요.',
          created_at: new Date().toISOString(),
          is_important: true
        }
      ];
    }
  };
}

// Modal 컴포넌트를 안전하게 import
let Modal;
try {
  Modal = require('../../common/Modal').default;
  console.log('✅ Modal import 성공');
} catch (error) {
  console.error('❌ Modal import 실패:', error);
  // 간단한 Modal 대체
  Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }} onClick={onClose}>
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '2rem',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto'
        }} onClick={(e) => e.stopPropagation()}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h3 style={{ margin: 0 }}>{title}</h3>
            <button onClick={onClose} style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer'
            }}>×</button>
          </div>
          {children}
        </div>
      </div>
    );
  };
}

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
        
        // type에 따라 다른 서비스 함수 호출
        if (type === 'system') {
          console.log('🔗 Fetching system notices');
          noticeData = await noticeService.getSystemNotices();
        } else if (type === 'ris') {
          console.log('🔗 Fetching RIS notices');
          noticeData = await noticeService.getRISNotices();
        } else {
          console.log('🔗 Fetching default notices');
          noticeData = await noticeService.getSystemNotices();
        }
        
        console.log('📢 공지사항 조회 결과:', noticeData);
        
        // API 응답 구조에 맞게 데이터 처리
        let processedNotices = [];
        
        if (Array.isArray(noticeData)) {
          processedNotices = noticeData;
        } else if (noticeData && Array.isArray(noticeData.data)) {
          processedNotices = noticeData.data;
        } else {
          console.warn('⚠️ Unexpected data structure:', noticeData);
          processedNotices = [];
        }
        
        // 공지사항 정렬: 중요 공지 우선, 그 다음 최신순
        const sortedNotices = processedNotices.sort((a, b) => {
          if (a.is_important && !b.is_important) return -1;
          if (!a.is_important && b.is_important) return 1;
          return new Date(b.created_at) - new Date(a.created_at);
        });
        
        console.log('📢 정렬된 공지사항:', sortedNotices);
        setNotices(sortedNotices);
        
      } catch (err) {
        console.error('📢 공지사항 조회 실패:', err);
        setError(`공지사항을 불러올 수 없습니다. (${type})`);
        setNotices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotices();
  }, [type, title]);

  // 공지사항 클릭 핸들러
  const handleNoticeClick = (notice) => {
    setSelectedNotice(notice);
    setIsModalOpen(true);
  };

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedNotice(null);
  };

  // 안전한 날짜 포맷팅
  const formatDate = (dateString) => {
    try {
      if (!dateString) return '날짜 없음';
      return new Date(dateString).toLocaleDateString('ko-KR');
    } catch (error) {
      return '날짜 없음';
    }
  };

  // 중요도 확인 함수
  const isImportantNotice = (notice) => {
    return notice.is_important === true || notice.is_pinned === true;
  };

  if (loading) {
    return (
      <div className="notice-section">
        <div className="notice-header">{title}</div>
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="notice-section">
        <div className="notice-header">{title}</div>
        <div className="error">{error}</div>
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
                {isImportantNotice(notice) && (
                  <span style={{
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
              </div>
              <div className="notice-title">{notice.title}</div>
            </div>
          ))
        ) : (
          <div className="notice-item" style={{ textAlign: 'center', color: '#6b7280' }}>
            등록된 공지사항이 없습니다.
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
          <div>
            <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
              작성일: {formatDate(selectedNotice.created_at)}
            </div>
            <div style={{ lineHeight: '1.6', color: '#374151' }}>
              {selectedNotice.content || '내용이 없습니다.'}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// 🔥 중요: default export 확실히 추가
export default NoticeSection;