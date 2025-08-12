// // src/components/ChatScreen.jsx
// import React, { useRef } from 'react';
// import { useState, useEffect } from 'react';
// import './ChatScreen.css';      // move the relevant CSS here

// const ChatScreen = ({
//   username,
//   roomId,
//   partner,
//   messages,
//   socket,
//   onNewChat,
//   isSearchingNewChat,
//   uploadingImage,
//   isPartnerTyping,
// }) => {
//   const [message, setMessage]       = useState('');
//   const [typingTimeout, setTypingTimeout] = useState(null);
//   const [modalImage, setModalImage] = useState(null);

//   const messagesEndRef   = useRef(null);
//   const messageInputRef  = useRef(null);
//   const fileInputRef     = useRef(null);

//   /* ----------  scroll to bottom  ---------- */
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [messages, isPartnerTyping]);

//   /* ----------  helpers  ---------- */
//   const resetTyping = () => {
//     if (typingTimeout) clearTimeout(typingTimeout);
//     socket.current.emit('stop-typing', { roomId, sender: username });
//   };

//   const handleTyping = () => {
//     socket.current.emit('typing', { roomId, sender: username });
//     if (typingTimeout) clearTimeout(typingTimeout);
//     const t = setTimeout(() => socket.current.emit('stop-typing', { roomId, sender: username }), 1000);
//     setTypingTimeout(t);
//   };

//   const sendMessage = () => {
//     if (!message.trim()) return;
//     resetTyping();
//     socket.current.emit('message', { roomId, message, sender: username });
//     setMessage('');
//   };

//   const handleImageUpload = (e) => { /* same as before */ };
//   const requestPhoto = () => { /* same as before */ };
//   const openImageModal = (url) => setModalImage(url);
//   const closeImageModal = () => setModalImage(null);
//   const isImageExpired = (expiresAt) => Date.now() > expiresAt;

//   const renderMessage = (msg, idx) => { /* same as before */ };

//   return (
//     <div className="chat-container">
//       {/* ---- Header ---- */}
//       <div className="chat-header">
//         <span>👯</span>
//         <span>{partner}</span>
//         <button onClick={onNewChat} disabled={isSearchingNewChat}>
//           {isSearchingNewChat ? 'Searching…' : 'New Friend'}
//         </button>
//       </div>

//       {/* ---- Body ---- */}
//       <div className="chat-body">
//         {messages.map(renderMessage)}
//         {isPartnerTyping && <div className="typing-indicator">…typing</div>}
//         {uploadingImage && <div className="uploading-indicator">Uploading pic…</div>}
//         <div ref={messagesEndRef} />
//       </div>

//       {/* ---- Footer ---- */}
//       <div className="chat-footer">
//         <input
//           ref={messageInputRef}
//           value={message}
//           onChange={(e) => { setMessage(e.target.value); handleTyping(); }}
//           onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
//           placeholder="Type a sweet message..."
//         />
//         <button onClick={sendMessage}>Send</button>
//         <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} hidden />
//         <button onClick={() => fileInputRef.current?.click()}>Send Image</button>
//         <button onClick={requestPhoto}>Request Photo</button>
//       </div>

//       {/* ---- Image Modal ---- */}
//       {modalImage && (
//         <div className="modal" onClick={closeImageModal}>
//           <span onClick={closeImageModal}>&times;</span>
//           <img src={modalImage} alt="Full" onClick={(e) => e.stopPropagation()} />
//         </div>
//       )}
//     </div>
//   );
// };

// export default ChatScreen;