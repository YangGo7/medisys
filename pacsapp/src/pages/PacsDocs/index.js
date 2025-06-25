// import React, { useState, useRef } from 'react';
// import DocumentRequestList from '../../components/pacsdocs/DocumentRequestList';
// import DocumentPreview from '../../components/pacsdocs/DocumentPreview';
// import './PacsDocs.css';

// const PacsDocs = () => {
//   const [leftWidth, setLeftWidth] = useState(65); // 서류목록이 좀 더 넓게
//   const containerRef = useRef(null);
//   const isDragging = useRef(false);

//   // 문서 상태 관리
//   const [currentDocument, setCurrentDocument] = useState(null);
//   const [currentPatient, setCurrentPatient] = useState(null);

//   // 리사이즈 핸들링 (Dashboard와 동일한 로직)
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
    
//     // 최소/최대 크기 제한 (30% ~ 80%)
//     if (newLeftWidth >= 30 && newLeftWidth <= 80) {
//       setLeftWidth(newLeftWidth);
//     }
//   };

//   const handleMouseUp = () => {
//     isDragging.current = false;
//     document.removeEventListener('mousemove', handleMouseMove);
//     document.removeEventListener('mouseup', handleMouseUp);
//   };

//   // 문서 미리보기 표시 핸들러
//   const handleShowDocument = (docType, patientName, modality, bodyPart) => {
//     setCurrentDocument(docType);
//     setCurrentPatient({ name: patientName, modality, bodyPart });
//   };

//   // 미리보기 닫기 핸들러
//   const handleClosePreview = () => {
//     setCurrentDocument(null);
//     setCurrentPatient(null);
//   };

//   return (
//     <div className="pacsdocs-container">
//       {/* 메인 그리드 레이아웃 */}
//       <div 
//         className="pacsdocs-main" 
//         ref={containerRef}
//         style={{
//           gridTemplateColumns: `${leftWidth}% 4px ${100 - leftWidth}%`
//         }}
//       >
//         {/* 서류 요청 목록 섹션 */}
//         <div className="request-list-section">
//           {/* 임시 컨텐츠 - 나중에 <DocumentRequestList onShowDocument={handleShowDocument} />로 교체 */}
//           <div style={{ padding: '2rem', textAlign: 'center' }}>
//             <h3>📋 서류 요청 목록</h3>
//             <p>DocumentRequestList 컴포넌트가 여기에 들어갑니다.</p>
//             <div style={{ marginTop: '2rem', color: '#666' }}>
//               컴포넌트 파일을 생성하면 실제 기능이 동작합니다.
//             </div>
//           </div>
//         </div>
        
//         {/* 드래그 핸들 */}
//         <div 
//           className="resize-handle"
//           onMouseDown={handleMouseDown}
//         >
//           <div className="resize-line"></div>
//         </div>
        
//         {/* 서류 미리보기 섹션 */}
//         <div className="preview-section">
//           {/* 임시 컨텐츠 - 나중에 DocumentPreview 컴포넌트로 교체 */}
//           <div style={{ padding: '2rem', textAlign: 'center' }}>
//             <h3>📄 생성서류 미리보기</h3>
//             <p>DocumentPreview 컴포넌트가 여기에 들어갑니다.</p>
//             <div style={{ marginTop: '2rem', color: '#666' }}>
//               리사이즈 핸들을 드래그해서 크기를 조절해보세요!
//             </div>
//             {currentDocument && (
//               <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0f8ff', borderRadius: '8px' }}>
//                 현재 선택된 문서: {currentDocument}
//               </div>
//             )}
//           </div>
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

  const handleShowDocument = (docType, patientName, modality, bodyPart) => {
    setCurrentDocument(docType);
    setCurrentPatient({ name: patientName, modality, bodyPart });
  };

  const handleClosePreview = () => {
    setCurrentDocument(null);
    setCurrentPatient(null);
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
          <DocumentRequestList onShowDocument={handleShowDocument} />
        </div>

        {/* 중간: 리사이즈 핸들 */}
        <div className="resize-handle" onMouseDown={handleMouseDown}>
          <div className="resize-line"></div>
        </div>

        {/* 오른쪽: 미리보기 */}
        <div className="preview-section">
          <DocumentPreview
            documentType={currentDocument}
            patientInfo={currentPatient}
            onClose={handleClosePreview}
          />
          {currentDocument && (
            <div
              style={{
                marginTop: '1rem',
                padding: '1rem',
                background: '#f0f8ff',
                borderRadius: '8px',
              }}
            >
              현재 선택된 문서: {currentDocument}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PacsDocs;
