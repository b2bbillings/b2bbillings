import React, { useState, useEffect, useRef } from 'react';
import { teamChatService } from '../../services/teamChatService';
import { socketService } from '../../services/socketService';
import { profileService } from '../../services/profileService';
import './TeamChatDemo.css';

// ================================
// 💬 TEAM CHAT DEMO COMPONENT
// ================================

const TeamChatDemo = () => {
  // ===== STATE MANAGEMENT =====
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ===== REFS =====
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // ================================
  // 🚀 INITIALIZATION
  // ================================

  useEffect(() => {
    initializeChat();
    return () => {
      socketService.disconnect();
    };
  }, []);

  const initializeChat = async () => {
    try {
      setLoading(true);

      // Get current user profile
      const profileResult = await profileService.getUserProfile();
      if (profileResult.success) {
        setCurrentUser(profileResult.profile);
      }

      // Initialize socket connection
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      
      if (token && userId) {
        socketService.connect(userId, token);
        setupSocketListeners();
      }

      // Load user chats
      await loadUserChats();

      setLoading(false);
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      setError('Failed to initialize chat system');
      setLoading(false);
    }
  };

  // ================================
  // 🔌 SOCKET EVENT HANDLERS
  // ================================

  const setupSocketListeners = () => {
    // New message received
    socketService.on('team_chat_message', (data) => {
      console.log('New team chat message:', data);
      if (data.chatId === activeChat?._id) {
        setMessages(prev => [...prev, data.message]);
        scrollToBottom();
      }
      // Update chat list with new message
      updateChatInList(data.chatId, data.message);
    });

    // User typing events
    socketService.on('team_chat_typing', (data) => {
      if (data.chatId === activeChat?._id && data.userId !== currentUser?._id) {
        setTypingUsers(prev => {
          if (!prev.find(user => user.userId === data.userId)) {
            return [...prev, { userId: data.userId, name: data.userName }];
          }
          return prev;
        });
      }
    });

    socketService.on('team_chat_typing_stop', (data) => {
      if (data.chatId === activeChat?._id) {
        setTypingUsers(prev => prev.filter(user => user.userId !== data.userId));
      }
    });

    // User presence events
    socketService.on('user_online', (data) => {
      setOnlineUsers(prev => {
        if (!prev.includes(data.userId)) {
          return [...prev, data.userId];
        }
        return prev;
      });
    });

    socketService.on('user_offline', (data) => {
      setOnlineUsers(prev => prev.filter(id => id !== data.userId));
    });

    // Chat management events
    socketService.on('chat_created', (data) => {
      console.log('New chat created:', data);
      loadUserChats(); // Refresh chat list
    });

    socketService.on('user_joined_chat', (data) => {
      if (data.chatId === activeChat?._id) {
        console.log('User joined chat:', data);
        // Refresh active chat details
        loadChatMessages(activeChat._id);
      }
    });
  };

  // ================================
  // 📊 DATA LOADING
  // ================================

  const loadUserChats = async () => {
    try {
      const result = await teamChatService.getUserChats();
      if (result.success) {
        setChats(result.chats);
        
        // Auto-select first chat if available
        if (result.chats.length > 0 && !activeChat) {
          selectChat(result.chats[0]);
        }
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
      setError('Failed to load chats');
    }
  };

  const loadChatMessages = async (chatId) => {
    try {
      const result = await teamChatService.getChatMessages(chatId);
      if (result.success) {
        setMessages(result.messages);
        scrollToBottom();
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      setError('Failed to load messages');
    }
  };

  // ================================
  // 💬 CHAT ACTIONS
  // ================================

  const selectChat = async (chat) => {
    if (activeChat) {
      socketService.leaveChat(activeChat._id);
    }

    setActiveChat(chat);
    setMessages([]);
    setTypingUsers([]);

    // Join new chat room
    socketService.joinChat(chat._id);

    // Load messages
    await loadChatMessages(chat._id);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat) return;

    try {
      const result = await teamChatService.sendMessage(activeChat._id, {
        type: 'text',
        text: newMessage.trim()
      });

      if (result.success) {
        setNewMessage('');
        stopTyping();
        // Message will be added via socket event
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message');
    }
  };

  const startTyping = () => {
    if (!isTyping && activeChat) {
      setIsTyping(true);
      socketService.startTyping(activeChat._id);
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  };

  const stopTyping = () => {
    if (isTyping && activeChat) {
      setIsTyping(false);
      socketService.stopTyping(activeChat._id);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else {
      startTyping();
    }
  };

  // ================================
  // 🔧 UTILITY FUNCTIONS
  // ================================

  const updateChatInList = (chatId, newMessage) => {
    setChats(prev => prev.map(chat => {
      if (chat._id === chatId) {
        return {
          ...chat,
          lastMessage: newMessage,
          updatedAt: new Date().toISOString()
        };
      }
      return chat;
    }));
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getUserStatus = (userId) => {
    return onlineUsers.includes(userId) ? 'online' : 'offline';
  };

  // ================================
  // 🎨 RENDER COMPONENT
  // ================================

  if (loading) {
    return (
      <div className="team-chat-demo loading">
        <div className="loading-spinner">Loading chat...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="team-chat-demo error">
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="team-chat-demo">
      <div className="chat-container">
        
        {/* ===== CHAT LIST ===== */}
        <div className="chat-list">
          <div className="chat-list-header">
            <h3>Team Chats</h3>
            <div className="online-status">
              <span className="status-indicator online"></span>
              <span>Online</span>
            </div>
          </div>

          <div className="chat-items">
            {chats.map(chat => (
              <div
                key={chat._id}
                className={`chat-item ${activeChat?._id === chat._id ? 'active' : ''}`}
                onClick={() => selectChat(chat)}
              >
                <div className="chat-avatar">
                  <img 
                    src={teamChatService.getChatAvatar(chat)} 
                    alt={teamChatService.getChatDisplayName(chat)}
                  />
                  {chat.type === 'direct' && (
                    <span className={`status-dot ${getUserStatus(chat.participants[0])}`}></span>
                  )}
                </div>
                
                <div className="chat-info">
                  <div className="chat-name">
                    {teamChatService.getChatDisplayName(chat)}
                  </div>
                  <div className="last-message">
                    {chat.lastMessage?.content?.text || 'No messages yet'}
                  </div>
                </div>
                
                <div className="chat-meta">
                  <div className="time">
                    {teamChatService.getRelativeTime(chat.updatedAt)}
                  </div>
                  {chat.unreadCount > 0 && (
                    <div className="unread-badge">{chat.unreadCount}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== CHAT WINDOW ===== */}
        <div className="chat-window">
          {activeChat ? (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <div className="chat-info">
                  <img 
                    src={teamChatService.getChatAvatar(activeChat)} 
                    alt={teamChatService.getChatDisplayName(activeChat)}
                    className="chat-avatar"
                  />
                  <div>
                    <h4>{teamChatService.getChatDisplayName(activeChat)}</h4>
                    <p className="participants-count">
                      {activeChat.participants.length} participant(s)
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="messages-area">
                {messages.map(message => (
                  <div
                    key={message._id}
                    className={`message ${message.sender._id === currentUser?._id ? 'own' : 'other'}`}
                  >
                    <div className="message-content">
                      {message.sender._id !== currentUser?._id && (
                        <div className="sender-name">{message.sender.name}</div>
                      )}
                      <div className="message-text">{message.content.text}</div>
                      <div className="message-time">{formatTime(message.timestamp)}</div>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {typingUsers.length > 0 && (
                  <div className="typing-indicator">
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span className="typing-text">
                      {typingUsers.map(user => user.name).join(', ')} 
                      {typingUsers.length === 1 ? ' is' : ' are'} typing...
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="message-input-area">
                <div className="input-container">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    rows="1"
                    className="message-input"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="send-button"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="no-chat-selected">
              <h3>Select a chat to start messaging</h3>
              <p>Choose a chat from the left panel to view messages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamChatDemo;