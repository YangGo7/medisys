// src/components/EMR/PatientWaitingList.jsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import WaitingRoom from './WaitingRoom';

const POLL_INTERVAL_MS = 5000;

const PatientWaitingList = () => {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [assignedPatients, setAssignedPatients] = useState({ 1: null, 2: null });

  const API_BASE = process.env.REACT_APP_INTEGRATION_API
    || 'http://35.225.63.41:8000/api/integration/';

  // 1) 전체 환자(fetch) → waiting vs assigned 분리, 그리고 waiting 중복 제거
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}identifier-waiting/`);
      const all = Array.isArray(res.data) ? res.data : [];

      // 배정 안 된 대기 환자 먼저 걸러내고
      let waiting = all.filter(p => !p.assigned_room);
      // patient_identifier 기준 중복 제거
      waiting = waiting.reduce((acc, p) => {
        if (!acc.find(x => x.patient_identifier === p.patient_identifier)) {
          acc.push(p);
        }
        return acc;
      }, []);

      // assigned room별 데이터
      const assignedData = { 1: null, 2: null };
      all.forEach(p => {
        if (p.assigned_room === 1) assignedData[1] = p;
        if (p.assigned_room === 2) assignedData[2] = p;
      });

      setPatients(waiting);
      setAssignedPatients(assignedData);
    } catch (err) {
      console.error('환자 대기목록 조회 실패:', err);
      setError('목록을 불러오는 중 오류가 발생했습니다.');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  // 2) assign / unassign / complete / delete

  const handleAssign = async (roomNumber) => {
    if (!selectedPatient) {
      alert('환자를 먼저 선택해주세요.');
      return;
    }
    if (assignedPatients[roomNumber]) {
      alert(`진료실 ${roomNumber}번에 이미 환자가 배정되어 있습니다.`);
      return;
    }
    try {
      const res = await axios.post(`${API_BASE}assign-room/`, {
        patientId: selectedPatient.mapping_id,
        room: roomNumber
      });
      if (!res.data.success) throw new Error(res.data.error || '배정 실패');
      setAssignedPatients(prev => ({
        ...prev,
        [roomNumber]: selectedPatient
      }));
      setPatients(prev => prev.filter(p => p.mapping_id !== selectedPatient.mapping_id));
      setSelectedPatient(null);
      setTimeout(fetchData, 500);
      alert(`✅ ${selectedPatient.display || selectedPatient.name}님이 진료실 ${roomNumber}번에 배정되었습니다.`);
    } catch (err) {
      console.error('배정 실패:', err);
      alert('배정 처리에 실패했습니다: ' + (err.response?.data?.error || err.message));
    }
  };

  const unassignFromRoom = async (roomNumber) => {
    if (!assignedPatients[roomNumber]) return;
    try {
      await axios.post(`${API_BASE}unassign-room/`, { room: roomNumber });
      setAssignedPatients(prev => ({ ...prev, [roomNumber]: null }));
      setTimeout(fetchData, 500);
      alert(`✅ 진료실 ${roomNumber}번 배정이 해제되었습니다.`);
    } catch (err) {
      console.error(`배정 해제 실패:`, err);
      alert('배정 해제에 실패했습니다: ' + (err.response?.data?.error || err.message));
    }
  };

  const markAsComplete = async (roomNumber) => {
    if (!assignedPatients[roomNumber]) return;
    try {
      const res = await axios.post(`${API_BASE}complete-visit/`, { room: roomNumber });
      if (!res.data.success) throw new Error(res.data.error || '완료 실패');
      setAssignedPatients(prev => ({ ...prev, [roomNumber]: null }));
      alert(`✅ 진료실 ${roomNumber}번 진료가 완료되었습니다.`);
      fetchData();
    } catch (err) {
      console.error('진료 완료 실패:', err);
      alert('진료 완료 처리에 실패했습니다: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (mappingId) => {
    if (!window.confirm('정말로 삭제하시겠습니까?')) return;
    try {
      await axios.delete(`${API_BASE}delete-mapping/${mappingId}/`);
      fetchData();
      alert('✅ 환자가 대기 목록에서 삭제되었습니다.');
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('삭제에 실패했습니다: ' + (err.response?.data?.error || err.message));
    }
  };

  // 3) lifecycle + polling
  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(iv);
  }, []);

  // 4) 검색 필터
  const filtered = patients.filter(p =>
    !searchTerm ||
    (p.display || p.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patient_identifier.includes(searchTerm)
  );

  // 5) 스타일 (원본 그대로)
  const S = {
    container: { display:'flex', height:'100%', gap:'1rem' },
    leftPanel: { flex:2, display:'flex', flexDirection:'column' },
    rightPanel: { flex:1, minWidth:'250px' },
    controls: { display:'flex', gap:'1rem', marginBottom:'1rem', alignItems:'center', padding:'1rem', backgroundColor:'#f8f9fa', borderRadius:'8px' },
    searchInput: { padding:'0.5rem', border:'1px solid #ddd', borderRadius:'4px', fontSize:'14px', flex:1 },
    button: { padding:'0.5rem 1rem', border:'1px solid #007bff', backgroundColor:'#007bff', color:'white', borderRadius:'4px', cursor:'pointer', fontSize:'14px' },
    toggleButton: active => ({ padding:'0.5rem 1rem', border:'1px solid #007bff', backgroundColor:active?'#007bff':'white', color:active?'white':'#007bff', borderRadius:'4px', cursor:'pointer', fontSize:'14px' }),
    patientList: { flex:1, overflow:'auto' },
    table: { width:'100%', borderCollapse:'collapse', fontSize:'14px' },
    th: { padding:'0.75rem', backgroundColor:'#f8f9fa', border:'1px solid #ddd', textAlign:'left', fontWeight:'bold' },
    td: { padding:'0.75rem', border:'1px solid #ddd' },
    cardContainer: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'1rem', padding:'1rem' },
    card: isSel => ({ padding:'1rem', border:isSel?'2px solid #007bff':'1px solid #ddd', borderRadius:'8px', backgroundColor:isSel?'#f0f8ff':'white', cursor:'pointer', transition:'all 0.2s ease' }),
    cardTitle: { fontSize:'16px', fontWeight:'bold', marginBottom:'0.5rem', color:'#333' },
    cardInfo: { fontSize:'14px', color:'#666', marginBottom:'0.25rem' },
    loadingMessage: { textAlign:'center', padding:'2rem', color:'#666' },
    errorMessage: { textAlign:'center', padding:'2rem', color:'#dc3545', backgroundColor:'#f8d7da', borderRadius:'4px', margin:'1rem' },
  };

  // 6) 렌더링
  if (loading && patients.length === 0) {
    return <div style={S.loadingMessage}>환자 목록을 불러오는 중...</div>;
  }

  return (
    <div style={S.container}>
      <div style={S.leftPanel}>
        {/* 컨트롤 */}
        <div style={S.controls}>
          <input
            type="text"
            placeholder="환자명 또는 ID로 검색..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={S.searchInput}
          />
          <button onClick={fetchData} disabled={loading} style={S.button}>
            {loading ? '새로고침 중...' : '🔄 새로고침'}
          </button>
          <button onClick={() => setViewMode('table')} style={S.toggleButton(viewMode==='table')}>표 보기</button>
          <button onClick={() => setViewMode('card')} style={S.toggleButton(viewMode==='card')}>카드 보기</button>
        </div>

        {error && <div style={S.errorMessage}>⚠️ {error}</div>}

        {/* 환자 목록 */}
        <div style={S.patientList}>
          {viewMode === 'card' ? (
            <div style={S.cardContainer}>
              {filtered.length ? filtered.map(p => {
                const isSel = selectedPatient?.mapping_id === p.mapping_id;
                return (
                  <div
                    key={p.mapping_id}
                    style={S.card(isSel)}
                    onClick={() => setSelectedPatient(p)}
                  >
                    <div style={S.cardTitle}>👤 {p.display||p.name}</div>
                    <div style={S.cardInfo}>🆔 {p.patient_identifier}</div>
                    <div style={S.cardInfo}>👥 {p.gender==='M'?'남성':p.gender==='F'?'여성':'-'} | 📅 {p.birthdate}</div>
                    <div style={S.cardInfo}>⏰ 대기시간: {p.waitTime||0}분</div>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(p.mapping_id); }}
                      style={{
                        marginTop:'0.5rem',
                        padding:'0.25rem 0.5rem',
                        backgroundColor:'#dc3545',
                        color:'white',
                        border:'none',
                        borderRadius:'4px',
                        fontSize:'12px',
                        cursor:'pointer'
                      }}
                    >
                      ❌ 삭제
                    </button>
                  </div>
                );
              }) : (
                <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'2rem', color:'#666' }}>
                  현재 대기 중인 환자가 없습니다.
                </div>
              )}
            </div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>환자명</th>
                  <th style={S.th}>환자 ID</th>
                  <th style={S.th}>생년월일</th>
                  <th style={S.th}>성별</th>
                  <th style={S.th}>대기시간</th>
                  <th style={S.th}>작업</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length ? filtered.map(p => {
                  const isSel = selectedPatient?.mapping_id === p.mapping_id;
                  return (
                    <tr
                      key={p.mapping_id}
                      style={{ background: isSel?'#e1f5e8':'transparent', cursor:'pointer' }}
                      onClick={() => setSelectedPatient(p)}
                    >
                      <td style={S.td}>{p.display||p.name}</td>
                      <td style={S.td}>{p.patient_identifier}</td>
                      <td style={S.td}>{p.birthdate}</td>
                      <td style={S.td}>{p.gender==='M'?'남성':p.gender==='F'?'여성':'-'}</td>
                      <td style={S.td}>{p.waitTime||0}분</td>
                      <td style={S.td}>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(p.mapping_id); }}
                          style={{
                            padding:'0.25rem 0.5rem',
                            backgroundColor:'#dc3545',
                            color:'white',
                            border:'none',
                            borderRadius:'4px',
                            fontSize:'12px',
                            cursor:'pointer'
                          }}
                        >
                          ❌
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={6} style={{ ...S.td, textAlign:'center', color:'#666' }}>
                      현재 대기 중인 환자가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 진료실 배정 패널 */}
      <div style={S.rightPanel}>
        <WaitingRoom
          selectedPatient={selectedPatient}
          assignToRoom={handleAssign}
          unassignFromRoom={unassignFromRoom}
          assignedPatients={assignedPatients}
          markAsComplete={markAsComplete}
        />
      </div>
    </div>
  );
};

export default PatientWaitingList;
