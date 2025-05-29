// src/components/VisitHistoryPanel.jsx
import React, { useEffect, useState } from 'react';

const VisitHistoryPanel = ({ patient }) => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!patient) return;
      try {
        const res = await fetch(`/api/openmrs-encounters?uuid=${patient.uuid}`);
        const data = await res.json();
        setHistory(data);
      } catch (err) {
        console.error('내원 기록 불러오기 실패:', err);
      }
    };
    fetchHistory();
  }, [patient]);

  return (
    <div style={{ padding: '1rem', border: '1px solid #ccc', marginLeft: '1rem', minWidth: '300px' }}>
      <h3>📂 내원 기록</h3>
      {patient ? (
        history.length > 0 ? (
          <ul>
            {history.map((item) => (
              <li key={item.uuid}>
                <strong>{item.display}</strong><br />
                📅 {new Date(item.encounterDatetime).toLocaleDateString()}<br />
                🩺 {item.provider}
              </li>
            ))}
          </ul>
        ) : (
          <p>기록 없음</p>
        )
      ) : (
        <p>환자가 배정되지 않았습니다.</p>
      )}
    </div>
  );
};

export default VisitHistoryPanel;