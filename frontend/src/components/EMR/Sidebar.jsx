// src/components/Sidebar.jsx
import React from 'react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menus = ['홈', '진료', '설정'];

  return (
    <div style={{ width: '180px', backgroundColor: '#f2f2f2', padding: '1rem' }}>
      <h2 style={{ fontSize: '18px', marginBottom: '1.5rem' }}>🏥 EMR</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {menus.map((menu) => (
          <li
            key={menu}
            onClick={() => setActiveTab(menu)}
            style={{
              padding: '0.5rem 0',
              cursor: 'pointer',
              fontWeight: activeTab === menu ? 'bold' : 'normal',
              backgroundColor: activeTab === menu ? '#e6f7ff' : 'transparent',
              borderRadius: '6px',
              paddingLeft: '0.5rem'
            }}
          >
            {menu}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
