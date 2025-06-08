// src/components/EMR/NotificationBell.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const POLL_INTERVAL = 10000; // 10초

const NotificationBell = ({ onClick }) => {
  const [count, setCount] = useState(0);

  const fetchCount = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/integration/alerts/urgent/count/`
      );
      setCount(res.data.count);
    } catch {
      setCount(0);
    }
  };

  useEffect(() => {
    fetchCount();
    const timer = setInterval(fetchCount, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="notification-bell"
      style={{ position: 'relative', cursor: 'pointer' }}
      onClick={onClick}
    >
      <span style={{ fontSize: '1.5rem' }}>🔔</span>
      {count > 0 && (
        <span style={{
          position: 'absolute',
          top: -4,
          right: -4,
          background: 'red',
          color: 'white',
          borderRadius: '50%',
          padding: '2px 6px',
          fontSize: '0.75rem'
        }}>
          {count}
        </span>
      )}
    </div>
  );
};

export default NotificationBell;
