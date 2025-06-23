import React, { useState } from 'react'; // useEffect, axios, POLL_INTERVAL_MS 제거
import WaitingRoom from './WaitingRoom';
import axios from 'axios';

// EmrMainPage로부터 필요한 props를 받도록 변경
const PatientWaitingList = ({ onAssignSuccess, onMarkAsComplete, onUnassignFromRoom, waitingList, assignedPatients, onDeleteSuccess }) => {
  // patients state 제거, props로 받은 waitingList를 사용
  // assignedPatients state 제거, props로 받은 assignedPatients를 사용
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('card');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const API_BASE = process.env.REACT_APP_INTEGRATION_API;

  // fetchData 함수 제거 (EmrMainPage에서 모든 환자 데이터를 가져와 props로 전달)
  // useEffect의 폴링 로직 제거

  // 배정 처리: EmrMainPage의 onAssignSuccess 콜백 호출
  const handleAssign = roomNumber => {
    if (!selectedPatient) {
      alert('환자를 먼저 선택해주세요.');
      return;
    }
    // assignedPatients는 props로 받아온 것을 사용
    if (assignedPatients[roomNumber]) {
      alert(`진료실 ${roomNumber}번에 이미 환자가 배정되어 있습니다.`);
      return;
    }
    onAssignSuccess(selectedPatient, roomNumber);
    // 선택 환자 초기화는 EmrMainPage의 onAssignSuccess 완료 후 처리됨
  };

  // 배정 해제: EmrMainPage의 onUnassignFromRoom 콜백 호출
  const unassignFromRoom = roomNumber => {
    const patientToUnassign = assignedPatients[roomNumber];
    if (!patientToUnassign) return;
    onUnassignFromRoom(patientToUnassign, roomNumber);
  };

  // 진료 완료 처리: EmrMainPage의 onMarkAsComplete 콜백 호출
  const markAsComplete = roomNumber => {
    onMarkAsComplete(roomNumber);
  };

  // 삭제 처리: PatientWaitingList 자체에서 API 호출 후 EmrMainPage에 갱신 알림
  const handleDelete = async mappingId => {
    if (!window.confirm('정말로 삭제하시겠습니까?')) return;
    try {
      // 직접 axios 호출
      await axios.delete(`${API_BASE}delete-mapping/${mappingId}/`);
      alert('✅ 환자가 대기 목록에서 삭제되었습니다.');
      setSelectedPatient(null); // 삭제 후 선택 환자 초기화
      onDeleteSuccess(); // EmrMainPage에 데이터 갱신 알림
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('삭제에 실패했습니다: ' + (err.response?.data?.error || err.message));
    }
  };

  // 검색 필터: props로 받은 waitingList를 사용
  const filtered = waitingList.filter(
    p =>
      !searchTerm ||
      (p.name || p.display).toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.patient_identifier.includes(searchTerm)
  );

  // 스타일 오브젝트 (생략 가능)
  const S = {
    container: { display: 'flex', height: '100%', gap: '1rem' },
    leftPanel: { flex: 2, display: 'flex', flexDirection: 'column' },
    rightPanel: { flex: 1, minWidth: '250px' },
    controls: { display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' },
    searchInput: { padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', flex: 1 },
    button: { padding: '0.5rem 1rem', border: '1px solid #007bff', backgroundColor: '#007bff', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },
    toggleButton: active => ({ padding: '0.5rem 1rem', border: '1px solid #007bff', backgroundColor: active ? '#007bff' : 'white', color: active ? 'white' : '#007bff', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }),
    patientList: { flex: 1, overflow: 'auto' },
    cardContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '1rem', padding: '1rem' },
    card: isSel => ({ padding: '1rem', border: isSel ? '2px solid #007bff' : '1px solid #ddd', borderRadius: '8px', backgroundColor: isSel ? '#f0f8ff' : 'white', cursor: 'pointer', transition: 'all 0.2s ease' }),
    cardTitle: { fontSize: '16px', fontWeight: 'bold', marginBottom: '0.5rem', color: '#333' },
    cardInfo: { fontSize: '14px', color: '#666', marginBottom: '0.25rem' },
    loadingMessage: { textAlign: 'center', padding: '2rem', color: '#666' },
    errorMessage: { textAlign: 'center', padding: '2rem', color: '#dc3545', backgroundColor: '#f8d7da', borderRadius: '4px', margin: '1rem' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
    th: { padding: '0.75rem', backgroundColor: '#f8f9fa', border: '1px solid #ddd', textAlign: 'left', fontWeight: 'bold' },
    td: { padding: '0.75rem', border: '1px solid #ddd' },
  };

  // 로딩 상태는 EmrMainPage에서 관리하므로 여기서는 필요 없을 수 있음.
  // if (loading && waitingList.length === 0) {
  //   return <div style={S.loadingMessage}>환자 목록을 불러오는 중...</div>;
  // }

  return (
    <div style={S.container}>
      {/* 좌측: 검색/목록 영역 */}
      <div style={S.leftPanel}>
        <div style={S.controls}>
          <input
            type="text"
            placeholder="환자명 또는 ID로 검색..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={S.searchInput}
          />
          {/* 새로고침 버튼은 EmrMainPage의 폴링으로 대체되었으므로 제거 */}
          <button onClick={() => setViewMode('table')} style={S.toggleButton(viewMode === 'table')}>
            표 보기
          </button>
          <button onClick={() => setViewMode('card')} style={S.toggleButton(viewMode === 'card')}>
            카드 보기
          </button>
        </div>

        {/* error 메시지도 EmrMainPage에서 관리하는 것이 더 좋음 */}
        {/* {error && <div style={S.errorMessage}>⚠️ {error}</div>} */}

        <div style={S.patientList}>
          {viewMode === 'card' ? (
            <div style={S.cardContainer}>
              {filtered.length ? (
                filtered.map(p => {
                  const isSel = selectedPatient?.mapping_id === p.mapping_id;
                  return (
                    <div
                      key={p.mapping_id}
                      style={S.card(isSel)}
                      onClick={() => setSelectedPatient(p)}
                    >
                      <div style={S.cardTitle}>👤 {p.display || p.name}</div>
                      <div style={S.cardInfo}>🆔 {p.patient_identifier}</div>
                      <div style={S.cardInfo}>
                        👥 {p.gender === 'M' ? '남성' : p.gender === 'F' ? '여성' : '-'} | 📅 {p.birthdate}
                      </div>
                      <div style={S.cardInfo}>⏰ 대기시간: {p.waitTime || 0}분</div>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(p.mapping_id); }}
                        style={{
                          marginTop: '0.5rem',
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        ❌ 삭제
                      </button>
                    </div>
                  );
                })
              ) : (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: '#666' }}>
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
                {filtered.length ? (
                  filtered.map(p => {
                    const isSel = selectedPatient?.mapping_id === p.mapping_id;
                    return (
                      <tr
                        key={p.mapping_id}
                        style={{ background: isSel ? '#e1f5e8' : 'transparent', cursor: 'pointer' }}
                        onClick={() => setSelectedPatient(p)}
                      >
                        <td style={S.td}>{p.display || p.name}</td>
                        <td style={S.td}>{p.patient_identifier}</td>
                        <td style={S.td}>{p.birthdate}</td>
                        <td style={S.td}>{p.gender === 'M' ? '남성' : p.gender === 'F' ? '여성' : '-'}</td>
                        <td style={S.td}>{p.waitTime || 0}분</td>
                        <td style={S.td}>
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(p.mapping_id); }}
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            ❌ 삭제
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} style={{ ...S.td, textAlign: 'center', color: '#666' }}>
                      현재 대기 중인 환자가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 우측: 진료실 배정 패널 */}
      <div style={S.rightPanel}>
        <WaitingRoom
          selectedPatient={selectedPatient}
          assignToRoom={handleAssign}
          unassignFromRoom={unassignFromRoom}
          assignedPatients={assignedPatients} // props로 받은 assignedPatients 전달
          markAsComplete={markAsComplete}
        />
      </div>
    </div>
  );
};

export default PatientWaitingList;