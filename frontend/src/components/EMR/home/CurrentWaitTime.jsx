// src/components/EMR/home/CurrentWaitTime.jsx (수정본)

import React, { useEffect, useState } from 'react';
import './CurrentWaitTime.css';

const CurrentWaitTime = ({ waitingList }) => {
  const [avgWait, setAvgWait] = useState(null);

  useEffect(() => {
    if (!waitingList || waitingList.length === 0) { // waitingList가 비어있으면 바로 0으로 설정
      setAvgWait(0);
      return;
    }
    
    // p.created_at || p.timestamp 대신, 백엔드에서 이미 계산해서 넘겨주는 p.waitTime을 사용합니다.
    const validWaitTimes = waitingList
      .map(p => {
        // p.waitTime이 유효한 숫자인지 확인
        const waitMinutes = typeof p.waitTime === 'number' && !isNaN(p.waitTime) ? p.waitTime : null;
        return waitMinutes;
      })
      .filter(d => d !== null); // null 값 (유효하지 않은 waitTime)을 제거합니다.

    setAvgWait(
      validWaitTimes.length === 0
        ? 0 // 유효한 대기 시간이 없으면 0분
        : Math.round(validWaitTimes.reduce((a,c) => a+c,0) / validWaitTimes.length)
    );
  }, [waitingList]);

  return (
    <div className="dashboard-card current-waittime">
      <div className="cwt-title">⏱️ 현재 평균 대기 시간</div>
      <div className="cwt-value">
        {avgWait === null // 초기값 (로딩 중)
          ? '로딩 중...'
          : avgWait === 0
            ? '대기 환자 없음'
            : `${avgWait}분`}
      </div>
    </div>
  );
};

export default CurrentWaitTime;