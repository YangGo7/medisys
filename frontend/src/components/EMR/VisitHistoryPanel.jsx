// frontend/src/components/EMR/VisitHistoryPanel.jsx (확장된 버전)
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const VisitHistoryPanel = ({ patient }) => {
  const [visitHistory, setVisitHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

  useEffect(() => {
    if (patient?.uuid) {
      fetchVisitHistory();
    }
  }, [patient]);

  const fetchVisitHistory = async () => {
    try {
      setLoading(true);
      
      // OpenMRS 내원 이력 조회
      const response = await axios.get(`${API_BASE}/openmrs-clinical/patient/${patient.uuid}/visits-history/`);
      
      setVisitHistory(response.data.visits || []);
    } catch (error) {
      console.error('내원 기록 조회 실패:', error);
      
      // 기존 API fallback
      try {
        const fallbackResponse = await fetch(`/api/openmrs-encounters?uuid=${patient.uuid}`);
        const fallbackData = await fallbackResponse.json();
        
        // 기존 데이터 형식으로 변환
        const convertedHistory = fallbackData.map(encounter => ({
          visit_uuid: encounter.uuid,
          start_datetime: encounter.encounterDatetime,
          encounters: [{
            encounter_uuid: encounter.uuid,
            encounter_datetime: encounter.encounterDatetime,
            encounter_type: '일반 진료',
            provider: encounter.provider,
            observations: []
          }]
        }));
        
        setVisitHistory(convertedHistory);
      } catch (fallbackError) {
        console.error('Fallback 조회도 실패:', fallbackError);
        setVisitHistory([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const showVisitDetails = (visit) => {
    setSelectedVisit(visit);
    setShowDetails(true);
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
    return observations.filter(obs => 
      obs.concept && 
      obs.concept.display && 
      (obs.concept.display.toLowerCase().includes('diagnosis') ||
       obs.concept.display.includes('진단') ||
       obs.concept.display.toLowerCase().includes('condition'))
    );
  };

  const extractPrescriptions = (observations) => {
    return observations.filter(obs => 
      obs.concept && 
      obs.concept.display && 
      (obs.concept.display.toLowerCase().includes('drug') ||
       obs.concept.display.includes('약물') ||
       obs.concept.display.toLowerCase().includes('medication') ||
       obs.concept.display.includes('처방'))
    );
  };

  if (!patient) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
        <h3>📂 내원 기록</h3>
        <p>환자가 선택되지 않았습니다.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center' }}>
        <h3>📂 내원 기록</h3>
        <p>내원 기록을 불러오는 중...</p>
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
        <h3 style={{ margin: 0 }}>📂 내원 기록</h3>
        <div style={{ fontSize: '12px', color: '#666' }}>
          총 {visitHistory.length}건
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {visitHistory.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#6c757d', 
            padding: '2rem',
            fontSize: '14px' 
          }}>
            <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📋</div>
            <p>내원 기록이 없습니다.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {visitHistory.map((visit, index) => (
              <div 
                key={visit.visit_uuid || index}
                style={{
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
                onClick={() => showVisitDetails(visit)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                  e.currentTarget.style.borderColor = '#007bff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff';
                  e.currentTarget.style.borderColor = '#e9ecef';
                }}
              >
                {/* 내원 날짜 */}
                <div style={{ 
                  fontWeight: 'bold', 
                  color: '#495057',
                  marginBottom: '0.5rem',
                  fontSize: '14px'
                }}>
                  📅 {formatDateTime(visit.start_datetime)}
                  {visit.stop_datetime && (
                    <span style={{ 
                      fontSize: '12px', 
                      color: '#6c757d', 
                      fontWeight: 'normal',
                      marginLeft: '0.5rem'
                    }}>
                      ~ {formatDateTime(visit.stop_datetime)}
                    </span>
                  )}
                </div>

                {/* Encounter 요약 */}
                {visit.encounters && visit.encounters.map((encounter, encIndex) => {
                  const diagnoses = extractDiagnoses(encounter.observations || []);
                  const prescriptions = extractPrescriptions(encounter.observations || []);

                  return (
                    <div key={encounter.encounter_uuid || encIndex} style={{ marginBottom: '0.5rem' }}>
                      <div style={{ 
                        fontSize: '13px', 
                        color: '#6c757d',
                        marginBottom: '0.25rem'
                      }}>
                        👨‍⚕️ {encounter.provider || '담당의 정보 없음'} | {encounter.encounter_type || '일반 진료'}
                      </div>

                      {/* 진단 요약 */}
                      {diagnoses.length > 0 && (
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#28a745',
                          marginBottom: '0.25rem'
                        }}>
                          🏥 진단: {diagnoses.slice(0, 2).map(d => d.value || d.concept.display).join(', ')}
                          {diagnoses.length > 2 && ` 외 ${diagnoses.length - 2}건`}
                        </div>
                      )}

                      {/* 처방 요약 */}
                      {prescriptions.length > 0 && (
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#dc3545',
                          marginBottom: '0.25rem'
                        }}>
                          💊 처방: {prescriptions.slice(0, 2).map(p => p.value || p.concept.display).join(', ')}
                          {prescriptions.length > 2 && ` 외 ${prescriptions.length - 2}건`}
                        </div>
                      )}

                      {/* 총 관찰 수 */}
                      {encounter.observations && encounter.observations.length > 0 && (
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#6c757d'
                        }}>
                          📊 총 {encounter.observations.length}개 항목 기록됨
                        </div>
                      )}
                    </div>
                  );
                })}

                <div style={{ 
                  fontSize: '11px', 
                  color: '#007bff',
                  textAlign: 'right',
                  marginTop: '0.5rem'
                }}>
                  👆 클릭하여 상세보기
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 상세보기 모달 */}
      {showDetails && selectedVisit && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: '2px solid #e9ecef'
            }}>
              <h3 style={{ margin: 0 }}>📋 내원 상세 기록</h3>
              <button
                onClick={() => setShowDetails(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#6c757d'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <strong>📅 내원일시:</strong> {formatDateTime(selectedVisit.start_datetime)}
              {selectedVisit.stop_datetime && (
                <span> ~ {formatDateTime(selectedVisit.stop_datetime)}</span>
              )}
            </div>

            {selectedVisit.encounters && selectedVisit.encounters.map((encounter, index) => (
              <div key={encounter.encounter_uuid || index} style={{
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem',
                backgroundColor: '#f8f9fa'
              }}>
                <h4 style={{ 
                  margin: '0 0 0.75rem 0',
                  color: '#495057',
                  fontSize: '16px'
                }}>
                  🏥 {encounter.encounter_type || '진료'}
                </h4>
                
                <div style={{ marginBottom: '0.75rem', fontSize: '14px' }}>
                  <strong>👨‍⚕️ 담당의:</strong> {encounter.provider || '정보 없음'}<br/>
                  <strong>🕒 진료시간:</strong> {formatDateTime(encounter.encounter_datetime)}
                </div>

                {encounter.observations && encounter.observations.length > 0 && (
                  <div>
                    <h5 style={{ 
                      margin: '0.75rem 0 0.5rem 0',
                      color: '#495057',
                      fontSize: '14px'
                    }}>
                      📊 진료 기록 ({encounter.observations.length}건)
                    </h5>
                    
                    {/* 진단 섹션 */}
                    {(() => {
                      const diagnoses = extractDiagnoses(encounter.observations);
                      return diagnoses.length > 0 && (
                        <div style={{ marginBottom: '0.75rem' }}>
                          <h6 style={{ 
                            margin: '0 0 0.5rem 0',
                            color: '#28a745',
                            fontSize: '13px'
                          }}>
                            🏥 진단 정보
                          </h6>
                          {diagnoses.map((obs, obsIndex) => (
                            <div key={obsIndex} style={{
                              padding: '0.5rem',
                              backgroundColor: '#d4edda',
                              borderRadius: '4px',
                              marginBottom: '0.25rem',
                              fontSize: '12px'
                            }}>
                              <div style={{ fontWeight: 'bold' }}>
                                {obs.concept.display}
                              </div>
                              {obs.value && (
                                <div style={{ color: '#155724' }}>
                                  값: {obs.value}
                                </div>
                              )}
                              <div style={{ color: '#6c757d', fontSize: '11px' }}>
                                {formatDateTime(obs.obsDatetime)}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* 처방 섹션 */}
                    {(() => {
                      const prescriptions = extractPrescriptions(encounter.observations);
                      return prescriptions.length > 0 && (
                        <div style={{ marginBottom: '0.75rem' }}>
                          <h6 style={{ 
                            margin: '0 0 0.5rem 0',
                            color: '#dc3545',
                            fontSize: '13px'
                          }}>
                            💊 처방 정보
                          </h6>
                          {prescriptions.map((obs, obsIndex) => (
                            <div key={obsIndex} style={{
                              padding: '0.5rem',
                              backgroundColor: '#f8d7da',
                              borderRadius: '4px',
                              marginBottom: '0.25rem',
                              fontSize: '12px'
                            }}>
                              <div style={{ fontWeight: 'bold' }}>
                                {obs.concept.display}
                              </div>
                              {obs.value && (
                                <div style={{ color: '#721c24' }}>
                                  값: {obs.value}
                                </div>
                              )}
                              <div style={{ color: '#6c757d', fontSize: '11px' }}>
                                {formatDateTime(obs.obsDatetime)}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* 기타 관찰 */}
                    {(() => {
                      const otherObs = encounter.observations.filter(obs => 
                        !extractDiagnoses([obs]).length && !extractPrescriptions([obs]).length
                      );
                      return otherObs.length > 0 && (
                        <div>
                          <h6 style={{ 
                            margin: '0 0 0.5rem 0',
                            color: '#6c757d',
                            fontSize: '13px'
                          }}>
                            📝 기타 기록
                          </h6>
                          {otherObs.map((obs, obsIndex) => (
                            <div key={obsIndex} style={{
                              padding: '0.5rem',
                              backgroundColor: '#e2e3e5',
                              borderRadius: '4px',
                              marginBottom: '0.25rem',
                              fontSize: '12px'
                            }}>
                              <div style={{ fontWeight: 'bold' }}>
                                {obs.concept.display}
                              </div>
                              {obs.value && (
                                <div style={{ color: '#495057' }}>
                                  값: {obs.value}
                                </div>
                              )}
                              <div style={{ color: '#6c757d', fontSize: '11px' }}>
                                {formatDateTime(obs.obsDatetime)}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {(!encounter.observations || encounter.observations.length === 0) && (
                  <div style={{ 
                    textAlign: 'center', 
                    color: '#6c757d', 
                    fontSize: '13px',
                    padding: '1rem'
                  }}>
                    이 진료에 대한 상세 기록이 없습니다.
                  </div>
                )}
              </div>
            ))}

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                onClick={() => setShowDetails(false)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitHistoryPanel;