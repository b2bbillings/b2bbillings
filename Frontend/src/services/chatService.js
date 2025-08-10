import axios from "axios";
import {io} from "socket.io-client";
import apiConfig from "../config/api.js";

const API_BASE_URL = `${apiConfig.baseURL}/api`;
const SOCKET_URL = apiConfig.baseURL;

const isDevelopment =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";
const isProduction = !isDevelopment;

const APP_VERSION = process.env.REACT_APP_VERSION || "2.1.0";

const logDebug = (message, data) => {
  if (isDevelopment) {
    console.log(`🔧 CHATSERVICE: ${message}`, data || "");
  }
};

const logInfo = (message, data) => {
  if (isDevelopment) {
    console.log(`ℹ️ CHATSERVICE: ${message}`, data || "");
  }
};

const logError = (message, error) => {
  if (isDevelopment) {
    console.error(`❌ CHATSERVICE: ${message}`, error);
  } else {
    console.error(`❌ CHATSERVICE: ${message}`, {
      message: error?.message || error,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      version: APP_VERSION,
      environment: isProduction ? "production" : "development",
    });
  }
};

const chatAPI = axios.create({
  baseURL: API_BASE_URL,
  timeout: apiConfig.timeout || (isProduction ? 45000 : 30000),
  headers: {
    "Content-Type": "application/json",
    "X-Client-Version": APP_VERSION,
    "X-Environment": isProduction ? "production" : "development",
  },
});

chatAPI.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const currentCompany = localStorage.getItem("currentCompany");
  if (currentCompany) {
    try {
      const company = JSON.parse(currentCompany);
      const companyId = company.id || company._id || company.companyId;
      if (companyId) config.headers["X-Company-ID"] = companyId;
    } catch (e) {
      logError("Failed to parse company context", e);
    }
  }

  return config;
});

chatAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const errorMessage = error.response?.data?.message || "";

      const isTokenExpired =
        errorMessage.includes("expired") ||
        errorMessage.includes("invalid") ||
        errorMessage.includes("malformed") ||
        errorMessage.includes("jwt") ||
        error.response?.data?.code === "TOKEN_EXPIRED";

      if (isTokenExpired) {
        logInfo("Token expired, logging out user");
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");

        const currentPath = window.location.pathname;
        const redirectUrl = `/login?redirect=${encodeURIComponent(
          currentPath
        )}`;
        window.location.href = redirectUrl;
      } else {
        logDebug("Chat API 401 error (not logging out)", errorMessage);
      }
    }
    return Promise.reject(error);
  }
);

class ChatService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = isProduction ? 10 : 5;
    this.eventListeners = new Map();

    this.currentChatRoom = null;
    this.currentCompanyId = null;
    this.currentCompanyName = null;
    this.currentUserId = null;
    this.currentUsername = null;

    this.lastAuthTime = 0;
    this.recentErrors = [];
    this.connectionHealth = "unknown";
    this.performanceMetrics = {
      connectionAttempts: 0,
      successfulConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
    };

    this.messageCache = new Map();
    this.conversationCache = new Map();
    this.processedMessages = new Set();
    this.tempMessageMap = new Map();
    this.notificationCache = new Map();
    this.lastNotificationCheck = 0;

    this.isTyping = false;
    this.typingTimeout = null;
    this.lastMessageTime = 0;

    this.startMemoryCleanup();

    logInfo("ChatService initialized", {
      apiBaseUrl: API_BASE_URL,
      socketUrl: SOCKET_URL,
      environment: isProduction ? "production" : "development",
      version: APP_VERSION,
    });
  }

  startMemoryCleanup() {
    setInterval(() => {
      this.cleanupOldCacheEntries();
      this.cleanupOldProcessedMessages();
      this.cleanupOldErrors();
    }, 300000);
  }

  cleanupOldCacheEntries() {
    const now = Date.now();
    const maxAge = 600000;

    [this.messageCache, this.conversationCache, this.notificationCache].forEach(
      (cache) => {
        for (const [key, value] of cache.entries()) {
          if (value.timestamp && now - value.timestamp > maxAge) {
            cache.delete(key);
          }
        }
      }
    );
  }

  cleanupOldProcessedMessages() {
    if (this.processedMessages.size > 1000) {
      const messagesArray = Array.from(this.processedMessages);
      const keepMessages = messagesArray.slice(-500);
      this.processedMessages.clear();
      keepMessages.forEach((msg) => this.processedMessages.add(msg));
    }
  }

  cleanupOldErrors() {
    if (this.recentErrors.length > 50) {
      this.recentErrors = this.recentErrors.slice(-25);
    }
  }

  validateToken(token) {
    if (!token) return false;

    try {
      const parts = token.split(".");
      if (parts.length !== 3) return false;

      const payload = JSON.parse(atob(parts[1]));
      const now = Date.now() / 1000;

      if (payload.exp && payload.exp < now) {
        return false;
      }

      return true;
    } catch (error) {
      logError("Token validation failed", error);
      return false;
    }
  }

  getAuthenticatedCompany() {
    try {
      const currentCompany = localStorage.getItem("currentCompany");
      if (currentCompany) {
        try {
          const company = JSON.parse(currentCompany);
          const companyId = company._id || company.id || company.companyId;

          if (companyId?.length === 24 && /^[0-9a-fA-F]{24}$/.test(companyId)) {
            return {
              companyId,
              companyName: company.businessName || company.name,
              userId: this.currentUserId || "unknown",
              username: this.currentUsername || "User",
              socketId: this.socket?.id,
              isConnected: this.isConnected,
              source: "localStorage",
            };
          }
        } catch (parseError) {
          logError("Failed to parse company data", parseError);
        }
      }

      if (this.isConnected && this.currentCompanyId?.length === 24) {
        return {
          companyId: this.currentCompanyId,
          companyName: this.currentCompanyName,
          userId: this.currentUserId || "unknown",
          username: this.currentUsername || "User",
          socketId: this.socket?.id,
          isConnected: this.isConnected,
          source: "socket_authenticated",
        };
      }

      return null;
    } catch (error) {
      logError("getAuthenticatedCompany failed", error);
      return null;
    }
  }

  extractTargetCompanyId(partyData) {
    if (!partyData) return null;

    let myCompanyId = this.currentCompanyId;
    if (!myCompanyId) {
      try {
        const currentCompanyData = JSON.parse(
          localStorage.getItem("currentCompany") || "{}"
        );
        myCompanyId = currentCompanyData._id || currentCompanyData.id;
      } catch (error) {
        logError("Failed to get current company ID", error);
        myCompanyId = null;
      }
    }

    const extractCompanyId = (companyRef) => {
      if (!companyRef) return null;
      let companyId =
        typeof companyRef === "object" ? companyRef._id : companyRef;
      return companyId?.length === 24 && /^[0-9a-fA-F]{24}$/.test(companyId)
        ? companyId
        : null;
    };

    const extractionAttempts = [
      partyData.linkedCompany?._id,
      partyData.targetCompanyId,
      partyData.linkedCompanyId,
      partyData.chatCompanyId,
      partyData.externalCompanyId,
      partyData.company?._id,
      partyData.companyId,
    ];

    for (const attempt of extractionAttempts) {
      const extractedId = extractCompanyId(attempt);
      if (extractedId && extractedId !== myCompanyId) {
        return extractedId;
      }
    }

    return null;
  }

  validateAndExtractPartyCompanyData(partyData) {
    if (!partyData) throw new Error("Party data is required");

    const currentCompanyData = localStorage.getItem("currentCompany");
    if (!currentCompanyData) {
      throw new Error(
        "No authenticated company found. Please refresh and try again."
      );
    }

    let myCompany;
    try {
      myCompany = JSON.parse(currentCompanyData);
    } catch (error) {
      throw new Error(
        "Invalid company data. Please refresh and select your company."
      );
    }

    const myCompanyId = myCompany._id || myCompany.id || myCompany.companyId;

    if (!myCompanyId) {
      throw new Error(
        "Invalid company data. Please refresh and select your company again."
      );
    }

    let targetCompanyId = null;

    const extractionAttempts = [
      partyData.linkedCompany?._id,
      partyData.targetCompanyId,
      partyData.linkedCompanyId,
      partyData.chatCompanyId,
      partyData.externalCompanyId,
      partyData.company?._id,
      partyData.companyId,
    ];

    for (const attempt of extractionAttempts) {
      if (attempt) {
        if (typeof attempt === "object" && attempt._id) {
          targetCompanyId = attempt._id;
        } else if (typeof attempt === "string" && attempt.length === 24) {
          targetCompanyId = attempt;
        }

        if (targetCompanyId && targetCompanyId !== myCompanyId) {
          break;
        } else if (targetCompanyId === myCompanyId) {
          targetCompanyId = null;
        }
      }
    }

    if (!targetCompanyId) {
      throw new Error(
        "This party is not linked to any company for chat. Please link them to a company first to enable chat functionality."
      );
    }

    if (myCompanyId === targetCompanyId) {
      throw new Error("Cannot chat with your own company");
    }

    return {
      myCompanyId,
      targetCompanyId,
      partyId: partyData._id || partyData.id,
      partyName: partyData.name,
      isExternalCompany: partyData.isExternalCompany || false,
      updatedPartyData: {...partyData, targetCompanyId},
    };
  }

  initializeSocket() {
    this.performanceMetrics.connectionAttempts++;

    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    if (!token) {
      logError("No authentication token found");
      return null;
    }

    if (!this.validateToken(token)) {
      logError("Invalid or expired token");
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      return null;
    }

    const currentCompany = localStorage.getItem("currentCompany");

    try {
      if (this.socket) {
        logDebug("Disconnecting existing socket");
        this.socket.disconnect();
        this.socket = null;
      }

      logInfo("Initializing new socket connection", {
        url: SOCKET_URL,
        environment: isProduction ? "production" : "development",
      });

      this.socket = io(SOCKET_URL, {
        auth: {
          token,
          companyContext: currentCompany,
          version: APP_VERSION,
          environment: isProduction ? "production" : "development",
          clientType: "react-app",
        },
        extraHeaders: {
          Authorization: `Bearer ${token}`,
          "X-Company-Context": currentCompany || "",
          "X-Client-Version": APP_VERSION,
          "X-Environment": isProduction ? "production" : "development",
          Origin: window.location.origin,
        },
        transports: ["websocket", "polling"],

        timeout: apiConfig.timeout || (isProduction ? 45000 : 30000),
        forceNew: true,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 2000,
        reconnectionDelayMax: isProduction ? 30000 : 15000,

        upgrade: true,
        rememberUpgrade: true,
        secure: isProduction,
        rejectUnauthorized: isProduction,

        autoUpgrade: isProduction,
        closeOnBeforeunload: false,
      });

      this.setupSocketListeners();
      return this.socket;
    } catch (error) {
      logError("Socket initialization failed", error);
      this.addError("Socket initialization failed", error);
      return null;
    }
  }

  addError(message, error) {
    this.recentErrors.push({
      timestamp: Date.now(),
      message,
      error: error?.message || error,
      stack: error?.stack,
    });
  }

  setupSocketListeners() {
    if (!this.socket) return;

    logDebug("Setting up socket listeners");

    this.socket.on("connect", () => {
      logInfo("Socket connected, waiting for authentication...");
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.connectionHealth = "connected";
      this.performanceMetrics.successfulConnections++;
      this.notifyListeners("socket_connected", {socketId: this.socket.id});
    });

    this.socket.on("connection_confirmed", (data) => {
      logInfo("Authentication successful", data);
      this.isConnected = true;
      this.currentCompanyId = data.companyId;
      this.currentCompanyName = data.companyName;
      this.currentUserId = data.userId;
      this.currentUsername = data.username;
      this.lastAuthTime = Date.now();
      this.connectionHealth = "authenticated";
      this.notifyListeners("socket_authenticated", data);
    });

    this.socket.on("disconnect", (reason) => {
      logInfo("Socket disconnected", reason);
      this.isConnected = false;
      this.connectionHealth = "disconnected";
      this.notifyListeners("socket_disconnected", {reason});
    });

    this.socket.on("connect_error", (error) => {
      logError("Socket connection error", error);
      this.addError("Connection error", error);

      const isTokenError =
        error.message === "jwt expired" ||
        error.message === "jwt malformed" ||
        error.message === "invalid token" ||
        error.code === "TOKEN_EXPIRED" ||
        error.message === "Authentication error";

      if (isTokenError) {
        logInfo("Token expired, clearing session");
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        this.notifyListeners("auth_failed", {
          error: "Session expired. Please login again.",
          shouldRedirectToLogin: true,
          originalError: error.message,
        });
      } else {
        logDebug("Connection error, attempting reconnect");
        this.handleReconnect();
      }
    });

    this.socket.on("authentication_error", (error) => {
      logError("Chat authentication failed", error);
      this.addError("Authentication error", error);

      const isTokenExpired =
        error.code === "TOKEN_EXPIRED" ||
        error.message === "jwt expired" ||
        error.message === "jwt malformed";

      if (isTokenExpired) {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        this.notifyListeners("auth_failed", {
          error: "Session expired. Please login again.",
          shouldRedirectToLogin: true,
          code: error.code || "AUTH_ERROR",
        });
      } else {
        this.isConnected = false;
        this.notifyListeners("auth_failed", {
          error: "Chat authentication failed. Please try again.",
          shouldRedirectToLogin: false,
          code: error.code || "AUTH_ERROR",
          retryable: true,
        });
      }
    });

    this.socket.on("auth_error", (error) => {
      logError("Chat auth error", error);
      this.addError("Auth error", error);

      if (error.code === "TOKEN_EXPIRED" || error.message === "jwt expired") {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        this.notifyListeners("auth_failed", {
          error: "Session expired. Please login again.",
          shouldRedirectToLogin: true,
          code: error.code || "AUTH_ERROR",
        });
      } else {
        this.notifyListeners("auth_failed", {
          error: "Chat authentication failed. Please try again.",
          shouldRedirectToLogin: false,
          code: error.code || "AUTH_ERROR",
          retryable: true,
        });
      }
    });

    this.socket.on("error", (error) => {
      logError("Socket error", error);
      this.addError("Socket error", error);

      if (
        error.code === "TOKEN_EXPIRED" ||
        error.message === "jwt expired" ||
        error.message === "jwt malformed"
      ) {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        this.notifyListeners("auth_failed", {
          error: "Session expired. Please login again.",
          shouldRedirectToLogin: true,
          code: error.code || "AUTH_ERROR",
        });
      } else {
        this.notifyListeners("socket_error", {
          error: error.message || "Socket error occurred",
          code: error.code || "SOCKET_ERROR",
          retryable: true,
        });
      }
    });

    this.socket.on("company_chat_error", (error) => {
      logError("Company chat error", error);
      this.addError("Company chat error", error);

      if (error.code === "TOKEN_EXPIRED" || error.message === "jwt expired") {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        this.notifyListeners("auth_failed", {
          error: "Chat authentication expired. Please login again.",
          shouldRedirectToLogin: true,
          code: error.code,
        });
      } else {
        this.notifyListeners("chat_room_error", {
          error: error.error || error.message || "Failed to join chat room",
          code: error.code || "CHAT_ERROR",
          details: error,
          shouldRedirectToLogin: false,
          retryable: true,
        });
      }
    });

    this.socket.on("new_message", (message) => {
      try {
        this.performanceMetrics.messagesReceived++;

        const messageId = message._id || message.id;
        const timestamp = new Date(message.createdAt || Date.now()).getTime();

        const messageHash = `${messageId}_${message.senderCompanyId}_${message.receiverCompanyId}_${timestamp}`;
        if (this.processedMessages.has(messageHash)) {
          return;
        }

        const currentCompanyId =
          this.currentCompanyId || this.getAuthenticatedCompany()?.companyId;

        if (!currentCompanyId) {
          return;
        }

        const senderCompanyId = message.senderCompanyId || message.fromCompany;
        const receiverCompanyId =
          message.receiverCompanyId || message.toCompany;

        const isRelevant =
          receiverCompanyId === currentCompanyId ||
          senderCompanyId === currentCompanyId;

        if (!isRelevant) {
          return;
        }

        this.processedMessages.add(messageHash);

        if (messageId) {
          this.setCache(messageId, message, "message");
        }

        this.clearNotificationCache();

        this.notifyListeners("new_message", {
          ...message,
          isReceived: receiverCompanyId === currentCompanyId,
          isSent: senderCompanyId === currentCompanyId,
          currentCompanyId,
        });
      } catch (error) {
        logError("Error processing new_message", error);
      }
    });

    this.socket.on("company_chat_joined", (data) => {
      logInfo("Joined chat room", data);
      this.currentChatRoom = data.roomId;
      this.notifyListeners("company_chat_joined", data);
    });

    this.socket.on("message_sent", (data) => {
      logDebug("Message sent confirmation", data);
      this.notifyListeners("message_sent", data);
    });

    this.socket.on("new_chat_notification", (notification) => {
      try {
        this.clearNotificationCache();
        this.notifyListeners("new_chat_notification", notification);
      } catch (error) {
        logError("Error processing notification", error);
      }
    });

    this.socket.on("notification_marked_read", (data) => {
      try {
        this.clearNotificationCache();
        this.notifyListeners("notification_marked_read", data);
      } catch (error) {
        logError("Error processing notification read", error);
      }
    });

    this.socket.on("message_read", (data) => {
      try {
        this.notifyListeners("message_read", {
          messageId: data.messageId,
          readAt: data.readAt,
          readBy: data.readBy,
        });
      } catch (error) {
        logError("Error processing message read", error);
      }
    });

    this.socket.on("message_delivered", (data) => {
      try {
        this.notifyListeners("message_delivered", {
          messageId: data.messageId,
          deliveredAt: data.deliveredAt,
        });
      } catch (error) {
        logError("Error processing message delivered", error);
      }
    });

    this.socket.on("message_sent_confirmation", (data) =>
      this.notifyListeners("message_sent", data)
    );
    this.socket.on("user_typing", (data) =>
      this.notifyListeners("user_typing", data)
    );
    this.socket.on("user_joined_chat", (data) =>
      this.notifyListeners("user_joined_chat", data)
    );
    this.socket.on("user_left_chat", (data) =>
      this.notifyListeners("user_left_chat", data)
    );
    this.socket.on("user_online", (data) =>
      this.notifyListeners("user_online", data)
    );
    this.socket.on("user_offline", (data) =>
      this.notifyListeners("user_offline", data)
    );
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(Math.pow(2, this.reconnectAttempts) * 1000, 30000);
      logInfo(
        `Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
      );

      setTimeout(() => {
        if (this.socket) this.socket.connect();
      }, delay);
    } else {
      logError("Max reconnection attempts reached");
      this.connectionHealth = "failed";
      this.notifyListeners("max_reconnect_attempts_reached");
    }
  }

  getConnectionHealth() {
    return {
      isHealthy: this.isConnected && this.currentCompanyId,
      lastSuccessfulAuth: this.lastAuthTime,
      reconnectAttempts: this.reconnectAttempts,
      socketState: this.socket?.connected ? "connected" : "disconnected",
      authState: this.currentCompanyId ? "authenticated" : "pending",
      connectionHealth: this.connectionHealth,
      errors: this.recentErrors.slice(-5),
      performanceMetrics: this.performanceMetrics,
      config: {
        apiBaseUrl: API_BASE_URL,
        socketUrl: SOCKET_URL,
        environment: isProduction ? "production" : "development",
        version: APP_VERSION,
      },
    };
  }

  async testSocketConnection() {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      if (!this.validateToken(token)) {
        throw new Error("Invalid or expired token");
      }

      const currentCompany = localStorage.getItem("currentCompany");
      if (!currentCompany) {
        throw new Error("No company context found");
      }

      if (isProduction) {
        if (!SOCKET_URL.startsWith("https://")) {
          logError("Production should use secure protocols (HTTPS/WSS)");
        }
      }

      if (!this.socket) {
        this.initializeSocket();
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Socket connection timeout - please try again"));
        }, apiConfig.timeout || 30000);

        if (this.isConnected && this.currentCompanyId) {
          clearTimeout(timeout);
          resolve({
            success: true,
            socketId: this.socket.id,
            authenticated: true,
            companyId: this.currentCompanyId,
            environment: isProduction ? "production" : "development",
          });
          return;
        }

        const cleanup = () => {
          clearTimeout(timeout);
          this.socket.off("connect", onConnect);
          this.socket.off("connection_confirmed", onAuthenticated);
          this.socket.off("authentication_error", onAuthError);
          this.socket.off("connect_error", onConnectError);
        };

        const onConnect = () => {
          logDebug("Socket connected, waiting for authentication...");
        };

        const onAuthenticated = (data) => {
          logInfo("Socket authenticated successfully");
          cleanup();
          resolve({
            success: true,
            socketId: this.socket.id,
            authenticated: true,
            companyId: data.companyId,
            authData: data,
            environment: isProduction ? "production" : "development",
          });
        };

        const onAuthError = (error) => {
          logError("Socket authentication failed", error);
          cleanup();
          reject(
            new Error(
              `Authentication failed: ${
                error.error || error.message || "Unknown error"
              }`
            )
          );
        };

        const onConnectError = (error) => {
          logError("Socket connection failed", error);
          cleanup();
          reject(
            new Error(`Connection failed: ${error.message || "Unknown error"}`)
          );
        };

        this.socket.once("connect", onConnect);
        this.socket.once("connection_confirmed", onAuthenticated);
        this.socket.once("authentication_error", onAuthError);
        this.socket.once("connect_error", onConnectError);

        if (!this.socket.connected && !this.socket.connecting) {
          this.socket.connect();
        }
      });
    } catch (error) {
      logError("Test socket connection error", error);
      return {
        success: false,
        error: error.message,
        authenticated: false,
        environment: isProduction ? "production" : "development",
      };
    }
  }

  async joinChat(joinData) {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket not connected");
    }

    try {
      const authenticatedCompany = this.getAuthenticatedCompany();
      if (!authenticatedCompany?.companyId) {
        throw new Error(
          "No authenticated company found. Please refresh and try again."
        );
      }

      let myCompanyId, targetCompanyId, partyId, partyName;
      myCompanyId = authenticatedCompany.companyId;

      if (joinData && typeof joinData === "object") {
        if (joinData.party || joinData._id) {
          const partyData = joinData.party || joinData;

          targetCompanyId =
            partyData.linkedCompanyId ||
            partyData.companyId ||
            partyData.targetCompanyId ||
            partyData.chatCompanyId ||
            partyData.externalCompanyId;

          if (typeof targetCompanyId === "object" && targetCompanyId._id) {
            targetCompanyId = targetCompanyId._id;
          }

          partyId = partyData._id || partyData.id;
          partyName = partyData.name || partyData.chatCompanyName;
        } else if (joinData.targetCompanyId) {
          targetCompanyId = joinData.targetCompanyId;
          partyId = joinData.partyId;
          partyName = joinData.partyName;
        }
      }

      if (!myCompanyId || !targetCompanyId) {
        throw new Error("Both myCompanyId and targetCompanyId are required");
      }

      if (myCompanyId === targetCompanyId) {
        throw new Error("Cannot chat with your own company");
      }

      logInfo("Joining chat", {myCompanyId, targetCompanyId, partyName});

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Join chat timeout")),
          isProduction ? 15000 : 10000
        );

        this.socket.once("company_chat_joined", (response) => {
          clearTimeout(timeout);
          this.currentChatRoom = response.roomId;
          logInfo("Successfully joined chat room");
          resolve(response);
        });

        this.socket.once("company_chat_error", (error) => {
          clearTimeout(timeout);
          logError("Failed to join chat", error);
          reject(new Error(error.message || "Failed to join chat"));
        });

        this.socket.emit("join_company_chat", {
          myCompanyId,
          targetCompanyId,
          partyId,
          partyName,
          otherCompanyId: targetCompanyId,
        });
      });
    } catch (error) {
      logError("Join chat error", error);
      throw error;
    }
  }

  async leaveChat(partyData) {
    if (!this.socket || !this.isConnected) {
      return {success: true, mock: true};
    }

    try {
      if (partyData) {
        const {targetCompanyId} =
          this.validateAndExtractPartyCompanyData(partyData);

        return new Promise((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("Leave chat timeout")),
            5000
          );

          this.socket.once("user_left_chat", (response) => {
            clearTimeout(timeout);
            this.currentChatRoom = null;
            resolve(response);
          });

          this.socket.once("error", (error) => {
            clearTimeout(timeout);
            reject(new Error(error.message || "Failed to leave chat"));
          });

          this.socket.emit("leave_company_chat", {
            otherCompanyId: targetCompanyId,
          });
        });
      } else {
        this.socket.emit("leave_company_chat");
        this.currentChatRoom = null;
        return {success: true};
      }
    } catch (error) {
      throw error;
    }
  }

  startTyping(partyData) {
    if (!this.socket || !this.isConnected || this.isTyping) return;

    try {
      const {targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);
      this.isTyping = true;
      this.socket.emit("typing_start", {otherCompanyId: targetCompanyId});

      this.typingTimeout = setTimeout(() => this.stopTyping(partyData), 5000);
    } catch (error) {
      logError("Start typing error", error);
    }
  }

  stopTyping(partyData) {
    if (!this.socket || !this.isConnected || !this.isTyping) return;

    try {
      const {targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);
      this.isTyping = false;
      this.socket.emit("typing_stop", {otherCompanyId: targetCompanyId});

      if (this.typingTimeout) {
        clearTimeout(this.typingTimeout);
        this.typingTimeout = null;
      }
    } catch (error) {
      logError("Stop typing error", error);
    }
  }

  async sendMessage(messageData) {
    try {
      this.performanceMetrics.messagesSent++;

      if (!this.socket || !this.isConnected) {
        throw new Error("Socket not connected");
      }

      const authenticatedCompany = this.getAuthenticatedCompany();
      if (!authenticatedCompany?.companyId) {
        throw new Error(
          "No authenticated company found. Please refresh and try again."
        );
      }

      let finalMessageData;

      if (messageData && typeof messageData === "object" && messageData.party) {
        const {party, content, tempId} = messageData;
        const myCompanyId = authenticatedCompany.companyId;

        let targetCompanyId =
          party.linkedCompanyId ||
          party.companyId ||
          party.targetCompanyId ||
          party.chatCompanyId ||
          party.externalCompanyId;

        if (typeof targetCompanyId === "object" && targetCompanyId._id) {
          targetCompanyId = targetCompanyId._id;
        }

        if (!targetCompanyId) {
          throw new Error("Party is not linked to any company for chat");
        }

        if (myCompanyId === targetCompanyId) {
          throw new Error("Cannot send message to your own company");
        }

        finalMessageData = {
          content: content.trim(),
          messageType: "website",
          type: "company",
          partyId: targetCompanyId,
          partyName: party.name,
          senderCompanyId: myCompanyId,
          receiverCompanyId: targetCompanyId,
          tempId:
            tempId ||
            `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
      } else {
        const partyData = arguments[0];
        const content = arguments[1];
        const tempId = arguments[2];
        const myCompanyId = authenticatedCompany.companyId;

        let targetCompanyId =
          partyData.linkedCompanyId ||
          partyData.companyId ||
          partyData.targetCompanyId ||
          partyData.chatCompanyId ||
          partyData.externalCompanyId;

        if (typeof targetCompanyId === "object" && targetCompanyId._id) {
          targetCompanyId = targetCompanyId._id;
        }

        if (!targetCompanyId) {
          throw new Error("Party is not linked to any company for chat");
        }

        finalMessageData = {
          content: content.trim(),
          messageType: "website",
          type: "company",
          partyId: targetCompanyId,
          partyName: partyData.name,
          senderCompanyId: myCompanyId,
          receiverCompanyId: targetCompanyId,
          tempId:
            tempId ||
            `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
      }

      const contentValidation = this.validateMessageContent(
        finalMessageData.content
      );
      if (!contentValidation.valid) {
        throw new Error(contentValidation.message);
      }

      logDebug("Sending message", finalMessageData);

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Message send timeout after 10 seconds")),
          isProduction ? 15000 : 10000
        );

        const handleSuccess = (response) => {
          clearTimeout(timeout);
          this.socket.off("message_sent", handleSuccess);
          this.socket.off("message_error", handleError);

          logDebug("Message sent successfully", response);

          this.clearHistoryCache(finalMessageData.receiverCompanyId);
          this.clearConversationCache();
          this.clearNotificationCache();

          resolve({
            success: true,
            data: {
              _id: response.messageId,
              id: response.messageId,
              tempId: finalMessageData.tempId,
              status: "sent",
              createdAt: new Date(),
              messageType: "website",
            },
            message: "Message sent successfully",
          });
        };

        const handleError = (error) => {
          clearTimeout(timeout);
          this.socket.off("message_sent", handleSuccess);
          this.socket.off("message_error", handleError);

          logError("Message send failed", {
            error: error.error || error.message,
            tempId: finalMessageData.tempId,
          });

          reject(
            new Error(error.error || error.message || "Failed to send message")
          );
        };

        this.socket.once("message_sent", handleSuccess);
        this.socket.once("message_error", handleError);

        this.socket.emit("send_message", finalMessageData);
      });
    } catch (error) {
      logError("Send message error", error);
      return {
        success: false,
        message: error.message,
        error: error.message,
      };
    }
  }

  async getChatHistory(partyData, options = {}) {
    try {
      const {page = 1, limit = 50, startDate, endDate} = options;
      const {myCompanyId, targetCompanyId, partyId, partyName} =
        this.validateAndExtractPartyCompanyData(partyData);

      if (!targetCompanyId?.match(/^[0-9a-fA-F]{24}$/)) {
        throw new Error(`Invalid target company ID: ${targetCompanyId}`);
      }

      const cacheKey = `history_${targetCompanyId}_${page}_${limit}_${
        startDate || ""
      }_${endDate || ""}`;
      const cachedHistory = this.getFromCache(cacheKey, "message");
      if (cachedHistory) return cachedHistory;

      const response = await chatAPI.get(`/chat/history/${targetCompanyId}`, {
        params: {
          page,
          limit,
          messageType: "website",
          startDate,
          endDate,
          type: "company",
          partyId,
          partyName,
          myCompanyId,
        },
      });

      this.setCache(cacheKey, response.data, "message");
      this.clearNotificationCache();

      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getConversations(options = {}) {
    try {
      const {page = 1, limit = 20, search} = options;
      const cacheKey = `conversations_${page}_${limit}_${search || ""}`;
      const cachedConversations = this.getFromCache(cacheKey, "conversation");
      if (cachedConversations) return cachedConversations;

      const response = await chatAPI.get("/chat/conversations", {
        params: {page, limit, search, messageType: "website", type: "company"},
      });

      this.setCache(cacheKey, response.data, "conversation");
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getUnreadCount(partyData = null) {
    try {
      let partyId = null;
      if (partyData) {
        const {targetCompanyId} =
          this.validateAndExtractPartyCompanyData(partyData);
        partyId = targetCompanyId;
      }

      const response = await chatAPI.get("/chat/unread-count", {
        params: {partyId, type: "company"},
      });
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async markMessagesAsRead(messageIds) {
    try {
      if (!Array.isArray(messageIds) || messageIds.length === 0) {
        throw new Error("Message IDs array is required");
      }
      const response = await chatAPI.post("/chat/read", {messageIds});
      this.clearNotificationCache();
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getChatNotificationSummary() {
    try {
      const cacheKey = "notification_summary";
      const cachedSummary = this.getFromCache(cacheKey, "notification");
      if (cachedSummary) return cachedSummary;

      const response = await chatAPI.get("/chat/notifications/summary");

      this.setCache(cacheKey, response.data, "notification");
      this.lastNotificationCheck = Date.now();

      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getChatNotificationDetails(options = {}) {
    try {
      const {page = 1, limit = 20, unreadOnly = false} = options;
      const cacheKey = `notification_details_${page}_${limit}_${unreadOnly}`;
      const cachedDetails = this.getFromCache(cacheKey, "notification");
      if (cachedDetails) return cachedDetails;

      const response = await chatAPI.get("/chat/notifications/details", {
        params: {page, limit, unreadOnly, type: "company"},
      });

      this.setCache(cacheKey, response.data, "notification");
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async bulkMarkNotificationsAsRead(options = {}) {
    try {
      const {notificationIds = [], markAll = false} = options;

      const response = await chatAPI.put("/chat/notifications/mark-read", {
        notificationIds,
        markAll,
      });

      this.clearNotificationCache();
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async markConversationAsRead(partyData) {
    try {
      const {targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);

      const response = await chatAPI.put(
        `/chat/conversations/${targetCompanyId}/read`
      );

      this.clearNotificationCache();
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getChatParticipants(partyData, options = {}) {
    try {
      const {type} = options;
      const {targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);

      const response = await chatAPI.get(
        `/chat/participants/${targetCompanyId}`,
        {
          params: {type: type || "company"},
        }
      );

      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getActiveCompanyChats(options = {}) {
    try {
      const {page = 1, limit = 20, type} = options;
      const cacheKey = `active_chats_${page}_${limit}_${type || ""}`;
      const cachedChats = this.getFromCache(cacheKey, "conversation");
      if (cachedChats) return cachedChats;

      const response = await chatAPI.get("/chat/active-chats", {
        params: {page, limit, type: type || "company"},
      });

      this.setCache(cacheKey, response.data, "conversation");
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getChatAnalytics(partyData, options = {}) {
    try {
      const {period = "7d", type} = options;
      const {targetCompanyId} =
        this.validateAndExtractPartyCompanyData(partyData);

      const response = await chatAPI.get(`/chat/analytics/${targetCompanyId}`, {
        params: {period, type: type || "company"},
      });

      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getCompanyStatus(companyId) {
    try {
      if (!companyId || !companyId.match(/^[0-9a-fA-F]{24}$/)) {
        throw new Error("Valid company ID is required");
      }

      const response = await chatAPI.get(`/chat/company-status/${companyId}`);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async searchCompanyMessages(query, options = {}) {
    try {
      const {page = 1, limit = 50, partyId, startDate, endDate} = options;

      if (!query || query.trim().length === 0) {
        throw new Error("Search query is required");
      }

      const response = await chatAPI.get("/chat/company-search", {
        params: {
          query: query.trim(),
          page,
          limit,
          partyId,
          messageType: "website",
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

  async getSocketStatus() {
    try {
      const response = await chatAPI.get("/chat/debug/socket-status");
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getCompanyRooms() {
    try {
      const response = await chatAPI.get("/chat/debug/company-rooms");
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async healthCheck() {
    try {
      const response = await chatAPI.get("/chat/health");
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
    return () => this.off(event, callback);
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
          logError("Error in event listener", error);
        }
      });
    }
  }

  getFromCache(key, cacheType = "message") {
    const cache = this.getCacheByType(cacheType);
    const cachedData = cache.get(key);

    const cacheDuration = cacheType === "notification" ? 30000 : 60000;

    if (cachedData && cachedData.timestamp > Date.now() - cacheDuration) {
      return cachedData.data;
    }

    cache.delete(key);
    return null;
  }

  setCache(key, data, cacheType = "message") {
    const cache = this.getCacheByType(cacheType);
    cache.set(key, {data, timestamp: Date.now()});
  }

  getCacheByType(cacheType) {
    switch (cacheType) {
      case "notification":
        return this.notificationCache;
      case "conversation":
        return this.conversationCache;
      case "message":
      default:
        return this.messageCache;
    }
  }

  clearNotificationCache() {
    this.notificationCache.clear();
    this.lastNotificationCheck = 0;
  }

  clearCache() {
    this.messageCache.clear();
    this.conversationCache.clear();
    this.processedMessages.clear();
    this.tempMessageMap.clear();
    this.clearNotificationCache();
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

  setCompanyContext(companyId, companyName = null) {
    logInfo("Setting company context", {companyId, companyName});
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
      logError("Auto set company context failed", error);
    }
    return false;
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
      isTyping: this.isTyping,
      connectionHealth: this.connectionHealth,
      environment: isProduction ? "production" : "development",
      version: APP_VERSION,
      config: {
        apiBaseUrl: API_BASE_URL,
        socketUrl: SOCKET_URL,
        timeout: apiConfig.timeout,
      },
      cacheSize: {
        messages: this.messageCache.size,
        conversations: this.conversationCache.size,
        notifications: this.notificationCache.size,
      },
      lastNotificationCheck: this.lastNotificationCheck,
      performanceMetrics: this.performanceMetrics,
    };
  }

  handleError(error) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      success: false,
    };

    if (error.response) {
      const {status, data} = error.response;
      errorInfo.status = status;
      errorInfo.message = data.message || "An error occurred";
      errorInfo.errors = data.errors || [];
    } else if (error.request) {
      errorInfo.status = 0;
      errorInfo.message = "Network error - please check your connection";
    } else {
      errorInfo.status = 0;
      errorInfo.message = error.message || "An unexpected error occurred";
    }

    logError("API Error", errorInfo);
    this.addError("API Error", error);

    return errorInfo;
  }

  disconnectSocket() {
    if (this.socket) {
      logInfo("Disconnecting socket");
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.currentChatRoom = null;
    this.isTyping = false;
    this.connectionHealth = "disconnected";
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }

  cleanup() {
    logInfo("Cleaning up chat service");
    this.disconnectSocket();
    this.clearCache();
    this.currentCompanyId = null;
    this.currentCompanyName = null;
    this.eventListeners.clear();
    this.processedMessages.clear();
    this.tempMessageMap.clear();
    this.lastMessageTime = 0;
    this.lastNotificationCheck = 0;
    this.recentErrors = [];
    this.performanceMetrics = {
      connectionAttempts: 0,
      successfulConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
    };
  }

  async quickSetup() {
    try {
      logInfo("Quick setup starting");
      const contextSet = this.autoSetCompanyContext();
      if (!contextSet) {
        throw new Error("Company context not found in localStorage");
      }

      this.initializeSocket();
      const health = await this.healthCheck();

      let notificationSummary = null;
      try {
        notificationSummary = await this.getChatNotificationSummary();
      } catch (notificationError) {
        logError("Failed to load notification summary", notificationError);
      }

      logInfo("Quick setup completed successfully");
      return {
        success: true,
        companyId: this.currentCompanyId,
        companyName: this.currentCompanyName,
        socketConnected: this.isConnected,
        health,
        notificationSummary,
      };
    } catch (error) {
      logError("Quick setup failed", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  shouldRefreshNotifications() {
    const NOTIFICATION_REFRESH_INTERVAL = 30000;
    return (
      Date.now() - this.lastNotificationCheck > NOTIFICATION_REFRESH_INTERVAL
    );
  }

  async getNotificationSummaryIfNeeded() {
    if (this.shouldRefreshNotifications()) {
      return await this.getChatNotificationSummary();
    }

    const cached = this.getFromCache("notification_summary", "notification");
    return cached || (await this.getChatNotificationSummary());
  }

  async autoRefreshNotifications() {
    try {
      if (this.shouldRefreshNotifications()) {
        const summary = await this.getChatNotificationSummary();
        this.notifyListeners("notifications_refreshed", summary);
        return summary;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

const chatService = new ChatService();

export default chatService;
export {ChatService};
