
// // pacsapp/src/components/pacsdocs/DocumentPreview.js

// import React, { useState, useRef, useEffect } from 'react';
// import { pacsdocsService } from '../../services/pacsdocsService';
// import { generatePDF } from '../../utils/pacsdocs/pdfGenerator';
// import { printDocument } from '../../utils/pacsdocs/printGenerator';
// import { DOC_NAMES, DOC_DISPLAY_NAMES } from '../../utils/pacsdocs/documentTypes';
// import './DocumentPreview.css';

// const DocumentPreview = ({ 
//   currentDocument, 
//   currentPatient, 
//   onClosePreview,
//   viewMode = 'empty',
//   studyId = null
// }) => {
//   // API 데이터 상태
//   const [documentData, setDocumentData] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   // 파일 업로드 상태
//   const [uploadedFile, setUploadedFile] = useState(null);
//   const [uploadLoading, setUploadLoading] = useState(false);
//   const fileInputRef = useRef(null);
  
//   // 진료기록영상 프로세스 상태 (다단계)
//   const [imagingStep, setImagingStep] = useState(1);
//   const [imagingFiles, setImagingFiles] = useState([]);
//   const [cdBurning, setCdBurning] = useState(false);
//   const [cdProgress, setCdProgress] = useState(0);
//   const imagingFileInputRef = useRef(null);

//   // 서류 데이터 로딩
//   useEffect(() => {
//     if (viewMode === 'document' && currentDocument && studyId) {
//       loadDocumentData();
//     }
//   }, [viewMode, currentDocument, studyId]);

//   // API 호출하여 서류 데이터 가져오기
//   const loadDocumentData = async () => {
//     try {
//       setLoading(true);
//       setError(null);
      
//       const data = await pacsdocsService.previewDocument(studyId, currentDocument);
//       console.log('받은 문서 데이터:', data);
      
//       setDocumentData(data);
//     } catch (err) {
//       console.error('문서 데이터 로딩 실패:', err);
//       setError('문서를 불러오는데 실패했습니다.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // 템플릿 변수 치환 함수
//   const renderTemplate = (templateContent, data) => {
//     if (!templateContent || !data) return '';

//     let rendered = templateContent;
    
//     // 워크리스트 필드명으로 변수 치환
//     rendered = rendered.replace(/\{\{patient_name\}\}/g, data.patientName || '');
//     rendered = rendered.replace(/\{\{patientName\}\}/g, data.patientName || '');
//     rendered = rendered.replace(/\{\{patient_id\}\}/g, data.patientId || '');
//     rendered = rendered.replace(/\{\{patientId\}\}/g, data.patientId || '');
//     rendered = rendered.replace(/\{\{birthdate\}\}/g, data.birthDate || '');
//     rendered = rendered.replace(/\{\{birth_date\}\}/g, data.birthDate || '');
//     rendered = rendered.replace(/\{\{birthDate\}\}/g, data.birthDate || '');
//     rendered = rendered.replace(/\{\{study_name\}\}/g, data.study_name || '');
//     rendered = rendered.replace(/\{\{exam_body_part\}\}/g, data.examPart || '');
//     rendered = rendered.replace(/\{\{body_part\}\}/g, data.examPart || '');
//     rendered = rendered.replace(/\{\{examPart\}\}/g, data.examPart || '');
//     rendered = rendered.replace(/\{\{exam_date\}\}/g, data.exam_date || '');
//     rendered = rendered.replace(/\{\{exam_location\}\}/g, '영상의학과');
//     rendered = rendered.replace(/\{\{technologist_name\}\}/g, '김기사');
//     rendered = rendered.replace(/\{\{issue_date\}\}/g, data.report_date || '');
//     rendered = rendered.replace(/\{\{issuer_name\}\}/g, '시스템관리자');
//     rendered = rendered.replace(/\{\{radiologist_name\}\}/g, data.reportingDoctor || 'TBD');
//     rendered = rendered.replace(/\{\{reportingDoctor\}\}/g, data.reportingDoctor || 'TBD');
//     rendered = rendered.replace(/\{\{report_date\}\}/g, data.report_date || '');
//     rendered = rendered.replace(/\{\{modality\}\}/g, data.modality || '');
    
//     return rendered;
//   };

//   // 파일 업로드 핸들러
//   const handleFileUpload = (event) => {
//     const file = event.target.files[0];
//     if (file) {
//       const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
//       if (!allowedTypes.includes(file.type)) {
//         alert('지원하지 않는 파일 형식입니다. PDF, JPG, PNG 파일만 업로드 가능합니다.');
//         return;
//       }
      
//       if (file.size > 10 * 1024 * 1024) {
//         alert('파일 크기가 너무 큽니다. 10MB 이하의 파일을 선택해주세요.');
//         return;
//       }
      
//       setUploadedFile(file);
//     }
//   };

//   // 업로드 완료 처리
//   const handleCompleteUpload = async () => {
//     if (!uploadedFile) {
//       alert('업로드할 파일을 선택해주세요.');
//       return;
//     }

//     try {
//       setUploadLoading(true);
      
//       await pacsdocsService.uploadFile(uploadedFile, {
//         document_type: currentDocument,
//         patient_name: currentPatient?.name,
//         modality: currentPatient?.modality
//       });
      
//       alert('✅ 스캔 업로드가 완료되었습니다!\n동의서 처리가 완료되었습니다.');
      
//       setUploadedFile(null);
//       if (fileInputRef.current) {
//         fileInputRef.current.value = '';
//       }
      
//       onClosePreview();
      
//     } catch (error) {
//       console.error('Upload failed:', error);
//       alert('업로드에 실패했습니다. 다시 시도해주세요.');
//     } finally {
//       setUploadLoading(false);
//     }
//   };

//   // 진료기록영상 파일 업로드
//   const handleImagingUpload = (event) => {
//     const files = Array.from(event.target.files);
//     if (files.length > 0) {
//       setImagingFiles(files);
//       if (files.length >= 1) {
//         alert(`${files.length}개 파일이 업로드되었습니다.`);
//       }
//     }
//   };

//   // 진료기록영상 프로세스 단계별 처리
//   const handleImagingStep = (step) => {
//     switch (step) {
//       case 1:
//         if (imagingFiles.length < 1) {
//           alert('위임장 또는 동의서를 업로드해주세요.');
//           return;
//         }
//         setImagingStep(2);
//         break;
//       case 2:
//         handleCDBurn(); // CD 굽기 시작
//         break;
//       case 3:
//         // 반출 확인서 표시 로직 (기존 이벤트 방식 유지)
//         if (currentPatient) {
//           const event = new CustomEvent('showExportCertificate', {
//             detail: {
//               patient: currentPatient,
//               docType: 'export_certificate'
//             }
//           });
//           window.dispatchEvent(event);
//         }
//         break;
//       default:
//         break;
//     }
//   };

//   // CD 굽기 시뮬레이션
//   const handleCDBurn = async () => {
//     try {
//       setCdBurning(true);
//       setCdProgress(0);

//       // 진행률 시뮬레이션
//       const progressInterval = setInterval(() => {
//         setCdProgress(prev => {
//           if (prev >= 90) {
//             clearInterval(progressInterval);
//             return 90;
//           }
//           return prev + Math.random() * 15;
//         });
//       }, 200);

//       // 3초 후 완료
//       setTimeout(() => {
//         clearInterval(progressInterval);
//         setCdProgress(100);
        
//         setTimeout(() => {
//           setCdBurning(false);
//           setCdProgress(0);
//           setImagingStep(3); // 3단계로 이동
//           alert('💿 CD 굽기가 완료되었습니다!\n\n반출 확인서를 작성해주세요.');
//         }, 500);
//       }, 3000);

//       console.log('💿 CD 굽기 시뮬레이션 완료');
      
//     } catch (error) {
//       console.error('CD 굽기 시뮬레이션 오류:', error);
//       setCdBurning(false);
//       setCdProgress(0);
//       alert('CD 굽기 중 오류가 발생했습니다.');
//     }
//   };

//   // 실제 인쇄 기능
//   const handlePrint = () => {
//     if (!documentData) {
//       alert('문서 데이터를 불러오는 중입니다. 잠시 후 시도해주세요.');
//       return;
//     }

//     const docDisplayName = DOC_DISPLAY_NAMES[currentDocument] || '문서';
//     printDocument(documentData, docDisplayName);
//   };

//   // 실제 PDF 저장 기능
//   const handleSave = async () => {
//     if (!documentData) {
//       alert('문서 데이터를 불러오는 중입니다. 잠시 후 시도해주세요.');
//       return;
//     }

//     const docFileName = DOC_NAMES[currentDocument] || '문서';
//     await generatePDF(documentData, docFileName, currentDocument);
//   };

//   const handleMarkCompleted = () => {
//     alert('✅ 문서 발급이 완료되었습니다!');
//     onClosePreview();
//   };

//   // 뷰 모드에 따른 렌더링
//   const renderContent = () => {
//     switch (viewMode) {
//       case 'upload':
//         return (
//           <div className="upload-container">
//             <h3>📝 서명된 동의서 스캔 업로드</h3>
//             <p className="upload-description">
//               환자가 서명한 동의서를 스캔하여 업로드해주세요.
//             </p>
            
//             <div className="upload-section" onClick={() => fileInputRef.current?.click()}>
//               <div className="upload-icon">📁</div>
//               <p>파일을 드래그하거나 클릭하여 업로드</p>
//               <p className="upload-hint">지원 형식: PDF, JPG, PNG (최대 10MB)</p>
//             </div>
            
//             <input
//               ref={fileInputRef}
//               type="file"
//               accept=".pdf,.jpg,.jpeg,.png"
//               style={{ display: 'none' }}
//               onChange={handleFileUpload}
//             />
            
//             {uploadedFile && (
//               <div className="upload-preview">
//                 <p className="upload-preview-label">업로드된 파일:</p>
//                 <p className="upload-preview-info">
//                   {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)}MB)
//                 </p>
//               </div>
//             )}
            
//             <div className="action-buttons">
//               <button 
//                 className={`btn btn-success ${!uploadedFile || uploadLoading ? 'disabled' : ''}`}
//                 onClick={handleCompleteUpload}
//                 disabled={!uploadedFile || uploadLoading}
//               >
//                 {uploadLoading ? '업로드 중...' : '✅ 업로드 완료'}
//               </button>
//               <button className="btn btn-secondary" onClick={onClosePreview}>
//                 취소
//               </button>
//             </div>
//           </div>
//         );

//       case 'imaging':
//         return (
//           <div className="imaging-container">
//             <h3>💿 진료기록영상 발급 프로세스</h3>
            
//             <div className="patient-info-box">
//               <p><strong>환자명:</strong> {currentPatient?.name}</p>
//               <p><strong>검사:</strong> {currentPatient?.modality} {currentPatient?.examPart}</p>
//             </div>

//             {/* 1단계: 필수 서류 제출 */}
//             <div className={`process-step ${imagingStep === 1 ? 'step-active' : imagingStep > 1 ? 'step-completed' : 'step-waiting'}`}>
//               <h4>1단계: 필수 서류 제출</h4>
//               <p>다음 서류를 스캔하여 업로드해주세요:</p>
//               <ul>
//                 <li>진료기록 열람 및 사본발급 위임장</li>
//                 <li>진료기록 열람 및 사본발급 동의서</li>
//               </ul>
              
//               <div className="upload-section" onClick={() => imagingFileInputRef.current?.click()}>
//                 <div className="upload-icon">📁</div>
//                 <p>서류를 업로드해주세요</p>
//               </div>
              
//               <input
//                 ref={imagingFileInputRef}
//                 type="file"
//                 accept=".pdf,.jpg,.jpeg,.png"
//                 multiple
//                 style={{ display: 'none' }}
//                 onChange={handleImagingUpload}
//               />
              
//               {imagingFiles.length > 0 && (
//                 <div className="upload-preview">
//                   <p className="upload-preview-label">업로드된 파일: {imagingFiles.length}개</p>
//                   {imagingFiles.map((file, index) => (
//                     <p key={index} className="upload-preview-info">
//                       {file.name}
//                     </p>
//                   ))}
//                 </div>
//               )}
              
//               <button 
//                 className={`btn btn-primary ${imagingFiles.length < 1 ? 'disabled' : ''}`}
//                 onClick={() => handleImagingStep(1)}
//                 disabled={imagingFiles.length < 1}
//               >
//                 1단계 완료
//               </button>
//             </div>
            
//             {/* 2단계: CD/DVD 발급 */}
//             <div className={`process-step ${imagingStep === 2 ? 'step-active' : imagingStep > 2 ? 'step-completed' : 'step-waiting'}`}>
//               <h4>2단계: CD/DVD 발급</h4>
//               <p>서류 확인 후 진료기록영상을 발급합니다.</p>
              
//               {imagingStep === 2 && cdBurning ? (
//                 <div className="cd-burning-status">
//                   <div className="cd-icon-large">💿</div>
//                   <h4>CD를 굽고 있습니다...</h4>
//                   <div className="progress-bar">
//                     <div 
//                       className="progress-fill" 
//                       style={{ width: `${cdProgress}%` }}
//                     ></div>
//                   </div>
//                   <p className="progress-text">{Math.round(cdProgress)}% 완료</p>
//                   <p className="progress-hint">잠시만 기다려주세요. 약 3분 소요됩니다.</p>
//                 </div>
//               ) : (
//                 <button 
//                   className={`btn btn-success ${imagingStep < 2 ? 'disabled' : ''}`}
//                   onClick={() => handleImagingStep(2)}
//                   disabled={imagingStep < 2}
//                 >
//                   💿 CD 발급
//                 </button>
//               )}
//             </div>
            
//             {/* 3단계: 반출 확인서 */}
//             <div className={`process-step ${imagingStep === 3 ? 'step-active' : 'step-waiting'}`}>
//               <h4>3단계: 반출 확인서</h4>
//               <p>CD 수령시 반출 확인서에 서명이 필요합니다.</p>
//             </div>
            
//             <div className="action-buttons">
//               <button 
//                 className={`btn btn-secondary ${cdBurning ? 'disabled' : ''}`}
//                 onClick={onClosePreview}
//                 disabled={cdBurning}
//               >
//                 {cdBurning ? '굽기 중...' : '닫기'}
//               </button>
//             </div>
//           </div>
//         );

//       case 'document':
//         if (loading) {
//           return (
//             <div className="loading-container">
//               <div className="loading-icon">⏳</div>
//               <h3>문서를 불러오는 중...</h3>
//             </div>
//           );
//         }

//         if (error) {
//           return (
//             <div className="error-container">
//               <div className="error-icon">❌</div>
//               <h3>오류 발생</h3>
//               <p>{error}</p>
//               <button className="btn btn-primary" onClick={loadDocumentData}>
//                 다시 시도
//               </button>
//             </div>
//           );
//         }

//         if (!documentData) {
//           return (
//             <div className="empty-document">
//               <div className="empty-icon">📄</div>
//               <h3>문서를 선택해주세요</h3>
//             </div>
//           );
//         }

//         return (
//           <div className="document-container">
//             <div 
//               className="preview-content" 
//               dangerouslySetInnerHTML={{ 
//                 __html: renderTemplate(documentData.template_content, documentData) 
//               }}
//             />
            
//             <div className="action-buttons">
//               <button className="btn btn-primary" onClick={handlePrint}>
//                 🖨️ 인쇄
//               </button>
//               <button className="btn btn-primary" onClick={handleSave}>
//                 💾 PDF 저장
//               </button>
//               <button className="btn btn-success" onClick={handleMarkCompleted}>
//                 ✅ 발급 완료
//               </button>
//               <button className="btn btn-secondary" onClick={onClosePreview}>
//                 닫기
//               </button>
//             </div>
//           </div>
//         );

//       default: // 'empty'
//         return (
//           <div className="empty-preview">
//             <div className="empty-icon">📄</div>
//             <h3>서류를 선택해주세요</h3>
//             <p>좌측에서 서류를 클릭하면<br />여기에 내용이 표시됩니다.</p>
//             <p className="current-document">
//               현재 선택된 문서: {currentDocument || 'none'}
//             </p>
//           </div>
//         );
//     }
//   };

//   return (
//     <div className="document-preview">
//       <div className="section-header">📄 생성서류 미리보기</div>
//       <div className="content-wrapper">
//         {renderContent()}
//       </div>
//     </div>
//   );
// };

// export default DocumentPreview;

// pacsapp/src/components/pacsdocs/DocumentPreview.js
// pacsapp/src/components/pacsdocs/DocumentPreview.js

import React, { useState, useRef, useEffect } from 'react';
import { pacsdocsService } from '../../services/pacsdocsService';
import { generatePDF } from '../../utils/pacsdocs/pdfGenerator';
import { printDocument } from '../../utils/pacsdocs/printGenerator';
import { DOC_NAMES, DOC_DISPLAY_NAMES } from '../../utils/pacsdocs/documentTypes';
import './DocumentPreview.css';

const DocumentPreview = ({ 
  currentDocument, 
  currentPatient, 
  onClosePreview,
  onStatusChange, // 🔥 추가: 상태 변경 콜백
  viewMode = 'empty',
  studyId = null,
  documentId = null // 🔥 추가: documentId prop
}) => {
  // API 데이터 상태
  const [documentData, setDocumentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 파일 업로드 상태
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef(null);
  
  // 진료기록영상 프로세스 상태 (다단계)
  const [imagingStep, setImagingStep] = useState(1);
  const [imagingFiles, setImagingFiles] = useState([]);
  const [cdBurning, setCdBurning] = useState(false);
  const [cdProgress, setCdProgress] = useState(0);
  const imagingFileInputRef = useRef(null);

  // 서류 데이터 로딩
  useEffect(() => {
    if (viewMode === 'document' && currentDocument && studyId) {
      loadDocumentData();
    }
  }, [viewMode, currentDocument, studyId]);

  // API 호출하여 서류 데이터 가져오기
  const loadDocumentData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await pacsdocsService.previewDocument(studyId, currentDocument);
      console.log('받은 문서 데이터:', data);
      
      setDocumentData(data);
    } catch (err) {
      console.error('문서 데이터 로딩 실패:', err);
      setError('문서를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 템플릿 변수 치환 함수
  const renderTemplate = (templateContent, data) => {
    if (!templateContent || !data) return '';

    let rendered = templateContent;
    
    // 워크리스트 필드명으로 변수 치환
    rendered = rendered.replace(/\{\{patient_name\}\}/g, data.patientName || '');
    rendered = rendered.replace(/\{\{patientName\}\}/g, data.patientName || '');
    rendered = rendered.replace(/\{\{patient_id\}\}/g, data.patientId || '');
    rendered = rendered.replace(/\{\{patientId\}\}/g, data.patientId || '');
    rendered = rendered.replace(/\{\{birthdate\}\}/g, data.birthDate || '');
    rendered = rendered.replace(/\{\{birth_date\}\}/g, data.birthDate || '');
    rendered = rendered.replace(/\{\{birthDate\}\}/g, data.birthDate || '');
    rendered = rendered.replace(/\{\{study_name\}\}/g, data.study_name || '');
    rendered = rendered.replace(/\{\{exam_body_part\}\}/g, data.examPart || '');
    rendered = rendered.replace(/\{\{body_part\}\}/g, data.examPart || '');
    rendered = rendered.replace(/\{\{examPart\}\}/g, data.examPart || '');
    rendered = rendered.replace(/\{\{exam_date\}\}/g, data.exam_date || '');
    rendered = rendered.replace(/\{\{exam_location\}\}/g, '영상의학과');
    rendered = rendered.replace(/\{\{technologist_name\}\}/g, '김기사');
    rendered = rendered.replace(/\{\{issue_date\}\}/g, data.report_date || '');
    rendered = rendered.replace(/\{\{issuer_name\}\}/g, '시스템관리자');
    rendered = rendered.replace(/\{\{radiologist_name\}\}/g, data.reportingDoctor || 'TBD');
    rendered = rendered.replace(/\{\{reportingDoctor\}\}/g, data.reportingDoctor || 'TBD');
    rendered = rendered.replace(/\{\{report_date\}\}/g, data.report_date || '');
    rendered = rendered.replace(/\{\{modality\}\}/g, data.modality || '');
    
    return rendered;
  };

  // 파일 업로드 핸들러
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        alert('지원하지 않는 파일 형식입니다. PDF, JPG, PNG 파일만 업로드 가능합니다.');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        alert('파일 크기가 너무 큽니다. 10MB 이하의 파일을 선택해주세요.');
        return;
      }
      
      setUploadedFile(file);
    }
  };

  // 업로드 완료 처리
  const handleCompleteUpload = async () => {
    if (!uploadedFile) {
      alert('업로드할 파일을 선택해주세요.');
      return;
    }

    try {
      setUploadLoading(true);
      
      await pacsdocsService.uploadFile(uploadedFile, {
        document_type: currentDocument,
        patient_name: currentPatient?.name,
        modality: currentPatient?.modality
      });
      
      alert('✅ 스캔 업로드가 완료되었습니다!\n동의서 처리가 완료되었습니다.');
      
      setUploadedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // 🔥 추가: 상태 변경 알림
      if (onStatusChange) {
        onStatusChange();
      }
      
      // 🔥 수정: 상태 변경됨을 알리며 닫기
      if (onClosePreview) {
        onClosePreview(true); // statusChanged = true
      }
      
    } catch (error) {
      console.error('Upload failed:', error);
      alert('업로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setUploadLoading(false);
    }
  };

  // 진료기록영상 파일 업로드
  const handleImagingUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      setImagingFiles(files);
      if (files.length >= 1) {
        alert(`${files.length}개 파일이 업로드되었습니다.`);
      }
    }
  };

  // 진료기록영상 프로세스 단계별 처리
  const handleImagingStep = (step) => {
    switch (step) {
      case 1:
        if (imagingFiles.length < 1) {
          alert('위임장 또는 동의서를 업로드해주세요.');
          return;
        }
        setImagingStep(2);
        break;
      case 2:
        handleCDBurn(); // CD 굽기 시작
        break;
      case 3:
        // 반출 확인서 표시 로직 (기존 이벤트 방식 유지)
        if (currentPatient) {
          const event = new CustomEvent('showExportCertificate', {
            detail: {
              patient: currentPatient,
              docType: 'export_certificate'
            }
          });
          window.dispatchEvent(event);
        }
        break;
      default:
        break;
    }
  };

  // CD 굽기 시뮬레이션
  const handleCDBurn = async () => {
    try {
      setCdBurning(true);
      setCdProgress(0);

      // 진행률 시뮬레이션
      const progressInterval = setInterval(() => {
        setCdProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      // 3초 후 완료
      setTimeout(() => {
        clearInterval(progressInterval);
        setCdProgress(100);
        
        setTimeout(() => {
          setCdBurning(false);
          setCdProgress(0);
          setImagingStep(3); // 3단계로 이동
          alert('💿 CD 굽기가 완료되었습니다!\n\n반출 확인서를 작성해주세요.');
          
          // 🔥 추가: CD 굽기 완료 시 상태 변경 알림
          if (onStatusChange) {
            onStatusChange();
          }
        }, 500);
      }, 3000);

      console.log('💿 CD 굽기 시뮬레이션 완료');
      
    } catch (error) {
      console.error('CD 굽기 시뮬레이션 오류:', error);
      setCdBurning(false);
      setCdProgress(0);
      alert('CD 굽기 중 오류가 발생했습니다.');
    }
  };

  // 실제 인쇄 기능
  const handlePrint = () => {
    if (!documentData) {
      alert('문서 데이터를 불러오는 중입니다. 잠시 후 시도해주세요.');
      return;
    }

    const docDisplayName = DOC_DISPLAY_NAMES[currentDocument] || '문서';
    printDocument(documentData, docDisplayName);
  };

  // 실제 PDF 저장 기능
  const handleSave = async () => {
    if (!documentData) {
      alert('문서 데이터를 불러오는 중입니다. 잠시 후 시도해주세요.');
      return;
    }

    const docFileName = DOC_NAMES[currentDocument] || '문서';
    await generatePDF(documentData, docFileName, currentDocument);
  };

  // 🔥 실제 발급완료 처리 (API 호출 추가)
  const handleMarkCompleted = async () => {
    if (!documentId) {
      alert('❌ 문서 ID가 없어 완료 처리할 수 없습니다.');
      return;
    }

    try {
      console.log('🔄 발급완료 처리 시작:', { documentId, docType: currentDocument });

      // 실제 API 호출
      await pacsdocsService.updateDocumentStatus(documentId, {
        status: 'completed',
        processed_by: 'current_user',
        notes: '발급 완료 처리됨'
      });

      console.log('✅ 발급완료 처리 성공');
      alert('✅ 문서 발급이 완료되었습니다!');
      
      // 🔥 추가: 상태 변경 알림
      if (onStatusChange) {
        onStatusChange();
      }
      
      // 🔥 수정: 상태 변경됨을 알리며 닫기
      if (onClosePreview) {
        onClosePreview(true); // statusChanged = true
      }

    } catch (error) {
      console.error('❌ 발급완료 처리 실패:', error);
      alert('❌ 발급 완료 처리 중 오류가 발생했습니다.\n\n다시 시도해주세요.');
    }
  };

  // 뷰 모드에 따른 렌더링
  const renderContent = () => {
    switch (viewMode) {
      case 'upload':
        return (
          <div className="upload-container">
            <h3>📝 서명된 동의서 스캔 업로드</h3>
            <p className="upload-description">
              환자가 서명한 동의서를 스캔하여 업로드해주세요.
            </p>
            
            <div className="upload-section" onClick={() => fileInputRef.current?.click()}>
              <div className="upload-icon">📁</div>
              <p>파일을 드래그하거나 클릭하여 업로드</p>
              <p className="upload-hint">지원 형식: PDF, JPG, PNG (최대 10MB)</p>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            
            {uploadedFile && (
              <div className="upload-preview">
                <p className="upload-preview-label">업로드된 파일:</p>
                <p className="upload-preview-info">
                  {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)}MB)
                </p>
              </div>
            )}
            
            <div className="action-buttons">
              <button 
                className={`btn btn-success ${!uploadedFile || uploadLoading ? 'disabled' : ''}`}
                onClick={handleCompleteUpload}
                disabled={!uploadedFile || uploadLoading}
              >
                {uploadLoading ? '업로드 중...' : '✅ 업로드 완료'}
              </button>
              <button className="btn btn-secondary" onClick={onClosePreview}>
                취소
              </button>
            </div>
          </div>
        );

      case 'imaging':
        return (
          <div className="imaging-container">
            <h3>💿 진료기록영상 발급 프로세스</h3>
            
            <div className="patient-info-box">
              <p><strong>환자명:</strong> {currentPatient?.name}</p>
              <p><strong>검사:</strong> {currentPatient?.modality} {currentPatient?.examPart}</p>
            </div>

            {/* 1단계: 필수 서류 제출 */}
            <div className={`process-step ${imagingStep === 1 ? 'step-active' : imagingStep > 1 ? 'step-completed' : 'step-waiting'}`}>
              <h4>1단계: 필수 서류 제출</h4>
              <p>다음 서류를 스캔하여 업로드해주세요:</p>
              <ul>
                <li>진료기록 열람 및 사본발급 위임장</li>
                <li>진료기록 열람 및 사본발급 동의서</li>
              </ul>
              
              <div className="upload-section" onClick={() => imagingFileInputRef.current?.click()}>
                <div className="upload-icon">📁</div>
                <p>서류를 업로드해주세요</p>
              </div>
              
              <input
                ref={imagingFileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                style={{ display: 'none' }}
                onChange={handleImagingUpload}
              />
              
              {imagingFiles.length > 0 && (
                <div className="upload-preview">
                  <p className="upload-preview-label">업로드된 파일: {imagingFiles.length}개</p>
                  {imagingFiles.map((file, index) => (
                    <p key={index} className="upload-preview-info">
                      {file.name}
                    </p>
                  ))}
                </div>
              )}
              
              <button 
                className={`btn btn-primary ${imagingFiles.length < 1 ? 'disabled' : ''}`}
                onClick={() => handleImagingStep(1)}
                disabled={imagingFiles.length < 1}
              >
                1단계 완료
              </button>
            </div>
            
            {/* 2단계: CD/DVD 발급 */}
            <div className={`process-step ${imagingStep === 2 ? 'step-active' : imagingStep > 2 ? 'step-completed' : 'step-waiting'}`}>
              <h4>2단계: CD/DVD 발급</h4>
              <p>서류 확인 후 진료기록영상을 발급합니다.</p>
              
              {imagingStep === 2 && cdBurning ? (
                <div className="cd-burning-status">
                  <div className="cd-icon-large">💿</div>
                  <h4>CD를 굽고 있습니다...</h4>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${cdProgress}%` }}
                    ></div>
                  </div>
                  <p className="progress-text">{Math.round(cdProgress)}% 완료</p>
                  <p className="progress-hint">잠시만 기다려주세요. 약 3분 소요됩니다.</p>
                </div>
              ) : (
                <button 
                  className={`btn btn-success ${imagingStep < 2 ? 'disabled' : ''}`}
                  onClick={() => handleImagingStep(2)}
                  disabled={imagingStep < 2}
                >
                  💿 CD 발급
                </button>
              )}
            </div>
            
            {/* 3단계: 반출 확인서 */}
            <div className={`process-step ${imagingStep === 3 ? 'step-active' : 'step-waiting'}`}>
              <h4>3단계: 반출 확인서</h4>
              <p>CD 수령시 반출 확인서에 서명이 필요합니다.</p>
            </div>
            
            <div className="action-buttons">
              <button 
                className={`btn btn-secondary ${cdBurning ? 'disabled' : ''}`}
                onClick={onClosePreview}
                disabled={cdBurning}
              >
                {cdBurning ? '굽기 중...' : '닫기'}
              </button>
            </div>
          </div>
        );

      case 'document':
        if (loading) {
          return (
            <div className="loading-container">
              <div className="loading-icon">⏳</div>
              <h3>문서를 불러오는 중...</h3>
            </div>
          );
        }

        if (error) {
          return (
            <div className="error-container">
              <div className="error-icon">❌</div>
              <h3>오류 발생</h3>
              <p>{error}</p>
              <button className="btn btn-primary" onClick={loadDocumentData}>
                다시 시도
              </button>
            </div>
          );
        }

        if (!documentData) {
          return (
            <div className="empty-document">
              <div className="empty-icon">📄</div>
              <h3>문서를 선택해주세요</h3>
            </div>
          );
        }

        return (
          <div className="document-container">
            <div 
              className="preview-content" 
              dangerouslySetInnerHTML={{ 
                __html: renderTemplate(documentData.template_content, documentData) 
              }}
            />
            
            <div className="action-buttons">
              <button className="btn btn-primary" onClick={handlePrint}>
                🖨️ 인쇄
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                💾 PDF 저장
              </button>
              <button className="btn btn-success" onClick={handleMarkCompleted}>
                ✅ 발급 완료
              </button>
              <button className="btn btn-secondary" onClick={onClosePreview}>
                닫기
              </button>
            </div>
          </div>
        );

      default: // 'empty'
        return (
          <div className="empty-preview">
            <div className="empty-icon">📄</div>
            <h3>서류를 선택해주세요</h3>
            <p>좌측에서 서류를 클릭하면<br />여기에 내용이 표시됩니다.</p>
            <p className="current-document">
              현재 선택된 문서: {currentDocument || 'none'}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="document-preview">
      <div className="section-header">📄 생성서류 미리보기</div>
      <div className="content-wrapper">
        {renderContent()}
      </div>
    </div>
  );
};

export default DocumentPreview;