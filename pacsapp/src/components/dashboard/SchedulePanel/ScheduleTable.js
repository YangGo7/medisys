// // // ScheduleTable.js

// // import React from 'react';
// // import ExamCard from './ExamCard';

// // const ScheduleTable = ({
// //   roomSchedules,
// //   radiologists,
// //   rooms,
// //   onDragOver,
// //   onDrop,
// //   onStartExam,
// //   onCompleteExam,
// //   onCancelExam,
// //   getEndTime
// // }) => {
// //   return (
// //     <div className="schedule-table-container">
// //       <table className="schedule-table">
// //         <thead>
// //           <tr>
// //             <th className="time-header">시간</th>
// //             {rooms.map(room => (
// //               <th key={room.id} className="room-header">
// //                 검사실 {room.name}<br/>
// //                 <span className="room-type">({room.type})</span>
// //               </th>
// //             ))}
// //           </tr>
// //         </thead>
// //         <tbody>
// //           {Array.from({ length: 10 }, (_, i) => {
// //             const hour = 9 + i;
// //             const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
            
// //             // 이 시간대에 시작하는 검사들의 최대 높이 계산
// //             let maxRequiredHeight = 96; // 기본 높이
            
// //             rooms.forEach(room => {
// //               const examsStartingInThisHour = roomSchedules[room.id].filter(exam => {
// //                 const examHour = parseInt(exam.time.split(':')[0]);
// //                 return examHour === hour; // 이 시간대에 시작하는 검사만
// //               });
              
// //               examsStartingInThisHour.forEach(exam => {
// //                 const examMinute = parseInt(exam.time.split(':')[1]);
// //                 const topPosition = (examMinute / 60) * 96;
// //                 const cardHeight = Math.max(exam.duration * 2, 90); // 분당 2px, 최소 90px
// //                 const requiredHeight = topPosition + cardHeight + 8; // 패딩 포함
// //                 maxRequiredHeight = Math.max(maxRequiredHeight, requiredHeight);
// //               });
// //             });
            
// //             const rowHeight = Math.max(maxRequiredHeight, 96);
            
// //             return (
// //               <tr key={timeSlot} style={{ height: `${rowHeight}px` }}>
// //                 <td className="time-cell" style={{ height: `${rowHeight}px` }}>
// //                   {timeSlot}
// //                 </td>
// //                 {rooms.map(room => {
// //                   // 이 시간대에 시작하는 검사들만 찾기
// //                   const examsStartingInThisHour = roomSchedules[room.id].filter(exam => {
// //                     const examHour = parseInt(exam.time.split(':')[0]);
// //                     return examHour === hour;
// //                   });

// //                   return (
// //                     <td 
// //                       key={room.id} 
// //                       className="room-cell"
// //                       style={{ height: `${rowHeight}px` }}
// //                       onDragOver={onDragOver}
// //                       onDrop={() => onDrop(room.id, timeSlot)}
// //                     >
// //                       {examsStartingInThisHour.length > 0 ? (
// //                         <div className="exam-container">
// //                           {examsStartingInThisHour.map((exam) => {
// //                             const radiologist = radiologists.find(r => r.id === exam.radiologistId);
// //                             const endTime = getEndTime(exam.time, exam.duration);
                            
// //                             // 이 시간대 내에서의 위치 계산
// //                             const examMinute = parseInt(exam.time.split(':')[1]);
// //                             const topPosition = (examMinute / 60) * 96; // 기본 96px 기준으로 위치
// //                             const cardHeight = Math.max(exam.duration * 2, 90); // 분당 2px, 최소 90px
                            
// //                             return (
// //                               <ExamCard
// //                                 key={`${exam.examId}-${exam.time}`}
// //                                 exam={exam}
// //                                 radiologist={radiologist}
// //                                 endTime={endTime}
// //                                 topPosition={topPosition}
// //                                 cardHeight={cardHeight}
// //                                 onStartExam={onStartExam}
// //                                 onCompleteExam={onCompleteExam}
// //                                 onCancelExam={onCancelExam}
// //                                 roomId={room.id}
// //                               />
// //                             );
// //                           })}
// //                         </div>
// //                       ) : (
// //                         <div className="drop-zone">
// //                           <span>드롭하여 배정</span>
// //                         </div>
// //                       )}
// //                     </td>
// //                   );
// //                 })}
// //               </tr>
// //             );
// //           })}
// //         </tbody>
// //       </table>
// //     </div>
// //   );
// // };

// // export default ScheduleTable;


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
//   // 🔍 디버깅 로그 추가
//   console.log('🔍 ScheduleTable 렌더링 데이터:');
//   console.log('🔍 - roomSchedules:', roomSchedules);
//   console.log('🔍 - rooms:', rooms);
//   console.log('🔍 - radiologists:', radiologists);

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
//             let maxRequiredHeight = 150; // 기본 높이 150px로 증가
            
//             rooms.forEach(room => {
//               // 🔧 여러 가능한 키로 데이터 찾기
//               const possibleKeys = [
//                 String(room.id),
//                 room.id,
//                 String(room.name).replace('실', ''),
//                 room.name.replace('실', ''),
//               ];
              
//               let roomData = null;
//               for (const key of possibleKeys) {
//                 if (roomSchedules[key]) {
//                   roomData = roomSchedules[key];
//                   break;
//                 }
//               }
              
//               const examsStartingInThisHour = roomData ? roomData.filter(exam => {
//                 const examHour = parseInt(exam.time.split(':')[0]);
//                 return examHour === hour; // 이 시간대에 시작하는 검사만
//               }) : [];
              
//               examsStartingInThisHour.forEach(exam => {
//                 const examMinute = parseInt(exam.time.split(':')[1]);
//                 const examDuration = exam.duration;
//                 const pixelsPerMinute = 150 / 60; // 2.5px per minute
                
//                 const topPosition = examMinute * pixelsPerMinute;
//                 const cardHeight = Math.max(examDuration * pixelsPerMinute, 40);
//                 const requiredHeight = topPosition + cardHeight + 16; // 패딩 증가
//                 maxRequiredHeight = Math.max(maxRequiredHeight, requiredHeight);
//               });
//             });
            
//             const rowHeight = Math.max(maxRequiredHeight, 150); // 최소 150px
            
//             return (
//               <tr key={timeSlot} style={{ height: `${rowHeight}px` }}>
//                 <td className="time-cell" style={{ height: `${rowHeight}px` }}>
//                   {timeSlot}
//                 </td>
//                 {rooms.map(room => {
//                   // 🔧 여러 가능한 키로 데이터 찾기
//                   const possibleKeys = [
//                     String(room.id),        // "ROOM1", "ROOM2", "ROOM3"
//                     room.id,               // "ROOM1", "ROOM2", "ROOM3"
//                     String(room.name).replace('실', ''),  // "1", "2", "3"
//                     room.name.replace('실', ''),          // "1", "2", "3"
//                   ];
                  
//                   let roomData = null;
//                   let matchedKey = null;
                  
//                   for (const key of possibleKeys) {
//                     if (roomSchedules[key] && roomSchedules[key].length > 0) {
//                       roomData = roomSchedules[key];
//                       matchedKey = key;
//                       break;
//                     }
//                   }
                  
//                   // 🔍 키 매핑 확인
//                   console.log(`🔍 room 정보:`, room);
//                   console.log(`🔍 시도한 키들:`, possibleKeys);
//                   console.log(`🔍 매칭된 키: ${matchedKey}`);
//                   console.log(`🔍 roomSchedules 전체 키들:`, Object.keys(roomSchedules));
                  
//                   // 이 시간대에 시작하는 검사들만 찾기
//                   const examsStartingInThisHour = roomData ? roomData.filter(exam => {
//                     const examHour = parseInt(exam.time.split(':')[0]);
//                     return examHour === hour;
//                   }) : [];

//                   // 🔍 상세 디버깅 로그 추가
//                   console.log(`🔍 검사실 ${room.id} (${room.name}), 시간 ${hour}:00`);
//                   console.log(`🔍 - 매칭된 키: ${matchedKey}`);
//                   console.log(`🔍 - roomData:`, roomData);
//                   console.log(`🔍 - 이 시간대 검사들:`, examsStartingInThisHour);
                  
//                   if (roomData && roomData.length > 0) {
//                     roomData.forEach(exam => {
//                       const examHour = parseInt(exam.time.split(':')[0]);
//                       console.log(`🔍   - 검사: ${exam.patientName}, 시간: ${exam.time} (시간=${examHour}), ${hour}시와 매치: ${examHour === hour}`);
//                     });
//                   }

//                   return (
//                     <td 
//                       key={room.id} 
//                       className="room-cell"
//                       style={{ height: `${rowHeight}px`, minHeight: '150px' }} // 최소 높이 보장
//                       onDragOver={onDragOver}
//                       onDrop={() => onDrop(room.id, timeSlot)}
//                     >
//                       {examsStartingInThisHour.length > 0 ? (
//                         <div className="exam-container" style={{ minHeight: '150px' }}>
//                           {examsStartingInThisHour.map((exam) => {
//                             const radiologist = radiologists.find(r => r.id === exam.radiologistId);
//                             const endTime = getEndTime(exam.time, exam.duration);
                            
//                             // 🔍 ExamCard 렌더링 로그
//                             console.log(`🔍 ExamCard 렌더링: ${exam.patientName}, 시간: ${exam.time}`);
                            
//                             // 이 시간대 내에서의 위치 및 크기 계산 (정확한 시간 비례)
//                             const examMinute = parseInt(exam.time.split(':')[1]);
//                             const examDuration = exam.duration; // 분 단위
                            
//                             // 시간당 150px이므로 1분당 2.5px
//                             const pixelsPerMinute = 150 / 60; // 2.5px per minute
                            
//                             // 시작 위치: 분 단위로 정확히 계산
//                             const topPosition = examMinute * pixelsPerMinute;
                            
//                             // 카드 높이: 실제 소요시간에 비례
//                             const cardHeight = examDuration * pixelsPerMinute;
                            
//                             // 최소 높이 보장 (너무 작으면 안 보임)
//                             const finalCardHeight = Math.max(cardHeight, 30);
                            
//                             return (
//                               <ExamCard
//                                 key={`${exam.examId}-${exam.time}`}
//                                 exam={exam}
//                                 radiologist={radiologist}
//                                 endTime={endTime}
//                                 topPosition={topPosition}
//                                 cardHeight={finalCardHeight}
//                                 onStartExam={onStartExam}
//                                 onCompleteExam={onCompleteExam}
//                                 onCancelExam={onCancelExam}
//                                 roomId={room.id}
//                               />
//                             );
//                           })}
//                         </div>
//                       ) : (
//                         <div className="drop-zone" style={{ minHeight: '150px' }}>
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
  // 🔍 디버깅 로그 추가
  console.log('🔍 ScheduleTable 렌더링 데이터:');
  console.log('🔍 - roomSchedules:', roomSchedules);
  console.log('🔍 - rooms:', rooms);
  console.log('🔍 - radiologists:', radiologists);

  return (
    <div className="schedule-table-container">
      <table 
        className="schedule-table"
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          minWidth: '800px'
        }}
      >
        <thead>
          <tr style={{ display: 'table-row' }}>
            <th 
              className="time-header"
              style={{
                width: '80px',
                minWidth: '80px',
                maxWidth: '80px',
                whiteSpace: 'nowrap',
                display: 'table-cell',
                background: '#f8fafc',
                padding: '0.75rem 0.5rem',
                textAlign: 'center',
                fontWeight: 600,
                color: '#374151',
                borderBottom: '1px solid #e5e7eb',
                fontSize: '0.75rem',
                position: 'sticky',
                top: 0,
                zIndex: 10
              }}
            >
              시간
            </th>
            {rooms.map(room => (
              <th 
                key={room.id} 
                className="room-header"
                style={{
                  width: `calc((100% - 80px) / ${rooms.length})`,
                  minWidth: '150px',
                  whiteSpace: 'nowrap',
                  display: 'table-cell',
                  background: '#f8fafc',
                  padding: '0.75rem 0.5rem',
                  textAlign: 'center',
                  fontWeight: 600,
                  color: '#374151',
                  borderBottom: '1px solid #e5e7eb',
                  fontSize: '0.75rem',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  verticalAlign: 'middle'
                }}
              >
                검사실 {room.name}<br/>
                <span 
                  className="room-type"
                  style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    display: 'block',
                    marginTop: '2px'
                  }}
                >
                  ({room.type})
                </span>
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
              // 🔧 여러 가능한 키로 데이터 찾기
              const possibleKeys = [
                String(room.id),
                room.id,
                String(room.name).replace('실', ''),
                room.name.replace('실', ''),
              ];
              
              let roomData = null;
              for (const key of possibleKeys) {
                if (roomSchedules[key]) {
                  roomData = roomSchedules[key];
                  break;
                }
              }
              
              const examsStartingInThisHour = roomData ? roomData.filter(exam => {
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
                <td 
                  className="time-cell" 
                  style={{ 
                    height: `${rowHeight}px`,
                    background: '#f8fafc',
                    padding: '0.75rem',
                    textAlign: 'center',
                    fontWeight: 600,
                    color: '#374151',
                    borderRight: '1px solid #e5e7eb',
                    width: '80px',
                    minWidth: '80px',
                    maxWidth: '80px'
                  }}
                >
                  {timeSlot}
                </td>
                {rooms.map(room => {
                  // 🔧 여러 가능한 키로 데이터 찾기
                  const possibleKeys = [
                    String(room.id),        // "ROOM1", "ROOM2", "ROOM3"
                    room.id,               // "ROOM1", "ROOM2", "ROOM3"
                    String(room.name).replace('실', ''),  // "1", "2", "3"
                    room.name.replace('실', ''),          // "1", "2", "3"
                  ];
                  
                  let roomData = null;
                  let matchedKey = null;
                  
                  for (const key of possibleKeys) {
                    if (roomSchedules[key] && roomSchedules[key].length > 0) {
                      roomData = roomSchedules[key];
                      matchedKey = key;
                      break;
                    }
                  }
                  
                  // 🔍 키 매핑 확인
                  console.log(`🔍 room 정보:`, room);
                  console.log(`🔍 시도한 키들:`, possibleKeys);
                  console.log(`🔍 매칭된 키: ${matchedKey}`);
                  console.log(`🔍 roomSchedules 전체 키들:`, Object.keys(roomSchedules));
                  
                  // 이 시간대에 시작하는 검사들만 찾기
                  const examsStartingInThisHour = roomData ? roomData.filter(exam => {
                    const examHour = parseInt(exam.time.split(':')[0]);
                    return examHour === hour;
                  }) : [];

                  // 🔍 상세 디버깅 로그 추가
                  console.log(`🔍 검사실 ${room.id} (${room.name}), 시간 ${hour}:00`);
                  console.log(`🔍 - 매칭된 키: ${matchedKey}`);
                  console.log(`🔍 - roomData:`, roomData);
                  console.log(`🔍 - 이 시간대 검사들:`, examsStartingInThisHour);
                  
                  if (roomData && roomData.length > 0) {
                    roomData.forEach(exam => {
                      const examHour = parseInt(exam.time.split(':')[0]);
                      console.log(`🔍   - 검사: ${exam.patientName}, 시간: ${exam.time} (시간=${examHour}), ${hour}시와 매치: ${examHour === hour}`);
                    });
                  }

                  return (
                    <td 
                      key={room.id} 
                      className="room-cell"
                      style={{ 
                        height: `${rowHeight}px`, 
                        minHeight: '150px',
                        padding: '0.5rem',
                        borderRight: '1px solid #e5e7eb',
                        borderBottom: '1px solid #f3f4f6',
                        position: 'relative',
                        verticalAlign: 'top',
                        minWidth: '150px'
                      }}
                      onDragOver={onDragOver}
                      onDrop={() => onDrop(room.id, timeSlot)}
                    >
                      {examsStartingInThisHour.length > 0 ? (
                        <div className="exam-container" style={{ minHeight: '150px' }}>
                          {examsStartingInThisHour.map((exam) => {
                            const radiologist = radiologists.find(r => r.id === exam.radiologistId);
                            const endTime = getEndTime(exam.time, exam.duration);
                            
                            // 🔍 ExamCard 렌더링 로그
                            console.log(`🔍 ExamCard 렌더링: ${exam.patientName}, 시간: ${exam.time}`);
                            
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
                            const finalCardHeight = Math.max(cardHeight, 30);
                            
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