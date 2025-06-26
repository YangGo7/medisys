// pacsapp/src/components/pacsdocs/DocumentRequestList.js

import React, { useState, useEffect } from 'react';
import { pacsdocsService, requiresContrast, getStatusLabel } from '../../services/pacsdocsService';
import './DocumentRequestList.css';

const DocumentRequestList = ({ onShowDocument, onShowUpload, onShowImagingProcess }) => {
  // 상태 관리
  const [studyDocuments, setStudyDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 필터 상태
  const [filters, setFilters] = useState({
    exam_date: new Date().toISOString().split('T')[0], // 오늘 날짜
    patient_name: '',
    modality: '',
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
      // 에러 시 더미 데이터 사용 (개발용)
      setStudyDocuments(getDummyData());
    } finally {
      setLoading(false);
    }
  };

  // 더미 데이터 (백엔드 연결 전 테스트용)
  const getDummyData = () => {
    return [
      {
        id: 1,
        patient_id: 'P2025-001234',
        patient_name: '김철수',
        birth_date: '1985-06-12',
        body_part: '흉부',
        modality: 'CT',
        interpreting_physician: '이지은',
        request_datetime: '2025-06-24T14:30:00Z',
        priority: '응급',
        study_status: '검사완료',
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
            document_type: { code: 'report_eng', name: '판독 결과지 (영문)', requires_signature: false },
            status: 'pending'
          },
          {
            id: 4,
            document_type: { code: 'imaging_cd', name: '진료기록영상 (CD)', requires_signature: false },
            status: 'pending'
          },
          {
            id: 5,
            document_type: { code: 'export_certificate', name: '반출 확인서', requires_signature: true },
            status: 'pending'
          }
        ]
      },
      {
        id: 2,
        patient_id: 'P2025-001235',
        patient_name: '박영희',
        birth_date: '1978-03-25',
        body_part: '무릎',
        modality: 'CR',
        interpreting_physician: '김정호',
        request_datetime: '2025-06-24T15:00:00Z',
        priority: '일반',
        study_status: '검사완료',
        documents: [
          {
            id: 6,
            document_type: { code: 'report_kor', name: '판독 결과지 (국문)', requires_signature: false },
            status: 'pending'
          },
          {
            id: 7,
            document_type: { code: 'exam_certificate', name: '검사 확인서', requires_signature: false },
            status: 'pending'
          },
          {
            id: 8,
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

  // 필터 초기화
  const resetFilters = () => {
    setFilters({
      exam_date: '',
      patient_name: '',
      modality: '',
    });
  };

  // 서류 선택 상태 변경
  const handleDocumentSelect = (studyId, docRequestId, checked) => {
    setSelectedDocuments(prev => {
      const studySelections = prev[studyId] || [];
      
      if (checked) {
        // 추가
        return {
          ...prev,
          [studyId]: [...studySelections, docRequestId]
        };
      } else {
        // 제거
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
        processed_by: 'current_user', // 실제로는 로그인 사용자
        notes: ''
      });

      console.log('Process result:', result);
      
      // 성공 메시지
      if (result.processed_count > 0) {
        alert(`${result.processed_count}개 서류가 처리되었습니다.`);
      }
      
      if (result.failed_count > 0) {
        alert(`${result.failed_count}개 서류 처리에 실패했습니다.`);
      }

      // 선택 상태 초기화
      setSelectedDocuments(prev => ({
        ...prev,
        [studyId]: []
      }));

      // 데이터 새로고침
      await fetchStudyDocuments();
      
    } catch (error) {
      console.error('Failed to process documents:', error);
      alert('서류 처리에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 동의서 클릭 핸들러
  const handleConsentClick = (study, docRequest) => {
    console.log('📝 동의서 클릭:', { study, docRequest });
    
    if (onShowUpload) {
      onShowUpload(docRequest.document_type.code, study.patient_name, study.modality, study.body_part);
    }
  };

  // ✅ 수정: 필요서류 클릭 핸들러 - studyId 추가
  const handleDocumentClick = (study, docRequest) => {
    console.log('🔍 서류 클릭된 데이터:', { study, docRequest });
    
    if (docRequest.document_type.code === 'imaging_cd' || docRequest.document_type.code === 'imaging_dvd') {
      // 진료기록영상은 특별 프로세스
      console.log('💿 진료기록영상 프로세스 시작');
      if (onShowImagingProcess) {
        onShowImagingProcess(study.patient_name, study.modality, study.body_part);
      }
    } else {
      // 일반 서류는 미리보기
      console.log('📄 문서 미리보기 요청:', {
        docType: docRequest.document_type.code,
        patientName: study.patient_name,
        modality: study.modality,
        bodyPart: study.body_part,
        studyId: study.id  // ✅ 디버깅용 로그
      });
      
      if (onShowDocument) {
        // ✅ 수정: study.id 추가!
        onShowDocument(
          docRequest.document_type.code, 
          study.patient_name, 
          study.modality, 
          study.body_part,
          study.id  // ✅ 이게 핵심! studyId 전달
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
      <div className="section-header">
        📋 서류 요청 목록
      </div>
      
      {/* 필터 섹션 */}
      <div className="filter-section">
        <div className="filter-controls">
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
            <span>🔍</span>
            <input
              type="text"
              placeholder="환자명 검색"
              value={filters.patient_name}
              onChange={(e) => handleFilterChange('patient_name', e.target.value)}
              className="filter-input patient-filter"
            />
          </div>
          
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
          
          <button className="btn btn-primary" onClick={fetchStudyDocuments}>
            🔎 검색
          </button>
          <button className="btn btn-secondary" onClick={resetFilters}>
            🔄 초기화
          </button>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}
      
      {/* 테이블 */}
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
              <th>필요서류</th>
              <th>발급</th>
            </tr>
          </thead>
          <tbody>
            {studyDocuments.map((study, index) => {
              const selectedIds = selectedDocuments[study.id] || [];
              const consentDocs = study.documents?.filter(doc => doc.document_type.requires_signature) || [];
              const requiredDocs = study.documents?.filter(doc => !doc.document_type.requires_signature) || [];
              
              return (
                <tr 
                  key={study.id} 
                  className={study.priority === '응급' ? 'urgent' : ''}
                >
                  <td>{index + 1}</td>
                  <td>{study.patient_id}</td>
                  <td>
                    {study.patient_name}
                    <br />
                    <small>{study.birth_date}</small>
                  </td>
                  <td>{study.body_part}</td>
                  <td>{study.modality}</td>
                  <td>{study.interpreting_physician}</td>
                  <td>
                    {new Date(study.request_datetime).toLocaleDateString('ko-KR')}
                    <br />
                    {new Date(study.request_datetime).toLocaleTimeString('ko-KR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </td>
                  
                  {/* 동의서 열 */}
                  <td className="consent-section">
                    {requiresContrast(study.modality) ? (
                      consentDocs.map(doc => (
                        <div 
                          key={doc.id}
                          className={`consent-item ${doc.status === 'completed' ? 'completed' : ''}`}
                          onClick={() => handleConsentClick(study, doc)}
                        >
                          {doc.status === 'completed' ? '✅ 완료' : '조영제 동의서'}
                        </div>
                      ))
                    ) : (
                      <small style={{ color: '#a0aec0' }}>해당없음</small>
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
                  <td>
                    <div className="issue-section">
                      <button
                        className="issue-btn"
                        onClick={() => handleProcessDocuments(study.id)}
                        disabled={selectedIds.length === 0 || loading}
                      >
                        {loading ? '처리중...' : '선택 발급'}
                      </button>
                      <br />
                      <small style={{ color: '#718096' }}>
                        {selectedIds.length}개 선택
                      </small>
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