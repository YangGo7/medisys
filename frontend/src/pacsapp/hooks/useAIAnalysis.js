// src/hooks/useAIAnalysis.js
import { useState, useCallback } from 'react';

// 🔥 AI 서비스 API 설정
const AI_SERVICE_URL = 'http://35.225.63.41:5000'; // AI 서비스 포트
const DJANGO_URL = 'http://35.225.63.41:8000'; // Django API

// 🔥 API 함수들 직접 구현
const analyzeWithYOLO = async (studyUID, forceOverwrite = false) => {
    const response = await fetch(`${AI_SERVICE_URL}/analyze/${studyUID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_overwrite: forceOverwrite, model_type: 'yolo' })
    });
    return await response.json();
};

const analyzeWithSSD = async (studyUID, forceOverwrite = false) => {
    const response = await fetch(`${AI_SERVICE_URL}/analyze/${studyUID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_overwrite: forceOverwrite, model_type: 'ssd' })
    });
    return await response.json();
};

const clearAnalysisResults = async (studyUID) => {
    const response = await fetch(`${DJANGO_URL}/api/ai/clear/${studyUID}/`, {
        method: 'DELETE'
    });
    return await response.json();
};

const checkModelStatus = async () => {
    const response = await fetch(`${AI_SERVICE_URL}/health`);
    return await response.json();
};

const checkExistingAnalysis = async (studyUID, modelType) => {
    const response = await fetch(`${DJANGO_URL}/api/ai/results/${studyUID}/?model_type=${modelType.toLowerCase()}`);
    const data = await response.json();
    return { exists: data.status === 'success' && data.results?.length > 0 };
};

// 🔥 토스트 알림 함수
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
    
    const [analysisStatus, setAnalysisStatus] = useState('대기 중');
    const [analysisResults, setAnalysisResults] = useState(null);
    const [overlays, setOverlays] = useState([]);
    const [showOverlays, setShowOverlays] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [modelStatus, setModelStatus] = useState({
        yolo: { available: false },
        ssd: { available: false }
    });
    const [showYOLOOverlays, setShowYOLOOverlays] = useState(true);
    const [showSSDOverlays, setShowSSDOverlays] = useState(false);

    // =============================================================================
    // AI 분석 실행 함수들
    // =============================================================================
    
    /**
     * YOLO 분석을 실행하는 함수
     */
    const analyzeYOLO = useCallback(async (forceOverwrite = false) => {
        if (typeof forceOverwrite === 'object' && forceOverwrite !== null) {
            console.log('이벤트 객체가 들어왔습니다. false로 처리합니다.');
            forceOverwrite = false;
        }

        if (!currentStudyUID) {
            setAnalysisStatus('Study UID를 찾을 수 없습니다');
            showToast('Study UID를 찾을 수 없습니다');
            return false;
        }

        setAnalysisResults(null);
        setOverlays([]);
        setShowOverlays(false);
        
        // 중복 체크
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
                        return await analyzeYOLO(true);
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
            
            console.log('📤 AI 서비스 API 호출:', { studyUID: currentStudyUID, forceOverwrite });
            const data = await analyzeWithYOLO(currentStudyUID, forceOverwrite);
            
            console.log('🔥 AI 서비스 응답:', data);
            
            if (data.success) {
                // 🔥 entry.py 응답 구조 처리
                const results = data.results || [];
                const yoloResults = results.filter(r => r.model_type === 'yolo' && r.success);
                
                if (yoloResults.length > 0) {
                    const yoloData = yoloResults[0];
                    const detections = yoloData.detections || [];
                    
                    // 🔥 해상도 정보 추출
                    const imageWidth = data.image_dimensions ? parseInt(data.image_dimensions.split('x')[0]) : 1024;
                    const imageHeight = data.image_dimensions ? parseInt(data.image_dimensions.split('x')[1]) : 1024;
                    
                    setAnalysisResults({
                        status: 'success',
                        results: detections,
                        detections: detections.length,
                        model_used: 'yolo',
                        image_width: imageWidth,
                        image_height: imageHeight
                    });
                    
                    setOverlays(detections);
                    setShowOverlays(true); // 🔥 중요!
                    
                    setAnalysisStatus(`YOLO 분석 완료! (검출: ${detections.length}개)`);
                    showToast(`YOLO 분석 완료! ${detections.length}개 검출`);
                    
                    return true;
                }
            } else {
                setAnalysisStatus('YOLO 분석 실패: ' + (data.error || 'Unknown error'));
                showToast('YOLO 분석 실패: ' + (data.error || 'Unknown error'));
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
        if (typeof forceOverwrite === 'object' && forceOverwrite !== null) {
            console.log('이벤트 객체가 들어왔습니다. false로 처리합니다.');
            forceOverwrite = false;
        }

        if (!currentStudyUID) {
            setAnalysisStatus('Study UID를 찾을 수 없습니다');
            showToast('Study UID를 찾을 수 없습니다');
            return false;
        }

        setAnalysisResults(null);
        setOverlays([]);
        setShowOverlays(false);
        
        // 중복 체크
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
                        return await analyzeSSD(true);
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
            
            console.log('📤 AI 서비스 API 호출:', { studyUID: currentStudyUID, forceOverwrite });
            const data = await analyzeWithSSD(currentStudyUID, forceOverwrite);
            
            console.log('🔥 AI 서비스 응답:', data);
            
            if (data.success) {
                // 🔥 entry.py 응답 구조 처리
                const results = data.results || [];
                const ssdResults = results.filter(r => r.model_type === 'ssd' && r.success);
                
                if (ssdResults.length > 0) {
                    const ssdData = ssdResults[0];
                    const detections = ssdData.detections || [];
                    
                    // 🔥 해상도 정보 추출
                    const imageWidth = data.image_dimensions ? parseInt(data.image_dimensions.split('x')[0]) : 1024;
                    const imageHeight = data.image_dimensions ? parseInt(data.image_dimensions.split('x')[1]) : 1024;
                    
                    setAnalysisResults({
                        status: 'success',
                        results: detections,
                        detections: detections.length,
                        model_used: 'ssd',
                        image_width: imageWidth,
                        image_height: imageHeight
                    });
                    
                    setOverlays(detections);
                    setShowOverlays(true); // 🔥 중요!
                    
                    setAnalysisStatus(`SSD 분석 완료! (검출: ${detections.length}개)`);
                    showToast(`SSD 분석 완료! ${detections.length}개 검출`);
                    
                    return true;
                }
            } else {
                setAnalysisStatus('SSD 분석 실패: ' + (data.error || 'Unknown error'));
                showToast('SSD 분석 실패: ' + (data.error || 'Unknown error'));
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
     * 🔥 수정된 결과 로딩 함수 - entry.py의 /results 엔드포인트 사용
     */
    const loadSavedResults = useCallback(async (modelType = null) => {
        if (!currentStudyUID) {
            setAnalysisStatus('Study UID를 찾을 수 없습니다');
            showToast('Study UID를 찾을 수 없습니다');
            return false;
        }
        
        try {
            setAnalysisStatus('결과 조회 중...');
            
            // 🔥 entry.py의 /results/{instance_id} 엔드포인트 사용
            const url = `${AI_SERVICE_URL}/results/${currentStudyUID}`;
            
            console.log('🔍 AI 서비스 API 호출 URL:', url);
            
            const response = await fetch(url);
            const data = await response.json();
            
            console.log('🔍 AI 서비스 API 응답:', data);
            
            if (data.status === 'success') {
                console.log('✅ AI 서비스에서 데이터 로드 성공:', data);
                
                // 🔥 해상도 보정 로직
                const getValidResolution = (result) => {
                    if (result?.image_width > 0 && result?.image_height > 0) {
                        return { width: result.image_width, height: result.image_height };
                    }
                    if (data.image_width > 0 && data.image_height > 0) {
                        return { width: data.image_width, height: data.image_height };
                    }
                    if (result?.bbox && Array.isArray(result.bbox)) {
                        const [x1, y1, x2, y2] = result.bbox;
                        return { 
                            width: Math.max(x2, 1024), 
                            height: Math.max(y2, 1024) 
                        };
                    }
                    return { width: 1024, height: 1024 };
                };
                
                const resultsWithId = (data.results || []).map((result, index) => {
                    const validResolution = getValidResolution(result);
                    return {
                        ...result,
                        id: result.id || `${currentStudyUID}-${result.model || 'unknown'}-${index}`,
                        uniqueKey: `${result.bbox?.join('-') || index}-${result.confidence || 0}-${result.model || 'unknown'}`,
                        image_width: validResolution.width,
                        image_height: validResolution.height
                    };
                });
                
                // 🔥 모델별 필터링 (modelType이 지정된 경우)
                let filteredResults = resultsWithId;
                if (modelType) {
                    filteredResults = resultsWithId.filter(result => {
                        const model = result.model || '';
                        return model.toLowerCase().includes(modelType.toLowerCase());
                    });
                }
                
                // 🔥 모델별 그룹화
                const groupedResults = {};
                resultsWithId.forEach(result => {
                    const model = result.model || 'unknown';
                    if (!groupedResults[model]) {
                        groupedResults[model] = [];
                    }
                    groupedResults[model].push(result);
                });
                
                const overallResolution = getValidResolution(resultsWithId[0] || {});
                
                setAnalysisResults({
                    status: 'success',
                    results: filteredResults,
                    grouped_results: groupedResults,
                    total_count: resultsWithId.length,
                    detections: filteredResults.length,
                    image_width: overallResolution.width,
                    image_height: overallResolution.height
                });
                
                setOverlays(filteredResults);
                setShowOverlays(true); // 🔥 중요!
                
                if (Object.keys(groupedResults).length > 0) {
                    const modelInfo = Object.keys(groupedResults).map(model => 
                        `${model}: ${groupedResults[model].length}개`
                    ).join(', ');
                    
                    setAnalysisStatus(`저장된 결과 (총 ${resultsWithId.length}개) - ${modelInfo} [해상도: ${overallResolution.width}x${overallResolution.height}]`);
                    showToast(`저장된 결과를 불러왔습니다: ${modelInfo}`);
                } else {
                    const modelName = modelType ? modelType.toUpperCase() : '전체';
                    setAnalysisStatus(`${modelName} 저장된 결과 (${filteredResults.length}개) [해상도: ${overallResolution.width}x${overallResolution.height}]`);
                    showToast(`${modelName} 저장된 결과 ${filteredResults.length}개를 불러왔습니다`);
                }
                
                return true;
            } else {
                console.log('❌ AI 서비스 API 응답 실패:', data);
                setAnalysisStatus('저장된 결과 없음');
                setAnalysisResults(null);
                setOverlays([]);
                setShowOverlays(false);
                showToast('저장된 결과가 없습니다');
                return false;
            }
        } catch (error) {
            console.error('❌ AI 서비스 API 호출 에러:', error);
            setAnalysisStatus('조회 실패: ' + error.message);
            setAnalysisResults(null);
            setOverlays([]);
            setShowOverlays(false);
            showToast('결과 조회에 실패했습니다');
            return false;
        }
    }, [currentStudyUID]);

    /**
     * 🔥 모델별 결과 조회 함수
     */
    const loadYOLOResults = useCallback(async () => {
        console.log('🟡 YOLO 결과 로딩 시작');
        const success = await loadSavedResults('yolo');
        if (success) {
            setShowYOLOOverlays(true);
            setShowSSDOverlays(false);
        }
        return success;
    }, [loadSavedResults]);
    
    const loadSSDResults = useCallback(async () => {
        console.log('🔵 SSD 결과 로딩 시작');
        const success = await loadSavedResults('ssd');
        if (success) {
            setShowYOLOOverlays(false);
            setShowSSDOverlays(true);
        }
        return success;
    }, [loadSavedResults]);

    /**
     * 분석 결과를 삭제하는 함수
     */
    const clearResults = useCallback(async () => {
        if (!currentStudyUID) {
            setAnalysisStatus('Study UID를 찾을 수 없습니다');
            showToast('Study UID를 찾을 수 없습니다');
            return false;
        }
        
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
     * 모델별 결과 삭제 함수
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
                `${DJANGO_URL}/api/ai/clear/${currentStudyUID}/${modelType.toLowerCase()}/`,
                { method: 'DELETE' }
            );
            const data = await response.json();
            
            if (data.status === 'success') {
                setOverlays(prev => prev.filter(overlay => {
                    const model = overlay.model || '';
                    return !model.toLowerCase().includes(modelType.toLowerCase());
                }));
                
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
            
            if (data.status === 'healthy') {
                setModelStatus({
                    yolo: { available: true },
                    ssd: { available: true }
                });
                setAnalysisStatus('모델 상태 - YOLO: ✅, SSD: ✅');
                showToast('모델 상태를 확인했습니다');
                return { yolo: { available: true }, ssd: { available: true } };
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
     */
    const isModelAvailable = useCallback((modelType) => {
        return modelStatus[modelType]?.available || false;
    }, [modelStatus]);
    
    // =============================================================================
    // 오버레이 관리 함수들
    // =============================================================================
    
    const toggleOverlayMode = () => {
        if (showYOLOOverlays && !showSSDOverlays) {
            setShowYOLOOverlays(false);
            setShowSSDOverlays(true);
        } else if (!showYOLOOverlays && showSSDOverlays) {
            setShowYOLOOverlays(true);
            setShowSSDOverlays(true);
        } else if (showYOLOOverlays && showSSDOverlays) {
            setShowYOLOOverlays(false);
            setShowSSDOverlays(false);
        } else {
            setShowYOLOOverlays(true);
            setShowSSDOverlays(false);
        }
    };
    
    const recalculateOverlays = useCallback(() => {
        console.log('🔄 수동 오버레이 재계산');
        setOverlays(prev => [...prev]);
    }, []);
    
    const getFilteredOverlays = useCallback((minConfidence = 0) => {
        return overlays.filter(overlay => overlay.confidence >= minConfidence);
    }, [overlays]);
    
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
    
    const getResultsByLabel = useCallback((label) => {
        if (!analysisResults || !analysisResults.results) return [];
        return analysisResults.results.filter(result => 
            result.label.toLowerCase().includes(label.toLowerCase())
        );
    }, [analysisResults]);

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

    const requestDeleteResult = useCallback(async (resultId) => {
        const userConfirmed = window.confirm('이 분석 결과를 삭제하시겠습니까?');
        
        if (!userConfirmed) {
            showToast('삭제가 취소되었습니다');
            return false;
        }

        try {
            showToast('삭제 중...');
            
            // 🔥 서버에 실제 ID가 있는지 확인 후 삭제 시도
            if (resultId.includes(currentStudyUID)) {
                // 클라이언트에서 생성한 ID인 경우 - 로컬에서만 제거
                console.log('🔄 클라이언트 생성 ID - 로컬에서만 제거:', resultId);
                
                setAnalysisResults(prev => ({
                    ...prev,
                    results: prev.results?.filter(r => r.id !== resultId) || []
                }));
                setOverlays(prev => prev.filter(o => o.id !== resultId));
                showToast('✅ 분석 결과가 제거되었습니다');
                return true;
            } else {
                // 서버 ID인 경우 - 서버에 삭제 요청
                const response = await fetch(`${DJANGO_URL}/api/ai/result/${resultId}/`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    setAnalysisResults(prev => ({
                        ...prev,
                        results: prev.results?.filter(r => r.id !== resultId) || []
                    }));
                    setOverlays(prev => prev.filter(o => o.id !== resultId));
                    showToast('✅ 분석 결과가 삭제되었습니다');
                    return true;
                } else {
                    // 서버 삭제 실패 시 로컬에서라도 제거
                    console.log('⚠️ 서버 삭제 실패, 로컬에서 제거');
                    setAnalysisResults(prev => ({
                        ...prev,
                        results: prev.results?.filter(r => r.id !== resultId) || []
                    }));
                    setOverlays(prev => prev.filter(o => o.id !== resultId));
                    showToast('⚠️ 로컬에서 제거되었습니다');
                    return true;
                }
            }
        } catch (error) {
            console.log('⚠️ 삭제 요청 실패, 로컬에서 제거:', error);
            // 에러 발생 시에도 로컬에서는 제거
            setAnalysisResults(prev => ({
                ...prev,
                results: prev.results?.filter(r => r.id !== resultId) || []
            }));
            setOverlays(prev => prev.filter(o => o.id !== resultId));
            showToast('⚠️ 로컬에서 제거되었습니다');
            return true;
        }
    }, [currentStudyUID]);

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
            
            // ID 유효성 확인
            if (!overlay.id && !overlay.uniqueKey) {
                console.warn(`⚠️ ID/uniqueKey 없는 오버레이 [${idx}]:`, overlay);
            }
            
            // 🔥 모델명 매칭 개선
            if (model.toLowerCase().includes('yolo')) return showYOLOOverlays;
            if (model.toLowerCase().includes('ssd')) return showSSDOverlays;
            
            // 🔥 모델명이 없는 경우 기본 처리 (YOLO로 가정)
            if (!model && showYOLOOverlays) return true;
            
            return false;
        });

        console.log(`🎯 최종 결과: ${filteredOverlays.length}/${overlays.length} 표시됨`);
        return filteredOverlays;
    }, [overlays, showYOLOOverlays, showSSDOverlays]);

    // =============================================================================
    // 유틸리티 함수들
    // =============================================================================
    
    const resetAnalysisState = useCallback(() => {
        setAnalysisStatus('대기 중');
        setAnalysisResults(null);
        setOverlays([]);
        setShowOverlays(false);
        setIsAnalyzing(false);
    }, []);
    
    const isAnalysisInProgress = useCallback(() => {
        return isAnalyzing;
    }, [isAnalyzing]);
    
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
        
        // 상태 설정 함수들
        setAnalysisStatus,
        setAnalysisResults,
        setOverlays,
        setShowOverlays
    };
};

export default useAIAnalysis;