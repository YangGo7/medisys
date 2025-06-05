import React, { useEffect, useState } from 'react';
import axios from 'axios';

const SampleListPage = () => {
  const [samples, setSamples] = useState([]);
  const [sending, setSending] = useState(null);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_BASE_URL}samples/`)
      .then(res => setSamples(res.data))
      .catch(err => console.error('샘플 목록 불러오기 실패:', err));
  }, []);

  const sendToCDSS = async (sample) => {
    setSending(sample.id);
    try {
      const payload = {
        sample_id: sample.id,
        test_type: sample.test_type,
        component_name: sample.test_type, // 기본값으로 넣되, 실제 구성 요소가 있다면 수정
        value: "N/A",                     // 초기엔 수동 입력 불가하므로 기본값
        unit: "N/A",                      // 필요 시 선택 가능
        verified_by: 0,                  // 로그인 사용자 ID가 있다면 대체
        verified_date: new Date().toISOString()
      };

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}cdss/receive/`, payload,
        { headers: { 'Content-Type': 'application/json' } }
      );

      alert(`✅ CDSS 전송 완료 (샘플 ID: ${sample.id})`);
    } catch (error) {
      console.error('❌ CDSS 전송 실패:', error);
      alert(`CDSS 전송 실패: ${error.response?.data?.message || '오류 발생'}`);
    } finally {
      setSending(null);
    }
  };

  return (
    <div>
      <h2>🧪 샘플 목록</h2>
      <table border="1">
        <thead>
          <tr>
            <th>샘플 ID</th>
            <th>오더 ID</th>
            <th>검체 종류</th>
            <th>검사 항목</th>
            <th>LOINC 코드</th>
            <th>채취일시</th>
            <th>상태</th>
            <th>CDSS 전송</th>
          </tr>
        </thead>
        <tbody>
          {samples.map(sample => (
            <tr key={sample.id}>
              <td>{sample.id}</td>
              <td>{sample.order}</td>
              <td>{sample.sample_type}</td>
              <td>{sample.test_type}</td>
              <td>{sample.loinc_code}</td>
              <td>{sample.collection_date}</td>
              <td>{sample.sample_status}</td>
              <td>
                <button
                  onClick={() => sendToCDSS(sample)}
                  disabled={sending === sample.id}
                >
                  {sending === sample.id ? '전송 중...' : 'CDSS 전송'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SampleListPage;
