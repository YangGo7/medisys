// frontend/src/components/OCS/OCSMongoLogPage.jsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './OCSLogPage.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL?.replace(/\/$/, '');

const OCSMongoLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  // 필터 입력값
  const [patientQuery, setPatientQuery] = useState('');
  const [doctorQuery, setDoctorQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLogs = async (filters = {}) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const res = await axios.get(`${API_BASE_URL}/logs/test-logs/?${queryParams}`);
      setLogs(res.data.logs);
      setError('');
    } catch (err) {
      setError("MongoDB 로그를 불러오는 데 실패했습니다.");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSearch = () => {
    const filters = {};
    if (patientQuery) filters.patient_id = patientQuery;
    if (doctorQuery) filters.doctor_id = doctorQuery;
    if (startDate) filters.start_date = startDate;
    if (endDate) filters.end_date = endDate;
    fetchLogs(filters);
  };

  const handleReset = () => {
    setPatientQuery('');
    setDoctorQuery('');
    setStartDate('');
    setEndDate('');
    fetchLogs();
    setCurrentPage(1);
  };

  const currentLogs = logs.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage);
  const totalPages = Math.ceil(logs.length / logsPerPage);

  return (
    <div className="ocs-body">
      <h1 className="ocs-title">MongoDB 로그 조회</h1>

      <div className="ocs-controls">
        <input
          className="ocs-controls-input"
          placeholder="환자 ID"
          value={patientQuery}
          onChange={(e) => setPatientQuery(e.target.value)}
        />
        <input
          className="ocs-controls-input"
          placeholder="의사 ID"
          value={doctorQuery}
          onChange={(e) => setDoctorQuery(e.target.value)}
        />
        <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button className="ocs-controls-button" onClick={handleSearch}>검색</button>
        <button className="ocs-controls-button reset" onClick={handleReset}>초기화</button>
      </div>

      {loading && <p className="ocs-loading">불러오는 중...</p>}
      {error && <p className="ocs-error-message">{error}</p>}
      {!loading && logs.length === 0 && <p className="ocs-empty-message">저장된 로그가 없습니다.</p>}

      {!loading && logs.length > 0 && (
        <table className="ocs-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>환자 ID</th>
              <th>의사 ID</th>
              <th>오더-요청 종류</th>
              <th>오더-요청 상세</th>
              <th>시간</th>
            </tr>
          </thead>
          <tbody>
            {currentLogs.map((log, idx) => (
              <tr key={idx}>
                <td>{(currentPage - 1) * logsPerPage + idx + 1}</td>
                <td>{log.patient_id || '-'}</td>
                <td>{log.doctor_id || '-'}</td>
                <td>{log.request_type || '-'}</td>
                <td>{log.request_detail || '-'}</td>
                <td>{log.timestamp ? new Date(log.timestamp).toLocaleString('ko-KR') : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {totalPages > 1 && (
        <div className="ocs-pagination">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`ocs-page-button ${i + 1 === currentPage ? 'active' : ''}`}
              onClick={() => setCurrentPage(i + 1)}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default OCSMongoLogPage;
