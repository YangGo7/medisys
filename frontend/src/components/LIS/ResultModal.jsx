import React from 'react';
import './ResultModal.css'; // 팝업 스타일은 따로 작성

const CdssResultModal = ({ data, onClose }) => {
  if (!data) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>✖</button>

        <h2>🧪 Sample {data.sample} 분석 결과</h2>
        <p><strong>검사 종류:</strong> {data.test_type}</p>
        <p><strong>🔍 AI 예측 결과:</strong> <span className="prediction-text">{data.prediction}</span></p>

        <hr />
        <table className="result-table">
          <thead>
            <tr><th>항목</th><th>값</th><th>단위</th></tr>
          </thead>
          <tbody>
            {data.results.map((r, i) => (
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

      </div>
    </div>
  );
};

export default CdssResultModal;
