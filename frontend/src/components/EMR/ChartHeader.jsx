import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const ChartHeader = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSearch = async () => {
    try {
      const response = await axios.get(`${API_BASE}openmrs/patients/search/`, {
        params: { query: query }
      });

      const data = response.data;
      console.log('서버 응답:', data);

      if (data.results && data.results.length > 0) {
        onSearch(data.results[0]); // 첫 번째 환자 결과 전달
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
