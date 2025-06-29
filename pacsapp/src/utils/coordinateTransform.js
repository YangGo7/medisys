// // src/utils/coordinateTransform.js

// /**
//  * OHIF 뷰어에서 바운딩박스 좌표를 화면 좌표로 변환하는 함수
//  * @param {Array} bbox - [x1, y1, x2, y2] 형태의 바운딩박스 좌표 (원본 이미지 기준)
//  * @param {number} imageWidth - 원본 이미지 가로 크기
//  * @param {number} imageHeight - 원본 이미지 세로 크기
//  * @param {HTMLElement} iframeRef - OHIF iframe DOM 요소
//  * @returns {Object|null} 변환된 화면 좌표 또는 null (유효하지 않은 경우)
//  */
// export const transformBoundingBox = (bbox, imageWidth, imageHeight, iframeRef) => {
//     if (!iframeRef || !imageWidth || !imageHeight || !bbox || bbox.length !== 4) {
//         console.warn('좌표 변환 실패: 필수 파라미터가 없습니다.', { 
//             iframe: !!iframeRef, 
//             imageWidth, 
//             imageHeight, 
//             bbox 
//         });
//         return null;
//     }

//     // 실시간으로 iframe 크기 가져오기
//     const iframeRect = iframeRef.getBoundingClientRect();
    
//     // OHIF 뷰어 내부 레이아웃 보정값 (정확한 값 유지)
//     const LAYOUT_CONFIG = {
//         headerHeight: 50,
//         bottomHeight: 30,
//         sidebarWidth: 280,
//         rightPadding: 20
//     };
    
//     // 최종적으로 뷰어 화면에서 DICOM이 표시되는 위치
//     const imageArea = {
//         x: LAYOUT_CONFIG.sidebarWidth,
//         y: LAYOUT_CONFIG.headerHeight,
//         width: iframeRect.width - LAYOUT_CONFIG.sidebarWidth - LAYOUT_CONFIG.rightPadding,
//         height: iframeRect.height - LAYOUT_CONFIG.headerHeight - LAYOUT_CONFIG.bottomHeight
//     };
    
//     console.log(`📐 해상도 정보: 원본=${imageWidth}x${imageHeight}, 표시영역=${Math.round(imageArea.width)}x${Math.round(imageArea.height)}`);
    
//     // 스케일 계산 (원본 로직 유지)
//     const scaleX = imageArea.width / imageWidth;
//     const scaleY = imageArea.height / imageHeight;
    
//     // 바운딩박스 좌표 변환 (원본 로직 유지)
//     const transformedBox = {
//         left: (bbox[0] * scaleX) + imageArea.x,
//         top: (bbox[1] * scaleY) + imageArea.y,
//         width: (bbox[2] - bbox[0]) * scaleX,
//         height: (bbox[3] - bbox[1]) * scaleY
//     };
    
//     // 이미지 영역 경계로 클리핑 (원본 로직 유지)
//     const clippedBox = {
//         left: Math.max(transformedBox.left, imageArea.x),
//         top: Math.max(transformedBox.top, imageArea.y),
//         right: Math.min(transformedBox.left + transformedBox.width, imageArea.x + imageArea.width),
//         bottom: Math.min(transformedBox.top + transformedBox.height, imageArea.y + imageArea.height)
//     };
    
//     // 최종 박스 크기 계산 (원본 로직 유지)
//     const finalBox = {
//         left: clippedBox.left,
//         top: clippedBox.top,
//         width: clippedBox.right - clippedBox.left,
//         height: clippedBox.bottom - clippedBox.top
//     };
    
//     // 너무 작거나 깨진 박스는 무시 (원본 로직 유지)
//     const MIN_BOX_SIZE = 10;
//     if (finalBox.width < MIN_BOX_SIZE || finalBox.height < MIN_BOX_SIZE) {
//         console.warn('박스가 너무 작아서 표시하지 않음:', finalBox);
//         return null;
//     }
    
//     console.log(`📦 좌표 변환: bbox=[${bbox.join(',')}] → screen=[${Math.round(finalBox.left)},${Math.round(finalBox.top)},${Math.round(finalBox.width)},${Math.round(finalBox.height)}]`);
    
//     return finalBox;
// };

// /**
//  * OHIF 레이아웃 설정을 가져오는 함수
//  * @returns {Object} 레이아웃 설정값들
//  */
// export const getOHIFLayoutConfig = () => ({
//     headerHeight: 50,
//     bottomHeight: 30,
//     sidebarWidth: 280,
//     rightPadding: 20
// });

// /**
//  * iframe에서 이미지 표시 영역을 계산하는 함수
//  * @param {HTMLElement} iframeRef - OHIF iframe DOM 요소
//  * @returns {Object|null} 이미지 표시 영역 정보
//  */
// export const getImageDisplayArea = (iframeRef) => {
//     if (!iframeRef) {
//         console.warn('iframe 참조가 없습니다.');
//         return null;
//     }

//     const iframeRect = iframeRef.getBoundingClientRect();
//     const config = getOHIFLayoutConfig();
    
//     return {
//         x: config.sidebarWidth,
//         y: config.headerHeight,
//         width: iframeRect.width - config.sidebarWidth - config.rightPadding,
//         height: iframeRect.height - config.headerHeight - config.bottomHeight,
//         iframeWidth: iframeRect.width,
//         iframeHeight: iframeRect.height
//     };
// };

// /**
//  * 스케일 비율을 계산하는 함수
//  * @param {number} imageWidth - 원본 이미지 가로 크기
//  * @param {number} imageHeight - 원본 이미지 세로 크기
//  * @param {Object} displayArea - 표시 영역 정보
//  * @returns {Object} 스케일 비율 정보
//  */
// export const calculateScale = (imageWidth, imageHeight, displayArea) => {
//     if (!imageWidth || !imageHeight || !displayArea) {
//         return { scaleX: 1, scaleY: 1 };
//     }

//     return {
//         scaleX: displayArea.width / imageWidth,
//         scaleY: displayArea.height / imageHeight
//     };
// };

// /**
//  * 여러 바운딩박스를 한번에 변환하는 함수
//  * @param {Array} bboxes - 바운딩박스 배열
//  * @param {number} imageWidth - 원본 이미지 가로 크기
//  * @param {number} imageHeight - 원본 이미지 세로 크기
//  * @param {HTMLElement} iframeRef - OHIF iframe DOM 요소
//  * @returns {Array} 변환된 박스들의 배열 (null인 것들은 제외)
//  */
// export const transformMultipleBoundingBoxes = (bboxes, imageWidth, imageHeight, iframeRef) => {
//     if (!Array.isArray(bboxes)) {
//         console.warn('bboxes가 배열이 아닙니다.');
//         return [];
//     }

//     return bboxes
//         .map((bbox, index) => {
//             const transformed = transformBoundingBox(bbox, imageWidth, imageHeight, iframeRef);
//             return transformed ? { ...transformed, originalIndex: index } : null;
//         })
//         .filter(Boolean); // null 제거
// };

// src/utils/coordinateTransform.js

// src/utils/coordinateTransform.js

export const transformBoundingBox = (bbox, imageWidth, imageHeight, iframeRef) => {
    if (!iframeRef || !imageWidth || !imageHeight || !bbox || bbox.length !== 4) {
        console.warn('좌표 변환 실패: 필수 파라미터가 없습니다.', { 
            iframe: !!iframeRef, 
            imageWidth, 
            imageHeight, 
            bbox 
        });
        return null;
    }

    // 🔧 실시간으로 iframe 크기 가져오기
    const iframeRect = iframeRef.getBoundingClientRect();
    
    // 🔧 실제 측정된 기준값
    const baseImageArea = { x: 348, y: 75, width: 815, height: 827 };
    const baseIframeSize = { width: 1256, height: 953 };
    
    // 🔧 현재 iframe 크기에 맞춰 동적 스케일링
    const scaleFactorX = iframeRect.width / baseIframeSize.width;
    const scaleFactorY = iframeRect.height / baseIframeSize.height;
    
    // 🔧 스케일링된 실제 이미지 영역 계산
    const imageArea = {
        x: baseImageArea.x * scaleFactorX,
        y: baseImageArea.y * scaleFactorY,
        width: baseImageArea.width * scaleFactorX,
        height: baseImageArea.height * scaleFactorY
    };
    
    console.log(`📐 해상도 정보: 원본=${imageWidth}x${imageHeight}, 표시영역=${Math.round(imageArea.width)}x${Math.round(imageArea.height)}`);
    console.log(`📏 스케일 팩터: X=${scaleFactorX.toFixed(3)}, Y=${scaleFactorY.toFixed(3)}`);
    console.log(`🖼️ 스케일된 이미지 영역: x=${Math.round(imageArea.x)}, y=${Math.round(imageArea.y)}, w=${Math.round(imageArea.width)}, h=${Math.round(imageArea.height)}`);
    
    // 🔧 원본 이미지 → 표시 영역 스케일 계산
    const imageScaleX = imageArea.width / imageWidth;
    const imageScaleY = imageArea.height / imageHeight;
    
    console.log(`🔄 이미지 스케일: X=${imageScaleX.toFixed(3)}, Y=${imageScaleY.toFixed(3)}`);
    
    // 🔧 바운딩박스 좌표 변환 (iframe 내부 좌표계)
    const transformedBox = {
        left: (bbox[0] * imageScaleX) + imageArea.x,
        top: (bbox[1] * imageScaleY) + imageArea.y,
        width: (bbox[2] - bbox[0]) * imageScaleX,
        height: (bbox[3] - bbox[1]) * imageScaleY
    };
    
    // 경계 체크
    const MIN_BOX_SIZE = 5;
    if (transformedBox.width < MIN_BOX_SIZE || transformedBox.height < MIN_BOX_SIZE) {
        console.warn('박스가 너무 작음:', transformedBox);
        return null;
    }
    
    console.log(`📦 좌표 변환: bbox=[${bbox.join(',')}] → screen=[${Math.round(transformedBox.left)},${Math.round(transformedBox.top)},${Math.round(transformedBox.width)},${Math.round(transformedBox.height)}]`);
    
    return transformedBox;
};

/**
 * 🔧 스크롤 오프셋을 고려한 좌표 변환 (개선된 버전)
 */
export const transformBoundingBoxWithScroll = (bbox, imageWidth, imageHeight, iframeRef) => {
    if (!iframeRef || !imageWidth || !imageHeight || !bbox || bbox.length !== 4) {
        return null;
    }

    const iframeRect = iframeRef.getBoundingClientRect();
    
    // 실제 측정된 이미지 영역 (동적 스케일링)
    const baseImageArea = { x: 348, y: 75, width: 815, height: 827 };
    const baseIframeSize = { width: 1256, height: 953 };
    
    const scaleFactorX = iframeRect.width / baseIframeSize.width;
    const scaleFactorY = iframeRect.height / baseIframeSize.height;
    
    const imageArea = {
        x: baseImageArea.x * scaleFactorX,
        y: baseImageArea.y * scaleFactorY,
        width: baseImageArea.width * scaleFactorX,
        height: baseImageArea.height * scaleFactorY
    };
    
    // 원본 이미지 → 표시 영역 스케일
    const imageScaleX = imageArea.width / imageWidth;
    const imageScaleY = imageArea.height / imageHeight;
    
    // 좌표 변환 (iframe 내부 좌표계)
    const transformedBox = {
        left: (bbox[0] * imageScaleX) + imageArea.x,
        top: (bbox[1] * imageScaleY) + imageArea.y,
        width: (bbox[2] - bbox[0]) * imageScaleX,
        height: (bbox[3] - bbox[1]) * imageScaleY
    };
    
    return transformedBox;
};

/**
 * OHIF 레이아웃 설정을 가져오는 함수 (업데이트됨)
 * @returns {Object} 레이아웃 설정값들
 */
export const getOHIFLayoutConfig = () => ({
    // 🔧 실제 측정값으로 업데이트
    imageArea: {
        x: 348,
        y: 75,
        width: 815,
        height: 827
    },
    baseIframeSize: {
        width: 1256,
        height: 953
    }
});

/**
 * iframe에서 이미지 표시 영역을 계산하는 함수 (개선됨)
 * @param {HTMLElement} iframeRef - OHIF iframe DOM 요소
 * @returns {Object|null} 이미지 표시 영역 정보
 */
export const getImageDisplayArea = (iframeRef) => {
    if (!iframeRef) {
        console.warn('iframe 참조가 없습니다.');
        return null;
    }

    const iframeRect = iframeRef.getBoundingClientRect();
    const config = getOHIFLayoutConfig();
    
    // 🔧 동적 스케일링 적용
    const scaleFactorX = iframeRect.width / config.baseIframeSize.width;
    const scaleFactorY = iframeRect.height / config.baseIframeSize.height;
    
    return {
        x: config.imageArea.x * scaleFactorX,
        y: config.imageArea.y * scaleFactorY,
        width: config.imageArea.width * scaleFactorX,
        height: config.imageArea.height * scaleFactorY,
        iframeWidth: iframeRect.width,
        iframeHeight: iframeRect.height,
        scaleFactorX,
        scaleFactorY
    };
};

/**
 * 스케일 비율을 계산하는 함수 (개선됨)
 * @param {number} imageWidth - 원본 이미지 가로 크기
 * @param {number} imageHeight - 원본 이미지 세로 크기
 * @param {Object} displayArea - 표시 영역 정보
 * @returns {Object} 스케일 비율 정보
 */
export const calculateScale = (imageWidth, imageHeight, displayArea) => {
    if (!imageWidth || !imageHeight || !displayArea) {
        return { scaleX: 1, scaleY: 1 };
    }

    return {
        scaleX: displayArea.width / imageWidth,
        scaleY: displayArea.height / imageHeight,
        // 🔧 추가 정보
        originalSize: { width: imageWidth, height: imageHeight },
        displaySize: { width: displayArea.width, height: displayArea.height }
    };
};

/**
 * 여러 바운딩박스를 한번에 변환하는 함수 (개선됨)
 * @param {Array} bboxes - 바운딩박스 배열
 * @param {number} imageWidth - 원본 이미지 가로 크기
 * @param {number} imageHeight - 원본 이미지 세로 크기
 * @param {HTMLElement} iframeRef - OHIF iframe DOM 요소
 * @returns {Array} 변환된 박스들의 배열 (null인 것들은 제외)
 */
export const transformMultipleBoundingBoxes = (bboxes, imageWidth, imageHeight, iframeRef) => {
    if (!Array.isArray(bboxes)) {
        console.warn('bboxes가 배열이 아닙니다.');
        return [];
    }

    console.log(`📦 다중 박스 변환 시작: ${bboxes.length}개, 해상도: ${imageWidth}x${imageHeight}`);

    const results = bboxes
        .map((bbox, index) => {
            const transformed = transformBoundingBox(bbox, imageWidth, imageHeight, iframeRef);
            if (transformed) {
                return { ...transformed, originalIndex: index, originalBbox: bbox };
            }
            console.warn(`❌ 박스 ${index} 변환 실패:`, bbox);
            return null;
        })
        .filter(Boolean); // null 제거
    
    console.log(`✅ 다중 박스 변환 완료: ${results.length}/${bboxes.length}개 성공`);
    return results;
};

/**
 * 🔧 디버깅용 좌표 변환 정보 출력
 * @param {Array} bbox - 바운딩박스
 * @param {number} imageWidth - 원본 이미지 가로 크기
 * @param {number} imageHeight - 원본 이미지 세로 크기
 * @param {HTMLElement} iframeRef - OHIF iframe DOM 요소
 */
export const debugCoordinateTransform = (bbox, imageWidth, imageHeight, iframeRef) => {
    if (!iframeRef) return;
    
    const iframeRect = iframeRef.getBoundingClientRect();
    const displayArea = getImageDisplayArea(iframeRef);
    const scale = calculateScale(imageWidth, imageHeight, displayArea);
    
    console.group('🔍 좌표 변환 디버깅');
    console.log('📐 원본 이미지:', { width: imageWidth, height: imageHeight });
    console.log('📺 iframe 크기:', { width: iframeRect.width, height: iframeRect.height });
    console.log('🖼️ 표시 영역:', displayArea);
    console.log('📏 스케일 비율:', scale);
    console.log('📦 원본 박스:', bbox);
    
    const transformed = transformBoundingBox(bbox, imageWidth, imageHeight, iframeRef);
    console.log('✅ 변환된 박스:', transformed);
    console.groupEnd();
    
    return transformed;
};