import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Move, Sun, Slash } from 'lucide-react'; // 예쁜 툴 아이콘 임포트

const ToastImageViewer = ({ selectedPatient }) => {
  const [open, setOpen] = useState(false);

  const openViewer = () => setOpen(true);
  const closeViewer = () => setOpen(false);

  return (
    <>
      <button
        onClick={openViewer}
        style={{
          padding: '8px 12px',
          fontSize: '0.9rem',
          background: '#007bff',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        영상 보기
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '80%',
              height: '85%',
              background: '#111',
              borderRadius: '12px',
              boxShadow: '0 0 30px rgba(0,0,0,0.7)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              padding: '16px',
              boxSizing: 'border-box',
            }}
          >
            {/* 닫기 버튼 */}
            <button
              onClick={closeViewer}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'transparent',
                color: '#fff',
                fontSize: '28px',
                border: 'none',
                cursor: 'pointer',
                zIndex: 1001,
              }}
              aria-label="닫기"
            >
              ✕
            </button>

            {/* 툴바 (기능 없는) */}
            <div
              style={{
                display: 'flex',
                gap: '20px',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: '12px',
                color: '#0af',
              }}
            >
              <ZoomIn size={24} style={{ cursor: 'default', opacity: 0.7 }} />
              <ZoomOut size={24} style={{ cursor: 'default', opacity: 0.7 }} />
              <Move size={24} style={{ cursor: 'default', opacity: 0.7 }} />
              <Sun size={24} style={{ cursor: 'default', opacity: 0.7 }} />
              <Slash size={24} style={{ cursor: 'default', opacity: 0.7 }} />
            </div>

            {/* 중앙 영상 영역: 너비 50%로 제한 */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <iframe
                src={`http://your-ohif-url/viewer?patient=${selectedPatient.identifier}`}
                style={{
                  width: '50%',
                  height: '100%',
                  borderRadius: '8px',
                  border: '2px solid #0af',
                  boxShadow: '0 0 15px #0af',
                }}
                title="DICOM Viewer"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ToastImageViewer;
