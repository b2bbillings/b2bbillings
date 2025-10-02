// ================================
// 👥 TEAM CHAT SERVICE
// ================================

import axios from "axios";
import { io } from "socket.io-client";
import apiConfig from "../config/api.js";

class TeamChatService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.eventListeners = new Map();
    this.activeChats = new Map();
    this.baseURL = `${apiConfig.baseURL}/api/team-chats`;
    
    // Initialize socket connection
    this.initializeSocket();
  }

  // ================================
  // 🌐 INTERNAL API HELPERS
  // ================================

  async apiRequest(method, url, data = null, config = {}) {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    
    const axiosConfig = {
      method,
      url: url.startsWith('http') ? url : `${apiConfig.baseURL}/api${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...config.headers,
      },
      timeout: 30000,
      ...config,
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      axiosConfig.data = data;
    }

    if (data && method === 'GET') {
      axiosConfig.params = data;
    }

    try {
      const response = await axios(axiosConfig);
      return response.data;
    } catch (error) {
      console.error(`API ${method} ${url} error:`, error);
      throw error;
    }
  }

  async get(url, params = null) {
    return this.apiRequest('GET', url, params);
  }

  async post(url, data = null) {
    return this.apiRequest('POST', url, data);
  }

  async put(url, data = null) {
    return this.apiRequest('PUT', url, data);
  }

  async delete(url) {
    return this.apiRequest('DELETE', url);
  }

  // ================================
  // 🔌 SOCKET CONNECTION MANAGEMENT
  // ================================

  initializeSocket() {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    
    if (!token) {
      console.warn("No authentication token found for team chat");
      return;
    }

    try {
      // Get socket URL from API config
      const socketURL = apiConfig.baseURL;
      
      console.log("🔌 Initializing team chat socket connection...");
      
      this.socket = io(socketURL, {
        auth: { token },
        extraHeaders: {
          Authorization: `Bearer ${token}`,
        },
        transports: ["websocket", "polling"],
        timeout: 30000,
        forceNew: false,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 15000,
      });

      this.setupSocketListeners();
    } catch (error) {
      console.error("❌ Team chat socket initialization failed:", error);
    }
  }

  setupSocketListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on("connect", () => {
      console.log("✅ Team chat socket connected");
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit("connection_status", { connected: true });
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Team chat socket disconnected:", reason);
      this.isConnected = false;
      this.emit("connection_status", { connected: false, reason });
    });

    this.socket.on("connect_error", (error) => {
      console.error("❌ Team chat socket connection error:", error);
      this.isConnected = false;
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error("❌ Max reconnection attempts reached");
        this.emit("connection_failed", { error: error.message });
      }
    });

    // Team chat events
    this.socket.on("new_team_message", (data) => {
      console.log("📩 New team message received:", data);
      this.emit("new_message", data);
    });

    this.socket.on("team_message_sent", (data) => {
      console.log("✅ Team message sent confirmation:", data);
      this.emit("message_sent", data);
    });

    this.socket.on("team_message_failed", (data) => {
      console.error("❌ Team message failed:", data);
      this.emit("message_failed", data);
    });

    this.socket.on("user_joined_team_chat", (data) => {
      console.log("👋 User joined team chat:", data);
      this.emit("user_joined", data);
    });

    this.socket.on("user_left_team_chat", (data) => {
      console.log("👋 User left team chat:", data);
      this.emit("user_left", data);
    });

    this.socket.on("team_user_typing", (data) => {
      this.emit("user_typing", data);
    });

    this.socket.on("team_messages_read", (data) => {
      this.emit("messages_read", data);
    });

    this.socket.on("team_message_deleted_for_everyone", (data) => {
      this.emit("message_deleted", data);
    });

    this.socket.on("error", (error) => {
      console.error("❌ Team chat socket error:", error);
      this.emit("error", error);
    });
  }

  // ================================
  // 🗨️ CHAT MANAGEMENT
  // ================================

  /**
   * Get all team chats for the current user
   */
  async getUserChats() {
    try {
      const response = await this.get('/team-chats');
      return {
        success: true,
        chats: response.data?.data || [],
        count: response.data?.count || 0,
      };
    } catch (error) {
      console.error('Error fetching user chats:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch chats',
        chats: [],
      };
    }
  }

  /**
   * Create or get direct chat with a party/contact
   */
  async createOrGetDirectChat(partyData) {
    try {
      // First try to find existing chat with this party
      const chatName = `Chat with ${partyData.name}`;
      
      const chatData = {
        name: chatName,
        type: "direct",
        participants: [partyData._id || partyData.id], // The other party
        description: `Direct chat with ${partyData.name}`,
      };

      const response = await this.post('/team-chats', chatData);
      return {
        success: true,
        chat: response.data?.data,
        message: response.data?.message || 'Chat created successfully',
      };
    } catch (error) {
      console.error('Error creating/getting direct chat:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create chat',
      };
    }
  }

  /**
   * Join a team chat room for real-time updates
   */
  joinChat(chatId) {
    if (!this.socket || !this.isConnected) {
      console.warn("Socket not connected, cannot join chat");
      return false;
    }

    console.log(`🔗 Joining team chat: ${chatId}`);
    this.socket.emit("join_team_chat", { chatId });
    this.activeChats.set(chatId, true);
    return true;
  }

  /**
   * Leave a team chat room
   */
  leaveChat(chatId) {
    if (!this.socket) return;

    console.log(`👋 Leaving team chat: ${chatId}`);
    this.socket.emit("leave_team_chat", { chatId });
    this.activeChats.delete(chatId);
  }

  /**
   * Send a message to team chat
   */
  async sendMessage(chatId, content, options = {}) {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // First try socket for real-time delivery
      if (this.socket && this.isConnected) {
        console.log(`📤 Sending team message via socket to chat: ${chatId}`);
        
        this.socket.emit("send_team_message", {
          chatId,
          content,
          type: options.type || "text",
          tempId,
          attachments: options.attachments || [],
          replyTo: options.replyTo,
        });

        // Return immediately with temp data for optimistic updates
        return {
          success: true,
          message: {
            _id: tempId,
            content: { text: content, type: options.type || "text" },
            tempId,
            status: "sending",
          },
          isOptimistic: true,
        };
      } else {
        // Fallback to HTTP API
        console.log(`📤 Sending team message via API to chat: ${chatId}`);
        
        const response = await this.post(`/team-chats/${chatId}/messages`, {
          content,
          type: options.type || "text",
          attachments: options.attachments || [],
          replyTo: options.replyTo,
        });

        return {
          success: true,
          message: response.data?.data,
        };
      }
    } catch (error) {
      console.error('Error sending team message:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to send message',
        tempId,
      };
    }
  }

  /**
   * Get chat messages with pagination
   */
  async getChatMessages(chatId, page = 1, limit = 50) {
    try {
      const response = await this.get(`/team-chats/${chatId}/messages`, { page, limit });
      
      return {
        success: true,
        messages: response.data?.data?.messages || [],
        pagination: response.data?.data?.pagination || {},
      };
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch messages',
        messages: [],
      };
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(chatId, messageIds = []) {
    try {
      // Try socket first for real-time update
      if (this.socket && this.isConnected) {
        this.socket.emit("mark_team_messages_read", { chatId, messageIds });
      }

      // Also call API to ensure server state is updated
      const response = await this.post(`/team-chats/${chatId}/read`, {
        messageIds
      });
      
      return {
        success: true,
        markedCount: response.data?.markedCount || 0,
      };
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to mark messages as read',
      };
    }
  }

  /**
   * Delete chat for current user
   */
  async deleteChatForMe(chatId) {
    try {
      await this.delete(`/team-chats/${chatId}/delete-for-me`);
      this.leaveChat(chatId);
      
      return {
        success: true,
        message: 'Chat deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting chat:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete chat',
      };
    }
  }

  /**
   * Start typing indicator
   */
  startTyping(chatId) {
    if (this.socket && this.isConnected) {
      this.socket.emit("team_typing_start", { chatId });
    }
  }

  /**
   * Stop typing indicator
   */
  stopTyping(chatId) {
    if (this.socket && this.isConnected) {
      this.socket.emit("team_typing_stop", { chatId });
    }
  }

  // ================================
  // 📡 EVENT MANAGEMENT
  // ================================

  /**
   * Add event listener
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
    }
  }

  /**
   * Emit event to all listeners
   */
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // ================================
  // 🔧 UTILITY METHODS
  // ================================

  /**
   * Check if socket is connected
   */
  isSocketConnected() {
    return this.socket && this.isConnected;
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Manually reconnect socket
   */
  reconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.connect();
    } else {
      this.initializeSocket();
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.socket) {
      // Leave all active chats
      this.activeChats.forEach((_, chatId) => {
        this.leaveChat(chatId);
      });
      
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.eventListeners.clear();
    this.activeChats.clear();
  }
}

// Create and export a singleton instance
export const teamChatService = new TeamChatService();
export default teamChatService;
