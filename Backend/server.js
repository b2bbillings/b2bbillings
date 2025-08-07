const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const http = require("http");

// Load environment variables first
dotenv.config();

// ============================================
// 🔍 STARTUP DEBUGGING & DEPENDENCY CHECKS
// ============================================
console.log("🚀 Starting Shop Management System API v2.1.0...");
console.log("📊 Environment:", process.env.NODE_ENV);
console.log("🔧 Port:", process.env.PORT);
console.log("🗄️ MongoDB URI exists:", !!process.env.MONGODB_URI);
console.log("🔐 JWT Secret exists:", !!process.env.JWT_SECRET);

// Check critical dependencies
console.log("🔍 Checking dependencies...");
try {
  require("helmet");
  require("compression");
  require("express-rate-limit");
  console.log("✅ Security dependencies loaded");
} catch (error) {
  console.log("⚠️ Some security dependencies missing:", error.message);
}

// ===== ENVIRONMENT VALIDATION =====
const requiredEnvVars = [
  "MONGODB_URI",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "NODE_ENV",
];

const missingEnvVars = requiredEnvVars.filter((env) => !process.env[env]);
if (missingEnvVars.length > 0) {
  console.error("❌ Missing required environment variables:", missingEnvVars);
  console.error(
    "💡 Please check your .env file and ensure all required variables are set"
  );
  process.exit(1);
}

// Validate JWT secrets are strong enough for production
if (process.env.NODE_ENV === "production") {
  if (process.env.JWT_SECRET.length < 32) {
    console.error("❌ JWT_SECRET must be at least 32 characters in production");
    process.exit(1);
  }
  if (process.env.JWT_REFRESH_SECRET.length < 32) {
    console.error(
      "❌ JWT_REFRESH_SECRET must be at least 32 characters in production"
    );
    process.exit(1);
  }
}

// Import utilities with error handling
let logger, createAuditLog;
try {
  logger = require("./src/config/logger");
  const auditUtils = require("./src/utils/auditLogger");
  createAuditLog = auditUtils.createAuditLog;
  console.log("✅ Logger and audit utilities loaded");
} catch (error) {
  console.log("⚠️ Logger/audit utilities missing, using console fallback");
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
  };
  createAuditLog = () => Promise.resolve();
}

// Import routes with error handling
console.log("📦 Loading routes...");
let routes = {};
const routeFiles = [
  "companies",
  "items",
  "authRoutes",
  "userRoutes",
  "partyRoutes",
  "paymentRoutes",
  "salesRoutes",
  "salesOrderRoutes",
  "purchaseRoutes",
  "purchaseOrderRoutes",
  "bankAccountRoutes",
  "transactionRoutes",
  "chatRoutes",
  "staffRoutes",
  "taskRoutes",
  "notificationRoutes",
];

routeFiles.forEach((routeFile) => {
  try {
    routes[routeFile] = require(`./src/routes/${routeFile}`);
    console.log(`✅ Loaded ${routeFile}`);
  } catch (error) {
    console.log(`⚠️ Failed to load ${routeFile}:`, error.message);
    // Create a dummy route to prevent crashes
    routes[routeFile] = express.Router();
    routes[routeFile].get("*", (req, res) => {
      res.status(503).json({
        success: false,
        message: `${routeFile} service temporarily unavailable`,
        error: error.message,
      });
    });
  }
});

// Import Socket.IO Manager with error handling
let SocketManager;
try {
  SocketManager = require("./src/socket/SocketManager");
  console.log("✅ Socket.IO Manager loaded");
} catch (error) {
  console.log("⚠️ Socket.IO Manager missing:", error.message);
  SocketManager = null;
}

const app = express();

// Create HTTP server for Socket.IO
const server = http.createServer(app);

// ================================
// 🛡️ PRODUCTION SECURITY MIDDLEWARE
// ================================

// Trust proxy (for load balancers, reverse proxies)
app.set("trust proxy", 1);

// Security middleware with fallbacks
try {
  const helmet = require("helmet");
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:", "ws:", "https:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: {policy: "same-origin"},
    })
  );
  console.log("✅ Helmet security enabled");
} catch (error) {
  console.log("⚠️ Helmet not available, skipping security headers");
}

// Compression middleware
try {
  const compression = require("compression");
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
  console.log("✅ Compression enabled");
} catch (error) {
  console.log("⚠️ Compression not available");
}

// ================================
// 🔧 CORS MIDDLEWARE - UPDATED FOR RENDER & VERCEL
// ================================

const getAllowedOrigins = () => {
  if (process.env.NODE_ENV === "production") {
    // Get origins from environment variable, or use defaults
    const envOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((url) => url.trim())
      : [];

    // Default production origins including Render and Vercel
    const defaultOrigins = [
      "https://b2bbilling.com",
      "https://www.b2bbilling.com",
      "https://api.b2bbilling.com",
      "https://b2bbillings.onrender.com", // Your Render backend URL
      "https://b2bbilling.vercel.app", // Common Vercel pattern
      "https://your-vercel-app.vercel.app", // Replace with your actual Vercel URL
    ];

    // Combine and deduplicate
    const allOrigins = [...new Set([...envOrigins, ...defaultOrigins])];

    console.log("🌐 Allowed CORS origins:", allOrigins);
    return allOrigins;
  } else {
    return [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:5000",
      "http://localhost:4173",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5000",
    ];
  }
};

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      console.log("✅ CORS allowed for:", origin);
      callback(null, true);
    } else {
      console.log("❌ CORS blocked for:", origin);
      console.log("📋 Allowed origins:", allowedOrigins);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "x-company-id",
    "X-Company-ID",
    "x-request-id",
    "X-Request-ID",
  ],
  optionsSuccessStatus: 200,
  preflightContinue: false,
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ================================
// 📊 BASIC MONITORING
// ================================

// Request ID middleware
app.use((req, res, next) => {
  req.requestId =
    req.headers["x-request-id"] || Math.random().toString(36).substring(2, 15);
  req.startTime = Date.now();
  res.header("X-Request-ID", req.requestId);
  next();
});

// Basic request logging
app.use((req, res, next) => {
  const skipLogging =
    req.url === "/api/health" || req.url === "/api/socket/status";

  if (!skipLogging) {
    console.log(`📥 ${req.method} ${req.url} - ${req.ip}`);
  }

  next();
});

// ================================
// 🚦 RATE LIMITING - SIMPLIFIED
// ================================

try {
  const rateLimit = require("express-rate-limit");

  const createRateLimit = (windowMs, max, message) =>
    rateLimit({
      windowMs,
      max: process.env.NODE_ENV === "production" ? max : max * 5,
      message: {
        success: false,
        message,
        code: "RATE_LIMIT_EXCEEDED",
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

  app.use(
    "/api/auth",
    createRateLimit(15 * 60 * 1000, 5, "Too many authentication attempts")
  );
  app.use("/api", createRateLimit(15 * 60 * 1000, 100, "API limit exceeded"));
  console.log("✅ Rate limiting enabled");
} catch (error) {
  console.log("⚠️ Rate limiting not available");
}

// ================================
// 📦 BODY PARSING MIDDLEWARE
// ================================

app.use(express.json({limit: "10mb"}));
app.use(express.urlencoded({extended: true, limit: "10mb"}));

// Static files
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    maxAge: process.env.NODE_ENV === "production" ? "1d" : "0",
  })
);

// ================================
// 🔌 SOCKET.IO INITIALIZATION
// ================================

let socketManager = null;
if (SocketManager) {
  try {
    socketManager = new SocketManager(server);
    app.set("socketManager", socketManager);
    console.log("✅ Socket.IO initialized");
  } catch (error) {
    console.log("⚠️ Socket.IO initialization failed:", error.message);
    socketManager = null;
  }
}

// ================================
// 🏥 HEALTH CHECK ENDPOINTS
// ================================

app.get("/api/health", async (req, res) => {
  const startTime = Date.now();

  try {
    const dbCheck = mongoose.connection.readyState === 1;

    let socketStats = {totalConnections: 0};
    if (socketManager) {
      try {
        socketStats = socketManager.getStats();
      } catch (error) {
        // Ignore socket stats error
      }
    }

    const healthData = {
      status: dbCheck ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: "2.1.0",
      environment: process.env.NODE_ENV,
      uptime: Math.floor(process.uptime()),
      responseTime: Date.now() - startTime,
      database: {
        status: dbCheck ? "connected" : "disconnected",
        readyState: mongoose.connection.readyState,
      },
      services: {
        api: "operational",
        websocket: socketManager ? "operational" : "disabled",
      },
      socket: socketStats,
      cors: {
        allowedOrigins: getAllowedOrigins(),
      },
    };

    res.status(dbCheck ? 200 : 503).json({
      success: dbCheck,
      data: healthData,
    });
  } catch (error) {
    console.error("Health check error:", error.message);
    res.status(503).json({
      success: false,
      status: "unhealthy",
      message: "Service temporarily unavailable",
      timestamp: new Date().toISOString(),
    });
  }
});

app.get("/api/cors-test", (req, res) => {
  const origin = req.get("Origin");
  const allowedOrigins = getAllowedOrigins();

  res.json({
    success: true,
    message: "CORS is working correctly",
    origin: origin || "No origin header",
    isAllowed: allowedOrigins.includes(origin),
    allowedOrigins: allowedOrigins,
    timestamp: new Date().toISOString(),
  });
});

// ================================
// 🛣️ API ROUTES
// ================================

// Authentication & User Management
app.use("/api/auth", routes.authRoutes);
app.use("/api/users", routes.userRoutes);

// Staff & Task Management
app.use("/api/staff", routes.staffRoutes);
app.use("/api/tasks", routes.taskRoutes);

// Notification System
app.use("/api/notifications", routes.notificationRoutes);

// Chat System
app.use("/api/chat", routes.chatRoutes);

// Payment System
app.use("/api/payments", routes.paymentRoutes);

// Company Management
app.use("/api/companies", routes.companies);

// Admin Routes
app.use("/api/admin/sales-orders", routes.salesOrderRoutes);
app.use("/api/admin/purchase-orders", routes.purchaseOrderRoutes);

// Company-specific Routes
app.use("/api/companies/:companyId/items", routes.items);
app.use("/api/companies/:companyId/parties", routes.partyRoutes);
app.use("/api/companies/:companyId/sales", routes.salesRoutes);
app.use("/api/companies/:companyId/sales-orders", routes.salesOrderRoutes);
app.use("/api/companies/:companyId/purchases", routes.purchaseRoutes);
app.use(
  "/api/companies/:companyId/purchase-orders",
  routes.purchaseOrderRoutes
);
app.use("/api/companies/:companyId/bank-accounts", routes.bankAccountRoutes);
app.use("/api/companies/:companyId/transactions", routes.transactionRoutes);
app.use("/api/companies/:companyId/chat", routes.chatRoutes);
app.use("/api/companies/:companyId/staff", routes.staffRoutes);
app.use("/api/companies/:companyId/tasks", routes.taskRoutes);
app.use("/api/companies/:companyId/notifications", routes.notificationRoutes);

// Legacy Routes
app.use("/api/parties", routes.partyRoutes);
app.use("/api/sales", routes.salesRoutes);
app.use("/api/sales-orders", routes.salesOrderRoutes);
app.use("/api/purchases", routes.purchaseRoutes);
app.use("/api/purchase-orders", routes.purchaseOrderRoutes);
app.use("/api/bank-accounts", routes.bankAccountRoutes);
app.use("/api/transactions", routes.transactionRoutes);

// ================================
// ⚠️ ERROR HANDLING
// ================================

// Global error handler
app.use(async (err, req, res, next) => {
  console.error("Global error:", err.message);

  const isDevelopment = process.env.NODE_ENV === "development";

  // Handle common errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      code: "VALIDATION_ERROR",
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
      code: "INVALID_ID_FORMAT",
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate entry",
      code: "DUPLICATE_ENTRY",
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: isDevelopment ? err.message : "Internal Server Error",
    code: err.code || "INTERNAL_ERROR",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    code: "ROUTE_NOT_FOUND",
    timestamp: new Date().toISOString(),
  });
});

// ================================
// 🗄️ DATABASE CONNECTION
// ================================

const connectDatabase = async () => {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const MONGODB_URI = process.env.MONGODB_URI;
      console.log(
        `🔗 Attempting database connection (attempt ${
          retryCount + 1
        }/${maxRetries})...`
      );

      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 15000,
      };

      await mongoose.connect(MONGODB_URI, options);

      console.log("✅ Database connected successfully");
      console.log("📊 Database name:", mongoose.connection.name);
      console.log("🏠 Database host:", mongoose.connection.host);

      // Database event handlers
      mongoose.connection.on("error", (error) => {
        console.error("Database error:", error.message);
      });

      mongoose.connection.on("disconnected", () => {
        console.warn("Database disconnected");
      });

      break; // Connection successful
    } catch (error) {
      retryCount++;
      console.error(
        `❌ Database connection attempt ${retryCount} failed:`,
        error.message
      );

      if (retryCount >= maxRetries) {
        console.error("❌ Database connection failed after maximum retries");
        if (process.env.NODE_ENV === "production") {
          process.exit(1);
        } else {
          console.warn("⚠️ Continuing without database in development mode");
          return;
        }
      }

      const delay = 2000 * retryCount;
      console.log(`⏳ Retrying database connection in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// ================================
// 🚀 SERVER START
// ================================

const startServer = async () => {
  console.log("🚀 Starting server initialization...");

  try {
    // Connect to database first
    console.log("📡 Connecting to database...");
    await connectDatabase();

    // Get port and host
    const PORT = process.env.PORT || 3000;
    const HOST = process.env.HOST || "0.0.0.0";

    console.log(`🔧 Starting server on ${HOST}:${PORT}...`);

    // Start the server
    const serverInstance = server.listen(PORT, HOST, () => {
      console.log("");
      console.log("🎉 SERVER SUCCESSFULLY STARTED! 🎉");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🚀 Shop Management System API v2.1.0 - B2B Billing");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`🌐 Server: http://${HOST}:${PORT}`);
      console.log(`🏥 Health: http://${HOST}:${PORT}/api/health`);
      console.log(`🧪 CORS Test: http://${HOST}:${PORT}/api/cors-test`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔌 Socket.IO: ${socketManager ? "Enabled" : "Disabled"}`);
      console.log(
        `🗄️ Database: ${
          mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
        }`
      );
      console.log(`⚡ Process ID: ${process.pid}`);
      console.log(`🌍 CORS Origins: ${getAllowedOrigins().length} configured`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("✅ Server is ready to accept requests!");
      console.log("");

      // Log with structured logging if available
      if (logger && typeof logger.info === "function") {
        logger.info("🚀 Shop Management System API v2.1.0 - B2B Billing", {
          service: "shop-management-api",
          version: "2.1.0",
          port: PORT,
          host: HOST,
          environment: process.env.NODE_ENV,
          pid: process.pid,
          timestamp: new Date().toISOString(),
          status: "Server started successfully",
        });
      }
    });

    // Server error handling
    serverInstance.on("error", (error) => {
      console.error("❌ Server error:", error.message);
      if (error.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use`);
        console.error(
          "💡 Try using a different port or kill the process using this port"
        );
      }
      process.exit(1);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n📴 ${signal} received. Starting graceful shutdown...`);

      serverInstance.close(async () => {
        console.log("🔒 HTTP server closed");

        if (socketManager && socketManager.shutdown) {
          try {
            await socketManager.shutdown();
            console.log("🔌 Socket.IO closed");
          } catch (error) {
            console.error("Error closing Socket.IO:", error.message);
          }
        }

        try {
          await mongoose.connection.close();
          console.log("🗃️ MongoDB connection closed");
          console.log("👋 Goodbye!");
          process.exit(0);
        } catch (error) {
          console.error("❌ Error during graceful shutdown:", error.message);
          process.exit(1);
        }
      });

      setTimeout(() => {
        console.error("⏰ Forced shutdown due to timeout");
        process.exit(1);
      }, 30000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("❌ Server startup failed:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
};

// Process error handlers
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error.message);
  console.error("Stack:", error.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection:", reason);
  process.exit(1);
});

// Start the server
startServer().catch((error) => {
  console.error("❌ Failed to start server:", error.message);
  process.exit(1);
});

module.exports = app;
