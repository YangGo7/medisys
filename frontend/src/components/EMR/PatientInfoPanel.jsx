// src/components/PatientInfoPanel.jsx
import React, { useEffect, useState } from 'react';

const PatientInfoPanel = ({ patient, onOpenDetailModal }) => {
  const [vitals, setVitals] = useState(null);

  useEffect(() => {
    const fetchVitals = async () => {
      if (!patient) return;
      try {
        const res = await fetch(`/api/openmrs-vitals?uuid=${patient.uuid}`);
        const data = await res.json();
        setVitals(data); // 체온, 혈압, SpO2 등 들어있는 객체
      } catch (err) {
        console.error('바이탈 불러오기 실패:', err);
      }
    };
    fetchVitals();
  }, [patient]);

  if (!patient) return <div style={{ padding: '1rem' }}>환자를 선택하세요.</div>;

  const { display, person } = patient;
  const name = display;
  const age = person.age;
  const gender = person.gender;
  const birthdate = person.birthdate;

  return (
    <div
      style={{
        padding: '1rem',
        border: '1px solid #ccc',
        minWidth: '250px',
        position: 'relative',
      }}
    >
      <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        🩺 환자 정보
        <button
          onClick={onOpenDetailModal}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          상세 정보 보기
        </button>
      </h3>

      <p><strong>이름:</strong> {name}</p>
      <p><strong>성별:</strong> {gender === 'M' ? '남' : '여'}</p>
      <p><strong>나이:</strong> {age}세</p>
      <p><strong>생년월일:</strong> {birthdate}</p>

      <h4 style={{ marginTop: '1rem' }}>📊 바이탈 사인</h4>
      {vitals ? (
        <ul>
          <li>체온: {vitals.temp ?? '측정 없음'} °C</li>
          <li>혈압: {vitals.bp ?? '측정 없음'}</li>
          <li>SpO2: {vitals.spo2 ?? '측정 없음'}%</li>
          <li>호흡수: {vitals.resp ?? '측정 없음'}회/분</li>
        </ul>
      ) : (
        <p>바이탈 정보를 불러오는 중...</p>
      )}
    </div>
  );
};

export default PatientInfoPanel;
