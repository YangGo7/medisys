// src/components/EMR/EmrMainPage.jsx - 설정 컴포넌트 통합버전
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import ChartHeader from './ChartHeader';
import WaitingRoom from './WaitingRoom';
import PatientInfoPanel from './PatientInfoPanel';
import VisitHistoryPanel from './VisitHistoryPanel';
import DiagnosisPanel from './DiagnosisPanel';
import ImagingRequestPanel from './ImagingRequestPanel';
import PatientDetailModal from './PatientDetailModal';

// 🧩 추가된 설정 컴포넌트들
import ThemeSettings from './Settings/ThemeSettings';
import LogViewer from './Settings/LogViewer';
import HelpGuide from './Settings/HelpGuide';
import { saveLog } from '../utils/saveLog';

const EmrMainPage = () => {
  const [activeTab, setActiveTab] = useState('진료');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [assignedPatients, setAssignedPatients] = useState({ 1: null, 2: null });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const assignToRoom = (roomNumber) => {
    if (!selectedPatient) return;
    setAssignedPatients((prev) => ({ ...prev, [roomNumber]: selectedPatient }));
    setSelectedPatient(null);
    // 로그 저장
    const doctor_id = localStorage.getItem('doctor_id') || 'UNKNOWN';
    const doctor_name = localStorage.getItem('doctor_name') || '';

    const patient_id = selectedPatient?.id || selectedPatient?.patient_id || 'UNKNOWN';
    const patient_name = selectedPatient?.name || selectedPatient?.patient_name || '';

    saveLog({
      patient_id,
      patient_name,
      doctor_id,
      doctor_name,
      request_type: '진료실 배정',
      request_detail: `${roomNumber} 진료실로 배정됨`,
    }); // 
  };

  const openModal = () => {
    if (!selectedPatient) return;
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const renderTabContent = () => {
    if (activeTab === '홈') {
      return (
        <div style={pageContainerStyle}>
          <h2 style={pageTitleStyle}>🏠 홈 화면</h2>
          <div style={cardStyle}>
            <p>이곳은 홈 탭입니다. 시스템 공지, 최근 진료 요약 등을 표시할 수 있습니다.</p>
          </div>
        </div>
      );
    }
    if (activeTab === '설정') {
      return (
        <div style={pageContainerStyle}>
          <h2 style={pageTitleStyle}>⚙️ 설정 페이지</h2>
          <div style={cardStyle}>
            <ThemeSettings />
            <LogViewer />
            <HelpGuide />
          </div>
        </div>
      );
    }

    return (
      <div style={pageContainerStyle}>
        <ChartHeader onSearch={setSelectedPatient} />

        <div style={cardGridStyle}>
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>🧑‍⚕️ 진료실 배정</h3>
            <WaitingRoom
              selectedPatient={selectedPatient}
              assignToRoom={assignToRoom}
              assignedPatients={assignedPatients}
            />
          </div>

          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>📄 환자 정보</h3>
            {selectedPatient ? (
              <PatientInfoPanel
                patient={selectedPatient}
                onOpenDetailModal={openModal}
              />
            ) : (
              <p style={emptyTextStyle}>환자를 선택해주세요.</p>
            )}
          </div>

          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>🏥 영상검사 요청</h3>
            <ImagingRequestPanel
              selectedPatient={selectedPatient}
              onRequestSuccess={(result) => {
                console.log('🎉 영상검사 요청 성공:', result);
                alert(`영상검사 요청이 완료되었습니다!\nAccession Number: ${result.accession_number || 'N/A'}`);
              }}
            />
          </div>

          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>📁 내원 기록</h3>
            {assignedPatients[1] ? (
              <VisitHistoryPanel patient={assignedPatients[1]} />
            ) : (
              <p style={emptyTextStyle}>환자가 배정되지 않았습니다.</p>
            )}
          </div>

          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>🧠 AI 진단 및 판독</h3>
            {assignedPatients[1] ? (
              <DiagnosisPanel patient={assignedPatients[1]} />
            ) : (
              <p style={emptyTextStyle}>환자가 배정되지 않았습니다.</p>
            )}
          </div>
        </div>

        {isModalOpen && (
          <PatientDetailModal
            patient={selectedPatient}
            onClose={closeModal}
          />
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', minHeight: '100vh', backgroundColor: '#f9f9f9' }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div style={{ flexGrow: 1 }}>{renderTabContent()}</div>
    </div>
  );
};

const pageContainerStyle = {
  padding: '2rem',
  width: '100%',
  boxSizing: 'border-box',
};

const cardGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '1rem',
  marginTop: '1rem'
};

const cardStyle = {
  border: '1px solid #ddd',
  borderRadius: '8px',
  padding: '1.5rem',
  backgroundColor: '#fff',
  boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
  transition: 'box-shadow 0.2s ease',
  minHeight: '200px',
  marginBottom: '1.5rem'
};

const cardTitleStyle = {
  marginTop: 0,
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#333',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginBottom: '1rem'
};

const pageTitleStyle = {
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '1.5rem',
  color: '#333',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem'
};

const emptyTextStyle = {
  fontStyle: 'italic',
  color: '#888',
  fontSize: '14px'
};

export default EmrMainPage;