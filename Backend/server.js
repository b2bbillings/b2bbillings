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

// ✅ ENHANCED: Security headers with production-ready CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
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

// ================================
// 🔧 CORS MIDDLEWARE - FIXED VERSION
// ================================

// ✅ FIXED: Define allowed origins based on environment
const getAllowedOrigins = () => {
  if (process.env.NODE_ENV === "production") {
    return process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((url) => url.trim())
      : ["https://b2bbilling.com"]; // ✅ FIXED: Updated to your domain
  } else {
    return [
      "http://localhost:5173", // Vite default
      "http://localhost:3000", // React default
      "http://localhost:5000", // Express default
      "http://localhost:4173", // Vite preview
      "http://127.0.0.1:5173", // Alternative localhost
      "http://127.0.0.1:3000", // Alternative localhost
      "http://127.0.0.1:5000", // Alternative localhost
    ];
  }
};

// ✅ FIXED: Improved CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn("CORS blocked request", {
        origin,
        allowedOrigins,
        timestamp: new Date().toISOString(),
      });
      callback(null, false); // Don't throw error, just deny
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
    "x-client-version",
    "X-Client-Version",
    "x-client-platform",
    "X-Client-Platform",
    "x-auth-token",
    "X-Auth-Token",
    "x-user-id",
    "X-User-ID",
    "Cache-Control",
    "Pragma",
    "Expires",
    "If-Modified-Since",
    "X-HTTP-Method-Override",
  ],
  exposedHeaders: [
    "Content-Length",
    "X-Total-Count",
    "X-Request-ID",
    "X-Response-Time",
    "X-Rate-Limit-Remaining",
    "X-Rate-Limit-Reset",
    "Content-Range",
    "Accept-Ranges",
  ],
  optionsSuccessStatus: 200,
  preflightContinue: false,
  maxAge: 86400, // Cache preflight for 24 hours
};

// ✅ Apply CORS middleware EARLY - before other middleware
app.use(cors(corsOptions));

// ✅ Handle preflight requests explicitly
app.options("*", cors(corsOptions));

// ✅ FIXED: Additional CORS headers middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  // Set CORS headers
  if (!origin || allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Vary", "Origin");
  }

  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD"
  );

  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, " +
      "x-company-id, X-Company-ID, x-request-id, X-Request-ID, " +
      "x-client-version, X-Client-Version, x-client-platform, X-Client-Platform, " +
      "x-auth-token, X-Auth-Token, x-user-id, X-User-ID, Cache-Control, " +
      "Pragma, Expires, If-Modified-Since, X-HTTP-Method-Override"
  );

  res.header(
    "Access-Control-Expose-Headers",
    "Content-Length, X-Total-Count, X-Request-ID, X-Response-Time, " +
      "X-Rate-Limit-Remaining, X-Rate-Limit-Reset, Content-Range, Accept-Ranges"
  );

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    logger.info("CORS preflight request", {
      origin: req.headers.origin,
      method: req.headers["access-control-request-method"],
      headers: req.headers["access-control-request-headers"],
    });
    return res.status(200).end();
  }

  next();
});

// ================================
// 📊 MONITORING MIDDLEWARE
// ================================

// Request ID middleware for tracing
app.use((req, res, next) => {
  req.requestId =
    req.headers["x-request-id"] || Math.random().toString(36).substring(2, 15);
  req.startTime = Date.now();
  res.header("X-Request-ID", req.requestId);
  next();
});

// ✅ ENHANCED: Request logging middleware with better filtering
app.use((req, res, next) => {
  // Skip logging for health checks and frequent polling endpoints
  const skipLogging =
    process.env.NODE_ENV === "production" &&
    (req.url === "/api/health" ||
      req.url === "/api/socket/status" ||
      req.url.includes("/api/notifications/unread-count"));

  if (skipLogging) {
    return next();
  }

  logger.info("Request started", {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get("User-Agent"),
    ip: req.ip,
    origin: req.get("Origin"),
    clientVersion: req.get("X-Client-Version"),
    clientPlatform: req.get("X-Client-Platform"),
    timestamp: new Date().toISOString(),
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - req.startTime;
    res.header("X-Response-Time", `${duration}ms`);

    if (!skipLogging) {
      logger.info("Request completed", {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        origin: req.get("Origin"),
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
    }

    originalEnd.apply(res, args);
  };

  next();
});

// ================================
// 🚦 RATE LIMITING
// ================================

// ✅ ENHANCED: Rate limiting with IPv6 support
const {ipKeyGenerator} = require("express-rate-limit");

const createRateLimit = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max: process.env.NODE_ENV === "production" ? max : max * 5,
    message: {
      success: false,
      message,
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const ip = ipKeyGenerator(req); // ✅ IPv6 compatible
      return ip;
    },
    skip: (req) => {
      // Skip for health checks
      return (
        req.url === "/api/health" && process.env.NODE_ENV === "development"
      );
    },
    handler: (req, res) => {
      logger.warn("Rate limit exceeded", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        url: req.url,
        method: req.method,
        limit: max,
        window: windowMs,
      });
      res.status(429).json({
        success: false,
        message,
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });

// Apply rate limits
app.use(
  "/api/auth",
  createRateLimit(15 * 60 * 1000, 5, "Too many authentication attempts")
);
app.use(
  "/api/payments",
  createRateLimit(5 * 60 * 1000, 10, "Payment API limit exceeded")
);
app.use(
  "/api/notifications",
  createRateLimit(1 * 60 * 1000, 100, "Notification API limit exceeded")
);
app.use("/api", createRateLimit(15 * 60 * 1000, 100, "API limit exceeded"));

// ================================
// 📦 BODY PARSING MIDDLEWARE
// ================================

// Body parsing middleware
app.use(
  express.json({
    limit: process.env.MAX_REQUEST_SIZE || "10mb",
    verify: (req, res, buf) => {
      // Log large requests
      if (buf.length > 1024 * 1024) {
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

// ================================
// 🔌 SOCKET.IO INITIALIZATION
// ================================

// Initialize Socket.IO with error handling
let socketManager;
try {
  socketManager = new SocketManager(server);
  app.set("socketManager", socketManager);
  logger.info("Socket.IO initialized successfully", {
    service: "shop-management-api",
    version: "2.1.0",
  });
} catch (error) {
  logger.error("Failed to initialize Socket.IO", {error: error.message});
  socketManager = null;
}

// ================================
// 🏥 ENHANCED HEALTH CHECK
// ================================

app.get("/api/health", async (req, res) => {
  const startTime = Date.now();

  try {
    // Check database connectivity
    const dbCheck = mongoose.connection.readyState === 1;

    // Check socket manager with error handling
    let socketStats = {totalConnections: 0, onlineUsers: 0, activeRooms: 0};
    if (socketManager) {
      try {
        socketStats = socketManager.getStats();
      } catch (socketError) {
        logger.warn("Socket stats unavailable", {error: socketError.message});
      }
    }

    // Get system metrics
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const healthData = {
      status: dbCheck ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: "2.1.0",
      environment: process.env.NODE_ENV,
      uptime: Math.floor(process.uptime()),
      responseTime: Date.now() - startTime,
      database: {
        status: dbCheck ? "connected" : "disconnected",
        name: mongoose.connection.name || "unknown",
        readyState: mongoose.connection.readyState,
      },
      services: {
        api: "operational",
        websocket: socketManager ? "operational" : "disabled",
        chat: dbCheck ? "operational" : "degraded",
        notifications: dbCheck ? "operational" : "degraded",
        payments: dbCheck ? "operational" : "degraded",
        cors: "enabled",
        ipv6Support: "enabled",
      },
      socket: socketStats,
      system: {
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
          usagePercent: Math.round(
            (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
          ),
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        loadAverage:
          process.platform !== "win32" ? require("os").loadavg() : null,
      },
      cors: {
        status: "enabled",
        allowedOrigins: getAllowedOrigins(),
        ipv6Compatible: true,
      },
    };

    const statusCode = dbCheck ? 200 : 503;
    res.status(statusCode).json({
      success: dbCheck,
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

// ✅ ENHANCED: CORS Test endpoint with detailed info
app.get("/api/cors-test", (req, res) => {
  const origin = req.get("Origin");
  const allowedOrigins = getAllowedOrigins();
  const isAllowed = !origin || allowedOrigins.includes(origin);

  res.json({
    success: true,
    message: "CORS is working correctly",
    data: {
      origin: origin || "No origin header",
      isOriginAllowed: isAllowed,
      allowedOrigins,
      userAgent: req.get("User-Agent"),
      clientVersion: req.get("X-Client-Version"),
      clientPlatform: req.get("X-Client-Platform"),
      requestHeaders: Object.keys(req.headers),
      corsHeaders: {
        "Access-Control-Allow-Origin": res.get("Access-Control-Allow-Origin"),
        "Access-Control-Allow-Credentials": res.get(
          "Access-Control-Allow-Credentials"
        ),
        "Access-Control-Allow-Methods": res.get("Access-Control-Allow-Methods"),
        "Access-Control-Allow-Headers": res.get("Access-Control-Allow-Headers"),
      },
      timestamp: new Date().toISOString(),
    },
  });
});

// Production metrics endpoint (authenticated)
app.get("/api/metrics", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const metricsToken = process.env.METRICS_TOKEN || "dev-metrics-token";

    if (!authHeader || authHeader !== `Bearer ${metricsToken}`) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access to metrics",
      });
    }

    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      database: {
        readyState: mongoose.connection.readyState,
        name: mongoose.connection.name,
      },
      environment: process.env.NODE_ENV,
      version: "2.1.0",
      cors: {
        allowedOrigins: getAllowedOrigins(),
        ipv6Support: true,
      },
    };

    res.json({success: true, data: metrics});
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get metrics",
    });
  }
});

// Socket.IO status endpoint
app.get("/api/socket/status", (req, res) => {
  try {
    if (!socketManager) {
      return res.json({
        success: false,
        message: "Socket.IO not initialized",
        data: {totalConnections: 0, status: "disabled"},
      });
    }

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
// 🛣️ API ROUTES
// ================================

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
// ⚠️ ERROR HANDLING
// ================================

// Global error handling middleware
app.use(async (err, req, res, next) => {
  // ✅ FIXED: Ensure CORS headers are present even for errors
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Vary", "Origin");
  }

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
    origin: req.get("Origin"),
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

  // Handle Mongoose validation errors
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
      timestamp: new Date().toISOString(),
    });
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
      field: err.path,
      value: err.value,
      code: "INVALID_ID_FORMAT",
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `Duplicate entry for ${field}`,
      field: field,
      value: err.keyValue[field],
      code: "DUPLICATE_ENTRY",
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
      code: "INVALID_TOKEN",
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
      code: "TOKEN_EXPIRED",
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle authorization errors
  if (err.name === "UnauthorizedError" || err.status === 401) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
      code: "UNAUTHORIZED",
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }

  if (err.status === 403) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
      code: "FORBIDDEN",
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle CORS errors
  if (err.message.includes("CORS") || err.message.includes("Origin")) {
    return res.status(403).json({
      success: false,
      message: "CORS policy violation",
      code: "CORS_ERROR",
      origin: req.get("Origin"),
      allowedOrigins: getAllowedOrigins(),
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle request size errors
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request entity too large",
      code: "PAYLOAD_TOO_LARGE",
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
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
  // ✅ FIXED: Add CORS headers to 404 responses
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Vary", "Origin");
  }

  logger.warn("Route not found", {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    origin: req.get("Origin"),
  });

  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    code: "ROUTE_NOT_FOUND",
    timestamp: new Date().toISOString(),
    suggestion: "Check the API documentation for available endpoints",
    health: "/api/health",
    corsTest: "/api/cors-test",
  });
});

// ================================
// 🗄️ DATABASE CONNECTION
// ================================

const connectDatabase = async () => {
  const maxRetries = process.env.NODE_ENV === "production" ? 5 : 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const MONGODB_URI = process.env.MONGODB_URI;

      // ✅ FIXED: Updated Atlas-compatible options (removed deprecated options)
      const options = {
        // Connection pool settings
        maxPoolSize: process.env.NODE_ENV === "production" ? 20 : 10,
        minPoolSize: 2,

        // Timeout settings - optimized for Atlas
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 60000,
        connectTimeoutMS: 20000,
        heartbeatFrequencyMS: 10000,

        // Atlas-specific settings
        retryWrites: true,
        w: "majority",
        readPreference: "primary",

        // ✅ UPDATED: Modern compression (zstd is faster than zlib for Atlas)
        compressors: ["zstd", "zlib", "snappy"],

        // ✅ KEPT: Valid Atlas options
        authSource: "admin",
        appName: "Shop-Management-System",

        // ✅ NEW: Modern MongoDB driver options
        family: 4, // Use IPv4, disable IPv6 for better Atlas compatibility
        maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
        waitQueueTimeoutMS: 5000, // Wait 5 seconds for a connection from the pool
      };

      logger.info("Attempting to connect to MongoDB Atlas...", {
        environment: process.env.NODE_ENV,
        retryAttempt: retryCount,
        atlasCluster: MONGODB_URI.includes("mongodb+srv") ? "Yes" : "No",
      });

      await mongoose.connect(MONGODB_URI, options);

      logger.info("✅ Atlas Database connected successfully", {
        service: "shop-management-api",
        version: "2.1.0",
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        readyState: mongoose.connection.readyState,
        environment: process.env.NODE_ENV,
        retryAttempt: retryCount,
        cluster: "MongoDB Atlas",
        connected: true,
      });

      // ✅ ENHANCED: Atlas-specific event handlers
      mongoose.connection.on("error", (error) => {
        logger.error("Atlas connection error", {
          error: error.message,
          code: error.code,
          cluster: "MongoDB Atlas",
        });
      });

      mongoose.connection.on("disconnected", () => {
        logger.warn("Atlas database disconnected", {
          cluster: "MongoDB Atlas",
          willReconnect: process.env.NODE_ENV === "production",
        });

        // ✅ AUTO-RECONNECT: Only in production
        if (process.env.NODE_ENV === "production") {
          setTimeout(() => connectDatabase(), 5000);
        }
      });

      mongoose.connection.on("reconnected", () => {
        logger.info("Atlas database reconnected", {
          cluster: "MongoDB Atlas",
          readyState: mongoose.connection.readyState,
        });
      });

      mongoose.connection.on("timeout", () => {
        logger.warn("Atlas connection timeout", {
          cluster: "MongoDB Atlas",
          timeout: "60 seconds",
        });
      });

      // ✅ Atlas-specific connection events
      mongoose.connection.on("fullsetup", () => {
        logger.info("Atlas replica set fully connected", {
          cluster: "MongoDB Atlas",
        });
      });

      mongoose.connection.on("all", () => {
        logger.info("Atlas all replica set members connected", {
          cluster: "MongoDB Atlas",
        });
      });

      break; // Connection successful
    } catch (error) {
      retryCount++;
      logger.error(`Atlas connection attempt ${retryCount} failed`, {
        error: error.message,
        code: error.code,
        retryCount,
        maxRetries,
        cluster: "MongoDB Atlas",
      });

      // ✅ SPECIFIC: Atlas error handling
      if (error.message.includes("Authentication failed")) {
        logger.error(
          "❌ Atlas Authentication Error - Check credentials in .env",
          {
            error: error.message,
          }
        );
        if (process.env.NODE_ENV === "production") {
          process.exit(1);
        }
      }

      if (
        error.message.includes("Network") ||
        error.message.includes("timeout")
      ) {
        logger.error("❌ Atlas Network Error - Check IP whitelist", {
          error: error.message,
        });
      }

      // ✅ NEW: Handle deprecated option errors
      if (
        error.message.includes("not supported") ||
        error.message.includes("deprecated")
      ) {
        logger.error("❌ Atlas Configuration Error - Deprecated options used", {
          error: error.message,
          suggestion: "Update mongoose connection options",
        });
      }

      if (retryCount >= maxRetries) {
        if (process.env.NODE_ENV === "production") {
          logger.error(
            "Atlas connection failed after maximum retries. Exiting..."
          );
          process.exit(1);
        } else {
          logger.warn(
            "Atlas connection failed. Check your .env file and network connection."
          );
          return;
        }
      }

      // ✅ EXPONENTIAL BACKOFF: Wait longer for Atlas
      const delay = Math.min(2000 * Math.pow(2, retryCount), 60000); // Up to 60 seconds
      logger.info(`Retrying Atlas connection in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// ================================
// 🚀 SERVER START
// ================================

const startServer = async () => {
  try {
    // Connect to database first
    await connectDatabase();

    // ✅ FIXED: Proper port and host configuration for Render
    const PORT = process.env.PORT || 10000;
    const HOST = process.env.HOST || "0.0.0.0";

    // ✅ FIXED: Use server.listen instead of app.listen for Socket.IO compatibility
    const serverInstance = server.listen(PORT, HOST, () => {
      let socketStats = {totalConnections: 0};
      if (socketManager) {
        try {
          socketStats = socketManager.getStats();
        } catch (error) {
          // Ignore socket stats error
        }
      }

      logger.info("🚀 Shop Management System API v2.1.0 - B2B Billing", {
        service: "shop-management-api",
        version: "2.1.0",
        port: PORT,
        host: HOST,
        environment: process.env.NODE_ENV,
        frontend: process.env.FRONTEND_URL || "https://b2bbilling.com",
        socketConnections: socketStats.totalConnections,
        pid: process.pid,
        timestamp: new Date().toISOString(),
        status: "Server started successfully",
      });

      // ✅ FIXED: Development-only console output
      if (process.env.NODE_ENV === "development") {
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🚀 Shop Management System v2.1.0 - B2B Billing");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(`🌐 Server: http://${HOST}:${PORT}`);
        console.log(`🏥 Health: http://${HOST}:${PORT}/api/health`);
        console.log(`🧪 CORS Test: http://${HOST}:${PORT}/api/cors-test`);
        console.log(`📊 Production Domain: https://b2bbilling.com`);
        console.log(`🔌 API Domain: https://api.b2bbilling.com`);
        console.log(`📊 Environment: ${process.env.NODE_ENV}`);
        console.log(
          `🔌 Socket.IO: ${socketManager ? "Active" : "Disabled"} (${
            socketStats.totalConnections
          } connections)`
        );
        console.log(`🌐 CORS: Enabled for b2bbilling.com`);
        console.log(`🔔 Notifications: Ready`);
        console.log(
          `💬 Real-time Features: ${socketManager ? "Enabled" : "Disabled"}`
        );
        console.log(`🛡️ Security: Production Grade`);
        console.log(`📝 Logging: Comprehensive`);
        console.log(`🔒 Rate Limiting: Enabled`);
        console.log(`⚡ Performance: Optimized`);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      }
    });

    // ✅ ENHANCED: Graceful shutdown handlers
    const gracefulShutdown = (signal) => {
      logger.info(`📴 ${signal} received. Starting graceful shutdown...`);

      serverInstance.close(async () => {
        logger.info("🔒 HTTP server closed");

        // Shutdown Socket.IO
        if (socketManager && socketManager.shutdown) {
          try {
            await socketManager.shutdown();
            logger.info("🔌 Socket.IO closed");
          } catch (error) {
            logger.error("Error closing Socket.IO", {error: error.message});
          }
        }

        try {
          await mongoose.connection.close();
          logger.info("🗃️ MongoDB connection closed");
          process.exit(0);
        } catch (error) {
          logger.error("❌ Error during graceful shutdown:", error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error("⏰ Forced shutdown due to timeout");
        process.exit(1);
      }, 30000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Handle server errors
    serverInstance.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        logger.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        logger.error("❌ Server error", {error: error.message});
        process.exit(1);
      }
    });
  } catch (error) {
    logger.error("❌ Server startup failed", {error: error.message});
    process.exit(1);
  }
};

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

// ✅ FIXED: Start the server
startServer();

module.exports = app;
