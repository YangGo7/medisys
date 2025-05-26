import React from 'react';
import { Link } from 'react-router-dom';

const LisHome = () => {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>💉 Lab Information System</h1>
      <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
        <li>
          <Link to="/order/new">📝 오더 생성하기</Link>
        </li>
        <li>
          <Link to="/orders">📋 오더 목록 확인</Link>
        </li>
        <li>
          <Link to="/sample/new">💉 샘플 생성하기</Link>
        </li>
        <li>
          <Link to="/samples">🧪 샘플 목록 확인</Link>
        </li>
      </ul>
    </div>
  );
};

export default LisHome;
