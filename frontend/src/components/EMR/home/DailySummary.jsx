// src/components/EMR/home/DailySummary.jsx (재수정본)

import React, { useEffect, useState } from 'react';
import axios from 'axios';
// import './DailySummary.css'; // <-- 🚨🚨🚨 이 줄을 삭제합니다! 🚨🚨🚨
// 만약 DailySummary.css가 실제로 있고, 거기에만 정의된 스타일이 필요하다면
// 이 줄을 살리고 해당 파일을 생성해야 하지만, 현재 에러는 파일이 없다는 것이므로 삭제하는 것이 일반적입니다.

const DailySummary = () => {
  const [summaryStats, setSummaryStats] = useState({
    total_consultations: '-',
    ai_analysis_count: '-',
    imaging_exam_count: '-',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE = process.env.REACT_APP_INTEGRATION_API || 'http://35.225.63.41:8000/api/integration/';
  const SUMMARY_API_ENDPOINT = `${API_BASE}daily-summary-stats/`;
  const POLL_INTERVAL_MS = 15000;

  const fetchSummaryStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(SUMMARY_API_ENDPOINT);
      if (res.data.success) {
        setSummaryStats({
          total_consultations: res.data.total_consultations,
          ai_analysis_count: res.data.ai_analysis_count,
          imaging_exam_count: res.data.imaging_exam_count,
        });
      } else {
        setError(res.data.error || '데이터 로드 실패');
      }
    } catch (err) {
      console.error('❌ 일일 요약 통계 불러오기 실패:', err);
      setError('통계 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaryStats();
    const interval = setInterval(fetchSummaryStats, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-cards">
      <h3>📦 오늘 진료 요약</h3>
      <div className="stats-grid">
        <div className="card">
          <p>📋 총 진료 건수</p>
          <h2>{loading ? '...' : error ? '오류' : `${summaryStats.total_consultations}건`}</h2>
          <small>하루 진료량 파악</small>
        </div>
        <div className="card">
          <p>🧠 AI 분석 건수</p>
          <h2>{loading ? '...' : error ? '오류' : `${summaryStats.ai_analysis_count}건`}</h2>
          <small>CDSS 활용도</small>
        </div>
        <div className="card">
          <p>📦 영상 검사 수</p>
          <h2>{loading ? '...' : error ? '오류' : `${summaryStats.imaging_exam_count}건`}</h2>
          <small>Radiology 활용률</small>
        </div>
      </div>
    </div>
  );
};

export default DailySummary;