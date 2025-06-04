// src/saveLog.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/';

export const saveLog = async (patientId, patientName, doctorId, doctorName, requestType, requestDetail) => {
  try {
    const payload = {
      patient_id: patientId,
      patient_name: patientName || '-',  // 추가 ✅
      doctor_id: doctorId,
      doctor_name: doctorName || '-',    // 추가 ✅
      request_type: requestType,
      request_detail: requestDetail
    };

    await axios.post(`${API_URL}logs/create/`, payload);
    console.log('✅ 로그 저장 성공');
  } catch (error) {
    console.error('❌ 로그 저장 실패:', error.response?.data || error.message);
  }
};


