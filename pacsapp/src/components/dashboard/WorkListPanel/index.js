// // E:\250619\radiology-system\frontend\src\components\dashboard\WorkListPanel\index.js
// // ESLint 에러 제거 및 useCallback 적용 버전

// import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
// import FilterSection from './FilterSection';
// import WorkListTable from './WorkListTable';
// import { worklistService } from '../../../services/worklistService';
// import './WorkListPanel.css';

// const WorkListPanel = forwardRef((props, ref) => {
//   const { onDragStart, onDateChange } = props;
  
//   // 상태 관리
//   const [worklist, setWorklist] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
//   const [filters, setFilters] = useState({
//     patientId: '',
//     patientName: '',
//     modality: '',
//     examPart: '',
//     requestDoctor: '',
//     examStatus: '',
//     reportStatus: ''
//   });

//   // 날짜별 데이터 로딩 함수 (useCallback으로 감싸기)
//   const loadWorklist = useCallback(async (date = null) => {
//     try {
//       setLoading(true);
//       setError(null);
      
//       console.log('📅 날짜별 워크리스트 로딩:', date);
      
//       // 날짜가 있으면 날짜별 API, 없으면 전체 API
//       const data = date 
//         ? await worklistService.getWorklistByDate(date)
//         : await worklistService.getWorklist();
      
//       console.log('원본 API 응답:', data);
      
//       // 데이터 변환 로직
//       let transformedData = [];
//       if (Array.isArray(data)) {
//         transformedData = data.map(item => ({
//           id: item.id,
//           patientId: item.patientId || item.patient_id || '-',
//           patientName: item.patientName || item.patient_name || '-',
//           birthDate: item.birthDate || item.birth_date || '-',
//           gender: item.gender || (item.sex === 'M' ? '남' : item.sex === 'F' ? '여' : '-'),
//           examPart: item.examPart || item.body_part || '-',
//           modality: item.modality || '-',
//           requestDoctor: item.requestDoctor || item.requesting_physician || '-',
//           requestDateTime: item.requestDateTime || item.request_datetime || '-',
//           reportingDoctor: item.reportingDoctor || item.interpreting_physician || '-',
//           examDateTime: item.examDateTime || item.scheduled_exam_datetime || null,
//           examStatus: item.examStatus || item.study_status || '대기',
//           reportStatus: item.reportStatus || item.report_status || '대기',
//           priority: item.priority || '일반',
//           estimatedDuration: item.estimatedDuration || item.estimated_duration || 30,
//           notes: item.notes || '',
//           radiologistId: item.radiologistId || item.assigned_radiologist || null,
//           roomId: item.roomId || item.assigned_room || null,
//           startTime: item.startTime || null
//         }));
//       }
      
//       console.log('📊 변환된 데이터:', transformedData.length, '개');
//       setWorklist(transformedData);
      
//     } catch (err) {
//       console.error('워크리스트 로드 실패:', err);
//       setError(`데이터를 불러오는데 실패했습니다: ${err.message}`);
//     } finally {
//       setLoading(false);
//     }
//   }, []); // 빈 의존성 배열

//   // 날짜 변경 핸들러 (useCallback으로 감싸기)
//   const handleDateChange = useCallback((date) => {
//     console.log('📅 날짜 변경:', date);
//     setSelectedDate(date);
    
//     // 부모 컴포넌트(Dashboard)에 날짜 변경 알림
//     if (onDateChange) {
//       onDateChange(date);
//     }
//   }, [onDateChange]);

//   // ref 메서드 노출
//   useImperativeHandle(ref, () => ({
//     refreshWorklist: () => loadWorklist(selectedDate),
//     setDate: (date) => handleDateChange(date)
//   }), [selectedDate, loadWorklist, handleDateChange]);

//   // 날짜 변경 시 데이터 다시 로딩
//   useEffect(() => {
//     loadWorklist(selectedDate);
//   }, [selectedDate, loadWorklist]);

//   // 초기 로딩
//   useEffect(() => {
//     loadWorklist(selectedDate);
//   }, [loadWorklist, selectedDate]);

//   // 필터링된 워크리스트 (useMemo 대신 일반 계산으로)
//   const filteredWorklist = worklist.filter(exam => {
//     return (!filters.patientId || exam.patientId?.toLowerCase().includes(filters.patientId.toLowerCase())) &&
//            (!filters.patientName || exam.patientName?.toLowerCase().includes(filters.patientName.toLowerCase())) &&
//            (!filters.modality || exam.modality === filters.modality) &&
//            (!filters.examPart || exam.examPart?.toLowerCase().includes(filters.examPart.toLowerCase())) &&
//            (!filters.requestDoctor || exam.requestDoctor?.toLowerCase().includes(filters.requestDoctor.toLowerCase())) &&
//            (!filters.examStatus || exam.examStatus === filters.examStatus) &&
//            (!filters.reportStatus || exam.reportStatus === filters.reportStatus);
//   });

//   // 필터 변경 핸들러 (useCallback으로 감싸기)
//   const handleFilterChange = useCallback((field, value) => {
//     setFilters(prev => ({
//       ...prev,
//       [field]: value
//     }));
//   }, []);

//   // 필터 초기화 (useCallback으로 감싸기)
//   const clearFilters = useCallback(() => {
//     setFilters({
//       patientId: '',
//       patientName: '',
//       modality: '',
//       examPart: '',
//       requestDoctor: '',
//       examStatus: '',
//       reportStatus: ''
//     });
//   }, []);

//   // 드래그 시작 핸들러 (useCallback으로 감싸기)
//   const handleDragStart = useCallback((exam) => {
//     // 대기 상태인 검사만 드래그 가능
//     if (exam.examStatus === '대기') {
//       console.log('드래그 시작:', exam);
//       onDragStart && onDragStart(exam);
//     } else {
//       console.log('드래그 불가능한 상태:', exam.examStatus);
//     }
//   }, [onDragStart]);

//   // 재시도 핸들러 (useCallback으로 감싸기)
//   const handleRetry = useCallback(() => {
//     loadWorklist(selectedDate);
//   }, [selectedDate, loadWorklist]);

//   // 로딩 상태
//   if (loading) {
//     return (
//       <div className="worklist-panel">
//         <div style={{ 
//           display: 'flex', 
//           justifyContent: 'center', 
//           alignItems: 'center', 
//           height: '200px',
//           color: '#6b7280'
//         }}>
//           {selectedDate} 데이터를 불러오는 중...
//         </div>
//       </div>
//     );
//   }

//   // 에러 상태
//   if (error) {
//     return (
//       <div className="worklist-panel">
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
//             onClick={handleRetry}
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
//     <div className="worklist-panel">
//       <FilterSection
//         filters={filters}
//         onFilterChange={handleFilterChange}
//         onClearFilters={clearFilters}
//         filteredCount={filteredWorklist.length}
//         selectedDate={selectedDate}
//         onDateChange={handleDateChange}
//       />
      
//       <WorkListTable
//         filteredWorklist={filteredWorklist}
//         onDragStart={handleDragStart}
//       />
      
//       {/* 디버그 정보 */}
//       {process.env.NODE_ENV === 'development' && (
//         <div style={{
//           position: 'fixed',
//           bottom: '10px',
//           left: '10px',
//           background: 'rgba(0,0,0,0.8)',
//           color: 'white',
//           padding: '0.5rem',
//           borderRadius: '0.25rem',
//           fontSize: '0.75rem'
//         }}>
//           선택된 날짜: {selectedDate} | 워크리스트: {worklist.length}개 | 필터링: {filteredWorklist.length}개
//         </div>
//       )}
//     </div>
//   );
// });

// WorkListPanel.displayName = 'WorkListPanel';

// export default WorkListPanel;

// WorkListPanel/index.js - 최종 완성 버전

import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import FilterSection from './FilterSection';
import WorkListTable from './WorkListTable';
import { worklistService } from '../../../services/worklistService';
import './WorkListPanel.css';

const WorkListPanel = forwardRef((props, ref) => {
  const { onDragStart, onDateChange, selectedDate } = props; // ✅ selectedDate prop 추가
  
  // 상태 관리
  const [worklist, setWorklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
const [currentDate, setCurrentDate] = useState(selectedDate || new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }));
  const [filters, setFilters] = useState({
    patientId: '',
    patientName: '',
    modality: '',
    examPart: '',
    requestDoctor: '',
    examStatus: '',
    reportStatus: ''
  });

  // ✅ worklistService의 parseKoreanDate 함수 사용
  const parseKoreanDate = useCallback((koreanStr) => {
    if (!koreanStr) return null;
    const match = koreanStr.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\./);
    if (match) {
      const [, year, month, day] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return null;
  }, []);

  // ✅ 날짜별 데이터 로딩 함수 (간단하게 수정)
  const loadWorklist = useCallback(async (date = null) => {
    try {
      setLoading(true);
      setError(null);
      
      const targetDate = date || currentDate;
      console.log('📅 워크리스트 로딩 시작 - 목표 날짜:', targetDate);
      
      // 날짜별 API 호출
      const data = await worklistService.getWorklistByDate(targetDate);
      console.log('✅ API 성공:', data?.length || 0, '개');
      
      // ✅ 데이터 변환 (간단하게)
      let transformedData = [];
      if (Array.isArray(data)) {
        transformedData = data.map(item => ({
          id: item.id,
          patientId: item.patientId || item.patient_id || '-',
          patientName: item.patientName || item.patient_name || '-',
          birthDate: item.birthDate || item.birth_date || '-',
          gender: item.gender || (item.sex === 'M' ? '남' : item.sex === 'F' ? '여' : '-'),
          examPart: item.examPart || item.body_part || '-',
          modality: item.modality || '-',
          requestDoctor: item.requestDoctor || item.requesting_physician || '-',
          requestDateTime: item.requestDateTime || item.request_datetime || '-',
          reportingDoctor: item.reportingDoctor || item.interpreting_physician || '-',
          examDateTime: item.examDateTime || item.scheduled_exam_datetime || null,
          examStatus: item.examStatus || item.study_status || '대기',
          reportStatus: item.reportStatus || item.report_status || '대기',
          priority: item.priority || '일반',
          estimatedDuration: item.estimatedDuration || item.estimated_duration || 30,
          notes: item.notes || '',
          radiologistId: item.radiologistId || item.assigned_radiologist || null,
          roomId: item.roomId || item.assigned_room || null,
          startTime: item.startTime || null
        }));
      }
      
      console.log('📊 최종 변환된 데이터:', transformedData.length, '개');
      setWorklist(transformedData);
      
    } catch (err) {
      console.error('❌ 워크리스트 로드 실패:', err);
      setError(`데이터를 불러오는데 실패했습니다: ${err.message}`);
      setWorklist([]);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  // ✅ prop으로 받은 selectedDate 변화 감지
  useEffect(() => {
    if (selectedDate && selectedDate !== currentDate) {
      console.log('📅 상위에서 날짜 변경됨:', selectedDate);
      setCurrentDate(selectedDate);
    }
  }, [selectedDate, currentDate]);

  // ✅ 날짜 변경 핸들러
  const handleDateChange = useCallback((date) => {
    console.log('📅 WorkListPanel 날짜 변경:', date);
    setCurrentDate(date);
    
    // 부모 컴포넌트에 알림
    if (onDateChange) {
      onDateChange(date);
    }
  }, [onDateChange]);

  // ✅ ref 메서드 노출
  useImperativeHandle(ref, () => ({
    refreshWorklist: () => {
      console.log('🔄 외부에서 워크리스트 새로고침 요청');
      return loadWorklist(currentDate);
    },
    setDate: (date) => handleDateChange(date),
    getCurrentDate: () => currentDate,
    getWorklistCount: () => worklist.length
  }), [currentDate, loadWorklist, handleDateChange, worklist.length]);

  // ✅ 날짜 변경시 데이터 로딩
  useEffect(() => {
    loadWorklist(currentDate);
  }, [currentDate, loadWorklist]);

  // ✅ 필터링된 워크리스트
  const filteredWorklist = worklist.filter(exam => {
    return (!filters.patientId || exam.patientId?.toLowerCase().includes(filters.patientId.toLowerCase())) &&
           (!filters.patientName || exam.patientName?.toLowerCase().includes(filters.patientName.toLowerCase())) &&
           (!filters.modality || exam.modality === filters.modality) &&
           (!filters.examPart || exam.examPart?.toLowerCase().includes(filters.examPart.toLowerCase())) &&
           (!filters.requestDoctor || exam.requestDoctor?.toLowerCase().includes(filters.requestDoctor.toLowerCase())) &&
           (!filters.examStatus || exam.examStatus === filters.examStatus) &&
           (!filters.reportStatus || exam.reportStatus === filters.reportStatus);
  });

  // 필터 변경 핸들러
  const handleFilterChange = useCallback((field, value) => {
    console.log('🔍 필터 변경:', field, '=', value);
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // 필터 초기화
  const clearFilters = useCallback(() => {
    console.log('🧹 필터 초기화');
    setFilters({
      patientId: '',
      patientName: '',
      modality: '',
      examPart: '',
      requestDoctor: '',
      examStatus: '',
      reportStatus: ''
    });
  }, []);

  // 드래그 시작 핸들러
  const handleDragStart = useCallback((exam) => {
    if (exam.examStatus === '대기') {
      console.log('🖱️ 드래그 시작:', exam.patientName, exam.modality, exam.examPart);
      onDragStart && onDragStart(exam);
    } else {
      console.log('❌ 드래그 불가능한 상태:', exam.examStatus);
    }
  }, [onDragStart]);

  // 재시도 핸들러
  const handleRetry = useCallback(() => {
    console.log('🔄 재시도 버튼 클릭');
    loadWorklist(currentDate);
  }, [currentDate, loadWorklist]);

  // 로딩 상태
  if (loading) {
    return (
      <div className="worklist-panel">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '200px',
          color: '#6b7280'
        }}>
          📅 {currentDate} 데이터를 불러오는 중...
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="worklist-panel">
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '200px',
          color: '#dc2626'
        }}>
          <p>❌ {error}</p>
          <button 
            onClick={handleRetry}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            🔄 다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="worklist-panel">
      <FilterSection
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
        filteredCount={filteredWorklist.length}
        selectedDate={currentDate}
        onDateChange={handleDateChange}
      />
      
      <WorkListTable
        filteredWorklist={filteredWorklist}
        onDragStart={handleDragStart}
      />
      
      {/* ✅ 개발용 디버그 정보 */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.9)',
          color: 'white',
          padding: '0.75rem',
          borderRadius: '0.5rem',
          fontSize: '0.75rem',
          lineHeight: '1.4',
          maxWidth: '350px'
        }}>
          <div>📅 선택된 날짜: <strong>{currentDate}</strong></div>
          <div>📊 원본 데이터: <strong>{worklist.length}개</strong></div>
          <div>📊 필터링된 데이터: <strong>{filteredWorklist.length}개</strong></div>
          <div>🔄 로딩: {loading ? '중' : '완료'}</div>
        </div>
      )}
    </div>
  );
});

WorkListPanel.displayName = 'WorkListPanel';

export default WorkListPanel;