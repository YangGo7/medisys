// // ScheduleTable.js

// import React from 'react';
// import ExamCard from './ExamCard';

// const ScheduleTable = ({
//   roomSchedules,
//   radiologists,
//   rooms,
//   onDragOver,
//   onDrop,
//   onStartExam,
//   onCompleteExam,
//   onCancelExam,
//   getEndTime
// }) => {
//   return (
//     <div className="schedule-table-container">
//       <table className="schedule-table">
//         <thead>
//           <tr>
//             <th className="time-header">시간</th>
//             {rooms.map(room => (
//               <th key={room.id} className="room-header">
//                 검사실 {room.name}<br/>
//                 <span className="room-type">({room.type})</span>
//               </th>
//             ))}
//           </tr>
//         </thead>
//         <tbody>
//           {Array.from({ length: 10 }, (_, i) => {
//             const hour = 9 + i;
//             const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
            
//             // 이 시간대에 시작하는 검사들의 최대 높이 계산
//             let maxRequiredHeight = 96; // 기본 높이
            
//             rooms.forEach(room => {
//               const examsStartingInThisHour = roomSchedules[room.id].filter(exam => {
//                 const examHour = parseInt(exam.time.split(':')[0]);
//                 return examHour === hour; // 이 시간대에 시작하는 검사만
//               });
              
//               examsStartingInThisHour.forEach(exam => {
//                 const examMinute = parseInt(exam.time.split(':')[1]);
//                 const topPosition = (examMinute / 60) * 96;
//                 const cardHeight = Math.max(exam.duration * 2, 90); // 분당 2px, 최소 90px
//                 const requiredHeight = topPosition + cardHeight + 8; // 패딩 포함
//                 maxRequiredHeight = Math.max(maxRequiredHeight, requiredHeight);
//               });
//             });
            
//             const rowHeight = Math.max(maxRequiredHeight, 96);
            
//             return (
//               <tr key={timeSlot} style={{ height: `${rowHeight}px` }}>
//                 <td className="time-cell" style={{ height: `${rowHeight}px` }}>
//                   {timeSlot}
//                 </td>
//                 {rooms.map(room => {
//                   // 이 시간대에 시작하는 검사들만 찾기
//                   const examsStartingInThisHour = roomSchedules[room.id].filter(exam => {
//                     const examHour = parseInt(exam.time.split(':')[0]);
//                     return examHour === hour;
//                   });

//                   return (
//                     <td 
//                       key={room.id} 
//                       className="room-cell"
//                       style={{ height: `${rowHeight}px` }}
//                       onDragOver={onDragOver}
//                       onDrop={() => onDrop(room.id, timeSlot)}
//                     >
//                       {examsStartingInThisHour.length > 0 ? (
//                         <div className="exam-container">
//                           {examsStartingInThisHour.map((exam) => {
//                             const radiologist = radiologists.find(r => r.id === exam.radiologistId);
//                             const endTime = getEndTime(exam.time, exam.duration);
                            
//                             // 이 시간대 내에서의 위치 계산
//                             const examMinute = parseInt(exam.time.split(':')[1]);
//                             const topPosition = (examMinute / 60) * 96; // 기본 96px 기준으로 위치
//                             const cardHeight = Math.max(exam.duration * 2, 90); // 분당 2px, 최소 90px
                            
//                             return (
//                               <ExamCard
//                                 key={`${exam.examId}-${exam.time}`}
//                                 exam={exam}
//                                 radiologist={radiologist}
//                                 endTime={endTime}
//                                 topPosition={topPosition}
//                                 cardHeight={cardHeight}
//                                 onStartExam={onStartExam}
//                                 onCompleteExam={onCompleteExam}
//                                 onCancelExam={onCancelExam}
//                                 roomId={room.id}
//                               />
//                             );
//                           })}
//                         </div>
//                       ) : (
//                         <div className="drop-zone">
//                           <span>드롭하여 배정</span>
//                         </div>
//                       )}
//                     </td>
//                   );
//                 })}
//               </tr>
//             );
//           })}
//         </tbody>
//       </table>
//     </div>
//   );
// };

// export default ScheduleTable;

// ScheduleTable.js
// ScheduleTable.js

import React from 'react';
import ExamCard from './ExamCard';

const ScheduleTable = ({
  roomSchedules,
  radiologists,
  rooms,
  onDragOver,
  onDrop,
  onStartExam,
  onCompleteExam,
  onCancelExam,
  getEndTime
}) => {
  return (
    <div className="schedule-table-container">
      <table className="schedule-table">
        <thead>
          <tr>
            <th className="time-header">시간</th>
            {rooms.map(room => (
              <th key={room.id} className="room-header">
                검사실 {room.name}<br/>
                <span className="room-type">({room.type})</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 10 }, (_, i) => {
            const hour = 9 + i;
            const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
            
            // 이 시간대에 시작하는 검사들의 최대 높이 계산
            let maxRequiredHeight = 150; // 기본 높이 150px로 증가
            
            rooms.forEach(room => {
              const examsStartingInThisHour = roomSchedules[room.id] ? roomSchedules[room.id].filter(exam => {
                const examHour = parseInt(exam.time.split(':')[0]);
                return examHour === hour; // 이 시간대에 시작하는 검사만
              }) : [];
              
              examsStartingInThisHour.forEach(exam => {
                const examMinute = parseInt(exam.time.split(':')[1]);
                const examDuration = exam.duration;
                const pixelsPerMinute = 150 / 60; // 2.5px per minute
                
                const topPosition = examMinute * pixelsPerMinute;
                const cardHeight = Math.max(examDuration * pixelsPerMinute, 40);
                const requiredHeight = topPosition + cardHeight + 16; // 패딩 증가
                maxRequiredHeight = Math.max(maxRequiredHeight, requiredHeight);
              });
            });
            
            const rowHeight = Math.max(maxRequiredHeight, 150); // 최소 150px
            
            return (
              <tr key={timeSlot} style={{ height: `${rowHeight}px` }}>
                <td className="time-cell" style={{ height: `${rowHeight}px` }}>
                  {timeSlot}
                </td>
                {rooms.map(room => {
                  // 이 시간대에 시작하는 검사들만 찾기
                  const examsStartingInThisHour = roomSchedules[room.id] ? roomSchedules[room.id].filter(exam => {
                    const examHour = parseInt(exam.time.split(':')[0]);
                    return examHour === hour;
                  }) : [];

                  return (
                    <td 
                      key={room.id} 
                      className="room-cell"
                      style={{ height: `${rowHeight}px`, minHeight: '150px' }} // 최소 높이 보장
                      onDragOver={onDragOver}
                      onDrop={() => onDrop(room.id, timeSlot)}
                    >
                      {examsStartingInThisHour.length > 0 ? (
                        <div className="exam-container" style={{ minHeight: '150px' }}>
                          {examsStartingInThisHour.map((exam) => {
                            const radiologist = radiologists.find(r => r.id === exam.radiologistId);
                            const endTime = getEndTime(exam.time, exam.duration);
                            
                            // 이 시간대 내에서의 위치 및 크기 계산 (정확한 시간 비례)
                            const examMinute = parseInt(exam.time.split(':')[1]);
                            const examDuration = exam.duration; // 분 단위
                            
                            // 시간당 150px이므로 1분당 2.5px
                            const pixelsPerMinute = 150 / 60; // 2.5px per minute
                            
                            // 시작 위치: 분 단위로 정확히 계산
                            const topPosition = examMinute * pixelsPerMinute;
                            
                            // 카드 높이: 실제 소요시간에 비례
                            const cardHeight = examDuration * pixelsPerMinute;
                            
                            // 최소 높이 보장 (너무 작으면 안 보임)
                            const finalCardHeight = Math.max(cardHeight, 40);
                            
                            return (
                              <ExamCard
                                key={`${exam.examId}-${exam.time}`}
                                exam={exam}
                                radiologist={radiologist}
                                endTime={endTime}
                                topPosition={topPosition}
                                cardHeight={finalCardHeight}
                                onStartExam={onStartExam}
                                onCompleteExam={onCompleteExam}
                                onCancelExam={onCancelExam}
                                roomId={room.id}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <div className="drop-zone" style={{ minHeight: '150px' }}>
                          <span>드롭하여 배정</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ScheduleTable;