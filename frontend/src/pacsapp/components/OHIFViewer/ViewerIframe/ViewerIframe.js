// src/components/OHIFViewer/ViewerIframe/ViewerIframe.js
// 🔥 OHIF 스터디 변경 감지 및 창 포커스 관리 기능 추가

// import React, { useEffect, useState, useRef, useCallback } from 'react';
// import AnnotationOverlay from '../AnnotationTools/AnnotationOverlay';
// import { transformBoundingBox } from '../../../utils/coordinateTransform';
// import styles from './ViewerIframe.module.css';

// const ViewerIframe = ({
//   // AI 오버레이 관련
//   analysisResults,
//   overlays,
//   showOverlays,
//   onRecalculateOverlays,

//   // 어노테이션 관련 (AnnotationOverlay에 전달)
//   annotationProps,

//   // 🔥 스터디 연동 관련 추가
//   currentStudyUID,
//   onStudyChange, // OHIF에서 스터디 변경 시 호출될 콜백

//   // 설정
//   ohifUrl = "http://localhost:3000/viewer",
//   showDebugInfo = false,
//   isLoading = false,
//   error = null
// }) => {
//   // 🔥 디버깅 로그 추가
//   console.log('📺 ViewerIframe 렌더링 시작:', {
//     overlays: overlays?.length || 0,
//     showOverlays,
//     currentStudyUID, // 🔥 추가
//     overlaysData: overlays
//   });

//   const iframeRef = useRef(null);
//   const [resizeTimer, setResizeTimer] = useState(null);
//   const [debugInfo, setDebugInfo] = useState({});

//   // 🔥 동적 z-index 관리
//   const [activeLayer, setActiveLayer] = useState('iframe');

//   // 🔥 스터디 변경 감지 상태
//   const [lastDetectedStudyUID, setLastDetectedStudyUID] = useState(null);

//   // 🔥 OHIF 기본 URL 받기
//   const ohifBaseUrl = ohifUrl.includes('viewer?') ? ohifUrl.split('viewer?')[0] : ohifUrl;

//   // 🔥 창 포커스 관리 (바운딩 박스 숨김 처리)
//   const [isWindowFocused, setIsWindowFocused] = useState(true);

//   // 동적 z-index 계산 함수
//   const getZIndex = (layer) => {
//     const baseZIndex = {
//       iframe: 100,
//       ai: 200,
//       annotation: 300,
//       modal: 400
//     };

//     // 활성 레이어는 +1000
//     return activeLayer === layer ? baseZIndex[layer] + 1000 : baseZIndex[layer];
//   };

//   // 🔥 OHIF iframe과의 postMessage 통신 설정
//   useEffect(() => {
//     const handleMessage = (event) => {
//       // OHIF에서 오는 메시지만 처리 (보안)
//       const ohifOrigin = new URL(ohifUrl).origin;
//       if (event.origin !== ohifOrigin) {
//         return;
//       }

//       console.log('📨 OHIF에서 메시지 수신:', event.data);

//       // 스터디 변경 메시지 처리
//       if (event.data.type === 'STUDY_CHANGED') {
//         const newStudyUID = event.data.studyUID;
        
//         console.log('🔄 OHIF에서 스터디 변경 감지:', {
//           from: lastDetectedStudyUID,
//           to: newStudyUID
//         });

//         // 중복 호출 방지
//         if (newStudyUID && newStudyUID !== lastDetectedStudyUID) {
//           setLastDetectedStudyUID(newStudyUID);
          
//           // 부모 컴포넌트에 스터디 변경 알림
//           if (onStudyChange) {
//             onStudyChange(newStudyUID);
//           }

//           // 디버그 정보 업데이트
//           if (showDebugInfo) {
//             setDebugInfo(prev => ({
//               ...prev,
//               lastStudyChange: new Date().toLocaleTimeString(),
//               detectedStudyUID: newStudyUID,
//               messageCount: (prev.messageCount || 0) + 1
//             }));
//           }
//         }
//       }

//       // 뷰포트 변경 메시지 처리 (오버레이 재계산용)
//       if (event.data.type === 'VIEWPORT_CHANGED' || event.data.type === 'IMAGE_CHANGED') {
//         console.log('🖼️ OHIF에서 뷰포트/이미지 변경 감지');
        
//         // 오버레이 재계산
//         if (overlays.length > 0 && showOverlays && onRecalculateOverlays) {
//           setTimeout(() => {
//             onRecalculateOverlays();
//           }, 100); // 약간의 지연으로 OHIF 렌더링 완료 후 계산
//         }
//       }
//     };

//     // 메시지 리스너 등록
//     window.addEventListener('message', handleMessage);

//     // 정리
//     return () => {
//       window.removeEventListener('message', handleMessage);
//     };
//   }, [ohifUrl, lastDetectedStudyUID, onStudyChange, overlays.length, showOverlays, onRecalculateOverlays, showDebugInfo]);

//   // 🔥 OHIF URL에서 스터디 UID 추출 함수 (정확한 파라미터명 사용)
//   const extractStudyUIDFromURL = useCallback((url) => {
//     try {
//       const urlObj = new URL(url);
      
//       // OHIF는 'StudyInstanceUIDs' 파라미터 사용 (대소문자 정확히)
//       let studyParam = urlObj.searchParams.get('StudyInstanceUIDs');
//       if (!studyParam) {
//         // 소문자 버전도 체크
//         studyParam = urlObj.searchParams.get('studyInstanceUIDs');
//       }
      
//       if (studyParam) {
//         const studyUID = studyParam.split(',')[0]; // 여러 스터디인 경우 첫 번째
//         console.log('📋 URL 파라미터에서 스터디 UID 추출:', studyUID);
//         return studyUID;
//       }
      
//       // URL 경로에서 추출 시도
//       const pathParts = urlObj.pathname.split('/').filter(Boolean);
//       const viewerIndex = pathParts.findIndex(part => part === 'viewer' || part === 'studies');
      
//       if (viewerIndex !== -1 && pathParts[viewerIndex + 1]) {
//         const studyUID = pathParts[viewerIndex + 1];
//         console.log('📋 URL 경로에서 스터디 UID 추출:', studyUID);
//         return studyUID;
//       }
      
//       console.log('⚠️ URL에서 스터디 UID를 찾을 수 없음:', url);
//       return null;
//     } catch (error) {
//       console.error('❌ URL 파싱 오류:', error);
//       return null;
//     }
//   }, []);

//   // 🔥 OHIF URL에서 스터디 UID 추출 및 초기 동기화
//   useEffect(() => {
//     // 초기 로드 시 ohifUrl에서 스터디 UID 추출
//     const extractedStudyUID = extractStudyUIDFromURL(ohifUrl);
    
//     if (extractedStudyUID && extractedStudyUID !== lastDetectedStudyUID) {
//       console.log('🔍 초기 OHIF URL에서 스터디 감지:', {
//         url: ohifUrl,
//         studyUID: extractedStudyUID
//       });
      
//       setLastDetectedStudyUID(extractedStudyUID);
      
//       // 부모 컴포넌트에 스터디 변경 알림
//       if (onStudyChange) {
//         onStudyChange(extractedStudyUID);
//       }
//     }
//   }, [ohifUrl, extractStudyUIDFromURL, lastDetectedStudyUID, onStudyChange]);

//   // 🔥 간소화된 URL 변경 감지 (무한 렌더링 방지)
//   useEffect(() => {
//     // 기본 URL이면 스터디 감지 건너뜀
//     if (!ohifUrl || ohifUrl === ohifBaseUrl) {
//       console.log('📺 기본 URL - 스터디 감지 건너뜀');
//       return;
//     }
    
//     console.log('📺 OHIF URL 확인:', ohifUrl);
    
//     const extractedStudyUID = extractStudyUIDFromURL(ohifUrl);
    
//     if (extractedStudyUID && extractedStudyUID !== lastDetectedStudyUID) {
//       console.log('🎯 새 스터디 감지!', {
//         url: ohifUrl,
//         studyUID: extractedStudyUID
//       });
      
//       setLastDetectedStudyUID(extractedStudyUID);
      
//       // 부모 컴포넌트에 스터디 변경 알림
//       if (onStudyChange) {
//         onStudyChange(extractedStudyUID);
//       }
//     }
//   }, [ohifUrl, ohifBaseUrl]); // 🔥 의존성 최소화

//   // 🔥 창 포커스 관리 (바운딩 박스 숨김 처리) - 개선된 버전
//   useEffect(() => {
//     const handleWindowBlur = () => {
//       console.log('🌫️ 창 포커스 잃음 (blur) - 오버레이 숨김');
//       setIsWindowFocused(false);
//     };

//     const handleWindowFocus = () => {
//       console.log('🌟 창 포커스 복원 (focus) - 오버레이 표시');
//       setIsWindowFocused(true);
      
//       // 오버레이 다시 표시될 때 위치 재계산
//       if (onRecalculateOverlays) {
//         setTimeout(() => {
//           onRecalculateOverlays();
//         }, 100);
//       }
//     };

//     // 🔥 추가: visibilitychange 이벤트로 탭 전환 감지
//     const handleVisibilityChange = () => {
//       if (document.hidden) {
//         console.log('🌫️ 탭 숨김 감지 - 오버레이 숨김');
//         setIsWindowFocused(false);
//       } else {
//         console.log('🌟 탭 표시 감지 - 오버레이 표시');
//         setIsWindowFocused(true);
        
//         if (onRecalculateOverlays) {
//           setTimeout(() => {
//             onRecalculateOverlays();
//           }, 100);
//         }
//       }
//     };

//     // 🔥 추가: 마우스가 창을 떠날 때도 감지 (보조적)
//     const handleMouseLeave = () => {
//       // 마우스가 창을 떠난 후 약간의 지연을 두고 체크
//       setTimeout(() => {
//         if (!document.hasFocus()) {
//           console.log('🌫️ 마우스 leave + 포커스 없음 - 오버레이 숨김');
//           setIsWindowFocused(false);
//         }
//       }, 100);
//     };

//     const handleMouseEnter = () => {
//       if (document.hasFocus()) {
//         console.log('🌟 마우스 enter + 포커스 있음 - 오버레이 표시');
//         setIsWindowFocused(true);
//       }
//     };

//     // 이벤트 등록
//     window.addEventListener('blur', handleWindowBlur);
//     window.addEventListener('focus', handleWindowFocus);
//     document.addEventListener('visibilitychange', handleVisibilityChange);
//     document.addEventListener('mouseleave', handleMouseLeave);
//     document.addEventListener('mouseenter', handleMouseEnter);

//     // 🔥 디버깅: 초기 상태 확인
//     console.log('🔍 초기 포커스 상태:', {
//       hasFocus: document.hasFocus(),
//       hidden: document.hidden,
//       visibilityState: document.visibilityState
//     });

//     return () => {
//       window.removeEventListener('blur', handleWindowBlur);
//       window.removeEventListener('focus', handleWindowFocus);
//       document.removeEventListener('visibilitychange', handleVisibilityChange);
//       document.removeEventListener('mouseleave', handleMouseLeave);
//       document.removeEventListener('mouseenter', handleMouseEnter);
//     };
//   }, [onRecalculateOverlays]);

//   // 🔥 실제 렌더링 조건 확인
//   console.log('📺 AI 오버레이 렌더링 조건:', {
//     showOverlays,
//     overlaysLength: overlays?.length || 0,
//     isWindowFocused,
//     willRender: showOverlays && isWindowFocused && overlays?.length > 0
//   });

//   // 🔥 창 크기 변경 감지 및 오버레이 재계산 (기존 코드 유지)
//   useEffect(() => {
//     const iframe = iframeRef.current;
//     if (!iframe) return;

//     // ResizeObserver로 iframe 크기 변경 감지
//     const resizeObserver = new ResizeObserver(() => {
//       handleResize('iframe 크기 변경');
//     });

//     // Window resize 이벤트로 전체 창 크기 변경 감지
//     const handleWindowResize = () => {
//       handleResize('윈도우 크기 변경');
//     };

//     // 디바운싱된 리사이즈 핸들러
//     const handleResize = (source) => {
//       if (resizeTimer) clearTimeout(resizeTimer);

//       const timer = setTimeout(() => {
//         if (overlays.length > 0 && showOverlays) {
//           console.log(`🔄 ${source} 감지 - 오버레이 재계산`);

//           // 디버그 정보 업데이트
//           if (showDebugInfo) {
//             const rect = iframe.getBoundingClientRect();
//             setDebugInfo(prev => ({
//               ...prev,
//               source,
//               iframeSize: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
//               overlayCount: overlays.length,
//               timestamp: new Date().toLocaleTimeString(),
//               activeLayer,
//               currentStudyUID // 🔥 추가
//             }));
//           }

//           // overlays 강제 리렌더링으로 위치 재계산
//           if (onRecalculateOverlays) {
//             onRecalculateOverlays();
//           }
//         }
//       }, 150); // 150ms 디바운싱

//       setResizeTimer(timer);
//     };

//     // 이벤트 등록
//     resizeObserver.observe(iframe);
//     window.addEventListener('resize', handleWindowResize);

//     // 정리
//     return () => {
//       resizeObserver.disconnect();
//       window.removeEventListener('resize', handleWindowResize);
//       if (resizeTimer) clearTimeout(resizeTimer);
//     };
//   }, [overlays.length, showOverlays, resizeTimer, onRecalculateOverlays, showDebugInfo, currentStudyUID]);

//   // iframe 로딩 완료 핸들러
//   const handleIframeLoad = () => {
//     console.log('OHIF iframe 로딩 완료');

//     if (showDebugInfo) {
//       setDebugInfo(prev => ({
//         ...prev,
//         iframeLoaded: true,
//         loadTime: new Date().toLocaleTimeString()
//       }));
//     }
//   };

//   // iframe 에러 핸들러
//   const handleIframeError = () => {
//     console.error('OHIF iframe 로딩 실패');

//     if (showDebugInfo) {
//       setDebugInfo(prev => ({
//         ...prev,
//         iframeError: true,
//         errorTime: new Date().toLocaleTimeString()
//       }));
//     }
//   };

//   // 🔥 레이어 활성화 핸들러들
//   const handleIframeClick = () => {
//     console.log('🖱️ iframe 클릭 - iframe 레이어 활성화');
//     setActiveLayer('iframe');
//   };

//   const handleAIOverlayClick = () => {
//     console.log('🖱️ AI 오버레이 클릭 - AI 레이어 활성화');
//     setActiveLayer('ai');
//   };

//   const handleAnnotationStart = () => {
//     console.log('✏️ 어노테이션 그리기 시작 - 어노테이션 레이어 활성화');
//     setActiveLayer('annotation');
//   };

//   const handleModalOpen = () => {
//     console.log('📋 모달 열림 - 모달 레이어 활성화');
//     setActiveLayer('modal');
//   };

//   return (
//     <div
//       className={styles.viewerContainer}
//       style={{
//         // 🔥 CSS 변수로 동적 z-index 전달
//         '--z-iframe': getZIndex('iframe'),
//         '--z-ai': getZIndex('ai'),
//         '--z-annotation': getZIndex('annotation'),
//         '--z-modal': getZIndex('modal')
//       }}
//     >

//       {/* OHIF Viewer */}
//       <iframe
//         ref={iframeRef}
//         src={ohifUrl}
//         className={styles.ohifIframe}
//         title="OHIF Viewer"
//         onLoad={handleIframeLoad}
//         onError={handleIframeError}
//         onClick={handleIframeClick}
//       />

//       {/* 로딩 오버레이 */}
//       {isLoading && (
//         <div className={styles.loadingOverlay}>
//           <div className={styles.loadingSpinner}></div>
//           분석 중...
//         </div>
//       )}

//       {/* 에러 오버레이 */}
//       {error && (
//         <div className={styles.errorOverlay}>
//           ❌오류 발생<br />
//           {error}
//         </div>
//       )}

//       {/* 어노테이션 오버레이 */}
//       <AnnotationOverlay
//         {...annotationProps}
//         onDrawingStart={handleAnnotationStart}
//         onModalOpen={handleModalOpen}
//       />

//       {/* 🔥 창 포커스가 있을 때만 AI 결과 오버레이 표시 */}
//       {showOverlays && isWindowFocused && (
//         <div
//           className={styles.aiOverlayContainer}
//           onClick={handleAIOverlayClick}
//         >
//           {console.log('📺 실제 map 실행, overlays:', overlays)}
//           {overlays.map((overlay, index) => {
//             console.log(`📺 렌더링 중 [${index}]:`, overlay);
            
//             // 해상도 정보 추출 (우선순위: overlay > analysisResults)
//             const imageWidth = overlay.image_width || analysisResults?.image_width;
//             const imageHeight = overlay.image_height || analysisResults?.image_height;

//             console.log(`🔍 Overlay[${index}] 해상도:`, { imageWidth, imageHeight });

//             const transformedBox = transformBoundingBox(overlay.bbox, imageWidth, imageHeight, iframeRef.current);

//             console.log(`📐 Overlay[${index}] 변환된 박스:`, transformedBox);

//             if (!transformedBox) {
//               console.log(`❌ Overlay[${index}] 변환 실패 - 렌더링 건너뜀`);
//               return null;
//             }

//             const isHighConfidence = overlay.confidence > 0.8;
//             const isSmallBox = transformedBox.height <= 25;

//             console.log(`✅ Overlay[${index}] 렌더링 실행:`, {
//               left: transformedBox.left,
//               top: transformedBox.top,
//               width: transformedBox.width,
//               height: transformedBox.height,
//               isHighConfidence,
//               isSmallBox
//             });

//             return (
//               <div
//                 key={`${index}-${overlay.bbox.join('-')}`}
//                 className={`${styles.aiOverlayBox} ${isHighConfidence ? styles.aiOverlayBoxHigh : styles.aiOverlayBoxLow
//                   } ${isSmallBox ? styles.aiOverlayBoxSmall : ''}`}
//                 style={{
//                   left: transformedBox.left + 'px',
//                   top: transformedBox.top + 'px',
//                   width: transformedBox.width + 'px',
//                   height: transformedBox.height + 'px'
//                 }}
//               >
//                 {!isSmallBox && (
//                   <div className={`${styles.aiOverlayLabel} ${isHighConfidence ? styles.aiOverlayLabelHigh : styles.aiOverlayLabelLow
//                     }`}>
//                     {overlay.label} ({Math.round(overlay.confidence * 100)}%)
//                   </div>
//                 )}
//               </div>
//             );
//           })}
//         </div>
//       )}

//       {/* 🔥 디버그 정보 (스터디 연동 정보 추가) */}
//       {showDebugInfo && (
//         <div className={`${styles.debugInfo} ${Object.keys(debugInfo).length === 0 ? styles.hidden : ''}`}>
//           <div><strong>🐛 디버그 정보</strong></div>
//           <div><strong>📂 현재 스터디:</strong> {currentStudyUID || 'none'}</div>
//           <div><strong>🔍 감지된 스터디:</strong> {lastDetectedStudyUID || 'none'}</div>
//           <div><strong>🪟 창 포커스:</strong> {isWindowFocused ? '✅' : '❌'}</div>
//           {Object.entries(debugInfo).map(([key, value]) => (
//             <div key={key}>
//               <strong>{key}:</strong> {typeof value === 'boolean' ? (value ? '✅' : '❌') : value}
//             </div>
//           ))}
//           <div><strong>overlays:</strong> {overlays.length}개</div>
//           <div><strong>showOverlays:</strong> {showOverlays ? '✅' : '❌'}</div>
//           <div><strong>🎯 활성 레이어:</strong> {activeLayer}</div>
//           <div><strong>📊 z-index:</strong>
//             iframe({getZIndex('iframe')}),
//             ai({getZIndex('ai')}),
//             annotation({getZIndex('annotation')}),
//             modal({getZIndex('modal')})
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default ViewerIframe;

// src/components/OHIFViewer/ViewerIframe/ViewerIframe.js
import React, { useEffect, useState, useRef, useCallback } from 'react';
import AnnotationOverlay from '../AnnotationTools/AnnotationOverlay';
import { transformBoundingBox } from '../../../utils/coordinateTransform';
import styles from './ViewerIframe.module.css';

const ViewerIframe = ({
  // AI 오버레이 관련
  analysisResults,
  overlays,
  showOverlays,
  onRecalculateOverlays,

  // 어노테이션 관련
  annotationProps,

  // 스터디 연동 관련
  currentStudyUID,
  onStudyChange,

  // 설정
  ohifUrl = "http://localhost:8042/ohif/",
  showDebugInfo = false,
  isLoading = false,
  error = null
}) => {
  console.log('📺 ViewerIframe 렌더링:', {
    overlays: overlays?.length || 0,
    showOverlays,
    currentStudyUID,
    ohifUrl
  });

  const iframeRef = useRef(null);
  const [resizeTimer, setResizeTimer] = useState(null);
  const [activeLayer, setActiveLayer] = useState('iframe');
  const [isWindowFocused, setIsWindowFocused] = useState(true); // 기본값을 true로 설정

  // 동적 z-index 계산
  const getZIndex = (layer) => {
    const baseZIndex = { iframe: 100, ai: 200, annotation: 300, modal: 400 };
    return activeLayer === layer ? baseZIndex[layer] + 1000 : baseZIndex[layer];
  };

  // 창 포커스 관리 - 더 관대하게 설정
  useEffect(() => {
    const handleWindowBlur = () => {
      console.log('🌫️ 창 포커스 잃음');
      // 포커스를 잃어도 오버레이는 계속 보이도록 설정
      // setIsWindowFocused(false);
    };

    const handleWindowFocus = () => {
      console.log('🌟 창 포커스 복원');
      setIsWindowFocused(true);
      if (onRecalculateOverlays) {
        setTimeout(() => onRecalculateOverlays(), 100);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('🌫️ 탭 숨김');
        // 탭이 숨겨져도 오버레이는 계속 보이도록 설정
        // setIsWindowFocused(false);
      } else {
        console.log('🌟 탭 표시');
        setIsWindowFocused(true);
        if (onRecalculateOverlays) {
          setTimeout(() => onRecalculateOverlays(), 100);
        }
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onRecalculateOverlays]);

  // 리사이즈 감지
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      const timer = setTimeout(() => {
        if (overlays.length > 0 && showOverlays && onRecalculateOverlays) {
          console.log('🔄 리사이즈 감지 - 오버레이 재계산');
          onRecalculateOverlays();
        }
      }, 150);
      setResizeTimer(timer);
    });

    const handleWindowResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      const timer = setTimeout(() => {
        if (overlays.length > 0 && showOverlays && onRecalculateOverlays) {
          console.log('🔄 윈도우 리사이즈 - 오버레이 재계산');
          onRecalculateOverlays();
        }
      }, 150);
      setResizeTimer(timer);
    };

    resizeObserver.observe(iframe);
    window.addEventListener('resize', handleWindowResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [overlays.length, showOverlays, onRecalculateOverlays, resizeTimer]);

  // 핸들러들
  const handleIframeLoad = () => {
    console.log('📺 OHIF iframe 로딩 완료');
    // iframe 로딩 완료 후 오버레이 재계산
    if (onRecalculateOverlays && overlays.length > 0) {
      setTimeout(() => onRecalculateOverlays(), 500);
    }
  };

  const handleIframeError = () => {
    console.error('❌ OHIF iframe 로딩 실패');
  };

  const handleIframeClick = () => {
    setActiveLayer('iframe');
  };

  const handleAIOverlayClick = () => {
    setActiveLayer('ai');
  };

  const handleAnnotationStart = () => {
    setActiveLayer('annotation');
  };

  const handleModalOpen = () => {
    setActiveLayer('modal');
  };

  // 오버레이 강제 표시 함수
  const forceShowOverlays = () => {
    console.log('🔥 오버레이 강제 표시');
    setIsWindowFocused(true);
    if (onRecalculateOverlays) {
      onRecalculateOverlays();
    }
  };

  return (
    <div
      className={styles.viewerContainer}
      style={{
        '--z-iframe': getZIndex('iframe'),
        '--z-ai': getZIndex('ai'),
        '--z-annotation': getZIndex('annotation'),
        '--z-modal': getZIndex('modal')
      }}
    >
      {/* OHIF Viewer */}
      <iframe
        ref={iframeRef}
        src={ohifUrl}
        className={styles.ohifIframe}
        title="OHIF Viewer"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        onClick={handleIframeClick}
      />

      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner}></div>
          분석 중...
        </div>
      )}

      {/* 에러 오버레이 */}
      {error && (
        <div className={styles.errorOverlay}>
          ❌ 오류 발생<br />
          {error}
        </div>
      )}

      {/* 어노테이션 오버레이 */}
      <AnnotationOverlay
        {...annotationProps}
        onDrawingStart={handleAnnotationStart}
        onModalOpen={handleModalOpen}
      />

      {/* 🔥 AI 오버레이 - 강제 표시 모드 */}
      {console.log('🔥 오버레이 렌더링 체크:', {
        showOverlays,
        overlaysLength: overlays?.length || 0,
        isWindowFocused,
        overlaysData: overlays
      })}
      
      {/* 🚨 임시: showOverlays 조건 무시하고 강제 표시 */}
      {overlays && overlays.length > 0 && (
        <div
          className={styles.aiOverlayContainer}
          onClick={handleAIOverlayClick}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'auto', // 마우스 이벤트 활성화
            zIndex: 200,
            // 디버깅을 위한 배경색 추가
            backgroundColor: showDebugInfo ? 'rgba(255, 0, 0, 0.05)' : 'transparent'
          }}
        >
          {overlays.map((overlay, index) => {
            console.log(`🎯 오버레이 [${index}] 렌더링:`, overlay);
            
            const imageWidth = overlay.image_width || analysisResults?.image_width;
            const imageHeight = overlay.image_height || analysisResults?.image_height;

            console.log(`📐 해상도 [${index}]:`, { imageWidth, imageHeight });

            const transformedBox = transformBoundingBox(overlay.bbox, imageWidth, imageHeight, iframeRef.current);

            console.log(`📦 변환된 박스 [${index}]:`, transformedBox);

            if (!transformedBox) {
              console.log(`❌ 박스 변환 실패 [${index}]`);
              return null;
            }

            const isHighConfidence = overlay.confidence > 0.8;
            const isSmallBox = transformedBox.height <= 25;

            return (
              <div
                key={`overlay-${index}-${overlay.bbox.join('-')}`}
                style={{
                  position: 'absolute',
                  left: transformedBox.left + 'px',
                  top: transformedBox.top + 'px',
                  width: transformedBox.width + 'px',
                  height: transformedBox.height + 'px',
                  border: `3px solid ${isHighConfidence ? '#00ff00' : '#ffff00'}`,
                  backgroundColor: 'rgba(255, 0, 0, 0.1)',
                  pointerEvents: 'auto',
                  boxSizing: 'border-box',
                  // 강제 표시를 위한 스타일 추가
                  display: 'block !important',
                  visibility: 'visible !important',
                  opacity: 1
                }}
                onClick={() => console.log(`🎯 오버레이 [${index}] 클릭됨:`, overlay)}
              >
                {!isSmallBox && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-25px',
                      left: '0',
                      background: isHighConfidence ? '#00ff00' : '#ffff00',
                      color: '#000',
                      padding: '2px 6px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      borderRadius: '3px'
                    }}
                  >
                    {overlay.label} ({Math.round(overlay.confidence * 100)}%)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 디버그 정보 및 오버레이 강제 표시 버튼 */}
      {showDebugInfo && (
        <div className={styles.debugInfo}>
          <div><strong>🐛 디버그 정보</strong></div>
          <div><strong>📂 현재 스터디:</strong> {currentStudyUID || 'none'}</div>
          <div><strong>🪟 창 포커스:</strong> {isWindowFocused ? '✅' : '❌'}</div>
          <div><strong>overlays:</strong> {overlays?.length || 0}개</div>
          <div><strong>showOverlays:</strong> {showOverlays ? '✅' : '❌'}</div>
          <div><strong>🎯 활성 레이어:</strong> {activeLayer}</div>
          <button 
            onClick={forceShowOverlays}
            style={{
              margin: '5px 0',
              padding: '5px 10px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            🔥 오버레이 강제 표시
          </button>
        </div>
      )}

      {/* 임시 오버레이 테스트 (개발용) */}
      {showDebugInfo && (
        <div
          style={{
            position: 'absolute',
            top: '50px',
            left: '50px',
            width: '100px',
            height: '100px',
            border: '3px solid red',
            backgroundColor: 'rgba(255, 0, 0, 0.2)',
            zIndex: 999,
            pointerEvents: 'auto'
          }}
        >
          <div style={{ color: 'red', fontWeight: 'bold' }}>테스트 오버레이</div>
        </div>
      )}
    </div>
  );
};

export default ViewerIframe;