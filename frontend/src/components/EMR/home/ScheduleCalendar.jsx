// src/components/EMR/home/ScheduleCalendar.jsx
import React, { useState } from 'react';
import { CalendarDays } from 'lucide-react';

// 데모용 일정 (실제론 API로 교체)
const demoEvents = [
  { id: 1, title: '지은탁',    start: '09:00', end: '09:50', room: '1번' },
  { id: 2, title: '양금명',    start: '10:00', end: '10:50', room: '2번' },
  { id: 3, title: '류선재',    start: '11:30', end: '12:10', room: '1번' },
  { id: 4, title: '홍해인',    start: '12:30', end: '13:00', room: '2번' },
  { id: 5, title: '천송이',    start: '13:15', end: '13:50', room: '응급실' },
  { id: 6, title: '구준표',    start: '14:00', end: '14:40', room: '1번' },
  { id: 7, title: '장만월',    start: '15:00', end: '15:30', room: '2번' },
  { id: 8, title: '박연진',    start: '15:45', end: '16:25', room: '응급실' },
  { id: 9, title: '우영우',   start: '16:30', end: '17:00', room: '1번' },
  { id: 10, title: '박새로이', start: '17:15', end: '17:55', room: '2번' },
];


// 08:00~18:00 까지 30분 단위 시각 생성
const generateTimeSlots = () => {
  const slots = [];
  for (let h = 8; h <= 18; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
};
const timeSlots = generateTimeSlots();

// "HH:MM" → 분 단위 변환
const toMinutes = (str) => {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
};

const ScheduleCalendar = () => {
  const [expandedIds, setExpandedIds] = useState([]);
  const ROW_HEIGHT = 40;           // 한 슬롯당 높이(px)
  const startOfDay = toMinutes('08:00');

  const toggleExpand = (id) => {
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div
      style={{
        background: '#f0f8ff',
        borderRadius: 8,
        padding: 12,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
      }}
    >
      <h3
        style={{
          margin: 0,
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '1.1rem'
        }}
      >
        <CalendarDays size={20} /> 오늘 일정
      </h3>

      <div
        style={{
          flex: 1,
          display: 'flex',
          position: 'relative',
          overflowY: 'auto',
          borderTop: '1px solid #ddd'
        }}
      >
        {/* 왼쪽 타임 컬럼 */}
        <div
          style={{
            width: 60,
            borderRight: '1px solid #ddd',
            boxSizing: 'border-box'
          }}
        >
          {timeSlots.map(t => (
            <div
              key={t}
              style={{
                height: ROW_HEIGHT,
                fontSize: '0.75rem',
                color: '#666',
                paddingLeft: 4,
                borderBottom: '1px solid #eee',
                boxSizing: 'border-box'
              }}
            >
              {t}
            </div>
          ))}
        </div>

        {/* 이벤트 블록 영역 */}
        <div style={{ position: 'relative', flex: 1 }}>
          {demoEvents.map(ev => {
            const top = (toMinutes(ev.start) - startOfDay) / 30 * ROW_HEIGHT;
            const fullHeight = (toMinutes(ev.end) - toMinutes(ev.start)) / 30 * ROW_HEIGHT;
            const isExpanded = expandedIds.includes(ev.id);
            return (
              <div
                key={ev.id}
                onClick={() => toggleExpand(ev.id)}
                style={{
                  position: 'absolute',
                  top,
                  left: 8,
                  right: 8,
                  height: isExpanded ? fullHeight : ROW_HEIGHT,
                  maxHeight: fullHeight,
                  background: '#bbdefb',
                  borderRadius: 4,
                  padding: '4px 8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  overflowY: isExpanded ? 'auto' : 'hidden',
                  overflowX: 'hidden',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                  transition: 'height 0.3s ease'
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    whiteSpace: isExpanded ? 'normal' : 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {ev.title}
                </div>
                {isExpanded && (
                  <div style={{ fontSize: '0.75rem', color: '#444', marginTop: 4 }}>
                    {ev.start}–{ev.end} · {ev.room}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ScheduleCalendar;
