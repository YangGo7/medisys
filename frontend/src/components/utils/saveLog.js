// src > components > utils > saveLog.js

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://35.225.63.41:8000/api';

const joinUrl = (base, path) => {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
};

let logCooldownSet = new Set();

export const saveLog = async ({
  patient_id,
  doctor_id,
  order_id = null,
  sample_id = null,
  step,
  request_detail = '',
  result_detail = ''
}) => {
  const logKey = `${step}-${sample_id || order_id}`;

  if (logCooldownSet.has(logKey)) {
    console.warn('⏱ 로그 중복 저장 방지됨:', logKey);
    return;
  }

  try {
    logCooldownSet.add(logKey);  // 저장 시도 시작
    setTimeout(() => logCooldownSet.delete(logKey), 3000);  // 3초 후 해제
  
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




