// components/CDSS/SampleImportanceChart.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import axios from 'axios';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const SampleImportanceChart = () => {
  const { sampleId } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchContributions = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}cdss/lft/importance/sample/${sampleId}/`
        );
        setData(res.data);
      } catch (err) {
        console.error("❌ 기여도 데이터 불러오기 실패", err);
      }
    };
    fetchContributions();
  }, [sampleId]);

  if (!data) return <p>📊 기여도 데이터를 불러오는 중입니다...</p>;

  const chartData = {
    labels: data.features,
    datasets: [
      {
        label: '기여도 (양수: 위험 ↑ / 음수: 위험 ↓)',
        data: data.contributions,
        backgroundColor: data.contributions.map(val =>
          val > 0 ? 'rgba(255, 99, 132, 0.6)' : 'rgba(54, 162, 235, 0.6)'
        ),
        borderColor: data.contributions.map(val =>
          val > 0 ? 'rgba(255, 99, 132, 1)' : 'rgba(54, 162, 235, 1)'
        ),
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    indexAxis: 'y', // 👉 수평 막대 차트
    scales: {
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: '기여도 크기',
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: context => `기여도: ${context.raw.toFixed(4)}`
        }
      }
    },
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <h3>🧬 변수별 기여도 분석 (Sample {sampleId})</h3>
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
};

export default SampleImportanceChart;
