import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import 'chart.js/auto';

const CdssVisualizationPage = () => {
  const [sampleList, setSampleList] = useState([]);
  const [selectedSample, setSelectedSample] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_BASE_URL}cdss/results/`)
      .then(res => {
        const ids = [...new Set(res.data.map(r => r.sample))];
        setSampleList(ids);
      });

    axios.get(`${process.env.REACT_APP_API_BASE_URL}cdss/lft/stats/`)
      .then(res => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('📉 통계 데이터 로딩 실패:', err);
        setLoading(false);
      });
  }, []);

  const renderDonutChart = () => {
    if (!stats) return null;
    return (
      <Doughnut
        data={{
          labels: ['정상', '이상'],
          datasets: [{
            data: [stats.normal, stats.abnormal],
            backgroundColor: ['#10B981', '#EF4444'],
          }],
        }}
        options={{
          plugins: {
            legend: { position: 'top' },
          },
        }}
      />
    );
  };

  const renderBarChart = () => {
    if (!stats || !stats.mean_values) return null;
    const labels = Object.keys(stats.mean_values);
    const normalData = labels.map(l => stats.mean_values[l].normal);
    const abnormalData = labels.map(l => stats.mean_values[l].abnormal);

    return (
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: '정상 평균',
              data: normalData,
              backgroundColor: '#3B82F6',
            },
            {
              label: '이상 평균',
              data: abnormalData,
              backgroundColor: '#F59E0B',
            },
          ],
        }}
        options={{
          responsive: true,
          plugins: {
            legend: { position: 'top' },
          },
        }}
      />
    );
  };

  const renderLineChart = () => {
    if (!stats || !stats.weekly_abnormal_trend) return null;
    return (
      <Line
        data={{
          labels: stats.weekly_abnormal_trend.map(d => d.week),
          datasets: [
            {
              label: '주간 이상 건수',
              data: stats.weekly_abnormal_trend.map(d => d.abnormal_count),
              borderColor: '#6366F1',
              backgroundColor: 'rgba(99, 102, 241, 0.2)',
              fill: true,
            },
          ],
        }}
        options={{
          plugins: {
            legend: { position: 'top' },
          },
        }}
      />
    );
  };

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f9fafb' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1rem' }}>🧾 CDSS 시각화</h1>

      <label htmlFor="sample-select" style={{ display: 'block', marginBottom: '0.5rem' }}>샘플을 선택하세요:</label>
      <select
        id="sample-select"
        value={selectedSample}
        onChange={e => setSelectedSample(e.target.value)}
        style={{ padding: '0.5rem', marginBottom: '2rem', minWidth: '200px' }}
      >
        <option value=''>-- 샘플 선택 --</option>
        {sampleList.map(id => (
          <option key={id} value={id}>{id}</option>
        ))}
      </select>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* 왼쪽 카드: 샘플 결과 */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ marginBottom: '1rem' }}>🧬 샘플 결과 시각화</h2>
          {/* 샘플 선택 후 결과 표시 구성 예정 */}
          <p style={{ color: '#6b7280' }}>추후 구성 예정</p>
        </div>

        {/* 오른쪽 카드: 전체 검사 통계 */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ marginBottom: '1rem' }}>📊 전체 검사 통계</h2>
          {loading ? (
            <p>불러오는 중...</p>
          ) : stats ? (
            <>
              <h3 style={{ marginTop: '1rem' }}>🟢 검사 결과 분포 (정상 vs 이상)</h3>
              {renderDonutChart()}
              <h3 style={{ marginTop: '2rem' }}>📉 지표별 평균값 (정상 vs 이상)</h3>
              {renderBarChart()}
              <h3 style={{ marginTop: '2rem' }}>📅 주간 이상 발생 추이</h3>
              {renderLineChart()}
            </>
          ) : (
            <p>📉 통계 데이터를 불러오는 중이거나 존재하지 않습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CdssVisualizationPage;
