// src/pages/LftStatsPage.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import 'chart.js/auto';

const LftStatsPage = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_BASE_URL}cdss/lft/stats/`)
      .then(res => setStats(res.data))
      .catch(err => console.error('📉 통계 데이터 로딩 실패:', err));
  }, []);

  if (!stats) return <p>📊 데이터를 불러오는 중...</p>;

  const donutData = {
    labels: ['정상', '이상'],
    datasets: [{
      data: [stats.normal, stats.abnormal],
      backgroundColor: ['#10B981', '#EF4444']
    }]
  };

  const barData = {
    labels: Object.keys(stats.mean_values),
    datasets: [
      {
        label: '정상 평균',
        data: Object.values(stats.mean_values).map(v => v.normal),
        backgroundColor: '#3B82F6'
      },
      {
        label: '이상 평균',
        data: Object.values(stats.mean_values).map(v => v.abnormal),
        backgroundColor: '#F59E0B'
      }
    ]
  };

  const lineData = {
    labels: stats.weekly_abnormal_trend.map(d => d.week),
    datasets: [{
      label: '주간 이상 건수',
      data: stats.weekly_abnormal_trend.map(d => d.abnormal_count),
      borderColor: '#6366F1',
      tension: 0.3,
      fill: false
    }]
  };

  return (
    <div className="p-6 space-y-12">

      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">📊 검사 결과 분포 (정상 vs 이상)</h2>
        <Doughnut data={donutData} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">📈 지표별 평균값 (정상 vs 이상)</h2>
        <Bar data={barData} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">📅 주간 이상 발생 추이</h2>
        <Line data={lineData} />
      </section>

    </div>
  );
};

export default LftStatsPage;
