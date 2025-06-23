import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const ShapContributionChart = ({ shapData }) => {
  if (!shapData || !shapData.features || !shapData.shap_values) {
    return <p>📭 SHAP 데이터가 없습니다.</p>;
  }

  // 데이터 준비 + 의미 없는 0 값 필터링
  const chartData = shapData.features
    .map((feature, i) => ({
      name: feature,
      value: shapData.shap_values[i],
    }))
    .filter(item => Math.abs(item.value) > 1e-6);

  if (chartData.length === 0) {
    return <p style={{ fontStyle: 'italic', color: '#777' }}>📭 이 샘플에서는 예측에 뚜렷한 변수 기여가 감지되지 않았습니다.</p>;
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <h3 className="text-lg font-semibold mb-2">📊 변수별 예측 기여도 (SHAP)</h3>
      <ResponsiveContainer>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
        >
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" width={100} />
          <Tooltip formatter={(value) => value.toFixed(4)} />
          <Bar dataKey="value">
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.value >= 0 ? '#ff6b6b' : '#57a0ff'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ShapContributionChart;
