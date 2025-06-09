// src/components/EMR/LisRequestPanel.jsx
import React from 'react';

const LisRequestPanel = ({ patient }) => {
  return (
    <div>
      {patient
        ? <p>환자 <strong>{patient.name || patient.patient_name}</strong> 의 LIS 검사 요청 목록이 여기에 표시됩니다.</p>
        : <p className="empty-text">환자를 선택해주세요.</p>
      }
    </div>
  );
};

export default LisRequestPanel;