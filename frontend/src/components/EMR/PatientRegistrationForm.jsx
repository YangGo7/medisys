// frontend/src/components/EMR/PatientRegistrationForm.jsx (수정된 버전)
import React, { useState } from 'react';
import axios from 'axios';

const PatientRegistrationForm = ({ onClose, onPatientCreated }) => {
  const [formData, setFormData] = useState({
    // 필수 필드
    givenName: '',
    familyName: '',
    gender: 'M',
    birthdate: '',
    
    // 🔥 핵심 추가: patient_identifier 입력 필드
    patient_identifier: '',
    
    // 선택 필드
    middleName: '',
    
    // 주소 정보
    address: {
      address1: '',
      address2: '',
      cityVillage: '',
      stateProvince: '',
      country: 'South Korea',
      postalCode: ''
    }
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const API_BASE = 'http://35.225.63.41:8000/api/integration/';

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // 필수 필드 검증
    if (!formData.givenName.trim()) newErrors.givenName = '이름을 입력해주세요';
    if (!formData.familyName.trim()) newErrors.familyName = '성을 입력해주세요';
    if (!formData.birthdate) newErrors.birthdate = '생년월일을 입력해주세요';

    // 🔥 Patient Identifier 검증
    if (formData.patient_identifier.trim()) {
      const identifier = formData.patient_identifier.trim();
      // 기본적인 형식 검증 (영문, 숫자, 하이픈 허용)
      if (!/^[A-Za-z0-9\-_]+$/.test(identifier)) {
        newErrors.patient_identifier = 'Patient ID는 영문, 숫자, 하이픈(-), 언더스코어(_)만 사용 가능합니다';
      }
      if (identifier.length < 3) {
        newErrors.patient_identifier = 'Patient ID는 최소 3자 이상이어야 합니다';
      }
      if (identifier.length > 50) {
        newErrors.patient_identifier = 'Patient ID는 최대 50자까지 가능합니다';
      }
    }

    // 생년월일 유효성 검사
    if (formData.birthdate) {
      const birthDate = new Date(formData.birthdate);
      const today = new Date();
      if (birthDate > today) {
        newErrors.birthdate = '생년월일은 오늘 이전이어야 합니다';
      }
      if (birthDate < new Date('1900-01-01')) {
        newErrors.birthdate = '유효한 생년월일을 입력해주세요';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateSampleIdentifier = () => {
    // 🔥 샘플 Patient Identifier 생성 (사용자가 참고용으로 사용)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    const sampleId = `P${year}${month}${day}${random}`;
    setFormData(prev => ({
      ...prev,
      patient_identifier: sampleId
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // 주소 정보가 비어있으면 제외
      const hasAddress = Object.values(formData.address).some(value => value.trim());
      const submitData = {
        ...formData,
        ...(hasAddress ? { address: formData.address } : {})
      };

      console.log('전송할 데이터:', submitData);

      const response = await axios.post(`${API_BASE}openmrs/patients/create/`, submitData);

      if (response.data.success) {
        const patientInfo = response.data.patient;
        
        alert(`환자가 성공적으로 등록되었습니다!\n` +
              `Patient ID: ${patientInfo.patient_identifier}\n` +
              `UUID: ${patientInfo.uuid}\n` +
              `환자명: ${formData.givenName} ${formData.familyName}`);
        
        // 등록된 환자 정보를 부모 컴포넌트에 전달
        if (onPatientCreated) {
          const newPatient = {
            uuid: patientInfo.uuid,
            patient_identifier: patientInfo.patient_identifier, // 🔥 핵심
            display: `${formData.givenName} ${formData.familyName}`,
            person: {
              gender: formData.gender,
              birthdate: formData.birthdate,
              age: calculateAge(formData.birthdate)
            },
            identifiers: patientInfo.identifiers || []
          };
          onPatientCreated(newPatient);
        }

        if (onClose) onClose();
      }
    } catch (error) {
      console.error('환자 등록 실패:', error);
      
      if (error.response?.data?.error) {
        alert(`등록 실패: ${error.response.data.error}`);
      } else {
        alert('환자 등록 중 오류가 발생했습니다.');
      }
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

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>👤 신규 환자 등록</h2>
          <button 
            onClick={onClose}
            style={styles.closeButton}
            type="button"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* 🔥 Patient Identifier 섹션 - 최상단에 추가 */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>🆔 Patient ID (DICOM 매핑용)</h3>
            
            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Patient ID
                  <span style={styles.optional}> (선택사항)</span>
                </label>
                <div style={styles.inputGroup}>
                  <input
                    type="text"
                    name="patient_identifier"
                    value={formData.patient_identifier}
                    onChange={handleChange}
                    style={{
                      ...styles.input,
                      ...(errors.patient_identifier ? styles.inputError : {})
                    }}
                    placeholder="P003, DCM001, PATIENT123 등"
                  />
                  <button
                    type="button"
                    onClick={generateSampleIdentifier}
                    style={styles.generateButton}
                  >
                    자동생성
                  </button>
                </div>
                {errors.patient_identifier && <span style={styles.errorText}>{errors.patient_identifier}</span>}
                <div style={styles.helpText}>
                  DICOM 파일의 Patient ID와 매핑됩니다. 비워두면 자동 생성됩니다.
                </div>
              </div>
            </div>
          </div>

          {/* 기본 정보 섹션 */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>기본 정보</h3>
            
            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  성 <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="familyName"
                  value={formData.familyName}
                  onChange={handleChange}
                  style={{
                    ...styles.input,
                    ...(errors.familyName ? styles.inputError : {})
                  }}
                  placeholder="김"
                />
                {errors.familyName && <span style={styles.errorText}>{errors.familyName}</span>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  이름 <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="givenName"
                  value={formData.givenName}
                  onChange={handleChange}
                  style={{
                    ...styles.input,
                    ...(errors.givenName ? styles.inputError : {})
                  }}
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
                <label style={styles.label}>
                  성별 <span style={styles.required}>*</span>
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  style={styles.select}
                >
                  <option value="M">남성</option>
                  <option value="F">여성</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  생년월일 <span style={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  name="birthdate"
                  value={formData.birthdate}
                  onChange={handleChange}
                  style={{
                    ...styles.input,
                    ...(errors.birthdate ? styles.inputError : {})
                  }}
                  max={new Date().toISOString().split('T')[0]}
                />
                {errors.birthdate && <span style={styles.errorText}>{errors.birthdate}</span>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>나이</label>
                <input
                  type="text"
                  value={formData.birthdate ? `${calculateAge(formData.birthdate)}세` : ''}
                  disabled
                  style={{...styles.input, backgroundColor: '#f8f9fa'}}
                />
              </div>
            </div>
          </div>

          {/* 주소 정보 섹션 (기존과 동일) */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>주소 정보 (선택사항)</h3>
            
            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>주소 1</label>
                <input
                  type="text"
                  name="address.address1"
                  value={formData.address.address1}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="도로명 주소"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>주소 2</label>
                <input
                  type="text"
                  name="address.address2"
                  value={formData.address.address2}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="상세 주소"
                />
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>시/구</label>
                <input
                  type="text"
                  name="address.cityVillage"
                  value={formData.address.cityVillage}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="서울시 강남구"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>시/도</label>
                <input
                  type="text"
                  name="address.stateProvince"
                  value={formData.address.stateProvince}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="서울특별시"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>우편번호</label>
                <input
                  type="text"
                  name="address.postalCode"
                  value={formData.address.postalCode}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="12345"
                />
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>국가</label>
                <input
                  type="text"
                  name="address.country"
                  value={formData.address.country}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>
            </div>
          </div>

          {/* 버튼 섹션 */}
          <div style={styles.buttonGroup}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelButton}
              disabled={loading}
            >
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
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px',
    boxSizing: 'border-box'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '900px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 30px',
    borderBottom: '1px solid #e9ecef',
    backgroundColor: '#f8f9fa'
  },
  title: {
    margin: 0,
    fontSize: '24px',
    color: '#333',
    fontWeight: 'bold'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    padding: '0',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  form: {
    padding: '30px'
  },
  section: {
    marginBottom: '30px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: '20px',
    paddingBottom: '10px',
    borderBottom: '2px solid #e9ecef'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: '5px'
  },
  required: {
    color: '#dc3545'
  },
  optional: {
    color: '#6c757d',
    fontWeight: 'normal'
  },
  input: {
    padding: '10px 12px',
    border: '2px solid #ced4da',
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'border-color 0.3s',
    outline: 'none'
  },
  inputError: {
    borderColor: '#dc3545'
  },
  select: {
    padding: '10px 12px',
    border: '2px solid #ced4da',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
    outline: 'none'
  },
  inputGroup: {
    display: 'flex',
    gap: '8px'
  },
  generateButton: {
    padding: '10px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  helpText: {
    fontSize: '12px',
    color: '#6c757d',
    marginTop: '4px'
  },
  errorText: {
    fontSize: '12px',
    color: '#dc3545',
    marginTop: '4px'
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '15px',
    marginTop: '30px',
    paddingTop: '20px',
    borderTop: '1px solid #e9ecef'
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  submitButton: {
    padding: '12px 24px',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold'
  }
};

export default PatientRegistrationForm;