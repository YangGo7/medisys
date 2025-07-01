// LIS/ResultModal.jsx

import React from 'react';
import './ResultModal.css';
import ShapContributionChart from './ShapContributionChart';
import ShapSummaryText from './ShapSummaryText';

const CdssResultModal = ({ data, onClose, isModal = true }) => {
  if (!data) return null;

  const interpretPrediction = (value) => {
    const finalValue = value === null || value === undefined || value === '' ? 0 : value;
    if (finalValue === 1 || finalValue === true || finalValue === "1") return '🟢 정상';
    if (finalValue === 0 || finalValue === false || finalValue === "0") return '🔴 이상 소견';
    return String(finalValue);
  };

  return (
    <div className={isModal ? 'modal-overlay' : ''}>
      <div className={isModal ? 'modal-content' : 'ai-result-box'}>
        {isModal && (
          <button className="modal-close" onClick={onClose}>✖</button>
        )}

        <p><strong>검사 종류:</strong> {data.test_type}</p>
        <p>
          <strong>예측 결과:</strong>{' '}
          <span className="prediction-text">{interpretPrediction(data.prediction)}</span>
        </p>

        {data.explanation && (
          <p><strong>📌 </strong> {data.explanation}</p>
        )}

        <table className="ai-result-table">
          <thead>
            <tr><th>항목</th><th>값</th></tr>
          </thead>
          <tbody>
            {Object.entries(data.results || {}).map(([key, value]) => (
              <tr key={key}>
                <td>{value.component_name || `항목 ${key}`}</td>
                <td>{`${value.value ?? '-'} ${value.unit ?? ''}`}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {data.shap_data && <ShapContributionChart shapData={data.shap_data} />}
        {data.shap_data && data.prediction_prob && (
          <ShapSummaryText predictionProb={data.prediction_prob} shapData={data.shap_data} />
        )}
      </div>
    </div>
  );
};

export default CdssResultModal;
