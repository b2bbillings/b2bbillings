const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const http = require("http");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

// Load environment variables
dotenv.config();

// Import production utilities
const logger = require("./src/config/logger");
const {createAuditLog} = require("./src/utils/auditLogger");

// Import routes
const companyRoutes = require("./src/routes/companies");
const itemRoutes = require("./src/routes/items");
const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const partyRoutes = require("./src/routes/partyRoutes");
const paymentRoutes = require("./src/routes/paymentRoutes");
const salesRoutes = require("./src/routes/salesRoutes");
const salesOrderRoutes = require("./src/routes/salesOrderRoutes");
const purchaseRoutes = require("./src/routes/purchaseRoutes");
const purchaseOrderRoutes = require("./src/routes/purchaseOrderRoutes");
const bankAccountRoutes = require("./src/routes/bankAccountRoutes");
const transactionRoutes = require("./src/routes/transactionRoutes");
const chatRoutes = require("./src/routes/chatRoutes");
const staffRoutes = require("./src/routes/staffRoutes");
const taskRoutes = require("./src/routes/taskRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");

// Import Socket.IO Manager
const SocketManager = require("./src/socket/SocketManager");

const app = express();

// Create HTTP server for Socket.IO
const server = http.createServer(app);

// ================================
// 🛡️ PRODUCTION SECURITY MIDDLEWARE
// ================================

// Trust proxy (for load balancers, reverse proxies)
app.set("trust proxy", 1);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Compression middleware
app.use(
  compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  })
);

// Rate limiting
const createRateLimit = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === "development",
    handler: (req, res) => {
      logger.warn("Rate limit exceeded", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        url: req.url,
        method: req.method,
      });
      res.status(429).json({
        success: false,
        message,
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });

// Different rate limits for different endpoints
app.use(
  "/api/auth",
  createRateLimit(15 * 60 * 1000, 5, "Too many authentication attempts")
);
app.use(
  "/api/payments",
  createRateLimit(5 * 60 * 1000, 10, "Payment API limit exceeded")
);
app.use("/api", createRateLimit(15 * 60 * 1000, 100, "API limit exceeded"));

// ================================
// 📊 PRODUCTION MONITORING MIDDLEWARE
// ================================

// Request ID middleware for tracing
app.use((req, res, next) => {
  req.requestId = Math.random().toString(36).substring(2, 15);
  req.startTime = Date.now();
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  // Skip logging for health checks in production
  if (req.url === "/api/health" && process.env.NODE_ENV === "production") {
    return next();
  }

  logger.info("Request started", {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get("User-Agent"),
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - req.startTime;

    logger.info("Request completed", {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
    });

    // Log slow requests
    if (duration > 2000) {
      logger.warn("Slow request detected", {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        duration,
        statusCode: res.statusCode,
      });
    }

    originalEnd.apply(res, args);
  };

  next();
});

// ================================
// 🔧 CORE MIDDLEWARE
// ================================

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",")
      : ["http://localhost:5173", "http://localhost:3000"];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn("CORS blocked request", {origin, allowedOrigins});
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "x-company-id",
    "x-request-id",
    "x-auth-token", // Add this line
    "Cache-Control",
  ],
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(
  express.json({
    limit: process.env.MAX_REQUEST_SIZE || "10mb",
    verify: (req, res, buf) => {
      // Log large requests
      if (buf.length > 1024 * 1024) {
        // 1MB
        logger.warn("Large request received", {
          size: buf.length,
          url: req.url,
          method: req.method,
          ip: req.ip,
        });
      }
    },
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: process.env.MAX_REQUEST_SIZE || "10mb",
  })
);

// Static files with caching
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    maxAge: process.env.NODE_ENV === "production" ? "1d" : "0",
    etag: true,
  })
);

// Initialize Socket.IO
const socketManager = new SocketManager(server);
app.set("socketManager", socketManager);

// ================================
// 🏥 ENHANCED HEALTH CHECK
// ================================

app.get("/api/health", async (req, res) => {
  const startTime = Date.now();

  try {
    // Check database connectivity
    const dbCheck = mongoose.connection.readyState === 1;

    // Check socket manager
    const socketStats = socketManager.getStats();

    // Get system metrics
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "2.0.0",
      environment: process.env.NODE_ENV,
      uptime: Math.floor(process.uptime()),
      responseTime: Date.now() - startTime,
      database: {
        status: dbCheck ? "connected" : "disconnected",
        name: mongoose.connection.name,
        readyState: mongoose.connection.readyState,
      },
      services: {
        api: "operational",
        websocket: socketManager ? "operational" : "disabled",
        chat: "operational",
        notifications: "operational",
        payments: "operational",
      },
      socket: {
        totalConnections: socketStats.totalConnections,
        onlineUsers: socketStats.onlineUsers,
        activeRooms: socketStats.activeRooms,
      },
      system: {
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
      },
    };

    // Log health check in development only
    if (process.env.NODE_ENV === "development") {
      logger.info("Health check performed", healthData);
    }

    res.status(200).json({
      success: true,
      data: healthData,
    });
  } catch (error) {
    logger.error("Health check failed", {
      error: error.message,
      responseTime: Date.now() - startTime,
    });

    res.status(503).json({
      success: false,
      status: "unhealthy",
      message: "Service temporarily unavailable",
      timestamp: new Date().toISOString(),
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Socket.IO status endpoint
app.get("/api/socket/status", (req, res) => {
  try {
    const stats = socketManager.getStats();
    res.json({
      success: true,
      data: {
        ...stats,
        socketIOVersion: require("socket.io/package.json").version,
        serverUptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Socket status check failed", {error: error.message});
    res.status(500).json({
      success: false,
      message: "Failed to get socket status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// ================================
// 🔐 AUTHENTICATION & USER MANAGEMENT
// ================================
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// ================================
// 👥 STAFF & TASK MANAGEMENT
// ================================
app.use("/api/staff", staffRoutes);
app.use("/api/tasks", taskRoutes);

// ================================
// 🔔 NOTIFICATION SYSTEM
// ================================
app.use("/api/notifications", notificationRoutes);

// ================================
// 💬 CHAT SYSTEM
// ================================
app.use("/api/chat", chatRoutes);

// ================================
// 💰 PAYMENT SYSTEM
// ================================
app.use("/api/payments", paymentRoutes);

// ================================
// 🏢 COMPANY MANAGEMENT
// ================================
app.use("/api/companies", companyRoutes);

// ================================
// 🔥 ADMIN ROUTES
// ================================
app.use("/api/admin/sales-orders", salesOrderRoutes);
app.use("/api/admin/purchase-orders", purchaseOrderRoutes);

// ================================
// 🏢 COMPANY-SPECIFIC ROUTES
// ================================
app.use("/api/companies/:companyId/items", itemRoutes);
app.use("/api/companies/:companyId/parties", partyRoutes);
app.use("/api/companies/:companyId/sales", salesRoutes);
app.use("/api/companies/:companyId/sales-orders", salesOrderRoutes);
app.use("/api/companies/:companyId/purchases", purchaseRoutes);
app.use("/api/companies/:companyId/purchase-orders", purchaseOrderRoutes);
app.use("/api/companies/:companyId/bank-accounts", bankAccountRoutes);
app.use("/api/companies/:companyId/transactions", transactionRoutes);
app.use(
  "/api/companies/:companyId/bank-accounts/:bankAccountId/transactions",
  transactionRoutes
);
app.use("/api/companies/:companyId/chat", chatRoutes);
app.use("/api/companies/:companyId/staff", staffRoutes);
app.use("/api/companies/:companyId/tasks", taskRoutes);
app.use("/api/companies/:companyId/notifications", notificationRoutes);

// ================================
// 🔄 LEGACY ROUTES (BACKWARD COMPATIBILITY)
// ================================
app.use("/api/parties", partyRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/sales-orders", salesOrderRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/bank-accounts", bankAccountRoutes);
app.use("/api/transactions", transactionRoutes);

// ================================
// ⚠️ PRODUCTION ERROR HANDLING
// ================================

// Global error handling middleware
app.use(async (err, req, res, next) => {
  // Log error with full context
  logger.error("Global error caught", {
    error: err.message,
    stack: err.stack,
    requestId: req.requestId,
    url: req.url,
    method: req.method,
    body: req.method !== "GET" ? req.body : undefined,
    user: req.user?.id,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });

  // Create audit log for critical errors
  if (req.user?.id && (err.status >= 500 || !err.status)) {
    try {
      await createAuditLog({
        userId: req.user.id,
        action: "SYSTEM_ERROR",
        details: {
          error: err.message,
          url: req.url,
          method: req.method,
          statusCode: err.status || 500,
        },
        severity: "high",
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
    } catch (auditError) {
      logger.error("Failed to create audit log for error", {
        auditError: auditError.message,
      });
    }
  }

  const isDevelopment = process.env.NODE_ENV === "development";

  // Handle specific error types
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
        value: e.value,
      })),
      code: "VALIDATION_ERROR",
      requestId: req.requestId,
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
      field: err.path,
      value: err.value,
      code: "INVALID_ID_FORMAT",
      requestId: req.requestId,
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: "Duplicate entry",
      field: field,
      value: err.keyValue[field],
      code: "DUPLICATE_ENTRY",
      requestId: req.requestId,
    });
  }

  if (err.name === "UnauthorizedError" || err.status === 401) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
      code: "UNAUTHORIZED",
      requestId: req.requestId,
    });
  }

  if (err.status === 403) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
      code: "FORBIDDEN",
      requestId: req.requestId,
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: isDevelopment ? err.message : "Internal Server Error",
    code: err.code || "INTERNAL_ERROR",
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
    ...(isDevelopment && {
      stack: err.stack,
      details: err,
    }),
  });
});

// Enhanced 404 handler
app.use("*", (req, res) => {
  logger.warn("Route not found", {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    code: "ROUTE_NOT_FOUND",
    timestamp: new Date().toISOString(),
    suggestion: "Check the API documentation for available endpoints",
    health: `/api/health`,
  });
});

// ================================
// 🗄️ FIXED DATABASE CONNECTION
// ================================

const connectDatabase = async () => {
  try {
    const MONGODB_URI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/shop-management";

    // ✅ FIXED: Updated options for latest Mongoose version
    const options = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    await mongoose.connect(MONGODB_URI, options);

    logger.info("Database connected successfully", {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      readyState: mongoose.connection.readyState,
      environment: process.env.NODE_ENV,
    });

    // Handle connection events
    mongoose.connection.on("error", (error) => {
      logger.error("Database connection error", {error: error.message});
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("Database disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("Database reconnected");
    });

    // Handle connection timeout
    mongoose.connection.on("timeout", () => {
      logger.warn("Database connection timeout");
    });
  } catch (error) {
    logger.error("Database connection failed", {error: error.message});
    process.exit(1);
  }
};

// ================================
// 🚀 ENHANCED SERVER START
// ================================

const startServer = async () => {
  try {
    // Connect to database first
    await connectDatabase();

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, () => {
      const socketStats = socketManager.getStats();

      logger.info("Server started successfully", {
        port: PORT,
        environment: process.env.NODE_ENV,
        socketConnections: socketStats.totalConnections,
        version: "2.0.0",
      });

      // Console output for development
      if (process.env.NODE_ENV === "development") {
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🚀 Shop Management System (Production Ready)");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(`🌐 Server: http://localhost:${PORT}`);
        console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
        console.log(`📊 Environment: ${process.env.NODE_ENV}`);
        console.log(
          `🔌 Socket.IO: Active (${socketStats.totalConnections} connections)`
        );
        console.log(`💬 Real-time Features: Enabled`);
        console.log(`🛡️ Security: Production Grade`);
        console.log(`📝 Logging: Comprehensive`);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("✅ Ready for Production Deployment!");
      }
    });
  } catch (error) {
    logger.error("Server startup failed", {error: error.message});
    process.exit(1);
  }
};

// ================================
// 🔄 ENHANCED GRACEFUL SHUTDOWN
// ================================

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, initiating graceful shutdown`);

  try {
    // Stop accepting new connections
    server.close(async () => {
      logger.info("HTTP server closed");

      // Shutdown Socket.IO
      if (socketManager && socketManager.shutdown) {
        await socketManager.shutdown();
        logger.info("Socket.IO closed");
      }

      // Close database connection
      await mongoose.connection.close();
      logger.info("Database connection closed");

      logger.info("Graceful shutdown completed");
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error("Forced shutdown due to timeout");
      process.exit(1);
    }, 30000);
  } catch (error) {
    logger.error("Error during graceful shutdown", {error: error.message});
    process.exit(1);
  }
};

// Handle signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Enhanced error handlers
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString(),
  });
  process.exit(1);
});

// Start the server
startServer();

module.exports = app;
