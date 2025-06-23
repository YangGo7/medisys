// SimulationPanel.jsx (슬라이더 시뮬레이션 기능 포함)

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SimulationPanel = ({ sampleId, testType, initialValues }) => {
  const [formValues, setFormValues] = useState(initialValues);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormValues(initialValues);
  }, [initialValues]);

  const handleChange = (key, newValue) => {
    setFormValues(prev => ({ ...prev, [key]: newValue }));
  };

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const components = Object.entries(formValues).map(([name, value]) => ({
        component_name: name,
        value: value.toString(),
      }));

      const res = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}cdss/receive_full_sample/`,
        {
          sample: sampleId,
          test_type: testType,
          components,
        }
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
            max={500}
            step={1}
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
        <div className="mt-4 text-lg">
          예측 확률: <strong>{(prediction * 100).toFixed(2)}%</strong>
        </div>
      )}
    </div>
  );
};

export default SimulationPanel;
