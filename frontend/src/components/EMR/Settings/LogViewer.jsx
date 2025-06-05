import React, { useState } from 'react';

const dummyLogs = [
  { id: 1, type: 'AI 분석', status: '성공', detail: '모델: YOLOv5, 정확도: 93%' },
  { id: 2, type: '영상 요청', status: '실패', detail: 'PACS 서버 연결 오류' },
  { id: 3, type: '처방 요청', status: '성공', detail: '처방전 3건 생성됨' },
];

const LogViewer = () => {
  const [showTable, setShowTable] = useState(false);

  return (
    <section style={{ marginBottom: '2rem' }}>
      <h3>◉ 요청 로그 확인</h3>
      <button onClick={() => setShowTable((prev) => !prev)} style={btnStyle}>
        {showTable ? '닫기' : '로그 테이블 보기'}
      </button>

      {showTable && (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={cellStyle}>ID</th>
              <th style={cellStyle}>요청 종류</th>
              <th style={cellStyle}>상태</th>
              <th style={cellStyle}>상세</th>
            </tr>
          </thead>
          <tbody>
            {dummyLogs.map((log) => (
              <tr key={log.id} style={{ backgroundColor: log.status === '실패' ? '#ffe6e6' : 'inherit' }}>
                <td style={cellStyle}>{log.id}</td>
                <td style={cellStyle}>{log.type}</td>
                <td style={cellStyle}>{log.status}</td>
                <td style={cellStyle}>
                  <button onClick={() => alert(log.detail)} style={smallBtnStyle}>
                    보기
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};

const btnStyle = {
  marginTop: '0.5rem',
  padding: '6px 12px',
  borderRadius: '5px',
  border: 'none',
  backgroundColor: '#f2f2f2',
  cursor: 'pointer',
};

const smallBtnStyle = {
  padding: '4px 8px',
  fontSize: '0.85rem',
  border: '1px solid #ccc',
  backgroundColor: '#fff',
  cursor: 'pointer',
};

const tableStyle = {
  width: '100%',
  marginTop: '1rem',
  borderCollapse: 'collapse',
};

const cellStyle = {
  border: '1px solid #ccc',
  padding: '8px',
  textAlign: 'center',
};

export default LogViewer;
