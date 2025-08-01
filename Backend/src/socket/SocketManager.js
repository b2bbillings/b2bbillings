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
      transports: ["websocket", "polling"],
      allowEIO3: true,
    });

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
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace("Bearer ", "") ||
          socket.handshake.query?.token;

        if (!token) {
          return next(new Error("Authentication token required"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id || decoded.userId || decoded.user?.id;

        if (!userId) {
          return next(new Error("Invalid token: no user ID"));
        }

        const user = await User.findById(userId);
        if (!user) {
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

        next();
      } catch (error) {
        next(new Error(`Authentication failed: ${error.message}`));
      }
    });
  }

  initializeConnection() {
    this.io.on("connection", (socket) => {
      if (!socket.userId || !socket.companyId || !socket.user) {
        socket.emit("auth_error", {message: "Authentication data incomplete"});
        socket.disconnect(true);
        return;
      }

      const userId = socket.userId.toString();
      const companyId = socket.companyId.toString();

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

      socket.on("disconnect", (reason) => {
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

      socket.emit("connection_confirmed", {
        socketId: socket.id,
        userId: socket.userId,
        username: socket.user.username,
        companyId: socket.companyId,
        companyName: socket.company.businessName,
        timestamp: new Date(),
        message: "Connected successfully",
      });
    });
  }

  startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.connectionHandler.cleanupInactiveConnections(30);
      this.cleanupStaleConnections();
    }, 10 * 60 * 1000);
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
      };

      for (const [roomId] of rooms) {
        if (roomId.startsWith("company_chat_")) {
          roomStats.chatRooms++;
        } else if (roomId.startsWith("company_")) {
          roomStats.companyRooms++;
        } else if (roomId.startsWith("user_")) {
          roomStats.userRooms++;
        }
      }

      return roomStats;
    } catch (error) {
      return {total: 0, companyRooms: 0, userRooms: 0, chatRooms: 0};
    }
  }

  sendToUser(userId, event, data) {
    try {
      if (this.socketHandler && this.socketHandler.sendToUser) {
        return this.socketHandler.sendToUser(userId, event, data);
      }

      const userSockets = this.activeConnections.get(userId.toString());
      if (userSockets) {
        let sentCount = 0;
        userSockets.forEach((socketId) => {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit(event, data);
            sentCount++;
          }
        });
        return sentCount > 0;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  sendToCompany(companyId, event, data) {
    try {
      if (this.socketHandler && this.socketHandler.sendToCompany) {
        return this.socketHandler.sendToCompany(companyId, event, data);
      }

      this.io.to(`company_${companyId}`).emit(event, data);
      return true;
    } catch (error) {
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
      this.io.to(chatRoomId).emit(event, {
        ...data,
        fromCompany: fromCompanyId,
        toCompany: toCompanyId,
        chatRoomId: chatRoomId,
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
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
      return [];
    }
  }

  sendToRoom(roomId, event, data) {
    try {
      this.io.to(roomId).emit(event, data);
      return true;
    } catch (error) {
      return false;
    }
  }

  broadcast(event, data) {
    try {
      this.io.emit(event, data);
      return true;
    } catch (error) {
      return false;
    }
  }

  joinCompanyChat(userId, companyId1, companyId2) {
    return true;
  }

  leaveCompanyChat(userId, companyId1, companyId2) {
    return true;
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
      return {totalUsers: 0, totalSockets: 0, users: {}};
    }
  }

  getDebugInfo() {
    try {
      return {
        timestamp: new Date().toISOString(),
        socketManager: {
          initialized: !!this.io,
          connectionHandlerAvailable: !!this.connectionHandler,
          socketHandlerAvailable: !!this.socketHandler,
          messageHandlerAvailable: !!this.messageHandler,
        },
        connections: this.getActiveConnectionsInfo(),
        rooms: this.getRoomStats(),
        stats: this.getStats(),
      };
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  shutdown() {
    try {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }

      if (this.io) {
        this.io.close();
      }

      if (this.connectionHandler) {
        this.connectionHandler.clearAll();
      }

      this.activeConnections.clear();
      this.socketToUser.clear();
      this.socketToCompany.clear();
    } catch (error) {
      console.error("Shutdown error:", error);
    }
  }
}

module.exports = SocketManager;
