const mongoose = require("mongoose");

class AtlasHealthChecker {
  static async getDetailedStatus() {
    try {
      const connection = mongoose.connection;

      if (connection.readyState !== 1) {
        return {
          status: "disconnected",
          readyState: connection.readyState,
          error: "Database not connected",
        };
      }

      // Get database stats
      const admin = connection.db.admin();
      const [serverStatus, dbStats, listCollections] = await Promise.all([
        admin.command({serverStatus: 1}).catch(() => null),
        admin.command({dbStats: 1}).catch(() => null),
        connection.db
          .listCollections()
          .toArray()
          .catch(() => []),
      ]);

      return {
        status: "connected",
        readyState: connection.readyState,
        database: {
          name: connection.name,
          host: connection.host,
          collections: listCollections.length,
          dataSize: dbStats ? Math.round(dbStats.dataSize / (1024 * 1024)) : 0, // MB
          indexSize: dbStats
            ? Math.round(dbStats.indexSize / (1024 * 1024))
            : 0, // MB
        },
        server: {
          version: serverStatus?.version || "unknown",
          uptime: serverStatus?.uptime || 0,
          connections: serverStatus?.connections || {},
        },
        atlas: {
          isAtlas: process.env.MONGODB_URI?.includes("mongodb+srv://") || false,
          cluster: this.extractClusterName(),
        },
      };
    } catch (error) {
      return {
        status: "error",
        error: error.message,
        readyState: mongoose.connection.readyState,
      };
    }
  }

  static extractClusterName() {
    if (!process.env.MONGODB_URI) return null;

    const match = process.env.MONGODB_URI.match(
      /mongodb\+srv:\/\/[^@]+@([^.]+)/
    );
    return match ? match[1] : null;
  }

  static async testConnection() {
    try {
      // Simple ping test
      const admin = mongoose.connection.db.admin();
      const result = await admin.ping();

      return {
        success: true,
        pingTime: Date.now(),
        result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = AtlasHealthChecker;
