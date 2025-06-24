import React from 'react';
import './SystemShortcuts.css';

const SystemShortcuts = () => {
  const shortcuts = [
    {
      id: 'pacs',
      icon: '🖼️',
      title: 'PACS',
      subtitle: 'Picture Archiving System',
      url: 'http://localhost:3020/pacs',  // 전체 URL로 변경
      color: '#3b82f6'
    },
    {
      id: 'ris',
      icon: '📋',
      title: 'RIS',
      subtitle: 'Radiology Information System',
      url: 'http://localhost:3020/dashboard',
      color: '#10b981'
    },
    {
      id: 'dicom',
      icon: '💾',
      title: 'DICOM',
      subtitle: 'Digital Imaging System',
      url: 'http://localhost:3020/pacs',
      color: '#8b5cf6'
    },
    {
      id: 'settings',
      icon: '⚙️',
      title: '시스템 설정',
      subtitle: 'System Settings',
      url: 'http://localhost:3020/settings',
      color: '#6b7280'
    }
  ];

  const handleShortcutClick = (shortcut) => {
    // 새창으로 열기
    window.open(shortcut.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="shortcuts-container">
      <div className="shortcuts-header">바로가기</div>
      <div className="shortcuts-grid">
        {shortcuts.map((shortcut) => (
          <div
            key={shortcut.id}
            className="shortcut-card"
            onClick={() => handleShortcutClick(shortcut)}
            style={{ '--card-color': shortcut.color }}
          >
            <div className="shortcut-icon">{shortcut.icon}</div>
            <div className="shortcut-content">
              <div className="shortcut-title">{shortcut.title}</div>
              <div className="shortcut-subtitle">{shortcut.subtitle}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemShortcuts;