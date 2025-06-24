import React, { useState, useRef, useEffect } from 'react';
import WorkListPanel from '../../components/dashboard/WorkListPanel';
import SchedulePanel from '../../components/dashboard/SchedulePanel';
import AssignmentModal from '../../components/dashboard/AssignmentModal';
import { getDefaultDuration } from '../../utils/timeUtils';
import { roomService } from '../../services/roomService';
import { doctorService } from '../../services/doctorService';
import { worklistService } from '../../services/worklistService'; // 추가
import './Dashboard.css';

const Dashboard = () => {
  const [leftWidth, setLeftWidth] = useState(60);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  // 🆕 드래그앤드롭 및 모달 상태 관리
  const [draggedExam, setDraggedExam] = useState(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [selectedRadiologist, setSelectedRadiologist] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');

  // 🆕 검사실과 방사선사 데이터
  const [rooms, setRooms] = useState([]);
  const [radiologists, setRadiologists] = useState([]);
  // 🆕 스케줄 상태도 Dashboard에서 관리
  const [roomSchedules, setRoomSchedules] = useState({});
  
  // 🆕 로딩 상태 추가
  const [loading, setLoading] = useState(false);
  
  // 🆕 WorkListPanel 참조 추가
  const workListPanelRef = useRef(null);

  // 🆕 데이터 로딩
  useEffect(() => {
    loadModalData();
  }, []); // 빈 배열로 한 번만 실행

  const loadModalData = async () => {
    try {
      const [roomsData, radiologistsData] = await Promise.all([
        roomService.getRooms(),
        doctorService.getRadiologists()
      ]);

      console.log('모달 데이터 로드:', { roomsData, radiologistsData });
      setRooms(roomsData);
      setRadiologists(radiologistsData);

      // 🆕 각 검사실별 빈 스케줄 초기화
      const initialSchedules = {};
      roomsData.forEach(room => {
        initialSchedules[room.id] = [];
      });
      setRoomSchedules(initialSchedules);
    } catch (error) {
      console.error('모달 데이터 로드 실패:', error);
    }
  };

  // 🆕 드래그 핸들러
  const handleDragStart = (exam) => {
    console.log('드래그 시작:', exam);
    setDraggedExam(exam);
  };

  // 🆕 모달 관련 핸들러들 (수정됨)
  const confirmAssignment = async () => {
    if (!selectedRadiologist || !selectedTime || !estimatedDuration || !modalData) return;

    try {
      setLoading(true);
      console.log('🔥 배정 확정 시작');

      // 1. Django API 호출
      const assignmentData = {
        roomId: modalData.roomId,
        radiologistId: parseInt(selectedRadiologist),
        startTime: selectedTime,
        duration: parseInt(estimatedDuration)
      };

      const result = await worklistService.assignExam(modalData.exam.id, assignmentData);
      console.log('배정 API 결과:', result);

      // 2. 로컬 스케줄 상태 업데이트
      const examData = {
        examId: modalData.exam.id,
        patientName: modalData.exam.patientName,
        examType: `${modalData.exam.examPart} ${modalData.exam.modality}`,
        status: '검사대기',
        duration: parseInt(estimatedDuration),
        time: selectedTime,
        radiologistId: parseInt(selectedRadiologist)
      };

      setRoomSchedules(prev => ({
        ...prev,
        [modalData.roomId]: [...prev[modalData.roomId], examData]
      }));

      // 3. 워크리스트 새로고침
      if (workListPanelRef.current?.refreshWorklist) {
        workListPanelRef.current.refreshWorklist();
      }

      alert('배정이 완료되었습니다!');
      cancelAssignment();

    } catch (error) {
      console.error('배정 실패:', error);
      alert(`배정 실패: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 🆕 검사 시작 핸들러 추가
  const handleStartExam = async (roomId, examId) => {
    try {
      setLoading(true);
      console.log('검사 시작:', { roomId, examId });
      
      const result = await worklistService.startExam(examId);
      console.log('검사 시작 결과:', result);
      
      // 스케줄 상태 업데이트
      setRoomSchedules(prev => ({
        ...prev,
        [roomId]: prev[roomId].map(exam => 
          exam.examId === examId ? { ...exam, status: '검사중' } : exam
        )
      }));

      // 워크리스트 새로고침
      if (workListPanelRef.current?.refreshWorklist) {
        workListPanelRef.current.refreshWorklist();
      }

      alert('검사가 시작되었습니다.');
    } catch (error) {
      console.error('검사 시작 실패:', error);
      alert(`검사 시작 실패: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 🆕 검사 완료 핸들러 추가
  const handleCompleteExam = async (roomId, examId) => {
    try {
      setLoading(true);
      console.log('검사 완료:', { roomId, examId });
      
      const result = await worklistService.completeExam(examId);
      console.log('검사 완료 결과:', result);
      
      setRoomSchedules(prev => ({
        ...prev,
        [roomId]: prev[roomId].map(exam => 
          exam.examId === examId ? { ...exam, status: '검사완료' } : exam
        )
      }));

      // 워크리스트 새로고침
      if (workListPanelRef.current?.refreshWorklist) {
        workListPanelRef.current.refreshWorklist();
      }

      alert('검사가 완료되었습니다.');
    } catch (error) {
      console.error('검사 완료 실패:', error);
      alert(`검사 완료 실패: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 🆕 검사 취소 핸들러 추가
  const handleCancelExam = async (examId) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('정말로 검사를 취소하시겠습니까?')) return;
    
    try {
      setLoading(true);
      console.log('검사 취소:', examId);
      
      const result = await worklistService.cancelExam(examId);
      console.log('검사 취소 결과:', result);
      
      // 모든 룸에서 해당 검사 제거
      setRoomSchedules(prev => {
        const newSchedules = { ...prev };
        Object.keys(newSchedules).forEach(roomId => {
          newSchedules[roomId] = newSchedules[roomId].filter(
            exam => exam.examId !== examId
          );
        });
        return newSchedules;
      });

      // 워크리스트 새로고침
      if (workListPanelRef.current?.refreshWorklist) {
        workListPanelRef.current.refreshWorklist();
      }

      alert('검사가 취소되었습니다.');
    } catch (error) {
      console.error('검사 취소 실패:', error);
      alert(`검사 취소 실패: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cancelAssignment = () => {
    setShowAssignmentModal(false);
    setModalData(null);
    setDraggedExam(null);
    setSelectedRadiologist('');
    setSelectedTime('');
    setEstimatedDuration('');
  };

  // 🆕 드래그 오버 핸들러
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // 🆕 스케줄에서 이벤트 받기
  const handleExamUpdated = (eventType, data) => {
    console.log('검사 업데이트 이벤트:', eventType, data);
    
    if (eventType === 'assignment_requested') {
      // 배정 모달 열기
      setModalData(data);
      setSelectedRadiologist('');
      setSelectedTime(data.timeSlot);
      setEstimatedDuration(getDefaultDuration(data.exam.modality).toString());
      setShowAssignmentModal(true);
    }
  };

  // 리사이즈 핸들링
  const handleMouseDown = (e) => {
    isDragging.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current || !containerRef.current) return;
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    // 최소/최대 크기 제한 (20% ~ 80%)
    if (newLeftWidth >= 20 && newLeftWidth <= 80) {
      setLeftWidth(newLeftWidth);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <div 
      className="dashboard-main" 
      ref={containerRef}
      style={{
        gridTemplateColumns: `${leftWidth}% 4px ${100 - leftWidth}%`
      }}
    >
      {/* 로딩 오버레이 */}
      {loading && (
        <div className="loading-overlay">
          <div>처리 중...</div>
        </div>
      )}
      
      {/* 워크리스트 섹션 */}
      <div className="worklist-section">
        <WorkListPanel 
          ref={workListPanelRef}
          onDragStart={handleDragStart} 
        />
      </div>
      
      {/* 드래그 핸들 */}
      <div 
        className="resize-handle"
        onMouseDown={handleMouseDown}
      >
        <div className="resize-line"></div>
      </div>
      
      {/* 스케줄 섹션 */}
      <div className="schedule-section">
        <SchedulePanel 
          draggedExam={draggedExam}
          onDragOver={handleDragOver}
          onExamUpdated={handleExamUpdated}
          roomSchedules={roomSchedules}
          rooms={rooms}
          radiologists={radiologists}
          onStartExam={handleStartExam}
          onCompleteExam={handleCompleteExam}
          onCancelExam={handleCancelExam}
        />
      </div>

      {/* 배정 모달 */}
      <AssignmentModal
        isOpen={showAssignmentModal}
        onClose={cancelAssignment}
        modalData={modalData}
        rooms={rooms}
        radiologists={radiologists}
        selectedRadiologist={selectedRadiologist}
        selectedTime={selectedTime}
        estimatedDuration={estimatedDuration}
        onRadiologistChange={setSelectedRadiologist}
        onTimeChange={setSelectedTime}
        onDurationChange={setEstimatedDuration}
        onConfirm={confirmAssignment}
      />
    </div>
  );
};

export default Dashboard;
