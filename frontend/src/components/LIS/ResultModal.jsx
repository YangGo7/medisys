// LIS/ResultModal.jsx

import React from 'react';
import './ResultModal.css'; // 팝업 스타일은 따로 작성
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const ShapBarChart = ({ shapData }) => {
  if (!shapData || !shapData.features) return <p>SHAP 데이터 없음</p>;

  const data = shapData.features.map((feature, i) => ({
    name: feature,
    value: shapData.shap_values[i],
  }));

  return (
    <div style={{ width: '100%', height: 300 }}>
      <h3>📈 SHAP 영향도</h3>
      <ResponsiveContainer>
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(value) => value.toFixed(4)} />
          <Bar dataKey="value" >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#ff5e57' : '#57a0ff'} />
            ))}  
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const CdssResultModal = ({ data, onClose }) => {
  if (!data) return null;

  console.log("📦 SHAP 데이터 확인:", data.shap_data);

  // ✅ 중복 제거
  const uniqueResults = [...new Map(data.results.map(item => [item.component_name, item])).values()];

  // ✅ 예측 결과 해석 함수
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

        {/* 🔽 이후 추가 영역: 그래프, shap 등 */}
        {/* <div className="chart-section">BarChart 삽입</div> */}
        {/* <img src={`data:image/png;base64,${data.shap_image}`} /> */}
        {data.shap_data ? <ShapBarChart shapData={data.shap_data} /> : <p>SHAP 설명 없음</p>}
      </div>
    </div>
  );
};

export default CdssResultModal;
