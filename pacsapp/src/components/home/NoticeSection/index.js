import React, { useState, useEffect } from 'react';
import { noticeService } from '../../../services/noticeService';
import Modal from '../../common/Modal';  // 모달 import 추가
import './NoticeSection.css';

const NoticeSection = ({ type, title }) => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNotice, setSelectedNotice] = useState(null);  // 선택된 공지사항
  const [isModalOpen, setIsModalOpen] = useState(false);       // 모달 상태
    
  useEffect(() => {
    const fetchNotices = async () => {
      try {
        let noticeData;
        if (type === 'system') {
          noticeData = await noticeService.getSystemNotices();
        } else {
          noticeData = await noticeService.getRISNotices();
        }
        
        // 중요 공지를 맨 위로 정렬
        const sortedNotices = noticeData.sort((a, b) => {
          // 1. 중요 공지 우선
          if (a.is_important && !b.is_important) return -1;
          if (!a.is_important && b.is_important) return 1;
                   
          // 2. 같은 중요도면 최신순
          return new Date(b.created_at) - new Date(a.created_at);
        });
        
        setNotices(sortedNotices);  // sortedNotices로 변경
      } catch (err) {
        setError('공지사항을 불러올 수 없습니다.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotices();
  }, [type]);

  // 공지사항 클릭 핸들러 추가
  const handleNoticeClick = (notice) => {
    setSelectedNotice(notice);
    setIsModalOpen(true);
  };

  // 모달 닫기 핸들러 추가
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedNotice(null);
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
        {notices.map((notice) => (
          <div 
            key={notice.id} 
            className={`notice-item ${notice.is_important ? 'important' : ''}`}
            onClick={() => handleNoticeClick(notice)}  // 클릭 이벤트 추가
          >
            <div className="notice-date">
              {new Date(notice.created_at).toLocaleDateString('ko-KR')}
            </div>
            <div className="notice-title">{notice.title}</div>
            {notice.is_important && <span className="important-badge">중요</span>}  {/* 중요 배지 추가 */}
          </div>
        ))}
      </div>

      {/* 모달 추가 */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedNotice?.title}
      >
        <div className="notice-modal-content">
          <div className="notice-modal-meta">
            <span className="notice-modal-date">
              작성일: {selectedNotice && new Date(selectedNotice.created_at).toLocaleString('ko-KR')}
            </span>
            {selectedNotice?.is_important && (
              <span className="notice-modal-important">중요 공지</span>
            )}
          </div>
          <div className="notice-modal-text">
            {selectedNotice?.content}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default NoticeSection;