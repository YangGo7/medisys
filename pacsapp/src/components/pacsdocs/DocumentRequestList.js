// pacsapp/src/components/pacsdocs/DocumentRequestList.js

import React, { useState, useEffect } from 'react';
import { pacsdocsService, requiresContrast, getStatusLabel } from '../../services/pacsdocsService';
import './DocumentRequestList.css';

const DocumentRequestList = ({ onShowDocument, onShowUpload, onShowImagingProcess }) => {
  // 상태 관리
  const [studyDocuments, setStudyDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 🔥 수정: 필터 상태 확장 (5개 필터)
  const [filters, setFilters] = useState({
    exam_date: new Date().toISOString().split('T')[0], // 검사일시 (기존)
    patient_id: '',      // 🆕 환자ID
    patient_name: '',    // 환자명 (기존)
    modality: '',        // 모달리티 (기존)
    reporting_doctor: '' // 🆕 판독의
  });

  // 서류 선택 상태 (studyId: [docRequestIds])
  const [selectedDocuments, setSelectedDocuments] = useState({});

  // 데이터 로딩
  useEffect(() => {
    fetchStudyDocuments();
  }, [filters]);

  const fetchStudyDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await pacsdocsService.getStudyDocuments(filters);
      console.log('Fetched study documents:', data);
      
      setStudyDocuments(data.results || data || []);
    } catch (err) {
      console.error('Failed to fetch study documents:', err);
      setError('서류 목록을 불러오는데 실패했습니다.');
      setStudyDocuments(getDummyData());
    } finally {
      setLoading(false);
    }
  };

  // 🔥 수정: 더미 데이터를 워크리스트 필드명으로 변경
  const getDummyData = () => {
    return [
      {
        id: 1,
        patientId: 'P2025-001234',
        patientName: '김철수',
        birthDate: '1985-06-12',
        examPart: '흉부',
        modality: 'CT',
        reportingDoctor: '이지은',
        requestDateTime: '2025-06-24T14:30:00Z',
        examDateTime: '2025. 6. 27. 오전 11:00', // 🆕 검사일시 추가
        priority: '응급',
        examStatus: '검사완료',
        documents: [
          {
            id: 1,
            document_type: { code: 'consent_contrast', name: '조영제 사용 동의서', requires_signature: true },
            status: 'pending'
          },
          {
            id: 2,
            document_type: { code: 'report_kor', name: '판독 결과지 (국문)', requires_signature: false },
            status: 'pending'
          },
          {
            id: 3,
            document_type: { code: 'imaging_cd', name: '진료기록영상 (CD)', requires_signature: false },
            status: 'pending'
          }
        ]
      }
    ];
  };

  // 필터 변경 핸들러
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 🔥 수정: 필터 초기화 확장
  const resetFilters = () => {
    setFilters({
      exam_date: '',
      patient_id: '',      // 🆕 환자ID 초기화
      patient_name: '',
      modality: '',
      reporting_doctor: '' // 🆕 판독의 초기화
    });
  };

  // 서류 선택 상태 변경
  const handleDocumentSelect = (studyId, docRequestId, checked) => {
    setSelectedDocuments(prev => {
      const studySelections = prev[studyId] || [];
      
      if (checked) {
        return {
          ...prev,
          [studyId]: [...studySelections, docRequestId]
        };
      } else {
        return {
          ...prev,
          [studyId]: studySelections.filter(id => id !== docRequestId)
        };
      }
    });
  };

  // 선택된 서류들 처리
  const handleProcessDocuments = async (studyId) => {
    const selectedIds = selectedDocuments[studyId] || [];
    
    if (selectedIds.length === 0) {
      alert('처리할 서류를 선택해주세요.');
      return;
    }

    try {
      setLoading(true);
      
      const result = await pacsdocsService.processDocuments(studyId, {
        document_ids: selectedIds,
        action: 'complete',
        processed_by: 'current_user',
        notes: ''
      });

      if (result.processed_count > 0) {
        alert(`${result.processed_count}개 서류가 처리되었습니다.`);
      }
      
      if (result.failed_count > 0) {
        alert(`${result.failed_count}개 서류 처리에 실패했습니다.`);
      }

      setSelectedDocuments(prev => ({
        ...prev,
        [studyId]: []
      }));

      await fetchStudyDocuments();
      
    } catch (error) {
      console.error('Failed to process documents:', error);
      alert('서류 처리에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 수정: 동의서 클릭 핸들러 - 워크리스트 필드명 사용
  const handleConsentClick = (study, docRequest) => {
    if (onShowUpload) {
      onShowUpload(docRequest.document_type.code, study.patientName, study.modality, study.examPart);
    }
  };

  // 🔥 수정: 필요서류 클릭 핸들러 - 워크리스트 필드명 사용
  const handleDocumentClick = (study, docRequest) => {
    if (docRequest.document_type.code === 'imaging_cd' || docRequest.document_type.code === 'imaging_dvd') {
      if (onShowImagingProcess) {
        onShowImagingProcess(study.patientName, study.modality, study.examPart);
      }
    } else {
      if (onShowDocument) {
        onShowDocument(
          docRequest.document_type.code, 
          study.patientName,
          study.modality, 
          study.examPart,
          study.id
        );
      }
    }
  };

  // 로딩 상태
  if (loading && studyDocuments.length === 0) {
    return (
      <div className="document-request-list">
        <div className="section-header">📋 서류 요청 목록</div>
        <div className="loading-message">데이터를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="document-request-list">
      <div className="section-header">📋 서류 요청 목록</div>
      
      {/* 🔥 수정: 필터 섹션 2줄 레이아웃 */}
      <div className="filter-section">
        {/* 첫 번째 줄: 검사일시 + 환자ID + 환자명 */}
        <div className="filter-row">
          <div className="filter-item">
            <span>📅</span>
            <input
              type="date"
              value={filters.exam_date}
              onChange={(e) => handleFilterChange('exam_date', e.target.value)}
              className="filter-input"
            />
          </div>
          
          <div className="filter-item">
            <span>🆔</span>
            <input
              type="text"
              placeholder="환자ID"
              value={filters.patient_id}
              onChange={(e) => handleFilterChange('patient_id', e.target.value)}
              className="filter-input"
            />
          </div>
          
          <div className="filter-item">
            <span>👤</span>
            <input
              type="text"
              placeholder="환자명"
              value={filters.patient_name}
              onChange={(e) => handleFilterChange('patient_name', e.target.value)}
              className="filter-input patient-filter"
            />
          </div>
        </div>

        {/* 두 번째 줄: 모달리티 + 판독의 + 버튼들 */}
        <div className="filter-row">
          <div className="filter-item">
            <span>📋</span>
            <select
              value={filters.modality}
              onChange={(e) => handleFilterChange('modality', e.target.value)}
              className="filter-input"
            >
              <option value="">모든 검사</option>
              <option value="CT">CT</option>
              <option value="MR">MR</option>
              <option value="CR">CR</option>
              <option value="DX">DX</option>
              <option value="US">US</option>
              <option value="XA">XA</option>
              <option value="MG">MG</option>
              <option value="NM">NM</option>
              <option value="PT">PT</option>
            </select>
          </div>
          
          <div className="filter-item">
            <span>👨‍⚕️</span>
            <input
              type="text"
              placeholder="판독의"
              value={filters.reporting_doctor}
              onChange={(e) => handleFilterChange('reporting_doctor', e.target.value)}
              className="filter-input"
            />
          </div>
          
          <div className="filter-buttons">
            <button className="btn btn-primary" onClick={fetchStudyDocuments}>
              🔎 검색
            </button>
            <button className="btn btn-secondary" onClick={resetFilters}>
              🔄 초기화
            </button>
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="error-message">⚠️ {error}</div>
      )}
      
      {/* 🔥 수정: 테이블 - 워크리스트 필드명 사용 */}
      <div className="table-container">
        <table className="worklist-table">
          <thead>
            <tr>
              <th>No</th>
              <th>환자ID</th>
              <th>환자명</th>
              <th>검사부위</th>
              <th>모달리티</th>
              <th>판독의</th>
              <th>검사일시</th>
              <th>동의서</th>
              <th>필요서류 등</th> 
              <th>발급 현황</th>
            </tr>
          </thead>
          <tbody>
            {studyDocuments.map((study, index) => {
              const selectedIds = selectedDocuments[study.id] || [];
              
              // 🔥 수정: 동의서는 조영제 동의서만 필터링
              const consentDocs = study.documents?.filter(doc => 
                doc.document_type.code === 'consent_contrast'
              ) || [];
              
              // 🔥 수정: 필요서류는 조영제 동의서 제외한 모든 서류
              const requiredDocs = study.documents?.filter(doc => 
                doc.document_type.code !== 'consent_contrast'
              ) || [];
              
              return (
                <tr 
                  key={study.id} 
                  className={study.priority === '응급' ? 'urgent-row' : ''}
                >
                  <td className="number-cell">{index + 1}</td>
                  <td>{study.patientId}</td>
                  <td className="patient-cell">
                    {study.patientName}
                    <div className="patient-id">{study.birthDate}</div>
                  </td>
                  <td>{study.examPart}</td>
                  <td className={`modality-cell modality-${study.modality?.toLowerCase()}`}>
                    {study.modality}
                  </td>
                  <td>{study.reportingDoctor}</td>
                  <td>
                    {/* 🔥 수정: examDateTime 사용 (검사일시) */}
                    {study.examDateTime ? (() => {
                      if (typeof study.examDateTime === 'string' && study.examDateTime.includes('.')) {
                        return study.examDateTime;
                      } else {
                        const date = new Date(study.examDateTime);
                        return (
                          <>
                            {date.toLocaleDateString('ko-KR')}
                            <br />
                            {date.toLocaleTimeString('ko-KR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </>
                        );
                      }
                    })() : 'N/A'}
                  </td>
                  
                  {/* 동의서 열 */}
                  <td className="consent-section">
                    {requiresContrast(study.modality) ? (
                      consentDocs.map(doc => (
                        <div 
                          key={doc.id}
                          className={`consent-item ${doc.status}`}
                          onClick={() => handleConsentClick(study, doc)}
                        >
                          {doc.status === 'completed' ? '✅ 완료' : '조영제 동의서'}
                        </div>
                      ))
                    ) : (
                      <small className="no-consent">해당없음</small>
                    )}
                  </td>
                  
                  {/* 필요서류 열 */}
                  <td>
                    <div className="required-docs">
                      {requiredDocs.map(doc => (
                        <div key={doc.id}>
                          <div className="doc-checkbox-item">
                            <input
                              type="checkbox"
                              className="doc-checkbox"
                              checked={selectedIds.includes(doc.id)}
                              onChange={(e) => handleDocumentSelect(study.id, doc.id, e.target.checked)}
                              disabled={doc.status === 'completed'}
                            />
                            <label
                              className="doc-label"
                              onClick={() => handleDocumentClick(study, doc)}
                            >
                              {doc.document_type.name}
                            </label>
                            <span className={`doc-status status-${doc.status}`}>
                              {getStatusLabel(doc.status)}
                            </span>
                          </div>
                          {(doc.document_type.code === 'imaging_cd' || doc.document_type.code === 'imaging_dvd') && (
                            <div className="doc-info">위임장/동의서 필요</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                  
                  {/* 발급 열 */}
                  <td className="issue-section">
                    <button
                      className="issue-btn"
                      onClick={() => handleProcessDocuments(study.id)}
                      disabled={selectedIds.length === 0 || loading}
                    >
                      {loading ? '처리중...' : '선택 발급'}
                    </button>
                    <div className="issue-count">
                      {selectedIds.length}개 선택
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 데이터가 없을 때 */}
      {!loading && studyDocuments.length === 0 && (
        <div className="empty-message">
          📋 검색 조건에 맞는 서류 요청이 없습니다.
        </div>
      )}
    </div>
  );
};

export default DocumentRequestList;