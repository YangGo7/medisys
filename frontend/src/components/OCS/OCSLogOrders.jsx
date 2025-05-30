// frontend > src > components > OCS > OCSLogOrders.jsx (OCS 로그 조회)
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL?.replace(/\/$/, '');

const OCSLogOrders = ({ patientId }) => {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/logs/?patient_id=${patientId}`);
        setLogs(res.data);
      } catch (err) {
        setError('OCS 로그를 불러오지 못했습니다.');
        console.error(err);
      }
    };

    if (patientId) {
      fetchLogs();
    }
  }, [patientId]);

  return (
    <div className="ocs-log-table">
      <h2>환자 ID: {patientId}의 OCS 로그</h2>
      {error && <p className="ocs-error-message">{error}</p>}
      <table className="ocs-table">
        <thead>
          <tr>
            <th>요청 종류</th>
            <th>요청 시간</th>
            <th>결과 종류</th>
            <th>결과 시간</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{log.request_type}</td>
              <td>{log.request_time}</td>
              <td>{log.result_type || '-'}</td>
              <td>{log.result_time || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OCSLogOrders;
