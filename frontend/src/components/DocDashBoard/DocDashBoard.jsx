// frontend/src/components/DocDashBoard/DocDashBoard.jsx
// 🔥 컴포넌트 형식으로 개선된 의사 대시보드

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  User, 
  FileText, 
  Activity, 
  Brain, 
  Calendar,
  Search,
  Stethoscope,
  TestTube,
  Camera,
  Clock,
  Users
} from 'lucide-react';

// 개별 컴포넌트들 import - 올바른 경로로 수정
import AssignedPatientList from '../EMR/AssignedPatientList';
import PatientInfoPanel from '../EMR/PatientInfoPanel';
import LisRequestPanel from '../EMR/LisRequestPanel';
import ImagingRequestPanel from '../EMR/ImagingRequestPanel';
import VisitHistoryPanel from '../EMR/VisitHistoryPanel';
import DiagnosisPrescriptionPanel from '../EMR/DiagnosisPrescriptionPanel';
import { DEFAULT_DOCTOR_ID } from '../EMR/lisConfig';

const DocDashBoard = () => {
  // 상태 관리
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState('assigned');
  const [allSearchResults, setAllSearchResults] = useState([]);
  const [isSearchingAllPatients, setIsSearchingAllPatients] = useState(false);
  const [allSearchError, setAllSearchError] = useState(null);
  const [scheduleRefresh, setScheduleRefresh] = useState(0);
  const [assignedPatients, setAssignedPatients] = useState({});

  const API_BASE = process.env.REACT_APP_INTEGRATION_API;

  // 🔥 전체 환자 검색 함수
  const fetchAllPatientsFromBackend = async () => {
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
  };

  // 🔥 환자 진료실 배정 함수
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
      const newMappingResponse = await axios.post(`${API_BASE}create-identifier-based-mapping/`, {
        openmrs_patient_uuid: patientToAssign.uuid,
        patient_identifier: patientToAssign.patient_identifier,
      });

      if (newMappingResponse.data.success) {
        const newMappingId = newMappingResponse.data.mapping_id;
        
        const assignResponse = await axios.post(`${API_BASE}assign-room/`, {
          mapping_id: newMappingId,
          room: roomNumber
        });

        if (assignResponse.data.success) {
          alert(`${patientToAssign.name}님이 진료실 ${roomNumber}번에 배정되었습니다.`);
          setSelectedPatient(null);
          setScheduleRefresh(prev => prev + 1);
        } else {
          throw new Error(assignResponse.data.error || '배정에 실패했습니다.');
        }
      } else {
        alert('환자 매핑 생성에 실패했습니다: ' + (newMappingResponse.data.error || '알 수 없는 오류'));
      }
    } catch (error) {
      console.error('환자 매핑 생성 및 배정 실패:', error.response?.data || error.message);
      alert('환자 매핑 생성 및 배정에 실패했습니다: ' + (error.response?.data?.error || error.message));
    }
  };

  // 검색 실행
  const handleMainSearch = () => {
    if (searchMode === 'all') {
      fetchAllPatientsFromBackend();
    }
  };

  // 검색어 변경 시 자동 검색
  useEffect(() => {
    if (searchMode === 'all') {
      const handler = setTimeout(() => {
        fetchAllPatientsFromBackend();
      }, 300);
      return () => clearTimeout(handler);
    } else {
      setAllSearchResults([]);
    }
  }, [searchTerm, searchMode]);

  return (
    <div className="doctor-dashboard">
      {/* 🔥 대시보드 헤더 */}
      <div className="dashboard-header">
        <div className="header-left">
          <Stethoscope className="header-icon" />
          <h1 className="dashboard-title">의사 대시보드</h1>
        </div>
        <div className="header-right">
          <Clock className="time-icon" />
          <span className="current-time">
            {new Date().toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
      </div>

      {/* 🔥 메인 컨테이너 */}
      <div className="dashboard-main">
        {/* 🔥 좌측 사이드바 - 환자 검색 및 선택 */}
        <div className="dashboard-sidebar">
          <div className="sidebar-section">
            <div className="section-header">
              <Search className="section-icon" />
              <h3>환자 검색</h3>
              <div className="search-mode-toggle">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="searchMode"
                    value="assigned"
                    checked={searchMode === 'assigned'}
                    onChange={() => {
                      setSearchMode('assigned');
                      setAllSearchResults([]);
                      setSearchTerm('');
                    }}
                  />
                  배정 환자
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="searchMode"
                    value="all"
                    checked={searchMode === 'all'}
                    onChange={() => {
                      setSearchMode('all');
                      setAllSearchResults([]);
                      setSearchTerm('');
                    }}
                  />
                  전체 환자
                </label>
              </div>
            </div>

            <div className="search-controls">
              <input
                type="text"
                placeholder="이름 또는 ID로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter') handleMainSearch(); }}
                className="search-input"
              />
              <button
                onClick={handleMainSearch}
                className="search-button"
              >
                검색
              </button>
            </div>

            <div className="search-results">
              {searchMode === 'assigned' ? (
                <AssignedPatientList
                  onPatientSelect={setSelectedPatient}
                  selectedPatient={selectedPatient}
                  refreshTrigger={scheduleRefresh}
                  searchTerm={searchTerm}
                />
              ) : (
                <div className="all-patients-grid">
                  {isSearchingAllPatients && (
                    <div className="loading-message">전체 환자 검색 중...</div>
                  )}
                  {allSearchError && (
                    <div className="error-message">⚠️ {allSearchError}</div>
                  )}
                  {!isSearchingAllPatients && !allSearchError && allSearchResults.length === 0 && searchTerm.trim() !== '' ? (
                    <div className="no-results">검색 결과가 없습니다.</div>
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
                            name: p.name,
                            assigned_room: null,
                            person: { age: p.age, gender: p.gender, birthdate: p.birthdate },
                            identifiers: [{ identifier: p.patient_identifier, identifierType: 'OpenMRS ID', preferred: true }],
                            patient_identifier: p.patient_identifier,
                            ...p
                          })}
                          className={`patient-card ${isSelected ? 'selected' : ''}`}
                        >
                          <div className="patient-name">👤 {p.name}</div>
                          <div className="patient-id">🆔 {p.patient_identifier}</div>
                          <div className="patient-details">
                            👥 {p.gender === 'M' ? '남성' : '여성'} | 🎂 {p.age}세
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssignToRoom(
                                {
                                  uuid: p.uuid,
                                  name: p.name,
                                  patient_identifier: p.patient_identifier,
                                  age: p.age,
                                  gender: p.gender
                                },
                                1
                              );
                            }}
                            className="assign-button"
                          >
                            진료실 1번 배정
                          </button>
                        </div>
                      );
                    })
                  )}
                  {!isSearchingAllPatients && !allSearchError && allSearchResults.length === 0 && searchTerm.trim() === '' && (
                    <div className="search-prompt">
                      이름 또는 ID를 입력하여 전체 환자를 검색합니다.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🔥 메인 콘텐츠 영역 */}
        <div className="dashboard-content">
          {selectedPatient ? (
            <div className="content-grid">
              {/* 환자 정보 카드 */}
              <div className="content-card patient-info-card">
                <div className="card-header">
                  <User className="card-icon" />
                  <h3>환자 정보</h3>
                </div>
                <div className="card-content">
                  <PatientInfoPanel 
                    patient={selectedPatient} 
                    onOpenDetailModal={() => {/* 상세 모달 열기 로직 */}} 
                  />
                </div>
              </div>

              {/* 내원 이력 카드 */}
              <div className="content-card history-card">
                <div className="card-header">
                  <FileText className="card-icon" />
                  <h3>내원 이력</h3>
                </div>
                <div className="card-content">
                  <VisitHistoryPanel patient={selectedPatient} />
                </div>
              </div>

              {/* LIS 검사 요청 카드 */}
              <div className="content-card lis-card">
                <div className="card-header">
                  <TestTube className="card-icon" />
                  <h3>LIS 검사 요청</h3>
                </div>
                <div className="card-content">
                  <LisRequestPanel 
                    patient={selectedPatient} 
                    doctorId={DEFAULT_DOCTOR_ID} 
                  />
                </div>
              </div>

              {/* 영상검사 요청 카드 */}
              <div className="content-card imaging-card">
                <div className="card-header">
                  <Camera className="card-icon" />
                  <h3>영상검사 요청</h3>
                </div>
                <div className="card-content">
                  <ImagingRequestPanel selectedPatient={selectedPatient} />
                </div>
              </div>

              {/* 진단 및 처방 카드 */}
              <div className="content-card diagnosis-card">
                <div className="card-header">
                  <Brain className="card-icon" />
                  <h3>진단 및 처방</h3>
                </div>
                <div className="card-content">
                  <DiagnosisPrescriptionPanel 
                    patient={selectedPatient} 
                    panelType="both"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="no-patient-selected">
              <div className="empty-state">
                <Users className="empty-icon" />
                <h3>환자를 선택해주세요</h3>
                <p>좌측에서 환자를 검색하고 선택하면 진료를 시작할 수 있습니다.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocDashBoard;