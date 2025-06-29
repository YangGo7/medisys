import React from 'react';

const PacsPage = () => {
  return (
    <div style={{ width: '100%', height: '100%', padding: 0, margin: 0 }}>
      <iframe
        src="http://35.225.63.41:8042"
        title="Orthanc PACS Viewer"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block'
        }}
      />
    </div>
  );
};

export default PacsPage;

// import React, { useEffect, useRef } from 'react';

// const PacsPage = () => {
//   const iframeRef = useRef(null);

//   useEffect(() => {
//     const handleIframeLoad = () => {
//       try {
//         const iframe = iframeRef.current;
//         if (iframe && iframe.contentDocument) {
//           const iframeDoc = iframe.contentDocument;
          
//           // 로고 숨기기 CSS 추가
//           const style = iframeDoc.createElement('style');
//           style.textContent = `
//             /* Orthanc 로고 숨기기 */
//             .navbar-brand,
//             .navbar-header .navbar-brand,
//             .navbar .navbar-brand,
//             [class*="orthanc"],
//             [class*="ORTHANC"],
//             img[src*="orthanc"],
//             img[src*="ORTHANC"],
//             .logo,
//             .brand-logo {
//               display: none !important;
//             }
            
//             /* 상단 네비게이션 바 조정 */
//             .navbar {
//               padding-left: 15px !important;
//             }
            
//             /* 전체 페이지 마진/패딩 제거 */
//             body, html {
//               margin: 0 !important;
//               padding: 0 !important;
//             }
//           `;
          
//           iframeDoc.head.appendChild(style);
//         }
//       } catch (error) {
//         // CORS 에러 등은 무시 (외부 도메인이라서 접근 불가능할 수 있음)
//         console.log('iframe 내용 접근 불가 (CORS)');
//       }
//     };

//     const iframe = iframeRef.current;
//     if (iframe) {
//       iframe.addEventListener('load', handleIframeLoad);
//       return () => iframe.removeEventListener('load', handleIframeLoad);
//     }
//   }, []);

//   return (
//     <div style={{ 
//       width: '100%', 
//       height: '100%', 
//       padding: 0, 
//       margin: 0,
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       bottom: 0
//     }}>
//       <iframe
//         ref={iframeRef}
//         src="http://35.225.63.41:8042"
//         title="Orthanc PACS Viewer"
//         style={{
//           width: '100%',
//           height: '100%',
//           border: 'none',
//           display: 'block',
//           margin: 0,
//           padding: 0
//         }}
//       />
//     </div>
//   );
// };

// export default PacsPage;