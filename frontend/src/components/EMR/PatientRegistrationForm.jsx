// PatientRegistrationForm.jsx - 간소화된 버전 (OpenMRS 상태 확인 제거)

import React, { useState } from 'react';
import axios from 'axios';

const PatientRegistrationForm = ({ onClose, onPatientCreated }) => {
  const [formData, setFormData] = useState({
    givenName: '',
    familyName: '',
    gender: 'M',
    birthdate: '',
    middleName: '',
    identifier: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const API_BASE = 'http://localhost:8000/api/integration/';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // 입력 시 해당 필드의 오류 제거
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // 필수 필드 검증
    if (!formData.givenName.trim()) newErrors.givenName = '이름을 입력해주세요';
    if (!formData.familyName.trim()) newErrors.familyName = '성을 입력해주세요';
    if (!formData.birthdate) newErrors.birthdate = '생년월일을 입력해주세요';

    // 생년월일 유효성 검사
    if (formData.birthdate) {
      const birthDate = new Date(formData.birthdate);
      const today = new Date();
      
      const todayString = today.toISOString().split('T')[0];
      
      if (formData.birthdate > todayString) {
        newErrors.birthdate = '생년월일은 오늘 이전이어야 합니다';
      }
      if (formData.birthdate < '1900-01-01') {
        newErrors.birthdate = '생년월일은 1900년 이후여야 합니다';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        givenName: formData.givenName.trim(),
        familyName: formData.familyName.trim(),
        gender: formData.gender,
        birthdate: formData.birthdate,
        ...(formData.middleName.trim() && { middleName: formData.middleName.trim() }),
        ...(formData.identifier.trim() && { identifier: formData.identifier.trim() })
      };

      console.log('📤 전송 데이터:', submitData);

      // 환자 생성 요청 (상태 확인 없이 바로 시도)
      const response = await axios.post(`${API_BASE}openmrs/patients/create/`, submitData, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      console.log('📥 서버 응답:', response.data);

      if (response.data.success) {
        const successMessage = `환자가 성공적으로 등록되었습니다!
UUID: ${response.data.patient.uuid}
환자번호: ${response.data.patient.identifiers?.[0]?.identifier || '자동생성'}
데이터 소스: ${response.data.source || 'OpenMRS'}`;
        
        alert(successMessage);
        
        // 등록된 환자 정보를 부모 컴포넌트에 전달
        if (onPatientCreated) {
          const newPatient = {
            uuid: response.data.patient.uuid,
            display: `${formData.givenName} ${formData.familyName}`,
            person: {
              gender: formData.gender,
              birthdate: formData.birthdate,
              age: calculateAge(formData.birthdate)
            },
            identifiers: response.data.patient.identifiers || []
          };
          onPatientCreated(newPatient);
        }

        if (onClose) onClose();
      } else {
        throw new Error(response.data.error || '알 수 없는 오류가 발생했습니다');
      }

    } catch (error) {
      console.error('❌ 환자 등록 실패:', error);
      
      let errorMessage = '환자 등록 중 오류가 발생했습니다.';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 400) {
        errorMessage = `입력 데이터 오류: ${error.response.data?.error || '잘못된 데이터입니다'}`;
      } else if (error.response?.status === 503) {
        errorMessage = 'OpenMRS 서버에 연결할 수 없습니다. Mock 데이터로 등록을 시도할까요?';
      } else if (error.request) {
        errorMessage = '서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.';
      } else {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthdate) => {
    if (!birthdate) return 0;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const generatePatientId = () => {
    const timestamp = new Date().getTime().toString().slice(-8);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    setFormData(prev => ({
      ...prev,
      identifier: `P${timestamp}${random}`
    }));
  };

  // 최대 날짜를 오늘로 설정
  const maxDate = new Date().toISOString().split('T')[0];

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>👤 신규 환자 등록</h2>
          <button onClick={onClose} style={styles.closeButton} type="button">✕</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>기본 정보</h3>
            
            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>성 <span style={styles.required}>*</span></label>
                <input
                  type="text"
                  name="familyName"
                  value={formData.familyName}
                  onChange={handleChange}
                  style={{...styles.input, ...(errors.familyName ? styles.inputError : {})}}
                  placeholder="김"
                />
                {errors.familyName && <span style={styles.errorText}>{errors.familyName}</span>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>이름 <span style={styles.required}>*</span></label>
                <input
                  type="text"
                  name="givenName"
                  value={formData.givenName}
                  onChange={handleChange}
                  style={{...styles.input, ...(errors.givenName ? styles.inputError : {})}}
                  placeholder="철수"
                />
                {errors.givenName && <span style={styles.errorText}>{errors.givenName}</span>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>중간 이름</label>
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="(선택사항)"
                />
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>성별 <span style={styles.required}>*</span></label>
                <select name="gender" value={formData.gender} onChange={handleChange} style={styles.select}>
                  <option value="M">남성</option>
                  <option value="F">여성</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>생년월일 <span style={styles.required}>*</span></label>
                <input
                  type="date"
                  name="birthdate"
                  value={formData.birthdate}
                  onChange={handleChange}
                  style={{...styles.input, ...(errors.birthdate ? styles.inputError : {})}}
                  max={maxDate}
                  min="1900-01-01"
                />
                {errors.birthdate && <span style={styles.errorText}>{errors.birthdate}</span>}
                <small style={styles.helpText}>
                  {formData.birthdate && `나이: ${calculateAge(formData.birthdate)}세`}
                </small>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>환자번호</label>
                <div style={styles.inputGroup}>
                  <input
                    type="text"
                    name="identifier"
                    value={formData.identifier}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="자동 생성"
                  />
                  <button type="button" onClick={generatePatientId} style={styles.generateButton}>
                    생성
                  </button>
                </div>
                <small style={styles.helpText}>비워두면 자동으로 생성됩니다</small>
              </div>
            </div>
          </div>

          <div style={styles.buttonGroup}>
            <button type="button" onClick={onClose} style={styles.cancelButton} disabled={loading}>
              취소
            </button>
            <button
              type="submit"
              style={{
                ...styles.submitButton,
                backgroundColor: loading ? '#ccc' : '#28a745',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              disabled={loading}
            >
              {loading ? '등록 중...' : '환자 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
    justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px'
  },
  modal: {
    backgroundColor: 'white', borderRadius: '12px', width: '100%',
    maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '20px 30px', borderBottom: '1px solid #e9ecef', backgroundColor: '#f8f9fa'
  },
  title: { margin: 0, fontSize: '24px', color: '#333', fontWeight: 'bold' },
  closeButton: {
    background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer',
    color: '#666', padding: '0', width: '30px', height: '30px',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  form: { padding: '30px' },
  section: { marginBottom: '30px' },
  sectionTitle: {
    fontSize: '18px', fontWeight: 'bold', color: '#495057', marginBottom: '20px',
    paddingBottom: '10px', borderBottom: '2px solid #e9ecef'
  },
  row: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px', marginBottom: '20px'
  },
  formGroup: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '14px', fontWeight: 'bold', color: '#495057', marginBottom: '5px' },
  required: { color: '#dc3545' },
  input: {
    padding: '10px 12px', border: '2px solid #ced4da', borderRadius: '6px',
    fontSize: '14px', transition: 'border-color 0.3s', outline: 'none'
  },
  inputError: { borderColor: '#dc3545' },
  select: {
    padding: '10px 12px', border: '2px solid #ced4da', borderRadius: '6px',
    fontSize: '14px', backgroundColor: 'white', outline: 'none'
  },
  inputGroup: { display: 'flex', gap: '8px' },
  generateButton: {
    padding: '10px 15px', backgroundColor: '#6c757d', color: 'white',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap'
  },
  helpText: { fontSize: '12px', color: '#6c757d', marginTop: '4px' },
  errorText: { fontSize: '12px', color: '#dc3545', marginTop: '4px' },
  buttonGroup: {
    display: 'flex', justifyContent: 'flex-end', gap: '15px',
    marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e9ecef'
  },
  cancelButton: {
    padding: '12px 24px', backgroundColor: '#6c757d', color: 'white',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px'
  },
  submitButton: {
    padding: '12px 24px', color: 'white', border: 'none',
    borderRadius: '6px', fontSize: '16px', fontWeight: 'bold'
  }
};

export default PatientRegistrationForm;