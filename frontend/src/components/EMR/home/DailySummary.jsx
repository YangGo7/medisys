import React, { useEffect, useState } from 'react';
import axios from 'axios';
// import './DailySummary.css'; // <-- 🚨🚨🚨 이 줄을 삭제합니다! 🚨🚨🚨
// 만약 DailySummary.css가 실제로 있고, 거기에만 정의된 스타일이 필요하다면
// 이 줄을 살리고 해당 파일을 생성해야 하지만, 현재 에러는 파일이 없다는 것이므로 삭제하는 것이 일반적입니다.

const DailySummary = () => {
  const [summaryStats, setSummaryStats] = useState({
    total_consultations: '-',
    ai_analysis_count: 2,      // 하드코딩
    imaging_exam_count: 3,     // 하드코딩
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE = process.env.REACT_APP_INTEGRATION_API || 'http://35.225.63.41:8000/api/integration/';
  const COMPLETED_PATIENTS_API = `${API_BASE}completed-patients/`; // 기존 API 사용
  const POLL_INTERVAL_MS = 15000;

  const fetchSummaryStats = async () => {
    setLoading(true);
    setError(null);
    try {
      // 완료된 환자 수 가져오기 (실제 진료 건수)
      const completedRes = await axios.get(COMPLETED_PATIENTS_API);
      let completedCount = 0;
      
      if (completedRes.data.success) {
        completedCount = completedRes.data.total_completed || 0;
      }

      setSummaryStats({
        total_consultations: completedCount, // 실제 완료된 환자 수 사용
        ai_analysis_count: 2,                // 하드코딩
        imaging_exam_count: 3,               // 하드코딩
      });
      
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
      <div className="stats-grid" style={{ gap: '0.8rem' }}>
        <div className="card" style={{ padding: '1rem', minHeight: '80px' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>📋 총 진료 건수</p>
          <h2 style={{ margin: '0 0 0.3rem 0', fontSize: '1.8rem' }}>
            {loading ? '...' : error ? '오류' : `${summaryStats.total_consultations}건`}
          </h2>
          <small style={{ fontSize: '0.8rem', color: '#666' }}>완료된 진료 건수</small>
        </div>
        <div className="card" style={{ padding: '1rem', minHeight: '80px' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>🧠 AI 분석 건수</p>
          <h2 style={{ margin: '0 0 0.3rem 0', fontSize: '1.8rem' }}>
            {loading ? '...' : error ? '오류' : `${summaryStats.ai_analysis_count}건`}
          </h2>
          <small style={{ fontSize: '0.8rem', color: '#666' }}>CDSS 활용도</small>
        </div>
        <div className="card" style={{ padding: '1rem', minHeight: '80px' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>📦 영상 검사 수</p>
          <h2 style={{ margin: '0 0 0.3rem 0', fontSize: '1.8rem' }}>
            {loading ? '...' : error ? '오류' : `${summaryStats.imaging_exam_count}건`}
          </h2>
          <small style={{ fontSize: '0.8rem', color: '#666' }}>Radiology 활용률</small>
        </div>
      </div>
    </div>
  );
};

export default DailySummary;