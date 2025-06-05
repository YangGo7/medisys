import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ProviderList = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProviders = async () => {
    try {
      const response = await axios.get('http://YOUR_BACKEND_URL/api/integration/openmrs/providers/');
      setProviders(response.data);
    } catch (err) {
      console.error('Provider 목록 조회 실패', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  if (loading) return <p>불러오는 중...</p>;

  return (
    <div>
      <h2>의료진 목록</h2>
      <ul>
        {providers.map((p) => (
          <li key={p.uuid}>
            <strong>{p.display}</strong> ({p.person?.gender || '성별 미상'}, {p.person?.birthdate || '생년월일 미상'})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProviderList;
