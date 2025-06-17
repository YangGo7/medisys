// src/components/EMR/CompletedPatients.jsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckSquare } from 'lucide-react';
import './EmrMainPage.css'; // order-table* 규칙 포함된 공통 CSS

const CompletedPatients = () => {
  const [patients, setPatients] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const API_BASE = process.env.REACT_APP_INTEGRATION_API
    || 'http://35.225.63.41:8000/api/integration/';

  useEffect(() => {
    axios.get(`${API_BASE}completed-patients/`)
      .then(res => setPatients(res.data))
      .catch(err => {
        console.error('❌ 완료 환자 불러오기 실패:', err);
        setError('환자 정보를 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  }, []);

  const resetStatus = (mapping_id) => {
    axios.patch(
      `${API_BASE}patient-mappings/update-status/`,
      { mapping_id, status: 'PENDING' }
    )
    .then(() => axios.get(`${API_BASE}completed-patients/`))
    .then(res => setPatients(res.data))
    .catch(err => {
      console.error('상태 재설정 실패:', err);
      alert('상태 재설정에 실패했습니다.');
    });
  };

  return (
    <div className="page-container-full">
      <div className="card">
        <h2 style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
          <CheckSquare size={20} style={{ marginRight: '0.5rem', color: '#52c41a' }} />
          진료 완료 환자 목록
        </h2>

        {/* 완료 환자 총수 */}
        {!loading && !error && (
          <p style={{ margin: '0 0 1rem', color: '#555' }}>
            총 <strong>{patients.length}</strong>명
          </p>
        )}

        {/* 테이블과 위 텍스트 사이에 여백을 추가 */}
        <div className="order-table-wrapper" style={{ marginTop: '1rem' }}>
          <table className="order-table">
            <thead>
              <tr>
                {[
                  '이름',
                  '환자 ID',
                  '성별',
                  '생년월일',
                  '진료실',
                  '마지막 동기화',
                  '상태',
                  '작업',
                ].map(th => (
                  <th key={th}>{th}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}>불러오는 중...</td></tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} style={{ color: 'red' }}>{error}</td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ color: '#666' }}>데이터가 없습니다.</td>
                </tr>
              ) : (
                patients.map(p => (
                  <tr key={p.mapping_id}>
                    <td>{p.name}</td>
                    <td>{p.patient_identifier}</td>
                    <td>{p.gender === 'M' ? '남성' : p.gender === 'F' ? '여성' : '-'}</td>
                    <td>{p.birthdate || '-'}</td>
                    <td>{p.assigned_room || '-'}</td>
                    <td>{p.last_sync ? new Date(p.last_sync).toLocaleString() : '-'}</td>
                    <td>{p.status}</td>
                    <td>
                      <button
                        onClick={() => resetStatus(p.mapping_id)}
                        className="sample-button"
                      >
                        🔄 재설정
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CompletedPatients;
