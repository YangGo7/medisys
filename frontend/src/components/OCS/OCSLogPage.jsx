// OCSLogMainPage.jsx (환자 선택 후 하위 컴포넌트 연결)
import React, { useState } from 'react';
import OCSLogSearch from './OCSLogSearch';
import OCSLogOrders from './OCSLogOrders';
import './OCSLogPage.css';

const OCSLogPage = () => {
  const [selectedPatient, setSelectedPatient] = useState(null);

  return (
    <div className="ocs-body">
      <h1 className="ocs-title">OCS 요청/결과 로그</h1>
      <OCSLogSearch onSelectPatient={setSelectedPatient} />
      {selectedPatient && <OCSLogOrders patientId={selectedPatient.uuid} />}
    </div>
  );
};

export default OCSLogPage;