// src/components/OHIFViewer/ReportModal/ReportModal.js
import React, { useState, useEffect } from 'react';
import styles from './ReportModal.module.css';

const ReportModal = ({
  isOpen,
  onClose,
  onSave,
  onPrint,
  // 환자 정보
  patientInfo = {},
  currentStudyUID = '',
  // AI 분석 결과
  analysisResults = null,
  // 수동 어노테이션
  annotationBoxes = [],
  // 레포트 내용
  initialContent = '',
  // 설정
  title = '📋 진단 레포트'
}) => {
  const [reportContent, setReportContent] = useState(initialContent);

  // 모달이 열릴 때마다 초기 내용 설정
  useEffect(() => {
    if (isOpen) {
      setReportContent(initialContent);
    }
  }, [isOpen, initialContent]);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const handleClose = () => {
    onClose();
  };

  const handleSave = () => {
    onSave(reportContent);
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // 환자 정보 기본값 설정
  const patient = {
    patient_name: patientInfo.patient_name || 'Unknown',
    patient_id: patientInfo.patient_id || 'Unknown', 
    study_date: patientInfo.study_date || 'Unknown',
    ...patientInfo
  };

  // Study UID 표시용
  const displayStudyUID = currentStudyUID ? 
    currentStudyUID.substring(0, 30) + '...' : 'N/A';

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent}>
        {/* 헤더 */}
        <h2 className={styles.modalHeader}>
          {title}
        </h2>
        
        {/* 환자 정보 섹션 */}
        <div className={styles.patientInfo}>
          <h3 className={styles.patientInfoHeader}>👤 환자 정보</h3>
          <div className={styles.patientGrid}>
            <div className={styles.patientGridItem}>
              <strong>환자명:</strong> {patient.patient_name}
            </div>
            <div className={styles.patientGridItem}>
              <strong>환자 ID:</strong> {patient.patient_id}
            </div>
            <div className={styles.patientGridItem}>
              <strong>검사일:</strong> {patient.study_date}
            </div>
            <div className={styles.patientGridItem}>
              <strong>Study UID:</strong> {displayStudyUID}
            </div>
          </div>
        </div>
        
        {/* AI 분석 결과 섹션 */}
        {analysisResults && analysisResults.results && analysisResults.results.length > 0 && (
          <div className={styles.aiResults}>
            <h3 className={styles.aiResultsHeader}>
              🤖 AI 분석 결과
            </h3>
            <div className={styles.aiResultsSummary}>
              <strong>사용 모델:</strong> {analysisResults.model_used} | 
              <strong> 총 검출:</strong> {analysisResults.detections}개
            </div>
            
            {analysisResults.results.map((result, index) => (
              <div 
                key={index} 
                className={`${styles.detectionItem} ${
                  result.confidence > 0.8 ? styles.detectionItemHigh : styles.detectionItemLow
                }`}
              >
                <div>
                  <div className={`${styles.detectionLabel} ${
                    result.confidence > 0.8 ? styles.detectionLabelHigh : styles.detectionLabelLow
                  }`}>
                    {result.label}
                  </div>
                  <div className={styles.detectionLocation}>
                    위치: [{result.bbox.join(', ')}]
                  </div>
                </div>
                <span className={`${styles.confidenceBadge} ${
                  result.confidence > 0.8 ? styles.confidenceBadgeHigh : styles.confidenceBadgeLow
                }`}>
                  {Math.round(result.confidence * 100)}%
                </span>
              </div>
            ))}
          </div>
        )}
        
        {/* 수동 어노테이션 섹션 */}
        {annotationBoxes.length > 0 && (
          <div className={styles.annotations}>
            <h3 className={styles.annotationsHeader}>
              ✏️ 수동 어노테이션
            </h3>
            
            {annotationBoxes.map((box, index) => (
              <div key={box.id} className={styles.annotationItem}>
                <div>
                  <div className={styles.annotationLabel}>
                    수동 마킹 {index + 1}: {box.label}
                  </div>
                  <div className={styles.annotationLocation}>
                    화면 위치: [{box.left}, {box.top}, {box.left + box.width}, {box.top + box.height}]
                  </div>
                </div>
                <span className={styles.annotationBadge}>
                  수동
                </span>
              </div>
            ))}
          </div>
        )}
        
        {/* 종합 소견 섹션 */}
        <div className={styles.reportSection}>
          <h3 className={styles.reportSectionHeader}>📝 종합 소견</h3>
          <textarea
            value={reportContent}
            onChange={(e) => setReportContent(e.target.value)}
            placeholder="의료진의 종합 소견을 입력하세요..."
            className={styles.reportTextarea}
          />
        </div>
        
        {/* 버튼 섹션 */}
        <div className={styles.buttonContainer}>
          <button
            onClick={handleClose}
            className={`${styles.button} ${styles.cancelButton}`}
          >
            ❌ 취소
          </button>
          
          <button
            onClick={handlePrint}
            className={`${styles.button} ${styles.printButton}`}
          >
            🖨️ 인쇄
          </button>
          
          <button
            onClick={handleSave}
            className={`${styles.button} ${styles.saveButton}`}
          >
            💾 레포트 저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;