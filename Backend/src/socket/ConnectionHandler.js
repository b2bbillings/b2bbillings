class ConnectionHandler {
  constructor() {
    this.connections = new Map(); // socketId -> connection info
    this.userConnections = new Map(); // userId -> Set of socketIds
    this.roomConnections = new Map(); // roomId -> Set of socketIds
  }

  // Add a new connection
  addConnection(socket, userId, companyId) {
    const connectionInfo = {
      socketId: socket.id,
      userId,
      companyId,
      connectedAt: new Date(),
      lastActivity: new Date(),
      rooms: new Set(),
    };

    this.connections.set(socket.id, connectionInfo);

    // Track user connections
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId).add(socket.id);

    console.log(`Connection added: ${socket.id} for user ${userId}`);
  }

  // Remove a connection
  removeConnection(socketId) {
    const connectionInfo = this.connections.get(socketId);

    if (connectionInfo) {
      const {userId} = connectionInfo;

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

      console.log(`Connection removed: ${socketId} for user ${userId}`);
    }
  }

  // Join a room
  joinRoom(socketId, roomId) {
    const connectionInfo = this.connections.get(socketId);

    if (connectionInfo) {
      connectionInfo.rooms.add(roomId);

      // Track room connections
      if (!this.roomConnections.has(roomId)) {
        this.roomConnections.set(roomId, new Set());
      }
      this.roomConnections.get(roomId).add(socketId);

      console.log(`Socket ${socketId} joined room ${roomId}`);
    }
  }

  // Leave a room
  leaveRoom(socketId, roomId) {
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

      console.log(`Socket ${socketId} left room ${roomId}`);
    }
  }

  // Update last activity
  updateActivity(socketId) {
    const connectionInfo = this.connections.get(socketId);
    if (connectionInfo) {
      connectionInfo.lastActivity = new Date();
    }
  }

  // Get all connections for a user
  getUserConnections(userId) {
    return Array.from(this.userConnections.get(userId) || []);
  }

  // Get all connections in a room
  getRoomConnections(roomId) {
    return Array.from(this.roomConnections.get(roomId) || []);
  }

  // Check if user is online
  isUserOnline(userId) {
    return (
      this.userConnections.has(userId) &&
      this.userConnections.get(userId).size > 0
    );
  }

  // Get online users count
  getOnlineUsersCount() {
    return this.userConnections.size;
  }

  // Get total connections count
  getTotalConnectionsCount() {
    return this.connections.size;
  }

  // Get connection info
  getConnectionInfo(socketId) {
    return this.connections.get(socketId);
  }

  // Get user info from socket
  getUserFromSocket(socketId) {
    const connectionInfo = this.connections.get(socketId);
    return connectionInfo ? connectionInfo.userId : null;
  }

  // Get company info from socket
  getCompanyFromSocket(socketId) {
    const connectionInfo = this.connections.get(socketId);
    return connectionInfo ? connectionInfo.companyId : null;
  }

  // Get all online users
  getOnlineUsers() {
    return Array.from(this.userConnections.keys());
  }

  // Get active rooms
  getActiveRooms() {
    return Array.from(this.roomConnections.keys());
  }

  // Get connection statistics
  getConnectionStats() {
    return {
      totalConnections: this.connections.size,
      onlineUsers: this.userConnections.size,
      activeRooms: this.roomConnections.size,
      connections: Array.from(this.connections.values()).map((conn) => ({
        socketId: conn.socketId,
        userId: conn.userId,
        companyId: conn.companyId,
        connectedAt: conn.connectedAt,
        lastActivity: conn.lastActivity,
        roomCount: conn.rooms.size,
      })),
    };
  }

  // Clean up inactive connections (optional utility)
  cleanupInactiveConnections(timeoutMinutes = 30) {
    const timeout = new Date(Date.now() - timeoutMinutes * 60 * 1000);
    const inactiveConnections = [];

    this.connections.forEach((connectionInfo, socketId) => {
      if (connectionInfo.lastActivity < timeout) {
        inactiveConnections.push(socketId);
      }
    });

    inactiveConnections.forEach((socketId) => {
      this.removeConnection(socketId);
    });

    if (inactiveConnections.length > 0) {
      console.log(
        `Cleaned up ${inactiveConnections.length} inactive connections`
      );
    }

    return inactiveConnections.length;
  }
}

module.exports = ConnectionHandler;
