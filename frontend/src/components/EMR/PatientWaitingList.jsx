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

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${process.env.REACT_APP_INTEGRATION_API}identifier-waiting/`);
      setPatients(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('환자 대기목록 조회 실패:', err);
      setError('목록을 불러오는 중 오류가 발생했습니다.');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (roomNumber) => {
  if (!selectedPatient) return;
  try {
    await axios.post(
      `${process.env.REACT_APP_INTEGRATION_API}assign-room/`,
      {
        patientId: selectedPatient.mapping_id,  // 🔧 여기만 고치면 됩니다.
        room: roomNumber
      }
    );
    setAssignedPatients(prev => ({ ...prev, [roomNumber]: selectedPatient }));
    setSelectedPatient(null);
    fetchData();
  } catch (err) {
    console.error('배정 실패:', err);
    alert('배정 처리에 실패했습니다.');
  }
};


  const unassignFromRoom = (roomNumber) => {
    setAssignedPatients(prev => ({ ...prev, [roomNumber]: null }));
  };

  const handleDelete = async (mappingId) => {
    try {
      await axios.delete(`${process.env.REACT_APP_INTEGRATION_API}delete-mapping/${mappingId}/`);
      await fetchData();  // 삭제 후 목록 갱신
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('삭제에 실패했습니다.');
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const filtered = patients.filter(p =>
    (p.name || p.display || '').includes(searchTerm) ||
    (p.patient_identifier || '').includes(searchTerm)
  );

  const S = {
    container: { display: 'flex', fontFamily: 'Arial, sans-serif' },
    leftPanel: { flex: 3, padding: 20 },
    rightPanel: { flex: 1, borderLeft: '1px solid #ccc', padding: 20 },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: '1.8rem', color: '#333' },
    controls: { display: 'flex', gap: 8, marginBottom: 20 },
    button: { padding: '8px 16px', border: 'none', borderRadius: 4, cursor: 'pointer', minWidth: 80 },
    activeBtn: { background: '#4a90e2', color: '#fff' },
    inactiveBtn: { background: '#f0f0f0', color: '#333' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 },
    card: {
      position: 'relative',
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
      padding: 16,
      cursor: 'pointer',
      border: '2px solid transparent'
    },
    selectedCard: { border: '2px solid #27ae60' },
    cardHeader: { marginBottom: 12 },
    cardBody: { fontSize: '0.9rem', lineHeight: 1.4, marginBottom: 12 },
    noData: { textAlign: 'center', color: '#666', padding: 20, gridColumn: '1 / -1' },
    deleteBtn: {
      position: 'absolute',
      top: 6,
      right: 6,
      background: 'none',
      border: 'none',
      color: '#e74c3c',
      fontSize: '1.2rem',
      fontWeight: 'bold',
      cursor: 'pointer'
    }
  };

  return (
    <div style={S.container}>
      <div style={S.leftPanel}>
        <div style={S.header}>
          <div style={S.title}>⏳ 환자 대기 목록</div>
          <div>
            <button style={{ ...S.button, ...(viewMode === 'card' ? S.activeBtn : S.inactiveBtn) }} onClick={() => setViewMode('card')}>카드 뷰</button>
            <button style={{ ...S.button, ...(viewMode === 'table' ? S.activeBtn : S.inactiveBtn) }} onClick={() => setViewMode('table')}>테이블 뷰</button>
          </div>
        </div>

        <div style={S.controls}>
          <input
            type="text"
            placeholder="환자명 또는 ID 검색"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: 8, flex: 1, border: '1px solid #ccc', borderRadius: 4 }}
          />
        </div>

        {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}

        {viewMode === 'card' ? (
          <div style={S.grid}>
            {filtered.length > 0 ? filtered.map(p => (
              <div
                key={p.mapping_id || p.patient_identifier}
                style={{
                  ...S.card,
                  ...(selectedPatient?.patient_identifier === p.patient_identifier ? S.selectedCard : {})
                }}
                onClick={() => setSelectedPatient(p)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('정말 삭제하시겠습니까?')) {
                      handleDelete(p.mapping_id);
                    }
                  }}
                  style={S.deleteBtn}
                  title="삭제"
                >
                  ×
                </button>

                <div style={S.cardHeader}>
                  <strong>{p.display || '이름 없음'}</strong>
                  <div style={{ color: '#888' }}>{p.patient_identifier}</div>

                </div>
                <div style={S.cardBody}>
                  <div>생년월일: {p.birthdate || '-'}</div>
                  <div>성별: {p.gender || '-'}</div>
                  <div>대기시간: {p.waitTime || '-'}분</div>
                </div>
              </div>
            )) : (
              <div style={S.noData}>현재 대기 중인 환자가 없습니다.</div>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>환자명</th>
                <th>ID</th>
                <th>생년월일</th>
                <th>성별</th>
                <th>대기시간</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(p => (
                <tr
                  key={p.mapping_id || p.patient_identifier}
                  style={{ background: selectedPatient?.patient_identifier === p.patient_identifier ? '#e1f5e8' : 'transparent', cursor: 'pointer' }}
                  onClick={() => setSelectedPatient(p)}
                >
                  <td>{p.name || p.display || '-'}</td>
                  <td>{p.patient_identifier || '-'}</td>
                  <td>{p.birthdate || '-'}</td>
                  <td>{p.gender || '-'}</td>
                  <td>{p.waitTime || '-'}</td>
                </tr>
              )) : (
                <tr><td colSpan={5}>현재 대기 중인 환자가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div style={S.rightPanel}>
        <WaitingRoom
          selectedPatient={selectedPatient}
          assignToRoom={handleAssign}
          unassignFromRoom={unassignFromRoom}
          assignedPatients={assignedPatients}
        />
      </div>
    </div>
  );
};

export default PatientWaitingList;
