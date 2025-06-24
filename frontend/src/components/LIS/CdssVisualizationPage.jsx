// CdssVisualizationPage.jsx (업데이트된 전체 코드)

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import SimulationPanel from './SimulationPanel';
import ShapContributionChart from './ShapContributionChart';
import ShapSummaryText from './ShapSummaryText';

const CdssVisualizationPage = () => {
  const { sampleId } = useParams();
  const navigate = useNavigate();
  const [sampleData, setSampleData] = useState(null);
  const [sampleList, setSampleList] = useState([]);
  const [loading, setLoading] = useState(true);

  // 샘플 목록 전체 불러오기 (ID만)
  useEffect(() => {
    const fetchList = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}cdss/results/`);
        const ids = [...new Set(res.data.map(r => r.sample))];
        setSampleList(ids);
      } catch (err) {
        console.error("❌ 샘플 목록 불러오기 실패:", err);
      }
    };
    fetchList();
  }, []);

  // 선택된 샘플 ID가 있을 경우 해당 데이터 불러오기
  useEffect(() => {
    if (!sampleId) return;
    const fetchData = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}cdss/results/${sampleId}/`);
        setSampleData(res.data);
      } catch (err) {
        console.error('❌ 샘플 데이터 불러오기 실패:', err);
        if (err.response?.data) {
          console.error('💡 서버 응답:', err.response.data);
        }
        setSampleData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [sampleId]);

  if (!sampleId) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">📋 CDSS 시각화</h2>
        <p>샘플을 선택하세요:</p>
        <select onChange={(e) => navigate(`/lis/cdss/results/${e.target.value}`)}>
          <option value="">-- 샘플 선택 --</option>
          {sampleList.map(id => (
            <option key={id} value={id}>Sample {id}</option>
          ))}
        </select>
      </div>
    );
  }

  if (loading) return <p className="p-4">⏳ 데이터 불러오는 중...</p>;
  if (!sampleData) return <p className="p-4">❌ 샘플 데이터를 찾을 수 없습니다.</p>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">🧬 CDSS 시각화 분석 – Sample {sampleId}</h2>

      {/* ✅ 예측 결과 */}
      <div className="mb-4 text-lg">
        🔍 AI 예측 결과:
        <span style={{ fontWeight: 'bold', color: sampleData.prediction === '1' ? 'red' : 'green' }}>
          {sampleData.prediction === '1' ? ' 이상 소견' : ' 정상'}
        </span>
        {sampleData.prediction_prob && (
          <span style={{ marginLeft: '0.5rem', fontSize: '0.95rem', color: '#555' }}>
            ({(sampleData.prediction_prob * 100).toFixed(1)}%)
          </span>
        )}
      </div>

      {/* ✅ 확률 변화 시뮬레이션 */}
      <div className="mt-6 border-t pt-6">
        <h3 className="text-lg font-semibold mb-2">🎛 확률 변화 시뮬레이션</h3>
        <SimulationPanel
          sampleId={sampleId}
          testType={sampleData.test_type}
          initialValues={Object.fromEntries(
            sampleData.results.map(r => [r.component_name, parseFloat(r.value)])
          )}
        />
      </div>

      {/* ✅ SHAP 변수 기여도 */}
      <div className="mt-10 border-t pt-6">
        <ShapSummaryText
          predictionProb={sampleData.prediction_prob}
          shapData={sampleData.shap_data}
        />
        <ShapContributionChart shapData={sampleData.shap_data} />
      </div>
    </div>
  );
};

export default CdssVisualizationPage;
