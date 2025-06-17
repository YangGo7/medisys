// src/components/EMR/PatientStatusBoard.jsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Stethoscope } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './EmrMainPage.css'; // 공통 테이블 / 버튼 스타일

const RECEPTION_API      = 'http://35.225.63.41:8000/api/integration/reception-list/';
const UPDATE_STATUS_API  = 'http://35.225.63.41:8000/api/integration/patient-mappings/update-status/';

const PatientStatusBoard = () => {
  const [patients, setPatients] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const navigate = useNavigate();

  // 1) 접수 리스트 가져오기
  const fetchPatients = async () => {
    try {
      const res = await axios.get(RECEPTION_API);
      setPatients(res.data);
    } catch (err) {
      console.error('진료 상태 목록 조회 실패', err);
      setError('진료 상태 목록 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // 2) 상태 업데이트
  const updateStatus = async (mapping_id, newStatus) => {
    try {
      await axios.post(UPDATE_STATUS_API, { mapping_id, status: newStatus });
      if (newStatus === 'COMPLETED') {
        navigate('/emr/completed-patients');
      } else {
        fetchPatients();
      }
    } catch (err) {
      console.error('상태 변경 실패:', err);
      alert('상태 변경에 실패했습니다.');
    }
  };

  // 3) 상태 렌더링
  const renderStatus = (p) => {
    switch (p.status) {
      case 'IN_PROGRESS':
        return '💉 진료 중';
      case 'ASSIGNED':
        return p.assigned_room ? '🧍 진료실 배정' : '🧍 배정 대기';
      case 'PENDING':
        return '⏳ 대기중';
      case 'COMPLETED':
        return '✅ 진료 완료';
      default:
        return '⏳ 대기중';
    }
  };

  // 4) 다음 상태 계산
  const getNextStatus = (st) => {
    switch (st) {
      case 'PENDING':     return 'ASSIGNED';
      case 'ASSIGNED':    return 'IN_PROGRESS';
      case 'IN_PROGRESS': return 'COMPLETED';
      default:            return 'COMPLETED';
    }
  };

  return (
    <div className="page-container-full">
      <div className="card">
        <h2 style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
          <Stethoscope size={20} style={{ marginRight: '0.5rem', color: '#1890ff' }} />
          진료 진행도
        </h2>

        <div className="order-table-wrapper">
          <table className="order-table">
            <thead>
              <tr>
                {['환자명','환자 ID','생년월일','성별','진료 상태','작업'].map(th => (
                  <th key={th}>{th}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6}>로딩 중...</td></tr>
              ) : error ? (
                <tr><td colSpan={6} style={{ color: 'red' }}>{error}</td></tr>
              ) : patients.length === 0 ? (
                <tr><td colSpan={6} style={{ color: '#666' }}>데이터가 없습니다.</td></tr>
              ) : (
                patients.map(p => {
                  const current = p.status || 'PENDING';
                  return (
                    <tr key={p.mapping_id}>
                      <td>{p.display}</td>
                      <td>{p.patient_identifier}</td>
                      <td>{p.birthdate || '-'}</td>
                      <td>{p.gender === 'M' ? '남성' : p.gender === 'F' ? '여성' : '-'}</td>
                      <td>{renderStatus(p)}</td>
                      <td style={{ textAlign: 'center' }}>
                        {['PENDING','ASSIGNED','IN_PROGRESS'].includes(current) && (
                          <button
                            className="status-next-btn"
                            onClick={() => updateStatus(p.mapping_id, getNextStatus(current))}
                            title="다음 단계로"
                          >
                            ➡️
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PatientStatusBoard;
