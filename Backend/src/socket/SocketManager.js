const SocketHandler = require("./SocketHandler");
const MessageHandler = require("./MessageHandler");
const ConnectionHandler = require("./ConnectionHandler");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Company = require("../models/Company");

class SocketManager {
  constructor(server) {
    this.server = server;

    // ✅ FIXED: Complete CORS configuration for production
    this.io = require("socket.io")(server, {
      cors: {
        origin: [
          // Development URLs
          "http://localhost:5173", // ✅ Vite dev server
          "http://localhost:5000", // ✅ Backend dev
          "http://127.0.0.1:5173", // ✅ Alternative localhost
          "http://127.0.0.1:5000", // ✅ Alternative localhost

          "https://b2bbilling.com",
          "https://www.b2bbilling.com",
          "https://api.b2bbilling.com",

          // ✅ FIXED: Correct Render and Vercel URLs
          "https://b2bbillings-v7wq.onrender.com",
          "https://b2bbillings.vercel.app",

          // Environment variables
          process.env.FRONTEND_URL, // ✅ Configurable frontend URL
          process.env.CLIENT_URL, // ✅ Legacy support
          process.env.CORS_ORIGIN, // ✅ Additional CORS origin
        ].filter(Boolean), // ✅ Remove undefined values
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        credentials: true,
        allowedHeaders: [
          "Authorization",
          "Content-Type",
          "x-auth-token", // ✅ FIXED: Added missing header
          "X-Requested-With",
          "Accept",
          "Origin",
        ],
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ["websocket", "polling"],
      allowEIO3: true,
      connectTimeout: 45000,
      // ✅ Added production optimizations
      maxHttpBufferSize: 1e6, // 1MB max buffer
      httpCompression: true, // Enable compression
      perMessageDeflate: true, // Enable message compression
    });

    console.log(
      "🔌 Socket.IO server initialized on port",
      process.env.PORT || 5000
    );
    console.log("🌐 Socket.IO CORS origins:", this.io.engine.opts.cors.origin);

    this.connectionHandler = new ConnectionHandler();
    this.messageHandler = new MessageHandler();
    this.socketHandler = new SocketHandler(
      this.io,
      this.connectionHandler,
      this.messageHandler
    );

    this.activeConnections = new Map();
    this.socketToUser = new Map();
    this.socketToCompany = new Map();

    this.initializeMiddleware();
    this.initializeConnection();
    this.startCleanupInterval();
  }

  initializeMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        console.log(
          "🔐 Socket.IO authentication attempt from:",
          socket.handshake.address
        );

        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace("Bearer ", "") ||
          socket.handshake.query?.token;

        if (!token) {
          console.log("❌ No authentication token provided");
          return next(new Error("Authentication token required"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id || decoded.userId || decoded.user?.id;

        if (!userId) {
          console.log("❌ Invalid token: no user ID");
          return next(new Error("Invalid token: no user ID"));
        }

        const user = await User.findById(userId);
        if (!user) {
          console.log("❌ User not found:", userId);
          return next(new Error("User not found"));
        }

        const userCompany = await Company.findOne({
          $or: [
            {owner: user._id},
            {"users.user": user._id, "users.isActive": true},
          ],
          isActive: true,
        });

        if (!userCompany) {
          console.log("❌ No active company found for user:", userId);
          return next(new Error("No active company found"));
        }

        socket.user = {
          _id: user._id,
          id: user._id,
          name: user.name,
          username: user.name || user.displayName,
          fullName: user.displayName || user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        };
        socket.userId = user._id;
        socket.company = {
          _id: userCompany._id,
          id: userCompany._id,
          businessName: userCompany.businessName,
          name: userCompany.businessName,
        };
        socket.companyId = userCompany._id;

        console.log("✅ Socket.IO authentication successful for:", user.name);
        next();
      } catch (error) {
        console.error("❌ Socket.IO authentication failed:", error.message);
        next(new Error(`Authentication failed: ${error.message}`));
      }
    });
  }

  initializeConnection() {
    this.io.on("connection", (socket) => {
      console.log("🔌 New Socket.IO connection:", socket.id);

      if (!socket.userId || !socket.companyId || !socket.user) {
        console.log("❌ Authentication data incomplete for socket:", socket.id);
        socket.emit("auth_error", {message: "Authentication data incomplete"});
        socket.disconnect(true);
        return;
      }

      const userId = socket.userId.toString();
      const companyId = socket.companyId.toString();

      console.log("✅ Socket authenticated:", {
        socketId: socket.id,
        userId,
        username: socket.user.username,
        companyId,
        companyName: socket.company.businessName,
      });

      this.socketToUser.set(socket.id, userId);
      this.socketToCompany.set(socket.id, companyId);

      if (!this.activeConnections.has(userId)) {
        this.activeConnections.set(userId, new Set());
      }
      this.activeConnections.get(userId).add(socket.id);

      const userData = {
        userId: socket.userId,
        username: socket.user.username,
        companyId: socket.companyId,
        companyName: socket.company.businessName,
        email: socket.user.email,
      };

      this.connectionHandler.addConnection(socket, userData);

      // Handle socket disconnection
      socket.on("disconnect", (reason) => {
        console.log("❌ Socket disconnected:", socket.id, "Reason:", reason);

        const userId = this.socketToUser.get(socket.id);
        const companyId = this.socketToCompany.get(socket.id);

        this.socketToUser.delete(socket.id);
        this.socketToCompany.delete(socket.id);

        if (userId && this.activeConnections.has(userId)) {
          this.activeConnections.get(userId).delete(socket.id);

          if (this.activeConnections.get(userId).size === 0) {
            this.activeConnections.delete(userId);

            if (companyId) {
              socket.to(`company_${companyId}`).emit("user_offline", {
                userId: userId,
                username: socket.user?.username,
                timestamp: new Date(),
              });
            }
          }
        }

        this.connectionHandler.removeConnection(socket.id);
      });

      // Join company and user rooms
      socket.join(`company_${companyId}`);
      socket.join(`user_${userId}`);

      console.log("🏢 Socket joined rooms:", [
        `company_${companyId}`,
        `user_${userId}`,
      ]);

      // Emit user online status if first connection
      if (socket.companyId && socket.userId && socket.user) {
        const userConnections = this.activeConnections.get(
          socket.userId.toString()
        );
        if (userConnections && userConnections.size === 1) {
          socket.to(`company_${socket.companyId}`).emit("user_online", {
            userId: socket.userId,
            username: socket.user.username,
            fullName: socket.user.fullName,
            timestamp: new Date(),
          });
        }
      }

      // Send connection confirmation
      socket.emit("connection_confirmed", {
        socketId: socket.id,
        userId: socket.userId,
        username: socket.user.username,
        companyId: socket.companyId,
        companyName: socket.company.businessName,
        timestamp: new Date(),
        message: "Connected successfully to Socket.IO on port 5000",
        rooms: [`company_${companyId}`, `user_${userId}`],
      });

      // Handle join_user_room event
      socket.on("join_user_room", (userId) => {
        socket.join(`user_${userId}`);
        console.log("👤 Socket joined user room:", `user_${userId}`);
      });

      // Handle join_company_room event
      socket.on("join_company_room", (companyId) => {
        socket.join(`company_${companyId}`);
        console.log("🏢 Socket joined company room:", `company_${companyId}`);
      });

      // Handle join_chat_room event
      socket.on("join_chat_room", (data) => {
        const {fromCompanyId, toCompanyId} = data;
        const chatRoomId = this.generateCompanyChatRoomId(
          fromCompanyId,
          toCompanyId
        );
        socket.join(chatRoomId);
        console.log("💬 Socket joined chat room:", chatRoomId);

        socket.emit("chat_room_joined", {
          chatRoomId,
          fromCompanyId,
          toCompanyId,
          timestamp: new Date(),
        });
      });

      // Handle leave_chat_room event
      socket.on("leave_chat_room", (data) => {
        const {fromCompanyId, toCompanyId} = data;
        const chatRoomId = this.generateCompanyChatRoomId(
          fromCompanyId,
          toCompanyId
        );
        socket.leave(chatRoomId);
        console.log("💬 Socket left chat room:", chatRoomId);
      });

      // Handle typing indicators
      socket.on("typing_start", (data) => {
        const {toCompanyId, fromCompanyId} = data;
        const chatRoomId = this.generateCompanyChatRoomId(
          fromCompanyId,
          toCompanyId
        );
        socket.to(chatRoomId).emit("user_typing", {
          userId: socket.userId,
          username: socket.user.username,
          companyId: socket.companyId,
          timestamp: new Date(),
        });
      });

      socket.on("typing_stop", (data) => {
        const {toCompanyId, fromCompanyId} = data;
        const chatRoomId = this.generateCompanyChatRoomId(
          fromCompanyId,
          toCompanyId
        );
        socket.to(chatRoomId).emit("user_stopped_typing", {
          userId: socket.userId,
          username: socket.user.username,
          companyId: socket.companyId,
          timestamp: new Date(),
        });
      });

      // ✅ NEW: Team Chat Event Handlers
      
      // Join a team chat room
      socket.on("join_team_chat", (data) => {
        const { chatId } = data;
        if (chatId) {
          socket.join(`team_chat_${chatId}`);
          console.log(`👥 Socket joined team chat: team_chat_${chatId}`);
          
          // Update user's online status in this chat
          socket.to(`team_chat_${chatId}`).emit("user_joined_chat", {
            userId: socket.userId,
            username: socket.user.username,
            chatId: chatId,
            timestamp: new Date(),
          });
        }
      });

      // Leave a team chat room
      socket.on("leave_team_chat", (data) => {
        const { chatId } = data;
        if (chatId) {
          socket.leave(`team_chat_${chatId}`);
          console.log(`👥 Socket left team chat: team_chat_${chatId}`);
          
          // Update user's offline status in this chat
          socket.to(`team_chat_${chatId}`).emit("user_left_chat", {
            userId: socket.userId,
            username: socket.user.username,
            chatId: chatId,
            timestamp: new Date(),
          });
        }
      });

      // Handle team chat typing indicators
      socket.on("team_chat_typing_start", (data) => {
        const { chatId } = data;
        if (chatId) {
          socket.to(`team_chat_${chatId}`).emit("user_typing_in_chat", {
            userId: socket.userId,
            username: socket.user.username,
            chatId: chatId,
            timestamp: new Date(),
          });
        }
      });

      socket.on("team_chat_typing_stop", (data) => {
        const { chatId } = data;
        if (chatId) {
          socket.to(`team_chat_${chatId}`).emit("user_stopped_typing_in_chat", {
            userId: socket.userId,
            username: socket.user.username,
            chatId: chatId,
            timestamp: new Date(),
          });
        }
      });

      // Handle message reactions
      socket.on("add_message_reaction", (data) => {
        const { chatId, messageId, emoji } = data;
        if (chatId && messageId && emoji) {
          socket.to(`team_chat_${chatId}`).emit("message_reaction_added", {
            messageId: messageId,
            emoji: emoji,
            userId: socket.userId,
            username: socket.user.username,
            chatId: chatId,
            timestamp: new Date(),
          });
        }
      });

      socket.on("remove_message_reaction", (data) => {
        const { chatId, messageId } = data;
        if (chatId && messageId) {
          socket.to(`team_chat_${chatId}`).emit("message_reaction_removed", {
            messageId: messageId,
            userId: socket.userId,
            username: socket.user.username,
            chatId: chatId,
            timestamp: new Date(),
          });
        }
      });

      // Handle read receipts
      socket.on("mark_messages_read", (data) => {
        const { chatId, messageIds } = data;
        if (chatId && messageIds && Array.isArray(messageIds)) {
          socket.to(`team_chat_${chatId}`).emit("messages_read", {
            messageIds: messageIds,
            readBy: socket.userId,
            username: socket.user.username,
            chatId: chatId,
            timestamp: new Date(),
          });
        }
      });

      // Handle user status updates
      socket.on("update_chat_status", (data) => {
        const { status, statusMessage } = data;
        
        // Broadcast to all user's company members
        socket.to(`company_${socket.companyId}`).emit("user_status_updated", {
          userId: socket.userId,
          username: socket.user.username,
          status: status,
          statusMessage: statusMessage,
          timestamp: new Date(),
        });
      });

      console.log("✅ Socket setup complete for user:", socket.user.username);
    });

    // Add connection error handler
    this.io.on("connect_error", (error) => {
      console.error("❌ Socket.IO connection error:", error);
    });

    console.log("🔌 Socket.IO connection handler initialized");
  }

  startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      try {
        this.connectionHandler.cleanupInactiveConnections(30);
        this.cleanupStaleConnections();
      } catch (error) {
        console.error("Cleanup interval error:", error);
      }
    }, 10 * 60 * 1000); // Every 10 minutes
  }

  cleanupStaleConnections() {
    try {
      for (const [socketId, userId] of this.socketToUser.entries()) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (!socket) {
          this.socketToUser.delete(socketId);
          this.socketToCompany.delete(socketId);

          if (this.activeConnections.has(userId)) {
            this.activeConnections.get(userId).delete(socketId);
            if (this.activeConnections.get(userId).size === 0) {
              this.activeConnections.delete(userId);
            }
          }
        }
      }
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }

  getIO() {
    return this.io;
  }

  getStats() {
    try {
      if (!this.connectionHandler) {
        return {
          totalConnections: 0,
          onlineUsers: 0,
          onlineCompanies: 0,
          activeRooms: 0,
          connectionsByCompany: {},
          roomsByType: {},
          connections: [],
        };
      }

      const baseStats = this.connectionHandler.getStats();
      const roomStats = this.getRoomStats();

      return {
        ...baseStats,
        rooms: roomStats,
        activeConnections: this.activeConnections.size,
        totalSockets: this.io ? this.io.sockets.sockets.size : 0,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: error.message,
        totalConnections: 0,
        onlineUsers: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }

  getRoomStats() {
    try {
      if (!this.io || !this.io.sockets.adapter.rooms) {
        return {total: 0, companyRooms: 0, userRooms: 0, chatRooms: 0};
      }

      const rooms = this.io.sockets.adapter.rooms;
      const roomStats = {
        total: rooms.size,
        companyRooms: 0,
        userRooms: 0,
        chatRooms: 0,
        otherRooms: 0,
      };

      for (const [roomId] of rooms) {
        if (roomId.startsWith("company_chat_")) {
          roomStats.chatRooms++;
        } else if (roomId.startsWith("company_")) {
          roomStats.companyRooms++;
        } else if (roomId.startsWith("user_")) {
          roomStats.userRooms++;
        } else {
          roomStats.otherRooms++;
        }
      }

      return roomStats;
    } catch (error) {
      return {
        total: 0,
        companyRooms: 0,
        userRooms: 0,
        chatRooms: 0,
        otherRooms: 0,
      };
    }
  }

  sendToUser(userId, event, data) {
    try {
      if (this.socketHandler && this.socketHandler.sendToUser) {
        return this.socketHandler.sendToUser(userId, event, data);
      }

      const userSockets = this.activeConnections.get(userId.toString());
      if (userSockets && userSockets.size > 0) {
        let sentCount = 0;
        userSockets.forEach((socketId) => {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit(event, data);
            sentCount++;
          }
        });
        console.log(
          `📤 Sent event "${event}" to ${sentCount} sockets for user ${userId}`
        );
        return sentCount > 0;
      }
      return false;
    } catch (error) {
      console.error("Error sending to user:", error);
      return false;
    }
  }

  sendToCompany(companyId, event, data) {
    try {
      if (this.socketHandler && this.socketHandler.sendToCompany) {
        return this.socketHandler.sendToCompany(companyId, event, data);
      }

      const roomId = `company_${companyId}`;
      this.io.to(roomId).emit(event, data);
      console.log(`📤 Sent event "${event}" to company room: ${roomId}`);
      return true;
    } catch (error) {
      console.error("Error sending to company:", error);
      return false;
    }
  }

  sendToCompanyChat(fromCompanyId, toCompanyId, event, data) {
    try {
      if (this.socketHandler && this.socketHandler.sendToChatRoom) {
        return this.socketHandler.sendToChatRoom(
          fromCompanyId,
          toCompanyId,
          event,
          data
        );
      }

      const chatRoomId = this.generateCompanyChatRoomId(
        fromCompanyId,
        toCompanyId
      );

      const enrichedData = {
        ...data,
        fromCompany: fromCompanyId,
        toCompany: toCompanyId,
        chatRoomId: chatRoomId,
        timestamp: new Date(),
      };

      this.io.to(chatRoomId).emit(event, enrichedData);
      console.log(`💬 Sent event "${event}" to chat room: ${chatRoomId}`);
      return true;
    } catch (error) {
      console.error("Error sending to company chat:", error);
      return false;
    }
  }

  generateCompanyChatRoomId(companyId1, companyId2) {
    if (this.socketHandler && this.socketHandler.generateCompanyChatRoomId) {
      return this.socketHandler.generateCompanyChatRoomId(
        companyId1,
        companyId2
      );
    }

    const sortedIds = [companyId1.toString(), companyId2.toString()].sort();
    return `company_chat_${sortedIds[0]}_${sortedIds[1]}`;
  }

  getCompanyUsers(companyId) {
    try {
      if (!this.connectionHandler) {
        return [];
      }
      return this.connectionHandler.getCompanyUsers(companyId);
    } catch (error) {
      console.error("Error getting company users:", error);
      return [];
    }
  }

  getCompanyRooms() {
    try {
      const rooms = this.io.sockets.adapter.rooms;
      const companyRooms = {};

      for (const [roomId, room] of rooms) {
        if (roomId.startsWith("company_")) {
          companyRooms[roomId] = {
            size: room.size,
            members: Array.from(room),
          };
        }
      }

      return companyRooms;
    } catch (error) {
      console.error("Error getting company rooms:", error);
      return {};
    }
  }

  getCompanyChatUsers(companyId1, companyId2) {
    try {
      const roomId = this.generateCompanyChatRoomId(companyId1, companyId2);
      const room = this.io.sockets.adapter.rooms.get(roomId);

      if (!room) return [];

      const users = [];
      room.forEach((socketId) => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket && socket.user) {
          users.push({
            userId: socket.userId.toString(),
            username: socket.user.username,
            companyId: socket.companyId?.toString(),
            companyName: socket.company?.businessName,
            socketId: socketId,
          });
        }
      });

      return users;
    } catch (error) {
      console.error("Error getting company chat users:", error);
      return [];
    }
  }

  sendToRoom(roomId, event, data) {
    try {
      this.io.to(roomId).emit(event, data);
      console.log(`📤 Sent event "${event}" to room: ${roomId}`);
      return true;
    } catch (error) {
      console.error("Error sending to room:", error);
      return false;
    }
  }

  broadcast(event, data) {
    try {
      this.io.emit(event, data);
      console.log(`📢 Broadcast event "${event}" to all connected sockets`);
      return true;
    } catch (error) {
      console.error("Error broadcasting:", error);
      return false;
    }
  }

  joinCompanyChat(userId, companyId1, companyId2) {
    try {
      const chatRoomId = this.generateCompanyChatRoomId(companyId1, companyId2);
      const userSockets = this.activeConnections.get(userId.toString());

      if (userSockets) {
        userSockets.forEach((socketId) => {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.join(chatRoomId);
          }
        });
        console.log(`💬 User ${userId} joined chat room: ${chatRoomId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error joining company chat:", error);
      return false;
    }
  }

  leaveCompanyChat(userId, companyId1, companyId2) {
    try {
      const chatRoomId = this.generateCompanyChatRoomId(companyId1, companyId2);
      const userSockets = this.activeConnections.get(userId.toString());

      if (userSockets) {
        userSockets.forEach((socketId) => {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.leave(chatRoomId);
          }
        });
        console.log(`💬 User ${userId} left chat room: ${chatRoomId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error leaving company chat:", error);
      return false;
    }
  }

  isUserOnline(userId) {
    try {
      return (
        this.activeConnections.has(userId.toString()) &&
        this.activeConnections.get(userId.toString()).size > 0
      );
    } catch (error) {
      return false;
    }
  }

  isCompanyOnline(companyId) {
    try {
      const room = this.io.sockets.adapter.rooms.get(`company_${companyId}`);
      return room && room.size > 0;
    } catch (error) {
      return false;
    }
  }

  getActiveConnectionsInfo() {
    try {
      const info = {
        totalUsers: this.activeConnections.size,
        totalSockets: this.socketToUser.size,
        users: {},
      };

      for (const [userId, socketIds] of this.activeConnections.entries()) {
        info.users[userId] = {
          socketCount: socketIds.size,
          socketIds: Array.from(socketIds),
        };
      }

      return info;
    } catch (error) {
      console.error("Error getting active connections info:", error);
      return {totalUsers: 0, totalSockets: 0, users: {}};
    }
  }

  getDebugInfo() {
    try {
      return {
        timestamp: new Date().toISOString(),
        port: process.env.PORT || 5000,
        socketManager: {
          initialized: !!this.io,
          connectionHandlerAvailable: !!this.connectionHandler,
          socketHandlerAvailable: !!this.socketHandler,
          messageHandlerAvailable: !!this.messageHandler,
        },
        connections: this.getActiveConnectionsInfo(),
        rooms: this.getRoomStats(),
        stats: this.getStats(),
        corsOrigins: this.io ? this.io.engine.opts.cors.origin : [],
      };
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  // Notification-specific methods
  sendNotificationToUser(userId, notification) {
    return this.sendToUser(userId, "new_notification", notification);
  }

  sendNotificationToCompany(companyId, notification) {
    return this.sendToCompany(companyId, "new_notification", notification);
  }

  markNotificationAsRead(userId, notificationId) {
    return this.sendToUser(userId, "notification_read", {notificationId});
  }

  markAllNotificationsAsRead(userId) {
    return this.sendToUser(userId, "all_notifications_read", {
      timestamp: new Date(),
    });
  }

  deleteNotification(userId, notificationId) {
    return this.sendToUser(userId, "notification_deleted", {notificationId});
  }

  // Chat-specific methods
  sendChatMessage(fromCompanyId, toCompanyId, messageData) {
    return this.sendToCompanyChat(
      fromCompanyId,
      toCompanyId,
      "new_chat_message",
      messageData
    );
  }

  sendChatNotification(fromCompanyId, toCompanyId, notificationData) {
    return this.sendToCompanyChat(
      fromCompanyId,
      toCompanyId,
      "new_chat_notification",
      notificationData
    );
  }

  // ✅ NEW: Team Chat Methods
  
  /**
   * Send message to team chat room
   */
  sendToChat(chatId, event, data) {
    try {
      if (!this.io) {
        console.warn("Socket.IO not initialized");
        return false;
      }

      const roomName = `team_chat_${chatId}`;
      console.log(`📤 Sending ${event} to team chat: ${roomName}`);
      
      this.io.to(roomName).emit(event, {
        ...data,
        timestamp: new Date(),
        chatId: chatId,
      });

      return true;
    } catch (error) {
      console.error(`❌ Error sending to team chat ${chatId}:`, error);
      return false;
    }
  }

  /**
   * Send message to specific user
   */
  sendToUser(userId, event, data) {
    try {
      if (!this.io) {
        console.warn("Socket.IO not initialized");
        return false;
      }

      const roomName = `user_${userId}`;
      console.log(`📤 Sending ${event} to user: ${roomName}`);
      
      this.io.to(roomName).emit(event, {
        ...data,
        timestamp: new Date(),
        targetUserId: userId,
      });

      return true;
    } catch (error) {
      console.error(`❌ Error sending to user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get online users in a chat
   */
  getChatUsers(chatId) {
    try {
      if (!this.io) {
        return [];
      }

      const roomName = `team_chat_${chatId}`;
      const room = this.io.sockets.adapter.rooms.get(roomName);
      
      if (!room) {
        return [];
      }

      const users = [];
      for (const socketId of room) {
        const userId = this.socketToUser.get(socketId);
        if (userId && !users.some(u => u.userId === userId)) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket && socket.user) {
            users.push({
              userId: userId,
              username: socket.user.username,
              name: socket.user.name,
              isOnline: true,
            });
          }
        }
      }

      return users;
    } catch (error) {
      console.error(`❌ Error getting chat users for ${chatId}:`, error);
      return [];
    }
  }

  /**
   * Get online users in a company
   */
  getCompanyUsers(companyId) {
    try {
      if (!this.io) {
        return [];
      }

      const roomName = `company_${companyId}`;
      const room = this.io.sockets.adapter.rooms.get(roomName);
      
      if (!room) {
        return [];
      }

      const users = [];
      for (const socketId of room) {
        const userId = this.socketToUser.get(socketId);
        if (userId && !users.some(u => u.userId === userId)) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket && socket.user) {
            users.push({
              userId: userId,
              username: socket.user.username,
              name: socket.user.name,
              isOnline: true,
            });
          }
        }
      }

      return users;
    } catch (error) {
      console.error(`❌ Error getting company users for ${companyId}:`, error);
      return [];
    }
  }

  /**
   * Broadcast typing indicator to chat
   */
  broadcastTyping(chatId, userId, username, isTyping) {
    try {
      const event = isTyping ? "user_typing_in_chat" : "user_stopped_typing_in_chat";
      return this.sendToChat(chatId, event, {
        userId: userId,
        username: username,
        isTyping: isTyping,
      });
    } catch (error) {
      console.error(`❌ Error broadcasting typing status:`, error);
      return false;
    }
  }

  /**
   * Broadcast user status update
   */
  broadcastUserStatus(userId, companyId, status, statusMessage) {
    try {
      if (!this.io) {
        return false;
      }

      const roomName = `company_${companyId}`;
      
      this.io.to(roomName).emit("user_status_updated", {
        userId: userId,
        status: status,
        statusMessage: statusMessage,
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      console.error(`❌ Error broadcasting user status:`, error);
      return false;
    }
  }

  /**
   * Join user to multiple chat rooms
   */
  joinUserToChats(userId, chatIds) {
    try {
      if (!this.io || !Array.isArray(chatIds)) {
        return false;
      }

      const userConnections = this.activeConnections.get(userId.toString());
      if (!userConnections) {
        return false;
      }

      let joinedCount = 0;
      for (const socketId of userConnections) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          chatIds.forEach(chatId => {
            socket.join(`team_chat_${chatId}`);
            joinedCount++;
          });
        }
      }

      console.log(`👥 User ${userId} joined ${joinedCount} chat rooms`);
      return true;
    } catch (error) {
      console.error(`❌ Error joining user to chats:`, error);
      return false;
    }
  }

  // =============================================================================
  // ✅ NEW: TEAM CHAT METHODS
  // =============================================================================

  /**
   * Send message to specific team chat
   */
  sendToTeamChat(chatId, event, data) {
    try {
      if (this.socketHandler) {
        this.socketHandler.sendToTeamChat(chatId, event, data);
      }
    } catch (error) {
      console.error("❌ Send to team chat error:", error);
    }
  }

  /**
   * Send message to specific user across all their devices
   */
  sendToUser(userId, event, data) {
    try {
      const userIdStr = userId.toString();
      const userSockets = this.activeConnections.get(userIdStr);
      
      if (userSockets && userSockets.size > 0) {
        userSockets.forEach(socketId => {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit(event, data);
          }
        });
        console.log(`✅ Sent ${event} to user ${userId} on ${userSockets.size} device(s)`);
      } else {
        console.log(`⚠️ User ${userId} not connected`);
      }
    } catch (error) {
      console.error("❌ Send to user error:", error);
    }
  }

  /**
   * Send message to all users in a company
   */
  sendToCompany(companyId, event, data) {
    try {
      if (this.socketHandler && this.socketHandler.emitToCompany) {
        this.socketHandler.emitToCompany(companyId, event, data);
      }
    } catch (error) {
      console.error("❌ Send to company error:", error);
    }
  }

  /**
   * Get online users in a team chat
   */
  getOnlineUsersInTeamChat(chatId) {
    try {
      const roomName = `team_chat_${chatId}`;
      const room = this.io.sockets.adapter.rooms.get(roomName);
      
      if (!room) return [];

      const onlineUsers = [];
      room.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket && socket.userId) {
          onlineUsers.push({
            userId: socket.userId,
            userName: socket.user?.name,
            socketId: socketId,
          });
        }
      });

      return onlineUsers;
    } catch (error) {
      console.error("❌ Get online users in team chat error:", error);
      return [];
    }
  }

  /**
   * Get user's online status
   */
  isUserOnline(userId) {
    try {
      const userIdStr = userId.toString();
      const userSockets = this.activeConnections.get(userIdStr);
      return userSockets && userSockets.size > 0;
    } catch (error) {
      console.error("❌ Check user online status error:", error);
      return false;
    }
  }

  /**
   * Get all online users in company
   */
  getOnlineUsersInCompany(companyId) {
    try {
      const onlineUsers = new Set();
      
      for (const [socketId, socket] of this.io.sockets.sockets) {
        if (socket.companyId && socket.companyId.toString() === companyId.toString()) {
          if (socket.userId && socket.user) {
            onlineUsers.add({
              userId: socket.userId,
              userName: socket.user.name,
              email: socket.user.email,
            });
          }
        }
      }

      return Array.from(onlineUsers);
    } catch (error) {
      console.error("❌ Get online users in company error:", error);
      return [];
    }
  }

  /**
   * Broadcast to all connected users
   */
  broadcastToAll(event, data) {
    try {
      this.io.emit(event, data);
      console.log(`✅ Broadcasted ${event} to all connected users`);
    } catch (error) {
      console.error("❌ Broadcast to all error:", error);
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    try {
      const totalConnections = this.activeConnections.size;
      const totalSockets = this.io.sockets.sockets.size;
      const rooms = Array.from(this.io.sockets.adapter.rooms.keys());
      
      return {
        totalUsers: totalConnections,
        totalSockets: totalSockets,
        totalRooms: rooms.length,
        rooms: rooms.filter(room => room.startsWith('team_chat_')),
        averageSocketsPerUser: totalConnections > 0 ? totalSockets / totalConnections : 0,
      };
    } catch (error) {
      console.error("❌ Get connection stats error:", error);
      return {
        totalUsers: 0,
        totalSockets: 0,
        totalRooms: 0,
        rooms: [],
        averageSocketsPerUser: 0,
      };
    }
  }

  shutdown() {
    try {
      console.log("🔄 Shutting down Socket.IO server...");

      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        console.log("✅ Cleanup interval cleared");
      }

      if (this.io) {
        // Notify all connected clients about shutdown
        this.io.emit("server_shutdown", {
          message: "Server is shutting down",
          timestamp: new Date(),
        });

        // Close all connections
        this.io.close();
        console.log("✅ Socket.IO server closed");
      }

      if (this.connectionHandler) {
        this.connectionHandler.clearAll();
        console.log("✅ Connection handler cleared");
      }

      // Clear all maps
      this.activeConnections.clear();
      this.socketToUser.clear();
      this.socketToCompany.clear();

      console.log("✅ Socket.IO shutdown complete");
    } catch (error) {
      console.error("❌ Shutdown error:", error);
    }
  }
}

module.exports = SocketManager;
