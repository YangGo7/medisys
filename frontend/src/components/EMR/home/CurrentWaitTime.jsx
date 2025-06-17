// src/components/home/CurrentWaitTime.jsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';

const CurrentWaitTime = () => {
  const [avgWait, setAvgWait] = useState(null);
  const API_BASE = process.env.REACT_APP_INTEGRATION_API || 'http://35.225.63.41:8000/api/integration/';

  useEffect(() => {
    const fetchWaitList = async () => {
      try {
        const res = await axios.get(`${API_BASE}identifier-waiting/`);
        const list = res.data;

        if (list.length === 0) {
          setAvgWait(0);
          return;
        }

        const now = new Date();
        // 각 환자의 대기 시작 시간(created_at)을 ISO 문자열로 넘겨준다고 가정
        const diffs = list.map(p => {
          const created = new Date(p.created_at || p.timestamp);
          return (now - created) / 60000; // 분 단위
        });

        const sum = diffs.reduce((acc, cur) => acc + cur, 0);
        const average = Math.round(sum / diffs.length);
        setAvgWait(average);
      } catch (err) {
        console.error('⏱️ 대기 시간 조회 실패:', err);
        setAvgWait(null);
      }
    };

    fetchWaitList();

    // 1분마다 갱신
    const interval = setInterval(fetchWaitList, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-card">
      <h3>⏱️ 현재 평균 대기 시간</h3>
      <p style={{ fontSize: '1.5rem', margin: 0 }}>
        {avgWait === null
          ? '로딩 중...'
          : avgWait === 0
            ? '대기 환자 없음'
            : `${avgWait}분`}
      </p>
    </div>
  );
};

export default CurrentWaitTime;
