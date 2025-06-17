// src/components/EMR/ReceptionPanel.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EmrMainPage.css'; // 공통 테이블 스타일 로드

const OPENMRS_API_MASTER = 'http://35.225.63.41:8000/api/integration/openmrs-patients/';
const RECEPTION_API = 'http://35.225.63.41:8000/api/integration/reception-list/';
const MAPPING_API        = 'http://35.225.63.41:8000/api/integration/identifier-based/';

const ReceptionPanel = () => {
  const [query, setQuery]                   = useState('');
  const [patientsMaster, setPatientsMaster] = useState([]);
  const [suggestions, setSuggestions]       = useState([]);
  const [receptionList, setReceptionList]   = useState([]);

  // 1) 전체 환자 & 이미 접수된 환자 목록
  useEffect(() => {
    axios.get(OPENMRS_API_MASTER)
      .then(res => setPatientsMaster(res.data))
      .catch(err => console.error('환자 목록 불러오기 실패', err));

    axios.get(RECEPTION_API)
      .then(res => {
        // 서버 원본에 status, created_at 있다고 가정
        const list = res.data.map(item => ({
          ...item,
          status: 
            item.status === 'PENDING'     ? '대기 중' :
            item.status === 'ASSIGNED'    ? '배정 완료' :
            item.status === 'IN_PROGRESS' ? '진료 중' :
            item.status === 'COMPLETED'   ? '진료 완료' :
            item.status,
          timestamp: item.created_at
        }));
        setReceptionList(list);
      })
      .catch(err => console.error('접수 목록 불러오기 실패', err));
  }, []);

  // 2) 자동완성 제안
  useEffect(() => {
    const q = query.trim().toLowerCase();
    setSuggestions(
      q
        ? patientsMaster.filter(p =>
            p.display.toLowerCase().includes(q) ||
            p.identifiers?.[0]?.identifier.includes(q)
          )
        : []
    );
  }, [query, patientsMaster]);

  // 3) 접수 처리
  const handleReception = async (patientRow = null) => {
    const patient = patientRow || patientsMaster.find(p => p.display === query.trim());
    if (!patient) {
      return alert('환자 이름을 목록에서 클릭하거나 정확히 입력해주세요.');
    }
    const id = patient.identifiers?.[0]?.identifier;
    if (receptionList.some(r => r.patient_identifier === id)) {
      return alert('이미 접수된 환자입니다.');
    }
    try {
      const res = await axios.post(MAPPING_API, {
        openmrs_patient_uuid: patient.uuid,
        patient_identifier:   id
      });
      if (!res.data.success) throw new Error(res.data.error || '매핑 실패');

      // 로컬에도 추가 (방금 매핑된 시각을 사용)
      setReceptionList(prev => [
        ...prev,
        {
          ...res.data,           // mapping_id 등 원본 필드
          display: patient.display,
          patient_identifier: id,
          status: '대기 중',
          timestamp: new Date().toISOString()
        }
      ]);
      setQuery('');
      setSuggestions([]);
      alert(`✅ ${patient.display} 환자가 대기 목록에 추가되었습니다.`);
    } catch (err) {
      console.error('접수 실패', err);
      alert(`접수 실패: ${err.message}`);
    }
  };

  return (
    <div className="page-container-full">
      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>📝 환자 접수</h2>

        {/* 검색 & 접수 */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input
            style={{ flex: '1 0 300px', padding: '0.5rem' }}
            type="text"
            placeholder="환자 이름 또는 ID 입력"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button
            onClick={handleReception}
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

        {/* 자동완성 */}
        {suggestions.length > 0 && (
          <ul style={{
            border: '1px solid #ccc',
            maxWidth: 300,
            margin: '0 0 1.5rem',
            padding: 0,
            listStyle: 'none',
            background: '#fff'
          }}>
            {suggestions.map(p => (
              <li
                key={p.uuid}
                onClick={() => setQuery(p.display)}
                style={{ padding: '0.5rem', borderBottom: '1px solid #eee', cursor: 'pointer' }}
              >
                {p.display} ({p.identifiers?.[0]?.identifier})
              </li>
            ))}
          </ul>
        )}

        {/* 전체 환자 테이블 */}
        <h3 style={{ marginBottom: '1rem' }}>환자 목록 (OpenMRS 연동)</h3>
        <div className="order-table-wrapper">
          <table className="order-table">
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
                    <td>{p.person?.gender === 'M' ? '남성' : p.person?.gender === 'F' ? '여성' : '-'}</td>
                    <td>{p.person?.birthdate ? new Date(p.person.birthdate).toLocaleDateString() : '-'}</td>
                    <td>{p.uuid}</td>
                    <td>
                      <button
                        onClick={() => !disabled && handleReception(p)}
                        disabled={disabled}
                        style={{
                          padding: '0.3rem 0.6rem',
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
        </div>

        {/* 접수된 환자 테이블 */}
        <h3 style={{ margin: '1rem 0' }}>
          접수된 환자 목록 ({receptionList.length}명)
        </h3>
        <div className="order-table-wrapper">
          <table className="order-table">
            <thead>
              <tr>
                <th>환자 식별자</th>
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
        </div>

      </div>
    </div>
  );
};

export default ReceptionPanel;
