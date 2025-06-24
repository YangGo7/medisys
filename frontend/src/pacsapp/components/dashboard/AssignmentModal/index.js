import React from 'react';
import Modal from '../../common/Modal';
import './AssignmentModal.css';

const AssignmentModal = ({
  isOpen,
  onClose,
  modalData,
  rooms = [],        // 🔧 기본값 추가
  radiologists = [], // 🔧 기본값 추가
  selectedRadiologist,
  selectedTime,
  estimatedDuration,
  onRadiologistChange,
  onTimeChange,
  onDurationChange,
  onConfirm
}) => {
  // 🔧 안전한 데이터 확인
  if (!modalData || !modalData.exam) {
    return null;
  }

  // 🔧 안전한 방식으로 검사실 찾기
  const selectedRoom = rooms.find(r => r.id === modalData.roomId) || { name: '알 수 없음' };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="검사 배정"
    >
      <div className="assignment-content">
        <div className="assignment-info">
          <p className="room-info">
            검사실 {selectedRoom.name}에 배정
          </p>
          <p className="patient-info">
            환자: {modalData.exam.patientName} - {modalData.exam.examPart} {modalData.exam.modality}
          </p>
        </div>
        
        <div className="form-group">
          <label>담당 방사선사 선택</label>
          <select
            value={selectedRadiologist}
            onChange={(e) => onRadiologistChange(e.target.value)}
            className="assignment-select"
            required
          >
            <option value="">담당의를 선택하세요</option>
            {radiologists.map(radiologist => (
              <option key={radiologist.id} value={radiologist.id}>
                Dr. {radiologist.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>검사 시작 시간 (10분 단위)</label>
          <select
            value={selectedTime}
            onChange={(e) => onTimeChange(e.target.value)}
            className="assignment-select"
            required
          >
            <option value="">시간을 선택하세요</option>
            {Array.from({ length: 6 }, (_, i) => {
              const minute = i * 10;
              const baseHour = parseInt(modalData?.timeSlot?.split(':')[0] || '09');
              const timeString = `${baseHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
              return (
                <option key={timeString} value={timeString}>
                  {timeString}
                </option>
              );
            })}
          </select>
        </div>

        <div className="form-group">
          <label>예상 소요시간 (10분 단위)</label>
          <select
            value={estimatedDuration}
            onChange={(e) => onDurationChange(e.target.value)}
            className="assignment-select"
            required
          >
            <option value="10">10분</option>
            <option value="20">20분</option>
            <option value="30">30분</option>
            <option value="40">40분</option>
            <option value="50">50분</option>
            <option value="60">60분</option>
          </select>
        </div>
        
        <div className="assignment-actions">
          <button onClick={onClose} className="cancel-button">
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={!selectedRadiologist || !selectedTime || !estimatedDuration}
            className="confirm-button"
          >
            배정 확정
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AssignmentModal;
