// frontend > src > components > OCS > OCSLogOrders.jsx (OCS 로그 조회)

// ✅ OCSLogOrders .jsx (LIS 로그 테이블 컴포넌트)
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const OCSLogOrders = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    patient_id: '',
    doctor_id: '',
    step: ''
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams(filters).toString();
      const response = await axios.get(`/api/logs/?${query}`);
      setLogs(response.data);
    } catch (err) {
      setError('로그 불러오기 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearch = () => {
    fetchLogs();
  };

  return (
    <div>
      <h2>LIS 로그 조회</h2>

      <div style={{ marginBottom: '1rem' }}>
        <input name="patient_id" placeholder="환자 ID" value={filters.patient_id} onChange={handleChange} />
        <input name="doctor_id" placeholder="의사 ID" value={filters.doctor_id} onChange={handleChange} />
        <select name="step" value={filters.step} onChange={handleChange}>
          <option value="">전체 단계</option>
          <option value="order">오더 생성</option>
          <option value="sample">샘플 등록</option>
          <option value="result">결과 등록</option>
        </select>
        <button onClick={handleSearch}>검색</button>
      </div>

      {loading ? (
        <p>불러오는 중...</p>
      ) : error ? (
        <p>{error}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>환자 ID</th>
              <th>의사 ID</th>
              <th>요청 종류</th>
              <th>요청 상세</th>
              <th>결과 요약</th> {/* 👈 이 부분 추가 */}
              <th>시간</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, idx) => (
              <tr key={idx}>
                <td>{log.patient_id}</td>
                <td>{log.doctor_id}</td>
                <td>{log.request_type}</td>
                <td>{log.request_detail}</td>
                <td>{log.result_detail || '-'}</td> {/* 👈 이 부분 추가 */}
                <td>{new Date(log.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default OCSLogOrders;