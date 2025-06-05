import React, { useEffect, useState } from 'react';
import axios from 'axios';

const CdssResultTable = () => {
  const [cdssResults, setCdssResults] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_BASE_URL}cdss/results/`)
      .then((res) => {
        setCdssResults(res.data);
      })
      .catch((err) => {
        console.error('CDSS 결과 불러오기 실패:', err);
        setError('결과를 불러오는 데 실패했습니다.');
      });
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">📊 CDSS 검사 결과</h2>
      {error && <p className="text-red-500">{error}</p>}
      <div className="overflow-x-auto">
        <table className="table-auto w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border px-4 py-2">Sample ID</th>
              <th className="border px-4 py-2">Test Type</th>
              <th className="border px-4 py-2">Component</th>
              <th className="border px-4 py-2">Value</th>
              <th className="border px-4 py-2">Unit</th>
              <th className="border px-4 py-2">Verified By</th>
              <th className="border px-4 py-2">Verified Date</th>
            </tr>
          </thead>
          <tbody>
            {cdssResults.map((result, index) => (
              <tr key={index} className="text-center">
                <td className="border px-4 py-2">{result.sample_id}</td>
                <td className="border px-4 py-2">{result.test_type}</td>
                <td className="border px-4 py-2">{result.component_name}</td>
                <td className="border px-4 py-2">{result.value}</td>
                <td className="border px-4 py-2">{result.unit}</td>
                <td className="border px-4 py-2">{result.verified_by}</td>
                <td className="border px-4 py-2">{new Date(result.verified_date).toLocaleString()}</td>
              </tr>
            ))}
            {cdssResults.length === 0 && (
              <tr>
                <td colSpan="7" className="text-gray-500 py-4">저장된 결과가 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CdssResultTable;
