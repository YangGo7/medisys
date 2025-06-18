// src/components/EMR/PatientInfoPanel.jsx

import React from 'react';
// LisRequestPanel import는 여기서도 필요하지 않으므로 제거합니다 (만약 있다면).
// import LisRequestPanel from './LisRequestPanel'; // 이전에 PatientDetailModal과 함께 있었을 수 있음

const PatientInfoPanel = ({ patient, onOpenDetailModal }) => {
  if (!patient || !patient.person) {
    return <p className="empty-text">환자 정보가 없습니다.</p>;
  }

  const { display, person, uuid, mapping_id } = patient; // mapping_id도 가져와서 필요하면 활용

  return (
    <div style={{ padding: '0.5rem 0' }}>
      <h3 style={{ marginTop: '0', marginBottom: '1rem' }}>
        {/* '환자 정보' 대신 '환자 정보'와 '상세 정보 보기' 버튼을 나란히 */}
        환자 정보
        <button
          onClick={onOpenDetailModal}
          style={{ marginLeft: '1rem', padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #1890ff', background: 'white', color: '#1890ff', cursor: 'pointer' }}
        >
          상세 정보 보기
        </button>
      </h3>
      <p><strong>이름:</strong> {display}</p>
      <p><strong>성별:</strong> {person.gender === 'M' ? '남' : '여'}</p>
      {/* 나이 표시 부분: person.age가 이제 백엔드에서 오므로 올바르게 표시될 것입니다. */}
      <p><strong>나이:</strong> {person.age !== null && person.age !== undefined ? `${person.age}세` : '-'}</p>
      <p><strong>생년월일:</strong> {person.birthdate}</p>
      {/* 필요하다면 UUID나 매핑 ID도 추가 */}
      {/* <p><strong>UUID:</strong> {uuid}</p> */}
      {/* <p><strong>매핑 ID:</strong> {mapping_id || '-'}</p> */}
    </div>
  );
};

export default PatientInfoPanel;