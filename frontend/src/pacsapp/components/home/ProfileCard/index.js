// import React, { useState } from 'react';
// import { useDoctor } from '../../../contexts/DoctorContext'; // 🆕 추가
// import './ProfileCard.css';

// const ProfileCard = () => {
//   // 🆕 기존 코드 삭제하고 Context 사용
//   const { doctor, loading, error, updateDoctorStatus } = useDoctor();
//   const [isUpdating, setIsUpdating] = useState(false); // 🆕 추가

//   // 🆕 상태 토글 함수 추가
//   const handleStatusToggle = async (newStatus) => {
//     if (isUpdating) return;
//     setIsUpdating(true);
    
//     try {
//       await updateDoctorStatus(newStatus);
//     } catch (err) {
//       alert('상태 업데이트에 실패했습니다.');
//     } finally {
//       setIsUpdating(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="profile-card">
//         <div className="loading">로딩 중...</div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="profile-card">
//         <div className="error">{error}</div>
//       </div>
//     );
//   }

//   // 🆕 온라인 상태 확인
//   const isOnline = doctor?.status === '온라인';

//   return (
//     <div className="profile-card">
//       <div className="profile-header">
//         <div className="profile-avatar">
//           <div className="avatar-circle">{doctor?.name?.charAt(0) || 'U'}</div>
//         </div>
//         <div className="profile-info">
//           <div className="profile-name">{doctor?.name || '사용자'}</div>
//           <div className="profile-department">{doctor?.department || '진료과'}</div>
//           <div className="profile-department">{doctor?.role || '역할'}</div>
//           <div className="profile-status">
//             <span className={`status-dot ${doctor?.status === '온라인' ? 'online' : 'offline'}`}></span>
//             {doctor?.status || '상태'}
//           </div>
//         </div>
//       </div>
      
//       <div className="profile-stats">
//         <div className="stat-item">
//             <div className="stat-number">42</div>
//             <div className="stat-label">금일 영상 검사</div>
//         </div>
//         <div className="stat-item">
//             <div className="stat-number">5/12</div>
//             <div className="stat-label">검사현황</div>
//         </div>
//         <div className="stat-item">
//             <div className="stat-number">8/15</div>
//             <div className="stat-label">레포트 현황</div>
//         </div>
//       </div>

//       <div className="today-schedule">
//         <div className="schedule-title">오늘 일정</div>
//         <div className="schedule-list">
//           <div className="schedule-item">
//             <span className="schedule-time">09:00</span>
//             <span className="schedule-content">CT 촬영</span>
//           </div>
//           <div className="schedule-item">
//             <span className="schedule-time">14:00</span>
//             <span className="schedule-content">장비 점검</span>
//           </div>
//           <div className="schedule-item">
//             <span className="schedule-time">16:00</span>
//             <span className="schedule-content">컨퍼런스</span>
//           </div>
//           <div className="schedule-item">
//             <span className="schedule-time">16:00</span>
//             <span className="schedule-content">컨퍼런스</span>
//           </div>
//           <div className="schedule-item">
//             <span className="schedule-time">16:00</span>
//             <span className="schedule-content">컨퍼런스</span>
//           </div>
//           <div className="schedule-item">
//             <span className="schedule-time">16:00</span>
//             <span className="schedule-content">컨퍼런스</span>
//           </div>
//           <div className="schedule-item">
//             <span className="schedule-time">16:00</span>
//             <span className="schedule-content">컨퍼런스</span>
//           </div>
//         </div>
//       </div>

//       {/* 🆕 버튼 부분 완전 교체 */}
//       <div className="quick-actions">
//         <button 
//           className={`action-btn ${isOnline ? 'primary' : 'secondary'}`}
//           onClick={() => handleStatusToggle('온라인')}
//           disabled={isUpdating}
//         >
//           {isUpdating && !isOnline ? '변경 중...' : '온라인'}
//         </button>
//         <button 
//           className={`action-btn ${!isOnline ? 'primary' : 'secondary'}`}
//           onClick={() => handleStatusToggle('자리 비움')}
//           disabled={isUpdating}
//         >
//           {isUpdating && isOnline ? '변경 중...' : '자리 비움'}
//         </button>
//       </div>
//     </div>
//   );
// };

// export default ProfileCard;

// D:\250619\radiology-system\frontend\src\components\home\ProfileCard\index.js
import React, { useState } from 'react';
import { useDoctor } from '../../../contexts/DoctorContext';
import './ProfileCard.css';

const ProfileCard = () => {
  const { 
    doctor, 
    loading, 
    error, 
    updateDoctorStatus,
    todaySchedules,  // 🆕 오늘 개인일정
    schedulesLoading,  // 🆕 일정 로딩 상태
    createPersonalSchedule,  // 🆕 일정 생성
    updatePersonalSchedule,  // 🆕 일정 수정
    deletePersonalSchedule   // 🆕 일정 삭제
  } = useDoctor();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);  // 🆕 일정 모달
  const [editingSchedule, setEditingSchedule] = useState(null);  // 🆕 수정중인 일정

  // 상태 토글 함수
  const handleStatusToggle = async (newStatus) => {
    if (isUpdating) return;
    setIsUpdating(true);
    
    try {
      await updateDoctorStatus(newStatus);
    } catch (err) {
      alert('상태 업데이트에 실패했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  // 🆕 일정 추가 버튼 클릭
  const handleAddSchedule = () => {
    setEditingSchedule(null);
    setShowScheduleModal(true);
  };

  // 🆕 일정 수정 버튼 클릭
  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setShowScheduleModal(true);
  };

  // 🆕 일정 삭제
  const handleDeleteSchedule = async (scheduleId) => {
    if (window.confirm('이 일정을 삭제하시겠습니까?')) {
      try {
        await deletePersonalSchedule(scheduleId);
      } catch (err) {
        alert('일정 삭제에 실패했습니다.');
      }
    }
  };

  if (loading) {
    return (
      <div className="profile-card">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-card">
        <div className="error">{error}</div>
      </div>
    );
  }

  const isOnline = doctor?.status === '온라인';

  return (
    <div className="profile-card">
      <div className="profile-header">
        <div className="profile-avatar">
          <div className="avatar-circle">{doctor?.name?.charAt(0) || 'U'}</div>
        </div>
        <div className="profile-info">
          <div className="profile-name">{doctor?.name || '사용자'}</div>
          <div className="profile-department">{doctor?.department || '진료과'}</div>
          <div className="profile-department">{doctor?.role || '역할'}</div>
          <div className="profile-status">
            <span className={`status-dot ${doctor?.status === '온라인' ? 'online' : 'offline'}`}></span>
            {doctor?.status || '상태'}
          </div>
        </div>
      </div>
      
      <div className="profile-stats">
        <div className="stat-item">
            <div className="stat-number">42</div>
            <div className="stat-label">금일 영상 검사</div>
        </div>
        <div className="stat-item">
            <div className="stat-number">5/12</div>
            <div className="stat-label">검사현황</div>
        </div>
        <div className="stat-item">
            <div className="stat-number">8/15</div>
            <div className="stat-label">레포트 현황</div>
        </div>
      </div>

      {/* 🆕 오늘 일정 - 실제 데이터 */}
      <div className="today-schedule">
        <div className="schedule-title">
          오늘 일정
          <button 
            onClick={handleAddSchedule}
            className="add-schedule-btn"
            title="일정 추가"
          >
            +
          </button>
        </div>
        <div className="schedule-list">
          {schedulesLoading ? (
            <div className="schedule-loading">일정 로딩 중...</div>
          ) : todaySchedules && todaySchedules.length > 0 ? (
            todaySchedules.map((schedule) => (
              <div key={schedule.id} className="schedule-item">
                <span className="schedule-time">
                  {schedule.time_display}  {/* 🆕 "09:00 ~ 10:30" 형태 */}
                </span>
                <span className="schedule-content">{schedule.title}</span>
                <div className="schedule-actions">
                  <button 
                    onClick={() => handleEditSchedule(schedule)}
                    className="edit-btn"
                    title="수정"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => handleDeleteSchedule(schedule.id)}
                    className="delete-btn"
                    title="삭제"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="schedule-item no-schedule">
              오늘 개인 일정이 없습니다.
            </div>
          )}
        </div>
      </div>

      <div className="quick-actions">
        <button 
          className={`action-btn ${isOnline ? 'primary' : 'secondary'}`}
          onClick={() => handleStatusToggle('온라인')}
          disabled={isUpdating}
        >
          {isUpdating && !isOnline ? '변경 중...' : '온라인'}
        </button>
        <button 
          className={`action-btn ${!isOnline ? 'primary' : 'secondary'}`}
          onClick={() => handleStatusToggle('자리 비움')}
          disabled={isUpdating}
        >
          {isUpdating && isOnline ? '변경 중...' : '자리 비움'}
        </button>
      </div>

      {/* 🆕 일정 추가/수정 모달 (간단 버전) */}
      {showScheduleModal && (
        <ScheduleModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          editingSchedule={editingSchedule}
          onSave={editingSchedule ? updatePersonalSchedule : createPersonalSchedule}
        />
      )}
    </div>
  );
};

// 🆕 간단한 일정 모달 컴포넌트
const ScheduleModal = ({ isOpen, onClose, editingSchedule, onSave }) => {
  const [formData, setFormData] = useState({
    title: editingSchedule?.title || '',
    datetime: editingSchedule?.datetime ? new Date(editingSchedule.datetime).toISOString().slice(0, 16) : '',
    end_datetime: editingSchedule?.end_datetime ? new Date(editingSchedule.end_datetime).toISOString().slice(0, 16) : '',
    description: editingSchedule?.description || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSchedule) {
        await onSave(editingSchedule.id, formData);
      } else {
        await onSave(formData);
      }
      onClose();
    } catch (err) {
      alert('일정 저장에 실패했습니다.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{editingSchedule ? '일정 수정' : '일정 추가'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>제목</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>시작시간</label>
            <input
              type="datetime-local"
              value={formData.datetime}
              onChange={(e) => setFormData({...formData, datetime: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>종료시간 (선택사항)</label>
            <input
              type="datetime-local"
              value={formData.end_datetime}
              onChange={(e) => setFormData({...formData, end_datetime: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>설명</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>취소</button>
            <button type="submit">저장</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileCard;