// src/components/OHIFViewer/AnalysisPanel/AnalysisPanel.js (SimCLR 추가 버전)

import React, { useState, useCallback } from 'react'; // 🔥 useState, useCallback 추가
import AnnotationTools from '../AnnotationTools/AnnotationTools';
import styles from './AnalysisPanel.module.css';

const AnalysisPanel = ({
  // AI 분석 관련
  analysisStatus,
  analysisResults,
  overlays,
  showOverlays,
  onAnalyzeYOLO,
  onAnalyzeSSD,
  onLoadSavedResults,
  onClearResults,
  onCheckModelStatus,
  onRecalculateOverlays,
  onRequestDeleteResult,
  onToggleYOLOOverlays,
  showYOLOOverlays,
  onToggleSSDOverlays,
  showSSDOverlays,
  
  // PACS 관련
  currentStudyUID,
  availableStudies,
  onSelectStudy,
  onRefreshStudies,
  
  // 🔥 스터디 연동 상태 관련 추가
  studySyncStatus,
  isStudyTransitioning,
  
  // 어노테이션 관련 (AnnotationTools에 전달)
  annotationProps,
  
  // 레포트 관련
  onLoadReport,
  onOpenReportModal,
  reportSummaries,
  showReportDropdown,
  onToggleReportDropdown,
  onSelectReport,
  onDeleteReport,
  onUpdateReportStatus
}) => {
  // 🔥 SimCLR 상태 추가
  const [simclrResults, setSimclrResults] = useState(null);
  const [isSimclrAnalyzing, setIsSimclrAnalyzing] = useState(false);
  const [simclrError, setSimclrError] = useState(null);

  // 🔥 SimCLR 분석 함수
  const handleSimCLRAnalysis = useCallback(async () => {
    if (!currentStudyUID) {
      alert('스터디가 선택되지 않았습니다.');
      return;
    }

    setIsSimclrAnalyzing(true);
    setSimclrError(null);

    try {
      console.log('🧠 SimCLR 분석 시작:', currentStudyUID);

      const response = await fetch('/api/analysis/simclr/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studyUID: currentStudyUID
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        console.log('✅ SimCLR 분석 성공:', data);
        setSimclrResults(data);
        alert(`SimCLR 분석 완료!\n이상도 점수: ${data.results.overall_anomaly_score.toFixed(3)}\n이상 패치: ${data.results.num_anomaly_patches}개`);
      } else {
        throw new Error(data.message || 'SimCLR 분석 실패');
      }

    } catch (error) {
      console.error('❌ SimCLR 분석 실패:', error);
      setSimclrError(error.message);
      alert('SimCLR 분석 실패: ' + error.message);
    } finally {
      setIsSimclrAnalyzing(false);
    }
  }, [currentStudyUID]);

  // 🔥 현재 선택된 스터디 정보 가져오기
  const getCurrentStudy = () => {
    if (!currentStudyUID) return null;
    return availableStudies.find(study => study.studyUID === currentStudyUID);
  };

  const currentStudy = getCurrentStudy();

  return (
    <div className={styles.analysisPanel}>
      <h3 className={styles.panelHeader}>🤖 AI 분석</h3>
      
      {/* 🔥 스터디 연동 상태 알림 */}
      {studySyncStatus && (
        <div className={styles.syncStatusMessage}>
          {studySyncStatus}
        </div>
      )}
      
      <p className={styles.statusMessage}>
        <strong>상태:</strong> {analysisStatus}
      </p>
      
      {/* 🔥 현재 스터디 정보 개선 */}
      <div className={styles.studyInfo}>
        <div className={styles.studyInfoHeader}>
          📂 현재 스터디: 
          {isStudyTransitioning && <span className={styles.transitioningIndicator}>🔄</span>}
        </div>
        
        {currentStudy ? (
          <div className={styles.currentStudyDetails}>
            <div className={styles.studyMainInfo}>
              <div className={styles.patientName}>
                👤 <strong>{currentStudy.patientName}</strong>
              </div>
              <div className={styles.patientId}>
                🆔 {currentStudy.patientId}
              </div>
              <div className={styles.studyDate}>
                📅 {currentStudy.studyDate}
              </div>
              {currentStudy.modality && (
                <div className={styles.modality}>
                  🏥 {currentStudy.modality}
                </div>
              )}
            </div>
            <div className={styles.studyUid}>
              🔑 {currentStudyUID.substring(0, 30)}...
            </div>
          </div>
        ) : (
          <div className={styles.noStudySelected}>
            {currentStudyUID ? (
              <div className={styles.studyUidError}>
                ⚠️ 스터디 정보를 찾을 수 없음
                <div className={styles.studyUid}>
                  🔑 {currentStudyUID.substring(0, 30)}...
                </div>
              </div>
            ) : (
              <div className={styles.studyUidError}>
                ❌ 스터디가 선택되지 않음
              </div>
            )}
          </div>
        )}
        
        <div className={styles.studyCount}>
          <strong>💾 PACS 스터디 수:</strong> {availableStudies.length}개
        </div>
        
        {/* 해상도 정보 표시 */}
        {analysisResults && analysisResults.image_width && (
          <div className={styles.imageResolution}>
            <strong>📐 이미지 해상도:</strong> {analysisResults.image_width}×{analysisResults.image_height}
          </div>
        )}
        
        <div className={styles.refreshButtons}>
          <button
            onClick={onRefreshStudies}
            className={styles.refreshButton}
            disabled={isStudyTransitioning}
          >
            🔄 새로고침
          </button>
          
          {/* 수동 재계산 버튼 */}
          {overlays.length > 0 && (
            <button
              onClick={onRecalculateOverlays}
              className={`${styles.refreshButton} ${styles.recalculateButton}`}
              disabled={isStudyTransitioning}
            >
              🔧 재계산
            </button>
          )}
        </div>
      </div>
      
      {/* 🔥 스터디 선택 - 동기화 상태 표시 개선 */}
      {availableStudies.length > 1 && (
        <div className={styles.studySelector}>
          <label className={styles.studySelectorLabel}>
            📂 스터디 선택:
            {currentStudy && (
              <span className={styles.syncedIndicator}>
                ✅ OHIF와 동기화됨
              </span>
            )}
          </label>
          <select 
            value={currentStudyUID || ''} 
            onChange={(e) => onSelectStudy(e.target.value)}
            className={styles.studySelectorDropdown}
            disabled={isStudyTransitioning}
          >
            {!currentStudyUID && (
              <option value="">스터디를 선택해주세요</option>
            )}
            {availableStudies.map((study, index) => (
              <option key={index} value={study.studyUID}>
                {study.patientName} ({study.patientId}) - {study.studyDate}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* 🔥 분석 결과 없음 메시지 */}
      {currentStudyUID && !analysisResults && !simclrResults && !isStudyTransitioning && (
        <div className={styles.noAnalysisResults}>
          📊 이 스터디의 분석 결과가 없습니다.
          <div className={styles.noAnalysisResultsSubtext}>
            위의 AI 분석 버튼을 사용해서 분석을 시작하세요.
          </div>
        </div>
      )}
      
      {/* AI 분석 버튼들 */}
      <div className={styles.aiSection}>
        <h4 className={styles.aiSectionHeader}>🤖 AI 모델 선택:</h4>
        
        <div className={styles.aiButtons}>
          <button 
            onClick={() => onAnalyzeYOLO()}
            className={`${styles.aiButtonLarge} ${styles.yoloButton}`}
            disabled={!currentStudyUID || isStudyTransitioning || isSimclrAnalyzing}
          >
            🎯 YOLO 분석
          </button>
          
          <button 
            onClick={() => onAnalyzeSSD()}
            className={`${styles.aiButtonLarge} ${styles.ssdButton}`}
            disabled={!currentStudyUID || isStudyTransitioning || isSimclrAnalyzing}
          >
            🔍 SSD 분석
          </button>

          {/* 🔥 SimCLR 버튼 추가 */}
          <button 
            onClick={handleSimCLRAnalysis}
            className={`${styles.aiButtonLarge} ${styles.simclrButton}`}
            disabled={!currentStudyUID || isStudyTransitioning || isSimclrAnalyzing}
          >
            {isSimclrAnalyzing ? (
              <>🔄 SimCLR 분석 중...</>
            ) : (
              <>🧠 SimCLR 분석</>
            )}
          </button>
        </div>
        
        <div className={styles.smallButtons}>
          <button 
            onClick={onLoadSavedResults}
            className={`${styles.smallButton} ${styles.loadButton}`}
            disabled={!currentStudyUID || isStudyTransitioning}
          >
            📊 결과 불러오기
          </button>
          
          <button 
            onClick={onClearResults}
            className={`${styles.smallButton} ${styles.clearButton}`}
            disabled={!analysisResults || isStudyTransitioning}
          >
            🗑️ 결과 삭제
          </button>
          
          <button 
            onClick={onCheckModelStatus}
            className={`${styles.smallButton} ${styles.statusButton}`}
            disabled={isStudyTransitioning}
          >
            ⚙️ 상태 확인
          </button>
        </div>

        {/* 🔥 SimCLR 결과 표시 */}
        {simclrResults && simclrResults.status === 'success' && (
          <div className={styles.simclrResults}>
            <h4 className={styles.resultsSectionHeader}>🧠 SimCLR 분석 결과:</h4>
            <div className={styles.simclrMetrics}>
              <div className={styles.simclrMetric}>
                <strong>전체 이상도:</strong> {simclrResults.results.overall_anomaly_score.toFixed(3)}
              </div>
              <div className={styles.simclrMetric}>
                <strong>신뢰도:</strong> {simclrResults.results.confidence.toFixed(1)}%
              </div>
              <div className={styles.simclrMetric}>
                <strong>분석 패치:</strong> {simclrResults.results.num_patches}개
              </div>
              <div className={styles.simclrMetric}>
                <strong>이상 패치:</strong> {simclrResults.results.num_anomaly_patches}개
              </div>
            </div>
            <div className={`${styles.simclrDiagnosis} ${simclrResults.results.is_abnormal ? styles.abnormal : styles.normal}`}>
              {simclrResults.results.is_abnormal ? (
                <>⚠️ 이상 소견 감지됨</>
              ) : (
                <>✅ 정상 범위</>
              )}
            </div>
          </div>
        )}

        {/* 🔥 SimCLR 에러 표시 */}
        {simclrError && (
          <div className={styles.simclrError}>
            ❌ SimCLR 오류: {simclrError}
          </div>
        )}
        
        {/* 분석 결과 표시 */}
        {analysisResults && (
          <div className={styles.resultsSection}>
            <h4 className={styles.resultsSectionHeader}>📊 분석 결과:</h4>
            
            {/* 모델별 오버레이 토글 */}
            <div className={styles.overlayControls}>
              <button 
                onClick={() => {
                  console.log('👆 YOLO 토글 클릭됨');
                  onToggleYOLOOverlays();
                }}
                className={`${styles.overlayToggleBtn} ${showYOLOOverlays ? styles.active : ''}`}
                disabled={isStudyTransitioning}
              >
                {showYOLOOverlays ? '👁️' : '🙈'} YOLO 표시
              </button>

              <button 
                onClick={() => {
                  console.log('👆 SSD 토글 클릭됨');
                  onToggleSSDOverlays();
                }}
                className={`${styles.overlayToggleBtn} ${showSSDOverlays ? styles.active : ''}`}
                disabled={isStudyTransitioning}
              >
                {showSSDOverlays ? '👁️' : '🙈'} SSD 표시
              </button>
            </div>
            
            {/* 기존 개요 정보 */}
            {analysisResults.detections !== undefined && (
              <div className={styles.resultsOverview}>
                <div className={styles.resultsOverviewItem}>
                  <strong>🤖 사용 모델:</strong> {analysisResults.model_used || 'Unknown'}
                </div>
                <div className={styles.resultsOverviewItem}>
                  <strong>📊 검출 개수:</strong> {analysisResults.detections}개
                </div>
              </div>
            )}
            
            {/* 결과 목록 (간단한 삭제 버튼) */}
            <div className={styles.resultsList}>
              {analysisResults.results && analysisResults.results.map((result, index) => (
                <div key={result.id || index} className={styles.resultItem}>
                  <div className={styles.resultInfo}>
                    <div className={styles.resultHeader}>
                      <span className={styles.resultLabel}>{result.label}</span>
                      <span className={styles.resultConfidence}>
                        {Math.round(result.confidence * 100)}%
                      </span>
                    </div>
                    <div className={styles.resultDetails}>
                      <span className={styles.resultModel}>
                        📱 {result.model || 'Unknown'}
                      </span>
                      <span className={styles.resultLocation}>
                        📍 [{result.bbox.join(', ')}]
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 어노테이션 도구 섹션 */}
      <AnnotationTools {...annotationProps} />

      {/* 레포트 섹션 */}
      <div className={styles.reportSection}>
        <div className={styles.reportButtons}>
          <button 
            onClick={onLoadReport}
            className={`${styles.reportButton} ${styles.reportLoadButton}`}
            disabled={!currentStudyUID || isStudyTransitioning}
          >
            📂 레포트 불러오기
          </button>
          
          <button 
            onClick={onOpenReportModal}
            className={`${styles.reportButton} ${styles.reportCreateButton}`}
            disabled={!currentStudyUID || isStudyTransitioning}
          >
            📝 레포트 작성
          </button>
        </div>

        {/* 저장된 레포트 드롭다운 */}
        <button 
          onClick={onToggleReportDropdown}
          className={styles.reportDropdownToggle}
          disabled={isStudyTransitioning}
        >
          <span>📋 저장된 레포트 목록</span>
          <span>{showReportDropdown ? '▲' : '▼'}</span>
        </button>

        {showReportDropdown && (
          <div className={styles.reportDropdownContent}>
            {reportSummaries.length > 0 ? (
              reportSummaries.map((report, index) => (
                <div
                  key={index}
                  className={styles.reportDropdownItem}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
                >
                  <div 
                    style={{ flex: 1, cursor: 'pointer' }}
                    onClick={() => onSelectReport(report)}
                  >
                    <div className={styles.reportItemHeader}>
                      📝 진단 레포트
                    </div>
                    <div className={styles.reportItemDate}>
                      📅 {report.updated_at ? new Date(report.updated_at).toLocaleDateString() : '방금 전'}
                    </div>
                    <div className={styles.reportItemDoctor}>
                      👨‍⚕️ {report.doctor_name || 'DR001 - 김영상'}
                    </div>
                    <div className={styles.reportItemStatus}>
                      <span className={styles.reportItemStatusLabel}>📊 상태:</span>
                      <select
                        value={report.report_status || 'draft'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          onUpdateReportStatus(report.study_uid || currentStudyUID, e.target.value);
                        }}
                        className={styles.reportItemStatusSelect}
                        disabled={isStudyTransitioning}
                      >
                        <option value="draft">초안</option>
                        <option value="completed">완료</option>
                        <option value="approved">승인</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteReport();
                    }}
                    className={styles.reportDeleteButton}
                    disabled={isStudyTransitioning}
                  >
                    ✕
                  </button>
                </div>
              ))
            ) : (
              <div className={styles.reportDropdownEmpty}>
                저장된 레포트가 없습니다
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisPanel;