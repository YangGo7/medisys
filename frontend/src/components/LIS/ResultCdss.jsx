import React, { useEffect, useState } from 'react';
import axios from 'axios';

const CdssResultTable = () => {
  const [filteredResults, setFilteredResults] = useState([]);
  const [sampleOptions, setSampleOptions] = useState([]);
  const [selectedSampleId, setSelectedSampleId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_BASE_URL}cdss/results/`)
      .then((res) => {
        const dateFiltered = res.data.filter(r => r.verified_date?.slice(0, 10) === selectedDate);

        // 초기 상태
        setFilteredResults(dateFiltered);
        const uniqueIds = [...new Set(dateFiltered.map(r => r.sample_id))];
        setSampleOptions(uniqueIds);
        setSelectedSampleId(''); // 날짜 바뀌면 샘플 필터 초기화
      })
      .catch((err) => {
        console.error('CDSS 결과 불러오기 실패:', err);

        if (err.response) {
          console.log("서버 응답 내용:", err.response.data);  // 🔍 서버에서 전달된 상세 오류 메시지
        }
        setError('결과를 불러오는 데 실패했습니다.');
      });
  }, [selectedDate]);

  useEffect(() => {
    if (selectedSampleId !== '') {
      setFilteredResults(prev => prev.filter(r => r.sample_id.toString() === selectedSampleId));
    }
  }, [selectedSampleId]);

  const handleDeleteResult = async (sampleId) => {
    if (!window.confirm(`샘플 ID ${sampleId}의 결과를 삭제하시겠습니까?`)) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}cdss/delete/${sampleId}`);
      alert('✅ 결과가 삭제되었습니다.');
      // 상태 업데이트 (삭제 후 새로 불러오기)
      setFilteredResults(prev => prev.filter(r => r.sample_id !== sampleId));
      setSampleOptions(prev => prev.filter(id => id !== sampleId));
    } catch (error) {
      console.error('❌ 삭제 실패:', error);
      alert('결과 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="relative p-6">
      <h2 className="text-2xl font-bold mb-4">📊 CDSS 검사 결과</h2>
      {error && <p className="text-red-500">{error}</p>}

      <div className="absolute top-5 right-5">
        <label className="mr-2">날짜 선택:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border rounded px-2 py-1"
        />
      </div>
      <div className="mb-4">
        <label className="mr-2 font-semibold">🔍 Sample ID 검색:</label>
        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="샘플 ID 입력"
          className="border px-2 py-1 rounded"
        />
      </div>
      <div className="mb-4">
        <label className="mr-2 font-semibold">🔍 Sample ID 선택:</label>
        <select
          value={selectedSampleId}
          onChange={(e) => setSelectedSampleId(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="">전체 보기</option>
          {sampleOptions.map(id => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto overflow-y-auto h-[400px]">
        <table className="table-fixed w-full border-collapse border border-gray-300">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="bg-gray-200">
              <th className="border px-4 py-2">Sample ID</th>
              <th className="border px-4 py-2">Test Type</th>
              <th className="border px-4 py-2">Component</th>
              <th className="border px-4 py-2">Value</th>
              <th className="border px-4 py-2">Unit</th>
              <th className="border px-4 py-2">Verified By</th>
              <th className="border px-4 py-2">Verified Date</th>
              <th className="border px-4 py-2">삭제</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.length > 0 ? (
              filteredResults.map((result, index) => (
              <tr key={index} className="text-center">
                <td className="border px-4 py-2">{result.sample_id}</td>
                <td className="border px-4 py-2">{result.test_type}</td>
                <td className="border px-4 py-2">{result.component_name}</td>
                <td className="border px-4 py-2">{result.value}</td>
                <td className="border px-4 py-2">{result.unit}</td>
                <td className="border px-4 py-2">{result.verified_by}</td>
                <td className="border px-4 py-2">{new Date(result.verified_date).toLocaleString()}</td>
                <td className="border px-4 py-2">
                  <button onClick={() => handleDeleteResult(result.sample_id)}
                    className="text-red-600 hover:underline">삭제</button>
                </td>
              </tr>
            ))
            ) : (
              <tr>
                <td colSpan="8" className="text-gray-500 py-4 text-center">해당 샘플 ID에 대한 결과가 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CdssResultTable;
