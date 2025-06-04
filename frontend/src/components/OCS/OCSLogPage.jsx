// OCSLogPage.jsx (환자 선택 후 하위 컴포넌트 연결)
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './OCSLogPage.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL?.replace(/\/$/, '');

const OCSLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [patientQuery, setPatientQuery] = useState('');
  const [doctorQuery, setDoctorQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

 useEffect(() => {
  const fetchLogs = async () => {
    try {
      const [mysqlRes, mongoRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/logs/`),
        axios.get(`${API_BASE_URL}/logs/test-logs/`)
      ]);
      // const merged = [...mysqlRes.data, ...mongoRes.data.logs]; // logs 필드 주의
      const merged = [...mysqlRes.data.results, ...mongoRes.data.logs];
      setLogs(merged);
      setFilteredLogs(merged);
      setError('');
    } catch (err) {
      console.error(err);
      setLogs([]);
      setFilteredLogs([]);
      setError('OCS 로그를 불러오지 못했습니다.');
    }
  };
  fetchLogs();
}, []);

  const handleSearch = () => {
    const filtered = logs.filter((log) => {
      const patientMatch = patientQuery
        ? (log.patient_id?.toLowerCase().includes(patientQuery.toLowerCase()) ||
           log.patient_name?.toLowerCase().includes(patientQuery.toLowerCase()))
        : true;

      const doctorMatch = doctorQuery
        ? (log.doctor_id?.toLowerCase().includes(doctorQuery.toLowerCase()) ||
           log.doctor_name?.toLowerCase().includes(doctorQuery.toLowerCase()))
        : true;

      const dateMatch = (() => {
        if (!startDate && !endDate) return true;
        const logTime = new Date(log.request_time);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start && logTime < start) return false;
        if (end && logTime > end) return false;
        return true;
      })();

      return patientMatch && doctorMatch && dateMatch;
    });
    setFilteredLogs(filtered);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setPatientQuery('');
    setDoctorQuery('');
    setStartDate('');
    setEndDate('');
    setFilteredLogs(logs);
    setCurrentPage(1);
  };

  const currentLogs = filteredLogs.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  return (
    <div className="ocs-body">
      <h1 className="ocs-title">로그 조회</h1>

      <div className="ocs-controls">
        <input
          className="ocs-controls-input"
          placeholder="환자 ID 또는 이름"
          value={patientQuery}
          onChange={(e) => setPatientQuery(e.target.value)}
        />
        <input
          className="ocs-controls-input"
          placeholder="의사 ID 또는 이름"
          value={doctorQuery}
          onChange={(e) => setDoctorQuery(e.target.value)}
        />
        <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button className="ocs-controls-button" onClick={handleSearch}>검색</button>
        <button className="ocs-controls-button reset" onClick={handleReset}>초기화</button>
      </div>

      {error && <p className="ocs-error-message">{error}</p>}
      {filteredLogs.length === 0 ? (
        <p className="ocs-empty-message">저장된 로그가 없습니다.</p>
      ) : (
        <table className="ocs-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>환자 ID</th>
              <th>의사 ID</th>
              <th>오더-요청 종류</th>
              <th>오더-요청 상세</th>
              <th>시간</th>
            </tr>
          </thead>
          <tbody>
            {currentLogs.map((log, idx) => (
              // MySQL 기반 Django 모델용
              // <tr key={log.id}>
              //   <td>{(currentPage - 1) * logsPerPage + idx + 1}</td>
              //   <td>{log.patient_id} ({log.patient_name || '-'})</td>
              //   <td>{log.doctor_id} ({log.doctor_name || '-'})</td>
              //   <td>{log.request_type || '-'}</td>
              //   <td>{log.request_detail || '-'}</td>
              //   <td>{new Date(log.request_time).toLocaleString('ko-KR')}<br />{log.result_time ? new Date(log.result_time).toLocaleString('ko-KR') : '-'}</td>
              // </tr>

              // // MongoDB 기반 로그용
              // <tr key={idx}>  {/* MongoDB는 log.id가 없을 수 있음 */}
              //   <td>{(currentPage - 1) * logsPerPage + idx + 1}</td>
              //   <td>{log.patient_id || '-'}</td>
              //   <td>{log.doctor_id || '-'}</td>
              //   <td>{log.request_type || '-'}</td>
              //   <td>{log.detail || '-'}</td>
              //   <td>{log.created_at ? new Date(log.created_at).toLocaleString('ko-KR') : '-'}</td>
              // </tr>

              //MongoDB + MySQL 겸용 버전
              <tr key={log.id || idx}>
                <td>{(currentPage - 1) * logsPerPage + idx + 1}</td>
                <td>{log.patient_id || log.patient_name || '-'}</td>
                <td>{log.doctor_id || log.doctor_name || '-'}</td>
                <td>{log.request_type || '-'}</td>
                <td>{log.request_detail || log.detail || '-'}</td>
                <td>
                  {(log.request_time || log.created_at)
                    ? new Date(log.request_time || log.created_at).toLocaleString('ko-KR')
                    : '-'}
                  <br />
                  {log.result_time ? new Date(log.result_time).toLocaleString('ko-KR') : '-'}
                </td>
              </tr>

            ))}
          </tbody>
        </table>
      )}

      {totalPages > 1 && (
        <div className="ocs-pagination">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`ocs-page-button ${i + 1 === currentPage ? 'active' : ''}`}
              onClick={() => setCurrentPage(i + 1)}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default OCSLogPage;


// // OCSLogPage.jsx (MySQL + Mongo 겸용 버전)
// import React, { useEffect, useState } from 'react';
// import axios from 'axios';
// import './OCSLogPage.css';

// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL?.replace(/\/$/, '');

// const OCSLogPage = ({ useMongo = false }) => {
//   const [logs, setLogs] = useState([]);
//   const [filteredLogs, setFilteredLogs] = useState([]);
//   const [patientQuery, setPatientQuery] = useState('');
//   const [doctorQuery, setDoctorQuery] = useState('');
//   const [startDate, setStartDate] = useState('');
//   const [endDate, setEndDate] = useState('');
//   const [error, setError] = useState('');
//   const [currentPage, setCurrentPage] = useState(1);
//   const logsPerPage = 10;

//   useEffect(() => {
//     const fetchLogs = async () => {
//       try {
//         const url = useMongo ? `${API_BASE_URL}/logs/test-logs/` : `${API_BASE_URL}/logs/`;
//         const res = await axios.get(url);
//         const data = useMongo ? res.data.logs : res.data;
//         setLogs(data);
//         setFilteredLogs(data);
//         setError('');
//       } catch (err) {
//         console.error(err);
//         setLogs([]);
//         setFilteredLogs([]);
//         setError('OCS 로그를 불러오지 못했습니다.');
//       }
//     };
//     fetchLogs();
//   }, [useMongo]);

//   const handleSearch = () => {
//     const filtered = logs.filter((log) => {
//       const patientMatch = patientQuery
//         ? (log.patient_id?.toLowerCase().includes(patientQuery.toLowerCase()) ||
//            log.patient_name?.toLowerCase().includes(patientQuery.toLowerCase()))
//         : true;

//       const doctorMatch = doctorQuery
//         ? (log.doctor_id?.toLowerCase().includes(doctorQuery.toLowerCase()) ||
//            log.doctor_name?.toLowerCase().includes(doctorQuery.toLowerCase()))
//         : true;

//       const dateMatch = (() => {
//         if (!startDate && !endDate) return true;
//         const timeField = useMongo ? log.created_at : log.request_time;
//         const logTime = new Date(timeField);
//         const start = startDate ? new Date(startDate) : null;
//         const end = endDate ? new Date(endDate) : null;
//         if (start && logTime < start) return false;
//         if (end && logTime > end) return false;
//         return true;
//       })();

//       return patientMatch && doctorMatch && dateMatch;
//     });
//     setFilteredLogs(filtered);
//     setCurrentPage(1);
//   };

//   const handleReset = () => {
//     setPatientQuery('');
//     setDoctorQuery('');
//     setStartDate('');
//     setEndDate('');
//     setFilteredLogs(logs);
//     setCurrentPage(1);
//   };

//   const currentLogs = filteredLogs.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage);
//   const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

//   return (
//     <div className="ocs-body">
//       <h1 className="ocs-title">로그 조회 ({useMongo ? 'MongoDB' : 'MySQL'})</h1>

//       <div className="ocs-controls">
//         <input
//           className="ocs-controls-input"
//           placeholder="환자 ID 또는 이름"
//           value={patientQuery}
//           onChange={(e) => setPatientQuery(e.target.value)}
//         />
//         <input
//           className="ocs-controls-input"
//           placeholder="의사 ID 또는 이름"
//           value={doctorQuery}
//           onChange={(e) => setDoctorQuery(e.target.value)}
//         />
//         <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
//         <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
//         <button className="ocs-controls-button" onClick={handleSearch}>검색</button>
//         <button className="ocs-controls-button reset" onClick={handleReset}>초기화</button>
//       </div>

//       {error && <p className="ocs-error-message">{error}</p>}
//       {filteredLogs.length === 0 ? (
//         <p className="ocs-empty-message">저장된 로그가 없습니다.</p>
//       ) : (
//         <table className="ocs-table">
//           <thead>
//             <tr>
//               <th>#</th>
//               <th>환자 ID</th>
//               <th>의사 ID</th>
//               <th>오더-요청 종류</th>
//               <th>오더-요청 상세</th>
//               <th>시간</th>
//             </tr>
//           </thead>
//           <tbody>
//             {currentLogs.map((log, idx) => (
//               <tr key={log.id || idx}>
//                 <td>{(currentPage - 1) * logsPerPage + idx + 1}</td>
//                 <td>{log.patient_id || '-'}</td>
//                 <td>{log.doctor_id || '-'}</td>
//                 <td>{log.request_type || '-'}</td>
//                 <td>{log.request_detail || log.detail || '-'}</td>
//                 <td>
//                   {(log.request_time || log.created_at)
//                     ? new Date(log.request_time || log.created_at).toLocaleString('ko-KR')
//                     : '-'}
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       )}

//       {totalPages > 1 && (
//         <div className="ocs-pagination">
//           {Array.from({ length: totalPages }, (_, i) => (
//             <button
//               key={i}
//               className={`ocs-page-button ${i + 1 === currentPage ? 'active' : ''}`}
//               onClick={() => setCurrentPage(i + 1)}>
//               {i + 1}
//             </button>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// export default OCSLogPage;
