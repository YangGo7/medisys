// frontend/src/components/EMR/DocDashBoard.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import PatientInfoPanel from '../EMR/PatientInfoPanel';
import VisitHistoryPanel from '../EMR/VisitHistoryPanel';
import LisRequestPanel from '../EMR/LisRequestPanel';
import ImagingRequestPanel from '../EMR/ImagingRequestPanel';
import DiagnosisPrescriptionPanel from '../EMR/DiagnosisPrescriptionPanel';
import AssignedPatientList from '../EMR/AssignedPatientList';
import PatientDetailModal from '../EMR/PatientDetailModal';
import lisConfig from '../EMR/lisConfig';

import { saveLog } from '../utils/saveLog';

import './DocDashBoard.css';
const DEFAULT_DOCTOR_ID = "Yanggo"; // 💡 개발용 임시 의사 ID
const DocDashBoard = () => {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [fullSelectedPatientData, setFullSelectedPatientData] = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [scheduleRefresh, setScheduleRefresh] = useState(0);

  // 검색 관련 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [allSearchResults, setAllSearchResults] = useState([]);
  const [isSearchingAllPatients, setIsSearchingAllPatients] = useState(false);
  const [allSearchError, setAllSearchError] = useState(null);
  const [searchMode, setSearchMode] = useState('assigned');

  const API_BASE = process.env.REACT_APP_INTEGRATION_API;

  // 전체 환자 검색 함수
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

  // 검색 모드 변경 시 자동 검색
  useEffect(() => {
    if (searchMode === 'all') {
      const handler = setTimeout(() => {
        fetchAllPatientsFromBackend();
      }, 300);
      return () => clearTimeout(handler);
    } else {
      setAllSearchResults([]);
    }
  }, [searchTerm, searchMode, fetchAllPatientsFromBackend]);

  // 진료실 배정 함수
  const handleAssignToRoom = async (patientToAssign, roomNumber) => {
    if (!patientToAssign) {
      alert('환자를 먼저 선택해주세요.');
      return;
    }
    
    try {
      const newMappingResponse = await axios.post(`${API_BASE}create-identifier-based-mapping/`, {
        openmrs_patient_uuid: patientToAssign.uuid,
        patient_identifier: patientToAssign.patient_identifier,
      });

      if (newMappingResponse.data.success) {
        const newMappingId = newMappingResponse.data.mapping_id;
        
        const response = await axios.post(`${API_BASE}assign-room/`, {
          patientId: newMappingId,
          patientIdentifier: patientToAssign.patient_identifier,
          room: roomNumber,
        });
        
        if (!response.data.success) throw new Error(response.data.error || '배정 실패');
        
        saveLog({
          patient_id: newMappingId,
          patient_name: patientToAssign.name || patientToAssign.display,
          doctor_id: localStorage.getItem('doctor_id') || 'UNKNOWN',
          doctor_name: localStorage.getItem('doctor_name') || '',
          request_type: '진료실 배정',
          request_detail: `진료실 ${roomNumber}번으로 배정됨`,
        });
        
        alert(`✅ ${patientToAssign.name}님이 진료실 ${roomNumber}번에 배정되었습니다.`);
        setScheduleRefresh(prev => prev + 1);
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

  // 환자 상세 모달 열기
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

  return (
    <div className="doc-dashboard">
      {/* EMR 시스템 헤더 */}
      <div className="emr-header">
        <span className="emr-title">🏥 EMR 시스템</span>
      </div>

      {/* 5개 칼럼 레이아웃 */}
      <div className="clinical-columns">
        {/* 첫 번째 칼럼: 환자 검색 */}
        <div className="column column-1">
          <div className="column-header">
            <h3 className="column-title">
              🧑‍⚕️ 환자 검색
            </h3>
            <div className="search-mode-buttons">
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
                진료실 배정 환자
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

          <div className="search-section">
            <input
              type="text"
              placeholder="이름 또는 ID로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => { if (e.key === 'Enter') handleMainSearch(); }}
              className="search-input"
            />
            <button onClick={handleMainSearch} className="search-button">
              검색
            </button>
          </div>

          <div className="patient-list-area">
            {searchMode === 'assigned' ? (
              <AssignedPatientList
                onPatientSelect={setSelectedPatient}
                selectedPatient={selectedPatient}
                refreshTrigger={scheduleRefresh}
                searchTerm={searchTerm}
              />
            ) : (
              <div className="all-patients-list">
                {isSearchingAllPatients && (
                  <div className="status-message">전체 환자 검색 중...</div>
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
                          ...p
                        })}
                        className={`patient-item ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="patient-info-text">
                          <div className="patient-name">👤 {p.name}</div>
                          <div className="patient-id">🆔 {p.patient_identifier}</div>
                          <div className="patient-details">
                            👥 {p.gender === 'M' ? '남성' : '여성'} | 🎂 {p.age}세
                          </div>
                        </div>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            await handleAssignToRoom(p, 1);
                          }}
                          className="assign-btn"
                        >
                          진료실 1번 배정
                        </button>
                      </div>
                    );
                  })
                )}
                {!isSearchingAllPatients && !allSearchError && allSearchResults.length === 0 && searchTerm.trim() === '' && (
                  <div className="placeholder-message">
                    이름 또는 ID를 입력하여 전체 환자를 검색합니다.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 두 번째 칼럼: 환자 정보 */}
        <div className="column column-2">
          <div className="column-header">
            <h3 className="column-title">📄 환자 정보</h3>
          </div>
          <div className="column-content">
            {selectedPatient ? (
              <PatientInfoPanel 
                patient={selectedPatient} 
                onOpenDetailModal={openPatientModal} 
              />
            ) : (
              <div className="empty-message">
                배정된 환자를 선택해주세요.
              </div>
            )}
          </div>
        </div>

        {/* 세 번째 칼럼: LIS 검사 요청 */}
        <div className="column column-3">
          <div className="column-header">
            <h3 className="column-title">🔬 LIS 검사 요청</h3>
          </div>
          <div className="column-content">
            {selectedPatient ? (
              <LisRequestPanel 
                patient={selectedPatient} 
                doctorId={DEFAULT_DOCTOR_ID} 
              />
            ) : (
              <div className="empty-message">
                배정된 환자를 선택해주세요.
              </div>
            )}
          </div>
          
          <div className="column-divider"></div>
          
          <div className="column-header">
            <h3 className="column-title">🏥 영상검사 요청</h3>
          </div>
          <div className="column-content">
            {selectedPatient ? (
              <ImagingRequestPanel selectedPatient={selectedPatient} />
            ) : (
              <div className="empty-message">
                배정된 환자를 선택해주세요.
              </div>
            )}
          </div>
        </div>

        {/* 네 번째 칼럼: 내원 이력 */}
        <div className="column column-4">
          <div className="column-header">
            <h3 className="column-title">📁 내원 이력</h3>
          </div>
          <div className="column-content">
            {selectedPatient ? (
              <VisitHistoryPanel patient={selectedPatient} />
            ) : (
              <div className="empty-message">
                배정된 환자를 선택해주세요.
              </div>
            )}
          </div>
        </div>

        {/* 다섯 번째 칼럼: 진단 및 처방 */}
        <div className="column column-5">
          <div className="column-content">
            <DiagnosisPrescriptionPanel 
              patient={selectedPatient} 
              panelType="both"
            />
          </div>
        </div>
      </div>

      {/* 환자 상세 모달 */}
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

export default DocDashBoard;