// ReadOnlyDicomViewer.jsx
// pacsapp viewer_v2의 뷰어 컴포넌트를 기반으로 한 읽기 전용 DICOM 뷰어
// emr/ris/realdicomviewer의 환자 선택 카드, 판독문 기능 유지

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Stethoscope, Calendar, EyeOff, Eye } from 'lucide-react';

const ReadOnlyDicomViewer = ({ 
  // 기본 뷰어 props
  selectedTool = 'wwwc', 
  currentSlice = 1, 
  totalSlices = 1, 
  patientInfo = {}, 
  viewport = {},
  
  // 이미지 관련 props
  currentImageUrl,
  imageIds,
  viewportSettings,
  imageTransform,
  getImageStyle,
  
  // 읽기 전용 annotation props
  annotationBoxes = [],
  measurements = [],
  aiResults = {},
  
  // 표시 제어 props
  showAnnotations = true,
  onToggleAnnotations,
  
  // 추가 정보
  onImageDisplayInfoChange
}) => {
  const modelColors = {
    yolov8: '#3b82f6',
    ssd: '#ef4444', 
    simclr: '#22c55e'
  };

  const imageRef = useRef(null);
  const [imageDisplayInfo, setImageDisplayInfo] = useState(null);
  
  // 안전한 환자 정보 처리
  const safePatientInfo = {
    name: patientInfo?.name || '환자명 없음',
    id: patientInfo?.id || 'ID 없음',
    studyDate: patientInfo?.studyDate || '-',
    ...patientInfo
  };

  // 안전한 뷰포트 정보 처리
  const safeViewport = {
    windowWidth: viewport?.windowWidth || 400,
    windowCenter: viewport?.windowCenter || 40,
    zoom: viewport?.zoom || 1.0,
    ...viewport
  };

  // 이미지 크기 정보 업데이트
  const updateImageDisplayInfo = useCallback(() => {
    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      const naturalWidth = imageRef.current.naturalWidth;
      const naturalHeight = imageRef.current.naturalHeight;
      
      const displayInfo = {
        displayWidth: rect.width,
        displayHeight: rect.height,
        naturalWidth,
        naturalHeight,
        scaleX: rect.width / naturalWidth,
        scaleY: rect.height / naturalHeight
      };
      
      setImageDisplayInfo(displayInfo);
      
      if (onImageDisplayInfoChange) {
        onImageDisplayInfoChange(displayInfo);
      }
    }
  }, [onImageDisplayInfoChange]);

  // 이미지 로드 시 크기 정보 업데이트
  useEffect(() => {
    if (currentImageUrl) {
      updateImageDisplayInfo();
    }
  }, [currentImageUrl, updateImageDisplayInfo]);

  // 읽기 전용 어노테이션 렌더링
  const renderReadOnlyAnnotations = () => {
    if (!showAnnotations || (!annotationBoxes.length && !measurements.length)) {
      return null;
    }

    return (
      <>
        {/* Django 어노테이션 박스 렌더링 (읽기 전용) */}
        {annotationBoxes.map((annotation, index) => {
          try {
            // bbox 파싱
            const bbox = typeof annotation.bbox === 'string' 
              ? JSON.parse(annotation.bbox) 
              : annotation.bbox;

            if (!bbox || !imageDisplayInfo) return null;

            // 좌표 스케일링
            const scaledX = bbox.x * imageDisplayInfo.scaleX;
            const scaledY = bbox.y * imageDisplayInfo.scaleY;
            const scaledWidth = bbox.width * imageDisplayInfo.scaleX;
            const scaledHeight = bbox.height * imageDisplayInfo.scaleY;

            return (
              <div key={`annotation-${annotation.id || index}`}>
                {/* 어노테이션 박스 */}
                <div
                  style={{
                    position: 'absolute',
                    left: scaledX,
                    top: scaledY,
                    width: scaledWidth,
                    height: scaledHeight,
                    border: '2px solid #ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    pointerEvents: 'none', // 읽기 전용
                    borderRadius: '2px'
                  }}
                />
                
                {/* 라벨 표시 */}
                {annotation.label && (
                  <div
                    style={{
                      position: 'absolute',
                      left: scaledX,
                      top: scaledY - 25,
                      backgroundColor: '#ff6b6b',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      pointerEvents: 'none',
                      maxWidth: '150px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {annotation.label}
                  </div>
                )}
                
                {/* 의사 소견 표시 */}
                {annotation.dr_text && (
                  <div
                    style={{
                      position: 'absolute',
                      left: scaledX,
                      top: scaledY + scaledHeight + 5,
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      maxWidth: '200px',
                      pointerEvents: 'none',
                      wordWrap: 'break-word'
                    }}
                  >
                    {annotation.dr_text}
                  </div>
                )}
              </div>
            );
          } catch (err) {
            console.warn('어노테이션 렌더링 오류:', err, annotation);
            return null;
          }
        })}

        {/* 측정 도구 결과 렌더링 (읽기 전용) */}
        {measurements.map((measurement, index) => {
          if (!measurement.startPoint || !measurement.endPoint || !imageDisplayInfo) {
            return null;
          }

          const startX = measurement.startPoint.x * imageDisplayInfo.scaleX;
          const startY = measurement.startPoint.y * imageDisplayInfo.scaleY;
          const endX = measurement.endPoint.x * imageDisplayInfo.scaleX;
          const endY = measurement.endPoint.y * imageDisplayInfo.scaleY;

          return (
            <div key={`measurement-${measurement.id || index}`}>
              {/* 측정 선 */}
              <svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none'
                }}
              >
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeDasharray="none"
                />
                
                {/* 시작점 */}
                <circle
                  cx={startX}
                  cy={startY}
                  r="4"
                  fill="#3b82f6"
                  stroke="white"
                  strokeWidth="1"
                />
                
                {/* 끝점 */}
                <circle
                  cx={endX}
                  cy={endY}
                  r="4"
                  fill="#3b82f6"
                  stroke="white"
                  strokeWidth="1"
                />
              </svg>
              
              {/* 측정값 표시 */}
              {measurement.value && (
                <div
                  style={{
                    position: 'absolute',
                    left: (startX + endX) / 2,
                    top: (startY + endY) / 2 - 20,
                    backgroundColor: 'rgba(59, 130, 246, 0.9)',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    pointerEvents: 'none',
                    transform: 'translate(-50%, 0)'
                  }}
                >
                  {measurement.value}
                </div>
              )}
            </div>
          );
        })}

        {/* AI 결과 렌더링 (읽기 전용) */}
        {Object.entries(aiResults).map(([modelName, results]) => {
          if (!results || !Array.isArray(results)) return null;
          
          return results.map((result, index) => {
            if (!result.bbox || !imageDisplayInfo) return null;
            
            const bbox = result.bbox;
            const scaledX = bbox.x * imageDisplayInfo.scaleX;
            const scaledY = bbox.y * imageDisplayInfo.scaleY;
            const scaledWidth = bbox.width * imageDisplayInfo.scaleX;
            const scaledHeight = bbox.height * imageDisplayInfo.scaleY;
            
            return (
              <div key={`ai-${modelName}-${index}`}>
                <div
                  style={{
                    position: 'absolute',
                    left: scaledX,
                    top: scaledY,
                    width: scaledWidth,
                    height: scaledHeight,
                    border: `2px solid ${modelColors[modelName] || '#10b981'}`,
                    backgroundColor: `${modelColors[modelName] || '#10b981'}20`,
                    pointerEvents: 'none',
                    borderRadius: '2px'
                  }}
                />
                
                {/* AI 모델명과 신뢰도 */}
                <div
                  style={{
                    position: 'absolute',
                    left: scaledX,
                    top: scaledY - 25,
                    backgroundColor: modelColors[modelName] || '#10b981',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    pointerEvents: 'none'
                  }}
                >
                  {modelName.toUpperCase()} {result.confidence ? `(${(result.confidence * 100).toFixed(1)}%)` : ''}
                </div>
              </div>
            );
          });
        })}
      </>
    );
  };

  return (
    <div className="mv-dicom-viewer">
      {/* 메인 뷰어 컨테이너 */}
      <div className="mv-viewer-container">
        <div className="mv-image-container">
          {currentImageUrl ? (
            <div className="mv-image-wrapper" style={{ position: 'relative' }}>
              <img
                ref={imageRef}
                src={currentImageUrl}
                alt={`DICOM Image ${currentSlice}/${totalSlices}`}
                className="mv-dicom-image"
                style={getImageStyle ? getImageStyle() : {}}
                onLoad={updateImageDisplayInfo}
                onError={(e) => {
                  console.error('이미지 로드 실패:', e);
                }}
              />
              
              {/* 읽기 전용 어노테이션 오버레이 */}
              {showAnnotations && (
                <div 
                  className="mv-annotation-overlay"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    pointerEvents: 'none', // 완전히 읽기 전용
                    zIndex: 10
                  }}
                >
                  {renderReadOnlyAnnotations()}
                </div>
              )}
            </div>
          ) : (
            <div className="mv-empty-image">
              <div className="mv-empty-image-icon">📋</div>
              <div>DICOM 이미지 없음</div>
              <div className="mv-empty-image-text">이미지를 선택해주세요</div>
            </div>
          )}
        </div>
      </div>

      {/* 뷰포트 정보 오버레이 (왼쪽) */}
      <div className="mv-viewport-info mv-info-left">
        <div className="mv-info-row">
          <Stethoscope size={12} />
          <span>환자: {safePatientInfo.name}</span>
        </div>
        <div>ID: {safePatientInfo.id}</div>
        <div>Slice: {currentSlice}/{totalSlices}</div>
        <div>도구: {selectedTool.toUpperCase()}</div>
        
        {/* 어노테이션 표시 상태 */}
        <div className="mv-info-row">
          {showAnnotations ? <Eye size={12} /> : <EyeOff size={12} />}
          <span>{showAnnotations ? '표시중' : '숨김'}</span>
        </div>
        
        {imageTransform && (
          <div>Zoom: {imageTransform.zoom?.toFixed(1)}x</div>
        )}
        
        {/* 이미지 크기 정보 */}
        {imageDisplayInfo && (
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
            📐 {Math.round(imageDisplayInfo.displayWidth)}x{Math.round(imageDisplayInfo.displayHeight)}
            (비율: {imageDisplayInfo.scaleX.toFixed(2)})
          </div>
        )}
        
        {/* 어노테이션 통계 */}
        {(annotationBoxes.length > 0 || measurements.length > 0) && (
          <div style={{ fontSize: '11px', color: '#3b82f6', marginTop: '4px' }}>
            🏷️ 어노테이션: {annotationBoxes.length + measurements.length}개
          </div>
        )}
      </div>

      {/* 뷰포트 정보 오버레이 (오른쪽) */}
      <div className="mv-viewport-info mv-info-right">
        <div>WW: {safeViewport.windowWidth}</div>
        <div>WC: {safeViewport.windowCenter}</div>
        <div>Zoom: {safeViewport.zoom?.toFixed(1) || '1.0'}x</div>
        
        <div className="mv-info-row">
          <Calendar size={12} />
          <span>{safePatientInfo.studyDate}</span>
        </div>
        
        {imageTransform && (
          <>
            <div>밝기: {Math.round(imageTransform.brightness)}%</div>
            <div>대비: {Math.round(imageTransform.contrast)}%</div>
            {imageTransform.rotation !== 0 && (
              <div>회전: {imageTransform.rotation}°</div>
            )}
            {(imageTransform.flipH || imageTransform.flipV) && (
              <div>플립: {imageTransform.flipH ? 'H' : ''}{imageTransform.flipV ? 'V' : ''}</div>
            )}
          </>
        )}
        
        {/* 읽기 전용 표시 */}
        <div style={{ 
          fontSize: '11px', 
          color: '#ef4444', 
          fontWeight: 'bold',
          marginTop: '8px',
          padding: '2px 4px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '4px'
        }}>
          🔒 읽기 전용
        </div>
      </div>

      {/* 어노테이션 토글 버튼 */}
      {onToggleAnnotations && (annotationBoxes.length > 0 || measurements.length > 0) && (
        <button
          className="mv-annotation-toggle"
          onClick={onToggleAnnotations}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            backgroundColor: showAnnotations ? '#3b82f6' : '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            zIndex: 20
          }}
        >
          {showAnnotations ? <Eye size={14} /> : <EyeOff size={14} />}
          어노테이션 {showAnnotations ? '숨기기' : '표시'}
        </button>
      )}
    </div>
  );
};

export default ReadOnlyDicomViewer;