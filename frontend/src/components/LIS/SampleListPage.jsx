import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL?.replace(/\/$/, '');

const SampleListPage = () => {
  const navigate = useNavigate();
  const [samples, setSamples] = useState([]);
  const [cdssSampleIds, setCdssSampleIds] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // 오늘 날짜

  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}samples/`);
        const sorted = res.data.sort((a, b) => new Date(b.collection_date) - new Date(a.collection_date));
        setSamples(sorted);
      } catch (err) {
        console.error('샘플 목록 불러오기 실패:', err);
      }
    };

    const fetchCdssResults = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/cdss/results/`);
        const ids = res.data.map(r => r.sample_id);
        setCdssSampleIds(ids);
      } catch (err) {
        console.error('CDSS 결과 불러오기 실패:', err);
      }
    };

    fetchSamples();
    fetchCdssResults();
  }, []);

  const handleDelete = async (sampleId) => {
    if (!window.confirm(`샘플 ID ${sampleId}을(를) 삭제하시겠습니까?`)) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}samples/delete/${sampleId}`);
      setSamples(prev => prev.filter(s => s.id !== sampleId));
      alert('샘플이 삭제되었습니다.');
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('샘플 삭제에 실패했습니다.');
    }
  };
  
  // [OCS] 추가된 handleResultClick 함수 
  const handleResultClick = async (sample) => {
    try {
      // 1. 오더 정보 조회
      const orderId = sample.order;
      const orderRes = await axios.get(`${process.env.REACT_APP_API_BASE_URL}orders/${orderId}/`);
      const orderInfo = orderRes.data;

      // 2. 로그 전송 payload 구성
      const payload = {
        patient_id: orderInfo.patient_id || 'UNKNOWN',
        doctor_id: orderInfo.doctor_id || 'UNKNOWN',
        order_id: sample.order,
        sample_id: sample.id,
        step: 'result',
        result_detail: `${sample.test_type || '기타'} 결과 등록`
      };

      console.log("보내는 로그:", payload); // 확인용
      await axios.post(`${process.env.REACT_APP_API_BASE_URL}logs/create/`, payload);
      console.log("✅ 로그 저장 성공");
    } catch (err) {
      console.error("❌ 로그 저장 실패:", err.response?.data || err.message);
    }

    navigate(`/result/new/${sample.id}`);
  };

 
  const filteredSamples = samples
    .filter(sample => sample.collection_date?.startsWith(selectedDate))
    .filter(sample => sample.id.toString().includes(searchKeyword));


  return (
    <div className="relative w-full min-h-screen p-6">
      <h2 className="text-2xl font-bold mb-4">🧪 샘플 목록</h2>
      <div className="absolute top-5 right-5 z-50 bg-white shadow-md p-2 rounded">
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
      <div className="overflow-x-auto overflow-y-auto h-[400px]">
        <table className="table-auto w-full border-collapse border border-gray-300">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="bg-gray-100">
              <th className="border px-4 py-2">샘플 ID</th>
              <th className="border px-4 py-2">오더 ID</th>
              <th className="border px-4 py-2">검체 종류</th>
              <th className="border px-4 py-2">검사 항목</th>
              <th className="border px-4 py-2">LOINC 코드</th>
              <th className="border px-4 py-2">채취일시</th>
              <th className="border px-4 py-2">상태</th>
              <th className="border px-4 py-2">결과 상태</th>
              <th className="border px-4 py-2">결과 등록</th>
              <th className="border px-4 py-2">삭제</th>
            </tr>
          </thead>
          <tbody>
            {filteredSamples.map(sample => {
              const isRegistered = cdssSampleIds.includes(sample.id);
              return (
              <tr key={sample.id} className="text-center">
                <td className="border px-4 py-2">{sample.id}</td>
                <td className="border px-4 py-2">{sample.order}</td>
                <td className="border px-4 py-2">{sample.sample_type}</td>
                <td className="border px-4 py-2">{sample.test_type}</td>
                <td className="border px-4 py-2">{sample.loinc_code}</td>
                <td className="border px-4 py-2">{sample.collection_date}</td>
                <td className="border px-4 py-2">{sample.sample_status}</td>
                <td className="border px-4 py-2">
                  <span className={
                    isRegistered
                      ? "bg-green-200 text-green-800 px-2 py-1 rounded text-sm"
                      : "bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm"
                  }>
                    {isRegistered ? '검사 완료' : '검사 중'}
                  </span>
                </td>
                <td className="border px-4 py-2">
                  <button
                    onClick={() => handleResultClick(sample)}
                    disabled={isRegistered}
                    className={`px-3 py-1 rounded ${
                      isRegistered
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {isRegistered ? '등록 완료' : '결과 등록'}
                  </button>
                </td>
                <td className="border px-4 py-2">
                  <button
                    onClick={() => handleDelete(sample.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    삭제
                  </button>
                </td>
              </tr>
              );
            })}
            {filteredSamples.length === 0 && (
              <tr>
                <td colSpan="10" className="text-center text-gray-500 py-4">
                  표시할 샘플이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SampleListPage;
