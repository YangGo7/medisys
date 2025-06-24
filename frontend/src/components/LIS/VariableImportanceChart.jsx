// src/components/VariableImportanceChart.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';

const VariableImportanceChart = () => {
  const [importanceData, setImportanceData] = useState([]);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_BASE_URL}cdss/lft/importance/`)
      .then(res => setImportanceData(res.data))
      .catch(err => console.error("📉 변수 중요도 로딩 실패:", err));
  }, []);

  if (!importanceData || importanceData.length === 0) return null;

  const labels = importanceData.map(d => d.feature);
  const values = importanceData.map(d => d.importance);
  const colors = values.map(v => v >= 0 ? '#EF4444' : '#10B981');

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '1rem',
      padding: '1.5rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      marginTop: '2rem'
    }}>
      <h2 style={{ fontWeight: '600', marginBottom: '1rem' }}>📌 변수 중요도 (로지스틱 회귀 기준)</h2>
      <Bar
        data={{
          labels,
          datasets: [{
            label: '중요도',
            data: values,
            backgroundColor: colors,
          }]
        }}
        options={{
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `중요도: ${ctx.parsed.y.toFixed(4)}`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: false,
              title: { display: true, text: '계수값 (positive = 이상 관련)' }
            },
            x: {
              ticks: { autoSkip: false },
              title: { display: true, text: '검사 항목' }
            }
          }
        }}
      />
    </div>
  );
};

export default VariableImportanceChart;
