// frontend/src/components/OHIF/OHIFViewer.jsx

import React, { useState, useEffect } from 'react';

const OHIFViewer = ({ studyInstanceUID = null, patientUUID = null }) => {
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const DJANGO_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://35.225.63.41:8000/api';
  const OHIF_URL = 'http://35.225.63.41:3001'; // OHIF Viewer URL

  useEffect(() => {
    fetchStudies();
  }, []);

  const fetchStudies = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Study 목록 조회 중...');
      const response = await fetch(`${DJANGO_BASE_URL}/ohif/studies/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📥 Study 목록 조회 성공:', data);
      setStudies(data);

    } catch (err) {
      console.error('❌ Study 목록 조회 실패:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openStudyInOHIF = (studyUID) => {
    if (!studyUID) {
      alert('Study UID가 없습니다.');
      return;
    }

    console.log('🖼️ OHIF에서 Study 열기:', studyUID);
    
    // OHIF Viewer URL 구성
    const ohifUrl = `${OHIF_URL}/viewer?StudyInstanceUIDs=${encodeURIComponent(studyUID)}`;
    
    // 새 탭에서 OHIF Viewer 열기
    const newWindow = window.open(ohifUrl, '_blank', 'width=1400,height=900,resizable=yes,scrollbars=yes');
    
    if (!newWindow) {
      alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.');
    }
  };

  const testOrthancConnection = async () => {
    try {
      console.log('🔧 Orthanc 연결 테스트...');
      const response = await fetch(`${DJANGO_BASE_URL}/ohif/orthanc/system`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const systemInfo = await response.json();
        console.log('✅ Orthanc 연결 성공:', systemInfo);
        alert(`Orthanc 연결 성공!\n이름: ${systemInfo.Name}\n버전: ${systemInfo.Version}`);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.error('❌ Orthanc 연결 실패:', err);
      alert(`Orthanc 연결 실패: ${err.message}`);
    }
  };

  const getStudyInfo = (study) => {
    const studyUID = study['0020000D']?.Value?.[0] || 'N/A';
    const patientName = study['00100010']?.Value?.[0] || 'Unknown';
    const patientID = study['00100020']?.Value?.[0] || 'N/A';
    const studyDate = study['00080020']?.Value?.[0] || 'N/A';
    const studyTime = study['00080030']?.Value?.[0] || '';
    const studyDescription = study['00081030']?.Value?.[0] || 'No Description';
    const modalities = study['00080061']?.Value?.[0] || 'N/A';
    const seriesCount = study['00201206']?.Value?.[0] || 0;
    const instanceCount = study['00201208']?.Value?.[0] || 0;

    return {
      studyUID,
      patientName,
      patientID,
      studyDate,
      studyTime,
      studyDescription,
      modalities,
      seriesCount,
      instanceCount
    };
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr || timeStr.length < 6) return timeStr;
    return `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}:${timeStr.substring(4, 6)}`;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}>🔄</div>
          <p>Study 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h3>❌ 오류 발생</h3>
          <p>{error}</p>
          <div style={styles.buttonGroup}>
            <button onClick={fetchStudies} style={styles.retryButton}>
              다시 시도
            </button>
            <button onClick={testOrthancConnection} style={styles.testButton}>
              연결 테스트
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>🏥 DICOM Study 목록</h2>
        <div style={styles.headerButtons}>
          <button onClick={fetchStudies} style={styles.refreshButton}>
            🔄 새로고침
          </button>
          <button onClick={testOrthancConnection} style={styles.testButton}>
            🔧 연결 테스트
          </button>
        </div>
      </div>

      {studies.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📭</div>
          <h3>DICOM Study가 없습니다</h3>
          <p>Orthanc에 DICOM 파일을 업로드해주세요.</p>
        </div>
      ) : (
        <div style={styles.studyGrid}>
          {studies.map((study, index) => {
            const info = getStudyInfo(study);
            return (
              <div key={index} style={styles.studyCard}>
                <div style={styles.studyHeader}>
                  <h3 style={styles.patientName}>👤 {info.patientName}</h3>
                  <span style={styles.patientId}>ID: {info.patientID}</span>
                </div>
                
                <div style={styles.studyInfo}>
                  <div style={styles.infoRow}>
                    <span style={styles.label}>📅 검사일:</span>
                    <span>{formatDate(info.studyDate)} {formatTime(info.studyTime)}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.label}>📝 설명:</span>
                    <span>{info.studyDescription}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.label}>🏷️ 모달리티:</span>
                    <span>{info.modalities}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.label}>📊 시리즈/인스턴스:</span>
                    <span>{info.seriesCount} / {info.instanceCount}</span>
                  </div>
                </div>

                <div style={styles.studyActions}>
                  <button
                    onClick={() => openStudyInOHIF(info.studyUID)}
                    style={styles.viewButton}
                  >
                    🖼️ OHIF로 보기
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(info.studyUID);
                      alert('Study UID가 클립보드에 복사되었습니다.');
                    }}
                    style={styles.copyButton}
                  >
                    📋 UID 복사
                  </button>
                </div>

                <div style={styles.studyUID}>
                  <small>Study UID: {info.studyUID.substring(0, 30)}...</small>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={styles.footer}>
        <p>총 {studies.length}개의 Study가 있습니다.</p>
        <a 
          href={`${OHIF_URL}/`} 
          target="_blank" 
          rel="noopener noreferrer"
          style={styles.ohifLink}
        >
          🔗 OHIF Viewer 직접 열기
        </a>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: '#f9f9f9',
    minHeight: '100vh'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  headerButtons: {
    display: 'flex',
    gap: '10px'
  },
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  testButton: {
    padding: '8px 16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: '#fff',
    borderRadius: '8px'
  },
  spinner: {
    fontSize: '32px',
    marginBottom: '16px'
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #dc3545'
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginTop: '20px'
  },
  retryButton: {
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px',
    backgroundColor: '#fff',
    borderRadius: '8px'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  studyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '20px',
    marginBottom: '20px'
  },
  studyCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #e9ecef'
  },
  studyHeader: {
    borderBottom: '1px solid #e9ecef',
    paddingBottom: '10px',
    marginBottom: '15px'
  },
  patientName: {
    margin: '0 0 5px 0',
    color: '#333',
    fontSize: '18px'
  },
  patientId: {
    color: '#666',
    fontSize: '14px'
  },
  studyInfo: {
    marginBottom: '15px'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '14px'
  },
  label: {
    fontWeight: 'bold',
    color: '#495057',
    minWidth: '120px'
  },
  studyActions: {
    display: 'flex',
    gap: '10px',
    marginBottom: '10px'
  },
  viewButton: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  copyButton: {
    padding: '10px 16px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  studyUID: {
    fontSize: '12px',
    color: '#6c757d',
    textAlign: 'center',
    marginTop: '10px',
    borderTop: '1px solid #e9ecef',
    paddingTop: '10px'
  },
  footer: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    marginTop: '20px'
  },
  ohifLink: {
    display: 'inline-block',
    marginTop: '10px',
    color: '#007bff',
    textDecoration: 'none',
    fontSize: '16px'
  }
};

export default OHIFViewer;