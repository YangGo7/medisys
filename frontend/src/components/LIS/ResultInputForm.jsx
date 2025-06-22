import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { saveLog } from '../utils/saveLog';
import './ResultInputForm.css';

const panelComponents = {
  CBC: ['WBC', 'RBC', 'Hemoglobin', 'Hematocrit', 'MCV', 'MCH', 'MCHC', 'Platelets'],
  LFT: ['ALT', 'AST', 'ALP', 'GGT', 'Total Bilirubin', 'Direct Bilirubin', 'Albumin', 'Total Protein'],
  RFT: ['BUN', 'Creatinine', 'eGFR', 'Uric Acid', 'Sodium', 'Potassium', 'Chloride'],
  'Lipid Panel': ['Total Cholesterol', 'HDL Cholesterol', 'LDL Cholesterol', 'Triglycerides'],
  'Electrolyte Panel': ['Sodium', 'Potassium', 'Chloride', 'Bicarbonate'],
  'Thyroid Panel': ['TSH', 'Free T4', 'T3'],
  'Coagulation Panel': ['PT', 'INR', 'aPTT', 'Fibrinogen'],
  Glucose: ['Fasting Blood Glucose', 'HbA1c'],
};

const componentUnits = {
  WBC: '10^3/uL', RBC: '10^6/uL', Hemoglobin: 'g/dL', Hematocrit: '%', MCV: 'fL', MCH: 'pg', MCHC: 'g/dL', Platelets: '10^3/uL',
  ALT: 'U/L', AST: 'U/L', ALP: 'U/L', GGT: 'U/L', 'Total Bilirubin': 'mg/dL', 'Direct Bilirubin': 'mg/dL', Albumin: 'g/dL', 'Total Protein': 'g/dL',
  BUN: 'mg/dL', Creatinine: 'mg/dL', eGFR: 'mL/min/1.73m^2', 'Uric Acid': 'mg/dL', Sodium: 'mmol/L', Potassium: 'mmol/L', Chloride: 'mmol/L',
  'Total Cholesterol': 'mg/dL', 'HDL Cholesterol': 'mg/dL', 'LDL Cholesterol': 'mg/dL', Triglycerides: 'mg/dL',
  Bicarbonate: 'mmol/L', TSH: 'uIU/mL', 'Free T4': 'ng/dL', T3: 'ng/dL', PT: 'sec', INR: '', aPTT: 'sec', Fibrinogen: 'mg/dL',
  'Fasting Blood Glucose': 'mg/dL', HbA1c: '%'
};

const ResultInputForm = ({ sampleId: propSampleId, onClose }) => {
  const navigate = useNavigate();
  const [selectedPanel, setSelectedPanel] = useState('');
  const [results, setResults] = useState({});
  const [sampleId, setSampleId] = useState('');
  const [sampleList, setSampleList] = useState([]);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_BASE_URL}samples/`)
      .then(res => {
        const validSamples = res.data.filter(sample => sample.sample_status !== 'deleted'); // 또는 sample.is_deleted === false
        setSampleList(validSamples);
      })
      .catch(err => console.error('샘플 목록 불러오기 실패:', err));
  }, []);

  useEffect(() => {
    if (!sampleId) return;
    axios.get(`${process.env.REACT_APP_API_BASE_URL}samples/get/${sampleId}`)
      .then((res) => {
        const alias = res.data.test_type;
        if (alias && panelComponents[alias]) {
          setSelectedPanel(alias);
        } else {
          setSelectedPanel('');
        }
      })
      .catch((err) => {
        console.error('샘플 정보 불러오기 실패:', err);
        setSelectedPanel('');
      });
  }, [sampleId]);

  const handleChange = (component, value) => {
    setResults((prev) => ({ ...prev, [component]: value }));
  };

  const handleSubmit = async () => {
    const entries = Object.entries(results);
    const expectedComponents = panelComponents[selectedPanel] || [];
    const hasAllValues = expectedComponents.every((comp) => results[comp]?.trim());

    if (!hasAllValues) {
      alert('❗ 모든 검사 항목을 입력해야 합니다.');
      return;
    }
    try {
      // 중복 제출 방지를 위한 검사
      const allCdssResults = await axios.get(`${process.env.REACT_APP_API_BASE_URL}cdss/results/`);
      const exists = allCdssResults.data.some(r => String(r.sample) === String(sampleId));
      if (exists) {
        alert('⚠ 이미 CDSS로 전송된 샘플입니다. 결과를 다시 등록할 수 없습니다.');
        return;
      }

      await Promise.all(
        entries.map(([component_name, result_value]) =>
          axios.post(`${process.env.REACT_APP_API_BASE_URL}tests/run`, {
            sample: sampleId,
            test_type: selectedPanel,
            component_name,
            result_value,
            result_unit: componentUnits[component_name] || '',
            verified_by: 1,
            verified_date: new Date().toISOString(),
          })
        )
      );

      await Promise.all(
        entries.map(([component_name, result_value]) => {
          const payload = {
            sample: sampleId,
            test_type: selectedPanel,
            component_name,
            value: result_value,
            unit: componentUnits[component_name] || '',
            verified_by: 1,
           verified_date: new Date().toISOString()
          }; 
          console.log("CDSS 전송 payload 확인:",);
          return axios.post(`${process.env.REACT_APP_API_BASE_URL}cdss/receive/`, payload)
          .catch(err => {
            console.log('CDSS POST error:', err?.response?.data);
            throw err;
          });
      }));

      // 로그 저장
      try {
        const allLogs = await axios.get(`${process.env.REACT_APP_API_BASE_URL}logs/`);
        const matched = allLogs.data.find(
          log =>
            log.sample_status?.toString() === sampleId?.toString() &&
            log.step === 'sample'
        );

        const patient_id = matched?.patient_id || 'UNKNOWN';
        const doctor_id = matched?.doctor_id || 'UNKNOWN';

        const resultText = entries.map(
          ([comp, val]) => `${comp}: ${val} ${componentUnits[comp] || ''}`
        ).join(', ');

        await saveLog({
          patient_id,
          doctor_id,
          sample: sampleId,
          step: 'result',
          result_detail: resultText
        });

      } catch (logErr) {
        console.warn('❗ 로그 저장 중 오류:', logErr);
      } //

      alert('모든 결과가 성공적으로 등록 및 CDSS 전송되었습니다.');
    } catch (error) {
      console.error('등록 또는 전송 실패:', error);
      alert('일부 또는 전체 결과 등록 실패');
    }
  };

//   return (
//     <div className="p-4">
//       <h2 className="text-xl font-bold mb-2">결과 입력</h2>
//       <select
//         value={sampleId}
//         onChange={(e) => setSampleId(e.target.value)}
//         className="mb-4 border px-2 py-1 rounded w-60"
//       >
//         <option value="">샘플을 선택하세요</option>
//         {sampleList.map((sample) => (
//           <option key={sample.id} value={sample.id}>
//             {`ID ${sample.id} - ${sample.test_type}`}
//           </option>
//         ))}
//       </select>

//       {selectedPanel && (
//         <div>
//           <h3 className="font-semibold mb-2">{selectedPanel} 항목 입력</h3>
//           <div className="space-y-2">
//             {panelComponents[selectedPanel].map((component) => (
//               <div key={component} className="flex gap-2 items-center">
//                 <label className="w-48">{component} ({componentUnits[component] || '-'})</label>
//                 <input
//                   type="text"
//                   value={results[component] || ''}
//                   onChange={(e) => handleChange(component, e.target.value)}
//                   className="border px-2 py-1 rounded w-40"
//                   placeholder="값 입력"
//                   required 
//                 />
//               </div>
//             ))}
//             <button onClick={handleSubmit} className="mt-4 px-4 py-2 bg-green-500 text-white rounded">
//               결과 등록
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

  return (
    <div className="result-form-container">
      <h2>🧪 결과 입력</h2>

      <label className="sample-select-label">샘플 선택</label>
      {!propSampleId && (
      <select
        value={sampleId}
        onChange={(e) => setSampleId(e.target.value)}
        className="sample-select"
      >
        <option value="">샘플을 선택하세요</option>
        {sampleList.map((sample) => (
          <option key={sample.id} value={sample.id}>
            {`ID ${sample.id} - ${sample.test_type}`}
          </option>
        ))}
      </select>
      )}

      {selectedPanel && (
        <>
          <h3 className="panel-title">{selectedPanel} 항목 입력</h3>
          {panelComponents[selectedPanel].map((component) => (
            <div className="result-row" key={component}>
              <label className="result-label">
                {component} ({componentUnits[component] || '-'})
              </label>
              <input
                type="text"
                value={results[component] || ''}
                onChange={(e) => handleChange(component, e.target.value)}
                className="result-input"
                placeholder="값 입력"
                required
              />
            </div>
          ))}
          <button onClick={handleSubmit} className="submit-button">결과 등록</button>
        </>
      )}
    </div>
  );
};

export default ResultInputForm;
