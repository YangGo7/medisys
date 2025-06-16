// src/components/EMR/ReceptionPanel.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const OPENMRS_API_MASTER = 'http://35.225.63.41:8000/api/integration/openmrs-patients/';
const RECEPTION_API      = 'http://35.225.63.41:8000/api/integration/identifier-waiting/';   // 올바른 URL
const MAPPING_API        = 'http://35.225.63.41:8000/api/integration/identifier-based/';

const ReceptionPanel = () => {
  const [query, setQuery]                   = useState('');
  const [patientsMaster, setPatientsMaster] = useState([]);
  const [suggestions, setSuggestions]       = useState([]);
  const [receptionList, setReceptionList]   = useState([]);

  // 1) 대시보드 환자 전체 목록
  useEffect(() => {
    axios.get(OPENMRS_API_MASTER)
      .then(res => setPatientsMaster(res.data))
      .catch(err => console.error('환자 목록 불러오기 실패', err));
  }, []);

  // 2) 이미 접수된 목록
  useEffect(() => {
    axios.get(RECEPTION_API)
      .then(res => setReceptionList(res.data))
      .catch(err => {
        console.error('접수 목록 불러오기 실패', err);
        setReceptionList([]);  // 빈 배열로 폴백
      });
  }, []);

  // 3) 입력값으로 필터링
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setSuggestions([]);
    } else {
      setSuggestions(
        patientsMaster.filter(p =>
          p.display.toLowerCase().includes(q) ||
          p.identifiers?.[0]?.identifier?.toLowerCase().includes(q)
        )
      );
    }
  }, [query, patientsMaster]);

  // 4) 접수 처리
  const handleReception = async (patientRow = null) => {
    let patient = patientRow;
    if (!patient) {
      patient = patientsMaster.find(p => p.display === query.trim());
      if (!patient) {
        alert('환자 이름을 목록에서 클릭하거나 정확히 입력해주세요.');
        return;
      }
    }

    const id = patient.identifiers?.[0]?.identifier;
    if (receptionList.some(r => r.patient_identifier === id)) {
      alert('이미 접수된 환자입니다.');
      return;
    }

    try {
      const res = await axios.post(MAPPING_API, {
        openmrs_patient_uuid: patient.uuid,
        patient_identifier:   id
      });
      if (!res.data.success) throw new Error(res.data.error || '매핑 실패');

      const newEntry = {
        display:            patient.display,
        patient_identifier: id,
        status:             '대기 중',
        timestamp:          new Date(),
      };
      setReceptionList(prev => [...prev, newEntry]);
      setQuery('');
      setSuggestions([]);
      alert(`✅ ${patient.display} 환자 접수가 완료되었습니다.`);
    } catch (err) {
      console.error('접수 실패', err);
      alert(`접수 실패: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2>📝 환자 접수</h2>

      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="환자 이름 또는 ID 입력"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ padding: '0.5rem', width: '300px', marginRight: '0.5rem' }}
        />
        <button
          onClick={() => handleReception()}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            border: '1px solid #1890ff',
            background: '#fff',
            cursor: 'pointer'
          }}
        >
          접수하기
        </button>
      </div>

      {suggestions.length > 0 && (
        <ul style={{
          border: '1px solid #ccc',
          maxWidth: '300px',
          background: '#fff',
          padding: 0,
          margin: 0,
          listStyle: 'none'
        }}>
          {suggestions.map(p => (
            <li
              key={p.uuid}
              onClick={() => setQuery(p.display)}
              style={{
                padding: '0.5rem',
                borderBottom: '1px solid #eee',
                cursor: 'pointer'
              }}
            >
              {p.display} ({p.identifiers?.[0]?.identifier})
            </li>
          ))}
        </ul>
      )}

      <hr />

      <h3>환자 목록 (OpenMRS 연동)</h3>
      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>식별자</th>
            <th>이름</th>
            <th>성별</th>
            <th>생년월일</th>
            <th>UUID</th>
            <th>대기 등록</th>
          </tr>
        </thead>
        <tbody>
          {patientsMaster.map(p => {
            const id = p.identifiers?.[0]?.identifier || '-';
            const disabled = receptionList.some(r => r.patient_identifier === id);
            return (
              <tr key={p.uuid}>
                <td>{id}</td>
                <td>{p.display}</td>
                <td>
                  {p.person?.gender === 'M' ? '남성'
                   : p.person?.gender === 'F' ? '여성'
                   : '-'}
                </td>
                <td>
                  {p.person?.birthdate
                    ? new Date(p.person.birthdate).toLocaleDateString()
                    : '-'}
                </td>
                <td>{p.uuid}</td>
                <td>
                  <button
                    onClick={() => !disabled && handleReception(p)}
                    disabled={disabled}
                    style={{
                      padding: '0.4rem 0.8rem',
                      borderRadius: '4px',
                      border: 'none',
                      background: disabled ? '#ccc' : '#52c41a',
                      color: disabled ? '#666' : '#fff',
                      cursor: disabled ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {disabled ? '등록됨' : '대기 등록'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <hr />

      <h3>접수된 환자 목록 ({receptionList.length}명)</h3>
      {receptionList.length === 0 ? (
        <p>아직 접수된 환자가 없습니다.</p>
      ) : (
        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>환자식별자</th>
              <th>이름</th>
              <th>상태</th>
              <th>접수 시각</th>
            </tr>
          </thead>
          <tbody>
            {receptionList.map(r => (
              <tr key={r.patient_identifier}>
                <td>{r.patient_identifier}</td>
                <td>{r.display}</td>
                <td>{r.status}</td>
                <td>
                  {r.timestamp
                    ? new Date(r.timestamp).toLocaleTimeString()
                    : '-'}
                  </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ReceptionPanel;
