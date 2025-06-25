import React, { useState } from 'react';
import './PacsPage.css';

const PacsPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [orthancUrl, setOrthancUrl] = useState('http://35.221.63.41:8042');
  const [showSettings, setShowSettings] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setConnectionError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setConnectionError(true);
  };

  const handleUrlChange = (newUrl) => {
    setOrthancUrl(newUrl);
    setIsLoading(true);
    setConnectionError(false);
    setShowSettings(false);
  };

  const checkOrthancStatus = async () => {
    try {
      const response = await fetch(`${orthancUrl}/system`);
      if (response.ok) {
        console.log('Orthanc 서버 연결 성공');
        return true;
      }
    } catch (error) {
      console.error('Orthanc 서버 연결 실패:', error);
    }
    return false;
  };

  return (
    <div className="pacs-page-content">
      {/* 상단 헤더 */}
      <div className="pacs-header">
        <div className="pacs-title-section">
          <h2>📡 PACS - Picture Archiving System</h2>
          <span className="pacs-status">
            {connectionError ? '연결 실패' : isLoading ? '연결 중...' : 'Orthanc DICOM Server'}
          </span>
        </div>
        
        <div className="pacs-controls">
          <button 
            className="pacs-control-btn settings"
            onClick={() => setShowSettings(!showSettings)}
            title="서버 설정"
          >
            ⚙️
          </button>
          
          <button 
            className="pacs-control-btn refresh"
            onClick={() => {
              setIsLoading(true);
              setConnectionError(false);
              const iframe = document.getElementById('orthanc-iframe');
              iframe.src = iframe.src;
            }}
            title="새로고침"
          >
            🔄
          </button>
          
          <button 
            className="pacs-control-btn test"
            onClick={checkOrthancStatus}
            title="연결 테스트"
          >
            🔍
          </button>
          
          <button 
            className="pacs-control-btn fullscreen"
            onClick={() => {
              const iframe = document.getElementById('orthanc-iframe');
              if (iframe.requestFullscreen) {
                iframe.requestFullscreen();
              }
            }}
            title="전체화면"
          >
            ⛶
          </button>
        </div>
      </div>

      {/* 설정 패널 */}
      {showSettings && (
        <div className="pacs-settings">
          <div className="setting-row">
            <label>서버 URL:</label>
            <input 
              type="text" 
              value={orthancUrl}
              onChange={(e) => setOrthancUrl(e.target.value)}
              placeholder="http://35.221.63.41:8042"
            />
            <button 
              onClick={() => handleUrlChange(orthancUrl)}
              className="apply-btn"
            >
              적용
            </button>
          </div>
          
          <div className="preset-buttons">
            <button onClick={() => handleUrlChange('http://35.221.63.41:8042')}>
              기본 포트 (8042)
            </button>
            <button onClick={() => handleUrlChange('http://35.221.63.41:4242')}>
              대체 포트 (4242)
            </button>
            <button onClick={() => handleUrlChange('http://35.221.63.41:8080')}>
              대체 포트 (8080)
            </button>
          </div>
          
          <div className="orthanc-info">
            <h4>💡 Orthanc 서버 실행 방법:</h4>
            <ol>
              <li>Orthanc 실행파일을 다운로드하여 실행하거나</li>
              <li>명령 프롬프트에서 <code>orthanc</code> 명령 실행</li>
              <li>기본 접속: <code>http://35.221.63.41:8042</code></li>
              <li>기본 로그인: ID/PW 모두 <code>orthanc</code></li>
            </ol>
          </div>
        </div>
      )}

      {/* iframe 영역 */}
      <div className="pacs-viewer">
        {isLoading && !connectionError && (
          <div className="pacs-loading-overlay">
            <div className="loading-circle"></div>
            <p>Orthanc 서버 연결 중...</p>
            <small>{orthancUrl}</small>
          </div>
        )}
        
        {connectionError && (
          <div className="pacs-error-overlay">
            <div className="error-icon">❌</div>
            <h3>Orthanc 서버에 연결할 수 없습니다</h3>
            <p>다음 사항을 확인해주세요:</p>
            <ul>
              <li>Orthanc 서버가 실행 중인지 확인</li>
              <li>URL이 올바른지 확인: <code>{orthancUrl}</code></li>
              <li>방화벽이나 보안 소프트웨어 차단 여부</li>
              <li>포트가 사용 중이 아닌지 확인</li>
            </ul>
            <div className="error-actions">
              <button 
                onClick={() => handleUrlChange(orthancUrl)}
                className="retry-btn"
              >
                다시 시도
              </button>
              <button 
                onClick={() => setShowSettings(true)}
                className="settings-btn"
              >
                설정 열기
              </button>
            </div>
          </div>
        )}
        
        <iframe
          id="orthanc-iframe"
          src={orthancUrl}
          className="orthanc-iframe"
          title="Orthanc PACS Viewer"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          sandbox="allow-same-origin allow-scripts allow-forms allow-downloads allow-popups"
          style={{ display: connectionError ? 'none' : 'block' }}
        />
      </div>

      {/* 하단 상태바 */}
      <div className="pacs-footer">
        <div className="connection-status">
          <div className={`status-dot ${connectionError ? 'error' : isLoading ? 'connecting' : 'connected'}`}></div>
          <span>
            {connectionError ? '연결 실패' : isLoading ? '연결 중...' : '연결됨'}
          </span>
        </div>
        <div className="server-info">
          서버: {orthancUrl}
        </div>
        <div className="last-update">
          {new Date().toLocaleTimeString('ko-KR')}
        </div>
      </div>
    </div>
  );
};

export default PacsPage;