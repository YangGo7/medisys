// pacsapp/src/components/ohifviewer/index.js (SimCLR 통합 완료 버전)

import React, { useState, useCallback, useEffect } from 'react';
import ViewerIframe from './ViewerIframe/ViewerIframe.js';
import AnalysisPanel from './AnalysisPanel/AnalysisPanel.js';
import SimCLRAnalysisPanel from './AnalysisPanel/SimCLRAnalysisPanel.js'; // 🔥 추가
import LabelModal from './AnnotationTools/LabelModal.js';
import ReportModal from './ReportModal/ReportModal.js';

// 커스텀 훅들
import useAIAnalysis from '../../hooks/useAIAnalysis.js';
import useAnnotations from '../../hooks/useAnnotations.js';
import useReports from '../../hooks/useReports.js';
import usePACS from '../../hooks/usePACS.js';
import useSimCLRAnalysis from '../../hooks/useSimCLRAnalysis.js'; // 🔥 추가

import styles from './OHIFViewer.module.css';

const OHIFViewer = ({
  ohifBaseUrl = "http://35.225.63.41:8042/ohif/",
  showDebugInfo = false
}) => {
  // 동적 z-index 관리
  const [activeLayer, setActiveLayer] = useState('iframe');
  
  const getZIndex = (layer) => {
    const baseZIndex = {
      iframe: 100,
      ai: 200,
      annotation: 300,
      simclr: 350, // 🔥 추가
      modal: 400
    };
    return activeLayer === layer ? baseZIndex[layer] + 1000 : baseZIndex[layer];
  };

  // 스터디 연동 관련 상태
  const [studySyncStatus, setStudySyncStatus] = useState('');
  const [isStudyTransitioning, setIsStudyTransitioning] = useState(false);

  // 🔥 패널 표시 상태 추가
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(true);
  const [showSimCLRPanel, setShowSimCLRPanel] = useState(false);

  // PACS 훅 초기화
  const pacsHook = usePACS();
  const { 
    currentStudyUID, 
    availableStudies, 
    fetchAvailableStudies,
    selectStudy,
    getCurrentStudyInfo,
    isLoading: pacsLoading,
    connectionError: pacsError,
    setCurrentStudyUID
  } = pacsHook;

  // OHIF URL 관리
  const [ohifUrl, setOhifUrl] = useState(ohifBaseUrl);
  
  useEffect(() => {
    let newUrl;
    
    if (!currentStudyUID) {
      newUrl = ohifBaseUrl;
    } else {
      newUrl = `${ohifBaseUrl}viewer?StudyInstanceUIDs=${currentStudyUID}`;
    }
    
    if (newUrl !== ohifUrl) {
      console.log('📋 OHIF URL 변경:', {
        from: ohifUrl,
        to: newUrl,
        studyUID: currentStudyUID || 'none'
      });
      setOhifUrl(newUrl);
    }
  }, [currentStudyUID, ohifBaseUrl, ohifUrl]);

  // AI 분석 훅 (기존)
  const aiHook = useAIAnalysis(currentStudyUID);
  const {
    analysisStatus,
    analysisResults,
    overlays,
    showOverlays,
    isAnalyzing,
    analyzeYOLO,
    analyzeSSD,
    loadSavedResults,
    clearResults,
    checkAIModelStatus,
    toggleOverlays,
    recalculateOverlays,
    setAnalysisStatus
  } = aiHook;

  // 🔥 SimCLR 분석 훅 추가
  const simclrHook = useSimCLRAnalysis(currentStudyUID);
  const {
    simclrResults,
    showSimCLROverlays,
    isSimCLRAnalyzing,
    analyzeSimCLR,
    toggleSimCLROverlays,
    clearSimCLRResults,
    checkSimCLRModelStatus
  } = simclrHook;

  // 어노테이션 훅
  const annotationHook = useAnnotations(currentStudyUID, setAnalysisStatus, setActiveLayer);
  const {
    drawingMode,
    currentBox,
    annotationBoxes,
    showAnnotations,
    showLabelModal,
    newBoxLabel,
    showAnnotationDropdown,
    overlayRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    saveBoundingBox,
    deleteBoundingBox,
    deleteIndividualAnnotation,
    saveAnnotationsToServer,
    loadAnnotationsFromServer,
    toggleDrawingMode,
    toggleAnnotations,
    toggleAnnotationDropdown,
    cancelLabelModal
  } = annotationHook;

  // 레포트 훅
  const reportHook = useReports(currentStudyUID, getCurrentStudyInfo);
  const {
    showReportModal,
    reportContent,
    reportSummaries,
    showReportDropdown,
    saveReportToServer: originalSaveReportToServer,
    loadReportFromServer,
    deleteReportFromServer,
    updateReportStatusOnServer: originalUpdateReportStatusOnServer,
    openReportModal,
    closeReportModal,
    toggleReportDropdown,
    selectReportFromDropdown,
    printReport
  } = reportHook;

  // 🔥 수정된 레포트 저장 함수 - 성공 후 워크스테이션 새로고침
  const saveReportToServer = useCallback(async (reportContent) => {
    try {
      console.log('💾 레포트 저장 시작...');
      const result = await originalSaveReportToServer(reportContent);
      
      if (result && result.status === 'success') {
        console.log('✅ 레포트 저장 성공!');
        
        // 🚀 워크스테이션 새로고침 신호 전송
        console.log('🔄 워크스테이션 새로고침 신호 전송');
        window.dispatchEvent(new CustomEvent('reportSaved', {
          detail: {
            studyUID: currentStudyUID,
            reportContent: reportContent,
            timestamp: new Date().toISOString()
          }
        }));
        
        // 🚀 현황판 새로고침 신호도 전송
        window.dispatchEvent(new CustomEvent('dashboardRefresh', {
          detail: {
            source: 'reportSaved',
            studyUID: currentStudyUID
          }
        }));
        
        console.log('📡 새로고침 신호 전송 완료');
      }
      
      return result;
    } catch (error) {
      console.error('❌ 레포트 저장 실패:', error);
      throw error;
    }
  }, [originalSaveReportToServer, currentStudyUID]);

  // 🔥 수정된 레포트 상태 업데이트 함수 - 성공 후 워크스테이션 새로고침  
  const updateReportStatusOnServer = useCallback(async (studyUID, status) => {
    try {
      console.log('🔄 레포트 상태 업데이트 시작:', status);
      const result = await originalUpdateReportStatusOnServer(studyUID, status);
      
      if (result && result.status === 'success') {
        console.log('✅ 레포트 상태 업데이트 성공!');
        
        // 🚀 워크스테이션 새로고침 신호 전송
        console.log('🔄 워크스테이션 새로고침 신호 전송');
        window.dispatchEvent(new CustomEvent('reportStatusUpdated', {
          detail: {
            studyUID: studyUID,
            newStatus: status,
            timestamp: new Date().toISOString()
          }
        }));
        
        // 🚀 현황판 새로고침 신호도 전송  
        window.dispatchEvent(new CustomEvent('dashboardRefresh', {
          detail: {
            source: 'reportStatusUpdated',
            studyUID: studyUID,
            newStatus: status
          }
        }));
        
        console.log('📡 상태 업데이트 신호 전송 완료');
      }
      
      return result;
    } catch (error) {
      console.error('❌ 레포트 상태 업데이트 실패:', error);
      throw error;
    }
  }, [originalUpdateReportStatusOnServer]);

  // 🔥 SimCLR 오버레이 업데이트 핸들러
  const handleSimCLROverlayUpdate = useCallback((overlayData) => {
    console.log('🧠 SimCLR 오버레이 업데이트:', overlayData);
    
    switch (overlayData.type) {
      case 'simclr_heatmap':
        setActiveLayer('simclr');
        // 필요시 OHIF 뷰어에 히트맵 적용
        break;
        
      case 'toggle_simclr_heatmap':
        // 히트맵 토글 처리
        break;
        
      case 'clear_simclr':
        // SimCLR 결과 지우기
        break;
        
      default:
        console.log('Unknown SimCLR overlay type:', overlayData.type);
    }
  }, []);

  // 스터디 변경 처리 함수 (SimCLR 상태 초기화 추가)
  const handleStudyChangeFromOHIF = useCallback(async (newStudyUID) => {
    console.log('🔄 OHIF에서 스터디 변경 감지:', {
      from: currentStudyUID,
      to: newStudyUID
    });

    if (newStudyUID === currentStudyUID) {
      console.log('📝 같은 스터디 - 변경 무시');
      return;
    }

    setIsStudyTransitioning(true);
    setStudySyncStatus(`스터디 동기화 중...`);

    try {
      console.log('🧹 기존 오버레이 숨김...');
      
      // 기존 AI 오버레이 숨김
      if (aiHook.showYOLOOverlays) {
        console.log('🤖 YOLO 오버레이 숨김');
        aiHook.toggleYOLOOverlays();
      }
      if (aiHook.showSSDOverlays) {
        console.log('🤖 SSD 오버레이 숨김');
        aiHook.toggleSSDOverlays();
      }
      
      // 🔥 SimCLR 오버레이 숨김
      if (showSimCLROverlays) {
        console.log('🧠 SimCLR 오버레이 숨김');
        toggleSimCLROverlays();
      }
      
      console.log('📂 PACS 상태 동기화 중...');
      
      const targetStudy = availableStudies.find(study => study.studyUID === newStudyUID);
      
      if (targetStudy) {
        setCurrentStudyUID(newStudyUID);
        setStudySyncStatus(`✅ ${targetStudy.patientName} 동기화 완료`);
        
        setTimeout(async () => {
          try {
            console.log('📊 새 스터디 분석 결과 로드...');
            await loadSavedResults();
            setStudySyncStatus(`✅ ${targetStudy.patientName} 전환 완료`);
          } catch (error) {
            console.warn('⚠️ 저장된 분석 결과 로드 실패:', error);
            setStudySyncStatus(`✅ ${targetStudy.patientName} (분석 결과 없음)`);
          }
          
          setTimeout(() => {
            setStudySyncStatus('');
          }, 3000);
        }, 500);
        
      } else {
        console.warn('⚠️ PACS에서 스터디를 찾을 수 없음, 새로고침 시도:', newStudyUID);
        
        await fetchAvailableStudies();
        
        const refreshedStudy = availableStudies.find(study => study.studyUID === newStudyUID);
        if (refreshedStudy) {
          setCurrentStudyUID(newStudyUID);
          setStudySyncStatus(`✅ ${refreshedStudy.patientName} 동기화 완료`);
        } else {
          setCurrentStudyUID(newStudyUID);
          setStudySyncStatus(`⚠️ 알 수 없는 스터디로 전환됨`);
        }
        
        setTimeout(() => {
          setStudySyncStatus('');
        }, 3000);
      }
      
    } catch (error) {
      console.error('❌ 스터디 동기화 중 오류:', error);
      setStudySyncStatus('❌ 스터디 동기화 실패');
      
      setTimeout(() => {
        setStudySyncStatus('');
      }, 3000);
    } finally {
      setIsStudyTransitioning(false);
    }
  }, [currentStudyUID, availableStudies, aiHook, setCurrentStudyUID, loadSavedResults, fetchAvailableStudies, showSimCLROverlays, toggleSimCLROverlays]);

  const handleManualStudySelect = useCallback(async (studyUID) => {
    console.log('👆 수동 스터디 선택:', {
      from: currentStudyUID,
      to: studyUID
    });
    await handleStudyChangeFromOHIF(studyUID);
  }, [handleStudyChangeFromOHIF]);

  // 로컬 상태
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  // 핸들러 함수들
  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  const handleGlobalError = (error, context = '') => {
    console.error(`글로벌 에러 (${context}):`, error);
    setGlobalError(`${context}: ${error.message}`);
  };

  const retryConnection = async () => {
    setGlobalError(null);
    try {
      await fetchAvailableStudies();
    } catch (error) {
      handleGlobalError(error, 'PACS 재연결');
    }
  };

  const handleAnalyzeYOLO = async (...args) => {
    setActiveLayer('ai');
    console.log('🤖 YOLO 분석 시작 - AI 레이어 활성화');
    return await analyzeYOLO(...args);
  };

  const handleAnalyzeSSD = async (...args) => {
    setActiveLayer('ai');
    console.log('🤖 SSD 분석 시작 - AI 레이어 활성화');
    return await analyzeSSD(...args);
  };

  const handleToggleOverlays = () => {
    setActiveLayer('ai');
    console.log('👁️ AI 오버레이 토글 - AI 레이어 활성화');
    toggleOverlays();
  };

  const handleOpenReportModal = (...args) => {
    setActiveLayer('modal');
    console.log('📋 레포트 모달 열림 - 모달 레이어 활성화');
    openReportModal(...args);
  };

  // 🔥 패널 토글 핸들러들
  const handleToggleAnalysisPanel = () => {
    setShowAnalysisPanel(prev => !prev);
    if (!showAnalysisPanel) {
      setActiveLayer('ai');
    }
  };

  const handleToggleSimCLRPanel = () => {
    setShowSimCLRPanel(prev => !prev);
    if (!showSimCLRPanel) {
      setActiveLayer('simclr');
    }
  };

  // Props 구성
  const viewerIframeProps = {
    analysisResults,
    overlays: aiHook.getVisibleOverlays(),
    showOverlays,
    onRecalculateOverlays: recalculateOverlays,
    ohifUrl,
    showDebugInfo,
    isLoading: isAnalyzing || isStudyTransitioning || isSimCLRAnalyzing, // 🔥 SimCLR 로딩 추가
    error: globalError,
    currentStudyUID,
    onStudyChange: handleStudyChangeFromOHIF,
    activeLayer,
    setActiveLayer,
    annotationProps: {
      drawingMode,
      currentBox,
      annotationBoxes,
      showAnnotations,
      overlayRef,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onDeleteAnnotation: deleteBoundingBox,
      onDrawingStart: () => setActiveLayer('annotation'),
      onModalOpen: () => setActiveLayer('modal')
    }
  };

  const analysisPanelProps = {
    analysisStatus,
    analysisResults,
    overlays: aiHook.getVisibleOverlays(),
    showOverlays,
    showYOLOOverlays: aiHook.showYOLOOverlays,
    showSSDOverlays: aiHook.showSSDOverlays,
    showDeleteModal: aiHook.showDeleteModal,
    onToggleYOLOOverlays: aiHook.toggleYOLOOverlays,
    onToggleSSDOverlays: aiHook.toggleSSDOverlays,
    onRequestDeleteResult: aiHook.requestDeleteResult,
    onHandleDeleteConfirm: aiHook.handleDeleteConfirm,
    onHandleDeleteCancel: aiHook.handleDeleteCancel,
    allOverlays: overlays,
    onAnalyzeYOLO: handleAnalyzeYOLO,
    onAnalyzeSSD: handleAnalyzeSSD,
    onLoadSavedResults: loadSavedResults,
    onClearResults: clearResults,
    onCheckModelStatus: checkAIModelStatus,
    onToggleOverlays: handleToggleOverlays,
    onRecalculateOverlays: recalculateOverlays,
    currentStudyUID,
    availableStudies,
    onSelectStudy: handleManualStudySelect,
    onRefreshStudies: fetchAvailableStudies,
    studySyncStatus,
    isStudyTransitioning,
    annotationProps: {
      drawingMode,
      annotationBoxes,
      showAnnotations,
      showAnnotationDropdown,
      onToggleDrawingMode: toggleDrawingMode,
      onToggleAnnotations: toggleAnnotations,
      onToggleAnnotationDropdown: toggleAnnotationDropdown,
      onSaveAnnotations: saveAnnotationsToServer,
      onLoadAnnotations: loadAnnotationsFromServer,
      onDeleteIndividualAnnotation: deleteIndividualAnnotation
    },
    onLoadReport: loadReportFromServer,
    onOpenReportModal: handleOpenReportModal,
    reportSummaries,
    showReportDropdown,
    onToggleReportDropdown: toggleReportDropdown,
    onSelectReport: selectReportFromDropdown,
    onDeleteReport: deleteReportFromServer,
    onUpdateReportStatus: updateReportStatusOnServer
  };

  // 🔥 SimCLR 패널 Props
  const simclrPanelProps = {
    currentStudyUID,
    currentSeriesUID: null,
    currentInstanceUID: null,
    onOverlayUpdate: handleSimCLROverlayUpdate,
    isVisible: showSimCLRPanel
  };

  const labelModalProps = {
    isOpen: showLabelModal,
    onSave: saveBoundingBox,
    onCancel: cancelLabelModal,
    initialLabel: newBoxLabel,
    title: '🏷️ 어노테이션 라벨 입력',
    onModalOpen: () => setActiveLayer('modal')
  };

  const reportModalProps = {
    isOpen: showReportModal,
    onClose: closeReportModal,
    onSave: saveReportToServer,  // 🔥 수정된 함수 사용
    onPrint: printReport,
    patientInfo: reportHook.getPatientInfo(),
    currentStudyUID,
    analysisResults,
    annotationBoxes,
    initialContent: reportContent,
    title: '📋 진단 레포트',
    onModalOpen: () => setActiveLayer('modal')
  };  
  
  // 렌더링
  if (pacsLoading && availableStudies.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        PACS 연결 중...
      </div>
    );
  }

  if (globalError || pacsError) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorTitle}>
          ❌ 연결 오류
        </div>
        <div className={styles.errorMessage}>
          {globalError || pacsError}
        </div>
        <button 
          onClick={retryConnection}
          className={styles.errorRetryButton}
        >
          🔄 다시 시도
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`${styles.ohifViewerContainer} ${isFullscreen ? styles.fullscreen : ''}`}
      style={{
        '--z-iframe': getZIndex('iframe'),
        '--z-ai': getZIndex('ai'),
        '--z-annotation': getZIndex('annotation'),
        '--z-simclr': getZIndex('simclr'), // 🔥 SimCLR z-index 추가
        '--z-modal': getZIndex('modal')
      }}
    >
      {studySyncStatus && (
        <div className={styles.studySyncNotification}>
          {studySyncStatus}
        </div>
      )}

      <div className={styles.viewerSection}>
        <ViewerIframe {...viewerIframeProps} />
        
        {/* 🔥 패널 토글 버튼들 추가 */}
        {!isFullscreen && (
          <div className={styles.panelToggleButtons}>
            <button
              onClick={handleToggleAnalysisPanel}
              className={`${styles.panelToggleButton} ${showAnalysisPanel ? styles.active : ''}`}
              title="기본 AI 분석 패널"
            >
              🤖 AI 분석
            </button>
            
            <button
              onClick={handleToggleSimCLRPanel}
              className={`${styles.panelToggleButton} ${showSimCLRPanel ? styles.active : ''}`}
              title="SimCLR 이상탐지 패널"
            >
              🧠 SimCLR
            </button>
          </div>
        )}
      </div>
      
      {!isFullscreen && (
        <div className={styles.panelSection}>
          {/* 🔥 기존 분석 패널 조건부 렌더링 */}
          {showAnalysisPanel && (
            <AnalysisPanel {...analysisPanelProps} />
          )}
          
          {/* 🔥 SimCLR 분석 패널 추가 */}
          {showSimCLRPanel && (
            <SimCLRAnalysisPanel {...simclrPanelProps} />
          )}
        </div>
      )}
      
      <LabelModal {...labelModalProps} />
      <ReportModal {...reportModalProps} />
      
      {showDebugInfo && (
        <div>
          <button
            onClick={toggleFullscreen}
            style={{
              position: 'fixed',
              top: '20px',
              left: '20px',
              zIndex: 10000,
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '10px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {isFullscreen ? '🔲 창 모드' : '📺 전체화면'}
          </button>
        </div>
      )}
    </div>
  );
};

export default OHIFViewer;