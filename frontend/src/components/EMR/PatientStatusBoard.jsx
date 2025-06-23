// src/components/EMR/PatientStatusBoard.jsx (수정된 전체 코드)

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Stethoscope, Edit2, Save, X } from 'lucide-react';
import './EmrMainPage.css'; // 공통 테이블 / 버튼 스타일

const RECEPTION_API = 'http://35.225.63.41:8000/api/integration/reception-list/';
const API_BASE = process.env.REACT_APP_INTEGRATION_API || 'http://35.225.63.41:8000/api/integration/';

const PatientStatusBoard = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null); // 편집 중인 환자
  const [selectedStatus, setSelectedStatus] = useState(''); // 선택된 상태

  // 1) 환자 목록 가져오기 및 주기적 갱신
  const fetchPatients = async () => {
    try {
      const res = await axios.get(RECEPTION_API);
      setPatients(res.data);
    } catch (err) {
      console.error('진료 진행도 목록 조회 실패', err);
      setError('진료 진행도 목록 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients(); // 컴포넌트 마운트 시 최초 로드

    // 5초마다 데이터를 갱신하여 진료 상태 변화를 반영
    const interval = setInterval(fetchPatients, 5000);
    return () => clearInterval(interval); // 컴포넌트 언마운트 시 인터벌 해제
  }, []); // 빈 의존성 배열로 마운트 시 한 번만 설정되도록

  // 2) 상태 업데이트 함수
  const updatePatientStatus = async (mappingId, newStatus, patientData) => {
    try {
      // 진료 완료 시 특별 처리
      if (newStatus === 'complete') {
        // 진료실 배정이 있다면 완료 처리 (배정 해제 포함)
        if (patientData.assigned_room) {
          const completeResponse = await axios.post(`${API_BASE}complete-visit/`, {
            room: patientData.assigned_room
          });
          
          if (!completeResponse.data.success) {
            throw new Error(completeResponse.data.error || '진료 완료 처리 실패');
          }
        } else {
          // 배정된 진료실이 없다면 상태만 업데이트
          const statusResponse = await axios.patch(`${API_BASE}update-patient-status/`, {
            mapping_id: mappingId,
            status: newStatus
          });
          
          if (!statusResponse.data.success) {
            throw new Error(statusResponse.data.error || '상태 업데이트 실패');
          }
        }
      } else {
        // 일반적인 상태 업데이트
        const response = await axios.patch(`${API_BASE}update-patient-status/`, {
          mapping_id: mappingId,
          status: newStatus
        });
        
        if (!response.data.success) {
          throw new Error(response.data.error || '상태 업데이트 실패');
        }
      }

      // 성공 메시지
      const statusText = getStatusText(newStatus);
      alert(`✅ ${patientData.display}님의 상태가 '${statusText}'(으)로 변경되었습니다.`);
      
      // 편집 모드 종료
      setEditingPatient(null);
      setSelectedStatus('');
      
      // 데이터 새로고침
      fetchPatients();
      
    } catch (err) {
      console.error('상태 업데이트 실패:', err);
      alert(`❌ 상태 업데이트에 실패했습니다: ${err.message}`);
    }
  };

  // 3) 진료 상태 텍스트 렌더링
  const renderStatus = (p) => {
    // PatientMapping 모델의 status 필드 값 (waiting, in_progress, complete)에 따라 렌더링
    // assigned_room 정보가 있다면 'waiting' 상태를 더 세분화할 수 있습니다.
    switch (p.status) {
      case 'in_progress':
        return '💉 진료 중';
      case 'waiting':
        // assigned_room이 null이 아니면 '진료실 배정', 그렇지 않으면 '대기중'
        return p.assigned_room ? `🧍 진료실 ${p.assigned_room}번 배정` : '⏳ 대기중';
      case 'complete':
        return '✅ 진료 완료';
      default:
        // 백엔드에서 예상치 못한 status 값을 보낼 경우
        return `❓ ${p.status || '알 수 없음'}`;
    }
  };

  // 4) 상태 텍스트 변환 함수
  const getStatusText = (status) => {
    switch (status) {
      case 'waiting': return '대기중';
      case 'in_progress': return '진료 중';
      case 'complete': return '진료 완료';
      default: return status;
    }
  };

  // 5) 편집 시작
  const startEditing = (patient) => {
    setEditingPatient(patient.mapping_id);
    setSelectedStatus(patient.status);
  };

  // 6) 편집 취소
  const cancelEditing = () => {
    setEditingPatient(null);
    setSelectedStatus('');
  };

  // 7) 상태 저장
  const saveStatus = (patient) => {
    if (selectedStatus && selectedStatus !== patient.status) {
      // 진료 완료로 변경 시 확인
      if (selectedStatus === 'complete') {
        const confirmMessage = patient.assigned_room 
          ? `${patient.display}님의 진료를 완료하고 진료실 ${patient.assigned_room}번 배정을 해제하시겠습니까?`
          : `${patient.display}님의 진료를 완료하시겠습니까?`;
        
        if (!window.confirm(confirmMessage)) {
          return;
        }
      }
      
      updatePatientStatus(patient.mapping_id, selectedStatus, patient);
    } else {
      cancelEditing();
    }
  };

  // 8) 가능한 다음 상태 계산
  const getAvailableStatuses = (currentStatus, assignedRoom) => {
    const statuses = [];
    
    switch (currentStatus) {
      case 'waiting':
        if (assignedRoom) {
          statuses.push({ value: 'in_progress', label: '💉 진료 중' });
        }
        statuses.push({ value: 'complete', label: '✅ 진료 완료' });
        break;
      case 'in_progress':
        statuses.push({ value: 'waiting', label: assignedRoom ? `🧍 진료실 ${assignedRoom}번 배정` : '⏳ 대기중' });
        statuses.push({ value: 'complete', label: '✅ 진료 완료' });
        break;
      case 'complete':
        statuses.push({ value: 'waiting', label: '⏳ 대기중' });
        statuses.push({ value: 'in_progress', label: '💉 진료 중' });
        break;
    }
    
    return statuses;
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
                  const isEditing = editingPatient === p.mapping_id;
                  const availableStatuses = getAvailableStatuses(p.status, p.assigned_room);
                  
                  return (
                    <tr key={p.mapping_id}>
                      <td>{p.display}</td>
                      <td>{p.patient_identifier}</td>
                      <td>{p.birthdate || '-'}</td>
                      <td>{p.gender === 'M' ? '남성' : p.gender === 'F' ? '여성' : '-'}</td>
                      <td>
                        {isEditing ? (
                          <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            style={{
                              padding: '4px 8px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '14px'
                            }}
                          >
                            <option value={p.status}>{renderStatus(p)}</option>
                            {availableStatuses.map(status => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          renderStatus(p)
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button
                              onClick={() => saveStatus(p)}
                              style={{
                                padding: '4px 8px',
                                background: '#28a745',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Save size={14} />
                              저장
                            </button>
                            <button
                              onClick={cancelEditing}
                              style={{
                                padding: '4px 8px',
                                background: '#6c757d',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <X size={14} />
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(p)}
                            style={{
                              padding: '4px 8px',
                              background: '#007bff',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              margin: '0 auto'
                            }}
                          >
                            <Edit2 size={14} />
                            수정
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

        {/* 도움말 */}
        <div style={{ 
          marginTop: '1rem', 
          padding: '0.75rem', 
          background: '#f8f9fa', 
          borderRadius: '6px',
          fontSize: '14px',
          color: '#6c757d'
        }}>
          💡 <strong>사용법:</strong> 
          <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
            <li>수정 버튼을 클릭하여 환자의 진료 상태를 변경할 수 있습니다.</li>
            <li>진료 완료 시 자동으로 진료실 배정이 해제됩니다.</li>
            <li>상태 변경 후 자동으로 데이터가 새로고침됩니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PatientStatusBoard;