import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Clock, 
  Eye, 
  RefreshCw, 
  AlertCircle, 
  User,
  FileText,
  X,
  Activity,
  Brain,
  ClipboardList,
  Stethoscope
} from 'lucide-react';

// 토스트 모달 컴포넌트
const SoapDetailToast = ({ visit, soapDetails, onClose }) => {
  if (!visit || !soapDetails) return null;

  const getSoapIcon = (soapType) => {
    switch (soapType) {
      case 'S': return <User size={16} className="soap-icon subjective" />;
      case 'O': return <Activity size={16} className="soap-icon objective" />;
      case 'A': return <Brain size={16} className="soap-icon assessment" />;
      case 'P': return <ClipboardList size={16} className="soap-icon plan" />;
      default: return <FileText size={16} />;
    }
  };

  const getSoapLabel = (soapType) => {
    switch (soapType) {
      case 'S': return 'Subjective (주관적 정보)';
      case 'O': return 'Objective (객관적 소견)';
      case 'A': return 'Assessment (평가/진단)';
      case 'P': return 'Plan (치료계획)';
      default: return soapType;
    }
  };

  return (
    <div className="soap-toast-overlay">
      <div className="soap-toast-modal">
        <style jsx>{`
          .soap-toast-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            animation: fadeIn 0.2s ease;
          }

          .soap-toast-modal {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            overflow: hidden;
            animation: slideUp 0.3s ease;
          }

          .toast-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .toast-title {
            font-size: 1.1rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .toast-close {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 0.25rem;
            border-radius: 4px;
            transition: background 0.2s;
          }

          .toast-close:hover {
            background: rgba(255, 255, 255, 0.2);
          }

          .toast-content {
            padding: 1.5rem;
            max-height: 60vh;
            overflow-y: auto;
          }

          .visit-info {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1.5rem;
            border-left: 4px solid #667eea;
          }

          .visit-date {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 0.5rem;
          }

          .visit-diagnosis {
            color: #6c757d;
            font-size: 0.9rem;
          }

          .soap-section {
            margin-bottom: 1.5rem;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            overflow: hidden;
          }

          .soap-header {
            background: #f8f9fa;
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 600;
            font-size: 0.9rem;
          }

          .soap-icon.subjective { color: #3b82f6; }
          .soap-icon.objective { color: #10b981; }
          .soap-icon.assessment { color: #f59e0b; }
          .soap-icon.plan { color: #8b5cf6; }

          .soap-items {
            padding: 1rem;
          }

          .soap-item {
            margin-bottom: 1rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #f1f3f4;
          }

          .soap-item:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
          }

          .soap-content {
            line-height: 1.6;
            color: #374151;
            margin-bottom: 0.5rem;
          }

          .soap-meta {
            display: flex;
            gap: 1rem;
            font-size: 0.8rem;
            color: #6b7280;
          }

          .icd10-badge {
            background: #dbeafe;
            color: #1e40af;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
            margin-top: 0.5rem;
            display: inline-block;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes slideUp {
            from { 
              opacity: 0;
              transform: translateY(20px) scale(0.95);
            }
            to { 
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}</style>

        {/* 헤더 */}
        <div className="toast-header">
          <div className="toast-title">
            <Stethoscope size={20} />
            SOAP 진단 상세
          </div>
          <button className="toast-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* 내용 */}
        <div className="toast-content">
          {/* 방문 정보 */}
          <div className="visit-info">
            <div className="visit-date">
              📅 {new Date(visit.visit_date).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short'
              })}
            </div>
            {visit.primary_diagnosis && (
              <div className="visit-diagnosis">
                주진단: {visit.primary_diagnosis}
              </div>
            )}
          </div>

          {/* SOAP 상세 */}
          {Object.entries(soapDetails).map(([soapType, items]) => 
            items.length > 0 && (
              <div key={soapType} className="soap-section">
                <div className="soap-header">
                  {getSoapIcon(soapType)}
                  {getSoapLabel(soapType)}
                </div>
                <div className="soap-items">
                  {items.map((item, index) => (
                    <div key={index} className="soap-item">
                      <div className="soap-content">
                        {item.content}
                      </div>
                      {item.clinical_notes && (
                        <div className="soap-content" style={{fontStyle: 'italic', color: '#6b7280'}}>
                          💭 {item.clinical_notes}
                        </div>
                      )}
                      {item.icd10_code && item.icd10_name && (
                        <div className="icd10-badge">
                          {item.icd10_code} - {item.icd10_name}
                        </div>
                      )}
                      <div className="soap-meta">
                        <span>#{item.sequence_number}</span>
                        <span>{item.diagnosis_type}</span>
                        <span>{new Date(item.created_date).toLocaleString('ko-KR')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

// 메인 컴포넌트
const VisitHistoryPanel = ({ patient, refreshTrigger }) => {
  const [visitHistory, setVisitHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [soapDetails, setSoapDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const patientUuid = patient?.person?.uuid || patient?.uuid || patient?.openmrs_patient_uuid;

  // 내원이력 조회
  const fetchVisitHistory = useCallback(async () => {
    if (!patientUuid) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/openmrs/visit-history/by_patient/?patient_uuid=${patientUuid}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setVisitHistory(data.visits || []);
      } else {
        throw new Error(data.error || '내원 이력 조회 실패');
      }
      
    } catch (error) {
      console.error('❌ 내원 이력 조회 실패:', error);
      setError(error.message);
      setVisitHistory([]);
    } finally {
      setLoading(false);
    }
  }, [patientUuid]);

  // SOAP 상세 조회
  const fetchSoapDetails = useCallback(async (visit) => {
    if (!visit.encounter_uuid) return;

    try {
      setLoadingDetails(true);
      
      // 🔥 올바른 ViewSet 엔드포인트 사용: visit-history/{pk}/soap_summary/
      const response = await fetch(`/api/openmrs/visit-history/${visit.encounter_uuid}/soap_summary/`);
      
      if (!response.ok) {
        throw new Error('SOAP 상세 정보를 불러올 수 없습니다.');
      }
      
      const data = await response.json();
      
      // 🔥 응답 데이터 구조 확인
      console.log('📋 SOAP 상세 응답:', data);
      
      if (data.soap_summary) {
        setSoapDetails(data.soap_summary);
        setSelectedVisit(visit);
      } else {
        throw new Error('SOAP 정보가 없습니다.');
      }
      
    } catch (error) {
      console.error('❌ SOAP 상세 조회 실패:', error);
      alert(error.message);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  // 토스트 닫기
  const closeToast = useCallback(() => {
    setSelectedVisit(null);
    setSoapDetails(null);
  }, []);

  useEffect(() => {
    if (patientUuid) {
      fetchVisitHistory();
    }
  }, [patientUuid, refreshTrigger, fetchVisitHistory]);

  // 환자 정보가 없는 경우
  if (!patient) {
    return (
      <div className="compact-visit-panel">
        <div className="empty-state">
          <User size={24} />
          <span>환자를 선택해 주세요.</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="compact-visit-panel">
        <style jsx>{`
          .compact-visit-panel {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            height: 100%;
            max-height: 400px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          .panel-header {
            background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
            color: white;
            padding: 0.75rem 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .header-title {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.9rem;
            font-weight: 600;
          }

          .visit-count {
            background: rgba(255, 255, 255, 0.2);
            padding: 0.25rem 0.5rem;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
          }

          .refresh-btn {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 0.25rem;
            border-radius: 4px;
            transition: background 0.2s;
          }

          .refresh-btn:hover {
            background: rgba(255, 255, 255, 0.2);
          }

          .panel-content {
            flex: 1;
            overflow-y: auto;
            padding: 0.75rem;
          }

          .visit-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .visit-item {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 0.75rem;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
          }

          .visit-item:hover {
            background: #e9ecef;
            border-color: #3b82f6;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
          }

          .visit-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
          }

          .visit-date {
            font-weight: 600;
            color: #2c3e50;
            font-size: 0.85rem;
          }

          .visit-time {
            font-size: 0.75rem;
            color: #6c757d;
          }

          .visit-diagnosis {
            font-size: 0.8rem;
            color: #495057;
            line-height: 1.4;
            margin-bottom: 0.25rem;
          }

          .visit-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.7rem;
            color: #6c757d;
          }

          .view-details {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            color: #3b82f6;
            font-weight: 500;
          }

          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            gap: 0.5rem;
            color: #6c757d;
            text-align: center;
            padding: 2rem;
          }

          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 200px;
            gap: 0.75rem;
            color: #6c757d;
          }

          .error-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 200px;
            gap: 0.75rem;
            color: #dc3545;
            text-align: center;
            padding: 1rem;
          }

          .retry-btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.8rem;
            transition: background 0.2s;
          }

          .retry-btn:hover {
            background: #2563eb;
          }

          .loading-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid #f3f4f6;
            border-top: 2px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>

        {/* 헤더 */}
        <div className="panel-header">
          <div className="header-title">
            <Calendar size={16} />
            내원이력
            {visitHistory.length > 0 && (
              <span className="visit-count">{visitHistory.length}</span>
            )}
          </div>
          <button 
            className="refresh-btn" 
            onClick={fetchVisitHistory}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'loading-spinner' : ''} />
          </button>
        </div>

        {/* 내용 */}
        <div className="panel-content">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner" />
              <span>내원이력 조회 중...</span>
            </div>
          ) : error ? (
            <div className="error-state">
              <AlertCircle size={24} />
              <span>{error}</span>
              <button className="retry-btn" onClick={fetchVisitHistory}>
                다시 시도
              </button>
            </div>
          ) : visitHistory.length === 0 ? (
            <div className="empty-state">
              <FileText size={32} />
              <span>내원기록이 없습니다</span>
            </div>
          ) : (
            <div className="visit-list">
              {visitHistory.map((visit) => (
                <div 
                  key={visit.uuid} 
                  className="visit-item"
                  onClick={() => fetchSoapDetails(visit)}
                >
                  <div className="visit-header">
                    <div className="visit-date">
                      {new Date(visit.visit_date).toLocaleDateString('ko-KR')}
                    </div>
                    <div className="visit-time">
                      {new Date(visit.visit_date).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  
                  {visit.primary_diagnosis && (
                    <div className="visit-diagnosis">
                      📋 {visit.primary_diagnosis}
                    </div>
                  )}
                  
                  <div className="visit-meta">
                    <span>진료: {visit.encounter_type || '일반진료'}</span>
                    <div className="view-details">
                      {loadingDetails ? (
                        <div className="loading-spinner" style={{width: '12px', height: '12px'}} />
                      ) : (
                        <>
                          <Eye size={12} />
                          상세보기
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SOAP 상세 토스트 */}
      {selectedVisit && soapDetails && (
        <SoapDetailToast 
          visit={selectedVisit}
          soapDetails={soapDetails}
          onClose={closeToast}
        />
      )}
    </>
  );
};

export default VisitHistoryPanel;