// SampleImportanceChart.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';

const SampleImportanceChart = ({ sampleId }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sampleId) return;
    axios.get(`${process.env.REACT_APP_API_BASE_URL}cdss/lft/importance/sample/${sampleId}/`)
      .then(res => setData(res.data))
      .catch(err => setError('❌ 변수 기여도 데이터를 불러오지 못했습니다.'));
  }, [sampleId]);

  if (error) return <p className="text-red-500">{error}</p>;
  if (!data) return <p>📊 변수 기여도 불러오는 중...</p>;

  const barData = {
    labels: data.map(d => d.feature),
    datasets: [
      {
        label: '변수 기여도 (SHAP-like)',
        data: data.map(d => d.contribution),
        backgroundColor: data.map(d => d.contribution > 0 ? '#EF4444' : '#3B82F6')
      }
    ]
  };

  return (
    <div className="my-6">
      <h3 className="font-bold text-lg mb-2">🔍 샘플별 변수 중요도</h3>
      <Bar data={barData} options={{ plugins: { legend: { display: false } }, indexAxis: 'y' }} />
    </div>
  );
};

export default SampleImportanceChart;
