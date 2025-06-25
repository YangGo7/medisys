import React, { useState } from 'react';
import './MessengerSystem.css';

const MessengerSystem = () => {
  const [showMessenger, setShowMessenger] = useState(false);
  const [messengerMode, setMessengerMode] = useState('orgChart'); // 'orgChart' | 'chatList'
  const [selectedChat, setSelectedChat] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showUserProfile, setShowUserProfile] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 100, y: 100 });
  const [popupSize, setPopupSize] = useState({ width: 700, height: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // 메디시스 조직도 가짜 데이터
  const orgData = [
    {
      id: 'radiology',
      name: '영상의학과',
      type: 'department',
      expanded: true,
      children: [
        { 
          id: 'park_doctor', 
          name: '박의사', 
          position: '전문의', 
          avatar: '박', 
          isOnline: true,
          medicalId: 'DR001',
          email: 'park@medisis.com',
          department: '영상의학과'
        },
        { 
          id: 'kim_tech', 
          name: '김기사', 
          position: '방사선사', 
          avatar: '김', 
          isOnline: true,
          medicalId: 'RT001',
          email: 'kim@medisis.com',
          department: '영상의학과'
        },
        { 
          id: 'lee_nurse', 
          name: '이간호사', 
          position: '간호사', 
          avatar: '이', 
          isOnline: false,
          medicalId: 'RN001',
          email: 'lee@medisis.com',
          department: '영상의학과'
        }
      ]
    },
    {
      id: 'internal',
      name: '내과',
      type: 'department',
      expanded: false,
      children: [
        { 
          id: 'kim_manager', 
          name: '김과장', 
          position: '과장', 
          avatar: '김', 
          isOnline: false,
          medicalId: 'DR002',
          email: 'kimmanager@medisis.com',
          department: '내과'
        },
        { 
          id: 'hong_nurse', 
          name: '홍간호사', 
          position: '간호사', 
          avatar: '홍', 
          isOnline: true,
          medicalId: 'RN002',
          email: 'hong@medisis.com',
          department: '내과'
        }
      ]
    },
    {
      id: 'surgery',
      name: '외과',
      type: 'department',
      expanded: false,
      children: [
        { 
          id: 'choi_doctor', 
          name: '최의사', 
          position: '전문의', 
          avatar: '최', 
          isOnline: true,
          medicalId: 'DR003',
          email: 'choi@medisis.com',
          department: '외과'
        },
        { 
          id: 'jung_nurse', 
          name: '정간호사', 
          position: '간호사', 
          avatar: '정', 
          isOnline: false,
          medicalId: 'RN003',
          email: 'jung@medisis.com',
          department: '외과'
        }
      ]
    },
    {
      id: 'admin',
      name: '행정부',
      type: 'department',
      expanded: false,
      children: [
        { 
          id: 'sim_admin', 
          name: '심보람', 
          position: '행정관리자', 
          avatar: '심', 
          isOnline: true,
          medicalId: 'AD001',
          email: 'brsim13@medisis.com',
          department: '행정부'
        },
        { 
          id: 'yang_admin', 
          name: '양진모', 
          position: '시스템관리자', 
          avatar: '양', 
          isOnline: true,
          medicalId: 'AD002',
          email: 'yang@medisis.com',
          department: '행정부'
        }
      ]
    }
  ];

  // 가짜 채팅방 데이터
  const chatRooms = [
    {
      id: 1,
      name: '박의사 (영상)',
      lastMessage: '오늘 촬영스케줄 확인 부탁드립니다.',
      time: '14:35',
      unread: 1,
      avatar: '박',
      isOnline: true
    },
    {
      id: 2,
      name: '이간호사 (병동)',
      lastMessage: '네 알겠습니다.',
      time: '11:45',
      unread: 0,
      avatar: '이',
      isOnline: false
    },
    {
      id: 3,
      name: '김기사 (방사)',
      lastMessage: '기계 점검 완료되었습니다.',
      time: '10:20',
      unread: 1,
      avatar: '김',
      isOnline: true
    },
    {
      id: 4,
      name: '김과장 (내과)',
      lastMessage: '회의 시간 조정 가능한가요?',
      time: '11:25',
      unread: 0,
      avatar: '김',
      isOnline: false
    },
    {
      id: 5,
      name: '홍간호사',
      lastMessage: '오늘 오전 스케줄입니다.',
      time: '10:30',
      unread: 1,
      avatar: '홍',
      isOnline: true
    }
  ];

  // 가짜 메시지 데이터
  const sampleMessages = {
    1: [
      { id: 1, sender: 'other', content: '오늘 촬영 스케줄 내용 확인 부탁드립니다.', time: '14:30', senderName: '박의사' },
      { id: 2, sender: 'me', content: '네 확인 후 수정하겠습니다.', time: '14:32' },
      { id: 3, sender: 'other', content: '감사합니다.', time: '14:35', senderName: '박의사' }
    ],
    2: [
      { id: 1, sender: 'other', content: '병동 일정 변경사항 있나요?', time: '11:40', senderName: '이간호사' },
      { id: 2, sender: 'me', content: '네 알겠습니다.', time: '11:45' }
    ]
  };

  const [newMessage, setNewMessage] = useState('');

  const handleChatRoomClick = (roomId) => {
    const room = chatRooms.find(r => r.id === roomId);
    setSelectedChat({ 
      ...room, 
      messages: sampleMessages[roomId] || [] 
    });
  };

  const handleUserRightClick = (e, user) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      user: user
    });
  };

  const handleContextMenuAction = (action, user) => {
    if (action === 'chat') {
      const newChat = {
        id: Date.now(),
        name: user.name,
        avatar: user.avatar,
        messages: [],
        isOnline: user.isOnline
      };
      setSelectedChat(newChat);
    } else if (action === 'profile') {
      setShowUserProfile(user);
    }
    setContextMenu(null);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChat) return;
    
    const newMsg = {
      id: Date.now(),
      sender: 'me',
      content: newMessage,
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    };

    setSelectedChat(prev => ({
      ...prev,
      messages: [...(prev.messages || []), newMsg]
    }));
    
    setNewMessage('');

    // 가짜 응답 시뮬레이션 (2초 후)
    setTimeout(() => {
      const response = {
        id: Date.now() + 1,
        sender: 'other',
        content: '네, 확인했습니다!',
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        senderName: selectedChat.name
      };
      
      setSelectedChat(prev => ({
        ...prev,
        messages: [...(prev.messages || []), response]
      }));
    }, 2000);
  };

  const toggleDepartment = (deptId) => {
    // 부서 펼치기/접기 (데모용)
    console.log(`Toggle department: ${deptId}`);
  };

  // 드래그 핸들러
  const handleMouseDown = (e) => {
    if (e.target.closest('.messenger-header')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - popupPosition.x,
        y: e.clientY - popupPosition.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPopupPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    } else if (isResizing) {
      const newWidth = Math.max(400, resizeStart.width + (e.clientX - resizeStart.x));
      const newHeight = Math.max(300, resizeStart.height + (e.clientY - resizeStart.y));
      setPopupSize({ width: newWidth, height: newHeight });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  // 리사이징 핸들러
  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: popupSize.width,
      height: popupSize.height
    });
  };

  // 전역 마우스 이벤트 리스너
  React.useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragOffset, resizeStart]);

  const ChatPanel = () => {
    if (!selectedChat) {
      return (
        <div className="messenger-empty">
          <div className="messenger-empty-content">
            <div className="messenger-empty-icon">💬</div>
            <p className="messenger-empty-title">메신저를 시작하세요</p>
            <p className="messenger-empty-subtitle">채팅방을 선택하거나 조직도에서 사용자를 선택하세요</p>
          </div>
        </div>
      );
    }

    return (
      <div className="chat-panel">
        {/* 채팅 헤더 */}
        <div className="chat-header">
          <div className="chat-avatar">
            {selectedChat.avatar}
          </div>
          <div className="chat-header-info">
            <h3 className="chat-header-name">{selectedChat.name}</h3>
            <p className="chat-header-status">
              {selectedChat.isOnline ? '온라인' : '오프라인'}
            </p>
          </div>
        </div>

        {/* 메시지 영역 */}
        <div className="chat-messages">
          {selectedChat.messages?.length > 0 ? (
            selectedChat.messages.map(msg => (
              <div key={msg.id} className={`message ${msg.sender === 'me' ? 'message-me' : 'message-other'}`}>
                {msg.sender === 'other' && (
                  <div className="message-sender">{msg.senderName}</div>
                )}
                <div className="message-bubble">
                  {msg.content}
                </div>
                <div className="message-time">{msg.time}</div>
              </div>
            ))
          ) : (
            <div className="chat-empty">
              새로운 대화를 시작하세요
            </div>
          )}
        </div>

        {/* 입력 영역 */}
        <div className="chat-input-area">
          <div className="chat-input-container">
            <button className="chat-emoji-btn">😊</button>
            <button className="chat-file-btn">📎</button>
            <input 
              type="text" 
              placeholder="메시지를 입력하세요..."
              className="chat-input"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button 
              className="chat-send-btn"
              onClick={handleSendMessage}
            >
              전송
            </button>
          </div>
        </div>
      </div>
    );
  };

  const UserProfileModal = () => {
    if (!showUserProfile) return null;

    return (
      <div className="profile-modal-overlay" onClick={() => setShowUserProfile(null)}>
        <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
          <div className="profile-modal-header">
            <h3>사용자 정보</h3>
            <button 
              className="profile-modal-close"
              onClick={() => setShowUserProfile(null)}
            >
              ×
            </button>
          </div>
          <div className="profile-modal-content">
            <div className="profile-avatar-large">
              {showUserProfile.avatar}
            </div>
            <div className="profile-info">
              <div className="profile-field">
                <label>이름:</label>
                <span>{showUserProfile.name}</span>
              </div>
              <div className="profile-field">
                <label>진료과:</label>
                <span>{showUserProfile.department}</span>
              </div>
              <div className="profile-field">
                <label>의료진식별번호:</label>
                <span>{showUserProfile.medicalId}</span>
              </div>
              <div className="profile-field">
                <label>역할:</label>
                <span>{showUserProfile.position}</span>
              </div>
              <div className="profile-field">
                <label>상태:</label>
                <span className={showUserProfile.isOnline ? 'status-online' : 'status-offline'}>
                  {showUserProfile.isOnline ? '온라인' : '오프라인'}
                </span>
              </div>
              <div className="profile-field">
                <label>이메일:</label>
                <span>{showUserProfile.email}</span>
              </div>
            </div>
            <div className="profile-actions">
              <button 
                className="profile-action-btn primary"
                onClick={() => {
                  handleContextMenuAction('chat', showUserProfile);
                  setShowUserProfile(null);
                }}
              >
                채팅하기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 플로팅 채팅 버튼 */}
      <button
        className="floating-chat-btn"
        onClick={() => setShowMessenger(true)}
        title="메신저"
      >
        💬
      </button>

      {/* 메신저 팝업 - 드래그 가능한 독립 창 */}
      {showMessenger && (
        <div 
          className="messenger-window"
          style={{
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`,
            width: `${popupSize.width}px`,
            height: `${popupSize.height}px`
          }}
          onMouseDown={handleMouseDown}
        >
          {/* 메신저 헤더 - 드래그 가능 */}
          <div className="messenger-header draggable">
            <div className="header-left">
              <button 
                className="sidebar-toggle"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title={sidebarCollapsed ? "사이드바 열기" : "사이드바 닫기"}
              >
                {sidebarCollapsed ? '→' : '←'}
              </button>
              <h2>메디시스 메신저</h2>
            </div>
            <div className="window-controls">
              <button 
                className="messenger-minimize"
                title="최소화"
              >
                −
              </button>
              <button 
                className="messenger-close"
                onClick={() => setShowMessenger(false)}
                title="닫기"
              >
                ×
              </button>
            </div>
          </div>

          <div className="messenger-content">
            {/* 좌측 패널 - 토글 가능 */}
            <div className={`messenger-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
              {!sidebarCollapsed && (
                <>
                  {/* 탭 버튼 */}
                  <div className="messenger-tabs">
                    <button 
                      className={`tab ${messengerMode === 'orgChart' ? 'active' : ''}`}
                      onClick={() => setMessengerMode('orgChart')}
                    >
                      조직도
                    </button>
                    <button 
                      className={`tab ${messengerMode === 'chatList' ? 'active' : ''}`}
                      onClick={() => setMessengerMode('chatList')}
                    >
                      채팅방
                    </button>
                  </div>

                  {/* 검색창 */}
                  <div className="messenger-search">
                    <input 
                      type="text" 
                      placeholder="검색..."
                      className="search-input"
                    />
                  </div>

                  {/* 조직도 모드 */}
                  {messengerMode === 'orgChart' && (
                    <div className="org-chart">
                      {orgData.map(dept => (
                        <div key={dept.id} className="department">
                          <div 
                            className="department-header"
                            onClick={() => toggleDepartment(dept.id)}
                          >
                            <span className="department-icon">📁</span>
                            <span className="department-name">{dept.name}</span>
                          </div>
                          {dept.expanded && (
                            <div className="department-users">
                              {dept.children.map(user => (
                                <div 
                                  key={user.id}
                                  className="user-item"
                                  onContextMenu={(e) => handleUserRightClick(e, user)}
                                >
                                  <div className="user-avatar">
                                    👤
                                    {user.isOnline && (
                                      <div className="online-indicator"></div>
                                    )}
                                  </div>
                                  <div className="user-info">
                                    <div className="user-name">{user.name}</div>
                                    <div className="user-position">{user.position}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 채팅방 리스트 모드 */}
                  {messengerMode === 'chatList' && (
                    <div className="chat-room-list">
                      {chatRooms.map(room => (
                        <div 
                          key={room.id}
                          className="chat-room-item"
                          onClick={() => handleChatRoomClick(room.id)}
                        >
                          <div className="room-avatar">
                            {room.avatar}
                            {room.isOnline && (
                              <div className="online-indicator"></div>
                            )}
                          </div>
                          <div className="room-info">
                            <div className="room-header">
                              <span className="room-name">{room.name}</span>
                              <span className="room-time">{room.time}</span>
                            </div>
                            <div className="room-message">
                              <span className="last-message">{room.lastMessage}</span>
                              {room.unread > 0 && (
                                <span className="unread-badge">
                                  {room.unread}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 우측 패널 - 채팅 영역 */}
            <ChatPanel />
          </div>

          {/* 리사이징 핸들 */}
          <div 
            className="resize-handle"
            onMouseDown={handleResizeStart}
          ></div>
        </div>
      )}

      {/* 컨텍스트 메뉴 */}
      {contextMenu && (
        <div 
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button 
            className="context-menu-item"
            onClick={() => handleContextMenuAction('chat', contextMenu.user)}
          >
            채팅하기
          </button>
          <button 
            className="context-menu-item"
            onClick={() => handleContextMenuAction('profile', contextMenu.user)}
          >
            사용자 정보
          </button>
        </div>
      )}

      {/* 컨텍스트 메뉴 닫기용 오버레이 */}
      {contextMenu && (
        <div 
          className="context-menu-overlay"
          onClick={() => setContextMenu(null)}
        />
      )}

      {/* 사용자 프로필 모달 */}
      <UserProfileModal />
    </>
  );
};

export default MessengerSystem;