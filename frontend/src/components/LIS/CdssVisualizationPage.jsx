import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import 'chart.js/auto';
import './CdssVisualizationPage.css';
import ShapContributionChart from './ShapContributionChart';
import VariableImportanceChart from './VariableImportanceChart';
import SimulationPanel from './SimulationPanel';
import SampleImportanceChart from './SampleImportanceChart';

const CdssVisualizationPage = () => {
  const [sampleList, setSampleList] = useState([]);
  const [selectedSample, setSelectedSample] = useState('');
  const [stats, setStats] = useState(null);
  const [sampleDetail, setSampleDetail] = useState(null);
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

  useEffect(() => {
    if (selectedSample) {
      axios.get(`${process.env.REACT_APP_API_BASE_URL}cdss/results/${selectedSample}/`)
        .then(res => {
          setSampleDetail(res.data);
        })
        .catch(err => {
          console.error('❌ 샘플 예측 결과 불러오기 실패:', err);
          setSampleDetail(null);
        });
    } else {
      setSampleDetail(null);
    }
  }, [selectedSample]);

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
        options={{ plugins: { legend: { position: 'top' } }, maintainAspectRatio: false }}
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
            { label: '정상 평균', data: normalData, backgroundColor: '#3B82F6' },
            { label: '이상 평균', data: abnormalData, backgroundColor: '#F59E0B' },
          ],
        }}
        options={{ responsive: true, plugins: { legend: { position: 'top' } } }}
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
          responsive: true,
          maintainAspectRatio: false,
          elements: {
            point: {
              radius: 4
            },
            line: {
              borderWidth: 3
            }
          },
          plugins: {
            legend: { position: 'top' }
          }
        }}
      />
    );
  };

  return (
    <div className="cdss-page">
      <h1>🧾 CDSS 시각화</h1>

      <div className="cdss-sample-selector">
        <label htmlFor="sample-select" className="cdss-label">샘플을 선택하세요:</label>
        <select
          id="sample-select"
          value={selectedSample}
          onChange={e => setSelectedSample(e.target.value)}
        >
          <option value=''>-- 샘플 선택 --</option>
          {sampleList.map(id => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
      </div>

      <div className="cdss-grid">

        {/* 샘플 결과 카드 */}
        <div className="cdss-card">
          <h2>🧬 샘플 결과 ({selectedSample || '선택 안 됨'})</h2>
          {sampleDetail ? (
            <>
              <span>{sampleDetail?.prediction === 1 ? "🔴 이상 소견" : "🟢 정상 소견"}</span>
              <ShapContributionChart shapValues={sampleDetail.shap_values} />
              <SimulationPanel
                sampleId={selectedSample}
                testType={sampleDetail?.test_type}
                initialValues={
                  sampleDetail?.results
                    ? Object.fromEntries(sampleDetail.results.map(r => [r.component_name, parseFloat(r.value)]))
                    : {}
                }
                statMax={
                  stats?.mean_values
                    ? Object.fromEntries(
                        Object.entries(stats.mean_values).map(([k, v]) => [k, v.abnormal * 2 || 100])
                      )
                    : {}
                }
              />
              <SampleImportanceChart sampleId={selectedSample} />
            </>
          ) : (
            <p className="cdss-loading">예측 결과, 시뮬레이션 등 다양한 시각화 예정</p>
          )}
        </div>

        {/* 전체 시각화 카드 */}
        <div className="cdss-card">
          <h2>📊 전체 시각화</h2>
          <div className="cdss-chart-row">
            <div className="cdss-doughnut-wrapper">{renderDonutChart()}</div>
            <div>{renderLineChart()}</div>
          </div>

          <div className="cdss-chart-full">
            {renderBarChart()}
          </div>

          <VariableImportanceChart />
        </div>

      </div>
    </div>
  );
};

export default CdssVisualizationPage;
