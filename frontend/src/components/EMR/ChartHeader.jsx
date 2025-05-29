// src/components/ChartHeader.jsx
import React, { useState } from 'react';

const ChartHeader = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSearch = async () => {
    try {
      const res = await fetch(`http://35.225.63.41:8000/api/openmrs/patients/search/?query=${query}`);
      const data = await res.json();
      if (data.length > 0) {
        onSearch(data[0]);  // 첫 번째 환자만 선택
      } else {
        alert('검색 결과 없음');
      }
    } catch (err) {
      console.error('검색 중 오류 발생:', err);
      alert('검색 중 오류 발생');
    }
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
      <input
        type="text"
        placeholder="  🔍 환자 이름"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ flex: 1 }}
      />
      <button onClick={handleSearch}>검색</button>
      <button onClick={() => alert('신규 환자 등록 기능 준비 중입니다')}>+ 신규 환자</button>
    </div>
  );
};

export default ChartHeader;
