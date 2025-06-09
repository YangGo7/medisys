import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

const WaitingBoard = () => {
  const [data, setData] = useState({ waiting: [], assigned_recent: null });
  const [showAlert, setShowAlert] = useState(false);
  const [alertName, setAlertName] = useState('');
  const alertCount = useRef(0);
  const prevAssignedRef = useRef(null);
  const alertTimer = useRef(null);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_INTEGRATION_API}waiting-board/`);
      const newData = res.data;
      const prev = prevAssignedRef.current;
      const curr = newData.assigned_recent;

      const isNewAssigned =
        curr && (!prev || prev.name !== curr.name || prev.room !== curr.room);

      if (isNewAssigned && alertCount.current < 3) {
        setAlertName(curr.name);
        setShowAlert(true);
        alertCount.current += 1;

        if (alertTimer.current) clearTimeout(alertTimer.current);
        alertTimer.current = setTimeout(() => setShowAlert(false), 5000);

        prevAssignedRef.current = curr;
      }

      setData(newData);
    } catch (err) {
      console.error('대기 목록 로딩 실패:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => {
      clearInterval(interval);
      clearTimeout(alertTimer.current);
    };
  }, []);

  const maskName = (name) => {
    if (!name || name.length <= 1) return name;
    return name
      .split(' ')
      .map(part =>
        part.length <= 2 ? part[0] + '*' : part[0] + '*'.repeat(part.length - 2) + part[part.length - 1]
      )
      .join(' ');
  };

  const styles = {
    wrapper: {
      display: 'flex',
      flexDirection: 'row',
      fontFamily: 'Arial, sans-serif',
      height: '100vh',
      padding: '1rem',
      backgroundColor: '#f5f8fa',
    },
    waitingArea: {
      flex: 3,
      paddingRight: '1rem',
    },
    examRooms: {
      flex: 1,
      borderLeft: '1px solid #ccc',
      paddingLeft: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    },
    title: {
      fontSize: '1.2rem',
      fontWeight: 'bold',
      marginBottom: '0.8rem',
    },
    patientBox: {
      background: '#eee',
      padding: '0.6rem',
      borderRadius: '6px',
      marginBottom: '0.5rem',
      fontSize: '1rem',
      textAlign: 'center',
    },
    roomBox: {
      background: '#e2f0ff',
      padding: '0.7rem',
      borderRadius: '6px',
      fontSize: '0.95rem',
    },
    roomTitle: {
      fontWeight: 'bold',
      marginBottom: '0.3rem',
    },
    alert: {
      position: 'fixed',
      top: '30%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: '#ffecd2',
      padding: '1.5rem 3rem',
      borderRadius: '12px',
      fontSize: '1.5rem',
      fontWeight: 'bold',
      boxShadow: '0 0 10px rgba(0,0,0,0.3)',
      zIndex: 9999,
      animation: 'fadeInOut 5s ease-in-out',
    },
  };

  return (
    <div style={styles.wrapper}>
      {showAlert && <div style={styles.alert}>{alertName}님 진료실로 입장해주세요</div>}

      {/* 좌측 - 대기환자 목록 */}
      <div style={styles.waitingArea}>
        <div style={styles.title}>총 대기 인원: {data.waiting.length}명</div>
        {data.waiting.length > 0 ? (
          data.waiting.map((p, i) => (
            <div key={i} style={styles.patientBox}>
              {maskName(p.name)}
            </div>
          ))
        ) : (
          <div style={{ color: '#888', textAlign: 'center' }}>대기 중인 환자 없음</div>
        )}
      </div>

      {/* 우측 - 진료실 */}
      <div style={styles.examRooms}>
        {[1, 2].map((room) => {
          const matched = data.assigned_recent?.room === room;
          return (
            <div key={room} style={styles.roomBox}>
              <div style={styles.roomTitle}>진료실 {room}</div>
              <div>{matched ? maskName(data.assigned_recent.name) : '환자 없음'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WaitingBoard;
