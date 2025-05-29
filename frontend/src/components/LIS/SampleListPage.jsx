import React, { useEffect, useState } from 'react';
import axios from 'axios';

const SampleListPage = () => {
  const [samples, setSamples] = useState([]);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_BASE_URL}samples/`)
      .then(res => setSamples(res.data))
      .catch(err => console.error('샘플 목록 불러오기 실패:', err));
  }, []);

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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SampleListPage;