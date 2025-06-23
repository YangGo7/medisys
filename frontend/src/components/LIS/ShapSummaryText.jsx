import React from 'react';

const ShapSummaryText = ({ predictionProb, shapData }) => {
  if (!shapData || !shapData.features || !shapData.shap_values) return null;

  const topK = 3; // 상위 3개 변수만
  const contributions = shapData.features.map((feature, i) => ({
    name: feature,
    value: shapData.shap_values[i]
  }));

  const sorted = contributions
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, topK);

  return (
    <div style={{ marginTop: '1rem' }}>
      <h3 className="text-md font-semibold mb-1">📝 주요 기여 변수 요약</h3>
      <p style={{ marginBottom: '0.5rem' }}>
        🔍 이상 소견 확률: {Math.round(predictionProb * 100)}%
      </p>
      {sorted.map((item, i) => (
        <p key={i}>
          → {item.name} ({item.value >= 0 ? '+' : ''}{(item.value * 100).toFixed(1)}%)
        </p>
      ))}
    </div>
  );
};

export default ShapSummaryText;
