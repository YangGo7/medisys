// src/components/EMR/PatientStatusBoard.jsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Stethoscope } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PatientStatusBoard = () => {
  const [patients, setPatients] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const navigate = useNavigate();
  const API_BASE = process.env.REACT_APP_INTEGRATION_API;

  // 1) 대기 환자 목록 가져오기
  const fetchPatients = async () => {
    try {
      const res = await axios.get(`${API_BASE}identifier-waiting/`);
      console.log('💡 identifier-waiting response:', res.data);
      setPatients(res.data);
    } catch (err) {
      console.error('진료 상태 목록 조회 실패', err);
      setError('진료 상태 목록 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  // ✨ 수정: fetchPatients 직접 넘기지 말고 화살표 함수로 래핑
  useEffect(() => {
    fetchPatients();
  }, []);

  // 2) 상태 업데이트
  const updateStatus = async (mapping_id, newStatus) => {
    try {
      await axios.post(
        `${API_BASE}patient-mappings/update-status/`,
        { mapping_id, status: newStatus }
      );
      if (newStatus === 'COMPLETED') {
        navigate('/emr/completed-patients');
      } else {
        fetchPatients();
      }
    } catch (err) {
      console.error('상태 변경 실패:', err);
      alert('상태 변경 실패');
    }
  };

  // 3) API 반환 키(status, current_status, visit_status) 모두 확인
  const renderStatus = (p) => {
    const st = p.status || p.current_status || p.visit_status;
    switch (st) {
      case 'PENDING':     return '⏳ 대기중';
      case 'ASSIGNED':    return '🧍 진료실 배정';
      case 'IN_PROGRESS': return '💉 진료 중';
      case 'COMPLETED':   return '✅ 진료 완료';
      default:            return '❓';
    }
  };

  return (
    <div className="page-container-full">
      <div
        className="card"
        style={{
          background: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          padding: '1.5rem',
        }}
      >
        <h2 style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
          <Stethoscope size={20} style={{ marginRight: '0.5rem', color: '#1890ff' }} />
          진료 진행도
        </h2>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              {['환자명', '환자 ID', '생년월일', '성별', '진료 상태', '작업'].map((th) => (
                <th
                  key={th}
                  style={{
                    textAlign: 'left',
                    padding: '0.75rem',
                    borderBottom: '2px solid #ddd',
                  }}
                >
                  {th}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '1rem', textAlign: 'center' }}>
                  로딩 중...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} style={{ padding: '1rem', textAlign: 'center', color: 'red' }}>
                  {error}
                </td>
              </tr>
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                  데이터가 없습니다.
                </td>
              </tr>
            ) : (
              patients.map((p) => (
                <tr key={p.mapping_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem' }}>{p.display}</td>
                  <td style={{ padding: '0.75rem' }}>{p.patient_identifier}</td>
                  <td style={{ padding: '0.75rem' }}>{p.birthdate || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>
                    {p.gender === 'M' ? '남성' : p.gender === 'F' ? '여성' : '-'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{renderStatus(p)}</td>
                  <td style={{ padding: '0.75rem' }}>
                    {['PENDING', 'ASSIGNED', 'IN_PROGRESS']
                      .includes(p.status || p.current_status || p.visit_status) && (
                      <button
                        onClick={() =>
                          updateStatus(
                            p.mapping_id,
                            getNextStatus(p.status || p.current_status || p.visit_status)
                          )
                        }
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '4px',
                          border: 'none',
                          background: '#1890ff',
                          color: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        ➡️ 다음
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const getNextStatus = (st) => {
  switch (st) {
    case 'PENDING':     return 'ASSIGNED';
    case 'ASSIGNED':    return 'IN_PROGRESS';
    case 'IN_PROGRESS': return 'COMPLETED';
    default:            return 'COMPLETED';
  }
};

export default PatientStatusBoard;
