const jwt = require("jsonwebtoken");
const Message = require("../models/Message");

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

    if (!this.connectionHandler) {
      this.connectedUsers = new Map();
      this.userSockets = new Map();
    }

    this.initializeSocketEvents();
  }

  initializeSocketEvents() {
    this.io.on("connection", (socket) => {
      console.log(`🔌 Socket connected: ${socket.id}`);

      if (socket.user && socket.userId) {
        this.handleAuthenticatedConnection(socket);
      }

      socket.on("authenticate", async (data) => {
        await this.handleAuthentication(socket, data);
      });

      socket.on("join_chat", async (data) => {
        await this.handleJoinChat(socket, data);
      });

      socket.on("join_company_chat", async (data) => {
        await this.handleJoinCompanyChat(socket, data);
      });

      socket.on("leave_company_chat", async (data) => {
        await this.handleLeaveCompanyChat(socket, data);
      });

      socket.on("leave_chat", () => {
        this.handleLeaveChat(socket);
      });

      socket.on("send_message", async (data) => {
        await this.handleSendMessage(socket, data);
      });

      socket.on("mark_read", async (data) => {
        await this.handleMarkRead(socket, data);
      });

      socket.on("typing_start", (data) => {
        this.handleTypingStart(socket, data);
      });

      socket.on("typing_stop", (data) => {
        this.handleTypingStop(socket, data);
      });

      socket.on("get_chat_history", async (data) => {
        await this.handleGetChatHistory(socket, data);
      });

      socket.on("ping", () => {
        socket.emit("pong");
        if (this.connectionHandler) {
          this.connectionHandler.updateActivity(socket.id);
        }
      });

      socket.on("disconnect", (reason) => {
        this.handleDisconnection(socket, reason);
      });

      socket.on("error", (error) => {
        console.error("❌ Socket error:", {
          socketId: socket.id,
          userId: socket.userId,
          error: error.message,
        });
      });
    });
  }

  handleAuthenticatedConnection(socket) {
    try {
      const userId = socket.userId;
      const companyId = socket.companyId;

      if (!userId) {
        console.error("❌ Missing userId in authenticated connection");
        socket.emit("auth_error", {message: "Missing user ID"});
        return;
      }

      if (this.connectionHandler) {
        this.connectionHandler.addConnection(socket);
      } else {
        this.connectedUsers.set(userId.toString(), socket.id);
        this.userSockets.set(socket.id, userId.toString());
      }

      if (companyId) {
        socket.join(`company_${companyId}`);
      }

      socket.join(`user_${userId}`);

      socket.emit("connection_confirmed", {
        userId,
        socketId: socket.id,
        companyId: companyId || null,
        companyName: socket.company?.businessName || null,
        username: socket.user?.username || socket.user?.name,
        message: "Successfully authenticated via token",
      });

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

  async handleAuthentication(socket, data) {
    try {
      const {token, companyId} = data;

      if (!token) {
        socket.emit("auth_error", {message: "Authentication token required"});
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId || decoded.id;

      if (!userId) {
        socket.emit("auth_error", {message: "Invalid token - no user ID"});
        return;
      }

      socket.userId = userId;
      socket.companyId = companyId;

      if (this.connectionHandler) {
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

      socket.join(`user_${userId}`);

      if (companyId) {
        socket.join(`company_${companyId}`);
      }

      socket.emit("authenticated", {
        userId,
        socketId: socket.id,
        companyId: companyId || null,
        message: "Successfully authenticated",
      });

      socket.broadcast.emit("user_online", {userId});

      console.log(
        `✅ User ${userId} authenticated on socket ${socket.id} (legacy method)`
      );
    } catch (error) {
      console.error("❌ Authentication error:", error);
      socket.emit("auth_error", {message: "Invalid authentication token"});
    }
  }

  generateCompanyChatRoomId(companyId1, companyId2) {
    try {
      if (!companyId1 || !companyId2) {
        console.error("❌ generateCompanyChatRoomId: Missing company IDs", {
          companyId1,
          companyId2,
        });
        return null;
      }

      const id1 = companyId1.toString();
      const id2 = companyId2.toString();
      const sortedIds = [id1, id2].sort();
      const roomId = `company_chat_${sortedIds[0]}_${sortedIds[1]}`;

      console.log("🏠 SOCKET: Generated consistent room ID:", {
        input: {companyId1: id1, companyId2: id2},
        sorted: sortedIds,
        roomId,
        timestamp: new Date().toISOString(),
      });

      return roomId;
    } catch (error) {
      console.error("❌ generateCompanyChatRoomId error:", error);
      return null;
    }
  }

  async handleJoinCompanyChat(socket, data) {
    try {
      console.log("🏠 BACKEND: join_company_chat initiated:", {
        socketId: socket.id,
        userId: socket.userId,
        companyId: socket.companyId,
        rawData: data,
        existingRooms: Array.from(socket.rooms),
      });

      const myCompanyId = data.myCompanyId || socket.companyId;
      const targetCompanyId =
        data.targetCompanyId || data.otherCompanyId || data.partyId;
      const partyId = data.partyId;
      const partyName = data.partyName;

      console.log("🏠 BACKEND: Extracted and validated data:", {
        myCompanyId,
        targetCompanyId,
        partyId,
        partyName,
      });

      const validationErrors = [];

      if (!socket.userId) {
        validationErrors.push("Missing user ID");
      }

      if (!myCompanyId) {
        validationErrors.push("Missing myCompanyId");
      }

      if (!targetCompanyId) {
        validationErrors.push("Missing targetCompanyId");
      }

      if (myCompanyId === targetCompanyId) {
        validationErrors.push("Cannot chat with same company");
      }

      if (validationErrors.length > 0) {
        console.error("❌ BACKEND: Validation failed:", validationErrors);
        socket.emit("company_chat_error", {
          error: `Validation failed: ${validationErrors.join(", ")}`,
          code: "VALIDATION_FAILED",
          details: {
            validationErrors,
            receivedData: data,
          },
        });
        return;
      }

      console.log("✅ BACKEND: All validations passed");

      socket.activeChatCompanyId = myCompanyId;
      socket.currentTargetCompanyId = targetCompanyId;
      socket.currentPartyId = partyId;

      const chatRoomId = this.generateCompanyChatRoomId(
        myCompanyId,
        targetCompanyId
      );
      const myCompanyRoom = `company_${myCompanyId}`;

      if (!chatRoomId) {
        console.error("❌ BACKEND: Failed to generate chat room ID");
        socket.emit("company_chat_error", {
          error: "Failed to generate chat room ID",
          code: "ROOM_GENERATION_FAILED",
        });
        return;
      }

      const roomsToJoin = [chatRoomId, myCompanyRoom];
      const joinedRooms = [];

      for (const room of roomsToJoin) {
        try {
          await socket.join(room);
          joinedRooms.push(room);
          console.log(`✅ BACKEND: Successfully joined room: ${room}`);
        } catch (joinError) {
          console.error(`❌ BACKEND: Failed to join room ${room}:`, joinError);
        }
      }

      socket.currentChatRoom = chatRoomId;

      console.log("🏠 BACKEND: Room joining summary:", {
        chatRoomId,
        myCompanyRoom,
        joinedRooms,
        allSocketRooms: Array.from(socket.rooms),
        socketContext: {
          activeChatCompanyId: socket.activeChatCompanyId,
          currentTargetCompanyId: socket.currentTargetCompanyId,
          currentChatRoom: socket.currentChatRoom,
        },
      });

      socket.emit("company_chat_joined", {
        success: true,
        roomId: chatRoomId,
        myCompanyId,
        targetCompanyId,
        partyId,
        joinedRooms,
        allRooms: Array.from(socket.rooms),
        message: "Successfully joined company chat",
        timestamp: new Date().toISOString(),
      });

      socket.to(chatRoomId).emit("user_joined_chat", {
        userId: socket.userId,
        username:
          socket.user?.username || socket.user?.name || `User ${socket.userId}`,
        companyId: myCompanyId,
        socketId: socket.id,
        joinedAt: new Date().toISOString(),
      });

      console.log("✅ BACKEND: company_chat_joined event emitted successfully");
    } catch (error) {
      console.error("❌ BACKEND: handleJoinCompanyChat critical error:", error);
      socket.emit("company_chat_error", {
        error: "Critical error joining company chat",
        code: "CRITICAL_ERROR",
        details: error.message,
        stack: error.stack,
      });
    }
  }

  async handleLeaveCompanyChat(socket, data) {
    try {
      const {myCompanyId, targetCompanyId} = data || {};

      let roomToLeave = socket.currentChatRoom;

      if (myCompanyId && targetCompanyId) {
        roomToLeave = this.generateCompanyChatRoomId(
          myCompanyId,
          targetCompanyId
        );
      }

      if (roomToLeave) {
        console.log(
          `👋 User ${socket.userId} leaving company chat room: ${roomToLeave}`
        );

        socket.leave(roomToLeave);

        if (this.connectionHandler && this.connectionHandler.leaveRoom) {
          this.connectionHandler.leaveRoom(socket.id, roomToLeave);
        }

        if (socket.userId && socket.companyId) {
          socket.to(roomToLeave).emit("user_left_chat", {
            userId: socket.userId,
            username: socket.user?.username || socket.user?.name,
            companyId: socket.companyId,
            companyName: socket.company?.businessName,
            roomId: roomToLeave,
            timestamp: new Date().toISOString(),
          });
        }

        if (socket.currentChatRoom === roomToLeave) {
          socket.currentChatRoom = null;
          socket.currentTargetCompany = null;
          socket.activeChatCompanyId = null;
        }

        console.log(`✅ User ${socket.userId} left room ${roomToLeave}`);
      }
    } catch (error) {
      console.error("❌ Error handling leave company chat:", error);
    }
  }

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

      const chatRoomId =
        chatId ||
        this.generateCompanyChatRoomId(socket.companyId, targetCompanyId);

      if (!chatRoomId) {
        socket.emit("error", {message: "Failed to generate chat room ID"});
        return;
      }

      socket.join(chatRoomId);
      socket.currentChatRoom = chatRoomId;

      socket.emit("joined_company_chat", {
        chatRoom: chatRoomId,
        myCompanyId: socket.companyId,
        otherCompanyId: targetCompanyId,
        success: true,
        message: "Successfully joined company chat",
      });

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

  handleLeaveChat(socket) {
    try {
      if (socket.currentChatRoom) {
        console.log(
          `🚪 User ${socket.userId} leaving chat room: ${socket.currentChatRoom}`
        );

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

  async handleSendMessage(socket, data) {
    try {
      const {
        partyId,
        content,
        messageType = "website",
        templateId,
        attachments = [],
        tempId,
      } = data;

      console.log("📤 SOCKET: Processing send message:", {
        socketId: socket.id,
        userId: socket.userId,
        companyId: socket.companyId,
        activeChatCompanyId: socket.activeChatCompanyId,
        partyId,
        messageType,
        contentLength: content?.length || 0,
        tempId,
        socketRooms: Array.from(socket.rooms),
      });

      if (!socket.userId) {
        console.error("❌ SOCKET: Missing user ID");
        socket.emit("message_error", {
          tempId,
          error: "Not authenticated - missing user ID",
        });
        return;
      }

      const senderCompanyId = socket.activeChatCompanyId || socket.companyId;

      if (!senderCompanyId) {
        console.error("❌ SOCKET: Missing company context");
        socket.emit("message_error", {
          tempId,
          error: "Missing company context",
        });
        return;
      }

      if (!partyId) {
        console.error("❌ SOCKET: Missing target company ID");
        socket.emit("message_error", {
          tempId,
          error: "Missing target company ID",
        });
        return;
      }

      if (!content || content.trim() === "") {
        console.error("❌ SOCKET: Empty message content");
        socket.emit("message_error", {
          tempId,
          error: "Message content cannot be empty",
        });
        return;
      }

      const validMessageTypes = [
        "whatsapp",
        "sms",
        "email",
        "internal",
        "notification",
        "website",
      ];
      if (!validMessageTypes.includes(messageType)) {
        console.error("❌ SOCKET: Invalid message type:", messageType);
        socket.emit("message_error", {
          tempId,
          error: `Invalid message type. Must be one of: ${validMessageTypes.join(
            ", "
          )}`,
          code: "INVALID_MESSAGE_TYPE",
        });
        return;
      }

      console.log("✅ SOCKET: Validation passed, proceeding with message");

      const messageData = {
        senderCompanyId: senderCompanyId,
        receiverCompanyId: partyId,
        senderId: socket.userId,
        senderType: "company",
        content: content.trim(),
        messageType,
        platform: messageType === "website" ? "internal" : messageType,
        templateId,
        attachments,
        status: "sent",
        direction: "outbound",
        chatType: "company-to-company",
        createdBy: socket.userId,
        senderName:
          socket.user?.username ||
          socket.user?.fullName ||
          `User ${socket.userId}`,
        senderCompanyName:
          socket.company?.businessName || `Company ${senderCompanyId}`,
        metadata: {
          socketId: socket.id,
          timestamp: new Date(),
          userAgent: socket.handshake.headers["user-agent"],
          originalMessageType: messageType,
        },
      };

      let savedMessage;
      try {
        if (this.messageHandler && this.messageHandler.processMessage) {
          const result = await this.messageHandler.processMessage(messageData);
          savedMessage = result.success ? result.message : null;
        } else {
          savedMessage = await Message.create(messageData);
        }

        if (!savedMessage) {
          throw new Error("Failed to save message");
        }

        console.log("✅ SOCKET: Message saved successfully:", {
          messageId: savedMessage._id,
          senderCompanyId,
          receiverCompanyId: partyId,
          messageType: savedMessage.messageType,
          platform: savedMessage.platform,
        });
      } catch (dbError) {
        console.error("❌ SOCKET: Database save failed:", dbError);
        socket.emit("message_error", {
          tempId,
          error: "Failed to save message",
        });
        return;
      }

      const chatRoomId = this.generateCompanyChatRoomId(
        senderCompanyId,
        partyId
      );

      const broadcastData = {
        _id: savedMessage._id,
        id: savedMessage._id,
        senderCompanyId: savedMessage.senderCompanyId,
        receiverCompanyId: savedMessage.receiverCompanyId,
        senderId: savedMessage.senderId,
        senderName: messageData.senderName,
        senderCompanyName: messageData.senderCompanyName,
        content: savedMessage.content,
        messageType: savedMessage.messageType,
        platform: savedMessage.platform,
        createdAt: savedMessage.createdAt,
        status: savedMessage.status,
        direction: savedMessage.direction,
        chatType: "company-to-company",
        tempId: tempId,
        timestamp: savedMessage.createdAt || new Date(),
      };

      console.log("📡 SOCKET: Broadcasting to MULTIPLE channels:", {
        chatRoomId,
        senderCompanyRoom: `company_${senderCompanyId}`,
        receiverCompanyRoom: `company_${partyId}`,
        messageId: savedMessage._id,
      });

      if (chatRoomId) {
        this.io.to(chatRoomId).emit("new_message", broadcastData);
        console.log("📡 Method 1: Chat room broadcast completed");
      }

      this.io
        .to(`company_${senderCompanyId}`)
        .emit("new_message", broadcastData);
      this.io.to(`company_${partyId}`).emit("new_message", broadcastData);
      console.log("📡 Method 2: Company room broadcasts completed");

      try {
        const allSockets = await this.io.fetchSockets();
        let directEmissions = 0;

        allSockets.forEach((targetSocket) => {
          if (targetSocket.id === socket.id) return;

          const socketCompanyId =
            targetSocket.activeChatCompanyId || targetSocket.companyId;
          const shouldReceive =
            socketCompanyId === senderCompanyId || socketCompanyId === partyId;

          if (shouldReceive) {
            targetSocket.emit("new_message", broadcastData);
            directEmissions++;
            console.log(
              `📡 Direct emit to socket ${targetSocket.id} (company: ${socketCompanyId})`
            );
          }
        });

        console.log(
          `📡 Method 3: Direct emissions completed (${directEmissions} sockets)`
        );
      } catch (socketFetchError) {
        console.warn(
          "⚠️ SOCKET: Direct socket emission failed:",
          socketFetchError.message
        );
      }

      console.log("✅ SOCKET: All broadcasting methods completed");

      socket.emit("message_sent", {
        messageId: savedMessage._id,
        tempId,
        status: "sent",
        success: true,
        timestamp: savedMessage.createdAt || new Date(),
        messageType: savedMessage.messageType,
        platform: savedMessage.platform,
      });

      console.log(`✅ SOCKET: Message sent successfully`);

      setTimeout(() => {
        if (chatRoomId) {
          this.io.to(chatRoomId).emit("message_delivered", {
            messageId: savedMessage._id,
            status: "delivered",
            platform: savedMessage.platform,
            timestamp: new Date(),
          });
        }

        this.io.to(`company_${senderCompanyId}`).emit("message_delivered", {
          messageId: savedMessage._id,
          status: "delivered",
          platform: savedMessage.platform,
          timestamp: new Date(),
        });
        this.io.to(`company_${partyId}`).emit("message_delivered", {
          messageId: savedMessage._id,
          status: "delivered",
          platform: savedMessage.platform,
          timestamp: new Date(),
        });
      }, 1000);
    } catch (error) {
      console.error("❌ SOCKET: Send message error:", error);
      socket.emit("message_error", {
        tempId: data.tempId,
        error: error.message || "Failed to send message",
        timestamp: new Date(),
      });
    }
  }

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
        if (this.messageHandler && this.messageHandler.markMessagesAsRead) {
          await this.messageHandler.markMessagesAsRead(
            idsToMark,
            socket.userId
          );
        } else {
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

  async handleGetChatHistory(socket, data) {
    try {
      const {partyId, page = 1, limit = 50, messageType} = data;

      if (!socket.userId) {
        socket.emit("error", {message: "Not authenticated - missing user ID"});
        return;
      }

      const queryCompanyId = socket.activeChatCompanyId || socket.companyId;

      if (!queryCompanyId) {
        socket.emit("error", {
          message: "Not authenticated - missing company context",
        });
        return;
      }

      if (!partyId) {
        socket.emit("error", {message: "Missing target company ID"});
        return;
      }

      try {
        let chatHistory;
        if (this.messageHandler && this.messageHandler.getChatHistory) {
          chatHistory = await this.messageHandler.getChatHistory({
            companyId: queryCompanyId,
            partyId,
            page,
            limit,
            messageType: messageType || "website",
          });
        } else {
          const matchQuery = {
            $or: [
              {senderCompanyId: queryCompanyId, receiverCompanyId: partyId},
              {senderCompanyId: partyId, receiverCompanyId: queryCompanyId},
            ],
            isDeleted: false,
          };

          if (messageType) {
            matchQuery.messageType = messageType;
          } else {
            matchQuery.messageType = "website";
          }

          const messages = await Message.find(matchQuery)
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
            messageType: messageType || "website",
          };
        }

        socket.emit("chat_history", {
          success: true,
          data: chatHistory,
          partyId,
          messageType: messageType || "website",
        });

        console.log(
          `📚 Chat history sent to user ${
            socket.userId
          } for company ${partyId} (messageType: ${messageType || "website"})`
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

  handleTypingStart(socket, data) {
    try {
      const {partyId, otherCompanyId} = data;
      const targetCompanyId = otherCompanyId || partyId;

      if (!socket.userId) {
        console.warn("⚠️ Typing start: Missing user ID");
        return;
      }

      const senderCompanyId = socket.activeChatCompanyId || socket.companyId;

      if (!senderCompanyId) {
        console.warn("⚠️ Typing start: Missing company context");
        return;
      }

      if (!targetCompanyId) {
        console.warn("⚠️ Typing start: Missing target company ID");
        return;
      }

      if (this.connectionHandler) {
        this.connectionHandler.updateActivity(socket.id);
      }

      const roomId = this.generateCompanyChatRoomId(
        senderCompanyId,
        targetCompanyId
      );
      if (!roomId) {
        console.warn("⚠️ Typing start: Failed to generate room ID");
        return;
      }

      socket.to(roomId).emit("user_typing", {
        userId: socket.userId,
        username: socket.user?.username || `User ${socket.userId}`,
        companyId: senderCompanyId,
        companyName:
          socket.company?.businessName || `Company ${senderCompanyId}`,
        otherCompanyId: targetCompanyId,
        isTyping: true,
        platform: "website",
        messageType: "website",
        timestamp: new Date(),
      });

      console.log(
        `⌨️ User ${socket.userId} from company ${senderCompanyId} started typing to company ${targetCompanyId} (website)`
      );
    } catch (error) {
      console.error("❌ Typing start error:", error);
    }
  }

  handleTypingStop(socket, data) {
    try {
      const {partyId, otherCompanyId} = data;
      const targetCompanyId = otherCompanyId || partyId;

      if (!socket.userId) {
        console.warn("⚠️ Typing stop: Missing user ID");
        return;
      }

      const senderCompanyId = socket.activeChatCompanyId || socket.companyId;

      if (!senderCompanyId) {
        console.warn("⚠️ Typing stop: Missing company context");
        return;
      }

      if (!targetCompanyId) {
        console.warn("⚠️ Typing stop: Missing target company ID");
        return;
      }

      if (this.connectionHandler) {
        this.connectionHandler.updateActivity(socket.id);
      }

      const roomId = this.generateCompanyChatRoomId(
        senderCompanyId,
        targetCompanyId
      );
      if (!roomId) {
        console.warn("⚠️ Typing stop: Failed to generate room ID");
        return;
      }

      socket.to(roomId).emit("user_typing", {
        userId: socket.userId,
        username: socket.user?.username || `User ${socket.userId}`,
        companyId: senderCompanyId,
        companyName:
          socket.company?.businessName || `Company ${senderCompanyId}`,
        otherCompanyId: targetCompanyId,
        isTyping: false,
        platform: "website",
        messageType: "website",
        timestamp: new Date(),
      });

      console.log(
        `⌨️ User ${socket.userId} from company ${senderCompanyId} stopped typing to company ${targetCompanyId} (website)`
      );
    } catch (error) {
      console.error("❌ Typing stop error:", error);
    }
  }

  handleDisconnection(socket, reason) {
    try {
      const userId = socket.userId;
      const companyId = socket.companyId;

      if (socket.currentChatRoom || socket.currentTargetCompany) {
        this.handleLeaveCompanyChat(socket, {
          myCompanyId: companyId,
          targetCompanyId: socket.currentTargetCompany,
        });
      }

      if (userId) {
        if (this.connectionHandler) {
          this.connectionHandler.removeConnection(socket.id);
        } else {
          this.connectedUsers.delete(userId.toString());
          this.userSockets.delete(socket.id);
        }

        if (companyId) {
          socket.to(`company_${companyId}`).emit("user_offline", {
            userId,
            username: socket.user?.username || `User ${userId}`,
            companyId,
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

  emitToCompany(companyId, event, data) {
    try {
      if (!companyId) {
        console.warn("⚠️ emitToCompany: Missing company ID");
        return false;
      }

      this.io.to(`company_${companyId}`).emit(event, data);

      const companyRoom = this.io.sockets.adapter.rooms.get(
        `company_${companyId}`
      );
      if (companyRoom) {
        console.log(
          `📡 emitToCompany: Emitted ${event} to company ${companyId} (${companyRoom.size} sockets)`
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error("❌ emitToCompany error:", error);
      return false;
    }
  }

  getMessageHandler() {
    return this.messageHandler;
  }

  debugBroadcast(message = "Test message") {
    console.log("🧪 DEBUG: Broadcasting test message to all sockets");

    const testData = {
      _id: "test_" + Date.now(),
      content: message,
      senderCompanyId: "test_sender",
      receiverCompanyId: "test_receiver",
      messageType: "website",
      platform: "internal",
      timestamp: new Date(),
      isTestMessage: true,
    };

    this.io.emit("new_message", testData);
    console.log("🧪 DEBUG: Test message broadcasted to all sockets");
  }

  getSocketDebugInfo() {
    const rooms = Array.from(this.io.sockets.adapter.rooms.entries());
    const sockets = Array.from(this.io.sockets.sockets.entries());

    return {
      totalSockets: sockets.length,
      totalRooms: rooms.length,
      rooms: rooms.map(([roomName, socketSet]) => ({
        name: roomName,
        socketCount: socketSet.size,
        sockets: Array.from(socketSet),
      })),
      sockets: sockets.map(([socketId, socket]) => ({
        id: socketId,
        userId: socket.userId,
        companyId: socket.companyId,
        activeChatCompanyId: socket.activeChatCompanyId,
        rooms: Array.from(socket.rooms),
      })),
    };
  }
}

module.exports = SocketHandler;
