// src/components/EMR/LisRequestPanel.jsx

import React, { useState } from 'react';
import axios from 'axios';
import { panelComponents, LIS_API } from './lisConfig';

const LisRequestPanel = ({ patient }) => {
  const [selectedPanel, setSelectedPanel] = useState('');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);

  const handleSubmit = async () => {
    if (!selectedPanel || !patient) return;
    setLoading(true);
    setError(null);

    try {
      // 선택한 패널의 전체 검사 항목을 요청 페이로드에 담아서 POST
      const payload = {
        patientId: patient.uuid || patient.id,
        panel:     selectedPanel,
        tests:     panelComponents[selectedPanel],
      };
      await axios.post(LIS_API.CREATE, payload);
      alert('검사 요청이 성공적으로 등록되었습니다.');
    } catch (err) {
      console.error(err);
      setError('검사 요청에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lis-request-panel" style={{ padding: 12 }}>
      {!patient ? (
        <p className="empty-text">환자를 선택해주세요.</p>
      ) : (
        <>
          <p>환자: <strong>{patient.name || patient.patient_name}</strong></p>

          {/* 1) 패널 선택 드롭다운 */}
          <div style={{ margin: '1rem 0' }}>
            <label>
              검사 패널:
              <select
                value={selectedPanel}
                onChange={e => setSelectedPanel(e.target.value)}
                style={{ marginLeft: 8 }}
              >
                <option value="">-- 선택 --</option>
                {Object.keys(panelComponents).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>

          {/* 2) 검사 요청 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={!selectedPanel || loading}
            style={{
              padding: '6px 12px',
              background: loading ? '#ccc' : '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '요청 중…' : '검사 요청'}
          </button>

          {/* 3) 에러 메시지 */}
          {error && (
            <p style={{ color: 'red', marginTop: '0.5rem' }}>{error}</p>
          )}
        </>
      )}
    </div>
  );
};

export default LisRequestPanel;