import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const App = () => {
  // State management
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState('');
  const [roomId, setRoomId] = useState('');
  const [partner, setPartner] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatVisible, setChatVisible] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const [isSearchingNewChat, setIsSearchingNewChat] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const socket = useRef(null);

  // Socket.io connection and event handlers
  useEffect(() => {
    socket.current = io('http://localhost:8080', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket']
    });

    const handleConnect = () => console.log('Connected to server');
    const handleDisconnect = () => console.log('Disconnected from server');
    const handleConnectError = (err) => console.log('Connection error:', err);

    socket.current.on('connect', handleConnect);
    socket.current.on('disconnect', handleDisconnect);
    socket.current.on('connect_error', handleConnectError);

    socket.current.on('waiting', (msg) => {
      setStatus(msg);
      setIsConnecting(true);
    });

    socket.current.on('connected', ({ roomId, partner }) => {
      setRoomId(roomId);
      setPartner(partner);
      setStatus(`Connected to ${partner} in room ${roomId}`);
      setChatVisible(true);
      setIsConnecting(false);
      setIsSearchingNewChat(false);
      messageInputRef.current?.focus();
    });

    socket.current.on('message', ({ message, sender }) => {
      setMessages((prev) => [...prev, { sender, message, type: 'text' }]);
    });

    socket.current.on('image-message', ({ imageUrl, sender, expiresAt }) => {
      const fullImageUrl = `http://localhost:8080${imageUrl}`;
      setMessages((prev) => [...prev, { 
        sender, 
        imageUrl: fullImageUrl, 
        type: 'image',
        expiresAt 
      }]);
    });

    socket.current.on('partner-disconnected', () => {
      setMessages((prev) => [
        ...prev,
        { sender: 'System', message: 'Your partner disconnected.', isSystem: true, type: 'text' },
      ]);
      setIsConnecting(false);
      setIsSearchingNewChat(false);
    });

    socket.current.on('disconnected-from-room', () => {
      setMessages([]);
      setPartner('');
      setRoomId('');
      setChatVisible(false);
      setIsSearchingNewChat(false);
      setStatus('');
    });

    socket.current.on('searching-new-chat', (msg) => {
      setIsSearchingNewChat(true);
      setMessages((prev) => [
        ...prev,
        { sender: 'System', message: msg, isSystem: true, type: 'text' },
      ]);
    });

    return () => {
      if (socket.current) {
        socket.current.off('connect', handleConnect);
        socket.current.off('disconnect', handleDisconnect);
        socket.current.off('connect_error', handleConnectError);
        socket.current.off('waiting');
        socket.current.off('connected');
        socket.current.off('message');
        socket.current.off('image-message');
        socket.current.off('partner-disconnected');
        socket.current.off('disconnected-from-room');
        socket.current.off('searching-new-chat');
        socket.current.disconnect();
      }
    };
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Event handlers
  const handleNewChat = () => {
    if (window.confirm('Are you sure you want to start a new chat? This will disconnect you from your current partner.')) {
      setIsSearchingNewChat(true);
      socket.current.emit('find-new-chat', { username });
    }
  };

  const handleJoin = () => {
    if (!username) {
      alert('Please enter a username');
      return;
    }
    setIsConnecting(true);
    socket.current.emit('join', { username });
  };

  const sendMessage = () => {
    if (!message.trim()) return;

    setMessages((prev) => [...prev, { sender: 'You', message, type: 'text' }]);
    socket.current.emit('message', { roomId, message, sender: username });
    setMessage('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploadingImage(true);

    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result.split(',')[1];
        
        socket.current.emit('upload-image', {
          roomId,
          imageData: base64Data,
          sender: username,
          filename: file.name
        }, (response) => {
          setUploadingImage(false);
          if (response.success) {
            const fullImageUrl = `http://localhost:8080${response.imageUrl}`;
            setMessages((prev) => [...prev, { 
              sender: 'You', 
              imageUrl: fullImageUrl, 
              type: 'image',
              expiresAt: Date.now() + 30000 
            }]);
          } else {
            alert('Failed to upload image: ' + response.error);
          }
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setUploadingImage(false);
      alert('Failed to upload image');
    }

    event.target.value = '';
  };

  const openImageModal = (imageUrl) => {
    setModalImage(imageUrl);
  };

  const closeImageModal = () => {
    setModalImage(null);
  };

  const isImageExpired = (expiresAt) => {
    return Date.now() > expiresAt;
  };

  const renderMessage = (msg, idx) => {
    const isExpired = msg.type === 'image' && msg.expiresAt && isImageExpired(msg.expiresAt);
    
    return (
      <div
        key={idx}
        className={`message ${
          msg.sender === 'You'
            ? 'message-you'
            : msg.isSystem
            ? 'message-system'
            : 'message-partner'
        }`}
      >
        <p className="message-sender">{msg.sender}</p>
        
        {msg.type === 'image' ? (
          <div className="image-message">
            {!isExpired ? (
              <img
                src={msg.imageUrl}
                alt="Shared image"
                className="message-image"
                onClick={() => openImageModal(msg.imageUrl)}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
            ) : (
              <div className="expired-text">🖼️ Image expired</div>
            )}
          </div>
        ) : (
          <p className="message-content">{msg.message}</p>
        )}
      </div>
    );
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <span className="header-icon">💖</span>
          <h1 className="header-title">Chatherr</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        {!chatVisible ? (
          <div className="join-card">
            <h2 className="join-title"> Hey Welcome to Chatherr!</h2>
            <p className="join-quote">"Make new friends in our cozy chat room! 💕 Share messages and cute pictures in this safe, anonymous space. Perfect for connecting with others!"</p>
            
            <div className="form-group">
              <label className="label">Your Cute Nickname</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input"
                placeholder="Princess, Sparkle, etc."
                disabled={isConnecting}
              />
            </div>

            <button
              onClick={handleJoin}
              disabled={isConnecting}
              className={`button-primary ${isConnecting ? 'button-disabled' : ''}`}
            >
              {isConnecting ? (
                <span className="loading-text">
                  <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path fill="currentColor" d="M12 4a8 8 0 018 8h2a10 10 0 00-10-10v2z" opacity="0.25"/>
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Finding a friend...
                </span>
              ) : 'Start Chatting 💬'}
            </button>

            {status && (
              <div className="status-box">
                <strong>{status}</strong>
              </div>
            )}
          </div>
        ) : (
          <div className="chat-container">
            {/* Chat Header */}
            <div className="chat-header">
              <span className="chat-header-icon">👯</span>
              <span className="chat-header-title">Chatting with {partner}</span>
              <div className="chat-header-actions">
                <button
                  onClick={handleNewChat}
                  disabled={isSearchingNewChat}
                  className={`new-chat-button ${isSearchingNewChat ? 'new-chat-button-disabled' : ''}`}
                  title="Find a new chat partner"
                >
                  {isSearchingNewChat ? (
                    <span className="loading-text">
                      <svg className="spinner" width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path fill="currentColor" d="M12 4a8 8 0 018 8h2a10 10 0 00-10-10v2z" opacity="0.25"/>
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Searching...
                    </span>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"/>
                      </svg>
                      New Friend
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="chat-body">
              {messages.map((msg, idx) => renderMessage(msg, idx))}
              
              {uploadingImage && (
                <div className="uploading-indicator">
                  <svg className="spinner" width="12" height="12" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path fill="currentColor" d="M12 4a8 8 0 018 8h2a10 10 0 00-10-10v2z" opacity="0.25"/>
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Uploading cute pic...
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="chat-footer">
              <div className="message-form">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a sweet message..."
                  className="message-input"
                  ref={messageInputRef}
                />
                
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="file-input"
                  ref={fileInputRef}
                  disabled={uploadingImage}
                />
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="image-button"
                  disabled={uploadingImage}
                  title="Upload cute picture"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
                  </svg>
                </button>
                
                <button
                  onClick={sendMessage}
                  className="send-button"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Image Modal */}
      {modalImage && (
        <div className="modal" onClick={closeImageModal}>
          <button className="modal-close" onClick={closeImageModal}>
            ×
          </button>
          <img 
            src={modalImage} 
            alt="Full size" 
            className="modal-image"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        Chatherr © {new Date().getFullYear()} - Where people make friends 💕
      </footer>
    </div>
  );
};

export default App;
