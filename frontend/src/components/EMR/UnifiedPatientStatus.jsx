import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Stethoscope, Clock, CheckCircle, Users, Search, Trash2, X, UserX } from 'lucide-react';
import './UnifiedPatientStatus.css';

const API_BASE = process.env.REACT_APP_INTEGRATION_API || 'http://35.225.63.41:8000/api/integration/';

const UnifiedPatientStatus = ({ 
  onAssignSuccess, 
  onMarkAsComplete, 
  onUnassignFromRoom, 
  onDeleteSuccess 
}) => {
  // 상태 관리
  const [activeTab, setActiveTab] = useState('waiting');
  const [waitingList, setWaitingList] = useState([]);
  const [assignedPatients, setAssignedPatients] = useState({});
  const [completedPatients, setCompletedPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [viewMode, setViewMode] = useState('card');
  const [actionLoading, setActionLoading] = useState(null);

  // 🔥 데이터 가져오기 - 완료된 환자 제외하도록 수정
  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // 🔥 대기 중 환자 목록 (완료된 환자 제외)
      const waitingRes = await axios.get(`${API_BASE}identifier-waiting/`);
      const waitingData = Array.isArray(waitingRes.data) ? waitingRes.data : [];
      
      // 🔥 완료된 환자 필터링 (status='complete' 제외)
      const activeWaitingData = waitingData.filter(p => p.status !== 'complete' && p.is_active);
      setWaitingList(activeWaitingData);
      
      // 배정된 환자들 (waiting list에서 assigned_room이 있는 환자들)
      const assigned = {};
      activeWaitingData
        .filter(p => p.assigned_room)
        .forEach(p => {
          assigned[p.assigned_room] = p;
        });
      setAssignedPatients(assigned);
      
      // 🔥 완료된 환자 목록 (별도 API 호출)
      const completedRes = await axios.get(`${API_BASE}completed-patients/`);
      setCompletedPatients(Array.isArray(completedRes.data.completed_patients) ? completedRes.data.completed_patients : []);
      
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

  // 🔥 대기등록 취소 기능
  const handleCancelWaiting = async (mappingId) => {
    const patient = waitingList.find(p => p.mapping_id === mappingId);
    const patientName = patient?.name || patient?.display || '알 수 없는 환자';

    if (!window.confirm(`${patientName}님의 대기등록을 취소하시겠습니까?\n(완전히 삭제되며 되돌릴 수 없습니다)`)) {
      return;
    }

    setActionLoading(mappingId);

    try {
      const response = await axios.delete(`${API_BASE}cancel-waiting/${mappingId}/`);
      
      if (response.data.success) {
        alert(`${patientName}님의 대기등록이 취소되었습니다.`);
        fetchAllData(); // 목록 새로고침
      } else {
        throw new Error(response.data.error || '대기등록 취소에 실패했습니다.');
      }

    } catch (error) {
      console.error('❌ 대기등록 취소 실패:', error);
      const errorMessage = error.response?.data?.error || error.message || '대기등록 취소에 실패했습니다.';
      alert(`취소 실패: ${errorMessage}`);
    } finally {
      setActionLoading(null);
    }
  };

  // 🔥 진료 완료 처리 (개선된 버전)
  const handleCompleteTreatment = async (patient) => {
    const patientName = patient.name || patient.display || '알 수 없는 환자';
    const mappingId = patient.mapping_id;
    const currentRoom = patient.assigned_room;

    if (!mappingId) {
      alert('환자의 매핑 ID를 찾을 수 없습니다.');
      return;
    }

    if (!window.confirm(`${patientName}님의 진료를 완료 처리하시겠습니까?\n(완료 목록으로 이동됩니다)`)) {
      return;
    }

    setActionLoading(mappingId);

    try {
      const requestData = {
        mapping_id: mappingId,
        room: currentRoom
      };

      const response = await axios.post(`${API_BASE}complete-treatment/`, requestData);

      if (response.data.success) {
        alert(`${patientName}님의 진료가 완료되어 완료 목록으로 이동되었습니다.`);
        fetchAllData(); // 완료 후 목록 새로고침
      } else {
        throw new Error(response.data.error || '진료 완료 처리에 실패했습니다.');
      }

    } catch (error) {
      console.error('❌ 진료 완료 처리 실패:', error);
      const errorMessage = error.response?.data?.error || error.message || '진료 완료 처리에 실패했습니다.';
      alert(`완료 처리 실패: ${errorMessage}`);
    } finally {
      setActionLoading(null);
    }
  };

  // 검색 필터링
  const filterPatients = (patients) => {
    if (!searchTerm) return patients;
    return patients.filter(p => 
      (p.name || p.display || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.patient_identifier || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // 환자 배정 처리
  const handleAssign = async (roomNumber) => {
    if (!selectedPatient) {
      alert('환자를 먼저 선택해주세요.');
      return;
    }
    if (assignedPatients[roomNumber]) {
      alert(`진료실 ${roomNumber}번에 이미 환자가 배정되어 있습니다.`);
      return;
    }

    setActionLoading(selectedPatient.mapping_id);

    try {
      const response = await axios.post(`${API_BASE}assign-room/`, {
        mapping_id: selectedPatient.mapping_id,
        room: roomNumber
      });

      if (response.data.success) {
        alert(`${selectedPatient.name || selectedPatient.display}님이 진료실 ${roomNumber}번에 배정되었습니다.`);
        setSelectedPatient(null);
        fetchAllData();
      } else {
        throw new Error(response.data.error || '배정에 실패했습니다.');
      }

    } catch (error) {
      console.error('❌ 환자 배정 실패:', error);
      const errorMessage = error.response?.data?.error || error.message || '환자 배정에 실패했습니다.';
      alert(`배정 실패: ${errorMessage}`);
    } finally {
      setActionLoading(null);
    }
  };

  // 배정 해제
  const handleUnassign = async (patient) => {
    const patientName = patient.name || patient.display || '알 수 없는 환자';
    const mappingId = patient.mapping_id;

    if (!window.confirm(`${patientName}님의 진료실 배정을 해제하시겠습니까?`)) {
      return;
    }

    setActionLoading(mappingId);

    try {
      const response = await axios.post(`${API_BASE}unassign-room/`, {
        mapping_id: mappingId
      });

      if (response.data.success) {
        alert(`${patientName}님의 진료실 배정이 해제되었습니다.`);
        fetchAllData();
      } else {
        throw new Error(response.data.error || '배정 해제에 실패했습니다.');
      }

    } catch (error) {
      console.error('❌ 배정 해제 실패:', error);
      const errorMessage = error.response?.data?.error || error.message || '배정 해제에 실패했습니다.';
      alert(`배정 해제 실패: ${errorMessage}`);
    } finally {
      setActionLoading(null);
    }
  };

  // 🔥 대기 중 환자 목록 렌더링 (취소 버튼 포함)
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
                    {patient.gender === 'M' ? '남성' : '여성'} | {patient.age}세
                  </p>
                  <p className="wait-time">
                    대기시간: {patient.wait_time_minutes || 0}분
                  </p>
                </div>
                
                {/* 🔥 대기등록 취소 버튼 추가 */}
                <div className="patient-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelWaiting(patient.mapping_id);
                    }}
                    disabled={actionLoading === patient.mapping_id}
                    className="btn-cancel-waiting"
                    title="대기등록 취소"
                  >
                    {actionLoading === patient.mapping_id ? (
                      <span>취소중...</span>
                    ) : (
                      <>
                        <UserX size={16} />
                        취소
                      </>
                    )}
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
                  <th>ID</th>
                  <th>성별</th>
                  <th>나이</th>
                  <th>대기시간</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {filteredWaiting.map((patient, index) => (
                  <tr 
                    key={patient.mapping_id || index}
                    className={`clickable-row ${selectedPatient?.mapping_id === patient.mapping_id ? 'selected-row' : ''}`}
                    onClick={() => setSelectedPatient(patient)}
                  >
                    <td>{patient.name || patient.display}</td>
                    <td>{patient.patient_identifier}</td>
                    <td>{patient.gender === 'M' ? '남성' : '여성'}</td>
                    <td>{patient.age}세</td>
                    <td>{patient.wait_time_minutes || 0}분</td>
                    <td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelWaiting(patient.mapping_id);
                        }}
                        disabled={actionLoading === patient.mapping_id}
                        className="btn-sm btn-danger"
                      >
                        {actionLoading === patient.mapping_id ? '취소중...' : '대기취소'}
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

  // 🔥 배정된 환자 목록 렌더링 (완료 버튼 포함)
  const renderAssignedList = () => {
    const assignedList = Object.values(assignedPatients);
    const filteredAssigned = filterPatients(assignedList);

    return (
      <div className="patient-section">
        <div className="section-header">
          <h3>
            <Users size={20} />
            진료실 배정된 환자 ({filteredAssigned.length}명)
          </h3>
        </div>
        
        <div className="patient-grid">
          {filteredAssigned.map((patient, index) => (
            <div 
              key={patient.mapping_id || index}
              className="patient-card assigned-card"
            >
              <div className="patient-info">
                <h4>{patient.name || patient.display}</h4>
                <p className="patient-id">ID: {patient.patient_identifier}</p>
                <p className="patient-details">
                  {patient.gender === 'M' ? '남성' : '여성'} | {patient.age}세
                </p>
                <p className="room-info">
                  진료실: {patient.assigned_room}번
                </p>
              </div>
              
              <div className="patient-actions">
                <button
                  onClick={() => handleUnassign(patient)}
                  disabled={actionLoading === patient.mapping_id}
                  className="btn-unassign"
                >
                  {actionLoading === patient.mapping_id ? '처리중...' : '배정해제'}
                </button>
                
                {/* 🔥 진료 완료 버튼 */}
                <button
                  onClick={() => handleCompleteTreatment(patient)}
                  disabled={actionLoading === patient.mapping_id}
                  className="btn-complete"
                >
                  {actionLoading === patient.mapping_id ? '완료중...' : '진료완료'}
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {filteredAssigned.length === 0 && (
          <div className="empty-state">
            현재 진료실에 배정된 환자가 없습니다.
          </div>
        )}
      </div>
    );
  };

  // 🔥 완료된 환자 목록 렌더링
  const renderCompletedList = () => {
    const filteredCompleted = filterPatients(completedPatients);

    return (
      <div className="patient-section">
        <div className="section-header">
          <h3>
            <CheckCircle size={20} />
            오늘 완료된 환자 ({filteredCompleted.length}명)
          </h3>
        </div>
        
        <div className="patient-grid">
          {filteredCompleted.map((patient, index) => (
            <div 
              key={patient.mapping_id || index}
              className="patient-card completed-card"
            >
              <div className="patient-info">
                <h4>{patient.patient_name}</h4>
                <p className="patient-id">ID: {patient.patient_identifier}</p>
                <p className="patient-details">
                  {patient.gender === 'M' ? '남성' : '여성'} | {patient.age}세
                </p>
                <p className="completion-info">
                  완료시간: {patient.completed_at ? new Date(patient.completed_at).toLocaleTimeString() : '-'}
                </p>
                <p className="wait-time">
                  총 대기시간: {patient.total_wait_time_minutes || 0}분
                </p>
              </div>
              
              <div className="completion-badge">
                <CheckCircle size={16} />
                완료
              </div>
            </div>
          ))}
        </div>
        
        {filteredCompleted.length === 0 && (
          <div className="empty-state">
            오늘 완료된 환자가 없습니다.
          </div>
        )}
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
                disabled={!!assignedPatients[1] || actionLoading}
              >
                진료실 1번 배정 {assignedPatients[1] ? '(사용중)' : ''}
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => handleAssign(2)}
                disabled={!!assignedPatients[2] || actionLoading}
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