import React from 'react';

const ShapForcePlot = ({ html }) => {
  if (!html) {
    return (
      <div className="bg-gray-100 p-4 rounded shadow border text-center">
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded shadow border">
      <h3 className="font-bold mb-2 text-lg">SHAP 기여도 (원본 기준)</h3>
      <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
};

export default ShapForcePlot;
