// src > components > utils > saveLog.js

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://35.225.63.41:8000/api';

const joinUrl = (base, path) => {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
};

export const saveLog = async ({
  patient_id,
  doctor_id,
  order_id = null,
  sample_id = null,
  step,
  request_detail = '',
  result_detail = ''
}) => {
  try {
    const payload = {
      patient_id,
      doctor_id,
      order_id,
      sample_id,
      step,
      request_detail,
      result_detail
    };

    const response = await axios.post(joinUrl(API_BASE_URL, '/logs/create/'), payload);
    console.log('✅ 로그 저장 성공:', response.data);
  } catch (error) {
    console.error('❌ 로그 저장 실패:', error.response?.data || error.message);
  }
};





// import axios from 'axios';

// const BASE_URL = process.env.REACT_APP_API_URL || 'http://35.225.63.41:8000/api';

// const joinUrl = (base, path) => {
//   return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
// };

// export const saveLog = async ({
//   patient_id,
//   patient_name = '',
//   doctor_id,
//   doctor_name = '',
//   request_type,
//   request_detail,
// }) => {
//   if (!patient_id || !doctor_id || !request_type || !request_detail) {
//     console.warn('❗ 필수 항목 누락 → 로그 저장 중단');
//     console.table({ patient_id, doctor_id, request_type, request_detail });
//     return;
//   }

//   const url = joinUrl(BASE_URL, 'logs/create');

//   try {
//     const payload = {
//       patient_id,
//       patient_name,
//       doctor_id,
//       doctor_name,
//       request_type,
//       request_detail,
//     };

//     console.log('📝 로그 저장 시도 중:', payload);
//     await axios.post(url, payload);
//     console.log('✅ 로그 저장 완료');
//   } catch (err) {
//     console.error('❌ 로그 저장 실패:', err);
//   }
// };

// import axios from 'axios';

// export const saveLog = async (logData) => {
//   console.log('📝 로그 저장 시도 중:', logData);

//   try {
//     const res = await axios.post(
//       `${process.env.REACT_APP_API_BASE_URL}logs/create`,  // 앞에 슬래시 ❌
//       logData,
//       { headers: { 'Content-Type': 'application/json' } }
//     );
//     console.log('✅ 로그 저장 성공:', res.data);
//   } catch (err) {
//     console.error('❌ 로그 저장 실패:', err);
//   }
// };
///////////////\\

// // utils/saveLog.js
// import axios from 'axios';

// export const saveLog = async ({
//   patient_id,
//   doctor_id,
//   order_id = null,
//   sample_id = null,
//   step,
//   request_detail = '',
//   result_detail = ''
// }) => {
//   try {
//     const payload = {
//       patient_id,
//       doctor_id,
//       order_id,
//       sample_id,
//       step,  // 'order', 'sample', 'result'
//       request_detail,
//       result_detail
//     };

//     const response = await axios.post('/api/logs/create/', payload);
//     console.log('✅ 로그 저장 성공:', response.data);
//   } catch (error) {
//     console.error('❌ 로그 저장 실패:', error.response?.data || error.message);
//   }
// };