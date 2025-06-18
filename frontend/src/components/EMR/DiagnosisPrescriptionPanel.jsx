// frontend/src/components/EMR/DiagnosisPrescriptionPanel.jsx
/**
 * 진단/처방 통합 패널 - OpenMRS Concept, Obs, Encounter 활용
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DiagnosisPrescriptionPanel = ({ patient, panelType = 'diagnosis' }) => {
  const [diagnoses, setDiagnoses] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [currentEncounterUuid, setCurrentEncounterUuid] = useState(null);
  
  // 진단 관련 상태
  const [newDiagnosis, setNewDiagnosis] = useState({
    concept_uuid: '',
    value: '',
    notes: ''
  });
  const [diagnosisSearchTerm, setDiagnosisSearchTerm] = useState('');
  const [diagnosisSearchResults, setDiagnosisSearchResults] = useState([]);
  
  // 처방 관련 상태
  const [newPrescription, setNewPrescription] = useState({
    drug_concept_uuid: '',
    drug_name: '',
    dosage: '',
    dose_units: 'mg',
    frequency: '',
    route: 'PO',
    duration: '',
    instructions: ''
  });
  const [drugSearchTerm, setDrugSearchTerm] = useState('');
  const [drugSearchResults, setDrugSearchResults] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

  // 환자 임상 데이터 로드
  useEffect(() => {
    if (patient?.uuid) {
      loadPatientClinicalData();
    }
  }, [patient]);

  const loadPatientClinicalData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/openmrs-clinical/patient/${patient.uuid}/clinical-data/`);
      
      if (response.data.clinical_data && response.data.clinical_data.length > 0) {
        const latestEncounter = response.data.clinical_data[0];
        setCurrentEncounterUuid(latestEncounter.encounter_uuid);
        setDiagnoses(latestEncounter.diagnoses || []);
        setPrescriptions(latestEncounter.prescriptions || []);
      }
    } catch (error) {
      console.error('임상 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 진단 Concept 검색
  const searchDiagnosisConcepts = async (term) => {
    if (term.length < 2) {
      setDiagnosisSearchResults([]);
      return;
    }

    try {
      const response = await axios.get(`${API_BASE}/openmrs-clinical/search-diagnosis/`, {
        params: { q: term }
      });
      setDiagnosisSearchResults(response.data.results || []);
    } catch (error) {
      console.error('진단 검색 실패:', error);
      setDiagnosisSearchResults([]);
    }
  };

  // 약물 검색
  const searchDrugs = async (term) => {
    if (term.length < 2) {
      setDrugSearchResults([]);
      return;
    }

    try {
      const response = await axios.get(`${API_BASE}/openmrs-clinical/search-drugs/`, {
        params: { q: term }
      });
      setDrugSearchResults(response.data.results || []);
    } catch (error) {
      console.error('약물 검색 실패:', error);
      setDrugSearchResults([]);
    }
  };

  // 진단 검색어 변경 핸들러
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchDiagnosisConcepts(diagnosisSearchTerm);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [diagnosisSearchTerm]);

  // 약물 검색어 변경 핸들러
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchDrugs(drugSearchTerm);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [drugSearchTerm]);

  // 새 Encounter 생성 및 데이터 저장
  const saveAllClinicalData = async () => {
    if (!patient?.uuid) {
      alert('환자가 선택되지 않았습니다.');
      return;
    }

    try {
      setSaving(true);
      
      const clinicalData = {
        diagnoses: [
          ...diagnoses,
          ...(newDiagnosis.value ? [newDiagnosis] : [])
        ],
        prescriptions: [
          ...prescriptions,
          ...(newPrescription.drug_name ? [newPrescription] : [])
        ]
      };

      const response = await axios.post(
        `${API_BASE}/openmrs-clinical/patient/${patient.uuid}/create-encounter/`,
        clinicalData
      );

      if (response.data.success) {
        alert('진료 기록이 저장되었습니다.');
        setCurrentEncounterUuid(response.data.encounter_uuid);
        
        // 폼 초기화
        setNewDiagnosis({ concept_uuid: '', value: '', notes: '' });
        setNewPrescription({
          drug_concept_uuid: '', drug_name: '', dosage: '', dose_units: 'mg',
          frequency: '', route: 'PO', duration: '', instructions: ''
        });
        setDiagnosisSearchTerm('');
        setDrugSearchTerm('');
        
        // 데이터 다시 로드
        loadPatientClinicalData();
      } else {
        alert('저장에 실패했습니다: ' + response.data.error);
      }
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 진단 선택
  const selectDiagnosis = (concept) => {
    setNewDiagnosis({
      concept_uuid: concept.uuid,
      value: concept.display,
      notes: ''
    });
    setDiagnosisSearchTerm(concept.display);
    setDiagnosisSearchResults([]);
  };

  // 약물 선택
  const selectDrug = (drug) => {
    setNewPrescription(prev => ({
      ...prev,
      drug_concept_uuid: drug.uuid,
      drug_name: drug.display
    }));
    setDrugSearchTerm(drug.display);
    setDrugSearchResults([]);
  };

  if (!patient) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
        <h3>{panelType === 'diagnosis' ? '🏥 진단 관리' : '💊 처방 관리'}</h3>
        <p>환자를 선택해주세요.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center' }}>
        <h3>{panelType === 'diagnosis' ? '🏥 진단 관리' : '💊 처방 관리'}</h3>
        <p>데이터를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '1rem', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1rem',
        paddingBottom: '0.5rem',
        borderBottom: '2px solid #e9ecef'
      }}>
        <h3 style={{ margin: 0 }}>
          {panelType === 'diagnosis' ? '🏥 진단 관리' : '💊 처방 관리'}
        </h3>
        <div style={{ fontSize: '12px', color: '#666' }}>
          {patient.display || patient.name}
        </div>
      </div>

      {/* 진단 탭 */}
      {panelType === 'diagnosis' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* 기존 진단 목록 */}
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '0.5rem', color: '#495057' }}>
              기존 진단 ({diagnoses.length}건)
            </h4>
            <div style={{ 
              maxHeight: '120px', 
              overflowY: 'auto',
              border: '1px solid #e9ecef',
              borderRadius: '4px',
              padding: '0.5rem'
            }}>
              {diagnoses.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6c757d', fontSize: '13px' }}>
                  등록된 진단이 없습니다.
                </div>
              ) : (
                diagnoses.map((diagnosis, index) => (
                  <div key={index} style={{
                    padding: '6px',
                    marginBottom: '4px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}>
                    <div style={{ fontWeight: 'bold' }}>{diagnosis.value}</div>
                    <div style={{ fontSize: '11px', color: '#6c757d' }}>
                      {new Date(diagnosis.datetime).toLocaleString('ko-KR')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 새 진단 추가 */}
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '0.5rem', color: '#495057' }}>
              새 진단 추가
            </h4>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="진단명 검색... (예: 감기, 고혈압)"
                value={diagnosisSearchTerm}
                onChange={(e) => {
                  setDiagnosisSearchTerm(e.target.value);
                  setNewDiagnosis(prev => ({ ...prev, value: e.target.value }));
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '13px'
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
                  border: '1px solid #ced4da',
                  borderTop: 'none',
                  borderRadius: '0 0 4px 4px',
                  maxHeight: '150px',
                  overflowY: 'auto',
                  zIndex: 1000
                }}>
                  {diagnosisSearchResults.map((concept, index) => (
                    <div
                      key={index}
                      onClick={() => selectDiagnosis(concept)}
                      style={{
                        padding: '8px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f8f9fa',
                        fontSize: '13px'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    >
                      {concept.display}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <textarea
              placeholder="진단 상세 내용 또는 메모..."
              value={newDiagnosis.notes}
              onChange={(e) => setNewDiagnosis(prev => ({ ...prev, notes: e.target.value }))}
              style={{
                width: '100%',
                marginTop: '8px',
                padding: '6px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '13px',
                resize: 'vertical',
                minHeight: '60px'
              }}
            />
          </div>

          {/* AI 진단 제안 */}
          <div style={{ 
            marginBottom: '1rem',
            padding: '0.5rem',
            backgroundColor: '#f3e5f5',
            borderRadius: '6px',
            border: '1px solid #ce93d8'
          }}>
            <h5 style={{ fontSize: '12px', color: '#7b1fa2', margin: '0 0 0.5rem 0' }}>
              🤖 AI 진단 제안
            </h5>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {[
                { name: '급성 상기도 감염', code: 'J06.9' },
                { name: '바이러스성 인두염', code: 'J02.9' },
                { name: '급성 기관지염', code: 'J20.9' },
                { name: '두통', code: 'R51' }
              ].map((diagnosis, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setNewDiagnosis(prev => ({
                      ...prev,
                      value: diagnosis.name,
                      notes: `ICD-10: ${diagnosis.code}`
                    }));
                    setDiagnosisSearchTerm(diagnosis.name);
                  }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    backgroundColor: 'white',
                    color: '#7b1fa2',
                    border: '1px solid #ce93d8',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#7b1fa2';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'white';
                    e.target.style.color = '#7b1fa2';
                  }}
                >
                  {diagnosis.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 처방 탭 */}
      {panelType === 'prescription' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* 기존 처방 목록 */}
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '0.5rem', color: '#495057' }}>
              기존 처방 ({prescriptions.length}건)
            </h4>
            <div style={{ 
              maxHeight: '120px', 
              overflowY: 'auto',
              border: '1px solid #e9ecef',
              borderRadius: '4px',
              padding: '0.5rem'
            }}>
              {prescriptions.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6c757d', fontSize: '13px' }}>
                  등록된 처방이 없습니다.
                </div>
              ) : (
                prescriptions.map((prescription, index) => (
                  <div key={index} style={{
                    padding: '6px',
                    marginBottom: '4px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}>
                    <div style={{ fontWeight: 'bold' }}>{prescription.value}</div>
                    <div style={{ fontSize: '11px', color: '#6c757d' }}>
                      {new Date(prescription.datetime).toLocaleString('ko-KR')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 새 처방 추가 */}
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '0.5rem', color: '#495057' }}>
              새 처방 추가
            </h4>
            
            {/* 약물 검색 */}
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <input
                type="text"
                placeholder="약물명 검색... (예: 아세트아미노펜, 아스피린)"
                value={drugSearchTerm}
                onChange={(e) => {
                  setDrugSearchTerm(e.target.value);
                  setNewPrescription(prev => ({ ...prev, drug_name: e.target.value }));
                }}
                style={{
                  width: '100%',
                  padding: '6px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              />
              
              {/* 약물 검색 결과 */}
              {drugSearchResults.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ced4da',
                  borderTop: 'none',
                  borderRadius: '0 0 4px 4px',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  zIndex: 1000
                }}>
                  {drugSearchResults.map((drug, index) => (
                    <div
                      key={index}
                      onClick={() => selectDrug(drug)}
                      style={{
                        padding: '6px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f8f9fa',
                        fontSize: '12px'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    >
                      <div style={{ fontWeight: 'bold' }}>{drug.display}</div>
                      {drug.strength && (
                        <div style={{ fontSize: '11px', color: '#6c757d' }}>
                          강도: {drug.strength}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 처방 상세 정보 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
              <input
                type="text"
                placeholder="용량 (예: 500mg)"
                value={newPrescription.dosage}
                onChange={(e) => setNewPrescription(prev => ({ ...prev, dosage: e.target.value }))}
                style={{
                  padding: '5px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              />
              <select
                value={newPrescription.frequency}
                onChange={(e) => setNewPrescription(prev => ({ ...prev, frequency: e.target.value }))}
                style={{
                  padding: '5px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                <option value="">복용 횟수</option>
                <option value="QD">QD (1일 1회)</option>
                <option value="BID">BID (1일 2회)</option>
                <option value="TID">TID (1일 3회)</option>
                <option value="QID">QID (1일 4회)</option>
                <option value="PRN">PRN (필요시)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
              <select
                value={newPrescription.route}
                onChange={(e) => setNewPrescription(prev => ({ ...prev, route: e.target.value }))}
                style={{
                  padding: '5px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                <option value="PO">PO (경구)</option>
                <option value="IV">IV (정맥내)</option>
                <option value="IM">IM (근육내)</option>
                <option value="SC">SC (피하)</option>
                <option value="TOP">TOP (국소)</option>
              </select>
              <input
                type="text"
                placeholder="기간 (예: 3일, 1주)"
                value={newPrescription.duration}
                onChange={(e) => setNewPrescription(prev => ({ ...prev, duration: e.target.value }))}
                style={{
                  padding: '5px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              />
            </div>

            <textarea
              placeholder="복용법 상세 지시사항..."
              value={newPrescription.instructions}
              onChange={(e) => setNewPrescription(prev => ({ ...prev, instructions: e.target.value }))}
              style={{
                width: '100%',
                padding: '6px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '12px',
                resize: 'vertical',
                minHeight: '50px'
              }}
            />
          </div>

          {/* 빠른 처방 버튼들 */}
          <div style={{ 
            marginBottom: '1rem',
            padding: '0.5rem',
            backgroundColor: '#e3f2fd',
            borderRadius: '6px',
            border: '1px solid #bbdefb'
          }}>
            <h5 style={{ fontSize: '12px', color: '#1976d2', margin: '0 0 0.5rem 0' }}>
              🚀 빠른 처방
            </h5>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {[
                { name: '아세트아미노펜 500mg', dosage: '1정', freq: 'TID' },
                { name: '이부프로펜 200mg', dosage: '1정', freq: 'TID' },
                { name: '아목시실린 250mg', dosage: '2캡슐', freq: 'TID' },
                { name: '오메프라졸 20mg', dosage: '1캡슐', freq: 'QD' }
              ].map((drug, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setNewPrescription(prev => ({
                      ...prev,
                      drug_name: drug.name,
                      dosage: drug.dosage,
                      frequency: drug.freq,
                      route: 'PO',
                      duration: '3일',
                      instructions: '식후 복용'
                    }));
                    setDrugSearchTerm(drug.name);
                  }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    backgroundColor: 'white',
                    color: '#1976d2',
                    border: '1px solid #bbdefb',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#1976d2';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'white';
                    e.target.style.color = '#1976d2';
                  }}
                >
                  {drug.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 저장 버튼 */}
      <div style={{ 
        borderTop: '1px solid #e9ecef', 
        paddingTop: '1rem',
        display: 'flex',
        gap: '8px'
      }}>
        <button
          onClick={saveAllClinicalData}
          disabled={saving || (!newDiagnosis.value && !newPrescription.drug_name)}
          style={{
            flex: 1,
            padding: '8px 16px',
            backgroundColor: saving ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          {saving ? '저장 중...' : '💾 진료기록 저장'}
        </button>
        
        <button
          onClick={() => {
            setNewDiagnosis({ concept_uuid: '', value: '', notes: '' });
            setNewPrescription({
              drug_concept_uuid: '', drug_name: '', dosage: '', dose_units: 'mg',
              frequency: '', route: 'PO', duration: '', instructions: ''
            });
            setDiagnosisSearchTerm('');
            setDrugSearchTerm('');
          }}
          style={{
            padding: '8px 12px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          🗑️ 초기화
        </button>
      </div>

      {/* 현재 Encounter 정보 표시 */}
      {currentEncounterUuid && (
        <div style={{
          marginTop: '0.5rem',
          padding: '0.5rem',
          backgroundColor: '#e8f5e8',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#2e7d32'
        }}>
          📝 현재 진료 세션: {currentEncounterUuid.substring(0, 8)}...
          <br />
          💾 데이터는 OpenMRS에 실시간 저장됩니다.
        </div>
      )}
    </div>
  );
};

export default DiagnosisPrescriptionPanel;