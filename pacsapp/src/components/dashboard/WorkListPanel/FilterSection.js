// // E:\250619\radiology-system\frontend\src\components\dashboard\WorkListPanel\FilterSection.js

// import React from 'react';

// const FilterSection = ({
//   filters,
//   onFilterChange,
//   onClearFilters,
//   filteredCount,
//   selectedDate,      // 🆕 추가
//   onDateChange      // 🆕 추가
// }) => {
//   // 오늘 날짜를 기본값으로
//   const today = new Date().toISOString().split('T')[0];

//   return (
//     <div className="filter-section">
//       <h3>검사 필터</h3>
      
//       {/* 🆕 날짜 선택 영역 */}
//       <div className="date-filter-row">
//         <div className="date-picker-container">
//           <span className="calendar-icon">📅</span>
//           <input
//             type="date"
//             value={selectedDate || today}
//             onChange={(e) => onDateChange(e.target.value)}
//             className="date-input"
//           />
//           <span className="date-label">검사 필터</span>
//         </div>
        
//         <button 
//           onClick={onClearFilters}
//           className="clear-filters-btn"
//         >
//           필터 초기화
//         </button>
//       </div>
      
//       <div className="filter-grid-top">
//         <input
//           type="text"
//           placeholder="환자 ID"
//           value={filters.patientId}
//           onChange={(e) => onFilterChange('patientId', e.target.value)}
//           className="filter-input"
//         />
//         <input
//           type="text"
//           placeholder="환자명"
//           value={filters.patientName}
//           onChange={(e) => onFilterChange('patientName', e.target.value)}
//           className="filter-input"
//         />
//         <select
//           value={filters.modality}
//           onChange={(e) => onFilterChange('modality', e.target.value)}
//           className="filter-select"
//         >
//           <option value="">모든 모달리티</option>
//           <option value="CR">CR (X-ray)</option>
//           <option value="CT">CT</option>
//           <option value="MR">MR (MRI)</option>
//           <option value="US">US (초음파)</option>
//           <option value="NM">NM</option>
//           <option value="PT">PT</option>
//           <option value="DX">DX</option>
//           <option value="XA">XA</option>
//           <option value="MG">MG</option>
//         </select>
//       </div>
      
//       <div className="filter-grid-bottom">
//         <select
//           value={filters.examStatus}
//           onChange={(e) => onFilterChange('examStatus', e.target.value)}
//           className="filter-select"
//         >
//           <option value="">모든 검사 상태</option>
//           <option value="대기">대기</option>
//           <option value="검사대기">검사대기</option>
//           <option value="검사중">검사중</option>
//           <option value="검사완료">검사완료</option>
//           <option value="취소">취소</option>
//         </select>
//         <select
//           value={filters.reportStatus}
//           onChange={(e) => onFilterChange('reportStatus', e.target.value)}
//           className="filter-select"
//         >
//           <option value="">모든 리포트 상태</option>
//           <option value="대기">대기</option>
//           <option value="작성중">작성중</option>
//           <option value="작성완료">작성완료</option>
//         </select>
//       </div>
      
//       <div className="filter-result">
//         총 {filteredCount}건 검색됨
//       </div>
//     </div>
//   );
// };

// export default FilterSection;

// E:\250619\radiology-system\frontend\src\components\dashboard\WorkListPanel\FilterSection.js
// 날짜 변경 기능 수정 버전

import React from 'react';

const FilterSection = ({
  filters,
  onFilterChange,
  onClearFilters,
  filteredCount,
  selectedDate,
  onDateChange
}) => {
  // ✅ 날짜 변경 핸들러 (로그 추가)
  const handleDateChange = (e) => {
    const newDate = e.target.value;
    console.log('📅 FilterSection 날짜 변경:', newDate);
    
    if (onDateChange) {
      onDateChange(newDate);
    } else {
      console.error('❌ onDateChange 핸들러가 없습니다!');
    }
  };

  // ✅ 오늘 날짜를 기본값으로
  const today = new Date().toISOString().split('T')[0];
  const currentDate = selectedDate || today;

  return (
    <div className="filter-section">
      <h3>검사 필터</h3>
      
      {/* ✅ 날짜 선택 영역 (수정됨) */}
      <div className="date-filter-row">
        <div className="date-picker-container">
          <span className="calendar-icon">📅</span>
          <input
            type="date"
            value={currentDate}
            onChange={handleDateChange}
            className="date-input"
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem'
            }}
          />
          <span className="date-label">검사 날짜</span>
        </div>
        
        <button 
          onClick={onClearFilters}
          className="clear-filters-btn"
          style={{
            padding: '0.5rem 1rem',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          필터 초기화
        </button>
      </div>
      
      {/* ✅ 필터 입력 영역 */}
      <div className="filter-grid-top" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '0.5rem',
        marginBottom: '0.5rem'
      }}>
        <input
          type="text"
          placeholder="환자 ID"
          value={filters.patientId}
          onChange={(e) => onFilterChange('patientId', e.target.value)}
          className="filter-input"
          style={{
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        />
        <input
          type="text"
          placeholder="환자명"
          value={filters.patientName}
          onChange={(e) => onFilterChange('patientName', e.target.value)}
          className="filter-input"
          style={{
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        />
        <select
          value={filters.modality}
          onChange={(e) => onFilterChange('modality', e.target.value)}
          className="filter-select"
          style={{
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        >
          <option value="">모든 모달리티</option>
          <option value="CR">CR (X-ray)</option>
          <option value="CT">CT</option>
          <option value="MR">MR (MRI)</option>
          <option value="US">US (초음파)</option>
          <option value="NM">NM</option>
          <option value="PT">PT</option>
          <option value="DX">DX</option>
          <option value="XA">XA</option>
          <option value="MG">MG</option>
        </select>
      </div>
      
      <div className="filter-grid-bottom" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.5rem',
        marginBottom: '0.75rem'
      }}>
        <select
          value={filters.examStatus}
          onChange={(e) => onFilterChange('examStatus', e.target.value)}
          className="filter-select"
          style={{
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        >
          <option value="">모든 검사 상태</option>
          <option value="대기">대기</option>
          <option value="검사대기">검사대기</option>
          <option value="검사중">검사중</option>
          <option value="검사완료">검사완료</option>
          <option value="취소">취소</option>
        </select>
        <select
          value={filters.reportStatus}
          onChange={(e) => onFilterChange('reportStatus', e.target.value)}
          className="filter-select"
          style={{
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        >
          <option value="">모든 리포트 상태</option>
          <option value="대기">대기</option>
          <option value="작성중">작성중</option>
          <option value="작성완료">작성완료</option>
        </select>
      </div>
      
      {/* ✅ 결과 표시 */}
      <div className="filter-result" style={{
        padding: '0.5rem',
        background: '#f3f4f6',
        borderRadius: '0.375rem',
        fontSize: '0.875rem',
        color: '#374151',
        textAlign: 'center'
      }}>
        📊 총 <strong>{filteredCount}건</strong> 검색됨
        {selectedDate && (
          <span style={{ marginLeft: '0.5rem', color: '#6b7280' }}>
            (📅 {selectedDate})
          </span>
        )}
      </div>
    </div>
  );
};

export default FilterSection;