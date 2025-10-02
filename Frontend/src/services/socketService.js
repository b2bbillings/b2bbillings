import { io } from 'socket.io-client';

// ================================
// 🔌 SOCKET SERVICE
// ================================

class SocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 1000;
    this.eventCallbacks = new Map();
  }

  // ================================
  // 🔗 CONNECTION MANAGEMENT
  // ================================

  /**
   * Initialize socket connection
   */
  connect(userId, token) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    try {
      this.socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
        auth: {
          token,
          userId,
        },
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectInterval,
        timeout: 10000,
      });

      this.setupConnectionEvents();
      this.setupChatEvents();
      this.setupErrorHandling();

      console.log('Socket connection initiated');
    } catch (error) {
      console.error('Socket connection error:', error);
    }
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.eventCallbacks.clear();
      console.log('Socket disconnected');
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected() {
    return this.socket?.connected || false;
  }

  // ================================
  // 📡 EVENT SETUP
  // ================================

  /**
   * Setup connection events
   */
  setupConnectionEvents() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.reconnectAttempts = 0;
      this.emit('socket_connected', { socketId: this.socket.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.emit('socket_disconnected', { reason });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.emit('socket_reconnected', { attemptNumber });
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
      this.reconnectAttempts++;
      this.emit('socket_reconnect_error', { error, attempts: this.reconnectAttempts });
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
      this.emit('socket_reconnect_failed');
    });
  }

  /**
   * Setup chat events
   */
  setupChatEvents() {
    if (!this.socket) return;

    // ===== MESSAGE EVENTS =====
    this.socket.on('new_message', (data) => {
      console.log('New message received:', data);
      this.emit('new_message', data);
    });

    this.socket.on('team_chat_message', (data) => {
      console.log('Team chat message received:', data);
      this.emit('team_chat_message', data);
    });

    this.socket.on('message_delivered', (data) => {
      console.log('Message delivered:', data);
      this.emit('message_delivered', data);
    });

    this.socket.on('message_read', (data) => {
      console.log('Message read:', data);
      this.emit('message_read', data);
    });

    // ===== TYPING EVENTS =====
    this.socket.on('user_typing', (data) => {
      console.log('User typing:', data);
      this.emit('user_typing', data);
    });

    this.socket.on('team_chat_typing', (data) => {
      console.log('Team chat typing:', data);
      this.emit('team_chat_typing', data);
    });

    this.socket.on('user_stopped_typing', (data) => {
      console.log('User stopped typing:', data);
      this.emit('user_stopped_typing', data);
    });

    this.socket.on('team_chat_typing_stop', (data) => {
      console.log('Team chat typing stopped:', data);
      this.emit('team_chat_typing_stop', data);
    });

    // ===== PRESENCE EVENTS =====
    this.socket.on('user_online', (data) => {
      console.log('User online:', data);
      this.emit('user_online', data);
    });

    this.socket.on('user_offline', (data) => {
      console.log('User offline:', data);
      this.emit('user_offline', data);
    });

    this.socket.on('user_status_change', (data) => {
      console.log('User status changed:', data);
      this.emit('user_status_change', data);
    });

    // ===== CHAT MANAGEMENT EVENTS =====
    this.socket.on('chat_created', (data) => {
      console.log('Chat created:', data);
      this.emit('chat_created', data);
    });

    this.socket.on('user_joined_chat', (data) => {
      console.log('User joined chat:', data);
      this.emit('user_joined_chat', data);
    });

    this.socket.on('user_left_chat', (data) => {
      console.log('User left chat:', data);
      this.emit('user_left_chat', data);
    });

    this.socket.on('chat_updated', (data) => {
      console.log('Chat updated:', data);
      this.emit('chat_updated', data);
    });

    // ===== NOTIFICATION EVENTS =====
    this.socket.on('notification', (data) => {
      console.log('Notification received:', data);
      this.emit('notification', data);
    });
  }

  /**
   * Setup error handling
   */
  setupErrorHandling() {
    if (!this.socket) return;

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.emit('socket_error', { error });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.emit('socket_connect_error', { error });
    });
  }

  // ================================
  // 💬 CHAT ACTIONS
  // ================================

  /**
   * Join a chat room
   */
  joinChat(chatId, chatType = 'team') {
    if (!this.socket?.connected) {
      console.warn('Socket not connected');
      return;
    }

    const event = chatType === 'team' ? 'join_team_chat' : 'join_chat';
    this.socket.emit(event, { chatId });
    console.log(`Joined ${chatType} chat:`, chatId);
  }

  /**
   * Leave a chat room
   */
  leaveChat(chatId, chatType = 'team') {
    if (!this.socket?.connected) {
      console.warn('Socket not connected');
      return;
    }

    const event = chatType === 'team' ? 'leave_team_chat' : 'leave_chat';
    this.socket.emit(event, { chatId });
    console.log(`Left ${chatType} chat:`, chatId);
  }

  /**
   * Send typing indicator
   */
  startTyping(chatId, chatType = 'team') {
    if (!this.socket?.connected) return;

    const event = chatType === 'team' ? 'team_chat_typing_start' : 'start_typing';
    this.socket.emit(event, { chatId });
  }

  /**
   * Stop typing indicator
   */
  stopTyping(chatId, chatType = 'team') {
    if (!this.socket?.connected) return;

    const event = chatType === 'team' ? 'team_chat_typing_stop' : 'stop_typing';
    this.socket.emit(event, { chatId });
  }

  /**
   * Mark message as read
   */
  markMessageAsRead(messageId, chatId) {
    if (!this.socket?.connected) return;

    this.socket.emit('mark_message_read', { messageId, chatId });
  }

  /**
   * Send message read receipt
   */
  sendReadReceipt(messageId, chatId) {
    if (!this.socket?.connected) return;

    this.socket.emit('message_read_receipt', { messageId, chatId });
  }

  // ================================
  // 👥 PRESENCE MANAGEMENT
  // ================================

  /**
   * Update user status
   */
  updateUserStatus(status, statusMessage = '') {
    if (!this.socket?.connected) return;

    this.socket.emit('update_status', { status, statusMessage });
    console.log('Updated user status:', status);
  }

  /**
   * Set user as online
   */
  setOnline() {
    if (!this.socket?.connected) return;

    this.socket.emit('user_online');
    console.log('Set user online');
  }

  /**
   * Set user as offline
   */
  setOffline() {
    if (!this.socket?.connected) return;

    this.socket.emit('user_offline');
    console.log('Set user offline');
  }

  // ================================
  // 📢 EVENT HANDLING
  // ================================

  /**
   * Subscribe to an event
   */
  on(event, callback) {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, new Set());
    }
    this.eventCallbacks.get(event).add(callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(event, callback) {
    if (this.eventCallbacks.has(event)) {
      this.eventCallbacks.get(event).delete(callback);
    }
  }

  /**
   * Emit event to all subscribers
   */
  emit(event, data) {
    if (this.eventCallbacks.has(event)) {
      this.eventCallbacks.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event callback for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Subscribe to event once
   */
  once(event, callback) {
    const onceCallback = (data) => {
      callback(data);
      this.off(event, onceCallback);
    };
    this.on(event, onceCallback);
  }

  // ================================
  // 🔧 UTILITY METHODS
  // ================================

  /**
   * Get socket ID
   */
  getSocketId() {
    return this.socket?.id || null;
  }

  /**
   * Get connection state
   */
  getConnectionState() {
    if (!this.socket) return 'disconnected';
    
    if (this.socket.connected) return 'connected';
    if (this.socket.connecting) return 'connecting';
    return 'disconnected';
  }

  /**
   * Send custom event
   */
  sendEvent(event, data) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot send event:', event);
      return;
    }

    this.socket.emit(event, data);
    console.log('Sent event:', event, data);
  }

  /**
   * Listen for custom event
   */
  listenForEvent(event, callback) {
    if (!this.socket) {
      console.warn('Socket not initialized');
      return;
    }

    this.socket.on(event, callback);
  }

  /**
   * Stop listening for custom event
   */
  stopListening(event, callback) {
    if (!this.socket) return;

    if (callback) {
      this.socket.off(event, callback);
    } else {
      this.socket.off(event);
    }
  }

  /**
   * Get reconnection status
   */
  getReconnectionStatus() {
    return {
      attempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      isReconnecting: this.socket?.connecting || false,
    };
  }

  /**
   * Force reconnection
   */
  forceReconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.connect();
    }
  }
}

// Create and export a singleton instance
export const socketService = new SocketService();
export default socketService;