// // pacsapp/src/components/pacsdocs/DocumentRequestList.js

// import React, { useState, useEffect } from 'react';
// import { pacsdocsService, requiresContrast, getStatusLabel } from '../../services/pacsdocsService';
// import './DocumentRequestList.css';

// const DocumentRequestList = ({ onShowDocument, onShowUpload, onShowImagingProcess }) => {
//   // 상태 관리
//   const [studyDocuments, setStudyDocuments] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
  
//   // 필터 상태
//   const [filters, setFilters] = useState({
//     exam_date: new Date().toISOString().split('T')[0],
//     patient_id: '',
//     patient_name: '',
//     modality: '',
//     reporting_doctor: ''
//   });

//   // 서류 선택 상태
//   const [selectedDocuments, setSelectedDocuments] = useState({});

//   // 데이터 로딩
//   useEffect(() => {
//     fetchStudyDocuments();
//   }, [filters]);

//   const fetchStudyDocuments = async () => {
//     try {
//       setLoading(true);
//       setError(null);
      
//       console.log('🔎 데이터 로딩 시작, 필터:', filters);
      
//       const data = await pacsdocsService.getStudyDocuments(filters);
//       console.log('🔎 Fetched study documents:', data);
      
//       const documents = data.results || data || [];
//       console.log('🔎 최종 documents 배열:', documents);
      
//       setStudyDocuments(documents);
//     } catch (err) {
//       console.error('🔎 Failed to fetch study documents:', err);
//       setError('서류 목록을 불러오는데 실패했습니다.');
      
//       console.log('🔎 더미 데이터 사용');
//       setStudyDocuments(getDummyData());
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getDummyData = () => {
//     return [
//       {
//         id: 1,
//         patientId: 'P2025-001234',
//         patientName: '김철수',
//         birthDate: '1985-06-12',
//         examPart: '흉부',
//         modality: 'CT',
//         reportingDoctor: '이지은',
//         requestDateTime: '2025-06-24T14:30:00Z',
//         examDateTime: '2025. 6. 27. 오전 11:00',
//         priority: '응급',
//         examStatus: '검사완료',
//         documents: [
//           {
//             id: 1,
//             document_type: { code: 'consent_contrast', name: '조영제 사용 동의서', requires_signature: true },
//             status: 'pending'
//           },
//           {
//             id: 2,
//             document_type: { code: 'report_kor', name: '판독 결과지 (국문)', requires_signature: false },
//             status: 'pending'
//           },
//           {
//             id: 3,
//             document_type: { code: 'export_certificate', name: '반출 확인서', requires_signature: true },
//             status: 'pending'
//           },
//           {
//             id: 4,
//             document_type: { code: 'imaging_cd', name: '진료기록영상 (CD)', requires_signature: false },
//             status: 'pending'
//           }
//         ]
//       }
//     ];
//   };

//   // 필터 변경 핸들러
//   const handleFilterChange = (key, value) => {
//     setFilters(prev => ({
//       ...prev,
//       [key]: value
//     }));
//   };

//   const resetFilters = () => {
//     setFilters({
//       exam_date: '',
//       patient_id: '',
//       patient_name: '',
//       modality: '',
//       reporting_doctor: ''
//     });
//   };

//   // 서류 선택 상태 변경
//   const handleDocumentSelect = (studyId, docRequestId, checked) => {
//     setSelectedDocuments(prev => {
//       const studySelections = prev[studyId] || [];
      
//       if (checked) {
//         return {
//           ...prev,
//           [studyId]: [...studySelections, docRequestId]
//         };
//       } else {
//         return {
//           ...prev,
//           [studyId]: studySelections.filter(id => id !== docRequestId)
//         };
//       }
//     });
//   };

//   // 선택된 서류들 처리
//   const handleProcessDocuments = async (studyId) => {
//     const selectedIds = selectedDocuments[studyId] || [];
    
//     console.log('🔥 처리 시작:', { studyId, selectedIds });
    
//     if (selectedIds.length === 0) {
//       alert('처리할 서류를 선택해주세요.');
//       return;
//     }

//     try {
//       setLoading(true);
      
//       const requestData = {
//         document_ids: selectedIds,
//         action: 'complete',
//         processed_by: 'current_user',
//         notes: ''
//       };
      
//       console.log('🔥 API 요청 데이터:', requestData);
      
//       const result = await pacsdocsService.processDocuments(studyId, requestData);
      
//       console.log('🔥 API 응답 결과:', result);
      
//       // 실패한 문서들의 상세 정보 출력
//       if (result && result.failed_documents && result.failed_documents.length > 0) {
//         console.log('🔥 실패한 문서들 상세:', result.failed_documents);
//         result.failed_documents.forEach((failedDoc, index) => {
//           console.log(`🔥 실패 문서 ${index + 1}:`, failedDoc);
//         });
//       }

//       if (result && result.processed_count > 0) {
//         alert(`${result.processed_count}개 서류가 처리되었습니다.`);
//       }
      
//       if (result && result.failed_count > 0) {
//         // 실패 원인을 더 자세히 표시
//         let failureDetails = '';
//         if (result.failed_documents && result.failed_documents.length > 0) {
//           failureDetails = '\n\n실패 원인:\n' + 
//             result.failed_documents.map((doc, idx) => 
//               `${idx + 1}. ${doc.document_name || doc.id}: ${doc.error || doc.reason || '알 수 없는 오류'}`
//             ).join('\n');
//         }
        
//         alert(`${result.failed_count}개 서류 처리에 실패했습니다.${failureDetails}`);
//       }

//       // 성공 시에만 선택 상태 초기화
//       if (result && (result.processed_count > 0 || result.failed_count === 0)) {
//         setSelectedDocuments(prev => ({
//           ...prev,
//           [studyId]: []
//         }));
//       }

//       await fetchStudyDocuments();
      
//     } catch (error) {
//       console.error('🔥 처리 실패 상세:', error);
//       console.error('🔥 에러 스택:', error.stack);
//       console.error('🔥 에러 메시지:', error.message);
      
//       let errorMessage = '서류 처리에 실패했습니다.';
      
//       if (error.response) {
//         console.error('🔥 HTTP 응답 에러:', error.response.status, error.response.data);
//         errorMessage = `서버 오류 (${error.response.status}): ${error.response.data?.message || '알 수 없는 오류'}`;
//       } else if (error.request) {
//         console.error('🔥 네트워크 에러:', error.request);
//         errorMessage = '네트워크 연결 오류입니다.';
//       }
      
//       alert(errorMessage);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // 🔥 새로운 핸들러들: 각 버튼별 명확한 역할
  
//   // 동의서 보기 (빈 동의서 인쇄/PDF용)
//   const handleConsentView = (study, docRequest) => {
//     if (onShowDocument) {
//       onShowDocument(
//         docRequest.document_type.code, 
//         study.patientName,
//         study.modality, 
//         study.examPart,
//         study.id,
//         docRequest.id  // 🔥 추가: documentId 전달
//       );
//     }
//   };

//   // 동의서 업로드 (서명받은 동의서 업로드용)
//   const handleConsentUpload = (study, docRequest) => {
//     if (onShowUpload) {
//       onShowUpload(
//         docRequest.document_type.code, 
//         study.patientName, 
//         study.modality, 
//         study.examPart,
//         docRequest.id  // 🔥 추가: documentId 전달
//       );
//     }
//   };

//   // 일반 서류 보기 (빈 서류 인쇄/PDF용)
//   const handleDocumentView = (study, docRequest) => {
//     if (docRequest.document_type.code === 'imaging_cd' || docRequest.document_type.code === 'imaging_dvd') {
//       if (onShowImagingProcess) {
//         onShowImagingProcess(study.patientName, study.modality, study.examPart);
//       }
//     } else {
//       if (onShowDocument) {
//         onShowDocument(
//           docRequest.document_type.code, 
//           study.patientName,
//           study.modality, 
//           study.examPart,
//           study.id,
//           docRequest.id  // 🔥 추가: documentId 전달
//         );
//       }
//     }
//   };

//   // 일반 서류 업로드 (서명받은 서류 업로드용)
//   const handleDocumentUpload = (study, docRequest) => {
//     if (onShowUpload) {
//       onShowUpload(
//         docRequest.document_type.code, 
//         study.patientName, 
//         study.modality, 
//         study.examPart,
//         docRequest.id  // 🔥 추가: documentId 전달
//       );
//     }
//   };

//   // 로딩 상태
//   if (loading && studyDocuments.length === 0) {
//     return (
//       <div className="document-request-list">
//         <div className="section-header">📋 서류 요청 목록</div>
//         <div className="loading-message">데이터를 불러오는 중...</div>
//       </div>
//     );
//   }

//   return (
//     <div className="document-request-list">
//       <div className="section-header">📋 서류 요청 목록</div>
      
//       {/* 필터 섹션 */}
//       <div className="filter-section">
//         <div className="filter-row">
//           <div className="filter-item">
//             <span>📅</span>
//             <input
//               type="date"
//               value={filters.exam_date}
//               onChange={(e) => handleFilterChange('exam_date', e.target.value)}
//               className="filter-input"
//             />
//           </div>
          
//           <div className="filter-item">
//             <span>🆔</span>
//             <input
//               type="text"
//               placeholder="환자ID"
//               value={filters.patient_id}
//               onChange={(e) => handleFilterChange('patient_id', e.target.value)}
//               className="filter-input"
//             />
//           </div>
          
//           <div className="filter-item">
//             <span>👤</span>
//             <input
//               type="text"
//               placeholder="환자명"
//               value={filters.patient_name}
//               onChange={(e) => handleFilterChange('patient_name', e.target.value)}
//               className="filter-input patient-filter"
//             />
//           </div>
//         </div>

//         <div className="filter-row">
//           <div className="filter-item">
//             <span>📋</span>
//             <select
//               value={filters.modality}
//               onChange={(e) => handleFilterChange('modality', e.target.value)}
//               className="filter-input"
//             >
//               <option value="">모든 검사</option>
//               <option value="CT">CT</option>
//               <option value="MR">MR</option>
//               <option value="CR">CR</option>
//               <option value="DX">DX</option>
//               <option value="US">US</option>
//               <option value="XA">XA</option>
//               <option value="MG">MG</option>
//               <option value="NM">NM</option>
//               <option value="PT">PT</option>
//             </select>
//           </div>
          
//           <div className="filter-item">
//             <span>👨‍⚕️</span>
//             <input
//               type="text"
//               placeholder="판독의"
//               value={filters.reporting_doctor}
//               onChange={(e) => handleFilterChange('reporting_doctor', e.target.value)}
//               className="filter-input"
//             />
//           </div>
          
//           <div className="filter-buttons">
//             <button className="btn btn-primary" onClick={fetchStudyDocuments}>
//               🔎 검색
//             </button>
//             <button className="btn btn-secondary" onClick={resetFilters}>
//               🔄 초기화
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* 에러 메시지 */}
//       {error && (
//         <div className="error-message">⚠️ {error}</div>
//       )}
      
//       {/* 테이블 */}
//       <div className="table-container">
//         <table className="worklist-table">
//           <thead>
//             <tr>
//               <th>No</th>
//               <th>환자ID</th>
//               <th>환자명</th>
//               <th>검사부위</th>
//               <th>모달리티</th>
//               <th>판독의</th>
//               <th>검사일시</th>
//               <th>필요서류 등</th> 
//               <th>발급 현황</th>
//             </tr>
//           </thead>
//           <tbody>
//             {studyDocuments.map((study, index) => {
//               const selectedIds = selectedDocuments[study.id] || [];
              
//               // 🔥 수정: 모든 서류를 하나로 통합 (동의서 + 일반서류)
//               const allDocuments = study.documents || [];
              
//               return (
//                 <tr 
//                   key={study.id} 
//                   className={study.priority === '응급' ? 'urgent-row' : ''}
//                 >
//                   <td className="number-cell">{index + 1}</td>
//                   <td>{study.patientId}</td>
//                   <td className="patient-cell">
//                     {study.patientName}
//                     <div className="patient-id">{study.birthDate}</div>
//                   </td>
//                   <td>{study.examPart}</td>
//                   <td className={`modality-cell modality-${study.modality?.toLowerCase()}`}>
//                     {study.modality}
//                   </td>
//                   <td>{study.reportingDoctor}</td>
//                   <td>
//                     {study.examDateTime ? (() => {
//                       if (typeof study.examDateTime === 'string' && study.examDateTime.includes('.')) {
//                         return study.examDateTime;
//                       } else {
//                         const date = new Date(study.examDateTime);
//                         return (
//                           <>
//                             {date.toLocaleDateString('ko-KR')}
//                             <br />
//                             {date.toLocaleTimeString('ko-KR', { 
//                               hour: '2-digit', 
//                               minute: '2-digit' 
//                             })}
//                           </>
//                         );
//                       }
//                     })() : 'N/A'}
//                   </td>
                  
//                   {/* 🔥 수정: 통합된 필요서류 열 */}
//                   <td>
//                     <div className="all-documents">
//                       {allDocuments.map(doc => {
//                         // 문서 타입별 색상 구분
//                         const isConsent = doc.document_type.code === 'consent_contrast';
//                         const isImaging = doc.document_type.code.includes('imaging');
                        
//                         return (
//                           <div key={doc.id} className={`unified-document ${isConsent ? 'consent-doc' : 'regular-doc'}`}>
//                             <input
//                               type="checkbox"
//                               className={`doc-checkbox ${isConsent ? 'consent-checkbox' : 'regular-checkbox'}`}
//                               checked={selectedIds.includes(doc.id)}
//                               onChange={(e) => handleDocumentSelect(study.id, doc.id, e.target.checked)}
//                               disabled={doc.status === 'completed'}
//                             />
                            
//                             <div className="doc-content">
//                               <span className={`doc-name ${isConsent ? 'consent-name' : 'regular-name'}`}>
//                                 {doc.document_type.name}
//                               </span>
                              
//                               <div className="doc-actions-simple">
//                                 {/* 보기 버튼 (눈 아이콘) */}
//                                 <button 
//                                   className="simple-btn view-btn"
//                                   onClick={() => isImaging ? 
//                                     handleDocumentView(study, doc) : 
//                                     (isConsent ? handleConsentView(study, doc) : handleDocumentView(study, doc))
//                                   }
//                                   title={isImaging ? 'CD 굽기 프로세스' : '빈 서류 보기/인쇄'}
//                                 >
//                                   👁️
//                                 </button>
                                
//                                 {/* 업로드 버튼 (판독결과지 제외) */}
//                                 {doc.document_type.requires_signature && (
//                                   <button 
//                                     className="simple-btn upload-btn"
//                                     onClick={() => isConsent ? 
//                                       handleConsentUpload(study, doc) : 
//                                       handleDocumentUpload(study, doc)
//                                     }
//                                     title="서명된 서류 업로드"
//                                   >
//                                     📤
//                                   </button>
//                                 )}
//                               </div>
//                             </div>
                            
//                             {/* CD 안내 문구를 별도 줄로 */}
//                             {isImaging && (
//                               <div className="imaging-info-line">
//                                 위임장/동의서 필요
//                               </div>
//                             )}
//                           </div>
//                         );
//                       })}
//                     </div>
//                   </td>
                  
//                   {/* 발급 열 */}
//                   <td className="issue-section">
//                     <button
//                       className="issue-btn"
//                       onClick={() => handleProcessDocuments(study.id)}
//                       disabled={selectedIds.length === 0 || loading}
//                     >
//                       {loading ? '처리중...' : '선택 발급'}
//                     </button>
//                     <div className="issue-count">
//                       {selectedIds.length}개 선택
//                     </div>
//                   </td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>
//       </div>

//       {/* 데이터가 없을 때 */}
//       {!loading && studyDocuments.length === 0 && (
//         <div className="empty-message">
//           📋 검색 조건에 맞는 서류 요청이 없습니다.
//         </div>
//       )}
//     </div>
//   );
// };

// export default DocumentRequestList;

// pacsapp/src/components/pacsdocs/DocumentRequestList.js

// pacsapp/src/components/pacsdocs/DocumentRequestList.js

import React, { useState, useEffect } from 'react';
import { pacsdocsService, requiresContrast, getStatusLabel } from '../../services/pacsdocsService';
import './DocumentRequestList.css';

const DocumentRequestList = ({ onShowDocument, onShowUpload, onShowImagingProcess, onDocumentStatusUpdate }) => {
  // 상태 관리
  const [studyDocuments, setStudyDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 필터 상태
  const [filters, setFilters] = useState({
    exam_date: new Date().toISOString().split('T')[0],
    patient_id: '',
    patient_name: '',
    modality: '',
    reporting_doctor: ''
  });

  // 데이터 로딩
  useEffect(() => {
    fetchStudyDocuments();
  }, [filters]);

  // 🔥 새로 추가: 부모 컴포넌트에 새로고침 함수 등록 (안전하게 처리)
  useEffect(() => {
    if (onDocumentStatusUpdate && typeof onDocumentStatusUpdate === 'function') {
      onDocumentStatusUpdate(fetchStudyDocuments);
    }
  }, [onDocumentStatusUpdate]);

  const fetchStudyDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔎 데이터 로딩 시작, 필터:', filters);
      
      const data = await pacsdocsService.getStudyDocuments(filters);
      console.log('🔎 Fetched study documents:', data);
      
      const documents = data.results || data || [];
      console.log('🔎 최종 documents 배열:', documents);
      
      setStudyDocuments(documents);
    } catch (err) {
      console.error('🔎 Failed to fetch study documents:', err);
      setError('서류 목록을 불러오는데 실패했습니다.');
      
      console.log('🔎 더미 데이터 사용');
      setStudyDocuments(getDummyData());
    } finally {
      setLoading(false);
    }
  };

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
        examDateTime: '2025. 6. 27. 오전 11:00',
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
            document_type: { code: 'export_certificate', name: '반출 확인서', requires_signature: true },
            status: 'pending'
          },
          {
            id: 4,
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

  const resetFilters = () => {
    setFilters({
      exam_date: '',
      patient_id: '',
      patient_name: '',
      modality: '',
      reporting_doctor: ''
    });
  };

  // 🔥 새로운 핸들러들: 각 버튼별 명확한 역할
  
  // 동의서 보기 (빈 동의서 인쇄/PDF용)
  const handleConsentView = (study, docRequest) => {
    if (onShowDocument) {
      onShowDocument(
        docRequest.document_type.code, 
        study.patientName,
        study.modality, 
        study.examPart,
        study.id,
        docRequest.id  // 🔥 추가: documentId 전달
      );
    }
  };

  // 동의서 업로드 (서명받은 동의서 업로드용)
  const handleConsentUpload = (study, docRequest) => {
    if (onShowUpload) {
      onShowUpload(
        docRequest.document_type.code, 
        study.patientName, 
        study.modality, 
        study.examPart,
        docRequest.id  // 🔥 추가: documentId 전달
      );
    }
  };

  // 일반 서류 보기 (빈 서류 인쇄/PDF용)
  const handleDocumentView = (study, docRequest) => {
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
          study.id,
          docRequest.id  // 🔥 추가: documentId 전달
        );
      }
    }
  };

  // 일반 서류 업로드 (서명받은 서류 업로드용)
  const handleDocumentUpload = (study, docRequest) => {
    if (onShowUpload) {
      onShowUpload(
        docRequest.document_type.code, 
        study.patientName, 
        study.modality, 
        study.examPart,
        docRequest.id  // 🔥 추가: documentId 전달
      );
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
      
      {/* 필터 섹션 */}
      <div className="filter-section">
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
              <th>필요서류 등</th> 
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            {studyDocuments.map((study, index) => {
              const allDocuments = study.documents || [];
              
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
                  
                  {/* 통합된 필요서류 열 */}
                  <td>
                    <div className="all-documents">
                      {allDocuments.map(doc => {
                        // 문서 타입별 색상 구분
                        const isConsent = doc.document_type.code === 'consent_contrast';
                        const isImaging = doc.document_type.code.includes('imaging');
                        
                        return (
                          <div key={doc.id} className={`unified-document ${isConsent ? 'consent-doc' : 'regular-doc'}`}>
                            <div className="doc-content">
                              <span className={`doc-name ${isConsent ? 'consent-name' : 'regular-name'}`}>
                                {doc.document_type.name}
                              </span>
                              
                              <div className="doc-actions-simple">
                                {/* 보기 버튼 (눈 아이콘) */}
                                <button 
                                  className="simple-btn view-btn"
                                  onClick={() => isImaging ? 
                                    handleDocumentView(study, doc) : 
                                    (isConsent ? handleConsentView(study, doc) : handleDocumentView(study, doc))
                                  }
                                  title={isImaging ? 'CD 굽기 프로세스' : '빈 서류 보기/인쇄'}
                                >
                                  👁️
                                </button>
                                
                                {/* 업로드 버튼 (판독결과지 제외) */}
                                {doc.document_type.requires_signature && (
                                  <button 
                                    className="simple-btn upload-btn"
                                    onClick={() => isConsent ? 
                                      handleConsentUpload(study, doc) : 
                                      handleDocumentUpload(study, doc)
                                    }
                                    title="서명된 서류 업로드"
                                  >
                                    📤
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            {/* CD 안내 문구를 별도 줄로 */}
                            {isImaging && (
                              <div className="imaging-info-line">
                                위임장/동의서 필요
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  
                  {/* 비고 열 */}
                  <td className="remarks-section">
                    <div className="status-boxes">
                      {allDocuments.map(doc => {
                        const statusText = doc.status === 'pending' ? '대기중' : 
                                         doc.status === 'completed' ? '완료' : 
                                         doc.status === 'processing' ? '처리중' : 
                                         doc.status === 'ready' ? '준비완료' : '미완료';
                        
                        const statusClass = doc.status === 'pending' ? 'status-pending' : 
                                          doc.status === 'completed' ? 'status-completed' : 
                                          doc.status === 'processing' ? 'status-processing' : 
                                          doc.status === 'ready' ? 'status-ready' : 'status-failed';
                        
                        return (
                          <div key={doc.id} className={`status-box ${statusClass}`}>
                            {statusText}
                          </div>
                        );
                      })}
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