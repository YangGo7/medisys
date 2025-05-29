// frontend/src/components/EMR/ImagingRequestForm.jsx - EMR에서 영상검사 요청

import React, { useState } from 'react';

const ImagingRequestForm = ({ selectedPatient, onRequestCreated }) => {
  const [formData, setFormData] = useState({
    modality: '',
    body_part: '',
    study_description: '',
    clinical_info: '',
    priority: 'routine'
  });
  const [loading, setLoading] = useState(false);

  const modalityOptions = [
    { value: 'CR', label: 'Chest X-ray' },
    { value: 'CT', label: 'CT Scan' },
    { value: 'MR', label: 'MRI' },
    { value: 'US', label: 'Ultrasound' },
    { value: 'NM', label: 'Nuclear Medicine' },
    { value: 'PT', label: 'PET Scan' },
    { value: 'MG', label: 'Mammography' }
  ];

  const bodyPartOptions = [
    'CHEST', 'ABDOMEN', 'PELVIS', 'HEAD', 'NECK', 'SPINE', 
    'EXTREMITY', 'HEART', 'BRAIN', 'LIVER', 'KIDNEY'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedPatient) {
      alert('환자를 먼저 선택해주세요.');
      return;
    }

    setLoading(true);

    try {
      const requestData = {
        patient_id: selectedPatient.uuid,
        patient_name: selectedPatient.display,
        birth_date: selectedPatient.person.birthdate,
        sex: selectedPatient.person.gender,
        modality: formData.modality,
        body_part: formData.body_part,
        study_description: formData.study_description,
        clinical_info: formData.clinical_info,
        priority: formData.priority,
        requesting_physician: 'Dr. Current User', // 실제로는 로그인된 의사
        created_by: 'emr_user'
      };

      const response = await fetch('http://localhost:8000/api/workflow/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();

      if (result.success) {
        alert(`영상검사 요청이 성공적으로 생성되었습니다!\nWorkflow ID: ${result.workflow_id}\nAccession Number: ${result.accession_number}`);
        
        // 폼 초기화
        setFormData({
          modality: '',
          body_part: '',
          study_description: '',
          clinical_info: '',
          priority: 'routine'
        });

        // 부모 컴포넌트에 알림
        if (onRequestCreated) {
          onRequestCreated(result);
        }
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('영상검사 요청 실패:', error);
      alert(`요청 실패: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedPatient) {
    return (
      <div style={styles.noPatientContainer}>
        <div style={styles.noPatientIcon}>🏥</div>
        <p>환자를 선택하면 영상검사를 요청할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.patientInfo}>
        <h3 style={styles.sectionTitle}>👤 선택된 환자</h3>
        <div style={styles.patientCard}>
          <p><strong>이름:</strong> {selectedPatient.display}</p>
          <p><strong>성별:</strong> {selectedPatient.person.gender === 'M' ? '남성' : '여성'}</p>
          <p><strong>생년월일:</strong> {selectedPatient.person.birthdate}</p>
          <p><strong>나이:</strong> {selectedPatient.person.age}세</p>
        </div>
      </div>

      <div style={styles.form}>
        <h3 style={styles.sectionTitle}>🏥 영상검사 요청</h3>
        
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>검사 종류 *</label>
            <select
              name="modality"
              value={formData.modality}
              onChange={handleChange}
              required
              style={styles.select}
            >
              <option value="">검사 종류 선택</option>
              {modalityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>검사 부위 *</label>
            <select
              name="body_part"
              value={formData.body_part}
              onChange={handleChange}
              required
              style={styles.select}
            >
              <option value="">검사 부위 선택</option>
              {bodyPartOptions.map(part => (
                <option key={part} value={part}>
                  {part}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>우선순위</label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              style={styles.select}
            >
              <option value="routine">일반</option>
              <option value="urgent">긴급</option>
              <option value="stat">응급</option>
            </select>
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>검사 설명</label>
          <input
            type="text"
            name="study_description"
            value={formData.study_description}
            onChange={handleChange}
            placeholder="예: Chest PA/Lateral, Brain MRI with contrast"
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>임상 정보</label>
          <textarea
            name="clinical_info"
            value={formData.clinical_info}
            onChange={handleChange}
            placeholder="환자의 증상, 의심 질환, 검사 사유 등을 입력하세요"
            rows={3}
            style={styles.textarea}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            ...styles.submitButton,
            backgroundColor: loading ? '#ccc' : '#28a745',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '요청 중...' : '🏥 영상검사 요청'}
        </button>
      </div>
    </div>
  );
};

// EMR 메인 페이지 확장 - 기존 EmrMainPage.jsx에 추가할 컴포넌트
const ImagingWorkflowPanel = ({ selectedPatient }) => {
  const [requestedStudies, setRequestedStudies] = useState([]);
  const [completedStudies, setCompletedStudies] = useState([]);
  const [loading, setLoading] = useState(false);

  // 요청한 검사 목록 조회
  const fetchRequestedStudies = async () => {
    if (!selectedPatient) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/ris/worklist/?patient_id=${selectedPatient.uuid}`);
      const result = await response.json();
      
      if (result.success) {
        setRequestedStudies(result.data);
      }
    } catch (error) {
      console.error('요청 검사 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 완료된 검사 목록 조회
  const fetchCompletedStudies = async () => {
    if (!selectedPatient) return;

    try {
      const response = await fetch(`http://localhost:8000/api/emr/completed-studies/?patient_id=${selectedPatient.uuid}`);
      const result = await response.json();
      
      if (result.success) {
        setCompletedStudies(result.data);
      }
    } catch (error) {
      console.error('완료 검사 목록 조회 실패:', error);
    }
  };

  React.useEffect(() => {
    fetchRequestedStudies();
    fetchCompletedStudies();
  }, [selectedPatient]);

  const handleRequestCreated = (newRequest) => {
    // 새 요청이 생성되면 목록 새로고침
    fetchRequestedStudies();
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'emr_requested': { text: 'EMR 요청', color: '#6c757d' },
      'ris_received': { text: 'RIS 접수', color: '#007bff' },
      'scheduled': { text: '예약됨', color: '#ffc107' },
      'in_progress': { text: '진행중', color: '#fd7e14' },
      'image_uploaded': { text: '영상업로드', color: '#20c997' },
      'ai_analyzing': { text: 'AI분석중', color: '#6f42c1' },
      'ai_completed': { text: 'AI완료', color: '#6610f2' },
      'reading_pending': { text: '판독대기', color: '#dc3545' },
      'reading_in_progress': { text: '판독중', color: '#e83e8c' },
      'reading_completed': { text: '판독완료', color: '#28a745' }
    };

    const statusInfo = statusMap[status] || { text: status, color: '#6c757d' };

    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold',
        backgroundColor: statusInfo.color,
        color: '#fff'
      }}>
        {statusInfo.text}
      </span>
    );
  };

  return (
    <div style={styles.workflowPanel}>
      <h3 style={styles.sectionTitle}>📋 영상검사 현황</h3>
      
      {/* 진행중인 검사 */}
      <div style={styles.studySection}>
        <h4 style={styles.subTitle}>진행중인 검사</h4>
        {loading ? (
          <p>로딩 중...</p>
        ) : requestedStudies.length > 0 ? (
          <div style={styles.studyList}>
            {requestedStudies.map(study => (
              <div key={study.workflow_id} style={styles.studyItem}>
                <div style={styles.studyHeader}>
                  <span style={styles.studyTitle}>
                    {study.modality} - {study.body_part}
                  </span>
                  {getStatusBadge(study.workflow_status)}
                </div>
                <div style={styles.studyInfo}>
                  <p>Accession: {study.accession_number}</p>
                  <p>요청일: {new Date(study.requested_at).toLocaleDateString()}</p>
                  <div style={styles.progressBar}>
                    <div 
                      style={{
                        ...styles.progressFill,
                        width: `${study.progress}%`
                      }}
                    />
                  </div>
                  <p style={styles.progressText}>{study.progress}% 완료</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={styles.noData}>진행중인 검사가 없습니다.</p>
        )}
      </div>

      {/* 완료된 검사 */}
      <div style={styles.studySection}>
        <h4 style={styles.subTitle}>완료된 검사</h4>
        {completedStudies.length > 0 ? (
          <div style={styles.studyList}>
            {completedStudies.slice(0, 3).map(study => (
              <div key={study.workflow_id} style={styles.completedStudyItem}>
                <div style={styles.studyHeader}>
                  <span style={styles.studyTitle}>
                    {study.modality} - {study.body_part}
                  </span>
                  <button 
                    style={styles.viewButton}
                    onClick={() => window.open(study.viewer_url, '_blank')}
                  >
                    영상보기
                  </button>
                </div>
                <div style={styles.studyInfo}>
                  <p>판독의: {study.interpreting_physician}</p>
                  <p>완료일: {new Date(study.completed_at).toLocaleDateString()}</p>
                  {study.report_text && (
                    <div style={styles.reportPreview}>
                      <p><strong>판독소견:</strong></p>
                      <p style={styles.reportText}>
                        {study.report_text.length > 100 
                          ? `${study.report_text.substring(0, 100)}...` 
                          : study.report_text
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={styles.noData}>완료된 검사가 없습니다.</p>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #ddd',
    maxHeight: '600px',
    overflowY: 'auto'
  },
  noPatientContainer: {
    textAlign: 'center',
    padding: '40px',
    color: '#666'
  },
  noPatientIcon: {
    fontSize: '48px',
    marginBottom: '20px'
  },
  patientInfo: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    border: '1px solid #e9ecef'
  },
  patientCard: {
    fontSize: '14px',
    lineHeight: '1.5'
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: '15px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333'
  },
  form: {
    width: '100%'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '15px'
  },
  formGroup: {
    marginBottom: '15px'
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#555'
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: '#fff',
    boxSizing: 'border-box'
  },
  textarea: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    resize: 'vertical',
    boxSizing: 'border-box'
  },
  submitButton: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    marginTop: '10px'
  },
  // 워크플로우 패널 스타일
  workflowPanel: {
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #ddd'
  },
  studySection: {
    marginBottom: '25px'
  },
  subTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '10px',
    color: '#555'
  },
  studyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  studyItem: {
    padding: '15px',
    border: '1px solid #e9ecef',
    borderRadius: '6px',
    backgroundColor: '#f8f9fa'
  },
  completedStudyItem: {
    padding: '15px',
    border: '1px solid #d4edda',
    borderRadius: '6px',
    backgroundColor: '#d1ecf1'
  },
  studyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  studyTitle: {
    fontSize: '14px',
    fontWeight: 'bold'
  },
  studyInfo: {
    fontSize: '12px',
    color: '#666'
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    overflow: 'hidden',
    margin: '8px 0'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#28a745',
    transition: 'width 0.3s ease'
  },
  progressText: {
    fontSize: '11px',
    color: '#28a745',
    fontWeight: 'bold'
  },
  viewButton: {
    padding: '4px 8px',
    fontSize: '12px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  reportPreview: {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    border: '1px solid #dee2e6'
  },
  reportText: {
    fontSize: '11px',
    lineHeight: '1.4',
    color: '#495057'
  },
  noData: {
    color: '#6c757d',
    fontStyle: 'italic',
    fontSize: '14px'
  }
};

// EMR 메인 페이지 수정 - 기존 EmrMainPage.jsx 확장
const EnhancedEmrMainPage = () => {
  const [activeTab, setActiveTab] = useState('진료');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [assignedPatients, setAssignedPatients] = useState({ 1: null, 2: null });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const assignToRoom = (roomNumber) => {
    if (!selectedPatient) return;
    setAssignedPatients((prev) => ({ ...prev, [roomNumber]: selectedPatient }));
    setSelectedPatient(null);
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
            <p>사용자 환경 설정, 권한 관리 등의 기능이 들어갈 수 있습니다.</p>
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

          {/* 새로 추가: 영상검사 요청 패널 */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>🏥 영상검사 요청</h3>
            <ImagingRequestForm 
              selectedPatient={selectedPatient}
              onRequestCreated={(result) => {
                console.log('새 검사 요청 생성:', result);
              }}
            />
          </div>

          {/* 새로 추가: 영상검사 현황 패널 */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>📋 영상검사 현황</h3>
            <ImagingWorkflowPanel selectedPatient={selectedPatient} />
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
  gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
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
  minHeight: '300px'
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

export default ImagingRequestForm;
export { ImagingWorkflowPanel, EnhancedEmrMainPage };