import React, { useEffect, useState } from 'react';
import axios from 'axios';

const SampleForm = () => {
  const [aliasMappings, setAliasMappings] = useState({});
  const [selectedAlias, setSelectedAlias] = useState('');
  const [selectedTestType, setSelectedTestType] = useState('');  
  const [sampleType, setSampleType] = useState('');
  const [collectionDate, setCollectionDate] = useState('');
  const [orderId, setOrderId] = useState('');
  const [loincCode, setLoincCode] = useState('');
  const [sampleStatus] = useState('collected');

  // alias-mapping 불러오기
  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/samples/alias-mapping`)
      .then(res => {
        console.log('✅ aliasMappings 불러오기 성공:', res.data);
        setAliasMappings(res.data);
      })
      .catch(err => console.error('❌ aliasMappings 불러오기 실패:', err));
  }, []);

  // alias 선택 시 loinc-code 자동 매핑
  useEffect(() => {
    if (selectedTestType && sampleType) {
      console.log('📦 LOINC 매핑 요청:', { sample_type: sampleType, test_type: selectedTestType });
      axios.get(`${process.env.REACT_APP_API_URL}/api/samples/loinc-by-sample-type`, {
        params: { sample_type: sampleType, test_type: selectedTestType }
      })
        .then(res => {
          console.log('✅ LOINC 매핑 응답:', res.data);
          const loinc = res.data.find(item => item.test_type === selectedTestType);
          setLoincCode(loinc?.loinc_code || '');
        })
        .catch(err => {
          console.error('❌ LOINC 코드 매핑 실패:', err);
        });
    }
  }, [selectedTestType, sampleType]);
  

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      order_id: orderId,
      sample_type: sampleType,
      test_type: selectedAlias,
      collection_date: collectionDate,
      loinc_code: loincCode,
      sample_status: sampleStatus
    };

    console.log('📦 보낼 payload:', payload);

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/samples/create`,
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );
      alert('✅ 샘플 등록 성공!');
      console.log('🎉 등록된 샘플:', res.data);
    } catch (error) {
      console.error('❌ 샘플 등록 실패:', error);
      alert('샘플 등록 중 오류가 발생했습니다.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Order ID"
        value={orderId}
        onChange={e => setOrderId(e.target.value)}
        required
      />

      <input
        type="datetime-local"
        value={collectionDate}
        onChange={e => setCollectionDate(e.target.value)}
        required
      />

      <select value={sampleType} onChange={e => {
        setSampleType(e.target.value);
        setSelectedAlias(''); // sampleType 바꾸면 alias 초기화
      }} required>
        <option value="">Sample Type 선택</option>
        {Object.keys(aliasMappings).map(type => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>

      <select value={selectedAlias} onChange={e => setSelectedAlias(e.target.value)} required>
        <option value="">Alias 선택</option>
        {sampleType &&
          Object.keys(aliasMappings[sampleType] || {}).map(alias => (
            <option key={alias} value={alias}>{alias}</option>
          ))}
      </select>

      <p>🔎 자동 매핑된 LOINC 코드: <strong>{loincCode || '없음'}</strong></p>

      <button type="submit">샘플 등록</button>
    </form>
  );
};

export default SampleForm;
