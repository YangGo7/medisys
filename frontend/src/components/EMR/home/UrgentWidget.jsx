// src/components/EMR/home/UrgentWidget.jsx

import React, { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

const UrgentWidget = ({
  urgentEvents = [
    // 여전히 예시 데이터는 남겨두되, 컬러는 모두 오렌지로 통일됩니다.
    { id: 1, type: 'SPO2', patient: '김철수', patient_id: '1234', value: 82, unit: '%', at: '09:12', severity: 'high', recommended: '산소 투여' },
    { id: 2, type: 'BP',   patient: '박영희', patient_id: '5678', value: '180/110', unit: '', at: '09:18', severity: 'medium', recommended: '혈압약 투여' },
    { id: 3, type: 'AI_ERROR', patient: '이영희', patient_id: '9012', value: null, unit: '', at: '09:21', severity: 'low', recommended: '재시도' },
  ],
  showActionButtons = true,
  onShowDetail = () => {},
}) => {
  const [loadingId, setLoadingId] = useState(null);

  // 모두 같은 오렌지 배지로 통일
  const orangeBadge = {
    label: '🟠',
    color: '#fff3e0',
    border: '#ffb74d'
  };

  const handleDetailClick = async (event) => {
    setLoadingId(event.id);
    try {
      await onShowDetail(event);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div
      className="urgent-widget"
      style={{
        background: orangeBadge.color,
        borderRadius: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        padding: 12,
        height: '100%',
        overflowY: 'auto',
      }}
    >
      <h3
        className="card-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: '#e65100',
          margin: 0,
          marginBottom: 12,
        }}
      >
        <AlertCircle size={20} />
        긴급 처리 <span style={{ opacity: 0.7 }}>({urgentEvents.length})</span>
      </h3>

      <ul
        className="card-list"
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {urgentEvents.map(ev => {
          const { label, color, border } = orangeBadge;
          return (
            <li
              key={ev.id}
              className="card-list-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                background: color,
                border: `2px solid ${border}`,
                borderRadius: 6,
                padding: '8px 12px',
              }}
            >
              <span style={{ marginRight: 12, fontSize: '1.2rem' }}>{label}</span>
              <div style={{ flex: 1, lineHeight: 1.3 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {ev.patient} (ID {ev.patient_id})
                </div>
                <div style={{ fontSize: '0.85rem', color: '#444' }}>
                  {ev.type === 'SPO2'
                    ? `SpO₂ ${ev.value}${ev.unit}`
                    : ev.type === 'BP'
                    ? `혈압 ${ev.value}`
                    : ev.type === 'AI_ERROR'
                    ? 'AI 판독 오류'
                    : ev.value !== null
                    ? `${ev.value}${ev.unit}`
                    : ev.type}{' '}
                  · {ev.at}
                </div>
              </div>
              {showActionButtons && (
                <button
                  onClick={() => handleDetailClick(ev)}
                  disabled={loadingId === ev.id}
                  style={{
                    marginLeft: 12,
                    padding: '6px 10px',
                    fontSize: '0.85rem',
                    borderRadius: 4,
                    border: 'none',
                    background: '#ffe0b2',
                    cursor: loadingId === ev.id ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {loadingId === ev.id
                    ? <Loader2 size={16} className="spin" />
                    : '상세 보기'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default UrgentWidget;
