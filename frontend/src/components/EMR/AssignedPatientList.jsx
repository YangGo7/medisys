// src/components/EMR/AssignedPatientList.jsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';

// searchTerm prop을 받도록 수정
const AssignedPatientList = ({ onPatientSelect, selectedPatient, refreshTrigger, searchTerm }) => {
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // const [searchTerm, setSearchTerm] = useState(''); // 이 줄은 제거하거나 주석 처리!
  const API_BASE = process.env.REACT_APP_INTEGRATION_API;

  const fetchAssigned = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}identifier-waiting/`);
      const unique = res.data
        .filter(p => p.assigned_room) // 이미 배정된 환자만 필터링
        .reduce((acc, p) => {
          const key = p.openmrs_patient_uuid || p.uuid;
          if (!acc.find(x => (x.openmrs_patient_uuid || x.uuid) === key)) {
            acc.push(p);
          }
          return acc;
        }, []);
      setAssignedPatients(unique);
      setError(null);
    } catch (err) {
      setError('배정된 환자 목록을 불러오는 중 오류가 발생했습니다.');
      setAssignedPatients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssigned();
  }, []);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchAssigned();
    }
  }, [refreshTrigger]);

  const handleUnassign = async (p) => {
    try {
      await axios.post(`${API_BASE}unassign-room/`, {
        patient_id: p.mapping_id || p.id,
        room: p.assigned_room
      });
      fetchAssigned(); // 해제 후 목록 새로고침
    } catch (err) {
      console.error('배정 해제 실패:', err);
      alert('배정 해제에 실패했습니다.');
    }
  };

  const handleClick = (p) => {
    const uuid = p.openmrs_patient_uuid || p.uuid;
    const formatted = {
      uuid,
      mapping_id: p.mapping_id,
      display: p.display || p.name,
      assigned_room: p.assigned_room,
      person: { age: p.age, gender: p.gender, birthdate: p.birthdate },
      identifiers: [{
        identifier: p.patient_identifier,
        identifierType: 'OpenMRS ID',
        preferred: true
      }],
      ...p
    };
    onPatientSelect(formatted);
  };

  // prop으로 받은 searchTerm을 사용하여 필터링
  const filteredPatients = assignedPatients.filter(patient => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const matchesName = (patient.display || patient.name || '').toLowerCase().includes(lowerCaseSearchTerm);
    const matchesId = (patient.patient_identifier || '').toLowerCase().includes(lowerCaseSearchTerm);
    return matchesName || matchesId;
  });

  if (loading && assignedPatients.length === 0) {
    return <div style={{ padding: 16 }}>배정된 환자 목록을 불러오는 중...</div>;
  }

  return (
    <div style={{ padding: 8, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {error && <div style={{ color: 'red', marginBottom: 8 }}>⚠️ {error}</div>}

      {/* 검색 입력 필드는 EmrMainPage.jsx로 이동했으므로 이 부분 제거 */}
      {/* <input
        type="text"
        placeholder="이름 또는 ID로 검색..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          marginBottom: '12px',
          padding: '8px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '14px',
        }}
      /> */}

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))',
          gap: 8,
          border: '1px solid #eee', // 전체 검색과 구분되도록 테두리 추가
          borderRadius: '8px',
          padding: '8px',
          minHeight: '200px' // 최소 높이 설정
        }}
      >
        {filteredPatients.length === 0
          ? <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#666', padding: '20px' }}>
              {searchTerm ? '검색 결과가 없습니다.' : '현재 배정된 환자가 없습니다.'}
            </div>
          : filteredPatients.map(p => {
              const uuid = p.openmrs_patient_uuid || p.uuid;
              const isSel = selectedPatient?.uuid === uuid;
              return (
                <div
                  key={uuid}
                  onClick={() => handleClick(p)}
                  style={{
                    border: isSel ? '2px solid #1976d2' : '1px solid #ccc',
                    borderRadius: 4,
                    padding: 8,
                    cursor: 'pointer',
                    background: isSel ? '#e3f2fd' : '#fff',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    fontSize: 10,
                    background: '#1976d2',
                    color: '#fff',
                    borderRadius: 4,
                    padding: '2px 4px'
                  }}>
                    {p.assigned_room}번
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>👤 {p.display || p.name}</div>
                  <div style={{ fontSize: 12, color: '#555' }}>🆔 {p.patient_identifier}</div>
                  <div style={{ fontSize: 12, color: '#555' }}>
                    👥 {p.gender === 'M' ? '남성' : '여성'} | 🎂 {p.age}세
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleUnassign(p); }}
                    style={{
                      marginTop: 8,
                      padding: '4px 6px',
                      background: '#f44336',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    ❌ 해제
                  </button>
                </div>
              );
            })
        }
      </div>
    </div>
  );
};

export default AssignedPatientList;