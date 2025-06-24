// import React from 'react';

// const ExamCard = ({
//   exam,
//   radiologist,
//   endTime,
//   topPosition,
//   cardHeight,
//   onStartExam,
//   onCompleteExam,
//   onCancelExam,
//   roomId
// }) => {
//   // 디버깅용 로그
//   console.log('ExamCard props:', { exam, roomId, onStartExam, onCompleteExam, onCancelExam });
  
//   return (
//     <div 
//       className={`exam-card ${radiologist ? radiologist.color : ''}`}
//       style={{ 
//         top: `${topPosition}px`,
//         height: `${cardHeight}px`
//       }}
//     >
//       <div className="exam-card-content">
//         {/* 왼쪽 정보 영역 */}
//         <div className="exam-info">
//           {/* 환자명 */}
//           <div className="exam-patient-name">{exam.patientName}</div>
          
//           {/* 검사 정보 */}
//           <div className="exam-type">
//             {exam.examType}
//           </div>
          
//           {/* 시간 정보 */}
//           <div className="exam-time">
//             {exam.time} ~ {endTime}
//           </div>
          
//           {/* 판독의 */}
//           <div className="exam-doctor">
//             Dr. {radiologist?.name}
//           </div>
//         </div>
        
//         {/* 오른쪽 상태/버튼 영역 - 완전히 div만 사용 */}
//         <div style={{
//           position: 'relative',
//           display: 'flex',
//           flexDirection: 'column',
//           alignItems: 'flex-end',
//           gap: '0.25rem',
//           flexShrink: 0,
//           minWidth: '70px',
//           height: '100%'
//         }}>
//           {/* 상태 div (클릭 가능) */}
//           <div
//             onClick={() => {
//               if (exam.status === '검사대기') {
//                 console.log('검사대기 → 검사중:', { roomId, examId: exam.examId });
//                 onStartExam(roomId, exam.examId);
//               } else if (exam.status === '검사중') {
//                 console.log('검사중 → 검사완료:', { roomId, examId: exam.examId });
//                 onCompleteExam(roomId, exam.examId);
//               }
//             }}
//             style={{
//               fontSize: '0.75rem',
//               padding: '0.25rem 0.5rem',
//               borderRadius: '0.25rem',
//               fontWeight: '500',
//               whiteSpace: 'nowrap',
//               textAlign: 'center',
//               minWidth: '60px',
//               maxWidth: '60px',
//               width: '60px',
//               height: '24px',
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'center',
//               cursor: exam.status === '검사완료' ? 'default' : 'pointer',
//               opacity: exam.status === '검사완료' ? 0.7 : 1,
//               transition: 'all 0.2s ease',
//               background: exam.status === '검사대기' ? '#dbeafe' : 
//                          exam.status === '검사중' ? '#dcfce7' : '#f3e8ff',
//               color: exam.status === '검사대기' ? '#2563eb' : 
//                      exam.status === '검사중' ? '#16a34a' : '#9333ea',
//               userSelect: 'none',
//               boxSizing: 'border-box',
//               border: 'none',
//               outline: 'none'
//             }}
//             onMouseEnter={(e) => {
//               if (exam.status !== '검사완료') {
//                 e.target.style.transform = 'translateY(-1px)';
//                 e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
//               }
//             }}
//             onMouseLeave={(e) => {
//               if (exam.status !== '검사완료') {
//                 e.target.style.transform = 'translateY(0)';
//                 e.target.style.boxShadow = 'none';
//               }
//             }}
//           >
//             {exam.status}
//           </div>
          
//           {/* X div (절대 위치) */}
//           <div 
//             onClick={(e) => {
//               e.stopPropagation();
//               console.log('X 버튼 클릭 - 검사 취소:', exam.examId);
//               onCancelExam(exam.examId);
//             }}
//             title="검사 취소"
//             style={{
//               position: 'absolute',
//               top: '-5px',
//               right: '-5px',
//               width: '18px',
//               height: '18px',
//               backgroundColor: '#ef4444',
//               color: 'white',
//               borderRadius: '50%',
//               fontSize: '12px',
//               fontWeight: 'bold',
//               cursor: 'pointer',
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'center',
//               lineHeight: '1',
//               zIndex: '999',
//               transition: 'all 0.2s ease',
//               userSelect: 'none',
//               border: '1px solid white',
//               boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
//             }}
//             onMouseEnter={(e) => {
//               e.target.style.backgroundColor = '#dc2626';
//               e.target.style.transform = 'scale(1.1)';
//             }}
//             onMouseLeave={(e) => {
//               e.target.style.backgroundColor = '#ef4444';
//               e.target.style.transform = 'scale(1)';
//             }}
//           >
//             ×
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ExamCard;


import React from 'react';

const ExamCard = ({
  exam,
  radiologist,
  endTime,
  topPosition,
  cardHeight,
  onStartExam,
  onCompleteExam,
  onCancelExam,
  roomId
}) => {
  // 디버깅용 로그
  console.log('ExamCard props:', { exam, roomId, onStartExam, onCompleteExam, onCancelExam });
  
  return (
    <div 
      className={`exam-card ${radiologist ? radiologist.color : ''}`}
      style={{ 
        top: `${topPosition}px`,
        height: `${Math.max(cardHeight, 120)}px` // 최소 높이 120px로 증가
      }}
    >
      <div className="exam-card-content" style={{
        padding: '0.75rem', // 패딩 증가
        height: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '0.5rem' // 간격 추가
      }}>
        {/* 왼쪽 정보 영역 - 세로 4줄 레이아웃 */}
        <div className="exam-info" style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem' // 줄 간격
        }}>
          {/* 1줄: 환자명 */}
          <div style={{
            fontWeight: '600',
            color: '#1e293b',
            fontSize: '0.875rem', // 조금 더 크게
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {exam.patientName}
          </div>
          
          {/* 2줄: 검사 정보 */}
          <div style={{
            color: '#6b7280',
            fontSize: '0.75rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {exam.examType}
          </div>
          
          {/* 3줄: 시간 정보 */}
          <div style={{
            color: '#3b82f6',
            fontSize: '0.75rem',
            fontWeight: '500'
          }}>
            {exam.time} ~ {endTime}
          </div>
          
          {/* 4줄: 판독의 */}
          <div style={{
            color: '#374151',
            fontSize: '0.75rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            Dr. {radiologist?.name}
          </div>
        </div>
        
        {/* 오른쪽 상태/버튼 영역 */}
        <div style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'center', // 세로 중앙 정렬
          flexShrink: 0,
          minWidth: '65px', // 약간 줄임
          height: '100%'
        }}>
          {/* 상태 div (클릭 가능) */}
          <div
            onClick={() => {
              if (exam.status === '검사대기') {
                console.log('검사대기 → 검사중:', { roomId, examId: exam.examId });
                onStartExam(roomId, exam.examId);
              } else if (exam.status === '검사중') {
                console.log('검사중 → 검사완료:', { roomId, examId: exam.examId });
                onCompleteExam(roomId, exam.examId);
              }
            }}
            style={{
              fontSize: '0.75rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              fontWeight: '500',
              whiteSpace: 'nowrap',
              textAlign: 'center',
              minWidth: '60px',
              maxWidth: '60px',
              width: '60px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: exam.status === '검사완료' ? 'default' : 'pointer',
              opacity: exam.status === '검사완료' ? 0.7 : 1,
              transition: 'all 0.2s ease',
              background: exam.status === '검사대기' ? '#dbeafe' : 
                         exam.status === '검사중' ? '#dcfce7' : '#f3e8ff',
              color: exam.status === '검사대기' ? '#2563eb' : 
                     exam.status === '검사중' ? '#16a34a' : '#9333ea',
              userSelect: 'none',
              boxSizing: 'border-box',
              border: 'none',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              if (exam.status !== '검사완료') {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (exam.status !== '검사완료') {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }
            }}
          >
            {exam.status}
          </div>
          
          {/* X div (절대 위치 - 우측 상단 모서리) */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              console.log('X 버튼 클릭 - 검사 취소:', exam.examId);
              onCancelExam(exam.examId);
            }}
            title="검사 취소"
            style={{
              position: 'absolute',
              top: '5px', // 위에서 5px
              right: '5px', // 오른쪽에서 5px
              width: '18px',
              height: '18px',
              backgroundColor: '#ef4444',
              color: 'white',
              borderRadius: '50%',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: '1',
              zIndex: '999',
              transition: 'all 0.2s ease',
              userSelect: 'none',
              border: '1px solid white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#dc2626';
              e.target.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#ef4444';
              e.target.style.transform = 'scale(1)';
            }}
          >
            ×
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamCard;