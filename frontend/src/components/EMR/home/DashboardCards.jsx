import React from 'react';
import { LucideIcon, Users, Clock, Calendar, Cpu } from 'lucide-react'; 

const DashboardCards = ({ withProgress, withSparkline }) => {
  const cards = [
    { icon: <Users size={20} />, label: '대기 환자', value: '12명', bg: '#e0f7fa' },
    { icon: <Clock size={20} />, label: '평균 대기시간', value: '8분', bg: '#fff3e0' },
    { icon: <Calendar size={20} />, label: '오늘 예약 환자', value: '23명', bg: '#e8f5e9' },
    { icon: <Cpu size={20} />, label: 'AI 분석 대기', value: '4건', bg: '#f3e5f5' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
      {cards.map(({ icon, label, value, bg }) => (
        <div
          key={label}
          style={{
            background: bg,
            borderRadius: 8,
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            padding: 12,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}
        >
          <div style={{ flexShrink: 0 }}>{icon}</div>
          <div>
            <strong style={{ display: 'block', marginBottom: 4 }}>{label}</strong>
            <div style={{ fontSize: '1.5rem' }}>{value}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardCards;
