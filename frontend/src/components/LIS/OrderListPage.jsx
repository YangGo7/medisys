import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const OrderListPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_BASE_URL}orders`)
      .then(res => setOrders(res.data))
      .catch(err => console.error('오더 목록 불러오기 실패:', err));
  }, []);

  return (
    <div>
      <h2>🗂 오더 목록</h2>
      <table border="1">
        <thead>
          <tr>
            <th>오더 ID</th>
            <th>환자 ID</th>
            <th>의사 ID</th>
            <th>검사 타입</th>
            <th>오더 날짜</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id}>
              <td>{order.id}</td>
              <td>{order.patient_id}</td>
              <td>{order.doctor_id}</td>
              <td>{order.test_type}</td>
              <td>{order.order_date}</td>
              <button onClick={() => navigate(`/sample/new/${order.id}`)}>샘플 등록</button>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrderListPage;
