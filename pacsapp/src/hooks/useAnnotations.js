// src/hooks/useAnnotations.js
import { useState, useRef, useCallback } from 'react';
import { saveAnnotations, loadAnnotations } from '../utils/api';


// 🔥 토스트 알림 함수 추가
const showToast = (message) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #333;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        max-width: 300px;
        animation: slideInRight 0.3s ease;
    `;
    
    // CSS 애니메이션 추가
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    if (!document.head.querySelector('style[data-toast]')) {
        style.setAttribute('data-toast', 'true');
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (document.body.contains(toast)) {
            document.body.removeChild(toast);
        }
    }, 3000);
};


/**
 * 어노테이션 관련 상태와 로직을 관리하는 커스텀 훅
 * @param {string} currentStudyUID - 현재 선택된 스터디 UID
 * @param {Function} setAnalysisStatus - 상태 메시지 설정 함수
 * @param {Function} setActiveLayer - 활성 레이어 설정 함수 🔥 추가
 * @returns {Object} 어노테이션 관련 상태와 함수들
 */
const useAnnotations = (currentStudyUID, setAnalysisStatus, setActiveLayer) => {
    // =============================================================================
    // 상태 관리
    // =============================================================================
    
    // 어노테이션 그리기 관련 상태
    const [drawingMode, setDrawingMode] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentBox, setCurrentBox] = useState(null);
    const [showAnnotations, setShowAnnotations] = useState(true);
    
    // 어노테이션 데이터
    const [annotationBoxes, setAnnotationBoxes] = useState([]);
    
    // 라벨 모달 관련 상태
    const [showLabelModal, setShowLabelModal] = useState(false);
    const [newBoxLabel, setNewBoxLabel] = useState('');
    const [tempBox, setTempBox] = useState(null);
    
    // 드롭다운 상태
    const [showAnnotationDropdown, setShowAnnotationDropdown] = useState(false);
    
    // DOM 참조
    const overlayRef = useRef(null);
    
    // =============================================================================
    // 마우스 이벤트 핸들러들
    // =============================================================================
    
    /**
     * 마우스 다운 이벤트 핸들러 (박스 그리기 시작)
     */
    const handleMouseDown = useCallback((e) => {
        if (!drawingMode) return;
        
        // 🔥 그리기 시작시 어노테이션 레이어 활성화
        if (setActiveLayer) {
            console.log('✏️ 어노테이션 그리기 시작 - 어노테이션 레이어 활성화');
            setActiveLayer('annotation');
        }
        
        const rect = overlayRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        setIsDrawing(true);
        setCurrentBox({
            startX: x,
            startY: y,
            endX: x,
            endY: y
        });
    }, [drawingMode, setActiveLayer]);
    
    /**
     * 마우스 이동 이벤트 핸들러 (박스 크기 조정)
     */
    const handleMouseMove = useCallback((e) => {
        if (!isDrawing || !drawingMode) return;
        
        const rect = overlayRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        setCurrentBox(prev => prev ? ({
            ...prev,
            endX: x,
            endY: y
        }) : null);
    }, [isDrawing, drawingMode]);
    
    /**
     * 마우스 업 이벤트 핸들러 (박스 그리기 완료)
     */
    const handleMouseUp = useCallback((e) => {
        if (!isDrawing || !drawingMode) return;
        
        setIsDrawing(false);
        
        if (currentBox) {
            const width = Math.abs(currentBox.endX - currentBox.startX);
            const height = Math.abs(currentBox.endY - currentBox.startY);
            
            // 최소 크기 체크
            if (width > 10 && height > 10) {
                setTempBox(currentBox);
                setShowLabelModal(true);
                
                // 🔥 모달 열릴 때 모달 레이어 활성화
                if (setActiveLayer) {
                    console.log('📋 라벨 모달 열림 - 모달 레이어 활성화');
                    setActiveLayer('modal');
                }
            }
        }
        
        setCurrentBox(null);
    }, [isDrawing, drawingMode, currentBox, setActiveLayer]);
    
    // =============================================================================
    // 어노테이션 관리 함수들
    // =============================================================================
    
    /**
     * 바운딩 박스를 저장하는 함수
     */
    const saveBoundingBox = useCallback((label) => {
        if (!tempBox || !label.trim()) return;
        
        const normalizedBox = {
            id: Date.now(),
            left: Math.min(tempBox.startX, tempBox.endX),
            top: Math.min(tempBox.startY, tempBox.endY),
            width: Math.abs(tempBox.endX - tempBox.startX),
            height: Math.abs(tempBox.endY - tempBox.startY),
            label: label.trim(),
            confidence: 1.0,
            created: new Date().toISOString()
        };
        
        setAnnotationBoxes(prev => [...prev, normalizedBox]);
        setShowLabelModal(false);
        setNewBoxLabel('');
        setTempBox(null);
        
        // 🔥 모달 닫을 때 어노테이션 레이어로 돌아가기
        if (setActiveLayer) {
            console.log('💾 라벨 저장 완료 - 어노테이션 레이어로 복귀');
            setActiveLayer('annotation');
        }
    }, [tempBox, setActiveLayer]);
    
    /**
     * 바운딩 박스를 삭제하는 함수
     */
    const deleteBoundingBox = useCallback((boxId) => {
        setAnnotationBoxes(prev => prev.filter(box => box.id !== boxId));
        
        // 🔥 삭제 시 어노테이션 레이어 활성화
        if (setActiveLayer) {
            console.log('🗑️ 어노테이션 삭제 - 어노테이션 레이어 활성화');
            setActiveLayer('annotation');
        }
    }, [setActiveLayer]);
    
    /**
     * 개별 어노테이션을 삭제하는 함수 (확인 창 포함)
     */
    const deleteIndividualAnnotation = useCallback((boxId) => {
        const box = annotationBoxes.find(b => b.id === boxId);
        if (box && window.confirm(`"${box.label}" 어노테이션을 삭제하시겠습니까?`)) {
            deleteBoundingBox(boxId);
            setShowAnnotationDropdown(false);
        }
    }, [annotationBoxes, deleteBoundingBox]);
    
    // =============================================================================
    // 서버 통신 함수들
    // =============================================================================
    
    /**
     * 어노테이션을 서버에 저장하는 함수
     */
    const saveAnnotationsToServer = useCallback(async () => {
        if (!currentStudyUID || annotationBoxes.length === 0) {
            setAnalysisStatus('저장할 어노테이션이 없습니다');
            return;
        }
        
        // 🔥 저장 시작시 어노테이션 레이어 활성화
        if (setActiveLayer) {
            setActiveLayer('annotation');
        }
        
        try {
            setAnalysisStatus('어노테이션 저장 중...');
            
            const data = await saveAnnotations(currentStudyUID, annotationBoxes);
            
            if (data.status === 'success') {
                setAnalysisStatus(`✅ 어노테이션 저장 완료! (${annotationBoxes.length}개)`);
            } else {
                setAnalysisStatus('❌ 저장 실패: ' + data.message);
                console.error('❌ 저장 실패 상세:', data);
            }
        } catch (error) {
            setAnalysisStatus('❌ 저장 실패: ' + error.message);
            console.error('❌ 네트워크 에러:', error);
        }
    }, [currentStudyUID, annotationBoxes, setAnalysisStatus, setActiveLayer]);
    
    /**
     * 서버에서 어노테이션을 불러오는 함수
     */
    const loadAnnotationsFromServer = useCallback(async () => {
        if (!currentStudyUID) return;
        
        // 🔥 불러오기 시작시 어노테이션 레이어 활성화
        if (setActiveLayer) {
            setActiveLayer('annotation');
        }
        
        try {
            setAnalysisStatus('어노테이션 불러오는 중...');
            
            const data = await loadAnnotations(currentStudyUID);
            
            if (data.status === 'success' && data.annotations) {
                const loadedBoxes = data.annotations.map((ann, index) => ({
                    id: Date.now() + index,
                    left: ann.bbox[0],
                    top: ann.bbox[1],
                    width: ann.bbox[2] - ann.bbox[0],
                    height: ann.bbox[3] - ann.bbox[1],
                    label: ann.label,
                    confidence: ann.confidence,
                    created: ann.created || new Date().toISOString()
                }));
                
                // 🔥 개수에 따른 메시지 분기
                if (loadedBoxes.length === 0) {
                    setAnalysisStatus('불러올 어노테이션이 없습니다');
                    showToast('불러올 어노테이션이 없습니다');
                } else {
                    setAnnotationBoxes(loadedBoxes);
                    setAnalysisStatus(`✅ 어노테이션 불러오기 완료! (${loadedBoxes.length}개)`);
                    showToast(`✅ 어노테이션 ${loadedBoxes.length}개를 불러왔습니다`);
                }
            } else {
                // 🔥 응답은 성공했지만 데이터가 없는 경우
                setAnalysisStatus('불러올 어노테이션이 없습니다');
                showToast('불러올 어노테이션이 없습니다');
            }
        } catch (error) {
            // 🔥 네트워크 에러나 404 등의 경우
            if (error.message.includes('404') || error.message.includes('Not Found')) {
                setAnalysisStatus('불러올 어노테이션이 없습니다');
                showToast('불러올 어노테이션이 없습니다');
            } else {
                setAnalysisStatus('❌ 불러오기 실패: ' + error.message);
                showToast('❌ 어노테이션 불러오기에 실패했습니다');
            }
            console.error('❌ 불러오기 에러:', error);
        }
    }, [currentStudyUID, setAnalysisStatus, setActiveLayer]);

    // const loadAnnotationsFromServer = useCallback(async () => {
    //     if (!currentStudyUID) return;
        
    //     // 🔥 불러오기 시작시 어노테이션 레이어 활성화
    //     if (setActiveLayer) {
    //         setActiveLayer('annotation');
    //     }
        
    //     try {
    //         setAnalysisStatus('어노테이션 불러오는 중...');
            
    //         const data = await loadAnnotations(currentStudyUID);
            
    //         if (data.status === 'success' && data.annotations) {
    //             const loadedBoxes = data.annotations.map((ann, index) => ({
    //                 id: Date.now() + index,
    //                 left: ann.bbox[0],
    //                 top: ann.bbox[1],
    //                 width: ann.bbox[2] - ann.bbox[0],
    //                 height: ann.bbox[3] - ann.bbox[1],
    //                 label: ann.label,
    //                 confidence: ann.confidence,
    //                 created: ann.created || new Date().toISOString()
    //             }));
                
    //             setAnnotationBoxes(loadedBoxes);
    //             setAnalysisStatus(`✅ 어노테이션 불러오기 완료! (${loadedBoxes.length}개)`);
    //         } else {
    //             setAnalysisStatus('저장된 어노테이션이 없습니다');
    //         }
    //     } catch (error) {
    //         setAnalysisStatus('❌ 불러오기 실패: ' + error.message);
    //         console.error('❌ 불러오기 에러:', error);
    //     }
    // }, [currentStudyUID, setAnalysisStatus, setActiveLayer]);
    
    // =============================================================================
    // 토글 및 UI 함수들
    // =============================================================================
    
    /**
     * 그리기 모드를 토글하는 함수
     */
    const toggleDrawingMode = useCallback(() => {
        setDrawingMode(prev => {
            const newMode = !prev;
            // 🔥 그리기 모드 변경시 어노테이션 레이어 활성화
            if (setActiveLayer && newMode) {
                console.log('✏️ 그리기 모드 ON - 어노테이션 레이어 활성화');
                setActiveLayer('annotation');
            }
            return newMode;
        });
    }, [setActiveLayer]);
    
    /**
     * 어노테이션 표시를 토글하는 함수
     */
    const toggleAnnotations = useCallback(() => {
        setShowAnnotations(prev => {
            const newShow = !prev;
            // 🔥 어노테이션 표시 변경시 어노테이션 레이어 활성화
            if (setActiveLayer && newShow) {
                setActiveLayer('annotation');
            }
            return newShow;
        });
    }, [setActiveLayer]);
    
    /**
     * 어노테이션 드롭다운을 토글하는 함수
     */
    const toggleAnnotationDropdown = useCallback(() => {
        setShowAnnotationDropdown(prev => {
            const newShow = !prev;
            // 🔥 드롭다운 열릴 때 어노테이션 레이어 활성화
            if (setActiveLayer && newShow) {
                setActiveLayer('annotation');
            }
            return newShow;
        });
    }, [setActiveLayer]);
    
    /**
     * 라벨 모달을 취소하는 함수
     */
    const cancelLabelModal = useCallback(() => {
        setShowLabelModal(false);
        setNewBoxLabel('');
        setTempBox(null);
        
        // 🔥 모달 취소시 어노테이션 레이어로 돌아가기
        if (setActiveLayer) {
            console.log('❌ 라벨 모달 취소 - 어노테이션 레이어로 복귀');
            setActiveLayer('annotation');
        }
    }, [setActiveLayer]);
    
    // =============================================================================
    // 정리 및 초기화 함수들
    // =============================================================================
    
    /**
     * 모든 어노테이션을 클리어하는 함수
     */
    const clearAllAnnotations = useCallback(() => {
        if (annotationBoxes.length > 0 && 
            window.confirm(`모든 어노테이션(${annotationBoxes.length}개)을 삭제하시겠습니까?`)) {
            setAnnotationBoxes([]);
            setAnalysisStatus('어노테이션이 모두 삭제되었습니다');
            
            // 🔥 클리어시 어노테이션 레이어 활성화
            if (setActiveLayer) {
                setActiveLayer('annotation');
            }
        }
    }, [annotationBoxes.length, setAnalysisStatus, setActiveLayer]);
    
    /**
     * 어노테이션 상태를 초기화하는 함수
     */
    const resetAnnotationState = useCallback(() => {
        setDrawingMode(false);
        setIsDrawing(false);
        setCurrentBox(null);
        setShowLabelModal(false);
        setNewBoxLabel('');
        setTempBox(null);
        setShowAnnotationDropdown(false);
    }, []);
    
    // =============================================================================
    // 반환값
    // =============================================================================
    
    return {
        // 상태
        drawingMode,
        isDrawing,
        currentBox,
        showAnnotations,
        annotationBoxes,
        showLabelModal,
        newBoxLabel,
        tempBox,
        showAnnotationDropdown,
        overlayRef,
        
        // 마우스 이벤트 핸들러
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        
        // 어노테이션 관리
        saveBoundingBox,
        deleteBoundingBox,
        deleteIndividualAnnotation,
        clearAllAnnotations,
        
        // 서버 통신
        saveAnnotationsToServer,
        loadAnnotationsFromServer,
        
        // UI 토글
        toggleDrawingMode,
        toggleAnnotations,
        toggleAnnotationDropdown,
        cancelLabelModal,
        
        // 상태 관리
        setNewBoxLabel,
        resetAnnotationState,
        
        // 상태 설정 함수들 (외부에서 필요한 경우)
        setShowAnnotations,
        setAnnotationBoxes,
        setDrawingMode
    };
};

export default useAnnotations;