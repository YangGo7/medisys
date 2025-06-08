import React from 'react';
import { Plus, Search, FileText } from 'lucide-react';

const QuickActions = () => (
  <div style={{
    background: '#e8eaf6',
    borderRadius: 8,
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 8,
    height: '100%'
  }}>
    <button style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: 12, borderRadius: 6, border: 'none',
      background: '#3949ab', color: '#fff', cursor: 'pointer'
    }}>
      <Plus size={16} /> 신규 환자
    </button>
    <button style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: 12, borderRadius: 6, border: 'none',
      background: '#5c6bc0', color: '#fff', cursor: 'pointer'
    }}>
      <Search size={16} /> 환자 조회
    </button>
    <button style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: 12, borderRadius: 6, border: 'none',
      background: '#7986cb', color: '#fff', cursor: 'pointer'
    }}>
      <FileText size={16} /> 검사 요청
    </button>
  </div>
);

export default QuickActions;
