// src/components/OHIFViewer/AnnotationTools/AnnotationOverlay.js

import React from 'react';
import styles from './AnnotationOverlay.module.css';

const AnnotationOverlay = ({
  // 상태
  drawingMode,
  currentBox,
  annotationBoxes, // 백엔드에서 받아온 AI 박스 + 사용자가 그린 박스
  showAnnotations, // 전체 어노테이션 표시 여부
  
  // 🔥 모델별 표시 여부 prop 추가 (useAIAnalysis에서 전달 받아야 함)
  showYOLOOverlays, // YOLO 박스 표시 여부
  showSSDOverlays,  // SSD 박스 표시 여부
  showbothOverlays, // 모든 박스 표시여부 
  overlayRef,
  
  // 마우스 이벤트 핸들러
  onMouseDown,
  onMouseMove,
  onMouseUp,
  
  // 어노테이션 관리
  onDeleteAnnotation,
  
  // 동적 z-index 관련 콜백들
  onDrawingStart,
  onModalOpen,
}) => {
  
  const handleMouseDown = (e) => {
    if (drawingMode && onDrawingStart) {
      console.log('✏️ 어노테이션 그리기 시작 - 어노테이션 레이어 활성화');
      onDrawingStart();
    }
    if (onMouseDown) {
      onMouseDown(e);
    }
  };

  const handleAnnotationClick = (e) => {
    e.stopPropagation();
    console.log('🖱️ 어노테이션 박스 클릭 - 어노테이션 레이어 활성화');
    if (onDrawingStart) {
      onDrawingStart();
    }
  };

  const handleDeleteClick = (e, boxId) => {
    e.stopPropagation();
    if (onModalOpen) {
      console.log('🗑️ 삭제 버튼 클릭 - 모달이 열릴 수 있음');
      onModalOpen();
    }
    if (onDeleteAnnotation) {
      onDeleteAnnotation(boxId);
    }
  };

  // ⭐️⭐️⭐️ 가장 중요한 부분: 바운딩 박스 표시 로직 수정 ⭐️⭐️⭐️
  // 이 컴포넌트 자체에서 필터링을 다시 하거나,
  // useAIAnalysis.js에서 필터링된 filteredOverlays를 annotationBoxes prop으로 전달해야 합니다.
  // 현재 코드를 보면 annotationBoxes prop을 그대로 map하고 있습니다.
  // 따라서 useAIAnalysis.js에서 getVisibleOverlays()의 결과가 annotationBoxes로 전달되어야 합니다.
  // 아래에서는 annotationBoxes를 그대로 사용한다고 가정하고, 각 박스가 보여야 하는지 판단합니다.
  
  // 이 부분은 useAIAnalysis.js의 getVisibleOverlays 로직과 비슷하게 동작해야 합니다.
  const getBoxDisplayStatus = (box) => {
    const modelName = box.model_name || ''; // 백엔드에서 'model_name'으로 옴
    const confidence = box.confidence_score || box.confidence || 0; // 백엔드에서 'confidence_score' 또는 'confidence'로 옴
    
    // AI 박스는 신뢰도 0.01 이상일 때만 표시 (너무 낮은 값은 제외)
    const minDisplayConfidence = 0.3; 
     
    if (modelName.includes('YOLO')) {
        // YOLO 계열 모델이고, YOLO 표시 토글이 켜져 있으면 표시
        return showYOLOOverlays && (confidence >= minDisplayConfidence);
    }
    
    if (modelName.includes('SSD')) {
        // SSD 계열 모델이고, SSD 표시 토글이 켜져 있으면 표시
        return showSSDOverlays && (confidence >= minDisplayConfidence);
    }

    // AI 모델이 아닌 (사용자가 그린) 박스이거나, 모델 정보가 없는 경우
    // 'model_name' 필드가 없거나 AI 모델이 아닌 박스는 항상 표시
    return true; 
  };


  return (
    <div
      ref={overlayRef}
      className={`${styles.overlayContainer} ${
        drawingMode ? styles.drawingMode : styles.normalMode
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      {/* 현재 그리고 있는 박스 */}
      {currentBox && (
        <div
          className={styles.currentBox}
          style={{
            left: Math.min(currentBox.startX, currentBox.endX) + 'px',
            top: Math.min(currentBox.startY, currentBox.endY) + 'px',
            width: Math.abs(currentBox.endX - currentBox.startX) + 'px',
            height: Math.abs(currentBox.endY - currentBox.startY) + 'px'
          }}
        />
      )}
      
      {/* 저장된 어노테이션 박스들 (AI 분석 결과 + 사용자가 그린 박스) */}
      {showAnnotations && annotationBoxes.map((box) => {
        // 박스를 표시할지 결정
        const shouldDisplayBox = getBoxDisplayStatus(box);

        // box.bbox는 { x, y, width, height } 형식으로 백엔드에서 넘어온다고 가정
        // 혹시 DB에 [x1, y1, x2, y2]로 저장되어 그대로 넘어왔다면 변환 필요.
        // Django views.py의 get_analysis_results에서 이미 {'x':..., 'y':..., 'width':..., 'height':...}로 변환하여 보내주었으므로,
        // 여기서는 box.bbox.x 등을 직접 사용합니다.
        
        // 유효성 검사: width, height가 0이거나 음수인 경우 방지
        const displayWidth = Math.max(0, box.bbox.width || 0);
        const displayHeight = Math.max(0, box.bbox.height || 0);
        
        // 유효한 박스 데이터인지 최종 확인 (좌표가 NaN이거나 무효하면 안 됨)
        const isValidBox = 
          typeof box.bbox.x === 'number' && !isNaN(box.bbox.x) &&
          typeof box.bbox.y === 'number' && !isNaN(box.bbox.y) &&
          displayWidth > 0 && displayHeight > 0;

        if (!showAnnotations || !shouldDisplayBox || !isValidBox) {
            console.log(`🫥 숨김/무효 박스: ID ${box.id}, Label: ${box.label}, Model: ${box.model_name}, Display: ${shouldDisplayBox}, Valid: ${isValidBox}`);
            return null; // 조건에 맞지 않거나 유효하지 않으면 렌더링하지 않음
        }

        return (
          <div
            key={box.id}
            className={`${styles.annotationBox} ${
              drawingMode ? styles.drawingMode : styles.normalMode
            } ${box.model_name ? styles[`model-${box.model_name.toLowerCase().replace(/[^a-z0-9]/g, '')}`] : styles.manualBox}`}
            style={{
              left: box.bbox.x + 'px', // 백엔드에서 받은 x 사용
              top: box.bbox.y + 'px',  // 백엔드에서 받은 y 사용
              width: displayWidth + 'px', // 유효성 검사된 width 사용
              height: displayHeight + 'px', // 유효성 검사된 height 사용
              position: 'absolute', // 이 스타일이 CSS 모듈에 없으면 여기에 추가
              pointerEvents: 'auto', // 박스 클릭 이벤트가 동작하도록
              cursor: 'pointer', // 마우스 오버 시 커서 변경
              // 디버깅용으로 임시 테두리 추가 (나중에 제거)
              border: '2px solid yellow', 
              backgroundColor: `rgba(255, 255, 0, ${box.confidence ? box.confidence * 0.3 : 0.1})`, // 신뢰도에 따라 투명도 조절
              zIndex: 100 + (box.confidence ? Math.floor(box.confidence * 50) : 0) // 신뢰도에 따라 z-index 미세 조정
            }}
            onClick={handleAnnotationClick}
          >
            <div className={styles.annotationLabel}>
              {box.label} ({(box.confidence * 100).toFixed(0)}%) {box.model_name ? `(${box.model_name})` : ''}
              <button
                onClick={(e) => handleDeleteClick(e, box.id)}
                className={styles.deleteButton}
                title={`"${box.label}" 어노테이션 삭제`}
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AnnotationOverlay;