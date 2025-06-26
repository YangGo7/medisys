// frontend/src/components/EMR/VisitHistoryPanel.jsx (PatientVisitHistoryViewSet 사용)
import React, { useEffect, useState } from 'react';
import { 
  Calendar, 
  User, 
  FileText, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  Eye,
  Activity,
  Heart,
  Brain,
  Clipboard,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  BarChart3
} from 'lucide-react';
import './EmrMainPage.css'; // EMR 스타일 사용

const VisitHistoryPanel = ({ patient, refreshTrigger }) => {
  const [visitHistory, setVisitHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedVisit, setExpandedVisit] = useState(null);
  const [soapDetails, setSoapDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});
  const [statistics, setStatistics] = useState(null);

  // 🔥 환자 UUID 추출
  const patientUuid = patient?.person?.uuid || patient?.uuid || patient?.openmrs_patient_uuid;

  console.log('🔍 VisitHistoryPanel:', { patient, patientUuid });

  useEffect(() => {
    if (patientUuid) {
      fetchVisitHistory();
      fetchStatistics();
    }
  }, [patientUuid, refreshTrigger]);

  const fetchVisitHistory = async () => {
    if (!patientUuid) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔄 내원 이력 조회 (ViewSet): ${patientUuid}`);
      
      // 🔥 PatientVisitHistoryViewSet의 by_patient 액션 사용
      const response = await fetch(`/api/openmrs/visit-history/by_patient/?patient_uuid=${patientUuid}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📡 ViewSet 내원 이력 응답:', data);
      
      if (data.success) {
        setVisitHistory(data.visits || []);
        console.log(`✅ ViewSet ${data.visit_count}건의 내원 이력 로드`);
      } else {
        throw new Error(data.error || '내원 이력 조회 실패');
      }
      
    } catch (error) {
      console.error('❌ ViewSet 내원 이력 조회 실패:', error);
      setError(error.message);
      setVisitHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    if (!patientUuid) return;

    try {
      console.log(`📊 통계 조회: ${patientUuid}`);
      
      // 🔥 PatientVisitHistoryViewSet의 statistics 액션 사용
      const response = await fetch(`/api/openmrs/visit-history/statistics/?patient_uuid=${patientUuid}`);
      
      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
        console.log('📊 통계 로드 성공:', data);
      }
    } catch (error) {
      console.warn('📊 통계 로드 실패:', error);
    }
  };

  const fetchSoapDetails = async (visitId) => {
    const visit = visitHistory.find(v => v.uuid === visitId);
    if (!visit) return;

    if (soapDetails[visitId]) {
      setExpandedVisit(expandedVisit === visitId ? null : visitId);
      return;
    }

    try {
      setLoadingDetails(prev => ({ ...prev, [visitId]: true }));
      
      console.log(`🔍 SOAP 상세 조회 (ViewSet): ${visitId}`);
      
      // 🔥 PatientVisitHistoryViewSet의 soap_summary 액션 사용
      const response = await fetch(`/api/openmrs/visit-history/${visitId}/soap_summary/`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📋 ViewSet SOAP 상세 응답:', data);
      
      setSoapDetails(prev => ({
        ...prev,
        [visitId]: data.soap_summary
      }));
      setExpandedVisit(visitId);
      console.log(`✅ ViewSet SOAP 상세 로드 성공: ${data.total_count}개`);
      
    } catch (error) {
      console.error('❌ ViewSet SOAP 상세 조회 실패:', error);
      alert(`상세 정보 조회 실패: ${error.message}`);
    } finally {
      setLoadingDetails(prev => ({ ...prev, [visitId]: false }));
    }
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

  const getSoapIcon = (soapType) => {
    switch (soapType) {
      case 'S': return <Heart className="w-4 h-4" style={{ color: '#e74c3c' }} />;
      case 'O': return <Eye className="w-4 h-4" style={{ color: '#3498db' }} />;
      case 'A': return <Brain className="w-4 h-4" style={{ color: '#9b59b6' }} />;
      case 'P': return <Clipboard className="w-4 h-4" style={{ color: '#27ae60' }} />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getSoapTypeLabel = (soapType) => {
    const labels = {
      'S': '주관적 정보 (Subjective)',
      'O': '객관적 소견 (Objective)',
      'A': '진단 평가 (Assessment)',
      'P': '치료 계획 (Plan)'
    };
    return labels[soapType] || soapType;
  };

  if (loading) {
    return (
      <div className="card">
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          height: '200px',
          color: '#7f8c8d'
        }}>
          <Activity className="w-8 h-8 animate-spin mb-4" style={{ color: '#3498db' }} />
          <div className="section-title" style={{ textAlign: 'center', border: 'none' }}>
            내원 이력을 불러오는 중...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          height: '200px'
        }}>
          <AlertCircle className="w-8 h-8 mb-4" style={{ color: '#e74c3c' }} />
          <div className="section-title" style={{ color: '#e74c3c', textAlign: 'center', border: 'none' }}>
            {error}
          </div>
          <button
            onClick={fetchVisitHistory}
            style={{
              marginTop: '1rem',
              padding: '12px 24px',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            <RefreshCw className="w-4 h-4" />
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!patientUuid) {
    return (
      <div className="card">
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          height: '300px'
        }}>
          <User className="w-12 h-12 mb-4" style={{ color: '#bdc3c7' }} />
          <div className="section-title" style={{ color: '#95a5a6', textAlign: 'center', border: 'none' }}>
            환자를 선택하면 내원 이력이 표시됩니다
          </div>
        </div>
      </div>
    );
  }

  if (visitHistory.length === 0) {
    return (
      <div className="card">
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          height: '300px'
        }}>
          <FileText className="w-12 h-12 mb-4" style={{ color: '#bdc3c7' }} />
          <div className="section-title" style={{ color: '#7f8c8d', textAlign: 'center', border: 'none' }}>
            아직 내원 기록이 없습니다
          </div>
          <div style={{ fontSize: '14px', color: '#95a5a6', textAlign: 'center', marginTop: '8px' }}>
            진료 기록을 저장하면 여기에 표시됩니다
          </div>
          <button
            onClick={fetchVisitHistory}
            style={{
              marginTop: '1.5rem',
              padding: '10px 20px',
              backgroundColor: '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      {/* 헤더 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '2px solid #f1f5f9'
      }}>
        <div className="section-title" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          margin: 0,
          border: 'none'
        }}>
          <Calendar className="w-6 h-6" style={{ color: '#3498db' }} />
          내원 이력
          <span style={{ 
            backgroundColor: '#3498db', 
            color: 'white', 
            padding: '4px 12px', 
            borderRadius: '12px', 
            fontSize: '12px',
            fontWeight: '600'
          }}>
            {visitHistory.length}
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* 통계 요약 */}
          {statistics && (
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#6c757d',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <BarChart3 className="w-4 h-4" />
              완료: {statistics.completed_visits}
            </div>
          )}
          
          <button
            onClick={fetchVisitHistory}
            style={{
              padding: '8px 16px',
              backgroundColor: '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#229954'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#27ae60'}
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
        </div>
      </div>

      {/* 내원 이력 목록 */}
      <div style={{ 
        maxHeight: 'calc(100vh - 300px)', 
        overflowY: 'auto',
        paddingRight: '8px'
      }}>
        {visitHistory.map((visit, index) => (
          <div key={visit.uuid || index} style={{
            border: '1px solid #e1e8ed',
            borderRadius: '12px',
            marginBottom: '16px',
            backgroundColor: '#fff',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            transition: 'all 0.2s ease'
          }}>
            {/* 기본 정보 헤더 */}
            <div 
              style={{
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderBottom: '1px solid #e1e8ed',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onClick={() => fetchSoapDetails(visit.uuid)}
              onMouseOver={(e) => e.target.style.backgroundColor = '#f1f3f4'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#f8f9fa'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    backgroundColor: '#3498db',
                    borderRadius: '50%',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Calendar className="w-5 h-5" style={{ color: 'white' }} />
                  </div>
                  
                  <div>
                    <div style={{ 
                      fontWeight: '600', 
                      color: '#2c3e50',
                      fontSize: '16px',
                      marginBottom: '4px'
                    }}>
                      {formatDateTime(visit.visit_date)}
                    </div>
                    <div style={{ 
                      fontSize: '13px', 
                      color: '#7f8c8d',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <Stethoscope className="w-4 h-4" />
                      {visit.status_display || visit.status} • {visit.visit_type || 'OUTPATIENT'}
                      {visit.total_diagnoses && ` • SOAP: ${visit.total_diagnoses}개`}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* 주진단 표시 */}
                  {visit.primary_diagnosis && (
                    <div style={{ 
                      fontSize: '13px', 
                      color: '#8e44ad',
                      backgroundColor: '#f8f4ff',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      border: '1px solid #e8d5ff',
                      fontWeight: '500',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {visit.primary_diagnosis}
                    </div>
                  )}
                  
                  {/* 로딩/펼침 아이콘 */}
                  <div style={{
                    backgroundColor: '#ecf0f1',
                    borderRadius: '50%',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {loadingDetails[visit.uuid] ? (
                      <Activity className="w-4 h-4 animate-spin" style={{ color: '#3498db' }} />
                    ) : expandedVisit === visit.uuid ? (
                      <ChevronUp className="w-4 h-4" style={{ color: '#34495e' }} />
                    ) : (
                      <ChevronDown className="w-4 h-4" style={{ color: '#34495e' }} />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 상세 SOAP 정보 */}
            {expandedVisit === visit.uuid && soapDetails[visit.uuid] && (
              <div style={{ padding: '24px', backgroundColor: '#fafbfc' }}>
                {Object.entries(soapDetails[visit.uuid]).map(([soapType, items]) => 
                  items.length > 0 && (
                    <div key={soapType} style={{ marginBottom: '24px' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        marginBottom: '16px',
                        paddingBottom: '8px',
                        borderBottom: '1px solid #e9ecef'
                      }}>
                        <div style={{
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          padding: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                          {getSoapIcon(soapType)}
                        </div>
                        <div style={{
                          fontWeight: '600',
                          color: '#34495e',
                          fontSize: '15px'
                        }}>
                          {getSoapTypeLabel(soapType)}
                        </div>
                        <span style={{
                          backgroundColor: '#3498db',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {items.length}
                        </span>
                      </div>
                      
                      {items.map((item, idx) => (
                        <div key={idx} style={{
                          marginLeft: '36px',
                          marginBottom: '12px',
                          padding: '16px',
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          borderLeft: '4px solid #3498db',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                          <div style={{ 
                            fontSize: '14px', 
                            lineHeight: '1.6',
                            color: '#2c3e50',
                            marginBottom: '8px'
                          }}>
                            {item.content}
                          </div>
                          
                          {item.clinical_notes && (
                            <div style={{ 
                              fontSize: '13px', 
                              color: '#7f8c8d', 
                              fontStyle: 'italic',
                              backgroundColor: '#f8f9fa',
                              padding: '8px',
                              borderRadius: '4px',
                              marginBottom: '8px'
                            }}>
                              📝 {item.clinical_notes}
                            </div>
                          )}
                          
                          {soapType === 'A' && (item.icd10_code || item.icd10_name) && (
                            <div style={{ 
                              fontSize: '13px', 
                              color: '#8e44ad', 
                              fontWeight: '600',
                              backgroundColor: '#f8f4ff',
                              padding: '8px',
                              borderRadius: '4px',
                              border: '1px solid #e8d5ff'
                            }}>
                              🏥 {item.icd10_code}: {item.icd10_name}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VisitHistoryPanel;