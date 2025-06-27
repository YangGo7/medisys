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
  console.log("✅ 전달된 data:", data);
  if (!data) return null;

  console.log("📦 SHAP 데이터 확인:", data.shap_data);
  console.log("📦 prediction 확인:", data.prediction); 

  const uniqueResults = [...new Map(data.results.map(item => [item.component_name, item])).values()];

  const interpretPrediction = (value) => {
    console.log("🔍 예측값 수신:", value);
    const finalValue = value === null || value === undefined || value === '' ? 0 : value;
    if (finalValue === 1 || finalValue === true || finalValue === "1") return '🔴 이상 소견';
    if (finalValue === 0 || finalValue === false || finalValue === "0") return '🟢 정상';
    return String(finalValue); // 혹시 숫자 외 다른 값이 들어올 경우 표시
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
            console.log("📊 렌더링할 결과 리스트:", uniqueResults);
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
