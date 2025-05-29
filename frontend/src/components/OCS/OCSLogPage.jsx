// frontend > src > components > OCS > OCSLogPage.jsx

import React, { useState, useEffect, useCallback } from 'react'; // useCallback 추가
import axios from 'axios';

const OCSLogPage = () => {
  // 기존 상태들
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [allLogs, setAllLogs] = useState([]);
  const [displayedLogs, setDisplayedLogs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ modality: '' });
  const [uniqueModalities, setUniqueModalities] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState(null); // 이 상태는 현재 코드에서 사용되지 않으므로 필요 없으면 제거 가능

  // 새롭게 추가될 환자 존재 여부 확인 관련 상태
  const [openMrsPatientId, setOpenMrsPatientId] = useState(''); // OpenMRS 환자 조회 입력 ID
  const [openMrsPatientData, setOpenMrsPatientData] = useState(null); // OpenMRS에서 조회된 환자 데이터
  const [openMrsPatientError, setOpenMrsPatientError] = useState(''); // OpenMRS 조회 에러
  const [openMrsPatientLoading, setOpenMrsPatientLoading] = useState(false); // OpenMRS 조회 로딩

  // API_BASE_URL은 OCS 로그 백엔드 API 주소입니다.
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL; // <-- OCS 로그 백엔드 API 주소 확인

  // OpenMRS API URL 설정 (이 부분은 직접 입력하거나 환경 변수로 관리해야 합니다)
  // GCP OpenMRS 서버의 외부 IP 주소 또는 도메인, 그리고 포트 번호
  const OPENMRS_API_BASE_URL = "http://35.225.63.41/:8080/openmrs/ws/rest/v1/";
  // 예: "http://35.XXX.XXX.XXX:8080/openmrs/ws/rest/v1/";


  const OPENMRS_USERNAME = "admin";
  const OPENMRS_PASSWORD = "Admin123";
  const OPENMRS_AUTH_TOKEN = btoa(`${OPENMRS_USERNAME}:${OPENMRS_PASSWORD}`); // Base64 인코딩

  // OpenMRS 환자 조회 함수
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
      const searchUrl = `${OPENMRS_API_BASE_URL}patient`;
      const params = {
        identifier: openMrsPatientId,
        v: "full" // 상세 정보를 가져오기 위해 "full" 뷰를 요청
      };
      const headers = {
        'Authorization': `Basic ${OPENMRS_AUTH_TOKEN}`,
        'Accept': 'application/json',
      };

      const response = await axios.get(searchUrl, { params, headers });

      if (response.data.results && response.data.results.length > 0) {
        setOpenMrsPatientData(response.data.results[0]);
      } else {
        setOpenMrsPatientError('해당 ID의 OpenMRS 환자를 찾을 수 없습니다.');
      }
    } catch (err) {
      console.error("❗ OpenMRS 환자 조회 실패:", err);
      // 에러 메시지 상세화
      if (err.response) {
        // 서버 응답이 있는 경우 (예: 401 Unauthorized, 404 Not Found)
        setOpenMrsPatientError(`OpenMRS API 오류: ${err.response.status} - ${err.response.statusText} (${err.response.data.error.message || '알 수 없는 오류'})`);
      } else if (err.request) {
        // 요청이 전송되었지만 응답을 받지 못한 경우 (예: 네트워크 오류, CORS)
        setOpenMrsPatientError(`OpenMRS API 연결 오류: 서버에 연결할 수 없거나 CORS 문제일 수 있습니다. (${err.message})`);
      } else {
        // 요청 설정 중 문제 발생
        setOpenMrsPatientError(`OpenMRS API 요청 설정 오류: ${err.message}`);
      }
    } finally {
      setOpenMrsPatientLoading(false);
    }
  }, [openMrsPatientId, OPENMRS_API_BASE_URL, OPENMRS_AUTH_TOKEN]); // 의존성 배열에 추가

  // OpenMRS 환자 ID 입력 변경 시 즉시 조회
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchOpenMrsPatient();
    }, 500); // 0.5초 디바운스 (타이핑 중 너무 자주 호출되지 않도록)

    return () => {
      clearTimeout(handler);
    };
  }, [openMrsPatientId, fetchOpenMrsPatient]);


  // 2. OCS 로그 불러오기 (초기 렌더링 시 한 번만 실행)
  const fetchLogs = useCallback(async () => { // useCallback 추가
    setLoading(true);
    try {
      const url = patientId
        ? `${API_BASE_URL}/logs/?patient_id=${patientId}`
        : `${API_BASE_URL}/logs/`;

      const res = await axios.get(url);
      setAllLogs(res.data);
      setDisplayedLogs(res.data);

      const modalities = [...new Set(res.data.map(log => log.request_type).filter(Boolean))];
      setUniqueModalities(modalities);
      setError('');
    } catch (err) {
      console.error('❗ 로그 불러오기 실패:', err.message);
      setError(`❗ 서버 오류: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, patientId]); // 의존성 배열에 추가

  // 초기 로드 시 OCS 로그 fetch
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]); // fetchLogs가 useCallback으로 래핑되어 있으므로 안전하게 의존성으로 사용


  // 필터링 로직
  const handleFilter = useCallback(() => { // useCallback 추가
    const filterId = patientId.trim();
    let filtered = allLogs;

    if (filterId) {
      filtered = filtered.filter(log => log.patient_id && String(log.patient_id).includes(filterId)); // patient_id가 숫자일 경우 대비 String() 추가
    }
    if (filters.modality) {
      filtered = filtered.filter(log => log.request_type === filters.modality);
    }
    setDisplayedLogs(filtered);
  }, [allLogs, patientId, filters.modality]); // 의존성 배열에 추가

  // 필터 또는 로그 데이터 변경 시 필터링 재실행
  useEffect(() => {
    handleFilter();
  }, [filters.modality, patientId, allLogs, handleFilter]);


  // 초기화 로직
  const handleReset = () => {
    setPatientId('');
    setFilters({ modality: '' });
    setDisplayedLogs(allLogs); // 모든 로그 다시 표시
    setError('');
    // OpenMRS 환자 조회 초기화
    setOpenMrsPatientId('');
    setOpenMrsPatientData(null);
    setOpenMrsPatientError('');
  };

  return (
    <div style={styles.body}>
      <h1 style={styles.h1}>OCS 검사 요청 로그 조회</h1>

      {/* 새롭게 추가된 OpenMRS 환자 조회 섹션 */}
      <div style={styles.openMrsSearchSection}>
        <h2 style={styles.h2}>OpenMRS 환자 존재 여부 확인</h2>
        <label htmlFor="openMrsPatientIdInput" style={styles.controlsLabel}>OpenMRS 환자 ID 입력:</label>
        <input
          type="text"
          id="openMrsPatientIdInput"
          placeholder="예: 10002T"
          value={openMrsPatientId}
          onChange={(e) => setOpenMrsPatientId(e.target.value)}
          style={styles.controlsInput}
        />
        {/*
        <button onClick={fetchOpenMrsPatient} disabled={openMrsPatientLoading} style={styles.controlsButton}>
          {openMrsPatientLoading ? '조회 중...' : 'OpenMRS 조회'}
        </button>
        */} {/* 자동 조회되므로 버튼은 주석 처리 */}
        
        {openMrsPatientLoading && <p style={styles.loadingMessage}>OpenMRS에서 환자 조회 중...</p>}
        {openMrsPatientError && <p style={{ color: 'red', ...styles.errorMessage }}>{openMrsPatientError}</p>}
        {openMrsPatientData && (
          <div style={styles.patientInfoBox}>
            <h3>조회된 OpenMRS 환자:</h3>
            <p><strong>UUID:</strong> {openMrsPatientData.uuid}</p>
            <p><strong>이름:</strong> {openMrsPatientData.display}</p>
            <p><strong>식별자:</strong> {openMrsPatientData.identifiers.map(id => id.display).join(', ')}</p>
            <p><strong>성별:</strong> {openMrsPatientData.person?.gender || '정보 없음'}</p>
            {/* 필요하다면 전체 JSON 데이터도 표시할 수 있습니다 */}
            {/* <pre>{JSON.stringify(openMrsPatientData, null, 2)}</pre> */}
          </div>
        )}
      </div>
      {/* OpenMRS 환자 조회 섹션 끝 */}

      <div style={styles.controls}>
        {/* 기존 환자 ID 필터링 (텍스트 입력) */}
        <label htmlFor="patientIdInput" style={styles.controlsLabel}>OCS 로그 환자 ID로 필터링:</label>
        <input
          type="text"
          id="patientIdInput"
          placeholder="예: 10000X"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          style={styles.controlsInput}
        />

        {/* 모달리티 필터링 (드롭다운) */}
        <label htmlFor="modalityFilter" style={styles.controlsLabel}>모달리티:</label>
        <select
          id="modalityFilter"
          value={filters.modality}
          onChange={(e) => setFilters({ ...filters, modality: e.target.value })}
          style={styles.select}
        >
          <option value="">전체</option>
          {uniqueModalities.map(mod => (
            <option key={mod} value={mod}>{mod}</option>
          ))}
        </select>

        {/* 필터 및 초기화 버튼 */}
        <button onClick={handleFilter} style={styles.controlsButton}>필터</button>
        <button onClick={handleReset} style={{ ...styles.controlsButton, backgroundColor: '#6c757d' }}>초기화</button>
      </div>

      {error && <p style={{ ...styles.errorMessage, color: 'red' }}>{error}</p>}

      {loading ? (
        <p style={styles.loadingMessage}>OCS 로그를 불러오는 중...</p>
      ) : (
        <div id="logTableContainer">
          {displayedLogs.length === 0 && !error ? (
            <p style={styles.noLogs}>표시할 OCS 로그가 없습니다.</p>
          ) : (
            <table style={styles.table}>
              <thead style={styles.tableHead}>
                <tr>
                  <th style={styles.thTd}>ID</th>
                  <th style={styles.thTd}>환자 ID</th>
                  <th style={styles.thTd}>의사 ID</th>
                  <th style={styles.thTd}>요청 종류</th>
                  <th style={styles.thTd}>요청 상세</th>
                  <th style={styles.thTd}>시간</th>
                </tr>
              </thead>
              <tbody>
                {displayedLogs.map((log, index) => (
                  <tr
                    key={log.id}
                    style={{
                      ...styles.thTd,
                      backgroundColor: (index % 2 === 0 ? styles.tableEvenRow.backgroundColor : styles.table.backgroundColor),
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = styles.trHover.backgroundColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = index % 2 === 0 ? styles.tableEvenRow.backgroundColor : styles.table.backgroundColor;
                    }}
                  >
                    <td style={styles.thTd}>{log.id}</td>
                    <td style={styles.thTd}>{log.patient_id || '정보 없음'}</td>
                    <td style={styles.thTd}>{log.doctor_id || '정보 없음'}</td>
                    <td style={styles.thTd}>{log.request_type || '정보 없음'}</td>
                    <td style={styles.thTd}>{log.result_summary || '정보 없음'}</td>
                    <td style={styles.thTd}>{new Date(log.timestamp).toLocaleString('ko-KR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

// 인라인 스타일 정의 객체 (이전과 동일)
const styles = {
  body: {
    fontFamily: 'Arial, sans-serif',
    margin: '20px auto',
    maxWidth: '900px',
    padding: '20px',
    backgroundColor: '#f4f4f4',
    color: '#333',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  h1: {
    color: '#0056b3',
    textAlign: 'center',
    marginBottom: '30px',
    width: '100%',
  },
  controls: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#e9e9e9',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
    boxSizing: 'border-box',
  },
  controlsLabel: {
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  controlsInput: {
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    flexGrow: 1,
    minWidth: '150px',
    maxWidth: '300px',
  },
  controlsButton: {
    padding: '8px 15px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    whiteSpace: 'nowrap',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
    backgroundColor: 'white',

  },
  thTd: {
    border: '1px solid #ddd',
    padding: '12px',
    textAlign: 'left',
  },
  tableHead: {
    backgroundColor: '#f2f2f2',
    fontWeight: 'bold',
  },
  tableEvenRow: {
    backgroundColor: '#f9f9f9',
  },
  trHover: {
    backgroundColor: '#f1f1f1',
  },
  noLogs: {
    textAlign: 'center',
    color: '#666',
    marginTop: '30px',
    fontSize: '1.1em',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    width: '100%',
  },
  loadingMessage: {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '1.1em',
    width: '100%',
  },
  errorMessage: {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '1.1em',
    width: '100%',
  },
  select: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
    flexGrow: 1,
    minWidth: '150px',
    maxWidth: '300px',
  },
};

export default OCSLogPage;