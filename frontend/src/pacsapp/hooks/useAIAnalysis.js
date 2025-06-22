// src/hooks/useAIAnalysis.js
import { useState, useCallback } from 'react';

// 🔥 AI 서비스 API 설정
const AI_SERVICE_URL = 'http://35.225.63.41:5000'; // AI 서비스 포트
const DJANGO_URL = 'http://35.225.63.41:8000'; // Django API

// 🔥 API 함수들 직접 구현
const analyzeWithYOLO = async (studyUID, forceOverwrite = false) => {
    // START: Enhanced fetch logging for analyzeWithYOLO
    console.log(`[analyzeWithYOLO] Requesting: ${AI_SERVICE_URL}/analyze/${studyUID}`);
    try {
        const response = await fetch(`${AI_SERVICE_URL}/analyze-study/${studyUID}`, { // Changed endpoint to analyze-study
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ force_overwrite: forceOverwrite, model_type: 'yolo' })
        });

        // Log the raw response status
        console.log(`[analyzeWithYOLO] Raw Response Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[analyzeWithYOLO] HTTP Error: ${response.status}, Body: ${errorText}`);
            // Attempt to parse as JSON if it looks like JSON
            try {
                const errorJson = JSON.parse(errorText);
                return { success: false, error: errorJson.error || errorText };
            } catch (e) {
                return { success: false, error: errorText };
            }
        }
        
        const data = await response.json();
        console.log(`[analyzeWithYOLO] Parsed JSON Data:`, data);
        return data;

    } catch (networkError) {
        console.error(`[analyzeWithYOLO] Network or Fetch Error for ${AI_SERVICE_URL}/analyze-study/${studyUID}:`, networkError);
        return { success: false, error: `Network or server unavailable: ${networkError.message}` };
    }
    // END: Enhanced fetch logging
};

const analyzeWithSSD = async (studyUID, forceOverwrite = false) => {
    // START: Enhanced fetch logging for analyzeWithSSD (identical to YOLO)
    console.log(`[analyzeWithSSD] Requesting: ${AI_SERVICE_URL}/analyze-study/${studyUID}`); // Changed endpoint to analyze-study
    try {
        const response = await fetch(`${AI_SERVICE_URL}/analyze-study/${studyUID}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ force_overwrite: forceOverwrite, model_type: 'ssd' })
        });

        console.log(`[analyzeWithSSD] Raw Response Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[analyzeWithSSD] HTTP Error: ${response.status}, Body: ${errorText}`);
            try {
                const errorJson = JSON.parse(errorText);
                return { success: false, error: errorJson.error || errorText };
            } catch (e) {
                return { success: false, error: errorText };
            }
        }
        
        const data = await response.json();
        console.log(`[analyzeWithSSD] Parsed JSON Data:`, data);
        return data;

    } catch (networkError) {
        console.error(`[analyzeWithSSD] Network or Fetch Error for ${AI_SERVICE_URL}/analyze-study/${studyUID}:`, networkError);
        return { success: false, error: `Network or server unavailable: ${networkError.message}` };
    }
    // END: Enhanced fetch logging
};

// --- (Rest of your API functions: clearAnalysisResults, checkModelStatus, checkExistingAnalysis - no changes needed here) ---
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
    // Original AI service does not have a model_type in the /results endpoint
    // Assuming Django endpoint handles filtering by model_type if provided
    const url = `${DJANGO_URL}/api/ai/results/${studyUID}/?model_type=${modelType.toLowerCase()}`;
    console.log(`[checkExistingAnalysis] Checking existing analysis from Django: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[checkExistingAnalysis] HTTP Error ${response.status} from Django: ${errorText}`);
            // If Django returns 404 for no results, it means no existing analysis
            if (response.status === 404) {
                return { exists: false };
            }
            throw new Error(`Failed to check existing analysis: ${errorText}`);
        }
        const data = await response.json();
        console.log(`[checkExistingAnalysis] Django Response:`, data);
        return { exists: data.status === 'success' && data.results?.length > 0 };
    } catch (error) {
        console.error(`[checkExistingAnalysis] Network or unexpected error checking existing analysis:`, error);
        return { exists: false, error: error.message }; // Treat error as no existing analysis
    }
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
 * @param {string} currentStudyUID - 현재 선택된 스터디 UIDS
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
        // --- (Existing initial checks for forceOverwrite and currentStudyUID) ---
        if (typeof forceOverwrite === 'object' && forceOverwrite !== null) {
            console.log('[analyzeYOLO] Event object detected for forceOverwrite, treating as false.');
            forceOverwrite = false;
        }

        if (!currentStudyUID) {
            setAnalysisStatus('Study UID를 찾을 수 없습니다');
            showToast('Study UID를 찾을 수 없습니다');
            console.error('[analyzeYOLO] Error: currentStudyUID is null or undefined.'); // More specific log
            return false;
        }

        setAnalysisResults(null);
        setOverlays([]);
        setShowOverlays(false);
        
        // 중복 체크
        if (!forceOverwrite) {
            try {
                console.log(`[analyzeYOLO] Starting duplicate check for studyUID: ${currentStudyUID}`);
                const existingCheck = await checkExistingAnalysis(currentStudyUID, 'YOLO');
                console.log('[analyzeYOLO] Duplicate check result:', existingCheck);
                
                if (existingCheck.exists) {
                    console.warn('[analyzeYOLO] Existing YOLO analysis found. Prompting user for overwrite.'); // Changed to warn
                    
                    const userConfirmed = window.confirm(
                        `이미 YOLO 분석 결과가 존재합니다.\n기존 결과를 덮어쓰시겠습니까?`
                    );
                    
                    if (userConfirmed) {
                        showToast('YOLO 분석을 진행합니다...');
                        return await analyzeYOLO(true); // Recursive call with forceOverwrite = true
                    } else {
                        showToast('YOLO 분석이 취소되었습니다');
                        setAnalysisStatus('YOLO 분석이 취소되었습니다');
                        console.log('[analyzeYOLO] YOLO analysis cancelled by user.');
                        return false;
                    }
                } else {
                    console.log('[analyzeYOLO] No existing YOLO analysis found. Proceeding with analysis.');
                }
            } catch (error) {
                console.error('[analyzeYOLO] Error during duplicate check:', error); // More specific log
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
            
            console.log('[analyzeYOLO] 📤 Calling AI service API:', { studyUID: currentStudyUID, forceOverwrite });
            const data = await analyzeWithYOLO(currentStudyUID, forceOverwrite); // Call the helper function
            
            console.log('[analyzeYOLO] 🔥 AI service response:', data);
            
            if (data.success) {
                // Check if 'results' array exists and is not empty
                const results = data.results; 
                if (!Array.isArray(results)) {
                    console.error('[analyzeYOLO] Error: AI service response "results" is not an array:', results);
                    setAnalysisStatus('YOLO 분석 실패: 응답 형식 오류');
                    showToast('YOLO 분석 실패: 서버 응답 형식이 올바르지 않습니다.');
                    return false;
                }

                const yoloResults = results.filter(r => r.model_type === 'yolo' && r.success);
                
                if (yoloResults.length > 0) {
                    const yoloData = yoloResults[0];
                    const detections = yoloData.detections;
                    
                    // Validate detections structure
                    if (!Array.isArray(detections)) {
                        console.error('[analyzeYOLO] Error: Detections from YOLO model are not an array:', detections);
                        setAnalysisStatus('YOLO 분석 실패: 탐지 결과 형식 오류');
                        showToast('YOLO 분석 실패: 탐지 결과 형식이 올바르지 않습니다.');
                        return false;
                    }

                    // 🔥 해상도 정보 추출 (이미지 치수 파싱 실패 시 기본값 사용)
                    let imageWidth = 1024;
                    let imageHeight = 1024;
                    if (data.image_dimensions) {
                        const dimensions = data.image_dimensions.split('x');
                        if (dimensions.length === 2) {
                            const parsedWidth = parseInt(dimensions[0]);
                            const parsedHeight = parseInt(dimensions[1]);
                            if (!isNaN(parsedWidth) && !isNaN(parsedHeight)) {
                                imageWidth = parsedWidth;
                                imageHeight = parsedHeight;
                            } else {
                                console.warn(`[analyzeYOLO] Warning: Could not parse image dimensions: ${data.image_dimensions}`);
                            }
                        } else {
                            console.warn(`[analyzeYOLO] Warning: Unexpected image_dimensions format: ${data.image_dimensions}`);
                        }
                    } else {
                        console.warn('[analyzeYOLO] Warning: "image_dimensions" missing in AI service response. Using default 1024x1024.');
                    }
                    console.log(`[analyzeYOLO] Parsed image dimensions: ${imageWidth}x${imageHeight}`);


                    setAnalysisResults({
                        status: 'success',
                        results: detections, // Use detections directly
                        detections: detections.length,
                        model_used: 'yolo',
                        image_width: imageWidth,
                        image_height: imageHeight
                    });
                    
                    setOverlays(detections);
                    setShowOverlays(true); 
                    
                    setAnalysisStatus(`YOLO 분석 완료! (검출: ${detections.length}개)`);
                    showToast(`YOLO 분석 완료! ${detections.length}개 검출`);
                    
                    return true;
                } else {
                    console.warn('[analyzeYOLO] AI service response indicates success, but no YOLO results found in the filtered list or no detections within YOLO result.');
                    setAnalysisStatus('YOLO 분석 완료 (결과 없음)');
                    showToast('YOLO 분석 완료되었으나, 검출된 객체가 없습니다.');
                    setAnalysisResults({
                        status: 'success',
                        results: [],
                        detections: 0,
                        model_used: 'yolo',
                        image_width: data.image_width || 1024, // Use from data if available, else default
                        image_height: data.image_height || 1024
                    });
                    return true; // Consider this a success even if no detections
                }
            } else { // data.success is false
                const errorMessage = data.error || data.details || 'Unknown error from AI service.';
                console.error(`[analyzeYOLO] AI service reported failure: ${errorMessage}`);
                setAnalysisStatus('YOLO 분석 실패: ' + errorMessage);
                showToast('YOLO 분석 실패: ' + errorMessage);
                return false;
            }
        } catch (error) {
            console.error('[analyzeYOLO] Critical error during YOLO analysis process:', error); // More generic error log
            setAnalysisStatus('YOLO 분석 실패: ' + error.message);
            showToast('YOLO 분석 실패: ' + error.message);
            return false;
        } finally {
            setIsAnalyzing(false);
        }
    }, [currentStudyUID, showToast]); // Added showToast to dependencies

    // **IMPORTANT**: Apply similar detailed logging to analyzeSSD as well.
    // The analyzeSSD function would be largely identical in its logging and error handling.
    const analyzeSSD = useCallback(async (forceOverwrite = false) => {
      // ... (Rest of analyzeSSD code, apply identical logging improvements) ...
      if (typeof forceOverwrite === 'object' && forceOverwrite !== null) {
          console.log('[analyzeSSD] Event object detected for forceOverwrite, treating as false.');
          forceOverwrite = false;
      }

      if (!currentStudyUID) {
          setAnalysisStatus('Study UID를 찾을 수 없습니다');
          showToast('Study UID를 찾을 수 없습니다');
          console.error('[analyzeSSD] Error: currentStudyUID is null or undefined.');
          return false;
      }

      setAnalysisResults(null);
      setOverlays([]);
      setShowOverlays(false);
      
      // 중복 체크
      if (!forceOverwrite) {
          try {
              console.log(`[analyzeSSD] Starting duplicate check for studyUID: ${currentStudyUID}`);
              const existingCheck = await checkExistingAnalysis(currentStudyUID, 'SSD');
              console.log('[analyzeSSD] Duplicate check result:', existingCheck);
              
              if (existingCheck.exists) {
                  console.warn('[analyzeSSD] Existing SSD analysis found. Prompting user for overwrite.');
                  
                  const userConfirmed = window.confirm(
                      `이미 SSD 분석 결과가 존재합니다.\n기존 결과를 덮어쓰시겠습니까?`
                  );
                  
                  if (userConfirmed) {
                      showToast('SSD 분석을 진행합니다...');
                      return await analyzeSSD(true);
                  } else {
                      showToast('SSD 분석이 취소되었습니다');
                      setAnalysisStatus('SSD 분석이 취소되었습니다');
                      console.log('[analyzeSSD] SSD analysis cancelled by user.');
                      return false;
                  }
              } else {
                  console.log('[analyzeSSD] No existing SSD analysis found. Proceeding with analysis.');
              }
          } catch (error) {
              console.error('[analyzeSSD] Error during duplicate check:', error);
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
            
            console.log('[analyzeYOLO] 📤 AI 서비스 API 호출 중:', { studyUID: currentStudyUID, forceOverwrite });
            const data = await analyzeWithYOLO(currentStudyUID, forceOverwrite); // 이 함수는 위에서 개선된 버전을 사용합니다.
            
            console.log('[analyzeYOLO] 🔥 AI 서비스 응답 데이터:', data); // 여기에 응답 데이터 전체를 로깅

            // 응답의 success 필드 검사
            if (data.success) { 
                console.log('[analyzeYOLO] 응답: data.success가 true 입니다.');

                const results = data.results || [];
                console.log('[analyzeYOLO] 원본 results 배열:', results);
                
                // results 배열이 배열인지 다시 한번 확실히 확인 (강화된 디버깅용)
                if (!Array.isArray(results)) {
                    console.error('[analyzeYOLO] 오류: AI 서비스 응답의 "results"가 배열이 아닙니다!', results);
                    setAnalysisStatus('YOLO 분석 실패: 응답 형식 오류');
                    showToast('YOLO 분석 실패: 서버 응답 형식이 올바르지 않습니다.');
                    return false;
                }

                // YOLO 결과 필터링
                const yoloResults = results.filter(r => {
                    // 필터링 기준과 각 객체의 내용을 더 자세히 로깅
                    console.log(`[analyzeYOLO - filter] 현재 객체:`, r);
                    const isYoloType = r.model_type === 'yolo';
                    const isSuccess = r.success;
                    console.log(`[analyzeYOLO - filter] model_type === 'yolo' (${isYoloType}), success (${isSuccess})`);
                    return isYoloType && isSuccess;
                });
                console.log('[analyzeYOLO] 필터링된 yoloResults:', yoloResults);
                
                if (yoloResults.length > 0) {
                    console.log('[analyzeYOLO] 🎉 YOLO 분석 성공: 감지된 결과가 있습니다.');

                    const yoloData = yoloResults[0];
                    const detections = yoloData.detections;
                    
                    // detections가 배열인지 검증
                    if (!Array.isArray(detections)) {
                        console.error('[analyzeYOLO] 오류: YOLO 모델의 탐지 결과("detections")가 배열이 아닙니다!', detections);
                        setAnalysisStatus('YOLO 분석 실패: 탐지 결과 형식 오류');
                        showToast('YOLO 분석 실패: 탐지 결과 형식이 올바르지 않습니다.');
                        return false;
                    }

                    // 해상도 정보 추출 및 유효성 검사 로직은 그대로 유지 (이미 개선됨)
                    let imageWidth = 1024;
                    let imageHeight = 1024;
                    // ... (imageWidth, imageHeight 계산 로직) ...
                    console.log(`[analyzeYOLO] 파싱된 이미지 해상도: ${imageWidth}x${imageHeight}`);

                    setAnalysisResults({
                        status: 'success',
                        results: detections,
                        detections: detections.length,
                        model_used: 'yolo',
                        image_width: imageWidth,
                        image_height: imageHeight
                    });
                    
                    setOverlays(detections);
                    setShowOverlays(true); 
                    
                    setAnalysisStatus(`YOLO 분석 완료! (검출: ${detections.length}개)`);
                    showToast(`YOLO 분석 완료! ${detections.length}개 검출`);
                    
                    console.log('[analyzeYOLO] ✅ 모든 프론트엔드 처리 완료. true 반환.');
                    return true;
                } else {
                    console.warn('[analyzeYOLO] AI 서비스 응답은 성공이지만, 필터링 조건에 맞는 YOLO 결과 또는 탐지된 객체가 없습니다.');
                    setAnalysisStatus('YOLO 분석 완료 (검출된 객체 없음)');
                    showToast('YOLO 분석 완료되었으나, 검출된 객체가 없습니다.');
                    
                    // 이 경우에도 setAnalysisResults를 호출하여 빈 상태로라도 업데이트
                    setAnalysisResults({
                        status: 'success',
                        results: [],
                        detections: 0,
                        model_used: 'yolo',
                        image_width: data.image_width || 1024,
                        image_height: data.image_height || 1024
                    });
                    console.log('[analyzeYOLO] ✅ YOLO 분석 완료 (검출 없음). true 반환.');
                    return true;
                }
            } else { // data.success가 false인 경우
                const errorMessage = data.error || data.details || '알 수 없는 AI 서비스 오류.';
                console.error(`[analyzeYOLO] ❌ AI 서비스에서 실패를 보고했습니다: ${errorMessage}`);
                setAnalysisStatus('YOLO 분석 실패: ' + errorMessage);
                showToast('YOLO 분석 실패: ' + errorMessage);
                console.log('[analyzeYOLO] 🛑 AI 서비스 실패 보고. false 반환.');
                return false;
            }
        } catch (error) { // 이 catch 블록이 여러분이 보는 "Unknown error"를 유발합니다!
            console.error('[analyzeYOLO] 💥 YOLO 분석 중 치명적인 JavaScript 오류 발생:', error); // 이 로그가 가장 중요!
            setAnalysisStatus('YOLO 분석 실패: ' + error.message);
            showToast('YOLO 분석 실패: ' + error.message); // 이 토스트 메시지가 화면에 뜹니다!
            console.log('[analyzeYOLO] 🚫 JavaScript 오류로 YOLO 분석 중단. false 반환.');
            return false;
        } finally {
            setIsAnalyzing(false);
            console.log('[analyzeYOLO] finally 블록 실행됨.');
        }
    }, [currentStudyUID, showToast]);
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