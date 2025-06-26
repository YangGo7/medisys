// // // pacsapp/src/components/pacsdocs/DocumentPreview.js

// // import React, { useState, useRef } from 'react';
// // import { pacsdocsService } from '../../services/pacsdocsService';

// // const DocumentPreview = ({ 
// //   currentDocument, 
// //   currentPatient, 
// //   onClosePreview,
// //   viewMode = 'empty' // 'empty', 'upload', 'document', 'imaging'
// // }) => {
// //   // 파일 업로드 상태
// //   const [uploadedFile, setUploadedFile] = useState(null);
// //   const [uploadLoading, setUploadLoading] = useState(false);
// //   const fileInputRef = useRef(null);
  
// //   // 진료기록영상 프로세스 상태
// //   const [imagingStep, setImagingStep] = useState(1);
// //   const [imagingFiles, setImagingFiles] = useState([]);
// //   const imagingFileInputRef = useRef(null);

// //   // 파일 업로드 핸들러 (동의서용)
// //   const handleFileUpload = (event) => {
// //     const file = event.target.files[0];
// //     if (file) {
// //       // 파일 타입 검증
// //       const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
// //       if (!allowedTypes.includes(file.type)) {
// //         alert('지원하지 않는 파일 형식입니다. PDF, JPG, PNG 파일만 업로드 가능합니다.');
// //         return;
// //       }
      
// //       // 파일 크기 검증 (10MB 제한)
// //       if (file.size > 10 * 1024 * 1024) {
// //         alert('파일 크기가 너무 큽니다. 10MB 이하의 파일을 선택해주세요.');
// //         return;
// //       }
      
// //       setUploadedFile(file);
// //     }
// //   };

// //   // 업로드 완료 처리
// //   const handleCompleteUpload = async () => {
// //     if (!uploadedFile) {
// //       alert('업로드할 파일을 선택해주세요.');
// //       return;
// //     }

// //     try {
// //       setUploadLoading(true);
      
// //       // 실제 파일 업로드 API 호출 (구현 예정)
// //       await pacsdocsService.uploadFile(uploadedFile, {
// //         document_type: currentDocument,
// //         patient_name: currentPatient?.name,
// //         modality: currentPatient?.modality
// //       });
      
// //       alert('✅ 스캔 업로드가 완료되었습니다!\n동의서 처리가 완료되었습니다.');
      
// //       // 상태 초기화
// //       setUploadedFile(null);
// //       if (fileInputRef.current) {
// //         fileInputRef.current.value = '';
// //       }
      
// //       // 미리보기 닫기
// //       onClosePreview();
      
// //     } catch (error) {
// //       console.error('Upload failed:', error);
// //       alert('업로드에 실패했습니다. 다시 시도해주세요.');
// //     } finally {
// //       setUploadLoading(false);
// //     }
// //   };

// //   // 진료기록영상 파일 업로드
// //   const handleImagingUpload = (event) => {
// //     const files = Array.from(event.target.files);
// //     if (files.length > 0) {
// //       setImagingFiles(files);
// //       if (files.length >= 2) {
// //         // 위임장과 동의서 모두 업로드됨
// //         alert(`${files.length}개 파일이 업로드되었습니다.`);
// //       }
// //     }
// //   };

// //   // 진료기록영상 프로세스 단계별 처리
// //   const handleImagingStep = (step) => {
// //     switch (step) {
// //       case 1:
// //         if (imagingFiles.length < 2) {
// //           alert('위임장과 동의서를 모두 업로드해주세요.');
// //           return;
// //         }
// //         setImagingStep(2);
// //         break;
// //       case 2:
// //         setImagingStep(3);
// //         alert('💿 CD가 발급되었습니다!');
// //         break;
// //       case 3:
// //         // 반출 확인서 보기
// //         if (currentPatient) {
// //           // DocumentPreview를 통해 반출 확인서 표시
// //           // 이 부분은 상위 컴포넌트에서 처리하도록 이벤트 발생
// //           const event = new CustomEvent('showExportCertificate', {
// //             detail: {
// //               patient: currentPatient,
// //               docType: 'export_certificate'
// //             }
// //           });
// //           window.dispatchEvent(event);
// //         }
// //         break;
// //       default:
// //         break;
// //     }
// //   };

// //   // 문서 액션 핸들러들
// //   const handlePrint = () => {
// //     if (!currentPatient) return;
    
// //     const docNames = {
// //       'report_kor': '판독 결과지 (국문)',
// //       'report_eng': '판독 결과지 (영문)',
// //       'export_certificate': '반출 확인서',
// //       'exam_certificate': '검사 확인서',
// //       'consultation_request': '협진 의뢰서'
// //     };
    
// //     const docName = docNames[currentDocument] || '문서';
// //     alert(`🖨️ ${docName} 인쇄를 시작합니다.\n\n환자: ${currentPatient.name}\n검사: ${currentPatient.modality} (${currentPatient.bodyPart})`);
// //   };

// //   const handleSave = () => {
// //     if (!currentPatient) return;
    
// //     const docNames = {
// //       'report_kor': '판독결과지_국문',
// //       'report_eng': '판독결과지_영문',
// //       'export_certificate': '반출확인서',
// //       'exam_certificate': '검사확인서',
// //       'consultation_request': '협진의뢰서'
// //     };
    
// //     const docName = docNames[currentDocument] || '문서';
// //     const fileName = `${currentPatient.name}_${docName}_${new Date().toISOString().split('T')[0]}.pdf`;
// //     alert(`💾 PDF 저장이 완료되었습니다.\n\n파일명: ${fileName}`);
// //   };

// //   const handleMarkCompleted = () => {
// //     alert('✅ 문서 발급이 완료되었습니다!');
// //     onClosePreview();
// //   };

// //   // 문서 내용 생성
// //   const generateDocumentContent = () => {
// //     if (!currentDocument || !currentPatient) return null;

// //     const today = new Date().toLocaleDateString('ko-KR');
// //     const { name: patientName, modality, bodyPart } = currentPatient;

// //     const commonHeader = `
// //       <div class="document-header">
// //         <div class="hospital-logo">🏥</div>
// //         <h1 style="margin: 0; color: #2d3748;">OO대학교병원</h1>
// //     `;

// //     const patientInfoSection = `
// //       <div class="patient-info">
// //         <div class="info-group">
// //           <h4>환자 정보</h4>
// //           <p><strong>환자명:</strong> ${patientName}</p>
// //           <p><strong>검사일:</strong> ${today}</p>
// //         </div>
// //         <div class="info-group">
// //           <h4>검사 정보</h4>
// //           <p><strong>검사종류:</strong> ${modality}</p>
// //           <p><strong>검사부위:</strong> ${bodyPart}</p>
// //         </div>
// //       </div>
// //     `;

// //     switch (currentDocument) {
// //       case 'report_kor':
// //         return `
// //           ${commonHeader}
// //             <h2 style="margin: 0.5rem 0; color: #718096;">영상의학과 판독 리포트</h2>
// //           </div>
// //           ${patientInfoSection}
// //           <div style="margin-bottom: 1.5rem;">
// //             <h3 style="color: #4a5568; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">소견 (Findings)</h3>
// //             <p style="line-height: 1.8; text-align: justify;">
// //               ${modality === 'CT' ? 
// //                 `조영 증강 전후 ${bodyPart} CT에서 특이 소견 관찰되지 않습니다.` :
// //               modality === 'MR' ?
// //                 `T1, T2 강조영상에서 ${bodyPart} 부위에 특이 신호강도 변화는 관찰되지 않습니다.` :
// //                 `${bodyPart} 영상에서 특이 소견은 관찰되지 않습니다.`
// //               }
// //             </p>
// //           </div>
// //           <div style="margin-bottom: 1.5rem;">
// //             <h3 style="color: #4a5568; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">최종 진단 (Impression)</h3>
// //             <p style="line-height: 1.8; font-weight: 500;">
// //               No significant abnormality in ${bodyPart} ${modality}.
// //             </p>
// //           </div>
// //           <div style="text-align: right; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
// //             <p><strong>판독일자:</strong> ${today}</p>
// //             <p><strong>판독의:</strong> 이지은 (영상의학과 전문의)</p>
// //           </div>
// //         `;

// //       case 'report_eng':
// //         return `
// //           ${commonHeader}
// //             <h2 style="margin: 0.5rem 0; color: #718096;">Radiology Report</h2>
// //           </div>
// //           <div class="patient-info">
// //             <div class="info-group">
// //               <h4>Patient Information</h4>
// //               <p><strong>Patient Name:</strong> ${patientName}</p>
// //               <p><strong>Exam Date:</strong> ${today}</p>
// //             </div>
// //             <div class="info-group">
// //               <h4>Exam Information</h4>
// //               <p><strong>Modality:</strong> ${modality}</p>
// //               <p><strong>Body Part:</strong> ${bodyPart}</p>
// //             </div>
// //           </div>
// //           <div style="margin-bottom: 1.5rem;">
// //             <h3 style="color: #4a5568; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">Findings</h3>
// //             <p style="line-height: 1.8; text-align: justify;">
// //               ${modality === 'CT' ? 
// //                 `${bodyPart} CT scan shows no significant abnormalities.` :
// //               modality === 'MR' ?
// //                 `${bodyPart} MRI examination reveals no remarkable findings.` :
// //                 `${bodyPart} imaging shows no significant abnormalities.`
// //               }
// //             </p>
// //           </div>
// //           <div style="margin-bottom: 1.5rem;">
// //             <h3 style="color: #4a5568; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">Impression</h3>
// //             <p style="line-height: 1.8; font-weight: 500;">
// //               No significant abnormality in ${bodyPart} ${modality}.
// //             </p>
// //           </div>
// //           <div style="text-align: right; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
// //             <p><strong>Report Date:</strong> ${today}</p>
// //             <p><strong>Radiologist:</strong> Dr. Lee Ji-eun</p>
// //           </div>
// //         `;

// //       case 'export_certificate':
// //         return `
// //           ${commonHeader}
// //             <h2 style="margin: 0.5rem 0; color: #718096;">영상 반출 확인서</h2>
// //           </div>
// //           ${patientInfoSection}
// //           <div style="margin-bottom: 1.5rem;">
// //             <h3 style="color: #4a5568;">반출 정보</h3>
// //             <p><strong>요청자:</strong> 환자 본인</p>
// //             <p><strong>반출사유:</strong> 협진 목적</p>
// //             <p><strong>반출매체:</strong> CD</p>
// //             <p><strong>파일수:</strong> ${modality === 'CT' ? '156장' : modality === 'MR' ? '89장' : '4장'}</p>
// //           </div>
// //           <div style="background: #f8fafc; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
// //             <h4 style="color: #4a5568; margin-bottom: 0.5rem;">⚠️ 개인정보 보호 안내</h4>
// //             <p style="font-size: 0.9rem; line-height: 1.6; margin: 0;">
// //               본 영상자료는 의료법에 따라 환자의 개인정보가 포함되어 있습니다. 
// //               목적 외 사용 금지, 제3자 제공 금지, 분실 시 즉시 신고하시기 바랍니다.
// //             </p>
// //           </div>
// //           <div class="signature-section">
// //             <p style="margin-bottom: 1rem;"><strong>위 영상자료의 반출을 확인합니다.</strong></p>
// //             <div class="signature-box">요청자 서명란</div>
// //             <p style="font-size: 0.9rem;">발급일자: ${today} | 발급자: 김정호</p>
// //           </div>
// //         `;

// //       case 'exam_certificate':
// //         return `
// //           ${commonHeader}
// //             <h2 style="margin: 0.5rem 0; color: #718096;">검사 확인서</h2>
// //           </div>
// //           ${patientInfoSection}
// //           <div style="line-height: 1.8; text-align: center; margin: 2rem 0;">
// //             <p style="font-size: 1.1rem; font-weight: 500;">
// //               위 환자는 본원에서 ${modality} 검사를 완료하였음을 확인합니다.
// //             </p>
// //           </div>
// //           <div style="text-align: right; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
// //             <p><strong>발급일:</strong> ${today}</p>
// //             <p><strong>OO대학교병원 영상의학과</strong></p>
// //           </div>
// //         `;

// //       case 'consultation_request':
// //         return `
// //           ${commonHeader}
// //             <h2 style="margin: 0.5rem 0; color: #718096;">협진 의뢰서</h2>
// //           </div>
// //           ${patientInfoSection}
// //           <div style="margin-bottom: 1.5rem;">
// //             <h3 style="color: #4a5568;">검사 결과</h3>
// //             <p><strong>검사종류:</strong> ${modality} (${bodyPart})</p>
// //             <p><strong>판독결과:</strong> 특이소견 없음</p>
// //           </div>
// //           <div style="margin-bottom: 1.5rem;">
// //             <h3 style="color: #4a5568;">협진 사유</h3>
// //             <p>추가적인 임상 평가 및 치료 방향 결정을 위한 협진을 의뢰합니다.</p>
// //           </div>
// //           <div style="text-align: right; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
// //             <p><strong>의뢰일자:</strong> ${today}</p>
// //             <p><strong>의뢰의:</strong> 이지은 (영상의학과)</p>
// //           </div>
// //         `;

// //       default:
// //         return '<p>문서를 생성할 수 없습니다.</p>';
// //     }
// //   };

// //   // 뷰 모드에 따른 렌더링
// //   const renderContent = () => {
// //     switch (viewMode) {
// //       case 'upload':
// //         return (
// //           <div style={{ padding: '1.5rem' }}>
// //             <h3 style={{ marginBottom: '1rem' }}>📝 서명된 동의서 스캔 업로드</h3>
// //             <p style={{ marginBottom: '1rem', color: '#4a5568' }}>
// //               환자가 서명한 동의서를 스캔하여 업로드해주세요.
// //             </p>
            
// //             <div 
// //               className="upload-section" 
// //               onClick={() => fileInputRef.current?.click()}
// //             >
// //               <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📁</div>
// //               <p>파일을 드래그하거나 클릭하여 업로드</p>
// //               <p style={{ fontSize: '0.8rem', color: '#718096' }}>
// //                 지원 형식: PDF, JPG, PNG (최대 10MB)
// //               </p>
// //             </div>
            
// //             <input
// //               ref={fileInputRef}
// //               type="file"
// //               accept=".pdf,.jpg,.jpeg,.png"
// //               style={{ display: 'none' }}
// //               onChange={handleFileUpload}
// //             />
            
// //             {uploadedFile && (
// //               <div className="upload-preview">
// //                 <p style={{ margin: 0, fontWeight: 500 }}>업로드된 파일:</p>
// //                 <p style={{ margin: '0.5rem 0 0 0', color: '#4a5568' }}>
// //                   {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)}MB)
// //                 </p>
// //               </div>
// //             )}
            
// //             <div className="action-buttons" style={{ marginTop: '1.5rem' }}>
// //               <button 
// //                 className="btn btn-success" 
// //                 onClick={handleCompleteUpload}
// //                 disabled={!uploadedFile || uploadLoading}
// //               >
// //                 {uploadLoading ? '업로드 중...' : '✅ 업로드 완료'}
// //               </button>
// //               <button className="btn btn-secondary" onClick={onClosePreview}>
// //                 취소
// //               </button>
// //             </div>
// //           </div>
// //         );

// //       case 'imaging':
// //         return (
// //           <div style={{ padding: '1.5rem' }}>
// //             <h3 style={{ marginBottom: '1rem' }}>💿 진료기록영상 발급 프로세스</h3>
            
// //             <div className={`process-step ${imagingStep === 1 ? 'step-active' : imagingStep > 1 ? 'step-completed' : 'step-waiting'}`}>
// //               <h4>1단계: 필수 서류 제출</h4>
// //               <p>다음 서류를 스캔하여 업로드해주세요:</p>
// //               <ul style={{ margin: '0.5rem 0 0.5rem 1.5rem' }}>
// //                 <li>진료기록 열람 및 사본발급 위임장</li>
// //                 <li>진료기록 열람 및 사본발급 동의서</li>
// //               </ul>
              
// //               <div 
// //                 className="upload-section" 
// //                 onClick={() => imagingFileInputRef.current?.click()}
// //                 style={{ margin: '1rem 0' }}
// //               >
// //                 <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📁</div>
// //                 <p>서류를 업로드해주세요</p>
// //               </div>
              
// //               <input
// //                 ref={imagingFileInputRef}
// //                 type="file"
// //                 accept=".pdf,.jpg,.jpeg,.png"
// //                 multiple
// //                 style={{ display: 'none' }}
// //                 onChange={handleImagingUpload}
// //               />
              
// //               {imagingFiles.length > 0 && (
// //                 <div className="upload-preview">
// //                   <p>업로드된 파일: {imagingFiles.length}개</p>
// //                   {imagingFiles.map((file, index) => (
// //                     <p key={index} style={{ fontSize: '0.9rem', color: '#666' }}>
// //                       {file.name}
// //                     </p>
// //                   ))}
// //                 </div>
// //               )}
              
// //               <button 
// //                 className="btn btn-primary" 
// //                 onClick={() => handleImagingStep(1)}
// //                 disabled={imagingFiles.length < 2}
// //               >
// //                 1단계 완료
// //               </button>
// //             </div>
            
// //             <div className={`process-step ${imagingStep === 2 ? 'step-active' : imagingStep > 2 ? 'step-completed' : 'step-waiting'}`}>
// //               <h4>2단계: CD/DVD 발급</h4>
// //               <p>서류 확인 후 진료기록영상을 발급합니다.</p>
// //               <button 
// //                 className="btn btn-success" 
// //                 onClick={() => handleImagingStep(2)}
// //                 disabled={imagingStep < 2}
// //               >
// //                 💿 CD 발급
// //               </button>
// //             </div>
            
// //             <div className={`process-step ${imagingStep === 3 ? 'step-active' : 'step-waiting'}`}>
// //               <h4>3단계: 반출 확인서</h4>
// //               <p>CD 수령시 반출 확인서에 서명이 필요합니다.</p>
// //               <button 
// //                 className="btn btn-secondary" 
// //                 onClick={() => handleImagingStep(3)}
// //                 disabled={imagingStep < 3}
// //               >
// //                 📋 반출 확인서 보기
// //               </button>
// //             </div>
            
// //             <div className="action-buttons" style={{ marginTop: '1rem' }}>
// //               <button className="btn btn-secondary" onClick={onClosePreview}>
// //                 닫기
// //               </button>
// //             </div>
// //           </div>
// //         );

// //       case 'document':
// //         return (
// //           <div style={{ padding: '1.5rem' }}>
// //             <div 
// //               className="preview-content" 
// //               dangerouslySetInnerHTML={{ __html: generateDocumentContent() }}
// //             />
            
// //             <div className="action-buttons">
// //               <button className="btn btn-primary" onClick={handlePrint}>
// //                 🖨️ 인쇄
// //               </button>
// //               <button className="btn btn-primary" onClick={handleSave}>
// //                 💾 PDF 저장
// //               </button>
// //               <button className="btn btn-success" onClick={handleMarkCompleted}>
// //                 ✅ 발급 완료
// //               </button>
// //               <button className="btn btn-secondary" onClick={onClosePreview}>
// //                 닫기
// //               </button>
// //             </div>
// //           </div>
// //         );

// //       default: // 'empty'
// //         return (
// //           <div className="empty-preview" style={{ padding: '1.5rem' }}>
// //             <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
// //             <h3>서류를 선택해주세요</h3>
// //             <p>좌측에서 서류를 클릭하면<br />여기에 내용이 표시됩니다.</p>
// //           </div>
// //         );
// //     }
// //   };

// //   return (
// //     <div className="document-preview">
// //       <div className="section-header">📄 생성서류 미리보기</div>
// //       {renderContent()}
// //     </div>
// //   );
// // };

// // export default DocumentPreview;

// // pacsapp/src/components/pacsdocs/DocumentPreview.js

// import React, { useState, useRef } from 'react';
// import { pacsdocsService } from '../../services/pacsdocsService';

// const DocumentPreview = ({ 
//   currentDocument, 
//   currentPatient, 
//   onClosePreview,
//   viewMode = 'empty' // 'empty', 'upload', 'document', 'imaging'
// }) => {
//   // 파일 업로드 상태
//   const [uploadedFile, setUploadedFile] = useState(null);
//   const [uploadLoading, setUploadLoading] = useState(false);
//   const fileInputRef = useRef(null);
  
//   // 진료기록영상 프로세스 상태
//   const [imagingStep, setImagingStep] = useState(1);
//   const [imagingFiles, setImagingFiles] = useState([]);
//   const imagingFileInputRef = useRef(null);

//   // 파일 업로드 핸들러 (동의서용)
//   const handleFileUpload = (event) => {
//     const file = event.target.files[0];
//     if (file) {
//       // 파일 타입 검증
//       const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
//       if (!allowedTypes.includes(file.type)) {
//         alert('지원하지 않는 파일 형식입니다. PDF, JPG, PNG 파일만 업로드 가능합니다.');
//         return;
//       }
      
//       // 파일 크기 검증 (10MB 제한)
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
      
//       // 실제 파일 업로드 API 호출 (구현 예정)
//       await pacsdocsService.uploadFile(uploadedFile, {
//         document_type: currentDocument,
//         patient_name: currentPatient?.name,
//         modality: currentPatient?.modality
//       });
      
//       alert('✅ 스캔 업로드가 완료되었습니다!\n동의서 처리가 완료되었습니다.');
      
//       // 상태 초기화
//       setUploadedFile(null);
//       if (fileInputRef.current) {
//         fileInputRef.current.value = '';
//       }
      
//       // 미리보기 닫기
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
//       if (files.length >= 2) {
//         // 위임장과 동의서 모두 업로드됨
//         alert(`${files.length}개 파일이 업로드되었습니다.`);
//       }
//     }
//   };

//   // 진료기록영상 프로세스 단계별 처리
//   const handleImagingStep = (step) => {
//     switch (step) {
//       case 1:
//         if (imagingFiles.length < 2) {
//           alert('위임장과 동의서를 모두 업로드해주세요.');
//           return;
//         }
//         setImagingStep(2);
//         break;
//       case 2:
//         setImagingStep(3);
//         alert('💿 CD가 발급되었습니다!');
//         break;
//       case 3:
//         // 반출 확인서 보기
//         if (currentPatient) {
//           // DocumentPreview를 통해 반출 확인서 표시
//           // 이 부분은 상위 컴포넌트에서 처리하도록 이벤트 발생
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

//   // 문서 액션 핸들러들
//   const handlePrint = () => {
//     if (!currentPatient) return;
    
//     const docNames = {
//       'report_kor': '판독 결과지 (국문)',
//       'report_eng': '판독 결과지 (영문)',
//       'export_certificate': '반출 확인서',
//       'exam_certificate': '검사 확인서',
//       'consultation_request': '협진 의뢰서'
//     };
    
//     const docName = docNames[currentDocument] || '문서';
//     alert(`🖨️ ${docName} 인쇄를 시작합니다.\n\n환자: ${currentPatient.name}\n검사: ${currentPatient.modality} (${currentPatient.bodyPart})`);
//   };

//   const handleSave = () => {
//     if (!currentPatient) return;
    
//     const docNames = {
//       'report_kor': '판독결과지_국문',
//       'report_eng': '판독결과지_영문',
//       'export_certificate': '반출확인서',
//       'exam_certificate': '검사확인서',
//       'consultation_request': '협진의뢰서'
//     };
    
//     const docName = docNames[currentDocument] || '문서';
//     const fileName = `${currentPatient.name}_${docName}_${new Date().toISOString().split('T')[0]}.pdf`;
//     alert(`💾 PDF 저장이 완료되었습니다.\n\n파일명: ${fileName}`);
//   };

//   const handleMarkCompleted = () => {
//     alert('✅ 문서 발급이 완료되었습니다!');
//     onClosePreview();
//   };

//   // 문서 내용 생성
//   const generateDocumentContent = () => {
//     if (!currentDocument || !currentPatient) return null;

//     const today = new Date().toLocaleDateString('ko-KR');
//     const { name: patientName, modality, bodyPart } = currentPatient;

//     const commonHeader = `
//       <div class="document-header">
//         <div class="hospital-logo">🏥</div>
//         <h1 style="margin: 0; color: #2d3748;">OO대학교병원</h1>
//     `;

//     const patientInfoSection = `
//       <div class="patient-info">
//         <div class="info-group">
//           <h4>환자 정보</h4>
//           <p><strong>환자명:</strong> ${patientName}</p>
//           <p><strong>검사일:</strong> ${today}</p>
//         </div>
//         <div class="info-group">
//           <h4>검사 정보</h4>
//           <p><strong>검사종류:</strong> ${modality}</p>
//           <p><strong>검사부위:</strong> ${bodyPart}</p>
//         </div>
//       </div>
//     `;

//     switch (currentDocument) {
//       case 'report_kor':
//         return `
//           ${commonHeader}
//             <h2 style="margin: 0.5rem 0; color: #718096;">영상의학과 판독 리포트</h2>
//           </div>
//           ${patientInfoSection}
//           <div style="margin-bottom: 1.5rem;">
//             <h3 style="color: #4a5568; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">소견 (Findings)</h3>
//             <p style="line-height: 1.8; text-align: justify;">
//               ${modality === 'CT' ? 
//                 `조영 증강 전후 ${bodyPart} CT에서 특이 소견 관찰되지 않습니다.` :
//               modality === 'MR' ?
//                 `T1, T2 강조영상에서 ${bodyPart} 부위에 특이 신호강도 변화는 관찰되지 않습니다.` :
//                 `${bodyPart} 영상에서 특이 소견은 관찰되지 않습니다.`
//               }
//             </p>
//           </div>
//           <div style="margin-bottom: 1.5rem;">
//             <h3 style="color: #4a5568; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">최종 진단 (Impression)</h3>
//             <p style="line-height: 1.8; font-weight: 500;">
//               No significant abnormality in ${bodyPart} ${modality}.
//             </p>
//           </div>
//           <div style="text-align: right; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
//             <p><strong>판독일자:</strong> ${today}</p>
//             <p><strong>판독의:</strong> 이지은 (영상의학과 전문의)</p>
//           </div>
//         `;

//       case 'report_eng':
//         return `
//           ${commonHeader}
//             <h2 style="margin: 0.5rem 0; color: #718096;">Radiology Report</h2>
//           </div>
//           <div class="patient-info">
//             <div class="info-group">
//               <h4>Patient Information</h4>
//               <p><strong>Patient Name:</strong> ${patientName}</p>
//               <p><strong>Exam Date:</strong> ${today}</p>
//             </div>
//             <div class="info-group">
//               <h4>Exam Information</h4>
//               <p><strong>Modality:</strong> ${modality}</p>
//               <p><strong>Body Part:</strong> ${bodyPart}</p>
//             </div>
//           </div>
//           <div style="margin-bottom: 1.5rem;">
//             <h3 style="color: #4a5568; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">Findings</h3>
//             <p style="line-height: 1.8; text-align: justify;">
//               ${modality === 'CT' ? 
//                 `${bodyPart} CT scan shows no significant abnormalities.` :
//               modality === 'MR' ?
//                 `${bodyPart} MRI examination reveals no remarkable findings.` :
//                 `${bodyPart} imaging shows no significant abnormalities.`
//               }
//             </p>
//           </div>
//           <div style="margin-bottom: 1.5rem;">
//             <h3 style="color: #4a5568; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">Impression</h3>
//             <p style="line-height: 1.8; font-weight: 500;">
//               No significant abnormality in ${bodyPart} ${modality}.
//             </p>
//           </div>
//           <div style="text-align: right; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
//             <p><strong>Report Date:</strong> ${today}</p>
//             <p><strong>Radiologist:</strong> Dr. Lee Ji-eun</p>
//           </div>
//         `;

//       case 'export_certificate':
//         return `
//           ${commonHeader}
//             <h2 style="margin: 0.5rem 0; color: #718096;">영상 반출 확인서</h2>
//           </div>
//           ${patientInfoSection}
//           <div style="margin-bottom: 1.5rem;">
//             <h3 style="color: #4a5568;">반출 정보</h3>
//             <p><strong>요청자:</strong> 환자 본인</p>
//             <p><strong>반출사유:</strong> 협진 목적</p>
//             <p><strong>반출매체:</strong> CD</p>
//             <p><strong>파일수:</strong> ${modality === 'CT' ? '156장' : modality === 'MR' ? '89장' : '4장'}</p>
//           </div>
//           <div style="background: #f8fafc; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
//             <h4 style="color: #4a5568; margin-bottom: 0.5rem;">⚠️ 개인정보 보호 안내</h4>
//             <p style="font-size: 0.9rem; line-height: 1.6; margin: 0;">
//               본 영상자료는 의료법에 따라 환자의 개인정보가 포함되어 있습니다. 
//               목적 외 사용 금지, 제3자 제공 금지, 분실 시 즉시 신고하시기 바랍니다.
//             </p>
//           </div>
//           <div class="signature-section">
//             <p style="margin-bottom: 1rem;"><strong>위 영상자료의 반출을 확인합니다.</strong></p>
//             <div class="signature-box">요청자 서명란</div>
//             <p style="font-size: 0.9rem;">발급일자: ${today} | 발급자: 김정호</p>
//           </div>
//         `;

//       case 'exam_certificate':
//         return `
//           ${commonHeader}
//             <h2 style="margin: 0.5rem 0; color: #718096;">검사 확인서</h2>
//           </div>
//           ${patientInfoSection}
//           <div style="line-height: 1.8; text-align: center; margin: 2rem 0;">
//             <p style="font-size: 1.1rem; font-weight: 500;">
//               위 환자는 본원에서 ${modality} 검사를 완료하였음을 확인합니다.
//             </p>
//           </div>
//           <div style="text-align: right; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
//             <p><strong>발급일:</strong> ${today}</p>
//             <p><strong>OO대학교병원 영상의학과</strong></p>
//           </div>
//         `;

//       case 'consultation_request':
//         return `
//           ${commonHeader}
//             <h2 style="margin: 0.5rem 0; color: #718096;">협진 의뢰서</h2>
//           </div>
//           ${patientInfoSection}
//           <div style="margin-bottom: 1.5rem;">
//             <h3 style="color: #4a5568;">검사 결과</h3>
//             <p><strong>검사종류:</strong> ${modality} (${bodyPart})</p>
//             <p><strong>판독결과:</strong> 특이소견 없음</p>
//           </div>
//           <div style="margin-bottom: 1.5rem;">
//             <h3 style="color: #4a5568;">협진 사유</h3>
//             <p>추가적인 임상 평가 및 치료 방향 결정을 위한 협진을 의뢰합니다.</p>
//           </div>
//           <div style="text-align: right; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
//             <p><strong>의뢰일자:</strong> ${today}</p>
//             <p><strong>의뢰의:</strong> 이지은 (영상의학과)</p>
//           </div>
//         `;

//       default:
//         return '<p>문서를 생성할 수 없습니다.</p>';
//     }
//   };

//   // 뷰 모드에 따른 렌더링
//   const renderContent = () => {
//     switch (viewMode) {
//       case 'upload':
//         return (
//           <div style={{ padding: '1.5rem' }}>
//             <h3 style={{ marginBottom: '1rem' }}>📝 서명된 동의서 스캔 업로드</h3>
//             <p style={{ marginBottom: '1rem', color: '#4a5568' }}>
//               환자가 서명한 동의서를 스캔하여 업로드해주세요.
//             </p>
            
//             <div 
//               className="upload-section" 
//               onClick={() => fileInputRef.current?.click()}
//             >
//               <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📁</div>
//               <p>파일을 드래그하거나 클릭하여 업로드</p>
//               <p style={{ fontSize: '0.8rem', color: '#718096' }}>
//                 지원 형식: PDF, JPG, PNG (최대 10MB)
//               </p>
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
//                 <p style={{ margin: 0, fontWeight: 500 }}>업로드된 파일:</p>
//                 <p style={{ margin: '0.5rem 0 0 0', color: '#4a5568' }}>
//                   {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)}MB)
//                 </p>
//               </div>
//             )}
            
//             <div className="action-buttons" style={{ marginTop: '1.5rem' }}>
//               <button 
//                 className="btn btn-success" 
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
//           <div style={{ padding: '1.5rem' }}>
//             <h3 style={{ marginBottom: '1rem' }}>💿 진료기록영상 발급 프로세스</h3>
            
//             <div className={`process-step ${imagingStep === 1 ? 'step-active' : imagingStep > 1 ? 'step-completed' : 'step-waiting'}`}>
//               <h4>1단계: 필수 서류 제출</h4>
//               <p>다음 서류를 스캔하여 업로드해주세요:</p>
//               <ul style={{ margin: '0.5rem 0 0.5rem 1.5rem' }}>
//                 <li>진료기록 열람 및 사본발급 위임장</li>
//                 <li>진료기록 열람 및 사본발급 동의서</li>
//               </ul>
              
//               <div 
//                 className="upload-section" 
//                 onClick={() => imagingFileInputRef.current?.click()}
//                 style={{ margin: '1rem 0' }}
//               >
//                 <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📁</div>
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
//                   <p>업로드된 파일: {imagingFiles.length}개</p>
//                   {imagingFiles.map((file, index) => (
//                     <p key={index} style={{ fontSize: '0.9rem', color: '#666' }}>
//                       {file.name}
//                     </p>
//                   ))}
//                 </div>
//               )}
              
//               <button 
//                 className="btn btn-primary" 
//                 onClick={() => handleImagingStep(1)}
//                 disabled={imagingFiles.length < 2}
//               >
//                 1단계 완료
//               </button>
//             </div>
            
//             <div className={`process-step ${imagingStep === 2 ? 'step-active' : imagingStep > 2 ? 'step-completed' : 'step-waiting'}`}>
//               <h4>2단계: CD/DVD 발급</h4>
//               <p>서류 확인 후 진료기록영상을 발급합니다.</p>
//               <button 
//                 className="btn btn-success" 
//                 onClick={() => handleImagingStep(2)}
//                 disabled={imagingStep < 2}
//               >
//                 💿 CD 발급
//               </button>
//             </div>
            
//             <div className={`process-step ${imagingStep === 3 ? 'step-active' : 'step-waiting'}`}>
//               <h4>3단계: 반출 확인서</h4>
//               <p>CD 수령시 반출 확인서에 서명이 필요합니다.</p>
//               <button 
//                 className="btn btn-secondary" 
//                 onClick={() => handleImagingStep(3)}
//                 disabled={imagingStep < 3}
//               >
//                 📋 반출 확인서 보기
//               </button>
//             </div>
            
//             <div className="action-buttons" style={{ marginTop: '1rem' }}>
//               <button className="btn btn-secondary" onClick={onClosePreview}>
//                 닫기
//               </button>
//             </div>
//           </div>
//         );

//       case 'document':
//         return (
//           <div style={{ padding: '1.5rem' }}>
//             <div 
//               className="preview-content" 
//               dangerouslySetInnerHTML={{ __html: generateDocumentContent() }}
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
//           <div className="empty-preview" style={{ padding: '1.5rem' }}>
//             <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
//             <h3>서류를 선택해주세요</h3>
//             <p>좌측에서 서류를 클릭하면<br />여기에 내용이 표시됩니다.</p>
//           </div>
//         );
//     }
//   };

//   return (
//     <div className="document-preview">
//       <div className="section-header">📄 생성서류 미리보기</div>
//       {renderContent()}
//     </div>
//   );
// };

// export default DocumentPreview;

// pacsapp/src/components/pacsdocs/DocumentPreview.js

import React, { useState, useRef, useEffect } from 'react';
import { pacsdocsService } from '../../services/pacsdocsService';

const DocumentPreview = ({ 
  currentDocument, 
  currentPatient, 
  onClosePreview,
  viewMode = 'empty', // 'empty', 'upload', 'document', 'imaging'
  studyId = null // ✅ 추가: API 호출용 studyId
}) => {
  // ✅ 추가: API 데이터 상태
  const [documentData, setDocumentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 파일 업로드 상태 (기존)
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef(null);
  
  // 진료기록영상 프로세스 상태 (기존)
  const [imagingStep, setImagingStep] = useState(1);
  const [imagingFiles, setImagingFiles] = useState([]);
  const imagingFileInputRef = useRef(null);

  // ✅ 추가: 서류 데이터 로딩
  useEffect(() => {
    if (viewMode === 'document' && currentDocument && studyId) {
      loadDocumentData();
    }
  }, [viewMode, currentDocument, studyId]);

  // ✅ 추가: API 호출하여 서류 데이터 가져오기
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

  // ✅ 추가: 템플릿 변수 치환 함수
  const renderTemplate = (templateContent, data) => {
    if (!templateContent || !data) return '';

    let rendered = templateContent;
    
    // 변수 치환
    rendered = rendered.replace(/\{\{patient_name\}\}/g, data.patient_name || '');
    rendered = rendered.replace(/\{\{patient_id\}\}/g, data.patient_id || '');
    rendered = rendered.replace(/\{\{birthdate\}\}/g, data.birth_date || '');
    rendered = rendered.replace(/\{\{birth_date\}\}/g, data.birth_date || '');
    rendered = rendered.replace(/\{\{study_name\}\}/g, data.study_name || '');
    rendered = rendered.replace(/\{\{exam_body_part\}\}/g, data.body_part || '');
    rendered = rendered.replace(/\{\{body_part\}\}/g, data.body_part || '');
    rendered = rendered.replace(/\{\{exam_date\}\}/g, data.exam_date || '');
    rendered = rendered.replace(/\{\{exam_location\}\}/g, '영상의학과');
    rendered = rendered.replace(/\{\{technologist_name\}\}/g, '김기사');
    rendered = rendered.replace(/\{\{issue_date\}\}/g, data.report_date || '');
    rendered = rendered.replace(/\{\{issuer_name\}\}/g, '시스템관리자');
    rendered = rendered.replace(/\{\{radiologist_name\}\}/g, data.radiologist_name || 'TBD');
    rendered = rendered.replace(/\{\{report_date\}\}/g, data.report_date || '');
    rendered = rendered.replace(/\{\{modality\}\}/g, data.modality || '');
    
    return rendered;
  };

  // 파일 업로드 핸들러 (기존)
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

  // 업로드 완료 처리 (기존)
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
      
      onClosePreview();
      
    } catch (error) {
      console.error('Upload failed:', error);
      alert('업로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setUploadLoading(false);
    }
  };

  // 진료기록영상 파일 업로드 (기존)
  const handleImagingUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      setImagingFiles(files);
      if (files.length >= 2) {
        alert(`${files.length}개 파일이 업로드되었습니다.`);
      }
    }
  };

  // 진료기록영상 프로세스 단계별 처리 (기존)
  const handleImagingStep = (step) => {
    switch (step) {
      case 1:
        if (imagingFiles.length < 2) {
          alert('위임장과 동의서를 모두 업로드해주세요.');
          return;
        }
        setImagingStep(2);
        break;
      case 2:
        setImagingStep(3);
        alert('💿 CD가 발급되었습니다!');
        break;
      case 3:
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

  // 문서 액션 핸들러들 (기존)
  const handlePrint = () => {
    if (!documentData) return;
    
    const docNames = {
      'report_kor': '판독 결과지 (국문)',
      'report_eng': '판독 결과지 (영문)',
      'export_certificate': '반출 확인서',
      'exam_certificate': '검사 확인서',
      'consultation_request': '협진 의뢰서'
    };
    
    const docName = docNames[currentDocument] || '문서';
    alert(`🖨️ ${docName} 인쇄를 시작합니다.\n\n환자: ${documentData.patient_name}\n검사: ${documentData.modality} (${documentData.body_part})`);
  };

  const handleSave = () => {
    if (!documentData) return;
    
    const docNames = {
      'report_kor': '판독결과지_국문',
      'report_eng': '판독결과지_영문',
      'export_certificate': '반출확인서',
      'exam_certificate': '검사확인서',
      'consultation_request': '협진의뢰서'
    };
    
    const docName = docNames[currentDocument] || '문서';
    const fileName = `${documentData.patient_name}_${docName}_${new Date().toISOString().split('T')[0]}.pdf`;
    alert(`💾 PDF 저장이 완료되었습니다.\n\n파일명: ${fileName}`);
  };

  const handleMarkCompleted = () => {
    alert('✅ 문서 발급이 완료되었습니다!');
    onClosePreview();
  };

  // 뷰 모드에 따른 렌더링
  const renderContent = () => {
    switch (viewMode) {
      case 'upload':
        return (
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>📝 서명된 동의서 스캔 업로드</h3>
            <p style={{ marginBottom: '1rem', color: '#4a5568' }}>
              환자가 서명한 동의서를 스캔하여 업로드해주세요.
            </p>
            
            <div 
              className="upload-section" 
              onClick={() => fileInputRef.current?.click()}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📁</div>
              <p>파일을 드래그하거나 클릭하여 업로드</p>
              <p style={{ fontSize: '0.8rem', color: '#718096' }}>
                지원 형식: PDF, JPG, PNG (최대 10MB)
              </p>
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
                <p style={{ margin: 0, fontWeight: 500 }}>업로드된 파일:</p>
                <p style={{ margin: '0.5rem 0 0 0', color: '#4a5568' }}>
                  {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)}MB)
                </p>
              </div>
            )}
            
            <div className="action-buttons" style={{ marginTop: '1.5rem' }}>
              <button 
                className="btn btn-success" 
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
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>💿 진료기록영상 발급 프로세스</h3>
            
            <div className={`process-step ${imagingStep === 1 ? 'step-active' : imagingStep > 1 ? 'step-completed' : 'step-waiting'}`}>
              <h4>1단계: 필수 서류 제출</h4>
              <p>다음 서류를 스캔하여 업로드해주세요:</p>
              <ul style={{ margin: '0.5rem 0 0.5rem 1.5rem' }}>
                <li>진료기록 열람 및 사본발급 위임장</li>
                <li>진료기록 열람 및 사본발급 동의서</li>
              </ul>
              
              <div 
                className="upload-section" 
                onClick={() => imagingFileInputRef.current?.click()}
                style={{ margin: '1rem 0' }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📁</div>
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
                  <p>업로드된 파일: {imagingFiles.length}개</p>
                  {imagingFiles.map((file, index) => (
                    <p key={index} style={{ fontSize: '0.9rem', color: '#666' }}>
                      {file.name}
                    </p>
                  ))}
                </div>
              )}
              
              <button 
                className="btn btn-primary" 
                onClick={() => handleImagingStep(1)}
                disabled={imagingFiles.length < 2}
              >
                1단계 완료
              </button>
            </div>
            
            <div className={`process-step ${imagingStep === 2 ? 'step-active' : imagingStep > 2 ? 'step-completed' : 'step-waiting'}`}>
              <h4>2단계: CD/DVD 발급</h4>
              <p>서류 확인 후 진료기록영상을 발급합니다.</p>
              <button 
                className="btn btn-success" 
                onClick={() => handleImagingStep(2)}
                disabled={imagingStep < 2}
              >
                💿 CD 발급
              </button>
            </div>
            
            <div className={`process-step ${imagingStep === 3 ? 'step-active' : 'step-waiting'}`}>
              <h4>3단계: 반출 확인서</h4>
              <p>CD 수령시 반출 확인서에 서명이 필요합니다.</p>
              <button 
                className="btn btn-secondary" 
                onClick={() => handleImagingStep(3)}
                disabled={imagingStep < 3}
              >
                📋 반출 확인서 보기
              </button>
            </div>
            
            <div className="action-buttons" style={{ marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={onClosePreview}>
                닫기
              </button>
            </div>
          </div>
        );

      case 'document':
        // ✅ 수정: API 데이터 기반 렌더링
        if (loading) {
          return (
            <div style={{ padding: '1.5rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
                <h3>문서를 불러오는 중...</h3>
              </div>
            </div>
          );
        }

        if (error) {
          return (
            <div style={{ padding: '1.5rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
                <h3>오류 발생</h3>
                <p>{error}</p>
                <button className="btn btn-primary" onClick={loadDocumentData}>
                  다시 시도
                </button>
              </div>
            </div>
          );
        }

        if (!documentData) {
          return (
            <div style={{ padding: '1.5rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📄</div>
                <h3>문서를 선택해주세요</h3>
              </div>
            </div>
          );
        }

        return (
          <div style={{ padding: '1.5rem' }}>
            {/* ✅ 수정: API에서 받은 템플릿 사용 */}
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
          <div className="empty-preview" style={{ padding: '1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
            <h3>서류를 선택해주세요</h3>
            <p>좌측에서 서류를 클릭하면<br />여기에 내용이 표시됩니다.</p>
            <p style={{ color: '#718096', fontSize: '0.9rem' }}>
              현재 선택된 문서: {currentDocument || 'none'}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="document-preview">
      <div className="section-header">📄 생성서류 미리보기</div>
      {renderContent()}
    </div>
  );
};

export default DocumentPreview;