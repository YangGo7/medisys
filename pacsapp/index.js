// pages/Dashboard/index.js - 중복 저장 문제 해결
import React, { useState, useRef, useEffect, useCallback } from 'react';
import WorkListPanel from '../../components/dashboard/WorkListPanel';
import SchedulePanel from '../../components/dashboard/SchedulePanel';
import AssignmentModal from '../../components/dashboard/AssignmentModal';
import { getTodayKST } from '../../utils/timeUtils';
import { roomService } from '../../services/roomService';
import { doctorService } from '../../services/doctorService';
import { worklistService } from '../../services/worklistService';
import { scheduleService } from '../../services/scheduleService';
import './Dashboard.css';

const Dashboard = () => {
  const [leftWidth, setLeftWidth] = useState(55);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  // 드래그앤드롭 및 모달 상태 관리
  const [draggedExam, setDraggedExam] = useState(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [selectedRadiologist, setSelectedRadiologist] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');

  // 검사실과 영상전문의 데이터
  const [rooms, setRooms] = useState([]);
  const [radiologists, setRadiologists] = useState([]);
  const [roomSchedules, setRoomSchedules] = useState({});
  
  // 로딩 상태 및 처리 중복 방지
  const [loading, setLoading] = useState(false);
  const isProcessingRef = useRef(false); // 🔥 중복 처리 방지
  
  const workListPanelRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // ✅ 1. useEffect 의존성 배열 최적화
  useEffect(() => {
    // 브라우저 알림 차단
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SKIP_WAITING') {
          event.preventDefault();
        }
      });
    }
  }, []); // 빈 의존성 배열

  // ✅ 2. 모달 데이터 로딩 함수 최적화 (한 번만 실행)
  useEffect(() => {
    let isMounted = true; // cleanup 시 false로 설정
    
    const loadInitialData = async () => {
      try {
        const [roomsData, radiologistsData] = await Promise.all([
          roomService.getRooms(),
          doctorService.getRadiologists()
        ]);

        if (isMounted) {
          console.log('초기 데이터 로드:', { roomsData, radiologistsData });
          setRooms(roomsData);
          setRadiologists(radiologistsData);

          // 각 검사실별 빈 스케줄 초기화
          const initialSchedules = {};
          roomsData.forEach(room => {
            initialSchedules[room.id] = [];
          });
          setRoomSchedules(initialSchedules);
        }
      } catch (error) {
        if (isMounted) {
          console.error('초기 데이터 로드 실패:', error);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false; // cleanup
    };
  }, []); // 한 번만 실행

  // ✅ 3. 날짜 형식 변환 함수 메모이제이션
  const formatDateForAPI = useCallback((date) => {
    if (!date) return new Date().toISOString().split('T')[0];
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    return date;
  }, []);

  // ✅ 4. 스케줄 로딩 함수 최적화 (중복 호출 방지)
  const loadTodaySchedules = useCallback(async (date = null) => {
    // 중복 호출 방지
    if (isProcessingRef.current) {
      console.log('🔄 이미 스케줄 로딩 중, 중복 호출 무시');
      return;
    }

    try {
      isProcessingRef.current = true;
      const targetDate = date || selectedDate;
      const formattedDate = formatDateForAPI(targetDate);
      
      console.log('🔍 스케줄 로딩 시작:', formattedDate);
      
      const scheduleData = await scheduleService.getRoomSchedules(formattedDate);
      console.log('🔍 로딩된 스케줄 데이터:', scheduleData);
      
      if (scheduleData.room_schedules) {
        setRoomSchedules(prev => {
          console.log('📊 이전 스케줄:', Object.keys(prev).length);
          console.log('📊 새로운 스케줄:', Object.keys(scheduleData.room_schedules).length);
          return { ...scheduleData.room_schedules };
        });
        console.log('✅ 스케줄 로딩 완료:', Object.keys(scheduleData.room_schedules).length, '개 검사실');
      } else {
        const initialSchedules = {};
        rooms.forEach(room => {
          initialSchedules[room.id] = [];
        });
        setRoomSchedules(initialSchedules);
        console.log('📝 빈 스케줄로 초기화');
      }
    } catch (error) {
      console.error('❌ 스케줄 로딩 실패:', error);
      
      const initialSchedules = {};
      rooms.forEach(room => {
        initialSchedules[room.id] = [];
      });
      setRoomSchedules(initialSchedules);
    } finally {
      // 최소 500ms 후에 다시 호출 가능하도록 설정
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 500);
    }
  }, [selectedDate, formatDateForAPI, rooms]);

  // ✅ 5. 스케줄 새로고침 함수 간소화
  const refreshSchedules = useCallback(async () => {
    console.log('🔄 스케줄 수동 새로고침 요청');
    
    // 이미 처리 중이면 무시
    if (isProcessingRef.current) {
      console.log('🔄 이미 처리 중, 새로고침 무시');
      return;
    }
    
    await loadTodaySchedules(selectedDate);
  }, [selectedDate, loadTodaySchedules]);

  // ✅ 6. rooms 변경 시에만 스케줄 로딩 (날짜는 별도 관리)
  useEffect(() => {
    if (rooms.length > 0 && !isProcessingRef.current) {
      console.log('📋 검사실 데이터 로드 완료, 스케줄 로딩 시작');
      loadTodaySchedules(selectedDate);
    }
  }, [rooms.length]); // rooms.length만 의존성으로 사용

  // ✅ 7. 날짜 변경 시 별도 처리
  useEffect(() => {
    if (rooms.length > 0 && !isProcessingRef.current) {
      console.log('📅 날짜 변경됨, 스케줄 새로 로딩');
      loadTodaySchedules(selectedDate);
    }
  }, [selectedDate]); // selectedDate만 의존성으로 사용

  // 페이지 포커스 시 스케줄 새로고침 (throttling 적용)
  useEffect(() => {
    let focusTimeout = null;
    
    const handleFocus = () => {
      // throttling: 2초 내 중복 호출 방지
      if (focusTimeout) {
        clearTimeout(focusTimeout);
      }
      
      focusTimeout = setTimeout(() => {
        console.log('🔄 페이지 포커스 - 스케줄 새로고침');
        if (rooms.length > 0 && !isProcessingRef.current) {
          loadTodaySchedules(selectedDate);
        }
      }, 2000);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleFocus();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (focusTimeout) {
        clearTimeout(focusTimeout);
      }
    };
  }, [rooms.length, selectedDate]); // 최소한의 의존성만 사용

  // 날짜 변경 핸들러
  const handleDateChange = useCallback((date) => {
    console.log('📅 Dashboard 날짜 변경:', date);
    setSelectedDate(new Date(date));
  }, []);

  // 드래그 핸들러
  const handleDragStart = useCallback((exam) => {
    console.log('드래그 시작:', exam);
    setDraggedExam(exam);
  }, []);

  // ✅ 8. 배정 확정 핸들러 최적화 (중복 호출 제거)
  const confirmAssignment = useCallback(async () => {
    if (!selectedRadiologist || !selectedTime || !estimatedDuration || !modalData) return;

    // 중복 처리 방지
    if (isProcessingRef.current) {
      console.log('🔄 이미 배정 처리 중, 중복 호출 무시');
      return;
    }

    try {
      setLoading(true);
      isProcessingRef.current = true;
      console.log('🔥 배정 확정 시작');

      // 1. Django API 호출
      const assignmentData = {
        roomId: modalData.roomId,
        radiologistId: parseInt(selectedRadiologist),
        startTime: selectedTime,
        duration: parseInt(estimatedDuration)
      };

      console.log('📤 배정 요청 데이터:', assignmentData);
      const result = await worklistService.assignExam(modalData.exam.id, assignmentData);
      console.log('📥 배정 API 결과:', result);

      // 2. ✅ 단일 새로고침만 수행 (중복 제거)
      console.log('🔄 스케줄 새로고침 시작...');
      await refreshSchedules();

      // 3. 워크리스트 새로고침
      if (workListPanelRef.current?.refreshWorklist) {
        workListPanelRef.current.refreshWorklist();
      }

      // 4. ✅ 성공 메시지
      console.log('✅ 배정 완료!');
      alert(`✅ ${modalData.exam.patientName} 환자의 검사가 성공적으로 배정되었습니다!`);
      cancelAssignment();

    } catch (error) {
      console.error('❌ 배정 실패:', error);
      alert(`❌ 배정 실패: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
      // 1초 후에 다시 처리 가능하도록 설정
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1000);
    }
  }, [selectedRadiologist, selectedTime, estimatedDuration, modalData, refreshSchedules]);

  // ✅ 9. 다른 핸들러들도 중복 방지 추가
  const handleStartExam = useCallback(async (roomId, examId) => {
    if (isProcessingRef.current) return;
    
    try {
      setLoading(true);
      isProcessingRef.current = true;
      console.log('검사 시작:', { roomId, examId });
      
      const result = await worklistService.startExam(examId);
      console.log('검사 시작 결과:', result);
      
      await refreshSchedules();

      if (workListPanelRef.current?.refreshWorklist) {
        workListPanelRef.current.refreshWorklist();
      }

      alert('검사가 시작되었습니다.');
    } catch (error) {
      console.error('검사 시작 실패:', error);
      alert(`검사 시작 실패: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 500);
    }
  }, [refreshSchedules]);

  const handleCompleteExam = useCallback(async (roomId, examId) => {
    if (isProcessingRef.current) return;
    
    try {
      setLoading(true);
      isProcessingRef.current = true;
      console.log('검사 완료:', { roomId, examId });
      
      const result = await worklistService.completeExam(examId);
      console.log('검사 완료 결과:', result);
      
      await refreshSchedules();

      if (workListPanelRef.current?.refreshWorklist) {
        workListPanelRef.current.refreshWorklist();
      }

      alert('검사가 완료되었습니다.');
    } catch (error) {
      console.error('검사 완료 실패:', error);
      alert(`검사 완료 실패: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 500);
    }
  }, [refreshSchedules]);

  const handleCancelExam = useCallback(async (examId) => {
    if (!window.confirm('정말로 검사를 취소하시겠습니까?')) return;
    if (isProcessingRef.current) return;
    
    try {
      setLoading(true);
      isProcessingRef.current = true;
      console.log('검사 취소:', examId);
      
      const result = await worklistService.cancelExam(examId);
      console.log('검사 취소 결과:', result);
      
      await refreshSchedules();

      if (workListPanelRef.current?.refreshWorklist) {
        workListPanelRef.current.refreshWorklist();
      }

      alert('검사가 취소되었습니다.');
    } catch (error) {
      console.error('검사 취소 실패:', error);
      alert(`검사 취소 실패: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 500);
    }
  }, [refreshSchedules]);

  const cancelAssignment = useCallback(() => {
    setShowAssignmentModal(false);
    setModalData(null);
    setDraggedExam(null);
    setSelectedRadiologist('');
    setSelectedTime('');
    setEstimatedDuration('');
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleExamUpdated = useCallback((eventType, data) => {
    console.log('검사 업데이트 이벤트:', eventType, data);
    
    if (eventType === 'assignment_requested') {
      setModalData(data);
      setSelectedRadiologist('');
      setSelectedTime(data.timeSlot);
      setEstimatedDuration(getTodayKST(data.exam.modality).toString());
      setShowAssignmentModal(true);
    }
  }, []);

  // 리사이즈 핸들링
  const handleMouseDown = useCallback((e) => {
    isDragging.current = true;
    
    const handleMouseMove = (e) => {
      if (!isDragging.current || !containerRef.current) return;
      
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      
      if (newLeftWidth >= 20 && newLeftWidth <= 80) {
        setLeftWidth(newLeftWidth);
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

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
        <div className="loading-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          color: 'white',
          fontSize: '1.2rem'
        }}>
          <div>⏳ 처리 중... (중복 방지 활성화)</div>
        </div>
      )}
      
      {/* 워크리스트 섹션 */}
      <div className="worklist-section">
        <WorkListPanel 
          ref={workListPanelRef}
          onDragStart={handleDragStart}
          onDateChange={handleDateChange}
          selectedDate={formatDateForAPI(selectedDate)}
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
          onRefreshSchedules={refreshSchedules}
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
      
      {/* 개발용 디버깅 정보 */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.9)',
          color: 'white',
          padding: '0.75rem',
          borderRadius: '0.5rem',
          fontSize: '0.75rem',
          lineHeight: '1.4',
          maxWidth: '300px',
          zIndex: 1000
        }}>
          <div>🏥 검사실: <strong>{rooms.length}개</strong></div>
          <div>👨‍⚕️ 영상전문의: <strong>{radiologists.length}명</strong></div>
          <div>📅 선택된 날짜: <strong>{formatDateForAPI(selectedDate)}</strong></div>
          <div>📊 스케줄: <strong>{Object.keys(roomSchedules).length}개 검사실</strong></div>
          <div>🔒 처리 중: <strong>{isProcessingRef.current ? '예' : '아니오'}</strong></div>
          {Object.entries(roomSchedules).map(([roomId, schedules]) => (
            <div key={roomId} style={{fontSize: '0.7rem', color: '#94a3b8'}}>
              Room {roomId}: {schedules?.length || 0}개 검사
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;