// src/components/EMR/CompletedPatients.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckSquare } from 'lucide-react';

const CompletedPatients = () => {
  const [patients, setPatients] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // 완료 목록 불러오기
  const fetchCompleted = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_INTEGRATION_API}completed-patients/`
      );
      setPatients(res.data);
    } catch (err) {
      console.error('❌ 완료 환자 불러오기 실패:', err);
      setError('환자 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 상태 재설정 (예: 다시 PENDING 으로)
  const updateStatus = async (mapping_id, newStatus) => {
    try {
      await axios.patch(
        `${process.env.REACT_APP_INTEGRATION_API}patient-mappings/update-status/`,
        { mapping_id, status: newStatus }
      );
      fetchCompleted();  // 리스트 갱신
    } catch (err) {
      console.error('상태 재설정 실패:', err);
      alert('상태 재설정에 실패했습니다.');
    }
  };

  useEffect(() => {
    fetchCompleted();
  }, []);

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

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              {[
                '이름',
                '환자 ID',
                '성별',
                '생년월일',
                '진료실',
                '마지막 동기화',
                '상태',
                '작업',          // 새 컬럼
              ].map(th => (
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
                <td colSpan={8} style={{ padding: '1rem', textAlign: 'center' }}>
                  불러오는 중...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} style={{ padding: '1rem', textAlign: 'center', color: 'red' }}>
                  {error}
                </td>
              </tr>
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                  데이터가 없습니다.
                </td>
              </tr>
            ) : (
              patients.map((p, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem' }}>{p.name}</td>
                  <td style={{ padding: '0.75rem' }}>{p.patient_identifier}</td>
                  <td style={{ padding: '0.75rem' }}>{p.gender}</td>
                  <td style={{ padding: '0.75rem' }}>{p.birthdate}</td>
                  <td style={{ padding: '0.75rem' }}>{p.assigned_room || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>
                    {p.last_sync ? new Date(p.last_sync).toLocaleString() : '-'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{p.status}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <button
                      onClick={() => updateStatus(p.mapping_id, 'PENDING')}
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '4px',
                        border: 'none',
                        background: '#faad14',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
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
  );
};

export default CompletedPatients;
