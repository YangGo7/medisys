// src/components/EMR/ImagingRequestPanel.jsx
import React, { useState } from 'react';

const ImagingRequestPanel = ({ selectedPatient, onRequestSuccess }) => {
  const [formData, setFormData] = useState({
    modality: '',
    body_part: '',
    study_description: '',
    clinical_info: '',
    priority: 'routine'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    setError(''); // 에러 메시지 클리어
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedPatient) {
      setError('환자를 먼저 선택해주세요.');
      return;
    }

    if (!formData.modality || !formData.body_part) {
      setError('검사 종류와 검사 부위를 선택해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    console.log('🚀 영상검사 요청 시작:', {
      patient: selectedPatient,
      formData: formData
    });

    try {
      // 날짜 형식 변환 함수
      const formatBirthDate = (dateString) => {
        if (!dateString) return '';
        try {
          // 'YYYY-MM-DDTHH:mm:ss.sssZ' 또는 'YYYY-MM-DD' 형식을 'YYYY-MM-DD'로 변환
          const date = new Date(dateString);
          return date.toISOString().split('T')[0]; // YYYY-MM-DD 형식으로 변환
        } catch (error) {
          console.warn('날짜 변환 실패:', dateString, error);
          return '';
        }
      };

      const requestData = {
        patient_id: selectedPatient.uuid,
        patient_name: selectedPatient.display,
        birth_date: formatBirthDate(selectedPatient.person.birthdate), // 🔥 날짜 형식 변환
        sex: selectedPatient.person.gender,
        modality: formData.modality,
        body_part: formData.body_part,
        study_description: formData.study_description,
        clinical_info: formData.clinical_info,
        priority: formData.priority,
        requesting_physician: 'Dr. Current User', // 실제로는 로그인된 의사
        created_by: 'emr_user'
      };

      console.log('📤 전송할 데이터:', requestData);

      // 🔥 백엔드 API 호출
      const response = await fetch('http://35.225.63.41:8000/api/worklist/create-from-emr/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      console.log('📥 응답 상태:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 응답 오류:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ 성공 응답:', result);

      // 성공 처리
      if (result.success) {
        // 폼 초기화
        setFormData({
          modality: '',
          body_part: '',
          study_description: '',
          clinical_info: '',
          priority: 'routine'
        });

        if (onRequestSuccess) {
          onRequestSuccess(result);
        }
      } else {
        throw new Error(result.error || '요청 처리 중 오류가 발생했습니다.');
      }

    } catch (error) {
      console.error('❌ 영상검사 요청 실패:', error);
      setError(`요청 실패: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 환자가 선택되지 않은 경우
  if (!selectedPatient) {
    return (
      <div style={styles.noPatientContainer}>
        <div style={styles.noPatientIcon}>🏥</div>
        <p style={styles.noPatientText}>환자를 선택하면 영상검사를 요청할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* 선택된 환자 정보 */}
      <div style={styles.patientInfo}>
        <div style={styles.patientCard}>
          <strong>👤 {selectedPatient.display}</strong>
          <span style={styles.patientDetails}>
            {selectedPatient.person.gender === 'M' ? '남성' : '여성'} | 
            {selectedPatient.person.age}세 | 
            {selectedPatient.person.birthdate}
          </span>
        </div>
      </div>

      {/* 영상검사 요청 폼 */}
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>검사 종류 *</label>
            <select
              name="modality"
              value={formData.modality}
              onChange={handleChange}
              required
              style={styles.select}
            >
              <option value="">선택하세요</option>
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
              <option value="">선택하세요</option>
              {bodyPartOptions.map(part => (
                <option key={part} value={part}>
                  {part}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.formRow}>
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
            placeholder="환자의 증상, 의심 질환, 검사 사유 등"
            rows={2}
            style={styles.textarea}
          />
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div style={styles.errorMessage}>
            ⚠️ {error}
          </div>
        )}

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={loading}
          style={{
            ...styles.submitButton,
            backgroundColor: loading ? '#ccc' : '#28a745',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '요청 중...' : '🏥 영상검사 요청'}
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    width: '100%'
  },
  noPatientContainer: {
    textAlign: 'center',
    padding: '20px',
    color: '#666'
  },
  noPatientIcon: {
    fontSize: '32px',
    marginBottom: '10px'
  },
  noPatientText: {
    fontSize: '14px',
    margin: 0
  },
  patientInfo: {
    marginBottom: '15px',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    border: '1px solid #e9ecef'
  },
  patientCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  patientDetails: {
    fontSize: '12px',
    color: '#6c757d'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: '4px'
  },
  input: {
    padding: '6px 8px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '12px'
  },
  select: {
    padding: '6px 8px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '12px',
    backgroundColor: '#fff'
  },
  textarea: {
    padding: '6px 8px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '12px',
    resize: 'vertical'
  },
  errorMessage: {
    padding: '8px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
    borderRadius: '4px',
    fontSize: '12px'
  },
  submitButton: {
    padding: '8px 12px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    marginTop: '8px'
  }
};

export default ImagingRequestPanel;