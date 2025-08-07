const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const http = require("http");

dotenv.config();

console.log("🚀 Starting Shop Management System API v2.1.0...");

// Environment validation
const requiredEnvVars = [
  "MONGODB_URI",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "NODE_ENV",
];

const missingEnvVars = requiredEnvVars.filter((env) => !process.env[env]);
if (missingEnvVars.length > 0) {
  console.error("❌ Missing required environment variables:", missingEnvVars);
  process.exit(1);
}

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

// Import utilities
let logger, createAuditLog;
try {
  logger = require("./src/config/logger");
  const auditUtils = require("./src/utils/auditLogger");
  createAuditLog = auditUtils.createAuditLog;
} catch (error) {
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
  };
  createAuditLog = () => Promise.resolve();
}

// ✅ ENHANCED: Import routes with better error handling and debugging
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
  "transactionRoutes", // ✅ CRITICAL: This should work now
  "chatRoutes",
  "staffRoutes",
  "taskRoutes",
  "notificationRoutes",
];

console.log("📂 Loading route files...");

routeFiles.forEach((routeFile) => {
  try {
    const routePath = `./src/routes/${routeFile}`;
    console.log(`   🔍 Loading: ${routeFile}`);

    // Check if file exists first
    const fs = require("fs");
    if (!fs.existsSync(path.join(__dirname, `src/routes/${routeFile}.js`))) {
      throw new Error(`Route file does not exist: ${routePath}.js`);
    }

    routes[routeFile] = require(routePath);
    console.log(`   ✅ Loaded: ${routeFile}`);

    // Validate that it's actually a router
    if (
      typeof routes[routeFile] !== "function" &&
      typeof routes[routeFile].stack === "undefined"
    ) {
      console.warn(
        `   ⚠️  Warning: ${routeFile} may not be a valid Express router`
      );
    }
  } catch (error) {
    console.error(`   ❌ Failed to load ${routeFile}:`, error.message);

    // Create fallback router with detailed error info
    routes[routeFile] = express.Router();
    routes[routeFile].all("*", (req, res) => {
      res.status(503).json({
        success: false,
        message: `${routeFile} service temporarily unavailable`,
        error: error.message,
        hint: `Check if Backend/src/routes/${routeFile}.js exists and has valid syntax`,
        timestamp: new Date().toISOString(),
        requestUrl: req.originalUrl,
        method: req.method,
      });
    });
  }
});

console.log(
  `📋 Route loading completed. Loaded: ${Object.keys(routes).length}/${
    routeFiles.length
  } files`
);
console.log(
  `✅ Successfully loaded routes:`,
  Object.keys(routes).filter(
    (key) =>
      routes[key] && (typeof routes[key] === "function" || routes[key].stack)
  )
);

const failedRoutes = routeFiles.filter(
  (routeFile) =>
    !routes[routeFile] ||
    (typeof routes[routeFile] !== "function" && !routes[routeFile].stack)
);
if (failedRoutes.length > 0) {
  console.warn(`⚠️  Failed to load routes:`, failedRoutes);
}

// Import Socket.IO Manager
let SocketManager;
try {
  SocketManager = require("./src/socket/SocketManager");
} catch (error) {
  console.warn("⚠️ Socket.IO Manager not available:", error.message);
  SocketManager = null;
}

const app = express();
const server = http.createServer(app);

// Trust proxy
app.set("trust proxy", 1);

// Security middleware
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
} catch (error) {
  console.warn("⚠️ Helmet security middleware not available:", error.message);
}

// Compression
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
} catch (error) {
  console.warn("⚠️ Compression middleware not available:", error.message);
}

// ✅ ENHANCED: CORS configuration with Vercel support
const getAllowedOrigins = () => {
  if (process.env.NODE_ENV === "production") {
    const envOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((url) => url.trim())
      : [];

    const defaultOrigins = [
      // Production domains
      "https://b2bbilling.com",
      "https://www.b2bbilling.com",
      "https://api.b2bbilling.com",
      "https://b2bbillings.onrender.com",

      // ✅ FIXED: Vercel domains for production
      "https://b2b-billings.vercel.app",
      "https://b2b-billings-git-main-atharva038s-projects.vercel.app",
      "https://b2b-billings-pog2rawfp-atharva038s-projects.vercel.app", // Current deployment
      "https://b2b-billings-git-main.vercel.app",
    ];

    return [...new Set([...envOrigins, ...defaultOrigins])];
  } else {
    return [
      "http://localhost:5173",
      "http://localhost:5000",
      "http://localhost:3000",
      "http://localhost:4173",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5000",
      "http://127.0.0.1:3000",
    ];
  }
};

// ✅ ENHANCED: CORS with dynamic Vercel domain validation
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Check exact matches first
    if (allowedOrigins.includes(origin)) {
      console.log(`✅ CORS allowed (exact match): ${origin}`);
      return callback(null, true);
    }

    // ✅ NEW: Dynamic Vercel preview domain validation
    const vercelPatterns = [
      /^https:\/\/b2b-billings-[a-z0-9-]+-atharva038s-projects\.vercel\.app$/,
      /^https:\/\/b2b-billings-[a-z0-9-]+\.vercel\.app$/,
      /^https:\/\/b2b-billings-git-[a-z0-9-]+-atharva038s-projects\.vercel\.app$/,
    ];

    for (const pattern of vercelPatterns) {
      if (pattern.test(origin)) {
        console.log(`✅ CORS allowed (Vercel pattern): ${origin}`);
        return callback(null, true);
      }
    }

    console.warn(`🚫 CORS blocked origin: ${origin}`);
    console.log(`📋 Allowed origins:`, allowedOrigins.slice(0, 3), "...");

    // In development, be more permissive
    if (process.env.NODE_ENV !== "production") {
      console.log(`⚠️  Development mode: allowing ${origin}`);
      return callback(null, true);
    }

    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "x-auth-token",
    "x-company-id",
    "X-Company-ID",
    "x-request-id",
    "X-Request-ID",
    "x-client-version",
    "X-Client-Version",
    "x-client-platform",
    "X-Client-Platform",
    "Cache-Control",
    "Pragma",
  ],
  exposedHeaders: [
    "X-Request-ID",
    "X-Rate-Limit-Remaining",
    "X-Rate-Limit-Reset",
  ],
  optionsSuccessStatus: 200,
  preflightContinue: false,
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

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
    req.url === "/api/health" ||
    req.url === "/api/socket/status" ||
    req.url === "/debug/routes";

  if (!skipLogging) {
    console.log(
      `📥 ${req.method} ${req.url} - ${req.ip} [${req.requestId}] Origin: ${
        req.get("Origin") || "none"
      }`
    );
  }
  next();
});

// Rate limiting
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
      skip: (req) => {
        // Skip rate limiting for health checks and debug routes
        return (
          req.url.includes("/health") ||
          req.url.includes("/debug") ||
          req.url.includes("/cors-test")
        );
      },
    });

  app.use(
    "/api/auth",
    createRateLimit(15 * 60 * 1000, 10, "Too many authentication attempts") // Increased from 5 to 10
  );
  app.use("/api", createRateLimit(15 * 60 * 1000, 200, "API limit exceeded")); // Increased from 100 to 200
} catch (error) {
  console.warn("⚠️ Rate limiting middleware not available:", error.message);
}

// Body parsing
app.use(express.json({limit: "10mb"}));
app.use(express.urlencoded({extended: true, limit: "10mb"}));

// Static files
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    maxAge: process.env.NODE_ENV === "production" ? "1d" : "0",
  })
);

// Socket.IO initialization
let socketManager = null;
if (SocketManager) {
  try {
    socketManager = new SocketManager(server);
    app.set("socketManager", socketManager);
    console.log("✅ Socket.IO initialized successfully");
  } catch (error) {
    console.error("❌ Socket.IO initialization failed:", error.message);
    socketManager = null;
  }
}

// ✅ NEW: Debug routes endpoint - MUST come before API routes
app.get("/debug/routes", (req, res) => {
  const loadedRoutes = Object.keys(routes);
  const registeredRoutes = [];

  // Get Express router stack
  app._router.stack.forEach((layer) => {
    if (layer.route) {
      registeredRoutes.push({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      });
    } else if (layer.name === "router" && layer.regexp) {
      const path = layer.regexp.source
        .replace("\\/?", "")
        .replace("(?=\\/|$)", "")
        .replace(/\\\//g, "/");
      registeredRoutes.push({
        path: path,
        type: "router",
      });
    }
  });

  res.json({
    success: true,
    message: "Route debugging information",
    timestamp: new Date().toISOString(),
    routeFiles: {
      attempted: routeFiles,
      loaded: loadedRoutes,
      failed: routeFiles.filter((f) => !loadedRoutes.includes(f)),
    },
    expressRoutes: registeredRoutes,
    criticalRoutes: {
      transactionRoutes: {
        fileLoaded: loadedRoutes.includes("transactionRoutes"),
        isRouter:
          routes.transactionRoutes &&
          (typeof routes.transactionRoutes === "function" ||
            routes.transactionRoutes.stack),
        registered: registeredRoutes.some(
          (r) => r.path && r.path.includes("transactions")
        ),
      },
      bankAccountRoutes: {
        fileLoaded: loadedRoutes.includes("bankAccountRoutes"),
        isRouter:
          routes.bankAccountRoutes &&
          (typeof routes.bankAccountRoutes === "function" ||
            routes.bankAccountRoutes.stack),
        registered: registeredRoutes.some(
          (r) => r.path && r.path.includes("bank-accounts")
        ),
      },
    },
    companySpecificRoutes: registeredRoutes.filter(
      (r) => r.path && r.path.includes("companies")
    ),
    environment: process.env.NODE_ENV,
    totalExpressRoutes: registeredRoutes.length,
    cors: {
      allowedOrigins: getAllowedOrigins(),
      requestOrigin: req.get("Origin"),
    },
  });
});

// Health check endpoints
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
      routes: {
        loaded: Object.keys(routes).length,
        total: routeFiles.length,
        critical: {
          transactions: !!routes.transactionRoutes,
          bankAccounts: !!routes.bankAccountRoutes,
        },
      },
      socket: socketStats,
      cors: {
        allowedOrigins: getAllowedOrigins(),
        totalOrigins: getAllowedOrigins().length,
        requestOrigin: req.get("Origin"),
      },
    };

    res.status(dbCheck ? 200 : 503).json({
      success: dbCheck,
      data: healthData,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: "unhealthy",
      message: "Service temporarily unavailable",
      timestamp: new Date().toISOString(),
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// ✅ Enhanced CORS test endpoint
app.get("/api/cors-test", (req, res) => {
  const origin = req.get("Origin");
  const allowedOrigins = getAllowedOrigins();

  // Test Vercel patterns
  const vercelPatterns = [
    /^https:\/\/b2b-billings-[a-z0-9-]+-atharva038s-projects\.vercel\.app$/,
    /^https:\/\/b2b-billings-[a-z0-9-]+\.vercel\.app$/,
    /^https:\/\/b2b-billings-git-[a-z0-9-]+-atharva038s-projects\.vercel\.app$/,
  ];

  const vercelMatches = vercelPatterns.map((pattern) => ({
    pattern: pattern.source,
    matches: origin ? pattern.test(origin) : false,
  }));

  res.json({
    success: true,
    message: "CORS is working correctly",
    origin: origin || "No origin header",
    isAllowed: allowedOrigins.includes(origin),
    allowedOrigins: allowedOrigins,
    vercelPatternTests: vercelMatches,
    allowedHeaders: corsOptions.allowedHeaders,
    methods: corsOptions.methods,
    timestamp: new Date().toISOString(),
    requestHeaders: req.headers,
  });
});

// ✅ Socket.IO status endpoint
app.get("/api/socket/status", (req, res) => {
  let socketStats = {
    enabled: false,
    connected: false,
    totalConnections: 0,
  };

  if (socketManager) {
    try {
      socketStats = {
        enabled: true,
        connected: true,
        ...socketManager.getStats(),
      };
    } catch (error) {
      socketStats = {
        enabled: true,
        connected: false,
        error: error.message,
      };
    }
  }

  res.json({
    success: true,
    socket: socketStats,
    timestamp: new Date().toISOString(),
  });
});

// ✅ ENHANCED: API Routes with validation and error handling
console.log("🌐 Registering API routes...");

// Basic API routes
try {
  app.use("/api/auth", routes.authRoutes);
  console.log("   ✅ /api/auth");
} catch (error) {
  console.error("   ❌ /api/auth failed:", error.message);
}

try {
  app.use("/api/users", routes.userRoutes);
  console.log("   ✅ /api/users");
} catch (error) {
  console.error("   ❌ /api/users failed:", error.message);
}

try {
  app.use("/api/staff", routes.staffRoutes);
  console.log("   ✅ /api/staff");
} catch (error) {
  console.error("   ❌ /api/staff failed:", error.message);
}

try {
  app.use("/api/tasks", routes.taskRoutes);
  console.log("   ✅ /api/tasks");
} catch (error) {
  console.error("   ❌ /api/tasks failed:", error.message);
}

try {
  app.use("/api/notifications", routes.notificationRoutes);
  console.log("   ✅ /api/notifications");
} catch (error) {
  console.error("   ❌ /api/notifications failed:", error.message);
}

try {
  app.use("/api/chat", routes.chatRoutes);
  console.log("   ✅ /api/chat");
} catch (error) {
  console.error("   ❌ /api/chat failed:", error.message);
}

try {
  app.use("/api/payments", routes.paymentRoutes);
  console.log("   ✅ /api/payments");
} catch (error) {
  console.error("   ❌ /api/payments failed:", error.message);
}

try {
  app.use("/api/companies", routes.companies);
  console.log("   ✅ /api/companies");
} catch (error) {
  console.error("   ❌ /api/companies failed:", error.message);
}

try {
  app.use("/api/admin/sales-orders", routes.salesOrderRoutes);
  console.log("   ✅ /api/admin/sales-orders");
} catch (error) {
  console.error("   ❌ /api/admin/sales-orders failed:", error.message);
}

try {
  app.use("/api/admin/purchase-orders", routes.purchaseOrderRoutes);
  console.log("   ✅ /api/admin/purchase-orders");
} catch (error) {
  console.error("   ❌ /api/admin/purchase-orders failed:", error.message);
}

console.log("🏢 Registering company-specific routes...");

// ✅ CRITICAL: Company-specific routes (these are the ones causing 404s)
try {
  app.use("/api/companies/:companyId/items", routes.items);
  console.log("   ✅ /api/companies/:companyId/items");
} catch (error) {
  console.error("   ❌ /api/companies/:companyId/items failed:", error.message);
}

try {
  app.use("/api/companies/:companyId/parties", routes.partyRoutes);
  console.log("   ✅ /api/companies/:companyId/parties");
} catch (error) {
  console.error(
    "   ❌ /api/companies/:companyId/parties failed:",
    error.message
  );
}

try {
  app.use("/api/companies/:companyId/sales", routes.salesRoutes);
  console.log("   ✅ /api/companies/:companyId/sales");
} catch (error) {
  console.error("   ❌ /api/companies/:companyId/sales failed:", error.message);
}

try {
  app.use("/api/companies/:companyId/sales-orders", routes.salesOrderRoutes);
  console.log("   ✅ /api/companies/:companyId/sales-orders");
} catch (error) {
  console.error(
    "   ❌ /api/companies/:companyId/sales-orders failed:",
    error.message
  );
}

try {
  app.use("/api/companies/:companyId/purchases", routes.purchaseRoutes);
  console.log("   ✅ /api/companies/:companyId/purchases");
} catch (error) {
  console.error(
    "   ❌ /api/companies/:companyId/purchases failed:",
    error.message
  );
}

try {
  app.use(
    "/api/companies/:companyId/purchase-orders",
    routes.purchaseOrderRoutes
  );
  console.log("   ✅ /api/companies/:companyId/purchase-orders");
} catch (error) {
  console.error(
    "   ❌ /api/companies/:companyId/purchase-orders failed:",
    error.message
  );
}

// ✅ CRITICAL: These are the routes causing your 404 errors!
try {
  if (routes.bankAccountRoutes) {
    app.use(
      "/api/companies/:companyId/bank-accounts",
      routes.bankAccountRoutes
    );
    console.log(
      "   ✅ /api/companies/:companyId/bank-accounts - CRITICAL ROUTE REGISTERED!"
    );
  } else {
    console.error("   ❌ bankAccountRoutes is not loaded!");
  }
} catch (error) {
  console.error(
    "   ❌ /api/companies/:companyId/bank-accounts failed:",
    error.message
  );
}

try {
  if (routes.transactionRoutes) {
    app.use("/api/companies/:companyId/transactions", routes.transactionRoutes);
    console.log(
      "   ✅ /api/companies/:companyId/transactions - CRITICAL ROUTE REGISTERED!"
    );
  } else {
    console.error("   ❌ transactionRoutes is not loaded!");
  }
} catch (error) {
  console.error(
    "   ❌ /api/companies/:companyId/transactions failed:",
    error.message
  );
}

try {
  app.use("/api/companies/:companyId/chat", routes.chatRoutes);
  console.log("   ✅ /api/companies/:companyId/chat");
} catch (error) {
  console.error("   ❌ /api/companies/:companyId/chat failed:", error.message);
}

try {
  app.use("/api/companies/:companyId/staff", routes.staffRoutes);
  console.log("   ✅ /api/companies/:companyId/staff");
} catch (error) {
  console.error("   ❌ /api/companies/:companyId/staff failed:", error.message);
}

try {
  app.use("/api/companies/:companyId/tasks", routes.taskRoutes);
  console.log("   ✅ /api/companies/:companyId/tasks");
} catch (error) {
  console.error("   ❌ /api/companies/:companyId/tasks failed:", error.message);
}

try {
  app.use("/api/companies/:companyId/notifications", routes.notificationRoutes);
  console.log("   ✅ /api/companies/:companyId/notifications");
} catch (error) {
  console.error(
    "   ❌ /api/companies/:companyId/notifications failed:",
    error.message
  );
}

console.log("🔄 Registering legacy routes...");

// Legacy routes
try {
  app.use("/api/parties", routes.partyRoutes);
  console.log("   ✅ /api/parties (legacy)");
} catch (error) {
  console.error("   ❌ /api/parties (legacy) failed:", error.message);
}

try {
  app.use("/api/sales", routes.salesRoutes);
  console.log("   ✅ /api/sales (legacy)");
} catch (error) {
  console.error("   ❌ /api/sales (legacy) failed:", error.message);
}

try {
  app.use("/api/sales-orders", routes.salesOrderRoutes);
  console.log("   ✅ /api/sales-orders (legacy)");
} catch (error) {
  console.error("   ❌ /api/sales-orders (legacy) failed:", error.message);
}

try {
  app.use("/api/purchases", routes.purchaseRoutes);
  console.log("   ✅ /api/purchases (legacy)");
} catch (error) {
  console.error("   ❌ /api/purchases (legacy) failed:", error.message);
}

try {
  app.use("/api/purchase-orders", routes.purchaseOrderRoutes);
  console.log("   ✅ /api/purchase-orders (legacy)");
} catch (error) {
  console.error("   ❌ /api/purchase-orders (legacy) failed:", error.message);
}

try {
  app.use("/api/bank-accounts", routes.bankAccountRoutes);
  console.log("   ✅ /api/bank-accounts (legacy)");
} catch (error) {
  console.error("   ❌ /api/bank-accounts (legacy) failed:", error.message);
}

try {
  app.use("/api/transactions", routes.transactionRoutes);
  console.log("   ✅ /api/transactions (legacy)");
} catch (error) {
  console.error("   ❌ /api/transactions (legacy) failed:", error.message);
}

console.log("🌐 Route registration completed!");

// ✅ ENHANCED: Error handling middleware
app.use(async (err, req, res, next) => {
  const isDevelopment = process.env.NODE_ENV === "development";

  // Log error details for debugging
  console.error(`❌ Error in ${req.method} ${req.url}:`, err.message);
  if (isDevelopment) {
    console.error("Stack trace:", err.stack);
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      code: "VALIDATION_ERROR",
      details: isDevelopment ? err.errors : undefined,
      requestId: req.requestId,
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
      code: "INVALID_ID_FORMAT",
      path: isDevelopment ? err.path : undefined,
      requestId: req.requestId,
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate entry",
      code: "DUPLICATE_ENTRY",
      field: isDevelopment ? Object.keys(err.keyPattern)[0] : undefined,
      requestId: req.requestId,
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
      code: "INVALID_TOKEN",
      requestId: req.requestId,
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
      code: "TOKEN_EXPIRED",
      requestId: req.requestId,
    });
  }

  // CORS errors
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({
      success: false,
      message: "CORS policy violation",
      code: "CORS_ERROR",
      origin: req.get("Origin"),
      requestId: req.requestId,
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: isDevelopment ? err.message : "Internal Server Error",
    code: err.code || "INTERNAL_ERROR",
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    stack: isDevelopment ? err.stack : undefined,
  });
});

// ✅ ENHANCED: 404 handler with more helpful information
app.use("*", (req, res) => {
  const availableRoutes = [
    "/api/health",
    "/api/cors-test",
    "/api/socket/status",
    "/debug/routes",
    "/api/auth",
    "/api/companies",
    "/api/companies/:companyId/transactions",
    "/api/companies/:companyId/bank-accounts",
  ];

  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    code: "ROUTE_NOT_FOUND",
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    origin: req.get("Origin"),
    availableRoutes: availableRoutes,
    hint: "Use GET /debug/routes to see all registered routes",
    suggestions: [
      "Check if the URL path is correct",
      "Verify the HTTP method (GET, POST, PUT, DELETE)",
      "Ensure proper authentication headers are included",
      "Check if the route requires a companyId parameter",
      "Test CORS with GET /api/cors-test",
    ],
  });
});

// Database connection
const connectDatabase = async () => {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const MONGODB_URI = process.env.MONGODB_URI;

      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 15000,
        retryWrites: true,
        w: "majority",
      };

      await mongoose.connect(MONGODB_URI, options);
      console.log("✅ Database connected successfully");
      console.log(`📊 Database: ${mongoose.connection.name}`);
      console.log(
        `🔗 Host: ${mongoose.connection.host}:${mongoose.connection.port}`
      );
      break;
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

// Server start
const startServer = async () => {
  try {
    await connectDatabase();

    const PORT = process.env.PORT || 5000;
    const HOST = process.env.HOST || "0.0.0.0";

    const serverInstance = server.listen(PORT, HOST, () => {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🚀 Shop Management System API v2.1.0");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🌐 Server: http://" + HOST + ":" + PORT);
      console.log("🏥 Health: http://" + HOST + ":" + PORT + "/api/health");
      console.log(
        "🔍 Debug Routes: http://" + HOST + ":" + PORT + "/debug/routes"
      );
      console.log(
        "🧪 CORS Test: http://" + HOST + ":" + PORT + "/api/cors-test"
      );
      console.log(
        "🔌 Socket Status: http://" + HOST + ":" + PORT + "/api/socket/status"
      );
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📊 Environment: " + process.env.NODE_ENV);
      console.log(
        "🔌 Socket.IO: " + (socketManager ? "✅ Enabled" : "❌ Disabled")
      );
      console.log(
        "🗄️ Database: " +
          (mongoose.connection.readyState === 1
            ? "✅ Connected"
            : "❌ Disconnected")
      );
      console.log("⚡ Process ID: " + process.pid);
      console.log(
        "📂 Routes Loaded: " +
          Object.keys(routes).length +
          "/" +
          routeFiles.length
      );
      console.log(
        "🌍 CORS Origins: " + getAllowedOrigins().length + " configured"
      );
      console.log("🌐 Allowed Origins:");
      getAllowedOrigins().forEach((origin) => console.log("   • " + origin));
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      // ✅ Critical route status
      console.log("🔗 Critical Routes Status:");
      console.log(
        "   • Transaction Routes: " +
          (routes.transactionRoutes ? "✅ Loaded" : "❌ Failed")
      );
      console.log(
        "   • Bank Account Routes: " +
          (routes.bankAccountRoutes ? "✅ Loaded" : "❌ Failed")
      );

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("✅ Server is ready to accept requests!");
      console.log("🌐 CORS configured for Vercel deployments!");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    });

    serverInstance.on("error", (error) => {
      console.error("❌ Server error:", error.message);
      if (error.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use`);
        console.log("💡 Try: killall node  or  lsof -ti:5000 | xargs kill");
      }
      process.exit(1);
    });

    const gracefulShutdown = (signal) => {
      console.log(`\n📴 ${signal} received. Starting graceful shutdown...`);

      serverInstance.close(async () => {
        console.log("🔒 HTTP server closed");

        if (socketManager && socketManager.shutdown) {
          try {
            await socketManager.shutdown();
            console.log("🔌 Socket.IO closed");
          } catch (error) {
            console.error("❌ Error closing Socket.IO:", error.message);
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
    process.exit(1);
  }
};

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error.message);
  console.error("Stack:", error.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

startServer().catch((error) => {
  console.error("❌ Failed to start server:", error.message);
  process.exit(1);
});

module.exports = app;
