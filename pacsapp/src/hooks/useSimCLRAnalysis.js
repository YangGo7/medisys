// pacsapp/src/hooks/useSimCLRAnalysis.js

import { useState, useCallback, useEffect, useRef } from 'react';

const useSimCLRAnalysis = (currentStudyUID) => {
  // SimCLR 분석 상태
  const [simclrResults, setSimclrResults] = useState(null);
  const [simclrOverlays, setSimclrOverlays] = useState([]);
  const [showSimCLROverlays, setShowSimCLROverlays] = useState(false);
  const [isSimCLRAnalyzing, setIsSimCLRAnalyzing] = useState(false);
  const [simclrError, setSimclrError] = useState(null);
  const [modelStatus, setModelStatus] = useState('unknown');
  
  // 히트맵 상태
  const [heatmapData, setHeatmapData] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // API 기본 URL
  const API_BASE = process.env.REACT_APP_API_BASE || '';

  // 이전 studyUID 추적
  const prevStudyUIDRef = useRef(currentStudyUID);

  // studyUID 변경 시 상태 초기화
  useEffect(() => {
    if (prevStudyUIDRef.current !== currentStudyUID) {
      console.log('🧠 SimCLR: StudyUID 변경, 상태 초기화');
      setSimclrResults(null);
      setSimclrOverlays([]);
      setShowSimCLROverlays(false);
      setHeatmapData(null);
      setShowHeatmap(false);
      setSimclrError(null);
      prevStudyUIDRef.current = currentStudyUID;
    }
  }, [currentStudyUID]);

  // SimCLR 모델 상태 확인
  const checkSimCLRModelStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/analysis/simclr/status/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setModelStatus(data.model_available ? 'loaded' : 'not_loaded');
        return data;
      } else {
        setModelStatus('error');
        return null;
      }
    } catch (error) {
      console.error('SimCLR 모델 상태 확인 실패:', error);
      setModelStatus('error');
      return null;
    }
  }, [API_BASE]);

  // SimCLR 이상탐지 분석 실행
  const analyzeSimCLR = useCallback(async (studyUID = currentStudyUID, seriesUID = null, instanceUID = null) => {
    if (!studyUID) {
      setSimclrError('스터디가 선택되지 않았습니다.');
      return null;
    }

    setIsSimCLRAnalyzing(true);
    setSimclrError(null);

    try {
      console.log('🧠 SimCLR 분석 시작:', studyUID);

      const requestData = {
        studyUID: studyUID,
        seriesUID: seriesUID || '',
        instanceUID: instanceUID || ''
      };

      const response = await fetch(`${API_BASE}/api/analysis/simclr/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (data.status === 'success') {
        console.log('✅ SimCLR 분석 성공:', data);
        setSimclrResults(data);

        // 히트맵 데이터 설정
        if (data.results?.heatmap_overlay) {
          setHeatmapData(data.results.heatmap_overlay);
          setShowHeatmap(true);
        }

        return data;
      } else {
        throw new Error(data.message || 'SimCLR 분석 실패');
      }

    } catch (error) {
      console.error('❌ SimCLR 분석 실패:', error);
      setSimclrError(error.message);
      return null;
    } finally {
      setIsSimCLRAnalyzing(false);
    }
  }, [currentStudyUID, API_BASE]);

  // SimCLR 오버레이 토글
  const toggleSimCLROverlays = useCallback(() => {
    setShowSimCLROverlays(prev => {
      console.log(`🧠 SimCLR 오버레이 ${!prev ? '표시' : '숨김'}`);
      return !prev;
    });
  }, []);

  // 히트맵 토글
  const toggleHeatmap = useCallback(() => {
    setShowHeatmap(prev => {
      console.log(`🔥 SimCLR 히트맵 ${!prev ? '표시' : '숨김'}`);
      return !prev;
    });
  }, []);

  // SimCLR 결과 모두 지우기
  const clearSimCLRResults = useCallback(() => {
    console.log('🧹 SimCLR 결과 지우기');
    setSimclrResults(null);
    setSimclrOverlays([]);
    setShowSimCLROverlays(false);
    setHeatmapData(null);
    setShowHeatmap(false);
    setSimclrError(null);
  }, []);

  // 컴포넌트 마운트 시 모델 상태 확인
  useEffect(() => {
    checkSimCLRModelStatus();
  }, [checkSimCLRModelStatus]);

  return {
    // 상태
    simclrResults,
    simclrOverlays,
    showSimCLROverlays,
    isSimCLRAnalyzing,
    simclrError,
    modelStatus,
    heatmapData,
    showHeatmap,
    
    // 함수들
    analyzeSimCLR,
    toggleSimCLROverlays,
    toggleHeatmap,
    clearSimCLRResults,
    checkSimCLRModelStatus
  };
};

export default useSimCLRAnalysis;