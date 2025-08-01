class ConnectionHandler {
  constructor() {
    this.connections = new Map(); // socketId -> connection info
    this.userConnections = new Map(); // userId -> Set of socketIds
    this.roomConnections = new Map(); // roomId -> Set of socketIds
    this.companyConnections = new Map(); // companyId -> Set of socketIds
  }

  addConnection(socket, userData = null) {
    try {
      const effectiveUserData = userData || {
        userId: socket.userId,
        username: socket.user?.username || socket.user?.name,
        companyId: socket.companyId,
        companyName: socket.company?.businessName || socket.company?.name,
        email: socket.user?.email,
      };

      if (
        !effectiveUserData ||
        !effectiveUserData.userId ||
        !effectiveUserData.companyId
      ) {
        return false;
      }

      const {userId, username, companyId, companyName, email} =
        effectiveUserData;

      const userInfo = {
        userId: userId.toString(),
        username: username || "Unknown User",
        fullName: username || "Unknown User",
        name: username || "Unknown User",
        email: email || null,
        companyId: companyId.toString(),
        companyName: companyName || "Unknown Company",
        connectedAt: new Date(),
      };

      const connectionInfo = {
        socketId: socket.id,
        userId: userId.toString(),
        companyId: companyId.toString(),
        userInfo: userInfo,
        connectedAt: new Date(),
        lastActivity: new Date(),
        rooms: new Set(),
        socket: socket,
        isActive: true,
      };

      this.connections.set(socket.id, connectionInfo);

      if (!this.userConnections.has(userId.toString())) {
        this.userConnections.set(userId.toString(), new Set());
      }
      this.userConnections.get(userId.toString()).add(socket.id);

      if (!this.companyConnections.has(companyId.toString())) {
        this.companyConnections.set(companyId.toString(), new Set());
      }
      this.companyConnections.get(companyId.toString()).add(socket.id);

      return true;
    } catch (error) {
      console.error("Error adding connection:", error);
      return false;
    }
  }

  removeConnection(socketId) {
    try {
      const connectionInfo = this.connections.get(socketId);

      if (!connectionInfo) {
        return false;
      }

      const {userId, companyId} = connectionInfo;

      this.connections.delete(socketId);

      if (this.userConnections.has(userId)) {
        this.userConnections.get(userId).delete(socketId);
        if (this.userConnections.get(userId).size === 0) {
          this.userConnections.delete(userId);
        }
      }

      if (this.companyConnections.has(companyId)) {
        this.companyConnections.get(companyId).delete(socketId);
        if (this.companyConnections.get(companyId).size === 0) {
          this.companyConnections.delete(companyId);
        }
      }

      connectionInfo.rooms.forEach((roomId) => {
        this.leaveRoom(socketId, roomId);
      });

      return true;
    } catch (error) {
      console.error("Error removing connection:", error);
      return false;
    }
  }

  removeConnectionByUserId(userId) {
    try {
      const userSocketIds = this.userConnections.get(userId.toString());

      if (userSocketIds) {
        userSocketIds.forEach((socketId) => {
          this.removeConnection(socketId);
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error removing connection by user ID:", error);
      return false;
    }
  }

  joinRoom(socketId, roomId) {
    try {
      const connectionInfo = this.connections.get(socketId);

      if (!connectionInfo) {
        return false;
      }

      connectionInfo.rooms.add(roomId);

      if (!this.roomConnections.has(roomId)) {
        this.roomConnections.set(roomId, new Set());
      }
      this.roomConnections.get(roomId).add(socketId);

      return true;
    } catch (error) {
      console.error("Error joining room:", error);
      return false;
    }
  }

  leaveRoom(socketId, roomId) {
    try {
      const connectionInfo = this.connections.get(socketId);

      if (connectionInfo) {
        connectionInfo.rooms.delete(roomId);
      }

      if (this.roomConnections.has(roomId)) {
        this.roomConnections.get(roomId).delete(socketId);

        if (this.roomConnections.get(roomId).size === 0) {
          this.roomConnections.delete(roomId);
        }
      }

      return true;
    } catch (error) {
      console.error("Error leaving room:", error);
      return false;
    }
  }

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

  getConnection(socketId) {
    try {
      return this.connections.get(socketId) || null;
    } catch (error) {
      console.error("Error getting connection:", error);
      return null;
    }
  }

  getUserConnections(userId) {
    try {
      const socketIds = this.userConnections.get(userId.toString());
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

  getUserSocketIds(userId) {
    try {
      return Array.from(this.userConnections.get(userId.toString()) || []);
    } catch (error) {
      console.error("Error getting user socket IDs:", error);
      return [];
    }
  }

  getUserSockets(userId) {
    try {
      const userIdStr = userId.toString();
      const socketIds = this.userConnections.get(userIdStr);

      if (!socketIds) {
        return [];
      }

      return Array.from(socketIds)
        .map((socketId) => this.connections.get(socketId))
        .filter(Boolean);
    } catch (error) {
      console.error("Error getting user sockets:", error);
      return [];
    }
  }

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

  getRoomSocketIds(roomId) {
    try {
      return Array.from(this.roomConnections.get(roomId) || []);
    } catch (error) {
      console.error("Error getting room socket IDs:", error);
      return [];
    }
  }

  getCompanySockets(companyId) {
    try {
      const companyIdStr = companyId.toString();
      const socketIds = this.companyConnections.get(companyIdStr);

      if (!socketIds) {
        return [];
      }

      return Array.from(socketIds)
        .map((socketId) => this.connections.get(socketId))
        .filter(Boolean);
    } catch (error) {
      console.error("Error getting company sockets:", error);
      return [];
    }
  }

  getCompanyUsers(companyId) {
    try {
      const companyIdStr = companyId.toString();
      const socketIds = this.companyConnections.get(companyIdStr);

      if (!socketIds) {
        return [];
      }

      const users = [];
      const addedUsers = new Set();

      for (const socketId of socketIds) {
        const connection = this.connections.get(socketId);
        if (connection && !addedUsers.has(connection.userId)) {
          users.push({
            userId: connection.userId,
            username: connection.userInfo?.username,
            fullName: connection.userInfo?.fullName,
            companyId: connection.companyId,
            companyName: connection.userInfo?.companyName,
            connectedAt: connection.connectedAt,
            lastSeen: connection.lastActivity,
            socketId: connection.socketId,
          });
          addedUsers.add(connection.userId);
        }
      }

      return users;
    } catch (error) {
      console.error("Error getting company users:", error);
      return [];
    }
  }

  isUserOnline(userId) {
    try {
      const userIdStr = userId.toString();
      return (
        this.userConnections.has(userIdStr) &&
        this.userConnections.get(userIdStr).size > 0
      );
    } catch (error) {
      console.error("Error checking if user is online:", error);
      return false;
    }
  }

  isCompanyOnline(companyId) {
    try {
      const companyIdStr = companyId.toString();
      return (
        this.companyConnections.has(companyIdStr) &&
        this.companyConnections.get(companyIdStr).size > 0
      );
    } catch (error) {
      console.error("Error checking if company is online:", error);
      return false;
    }
  }

  getOnlineUsersCount() {
    try {
      return this.userConnections.size;
    } catch (error) {
      console.error("Error getting online users count:", error);
      return 0;
    }
  }

  getTotalConnectionsCount() {
    try {
      return this.connections.size;
    } catch (error) {
      console.error("Error getting total connections count:", error);
      return 0;
    }
  }

  getUserFromSocket(socketId) {
    try {
      const connectionInfo = this.connections.get(socketId);
      return connectionInfo ? connectionInfo.userId : null;
    } catch (error) {
      console.error("Error getting user from socket:", error);
      return null;
    }
  }

  getCompanyFromSocket(socketId) {
    try {
      const connectionInfo = this.connections.get(socketId);
      return connectionInfo ? connectionInfo.companyId : null;
    } catch (error) {
      console.error("Error getting company from socket:", error);
      return null;
    }
  }

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

  getRoomType(roomId) {
    if (roomId.startsWith("company_chat_")) return "company_chat";
    if (roomId.startsWith("company_")) return "company";
    if (roomId.startsWith("user_")) return "user";
    return "unknown";
  }

  getStats() {
    try {
      return {
        totalConnections: this.connections.size,
        onlineUsers: this.userConnections.size,
        onlineCompanies: this.companyConnections.size,
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
        onlineCompanies: 0,
        activeRooms: 0,
        connectionsByCompany: {},
        roomsByType: {},
        connections: [],
      };
    }
  }

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

      Object.values(stats).forEach((stat) => {
        stat.users = Array.from(stat.users);
      });

      return stats;
    } catch (error) {
      console.error("Error getting connections by company:", error);
      return {};
    }
  }

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

      inactiveConnections.forEach(({socketId}) => {
        this.removeConnection(socketId);
      });

      return inactiveConnections.length;
    } catch (error) {
      console.error("Error cleaning up inactive connections:", error);
      return 0;
    }
  }

  getUsersByCompany(companyId) {
    try {
      const users = [];
      const companyIdStr = companyId.toString();

      this.connections.forEach((connectionInfo) => {
        if (
          connectionInfo.companyId === companyIdStr &&
          connectionInfo.userInfo
        ) {
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

  getDetailedStats() {
    try {
      return {
        timestamp: new Date().toISOString(),
        summary: {
          totalConnections: this.connections.size,
          onlineUsers: this.userConnections.size,
          onlineCompanies: this.companyConnections.size,
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
        summary: {
          totalConnections: 0,
          onlineUsers: 0,
          onlineCompanies: 0,
          activeRooms: 0,
        },
      };
    }
  }

  getAllConnections() {
    try {
      return Array.from(this.connections.values());
    } catch (error) {
      console.error("Error getting all connections:", error);
      return [];
    }
  }

  clearAll() {
    try {
      this.connections.clear();
      this.userConnections.clear();
      this.roomConnections.clear();
      this.companyConnections.clear();
    } catch (error) {
      console.error("Error clearing all connections:", error);
    }
  }

  broadcastToCompany(companyId, event, data, excludeSocketId = null) {
    try {
      const companyIdStr = companyId.toString();
      const socketIds = this.companyConnections.get(companyIdStr);

      if (!socketIds) {
        return 0;
      }

      let broadcastCount = 0;

      socketIds.forEach((socketId) => {
        if (socketId !== excludeSocketId) {
          const connection = this.connections.get(socketId);
          if (connection && connection.socket) {
            try {
              connection.socket.emit(event, data);
              broadcastCount++;
            } catch (error) {
              console.error(`Error broadcasting to socket ${socketId}:`, error);
            }
          }
        }
      });

      return broadcastCount;
    } catch (error) {
      console.error("Error broadcasting to company:", error);
      return 0;
    }
  }

  broadcastToUser(userId, event, data, excludeSocketId = null) {
    try {
      const userIdStr = userId.toString();
      const socketIds = this.userConnections.get(userIdStr);

      if (!socketIds) {
        return 0;
      }

      let broadcastCount = 0;

      socketIds.forEach((socketId) => {
        if (socketId !== excludeSocketId) {
          const connection = this.connections.get(socketId);
          if (connection && connection.socket) {
            try {
              connection.socket.emit(event, data);
              broadcastCount++;
            } catch (error) {
              console.error(`Error broadcasting to socket ${socketId}:`, error);
            }
          }
        }
      });

      return broadcastCount;
    } catch (error) {
      console.error("Error broadcasting to user:", error);
      return 0;
    }
  }

  getConnectionStats() {
    return this.getStats();
  }

  getDetailedConnectionStats() {
    return this.getDetailedStats();
  }
}

module.exports = ConnectionHandler;
