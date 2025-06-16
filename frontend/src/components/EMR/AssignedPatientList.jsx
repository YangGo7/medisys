// src/components/EMR/AssignedPatientList.jsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AssignedPatientList = ({ onPatientSelect, selectedPatient, refreshTrigger }) => {
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE = process.env.REACT_APP_INTEGRATION_API
    || 'http://35.225.63.41:8000/api/integration/';

  // 배정 환자 조회 & uuid 기준 중복 제거
  const fetchAssignedPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}identifier-waiting/`);
      let all = Array.isArray(res.data) ? res.data : [];
      all = all.filter(p => p.assigned_room);
      const unique = all.reduce((acc, p) => {
        const key = p.openmrs_patient_uuid || p.uuid;
        if (!acc.find(x => (x.openmrs_patient_uuid || x.uuid) === key)) {
          acc.push(p);
        }
        return acc;
      }, []);
      setAssignedPatients(unique);
    } catch (err) {
      console.error('❌ 배정된 환자 목록 조회 실패:', err);
      setError('배정된 환자 목록을 불러오는데 실패했습니다.');
      setAssignedPatients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedPatients();
    const iv = setInterval(fetchAssignedPatients, 10000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchAssignedPatients();
    }
  }, [refreshTrigger]);

  // 환자 클릭 시 부모에게 포맷된 데이터 전달
  const handlePatientClick = (p) => {
    const formatted = {
      uuid: p.openmrs_patient_uuid || p.uuid,
      mapping_id: p.mapping_id,
      patient_identifier: p.patient_identifier,
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

  // ─── 스타일 정의 ─────────────────────────────────────────
  const containerStyle = {
    padding: '0.5rem',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f8f9fa'
  };
  const headerStyle = {
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#333',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  };
  const refreshButtonStyle = {
    padding: '6px 10px',
    fontSize: '11px',
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  };
  const listContainerStyle = {
    flex: 1,
    overflowY: 'auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '6px',
    padding: '4px'
  };
  const emptyStateStyle = {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '40px 20px',
    color: '#999'
  };
  const errorStyle = {
    padding: '10px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    border: '1px solid #ffcdd2',
    borderRadius: '4px',
    fontSize: '12px',
    marginBottom: '12px'
  };
  const patientCardStyle = (isSelected) => ({
    backgroundColor: isSelected ? '#e3f2fd' : '#fff',
    border: isSelected ? '2px solid #2196f3' : '1px solid #ddd',
    borderRadius: '4px',
    padding: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: isSelected
      ? '0 2px 8px rgba(33,150,243,0.3)'
      : '0 1px 3px rgba(0,0,0,0.1)',
    position: 'relative',
    minHeight: '80px'
  });
  const roomBadgeStyle = (roomNumber) => ({
    position: 'absolute',
    top: '4px',
    right: '4px',
    padding: '2px 4px',
    borderRadius: '8px',
    fontSize: '9px',
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: roomNumber === 1 ? '#4caf50' : '#2196f3'
  });
  const patientNameStyle = {
    fontSize: '12px',
    fontWeight: 'bold',
    marginBottom: '4px',
    color: '#333',
    lineHeight: '1.2'
  };
  const patientInfoStyle = {
    fontSize: '10px',
    color: '#666',
    marginBottom: '2px',
    lineHeight: '1.1'
  };

  // ─── 렌더링 ───────────────────────────────────────────────
  if (loading && assignedPatients.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={{ ...headerStyle, justifyContent: 'center' }}>
          🔄 배정된 환자 목록을 불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <span>🧑‍⚕️ 진료실 배정된 환자 ({assignedPatients.length}명)</span>
        <button
          onClick={fetchAssignedPatients}
          style={refreshButtonStyle}
          disabled={loading}
          onMouseEnter={e => e.target.style.backgroundColor = '#1976d2'}
          onMouseLeave={e => e.target.style.backgroundColor = '#2196f3'}
        >
          {loading ? '⏳' : '🔄'}
        </button>
      </div>

      {error && <div style={errorStyle}>⚠️ {error}</div>}

      <div style={listContainerStyle}>
        {assignedPatients.length === 0 ? (
          <div key="empty" style={emptyStateStyle}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏥</div>
            <div style={{ fontSize: '16px', marginBottom: '6px' }}>
              현재 배정된 환자가 없습니다
            </div>
            <div style={{ fontSize: '12px', color: '#ccc' }}>
              대기 목록에서 환자를 진료실에 배정해주세요
            </div>
          </div>
        ) : (
          assignedPatients.map(p => {
            const uuid = p.openmrs_patient_uuid || p.uuid;
            const isSel = selectedPatient?.uuid === uuid;
            return (
              <div
                key={uuid}
                onClick={() => handlePatientClick(p)}
                style={patientCardStyle(isSel)}
              >
                <div style={roomBadgeStyle(p.assigned_room)}>
                  {p.assigned_room}번
                </div>
                <div style={patientNameStyle}>
                  👤 {p.display || p.name || p.patient_identifier}
                </div>
                <div style={patientInfoStyle}>🆔 {p.patient_identifier}</div>
                <div style={patientInfoStyle}>
                  👥 {p.gender === 'M' ? '남성' : p.gender === 'F' ? '여성' : '-'} | 🎂 {p.age || '-'}세
                </div>
                {p.waitTime > 0 && (
                  <div style={patientInfoStyle}>⏰ 대기: {p.waitTime}분</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AssignedPatientList;
