// src/components/EMR/home/DashboardCards.jsx

import React from 'react';
import { Users, Clock, Calendar, Cpu } from 'lucide-react';

const DashboardCards = ({ withProgress, withSparkline }) => {
  // 각 카드에 pctChange 필드를 추가했습니다.
  const cards = [
    { icon: <Users size={20} />,    label: '대기 환자',     value: '12명', pctChange: +5,  bg: '#e0f7fa' },
    { icon: <Clock size={20} />,    label: '평균 대기시간', value: '8분',  pctChange: -2,  bg: '#fff3e0' },
    { icon: <Calendar size={20} />, label: '오늘 예약 환자', value: '10명', pctChange: +8,  bg: '#e8f5e9' },
    { icon: <Cpu size={20} />,      label: 'AI 분석 대기',  value: '4건',  pctChange: -1,  bg: '#f3e5f5' },
  ];

  return (
    <div
      className="dashboard-cards"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: '8px',
        height: '100%',
      }}
    >
      {cards.map(({ icon, label, value, pctChange, bg }) => {
        const isUp = pctChange > 0;
        const badgeStyle = {
          display: 'inline-block',
          marginLeft: 8,
          fontSize: '0.75rem',
          padding: '2px 6px',
          borderRadius: 4,
          fontWeight: 'bold',
          background: isUp ? '#e8f5e9' : '#ffebee',
          color:   isUp ? '#2e7d32' : '#c62828',
        };

        return (
          <div
            key={label}
            style={{
              background: bg,
              borderRadius: 8,
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              padding: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ flexShrink: 0 }}>{icon}</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <strong style={{ fontSize: '1rem' }}>{label}</strong>
                <span style={badgeStyle}>
                  {isUp ? '▲' : '▼'}{Math.abs(pctChange)}%
                </span>
              </div>
              <div style={{ fontSize: '1.5rem', marginTop: 4 }}>{value}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardCards;
