// frontend/src/pacsapp/components/OHIFViewer/IntegratedDicomViewer.jsx
// 🏥 기존 시스템과 통합되는 커스텀 DICOM 뷰어 (ViewerIframe 대체)
import React, { useState, useEffect, useCallback } from 'react';
import MedicalDicomViewer from '../../../components/MedicalDicomViewer';
import AnnotationOverlay from './AnnotationTools/AnnotationOverlay';
import { transformBoundingBox } from '../../utils/coordinateTransform';

const IntegratedDicomViewer = ({
  // AI 오버레이 관련 (기존과 동일)
  analysisResults,
  overlays,
  showOverlays,
  onRecalculateOverlays,

  // 어노테이션 관련 (기존과 동일)
  annotationProps,

  // 스터디 연동 관련 (기존과 동일)
  currentStudyUID,
  onStudyChange,

  // 설정 (기존과 호환)
  ohifUrl = "http://localhost:3000/viewer", // 사용하지 않지만 호환성 유지
  showDebugInfo = false,
  isLoading = false,
  error = null,

  // 추가 설정
  patientData = {},
  enableFallback = true, // iframe으로 폴백할지 여부
  viewerMode = 'custom' // 'custom' | 'iframe' | 'auto'
}) => {
  const [activeLayer, setActiveLayer] = useState('viewer');
  const [debugInfo, setDebugInfo] = useState({});
  const [viewerError, setViewerError] = useState(null);
  const [transformedOverlays, setTransformedOverlays] = useState([]);

  // 🔄 오버레이 좌표 변환 및 재계산
  const recalculateOverlays = useCallback(() => {
    if (!overlays || overlays.length === 0 || !showOverlays) {
      setTransformedOverlays([]);
      return;
    }

    try {
      const viewport = document.querySelector('.viewport, [data-viewport], .dicom-viewport');
      
      if (!viewport) {
        console.warn('뷰포트를 찾을 수 없습니다.');
        return;
      }

      const viewportRect = viewport.getBoundingClientRect();
      const newTransformedOverlays = overlays.map((overlay, index) => {
        if (!overlay.bbox || overlay.bbox.length !== 4) return null;

        // 이미지 크기 기본값
        const imageWidth = overlay.imageWidth || 512;
        const imageHeight = overlay.imageHeight || 512;

        // 바운딩 박스 좌표 (원본 이미지 기준)
        const [x1, y1, x2, y2] = overlay.bbox;

        // 뷰포트 크기에 맞게 스케일링
        const scaleX = viewportRect.width / imageWidth;
        const scaleY = viewportRect.height / imageHeight;

        // 변환된 좌표 계산
        const transformedBox = {
          left: x1 * scaleX,
          top: y1 * scaleY,
          width: (x2 - x1) * scaleX,
          height: (y2 - y1) * scaleY,
          label: overlay.label || `Detection ${index + 1}`,
          confidence: overlay.confidence,
          originalOverlay: overlay
        };

        return transformedBox;
      }).filter(Boolean);

      setTransformedOverlays(newTransformedOverlays);
      
      if (showDebugInfo) {
        setDebugInfo(prev => ({
          ...prev,
          overlayCount: newTransformedOverlays.length,
          lastRecalculation: new Date().toLocaleTimeString(),
          viewportSize: `${viewportRect.width}x${viewportRect.height}`
        }));
      }

    } catch (err) {
      console.error('오버레이 재계산 실패:', err);
      setViewerError('오버레이 표시 중 오류가 발생했습니다.');
    }
  }, [overlays, showOverlays, showDebugInfo]);

  // 오버레이 재계산 트리거
  useEffect(() => {
    if (onRecalculateOverlays) {
      // 부모 컴포넌트의 재계산 함수를 우리 함수로 대체
      window.recalculateOverlays = recalculateOverlays;
    }
    
    // 초기 계산
    setTimeout(recalculateOverlays, 500);
    
    // 윈도우 리사이즈 시 재계산
    window.addEventListener('resize', recalculateOverlays);
    
    return () => {
      window.removeEventListener('resize', recalculateOverlays);
      if (window.recalculateOverlays === recalculateOverlays) {
        delete window.recalculateOverlays;
      }
    };
  }, [recalculateOverlays, onRecalculateOverlays]);

  // 스터디 변경 감지
  useEffect(() => {
    if (currentStudyUID && onStudyChange) {
      console.log('📺 통합 뷰어 - 스터디 변경:', currentStudyUID);
      
      if (showDebugInfo) {
        setDebugInfo(prev => ({
          ...prev,
          currentStudyUID,
          lastStudyChange: new Date().toLocaleTimeString()
        }));
      }
    }
  }, [currentStudyUID, onStudyChange, showDebugInfo]);

  // 레이어 관리
  const handleViewerClick = () => setActiveLayer('viewer');
  const handleOverlayClick = () => setActiveLayer('overlay');
  const handleAnnotationStart = () => setActiveLayer('annotation');

  // 뷰어 모드 결정
  const getViewerMode = () => {
    if (viewerMode === 'iframe') return 'iframe';
    if (viewerMode === 'custom') return 'custom';
    
    // auto 모드: 조건에 따라 자동 결정
    if (enableFallback && (!window.cornerstone || viewerError)) {
      return 'iframe';
    }
    
    return 'custom';
  };

  // iframe 폴백 컴포넌트
  const IframeFallback = () => (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      position: 'relative',
      backgroundColor: '#ffffff',
      border: '1px solid #e5e5e5',
      borderRadius: '8px'
    }}>
      <iframe
        src={`${ohifUrl}${ohifUrl.includes('?') ? '&' : '?'}StudyInstanceUIDs=${currentStudyUID}`}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '8px'
        }}
        title="OHIF Viewer Fallback"
        onLoad={() => {
          // iframe 로드 후 오버레이 재계산
          setTimeout(recalculateOverlays, 1000);
        }}
      />
      
      {/* iframe 위에 오버레이 표시 */}
      {showOverlays && transformedOverlays.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 10
          }}
          onClick={handleOverlayClick}
        >
          {transformedOverlays.map((overlay, index) => (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: `${overlay.left}px`,
                top: `${overlay.top}px`,
                width: `${overlay.width}px`,
                height: `${overlay.height}px`,
                border: '2px solid #007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                pointerEvents: 'auto'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '-25px',
                left: '0',
                backgroundColor: '#007bff',
                color: '#ffffff',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '11px',
                fontWeight: '500',
                whiteSpace: 'nowrap'
              }}>
                {overlay.label}
                {overlay.confidence && ` (${Math.round(overlay.confidence * 100)}%)`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // 현재 뷰어 모드
  const currentMode = getViewerMode();

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#ffffff'
      }}
      onClick={handleViewerClick}
    >
      {/* 로딩 오버레이 */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          fontSize: '16px',
          color: '#333333'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '16px'
          }} />
          분석 중...
        </div>
      )}

      {/* 에러 오버레이 */}
      {(error || viewerError) && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#ffffff',
          color: '#dc3545',
          padding: '20px',
          border: '2px solid #dc3545',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '14px',
          zIndex: 1000,
          maxWidth: '300px'
        }}>
          ❌ 오류 발생<br />
          {error || viewerError}
          
          {enableFallback && currentMode === 'custom' && (
            <button
              onClick={() => {
                setViewerError(null);
                // iframe 모드로 폴백
                window.location.reload();
              }}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              iframe 모드로 전환
            </button>
          )}
        </div>
      )}

      {/* 메인 뷰어 */}
      {currentMode === 'custom' ? (
        <MedicalDicomViewer
          studyInstanceUID={currentStudyUID}
          patientData={patientData}
          width="100%"
          height="100%"
          showOverlays={showOverlays}
          overlays={overlays}
          onImageChange={recalculateOverlays}
          onError={setViewerError}
        />
      ) : (
        <IframeFallback />
      )}

      {/* 어노테이션 오버레이 (기존 시스템 호환) */}
      {annotationProps && (
        <AnnotationOverlay
          {...annotationProps}
          onDrawingStart={handleAnnotationStart}
        />
      )}

      {/* 디버그 정보 */}
      {showDebugInfo && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          color: '#333333',
          padding: '12px',
          border: '1px solid #d0d0d0',
          borderRadius: '6px',
          fontSize: '11px',
          zIndex: 10000,
          maxWidth: '300px',
          fontFamily: 'monospace'
        }}>
          <strong>🐛 통합 DICOM 뷰어 디버그</strong><br/>
          모드: <strong>{currentMode}</strong><br/>
          스터디: <strong>{currentStudyUID?.substring(0, 20)}...</strong><br/>
          오버레이: <strong>{transformedOverlays.length}개</strong><br/>
          표시: <strong>{showOverlays ? '✅' : '❌'}</strong><br/>
          활성 레이어: <strong>{activeLayer}</strong><br/>
          {debugInfo.lastRecalculation && (
            <>마지막 재계산: <strong>{debugInfo.lastRecalculation}</strong><br/></>
          )}
          {debugInfo.viewportSize && (
            <>뷰포트: <strong>{debugInfo.viewportSize}</strong><br/></>
          )}
          
          <button
            onClick={recalculateOverlays}
            style={{
              marginTop: '8px',
              padding: '4px 8px',
              backgroundColor: '#007bff',
              color: '#ffffff',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '10px'
            }}
          >
            🔄 오버레이 재계산
          </button>
          
          <button
            onClick={() => {
              setViewerError(null);
              window.location.reload();
            }}
            style={{
              marginTop: '4px',
              marginLeft: '4px',
              padding: '4px 8px',
              backgroundColor: '#28a745',
              color: '#ffffff',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '10px'
            }}
          >
            🔄 뷰어 재시작
          </button>
        </div>
      )}
    </div>
  );
};

export default IntegratedDicomViewer;