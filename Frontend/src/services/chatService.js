import axios from "axios";
import {io} from "socket.io-client";

const API_BASE_URL = "http://localhost:5000";

const chatAPI = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {"Content-Type": "application/json"},
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
      // Silent fail
    }
  }
  return config;
});

chatAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
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

    // Chat state
    this.currentChatRoom = null;
    this.currentCompanyId = null;
    this.currentCompanyName = null;
    this.currentUserId = null;
    this.currentUsername = null;

    // Caching and deduplication
    this.messageCache = new Map();
    this.conversationCache = new Map();
    this.processedMessages = new Set();
    this.tempMessageMap = new Map();
    this.notificationCache = new Map();
    this.lastNotificationCheck = 0;

    // Typing state
    this.isTyping = false;
    this.typingTimeout = null;
    this.lastMessageTime = 0;
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
          // Silent fail
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
      partyData.linkedCompanyId,
      partyData.externalCompanyId,
      partyData.chatCompanyId,
      partyData.targetCompanyId,
      partyData.company,
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

    if (partyData.name === "Laptop") {
      targetCompanyId = "6843bfafe8aeb8af0d3a411e";
    } else if (partyData.name === "Sai Computers") {
      targetCompanyId = "6845147f3f012c95e10e4323";
    } else {
      const extractionAttempts = [
        partyData.targetCompanyId,
        partyData.linkedCompanyId,
        partyData.chatCompanyId,
        partyData.externalCompanyId,
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
    }

    if (!targetCompanyId) {
      throw new Error("Party is not linked to any company for chat");
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
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    if (!token) {
      return null;
    }

    try {
      const tokenParts = token.split(".");
      if (tokenParts.length !== 3) {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        return null;
      }
    } catch (error) {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      return null;
    }

    const currentCompany = localStorage.getItem("currentCompany");

    try {
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      this.socket = io(API_BASE_URL, {
        auth: {
          token,
          companyContext: currentCompany,
        },
        extraHeaders: {
          Authorization: `Bearer ${token}`,
          "X-Company-Context": currentCompany || "",
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

    this.socket.on("connection_confirmed", (data) => {
      this.isConnected = true;
      this.currentCompanyId = data.companyId;
      this.currentCompanyName = data.companyName;
      this.currentUserId = data.userId;
      this.currentUsername = data.username;
      this.notifyListeners("socket_authenticated", data);
    });

    this.socket.on("disconnect", (reason) => {
      this.isConnected = false;
      this.notifyListeners("socket_disconnected", {reason});
    });

    this.socket.on("connect_error", (error) => {
      if (
        error.message === "Authentication error" ||
        error.message === "jwt malformed" ||
        error.message === "jwt expired" ||
        error.message === "invalid token" ||
        error.code === "AUTHENTICATION_FAILED" ||
        error.type === "UnauthorizedError"
      ) {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");

        this.notifyListeners("auth_failed", {
          error: "Session expired. Please login again.",
          shouldRedirectToLogin: true,
          originalError: error.message,
        });
        return;
      }

      this.handleReconnect();
    });

    this.socket.on("authentication_error", (error) => {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");

      this.notifyListeners("auth_failed", {
        error: "Authentication failed. Please login again.",
        shouldRedirectToLogin: true,
        code: error.code || "AUTH_ERROR",
      });
    });

    this.socket.on("auth_error", (error) => {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");

      this.notifyListeners("auth_failed", {
        error: "Authentication failed. Please login again.",
        shouldRedirectToLogin: true,
        code: error.code || "AUTH_ERROR",
      });
    });

    this.socket.on("error", (error) => {
      if (
        error.code === "TOKEN_EXPIRED" ||
        error.code === "AUTHENTICATION_ERROR" ||
        error.code === "INVALID_TOKEN" ||
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
        this.notifyListeners("socket_error", error);
      }
    });

    this.socket.on("company_chat_error", (error) => {
      if (
        error.code === "TOKEN_EXPIRED" ||
        error.code === "AUTHENTICATION_ERROR" ||
        error.message === "jwt expired"
      ) {
        this.notifyListeners("auth_failed", {
          error: "Chat authentication failed. Please login again.",
          shouldRedirectToLogin: true,
          code: error.code,
        });
      } else {
        this.notifyListeners("chat_room_error", {
          error: error.error || error.message || "Failed to join chat room",
          code: error.code || "CHAT_ERROR",
          details: error,
          shouldRedirectToLogin: false,
        });
      }
    });

    this.socket.on("new_message", (message) => {
      try {
        const messageId = message._id || message.id;
        const content = message.content || "";
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
        console.error("Error processing new_message:", error);
      }
    });

    this.socket.on("company_chat_joined", (data) => {
      this.currentChatRoom = data.roomId;
      this.notifyListeners("company_chat_joined", data);
    });

    this.socket.on("message_sent", (data) => {
      this.notifyListeners("message_sent", data);
    });

    this.socket.on("new_chat_notification", (notification) => {
      try {
        this.clearNotificationCache();
        this.notifyListeners("new_chat_notification", notification);
      } catch (error) {
        // Silent fail
      }
    });

    this.socket.on("notification_marked_read", (data) => {
      try {
        this.clearNotificationCache();
        this.notifyListeners("notification_marked_read", data);
      } catch (error) {
        // Silent fail
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
        // Silent fail
      }
    });

    this.socket.on("message_delivered", (data) => {
      try {
        this.notifyListeners("message_delivered", {
          messageId: data.messageId,
          deliveredAt: data.deliveredAt,
        });
      } catch (error) {
        // Silent fail
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
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;
      setTimeout(() => {
        if (this.socket) this.socket.connect();
      }, delay);
    } else {
      this.notifyListeners("max_reconnect_attempts_reached");
    }
  }

  async testSocketConnection() {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const currentCompany = localStorage.getItem("currentCompany");
      if (!currentCompany) {
        throw new Error("No company context found");
      }

      if (!this.socket) {
        this.initializeSocket();
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(
            new Error(
              "Socket connection timeout - authentication may have failed"
            )
          );
        }, 15000);

        if (this.isConnected) {
          clearTimeout(timeout);
          resolve({
            success: true,
            socketId: this.socket.id,
            authenticated: true,
            companyId: this.currentCompanyId,
          });
        } else {
          const onConnect = () => {
            // Wait for authentication
          };

          const onAuthenticated = (data) => {
            clearTimeout(timeout);
            this.socket.off("connect", onConnect);
            this.socket.off("authentication_error", onAuthError);
            resolve({
              success: true,
              socketId: this.socket.id,
              authenticated: true,
              companyId: data.companyId,
              authData: data,
            });
          };

          const onAuthError = (error) => {
            clearTimeout(timeout);
            this.socket.off("connect", onConnect);
            this.socket.off("connection_confirmed", onAuthenticated);
            reject(
              new Error(
                `Authentication failed: ${
                  error.error || error.message || "Unknown error"
                }`
              )
            );
          };

          const onConnectError = (error) => {
            clearTimeout(timeout);
            this.socket.off("connect", onConnect);
            this.socket.off("connection_confirmed", onAuthenticated);
            this.socket.off("authentication_error", onAuthError);
            reject(error);
          };

          this.socket.once("connect", onConnect);
          this.socket.once("connection_confirmed", onAuthenticated);
          this.socket.once("authentication_error", onAuthError);
          this.socket.once("connect_error", onConnectError);
        }
      });
    } catch (error) {
      return {
        success: false,
        error: error.message,
        authenticated: false,
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

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Join chat timeout")),
          10000
        );

        this.socket.once("company_chat_joined", (response) => {
          clearTimeout(timeout);
          this.currentChatRoom = response.roomId;
          resolve(response);
        });

        this.socket.once("company_chat_error", (error) => {
          clearTimeout(timeout);
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
      // Silent fail
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
      // Silent fail
    }
  }

  async sendMessage(messageData) {
    try {
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
        // Handle legacy format
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

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Message send timeout after 10 seconds")),
          10000
        );

        // ✅ FIX: Enhanced response handling - matches the actual response format
        const handleSuccess = (response) => {
          clearTimeout(timeout);
          this.socket.off("message_sent", handleSuccess);
          this.socket.off("message_error", handleError);

          this.clearHistoryCache(finalMessageData.receiverCompanyId);
          this.clearConversationCache();
          this.clearNotificationCache();

          // ✅ FIX: Return the format that PartyChat expects
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

          console.error("❌ CHATSERVICE: Message send failed:", {
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
      console.error("❌ CHATSERVICE: Send message error:", error);
      // ✅ FIX: Return consistent error format
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

      const response = await chatAPI.get(
        `/api/chat/history/${targetCompanyId}`,
        {
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
        }
      );

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

      const response = await chatAPI.get("/api/chat/conversations", {
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

      const response = await chatAPI.get("/api/chat/unread-count", {
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
      const response = await chatAPI.post("/api/chat/read", {messageIds});
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

      const response = await chatAPI.get("/api/chat/notifications/summary");

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

      const response = await chatAPI.get("/api/chat/notifications/details", {
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

      const response = await chatAPI.put("/api/chat/notifications/mark-read", {
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
        `/api/chat/conversations/${targetCompanyId}/read`
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
        `/api/chat/participants/${targetCompanyId}`,
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

      const response = await chatAPI.get("/api/chat/active-chats", {
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

      const response = await chatAPI.get(
        `/api/chat/analytics/${targetCompanyId}`,
        {
          params: {period, type: type || "company"},
        }
      );

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

      const response = await chatAPI.get(
        `/api/chat/company-status/${companyId}`
      );
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

      const response = await chatAPI.get("/api/chat/company-search", {
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
      const response = await chatAPI.get("/api/chat/debug/socket-status");
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getCompanyRooms() {
    try {
      const response = await chatAPI.get("/api/chat/debug/company-rooms");
      return response.data;
    } catch (error) {
      return this.handleError(error);
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
          console.error("Error in event listener:", error);
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
      cacheSize: {
        messages: this.messageCache.size,
        conversations: this.conversationCache.size,
        notifications: this.notificationCache.size,
      },
      lastNotificationCheck: this.lastNotificationCheck,
    };
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

  cleanup() {
    this.disconnectSocket();
    this.clearCache();
    this.currentCompanyId = null;
    this.currentCompanyName = null;
    this.eventListeners.clear();
    this.processedMessages.clear();
    this.tempMessageMap.clear();
    this.lastMessageTime = 0;
    this.lastNotificationCheck = 0;
  }

  async quickSetup() {
    try {
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
        // Silent fail
      }

      return {
        success: true,
        companyId: this.currentCompanyId,
        companyName: this.currentCompanyName,
        socketConnected: this.isConnected,
        health,
        notificationSummary,
      };
    } catch (error) {
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
