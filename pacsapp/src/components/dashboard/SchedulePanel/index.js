// //index.js
// import React, { useState, useEffect } from 'react';
// import ScheduleHeader from './ScheduleHeader';
// import ScheduleTable from './ScheduleTable';
// import { roomService } from '../../../services/roomService';
// import { doctorService } from '../../../services/doctorService';
// import { worklistService } from '../../../services/worklistService';
// import { getEndTime } from '../../../utils/timeUtils';
// import './SchedulePanel.css';

// const SchedulePanel = ({ 
//   draggedExam, 
//   onDragOver, 
//   onExamUpdated 
// }) => {
//   // 상태 관리
//   const [rooms, setRooms] = useState([]);
//   const [radiologists, setRadiologists] = useState([]);
//   const [roomSchedules, setRoomSchedules] = useState({});
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   // 데이터 로딩
//   useEffect(() => {
//     loadInitialData();
//   }, []);

//   const loadInitialData = async () => {
//     try {
//       setLoading(true);
//       setError(null);

//       // 병렬로 데이터 로드
//       const [roomsData, radiologistsData] = await Promise.all([
//         roomService.getRooms(),
//         doctorService.getRadiologists()
//       ]);

//       console.log('스케줄 데이터 로드:', { roomsData, radiologistsData });

//       setRooms(roomsData);
//       setRadiologists(radiologistsData);

//       // 각 검사실별 빈 스케줄 초기화
//       const initialSchedules = {};
//       roomsData.forEach(room => {
//         initialSchedules[room.id] = [];
//       });
//       setRoomSchedules(initialSchedules);

//     } catch (err) {
//       console.error('스케줄 데이터 로드 실패:', err);
//       setError('스케줄 데이터를 불러오는데 실패했습니다.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // 드래그앤드롭 핸들러
//   const handleDrop = async (roomId, timeSlot) => {
//     if (!draggedExam) {
//       console.log('드래그된 검사가 없습니다.');
//       return;
//     }

//     console.log('드롭 처리:', { examId: draggedExam.id, roomId, timeSlot });

//     try {
//       // 여기서 배정 모달을 띄우거나 직접 API 호출
//       // 일단은 부모 컴포넌트에 알림
//       if (onExamUpdated) {
//         onExamUpdated('assignment_requested', {
//           exam: draggedExam,
//           roomId,
//           timeSlot
//         });
//       }
//     } catch (error) {
//       console.error('검사 배정 실패:', error);
//       alert('검사 배정에 실패했습니다.');
//     }
//   };

//   // 검사 시작
//   const handleStartExam = async (roomId, examId) => {
//     try {
//       console.log('검사 시작:', { roomId, examId });
      
//       const result = await worklistService.startExam(examId);
//       console.log('검사 시작 결과:', result);

//       // 로컬 상태 업데이트
//       setRoomSchedules(prev => ({
//         ...prev,
//         [roomId]: prev[roomId].map(exam => 
//           exam.examId === examId 
//             ? { ...exam, status: '검사중' }
//             : exam
//         )
//       }));

//       // 부모 컴포넌트에 알림
//       if (onExamUpdated) {
//         onExamUpdated('exam_started', { examId, roomId });
//       }

//     } catch (error) {
//       console.error('검사 시작 실패:', error);
//       alert('검사 시작에 실패했습니다.');
//     }
//   };

//   // 검사 완료
//   const handleCompleteExam = async (roomId, examId) => {
//     try {
//       console.log('검사 완료:', { roomId, examId });
      
//       const result = await worklistService.completeExam(examId);
//       console.log('검사 완료 결과:', result);

//       // 로컬 상태 업데이트
//       setRoomSchedules(prev => ({
//         ...prev,
//         [roomId]: prev[roomId].map(exam => 
//           exam.examId === examId 
//             ? { ...exam, status: '완료' }
//             : exam
//         )
//       }));

//       // 부모 컴포넌트에 알림
//       if (onExamUpdated) {
//         onExamUpdated('exam_completed', { examId, roomId });
//       }

//     } catch (error) {
//       console.error('검사 완료 실패:', error);
//       alert('검사 완료에 실패했습니다.');
//     }
//   };

//   // 검사 취소
//   const handleCancelExam = async (examId) => {
//     try {
//       console.log('검사 취소:', examId);
      
//       const result = await worklistService.cancelExam(examId);
//       console.log('검사 취소 결과:', result);

//       // 해당 검사를 모든 검사실 스케줄에서 제거
//       setRoomSchedules(prev => {
//         const newSchedules = { ...prev };
//         Object.keys(newSchedules).forEach(roomId => {
//           newSchedules[roomId] = newSchedules[roomId].filter(
//             exam => exam.examId !== examId
//           );
//         });
//         return newSchedules;
//       });

//       // 부모 컴포넌트에 알림
//       if (onExamUpdated) {
//         onExamUpdated('exam_cancelled', { examId });
//       }

//     } catch (error) {
//       console.error('검사 취소 실패:', error);
//       alert('검사 취소에 실패했습니다.');
//     }
//   };

//   // 스케줄에 검사 추가 (외부에서 호출 가능)
//   const addExamToSchedule = (roomId, examData) => {
//     console.log('스케줄에 검사 추가:', { roomId, examData });
    
//     setRoomSchedules(prev => ({
//       ...prev,
//       [roomId]: [
//         ...prev[roomId],
//         {
//           examId: examData.id,
//           patientName: examData.patientName,
//           examType: `${examData.examPart} ${examData.modality}`,
//           status: '검사대기',
//           duration: examData.estimatedDuration || 30,
//           time: examData.startTime,
//           radiologistId: examData.radiologistId
//         }
//       ]
//     }));
//   };

//   // 로딩 상태
//   if (loading) {
//     return (
//       <div className="schedule-panel">
//         <div style={{ 
//           display: 'flex', 
//           justifyContent: 'center', 
//           alignItems: 'center', 
//           height: '200px',
//           color: '#6b7280'
//         }}>
//           스케줄 데이터를 불러오는 중...
//         </div>
//       </div>
//     );
//   }

//   // 에러 상태
//   if (error) {
//     return (
//       <div className="schedule-panel">
//         <div style={{ 
//           display: 'flex', 
//           flexDirection: 'column',
//           justifyContent: 'center', 
//           alignItems: 'center', 
//           height: '200px',
//           color: '#dc2626'
//         }}>
//           <p>{error}</p>
//           <button 
//             onClick={loadInitialData}
//             style={{
//               marginTop: '1rem',
//               padding: '0.5rem 1rem',
//               background: '#3b82f6',
//               color: 'white',
//               border: 'none',
//               borderRadius: '0.25rem',
//               cursor: 'pointer'
//             }}
//           >
//             다시 시도
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="schedule-panel">
//       <ScheduleHeader radiologists={radiologists} />
      
//       <ScheduleTable
//         roomSchedules={roomSchedules}
//         radiologists={radiologists}
//         rooms={rooms}
//         onDragOver={onDragOver}
//         onDrop={handleDrop}
//         onStartExam={handleStartExam}
//         onCompleteExam={handleCompleteExam}
//         onCancelExam={handleCancelExam}
//         getEndTime={getEndTime}
//       />
    
//     </div>
//   );
// };

// // 외부에서 사용할 수 있도록 ref 메서드 추가
// SchedulePanel.displayName = 'SchedulePanel';

// export default SchedulePanel;


import React from 'react';
import ScheduleHeader from './ScheduleHeader';
import ScheduleTable from './ScheduleTable';
import { getEndTime } from '../../../utils/timeUtils';
import './SchedulePanel.css';

const SchedulePanel = ({ 
  draggedExam, 
  onDragOver, 
  onExamUpdated,
  roomSchedules = {},  // Dashboard에서 받음
  rooms = [],          // Dashboard에서 받음
  radiologists = [],   // Dashboard에서 받음
  onStartExam,         // 추가
  onCompleteExam,      // 추가
  onCancelExam         // 추가
}) => {
  // console.log('SchedulePanel 렌더링:', { roomSchedules, rooms, radiologists }); // 🔍 디버깅 - 무한 로그 방지

  // 드래그앤드롭 핸들러
  const handleDrop = async (roomId, event) => {
    if (!draggedExam) {
      console.log('드래그된 검사가 없습니다.');
      return;
    }

    // ✅ 드롭 위치에서 실제 시간 계산
    const rect = event.currentTarget.getBoundingClientRect();
    const dropY = event.clientY - rect.top;
    
    // 시간 계산: 108px = 1시간, 1.8px = 1분
    const totalMinutes = Math.floor(dropY / 1.8) + 540; // 540 = 9시 * 60분
    const dropHour = Math.floor(totalMinutes / 60);
    const dropMinute = Math.floor((totalMinutes % 60) / 10) * 10; // 10분 단위로 정렬
    
    // 운영시간 내로 제한 (9시-17시)
    const finalHour = Math.max(9, Math.min(17, dropHour));
    const finalMinute = Math.max(0, Math.min(50, dropMinute));
    
    const timeSlot = `${finalHour.toString().padStart(2, '0')}:${finalMinute.toString().padStart(2, '0')}`;
    
    console.log('드롭 처리:', { 
      examId: draggedExam.id, 
      roomId, 
      dropY, 
      totalMinutes, 
      dropHour, 
      dropMinute,
      timeSlot 
    });

    try {
      if (onExamUpdated) {
        onExamUpdated('assignment_requested', {
          exam: draggedExam,
          roomId,
          timeSlot // ✅ 계산된 실제 시간 전달
        });
      }
    } catch (error) {
      console.error('검사 배정 실패:', error);
      alert('검사 배정에 실패했습니다.');
    }
  };

  // ✅ 더 강화된 로딩 조건
  if (rooms.length === 0) {
    return (
      <div className="schedule-panel">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '200px',
          color: '#6b7280'
        }}>
          검사실 데이터를 불러오는 중...
        </div>
      </div>
    );
  }

  // ✅ roomSchedules가 비어있으면 빈 스케줄로 초기화
  const hasScheduleData = roomSchedules && Object.keys(roomSchedules).length > 0;
  const safeRoomSchedules = hasScheduleData ? roomSchedules : (() => {
    const emptySchedules = {};
    rooms.forEach(room => {
      emptySchedules[room.id] = [];
    });
    return emptySchedules;
  })();

  return (
    <div className="schedule-panel">
      <ScheduleHeader radiologists={radiologists} />
      
      <ScheduleTable
        roomSchedules={safeRoomSchedules}
        radiologists={radiologists}
        rooms={rooms}
        onDragOver={onDragOver}
        onDrop={handleDrop}
        onStartExam={onStartExam}
        onCompleteExam={onCompleteExam}
        onCancelExam={onCancelExam}
        getEndTime={getEndTime}
      />
      
      {/* 🔍 디버그 정보 */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          position: 'fixed', 
          bottom: '60px', 
          right: '10px', 
          background: 'rgba(0,0,0,0.8)', 
          color: 'white', 
          padding: '0.5rem',
          borderRadius: '0.25rem',
          fontSize: '0.75rem'
        }}>
          검사실: {rooms.length} | 영상전문의: {radiologists.length} | 
          스케줄: {Object.keys(safeRoomSchedules).map(roomId => 
            `${roomId}(${safeRoomSchedules[roomId].length})`
          ).join(', ')} | 
          원본스케줄: {hasScheduleData ? 'O' : 'X'}
        </div>
      )}
    </div>
  );
};

export default SchedulePanel;