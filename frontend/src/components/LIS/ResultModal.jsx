// LIS/ResultModal.jsx

import React from 'react';
import './ResultModal.css';
import axios from 'axios';
import ShapContributionChart from './ShapContributionChart'; // 실제 쓰는 것만 유지
import ShapSummaryText from './ShapSummaryText';

// ✅ API 호출 함수 (유지)
const runFullCdssAnalysis = async (sampleId, testType, components) => {
  try {
    const response = await axios.post(
      `${process.env.REACT_APP_API_BASE_URL}cdss/receive_full_sample/`,
      {
        sample: sampleId,
        test_type: testType,
        components: components
      }
    );
    console.log("📦 분석 결과:", response.data);
    return response.data;
  } catch (err) {
    console.error("❌ 분석 요청 실패:", err);
    return null;
  }
};

const CdssResultModal = ({ data, onClose }) => {
  if (!data) return null;

  console.log("📦 SHAP 데이터 확인:", data.shap_data);

  const uniqueResults = [...new Map(data.results.map(item => [item.component_name, item])).values()];

  const interpretPrediction = (value) => {
    if (value === 1 || value === true || value === "1") return '🔴 이상 소견';
    if (value === 0 || value === false || value === "0") return '🟢 정상';
    return value || '예측값 없음';
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>✖</button>

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

        {/* 🔽 SHAP 기여도 시각화 */}
        {data.shap_data && <ShapContributionChart shapData={data.shap_data} />}
        {data.shap_data && data.prediction_prob && (
          <ShapSummaryText predictionProb={data.prediction_prob} shapData={data.shap_data} />
        )}
      </div>
    </div>
  );
};

export default CdssResultModal;
