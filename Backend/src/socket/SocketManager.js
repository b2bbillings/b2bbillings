const SocketHandler = require("./SocketHandler");
const MessageHandler = require("./MessageHandler");
const ConnectionHandler = require("./ConnectionHandler");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Company = require("../models/Company");

class SocketManager {
  constructor(server) {
    this.server = server;
    this.io = require("socket.io")(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.connectionHandler = new ConnectionHandler();
    this.messageHandler = new MessageHandler();
    this.socketHandler = new SocketHandler(
      this.io,
      this.connectionHandler,
      this.messageHandler
    );

    this.initializeMiddleware();
    this.initializeConnection();
    this.startCleanupInterval();
  }

  initializeMiddleware() {
    // ✅ FIXED: Socket.IO authentication for company-to-company chat
    this.io.use(async (socket, next) => {
      try {
        // Get token from auth object or handshake headers
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace("Bearer ", "");

        if (!token) {
          console.log(
            "❌ Socket auth failed: No token provided for",
            socket.id
          );
          return next(new Error("Not authenticated"));
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find the user
        const user = await User.findById(decoded.id || decoded.userId);
        if (!user) {
          console.log("❌ Socket auth failed: User not found for token");
          return next(new Error("User not found"));
        }

        // ✅ FIXED: Find user's company (company where user is owner or member)
        const userCompany = await Company.findOne({
          $or: [
            {owner: user._id},
            {"users.user": user._id, "users.isActive": true},
          ],
          isActive: true,
        });

        if (!userCompany) {
          console.log("❌ Socket auth failed: User has no active company");
          return next(new Error("No active company found"));
        }

        // Add user and company data to socket
        socket.user = user;
        socket.userId = user._id;
        socket.company = userCompany;
        socket.companyId = userCompany._id;

        console.log("✅ Socket authenticated:", {
          socketId: socket.id,
          user: user.username,
          company: userCompany.businessName,
          userId: user._id.toString(),
          companyId: userCompany._id.toString(),
        });

        next();
      } catch (error) {
        console.error("❌ Socket authentication error:", error.message);
        next(new Error("Authentication failed"));
      }
    });
  }

  // ✅ NEW: Initialize connection handling
  initializeConnection() {
    this.io.on("connection", (socket) => {
      console.log("🔗 New socket connection:", {
        socketId: socket.id,
        userId: socket.userId?.toString(),
        companyId: socket.companyId?.toString(),
      });

      // ✅ FIXED: Join company room for company-wide broadcasts
      if (socket.companyId) {
        const companyRoom = `company_${socket.companyId}`;
        socket.join(companyRoom);
        console.log(
          `👥 User ${socket.userId} joined company room: ${companyRoom}`
        );
      }

      // ✅ FIXED: Join user-specific room
      if (socket.userId) {
        const userRoom = `user_${socket.userId}`;
        socket.join(userRoom);
        console.log(`👤 User ${socket.userId} joined user room: ${userRoom}`);
      }

      // Handle company chat room joining
      socket.on("join_company_chat", (data) => {
        const {otherCompanyId} = data;
        if (socket.companyId && otherCompanyId) {
          const chatRoom = this.generateCompanyChatRoomId(
            socket.companyId,
            otherCompanyId
          );
          socket.join(chatRoom);
          console.log(
            `💬 User ${socket.userId} joined company chat room: ${chatRoom}`
          );

          // Notify the room about user joining
          socket.to(chatRoom).emit("user_joined_chat", {
            userId: socket.userId,
            username: socket.user?.username,
            companyId: socket.companyId,
            companyName: socket.company?.businessName,
          });
        }
      });

      // Handle leaving company chat room
      socket.on("leave_company_chat", (data) => {
        const {otherCompanyId} = data;
        if (socket.companyId && otherCompanyId) {
          const chatRoom = this.generateCompanyChatRoomId(
            socket.companyId,
            otherCompanyId
          );
          socket.leave(chatRoom);
          console.log(
            `💬 User ${socket.userId} left company chat room: ${chatRoom}`
          );

          // Notify the room about user leaving
          socket.to(chatRoom).emit("user_left_chat", {
            userId: socket.userId,
            username: socket.user?.username,
            companyId: socket.companyId,
            companyName: socket.company?.businessName,
          });
        }
      });

      // Handle typing indicators
      socket.on("typing_start", (data) => {
        const {otherCompanyId} = data;
        if (socket.companyId && otherCompanyId) {
          const chatRoom = this.generateCompanyChatRoomId(
            socket.companyId,
            otherCompanyId
          );
          socket.to(chatRoom).emit("user_typing", {
            userId: socket.userId,
            username: socket.user?.username,
            companyId: socket.companyId,
            isTyping: true,
          });
        }
      });

      socket.on("typing_stop", (data) => {
        const {otherCompanyId} = data;
        if (socket.companyId && otherCompanyId) {
          const chatRoom = this.generateCompanyChatRoomId(
            socket.companyId,
            otherCompanyId
          );
          socket.to(chatRoom).emit("user_typing", {
            userId: socket.userId,
            username: socket.user?.username,
            companyId: socket.companyId,
            isTyping: false,
          });
        }
      });

      // Handle message read status
      socket.on("message_read", (data) => {
        const {messageId, otherCompanyId} = data;
        if (socket.companyId && otherCompanyId) {
          const chatRoom = this.generateCompanyChatRoomId(
            socket.companyId,
            otherCompanyId
          );
          socket.to(chatRoom).emit("message_read_status", {
            messageId,
            readBy: socket.userId,
            readAt: new Date(),
          });
        }
      });

      // Handle user status updates
      socket.on("status_update", (data) => {
        const {status} = data;
        if (socket.companyId) {
          const companyRoom = `company_${socket.companyId}`;
          socket.to(companyRoom).emit("user_status_changed", {
            userId: socket.userId,
            username: socket.user?.username,
            status,
            timestamp: new Date(),
          });
        }
      });

      // Handle disconnection
      socket.on("disconnect", (reason) => {
        console.log("❌ Socket disconnected:", {
          socketId: socket.id,
          userId: socket.userId?.toString(),
          companyId: socket.companyId?.toString(),
          reason,
        });

        // Notify company about user going offline
        if (socket.companyId) {
          const companyRoom = `company_${socket.companyId}`;
          socket.to(companyRoom).emit("user_offline", {
            userId: socket.userId,
            username: socket.user?.username,
            timestamp: new Date(),
          });
        }

        // Remove from connection handler
        if (socket.userId) {
          this.connectionHandler.removeConnection(socket.userId.toString());
        }
      });

      // Add to connection handler
      if (socket.userId) {
        this.connectionHandler.addConnection(socket.userId.toString(), socket);
      }

      // Emit user online status to company
      if (socket.companyId) {
        const companyRoom = `company_${socket.companyId}`;
        socket.to(companyRoom).emit("user_online", {
          userId: socket.userId,
          username: socket.user?.username,
          timestamp: new Date(),
        });
      }
    });
  }

  startCleanupInterval() {
    // Clean up inactive connections every 10 minutes
    setInterval(() => {
      this.connectionHandler.cleanupInactiveConnections(30);
    }, 10 * 60 * 1000);
  }

  // Get Socket.IO instance
  getIO() {
    return this.io;
  }

  // Get connection statistics
  getStats() {
    const baseStats = this.connectionHandler.getConnectionStats();
    const roomStats = this.getRoomStats();

    return {
      ...baseStats,
      rooms: roomStats,
      timestamp: new Date().toISOString(),
    };
  }

  // ✅ NEW: Get room statistics
  getRoomStats() {
    const rooms = this.io.sockets.adapter.rooms;
    const roomStats = {
      total: rooms.size,
      companyRooms: 0,
      userRooms: 0,
      chatRooms: 0,
    };

    for (const [roomId, room] of rooms) {
      if (roomId.startsWith("company_chat_")) {
        roomStats.chatRooms++;
      } else if (roomId.startsWith("company_")) {
        roomStats.companyRooms++;
      } else if (roomId.startsWith("user_")) {
        roomStats.userRooms++;
      }
    }

    return roomStats;
  }

  // Send message to specific user
  sendToUser(userId, event, data) {
    return this.socketHandler.sendToUser(userId, event, data);
  }

  // ✅ NEW: Send message to specific company (all users in that company)
  sendToCompany(companyId, event, data) {
    const companyRoom = `company_${companyId}`;
    this.io.to(companyRoom).emit(event, data);
    console.log(`📡 Sent event "${event}" to company room: ${companyRoom}`);
  }

  // ✅ NEW: Send message to company-to-company chat room
  sendToCompanyChat(companyId1, companyId2, event, data) {
    const roomId = this.generateCompanyChatRoomId(companyId1, companyId2);
    this.io.to(roomId).emit(event, data);
    console.log(`💬 Sent event "${event}" to company chat room: ${roomId}`);
  }

  // ✅ NEW: Generate consistent room ID for company-to-company chat
  generateCompanyChatRoomId(companyId1, companyId2) {
    // Sort company IDs to ensure consistent room naming
    const sortedIds = [companyId1.toString(), companyId2.toString()].sort();
    return `company_chat_${sortedIds[0]}_${sortedIds[1]}`;
  }

  // ✅ NEW: Get all connected users for a company
  getCompanyUsers(companyId) {
    try {
      const room = this.io.sockets.adapter.rooms.get(`company_${companyId}`);
      if (!room) return [];

      const userSockets = Array.from(room);
      const users = [];

      userSockets.forEach((socketId) => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket && socket.user && socket.userId) {
          users.push({
            userId: socket.userId.toString(),
            username: socket.user.username,
            fullName: socket.user.fullName,
            socketId: socketId,
            companyId: socket.companyId?.toString(),
            companyName: socket.company?.businessName,
          });
        }
      });

      return users;
    } catch (error) {
      console.error("Error getting company users:", error);
      return [];
    }
  }

  // ✅ NEW: Get all company rooms
  getCompanyRooms() {
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
  }

  // ✅ NEW: Get users in a specific company chat room
  getCompanyChatUsers(companyId1, companyId2) {
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
        });
      }
    });

    return users;
  }

  // Send message to specific room
  sendToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
    console.log(`📡 Sent event "${event}" to room: ${roomId}`);
  }

  // Broadcast to all connected users
  broadcast(event, data) {
    this.io.emit(event, data);
    console.log(`📡 Broadcasted event "${event}" to all users`);
  }

  // ✅ NEW: Join user to company chat room
  joinCompanyChat(userId, companyId1, companyId2) {
    const roomId = this.generateCompanyChatRoomId(companyId1, companyId2);
    const userRoom = `user_${userId}`;

    // Find the user's socket
    const userSockets = this.io.sockets.adapter.rooms.get(userRoom);
    if (userSockets) {
      userSockets.forEach((socketId) => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.join(roomId);
          console.log(`💬 User ${userId} joined company chat room: ${roomId}`);
        }
      });
    }
  }

  // ✅ NEW: Leave user from company chat room
  leaveCompanyChat(userId, companyId1, companyId2) {
    const roomId = this.generateCompanyChatRoomId(companyId1, companyId2);
    const userRoom = `user_${userId}`;

    // Find the user's socket
    const userSockets = this.io.sockets.adapter.rooms.get(userRoom);
    if (userSockets) {
      userSockets.forEach((socketId) => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.leave(roomId);
          console.log(`💬 User ${userId} left company chat room: ${roomId}`);
        }
      });
    }
  }

  // ✅ NEW: Check if user is online
  isUserOnline(userId) {
    const userRoom = `user_${userId}`;
    const room = this.io.sockets.adapter.rooms.get(userRoom);
    return room && room.size > 0;
  }

  // ✅ NEW: Check if company has online users
  isCompanyOnline(companyId) {
    const companyRoom = `company_${companyId}`;
    const room = this.io.sockets.adapter.rooms.get(companyRoom);
    return room && room.size > 0;
  }
}

module.exports = SocketManager;
