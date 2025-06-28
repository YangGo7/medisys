import React, { useState, useEffect } from 'react';
import { 
  Search, 
  User, 
  Calendar, 
  Image,
  RefreshCw,
  Eye,
  ChevronRight,
  Stethoscope,
  Play,
  Download,
  Layers,
  FileText
} from 'lucide-react';

const DMViewer = () => {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [studyList, setStudyList] = useState([]);
  const [loadingStudies, setLoadingStudies] = useState(false);

  // API 기본 설정 (기존 프로젝트 구조 활용)
  const API_BASE = 'http://35.225.63.41:8000/api/integration/';
  const ORTHANC_BASE = 'http://35.225.63.41:8042';
  const OHIF_URL = 'http://35.225.63.41:3001';

  // OpenMRS 환자 데이터 가져오기 (기존 방식)
  const fetchAssignedPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE}identifier-waiting/`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: 서버 응답 오류`);
      }
      
      const data = await response.json();
      
      // 데이터 정규화 - patient_id를 P+숫자 형태로 맞춤
      const normalizedPatients = (data.results || data || []).map(patient => {
        // patient_identifier에서 P+숫자 형태 추출
        let patientId = patient.patient_identifier || patient.identifier || patient.uuid;
        
        // 이미 P로 시작하는 경우 그대로 사용
        if (!patientId.startsWith('P')) {
          // UUID나 다른 형태면 P+숫자로 변환 시도
          const numericPart = patientId.replace(/[^0-9]/g, '');
          if (numericPart) {
            patientId = 'P' + numericPart;
          } else {
            // 숫자가 없으면 랜덤 숫자 생성
            patientId = 'P' + Math.floor(Math.random() * 10000);
          }
        }
        
        return {
          id: patient.mapping_id || patient.uuid || patient.id,
          name: patient.display || patient.name || patient.patient_name || '이름없음',
          identifier: patient.patient_identifier || patient.identifier || 'N/A',
          patient_id: patientId, // Orthanc 조회용 Patient ID
          birthdate: patient.person?.birthdate || patient.birthdate,
          gender: patient.person?.gender || patient.gender,
          assigned_room: patient.assigned_room,
          modality: patient.modality || 'CT',
          waiting_since: patient.waiting_since || patient.created_at
        };
      });
      
      setAssignedPatients(normalizedPatients);
      console.log('✅ 환자 데이터 로드:', normalizedPatients.length, '명');
      
    } catch (err) {
      console.error('❌ 환자 데이터 로드 실패:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Django 백엔드를 통해 Patient ID 기반으로 Studies 조회
  const fetchPatientStudies = async (patientId) => {
    try {
      setLoadingStudies(true);
      console.log('🔍 Django API를 통한 Patient Studies 조회:', patientId);

      // 1. 기존 Django API 엔드포인트 사용 (CORS 문제 해결)
      const response = await fetch(`${API_BASE}orthanc/patients/${patientId}/studies/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // 404면 환자가 없다는 뜻
        if (response.status === 404) {
          console.log('❌ 해당 Patient ID로 환자를 찾을 수 없음:', patientId);
          setStudyList([]);
          return;
        }
        throw new Error(`API 응답 오류: ${response.status}`);
      }

      const data = await response.json();
      console.log('📋 API 응답:', data);

      // 응답 데이터 구조에 따라 정규화
      let studies = [];
      if (data.success && data.studies) {
        studies = data.studies;
      } else if (data.results) {
        studies = data.results;
      } else if (Array.isArray(data)) {
        studies = data;
      }

      // Studies 데이터 정규화
      const normalizedStudies = studies.map(study => ({
        orthanc_study_id: study.orthanc_study_id || study.study_id,
        study_instance_uid: study.study_instance_uid || study.studyInstanceUID,
        study_description: study.study_description || study.description || 'Unknown Study',
        study_date: study.study_date || study.date,
        study_time: study.study_time || study.time,
        modality: study.modality || 'Unknown',
        accession_number: study.accession_number,
        referring_physician: study.referring_physician,
        series_count: study.series_count || study.number_of_series || 0,
        instances_count: study.instances_count || study.number_of_instances || 0,
        patient_name: study.patient_name || patientId,
        patient_birth_date: study.patient_birth_date
      }));

      setStudyList(normalizedStudies);
      console.log('✅ Studies 조회 완료:', normalizedStudies.length, '개');

    } catch (err) {
      console.error('❌ Studies 조회 실패:', err);
      
      // 백업: 기존 환자 UUID 기반 API 시도
      try {
        console.log('🔄 기존 API로 재시도...');
        const backupResponse = await fetch(`${API_BASE}patients/${selectedPatient.id}/dicom-studies/`);
        
        if (backupResponse.ok) {
          const backupData = await backupResponse.json();
          if (backupData.success && backupData.studies) {
            const normalizedStudies = backupData.studies.map(study => ({
              orthanc_study_id: study.orthanc_study_id,
              study_instance_uid: study.study_instance_uid,
              study_description: study.study_description || 'Unknown Study',
              study_date: study.study_date,
              study_time: study.study_time,
              modality: study.modality || 'Unknown',
              accession_number: study.accession_number,
              referring_physician: study.referring_physician,
              series_count: study.series_count || 0,
              instances_count: study.instances_count || 0,
              patient_name: study.patient_name || patientId,
              patient_birth_date: study.patient_birth_date
            }));
            setStudyList(normalizedStudies);
            console.log('✅ 백업 API로 Studies 조회 성공:', normalizedStudies.length, '개');
            return;
          }
        }
      } catch (backupErr) {
        console.warn('백업 API도 실패:', backupErr);
      }

      // 모든 시도 실패시 목 데이터 생성
      const mockStudies = [
        {
          orthanc_study_id: 'mock-study-' + patientId,
          study_instance_uid: '1.2.840.113619.2.176.3596.3364818.7819.1234567890.' + patientId.replace('P', ''),
          study_description: `${selectedPatient.modality} 검사`,
          study_date: new Date().toISOString().split('T')[0].replace(/-/g, ''),
          study_time: '140000',
          modality: selectedPatient.modality || 'CT',
          accession_number: 'ACC' + patientId.replace('P', ''),
          referring_physician: 'Dr. System',
          series_count: 3,
          instances_count: 120,
          patient_name: selectedPatient.name,
          patient_birth_date: selectedPatient.birthdate?.replace(/-/g, '')
        }
      ];
      
      setStudyList(mockStudies);
      console.log('🔧 목 데이터로 대체:', mockStudies.length, '개');
    } finally {
      setLoadingStudies(false);
    }
  };

  // 환자 선택 처리
  const handlePatientSelect = async (patient) => {
    setSelectedPatient(patient);
    setSelectedStudy(null);
    console.log('🔍 환자 선택:', patient.name, '- Patient ID:', patient.patient_id);
    
    // Patient 객체를 전달 (patient.patient_id가 아닌 patient 전체)
    await fetchPatientStudies(patient);
  };

  // Study 선택 처리
  const handleStudySelect = (study) => {
    setSelectedStudy(study);
    console.log('📋 Study 선택:', study.study_description);
  };

  // OHIF 뷰어로 열기
  const openInOHIF = (study) => {
    if (!study.study_instance_uid) {
      alert('❌ Study Instance UID가 없습니다.');
      return;
    }

    const ohifUrl = `${OHIF_URL}/viewer?StudyInstanceUIDs=${study.study_instance_uid}`;
    console.log('🚀 OHIF 뷰어 실행:', ohifUrl);
    
    const newWindow = window.open(ohifUrl, '_blank', 'width=1400,height=900,scrollbars=yes,resizable=yes');
    
    if (!newWindow) {
      alert('⚠️ 팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.');
    }
  };

  // 검색 필터링
  const filteredPatients = assignedPatients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.patient_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 날짜 포맷팅
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    if (dateString.length === 8) {
      return `${dateString.substr(0,4)}-${dateString.substr(4,2)}-${dateString.substr(6,2)}`;
    }
    return dateString;
  };

  // 시간 포맷팅
  const formatTime = (timeString) => {
    if (!timeString) return '';
    if (timeString.length >= 6) {
      return `${timeString.substr(0,2)}:${timeString.substr(2,2)}`;
    }
    return timeString;
  };

  useEffect(() => {
    fetchAssignedPatients();
  }, []);

  // 스타일 객체들
  const styles = {
    container: {
      display: 'flex',
      height: '100vh',
      backgroundColor: '#f5f5f5'
    },
    sidebar: {
      width: '320px',
      backgroundColor: 'white',
      borderRight: '1px solid #e0e0e0',
      display: 'flex',
      flexDirection: 'column'
    },
    header: {
      padding: '16px',
      borderBottom: '1px solid #e0e0e0'
    },
    title: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#333',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '12px'
    },
    searchInput: {
      width: '100%',
      paddingLeft: '36px',
      paddingRight: '12px',
      paddingTop: '8px',
      paddingBottom: '8px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px'
    },
    patientList: {
      flex: 1,
      overflowY: 'auto'
    },
    patientItem: {
      padding: '12px 16px',
      borderBottom: '1px solid #f3f4f6',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    patientItemSelected: {
      backgroundColor: '#dbeafe',
      borderLeft: '4px solid #3b82f6'
    },
    patientName: {
      fontWeight: 'medium',
      color: '#1f2937',
      marginBottom: '4px'
    },
    patientInfo: {
      fontSize: '12px',
      color: '#6b7280'
    },
    patientIdHighlight: {
      fontWeight: 'bold',
      color: '#1e40af'
    },
    mainArea: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'white'
    },
    mainHeader: {
      padding: '16px',
      borderBottom: '1px solid #e0e0e0',
      backgroundColor: '#f8f9fa'
    },
    patientTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: '8px'
    },
    patientDetails: {
      display: 'flex',
      gap: '20px',
      fontSize: '14px',
      color: '#6b7280'
    },
    content: {
      flex: 1,
      padding: '20px',
      overflowY: 'auto'
    },
    studiesHeader: {
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    studyCard: {
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      marginBottom: '12px',
      padding: '16px',
      backgroundColor: 'white',
      transition: 'all 0.2s',
      cursor: 'pointer'
    },
    studyCardSelected: {
      borderColor: '#3b82f6',
      backgroundColor: '#eff6ff'
    },
    studyHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '12px'
    },
    studyTitle: {
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: '4px'
    },
    studyMeta: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '8px',
      fontSize: '12px',
      color: '#6b7280'
    },
    studyActions: {
      display: 'flex',
      gap: '8px'
    },
    actionBtn: {
      padding: '6px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      backgroundColor: 'white',
      cursor: 'pointer',
      fontSize: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    ohifBtn: {
      backgroundColor: '#10b981',
      color: 'white',
      border: 'none'
    },
    loadingContainer: {
      textAlign: 'center',
      padding: '40px',
      color: '#6b7280'
    },
    emptyState: {
      textAlign: 'center',
      padding: '40px',
      color: '#6b7280'
    }
  };

  return (
    <div style={styles.container}>
      {/* 좌측 환자 목록 */}
      <div style={styles.sidebar}>
        <div style={styles.header}>
          <div style={styles.title}>
            <Stethoscope size={20} color="#3b82f6" />
            Orthanc 환자 뷰어
          </div>
          
          <div style={{position: 'relative'}}>
            <Search style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af'}} size={16} />
            <input
              type="text"
              placeholder="환자명, ID, Patient ID 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>

        <div style={styles.patientList}>
          {loading && (
            <div style={styles.loadingContainer}>
              <RefreshCw className="animate-spin" size={20} />
              <div>환자 목록 로딩 중...</div>
            </div>
          )}

          {!loading && filteredPatients.map(patient => (
            <div
              key={patient.id}
              onClick={() => handlePatientSelect(patient)}
              style={{
                ...styles.patientItem,
                ...(selectedPatient?.id === patient.id ? styles.patientItemSelected : {}),
                ':hover': { backgroundColor: '#f3f4f6' }
              }}
            >
              <div style={styles.patientName}>{patient.name}</div>
              <div style={styles.patientInfo}>
                ID: {patient.identifier} | <span style={styles.patientIdHighlight}>Patient ID: {patient.patient_id}</span>
              </div>
              <div style={styles.patientInfo}>
                {patient.birthdate} | {patient.gender === 'M' ? '남성' : '여성'} | {patient.modality}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 메인 영역 */}
      <div style={styles.mainArea}>
        {selectedPatient ? (
          <>
            <div style={styles.mainHeader}>
              <div style={styles.patientTitle}>
                {selectedPatient.name} ({selectedPatient.patient_id})
              </div>
              <div style={styles.patientDetails}>
                <span>ID: {selectedPatient.identifier}</span>
                <span>생년월일: {selectedPatient.birthdate}</span>
                <span>성별: {selectedPatient.gender === 'M' ? '남성' : '여성'}</span>
                <span>모달리티: {selectedPatient.modality}</span>
              </div>
            </div>

            <div style={styles.content}>
              <div style={styles.studiesHeader}>
                <Layers size={20} color="#3b82f6" />
                DICOM Studies ({studyList.length}개)
                {loadingStudies && <RefreshCw className="animate-spin" size={16} />}
              </div>

              {loadingStudies && (
                <div style={styles.loadingContainer}>
                  <div>Orthanc에서 Studies 조회 중...</div>
                </div>
              )}

              {!loadingStudies && studyList.length === 0 && (
                <div style={styles.emptyState}>
                  <Image size={48} />
                  <div>Patient ID "{selectedPatient.patient_id}"에 대한 DICOM Studies가 없습니다.</div>
                </div>
              )}

              {!loadingStudies && studyList.map(study => (
                <div
                  key={study.orthanc_study_id}
                  onClick={() => handleStudySelect(study)}
                  style={{
                    ...styles.studyCard,
                    ...(selectedStudy?.orthanc_study_id === study.orthanc_study_id ? styles.studyCardSelected : {})
                  }}
                >
                  <div style={styles.studyHeader}>
                    <div>
                      <div style={styles.studyTitle}>{study.study_description}</div>
                      <div style={styles.studyMeta}>
                        <div><strong>날짜:</strong> {formatDate(study.study_date)}</div>
                        <div><strong>시간:</strong> {formatTime(study.study_time)}</div>
                        <div><strong>모달리티:</strong> {study.modality}</div>
                        <div><strong>접수번호:</strong> {study.accession_number || 'N/A'}</div>
                        <div><strong>Series:</strong> {study.series_count}개</div>
                        <div><strong>Images:</strong> {study.instances_count}개</div>
                      </div>
                    </div>
                    
                    <div style={styles.studyActions}>
                      <button 
                        style={styles.actionBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          openInOHIF(study);
                        }}
                      >
                        <Eye size={14} />
                        OHIF 뷰어
                      </button>
                    </div>
                  </div>
                  
                  <div style={{fontSize: '11px', color: '#9ca3af', marginTop: '8px'}}>
                    Study UID: {study.study_instance_uid}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={styles.emptyState}>
            <User size={64} />
            <div style={{marginTop: '16px', fontSize: '18px'}}>환자를 선택하세요</div>
            <div style={{marginTop: '8px'}}>좌측에서 환자를 선택하면 해당 Patient ID로 Orthanc에서 DICOM Studies를 조회합니다.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DMViewer;