// components/CDSS/SampleImportanceChart.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';

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

  const option = {
    title: {
      text: `🧬 변수별 기여도 분석 (Sample ${sampleId})`,
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params) => {
        const val = params[0].value;
        return `기여도: ${val.toFixed(4)}`;
      }
    },
    grid: {
      left: '10%',
      right: '10%',
      bottom: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '기여도 크기',
      axisLabel: { formatter: '{value}' }
    },
    yAxis: {
      type: 'category',
      data: data.features,
      axisLabel: {
        fontSize: 12
      }
    },
    series: [
      {
        name: '기여도',
        type: 'bar',
        data: data.contributions,
        itemStyle: {
          color: (params) =>
            params.value > 0 ? '#EF4444' : '#3B82F6' // 빨강 vs 파랑
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          }
        }
      }
    ]
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <ReactECharts option={option} style={{ height: `${data.features.length * 40}px` }} />
    </div>
  );
};

export default SampleImportanceChart;
