// src/hooks/useAIAnalysis.js

//이거 백업파일임요..

import { useState, useCallback } from 'react';
import { 
    analyzeWithYOLO, 
    analyzeWithSSD, 
    loadAnalysisResults, 
    clearAnalysisResults, 
    checkModelStatus,
    checkExistingAnalysis,
    saveAnalysisResults
} from '../utils/api';


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
 * AI 분석 관련 상태와 로직을 관리하는 커스텀 훅
 * @param {string} currentStudyUID - 현재 선택된 스터디 UID
 * @returns {Object} AI 분석 관련 상태와 함수들
 */
const useAIAnalysis = (currentStudyUID) => {
    // =============================================================================
    // 상태 관리
    // =============================================================================
    
    // 분석 상태 및 결과
    const [analysisStatus, setAnalysisStatus] = useState('대기 중');
    const [analysisResults, setAnalysisResults] = useState(null);
    const [overlays, setOverlays] = useState([]);
    
    // 오버레이 표시 상태
    const [showOverlays, setShowOverlays] = useState(true);
    
    // 로딩 상태
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // 모델 상태
    const [modelStatus, setModelStatus] = useState({
        yolo: { available: false },
        ssd: { available: false }
    });

    // 모델별 오버레이 표시 상태
    const [showYOLOOverlays, setShowYOLOOverlays] = useState(true);
    const [showSSDOverlays, setShowSSDOverlays] = useState(false);

    // =============================================================================
    // AI 분석 실행 함수들
    // =============================================================================
    
    /**
     * YOLO 분석을 실행하는 함수
     */
    const analyzeYOLO = useCallback(async (forceOverwrite = false) => {
        // 🔥 이벤트 객체 방어 코드 추가
        if (typeof forceOverwrite === 'object' && forceOverwrite !== null) {
            console.log('이벤트 객체가 들어왔습니다. false로 처리합니다.');
            forceOverwrite = false;
        }

        if (!currentStudyUID) {
            setAnalysisStatus('Study UID를 찾을 수 없습니다');
            showToast('Study UID를 찾을 수 없습니다');
            return false;
        }

        // 분석 시작할 때 기존 결과 초기화
        setAnalysisResults(null);
        setOverlays([]);
        setShowOverlays(false);
        
        // 중복 체크 (강제 덮어쓰기가 아닐 때만)
        if (!forceOverwrite) {
            try {
                console.log('🔍 중복 체크 시작:', currentStudyUID);
                const existingCheck = await checkExistingAnalysis(currentStudyUID, 'YOLO');
                console.log('🔍 중복 체크 결과:', existingCheck);
                
                if (existingCheck.exists) {
                    console.log('⚠️ 기존 결과 발견! 사용자 확인 요청');
                    
                    const userConfirmed = window.confirm(
                        `이미 YOLO 분석 결과가 존재합니다.\n기존 결과를 덮어쓰시겠습니까?`
                    );
                    
                    if (userConfirmed) {
                        showToast('YOLO 분석을 진행합니다...');
                        return await analyzeYOLO(true); // forceOverwrite = true로 재귀 호출
                    } else {
                        showToast('YOLO 분석이 취소되었습니다');
                        setAnalysisStatus('분석이 취소되었습니다');
                        return false;
                    }
                } else {
                    console.log('✅ 기존 결과 없음, 분석 진행');
                }
            } catch (error) {
                console.error('❌ 중복 체크 실패:', error);
                setAnalysisStatus('중복 체크 실패. 다시 시도해주세요.');
                showToast('중복 체크 실패. 다시 시도해주세요.');
                setIsAnalyzing(false);
                return false;
            }
        }
        
        // 실제 분석 실행
        try {
            setIsAnalyzing(true);
            setAnalysisStatus(`YOLO 분석 중... (${currentStudyUID.substring(0, 20)}...)`);
            showToast('YOLO 분석을 시작합니다...');
            
            console.log('📤 API 호출:', { studyUID: currentStudyUID, forceOverwrite });
            const data = await analyzeWithYOLO(currentStudyUID, forceOverwrite);
            
            if (data.status === 'success') {
                console.log('🔥 YOLO 분석 완료 - 전체 응답:', data);
                
                setAnalysisResults(data);
                setOverlays(data.results || []);
                
                const statusMessage = data.patient_info 
                    ? `YOLO 분석 완료! 환자: ${data.patient_info.patient_name} (${data.patient_info.patient_id}) - 검출: ${data.detections}개`
                    : `YOLO 분석 완료! (검출: ${data.detections}개)`;
                
                setAnalysisStatus(statusMessage);
                showToast(`YOLO 분석 완료! ${data.detections}개 검출`);
                
                return true;
            } else {
                setAnalysisStatus('YOLO 분석 실패: ' + data.message);
                showToast('YOLO 분석 실패: ' + data.message);
                return false;
            }
        } catch (error) {
            setAnalysisStatus('YOLO 분석 실패: ' + error.message);
            showToast('YOLO 분석 실패: ' + error.message);
            console.error('YOLO 분석 에러:', error);
            return false;
        } finally {
            setIsAnalyzing(false);
        }
    }, [currentStudyUID]);
    
    /**
     * SSD 분석을 실행하는 함수
     */
    const analyzeSSD = useCallback(async (forceOverwrite = false) => {
        // 🔥 이벤트 객체 방어 코드 추가
        if (typeof forceOverwrite === 'object' && forceOverwrite !== null) {
            console.log('이벤트 객체가 들어왔습니다. false로 처리합니다.');
            forceOverwrite = false;
        }

        if (!currentStudyUID) {
            setAnalysisStatus('Study UID를 찾을 수 없습니다');
            showToast('Study UID를 찾을 수 없습니다');
            return false;
        }

        // 분석 시작할 때 기존 결과 초기화  
        setAnalysisResults(null);
        setOverlays([]);
        setShowOverlays(false);
        
        // 중복 체크 (강제 덮어쓰기가 아닐 때만)
        if (!forceOverwrite) {
            try {
                console.log('🔍 중복 체크 시작:', currentStudyUID);
                const existingCheck = await checkExistingAnalysis(currentStudyUID, 'SSD');
                console.log('🔍 중복 체크 결과:', existingCheck);
                
                if (existingCheck.exists) {
                    console.log('⚠️ 기존 결과 발견! 사용자 확인 요청');
                    
                    const userConfirmed = window.confirm(
                        `이미 SSD 분석 결과가 존재합니다.\n기존 결과를 덮어쓰시겠습니까?`
                    );
                    
                    if (userConfirmed) {
                        showToast('SSD 분석을 진행합니다...');
                        return await analyzeSSD(true); // forceOverwrite = true로 재귀 호출
                    } else {
                        showToast('SSD 분석이 취소되었습니다');
                        setAnalysisStatus('분석이 취소되었습니다');
                        return false;
                    }
                } else {
                    console.log('✅ 기존 결과 없음, 분석 진행');
                }
            } catch (error) {
                console.error('❌ 중복 체크 실패:', error);
                setAnalysisStatus('중복 체크 실패. 다시 시도해주세요.');
                showToast('중복 체크 실패. 다시 시도해주세요.');
                setIsAnalyzing(false);
                return false;
            }
        }
        
        // 실제 분석 실행
        try {
            setIsAnalyzing(true);
            setAnalysisStatus(`SSD 분석 중... (${currentStudyUID.substring(0, 20)}...)`);
            showToast('SSD 분석을 시작합니다...');
            
            console.log('📤 API 호출:', { studyUID: currentStudyUID, forceOverwrite });
            const data = await analyzeWithSSD(currentStudyUID, forceOverwrite);
            
            if (data.status === 'success') {
                console.log('🔥 SSD 분석 완료 - 전체 응답:', data);
                
                setAnalysisResults(data);
                setOverlays(data.results || []);
                
                const statusMessage = data.patient_info 
                    ? `SSD 분석 완료! 환자: ${data.patient_info.patient_name} (${data.patient_info.patient_id}) - 검출: ${data.detections}개`
                    : `SSD 분석 완료! (검출: ${data.detections}개)`;
                
                setAnalysisStatus(statusMessage);
                showToast(`SSD 분석 완료! ${data.detections}개 검출`);
                
                return true;
            } else {
                setAnalysisStatus('SSD 분석 실패: ' + data.message);
                showToast('SSD 분석 실패: ' + data.message);
                return false;
            }
        } catch (error) {
            setAnalysisStatus('SSD 분석 실패: ' + error.message);
            showToast('SSD 분석 실패: ' + error.message);
            console.error('SSD 분석 에러:', error);
            return false;
        } finally {
            setIsAnalyzing(false);
        }
    }, [currentStudyUID]);
    
    // =============================================================================
    // 분석 결과 관리 함수들
    // =============================================================================
    
    /**
     * 저장된 분석 결과를 불러오는 함수 - 🔥 모델별 조회 지원
     */
    const loadSavedResults = useCallback(async (modelType = null) => {
        if (!currentStudyUID) {
            setAnalysisStatus('Study UID를 찾을 수 없습니다');
            showToast('Study UID를 찾을 수 없습니다');
            return false;
        }
        
        try {
            setAnalysisStatus('결과 조회 중...');
            
            // 🔥 모델별 조회 지원
            let url = `http://35.225.63.41:8000/api/ai/results/${currentStudyUID}/`;
            if (modelType) {
                url += `?model_type=${modelType.toLowerCase()}`;
            }
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === 'success') {
                // 🔥 모델별 그룹화된 데이터 처리
                if (data.grouped_by_model) {
                    console.log('🔥 모델별 그룹화 데이터:', data.grouped_by_model);
                    
                    // 기존 결과와 병합
                    setAnalysisResults(prev => ({
                        ...prev,
                        ...data,
                        grouped_results: data.grouped_by_model
                    }));
                    
                    // 오버레이 데이터 설정
                    setOverlays(data.results || []);
                    
                    const modelInfo = Object.keys(data.grouped_by_model).map(model => 
                        `${model}: ${data.grouped_by_model[model].length}개`
                    ).join(', ');
                    
                    setAnalysisStatus(`저장된 결과 (총 ${data.total_count}개) - ${modelInfo}`);
                    showToast(`저장된 결과를 불러왔습니다: ${modelInfo}`);
                } else {
                    // 기존 형식 호환
                    setAnalysisResults(data);
                    setOverlays(data.results || []);
                    setAnalysisStatus(`저장된 결과 (${data.count}개)`);
                    showToast(`저장된 결과 ${data.count}개를 불러왔습니다`);
                }
                
                return true;
            } else {
                setAnalysisStatus('저장된 결과 없음');
                showToast('저장된 결과가 없습니다');
                return false;
            }
        } catch (error) {
            setAnalysisStatus('조회 실패: ' + error.message);
            showToast('결과 조회에 실패했습니다');
            console.error('결과 조회 에러:', error);
            return false;
        }
    }, [currentStudyUID]);

    /**
     * 🔥 모델별 결과 조회 함수 (새로 추가)
     */
    const loadYOLOResults = useCallback(() => loadSavedResults('yolo'), [loadSavedResults]);
    const loadSSDResults = useCallback(() => loadSavedResults('ssd'), [loadSavedResults]);

    /**
     * 분석 결과를 삭제하는 함수
     */
    const clearResults = useCallback(async () => {
        if (!currentStudyUID) {
            setAnalysisStatus('Study UID를 찾을 수 없습니다');
            showToast('Study UID를 찾을 수 없습니다');
            return false;
        }
        
        // 🔥 확인창 추가
        const userConfirmed = window.confirm('⚠️ 모든 AI 분석 결과를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.');
        
        if (!userConfirmed) {
            showToast('삭제가 취소되었습니다');
            return false;
        }
        
        try {
            showToast('모든 결과 삭제 중...');
            
            const data = await clearAnalysisResults(currentStudyUID);
            
            if (data.status === 'success') {
                setAnalysisStatus('결과 삭제됨');
                setAnalysisResults(null);
                setOverlays([]);
                setShowOverlays(false);
                showToast('✅ 모든 분석 결과가 삭제되었습니다');
                return true;
            } else {
                setAnalysisStatus('삭제 실패: ' + data.message);
                showToast('❌ 결과 삭제에 실패했습니다');
                return false;
            }
        } catch (error) {
            setAnalysisStatus('삭제 실패: ' + error.message);
            showToast('❌ 결과 삭제에 실패했습니다');
            console.error('결과 삭제 에러:', error);
            return false;
        }
    }, [currentStudyUID]);

    /**
     * 🔥 모델별 결과 삭제 함수 (새로 추가)
     */
    const clearModelResults = useCallback(async (modelType) => {
        if (!currentStudyUID) {
            setAnalysisStatus('Study UID를 찾을 수 없습니다');
            showToast('Study UID를 찾을 수 없습니다');
            return false;
        }
        
        const modelName = modelType.toUpperCase();
        const userConfirmed = window.confirm(`⚠️ ${modelName} 분석 결과만 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`);
        
        if (!userConfirmed) {
            showToast('삭제가 취소되었습니다');
            return false;
        }
        
        try {
            showToast(`${modelName} 결과 삭제 중...`);
            
            const response = await fetch(
                `http://35.225.63.41:8000/api/ai/clear/${currentStudyUID}/${modelType.toLowerCase()}/`,
                { method: 'DELETE' }
            );
            const data = await response.json();
            
            if (data.status === 'success') {
                // 오버레이에서 해당 모델 결과 제거
                setOverlays(prev => prev.filter(overlay => {
                    const model = overlay.model || '';
                    return !model.toLowerCase().includes(modelType.toLowerCase());
                }));
                
                // 분석 결과에서 해당 모델 결과 제거
                setAnalysisResults(prev => {
                    if (prev && prev.grouped_results) {
                        const newGrouped = { ...prev.grouped_results };
                        delete newGrouped[modelName === 'YOLO' ? 'YOLOv8' : 'SSD'];
                        
                        return {
                            ...prev,
                            grouped_results: newGrouped,
                            results: prev.results.filter(r => !r.model.toLowerCase().includes(modelType.toLowerCase()))
                        };
                    }
                    return prev;
                });
                
                setAnalysisStatus(`${modelName} 결과 삭제됨`);
                showToast(`✅ ${modelName} 분석 결과가 삭제되었습니다`);
                return true;
            } else {
                setAnalysisStatus(`${modelName} 삭제 실패: ` + data.message);
                showToast(`❌ ${modelName} 결과 삭제에 실패했습니다`);
                return false;
            }
        } catch (error) {
            setAnalysisStatus(`${modelName} 삭제 실패: ` + error.message);
            showToast(`❌ ${modelName} 결과 삭제에 실패했습니다`);
            console.error(`${modelName} 결과 삭제 에러:`, error);
            return false;
        }
    }, [currentStudyUID]);

    // =============================================================================
    // 모델 상태 관리 함수들
    // =============================================================================
    
    /**
     * AI 모델 상태를 확인하는 함수
     */
    const checkAIModelStatus = useCallback(async () => {
        try {
            const data = await checkModelStatus();
            
            if (data.status === 'success') {
                setModelStatus(data.models);
                setAnalysisStatus(
                    `모델 상태 - YOLO: ${data.models.yolo.available ? '✅' : '❌'}, SSD: ${data.models.ssd.available ? '✅' : '❌'}`
                );
                showToast('모델 상태를 확인했습니다');
                return data.models;
            } else {
                setAnalysisStatus('상태 확인 실패');
                showToast('모델 상태 확인에 실패했습니다');
                return null;
            }
        } catch (error) {
            setAnalysisStatus('상태 확인 실패: ' + error.message);
            showToast('모델 상태 확인에 실패했습니다');
            console.error('모델 상태 확인 에러:', error);
            return null;
        }
    }, []);
    
    /**
     * 모델 가용성을 확인하는 함수
     * @param {string} modelType - 'yolo' 또는 'ssd'
     * @returns {boolean} 모델 사용 가능 여부
     */
    const isModelAvailable = useCallback((modelType) => {
        return modelStatus[modelType]?.available || false;
    }, [modelStatus]);
    
    // =============================================================================
    // 오버레이 관리 함수들
    // =============================================================================
    
    const toggleOverlayMode = () => {
        if (showYOLOOverlays && !showSSDOverlays) {
            // 현재: YOLO만 → 다음: SSD만
            setShowYOLOOverlays(false);
            setShowSSDOverlays(true);
        } else if (!showYOLOOverlays && showSSDOverlays) {
            // 현재: SSD만 → 다음: 둘 다
            setShowYOLOOverlays(true);
            setShowSSDOverlays(true);
        } else if (showYOLOOverlays && showSSDOverlays) {
            // 현재: 둘 다 → 다음: 모두 끄기
            setShowYOLOOverlays(false);
            setShowSSDOverlays(false);
        } else {
            // 현재: 모두 꺼짐 → 다음: YOLO만
            setShowYOLOOverlays(true);
            setShowSSDOverlays(false);
        }
    };
    
    /**
     * 오버레이를 수동으로 재계산하는 함수 (디버깅용)
     */
    const recalculateOverlays = useCallback(() => {
        console.log('🔄 수동 오버레이 재계산');
        setOverlays(prev => [...prev]);
    }, []);
    
    /**
     * 오버레이 데이터를 필터링하는 함수
     * @param {number} minConfidence - 최소 신뢰도 (0-1)
     * @returns {Array} 필터링된 오버레이 배열
     */
    const getFilteredOverlays = useCallback((minConfidence = 0) => {
        return overlays.filter(overlay => overlay.confidence >= minConfidence);
    }, [overlays]);
    
    /**
     * 신뢰도별로 오버레이를 그룹화하는 함수
     * @returns {Object} 신뢰도별 그룹화된 오버레이
     */
    const getOverlaysByConfidence = useCallback(() => {
        return {
            high: overlays.filter(o => o.confidence > 0.8),
            medium: overlays.filter(o => o.confidence > 0.5 && o.confidence <= 0.8),
            low: overlays.filter(o => o.confidence <= 0.5)
        };
    }, [overlays]);
    
    // =============================================================================
    // 분석 결과 처리 함수들
    // =============================================================================
    
    /**
     * 분석 결과 통계를 가져오는 함수
     * @returns {Object} 분석 결과 통계
     */
    const getAnalysisStatistics = useCallback(() => {
        if (!analysisResults || !analysisResults.results) {
            return { total: 0, highConfidence: 0, lowConfidence: 0 };
        }
        
        const results = analysisResults.results;
        return {
            total: results.length,
            highConfidence: results.filter(r => r.confidence > 0.8).length,
            lowConfidence: results.filter(r => r.confidence <= 0.8).length,
            averageConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length
        };
    }, [analysisResults]);
    
    /**
     * 특정 라벨의 검출 결과만 가져오는 함수
     * @param {string} label - 찾을 라벨명
     * @returns {Array} 해당 라벨의 검출 결과들
     */
    const getResultsByLabel = useCallback((label) => {
        if (!analysisResults || !analysisResults.results) return [];
        return analysisResults.results.filter(result => 
            result.label.toLowerCase().includes(label.toLowerCase())
        );
    }, [analysisResults]);

    /**
     * 🔥 모델별 통계 조회 함수 (새로 추가)
     */
    const getModelStatistics = useCallback(() => {
        if (!analysisResults || !analysisResults.grouped_results) {
            return { yolo: 0, ssd: 0, total: 0 };
        }
        
        const grouped = analysisResults.grouped_results;
        return {
            yolo: grouped.YOLOv8?.length || 0,
            ssd: grouped.SSD?.length || 0,
            total: (grouped.YOLOv8?.length || 0) + (grouped.SSD?.length || 0)
        };
    }, [analysisResults]);

    // =============================================================================
    // 개별 결과 관리 함수들
    // =============================================================================

    /**
     * 🔥 개별 결과 삭제 함수 수정 (URL 수정)
     */
    const requestDeleteResult = useCallback(async (resultId) => {
        const userConfirmed = window.confirm('이 분석 결과를 삭제하시겠습니까?');
        
        if (!userConfirmed) {
            showToast('삭제가 취소되었습니다');
            return false;
        }

        try {
            showToast('삭제 중...');
            
            // 🔥 URL 수정: localhost → 실제 서버 주소
            const response = await fetch(`http://35.225.63.41:8000/api/ai/result/${resultId}/`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                setAnalysisResults(prev => ({
                    ...prev,
                    results: prev.results.filter(r => r.id !== resultId)
                }));
                setOverlays(prev => prev.filter(o => o.id !== resultId));
                showToast('✅ 분석 결과가 삭제되었습니다');
                return true;
            } else {
                showToast('❌ 삭제에 실패했습니다');
                return false;
            }
        } catch (error) {
            showToast('❌ 삭제 중 오류가 발생했습니다');
            console.error('개별 삭제 에러:', error);
            return false;
        }
    }, []);

    const toggleYOLOOverlays = useCallback(() => {
        setShowYOLOOverlays(prev => !prev);
    }, []);

    const toggleSSDOverlays = useCallback(() => {
        setShowSSDOverlays(prev => !prev);
    }, []);

    /**
     * 🔥 오버레이 필터링 로직 개선
     */
    const getVisibleOverlays = useCallback(() => {
        if (!overlays || overlays.length === 0) return [];

        console.log('🧪 필터링 전 전체 오버레이:', overlays.length, '개');
        console.log('🎛️ YOLO 표시 상태:', showYOLOOverlays);
        console.log('🎛️ SSD 표시 상태:', showSSDOverlays);

        const filteredOverlays = overlays.filter((overlay, idx) => {
            const model = overlay.model || '';
            
            // 🔥 모델명 매칭 개선
            if (model.toLowerCase().includes('yolo')) return showYOLOOverlays;
            if (model.toLowerCase().includes('ssd')) return showSSDOverlays;
            
            // 기본적으로 숨김
            return false;
        });

        console.log(`🎯 최종 결과: ${filteredOverlays.length}/${overlays.length} 표시됨`);
        return filteredOverlays;
    }, [overlays, showYOLOOverlays, showSSDOverlays]);

    // =============================================================================
    // 유틸리티 함수들
    // =============================================================================
    
    /**
     * 분석 상태를 초기화하는 함수
     */
    const resetAnalysisState = useCallback(() => {
        setAnalysisStatus('대기 중');
        setAnalysisResults(null);
        setOverlays([]);
        setShowOverlays(false);
        setIsAnalyzing(false);
    }, []);
    
    /**
     * 분석이 진행 중인지 확인하는 함수
     * @returns {boolean} 분석 진행 여부
     */
    const isAnalysisInProgress = useCallback(() => {
        return isAnalyzing;
    }, [isAnalyzing]);
    
    /**
     * 분석 결과가 있는지 확인하는 함수
     * @returns {boolean} 분석 결과 존재 여부
     */
    const hasAnalysisResults = useCallback(() => {
        return analysisResults && analysisResults.results && analysisResults.results.length > 0;
    }, [analysisResults]);
    
    // =============================================================================
    // 반환값
    // =============================================================================
    
    return {
        // 상태
        analysisStatus,
        analysisResults,
        overlays,
        showOverlays,
        isAnalyzing,
        modelStatus,
        showYOLOOverlays,
        showSSDOverlays,
        
        // 분석 실행
        analyzeYOLO,
        analyzeSSD,
        
        // 결과 관리
        loadSavedResults,
        clearResults,
        
        // 🔥 새로 추가된 함수들
        loadYOLOResults,
        loadSSDResults,
        clearModelResults,
        getModelStatistics,
        
        // 개별 결과 관리
        toggleYOLOOverlays,
        toggleSSDOverlays,
        requestDeleteResult,
        getVisibleOverlays,
        
        // 모델 상태
        checkAIModelStatus,
        isModelAvailable,
        
        // 오버레이 관리
        toggleOverlayMode,
        recalculateOverlays,
        getFilteredOverlays,
        getOverlaysByConfidence,
        
        // 분석 결과 처리
        getAnalysisStatistics,
        getResultsByLabel,
        
        // 유틸리티
        resetAnalysisState,
        isAnalysisInProgress,
        hasAnalysisResults,
        
        // 상태 설정 함수들 (필요한 경우)
        setAnalysisStatus,
        setAnalysisResults,
        setOverlays,
        setShowOverlays
    };
};

export default useAIAnalysis;