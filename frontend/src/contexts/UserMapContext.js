// import React, { createContext, useEffect, useState } from 'react';
// import axios from 'axios';

// export const UserMapContext = createContext();

// export const UserMapProvider = ({ children }) => {
//   const [patientMap, setPatientMap] = useState({});
//   const [doctorMap, setDoctorMap] = useState({});

//   useEffect(() => {
//      const fetchMappings = async () => {
//         try {
//         const patientRes = await axios.get('/api/openmrs-patients/');
//         const patients = patientRes.data; // ✅ 여기 추가
//         const pMap = {};
//         patients.forEach(p => {
//             pMap[p.identifier] = { uuid: p.uuid, name: p.display };
//         });
//         setPatientMap(pMap);

//         const doctorRes = await axios.get('/api/openmrs/providers/');
//         const dMap = {};
//         doctorRes.data.results.forEach(d => {
//             dMap[d.uuid] = d.display;
//         });
//         setDoctorMap(dMap);
//         } catch (err) {
//         console.error('❌ 매핑 실패:', err);
//         }
//     };

//     fetchMappings();
//   }, []);

//   return (
//     <UserMapContext.Provider value={{ patientMap, doctorMap }}>
//       {children}
//     </UserMapContext.Provider>
//   );
// };
