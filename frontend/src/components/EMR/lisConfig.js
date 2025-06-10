// src/components/EMR/lisConfig.js

// 검사 패널별 항목 리스트
export const panelComponents = {
  CBC: ['WBC', 'RBC', 'Hemoglobin', 'Hematocrit', 'MCV', 'MCH', 'MCHC', 'Platelets'],
  LFT: ['ALT', 'AST', 'ALP', 'GGT', 'Total Bilirubin', 'Direct Bilirubin', 'Albumin', 'Total Protein'],
  RFT: ['BUN', 'Creatinine', 'eGFR', 'Uric Acid', 'Sodium', 'Potassium', 'Chloride'],
  'Lipid Panel': ['Total Cholesterol', 'HDL Cholesterol', 'LDL Cholesterol', 'Triglycerides'],
  'Electrolyte Panel': ['Sodium', 'Potassium', 'Chloride', 'Bicarbonate'],
  'Thyroid Panel': ['TSH', 'Free T4', 'T3'],
  'Coagulation Panel': ['PT', 'INR', 'aPTT', 'Fibrinogen'],
  Glucose: ['Fasting Blood Glucose', 'HbA1c'],
};

// LIS 요청용 API 엔드포인트 모아둔 상수
export const LIS_API = {
  BASE:     '/api/lis-requests/',
  LIST:     '/api/lis-requests/',   // GET: 전체 조회
  CREATE:   '/api/lis-requests/',   // POST: 새 요청
};
