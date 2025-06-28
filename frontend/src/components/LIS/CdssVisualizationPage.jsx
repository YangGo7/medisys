import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
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

    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}건 ({d}%)'
      },
      legend: {
        top: 'bottom'
      },
      series: [
        {
          name: '예측 분포',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          label: {
            show: true,
            position: 'outside',
            fontSize: 14
          },
          emphasis: {
            scale: true,
            scaleSize: 12
          },
          labelLine: {
            show: true
          },
          data: [
            { value: stats.normal, name: '정상', itemStyle: { color: '#10B981' } },
            { value: stats.abnormal, name: '이상', itemStyle: { color: '#EF4444' } }
          ]
        }
      ]
    };

    return <ReactECharts option={option} style={{ height: 360 }} />;
  };

  return (
    <div className="cdss-page">
      <h1>🧾 검사 결과 시각화</h1>

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
              <ShapContributionChart shapValues={sampleDetail.shap_data} />
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
            <div>🚧 라인 차트(ECharts) 변환 예정</div>
          </div>

          <div className="cdss-chart-full">
            🚧 바 차트(ECharts) 변환 예정
          </div>

          <VariableImportanceChart />
        </div>

      </div>
    </div>
  );
};

export default CdssVisualizationPage;
