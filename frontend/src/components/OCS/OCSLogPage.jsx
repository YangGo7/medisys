import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './OCSLogPage.css';

const OCSLogPage = () => {
  const [patientId, setPatientId] = useState('');
  const [openMrsPatientId, setOpenMrsPatientId] = useState('');
  const [openMrsPatientData, setOpenMrsPatientData] = useState(null);
  const [openMrsPatientError, setOpenMrsPatientError] = useState('');
  const [openMrsPatientLoading, setOpenMrsPatientLoading] = useState(false);
  const [allLogs, setAllLogs] = useState([]);
  const [displayedLogs, setDisplayedLogs] = useState([]);
  const [filters, setFilters] = useState({ modality: '' });
  const [uniqueModalities, setUniqueModalities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE_URL = process.env.REACT_APP_API_URL;
  const OPENMRS_API_BASE_URL = process.env.REACT_APP_OPENMRS_API_URL;
  const OPENMRS_AUTH_TOKEN = process.env.REACT_APP_OPENMRS_AUTH_TOKEN;

  const fetchOpenMrsPatient = useCallback(async () => {
    if (!openMrsPatientId) {
      setOpenMrsPatientData(null);
      setOpenMrsPatientError('');
      return;
    }

    setOpenMrsPatientLoading(true);
    setOpenMrsPatientError('');
    setOpenMrsPatientData(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/openmrs/patients/search/?q=${query}`);
      });

      if (response.data.results && response.data.results.length > 0) {
        setOpenMrsPatientData(response.data.results[0]);
      } else {
        setOpenMrsPatientError('해당 ID의 OpenMRS 환자를 찾을 수 없습니다.');
      }
    } catch (err) {
      console.error('❗ OpenMRS 환자 조회 실패:', err);
      if (err.response) {
        setOpenMrsPatientError(
          `OpenMRS API 오류: ${err.response.status} - ${err.response.statusText} (${err.response.data.error?.message || '알 수 없는 오류'})`
        );
      } else if (err.request) {
        setOpenMrsPatientError(`OpenMRS API 연결 오류: ${err.message}`);
      } else {
        setOpenMrsPatientError(`OpenMRS API 요청 설정 오류: ${err.message}`);
      }
    } finally {
      setOpenMrsPatientLoading(false);
    }
  }, [openMrsPatientId, API_BASE_URL]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchOpenMrsPatient();
    }, 500);
    return () => clearTimeout(handler);
  }, [openMrsPatientId, fetchOpenMrsPatient]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const url = patientId ? `${API_BASE_URL}/logs/?patient_id=${patientId}` : `${API_BASE_URL}/logs/`;
      const res = await axios.get(url);
      setAllLogs(res.data);
      setDisplayedLogs(res.data);
      const modalities = [...new Set(res.data.map(log => log.action_type).filter(Boolean))];
      setUniqueModalities(modalities);
      setError('');
    } catch (err) {
      const errorMsg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || '알 수 없는 오류가 발생했습니다.';
      console.error('❗ 로그 불러오기 실패:', errorMsg);
      setError(`❗ 서버 오류: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  }, [patientId, API_BASE_URL]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);



  const handleFilter = useCallback(() => {
    const filterId = patientId.trim();
    let filtered = allLogs;
    if (filterId) {
      filtered = filtered.filter(log => log.patient_id && String(log.patient_id).includes(filterId));
    }
    if (filters.modality) {
      filtered = filtered.filter(log => log.action_type === filters.modality);
    }
    setDisplayedLogs(filtered);
  }, [allLogs, patientId, filters.modality]);

  useEffect(() => {
    handleFilter();
  }, [filters.modality, patientId, allLogs, handleFilter]);

  const handleReset = () => {
    setPatientId('');
    setFilters({ modality: '' });
    setDisplayedLogs(allLogs);
    setError('');
    setOpenMrsPatientId('');
    setOpenMrsPatientData(null);
    setOpenMrsPatientError('');
  };

  return (
    <div className="ocs-body">
      <h1 className="ocs-title">OCS 검사 요청 / 결과 로그 통합 조회</h1>

      <div className="ocs-controls">
        <label className="ocs-controls-label">OpenMRS 환자 ID</label>
        <input
          type="text"
          className="ocs-controls-input"
          placeholder="예: 10002T"
          value={openMrsPatientId}
          onChange={(e) => setOpenMrsPatientId(e.target.value)}
        />
      </div>

      {openMrsPatientLoading && <p className="ocs-loading-message">OpenMRS에서 환자 조회 중...</p>}
      {openMrsPatientError && <p className="ocs-error-message">{openMrsPatientError}</p>}
      {openMrsPatientData && (
        <div className="ocs-controls">
          <p><strong>UUID:</strong> {openMrsPatientData.uuid}</p>
          <p><strong>이름:</strong> {openMrsPatientData.display}</p>
          <p><strong>식별자:</strong> {openMrsPatientData.identifiers.map(id => id.display).join(', ')}</p>
          <p><strong>성별:</strong> {openMrsPatientData.person?.gender || '정보 없음'}</p>
        </div>
      )}

      <div className="ocs-controls">
        <label className="ocs-controls-label">환자 ID</label>
        <input
          type="text"
          className="ocs-controls-input"
          placeholder="환자 ID"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
        />
        <select
          className="ocs-select"
          value={filters.modality}
          onChange={(e) => setFilters({ ...filters, modality: e.target.value })}
        >
          <option value="">전체</option>
          {uniqueModalities.map(mod => (
            <option key={mod} value={mod}>{mod}</option>
          ))}
        </select>
        <button className="ocs-controls-button" onClick={handleFilter}>필터</button>
        <button className="ocs-controls-button" onClick={handleReset}>초기화</button>
      </div>

      {error && <p className="ocs-error-message">{error}</p>}
      {loading ? (
        <p className="ocs-loading-message">로딩 중...</p>
      ) : displayedLogs.length === 0 ? (
        <div className="ocs-no-logs">표시할 로그가 없습니다.</div>
      ) : (
        <table className="ocs-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>환자 ID</th>
              <th>의사 ID</th>
              <th>요청/결과 종류</th>
              <th>요청/결과 상세</th>
              <th>요청/결과 시간</th>
            </tr>
          </thead>
          <tbody>
            {displayedLogs.map((log, index) => (
              <tr key={log.id} className={index % 2 === 0 ? 'ocs-table-even-row' : ''}>
                <td>{log.id}</td>
                <td>{log.patient_id || '정보 없음'}</td>
                <td>{log.doctor_id || '정보 없음'}</td>
                <td>{log.action_type || log.request_type || '정보 없음'}</td>
                <td>{log.detail || log.result_summary || '정보 없음'}</td>
                <td>{new Date(log.timestamp).toLocaleString('ko-KR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default OCSLogPage;
