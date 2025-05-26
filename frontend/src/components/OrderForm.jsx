import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';


const OrderForm = () => {
  const [aliasOptions, setAliasOptions] = useState([]);
  const navigate = useNavigate();
  const [selectedAlias, setSelectedAlias] = useState('');
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [collectionDate, setCollectionDate] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 16));

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/samples/alias-mapping/`)
        .then(res => {
        const rawData = res.data;
        const aliases = [];

        // sample_type별 alias 목록 추출
        Object.entries(rawData).forEach(([sampleType, aliasMap]) => {
            Object.keys(aliasMap).forEach(alias => {
            aliases.push(alias);  // 또는 { value: alias, label: alias }
            });
        });

        setAliasOptions(aliases);
        })
        .catch(err => {
        console.error('❌ alias 목록 로딩 실패:', err);
        });
    }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      patient_id: parseInt(patientId),
      doctor_id: parseInt(doctorId),
      test_type: selectedAlias,  // alias_name으로 전달
      order_date: orderDate,
    };

    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/orders/create/`, payload);
      alert('✅ 주문 생성 성공!');
      console.log('Created:', res.data);

      navigate('/');
    } catch (err) {
      alert('❌ 주문 생성 실패');
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
      <h2>📝 주문 생성</h2>

      <label>👤 환자 ID:</label><br />
      <input value={patientId} onChange={e => setPatientId(e.target.value)} required /><br />

      <label>🧑‍⚕️ 의사 ID:</label><br />
      <input value={doctorId} onChange={e => setDoctorId(e.target.value)} required /><br />

      <label>🔬 검사 타입 (alias):</label><br />
      <select value={selectedAlias} onChange={e => setSelectedAlias(e.target.value)} required>
        <option value="">선택하세요</option>
        {aliasOptions.map(alias => (
            <option key={alias} value={alias}>{alias}</option>
          ))}
      </select><br />

      <label>🕒 주문 날짜:</label><br />
      <input type="datetime-local" value={collectionDate} onChange={e => setCollectionDate(e.target.value)} required /><br /><br />

      <button type="submit">생성하기</button>
    </form>
  );
};

export default OrderForm;

