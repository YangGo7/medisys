// import React, { useState, useEffect } from 'react';
// import FilterSection from './FilterSection';
// import WorkListTable from './WorkListTable';
// import { worklistService } from '../../../services/worklistService';
// import './WorkListPanel.css';

// const WorkListPanel = ({ onDragStart }) => {
//   // 상태 관리
//   const [worklist, setWorklist] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [filters, setFilters] = useState({
//     patientId: '',
//     patientName: '',
//     modality: '',
//     examPart: '',
//     requestDoctor: '',
//     examStatus: '',
//     reportStatus: ''
//   });

//   // 데이터 로딩
//   useEffect(() => {
//     loadWorklist();
//   }, []);

//   const loadWorklist = async () => {
//     try {
//       setLoading(true);
//       setError(null);
      
//       const data = await worklistService.getWorklist();
//       console.log('원본 API 응답:', data);
      
//       // 🔧 데이터 변환 로직 추가
//       const transformedData = Array.isArray(data) ? data.map(item => ({
//         id: item.id,
//         patientId: item.patientId || item.patient_id || '-',
//         patientName: item.patientName || item.patient_name || '-',
//         birthDate: item.birthDate || item.birth_date || '-',
//         gender: item.gender || (item.sex === 'M' ? '남' : item.sex === 'F' ? '여' : '-'),
//         examPart: item.examPart || item.body_part || '-',
//         modality: item.modality || '-',
//         requestDoctor: item.requestDoctor || item.requesting_physician || '-',
//         requestDateTime: item.requestDateTime || item.request_datetime || '-',
//         reportingDoctor: item.reportingDoctor || item.interpreting_physician || '-',
//         examDateTime: item.examDateTime || item.scheduled_exam_datetime || null,
//         examStatus: item.examStatus || item.study_status || '대기',
//         reportStatus: item.reportStatus || item.report_status || '대기',
//         priority: item.priority || '일반',
//         estimatedDuration: item.estimatedDuration || item.estimated_duration || 30,
//         notes: item.notes || '',
//         radiologistId: item.radiologistId || item.assigned_radiologist || null,
//         roomId: item.roomId || item.assigned_room || null,
//         startTime: item.startTime || null
//       })) : [];
      
//       console.log('변환된 데이터:', transformedData);
//       setWorklist(transformedData);
//     } catch (err) {
//       console.error('워크리스트 로드 실패:', err);
//       setError('데이터를 불러오는데 실패했습니다.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // 필터링된 워크리스트
//   const filteredWorklist = worklist.filter(exam => {
//     return (!filters.patientId || exam.patientId?.toLowerCase().includes(filters.patientId.toLowerCase())) &&
//            (!filters.patientName || exam.patientName?.toLowerCase().includes(filters.patientName.toLowerCase())) &&
//            (!filters.modality || exam.modality === filters.modality) &&
//            (!filters.examPart || exam.examPart?.toLowerCase().includes(filters.examPart.toLowerCase())) &&
//            (!filters.requestDoctor || exam.requestDoctor?.toLowerCase().includes(filters.requestDoctor.toLowerCase())) &&
//            (!filters.examStatus || exam.examStatus === filters.examStatus) &&
//            (!filters.reportStatus || exam.reportStatus === filters.reportStatus);
//   });

//   // 이벤트 핸들러들
//   const handleFilterChange = (field, value) => {
//     setFilters(prev => ({
//       ...prev,
//       [field]: value
//     }));
//   };

//   const clearFilters = () => {
//     setFilters({
//       patientId: '',
//       patientName: '',
//       modality: '',
//       examPart: '',
//       requestDoctor: '',
//       examStatus: '',
//       reportStatus: ''
//     });
//   };

//   const handleDragStart = (exam) => {
//     // 대기 상태인 검사만 드래그 가능
//     if (exam.examStatus === '대기') {
//       console.log('드래그 시작:', exam);
//       onDragStart && onDragStart(exam);
//     } else {
//       console.log('드래그 불가능한 상태:', exam.examStatus);
//     }
//   };

//   // 워크리스트 새로고침 함수 (외부에서 호출 가능)
//   const refreshWorklist = () => {
//     loadWorklist();
//   };

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
//           데이터를 불러오는 중...
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
//             onClick={loadWorklist}
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
//       />
      
//       <WorkListTable
//         filteredWorklist={filteredWorklist}
//         onDragStart={handleDragStart}
//       />
      
//     </div>
//   );
// };

// export default WorkListPanel;
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import FilterSection from './FilterSection';
import WorkListTable from './WorkListTable';
import { worklistService } from '../../../services/worklistService';
import './WorkListPanel.css';

const WorkListPanel = forwardRef((props, ref) => {
  const { onDragStart } = props;
  // 상태 관리
  const [worklist, setWorklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    patientId: '',
    patientName: '',
    modality: '',
    examPart: '',
    requestDoctor: '',
    examStatus: '',
    reportStatus: ''
  });

  // ref 메서드 노출
  useImperativeHandle(ref, () => ({
    refreshWorklist: loadWorklist
  }), []);

  // 데이터 로딩
  useEffect(() => {
    loadWorklist();
  }, []); // 빈 배열로 한 번만 실행되도록

  const loadWorklist = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('API 호출 시작...'); // 디버깅
      const data = await worklistService.getWorklist();
      console.log('원본 API 응답:', data);
      
      // 🔧 데이터 변환 로직 추가 - 한 번만 실행되도록
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
      
      console.log('변환된 데이터:', transformedData);
      console.log('데이터 개수:', transformedData.length); // 디버깅
      setWorklist(transformedData);
    } catch (err) {
      console.error('워크리스트 로드 실패:', err);
      console.error('에러 상세:', err.response?.data); // 디버깅
      setError(`데이터를 불러오는데 실패했습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 필터링된 워크리스트
  const filteredWorklist = worklist.filter(exam => {
    return (!filters.patientId || exam.patientId?.toLowerCase().includes(filters.patientId.toLowerCase())) &&
           (!filters.patientName || exam.patientName?.toLowerCase().includes(filters.patientName.toLowerCase())) &&
           (!filters.modality || exam.modality === filters.modality) &&
           (!filters.examPart || exam.examPart?.toLowerCase().includes(filters.examPart.toLowerCase())) &&
           (!filters.requestDoctor || exam.requestDoctor?.toLowerCase().includes(filters.requestDoctor.toLowerCase())) &&
           (!filters.examStatus || exam.examStatus === filters.examStatus) &&
           (!filters.reportStatus || exam.reportStatus === filters.reportStatus);
  });

  // 이벤트 핸들러들
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      patientId: '',
      patientName: '',
      modality: '',
      examPart: '',
      requestDoctor: '',
      examStatus: '',
      reportStatus: ''
    });
  };

  const handleDragStart = (exam) => {
    // 대기 상태인 검사만 드래그 가능
    if (exam.examStatus === '대기') {
      console.log('드래그 시작:', exam);
      onDragStart && onDragStart(exam);
    } else {
      console.log('드래그 불가능한 상태:', exam.examStatus);
    }
  };

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
          데이터를 불러오는 중...
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
          <p>{error}</p>
          <button 
            onClick={loadWorklist}
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
            다시 시도
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
      />
      
      <WorkListTable
        filteredWorklist={filteredWorklist}
        onDragStart={handleDragStart}
      />
      
    </div>
  );
});

WorkListPanel.displayName = 'WorkListPanel';

export default WorkListPanel;