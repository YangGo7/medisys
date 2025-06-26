// frontend/src/components/DocDashBoard/DocDashBoard.jsx
// 🔥 새로운 레이아웃과 접는 카드 기능이 포함된 의사 대시보드

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
  Users,
  ChevronDown,
  ChevronUp,
  LogOut,
  Save,
  AlertCircle,
  Phone,
  MapPin,
  UserCheck,
  X
} from 'lucide-react';

// 개별 컴포넌트들 import
import AssignedPatientList from '../EMR/AssignedPatientList';
import PatientInfoPanel from '../EMR/PatientInfoPanel';
import LisRequestPanel from '../EMR/LisRequestPanel';
import ImagingRequestPanel from '../EMR/ImagingRequestPanel';
import VisitHistoryPanel from '../EMR/VisitHistoryPanel';
import DiagnosisPrescriptionPanel from '../EMR/DiagnosisPrescriptionPanel';
import { DEFAULT_DOCTOR_ID } from '../EMR/lisConfig';
import ResultModal from '../LIS/ResultModal';

// CSS 파일 import
import './DocDashBoard.css';

const DocDashBoard = () => {
  // 🔥 상태 관리
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState('assigned');
  const [allSearchResults, setAllSearchResults] = useState([]);
  const [isSearchingAllPatients, setIsSearchingAllPatients] = useState(false);
  const [allSearchError, setAllSearchError] = useState(null);
  const [scheduleRefresh, setScheduleRefresh] = useState(0);
  const [assignedPatients, setAssignedPatients] = useState({});
  const [personUUID, setPersonUUID] = useState(null);
  const [uuidLoading, setUuidLoading] = useState(false);
  const [uuidError, setUuidError] = useState(null);
  const [cdssResult, setCdssResult] = useState(null);
  // 🔥 드롭다운 상태 관리
  const [dropdownStates, setDropdownStates] = useState({
    consultation: false, // 진단 결과 및 전문 내용
    history: false,      // 내원 이력 (좌측 하단)
    diagnosis: false     // 진단 및 처방 (우측 하단)
  });

  // 🔥 환자 카드 펼침 상태 관리
  const [expandedPatients, setExpandedPatients] = useState(new Set());

  const API_BASE = process.env.REACT_APP_INTEGRATION_API;

  // 🔥 드롭다운 토글 함수
  const toggleDropdown = (cardName) => {
    setDropdownStates(prev => ({
      ...prev,
      [cardName]: !prev[cardName]
    }));
  };

  // 🔥 환자 카드 펼침 토글 함수
  const togglePatientExpansion = (patientId) => {
    setExpandedPatients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(patientId)) {
        newSet.delete(patientId);
      } else {
        newSet.add(patientId);
      }
      return newSet;
    });
  };

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

  // 🔥 진료 종료 함수
  const handleEndConsultation = () => {
    if (!selectedPatient) {
      alert('진료를 종료할 환자가 선택되지 않았습니다.');
      return;
    }

    if (window.confirm(`${selectedPatient.name || selectedPatient.display}님의 진료를 종료하시겠습니까?`)) {
      // 여기에 진료 종료 로직 추가
      console.log('진료 종료:', selectedPatient);
      
      // 상태 초기화
      setSelectedPatient(null);
      setDropdownStates({
        consultation: false,
        history: false,
        diagnosis: false
      });
      
      alert('진료가 종료되었습니다.');
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


  // 🔥 접을 수 있는 환자 카드 컴포넌트
  const CollapsiblePatientCard = ({ 
    patient, 
    isSelected, 
    onSelect, 
    onAssign, 
    onComplete 
  }) => {
    const patientId = patient.uuid || patient.mapping_id;
    const isExpanded = expandedPatients.has(patientId);

    const handleHeaderClick = (e) => {
      e.stopPropagation();
      onSelect(patient);
      togglePatientExpansion(patientId);
    };

    const handleAssignClick = (e) => {
      e.stopPropagation();
      if (onAssign) {
        onAssign(patient, 1); // 기본값으로 1번 진료실에 배정
      }
    };

    const handleCompleteClick = (e) => {
      e.stopPropagation();
      if (onComplete) {
        onComplete(patient);
      }
    };

    // 환자 상태 결정
    const getPatientStatus = () => {
      if (patient.assigned_room) {
        return { status: 'in-progress', label: '진료중' };
      } else if (patient.waiting) {
        return { status: 'waiting', label: '대기중' };
      } else {
        return { status: 'completed', label: '완료' };
      }
    };

    const { status, label } = getPatientStatus();




    // 👇 2. 환자 선택 시 UUID 조회
    useEffect(() => {
      const fetchPersonUUID = async () => {
        if (!selectedPatient || !selectedPatient.patient_identifier) {
          setPersonUUID(null);
          return;
        }

        setUuidLoading(true);
        setUuidError(null);

        try {
          const res = await axios.get(
            `${API_BASE}patient-uuid-by-identifier/${selectedPatient.patient_identifier}/`
          );

          if (res.data.success) {
            setPersonUUID(res.data.person_uuid);
          } else {
            setUuidError(res.data.error || 'UUID 조회 실패');
            setPersonUUID(null);
          }
        } catch (err) {
          console.error('UUID 조회 실패:', err);
          setUuidError('서버와의 통신에 실패했습니다.');
          setPersonUUID(null);
        } finally {
          setUuidLoading(false);
        }
      };

      fetchPersonUUID();
      console.log('선택된 환자:', selectedPatient);
    }, [selectedPatient]);

    useEffect(() => {
      const fetchCdssResult = async () => {
        if (!selectedPatient || !selectedPatient.patient_identifier) return;
        try {
          const res = await axios.get(`${API_BASE}cdss/predict/${selectedPatient.patient_identifier}/`);
          setCdssResult(res.data);
        } catch (err) {
          console.error('❌ CDSS 결과 가져오기 실패:', err);
          setCdssResult(null);
        }
      };

      fetchCdssResult();
    }, [selectedPatient]);

    return (
      <div className={`collapsible-patient-card ${isSelected ? 'selected' : ''} ${!isExpanded ? 'collapsed' : ''}`}>
        {/* 🔥 환자 카드 헤더 (항상 보이는 부분) */}
        <div 
          className={`patient-card-header ${isSelected ? 'selected' : ''}`}
          onClick={handleHeaderClick}
        >
          <div className="patient-basic-info">
            <div className="patient-name-header">
              <User size={14} />
              {patient.display || patient.name || 'Unknown Patient'}
            </div>
            <div className="patient-id-header">
              ID: {patient.patient_identifier || patient.uuid?.substring(0, 8) || 'N/A'}
            </div>
            <div className="patient-basic-details">
              <span>{patient.person?.gender === 'M' ? '남성' : '여성'}</span>
              <span>{patient.person?.age || '나이 미상'}세</span>
              <div className={`patient-status-badge ${status}`}>
                {label}
              </div>
            </div>
          </div>
          <ChevronDown 
            size={16} 
            className={`patient-toggle-icon ${isExpanded ? 'expanded' : ''}`}
          />
        </div>

        {/* 🔥 환자 카드 상세 내용 (접을 수 있는 부분) */}
        <div className={`patient-card-content ${isExpanded ? 'expanded' : ''}`}>
          <div className="patient-card-body">
            {/* 환자 상세 정보 */}
            <div className="patient-detail-section">
              <div className="patient-detail-row">
                <span className="detail-label">
                  <Calendar size={12} /> 생년월일
                </span>
                <span className="detail-value">
                  {patient.person?.birthdate ? 
                    new Date(patient.person.birthdate).toLocaleDateString('ko-KR') : 
                    '1995-07-15'
                  }
                </span>
              </div>
              
              <div className="patient-detail-row">
                <span className="detail-label">
                  <Phone size={12} /> 연락처
                </span>
                <span className="detail-value">
                  {patient.person?.phone || '010-0000-0000'}
                </span>
              </div>
              
              <div className="patient-detail-row">
                <span className="detail-label">
                  <MapPin size={12} /> 주소
                </span>
                <span className="detail-value">
                  {patient.person?.address || '주소 정보 없음'}
                </span>
              </div>
              
              <div className="patient-detail-row">
                <span className="detail-label">
                  <Activity size={12} /> 진료실
                </span>
                <span className="detail-value">
                  {patient.assigned_room ? `${patient.assigned_room}번` : '미배정'}
                </span>
              </div>
            </div>

            {/* 검사 패널 선택 */}
            <div className="patient-detail-section">
              <label className="detail-label">검사 패널 선택</label>
              <select className="patient-dropdown-select">
                <option value="">검사 패널을 선택하세요</option>
                <option value="basic">기본 검사 패널</option>
                <option value="comprehensive">종합 검사 패널</option>
                <option value="cardiac">심장 검사 패널</option>
                <option value="liver">간 기능 검사</option>
                <option value="kidney">신장 기능 검사</option>
                <option value="diabetes">당뇨 검사 패널</option>
              </select>
            </div>

            {/* 검사 주문 버튼 */}
            <button className="patient-order-button">
              <Activity size={14} />
              검사 주문 등록
            </button>

            {/* 액션 버튼들 */}
            <div className="patient-actions">
              {!patient.assigned_room ? (
                <button 
                  className="patient-action-btn assign"
                  onClick={handleAssignClick}
                >
                  <UserCheck size={14} />
                  진료실 배정
                </button>
              ) : (
                <button 
                  className="patient-action-btn complete"
                  onClick={handleCompleteClick}
                >
                  <X size={14} />
                  진료 완료
                </button>
              )}
            </div>

            {/* 추가 정보 섹션 */}
            <div className="patient-detail-section">
              <div className="patient-detail-row">
                <span className="detail-label">담당 의사</span>
                <span className="detail-value">Dr. Current User</span>
              </div>
              <div className="patient-detail-row">
                <span className="detail-label">진료 과목</span>
                <span className="detail-value">내과</span>
              </div>
              <div className="patient-detail-row">
                <span className="detail-label">내원 시간</span>
                <span className="detail-value">
                  {new Date().toLocaleTimeString('ko-KR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 🔥 드롭다운 카드 컴포넌트
  const DropdownCard = ({ 
    cardKey, 
    title, 
    icon: Icon, 
    children, 
    className = '' 
  }) => (
    <div className={`dropdown-card ${className}`}>
      <div 
        className="dropdown-header"
        onClick={() => toggleDropdown(cardKey)}
      >
        <div className="dropdown-title">
          <Icon size={20} />
          <span>{title}</span>
        </div>
        <div className={`dropdown-toggle ${dropdownStates[cardKey] ? 'expanded' : ''}`}>
          {dropdownStates[cardKey] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>
      <div className={`dropdown-content ${dropdownStates[cardKey] ? 'expanded' : ''}`}>
        <div className="dropdown-body">
          {children}
        </div>
      </div>
    </div>
  );

  // 🔥 환자 카드 리스트 렌더링
  const renderPatientList = () => {
  if (searchMode === 'assigned') {
    return (
      <AssignedPatientList
        onPatientSelect={setSelectedPatient}
        selectedPatient={selectedPatient}
        refreshTrigger={scheduleRefresh}
        searchTerm={searchTerm}
      />
    );
  } else {
    return (
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
              <CollapsiblePatientCard
                key={patientUniqueId}
                patient={{
                  uuid: patientUniqueId,
                  mapping_id: null,
                  display: p.name,
                  name: p.name,
                  assigned_room: null,
                  person: { age: p.age, gender: p.gender, birthdate: p.birthdate },
                  identifiers: [{ identifier: p.patient_identifier, identifierType: 'OpenMRS ID', preferred: true }],
                  patient_identifier: p.patient_identifier,
                  ...p
                }}
                isSelected={isSelected}
                onSelect={(patient) => setSelectedPatient(patient)}
                onAssign={handleAssignToRoom}
                onComplete={(patient) => console.log('Complete:', patient)}
              />
            );
          })
        )}
        {!isSearchingAllPatients && !allSearchError && allSearchResults.length === 0 && searchTerm.trim() === '' && (
          <div className="search-prompt">
            이름 또는 ID를 입력하여 전체 환자를 검색합니다.
          </div>
        )}
      </div>
    );
  }
};


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

      {/* 🔥 메인 컨테이너 - 새로운 레이아웃 */}
      <div className="dashboard-main">
        {/* 🔥 좌측 사이드바 - 환자 검색 */}
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
              {renderPatientList()}
            </div>
          </div>
        </div>

        {/* 🔥 메인 콘텐츠 상단 - 진단 결과 및 전문 내용 */}
        <div className="main-content-top">
          {selectedPatient ? (
            <DropdownCard
              cardKey="consultation"
              title="진단 결과 및 전문 내용"
              icon={Activity}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={18} />
                    환자 정보
                  </h4>
                  <PatientInfoPanel 
                    patient={selectedPatient} 
                    onOpenDetailModal={() => {/* 상세 모달 열기 로직 */}} 
                  />
                </div>
                <div>
                  <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Brain size={18} />
                    AI 분석 결과
                  </h4>
                  {cdssResult ? (
                    <ResultModal data={cdssResult} />
                    // 또는 <LogisticContributionChart data={cdssResult} />
                  ) : (
                  <div style={{ 
                    padding: '2rem',
                    background: 'var(--white-tone-5)',
                    borderRadius: '12px',
                    textAlign: 'center',
                    color: 'var(--text-gray)'
                  }}>
                    <Activity size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p>AI 분석이 진행 중입니다...</p>
                  </div>
                  )}
                </div>
              </div>
            </DropdownCard>
          ) : (
            <div className="no-patient-selected">
              <div className="empty-state">
                <Users size={64} className="empty-icon" />
                <h3>환자를 선택해주세요</h3>
                <p>좌측에서 환자를 검색하고 선택하면 진료를 시작할 수 있습니다.</p>
              </div>
            </div>
          )}
        </div>

        {/* 🔥 메인 콘텐츠 하단 - 2개 카드 */}
        <div className="main-content-bottom">
          {/* 내원 이력 카드 */}
          <DropdownCard
            cardKey="history"
            title="내원 이력"
            icon={FileText}
          >
            {selectedPatient ? (
              <VisitHistoryPanel patient={selectedPatient} />
            ) : (
              <div className="empty-message">
                환자를 선택하면 내원 이력을 확인할 수 있습니다.
              </div>
            )}
          </DropdownCard>

          {/* 진단 및 처방 카드 */}
          <DropdownCard
            cardKey="diagnosis"
            title="진단 및 처방"
            icon={Brain}
          >
            {selectedPatient ? (
              <DiagnosisPrescriptionPanel 
                patient={selectedPatient} 
                panelType="both"
              />
            ) : (
              <div className="empty-message">
                환자를 선택하면 진단 및 처방을 작성할 수 있습니다.
              </div>
            )}
          </DropdownCard>
        </div>

        {/* 🔥 우측 컨트롤 패널 */}
        <div className="dashboard-controls">
          {/* LIS 검사 요청 */}
          <div className="control-card">
            <div className="control-header">
              <TestTube size={16} />
              LIS 검사요청
            </div>
            <div className="control-content">
              {selectedPatient ? (
                uuidLoading ? (
                  <div style={{ color: 'gray' }}>UUID 조회 중...</div>
                ) : uuidError ? (
                  <div style={{ color: 'red' }}>⚠️ {uuidError}</div>
                ) : (
                  <LisRequestPanel
                    patient={selectedPatient}
                    doctorId={DEFAULT_DOCTOR_ID}
                    personUuid={personUUID} // 👈 넘길 수 있다면 이렇게
                    compact={true}
                  />
                )
              ) : (
                <div style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>
                  환자 선택 후<br />이용 가능
                </div>
              )}
            </div>
          </div>

          {/* 영상 검사요청 */}
          <div className="control-card">
            <div className="control-header">
              <Camera size={16} />
              영상 검사요청
            </div>
            <div className="control-content">
              {selectedPatient ? (
                <ImagingRequestPanel 
                  selectedPatient={selectedPatient}
                  compact={true}
                />
              ) : (
                <div style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>
                  환자 선택 후<br />이용 가능
                </div>
              )}
            </div>
          </div>

          {/* 빈 카드 (확장용) */}
          <div className="control-card">
            <div className="control-header">
              <AlertCircle size={16} />
              알림
            </div>
            <div className="control-content">
              <div style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>
                새로운 알림이<br />없습니다.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 진료 종료 버튼 */}
      {selectedPatient && (
        <button 
          className="end-consultation-btn"
          onClick={handleEndConsultation}
        >
          <LogOut size={20} />
          진료 종료
        </button>
      )}
    </div>
  );
};

export default DocDashBoard;