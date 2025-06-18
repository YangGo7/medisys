// src/components/EMR/EmrMainPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import PatientDetailModal from './PatientDetailModal';
import PatientWaitingList from './PatientWaitingList';
import ThemeSettings from './Settings/ThemeSettings';
import LogViewer from './Settings/LogViewer';
import HelpGuide from './Settings/HelpGuide'; // 경로 확인 완료
import NotificationModal from './NotificationModal';
import { saveLog } from '../utils/saveLog';
import SettingsPage from './SettingsPage';

import PatientInfoPanel from './PatientInfoPanel';
import VisitHistoryPanel from './VisitHistoryPanel';
import LisRequestPanel from './LisRequestPanel';
import ImagingRequestPanel from './ImagingRequestPanel';
import DiagnosisPanel from './DiagnosisPanel';
import WaitingBoard from './WaitingBoard';
import AssignedPatientList from './AssignedPatientList';
import ReceptionPanel from './ReceptionPanel';
import PatientStatusBoard from './PatientStatusBoard';
import CompletedPatients from './CompletedPatients';

import { DEFAULT_DOCTOR_ID } from './lisConfig';

// 홈 대시보드용 컴포넌트
import WaitingStatsPanel from './home/WaitingStatsPanel';
import CurrentWaitTime from './home/CurrentWaitTime';
// import TodaySchedule from './home/TodaySchedule'; // ❌ 캘린더로 대체되므로 주석 처리하거나 삭제
import DailySummary from './home/DailySummary';
import { UrgentWidget } from './home';

// ✅ 캘린더 라이브러리 import
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // 캘린더 기본 CSS


import './EmrMainPage.css';
import DiagnosisPrescriptionPanel from './DiagnosisPrescriptionPanel';

const EmrMainPage = () => {
  const [activeTab, setActiveTab] = useState('홈'); // '의사 대시보드' -> '홈'으로 이미 변경됨
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [fullSelectedPatientData, setFullSelectedPatientData] = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [scheduleRefresh, setScheduleRefresh] = useState(0);

  // 중앙에서 관리할 상태들
  const [waitingList, setWaitingList] = useState([]);
  const [assignedPatients, setAssignedPatients] = useState({ 1: null, 2: null });
  const [completedPatients, setCompletedPatients] = useState([]);
  const [allPatientMappings, setAllPatientMappings] = useState([]);

  // ----- 전체 환자 검색을 위한 새로운 상태 -----
  const [searchTerm, setSearchTerm] = useState('');
  const [allSearchResults, setAllSearchResults] = useState([]);
  const [isSearchingAllPatients, setIsSearchingAllPatients] = useState(false);
  const [allSearchError, setAllSearchError] = useState(null);
  const [searchMode, setSearchMode] = useState('assigned');
  // ----------------------------------------

  // ✅ 캘린더 날짜 상태 추가
  const [calendarDate, setCalendarDate] = useState(new Date()); // 현재 날짜로 초기화

  const API_BASE = process.env.REACT_APP_INTEGRATION_API;

  const fetchAllPatientData = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}identifier-waiting/`);
      const all = Array.isArray(res.data) ? res.data : [];
      setAllPatientMappings(all);

      const waiting = all
        .filter(p => !p.assigned_room)
        .reduce((acc, p) => {
          if (!acc.find(x => x.patient_identifier === p.patient_identifier)) {
            acc.push(p);
          }
          return acc;
        }, []);
      setWaitingList(waiting);

      const assigned = { 1: null, 2: null };
      all.forEach(p => {
        if (p.assigned_room === 1) assigned[1] = p;
        if (p.assigned_room === 2) assigned[2] = p;
      });
      setAssignedPatients(assigned);

    } catch (err) {
      console.error('환자 데이터 조회 실패:', err);
      setWaitingList([]);
      setAssignedPatients({ 1: null, 2: null });
      setAllPatientMappings([]);
    }
  }, [API_BASE]);

  const fetchCompletedPatients = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}completed-patients/`);
      setCompletedPatients(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('완료 환자 조회 실패:', err);
      setCompletedPatients([]);
    }
  }, [API_BASE]);

  const fetchAllPatientsFromBackend = useCallback(async () => {
    if (searchTerm.trim() === '') {
      setAllSearchResults([]);
      return;
    }
    setIsSearchingAllPatients(true);
    setAllSearchError(null);
    try {
      const res = await axios.get(`${API_BASE}openmrs/patients/search/?q=${searchTerm}`);
      setAllSearchResults(Array.isArray(res.data.results) ? res.data.results : []);
      
    } catch (err) {
      console.error('전체 환자 검색 실패:', err.response ? err.response.data : err.message);
      setAllSearchError('전체 환자 검색 중 오류가 발생했습니다. 백엔드 연결 및 API 경로를 확인하세요.');
      setAllSearchResults([]);
    } finally {
      setIsSearchingAllPatients(false);
    }
  }, [API_BASE, searchTerm]);

  const handleMainSearch = () => {
      if (searchMode === 'all') {
          fetchAllPatientsFromBackend();
      }
  };

  useEffect(() => {
    if (searchMode === 'all') {
      const handler = setTimeout(() => {
        fetchAllPatientsFromBackend();
      }, 300);

      return () => {
        clearTimeout(handler);
      };
    } else {
        setAllSearchResults([]);
    }
  }, [searchTerm, searchMode, fetchAllPatientsFromBackend]);

  useEffect(() => {
    fetchAllPatientData();
    fetchCompletedPatients();
    const interval = setInterval(() => {
      fetchAllPatientData();
      fetchCompletedPatients();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchAllPatientData, fetchCompletedPatients, scheduleRefresh]);

  const handleAssignToRoom = async (patientToAssign, roomNumber) => {
    if (!patientToAssign) {
      alert('환자를 먼저 선택해주세요.');
      return;
    }
    if (assignedPatients[roomNumber]) {
      alert(`진료실 ${roomNumber}번에 이미 환자가 배정되어 있습니다.`);
      return;
    }
    try {
      const response = await axios.post(`${API_BASE}assign-room/`, {
        patientId: patientToAssign.mapping_id,
        patientIdentifier: patientToAssign.patient_identifier,
        room: roomNumber,
      });
      if (!response.data.success) throw new Error(response.data.error || '배정 실패');
      setAssignedPatients(prev => ({ ...prev, [roomNumber]: patientToAssign }));
      setWaitingList(prev => prev.filter(p => p.mapping_id !== patientToAssign.mapping_id));
      setSelectedPatient(null);
      saveLog({
        patient_id: patientToAssign.mapping_id || patientToAssign.patient_identifier || patientToAssign.uuid,
        patient_name: patientToAssign.display || patientToAssign.name,
        doctor_id: localStorage.getItem('doctor_id') || 'UNKNOWN',
        doctor_name: localStorage.getItem('doctor_name') || '',
        request_type: '진료실 배정',
        request_detail: `진료실 ${roomNumber}번으로 배정됨`,
      });
      alert(`✅ ${patientToAssign.display || patientToAssign.name}님이 진료실 ${roomNumber}번에 배정되었습니다.`);
      setScheduleRefresh(prev => prev + 1);
      fetchAllPatientData();
    } catch (err) {
      console.error('❌ 진료실 배정 실패:', err);
      alert('진료실 배정에 실패했습니다: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleMarkAsComplete = async (roomNumber) => {
    const patientInRoom = assignedPatients[roomNumber];
    if (!patientInRoom) return;
    try {
      const response = await axios.post(`${API_BASE}complete-visit/`, { room: roomNumber });
      if (!response.data.success) throw new Error(response.data.error || '완료 실패');
      setAssignedPatients(prev => ({ ...prev, [roomNumber]: null }));
      setSelectedPatient(null);
      saveLog({
        patient_id: patientInRoom.mapping_id || patientInRoom.id,
        patient_name: patientInRoom.display || patientInRoom.name,
        doctor_id: localStorage.getItem('doctor_id') || 'UNKNOWN',
        doctor_name: localStorage.getItem('doctor_name') || '',
        request_type: '진료 완료',
        request_detail: `진료실 ${roomNumber}번 진료 완료`,
      });
      alert(`✅ 진료실 ${roomNumber}번 진료가 완료되었습니다.`);
      setScheduleRefresh(prev => prev + 1);
      fetchCompletedPatients();
      fetchAllPatientData();
    } catch (err) {
      console.error('❌ 진료 완료 실패:', err);
      alert('진료 완료 처리에 실패했습니다: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUnassignFromRoom = async (patientToUnassign, roomNumber) => {
    if (!patientToUnassign) return;
    try {
      await axios.post(`${API_BASE}unassign-room/`, {
        patient_id: patientToUnassign.mapping_id,
        room: roomNumber,
      });
      setAssignedPatients(prev => ({ ...prev, [roomNumber]: null }));
      setSelectedPatient(null);
      alert(`✅ 진료실 ${roomNumber}번 배정이 해제되었습니다.`);
      setScheduleRefresh(prev => prev + 1);
      fetchAllPatientData();
    } catch (err) {
      console.error('배정 해제 실패:', err);
      alert('배정 해제에 실패했습니다: ' + (err.response?.data?.error || err.message));
    }
  };

  const openPatientModal = async () => {
    if (!selectedPatient) return;

    try {
      const res = await axios.get(`${API_BASE}openmrs/patients/${selectedPatient.uuid}/`);
      setFullSelectedPatientData(res.data);
      setShowPatientModal(true);
    } catch (err) {
      console.error('환자 상세 정보 불러오기 실패:', err);
      alert('환자 상세 정보를 불러오지 못했습니다. 다시 시도해주세요.');
      setFullSelectedPatientData(null);
    }
  };

  const closePatientModal = () => {
    setShowPatientModal(false);
    setFullSelectedPatientData(null);
  };

  // —————————————————————————————————————————————
  // 렌더 함수들
  // —————————————————————————————————————————————

  const renderHome = () => (
    <div className="page-container-full doctor-dashboard-container">
      <div className="dashboard-card card--schedule">
        {/* 📅 오늘 일정 제목 제거 및 캘린더 컴포넌트 렌더링 */}
        {/* <TodaySchedule refreshTrigger={scheduleRefresh} /> 대신 캘린더를 넣습니다. */}
        <h3 className="section-title" style={{ textAlign: 'center' }}>📅 일정 관리</h3> {/* ✅ style 추가 */}
        <div style={{ padding: '10px', display: 'flex', justifyContent: 'center' }}>
            <Calendar
                onChange={setCalendarDate} // 날짜 변경 시 상태 업데이트
                value={calendarDate}       // 현재 선택된 날짜
                locale="ko-KR"             // 한국어 로케일 설정
            />
        </div>
        {/* 선택된 날짜의 일정 표시 (선택 사항) */}
        <div style={{ marginTop: '10px', textAlign: 'center' }}>
            {calendarDate && (
                <p>선택된 날짜: {calendarDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            )}
            {/* 여기에 선택된 날짜에 대한 실제 일정 데이터를 표시하는 로직 추가 */}
            {/* 예: <ScheduledEvents date={calendarDate} /> */}
        </div>
      </div>
      <div className="dashboard-card card--stats">
        <WaitingStatsPanel
          waitingList={waitingList}
          completedPatients={
            [...completedPatients]
              .sort((a, b) => {
                const dateA = a.last_sync ? new Date(a.last_sync) : new Date(0);
                const dateB = b.last_sync ? new Date(b.last_sync) : new Date(0);
                return dateB.getTime() - dateA.getTime();
              })
              .slice(0, 3)
              .map(p => ({
                name: p.name,
                time: p.last_sync ? new Date(p.last_sync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'
              }))
          }
        />
      </div>
      <div className="dashboard-card card--waittime">
        <CurrentWaitTime waitingList={waitingList} />
      </div>
      <div className="dashboard-card card--summary">
        <DailySummary />
      </div>
      <div className="dashboard-card card--urgent">
        <UrgentWidget marquee={true} withTabs={false} showActionButtons={false} />
      </div>
    </div>
  );

  const renderReception = () => (
    <div className="page-container-full">
      <ReceptionPanel
        onReceptionSuccess={() => {
          setActiveTab('진료'); // 이 부분도 '의사 대시보드'로 변경될 필요가 있을 수 있음. 현재는 '진료'로 유지.
          setScheduleRefresh(prev => prev + 1);
        }}
      />
    </div>
  );

  const renderSettings = () => (
    <div className="page-container-full">
      <SettingsPage />
    </div>
  );

  const renderWaitingList = () => (
    <div className="page-container-full">
      <PatientWaitingList
        waitingList={waitingList}
        assignedPatients={assignedPatients}
        onAssignSuccess={handleAssignToRoom}
        onMarkAsComplete={handleMarkAsComplete}
        onUnassignFromRoom={handleUnassignFromRoom}
        onDeleteSuccess={() => setScheduleRefresh(prev => prev + 1)}
      />
    </div>
  );

  const renderWaitingBoard = () => (
    <div className="page-container-full">
      <WaitingBoard waitingList={waitingList} assignedPatients={assignedPatients} />
    </div>
  );

  const renderPatientStatus = () => (
    <div className="page-container-full">
      <PatientStatusBoard onComplete={() => setActiveTab('완료 환자 목록')} />
    </div>
  );

  const renderCompletedPatients = () => (
    <div className="page-container-full">
      <CompletedPatients completedPatients={completedPatients} />
    </div>
  );

  const renderClinical = () => (
  <div className="clinical-container-new">
    <section className="tab-col tab1-new">
      <h3 className="section-title">
        🧑‍⚕️ 환자 검색
        {/* 전체 환자 검색으로 전환하는 UI 추가 */}
        <div style={{ display: 'inline-flex', marginLeft: '10px', fontSize: '14px', alignItems: 'center' }}>
          <label style={{ marginRight: '10px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="searchMode"
              value="assigned"
              checked={searchMode === 'assigned'}
              onChange={() => {
                  setSearchMode('assigned');
                  setAllSearchResults([]); // 모드 변경 시 전체 검색 결과 초기화
                  setSearchTerm(''); // 검색어 초기화 (옵션)
              }}
              style={{ marginRight: '4px' }}
            />
            진료실 배정 환자
          </label>
          <label style={{ cursor: 'pointer' }}>
            <input
              type="radio"
              name="searchMode"
              value="all"
              checked={searchMode === 'all'}
              onChange={() => {
                  setSearchMode('all');
                  setAllSearchResults([]); // 모드 변경 시 전체 검색 결과 초기화
                  setSearchTerm(''); // 검색어 초기화 (옵션)
              }}
              style={{ marginRight: '4px' }}
            />
            전체 환자
          </label>
        </div>
      </h3>
      {/* 검색 입력 필드를 EmrMainPage로 이동 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <input
          type="text"
          placeholder="이름 또는 ID로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => { if (e.key === 'Enter') handleMainSearch(); }}
          style={{ flexGrow: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
        <button
          onClick={handleMainSearch}
          style={{ padding: '8px 12px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          검색
        </button>
      </div>

      {searchMode === 'assigned' ? (
        <AssignedPatientList
          onPatientSelect={setSelectedPatient}
          selectedPatient={selectedPatient}
          refreshTrigger={scheduleRefresh}
          searchTerm={searchTerm}
        />
      ) : (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))',
          gap: 8,
          border: '1px solid #eee',
          borderRadius: '8px',
          padding: '8px',
          minHeight: '200px'
        }}>
          {isSearchingAllPatients && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '20px' }}>전체 환자 검색 중...</div>}
          {allSearchError && <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'red', padding: '20px' }}>⚠️ {allSearchError}</div>}
          {!isSearchingAllPatients && !allSearchError && allSearchResults.length === 0 && searchTerm.trim() !== '' ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#666', padding: '20px' }}>검색 결과가 없습니다.</div>
          ) : (
            !isSearchingAllPatients && allSearchResults.map(p => {
              const patientUniqueId = p.uuid; 
              const isSelected = selectedPatient?.uuid === patientUniqueId;

              return (
                <div
                  key={patientUniqueId}
                  onClick={() => setSelectedPatient({
                    uuid: patientUniqueId,
                    mapping_id: null,
                    display: p.name,
                    assigned_room: null,
                    person: { age: p.age, gender: p.gender, birthdate: p.birthdate },
                    identifiers: [{ identifier: p.patient_identifier, identifierType: 'OpenMRS ID', preferred: true }],
                    ...p
                  })}
                  style={{
                    border: isSelected ? '2px solid #1976d2' : '1px solid #ccc',
                    borderRadius: 4,
                    padding: 8,
                    cursor: 'pointer',
                    background: isSelected ? '#e3f2fd' : '#fff',
                    position: 'relative'
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>👤 {p.name}</div>
                  <div style={{ fontSize: 12, color: '#555' }}>🆔 {p.patient_identifier}</div>
                  <div style={{ fontSize: 12, color: '#555' }}>
                    👥 {p.gender === 'M' ? '남성' : '여성'} | 🎂 {p.age}세
                  </div>
                  <button
                      onClick={async e => {
                          e.stopPropagation();
                          try {
                              const newMappingResponse = await axios.post(`${API_BASE}create-identifier-based-mapping/`, {
                                  openmrs_patient_uuid: p.uuid,
                                  patient_identifier: p.patient_identifier,
                              });

                              if (newMappingResponse.data.success) {
                                  const newMappingId = newMappingResponse.data.mapping_id;
                                  handleAssignToRoom(
                                      {
                                          mapping_id: newMappingId,
                                          uuid: p.uuid,
                                          display: p.name,
                                          name: p.name,
                                          patient_identifier: p.patient_identifier,
                                          age: p.age, gender: p.gender
                                      },
                                      1
                                  );
                              } else {
                                  alert('환자 매핑 생성에 실패했습니다: ' + (newMappingResponse.data.error || '알 수 없는 오류'));
                              }
                          } catch (error) {
                              console.error('환자 매핑 생성 및 배정 실패:', error.response?.data || error.message);
                              alert('환자 매핑 생성 및 배정에 실패했습니다: ' + (error.response?.data?.error || error.message));
                          }
                      }}
                      style={{
                          marginTop: 8, padding: '4px 6px', background: '#4CAF50', color: '#fff',
                          border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer'
                      }}
                  >
                      진료실 1번 배정
                  </button>
                </div>
              );
            })
          )}
          {!isSearchingAllPatients && !allSearchError && allSearchResults.length === 0 && searchTerm.trim() === '' && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#666', padding: '20px' }}>
                  이름 또는 ID를 입력하여 전체 환자를 검색합니다.
              </div>
          )}
        </div>
      )}
    </section>

    <section className="tab-col tab2">
      <h3 className="section-title">📄 환자 정보</h3>
      {selectedPatient
        ? <PatientInfoPanel patient={selectedPatient} onOpenDetailModal={openPatientModal} />
        : <p className="empty-text">배정된 환자를 선택해주세요.</p>}
      <hr style={{ margin: '1rem 0', borderColor: '#eee' }} />
      <h3 className="section-title">📁 내원 이력</h3>
      {selectedPatient
        ? <VisitHistoryPanel patient={selectedPatient} />
        : <p className="empty-text">배정된 환자를 선택해주세요.</p>}
    </section>

    <section className="tab-col tab3-combined">
      <h3 className="section-title">🔬 LIS 검사 요청</h3>
      {selectedPatient
        ? <LisRequestPanel patient={selectedPatient} doctorId={DEFAULT_DOCTOR_ID} />
        : <p className="empty-text">배정된 환자를 선택해주세요.</p>}
      
      <hr style={{ margin: '1rem 0', borderColor: '#eee' }} /> 
      
      <h3 className="section-title">🏥 영상검사 요청</h3>
      {selectedPatient
        ? <ImagingRequestPanel selectedPatient={selectedPatient} />
        : <p className="empty-text">배정된 환자를 선택해주세요.</p>}
    </section>

    {/* 🔥 진단 패널로 변경 */}
    <section className="tab-col tab4-ai">
      <DiagnosisPrescriptionPanel 
        patient={selectedPatient} 
        panelType="diagnosis"
      />
    </section>

    {/* 🔥 처방 패널로 변경 */}
    <section className="tab-col tab5-empty">
      <DiagnosisPrescriptionPanel 
        patient={selectedPatient} 
        panelType="prescription"
      />
    </section>

  </div>
);

  return (
    <div className="emr-page">
      <header className="emr-header">
        <div className="logo" onClick={() => setActiveTab('의사 대시보드')}>
          🏥 EMR 시스템
        </div>
      </header>
      <div className="emr-content">
        <aside className="sidebar-col">
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onBellClick={() => setShowNotifModal(true)}
          />
        </aside>
        <main className="content-col">
          {activeTab === '홈' && renderHome()}
          {activeTab === '접수' && renderReception()}
          {activeTab === '설정' && renderSettings()}
          {activeTab === '대기 목록' && renderWaitingList()}
          {activeTab === '대기 화면' && renderWaitingBoard()}
          {activeTab === '진료 진행도' && renderPatientStatus()}
          {activeTab === '완료 환자 목록' && renderCompletedPatients()}
          {activeTab === '의사 대시보드' && renderClinical()}
        </main>
      </div>
      {showNotifModal && (
        <NotificationModal onClose={() => setShowNotifModal(false)} />
      )}
      {showPatientModal && selectedPatient && (
        <PatientDetailModal
          patient={selectedPatient}
          doctorId={localStorage.getItem('doctor_id')}
          onClose={closePatientModal}
          onPatientDeleted={() => {
            setScheduleRefresh(prev => prev + 1);
            setSelectedPatient(null);
          }}
        />
      )}
    </div>
  );
};

export default EmrMainPage;