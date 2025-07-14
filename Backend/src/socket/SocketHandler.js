const jwt = require("jsonwebtoken");
const Message = require("../models/Message");

// Helper function to safely get models
const getModel = (modelName) => {
  try {
    return require(`../models/${modelName}`);
  } catch (error) {
    console.warn(`Model ${modelName} not found:`, error.message);
    return null;
  }
};

class SocketHandler {
  constructor(io, connectionHandler, messageHandler) {
    this.io = io;
    this.connectionHandler = connectionHandler;
    this.messageHandler = messageHandler;

    // Fallback if connectionHandler not provided
    if (!this.connectionHandler) {
      this.connectedUsers = new Map(); // userId -> socketId
      this.userSockets = new Map(); // socketId -> userId
    }

    this.initializeSocketEvents();
  }

  initializeSocketEvents() {
    this.io.on("connection", (socket) => {
      console.log(`🔌 Socket connected: ${socket.id}`);

      // ✅ NEW: Handle authentication from token in handshake (from SocketManager middleware)
      if (socket.user && socket.userId) {
        // User is already authenticated via middleware
        this.handleAuthenticatedConnection(socket);
      }

      // ✅ KEEP: Legacy authentication for backward compatibility
      socket.on("authenticate", async (data) => {
        await this.handleAuthentication(socket, data);
      });

      // Join specific chat rooms
      socket.on("join_chat", async (data) => {
        await this.handleJoinChat(socket, data);
      });

      // Leave chat rooms
      socket.on("leave_chat", () => {
        this.handleLeaveChat(socket);
      });

      // Send message
      socket.on("send_message", async (data) => {
        await this.handleSendMessage(socket, data);
      });

      // Mark message as read
      socket.on("mark_read", async (data) => {
        await this.handleMarkRead(socket, data);
      });

      // ✅ FIXED: Typing indicators with validation
      socket.on("typing_start", (data) => {
        this.handleTypingStart(socket, data);
      });

      socket.on("typing_stop", (data) => {
        this.handleTypingStop(socket, data);
      });

      // Get chat history
      socket.on("get_chat_history", async (data) => {
        await this.handleGetChatHistory(socket, data);
      });

      // ✅ NEW: Handle connection health check
      socket.on("ping", () => {
        socket.emit("pong");
        if (this.connectionHandler) {
          this.connectionHandler.updateActivity(socket.id);
        }
      });

      // Handle disconnection
      socket.on("disconnect", (reason) => {
        this.handleDisconnection(socket, reason);
      });

      // Handle errors
      socket.on("error", (error) => {
        console.error("❌ Socket error:", {
          socketId: socket.id,
          userId: socket.userId,
          error: error.message,
        });
      });
    });
  }

  // ✅ UPDATED: Handle pre-authenticated connections (from SocketManager middleware)
  handleAuthenticatedConnection(socket) {
    try {
      const userId = socket.userId;
      const companyId = socket.companyId;

      // ✅ FIXED: Validate required data
      if (!userId) {
        console.error("❌ Missing userId in authenticated connection");
        socket.emit("auth_error", {message: "Missing user ID"});
        return;
      }

      // Store connections using connectionHandler or fallback
      if (this.connectionHandler) {
        this.connectionHandler.addConnection(socket);
      } else {
        this.connectedUsers.set(userId.toString(), socket.id);
        this.userSockets.set(socket.id, userId.toString());
      }

      // ✅ FIXED: Join company room only if companyId exists
      if (companyId) {
        socket.join(`company_${companyId}`);
      }

      // ✅ NEW: Join user's personal room
      socket.join(`user_${userId}`);

      // Notify client of successful connection
      socket.emit("authenticated", {
        userId,
        socketId: socket.id,
        companyId: companyId || null,
        companyName: socket.company?.businessName || null,
        message: "Successfully authenticated via token",
      });

      // ✅ FIXED: Notify other company members only if companyId exists
      if (companyId) {
        socket.to(`company_${companyId}`).emit("user_online", {
          userId,
          username: socket.user?.username,
          companyId,
        });
      }

      console.log(
        `✅ User ${socket.user?.username} (${userId}) from company ${
          socket.company?.businessName || "No Company"
        } authenticated on socket ${socket.id}`
      );
    } catch (error) {
      console.error("❌ Authenticated connection error:", error);
      socket.emit("auth_error", {
        message: "Failed to initialize authenticated connection",
      });
    }
  }

  // ✅ UPDATED: Legacy authentication method
  async handleAuthentication(socket, data) {
    try {
      const {token, companyId} = data;

      if (!token) {
        socket.emit("auth_error", {message: "Authentication token required"});
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId || decoded.id;

      // ✅ FIXED: Validate decoded data
      if (!userId) {
        socket.emit("auth_error", {message: "Invalid token - no user ID"});
        return;
      }

      // Store user info in socket
      socket.userId = userId;
      socket.companyId = companyId;

      // Store connections using connectionHandler or fallback
      if (this.connectionHandler) {
        // Create mock socket object for connectionHandler
        const mockSocket = {
          id: socket.id,
          userId: userId,
          companyId: companyId,
          user: {username: `user_${userId}`},
        };
        this.connectionHandler.addConnection(mockSocket);
      } else {
        this.connectedUsers.set(userId.toString(), socket.id);
        this.userSockets.set(socket.id, userId.toString());
      }

      // Join user's personal room
      socket.join(`user_${userId}`);

      // Join company room for company-wide notifications (only if companyId exists)
      if (companyId) {
        socket.join(`company_${companyId}`);
      }

      socket.emit("authenticated", {
        userId,
        socketId: socket.id,
        companyId: companyId || null,
        message: "Successfully authenticated",
      });

      // Notify others that user is online
      socket.broadcast.emit("user_online", {userId});

      console.log(
        `✅ User ${userId} authenticated on socket ${socket.id} (legacy method)`
      );
    } catch (error) {
      console.error("❌ Authentication error:", error);
      socket.emit("auth_error", {message: "Invalid authentication token"});
    }
  }

  // ✅ UPDATED: Join company-to-company chat with validation
  async handleJoinChat(socket, data) {
    try {
      const {chatId, partyId, otherCompanyId} = data;

      if (!socket.userId) {
        socket.emit("error", {message: "Not authenticated - missing user ID"});
        return;
      }

      if (!socket.companyId) {
        socket.emit("error", {
          message: "Not authenticated - missing company ID",
        });
        return;
      }

      const targetCompanyId = otherCompanyId || partyId;
      if (!targetCompanyId) {
        socket.emit("error", {message: "Missing target company ID"});
        return;
      }

      // ✅ FIXED: Create company-to-company chat room with validation
      const chatRoomId =
        chatId ||
        this.generateCompanyChatRoomId(socket.companyId, targetCompanyId);

      if (!chatRoomId) {
        socket.emit("error", {message: "Failed to generate chat room ID"});
        return;
      }

      socket.join(chatRoomId);
      socket.currentChatRoom = chatRoomId;

      socket.emit("joined_chat", {
        chatRoomId,
        myCompanyId: socket.companyId,
        otherCompanyId: targetCompanyId,
        success: true,
        message: "Successfully joined company chat",
      });

      // ✅ NEW: Notify other company about user joining
      socket.to(chatRoomId).emit("user_joined_chat", {
        userId: socket.userId,
        username: socket.user?.username || `User ${socket.userId}`,
        companyId: socket.companyId,
        companyName:
          socket.company?.businessName || `Company ${socket.companyId}`,
      });

      console.log(
        `🏠 User ${socket.userId} from company ${socket.companyId} joined chat room: ${chatRoomId}`
      );
    } catch (error) {
      console.error("❌ Join chat error:", error);
      socket.emit("error", {message: "Failed to join chat"});
    }
  }

  // ✅ FIXED: Leave chat room with validation
  handleLeaveChat(socket) {
    try {
      if (socket.currentChatRoom) {
        console.log(
          `🚪 User ${socket.userId} leaving chat room: ${socket.currentChatRoom}`
        );

        // ✅ FIXED: Notify other company about user leaving (with validation)
        if (socket.userId && socket.companyId) {
          socket.to(socket.currentChatRoom).emit("user_left_chat", {
            userId: socket.userId,
            username: socket.user?.username || `User ${socket.userId}`,
            companyId: socket.companyId,
            companyName:
              socket.company?.businessName || `Company ${socket.companyId}`,
          });
        }

        socket.leave(socket.currentChatRoom);
        socket.emit("left_chat", {
          chatRoomId: socket.currentChatRoom,
          success: true,
          message: "Successfully left chat",
        });

        socket.currentChatRoom = null;
      }
    } catch (error) {
      console.error("❌ Leave chat error:", error);
      socket.emit("error", {message: "Failed to leave chat"});
    }
  }

  // ✅ UPDATED: Send message between companies with better validation
  async handleSendMessage(socket, data) {
    try {
      const {
        partyId, // This is the other company ID
        content,
        messageType = "whatsapp",
        templateId,
        attachments = [],
        tempId, // For frontend tracking
      } = data;

      // ✅ FIXED: Enhanced validation
      if (!socket.userId) {
        socket.emit("error", {message: "Not authenticated - missing user ID"});
        return;
      }

      if (!socket.companyId) {
        socket.emit("error", {
          message: "Not authenticated - missing company ID",
        });
        return;
      }

      if (!partyId) {
        socket.emit("error", {message: "Missing target company ID"});
        return;
      }

      if (!content || content.trim() === "") {
        socket.emit("error", {message: "Message content cannot be empty"});
        return;
      }

      console.log(`📤 Company-to-company message:`, {
        fromCompany: socket.company?.businessName || socket.companyId,
        fromUser: socket.user?.username || socket.userId,
        toCompany: partyId,
        content: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
        type: messageType,
        socketId: socket.id,
      });

      // ✅ FIXED: Create message data for company-to-company chat
      const messageData = {
        senderCompanyId: socket.companyId,
        receiverCompanyId: partyId,
        companyId: socket.companyId, // For backward compatibility
        partyId: partyId,
        senderId: socket.userId,
        senderType: "company",
        content,
        messageType,
        templateId,
        attachments,
        status: "sent",
        direction: "outbound",
        createdBy: socket.userId,
      };

      // Save to database
      let savedMessage;
      try {
        // Use messageHandler if available, otherwise direct Message model
        if (this.messageHandler && this.messageHandler.handleMessage) {
          const result = await this.messageHandler.handleMessage(messageData);
          savedMessage = result.success ? result.message : null;
        } else if (this.messageHandler && this.messageHandler.processMessage) {
          const result = await this.messageHandler.processMessage(messageData);
          savedMessage = result.message;
        } else {
          savedMessage = await Message.create(messageData);
        }

        if (!savedMessage) {
          throw new Error("Failed to save message");
        }
      } catch (dbError) {
        console.error("❌ Database save failed:", dbError);
        socket.emit("message_error", {
          tempId,
          error: "Failed to save message",
          success: false,
        });
        return;
      }

      // ✅ FIXED: Emit to company-to-company chat room with validation
      const chatRoomId =
        socket.currentChatRoom ||
        this.generateCompanyChatRoomId(socket.companyId, partyId);

      if (!chatRoomId) {
        console.error(
          "❌ Failed to generate chat room ID for message emission"
        );
        socket.emit("message_error", {
          tempId,
          error: "Failed to deliver message",
          success: false,
        });
        return;
      }

      const messageToEmit = {
        ...(savedMessage.toObject ? savedMessage.toObject() : savedMessage),
        id: savedMessage._id,
        senderName:
          socket.user?.username ||
          socket.user?.fullName ||
          `User ${socket.userId}`,
        senderCompanyName:
          socket.company?.businessName || `Company ${socket.companyId}`,
        senderCompanyId: socket.companyId,
        receiverCompanyId: partyId,
        tempId,
      };

      // Emit to chat room (both companies will receive)
      this.io.to(chatRoomId).emit("new_message", messageToEmit);

      // Send delivery confirmation to sender
      socket.emit("message_sent", {
        messageId: savedMessage._id,
        tempId,
        status: "sent",
        success: true,
        timestamp: savedMessage.createdAt || new Date(),
      });

      console.log(
        `✅ Company message sent from ${socket.companyId} to ${partyId}`
      );

      // ✅ NEW: Simulate message delivery status
      setTimeout(() => {
        this.io.to(chatRoomId).emit("message_delivered", {
          messageId: savedMessage._id,
          status: "delivered",
          timestamp: new Date(),
        });
      }, 1000);
    } catch (error) {
      console.error("❌ Send message error:", error);
      socket.emit("message_error", {
        tempId: data.tempId,
        error: "Failed to send message",
        success: false,
      });
    }
  }

  // ✅ UPDATED: Mark message as read with validation
  async handleMarkRead(socket, data) {
    try {
      const {messageId, messageIds, chatRoomId} = data;
      const idsToMark = messageIds || [messageId];

      if (!socket.userId) {
        socket.emit("error", {message: "Not authenticated"});
        return;
      }

      if (!idsToMark || idsToMark.length === 0) {
        socket.emit("error", {message: "No message IDs provided"});
        return;
      }

      try {
        // Update message read status in database
        if (this.messageHandler && this.messageHandler.markMessagesAsRead) {
          await this.messageHandler.markMessagesAsRead(
            idsToMark,
            socket.userId
          );
        } else {
          // Fallback to direct model update
          await Message.updateMany(
            {_id: {$in: idsToMark}},
            {
              status: "read",
              readAt: new Date(),
              readBy: socket.userId,
            }
          );
        }
      } catch (dbError) {
        console.error("❌ Failed to update read status in database:", dbError);
      }

      // Notify others in the chat
      const roomId = chatRoomId || socket.currentChatRoom;
      if (roomId) {
        socket.to(roomId).emit("message_read", {
          messageIds: idsToMark,
          readBy: socket.userId,
          readByName: socket.user?.username || `User ${socket.userId}`,
          timestamp: new Date(),
        });
      }

      console.log(`👁️ Messages marked as read by user ${socket.userId}`);
    } catch (error) {
      console.error("❌ Mark read error:", error);
    }
  }

  // ✅ UPDATED: Get chat history for company-to-company chat with validation
  async handleGetChatHistory(socket, data) {
    try {
      const {partyId, page = 1, limit = 50} = data;

      if (!socket.userId) {
        socket.emit("error", {message: "Not authenticated - missing user ID"});
        return;
      }

      if (!socket.companyId) {
        socket.emit("error", {
          message: "Not authenticated - missing company ID",
        });
        return;
      }

      if (!partyId) {
        socket.emit("error", {message: "Missing target company ID"});
        return;
      }

      try {
        // Get chat history using messageHandler or direct query
        let chatHistory;
        if (this.messageHandler && this.messageHandler.getChatHistory) {
          chatHistory = await this.messageHandler.getChatHistory({
            companyId: socket.companyId,
            partyId,
            page,
            limit,
          });
        } else {
          // ✅ FIXED: Query for company-to-company messages
          const messages = await Message.find({
            $or: [
              {senderCompanyId: socket.companyId, receiverCompanyId: partyId},
              {senderCompanyId: partyId, receiverCompanyId: socket.companyId},
            ],
            isDeleted: false,
          })
            .sort({createdAt: -1})
            .limit(limit)
            .skip((page - 1) * limit)
            .populate("senderId", "username fullName")
            .lean();

          chatHistory = {
            messages: messages.reverse(),
            pagination: {
              page,
              limit,
              total: messages.length,
            },
          };
        }

        socket.emit("chat_history", {
          success: true,
          data: chatHistory,
          partyId,
        });

        console.log(
          `📚 Company chat history sent to user ${socket.userId} for company ${partyId}`
        );
      } catch (dbError) {
        console.error("❌ Failed to load chat history:", dbError);
        socket.emit("chat_history_error", {
          success: false,
          message: "Failed to load chat history",
          partyId,
        });
      }
    } catch (error) {
      console.error("❌ Get chat history error:", error);
      socket.emit("error", {message: "Failed to get chat history"});
    }
  }

  // ✅ FIXED: Typing indicators for company chat with validation
  handleTypingStart(socket, data) {
    try {
      const {partyId, otherCompanyId} = data; // partyId is the other company ID
      const targetCompanyId = otherCompanyId || partyId;

      // ✅ FIXED: Comprehensive validation
      if (!socket.userId) {
        console.warn("⚠️ Typing start: Missing user ID");
        return;
      }

      if (!socket.companyId) {
        console.warn("⚠️ Typing start: Missing company ID");
        return;
      }

      if (!targetCompanyId) {
        console.warn("⚠️ Typing start: Missing target company ID");
        return;
      }

      // Update activity if connectionHandler is available
      if (this.connectionHandler) {
        this.connectionHandler.updateActivity(socket.id);
      }

      const roomId = this.generateCompanyChatRoomId(
        socket.companyId,
        targetCompanyId
      );
      if (!roomId) {
        console.warn("⚠️ Typing start: Failed to generate room ID");
        return;
      }

      socket.to(roomId).emit("user_typing", {
        userId: socket.userId,
        username: socket.user?.username || `User ${socket.userId}`,
        companyId: socket.companyId,
        companyName:
          socket.company?.businessName || `Company ${socket.companyId}`,
        otherCompanyId: targetCompanyId,
        isTyping: true,
        timestamp: new Date(),
      });

      console.log(
        `⌨️ User ${socket.userId} from company ${socket.companyId} started typing to company ${targetCompanyId}`
      );
    } catch (error) {
      console.error("❌ Typing start error:", error);
    }
  }

  handleTypingStop(socket, data) {
    try {
      const {partyId, otherCompanyId} = data; // partyId is the other company ID
      const targetCompanyId = otherCompanyId || partyId;

      // ✅ FIXED: Comprehensive validation
      if (!socket.userId) {
        console.warn("⚠️ Typing stop: Missing user ID");
        return;
      }

      if (!socket.companyId) {
        console.warn("⚠️ Typing stop: Missing company ID");
        return;
      }

      if (!targetCompanyId) {
        console.warn("⚠️ Typing stop: Missing target company ID");
        return;
      }

      // Update activity if connectionHandler is available
      if (this.connectionHandler) {
        this.connectionHandler.updateActivity(socket.id);
      }

      const roomId = this.generateCompanyChatRoomId(
        socket.companyId,
        targetCompanyId
      );
      if (!roomId) {
        console.warn("⚠️ Typing stop: Failed to generate room ID");
        return;
      }

      socket.to(roomId).emit("user_typing", {
        userId: socket.userId,
        username: socket.user?.username || `User ${socket.userId}`,
        companyId: socket.companyId,
        companyName:
          socket.company?.businessName || `Company ${socket.companyId}`,
        otherCompanyId: targetCompanyId,
        isTyping: false,
        timestamp: new Date(),
      });

      console.log(
        `⌨️ User ${socket.userId} from company ${socket.companyId} stopped typing to company ${targetCompanyId}`
      );
    } catch (error) {
      console.error("❌ Typing stop error:", error);
    }
  }

  // ✅ UPDATED: Handle disconnection with validation
  handleDisconnection(socket, reason) {
    try {
      const userId = socket.userId;
      const companyId = socket.companyId;

      if (userId) {
        // Remove connection using connectionHandler or fallback
        if (this.connectionHandler) {
          this.connectionHandler.removeConnection(socket.id);
        } else {
          this.connectedUsers.delete(userId.toString());
          this.userSockets.delete(socket.id);
        }

        // ✅ FIXED: Notify company members that user is offline (only if companyId exists)
        if (companyId) {
          socket.to(`company_${companyId}`).emit("user_offline", {
            userId,
            username: socket.user?.username || `User ${userId}`,
            companyId,
          });
        }

        // ✅ FIXED: Notify chat room about user leaving (with validation)
        if (socket.currentChatRoom) {
          socket.to(socket.currentChatRoom).emit("user_left_chat", {
            userId,
            username: socket.user?.username || `User ${userId}`,
            companyId: companyId || "Unknown",
            companyName:
              socket.company?.businessName ||
              `Company ${companyId || "Unknown"}`,
          });
        }
      }

      console.log(
        `❌ Socket disconnected: ${socket.id}, User: ${
          userId || "Unknown"
        }, Company: ${companyId || "Unknown"}, Reason: ${reason}`
      );
    } catch (error) {
      console.error("❌ Disconnection handling error:", error);
    }
  }

  // ✅ FIXED: Helper method to send message to specific user with validation
  sendToUser(userId, event, data) {
    try {
      if (!userId) {
        console.warn("⚠️ SendToUser: Missing user ID");
        return false;
      }

      if (this.connectionHandler) {
        const socketIds = this.connectionHandler.getUserConnections(userId);
        if (socketIds.length > 0) {
          socketIds.forEach((socketId) => {
            this.io.to(socketId).emit(event, data);
          });
          return true;
        }
      } else {
        const socketId = this.connectedUsers.get(userId.toString());
        if (socketId) {
          this.io.to(socketId).emit(event, data);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("❌ SendToUser error:", error);
      return false;
    }
  }

  // ✅ FIXED: Send message to company-to-company chat room with validation
  sendToChatRoom(companyId, partyId, event, data) {
    try {
      if (!companyId || !partyId) {
        console.warn("⚠️ SendToChatRoom: Missing company IDs", {
          companyId,
          partyId,
        });
        return false;
      }

      const roomId = this.generateCompanyChatRoomId(companyId, partyId);
      if (!roomId) {
        console.warn("⚠️ SendToChatRoom: Failed to generate room ID");
        return false;
      }

      this.io.to(roomId).emit(event, data);
      return true;
    } catch (error) {
      console.error("❌ SendToChatRoom error:", error);
      return false;
    }
  }

  // ✅ FIXED: Send message to company with validation
  sendToCompany(companyId, event, data) {
    try {
      if (!companyId) {
        console.warn("⚠️ SendToCompany: Missing company ID");
        return false;
      }

      this.io.to(`company_${companyId}`).emit(event, data);
      return true;
    } catch (error) {
      console.error("❌ SendToCompany error:", error);
      return false;
    }
  }

  // ✅ FIXED: Generate consistent room ID for company-to-company chat with validation
  generateCompanyChatRoomId(companyId1, companyId2) {
    try {
      // ✅ FIXED: Comprehensive validation
      if (!companyId1 || !companyId2) {
        console.warn("⚠️ GenerateCompanyChatRoomId: Missing company IDs", {
          companyId1,
          companyId2,
        });
        return null;
      }

      // ✅ FIXED: Handle different data types and ensure toString() works
      const id1 = companyId1?.toString
        ? companyId1.toString()
        : String(companyId1);
      const id2 = companyId2?.toString
        ? companyId2.toString()
        : String(companyId2);

      if (!id1 || !id2 || id1 === "undefined" || id2 === "undefined") {
        console.warn(
          "⚠️ GenerateCompanyChatRoomId: Invalid company IDs after conversion",
          {
            id1,
            id2,
            originalId1: companyId1,
            originalId2: companyId2,
          }
        );
        return null;
      }

      // Sort company IDs to ensure consistent room naming
      const sortedIds = [id1, id2].sort();
      const roomId = `company_chat_${sortedIds[0]}_${sortedIds[1]}`;

      console.log(
        `🏠 Generated chat room ID: ${roomId} for companies ${id1} and ${id2}`
      );
      return roomId;
    } catch (error) {
      console.error("❌ GenerateCompanyChatRoomId error:", error, {
        companyId1,
        companyId2,
      });
      return null;
    }
  }

  // ✅ FIXED: Helper method to get online users with error handling
  getOnlineUsers() {
    try {
      if (this.connectionHandler) {
        return this.connectionHandler.getOnlineUsers();
      }
      return Array.from(this.connectedUsers.keys());
    } catch (error) {
      console.error("❌ GetOnlineUsers error:", error);
      return [];
    }
  }

  // ✅ FIXED: Helper method to check if user is online with validation
  isUserOnline(userId) {
    try {
      if (!userId) {
        return false;
      }

      if (this.connectionHandler) {
        return this.connectionHandler.isUserOnline(userId);
      }
      return this.connectedUsers.has(userId.toString());
    } catch (error) {
      console.error("❌ IsUserOnline error:", error);
      return false;
    }
  }

  // ✅ FIXED: Get connection statistics with error handling
  getConnectionStats() {
    try {
      if (this.connectionHandler) {
        return this.connectionHandler.getConnectionStats();
      }

      return {
        totalConnections: this.connectedUsers.size,
        connectedUsers: Array.from(this.connectedUsers.keys()),
        socketMappings: Array.from(this.userSockets.entries()),
      };
    } catch (error) {
      console.error("❌ GetConnectionStats error:", error);
      return {
        totalConnections: 0,
        connectedUsers: [],
        socketMappings: [],
        error: error.message,
      };
    }
  }

  // ✅ FIXED: Get all connected users for a company with validation
  getCompanyUsers(companyId) {
    try {
      if (!companyId) {
        return [];
      }

      const room = this.io.sockets.adapter.rooms.get(`company_${companyId}`);
      return room ? Array.from(room) : [];
    } catch (error) {
      console.error("❌ GetCompanyUsers error:", error);
      return [];
    }
  }

  // ✅ FIXED: Check if companies are in active chat with validation
  areCompaniesInChat(companyId1, companyId2) {
    try {
      if (!companyId1 || !companyId2) {
        return false;
      }

      const roomId = this.generateCompanyChatRoomId(companyId1, companyId2);
      if (!roomId) {
        return false;
      }

      const room = this.io.sockets.adapter.rooms.get(roomId);
      return room && room.size > 0;
    } catch (error) {
      console.error("❌ AreCompaniesInChat error:", error);
      return false;
    }
  }
}

module.exports = SocketHandler;
