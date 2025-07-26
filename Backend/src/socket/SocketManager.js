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

    // ✅ FIX: Track active connections to prevent duplicates
    this.activeConnections = new Map(); // userId -> Set of socketIds
    this.socketToUser = new Map(); // socketId -> userId
    this.socketToCompany = new Map(); // socketId -> companyId

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

        console.log("🔍 Verifying token for socket:", socket.id);

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("🔓 Token decoded:", {
          id: decoded.id,
          userId: decoded.userId,
          decodedKeys: Object.keys(decoded),
        });

        // ✅ FIX: Get user ID from token properly
        const userId = decoded.id || decoded.userId || decoded.user?.id;
        if (!userId) {
          console.log("❌ Socket auth failed: No user ID in token");
          return next(new Error("Invalid token: no user ID"));
        }

        // ✅ FIXED: Find the user WITHOUT .lean() to get virtuals
        const user = await User.findById(userId);
        if (!user) {
          console.log("❌ Socket auth failed: User not found for ID:", userId);
          return next(new Error("User not found"));
        }

        console.log("👤 User found:", {
          id: user._id,
          name: user.name, // ✅ Correct field from schema
          displayName: user.displayName, // ✅ Virtual field from schema
          email: user.email,
          availableFields: Object.keys(user.toObject()),
        });

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

        console.log("🏢 Company found:", {
          id: userCompany._id,
          businessName: userCompany.businessName,
          owner: userCompany.owner,
        });

        // ✅ FIX: Add user and company data to socket with CORRECT field names
        socket.user = {
          _id: user._id,
          id: user._id,
          name: user.name, // ✅ Use actual 'name' field
          username: user.name || user.displayName, // ✅ Map to username for compatibility
          fullName: user.displayName || user.name, // ✅ Use displayName virtual or fallback
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

        console.log("✅ Socket authenticated successfully:", {
          socketId: socket.id,
          user: socket.user.username, // ✅ Now will show actual name
          userId: socket.userId.toString(),
          company: socket.company.businessName,
          companyId: socket.companyId.toString(),
        });

        next();
      } catch (error) {
        console.error("❌ Socket authentication error:", error);
        next(new Error(`Authentication failed: ${error.message}`));
      }
    });
  }

  // ✅ FIXED: Initialize connection handling with proper room management
  initializeConnection() {
    this.io.on("connection", (socket) => {
      console.log("🔗 New socket connection:", {
        socketId: socket.id,
        userId: socket.userId?.toString(),
        username: socket.user?.username,
        companyId: socket.companyId?.toString(),
        companyName: socket.company?.businessName,
      });

      // ✅ FIX: Validate socket has required data
      if (!socket.userId || !socket.companyId || !socket.user) {
        console.error("❌ Socket missing required data:", {
          hasUserId: !!socket.userId,
          hasCompanyId: !!socket.companyId,
          hasUser: !!socket.user,
        });
        socket.emit("error", {message: "Authentication data incomplete"});
        socket.disconnect();
        return;
      }

      // ✅ FIX: Track user connections to prevent duplicates
      const userId = socket.userId.toString();
      const companyId = socket.companyId.toString();

      // Add to tracking maps
      this.socketToUser.set(socket.id, userId);
      this.socketToCompany.set(socket.id, companyId);

      // Track multiple connections per user
      if (!this.activeConnections.has(userId)) {
        this.activeConnections.set(userId, new Set());
      }
      this.activeConnections.get(userId).add(socket.id);

      // ✅ FIXED: Join company room for company-wide broadcasts
      if (socket.companyId) {
        const companyRoom = `company_${socket.companyId}`;
        socket.join(companyRoom);
        console.log(
          `👥 User ${socket.user.username} (${socket.userId}) joined company room: ${companyRoom}`
        );
      }

      // ✅ FIXED: Join user-specific room
      if (socket.userId) {
        const userRoom = `user_${socket.userId}`;
        socket.join(userRoom);
        console.log(
          `👤 User ${socket.user.username} (${socket.userId}) joined user room: ${userRoom}`
        );
      }

      // ✅ FIX: Handle company chat room joining with proper validation
      socket.on("join_company_chat", (data) => {
        try {
          const {otherCompanyId} = data;
          if (!socket.companyId || !otherCompanyId) {
            socket.emit("error", {message: "Invalid company IDs for chat"});
            return;
          }

          const chatRoom = this.generateCompanyChatRoomId(
            socket.companyId,
            otherCompanyId
          );

          socket.join(chatRoom);
          console.log(
            `💬 User ${socket.user.username} (${socket.userId}) joined company chat room: ${chatRoom}`
          );

          // ✅ FIX: Send confirmation to socket, not to entire room
          socket.emit("joined_company_chat", {
            chatRoom,
            otherCompanyId,
            participants: this.getCompanyChatUsers(
              socket.companyId,
              otherCompanyId
            ).length,
          });

          // ✅ FIX: Notify only the other company's room about user joining
          const otherCompanyRoom = `company_${otherCompanyId}`;
          socket.to(otherCompanyRoom).emit("user_joined_chat", {
            userId: socket.userId,
            username: socket.user.username,
            companyId: socket.companyId,
            companyName: socket.company.businessName,
            chatRoom: chatRoom,
          });
        } catch (error) {
          console.error("Join company chat error:", error);
          socket.emit("error", {message: "Failed to join chat"});
        }
      });

      // ✅ FIX: Handle leaving company chat room
      socket.on("leave_company_chat", (data) => {
        try {
          const {otherCompanyId} = data;
          if (socket.companyId && otherCompanyId) {
            const chatRoom = this.generateCompanyChatRoomId(
              socket.companyId,
              otherCompanyId
            );
            socket.leave(chatRoom);
            console.log(
              `💬 User ${socket.user.username} (${socket.userId}) left company chat room: ${chatRoom}`
            );

            // Notify the other company about user leaving
            const otherCompanyRoom = `company_${otherCompanyId}`;
            socket.to(otherCompanyRoom).emit("user_left_chat", {
              userId: socket.userId,
              username: socket.user.username,
              companyId: socket.companyId,
              companyName: socket.company.businessName,
            });
          }
        } catch (error) {
          console.error("Leave company chat error:", error);
        }
      });

      // ✅ FIX: Handle typing indicators with proper room targeting
      socket.on("typing_start", (data) => {
        try {
          const {otherCompanyId} = data;
          if (socket.companyId && otherCompanyId) {
            const chatRoom = this.generateCompanyChatRoomId(
              socket.companyId,
              otherCompanyId
            );

            // ✅ FIX: Send only to the specific chat room, not to sender
            socket.to(chatRoom).emit("user_typing", {
              userId: socket.userId,
              username: socket.user.username,
              companyId: socket.companyId,
              isTyping: true,
            });
          }
        } catch (error) {
          console.error("Typing start error:", error);
        }
      });

      socket.on("typing_stop", (data) => {
        try {
          const {otherCompanyId} = data;
          if (socket.companyId && otherCompanyId) {
            const chatRoom = this.generateCompanyChatRoomId(
              socket.companyId,
              otherCompanyId
            );

            // ✅ FIX: Send only to the specific chat room, not to sender
            socket.to(chatRoom).emit("user_typing", {
              userId: socket.userId,
              username: socket.user.username,
              companyId: socket.companyId,
              isTyping: false,
            });
          }
        } catch (error) {
          console.error("Typing stop error:", error);
        }
      });

      // ✅ FIX: Handle message read status
      socket.on("message_read", (data) => {
        try {
          const {messageId, otherCompanyId} = data;
          if (socket.companyId && otherCompanyId && messageId) {
            const chatRoom = this.generateCompanyChatRoomId(
              socket.companyId,
              otherCompanyId
            );

            // ✅ FIX: Send only to the specific chat room
            socket.to(chatRoom).emit("message_read_status", {
              messageId,
              readBy: socket.userId,
              readAt: new Date(),
            });
          }
        } catch (error) {
          console.error("Message read error:", error);
        }
      });

      // Handle user status updates
      socket.on("status_update", (data) => {
        try {
          const {status} = data;
          if (socket.companyId) {
            const companyRoom = `company_${socket.companyId}`;
            socket.to(companyRoom).emit("user_status_changed", {
              userId: socket.userId,
              username: socket.user.username,
              status,
              timestamp: new Date(),
            });
          }
        } catch (error) {
          console.error("Status update error:", error);
        }
      });

      // ✅ FIXED: Handle disconnection with proper cleanup
      socket.on("disconnect", (reason) => {
        console.log("❌ Socket disconnected:", {
          socketId: socket.id,
          userId: socket.userId?.toString(),
          username: socket.user?.username,
          companyId: socket.companyId?.toString(),
          reason,
        });

        try {
          const userId = this.socketToUser.get(socket.id);
          const companyId = this.socketToCompany.get(socket.id);

          // ✅ FIX: Clean up tracking maps
          this.socketToUser.delete(socket.id);
          this.socketToCompany.delete(socket.id);

          if (userId) {
            // Remove this socket from user's active connections
            if (this.activeConnections.has(userId)) {
              this.activeConnections.get(userId).delete(socket.id);

              // If user has no more active connections, remove from map
              if (this.activeConnections.get(userId).size === 0) {
                this.activeConnections.delete(userId);

                // ✅ FIX: Only notify about user going offline if they have no other connections
                if (companyId) {
                  const companyRoom = `company_${companyId}`;
                  socket.to(companyRoom).emit("user_offline", {
                    userId: userId,
                    username: socket.user?.username,
                    timestamp: new Date(),
                  });
                }
              }
            }

            // ✅ FIX: Remove from connection handler with proper user data
            this.connectionHandler.removeConnection(userId);
          }
        } catch (error) {
          console.error("Disconnect cleanup error:", error);
        }
      });

      // ✅ FIX: Add to connection handler with proper user data
      if (socket.userId && socket.user) {
        this.connectionHandler.addConnection(socket.userId.toString(), socket);
      }

      // ✅ FIX: Only emit user online if this is their first connection
      if (socket.companyId && socket.userId && socket.user) {
        const userConnections = this.activeConnections.get(
          socket.userId.toString()
        );
        if (userConnections && userConnections.size === 1) {
          const companyRoom = `company_${socket.companyId}`;
          socket.to(companyRoom).emit("user_online", {
            userId: socket.userId,
            username: socket.user.username,
            fullName: socket.user.fullName,
            timestamp: new Date(),
          });

          console.log(
            `📢 User ${socket.user.username} is now online in company ${socket.company.businessName}`
          );
        }
      }

      // ✅ NEW: Send successful connection confirmation to client
      socket.emit("connection_confirmed", {
        socketId: socket.id,
        userId: socket.userId,
        username: socket.user.username,
        companyId: socket.companyId,
        companyName: socket.company.businessName,
        timestamp: new Date(),
      });
    });
  }

  startCleanupInterval() {
    // Clean up inactive connections every 10 minutes
    setInterval(() => {
      this.connectionHandler.cleanupInactiveConnections(30);
      this.cleanupStaleConnections();
    }, 10 * 60 * 1000);
  }

  // ✅ NEW: Clean up stale connections from our tracking maps
  cleanupStaleConnections() {
    try {
      // Clean up socketToUser map
      for (const [socketId, userId] of this.socketToUser.entries()) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (!socket) {
          this.socketToUser.delete(socketId);
          this.socketToCompany.delete(socketId);

          // Clean up from activeConnections
          if (this.activeConnections.has(userId)) {
            this.activeConnections.get(userId).delete(socketId);
            if (this.activeConnections.get(userId).size === 0) {
              this.activeConnections.delete(userId);
            }
          }
        }
      }

      console.log("🧹 Cleaned up stale socket connections");
    } catch (error) {
      console.error("Cleanup error:", error);
    }
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
      activeConnections: this.activeConnections.size,
      totalSockets: this.io.sockets.sockets.size,
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

  // ✅ FIXED: Send message to specific company (all users in that company)
  sendToCompany(companyId, event, data) {
    try {
      const companyRoom = `company_${companyId}`;
      this.io.to(companyRoom).emit(event, data);
      console.log(`📡 Sent event "${event}" to company room: ${companyRoom}`);
      return true;
    } catch (error) {
      console.error(`Failed to send to company ${companyId}:`, error);
      return false;
    }
  }

  // ✅ CRITICAL FIX: Completely rewritten sendToCompanyChat to prevent duplicates
  sendToCompanyChat(fromCompanyId, toCompanyId, event, data) {
    try {
      console.log(`🚀 SendToCompanyChat called:`, {
        from: fromCompanyId,
        to: toCompanyId,
        event,
        messageId: data.id || data._id,
      });

      // ✅ FIX: Generate the chat room ID
      const chatRoomId = this.generateCompanyChatRoomId(
        fromCompanyId,
        toCompanyId
      );

      // ✅ FIX: Send message only once to the chat room
      // All participants in the chat room will receive it
      this.io.to(chatRoomId).emit(event, {
        ...data,
        fromCompany: fromCompanyId,
        toCompany: toCompanyId,
        chatRoomId: chatRoomId,
        timestamp: new Date(),
      });

      console.log(`📡 Message sent to chat room: ${chatRoomId}`);

      // ✅ FIX: Also notify company rooms for notification purposes (optional)
      const fromCompanyRoom = `company_${fromCompanyId}`;
      const toCompanyRoom = `company_${toCompanyId}`;

      // Send notification to sender's company (for UI updates)
      this.io.to(fromCompanyRoom).emit("message_sent_confirmation", {
        messageId: data.id || data._id,
        toCompany: toCompanyId,
        status: "sent",
      });

      // Send notification to receiver's company (for new message indicator)
      this.io.to(toCompanyRoom).emit("new_message_notification", {
        fromCompany: fromCompanyId,
        messageId: data.id || data._id,
        preview: data.content?.substring(0, 50) + "...",
      });

      return true;
    } catch (error) {
      console.error("❌ Error in sendToCompanyChat:", error);
      return false;
    }
  }

  // ✅ FIXED: Generate consistent room ID for company-to-company chat
  generateCompanyChatRoomId(companyId1, companyId2) {
    // Sort company IDs to ensure consistent room naming
    const sortedIds = [companyId1.toString(), companyId2.toString()].sort();
    return `company_chat_${sortedIds[0]}_${sortedIds[1]}`;
  }

  // ✅ FIXED: Get all connected users for a company
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

  // ✅ FIXED: Get users in a specific company chat room
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

  // ✅ FIXED: Join user to company chat room
  joinCompanyChat(userId, companyId1, companyId2) {
    try {
      const roomId = this.generateCompanyChatRoomId(companyId1, companyId2);

      // Get all active sockets for this user
      const userSockets = this.activeConnections.get(userId);
      if (userSockets) {
        userSockets.forEach((socketId) => {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.join(roomId);
            console.log(
              `💬 User ${userId} (socket ${socketId}) joined company chat room: ${roomId}`
            );
          }
        });
      }

      return true;
    } catch (error) {
      console.error("Join company chat error:", error);
      return false;
    }
  }

  // ✅ FIXED: Leave user from company chat room
  leaveCompanyChat(userId, companyId1, companyId2) {
    try {
      const roomId = this.generateCompanyChatRoomId(companyId1, companyId2);

      // Get all active sockets for this user
      const userSockets = this.activeConnections.get(userId);
      if (userSockets) {
        userSockets.forEach((socketId) => {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.leave(roomId);
            console.log(
              `💬 User ${userId} (socket ${socketId}) left company chat room: ${roomId}`
            );
          }
        });
      }

      return true;
    } catch (error) {
      console.error("Leave company chat error:", error);
      return false;
    }
  }

  // ✅ FIXED: Check if user is online
  isUserOnline(userId) {
    return (
      this.activeConnections.has(userId) &&
      this.activeConnections.get(userId).size > 0
    );
  }

  // ✅ FIXED: Check if company has online users
  isCompanyOnline(companyId) {
    const companyRoom = `company_${companyId}`;
    const room = this.io.sockets.adapter.rooms.get(companyRoom);
    return room && room.size > 0;
  }

  // ✅ NEW: Get active connections info
  getActiveConnectionsInfo() {
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
  }
}

module.exports = SocketManager;
