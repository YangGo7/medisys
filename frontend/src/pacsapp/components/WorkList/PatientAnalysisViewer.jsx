// frontend/src/pacsapp/components/WorkList/PatientAnalysisViewer.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const PatientAnalysisViewer = ({ patient, onClose }) => {
  const [dicomStudies, setDicomStudies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [showOHIFViewer, setShowOHIFViewer] = useState(false);
  const iframeRef = useRef(null);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/';
  const OHIF_URL = process.env.REACT_APP_OHIF_URL || 'http://35.225.63.41:3001';

  // 환자의 DICOM Studies 조회
  useEffect(() => {
    if (patient?.uuid || patient?.patient_id) {
      fetchPatientDicomStudies();
    }
  }, [patient]);

  const fetchPatientDicomStudies = async () => {
    try {
      setLoading(true);
      setError('');
      
      // patient_id 또는 uuid 사용
      const patientIdentifier = patient.uuid || patient.patient_id;
      console.log('🔍 환자 DICOM Studies 조회:', patientIdentifier);
      
      const response = await axios.get(
        `${API_BASE_URL}integration/patients/${patientIdentifier}/dicom-studies/`
      );
      
      if (response.data.success) {
        setDicomStudies(response.data.studies || []);
        console.log('✅ DICOM Studies 조회 성공:', response.data.studies);
      } else {
        setError(response.data.error || 'DICOM Studies 조회 실패');
      }
    } catch (err) {
      console.error('❌ DICOM Studies 조회 실패:', err);
      setError('DICOM Studies 조회 중 오류 발생');
    } finally {
      setLoading(false);
    }
  };

  // 커스텀 OHIF 뷰어 URL 생성 (Medical Platform 브랜딩)
  const generateCustomOHIFUrl = (study) => {
    const studyInstanceUID = study.study_instance_uid;
    
    if (!studyInstanceUID) {
      throw new Error('Study Instance UID가 없습니다.');
    }

    // 커스텀 설정이 포함된 OHIF URL
    const baseUrl = `${OHIF_URL}/viewer`;
    const params = new URLSearchParams({
      StudyInstanceUIDs: studyInstanceUID,
      // 커스텀 설정 파라미터들
      investigationalUseDialog: 'never',
      showStudyList: 'false',
      showPatientList: 'false',
      showHeader: 'false',
      customBranding: 'medical_platform',
      theme: 'dark'
    });

    return `${baseUrl}?${params.toString()}`;
  };

  // OHIF 뷰어에서 분석 시작
  const startAnalysis = (study) => {
    try {
      const ohifUrl = generateCustomOHIFUrl(study);
      setSelectedStudy(study);
      setShowOHIFViewer(true);
      
      console.log('🚀 분석용 OHIF Viewer 시작:', ohifUrl);
      
      // iframe에 로드
      if (iframeRef.current) {
        iframeRef.current.src = ohifUrl;
      }
      
    } catch (error) {
      console.error('OHIF Viewer 시작 실패:', error);
      alert(`분석 뷰어 실행 실패: ${error.message}`);
    }
  };

  // 새 창에서 OHIF 열기 (백업 옵션)
  const openInNewWindow = (study) => {
    try {
      const ohifUrl = generateCustomOHIFUrl(study);
      const newWindow = window.open(ohifUrl, '_blank', 'width=1400,height=900,scrollbars=yes,resizable=yes');
      
      if (!newWindow) {
        alert('⚠️ 팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('새 창에서 OHIF 열기 실패:', error);
      alert(`새 창 열기 실패: ${error.message}`);
    }
  };

  // AI 분석 시작
  const startAIAnalysis = async (study) => {
    try {
      console.log('🤖 AI 분석 시작:', study.study_instance_uid);
      
      const response = await axios.post(`${API_BASE_URL}ai-analysis/analyze-study-now/`, {
        study_uid: study.study_instance_uid,
        patient_info: {
          patient_name: patient.patient_name || patient.display,
          patient_id: patient.patient_id || patient.uuid,
          study_description: study.study_description,
          modality: study.modality
        }
      });
      
      if (response.data.status === 'success') {
        alert('✅ AI 분석이 시작되었습니다.');
        // 분석 결과 페이지로 이동하거나 결과 표시
      } else {
        alert(`❌ AI 분석 시작 실패: ${response.data.message}`);
      }
    } catch (error) {
      console.error('AI 분석 시작 실패:', error);
      alert('AI 분석 시작 중 오류가 발생했습니다.');
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      // DICOM 날짜 형식 (YYYYMMDD) 처리
      if (dateString.length === 8) {
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);
        return `${year}-${month}-${day}`;
      }
      return new Date(dateString).toLocaleDateString('ko-KR');
    } catch {
      return dateString;
    }
  };

  // OHIF iframe 스타일 커스터마이징
  useEffect(() => {
    if (showOHIFViewer && iframeRef.current) {
      const iframe = iframeRef.current;
      
      iframe.onload = () => {
        try {
          // iframe 내부 스타일 조작 (CORS 정책에 따라 제한될 수 있음)
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          
          // 커스텀 스타일 추가
          const customStyle = iframeDoc.createElement('style');
          customStyle.textContent = `
            /* Medical Platform 브랜딩 */
            .cornerstone-enabled-image,
            .viewport-element {
              background-color: #000 !important;
            }
            
            /* OHIF 로고 숨기기 */
            .ohif-logo,
            [data-cy="ohif-logo"],
            .header-logo {
              display: none !important;
            }
            
            /* Medical Platform 로고/텍스트 */
            .header-brand::before {
              content: "🏥 Medical Platform";
              color: #00bcd4;
              font-weight: bold;
              font-size: 18px;
            }
            
            /* 툴바 스타일 */
            .toolbar-section {
              background-color: #1a1a1a !important;
              border-color: #333 !important;
            }
            
            /* 다크 테마 적용 */
            .viewport-header {
              background-color: rgba(0, 0, 0, 0.8) !important;
              color: #fff !important;
            }
            
            /* 측정 도구 색상 */
            .annotation-line {
              stroke: #00bcd4 !important;
            }
            
            /* 스터디 목록 숨기기 */
            .study-list-container,
            [data-cy="study-list"] {
              display: none !important;
            }
          `;
          
          iframeDoc.head.appendChild(customStyle);
          
        } catch (error) {
          console.warn('iframe 스타일 적용 실패 (CORS 제한):', error);
        }
      };
    }
  }, [showOHIFViewer]);

  if (showOHIFViewer) {
    return (
      <div style={styles.viewerContainer}>
        {/* 뷰어 헤더 */}
        <div style={styles.viewerHeader}>
          <div style={styles.patientInfo}>
            <h3>🏥 Medical Platform - DICOM 분석</h3>
            <p>
              환자: {patient.patient_name || patient.display} | 
              ID: {patient.patient_id || patient.uuid} |
              검사: {selectedStudy?.study_description || 'N/A'}
            </p>
          </div>
          <div style={styles.viewerControls}>
            <button 
              onClick={() => startAIAnalysis(selectedStudy)}
              style={styles.aiButton}
            >
              🤖 AI 분석 시작
            </button>
            <button 
              onClick={() => openInNewWindow(selectedStudy)}
              style={styles.newWindowButton}
            >
              🔗 새 창에서 열기
            </button>
            <button 
              onClick={() => setShowOHIFViewer(false)}
              style={styles.closeButton}
            >
              ❌ 닫기
            </button>
          </div>
        </div>
        
        {/* OHIF 뷰어 iframe */}
        <iframe
          ref={iframeRef}
          style={styles.ohifFrame}
          title="Medical Platform DICOM Viewer"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.header}>
        <div>
          <h2>🖼️ 환자별 DICOM 분석</h2>
          <p>
            환자: {patient.patient_name || patient.display} 
            (ID: {patient.patient_id || patient.uuid})
          </p>
        </div>
        <button onClick={onClose} style={styles.closeHeaderButton}>
          ❌ 닫기
        </button>
      </div>

      {/* 로딩 */}
      {loading && (
        <div style={styles.loading}>
          <div style={styles.loadingSpinner}>🔄</div>
          <p>DICOM Studies 조회 중...</p>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div style={styles.error}>
          <p>⚠️ {error}</p>
          <button onClick={fetchPatientDicomStudies} style={styles.retryButton}>
            🔄 다시 시도
          </button>
        </div>
      )}

      {/* DICOM Studies 목록 */}
      {!loading && dicomStudies.length > 0 && (
        <div style={styles.studiesContainer}>
          <h3>📁 DICOM Studies ({dicomStudies.length}개)</h3>
          
          <div style={styles.studiesList}>
            {dicomStudies.map((study, index) => (
              <div key={study.study_instance_uid || index} style={styles.studyCard}>
                <div style={styles.studyInfo}>
                  <div style={styles.studyHeader}>
                    <h4>{study.study_description || 'Unknown Study'}</h4>
                    <span style={styles.modalityBadge}>{study.modality || 'N/A'}</span>
                  </div>
                  
                  <div style={styles.studyDetails}>
                    <div style={styles.studyMeta}>
                      <span>📅 {formatDate(study.study_date)}</span>
                      <span>📊 {study.series_count || 0} Series</span>
                      <span>🖼️ {study.instances_count || 0} Images</span>
                    </div>
                    
                    <div style={styles.studyUid}>
                      <small>Study UID: {study.study_instance_uid}</small>
                    </div>
                  </div>
                </div>
                
                <div style={styles.studyActions}>
                  <button
                    onClick={() => startAnalysis(study)}
                    style={styles.analysisButton}
                    title="분석용 뷰어에서 열기"
                  >
                    🔬 분석 시작
                  </button>
                  
                  <button
                    onClick={() => openInNewWindow(study)}
                    style={styles.viewButton}
                    title="새 창에서 보기"
                  >
                    👁️ 보기
                  </button>
                  
                  <button
                    onClick={() => startAIAnalysis(study)}
                    style={styles.aiAnalysisButton}
                    title="AI 자동 분석"
                  >
                    🤖 AI 분석
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 검사 없음 */}
      {!loading && !error && dicomStudies.length === 0 && (
        <div style={styles.noStudies}>
          <div style={styles.noStudiesIcon}>📂</div>
          <h3>DICOM 영상이 없습니다</h3>
          <p>이 환자의 영상검사 데이터가 PACS에 없습니다.</p>
          <button onClick={fetchPatientDicomStudies} style={styles.refreshButton}>
            🔄 새로고침
          </button>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '20px',
    borderBottom: '2px solid #e9ecef',
    backgroundColor: '#f8f9fa',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeHeaderButton: {
    padding: '10px 15px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  loading: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
  },
  loadingSpinner: {
    fontSize: '48px',
    animation: 'spin 2s linear infinite',
  },
  error: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
    color: '#dc3545',
  },
  retryButton: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  studiesContainer: {
    flex: 1,
    padding: '20px',
    overflow: 'auto',
  },
  studiesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  studyCard: {
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  studyInfo: {
    flex: 1,
  },
  studyHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '10px',
  },
  modalityBadge: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  studyDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  studyMeta: {
    display: 'flex',
    gap: '20px',
    fontSize: '14px',
    color: '#6c757d',
  },
  studyUid: {
    fontSize: '12px',
    color: '#868e96',
    fontFamily: 'monospace',
  },
  studyActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginLeft: '20px',
  },
  analysisButton: {
    padding: '8px 16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    whiteSpace: 'nowrap',
  },
  viewButton: {
    padding: '8px 16px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    whiteSpace: 'nowrap',
  },
  aiAnalysisButton: {
    padding: '8px 16px',
    backgroundColor: '#6f42c1',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    whiteSpace: 'nowrap',
  },
  noStudies: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
    color: '#6c757d',
  },
  noStudiesIcon: {
    fontSize: '64px',
  },
  refreshButton: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  viewerContainer: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 1001,
    display: 'flex',
    flexDirection: 'column',
  },
  viewerHeader: {
    padding: '15px 20px',
    backgroundColor: '#1a1a1a',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2px solid #333',
  },
  patientInfo: {
    flex: 1,
  },
  viewerControls: {
    display: 'flex',
    gap: '10px',
  },
  aiButton: {
    padding: '8px 16px',
    backgroundColor: '#6f42c1',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  newWindowButton: {
    padding: '8px 16px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  closeButton: {
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  ohifFrame: {
    flex: 1,
    border: 'none',
    width: '100%',
    height: '100%',
  },
};

// CSS 애니메이션 추가
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default PatientAnalysisViewer;