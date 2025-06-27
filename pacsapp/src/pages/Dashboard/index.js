// pages/Dashboard/index.js
// ESLint react-hooks/exhaustive-deps 경고 제거 버전

// import React, { useState, useRef, useEffect, useCallback } from 'react';
// import WorkListPanel from '../../components/dashboard/WorkListPanel';
// import SchedulePanel from '../../components/dashboard/SchedulePanel';
// import AssignmentModal from '../../components/dashboard/AssignmentModal';
// import { getDefaultDuration } from '../../utils/timeUtils';
// import { roomService } from '../../services/roomService';
// import { doctorService } from '../../services/doctorService';
// import { worklistService } from '../../services/worklistService';
// import { scheduleService } from '../../services/scheduleService';
// import './Dashboard.css';

// const Dashboard = () => {
//   const [leftWidth, setLeftWidth] = useState(60);
//   const containerRef = useRef(null);
//   const isDragging = useRef(false);

//   // 드래그앤드롭 및 모달 상태 관리
//   const [draggedExam, setDraggedExam] = useState(null);
//   const [showAssignmentModal, setShowAssignmentModal] = useState(false);
//   const [modalData, setModalData] = useState(null);
//   const [selectedRadiologist, setSelectedRadiologist] = useState('');
//   const [selectedTime, setSelectedTime] = useState('');
//   const [estimatedDuration, setEstimatedDuration] = useState('');

//   // 검사실과 방사선사 데이터
//   const [rooms, setRooms] = useState([]);
//   const [radiologists, setRadiologists] = useState([]);
//   // 스케줄 상태도 Dashboard에서 관리
//   const [roomSchedules, setRoomSchedules] = useState({});
  
//   // 로딩 상태 추가
//   const [loading, setLoading] = useState(false);
  
//   // WorkListPanel 참조 추가
//   const workListPanelRef = useRef(null);

//   // selectedDate 상태 추가
//   const [selectedDate, setSelectedDate] = useState(new Date());

//   // 날짜 형식 변환 유틸 함수
//   const formatDateForAPI = useCallback((date) => {
//     if (!date) return new Date().toISOString().split('T')[0];
//     if (date instanceof Date) {
//       return date.toISOString().split('T')[0];
//     }
//     return date;
//   }, []);

//   // 오늘 스케줄 로딩 함수 (useCallback으로 감싸서 의존성 해결)
//   const loadTodaySchedules = useCallback(async (date = null) => {
//     try {
//       const targetDate = date || selectedDate;
//       const formattedDate = formatDateForAPI(targetDate);
      
//       console.log('🔍 스케줄 로딩 날짜:', formattedDate);
      
//       const scheduleData = await scheduleService.getRoomSchedules(formattedDate);
//       console.log('🔍 로딩된 스케줄 데이터:', scheduleData);
      
//       if (scheduleData.room_schedules) {
//         setRoomSchedules(scheduleData.room_schedules);
//         console.log('✅ 스케줄 로딩 완료:', Object.keys(scheduleData.room_schedules).length, '개 검사실');
//       } else {
//         // 데이터가 없으면 빈 스케줄 초기화
//         const initialSchedules = {};
//         rooms.forEach(room => {
//           initialSchedules[room.id] = [];
//         });
//         setRoomSchedules(initialSchedules);
//         console.log('📝 빈 스케줄로 초기화');
//       }
//     } catch (error) {
//       console.error('❌ 스케줄 로딩 실패:', error);
      
//       // 에러 시 빈 스케줄로 초기화
//       const initialSchedules = {};
//       rooms.forEach(room => {
//         initialSchedules[room.id] = [];
//       });
//       setRoomSchedules(initialSchedules);
//     }
//   }, [selectedDate, formatDateForAPI, rooms]);

//   // 스케줄 새로고침 함수 (useCallback으로 감싸기)
//   const refreshSchedules = useCallback(async () => {
//     console.log('🔄 스케줄 수동 새로고침 - 날짜:', selectedDate);
//     await loadTodaySchedules(selectedDate);
//   }, [selectedDate, loadTodaySchedules]);

//   // 모달 데이터 로딩
//   const loadModalData = useCallback(async () => {
//     try {
//       const [roomsData, radiologistsData] = await Promise.all([
//         roomService.getRooms(),
//         doctorService.getRadiologists()
//       ]);

//       console.log('모달 데이터 로드:', { roomsData, radiologistsData });
//       setRooms(roomsData);
//       setRadiologists(radiologistsData);

//       // 각 검사실별 빈 스케줄 초기화
//       const initialSchedules = {};
//       roomsData.forEach(room => {
//         initialSchedules[room.id] = [];
//       });
//       setRoomSchedules(initialSchedules);
//     } catch (error) {
//       console.error('모달 데이터 로드 실패:', error);
//     }
//   }, []);

//   // 데이터 로딩 - 빈 배열로 한 번만 실행
//   useEffect(() => {
//     loadModalData();
//   }, [loadModalData]);

//   // rooms 데이터 로드 후 스케줄 로딩 (선택된 날짜로)
//   useEffect(() => {
//     if (rooms.length > 0) {
//       loadTodaySchedules(selectedDate);
//     }
//   }, [rooms, selectedDate, loadTodaySchedules]);

//   // 페이지 포커스 시 스케줄 새로고침 (선택된 날짜로)
//   useEffect(() => {
//     const handleFocus = () => {
//       console.log('🔄 페이지 포커스 - 스케줄 새로고침');
//       if (rooms.length > 0) {
//         loadTodaySchedules(selectedDate);
//       }
//     };

//     const handleVisibilityChange = () => {
//       if (!document.hidden) {
//         handleFocus();
//       }
//     };

//     window.addEventListener('focus', handleFocus);
//     document.addEventListener('visibilitychange', handleVisibilityChange);

//     return () => {
//       window.removeEventListener('focus', handleFocus);
//       document.removeEventListener('visibilitychange', handleVisibilityChange);
//     };
//   }, [rooms, selectedDate, loadTodaySchedules]);

//   // 날짜 변경 핸들러
//   const handleDateChange = useCallback((date) => {
//     console.log('📅 Dashboard 날짜 변경:', date);
//     setSelectedDate(new Date(date));
    
//     // 날짜 변경 시 스케줄도 함께 업데이트
//     if (rooms.length > 0) {
//       loadTodaySchedules(new Date(date));
//     }
//   }, [rooms, loadTodaySchedules]);

//   // 드래그 핸들러
//   const handleDragStart = useCallback((exam) => {
//     console.log('드래그 시작:', exam);
//     setDraggedExam(exam);
//   }, []);

//   // 모달 관련 핸들러들
//   const confirmAssignment = useCallback(async () => {
//     if (!selectedRadiologist || !selectedTime || !estimatedDuration || !modalData) return;

//     try {
//       setLoading(true);
//       console.log('🔥 배정 확정 시작');

//       // 1. Django API 호출
//       const assignmentData = {
//         roomId: modalData.roomId,
//         radiologistId: parseInt(selectedRadiologist),
//         startTime: selectedTime,
//         duration: parseInt(estimatedDuration)
//       };

//       const result = await worklistService.assignExam(modalData.exam.id, assignmentData);
//       console.log('배정 API 결과:', result);

//       // 2. API 호출 후 전체 스케줄 새로고침 (더 안전함)
//       await refreshSchedules();

//       // 3. 워크리스트 새로고침
//       if (workListPanelRef.current?.refreshWorklist) {
//         workListPanelRef.current.refreshWorklist();
//       }

//       alert('배정이 완료되었습니다!');
//       cancelAssignment();

//     } catch (error) {
//       console.error('배정 실패:', error);
//       alert(`배정 실패: ${error.response?.data?.error || error.message}`);
//     } finally {
//       setLoading(false);
//     }
//   }, [selectedRadiologist, selectedTime, estimatedDuration, modalData, refreshSchedules]);

//   // 검사 시작 핸들러
//   const handleStartExam = useCallback(async (roomId, examId) => {
//     try {
//       setLoading(true);
//       console.log('검사 시작:', { roomId, examId });
      
//       const result = await worklistService.startExam(examId);
//       console.log('검사 시작 결과:', result);
      
//       // API 호출 후 스케줄 새로고침
//       await refreshSchedules();

//       // 워크리스트 새로고침
//       if (workListPanelRef.current?.refreshWorklist) {
//         workListPanelRef.current.refreshWorklist();
//       }

//       alert('검사가 시작되었습니다.');
//     } catch (error) {
//       console.error('검사 시작 실패:', error);
//       alert(`검사 시작 실패: ${error.response?.data?.error || error.message}`);
//     } finally {
//       setLoading(false);
//     }
//   }, [refreshSchedules]);

//   // 검사 완료 핸들러
//   const handleCompleteExam = useCallback(async (roomId, examId) => {
//     try {
//       setLoading(true);
//       console.log('검사 완료:', { roomId, examId });
      
//       const result = await worklistService.completeExam(examId);
//       console.log('검사 완료 결과:', result);
      
//       // API 호출 후 스케줄 새로고침
//       await refreshSchedules();

//       // 워크리스트 새로고침
//       if (workListPanelRef.current?.refreshWorklist) {
//         workListPanelRef.current.refreshWorklist();
//       }

//       alert('검사가 완료되었습니다.');
//     } catch (error) {
//       console.error('검사 완료 실패:', error);
//       alert(`검사 완료 실패: ${error.response?.data?.error || error.message}`);
//     } finally {
//       setLoading(false);
//     }
//   }, [refreshSchedules]);

//   // 검사 취소 핸들러
//   const handleCancelExam = useCallback(async (examId) => {
//     if (!window.confirm('정말로 검사를 취소하시겠습니까?')) return;
    
//     try {
//       setLoading(true);
//       console.log('검사 취소:', examId);
      
//       const result = await worklistService.cancelExam(examId);
//       console.log('검사 취소 결과:', result);
      
//       // API 호출 후 스케줄 새로고침
//       await refreshSchedules();

//       // 워크리스트 새로고침
//       if (workListPanelRef.current?.refreshWorklist) {
//         workListPanelRef.current.refreshWorklist();
//       }

//       alert('검사가 취소되었습니다.');
//     } catch (error) {
//       console.error('검사 취소 실패:', error);
//       alert(`검사 취소 실패: ${error.response?.data?.error || error.message}`);
//     } finally {
//       setLoading(false);
//     }
//   }, [refreshSchedules]);

//   const cancelAssignment = useCallback(() => {
//     setShowAssignmentModal(false);
//     setModalData(null);
//     setDraggedExam(null);
//     setSelectedRadiologist('');
//     setSelectedTime('');
//     setEstimatedDuration('');
//   }, []);

//   // 드래그 오버 핸들러
//   const handleDragOver = useCallback((e) => {
//     e.preventDefault();
//   }, []);

//   // 스케줄에서 이벤트 받기
//   const handleExamUpdated = useCallback((eventType, data) => {
//     console.log('검사 업데이트 이벤트:', eventType, data);
    
//     if (eventType === 'assignment_requested') {
//       // 배정 모달 열기
//       setModalData(data);
//       setSelectedRadiologist('');
//       setSelectedTime(data.timeSlot);
//       setEstimatedDuration(getDefaultDuration(data.exam.modality).toString());
//       setShowAssignmentModal(true);
//     }
//   }, []);

//   // 리사이즈 핸들링
//   const handleMouseDown = useCallback((e) => {
//     isDragging.current = true;
    
//     const handleMouseMove = (e) => {
//       if (!isDragging.current || !containerRef.current) return;
      
//       const container = containerRef.current;
//       const containerRect = container.getBoundingClientRect();
//       const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      
//       // 최소/최대 크기 제한 (20% ~ 80%)
//       if (newLeftWidth >= 20 && newLeftWidth <= 80) {
//         setLeftWidth(newLeftWidth);
//       }
//     };

//     const handleMouseUp = () => {
//       isDragging.current = false;
//       document.removeEventListener('mousemove', handleMouseMove);
//       document.removeEventListener('mouseup', handleMouseUp);
//     };

//     document.addEventListener('mousemove', handleMouseMove);
//     document.addEventListener('mouseup', handleMouseUp);
//   }, []);

//   return (
//     <div 
//       className="dashboard-main" 
//       ref={containerRef}
//       style={{
//         gridTemplateColumns: `${leftWidth}% 4px ${100 - leftWidth}%`
//       }}
//     >
//       {/* 로딩 오버레이 */}
//       {loading && (
//         <div className="loading-overlay">
//           <div>처리 중...</div>
//         </div>
//       )}
      
//       {/* 워크리스트 섹션 */}
//       <div className="worklist-section">
//         <WorkListPanel 
//           ref={workListPanelRef}
//           onDragStart={handleDragStart}
//           onDateChange={handleDateChange}
//         />
//       </div>
      
//       {/* 드래그 핸들 */}
//       <div 
//         className="resize-handle"
//         onMouseDown={handleMouseDown}
//       >
//         <div className="resize-line"></div>
//       </div>
      
//       {/* 스케줄 섹션 */}
//       <div className="schedule-section">
//         <SchedulePanel 
//           draggedExam={draggedExam}
//           onDragOver={handleDragOver}
//           onExamUpdated={handleExamUpdated}
//           roomSchedules={roomSchedules}
//           rooms={rooms}
//           radiologists={radiologists}
//           onStartExam={handleStartExam}
//           onCompleteExam={handleCompleteExam}
//           onCancelExam={handleCancelExam}
//           onRefreshSchedules={refreshSchedules}
//         />
//       </div>

//       {/* 배정 모달 */}
//       <AssignmentModal
//         isOpen={showAssignmentModal}
//         onClose={cancelAssignment}
//         modalData={modalData}
//         rooms={rooms}
//         radiologists={radiologists}
//         selectedRadiologist={selectedRadiologist}
//         selectedTime={selectedTime}
//         estimatedDuration={estimatedDuration}
//         onRadiologistChange={setSelectedRadiologist}
//         onTimeChange={setSelectedTime}
//         onDurationChange={setEstimatedDuration}
//         onConfirm={confirmAssignment}
//       />
//     </div>
//   );
// };

// export default Dashboard;

// pages/Dashboard/index.js
// pages/Dashboard/index.js
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
  // 스케줄 상태도 Dashboard에서 관리
  const [roomSchedules, setRoomSchedules] = useState({});
  
  // 로딩 상태 추가
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false); // ✅ 데이터 로딩 완료 상태 추가
  
  // WorkListPanel 참조 추가
  const workListPanelRef = useRef(null);

  // selectedDate 상태 추가
  const [selectedDate, setSelectedDate] = useState(new Date());

  // ✅ 브라우저 알림 차단
  useEffect(() => {
    // 브라우저 알림 차단
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // 페이지 업데이트 알림 차단 (서비스 워커 관련)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SKIP_WAITING') {
          // 자동 새로고침 방지
          event.preventDefault();
        }
      });
    }
  }, []);

  // 날짜 형식 변환 유틸 함수
  const formatDateForAPI = useCallback((date) => {
    if (!date) return new Date().toISOString().split('T')[0];
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    return date;
  }, []);

  // ✅ 스케줄 로딩 함수 개선
  const loadTodaySchedules = useCallback(async (date = null) => {
    try {
      const targetDate = date || selectedDate;
      const formattedDate = formatDateForAPI(targetDate);
      
      console.log('🔍 스케줄 로딩 날짜:', formattedDate);
      
      const scheduleData = await scheduleService.getRoomSchedules(formattedDate);
      console.log('🔍 로딩된 스케줄 데이터:', scheduleData);
      
      if (scheduleData.room_schedules) {
        // ✅ 새로운 스케줄 데이터로 완전히 교체
        setRoomSchedules(prev => {
          console.log('📊 이전 스케줄:', prev);
          console.log('📊 새로운 스케줄:', scheduleData.room_schedules);
          return { ...scheduleData.room_schedules };
        });
        console.log('✅ 스케줄 로딩 완료:', Object.keys(scheduleData.room_schedules).length, '개 검사실');
      } else {
        // 데이터가 없으면 빈 스케줄 초기화
        const initialSchedules = {};
        rooms.forEach(room => {
          initialSchedules[room.id] = [];
        });
        setRoomSchedules(initialSchedules);
        console.log('📝 빈 스케줄로 초기화');
      }
      
      // ✅ 데이터 로딩 완료 표시
      setDataLoaded(true);
      
    } catch (error) {
      console.error('❌ 스케줄 로딩 실패:', error);
      
      // 에러 시 빈 스케줄로 초기화
      const initialSchedules = {};
      rooms.forEach(room => {
        initialSchedules[room.id] = [];
      });
      setRoomSchedules(initialSchedules);
      setDataLoaded(true); // 에러여도 로딩은 완료된 것으로 처리
    }
  }, [selectedDate, formatDateForAPI, rooms]);

  // ✅ 강화된 스케줄 새로고침 함수
  const refreshSchedules = useCallback(async () => {
    console.log('🔄 스케줄 강제 새로고침 시작 - 날짜:', selectedDate);
    
    // 작은 지연을 두고 새로고침 (서버 처리 시간 확보)
    setTimeout(async () => {
      await loadTodaySchedules(selectedDate);
      console.log('✅ 스케줄 새로고침 완료');
    }, 500);
  }, [selectedDate, loadTodaySchedules]);

  // 모달 데이터 로딩
  const loadModalData = useCallback(async () => {
    try {
      const [roomsData, radiologistsData] = await Promise.all([
        roomService.getRooms(),
        doctorService.getRadiologists()
      ]);

      console.log('모달 데이터 로드:', { roomsData, radiologistsData });
      setRooms(roomsData);
      setRadiologists(radiologistsData);

      // 각 검사실별 빈 스케줄 초기화
      const initialSchedules = {};
      roomsData.forEach(room => {
        initialSchedules[room.id] = [];
      });
      setRoomSchedules(initialSchedules);
    } catch (error) {
      console.error('모달 데이터 로드 실패:', error);
    }
  }, []);

  // 데이터 로딩 - 빈 배열로 한 번만 실행
  useEffect(() => {
    loadModalData();
  }, [loadModalData]);

  // rooms 데이터 로드 후 스케줄 로딩 (선택된 날짜로)
  useEffect(() => {
    if (rooms.length > 0) {
      loadTodaySchedules(selectedDate);
    }
  }, [rooms, selectedDate, loadTodaySchedules]);

  // 페이지 포커스 시 스케줄 새로고침 (선택된 날짜로)
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 페이지 포커스 - 스케줄 새로고침');
      if (rooms.length > 0) {
        loadTodaySchedules(selectedDate);
      }
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
    };
  }, [rooms, selectedDate, loadTodaySchedules]);

  // 날짜 변경 핸들러
  const handleDateChange = useCallback((date) => {
    console.log('📅 Dashboard 날짜 변경:', date);
    setSelectedDate(new Date(date));
    
    // 날짜 변경 시 스케줄도 함께 업데이트
    if (rooms.length > 0) {
      loadTodaySchedules(new Date(date));
    }
  }, [rooms, loadTodaySchedules]);

  // 드래그 핸들러
  const handleDragStart = useCallback((exam) => {
    console.log('드래그 시작:', exam);
    setDraggedExam(exam);
  }, []);

  // ✅ 배정 확정 핸들러 개선
  const confirmAssignment = useCallback(async () => {
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

      console.log('📤 배정 요청 데이터:', assignmentData);
      const result = await worklistService.assignExam(modalData.exam.id, assignmentData);
      console.log('📥 배정 API 결과:', result);

      // 2. ✅ 즉시 스케줄 새로고침 (여러 번 시도)
      console.log('🔄 스케줄 새로고침 시작...');
      
      // 첫 번째 새로고침
      await refreshSchedules();
      
      // 1초 후 두 번째 새로고침 (확실히 하기 위해)
      setTimeout(async () => {
        await loadTodaySchedules(selectedDate);
        console.log('🔄 2차 스케줄 새로고침 완료');
      }, 1000);

      // 3. 워크리스트 새로고침
      if (workListPanelRef.current?.refreshWorklist) {
        workListPanelRef.current.refreshWorklist();
      }

      // 4. ✅ 성공 메시지를 더 명확하게
      console.log('✅ 배정 완료!');
      alert(`✅ ${modalData.exam.patientName} 환자의 검사가 성공적으로 배정되었습니다!`);
      cancelAssignment();

    } catch (error) {
      console.error('❌ 배정 실패:', error);
      alert(`❌ 배정 실패: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedRadiologist, selectedTime, estimatedDuration, modalData, refreshSchedules, selectedDate, loadTodaySchedules]);

  // 검사 시작 핸들러
  const handleStartExam = useCallback(async (roomId, examId) => {
    try {
      setLoading(true);
      console.log('검사 시작:', { roomId, examId });
      
      const result = await worklistService.startExam(examId);
      console.log('검사 시작 결과:', result);
      
      // API 호출 후 스케줄 새로고침
      await refreshSchedules();

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
  }, [refreshSchedules]);

  // 검사 완료 핸들러
  const handleCompleteExam = useCallback(async (roomId, examId) => {
    try {
      setLoading(true);
      console.log('검사 완료:', { roomId, examId });
      
      const result = await worklistService.completeExam(examId);
      console.log('검사 완료 결과:', result);
      
      // API 호출 후 스케줄 새로고침
      await refreshSchedules();

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
  }, [refreshSchedules]);

  // 검사 취소 핸들러
  const handleCancelExam = useCallback(async (examId) => {
    if (!window.confirm('정말로 검사를 취소하시겠습니까?')) return;
    
    try {
      setLoading(true);
      console.log('검사 취소:', examId);
      
      const result = await worklistService.cancelExam(examId);
      console.log('검사 취소 결과:', result);
      
      // API 호출 후 스케줄 새로고침
      await refreshSchedules();

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
  }, [refreshSchedules]);

  const cancelAssignment = useCallback(() => {
    setShowAssignmentModal(false);
    setModalData(null);
    setDraggedExam(null);
    setSelectedRadiologist('');
    setSelectedTime('');
    setEstimatedDuration('');
  }, []);

  // 드래그 오버 핸들러
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  // 스케줄에서 이벤트 받기
  const handleExamUpdated = useCallback((eventType, data) => {
    console.log('검사 업데이트 이벤트:', eventType, data);
    
    if (eventType === 'assignment_requested') {
      // 배정 모달 열기
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
          <div>⏳ 처리 중...</div>
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
      
      {/* ✅ 스케줄 섹션 - 검사실 데이터만 있으면 렌더링 */}
      <div className="schedule-section">
        {rooms.length > 0 ? (
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
        ) : (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            color: '#6b7280',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div>⏳ 검사실 데이터를 불러오는 중...</div>
          </div>
        )}
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
      
      {/* ✅ 개발용 스케줄 디버깅 정보 */}
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
          <div>🔄 데이터 로딩: <strong>{dataLoaded ? '완료' : '진행중'}</strong></div>
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