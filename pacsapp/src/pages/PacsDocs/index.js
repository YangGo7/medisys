// import React, { useState, useRef } from 'react';
// import DocumentRequestList from '../../components/pacsdocs/DocumentRequestList';
// import DocumentPreview from '../../components/pacsdocs/DocumentPreview';
// import './PacsDocs.css';

// const PacsDocs = () => {
//   const [leftWidth, setLeftWidth] = useState(65);
//   const containerRef = useRef(null);
//   const isDragging = useRef(false);

//   const [currentDocument, setCurrentDocument] = useState(null);
//   const [currentPatient, setCurrentPatient] = useState(null);

//   const handleMouseDown = (e) => {
//     isDragging.current = true;
//     document.addEventListener('mousemove', handleMouseMove);
//     document.addEventListener('mouseup', handleMouseUp);
//   };

//   const handleMouseMove = (e) => {
//     if (!isDragging.current || !containerRef.current) return;

//     const container = containerRef.current;
//     const containerRect = container.getBoundingClientRect();
//     const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

//     if (newLeftWidth >= 30 && newLeftWidth <= 80) {
//       setLeftWidth(newLeftWidth);
//     }
//   };

//   const handleMouseUp = () => {
//     isDragging.current = false;
//     document.removeEventListener('mousemove', handleMouseMove);
//     document.removeEventListener('mouseup', handleMouseUp);
//   };

//   const handleShowDocument = (docType, patientName, modality, bodyPart) => {
//     setCurrentDocument(docType);
//     setCurrentPatient({ name: patientName, modality, bodyPart });
//   };

//   const handleClosePreview = () => {
//     setCurrentDocument(null);
//     setCurrentPatient(null);
//   };

//   return (
//     <div className="pacsdocs-container">
//       <div
//         className="pacsdocs-main"
//         ref={containerRef}
//         style={{
//           gridTemplateColumns: `${leftWidth}% 4px ${100 - leftWidth}%`,
//         }}
//       >
//         {/* 왼쪽: 요청 목록 */}
//         <div className="request-list-section">
//           <DocumentRequestList onShowDocument={handleShowDocument} />
//         </div>

//         {/* 중간: 리사이즈 핸들 */}
//         <div className="resize-handle" onMouseDown={handleMouseDown}>
//           <div className="resize-line"></div>
//         </div>

//         {/* 오른쪽: 미리보기 */}
//         <div className="preview-section">
//           <DocumentPreview
//             documentType={currentDocument}
//             patientInfo={currentPatient}
//             onClose={handleClosePreview}
//           />
//           {currentDocument && (
//             <div
//               style={{
//                 marginTop: '1rem',
//                 padding: '1rem',
//                 background: '#f0f8ff',
//                 borderRadius: '8px',
//               }}
//             >
//               현재 선택된 문서: {currentDocument}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default PacsDocs;

import React, { useState, useRef } from 'react';
import DocumentRequestList from '../../components/pacsdocs/DocumentRequestList';
import DocumentPreview from '../../components/pacsdocs/DocumentPreview';
import './PacsDocs.css';

const PacsDocs = () => {
  const [leftWidth, setLeftWidth] = useState(65);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const [currentDocument, setCurrentDocument] = useState(null);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [currentStudyId, setCurrentStudyId] = useState(null); // ✅ 추가: studyId 상태
  const [viewMode, setViewMode] = useState('empty'); // ✅ 추가: viewMode 상태

  const handleMouseDown = (e) => {
    isDragging.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current || !containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    if (newLeftWidth >= 30 && newLeftWidth <= 80) {
      setLeftWidth(newLeftWidth);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // ✅ 수정: studyId 파라미터 추가
  const handleShowDocument = (docType, patientName, modality, bodyPart, studyId) => {
    console.log('📄 PacsDocs: 문서 미리보기 요청', {
      docType,
      patientName,
      modality,
      bodyPart,
      studyId
    });

    setCurrentDocument(docType);
    setCurrentPatient({ name: patientName, modality, bodyPart });
    setCurrentStudyId(studyId); // ✅ studyId 저장
    setViewMode('document'); // ✅ viewMode 설정
  };

  // ✅ 추가: 동의서 업로드 핸들러
  const handleShowUpload = (docType, patientName, modality, bodyPart) => {
    console.log('📝 PacsDocs: 동의서 업로드 요청', {
      docType,
      patientName,
      modality,
      bodyPart
    });

    setCurrentDocument(docType);
    setCurrentPatient({ name: patientName, modality, bodyPart });
    setCurrentStudyId(null); // 업로드는 studyId 불필요
    setViewMode('upload'); // ✅ 업로드 모드
  };

  // ✅ 추가: 진료기록영상 프로세스 핸들러
  const handleShowImagingProcess = (patientName, modality, bodyPart) => {
    console.log('💿 PacsDocs: 진료기록영상 프로세스 요청', {
      patientName,
      modality,
      bodyPart
    });

    setCurrentDocument('imaging_cd');
    setCurrentPatient({ name: patientName, modality, bodyPart });
    setCurrentStudyId(null); // 프로세스는 studyId 불필요
    setViewMode('imaging'); // ✅ 진료기록영상 모드
  };

  const handleClosePreview = () => {
    console.log('✅ PacsDocs: 미리보기 닫기');
    
    setCurrentDocument(null);
    setCurrentPatient(null);
    setCurrentStudyId(null); // ✅ studyId 초기화
    setViewMode('empty'); // ✅ viewMode 초기화
  };

  return (
    <div className="pacsdocs-container">
      <div
        className="pacsdocs-main"
        ref={containerRef}
        style={{
          gridTemplateColumns: `${leftWidth}% 4px ${100 - leftWidth}%`,
        }}
      >
        {/* 왼쪽: 요청 목록 */}
        <div className="request-list-section">
          <DocumentRequestList 
            onShowDocument={handleShowDocument} // ✅ studyId 포함된 핸들러
            onShowUpload={handleShowUpload} // ✅ 동의서 업로드 핸들러
            onShowImagingProcess={handleShowImagingProcess} // ✅ 진료기록영상 핸들러
          />
        </div>

        {/* 중간: 리사이즈 핸들 */}
        <div className="resize-handle" onMouseDown={handleMouseDown}>
          <div className="resize-line"></div>
        </div>

        {/* 오른쪽: 미리보기 */}
        <div className="preview-section">
          <DocumentPreview
            currentDocument={currentDocument} // ✅ prop 이름 수정
            currentPatient={currentPatient} // ✅ prop 이름 수정
            studyId={currentStudyId} // ✅ studyId 전달
            viewMode={viewMode} // ✅ viewMode 전달
            onClosePreview={handleClosePreview} // ✅ prop 이름 수정
          />
          
          {/* ✅ 디버깅용 정보 표시 */}
          {(currentDocument || currentStudyId) && (
            <div
              style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                padding: '0.5rem',
                background: '#f0f8ff',
                borderRadius: '4px',
                fontSize: '0.8rem',
                color: '#4a5568',
                border: '1px solid #e2e8f0'
              }}
            >
              현재 선택된 문서: {currentDocument || 'none'}<br/>
              Study ID: {currentStudyId || 'none'}<br/>
              View Mode: {viewMode}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PacsDocs;