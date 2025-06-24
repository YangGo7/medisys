// frontend/src/components/EMR/VisitHistoryPanel.jsx (수정된 버전)
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const VisitHistoryPanel = ({ patient }) => {
  const [visitHistory, setVisitHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://35.225.63.41:8000/api';

  // 🔥 환자 UUID 추출 (다양한 형태 지원)
  const patientUuid = patient?.uuid || 
                      patient?.person?.uuid || 
                      patient?.openmrs_patient_uuid;

  console.log('🔍 VisitHistoryPanel 디버깅:', {
    patient,
    patientUuid,
    patientKeys: patient ? Object.keys(patient) : 'null'
  });

  useEffect(() => {
    if (patientUuid) {
      fetchVisitHistory();
    } else {
      console.warn('⚠️ 환자 UUID가 없습니다:', patient);
      setVisitHistory([]);
    }
  }, [patientUuid]);

  const fetchVisitHistory = async () => {
    if (!patientUuid) {
      console.error('❌ 환자 UUID가 없어 내원 이력을 조회할 수 없습니다');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔄 내원 이력 조회 시작: ${patientUuid}`);
      
      // 🔥 올바른 API 호출
      const response = await axios.get(
        `${API_BASE}openmrs-clinical/patient/${patientUuid}/visits-history/`,
        {
          timeout: 30000,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('📡 내원 이력 API 응답:', response.data);
      
      if (response.data.success) {
        const history = response.data.visits_history || [];
        setVisitHistory(history);
        setLastUpdated(new Date().toLocaleTimeString());
        console.log(`✅ ${history.length}건의 내원 이력 로드 성공`);
      } else {
        throw new Error(response.data.error || '내원 이력 조회 실패');
      }
      
    } catch (error) {
      console.error('❌ 내원 기록 조회 실패:', error);
      setError(error.message || '내원 기록을 불러올 수 없습니다');
      
      // 🔄 Fallback: 기존 API 시도
      try {
        console.log('🔄 Fallback API 시도...');
        const fallbackResponse = await axios.get(`${API_BASE}openmrs-encounters?uuid=${patientUuid}`);
        
        if (fallbackResponse.data && Array.isArray(fallbackResponse.data)) {
          const convertedHistory = fallbackResponse.data.map(encounter => ({
            encounter_uuid: encounter.uuid,
            encounter_datetime: encounter.encounterDatetime,
            encounter_type: encounter.encounterType?.display || '일반 진료',
            provider: encounter.provider?.display || 'Unknown',
            location: encounter.location?.display || 'Unknown',
            observations: encounter.obs || [],
            obs_count: encounter.obs?.length || 0
          }));
          
          setVisitHistory(convertedHistory);
          setError(null);
          console.log(`✅ Fallback으로 ${convertedHistory.length}건 로드`);
        }
      } catch (fallbackError) {
        console.error('❌ Fallback API도 실패:', fallbackError);
        setVisitHistory([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // 🔄 수동 새로고침 함수
  const handleRefresh = () => {
    console.log('🔄 수동 새로고침 요청');
    fetchVisitHistory();
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const extractDiagnoses = (observations) => {
    if (!Array.isArray(observations)) return [];
    
    return observations.filter(obs => {
      const concept = obs.concept?.display || '';
      return concept.toLowerCase().includes('diagnosis') ||
             concept.includes('진단') ||
             concept.toLowerCase().includes('visit diagnoses') ||
             concept.includes('159947'); // Visit Diagnoses UUID
    });
  };

  const extractPrescriptions = (observations) => {
    if (!Array.isArray(observations)) return [];
    
    return observations.filter(obs => {
      const concept = obs.concept?.display || '';
      return concept.toLowerCase().includes('drug') ||
             concept.includes('약물') ||
             concept.toLowerCase().includes('medication') ||
             concept.includes('처방') ||
             concept.includes('1282'); // Drug Orders UUID
    });
  };

  const extractNotes = (observations) => {
    if (!Array.isArray(observations)) return [];
    
    return observations.filter(obs => {
      const concept = obs.concept?.display || '';
      return concept.toLowerCase().includes('clinical notes') ||
             concept.includes('메모') ||
             concept.includes('160632'); // Clinical Notes UUID
    });
  };

  if (!patient) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
        <h3>📂 내원 기록</h3>
        <p>환자가 선택되지 않았습니다.</p>
      </div>
    );
  }

  if (!patientUuid) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: '#e74c3c' }}>
        <h3>📂 내원 기록</h3>
        <p>환자 UUID를 찾을 수 없습니다.</p>
        <div style={{ fontSize: '12px', marginTop: '0.5rem' }}>
          환자 정보: {JSON.stringify(patient, null, 2)}
        </div>
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
      {/* 헤더 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1rem',
        paddingBottom: '0.5rem',
        borderBottom: '2px solid #e9ecef'
      }}>
        <h3 style={{ margin: 0 }}>📂 내원 기록</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>
            총 {visitHistory.length}건
            {lastUpdated && (
              <div>갱신: {lastUpdated}</div>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '⏳' : '🔄'}
          </button>
        </div>
      </div>

      {/* 로딩 상태 */}
      {loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '2rem',
          color: '#666'
        }}>
          <div>🔄 내원 기록을 불러오는 중...</div>
          <div style={{ fontSize: '12px', marginTop: '0.5rem' }}>
            환자 UUID: {patientUuid}
          </div>
        </div>
      )}

      {/* 오류 상태 */}
      {error && !loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '1rem',
          color: '#e74c3c',
          backgroundColor: '#fdf2f2',
          border: '1px solid #fecaca',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          <div>❌ {error}</div>
          <button
            onClick={handleRefresh}
            style={{
              marginTop: '0.5rem',
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 내원 이력 목록 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!loading && !error && visitHistory.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            color: '#666',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px'
          }}>
            <div>📋 내원 기록이 없습니다</div>
            <div style={{ fontSize: '12px', marginTop: '0.5rem' }}>
              진료 기록을 저장하면 여기에 표시됩니다
            </div>
            <button
              onClick={handleRefresh}
              style={{
                marginTop: '1rem',
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              새로고침
            </button>
          </div>
        )}

        {!loading && visitHistory.length > 0 && (
          <div>
            {visitHistory.map((visit, index) => {
              const diagnoses = extractDiagnoses(visit.observations || []);
              const prescriptions = extractPrescriptions(visit.observations || []);
              const notes = extractNotes(visit.observations || []);

              return (
                <div key={visit.encounter_uuid || index} style={{
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem',
                  backgroundColor: '#fff'
                }}>
                  {/* 기본 정보 */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>
                      📅 {formatDateTime(visit.encounter_datetime)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {visit.obs_count || 0}개 기록
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '13px', color: '#6c757d', marginBottom: '0.5rem' }}>
                    👨‍⚕️ {visit.provider} | 📍 {visit.location} | 🏥 {visit.encounter_type}
                  </div>

                  {/* 진단 */}
                  {diagnoses.length > 0 && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#28a745' }}>
                        🩺 진단:
                      </div>
                      {diagnoses.map((diag, diagIndex) => (
                        <div key={diagIndex} style={{ 
                          fontSize: '12px', 
                          color: '#155724',
                          marginLeft: '1rem'
                        }}>
                          • {diag.value || diag.valueText || diag.concept.display}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 처방 */}
                  {prescriptions.length > 0 && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#dc3545' }}>
                        💊 처방:
                      </div>
                      {prescriptions.map((pres, presIndex) => (
                        <div key={presIndex} style={{ 
                          fontSize: '12px', 
                          color: '#721c24',
                          marginLeft: '1rem'
                        }}>
                          • {pres.value || pres.valueText || pres.concept.display}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 임상 메모 */}
                  {notes.length > 0 && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#6c757d' }}>
                        📝 임상 메모:
                      </div>
                      {notes.map((note, noteIndex) => (
                        <div key={noteIndex} style={{ 
                          fontSize: '12px', 
                          color: '#495057',
                          marginLeft: '1rem',
                          fontStyle: 'italic'
                        }}>
                          "{note.value || note.valueText}"
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 전체 관찰 수 표시 */}
                  {visit.observations && visit.observations.length > 0 && (
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#6c757d',
                      borderTop: '1px solid #eee',
                      paddingTop: '0.5rem',
                      marginTop: '0.5rem'
                    }}>
                      📊 총 {visit.observations.length}개 항목 기록됨
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VisitHistoryPanel;