// src/components/home/WaitingStatsPanel.jsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './WaitingStatsPanel.css';

const WaitingStatsPanel = () => {
  const [waiting, setWaiting] = useState([]);
  const [completed, setCompleted] = useState([]);
  const API_BASE =
    process.env.REACT_APP_INTEGRATION_API ||
    'http://35.225.63.41:8000/api/integration/';

  useEffect(() => {
    // 1) 오늘 대기 목록 조회
    axios
      .get(`${API_BASE}identifier-waiting/`)
      .then((res) => setWaiting(res.data.map((p) => p.display)))
      .catch((err) => console.error('대기 환자 조회 실패:', err));

    // 2) 최근 완료 환자 조회 (최신 3건)
    axios
      .get(`${API_BASE}completed-patients/`)
      .then((res) => {
        const sorted = res.data
          .sort(
            (a, b) => new Date(b.last_sync) - new Date(a.last_sync)
          )
          .slice(0, 3)
          .map((p) => ({
            name: p.name,
            time: new Date(p.last_sync).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          }));
        setCompleted(sorted);
      })
      .catch((err) => console.error('완료 환자 조회 실패:', err));
  }, []);

  return (
    <div className="dashboard-card waiting-stats-panel">
      <div className="panel-title">진료 대기 중 · 최근 완료    🔄</div>
      <div className="panel-body">
        {/* 왼쪽 열: 현재 대기 중 */}
        <div className="panel-column">
          <div className="label-waiting">🟡 현재 대기 중:</div>
          {waiting.length > 0 ? (
            waiting.map((name, i) => (
              <div key={i} className="list-item">
                {name}
              </div>
            ))
          ) : (
            <div className="list-item">없음</div>
          )}
        </div>

        {/* 오른쪽 열: 최근 완료 */}
        <div className="panel-column">
          <div className="label-completed">🟢 최근 완료:</div>
          {completed.length > 0 ? (
            completed.map((c, i) => (
              <div key={i} className="list-item">
                {c.name} ({c.time})
              </div>
            ))
          ) : (
            <div className="list-item">없음</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WaitingStatsPanel;
