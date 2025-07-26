import axios from "axios";
import {io} from "socket.io-client";

const API_BASE_URL = "http://localhost:5000";

const chatAPI = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

chatAPI.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const currentCompany = localStorage.getItem("currentCompany");
    if (currentCompany) {
      try {
        const company = JSON.parse(currentCompany);
        const companyId = company.id || company._id || company.companyId;
        if (companyId) {
          config.headers["X-Company-ID"] = companyId;
        }
      } catch (e) {
        // Silent fail
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

chatAPI.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      localStorage.removeItem("authToken");
      sessionStorage.removeItem("authToken");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

class ChatService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.eventListeners = new Map();
    this.currentChatRoom = null;
    this.currentCompanyId = null;
    this.currentCompanyName = null;
    this.messageCache = new Map();
    this.conversationCache = new Map();
    this.isTyping = false;
    this.typingTimeout = null;
  }

  setCompanyContext(companyId, companyName = null) {
    this.currentCompanyId = companyId;
    this.currentCompanyName = companyName;
    this.clearCache();
  }

  autoSetCompanyContext() {
    try {
      const currentCompany = localStorage.getItem("currentCompany");
      if (currentCompany) {
        const company = JSON.parse(currentCompany);
        const companyId = company.id || company._id || company.companyId;
        const companyName =
          company.businessName || company.name || company.companyName;

        if (companyId) {
          this.setCompanyContext(companyId, companyName);
          return true;
        }
      }
    } catch (error) {
      // Silent fail
    }
    return false;
  }

  extractTargetCompanyId(partyData) {
    if (!partyData) {
      return null;
    }

    const targetCompanyId =
      partyData.linkedCompanyId?._id ||
      partyData.linkedCompanyId ||
      partyData.externalCompanyId ||
      partyData.companyId?._id ||
      partyData.companyId ||
      partyData.targetCompanyId ||
      partyData.company?._id ||
      partyData.company?.id;

    if (!targetCompanyId) {
      return null;
    }

    const companyIdString = targetCompanyId.toString
      ? targetCompanyId.toString()
      : targetCompanyId;

    return companyIdString;
  }

  validateAndExtractPartyCompanyData(partyData) {
    if (!partyData) {
      throw new Error("Party data is required");
    }

    const targetCompanyId = this.extractTargetCompanyId(partyData);

    if (!targetCompanyId) {
      throw new Error(
        "No linked company found for this party. Please ensure the party has a linkedCompanyId or externalCompanyId."
      );
    }

    return {
      partyId: partyData._id || partyData.id,
      partyName: partyData.name || partyData.companyName,
      targetCompanyId,
      isExternalCompany: partyData.isExternalCompany || false,
    };
  }

  clearCache() {
    this.messageCache.clear();
    this.conversationCache.clear();
  }

  getFromCache(key, cacheType = "message") {
    const cache =
      cacheType === "message" ? this.messageCache : this.conversationCache;
    const cachedData = cache.get(key);

    if (cachedData && cachedData.timestamp > Date.now() - 60000) {
      return cachedData.data;
    }

    cache.delete(key);
    return null;
  }

  setCache(key, data, cacheType = "message") {
    const cache =
      cacheType === "message" ? this.messageCache : this.conversationCache;
    cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  initializeSocket() {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    if (!token) {
      console.warn("No authentication token found for socket connection");
      return null;
    }

    try {
      if (this.socket) {
        this.socket.disconnect();
      }

      console.log("🔌 Initializing socket connection...");

      this.socket = io(API_BASE_URL, {
        auth: {
          token: token,
        },
        extraHeaders: {
          Authorization: `Bearer ${token}`,
        },
        transports: ["websocket", "polling"],
        timeout: 20000,
        forceNew: true,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
      });

      this.setupSocketListeners();
      return this.socket;
    } catch (error) {
      console.error("Socket initialization error:", error);
      return null;
    }
  }

  // ✅ FIXED: Setup socket listeners to match backend events exactly
  setupSocketListeners() {
    if (!this.socket) return;

    console.log("🎧 Setting up socket event listeners...");

    this.socket.on("connect", () => {
      console.log("🔌 Socket connected:", this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.notifyListeners("socket_connected", {socketId: this.socket.id});
    });

    // ✅ FIX: Handle backend connection confirmation event
    this.socket.on("connection_confirmed", (data) => {
      console.log("✅ Socket authenticated:", data);
      this.isConnected = true;
      this.currentCompanyId = data.companyId;
      this.currentCompanyName = data.companyName;
      this.notifyListeners("socket_authenticated", data);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      this.isConnected = false;
      this.notifyListeners("socket_disconnected", {reason});
    });

    this.socket.on("connect_error", (error) => {
      console.error("🚫 Socket connection error:", error);

      if (
        error.message === "Authentication failed" ||
        error.message === "Not authenticated"
      ) {
        console.warn("Authentication failed, clearing tokens");
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        this.notifyListeners("auth_failed", {error: error.message});
        return;
      }

      this.handleReconnect();
    });

    // ✅ FIX: Handle backend message events
    this.socket.on("new_message", (message) => {
      console.log("📨 New message received:", message);
      if (message.id || message._id) {
        this.setCache(message.id || message._id, message, "message");
      }
      this.notifyListeners("new_message", message);
    });

    // ✅ FIX: Handle backend typing events
    this.socket.on("user_typing", (data) => {
      console.log("⌨️ User typing:", data);
      this.notifyListeners("user_typing", data);
    });

    // ✅ FIX: Handle backend chat room events with correct event names
    this.socket.on("joined_company_chat", (data) => {
      console.log("💬 Joined company chat:", data);
      this.currentChatRoom = data.chatRoom;
      this.notifyListeners("joined_chat", data);
    });

    this.socket.on("user_joined_chat", (data) => {
      console.log("👤 User joined chat:", data);
      this.notifyListeners("user_joined_chat", data);
    });

    this.socket.on("user_left_chat", (data) => {
      console.log("👋 User left chat:", data);
      this.notifyListeners("user_left_chat", data);
    });

    // ✅ FIX: Handle backend user status events
    this.socket.on("user_online", (data) => {
      console.log("🟢 User online:", data);
      this.notifyListeners("user_online", data);
    });

    this.socket.on("user_offline", (data) => {
      console.log("🔴 User offline:", data);
      this.notifyListeners("user_offline", data);
    });

    // ✅ NEW: Handle backend message confirmations
    this.socket.on("message_sent_confirmation", (data) => {
      console.log("✅ Message sent confirmation:", data);
      this.notifyListeners("message_sent", data);
    });

    this.socket.on("new_message_notification", (data) => {
      console.log("🔔 New message notification:", data);
      this.notifyListeners("message_notification", data);
    });

    this.socket.on("message_read_status", (data) => {
      console.log("👁️ Message read status:", data);
      this.notifyListeners("message_read", data);
    });

    this.socket.on("user_status_changed", (data) => {
      console.log("🔄 User status changed:", data);
      this.notifyListeners("user_status_changed", data);
    });

    this.socket.on("error", (error) => {
      console.error("🚨 Socket error:", error);
      this.notifyListeners("socket_error", error);
    });
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;

      console.log(
        `🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      setTimeout(() => {
        if (this.socket) {
          this.socket.connect();
        }
      }, delay);
    } else {
      console.error("❌ Max reconnect attempts reached");
      this.notifyListeners("max_reconnect_attempts_reached");
    }
  }

  // ✅ FIXED: Join chat using correct backend event name and payload
  async joinChat(partyData) {
    if (!this.socket || !this.isConnected) {
      console.warn("Socket not connected, returning mock success");
      return {success: true, mock: true};
    }

    try {
      const {partyId, partyName, targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);

      console.log("🚀 Joining company chat:", {
        partyId,
        partyName,
        targetCompanyId,
      });

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Join chat timeout"));
        }, 10000);

        // ✅ FIX: Listen for correct backend event
        this.socket.once("joined_company_chat", (response) => {
          clearTimeout(timeout);
          this.currentChatRoom = response.chatRoom;
          console.log("✅ Successfully joined chat room:", response.chatRoom);
          resolve(response);
        });

        this.socket.once("error", (error) => {
          clearTimeout(timeout);
          console.error("❌ Failed to join chat:", error);
          reject(new Error(error.message || "Failed to join chat"));
        });

        // ✅ FIX: Use correct event name and payload structure
        this.socket.emit("join_company_chat", {
          otherCompanyId: targetCompanyId, // ✅ Backend expects this field name
        });
      });
    } catch (error) {
      console.error("Join chat error:", error);
      throw error;
    }
  }

  // ✅ FIXED: Leave chat using correct backend event
  async leaveChat(partyData) {
    if (!this.socket || !this.isConnected) {
      console.warn("Socket not connected, returning mock success");
      return {success: true, mock: true};
    }

    try {
      if (partyData) {
        const {partyId, partyName, targetCompanyId} =
          this.validateAndExtractPartyCompanyData(partyData);

        console.log("👋 Leaving company chat:", {
          partyId,
          partyName,
          targetCompanyId,
        });

        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Leave chat timeout"));
          }, 5000);

          this.socket.once("user_left_chat", (response) => {
            clearTimeout(timeout);
            this.currentChatRoom = null;
            console.log("✅ Successfully left chat");
            resolve(response);
          });

          this.socket.once("error", (error) => {
            clearTimeout(timeout);
            console.error("❌ Failed to leave chat:", error);
            reject(new Error(error.message || "Failed to leave chat"));
          });

          // ✅ FIX: Use correct event name and payload
          this.socket.emit("leave_company_chat", {
            otherCompanyId: targetCompanyId,
          });
        });
      } else {
        console.log("👋 Leaving all chats");
        this.socket.emit("leave_company_chat");
        this.currentChatRoom = null;
        return {success: true};
      }
    } catch (error) {
      console.error("Leave chat error:", error);
      throw error;
    }
  }

  // ✅ FIXED: Send socket message with company_message event
  sendSocketMessage(
    partyData,
    content,
    messageType = "whatsapp",
    attachments = []
  ) {
    if (!this.socket?.connected && !this.isConnected) {
      console.warn("Socket not connected for message sending");
      return null;
    }

    try {
      const {partyId, partyName, targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);

      const contentValidation = this.validateMessageContent(content);
      if (!contentValidation.valid) {
        throw new Error(contentValidation.message);
      }

      const messageData = {
        content,
        messageType,
        attachments,
        timestamp: new Date().toISOString(),
        tempId: Date.now().toString(),
        toCompany: targetCompanyId,
        type: "company",
        // Add party context for reference
        partyId,
        partyName,
      };

      console.log("📤 Sending socket message:", messageData);

      // ✅ FIX: Use company_message event (you'll need to add this to backend)
      if (this.socket?.connected) {
        this.socket.emit("company_message", messageData);
      }

      return messageData;
    } catch (error) {
      console.error("Send socket message error:", error);
      throw error;
    }
  }

  // ✅ FIXED: Typing events with correct backend event names
  startTyping(partyData) {
    if (!this.socket || !this.isConnected || this.isTyping) {
      return;
    }

    try {
      const {partyId, partyName, targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);

      console.log("⌨️ Starting typing indicator for:", targetCompanyId);

      this.isTyping = true;

      // ✅ FIX: Use correct event name and payload
      this.socket.emit("typing_start", {
        otherCompanyId: targetCompanyId, // ✅ Backend expects this field
      });

      this.typingTimeout = setTimeout(() => {
        this.stopTyping(partyData);
      }, 5000);
    } catch (error) {
      console.error("Start typing error:", error);
      // Silent fail
    }
  }

  stopTyping(partyData) {
    if (!this.socket || !this.isConnected || !this.isTyping) {
      return;
    }

    try {
      const {partyId, partyName, targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);

      console.log("⏹️ Stopping typing indicator for:", targetCompanyId);

      this.isTyping = false;

      // ✅ FIX: Use correct event name and payload
      this.socket.emit("typing_stop", {
        otherCompanyId: targetCompanyId, // ✅ Backend expects this field
      });

      if (this.typingTimeout) {
        clearTimeout(this.typingTimeout);
        this.typingTimeout = null;
      }
    } catch (error) {
      console.error("Stop typing error:", error);
      // Silent fail
    }
  }

  // ✅ FIXED: Mark message as read
  markMessageAsRead(messageId, partyData) {
    if (!this.socket || !this.isConnected) {
      return;
    }

    try {
      const {targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);

      console.log("👁️ Marking message as read:", messageId);

      this.socket.emit("message_read", {
        messageId,
        otherCompanyId: targetCompanyId,
      });
    } catch (error) {
      console.error("Mark message read error:", error);
      // Silent fail
    }
  }

  // ✅ FIXED: Update user status
  updateUserStatus(status) {
    if (!this.socket || !this.isConnected) {
      return;
    }

    try {
      console.log("🔄 Updating user status:", status);

      this.socket.emit("status_update", {
        status,
      });
    } catch (error) {
      console.error("Update status error:", error);
      // Silent fail
    }
  }

  // ✅ HTTP API METHODS

  async getConversationSummary(partyData) {
    try {
      const {partyId, partyName, targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);

      const cacheKey = `summary_${targetCompanyId}`;
      const cachedSummary = this.getFromCache(cacheKey, "conversation");
      if (cachedSummary) {
        return cachedSummary;
      }

      const response = await chatAPI.get(
        `/api/chat/summary/${targetCompanyId}`,
        {
          params: {
            type: "company",
            partyId,
            partyName,
          },
        }
      );

      this.setCache(cacheKey, response.data, "conversation");
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getMessageTemplates(partyData, category = null, messageType = null) {
    try {
      const {partyId, partyName, targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);

      const cacheKey = `templates_${targetCompanyId}_${category || ""}_${
        messageType || ""
      }`;
      const cachedTemplates = this.getFromCache(cacheKey, "conversation");
      if (cachedTemplates) {
        return cachedTemplates;
      }

      const response = await chatAPI.get(
        `/api/chat/templates/${targetCompanyId}`,
        {
          params: {
            category,
            messageType,
            type: "company",
            partyId,
            partyName,
          },
        }
      );

      this.setCache(cacheKey, response.data, "conversation");
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getChatParticipants(partyData) {
    try {
      const {partyId, partyName, targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);

      const cacheKey = `participants_${targetCompanyId}`;
      const cachedParticipants = this.getFromCache(cacheKey, "conversation");
      if (cachedParticipants) {
        return cachedParticipants;
      }

      const response = await chatAPI.get(
        `/api/chat/participants/${targetCompanyId}`,
        {
          params: {
            type: "company",
            partyId,
            partyName,
          },
        }
      );

      this.setCache(cacheKey, response.data, "conversation");
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getChatHistory(partyData, options = {}) {
    try {
      const {page = 1, limit = 50, messageType, startDate, endDate} = options;

      const {partyId, partyName, targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);

      if (!targetCompanyId || targetCompanyId.length !== 24) {
        throw new Error(
          `Invalid target company ID: ${targetCompanyId}. Expected 24-character MongoDB ObjectId.`
        );
      }

      if (!targetCompanyId.match(/^[0-9a-fA-F]{24}$/)) {
        throw new Error(
          `Invalid target company ID format: ${targetCompanyId}. Must be hexadecimal.`
        );
      }

      const cacheKey = `history_${targetCompanyId}_${page}_${limit}_${
        messageType || ""
      }_${startDate || ""}_${endDate || ""}`;
      const cachedHistory = this.getFromCache(cacheKey, "message");
      if (cachedHistory) {
        return cachedHistory;
      }

      const requestConfig = {
        params: {
          page,
          limit,
          messageType,
          startDate,
          endDate,
          type: "company",
          partyId,
          partyName,
        },
      };

      const response = await chatAPI.get(
        `/api/chat/history/${targetCompanyId}`,
        requestConfig
      );

      this.setCache(cacheKey, response.data, "message");
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async sendMessage(
    partyData,
    content,
    messageType = "whatsapp",
    attachments = []
  ) {
    try {
      const {partyId, partyName, targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);

      const contentValidation = this.validateMessageContent(content);
      if (!contentValidation.valid) {
        throw new Error(contentValidation.message);
      }

      console.log("📤 Sending HTTP message to:", targetCompanyId);

      const response = await chatAPI.post(`/api/chat/send/${targetCompanyId}`, {
        content,
        messageType,
        attachments,
        type: "company",
        partyId,
        partyName,
      });

      // Clear relevant caches
      this.clearHistoryCache(targetCompanyId);
      this.clearConversationCache();

      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ✅ NEW: Get conversations list
  async getConversations(options = {}) {
    try {
      const {page = 1, limit = 20, search, messageType} = options;

      const response = await chatAPI.get("/api/chat/conversations", {
        params: {
          page,
          limit,
          search,
          messageType,
          type: "company",
        },
      });

      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ✅ NEW: Get chat statistics
  async getChatStats(period = "30d") {
    try {
      const response = await chatAPI.get("/api/chat/stats", {
        params: {
          period,
          type: "company",
        },
      });

      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ✅ NEW: Search messages
  async searchMessages(query, options = {}) {
    try {
      const {
        partyId,
        messageType,
        page = 1,
        limit = 20,
        startDate,
        endDate,
      } = options;

      const response = await chatAPI.get("/api/chat/search", {
        params: {
          query,
          partyId,
          messageType,
          page,
          limit,
          startDate,
          endDate,
          type: "company",
        },
      });

      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ✅ NEW: Get unread count
  async getUnreadCount(partyData = null) {
    try {
      let partyId = null;

      if (partyData) {
        const {targetCompanyId} =
          this.validateAndExtractPartyCompanyData(partyData);
        partyId = targetCompanyId;
      }

      const response = await chatAPI.get("/api/chat/unread-count", {
        params: {
          partyId,
          type: "company",
        },
      });

      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ✅ NEW: Mark messages as read (HTTP)
  async markMessagesAsRead(messageIds) {
    try {
      if (!Array.isArray(messageIds) || messageIds.length === 0) {
        throw new Error("Message IDs array is required");
      }

      const response = await chatAPI.post("/api/chat/read", {
        messageIds,
      });

      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ✅ NEW: Delete messages
  async deleteMessages(messageIds) {
    try {
      if (!Array.isArray(messageIds) || messageIds.length === 0) {
        throw new Error("Message IDs array is required");
      }

      const response = await chatAPI.delete("/api/chat/messages", {
        data: {messageIds},
      });

      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ✅ NEW: Send template message
  async sendTemplateMessage(
    partyData,
    templateId,
    templateData = {},
    customContent = null
  ) {
    try {
      const {partyId, partyName, targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);

      const response = await chatAPI.post(
        `/api/chat/templates/${targetCompanyId}/${templateId}`,
        {
          templateData,
          customContent,
          type: "company",
          partyId,
          partyName,
        }
      );

      // Clear relevant caches
      this.clearHistoryCache(targetCompanyId);
      this.clearConversationCache();

      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ✅ NEW: Get active company chats
  async getActiveChats(options = {}) {
    try {
      const {page = 1, limit = 20} = options;

      const response = await chatAPI.get("/api/chat/active-chats", {
        params: {
          page,
          limit,
          type: "company",
        },
      });

      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ✅ NEW: Get company chat analytics
  async getChatAnalytics(partyData, period = "7d") {
    try {
      const {partyId, partyName, targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);

      const response = await chatAPI.get(
        `/api/chat/analytics/${targetCompanyId}`,
        {
          params: {
            period,
            type: "company",
            partyId,
            partyName,
          },
        }
      );

      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ✅ NEW: Get company status
  async getCompanyStatus(companyId) {
    try {
      const response = await chatAPI.get(
        `/api/chat/company-status/${companyId}`
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ✅ UTILITY METHODS

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    this.eventListeners.get(event).add(callback);

    return () => {
      this.off(event, callback);
    };
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);

      if (this.eventListeners.get(event).size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  notifyListeners(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  clearHistoryCache(targetCompanyId) {
    for (const key of this.messageCache.keys()) {
      if (key.startsWith(`history_${targetCompanyId}`)) {
        this.messageCache.delete(key);
      }
    }
  }

  clearConversationCache() {
    for (const key of this.conversationCache.keys()) {
      if (key.startsWith("conversations_") || key.startsWith("active_chats_")) {
        this.conversationCache.delete(key);
      }
    }
  }

  disconnectSocket() {
    if (this.socket) {
      console.log("🔌 Disconnecting socket");
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.currentChatRoom = null;
    this.isTyping = false;
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }

  async healthCheck() {
    try {
      const response = await chatAPI.get("/api/chat/health");
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      const {status, data} = error.response;
      return {
        status,
        message: data.message || "An error occurred",
        errors: data.errors || [],
        success: false,
        timestamp: new Date().toISOString(),
      };
    } else if (error.request) {
      return {
        status: 0,
        message: "Network error - please check your connection",
        success: false,
        timestamp: new Date().toISOString(),
      };
    } else {
      return {
        status: 0,
        message: error.message || "An unexpected error occurred",
        success: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  validateMessageContent(content) {
    if (!content || typeof content !== "string") {
      return {valid: false, message: "Message content is required"};
    }

    if (content.trim().length === 0) {
      return {valid: false, message: "Message content cannot be empty"};
    }

    if (content.length > 5000) {
      return {
        valid: false,
        message: "Message content too long (max 5000 characters)",
      };
    }

    return {valid: true};
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null,
      currentChatRoom: this.currentChatRoom,
      currentCompanyId: this.currentCompanyId,
      currentCompanyName: this.currentCompanyName,
      reconnectAttempts: this.reconnectAttempts,
      apiUrl: API_BASE_URL,
      isTyping: this.isTyping,
      cacheSize: {
        messages: this.messageCache.size,
        conversations: this.conversationCache.size,
      },
    };
  }

  cleanup() {
    this.disconnectSocket();
    this.clearCache();
    this.currentCompanyId = null;
    this.currentCompanyName = null;
    this.eventListeners.clear();

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }

  async initializeWithCompany(companyId, companyName = null) {
    try {
      console.log("🚀 Initializing chat service with company:", {
        companyId,
        companyName,
      });

      this.setCompanyContext(companyId, companyName);
      this.initializeSocket();

      if (!this.currentCompanyId) {
        this.autoSetCompanyContext();
      }

      const health = await this.healthCheck();

      return {
        success: true,
        companyId: this.currentCompanyId,
        companyName: this.currentCompanyName,
        socketConnected: this.isConnected,
        health,
      };
    } catch (error) {
      console.error("Initialize with company error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async quickSetup() {
    try {
      console.log("⚡ Quick setup starting...");

      const contextSet = this.autoSetCompanyContext();

      if (!contextSet) {
        throw new Error("Company context not found in localStorage");
      }

      this.initializeSocket();
      const health = await this.healthCheck();

      console.log("✅ Quick setup completed:", {
        companyId: this.currentCompanyId,
        companyName: this.currentCompanyName,
        socketConnected: this.isConnected,
      });

      return {
        success: true,
        companyId: this.currentCompanyId,
        companyName: this.currentCompanyName,
        socketConnected: this.isConnected,
        health,
      };
    } catch (error) {
      console.error("Quick setup error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

const chatService = new ChatService();

export default chatService;
export {ChatService};
