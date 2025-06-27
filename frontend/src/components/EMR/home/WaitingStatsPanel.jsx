import React from 'react'; // useEffect, useState 제거
import './WaitingStatsPanel.css';

// completedPatients prop을 EmrMainPage로부터 받도록 변경
const WaitingStatsPanel = ({ waitingList, completedPatients }) => {
  // completed state 및 useEffect 제거
  
  // 환자 이름에서 ID 제거 함수 (P6643 - 김아무개 → 김아무개)
  const cleanPatientName = (displayName) => {
    if (!displayName) return '';
    const parts = displayName.split(' - ');
    return parts.length > 1 ? parts[1] : displayName;
  };

  return (
    <div className="dashboard-card waiting-stats-panel">
      <div className="panel-title">📋 진료 대기 중 · 최근 완료 🔄</div>
      <div className="panel-body">
        <div className="panel-column">
          <div className="label-waiting">🟡 현재 대기 중:</div>
          {waitingList && waitingList.length > 0
            ? waitingList.map((p, i) => (
                // key는 유니크한 값으로 설정하는 것이 좋습니다. mapping_id가 있다면 그것을 사용
                <div key={p.mapping_id || p.uuid || i} className="list-item">
                  {cleanPatientName(p.display || p.name)}
                </div>
              ))
            : <div className="list-item">없음</div>
          }
        </div>
        <div className="panel-column">
          <div className="label-completed">🟢 최근 완료:</div>
          {completedPatients && completedPatients.length > 0
            ? completedPatients.map((c, i) => (
                // key는 유니크한 값으로 설정하는 것이 좋습니다.
                <div key={c.name + i} className="list-item">
                  {cleanPatientName(c.name)} ({c.time})
                </div>
              ))
            : <div className="list-item">없음</div>
          }
        </div>
      </div>
    </div>
  );
};

export default WaitingStatsPanel;