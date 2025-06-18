

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
  ohifUrl = "http://35.225.63.41:8042/ohif/",
  showDebugInfo = false,
  isLoading = false,
  error = null
}) => { // ViewerIframe 랜더링 로그 
  // console.log('📺 ViewerIframe 렌더링:', {
  //   overlays: overlays?.length || 0,
  //   showOverlays,
  //   currentStudyUID,
  //   ohifUrl
  // });

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
  // const forceShowOverlays = () => {
  //   console.log('🔥 오버레이 강제 표시');
  //   setIsWindowFocused(true);
  //   if (onRecalculateOverlays) {
  //     onRecalculateOverlays();
  //   }
  // };

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
      {/* {console.log('🔥 오버레이 렌더링 체크:', {
        showOverlays,
        overlaysLength: overlays?.length || 0,
        isWindowFocused,
        overlaysData: overlays
      })}
       */}
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
      {/* {showDebugInfo && (
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
      )} */}

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