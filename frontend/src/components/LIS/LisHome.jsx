import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

const LisHome = () => {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ width: '200px', padding: '1rem', borderRight: '1px solid #ccc' }}>
        <h3>🧪 Lab Information System</h3>
        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
          <li><button onClick={() => navigate('/lis/order/new')}>📄 오더 생성하기</button></li>
          <li><button onClick={() => navigate('/lis/orders')}>📋 오더 목록 확인</button></li>
          <li><button onClick={() => navigate('/lis/sample/new')}>🧫 샘플 생성하기</button></li>
          <li><button onClick={() => navigate('/lis/samples')}>📂 샘플 목록 확인</button></li>
          <li><button onClick={() => navigate('/lis/result/new')}>🧾 결과 기록하기</button></li>
          <li><button onClick={() => navigate('/lis/result-list')}>📑 결과 목록 확인</button></li>
        </ul>
      </div>

      <div style={{ flex: 1, padding: '1rem' }}>
        <Outlet /> {/* 이 영역이 페이지별로 바뀜 */}
      </div>
    </div>
  );
};

export default LisHome;
