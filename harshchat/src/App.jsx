

import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';
// At the very top of your entry file (e.g., index.js)

// Add styles for the cursor animation and new buttons
const cursorStyles = `
  .cursor {
    animation: blink 1s infinite;
    color: #ff8fab;
  }
  
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
  
  .image-actions {
    display: flex;
    gap: 0.8rem;
    margin-top: 0.8rem;
    justify-content: center;
  }
  
  .send-image-button {
    background: linear-gradient(to right, #a5dee5, #84d2e1);
    color: white;
    padding: 0.6rem 1rem;
    border-radius: 0.8rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    font-size: 0.9rem;
    font-weight: 500;
  }
  
  .send-image-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .send-image-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none !important;
  }
  
  .request-photo-button {
    background: linear-gradient(to right, #ffd89b, #19547b);
    color: white;
    padding: 0.6rem 1rem;
    border-radius: 0.8rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    font-size: 0.9rem;
    font-weight: 500;
  }
  
  .request-photo-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .typing-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background-color: #f8f9fa;
    border-radius: 1rem;
    margin: 0.5rem 0;
    color: #666;
    font-size: 0.85rem;
    font-style: italic;
    animation: fadeIn 0.3s ease-out;
  }
  
  .typing-dots {
    display: flex;
    gap: 0.2rem;
  }
  
  .typing-dot {
    width: 4px;
    height: 4px;
    background-color: #ff8fab;
    border-radius: 50%;
    animation: typingDot 1.4s infinite ease-in-out;
  }
  
  .typing-dot:nth-child(1) { animation-delay: -0.32s; }
  .typing-dot:nth-child(2) { animation-delay: -0.16s; }
  .typing-dot:nth-child(3) { animation-delay: 0s; }
  
  @keyframes typingDot {
    0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
    40% { transform: scale(1); opacity: 1; }
  }
  
  @media (max-width: 375px) {
    .image-actions {
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .send-image-button,
    .request-photo-button {
      padding: 0.5rem 0.75rem;
      font-size: 0.8rem;
    }
  }
`;

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
  const [welcomeText, setWelcomeText] = useState('');
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);

  // Refs
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const socket = useRef(null);

  // Dynamic welcome text effect
  useEffect(() => {
    const welcomeMessages = [
      "Hey Welcome to Chatherr!",
      "Ready to make new friends?",
      "Join our cozy chat community!",
      "Find your perfect chat buddy!",
      "Connect with amazing people!",
      "Start meaningful conversations!"
    ];
    
    let currentIndex = 0;
    let currentText = '';
    let isDeleting = false;
    let charIndex = 0;

    const typeWriter = () => {
      const currentMessage = welcomeMessages[currentIndex];
      
      if (isDeleting) {
        currentText = currentMessage.substring(0, charIndex - 1);
        charIndex--;
      } else {
        currentText = currentMessage.substring(0, charIndex + 1);
        charIndex++;
      }
      
      setWelcomeText(currentText);
      
      let typeSpeed = isDeleting ? 50 : 100;
      
      if (!isDeleting && charIndex === currentMessage.length) {
        typeSpeed = 2000; // Pause at end
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        currentIndex = (currentIndex + 1) % welcomeMessages.length;
        typeSpeed = 500; // Pause before next message
      }
      
      setTimeout(typeWriter, typeSpeed);
    };

    typeWriter();
  }, []);

  // Socket.io connection and event handlers
  useEffect(() => {
    socket.current = io('https://backend.chatherr.com/', {
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
      const fullImageUrl = `https://backend.chatherr.com${imageUrl}`;
      setMessages((prev) => [...prev, { 
        sender, 
        imageUrl: fullImageUrl, 
        type: 'image',
        expiresAt 
      }]);
    });

    // Typing indicator handlers
    socket.current.on('user-typing', ({ sender }) => {
      if (sender !== username) {
        setIsPartnerTyping(true);
      }
    });

    socket.current.on('user-stopped-typing', ({ sender }) => {
      if (sender !== username) {
        setIsPartnerTyping(false);
      }
    });

    socket.current.on('partner-disconnected', () => {
      setMessages((prev) => [
        ...prev,
        { sender: 'System', message: 'Your partner disconnected.', isSystem: true, type: 'text' },
      ]);
      setIsConnecting(false);
      setIsSearchingNewChat(false);
      setIsPartnerTyping(false);
    });

    socket.current.on('disconnected-from-room', () => {
      setMessages([]);
      setPartner('');
      setRoomId('');
      setChatVisible(false);
      setIsSearchingNewChat(false);
      setStatus('');
      setIsPartnerTyping(false);
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
        socket.current.off('user-typing');
        socket.current.off('user-stopped-typing');
        socket.current.off('partner-disconnected');
        socket.current.off('disconnected-from-room');
        socket.current.off('searching-new-chat');
        socket.current.disconnect();
      }
    };
  }, [username]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  // Handle typing indicator
  const handleTyping = () => {
    if (socket.current && roomId) {
      socket.current.emit('typing', { roomId, sender: username });

      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      // Set new timeout to stop typing indicator
      const newTimeout = setTimeout(() => {
        socket.current.emit('stop-typing', { roomId, sender: username });
      }, 1000);

      setTypingTimeout(newTimeout);
    }
  };

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

    // Stop typing indicator when sending message
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      socket.current.emit('stop-typing', { roomId, sender: username });
    }

    setMessages((prev) => [...prev, { sender: username, message, type: 'text' }]);
    socket.current.emit('message', { roomId, message, sender: username });
    setMessage('');
  };

  const requestPhoto = () => {
    const requestMessage = "📸 Can you send me a photo please? 🥺";
    setMessages((prev) => [...prev, { sender: username, message: requestMessage, type: 'text' }]);
    socket.current.emit('message', { roomId, message: requestMessage, sender: username });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    handleTyping();
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
            const fullImageUrl = `https://backend.chatherr.com/${response.imageUrl}`;
            setMessages((prev) => [...prev, { 
              sender: username, 
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
    const isCurrentUser = msg.sender === username;
    
    return (
      <div
        key={idx}
        className={`message ${
          isCurrentUser
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
      <style>{cursorStyles}</style>
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
            <h2 className="join-title">
              {welcomeText}
              <span className="cursor">|</span>
            </h2>
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
              <span className="chat-header-title">{partner}</span>
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
              
              {/* Typing Indicator */}
              {isPartnerTyping && (
                <div className="typing-indicator">
                  <span>{partner} is typing</span>
                  <div className="typing-dots">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              )}
              
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
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a sweet message..."
                  className="message-input"
                  ref={messageInputRef}
                />
                
                <button
                  onClick={sendMessage}
                  className="send-button"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"/>
                  </svg>
                </button>
              </div>
              
              {/* Image Actions */}
              <div className="image-actions">
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
                  className="send-image-button"
                  disabled={uploadingImage}
                  title="Upload and send an image"
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
                  </svg>
                  Send Image
                </button>
                
                <button
                  onClick={requestPhoto}
                  className="request-photo-button"
                  title="Request a photo from your chat partner"
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zM4 4a4 4 0 014-4h4a4 4 0 014 4v12a4 4 0 01-4 4H8a4 4 0 01-4-4V4zm6 7a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1zm0-4a1 1 0 100 2 1 1 0 000-2z"/>
                  </svg>
                  Request Photo
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