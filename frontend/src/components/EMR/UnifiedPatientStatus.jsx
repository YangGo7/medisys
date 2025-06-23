// frontend/src/components/EMR/UnifiedPatientStatus.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Stethoscope, Clock, CheckCircle, Users, Search, Filter } from 'lucide-react';
import WaitingRoom from './WaitingRoom';
import './EmrMainPage.css';
import './UnifiedPatientStatus.css'; // ✅ 새로운 CSS 파일 import

const API_BASE = process.env.REACT_APP_INTEGRATION_API || 'http://35.225.63.41:8000/api/integration/';

const UnifiedPatientStatus = ({ 
  onAssignSuccess, 
  onMarkAsComplete, 
  onUnassignFromRoom, 
  onDeleteSuccess 
}) => {
  // 상태 관리
  const [activeTab, setActiveTab] = useState('waiting'); // 'waiting' | 'assigned' | 'completed'
  const [waitingList, setWaitingList] = useState([]);
  const [assignedPatients, setAssignedPatients] = useState({});
  const [completedPatients, setCompletedPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'table'

  // 데이터 가져오기
  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // 대기 중 환자 목록
      const waitingRes = await axios.get(`${API_BASE}identifier-waiting/`);
      const waitingData = Array.isArray(waitingRes.data) ? waitingRes.data : [];
      setWaitingList(waitingData);
      
      // 배정된 환자들 (waiting list에서 assigned_room이 있는 환자들)
      const assigned = {};
      waitingData
        .filter(p => p.assigned_room)
        .forEach(p => {
          assigned[p.assigned_room] = p;
        });
      setAssignedPatients(assigned);
      
      // 완료된 환자 목록
      const completedRes = await axios.get(`${API_BASE}completed-patients/`);
      setCompletedPatients(Array.isArray(completedRes.data) ? completedRes.data : []);
      
    } catch (error) {
      console.error('환자 데이터 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 5000); // 5초마다 갱신
    return () => clearInterval(interval);
  }, []);

  // 검색 필터링
  const filterPatients = (patients) => {
    if (!searchTerm) return patients;
    return patients.filter(p => 
      (p.name || p.display || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.patient_identifier || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // 환자 배정 처리
  const handleAssign = (roomNumber) => {
    if (!selectedPatient) {
      alert('환자를 먼저 선택해주세요.');
      return;
    }
    if (assignedPatients[roomNumber]) {
      alert(`진료실 ${roomNumber}번에 이미 환자가 배정되어 있습니다.`);
      return;
    }
    onAssignSuccess?.(selectedPatient, roomNumber);
    setSelectedPatient(null);
    fetchAllData(); // 데이터 새로고침
  };

  // 배정 해제
  const handleUnassign = (roomNumber) => {
    const patient = assignedPatients[roomNumber];
    if (!patient) return;
    onUnassignFromRoom?.(patient, roomNumber);
    fetchAllData();
  };

  // 진료 완료 처리
  const handleComplete = (roomNumber) => {
    onMarkAsComplete?.(roomNumber);
    fetchAllData();
  };

  // 환자 삭제
  const handleDelete = async (mappingId) => {
    if (!window.confirm('정말로 삭제하시겠습니까?')) return;
    try {
      await axios.delete(`${API_BASE}delete-mapping/${mappingId}/`);
      alert('✅ 환자가 삭제되었습니다.');
      onDeleteSuccess?.();
      fetchAllData();
    } catch (error) {
      console.error('환자 삭제 실패:', error);
      alert('❌ 환자 삭제에 실패했습니다.');
    }
  };

  // 대기 중 환자 목록 렌더링
  const renderWaitingList = () => {
    const waitingOnly = waitingList.filter(p => !p.assigned_room);
    const filteredWaiting = filterPatients(waitingOnly);

    return (
      <div className="patient-section">
        <div className="section-header">
          <h3>
            <Clock size={20} />
            대기 중인 환자 ({filteredWaiting.length}명)
          </h3>
        </div>
        
        {viewMode === 'card' ? (
          <div className="patient-grid">
            {filteredWaiting.map((patient, index) => (
              <div 
                key={patient.mapping_id || index}
                className={`patient-card ${selectedPatient?.mapping_id === patient.mapping_id ? 'selected' : ''}`}
                onClick={() => setSelectedPatient(patient)}
              >
                <div className="patient-info">
                  <h4>{patient.name || patient.display}</h4>
                  <p className="patient-id">ID: {patient.patient_identifier}</p>
                  <p className="patient-details">
                    {patient.gender === 'M' ? '남성' : '여성'} · {patient.age}세
                  </p>
                  <p className="wait-time">대기시간: {patient.waitTime || 0}분</p>
                </div>
                <div className="patient-actions">
                  <button 
                    className="btn-assign"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPatient(patient);
                    }}
                  >
                    선택
                  </button>
                  <button 
                    className="btn-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(patient.mapping_id);
                    }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="order-table-wrapper">
            <table className="order-table">
              <thead>
                <tr>
                  <th>환자명</th>
                  <th>환자 ID</th>
                  <th>성별/나이</th>
                  <th>대기시간</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredWaiting.map((patient, index) => (
                  <tr 
                    key={patient.mapping_id || index}
                    className={selectedPatient?.mapping_id === patient.mapping_id ? 'selected-row' : ''}
                    onClick={() => setSelectedPatient(patient)}
                  >
                    <td>{patient.name || patient.display}</td>
                    <td>{patient.patient_identifier}</td>
                    <td>{patient.gender === 'M' ? '남성' : '여성'} · {patient.age}세</td>
                    <td>{patient.waitTime || 0}분</td>
                    <td>
                      <button 
                        className="btn-sm btn-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPatient(patient);
                        }}
                      >
                        선택
                      </button>
                      <button 
                        className="btn-sm btn-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(patient.mapping_id);
                        }}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // 배정된 환자 목록 렌더링
  const renderAssignedList = () => {
    return (
      <div className="patient-section">
        <div className="section-header">
          <h3>
            <Users size={20} />
            진료실 배정 현황
          </h3>
        </div>
        
        <WaitingRoom
          assignedPatients={assignedPatients}
          onAssign={handleAssign}
          onUnassign={handleUnassign}
          onComplete={handleComplete}
          selectedPatient={selectedPatient}
        />
      </div>
    );
  };

  // 완료된 환자 목록 렌더링
  const renderCompletedList = () => {
    const filteredCompleted = filterPatients(completedPatients);

    return (
      <div className="patient-section">
        <div className="section-header">
          <h3>
            <CheckCircle size={20} />
            완료된 환자 ({filteredCompleted.length}명)
          </h3>
        </div>
        
        <div className="order-table-wrapper">
          <table className="order-table">
            <thead>
              <tr>
                <th>환자명</th>
                <th>환자 ID</th>
                <th>성별</th>
                <th>완료 시간</th>
                <th>배정된 진료실</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompleted.map((patient, index) => (
                <tr key={patient.mapping_id || index}>
                  <td>{patient.name || patient.display}</td>
                  <td>{patient.patient_identifier}</td>
                  <td>{patient.gender === 'M' ? '남성' : '여성'}</td>
                  <td>{patient.last_sync ? new Date(patient.last_sync).toLocaleString() : '-'}</td>
                  <td>{patient.assigned_room ? `${patient.assigned_room}번` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container-full unified-patient-container">
      <div className="card">
        {/* 헤더 */}
        <div className="unified-header">
          <h2>
            <Stethoscope size={24} />
            통합 환자 상태 관리
          </h2>
          
          {/* 검색 바 */}
          <div className="search-controls">
            <div className="search-input-wrapper">
              <Search size={20} />
              <input
                type="text"
                placeholder="환자명 또는 ID 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            
            {/* 뷰 모드 전환 (대기 탭에서만) */}
            {activeTab === 'waiting' && (
              <div className="view-mode-toggle">
                <button 
                  className={`btn-toggle ${viewMode === 'card' ? 'active' : ''}`}
                  onClick={() => setViewMode('card')}
                >
                  카드
                </button>
                <button 
                  className={`btn-toggle ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setViewMode('table')}
                >
                  테이블
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'waiting' ? 'active' : ''}`}
            onClick={() => setActiveTab('waiting')}
          >
            <Clock size={18} />
            대기 중 ({waitingList.filter(p => !p.assigned_room).length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'assigned' ? 'active' : ''}`}
            onClick={() => setActiveTab('assigned')}
          >
            <Users size={18} />
            진료실 배정 ({Object.keys(assignedPatients).length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            <CheckCircle size={18} />
            완료 ({completedPatients.length})
          </button>
        </div>

        {/* 선택된 환자 정보 */}
        {selectedPatient && activeTab === 'waiting' && (
          <div className="selected-patient-info">
            <h4>선택된 환자: {selectedPatient.name || selectedPatient.display}</h4>
            <p>ID: {selectedPatient.patient_identifier} | {selectedPatient.gender === 'M' ? '남성' : '여성'} | {selectedPatient.age}세</p>
            <div className="assign-buttons">
              <button 
                className="btn btn-primary"
                onClick={() => handleAssign(1)}
                disabled={!!assignedPatients[1]}
              >
                진료실 1번 배정 {assignedPatients[1] ? '(사용중)' : ''}
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => handleAssign(2)}
                disabled={!!assignedPatients[2]}
              >
                진료실 2번 배정 {assignedPatients[2] ? '(사용중)' : ''}
              </button>
            </div>
          </div>
        )}

        {/* 탭 컨텐츠 */}
        <div className="tab-content">
          {loading ? (
            <div className="loading">로딩 중...</div>
          ) : (
            <>
              {activeTab === 'waiting' && renderWaitingList()}
              {activeTab === 'assigned' && renderAssignedList()}
              {activeTab === 'completed' && renderCompletedList()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedPatientStatus;