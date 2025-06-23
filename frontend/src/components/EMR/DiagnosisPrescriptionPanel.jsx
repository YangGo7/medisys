// 1. frontend/src/components/EMR/DiagnosisPrescriptionPanel.jsx - 최종 완성 버전

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DiagnosisPrescriptionPanel = ({ patient }) => {
  const [diagnoses, setDiagnoses] = useState([]);
  const [clinicalHistory, setClinicalHistory] = useState([]);
  const [newDiagnosis, setNewDiagnosis] = useState({ concept_uuid: '', value: '', notes: '' });
  const [diagnosisSearchTerm, setDiagnosisSearchTerm] = useState('');
  const [diagnosisSearchResults, setDiagnosisSearchResults] = useState([]);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

  console.log('🔍 DiagnosisPrescriptionPanel received patient:', patient);

  // 🔥 완전한 환자 정보 추출
  const getPatientInfo = () => {
    if (!patient) return null;
    
    return {
      uuid: patient.uuid,                                    // person_uuid
      patient_identifier: patient.patient_identifier,       // P5448
      name: patient.name,                                    // 환자 이름
      display: patient.display,                              // "P5448 - 용녀 선우"
      gender: patient.gender,
      age: patient.age,
      birthdate: patient.birthdate
    };
  };

  const patientInfo = getPatientInfo();

  // 환자 임상 데이터 로드
  const loadClinicalData = async () => {
    if (!patientInfo?.uuid) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Loading clinical data for UUID:', patientInfo.uuid);
      
      // obs_clinical_api 사용 시도
      const response = await axios.get(
        `${API_BASE}/patient/${patientInfo.uuid}/obs-clinical-data/`,
        { timeout: 15000 }
      );
      
      if (response.data.success) {
        setClinicalHistory(response.data.clinical_history || []);
        
        if (response.data.clinical_history.length > 0) {
          const latest = response.data.clinical_history[0];
          setDiagnoses(latest.diagnoses || []);
        }
      } else {
        setError(response.data.error || '데이터 로드 실패');
      }
    } catch (error) {
      console.error('❌ 데이터 로드 실패:', error);
      
      // fallback: 기존 API 시도
      try {
        const fallbackResponse = await axios.get(
          `${API_BASE}/openmrs-clinical/patient/${patientInfo.uuid}/clinical-data/`,
          { timeout: 15000 }
        );
        
        if (fallbackResponse.data.clinical_data) {
          setClinicalHistory(fallbackResponse.data.clinical_data);
          if (fallbackResponse.data.clinical_data.length > 0) {
            const latest = fallbackResponse.data.clinical_data[0];
            setDiagnoses(latest.diagnoses || []);
          }
        }
      } catch (fallbackError) {
        console.error('❌ Fallback 데이터 로드도 실패:', fallbackError);
        setError('네트워크 오류: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientInfo?.uuid) {
      loadClinicalData();
    }
  }, [patientInfo?.uuid]);

  // 진단 검색
  const searchDiagnosis = async (searchTerm) => {
    if (searchTerm.length < 2) {
      setDiagnosisSearchResults([]);
      return;
    }

    try {
      // obs_clinical_api 검색 시도
      let response = await axios.get(`${API_BASE}/search-concepts-obs/`, {
        params: { q: searchTerm },
        timeout: 10000
      });
      
      if (response.data.success) {
        setDiagnosisSearchResults(response.data.results || []);
        return;
      }
    } catch (error) {
      console.error('첫 번째 검색 실패, fallback 시도:', error);
    }

    try {
      // fallback: 기존 API
      const response = await axios.get(`${API_BASE}/openmrs-clinical/search-diagnosis/`, {
        params: { q: searchTerm },
        timeout: 10000
      });
      
      if (response.data.results) {
        setDiagnosisSearchResults(response.data.results || []);
      }
    } catch (error) {
      console.error('모든 검색 실패:', error);
      setDiagnosisSearchResults([]);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchDiagnosis(diagnosisSearchTerm);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [diagnosisSearchTerm]);

  // 진단 선택, 추가, 삭제
  const selectDiagnosis = (concept) => {
    setNewDiagnosis({
      concept_uuid: concept.uuid,
      value: concept.display,
      notes: ''
    });
    setDiagnosisSearchTerm(concept.display);
    setDiagnosisSearchResults([]);
  };

  const addDiagnosis = () => {
    if (newDiagnosis.concept_uuid && newDiagnosis.value) {
      setDiagnoses(prev => [...prev, { ...newDiagnosis, id: Date.now() }]);
      setNewDiagnosis({ concept_uuid: '', value: '', notes: '' });
      setDiagnosisSearchTerm('');
    }
  };

  const removeDiagnosis = (index) => {
    setDiagnoses(prev => prev.filter((_, i) => i !== index));
  };

  // 저장
  const saveClinicalData = async () => {
    if (!patientInfo?.uuid) {
      alert('환자 UUID가 없습니다.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const data = {
        diagnoses: diagnoses,
        prescriptions: [],
        clinical_notes: clinicalNotes.trim()
      };

      console.log('💾 Saving for UUID:', patientInfo.uuid);

      // obs_clinical_api 저장 시도
      try {
        const response = await axios.post(
          `${API_BASE}/patient/${patientInfo.uuid}/save-obs-clinical/`,
          data,
          { timeout: 20000 }
        );

        if (response.data.success) {
          alert(`✅ 저장 완료! (${response.data.total_saved}개 항목)`);
          await loadClinicalData();
          return;
        }
      } catch (error) {
        console.error('첫 번째 저장 실패, fallback 시도:', error);
      }

      // fallback: 기존 API
      const fallbackResponse = await axios.post(
        `${API_BASE}/openmrs-clinical/patient/${patientInfo.uuid}/save-notes/`,
        { notes: clinicalNotes.trim() },
        { timeout: 20000 }
      );

      if (fallbackResponse.data.success) {
        alert('✅ 임상 노트 저장 완료!');
        await loadClinicalData();
      } else {
        throw new Error(fallbackResponse.data.error || '저장 실패');
      }
    } catch (error) {
      console.error('❌ 모든 저장 방법 실패:', error);
      const errorMsg = error.response?.data?.error || error.message || '네트워크 오류';
      setError(errorMsg);
      alert('❌ 저장 오류: ' + errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // 렌더링
  if (!patient) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
        <h3>🏥 진단 관리</h3>
        <p>환자를 선택해 주세요.</p>
      </div>
    );
  }

  if (!patientInfo?.uuid) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: '#ff9800' }}>
        <h3>⚠️ UUID 없음</h3>
        <p><strong>환자:</strong> {patient.display || patient.name}</p>
        <p>patient.uuid가 필요합니다.</p>
        <pre style={{ fontSize: '10px', textAlign: 'left', marginTop: '1rem' }}>
          {JSON.stringify(patient, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '1rem', 
      border: '1px solid #ddd', 
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      <h3 style={{ marginBottom: '1rem', color: '#2c3e50' }}>
        🏥 진단 관리 - OpenMRS
      </h3>

      {/* 🔥 완전한 환자 정보 표시 */}
      <div style={{ 
        marginBottom: '1rem', 
        padding: '1rem', 
        backgroundColor: '#e8f4fd',
        borderRadius: '8px',
        border: '1px solid #90caf9'
      }}>
        <div style={{ marginBottom: '0.75rem', fontSize: '16px', fontWeight: 'bold' }}>
          📋 환자 정보
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '0.75rem',
          fontSize: '14px'
        }}>
          <div style={{ 
            padding: '0.5rem', 
            backgroundColor: '#e3f2fd', 
            borderRadius: '4px',
            border: '1px solid #bbdefb'
          }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#1976d2', marginBottom: '0.25rem' }}>
              환자 ID
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 'bold' }}>
              {patientInfo.patient_identifier || 'N/A'}
            </div>
          </div>

          <div style={{ 
            padding: '0.5rem', 
            backgroundColor: '#f3e5f5', 
            borderRadius: '4px',
            border: '1px solid #ce93d8'
          }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#7b1fa2', marginBottom: '0.25rem' }}>
              환자명
            </div>
            <div style={{ fontSize: '15px', fontWeight: 'bold' }}>
              {patientInfo.name || 'N/A'}
            </div>
          </div>

          <div style={{ 
            padding: '0.5rem', 
            backgroundColor: patientInfo.gender === 'M' ? '#e8f5e8' : '#fce4ec', 
            borderRadius: '4px',
            border: `1px solid ${patientInfo.gender === 'M' ? '#a5d6a7' : '#f8bbd9'}`
          }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: patientInfo.gender === 'M' ? '#2e7d32' : '#c2185b', marginBottom: '0.25rem' }}>
              성별/나이
            </div>
            <div style={{ fontSize: '15px', fontWeight: 'bold' }}>
              {patientInfo.gender === 'M' ? '남성' : patientInfo.gender === 'F' ? '여성' : 'N/A'} / {patientInfo.age || 'N/A'}세
            </div>
          </div>
        </div>

        <div style={{ 
          marginTop: '0.75rem', 
          padding: '0.5rem',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#666'
        }}>
          <div><strong>Person UUID:</strong> {patientInfo.uuid}</div>
          <div><strong>Display:</strong> {patientInfo.display}</div>
        </div>
      </div>

      {/* 로딩 상태 */}
      {loading && (
        <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
          📋 데이터 로드 중...
        </div>
      )}

      {/* 에러 표시 */}
      {error && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem',
          backgroundColor: '#ffebee',
          border: '1px solid #f44336',
          borderRadius: '4px',
          fontSize: '14px',
          color: '#c62828'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* 진단 입력 섹션 */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ color: '#e74c3c', marginBottom: '0.75rem', fontSize: '16px' }}>🔍 진단 입력</h4>
        
        {/* 진단 검색 */}
        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
          <input
            type="text"
            placeholder="진단명 검색 (2글자 이상)"
            value={diagnosisSearchTerm}
            onChange={(e) => setDiagnosisSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
          
          {/* 검색 결과 드롭다운 */}
          {diagnosisSearchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderTop: 'none',
              borderRadius: '0 0 6px 6px',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 1000,
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }}>
              {diagnosisSearchResults.map((concept, index) => (
                <div
                  key={index}
                  onClick={() => selectDiagnosis(concept)}
                  style={{
                    padding: '10px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #eee',
                    fontSize: '13px'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{concept.display}</div>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    {concept.short_name && `${concept.short_name} | `}
                    {concept.uuid.substring(0, 8)}...
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 진단 노트 */}
        <textarea
          placeholder="진단 관련 노트 (선택사항)"
          value={newDiagnosis.notes}
          onChange={(e) => setNewDiagnosis(prev => ({ ...prev, notes: e.target.value }))}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
            height: '70px',
            resize: 'vertical'
          }}
        />

        {/* 진단 추가 버튼 */}
        <button
          onClick={addDiagnosis}
          disabled={!newDiagnosis.concept_uuid}
          style={{
            marginTop: '0.75rem',
            padding: '8px 16px',
            backgroundColor: newDiagnosis.concept_uuid ? '#e74c3c' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: newDiagnosis.concept_uuid ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.2s'
          }}
        >
          ➕ 진단 추가
        </button>

        {/* 현재 진단 목록 */}
        {diagnoses.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem', color: '#333' }}>
              현재 진단 ({diagnoses.length}개):
            </div>
            {diagnoses.map((diagnosis, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '10px',
                margin: '4px 0',
                backgroundColor: '#fff5f5',
                border: '1px solid #ffcdd2',
                borderRadius: '6px',
                fontSize: '14px'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                    {diagnosis.value}
                  </div>
                  {diagnosis.notes && (
                    <div style={{ 
                      color: '#666', 
                      fontSize: '12px', 
                      fontStyle: 'italic',
                      marginTop: '4px'
                    }}>
                      📝 {diagnosis.notes}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeDiagnosis(index)}
                  style={{
                    marginLeft: '10px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#d32f2f'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#f44336'}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 임상 노트 섹션 */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ color: '#8e44ad', marginBottom: '0.75rem', fontSize: '16px' }}>📝 임상 노트</h4>
        <textarea
          placeholder="임상 관찰 사항, 환자 상태, 추가 메모 등을 기록하세요..."
          value={clinicalNotes}
          onChange={(e) => setClinicalNotes(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
            height: '100px',
            resize: 'vertical'
          }}
        />
      </div>

      {/* 저장 버튼 */}
      <div style={{ 
        borderTop: '1px solid #eee', 
        paddingTop: '1rem',
        textAlign: 'right'
      }}>
        <button
          onClick={saveClinicalData}
          disabled={saving || (!diagnoses.length && !clinicalNotes.trim())}
          style={{
            padding: '12px 24px',
            backgroundColor: saving ? '#6c757d' : '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!saving && (diagnoses.length || clinicalNotes.trim())) {
              e.target.style.backgroundColor = '#2980b9';
            }
          }}
          onMouseLeave={(e) => {
            if (!saving) {
              e.target.style.backgroundColor = '#3498db';
            }
          }}
        >
          {saving ? '💾 저장 중...' : '💾 OpenMRS에 저장'}
        </button>
      </div>

      {/* 진료 이력 요약 */}
      {clinicalHistory.length > 0 && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '0.75rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          fontSize: '12px',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>
            📚 진료 이력: {clinicalHistory.length}회
          </div>
          <div style={{ color: '#666' }}>
            최근 진료: {clinicalHistory[0]?.encounter_datetime?.substring(0, 16).replace('T', ' ')}
          </div>
        </div>
      )}
    </div>
  );
};

export default DiagnosisPrescriptionPanel;