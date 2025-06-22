import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useEffect, useState } from 'react';

const CdssResultDetailPage = () => {
  const { sampleId } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_BASE_URL}cdss/predict/${sampleId}`)
      .then(res => setData(res.data))
      .catch(err => console.error("분석 결과 로딩 실패:", err));
  }, [sampleId]);

  if (!data) return <p>⏳ 분석 결과 불러오는 중...</p>;

  return (
    <div className="p-4">
      <h2>Sample {data.sample} 분석 결과</h2>
      <p><strong>검사 타입:</strong> {data.test_type}</p>
      <p><strong>AI 예측:</strong> {data.prediction}</p>
      <hr />

      <table className="table">
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

      {/* 🔽 이후에 그래프, SHAP 그림 등 추가 가능 */}
    </div>
  );
};

export default CdssResultDetailPage;
