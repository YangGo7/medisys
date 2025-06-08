import React, { useState } from 'react';
import OrderForm from './OrderForm';
import OrderListPage from './OrderListPage';
import SampleForm from './SampleForm';
import SampleListPage from './SampleListPage';
import ResultInputForm from './ResultInputForm';
import ResultCdss from './ResultCdss';

const LisHome = () => {
  const [selectedMenu, setSelectedMenu] = useState('');

  const renderContent = () => {
    switch (selectedMenu) {
      case 'order-new':
        return <OrderForm />;
      case 'order-list':
        return <OrderListPage />;
      case 'sample-new':
        return <SampleForm />;
      case 'sample-list':
        return <SampleListPage />;
      case 'result-new':
        return <ResultInputForm />;
      case 'result-list' :
        return <ResultCdss/>;
      default:
        return <p/>;
    }
  };

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ width: '200px', padding: '1rem', borderRight: '1px solid #ccc' }}>
        <h3>🧪 Lab Information System</h3>
        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
          <li><button onClick={() => setSelectedMenu('order-new')}>📄 오더 생성하기</button></li>
          <li><button onClick={() => setSelectedMenu('order-list')}>📋 오더 목록 확인</button></li>
          <li><button onClick={() => setSelectedMenu('sample-new')}>🧫 샘플 생성하기</button></li>
          <li><button onClick={() => setSelectedMenu('sample-list')}>📂 샘플 목록 확인</button></li>
          <li><button onClick={() => setSelectedMenu('result-new')}>🧾 결과 기록하기</button></li>
          <li><button onClick={() => setSelectedMenu('result-list')}>📑 결과 목록 확인</button></li>
        </ul>
      </div>
      <div style={{ flex: 1, padding: '1rem' }}>
        {renderContent()}
      </div>
    </div>
  );
};

export default LisHome;
