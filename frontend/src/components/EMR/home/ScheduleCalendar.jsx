import React from 'react';
import { LucideIcon, CalendarDays } from 'lucide-react';

const ScheduleCalendar = ({ enableDragDrop }) => {
  const schedule = [
    '09:00 — 김철수',
    '09:30 — 박영희',
    '10:00 — 이영희'
  ];

  return (
    <div style={{
      background: '#e3f2fd',
      borderRadius: 8,
      boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
      padding: 12,
      height: '100%',
      overflowY: 'auto'
    }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <CalendarDays size={20} /> 오늘 일정
      </h3>
      <ul style={{ paddingLeft: 16 }}>
        {schedule.map(item => (
          <li key={item} style={{ marginBottom: 6 }}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

export default ScheduleCalendar;
