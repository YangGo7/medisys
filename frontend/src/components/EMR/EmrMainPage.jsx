// src/components/EMR/EmrMainPage.jsx

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import ChartHeader from './ChartHeader';
import WaitingRoom from './WaitingRoom';
import PatientInfoPanel from './PatientInfoPanel';
import VisitHistoryPanel from './VisitHistoryPanel';
import ImagingRequestPanel from './ImagingRequestPanel';
import DiagnosisPanel from './DiagnosisPanel';
import PatientDetailModal from './PatientDetailModal';
import PatientWaitingList from './PatientWaitingList';
import ThemeSettings from './Settings/ThemeSettings';
import LogViewer from './Settings/LogViewer';
import HelpGuide from './Settings/HelpGuide';
import NotificationModal from './NotificationModal';
import { saveLog } from '../utils/saveLog';

import {
  DashboardCards,
  ScheduleCalendar,
  UrgentWidget,
  QuickActions
} from './home';

import './EmrMainPage.css';

const EmrMainPage = () => {
  const [activeTab, setActiveTab] = useState('홈');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [assignedPatients, setAssignedPatients] = useState({ 1: null, 2: null });
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);

  const assignToRoom = (roomNumber) => {
    if (!selectedPatient) return;

    const patientForLog = selectedPatient;
    setAssignedPatients(prev => {
      const cleaned = {};
      Object.keys(prev).forEach(r => {
        const assigned = prev[r];
        if (assigned?.id === patientForLog.id || assigned?.patient_id === patientForLog.id) {
          cleaned[r] = null;
        } else {
          cleaned[r] = assigned;
        }
      });
      cleaned[roomNumber] = patientForLog;
      return cleaned;
    });

    setSelectedPatient(null);

    const doctor_id   = localStorage.getItem('doctor_id')   || 'UNKNOWN';
    const doctor_name = localStorage.getItem('doctor_name') || '';
    const patient_id  = patientForLog?.id || patientForLog?.patient_id || 'UNKNOWN';
    const patient_name= patientForLog?.name || patientForLog?.patient_name || '';

    saveLog({
      patient_id,
      patient_name,
      doctor_id,
      doctor_name,
      request_type: '진료실 배정',
      request_detail: `진료실 ${roomNumber}번으로 배정됨`,
    });
  };

  const openPatientModal  = () => { if (selectedPatient) setShowPatientModal(true); };
  const closePatientModal = () => setShowPatientModal(false);

  const renderHome = () => (
    <div className="page-container-full">
      <div className="home-grid">
        <DashboardCards withProgress withSparkline />
        <ScheduleCalendar enableDragDrop />
        <UrgentWidget marquee withTabs showActionButtons />
        <QuickActions />
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="page-container-full">
      <h2 className="page-title">⚙️ 설정 페이지</h2>
      <div className="card">
        <ThemeSettings />
        <LogViewer />
        <HelpGuide />
      </div>
    </div>
  );

  const renderWaitingList = () => (
    <div className="page-container-full">
      <div className="card">
        <PatientWaitingList />
      </div>
    </div>
  );

  const renderClinical = () => (
    <div className="clinical-container">
      <section className="tab-col tab1">
        <div className="search-section">
          <ChartHeader onSearch={setSelectedPatient} />
        </div>
        <div className="room-section">
          <h3 className="section-title">🧑‍⚕️ 진료실 배정</h3>
          <WaitingRoom
            selectedPatient={selectedPatient}
            assignToRoom={assignToRoom}
            assignedPatients={assignedPatients}
          />
        </div>
      </section>

      <section className="tab-col tab2">
        <h3 className="section-title">📄 환자 정보</h3>
        {selectedPatient ? (
          <PatientInfoPanel patient={selectedPatient} onOpenDetailModal={openPatientModal} />
        ) : (
          <p className="empty-text">환자를 선택해주세요.</p>
        )}
      </section>

      <section className="tab-col tab3">
        <h3 className="section-title">📁 내원 이력</h3>
        {selectedPatient ? (
          <VisitHistoryPanel patient={selectedPatient} />
        ) : (
          <p className="empty-text">환자를 선택해주세요.</p>
        )}
      </section>

      <section className="tab-col tab4-5">
        <div className="imaging-section">
          <h3 className="section-title">🏥 영상검사 요청</h3>
          {selectedPatient ? (
            <ImagingRequestPanel selectedPatient={selectedPatient} />
          ) : (
            <p className="empty-text">환자를 선택해주세요.</p>
          )}
        </div>
        <div className="ai-section">
          <h3 className="section-title">🧠 AI 판독</h3>
          {selectedPatient ? (
            <DiagnosisPanel patient={selectedPatient} />
          ) : (
            <p className="empty-text">환자를 선택해주세요.</p>
          )}
        </div>
      </section>
    </div>
  );

  return (
    <div className="emr-page">
      <header className="emr-header">
        <div className="logo" onClick={() => setActiveTab('진료')}>
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
          {activeTab === '설정' && renderSettings()}
          {activeTab === '진료' && renderClinical()}
          {activeTab === '대기 목록' && renderWaitingList()}
        </main>
      </div>

      {showNotifModal && (
        <NotificationModal
          onClose={() => setShowNotifModal(false)}
          onMark={() => {}}
        />
      )}

      {showPatientModal && (
        <PatientDetailModal patient={selectedPatient} onClose={closePatientModal} />
      )}
    </div>
  );
};

export default EmrMainPage;
