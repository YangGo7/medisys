import React from 'react';

function NotificationBar({ message }) {
  return (
    <div style={{ background: '#eee', padding: '10px', textAlign: 'center' }}>
      {message}
    </div>
  );
}

export default NotificationBar;
