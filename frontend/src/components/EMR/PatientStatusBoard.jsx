// src/components/EMR/PatientStatusBoard.jsx (수정된 전체 코드)

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Stethoscope } from 'lucide-react';
// import { useNavigate } from 'react-router-dom'; // navigate는 더 이상 사용되지 않으므로 제거합니다.
import './EmrMainPage.css'; // 공통 테이블 / 버튼 스타일

const RECEPTION_API = 'http://35.225.63.41:8000/api/integration/reception-list/';

const PatientStatusBoard = () => {
  const [patients, setPatients] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  // const navigate = useNavigate(); // updateStatus 함수 제거로 navigate도 제거합니다.

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

  // 2) 상태 업데이트 (이전의 "재설정" 버튼과 관련된 로직이므로 여기서는 제거됩니다.)
  // const updateStatus = async (mapping_id, newStatus) => { ... };

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

  // 4) 다음 상태 계산 (이전의 "작업" 버튼 관련 로직이므로 제거됩니다.)
  // const getNextStatus = (st) => { ... };

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
                  // p.status를 직접 사용하므로 current 변수 정의 불필요
                  return (
                    <tr key={p.mapping_id}>
                      <td>{p.display}</td>
                      <td>{p.patient_identifier}</td>
                      <td>{p.birthdate || '-'}</td>
                      <td>{p.gender === 'M' ? '남성' : p.gender === 'F' ? '여성' : '-'}</td>
                      <td>{renderStatus(p)}</td> {/* renderStatus 함수 호출 */}
                      <td style={{ textAlign: 'center' }}>
                        {/* '작업' 칸은 기능 제거로 인해 비어있습니다. 필요에 따라 아이콘 등을 표시할 수 있습니다. */}
                        -
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