// LIS/ResultModal.jsx

import React from 'react';
import './ResultModal.css'; // 팝업 스타일은 따로 작성

const CdssResultModal = ({ data, onClose }) => {
  if (!data) return null;

  // ✅ 중복 제거
  const uniqueResults = [...new Map(data.results.map(item => [item.component_name, item])).values()];

  // ✅ 예측 결과 해석 함수
  const interpretPrediction = (value) => {
    if (value === 1 || value === true) return '🔴 이상 소견';
    if (value === 0 || value === false) return '🟢 정상';
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

        {/* 🔽 이후 추가 영역: 그래프, shap 등 */}
        {/* <div className="chart-section">BarChart 삽입</div> */}
        {/* <img src={`data:image/png;base64,${data.shap_image}`} /> */}
        {data.shap_image_url && (
          <div style={{ marginTop: '1rem' }}>
            <h3 className="text-lg font-semibold">🧠 AI 설명 (SHAP)</h3>
            <img
              src={data.shap_image_url}
              alt="SHAP 설명 이미지"
              className="rounded-lg border mt-2"
              style={{ width: '100%', maxWidth: '500px' }}
            />
          </div>
        )}
        {!data.shap_image_url && (
          <div style={{ marginTop: '1rem', fontStyle: 'italic', color: '#777' }}>
            🔕 SHAP 설명 이미지 없음
          </div>
        )}
      </div>
    </div>
  );
};

export default CdssResultModal;
