import React from 'react';
import { LucideIcon, AlertCircle } from 'lucide-react';

const UrgentWidget = ({ marquee, withTabs, showActionButtons }) => {
  const items = [
    'SpO₂ ≤85%: 3명',
    '검사 지연: 혈액검사 2건',
    'AI 오류: 1건'
  ];

  return (
    <div style={{
      background: '#ffebee',
      borderRadius: 8,
      boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
      padding: 12,
      height: '100%',
      overflowY: 'auto'
    }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#c62828' }}>
        <AlertCircle size={20} /> 긴급 처리
      </h3>
      <ul style={{ paddingLeft: 16 }}>
        {items.map(i => <li key={i} style={{ marginBottom: 6 }}>{i}</li>)}
      </ul>
      {showActionButtons && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button style={{ flex: 1, padding: 8, borderRadius: 4, background: '#ffcdd2', border: 'none', cursor: 'pointer' }}>
            🔍 상세 보기
          </button>
          <button style={{ flex: 1, padding: 8, borderRadius: 4, background: '#ffcdd2', border: 'none', cursor: 'pointer' }}>
            📞 호출
          </button>
        </div>
      )}
    </div>
  );
};

export default UrgentWidget;
