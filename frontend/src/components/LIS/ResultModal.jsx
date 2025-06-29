// LIS/ResultModal.jsx

import React from 'react';
import './ResultModal.css';
import axios from 'axios';
import ShapContributionChart from './ShapContributionChart'; // 실제 쓰는 것만 유지
import ShapSummaryText from './ShapSummaryText';

// ✅ API 호출 함수 (유지)
const CdssResultModal = ({ data, onClose, isModal = true }) => {
  if (!data) return null;

  const uniqueResults = [...new Map(data.results.map(item => [item.component_name, item])).values()];

  const interpretPrediction = (value) => {
    const finalValue = value === null || value === undefined || value === '' ? 0 : value;
    if (finalValue === 1 || finalValue === true || finalValue === "1") return '🟢 정상';
    if (finalValue === 0 || finalValue === false || finalValue === "0") return '🔴 이상 소견';
    return String(finalValue);
  };

  return (
    <div className={isModal ? 'modal-overlay' : ''}>
      <div className={isModal ? 'modal-content' : 'inline-result-content'}>
        {isModal && (
          <button className="modal-close" onClick={onClose}>✖</button>
        )}

        <h2>🧪 Sample {data.sample} 분석 결과</h2>
        <p><strong>검사 종류:</strong> {data.test_type}</p>
        <p><strong>🔍 AI 예측 결과:</strong> <span className="prediction-text">{interpretPrediction(data.prediction)}</span></p>

        <hr />
        <table className="result-table">
          <thead>
            <tr><th>항목</th><th>값</th><th>단위</th></tr>
          </thead>
          <tbody>
            {uniqueResults.map((r, i) => (
              <tr key={i}>
                <td>{r.component_name}</td>
                <td>{r.value}</td>
                <td>{r.unit}</td>
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
