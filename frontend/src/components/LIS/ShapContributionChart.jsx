// ✅ ShapContributionChart.jsx 리팩토링 (통일된 보라/푸른 테마 + svg + 가독성 향상)

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import './ShapContributionChart.css';

const ShapContributionChart = ({ shapData }) => {
  const chartRef = useRef(null);

  const baseOption = {
    color: ['#A78BFA'],
    textStyle: {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: 13,
      color: '#1f2937'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#fff',
      borderColor: '#e5e7eb',
      textStyle: { color: '#1f2937' },
      formatter: ({ 0: item }) => `기여도: ${item.data.value.toFixed(4)}`
    },
    grid: { top: 40, bottom: 40, left: 80, right: 30 }
  };

  useEffect(() => {
    if (!shapData || !shapData.features || !shapData.shap_values || !chartRef.current) return;

    const chartData = shapData.features.map((feature, i) => ({
      name: feature,
      value: shapData.shap_values[i],
    })).filter(d => Math.abs(d.value) > 1e-6);

    if (chartData.length === 0) return;

    const chart = echarts.init(chartRef.current, null, { renderer: 'svg' });

    chart.setOption({
      ...baseOption,
      title: {
        text: '📊 변수별 예측 기여도 (SHAP)',
        left: 'center',
        textStyle: { fontSize: 16 }
      },
      xAxis: {
        type: 'value',
        name: '기여도'
      },
      yAxis: {
        type: 'category',
        data: chartData.map(d => d.name),
        inverse: true
      },
      series: [
        {
          type: 'bar',
          data: chartData,
          itemStyle: {
            color: (params) => params.data.value >= 0 ? '#60A5FA' : '#A5B4FC'
          },
          label: {
            show: true,
            position: 'right',
            formatter: val => val.value.toFixed(3)
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0,0,0,0.15)'
            }
          }
        }
      ]
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [shapData]);

  if (!shapData || !shapData.shap_values?.length) {
    return <p className="shap-empty">📭 SHAP 데이터가 없습니다.</p>;
  }

  return (
    <div className="shap-contribution-chart">
      <div ref={chartRef} className="echart-container" />
    </div>
  );
};

export default ShapContributionChart;

