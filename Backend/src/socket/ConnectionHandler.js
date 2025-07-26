class ConnectionHandler {
  constructor() {
    this.connections = new Map(); // socketId -> connection info
    this.userConnections = new Map(); // userId -> Set of socketIds
    this.roomConnections = new Map(); // roomId -> Set of socketIds
  }

  // ✅ FIXED: Add a new connection with proper user data handling
  addConnection(userId, socket) {
    try {
      // ✅ FIX: Handle user data properly with correct field names
      const userInfo = {
        userId: userId,
        username: socket.user?.username || socket.user?.name || "Unknown User",
        fullName: socket.user?.fullName || socket.user?.name || "Unknown User",
        name: socket.user?.name || "Unknown User",
        email: socket.user?.email,
        companyId: socket.companyId?.toString(),
        companyName: socket.company?.businessName || "Unknown Company",
        connectedAt: new Date(),
      };

      const connectionInfo = {
        socketId: socket.id,
        userId: userId,
        companyId: socket.companyId?.toString(),
        userInfo: userInfo,
        connectedAt: new Date(),
        lastActivity: new Date(),
        rooms: new Set(),
        socket: socket,
      };

      this.connections.set(socket.id, connectionInfo);

      // Track user connections
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId).add(socket.id);

      console.log(
        `✅ User ${userInfo.username} (${userId}) from company ${userInfo.companyName} authenticated on socket ${socket.id}`
      );

      return true;
    } catch (error) {
      console.error("Error adding connection:", error);
      return false;
    }
  }

  // ✅ FIXED: Remove a connection with better logging
  removeConnection(userId) {
    try {
      // Find all sockets for this user
      const userSocketIds = this.userConnections.get(userId);

      if (userSocketIds) {
        userSocketIds.forEach((socketId) => {
          const connectionInfo = this.connections.get(socketId);

          if (connectionInfo) {
            // Remove from rooms
            connectionInfo.rooms.forEach((roomId) => {
              this.leaveRoom(socketId, roomId);
            });

            // Remove the connection
            this.connections.delete(socketId);

            console.log(
              `👋 User ${
                connectionInfo.userInfo?.username || userId
              } disconnected from socket ${socketId}`
            );
          }
        });

        // Remove user from userConnections
        this.userConnections.delete(userId);
      }

      return true;
    } catch (error) {
      console.error("Error removing connection:", error);
      return false;
    }
  }

  // ✅ FIXED: Remove connection by socketId (alternative method)
  removeConnectionBySocketId(socketId) {
    try {
      const connectionInfo = this.connections.get(socketId);

      if (connectionInfo) {
        const {userId, userInfo} = connectionInfo;

        // Remove from user connections
        if (this.userConnections.has(userId)) {
          this.userConnections.get(userId).delete(socketId);

          // If no more connections for this user, remove the user entry
          if (this.userConnections.get(userId).size === 0) {
            this.userConnections.delete(userId);
          }
        }

        // Remove from rooms
        connectionInfo.rooms.forEach((roomId) => {
          this.leaveRoom(socketId, roomId);
        });

        // Remove the connection
        this.connections.delete(socketId);

        console.log(
          `👋 Connection removed: ${socketId} for user ${
            userInfo?.username || userId
          }`
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error removing connection by socket ID:", error);
      return false;
    }
  }

  // ✅ FIXED: Join a room with better validation
  joinRoom(socketId, roomId) {
    try {
      const connectionInfo = this.connections.get(socketId);

      if (connectionInfo) {
        connectionInfo.rooms.add(roomId);

        // Track room connections
        if (!this.roomConnections.has(roomId)) {
          this.roomConnections.set(roomId, new Set());
        }
        this.roomConnections.get(roomId).add(socketId);

        console.log(
          `💬 Socket ${socketId} (${connectionInfo.userInfo?.username}) joined room ${roomId}`
        );
        return true;
      }

      console.warn(
        `⚠️ Cannot join room ${roomId}: Socket ${socketId} not found`
      );
      return false;
    } catch (error) {
      console.error("Error joining room:", error);
      return false;
    }
  }

  // ✅ FIXED: Leave a room with better validation
  leaveRoom(socketId, roomId) {
    try {
      const connectionInfo = this.connections.get(socketId);

      if (connectionInfo) {
        connectionInfo.rooms.delete(roomId);

        // Remove from room connections
        if (this.roomConnections.has(roomId)) {
          this.roomConnections.get(roomId).delete(socketId);

          // If no more connections in this room, remove the room entry
          if (this.roomConnections.get(roomId).size === 0) {
            this.roomConnections.delete(roomId);
          }
        }

        console.log(
          `💬 Socket ${socketId} (${connectionInfo.userInfo?.username}) left room ${roomId}`
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error leaving room:", error);
      return false;
    }
  }

  // ✅ FIXED: Update last activity
  updateActivity(socketId) {
    try {
      const connectionInfo = this.connections.get(socketId);
      if (connectionInfo) {
        connectionInfo.lastActivity = new Date();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating activity:", error);
      return false;
    }
  }

  // ✅ FIXED: Get all connections for a user
  getUserConnections(userId) {
    try {
      const socketIds = this.userConnections.get(userId);
      if (!socketIds) return [];

      const connections = [];
      socketIds.forEach((socketId) => {
        const connectionInfo = this.connections.get(socketId);
        if (connectionInfo) {
          connections.push(connectionInfo);
        }
      });

      return connections;
    } catch (error) {
      console.error("Error getting user connections:", error);
      return [];
    }
  }

  // ✅ FIXED: Get all socket IDs for a user
  getUserSocketIds(userId) {
    try {
      return Array.from(this.userConnections.get(userId) || []);
    } catch (error) {
      console.error("Error getting user socket IDs:", error);
      return [];
    }
  }

  // ✅ FIXED: Get all connections in a room
  getRoomConnections(roomId) {
    try {
      const socketIds = this.roomConnections.get(roomId);
      if (!socketIds) return [];

      const connections = [];
      socketIds.forEach((socketId) => {
        const connectionInfo = this.connections.get(socketId);
        if (connectionInfo) {
          connections.push(connectionInfo);
        }
      });

      return connections;
    } catch (error) {
      console.error("Error getting room connections:", error);
      return [];
    }
  }

  // ✅ FIXED: Get all socket IDs in a room
  getRoomSocketIds(roomId) {
    try {
      return Array.from(this.roomConnections.get(roomId) || []);
    } catch (error) {
      console.error("Error getting room socket IDs:", error);
      return [];
    }
  }

  // ✅ FIXED: Check if user is online
  isUserOnline(userId) {
    try {
      return (
        this.userConnections.has(userId) &&
        this.userConnections.get(userId).size > 0
      );
    } catch (error) {
      console.error("Error checking if user is online:", error);
      return false;
    }
  }

  // ✅ FIXED: Get online users count
  getOnlineUsersCount() {
    try {
      return this.userConnections.size;
    } catch (error) {
      console.error("Error getting online users count:", error);
      return 0;
    }
  }

  // ✅ FIXED: Get total connections count
  getTotalConnectionsCount() {
    try {
      return this.connections.size;
    } catch (error) {
      console.error("Error getting total connections count:", error);
      return 0;
    }
  }

  // ✅ FIXED: Get connection info
  getConnectionInfo(socketId) {
    try {
      return this.connections.get(socketId);
    } catch (error) {
      console.error("Error getting connection info:", error);
      return null;
    }
  }

  // ✅ FIXED: Get user info from socket
  getUserFromSocket(socketId) {
    try {
      const connectionInfo = this.connections.get(socketId);
      return connectionInfo ? connectionInfo.userId : null;
    } catch (error) {
      console.error("Error getting user from socket:", error);
      return null;
    }
  }

  // ✅ FIXED: Get company info from socket
  getCompanyFromSocket(socketId) {
    try {
      const connectionInfo = this.connections.get(socketId);
      return connectionInfo ? connectionInfo.companyId : null;
    } catch (error) {
      console.error("Error getting company from socket:", error);
      return null;
    }
  }

  // ✅ FIXED: Get all online users with detailed info
  getOnlineUsers() {
    try {
      const onlineUsers = [];

      this.userConnections.forEach((socketIds, userId) => {
        const firstSocketId = Array.from(socketIds)[0];
        const connectionInfo = this.connections.get(firstSocketId);

        if (connectionInfo && connectionInfo.userInfo) {
          onlineUsers.push({
            userId: userId,
            username: connectionInfo.userInfo.username,
            fullName: connectionInfo.userInfo.fullName,
            companyId: connectionInfo.userInfo.companyId,
            companyName: connectionInfo.userInfo.companyName,
            connectionCount: socketIds.size,
            lastActivity: connectionInfo.lastActivity,
          });
        }
      });

      return onlineUsers;
    } catch (error) {
      console.error("Error getting online users:", error);
      return [];
    }
  }

  // ✅ FIXED: Get active rooms with detailed info
  getActiveRooms() {
    try {
      const activeRooms = [];

      this.roomConnections.forEach((socketIds, roomId) => {
        activeRooms.push({
          roomId: roomId,
          connectionCount: socketIds.size,
          type: this.getRoomType(roomId),
        });
      });

      return activeRooms;
    } catch (error) {
      console.error("Error getting active rooms:", error);
      return [];
    }
  }

  // ✅ NEW: Determine room type
  getRoomType(roomId) {
    if (roomId.startsWith("company_chat_")) return "company_chat";
    if (roomId.startsWith("company_")) return "company";
    if (roomId.startsWith("user_")) return "user";
    return "unknown";
  }

  // ✅ FIXED: Get connection statistics with better data
  getConnectionStats() {
    try {
      return {
        totalConnections: this.connections.size,
        onlineUsers: this.userConnections.size,
        activeRooms: this.roomConnections.size,
        connectionsByCompany: this.getConnectionsByCompany(),
        roomsByType: this.getRoomsByType(),
        connections: Array.from(this.connections.values()).map((conn) => ({
          socketId: conn.socketId,
          userId: conn.userId,
          username: conn.userInfo?.username,
          companyId: conn.companyId,
          companyName: conn.userInfo?.companyName,
          connectedAt: conn.connectedAt,
          lastActivity: conn.lastActivity,
          roomCount: conn.rooms.size,
        })),
      };
    } catch (error) {
      console.error("Error getting connection stats:", error);
      return {
        totalConnections: 0,
        onlineUsers: 0,
        activeRooms: 0,
        connectionsByCompany: {},
        roomsByType: {},
        connections: [],
      };
    }
  }

  // ✅ NEW: Get connections grouped by company
  getConnectionsByCompany() {
    try {
      const stats = {};

      this.connections.forEach((connectionInfo) => {
        const companyId = connectionInfo.companyId;
        const companyName = connectionInfo.userInfo?.companyName || "Unknown";

        if (companyId) {
          if (!stats[companyId]) {
            stats[companyId] = {
              companyName: companyName,
              userCount: 0,
              connectionCount: 0,
              users: new Set(),
            };
          }

          stats[companyId].connectionCount++;
          stats[companyId].users.add(connectionInfo.userId);
          stats[companyId].userCount = stats[companyId].users.size;
        }
      });

      // Convert Set to Array for JSON serialization
      Object.values(stats).forEach((stat) => {
        stat.users = Array.from(stat.users);
      });

      return stats;
    } catch (error) {
      console.error("Error getting connections by company:", error);
      return {};
    }
  }

  // ✅ NEW: Get rooms grouped by type
  getRoomsByType() {
    try {
      const stats = {
        company_chat: 0,
        company: 0,
        user: 0,
        unknown: 0,
      };

      this.roomConnections.forEach((socketIds, roomId) => {
        const type = this.getRoomType(roomId);
        stats[type] = (stats[type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error("Error getting rooms by type:", error);
      return {company_chat: 0, company: 0, user: 0, unknown: 0};
    }
  }

  // ✅ FIXED: Clean up inactive connections
  cleanupInactiveConnections(timeoutMinutes = 30) {
    try {
      const timeout = new Date(Date.now() - timeoutMinutes * 60 * 1000);
      const inactiveConnections = [];

      this.connections.forEach((connectionInfo, socketId) => {
        if (connectionInfo.lastActivity < timeout) {
          inactiveConnections.push({
            socketId: socketId,
            userId: connectionInfo.userId,
            username: connectionInfo.userInfo?.username,
            lastActivity: connectionInfo.lastActivity,
          });
        }
      });

      inactiveConnections.forEach(({socketId, userId, username}) => {
        this.removeConnectionBySocketId(socketId);
        console.log(
          `🧹 Cleaned up inactive connection: ${username} (${userId}) - ${socketId}`
        );
      });

      if (inactiveConnections.length > 0) {
        console.log(
          `🧹 Cleaned up ${inactiveConnections.length} inactive connections`
        );
      }

      return inactiveConnections.length;
    } catch (error) {
      console.error("Error cleaning up inactive connections:", error);
      return 0;
    }
  }

  // ✅ NEW: Get users by company
  getUsersByCompany(companyId) {
    try {
      const users = [];

      this.connections.forEach((connectionInfo) => {
        if (
          connectionInfo.companyId === companyId.toString() &&
          connectionInfo.userInfo
        ) {
          // Avoid duplicates by checking if user already exists
          const existingUser = users.find(
            (u) => u.userId === connectionInfo.userId
          );
          if (!existingUser) {
            users.push({
              userId: connectionInfo.userId,
              username: connectionInfo.userInfo.username,
              fullName: connectionInfo.userInfo.fullName,
              email: connectionInfo.userInfo.email,
              connectionCount: this.getUserSocketIds(connectionInfo.userId)
                .length,
              lastActivity: connectionInfo.lastActivity,
            });
          }
        }
      });

      return users;
    } catch (error) {
      console.error("Error getting users by company:", error);
      return [];
    }
  }

  // ✅ NEW: Check if company has online users
  isCompanyOnline(companyId) {
    try {
      for (const connectionInfo of this.connections.values()) {
        if (connectionInfo.companyId === companyId.toString()) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error checking if company is online:", error);
      return false;
    }
  }

  // ✅ NEW: Get detailed connection info for debugging
  getDetailedStats() {
    try {
      return {
        timestamp: new Date().toISOString(),
        summary: {
          totalConnections: this.connections.size,
          onlineUsers: this.userConnections.size,
          activeRooms: this.roomConnections.size,
        },
        connectionsByCompany: this.getConnectionsByCompany(),
        roomsByType: this.getRoomsByType(),
        onlineUsers: this.getOnlineUsers(),
        activeRooms: this.getActiveRooms(),
      };
    } catch (error) {
      console.error("Error getting detailed stats:", error);
      return {
        timestamp: new Date().toISOString(),
        error: error.message,
        summary: {totalConnections: 0, onlineUsers: 0, activeRooms: 0},
      };
    }
  }
}

module.exports = ConnectionHandler;
