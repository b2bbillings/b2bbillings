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
      return null;
    }

    try {
      if (this.socket) {
        this.socket.disconnect();
      }

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
      return null;
    }
  }

  setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.notifyListeners("socket_connected", {socketId: this.socket.id});
    });

    this.socket.on("authenticated", (data) => {
      this.isConnected = true;
      this.currentCompanyId = data.companyId;
      this.currentCompanyName = data.companyName;
      this.notifyListeners("socket_authenticated", data);
    });

    this.socket.on("auth_error", (data) => {
      this.isConnected = false;
      this.notifyListeners("socket_auth_error", data);
    });

    this.socket.on("disconnect", (reason) => {
      this.isConnected = false;
      this.notifyListeners("socket_disconnected", {reason});
    });

    this.socket.on("connect_error", (error) => {
      if (
        error.message === "Authentication failed" ||
        error.message === "Not authenticated"
      ) {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        this.notifyListeners("auth_failed", {error: error.message});
        return;
      }

      this.handleReconnect();
    });

    this.socket.on("new_message", (message) => {
      if (message.id || message._id) {
        this.setCache(message.id || message._id, message, "message");
      }
      this.notifyListeners("new_message", message);
    });

    this.socket.on("message_sent", (data) => {
      this.notifyListeners("message_sent", data);
    });

    this.socket.on("user_typing", (data) => {
      this.notifyListeners("user_typing", data);
    });

    this.socket.on("joined_chat", (data) => {
      this.currentChatRoom = data.chatRoomId;
      this.notifyListeners("joined_chat", data);
    });

    this.socket.on("left_chat", (data) => {
      this.currentChatRoom = null;
      this.notifyListeners("left_chat", data);
    });

    this.socket.on("error", (error) => {
      this.notifyListeners("socket_error", error);
    });
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;

      setTimeout(() => {
        if (this.socket) {
          this.socket.connect();
        }
      }, delay);
    } else {
      this.notifyListeners("max_reconnect_attempts_reached");
    }
  }

  async joinChat(partyData) {
    if (!this.socket || !this.isConnected) {
      return {success: true, mock: true};
    }

    try {
      const {partyId, partyName, targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Join chat timeout"));
        }, 10000);

        this.socket.once("joined_chat", (response) => {
          clearTimeout(timeout);
          resolve(response);
        });

        this.socket.once("error", (error) => {
          clearTimeout(timeout);
          reject(new Error(error.message || "Failed to join chat"));
        });

        this.socket.emit("join_chat", {
          partyId: targetCompanyId,
          otherCompanyId: targetCompanyId,
          type: "company",
          partyData: {
            id: partyId,
            name: partyName,
            linkedCompanyId: targetCompanyId,
          },
        });
      });
    } catch (error) {
      throw error;
    }
  }

  leaveChat() {
    if (!this.socket?.connected && !this.isConnected) {
      return;
    }

    if (this.socket?.connected) {
      this.socket.emit("leave_chat");
    }
  }

  sendSocketMessage(
    partyData,
    content,
    messageType = "whatsapp",
    attachments = []
  ) {
    if (!this.socket?.connected && !this.isConnected) {
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
        partyId: targetCompanyId,
        content,
        messageType,
        attachments,
        timestamp: new Date().toISOString(),
        tempId: Date.now().toString(),
        originalPartyId: partyId,
        originalPartyName: partyName,
        type: "company",
      };

      if (this.socket?.connected) {
        this.socket.emit("send_message", messageData);
      }
      return messageData;
    } catch (error) {
      throw error;
    }
  }

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
      return {
        success: false,
        data: {
          totalMessages: 0,
          unreadCount: 0,
          lastMessageAt: null,
          participantCount: 0,
        },
      };
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
      return {
        success: false,
        data: {
          templates: {},
        },
      };
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
      return {
        success: false,
        data: {
          participants: [],
        },
      };
    }
  }

  startTyping(partyData) {
    if (!this.socket || !this.isConnected) {
      return;
    }

    try {
      const {partyId, partyName, targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);

      this.socket.emit("start_typing", {
        partyId: targetCompanyId,
        otherCompanyId: targetCompanyId,
        type: "company",
        originalPartyId: partyId,
        originalPartyName: partyName,
      });
    } catch (error) {
      // Silent fail
    }
  }

  stopTyping(partyData) {
    if (!this.socket || !this.isConnected) {
      return;
    }

    try {
      const {partyId, partyName, targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);

      this.socket.emit("stop_typing", {
        partyId: targetCompanyId,
        otherCompanyId: targetCompanyId,
        type: "company",
        originalPartyId: partyId,
        originalPartyName: partyName,
      });
    } catch (error) {
      // Silent fail
    }
  }

  async leaveChat(partyData) {
    if (!this.socket || !this.isConnected) {
      return {success: true, mock: true};
    }

    try {
      if (partyData) {
        const {partyId, partyName, targetCompanyId} =
          this.validateAndExtractPartyCompanyData(partyData);

        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Leave chat timeout"));
          }, 5000);

          this.socket.once("left_chat", (response) => {
            clearTimeout(timeout);
            resolve(response);
          });

          this.socket.once("error", (error) => {
            clearTimeout(timeout);
            reject(new Error(error.message || "Failed to leave chat"));
          });

          this.socket.emit("leave_chat", {
            partyId: targetCompanyId,
            otherCompanyId: targetCompanyId,
            type: "company",
            partyData: {
              id: partyId,
              name: partyName,
              linkedCompanyId: targetCompanyId,
            },
          });
        });
      } else {
        this.socket.emit("leave_chat", {
          type: "company",
        });

        return {success: true};
      }
    } catch (error) {
      throw error;
    }
  }

  on(eventName, callback) {
    if (!this.socket) {
      return () => {};
    }

    this.socket.on(eventName, callback);

    return () => {
      if (this.socket) {
        this.socket.off(eventName, callback);
      }
    };
  }

  off(eventName, callback = null) {
    if (!this.socket) {
      return;
    }

    if (callback) {
      this.socket.off(eventName, callback);
    } else {
      this.socket.removeAllListeners(eventName);
    }
  }

  getFromCache(key, type = "message") {
    try {
      const cacheKey = `chat_${type}_${key}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        const maxAge = type === "message" ? 5 * 60 * 1000 : 10 * 60 * 1000;
        if (Date.now() - data.timestamp < maxAge) {
          return data.value;
        } else {
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      // Silent fail
    }
    return null;
  }

  setCache(key, value, type = "message") {
    try {
      const cacheKey = `chat_${type}_${key}`;
      const data = {
        value,
        timestamp: Date.now(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (error) {
      // Silent fail
    }
  }

  clearHistoryCache(targetCompanyId = null) {
    try {
      if (targetCompanyId) {
        const keys = Object.keys(localStorage).filter((key) =>
          key.startsWith(`chat_message_history_${targetCompanyId}`)
        );
        keys.forEach((key) => localStorage.removeItem(key));
      } else {
        const keys = Object.keys(localStorage).filter((key) =>
          key.startsWith("chat_message_")
        );
        keys.forEach((key) => localStorage.removeItem(key));
      }
    } catch (error) {
      // Silent fail
    }
  }

  clearConversationCache() {
    try {
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith("chat_conversation_")
      );
      keys.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      // Silent fail
    }
  }

  startTyping(partyData) {
    if (this.socket?.connected && !this.isTyping) {
      try {
        const {partyId, partyName, targetCompanyId} =
          this.validateAndExtractPartyCompanyData(partyData);

        this.isTyping = true;
        this.socket.emit("typing_start", {
          partyId: targetCompanyId,
          otherCompanyId: targetCompanyId,
          originalPartyId: partyId,
        });

        this.typingTimeout = setTimeout(() => {
          this.stopTyping(partyData);
        }, 5000);
      } catch (error) {
        // Silent fail
      }
    }
  }

  stopTyping(partyData) {
    if (this.socket?.connected && this.isTyping) {
      try {
        const {partyId, partyName, targetCompanyId} =
          this.validateAndExtractPartyCompanyData(partyData);

        this.isTyping = false;
        this.socket.emit("typing_stop", {
          partyId: targetCompanyId,
          otherCompanyId: targetCompanyId,
          originalPartyId: partyId,
        });

        if (this.typingTimeout) {
          clearTimeout(this.typingTimeout);
          this.typingTimeout = null;
        }
      } catch (error) {
        // Silent fail
      }
    }
  }

  disconnectSocket() {
    if (this.socket) {
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
      throw this.handleError(error);
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
      throw this.handleError(error);
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

      const response = await chatAPI.post(`/api/chat/send/${targetCompanyId}`, {
        content,
        messageType,
        attachments,
        type: "company",
        partyId,
        partyName,
      });

      this.clearHistoryCache(targetCompanyId);
      this.clearConversationCache();

      return response.data;
    } catch (error) {
      throw this.handleError(error);
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
          // Silent fail
        }
      });
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
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async quickSetup() {
    try {
      const contextSet = this.autoSetCompanyContext();

      if (!contextSet) {
        throw new Error("Company context not found in localStorage");
      }

      this.initializeSocket();
      const health = await this.healthCheck();

      return {
        success: true,
        companyId: this.currentCompanyId,
        companyName: this.currentCompanyName,
        socketConnected: this.isConnected,
      };
    } catch (error) {
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
