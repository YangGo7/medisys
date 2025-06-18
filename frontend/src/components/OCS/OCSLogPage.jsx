// src/components/OCS/OCSLogPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './OCSLogPage.css';

const RIS_TYPES = ['CR', 'CT', 'MR', 'US', 'NM', 'PT', 'DX', 'XA', 'MG'];

export default function OCSLogPage() {
  const [logs, setLogs] = useState([]);
  const [patientFilter, setPatientFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return weekAgo.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [testTypeFilter, setTestTypeFilter] = useState('');
  // '초기화' 후 검색을 트리거하기 위한 상태 추가
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [risLogs, setRisLogs] = useState([]);

  const API = process.env.REACT_APP_API_BASE_URL.replace(/\/$/, '');

  const fetchLogs = useCallback(async (isSearch = false) => {
    // 🔥 [디버깅 코드 3] fetchLogs 함수가 실행되는지 콘솔에 기록합니다.
    console.log(`🔄 데이터 재요청 시작! (현재 page: ${page})`);
    
    if (isSearch) setPage(1);
    setLoading(true);
    setError(null);

    try {
      const params = {
        page,
        page_size: pageSize,
        start_date: startDate,
        end_date: endDate,
      };
      if (patientFilter) params.patient_id = patientFilter;
      if (doctorFilter) params.doctor_id = doctorFilter;
      if (testTypeFilter) params.test_type = testTypeFilter;

      const res = await axios.get(`${API}/orders/logs/`, { params });

      const allLogs = res.data.data;

      // 전체 로그 저장
      setLogs(allLogs);
      setTotalCount(res.data.total);

      // 🔍 RIS 로그만 따로 필터링
      const risOnly = allLogs.filter(log =>
        RIS_TYPES.includes((log.test_type || '').toUpperCase())
      );
      setRisLogs(risOnly);

    } catch (err) {
      console.error('로그 조회 실패:', err);
      setError('로그를 불러오는 데 실패했습니다.');
      setLogs([]);
      setRisLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, patientFilter, doctorFilter, testTypeFilter, startDate, endDate, API]);

  // 페이지 변경 시
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]); // page

  // 최초 데이터 로딩 시
  useEffect(() => {
    fetchLogs();
  }, []);

  // 초기화 버튼 클릭 시
  useEffect(() => {
    if (needsRefresh) {
      fetchLogs(true);
      setNeedsRefresh(false); // 트리거 초기화
    }
  }, [needsRefresh, fetchLogs]);

  useEffect(() => {
    // 'order_channel'이라는 이름의 채널에 접속합니다.
    const channel = new BroadcastChannel('order_channel');
    console.log("📡 'order_channel' 방송 채널에 접속합니다.");

  // 이 채널에서 메시지가 오면 실행될 함수
  const handleMessage = (event) => {
    if (event.data === 'newOrderCreated') {
      console.log('📢 "newOrderCreated" 신호 수신! 1페이지로 이동하고 새로고침 트리거');
      setPage(1);
      setNeedsRefresh(true); // 🔥 로그 새로고침을 트리거!
    }
  };

  // 메시지 리스너를 등록합니다.
  channel.onmessage = handleMessage;

  // 컴포넌트가 사라질 때 채널 접속을 끊습니다.
  return () => {
    console.log("📡 'order_channel' 방송 채널 접속을 끊습니다.");
    channel.close();
  };
}, []); 
// **🔥**



  const handleSearch = () => { // fetchLogs(true);
    // [수정] 검색 시에도 page 상태만 변경
    setPage(1);
  };
    

  const handleReset = () => {
    setPatientFilter('');
    setDoctorFilter('');
    setTestTypeFilter('');
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    setStartDate(weekAgo.toISOString().slice(0, 10));
    setEndDate(today.toISOString().slice(0, 10));
    setPage(1);
    setNeedsRefresh(true);  // 강제 조회
  };

  const handlePrev = () => page > 1 && setPage(p => p - 1);
  const handleNext = () => {
    const maxPage = Math.ceil(totalCount / pageSize);
    page < maxPage && setPage(p => p + 1);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ko-KR', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (e) {
      return dateString;
    }
  };

  const getStatusClassName = (status) => {
    const statusLower = status?.toLowerCase() || 'unknown';
    return `status-badge status-${statusLower}`;
  };

  return (
    <div className="ocs-log-container">
      <h2 className="ocs-log-title">
        <span role="img" aria-label="log-icon" style={{ marginRight: '10px' }}>📋</span>
        오더 로그 조회
      </h2>

      <div className="ocs-filter-box">
        <div className="filter-group">
          <div className="filter-item">
            <label htmlFor="start-date">시작 날짜</label>
            <input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="filter-item">
            <label htmlFor="end-date">마지막 날짜</label>
            <input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="filter-group">
          <div className="filter-item">
            <label htmlFor="test-type">검사 타입</label>
            <input
              id="test-type"
              type="text"
              placeholder="예: CBC, RFT 등"
              value={testTypeFilter}
              onChange={e => setTestTypeFilter(e.target.value)}
            />
          </div>
        </div>
        <div className="filter-group">
          <div className="filter-item">
            <label htmlFor="patient-id">환자 ID</label>
            <input id="patient-id" type="text" placeholder="환자 UUID 입력" value={patientFilter} onChange={e => setPatientFilter(e.target.value)} />
          </div>
          <div className="filter-item">
            <label htmlFor="doctor-id">의사 ID</label>
            <input id="doctor-id" type="text" placeholder="의사 ID 입력" value={doctorFilter} onChange={e => setDoctorFilter(e.target.value)} />
          </div>
        </div>
        <div className="filter-actions">
          <button className="btn-primary" onClick={handleSearch} disabled={loading}>🔍 검색</button>
          <button className="btn-secondary" onClick={handleReset} disabled={loading}>🔄 초기화</button>
        </div>
      </div>

{/* LIS + 전체 로그 테이블: 기존 logs 출력 테이블 */}
      <div className="ocs-table-container">
        <table className="ocs-log-table">
          <thead>
            <tr>
              <th style={{ width: '6%' }}>No.</th>
              <th style={{ width: '16%' }}>환자 ID</th>
              <th style={{ width: '10%' }}>의사 ID</th>
              <th style={{ width: '10%' }}>검사 타입</th>
              <th style={{ width: '22%' }}>검사 항목</th>
              <th style={{ width: '12%' }}>오더 날짜</th>
              <th style={{ width: '10%' }}>상태</th>
              <th style={{ width: '14%' }}>생성 시각</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="message-cell">로딩 중...</td></tr>
            ) : error ? (
              <tr><td colSpan="8" className="message-cell error">{error}</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="8" className="message-cell">결과가 없습니다.</td></tr>
            ) : (
              logs
                .slice()
                .sort((a, b) => a.order_id - b.order_id)
                .map((log) => (
                  <tr key={log.order_id}>
                    <td>{log.order_id}</td>
                    <td className="id-cell">{log.patient_id}</td>
                    <td>{log.doctor_id}</td>
                    <td>{log.test_type || log.panel}</td>
                    <td className="tests-cell">
                      {Array.isArray(log.tests) ? (
                        log.tests.map((item, index) => (
                          <React.Fragment key={index}>
                            {item}
                            {index !== log.tests.length - 1 && (
                              <>
                                ,{(index + 1) % 3 === 0 && <br />}{" "}
                              </>
                            )}
                          </React.Fragment>
                        ))
                      ) : log.tests}
                    </td>
                    <td>{log.order_date}</td>
                    <td>
                      <span className={getStatusClassName(log.status)}>
                        {log.status}
                      </span>
                    </td>
                    <td>{formatDateTime(log.created_at)}</td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

{/*  RIS 전용 로그 테이블 */}
      <div className="ocs-table-container" style={{ marginTop: '40px' }}>
        <h3>🖼️ 영상의학 검사 로그 (RIS)</h3>
        <table className="ocs-log-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>환자 ID</th>
              <th>의사 ID</th>
              <th>검사 타입</th>
              <th>검사 항목</th>
              <th>오더 날짜</th>
              <th>상태</th>
              <th>생성 시각</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="message-cell">로딩 중...</td></tr>
            ) : error ? (
              <tr><td colSpan="8" className="message-cell error">{error}</td></tr>
            ) : risLogs.length === 0 ? (
              <tr><td colSpan="8" className="message-cell">RIS 관련 로그가 없습니다.</td></tr>
            ) : (
              risLogs.map((log, idx) => (
                <tr key={log.order_id}>
                  <td>{log.order_id}</td>
                  <td className="id-cell">{log.patient_id}</td>
                  <td>{log.doctor_id}</td>
                  <td>{log.test_type}</td>
                  <td className="tests-cell">
                    {Array.isArray(log.tests) ? (
                      log.tests.map((item, i) => (
                        <React.Fragment key={i}>
                          {item}
                          {i !== log.tests.length - 1 && (
                            <>
                              ,{(i + 1) % 3 === 0 && <br />}{" "}
                            </>
                          )}
                        </React.Fragment>
                      ))
                    ) : log.tests}
                  </td>
                  <td>{log.order_date}</td>
                  <td>
                    <span className={getStatusClassName(log.status)}>
                      {log.status}
                    </span>
                  </td>
                  <td>{formatDateTime(log.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

{/* 페이지네이션 */}
      {logs.length > 0 && (
        <div className="ocs-pagination">
          <button onClick={handlePrev} disabled={page === 1 || loading}>
            이전
          </button>
          <span>
            Page {page} / {Math.ceil(totalCount / pageSize)}
          </span>
          <button onClick={handleNext} disabled={page >= Math.ceil(totalCount / pageSize) || loading}>
            다음
          </button>
        </div>
      )}
    </div>
  );
}


// #************************************
// #  오후 2시 9분 OCSLogPage.jsx
// #************************************