// src/components/OHIFViewer/ReportModal/ReportModal.js
import React, { useState, useEffect } from 'react';
import styles from './ReportModal.module.css';

const ReportModal = ({
  isOpen,
  onClose,
  onPrint,
  patientInfo = {},
  currentStudyUID = '',
  analysisResults = null,
  annotationBoxes = [],
  initialContent = '',
  title = '📋 진단 레포트'
}) => {
  const [reportContent, setReportContent] = useState(initialContent);
  const [recording, setRecording] = useState(false);
  const [micAvailable, setMicAvailable] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setReportContent(initialContent);
    }
  }, [isOpen, initialContent]);

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

  useEffect(() => {
    const checkMicrophone = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasMic = devices.some(device => device.kind === 'audioinput');
        setMicAvailable(hasMic);
        if (!hasMic) {
          console.warn("🎤 마이크가 감지되지 않았습니다.");
        }
      } catch (err) {
        console.error("🎤 마이크 탐지 실패:", err);
        setMicAvailable(false);
      }
    };

    checkMicrophone();
  }, []);

  const handleClose = () => {
    onClose();
  };

  const handleSave = async () => {
    try {
      const response = await fetch("/api/report/save/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patient_id: patient.patient_id,
          study_uid: currentStudyUID,
          report_content: reportContent,
          report_status: "completed",
        }),
      });

      const result = await response.json();
      if (result.status === "success") {
        alert("💾 레포트 저장 완료");
      } else {
        alert("❌ 저장 실패: " + result.message);
      }
    } catch (err) {
      console.error(err);
      alert("서버 오류 발생");
    }
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

  const handleMicInput = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('audio', blob);
        formData.append('patient_id', patient.patient_id);
        formData.append('study_uid', currentStudyUID);

        const response = await fetch('/api/stt/upload/', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        setReportContent(data.corrected_text || '오류 발생');
      };

      mediaRecorder.start();
      setRecording(true);

      setTimeout(() => {
        mediaRecorder.stop();
        setRecording(false);
      }, 6000);
    } catch (err) {
      console.error('마이크 오류:', err);
      alert('마이크 사용에 실패했습니다.');
    }
  };

  const patient = {
    patient_name: patientInfo.patient_name || 'Unknown',
    patient_id: patientInfo.patient_id || 'Unknown', 
    study_date: patientInfo.study_date || 'Unknown',
    ...patientInfo
  };

  const displayStudyUID = currentStudyUID ? 
    currentStudyUID.substring(0, 30) + '...' : 'N/A';

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalHeader}>{title}</h2>

        <div className={styles.patientInfo}>
          <h3 className={styles.patientInfoHeader}>👤 환자 정보</h3>
          <div className={styles.patientGrid}>
            <div className={styles.patientGridItem}><strong>환자명:</strong> {patient.patient_name}</div>
            <div className={styles.patientGridItem}><strong>환자 ID:</strong> {patient.patient_id}</div>
            <div className={styles.patientGridItem}><strong>검사일:</strong> {patient.study_date}</div>
            <div className={styles.patientGridItem}><strong>Study UID:</strong> {displayStudyUID}</div>
          </div>
        </div>

        {analysisResults && analysisResults.results && analysisResults.results.length > 0 && (
          <div className={styles.aiResults}>
            <h3 className={styles.aiResultsHeader}>🤖 AI 분석 결과</h3>
            <div className={styles.aiResultsSummary}>
              <strong>사용 모델:</strong> {analysisResults.model_used} |
              <strong> 총 검출:</strong> {analysisResults.detections}개
            </div>
            {analysisResults.results.map((result, index) => (
              <div key={index} className={`${styles.detectionItem} ${result.confidence > 0.8 ? styles.detectionItemHigh : styles.detectionItemLow}`}>
                <div>
                  <div className={`${styles.detectionLabel} ${result.confidence > 0.8 ? styles.detectionLabelHigh : styles.detectionLabelLow}`}>{result.label}</div>
                  <div className={styles.detectionLocation}>위치: [{result.bbox.join(', ')}]</div>
                </div>
                <span className={`${styles.confidenceBadge} ${result.confidence > 0.8 ? styles.confidenceBadgeHigh : styles.confidenceBadgeLow}`}>
                  {Math.round(result.confidence * 100)}%
                </span>
              </div>
            ))}
          </div>
        )}

        {annotationBoxes.length > 0 && (
          <div className={styles.annotations}>
            <h3 className={styles.annotationsHeader}>✏️ 수동 어노테이션</h3>
            {annotationBoxes.map((box, index) => (
              <div key={box.id} className={styles.annotationItem}>
                <div>
                  <div className={styles.annotationLabel}>수동 마킹 {index + 1}: {box.label}</div>
                  <div className={styles.annotationLocation}>화면 위치: [{box.left}, {box.top}, {box.left + box.width}, {box.top + box.height}]</div>
                </div>
                <span className={styles.annotationBadge}>수동</span>
              </div>
            ))}
          </div>
        )}

        <div className={styles.reportSection}>
          <h3 className={styles.reportSectionHeader}>📝 종합 소견</h3>
          <div className={styles.audioControls}>
            <button className={styles.micButton} onClick={handleMicInput} disabled={!micAvailable || recording}>
              🎤 {recording ? '녹음 중...' : micAvailable ? '음성 입력' : '마이크 없음'}
            </button>
          </div>
          <textarea
            value={reportContent}
            onChange={(e) => setReportContent(e.target.value)}
            placeholder="의료진의 종합 소견을 입력하세요..."
            className={styles.reportTextarea}
          />
        </div>

        <div className={styles.buttonContainer}>
          <button onClick={handleClose} className={`${styles.button} ${styles.cancelButton}`}>❌ 취소</button>
          <button onClick={handlePrint} className={`${styles.button} ${styles.printButton}`}>🖨️ 인쇄</button>
          <button onClick={handleSave} className={`${styles.button} ${styles.saveButton}`}>💾 레포트 저장</button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
