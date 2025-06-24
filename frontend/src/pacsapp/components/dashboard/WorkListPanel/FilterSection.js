import React from 'react';

const FilterSection = ({
  filters,
  onFilterChange,
  onClearFilters,
  filteredCount
}) => {
  return (
    <div className="filter-section">
      <div className="filter-header">
        <h2>검색 필터</h2>
        <button onClick={onClearFilters} className="clear-filters-btn">
          필터 초기화
        </button>
      </div>
      
      <div className="filter-grid-top">
        <input
          type="text"
          placeholder="환자 ID"
          value={filters.patientId}
          onChange={(e) => onFilterChange('patientId', e.target.value)}
          className="filter-input"
        />
        <input
          type="text"
          placeholder="환자명"
          value={filters.patientName}
          onChange={(e) => onFilterChange('patientName', e.target.value)}
          className="filter-input"
        />
        <select
          value={filters.modality}
          onChange={(e) => onFilterChange('modality', e.target.value)}
          className="filter-select"
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
      
      <div className="filter-grid-bottom">
        <select
          value={filters.examStatus}
          onChange={(e) => onFilterChange('examStatus', e.target.value)}
          className="filter-select"
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
        >
          <option value="">모든 리포트 상태</option>
          <option value="대기">대기</option>
          <option value="작성중">작성중</option>
          <option value="작성완료">작성완료</option>
        </select>
      </div>
      
      <div className="filter-result">
        총 {filteredCount}건 검색됨
      </div>
    </div>
  );
};

export default FilterSection;