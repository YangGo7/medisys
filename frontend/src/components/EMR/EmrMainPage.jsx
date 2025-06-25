// src/components/EMR/EmrMainPage.jsx (수정된 버전)

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import PatientDetailModal from './PatientDetailModal';
import UnifiedPatientStatus from './UnifiedPatientStatus';
import ThemeSettings from './Settings/ThemeSettings';
import LogViewer from './Settings/LogViewer';
import HelpGuide from './Settings/HelpGuide';
import NotificationModal from './NotificationModal';
import { saveLog } from '../utils/saveLog';
import SettingsPage from './SettingsPage';

// 기존 컴포넌트들
import WaitingBoard from './WaitingBoard';
import ReceptionPanel from './ReceptionPanel';
import PatientStatusBoard from './PatientStatusBoard';

// 🔥 새로운 DoctorDashboard 컴포넌트 import - 올바른 경로로 수정
import DocDashBoard from '../DocDashBoard/DocDashBoard';
import '../DocDashBoard/DocDashBoard.css'; // CSS도 함께 import

// 홈 대시보드용 컴포넌트
import WaitingStatsPanel from './home/WaitingStatsPanel';
import CurrentWaitTime from './home/CurrentWaitTime';
import DailySummary from './home/DailySummary';
import { UrgentWidget } from './home';

// ✅ 캘린더 라이브러리 import
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

import './EmrMainPage.css';

const EmrMainPage = () => {
  const [activeTab, setActiveTab] = useState('홈');
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

  // ✅ 캘린더 날짜 상태
  const [calendarDate, setCalendarDate] = useState(new Date());

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

  useEffect(() => {
    fetchAllPatientData();
    fetchCompletedPatients();
    const interval = setInterval(() => {
      fetchAllPatientData();
      fetchCompletedPatients();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchAllPatientData, fetchCompletedPatients, scheduleRefresh]);

  // —————————————————————————————————————————————
  // 렌더 함수들
  // —————————————————————————————————————————————

  const renderHome = () => (
    <div className="page-container-full doctor-dashboard-container">
      <div className="dashboard-card card--schedule">
        <h3 className="section-title" style={{ textAlign: 'center' }}>📅 일정 관리</h3>
        <div style={{ padding: '10px', display: 'flex', justifyContent: 'center' }}>
            <Calendar
                onChange={setCalendarDate}
                value={calendarDate}
                locale="ko-KR"
            />
        </div>
        <div style={{ marginTop: '10px', textAlign: 'center' }}>
            {calendarDate && (
                <p>선택된 날짜: {calendarDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            )}
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
          setActiveTab('환자 관리');
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

  // ✅ 진료 대시보드 컴포넌트 렌더링
  const renderClinicalDashboard = () => (
    <div className="page-container-full">
      <UnifiedPatientStatus 
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
      <PatientStatusBoard onComplete={() => setActiveTab('진료 대시보드')} />
    </div>
  );

  // 🔥 새로운 의사 대시보드 렌더링 함수
  const renderDoctorDashboard = () => (
    <DocDashBoard />
  );

  return (
    <div className="emr-page">
      <header className="emr-header">
        <div className="logo" onClick={() => setActiveTab('홈')}>
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
          {/* ✅ 진료 대시보드 탭 */}
          {activeTab === '환자 관리' && renderClinicalDashboard()}
          {activeTab === '대기 화면' && renderWaitingBoard()}
          {activeTab === '진료 진행도' && renderPatientStatus()}
          {/* 🔥 새로운 의사 대시보드 탭 */}
          {activeTab === '의사 대시보드' && renderDoctorDashboard()}
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