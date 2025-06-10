// OCSLogPage.jsx 파일 (전체 코드, 주석 없이)

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './OCSLogPage.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL?.replace(/\/$/, '');

const OCSLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [patientQuery, setPatientQuery] = useState('');
  const [doctorQuery, setDoctorQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [patientMappings, setPatientMappings] = useState({});
  const [doctorMappings, setDoctorMappings] = useState({});
  const logsPerPage = 10;

  // 1️⃣ 기존 로그 가져오는 useEffect (그대로 둠)
  useEffect(() => {
    const fetchLogs = async () => {
      const res = await axios.get(`${API_BASE_URL}/logs/combined/`);
      setLogs(res.data);
      setFilteredLogs(res.data);
    };
    fetchLogs();
  }, []);

  // 2️⃣ 새로운 환자 이름 매핑용 useEffect (추가!)
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/integration/openmrs/patients/`);
        const mapping = {};
        res.data.forEach((p) => {
          mapping[p.uuid] = {
            id: p.identifier,
            name: p.display,
          };
        });
        setPatientMappings(mapping);
      } catch (err) {
        console.error("❌ 환자 매핑 실패:", err);
      }
    };
    fetchPatients();
  }, []);

  // 3️⃣ 의사 정보 받아오는 useEffect 추가
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/integration/openmrs/providers/`);
        const mapping = {};
        res.data.results?.forEach((d) => {
          if (d.uuid && d.display) { // .toLowerCase().includes("doctor")) { // 의사만 필터링
            mapping[d.uuid] = d.display;
          }
        });
        setDoctorMappings(mapping);
      } catch (err) {
        console.error("❌ 의사 매핑 실패:", err);
      }
    };
    fetchDoctors();
  }, []);


  const handleSearch = () => {
    const filtered = logs.filter((log) => {
      const patientMatch = patientQuery
        ? (
            (log.patient_id?.toLowerCase().includes(patientQuery.toLowerCase())) ||
            (patientMappings[log.patient_id]?.name?.toLowerCase().includes(patientQuery.toLowerCase()))
          )
        : true;

      const doctorMatch = doctorQuery
        ? (
            (log.doctor_id?.toLowerCase().includes(doctorQuery.toLowerCase())) ||
            (log.doctor_name?.toLowerCase().includes(doctorQuery.toLowerCase())) ||
            (doctorMappings[log.doctor_id]?.toLowerCase().includes(doctorQuery.toLowerCase()))
          )
        : true;

      const dateMatch = (() => {
        if (!startDate && !endDate) return true;

        // 'request_and_return_time' 필드에서 첫 번째 시간 (오더한 시간)을 기준으로 필터링
        const orderTimeStr = log.request_and_return_time?.split('\n')[0]; 
        
        if (!orderTimeStr) return false;

        const logDate = new Date(orderTimeStr);
        
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        return (!start || logDate >= start) && (!end || logDate <= end);
      })();

      return patientMatch && doctorMatch && dateMatch;
    });
    setFilteredLogs(filtered);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setPatientQuery('');
    setDoctorQuery('');
    setStartDate('');
    setEndDate('');
    setFilteredLogs(logs);
    setCurrentPage(1);
  };

  const currentLogs = filteredLogs.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  return (
    <div className="ocs-body">
      <h1 className="ocs-title">로그 조회</h1>

      <div className="ocs-controls">
        <input className="ocs-controls-input" placeholder="환자 ID 또는 이름" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} />
        <input className="ocs-controls-input" placeholder="의사 ID 또는 이름" value={doctorQuery} onChange={(e) => setDoctorQuery(e.target.value)} />
        <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button className="ocs-controls-button" onClick={handleSearch}>검색</button>
        <button className="ocs-controls-button reset" onClick={handleReset}>초기화</button>
      </div>

      {error && <p className="ocs-error-message">{error}</p>}
      {filteredLogs.length === 0 ? (
        <p className="ocs-empty-message">저장된 로그가 없습니다.</p>
      ) : (
        <div className="ocs-table-container">
          <table className="ocs-table">
            <thead>
              <tr>
                <th>NO</th>
                <th>환자</th>
                <th>의사</th>
                <th>요청 종류</th>
                <th>요청/결과</th> {/* 필드명 변경 */}
                <th>진단 상세</th> {/* 필드명 변경 */}
                <th>요청/결과 시간</th> {/* 필드명 변경 */}
              </tr>
            </thead>
            <tbody>
              {currentLogs.map((log, idx) => (
                <tr key={idx}>
                  <td>{(currentPage - 1) * logsPerPage + idx + 1}</td>
                  <td>{log.patient_id || '-'}{' '}{patientMappings[log.patient_id]?.name ? `(${patientMappings[log.patient_id].name})` : ''}</td>
                  <td>{log.doctor_id || '-'}{' '}{doctorMappings[log.doctor_id] ? `(${doctorMappings[log.doctor_id]})` : ''}</td>
                  <td>{log.request_type || '-'}</td>
                  {/* 새로운 필드명과 스타일 적용 */}
                  <td style={{ whiteSpace: 'pre-wrap' }}>{log.request_and_result || '-'}</td>
                  {/* 새로운 필드명 */}
                  <td style={{ whiteSpace: 'pre-wrap' }}>{log.diagnosis_detail || '-'}</td> 
                  {/* 새로운 필드명과 스타일 적용 */}
                  <td style={{ whiteSpace: 'pre-wrap' }}>{log.request_and_return_time || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="ocs-pagination">
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} className={`ocs-page-button ${i + 1 === currentPage ? 'active' : ''}`} onClick={() => setCurrentPage(i + 1)}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default OCSLogPage;