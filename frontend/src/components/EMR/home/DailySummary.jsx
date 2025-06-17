// src/components/home/DailySummary.jsx
import React from 'react';

const DailySummary = () => {
  return (
    <div className="dashboard-cards">
      <h3>📦 오늘 진료 요약</h3>
      <div className="stats-grid">
        <div className="card">
          <p>📋 총 진료 건수</p>
          <h2>12건</h2>
          <small>하루 진료량 파악</small>
        </div>
        <div className="card">
          <p>🧠 AI 분석 건수</p>
          <h2>8건</h2>
          <small>CDSS 활용도</small>
        </div>
        <div className="card">
          <p>📦 영상 검사 수</p>
          <h2>7건</h2>
          <small>Radiology 활용률</small>
        </div>
      </div>
    </div>
  );
};

export default DailySummary;
