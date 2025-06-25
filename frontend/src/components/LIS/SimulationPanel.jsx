import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './SimulationPanel.css';

const SimulationPanel = ({ sampleId, testType, initialValues, statMax  }) => {
  const [formValues, setFormValues] = useState(initialValues || {});
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const prevInitialJson = useRef("");

  useEffect(() => {
    const currentJson = JSON.stringify(initialValues);
    if (currentJson !== prevInitialJson.current) {
      setFormValues(initialValues);
      prevInitialJson.current = currentJson;
    }
  }, [initialValues]);

  const handleChange = (key, newValue) => {
    setFormValues(prev => ({ ...prev, [key]: newValue }));
  };

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const components = Object.entries(formValues)
        .filter(([_, value]) => value !== null && value !== undefined && !isNaN(value))
        .map(([name, value]) => ({
        component_name: name,
        value: value.toString(),
      }));

      const payload = {
        sample: sampleId,
        test_type: testType,
        components,
      };

      console.log("🚀 시뮬레이션 전송 데이터", payload);

      const res = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}cdss/receive_full_sample/`,
        payload
      );

      setPrediction(res.data.prediction_prob);
    } catch (err) {
      console.error('❌ 시뮬레이션 요청 실패:', err);
    } finally {
      setLoading(false);
    }
  };
  if (!initialValues || Object.keys(initialValues).length === 0) {
    return <p>🔧 시뮬레이션 패널 준비 중입니다.</p>;
  }

  return (
    <div className="space-y-4">
      {Object.entries(formValues).map(([key, value]) => (
        <div key={key}>
          <label className="block font-medium">{key}: {value}</label>
          <input
            type="range"
            min={0}
            max={statMax[key] || 100}
            step={0.1}
            value={value}
            onChange={(e) => handleChange(key, parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      ))}

      <button
        onClick={handleSimulate}
        disabled={loading}
        className="px-4 py-2 mt-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        🔁 확률 변화 예측하기
      </button>

      {prediction !== null && (
        <div className="prediction-box">
          <p className={`prediction-text ${prediction >= 0.5 ? 'probability-high' : 'probability-low'}`}>
            예측 확률: {(prediction * 100).toFixed(2)}%
          </p>

          <p className="probability-explanation">
            현재 입력된 검사 결과를 바탕으로 AI 모델은 이 샘플이{" "}
            <strong className={prediction >= 0.5 ? 'probability-high' : 'probability-low'}>
              {prediction >= 0.5 ? "이상 소견일 확률이 높다" : "정상일 가능성이 높다"}
            </strong>
            고 예측했습니다.
          </p>

          <p className="warning-text">
            ⚠️ 이 확률은 검사 수치만을 기반으로 계산되며, 실제 진단은 의료진의 종합적인 판단을 따라야 합니다.
          </p>
        </div>
      )}
    </div>
  );
};

export default SimulationPanel;
