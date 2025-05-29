// src/components/WaitingRoom.jsx
import React from 'react';

const WaitingRoom = ({ selectedPatient, assignToRoom, assignedPatients }) => {
  return (
    <div style={{ minWidth: '200px', borderRight: '1px solid #ccc', padding: '1rem' }}>
      <button
        onClick={() => assignToRoom(1)}
        disabled={!selectedPatient || assignedPatients[1]}
      >
        진료실 1 배정
      </button>
      <p>{assignedPatients[1] ? `✔ ${assignedPatients[1].display}` : '비어 있음'}</p>

      <button
        onClick={() => assignToRoom(2)}
        disabled={!selectedPatient || assignedPatients[2]}
      >
        진료실 2 배정
      </button>
      <p>{assignedPatients[2] ? `✔ ${assignedPatients[2].display}` : '비어 있음'}</p>
    </div>
  );
};

export default WaitingRoom;
