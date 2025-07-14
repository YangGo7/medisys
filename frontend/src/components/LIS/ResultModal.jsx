import React from 'react';
import './ResultModal.css';
import ShapContributionChart from './ShapContributionChart';
import ShapSummaryText from './ShapSummaryText';

const CdssResultModal = ({ data, onClose, isModal = true }) => {
  if (!data) return null;

  console.log("💡 data.test_type =", data.test_type);

  const interpretPrediction = (value) => {
    const finalValue = value === null || value === undefined || value === '' ? 0 : value;
    if (finalValue === 1 || finalValue === true || finalValue === "1") return '🔴 이상 소견';
    if (finalValue === 0 || finalValue === false || finalValue === "0") return '🟢 정상';
    return String(finalValue);
  };

  const testTypeLabelMap = {
    CBC: 'CBC',
    ASTHMA: 'CBC',
    CRP: 'CRP',
    ABGA: 'ABGA',
    COPD: 'ABGA',
    'NT-proBNP': 'NT-proBNP',
    CHF: 'NT-proBNP',
    'D-Dimer': 'D-Dimer',
    PE: 'D-Dimer',
  };

  const componentUnits = {
    'WBC': '10^3/uL',
    'Neutrophils': '%',
    'Lymphocytes': '%',
    'Eosinophils': '%',
    'Hemoglobin': 'g/dL',
    'Platelet Count': '10^3/uL',
    'pCO2': 'mmHg',
    'pO2': 'mmHg',
    'pH': '-',
    'NT-proBNP': 'pg/mL',
    'D-Dimer': 'ng/mL FEU',
  };

  return (
    <div className={isModal ? 'modal-overlay' : ''}>
      <div className={isModal ? 'modal-content' : 'ai-result-box'}>
        {isModal && (
          <button className="modal-close" onClick={onClose}>✖</button>
        )}

        <p><strong>검사 종류:</strong> {testTypeLabelMap[data.test_type] || data.test_type}</p>
        <p>
          <strong>예측 결과:</strong>{' '}
          <span className="prediction-text">{interpretPrediction(data.prediction)}</span>
        </p>

        {data.explanation && (
          <p><strong>📌 </strong> {data.explanation}</p>
        )}

        {/* ✅ value가 리스트 형태로 들어올 때 처리 */}
        <table className="ai-result-table">
          <thead>
            <tr><th>항목</th><th>값</th></tr>
          </thead>
          <tbody>
            {Array.isArray(data.results)
              ? data.results.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.component_name || `항목 ${idx + 1}`}</td>
                  <td>{item.value ?? '-'} {item.unit ?? ''}</td>
                </tr>
              ))
            : Object.entries(data.results || {}).map(([key, value], idx) => (
                <tr key={idx}>
                  <td>{`${key}`}</td>
                  <td>{value ?? '-'} {componentUnits[key] ?? ''}</td>
                </tr>
              ))}
          </tbody>

        </table>

        {/* ✅ SHAP 시각화 */}
        {data.shap_data && Object.keys(data.shap_data).length > 0 && (
          <ShapContributionChart shapData={data.shap_data} />
        )}
        {data.shap_data && data.probability && Object.keys(data.shap_data).length > 0 && (
          <ShapSummaryText predictionProb={data.probability} shapData={data.shap_data} />
        )}
      </div>
    </div>
  );
};

export default CdssResultModal;
