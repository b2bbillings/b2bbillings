const express = require("express");
const {body, param, validationResult} = require("express-validator");
const rateLimit = require("express-rate-limit");

// ✅ FIXED: Import the ipKeyGenerator helper for IPv6 support
const {ipKeyGenerator} = require("express-rate-limit");

// ✅ UPDATED: Import controllers with admin functions
const {
  signup,
  login,
  logout,
  verifyToken,
  refreshToken,
  checkAdminStatus, // ✅ NEW: Admin status check
  requireAdmin, // ✅ NEW: Admin middleware
  isUserAdmin, // ✅ NEW: Admin helper function
} = require("../controllers/authController");

// Import middleware
const {authenticate} = require("../middleware/authMiddleware");

// Import utilities
const logger = require("../config/logger");

const router = express.Router();

// ================================
// 🛡️ PRODUCTION-READY RATE LIMITING (IPv6 COMPATIBLE)
// ================================

// ✅ FIXED: IPv6-compatible keyGenerator helper
const createKeyGenerator = (prefix) => {
  return (req) => {
    const ip = ipKeyGenerator(req); // ✅ FIXED: Use IPv6-compatible helper
    const email = req.body?.email || "anonymous";
    return `${prefix}_${ip}_${email}`;
  };
};

// ✅ FIXED: IPv6-compatible simple keyGenerator
const createSimpleKeyGenerator = (prefix) => {
  return (req) => {
    const ip = ipKeyGenerator(req); // ✅ FIXED: Use IPv6-compatible helper
    return `${prefix}_${ip}`;
  };
};

// ✅ FIXED: IPv6-compatible user-based keyGenerator
const createUserKeyGenerator = (prefix) => {
  return (req) => {
    const ip = ipKeyGenerator(req); // ✅ FIXED: Use IPv6-compatible helper
    const userId = req.user?.id || "anonymous";
    return `${prefix}_${ip}_${userId}`;
  };
};

// ✅ PRODUCTION: Strict authentication rate limiting (IPv6 FIXED)
const productionAuthLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Maximum 10 failed attempts per 15 minutes per IP/email combo
  skipSuccessfulRequests: true, // Don't count successful logins
  skipFailedRequests: false, // Count failed attempts
  keyGenerator: createKeyGenerator("auth"), // ✅ FIXED: IPv6-compatible
  message: {
    success: false,
    message:
      "Too many failed authentication attempts. Please wait 15 minutes before trying again.",
    code: "RATE_LIMIT_EXCEEDED",
    retryAfter: 900,
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.error("Production rate limit exceeded", {
      ip: req.ip,
      email: req.body?.email,
      userAgent: req.get("User-Agent"),
      route: req.originalUrl,
      severity: "high",
      timestamp: new Date().toISOString(),
    });

    res.status(429).json({
      success: false,
      message:
        "Too many failed authentication attempts. Please wait 15 minutes before trying again.",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: 900,
      timestamp: new Date().toISOString(),
    });
  },
});

// ✅ DEVELOPMENT: More lenient rate limiting for testing (IPv6 FIXED)
const developmentAuthLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 25, // Higher limit for development
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
  keyGenerator: createKeyGenerator("dev_auth"), // ✅ FIXED: IPv6-compatible
  message: {
    success: false,
    message:
      "Development rate limit: Too many failed attempts. Please wait 5 minutes.",
    code: "DEV_RATE_LIMIT_EXCEEDED",
    retryAfter: 300,
    environment: "development",
    timestamp: new Date().toISOString(),
  },
  handler: (req, res) => {
    logger.warn("Development rate limit exceeded", {
      ip: req.ip,
      email: req.body?.email,
      userAgent: req.get("User-Agent"),
      route: req.originalUrl,
      note: "Development environment - rate limiting active",
    });

    res.status(429).json({
      success: false,
      message:
        "Development rate limit: Too many failed attempts. Please wait 5 minutes.",
      code: "DEV_RATE_LIMIT_EXCEEDED",
      retryAfter: 300,
      environment: "development",
      timestamp: new Date().toISOString(),
    });
  },
});

// ✅ GENERAL: For non-critical endpoints (IPv6 FIXED)
const generalLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: process.env.NODE_ENV === "production" ? 100 : 200, // Requests per window
  skipSuccessfulRequests: true,
  keyGenerator: createSimpleKeyGenerator("general"), // ✅ FIXED: IPv6-compatible
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
    code: "GENERAL_RATE_LIMIT_EXCEEDED",
    retryAfter: 60,
    timestamp: new Date().toISOString(),
  },
  handler: (req, res) => {
    logger.info("General rate limit exceeded", {
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
      userAgent: req.get("User-Agent"),
    });

    res.status(429).json({
      success: false,
      message: "Too many requests. Please slow down.",
      code: "GENERAL_RATE_LIMIT_EXCEEDED",
      retryAfter: 60,
      timestamp: new Date().toISOString(),
    });
  },
});

// ✅ ADMIN: Stricter rate limiting for admin endpoints (IPv6 FIXED)
const adminLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 50 : 100, // Admin operations limit
  skipSuccessfulRequests: true,
  keyGenerator: createUserKeyGenerator("admin"), // ✅ FIXED: IPv6-compatible
  message: {
    success: false,
    message: "Too many admin requests. Please wait before trying again.",
    code: "ADMIN_RATE_LIMIT_EXCEEDED",
    retryAfter: 900,
    timestamp: new Date().toISOString(),
  },
  handler: (req, res) => {
    logger.warn("Admin rate limit exceeded", {
      ip: req.ip,
      userId: req.user?.id,
      route: req.originalUrl,
      severity: "medium",
    });

    res.status(429).json({
      success: false,
      message: "Too many admin requests. Please wait before trying again.",
      code: "ADMIN_RATE_LIMIT_EXCEEDED",
      retryAfter: 900,
      timestamp: new Date().toISOString(),
    });
  },
});

// ✅ ENVIRONMENT-AWARE: Choose appropriate rate limiting
const smartAuthLimit =
  process.env.NODE_ENV === "production"
    ? productionAuthLimit
    : developmentAuthLimit;

// ================================
// 🔍 VALIDATION HELPERS
// ================================

const handleValidationErrors = (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Request validation failed", {
        url: req.originalUrl,
        method: req.method,
        errors: errors.array(),
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return res.status(400).json({
        success: false,
        message: "Request validation failed",
        code: "VALIDATION_ERROR",
        errors: errors.array(),
        timestamp: new Date().toISOString(),
      });
    }
    next();
  } catch (error) {
    logger.error("Validation middleware error", {
      error: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });

    res.status(500).json({
      success: false,
      message: "Internal validation error",
      code: "VALIDATION_MIDDLEWARE_ERROR",
      timestamp: new Date().toISOString(),
    });
  }
};

// ✅ ENHANCED: Audit logging function
const createAuthAuditLog = async (req, action, details = {}) => {
  try {
    const auditData = {
      userId: req.user?.id || null,
      action,
      details: {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
        route: req.originalUrl,
        method: req.method,
        environment: process.env.NODE_ENV,
        ...details,
      },
      severity: details.severity || "medium",
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    };

    logger.info(`Auth audit: ${action}`, auditData);

    // In production, you might want to store audit logs in a separate collection
    if (
      process.env.NODE_ENV === "production" &&
      process.env.AUDIT_DB_ENABLED === "true"
    ) {
      // Example: await AuditLog.create(auditData);
    }
  } catch (error) {
    logger.error("Failed to create auth audit log", {
      error: error.message,
      action,
      ip: req.ip,
      userId: req.user?.id,
    });
  }
};

// ================================
// 🔍 PRODUCTION VALIDATION RULES
// ================================

const signupValidation = [
  body("name")
    .trim()
    .isLength({min: 2, max: 100})
    .withMessage("Name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage(
      "Name can only contain letters, spaces, apostrophes, and hyphens"
    )
    .escape(),

  body("email")
    .isEmail()
    .normalizeEmail({
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      outlookdotcom_remove_subaddresses: false,
    })
    .withMessage("Please provide a valid email address")
    .isLength({max: 254})
    .withMessage("Email address is too long")
    .custom(async (value) => {
      if (process.env.NODE_ENV === "production") {
        const disposableDomains = [
          "tempmail.org",
          "10minutemail.com",
          "guerrillamail.com",
        ];
        const domain = value.split("@")[1];
        if (disposableDomains.includes(domain)) {
          throw new Error("Disposable email addresses are not allowed");
        }
      }
      return true;
    }),

  body("password")
    .isLength({min: process.env.NODE_ENV === "production" ? 8 : 6, max: 128})
    .withMessage(
      process.env.NODE_ENV === "production"
        ? "Password must be between 8 and 128 characters"
        : "Password must be between 6 and 128 characters"
    )
    .custom((value) => {
      if (process.env.NODE_ENV === "production") {
        if (
          !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(
            value
          )
        ) {
          throw new Error(
            "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
          );
        }
      }
      return true;
    }),

  body("phone")
    .matches(/^[6-9]\d{9}$/)
    .withMessage(
      "Phone number must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9"
    ),

  body("companyName")
    .optional()
    .trim()
    .isLength({max: 100})
    .withMessage("Company name cannot exceed 100 characters")
    .escape(),

  // ✅ FIXED: Make GST number completely optional
  body("gstNumber")
    .optional({nullable: true, checkFalsy: true})
    .trim()
    .custom((value) => {
      if (value && value.length > 0) {
        const gstRegex =
          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstRegex.test(value.toUpperCase())) {
          throw new Error("Invalid GST number format");
        }
      }
      return true;
    }),

  // ✅ REMOVED: Terms acceptance validation completely
  // No validation for termsAccepted field since you don't have terms & conditions yet
];

const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail({
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      outlookdotcom_remove_subaddress: false,
    })
    .withMessage("Please provide a valid email address")
    .isLength({max: 254})
    .withMessage("Email address is too long"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({min: 1, max: 128})
    .withMessage("Invalid password length"),

  body("rememberMe")
    .optional()
    .isBoolean()
    .withMessage("Remember me must be a boolean value"),
];

const emailValidation = [
  param("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address")
    .isLength({max: 254})
    .withMessage("Email address is too long"),
];

const refreshTokenValidation = [
  body("refreshToken")
    .notEmpty()
    .withMessage("Refresh token is required")
    .isLength({min: 10})
    .withMessage("Invalid refresh token format"),
];

// ================================
// 📊 REQUEST LOGGING MIDDLEWARE
// ================================

const logAuthRequest = (action) => {
  return (req, res, next) => {
    const startTime = Date.now();
    req.startTime = startTime;
    req.authAction = action;

    const requestId =
      req.headers["x-request-id"] ||
      Math.random().toString(36).substring(2, 15);
    req.requestId = requestId;

    logger.info(`Auth ${action} started`, {
      action,
      requestId,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      route: req.originalUrl,
      method: req.method,
    });

    // Enhanced response logging
    const originalEnd = res.end;
    res.end = function (...args) {
      const duration = Date.now() - startTime;
      const success = res.statusCode < 400;

      const logData = {
        action,
        requestId,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        success,
        environment: process.env.NODE_ENV,
        route: req.originalUrl,
        method: req.method,
      };

      if (success) {
        logger.info(`Auth ${action} completed successfully`, logData);
      } else {
        logger.warn(`Auth ${action} failed`, logData);
      }

      originalEnd.apply(res, args);
    };

    next();
  };
};

// ================================
// 🛡️ SECURITY HEADERS MIDDLEWARE
// ================================

const setSecurityHeaders = (req, res, next) => {
  // Production-ready security headers
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  });

  // Add HSTS header only in production
  if (process.env.NODE_ENV === "production") {
    res.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  next();
};

// ================================
// 📝 PUBLIC ROUTES
// ================================

// @desc    User registration
// @route   POST /api/auth/signup
// @access  Public
router.post(
  "/signup",
  smartAuthLimit,
  setSecurityHeaders,
  logAuthRequest("SIGNUP"),
  signupValidation,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      await signup(req, res);
    } catch (error) {
      logger.error("Signup route error", {
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        ip: req.ip,
        body: {...req.body, password: "[REDACTED]"},
        requestId: req.requestId,
      });

      await createAuthAuditLog(req, "SIGNUP_ERROR", {
        error: error.message,
        severity: "high",
      });

      next(error);
    }
  }
);

// @desc    User login
// @route   POST /api/auth/login
// @access  Public
router.post(
  "/login",
  smartAuthLimit,
  setSecurityHeaders,
  logAuthRequest("LOGIN"),
  loginValidation,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      await login(req, res);
    } catch (error) {
      logger.error("Login route error", {
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        ip: req.ip,
        email: req.body?.email,
        requestId: req.requestId,
      });

      await createAuthAuditLog(req, "LOGIN_ERROR", {
        error: error.message,
        email: req.body?.email,
        severity: "high",
      });

      next(error);
    }
  }
);

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
router.post(
  "/refresh",
  generalLimit,
  setSecurityHeaders,
  logAuthRequest("REFRESH_TOKEN"),
  refreshTokenValidation,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      await refreshToken(req, res);
    } catch (error) {
      logger.error("Token refresh route error", {
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        ip: req.ip,
        requestId: req.requestId,
      });

      await createAuthAuditLog(req, "REFRESH_TOKEN_ERROR", {
        error: error.message,
        severity: "medium",
      });

      next(error);
    }
  }
);

// ================================
// 🔒 PROTECTED ROUTES
// ================================

// @desc    Verify JWT token
// @route   GET /api/auth/verify
// @access  Private
router.get(
  "/verify",
  generalLimit,
  setSecurityHeaders,
  authenticate,
  logAuthRequest("VERIFY_TOKEN"),
  async (req, res, next) => {
    try {
      await verifyToken(req, res);
    } catch (error) {
      logger.error("Token verification route error", {
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        userId: req.user?.id,
        ip: req.ip,
        requestId: req.requestId,
      });

      await createAuthAuditLog(req, "VERIFY_TOKEN_ERROR", {
        error: error.message,
        userId: req.user?.id,
        severity: "medium",
      });

      next(error);
    }
  }
);

// @desc    User logout
// @route   POST /api/auth/logout
// @access  Private
router.post(
  "/logout",
  generalLimit,
  setSecurityHeaders,
  authenticate,
  logAuthRequest("LOGOUT"),
  async (req, res, next) => {
    try {
      await logout(req, res);
    } catch (error) {
      logger.error("Logout route error", {
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        userId: req.user?.id,
        ip: req.ip,
        requestId: req.requestId,
      });

      await createAuthAuditLog(req, "LOGOUT_ERROR", {
        error: error.message,
        userId: req.user?.id,
        severity: "low",
      });

      next(error);
    }
  }
);

// ✅ NEW: Check admin status endpoint
// @desc    Check if user has admin privileges
// @route   GET /api/auth/check-admin
// @access  Private
router.get(
  "/check-admin",
  adminLimit,
  setSecurityHeaders,
  authenticate,
  logAuthRequest("CHECK_ADMIN_STATUS"),
  async (req, res, next) => {
    try {
      await checkAdminStatus(req, res);
    } catch (error) {
      logger.error("Admin status check route error", {
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        userId: req.user?.id,
        ip: req.ip,
        requestId: req.requestId,
      });

      await createAuthAuditLog(req, "CHECK_ADMIN_ERROR", {
        error: error.message,
        userId: req.user?.id,
        severity: "medium",
      });

      next(error);
    }
  }
);

// ================================
// 🔧 UTILITY ROUTES
// ================================

// @desc    Check if email exists
// @route   GET /api/auth/check-email/:email
// @access  Public
router.get(
  "/check-email/:email",
  generalLimit,
  setSecurityHeaders,
  logAuthRequest("CHECK_EMAIL"),
  emailValidation,
  handleValidationErrors,
  async (req, res) => {
    const startTime = Date.now();
    const clientIp = req.ip || req.connection.remoteAddress;

    try {
      const {email} = req.params;

      let User;
      try {
        User = require("../models/User");
      } catch (modelError) {
        logger.warn("User model not found for email check", {
          error: modelError.message,
          email: email.toLowerCase(),
          ip: clientIp,
        });

        return res.status(503).json({
          success: false,
          message: "Service temporarily unavailable",
          code: "SERVICE_UNAVAILABLE",
          timestamp: new Date().toISOString(),
        });
      }

      logger.info("Email existence check started", {
        email: email.toLowerCase(),
        ip: clientIp,
        requestId: req.requestId,
      });

      const existingUser = await User.findOne({
        email: email.toLowerCase(),
      })
        .select("_id")
        .lean();

      await createAuthAuditLog(req, "EMAIL_EXISTENCE_CHECK", {
        email: email.toLowerCase(),
        exists: !!existingUser,
        severity: "low",
      });

      logger.info("Email existence check completed", {
        email: email.toLowerCase(),
        exists: !!existingUser,
        responseTime: Date.now() - startTime,
        ip: clientIp,
        requestId: req.requestId,
      });

      res.status(200).json({
        success: true,
        data: {
          exists: !!existingUser,
          email: email.toLowerCase(),
        },
        metadata: {
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          requestId: req.requestId,
        },
      });
    } catch (error) {
      logger.error("Email check route error", {
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        email: req.params.email,
        ip: clientIp,
        responseTime: Date.now() - startTime,
        requestId: req.requestId,
      });

      await createAuthAuditLog(req, "EMAIL_CHECK_ERROR", {
        error: error.message,
        email: req.params.email,
        severity: "low",
      });

      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }
);

// @desc    Health check for auth service
// @route   GET /api/auth/health
// @access  Public
router.get("/health", (req, res) => {
  const healthData = {
    success: true,
    status: "healthy",
    message: "Authentication service is operational",
    timestamp: new Date().toISOString(),
    data: {
      service: "Authentication",
      version: "3.0.0",
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || "development",
      rateLimiting: {
        status: "active",
        ipv6Support: "enabled", // ✅ NEW: IPv6 support flag
        environment: process.env.NODE_ENV || "development",
        authLimits:
          process.env.NODE_ENV === "production"
            ? "10 failed attempts per 15 minutes"
            : "25 failed attempts per 5 minutes",
        generalLimits:
          process.env.NODE_ENV === "production"
            ? "100 requests per minute"
            : "200 requests per minute",
        adminLimits:
          process.env.NODE_ENV === "production"
            ? "50 requests per 15 minutes"
            : "100 requests per 15 minutes",
      },
      features: {
        registration: "enabled",
        login: "enabled",
        tokenRefresh: "enabled",
        tokenVerification: "enabled",
        passwordReset: "enabled",
        emailVerification: "enabled",
        rateLimiting: "enabled",
        auditLogging: "enabled",
        adminChecking: "enabled",
        securityHeaders: "enabled",
        environmentAware: "enabled",
        ipv6Compatible: "enabled", // ✅ NEW: IPv6 compatibility
      },
      security: {
        headers: "enhanced",
        validation: "strict",
        rateLimit: "environment-aware",
        auditLog: "comprehensive",
        adminProtection: "active",
        ipv6Support: "enabled", // ✅ NEW: IPv6 support
      },
    },
  };

  // Log health checks in development only
  if (process.env.NODE_ENV === "development") {
    logger.info("Auth service health check", {
      ...healthData,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
  }

  res.status(200).json(healthData);
});

// ================================
// 👨‍💼 ADMIN ROUTES
// ================================

// @desc    Get authentication statistics (Admin only)
// @route   GET /api/auth/stats
// @access  Private (Admin)
router.get(
  "/stats",
  adminLimit,
  setSecurityHeaders,
  authenticate,
  requireAdmin,
  logAuthRequest("ADMIN_GET_STATS"),
  async (req, res) => {
    try {
      let User;
      try {
        User = require("../models/User");
      } catch (modelError) {
        logger.warn("User model not found for admin stats", {
          error: modelError.message,
          userId: req.user.id,
          adminUserId: req.adminUser._id,
          ip: req.ip,
        });

        return res.status(503).json({
          success: false,
          message: "User statistics temporarily unavailable",
          code: "SERVICE_UNAVAILABLE",
          timestamp: new Date().toISOString(),
        });
      }

      const [
        totalUsers,
        activeUsers,
        lockedUsers,
        adminUsers,
        verifiedUsers,
        recentSignups,
        trialUsers,
        premiumUsers,
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({isActive: true}),
        User.countDocuments({
          lockUntil: {$exists: true, $gt: new Date()},
        }),
        User.countDocuments({role: "admin"}),
        User.countDocuments({emailVerified: true}),
        User.countDocuments({
          createdAt: {$gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)},
        }),
        User.countDocuments({"subscription.status": "trial"}),
        User.countDocuments({"subscription.plan": "premium"}),
      ]);

      const stats = {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          locked: lockedUsers,
          verified: verifiedUsers,
          unverified: totalUsers - verifiedUsers,
          admins: adminUsers,
        },
        registrations: {
          recentSignups,
          dailyAverage: Math.round(recentSignups / 7),
        },
        subscriptions: {
          trial: trialUsers,
          premium: premiumUsers,
          free: totalUsers - trialUsers - premiumUsers,
        },
        systemHealth: {
          uptime: Math.floor(process.uptime()),
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV,
        },
      };

      logger.info("Admin statistics accessed", {
        userId: req.user.id,
        adminUserId: req.adminUser._id,
        ip: req.ip,
        requestId: req.requestId,
        statsRequested: Object.keys(stats),
      });

      await createAuthAuditLog(req, "ADMIN_STATS_ACCESS", {
        adminUserId: req.adminUser._id,
        statsAccessed: true,
        severity: "low",
      });

      res.json({
        success: true,
        data: stats,
        metadata: {
          timestamp: new Date().toISOString(),
          requestedBy: {
            userId: req.user.id,
            adminUserId: req.adminUser._id,
            email: req.adminUser.email,
          },
          adminAccess: true,
          requestId: req.requestId,
        },
      });
    } catch (error) {
      logger.error("Admin stats route error", {
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        userId: req.user?.id,
        adminUserId: req.adminUser?._id,
        ip: req.ip,
        requestId: req.requestId,
      });

      await createAuthAuditLog(req, "ADMIN_STATS_ERROR", {
        error: error.message,
        adminUserId: req.adminUser?._id,
        severity: "medium",
      });

      res.status(500).json({
        success: false,
        message: "Error fetching authentication statistics",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }
);

// ✅ NEW: Admin test route (verify admin middleware)
// @desc    Test admin access and middleware
// @route   GET /api/auth/admin/test
// @access  Private (Admin only)
router.get(
  "/admin/test",
  adminLimit,
  setSecurityHeaders,
  authenticate,
  requireAdmin,
  logAuthRequest("ADMIN_TEST"),
  async (req, res) => {
    try {
      logger.info("Admin test route accessed successfully", {
        userId: req.user.id,
        adminUserId: req.adminUser._id,
        adminEmail: req.adminUser.email,
        adminRole: req.adminUser.role,
        ip: req.ip,
        requestId: req.requestId,
      });

      await createAuthAuditLog(req, "ADMIN_TEST_ACCESS", {
        adminUserId: req.adminUser._id,
        testPassed: true,
        severity: "low",
      });

      res.json({
        success: true,
        message: "Admin access confirmed! Middleware working correctly.",
        data: {
          adminUser: {
            id: req.adminUser._id,
            name: req.adminUser.name,
            email: req.adminUser.email,
            role: req.adminUser.role,
          },
          accessLevel: "administrator",
          middlewareStatus: "working",
          timestamp: new Date().toISOString(),
        },
        metadata: {
          environment: process.env.NODE_ENV,
          version: "3.0.0",
          testResult: "passed",
          ipv6Support: "enabled", // ✅ NEW: IPv6 support confirmation
          requestId: req.requestId,
        },
      });
    } catch (error) {
      logger.error("Admin test route error", {
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        userId: req.user?.id,
        adminUserId: req.adminUser?._id,
        ip: req.ip,
        requestId: req.requestId,
      });

      await createAuthAuditLog(req, "ADMIN_TEST_ERROR", {
        error: error.message,
        adminUserId: req.adminUser?._id,
        severity: "medium",
      });

      res.status(500).json({
        success: false,
        message: "Error in admin test",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }
);

// ✅ NEW: Get all users (Admin only)
// @desc    Get list of all users with pagination
// @route   GET /api/auth/admin/users
// @access  Private (Admin only)
router.get(
  "/admin/users",
  adminLimit,
  setSecurityHeaders,
  authenticate,
  requireAdmin,
  logAuthRequest("ADMIN_GET_USERS"),
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100 per page
      const skip = (page - 1) * limit;
      const sortBy = req.query.sortBy || "createdAt";
      const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
      const search = req.query.search;
      const role = req.query.role;
      const status = req.query.status;

      let query = {};

      // Build search query
      if (search) {
        query.$or = [
          {name: {$regex: search, $options: "i"}},
          {email: {$regex: search, $options: "i"}},
          {phone: {$regex: search, $options: "i"}},
        ];
      }

      // Filter by role
      if (role) {
        query.role = role;
      }

      // Filter by status
      if (status === "active") {
        query.isActive = true;
      } else if (status === "inactive") {
        query.isActive = false;
      }

      const User = require("../models/User");

      const [users, totalUsers] = await Promise.all([
        User.find(query)
          .select("-password -emailVerificationToken -passwordResetToken")
          .sort({[sortBy]: sortOrder})
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalUsers / limit);

      logger.info("Admin user list accessed", {
        adminUserId: req.adminUser._id,
        ip: req.ip,
        query: {page, limit, search, role, status},
        resultCount: users.length,
        requestId: req.requestId,
      });

      await createAuthAuditLog(req, "ADMIN_USER_LIST_ACCESS", {
        adminUserId: req.adminUser._id,
        usersReturned: users.length,
        totalUsers,
        filters: {search, role, status},
        severity: "low",
      });

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            currentPage: page,
            totalPages,
            totalUsers,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestedBy: {
            adminUserId: req.adminUser._id,
            email: req.adminUser.email,
          },
          query: {page, limit, search, role, status, sortBy, sortOrder},
          requestId: req.requestId,
        },
      });
    } catch (error) {
      logger.error("Admin get users route error", {
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        adminUserId: req.adminUser?._id,
        ip: req.ip,
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        message: "Error fetching user list",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }
);

// ================================
// 🧪 DEVELOPMENT TESTING ROUTES
// ================================

if (process.env.NODE_ENV === "development") {
  // @desc    Test rate limiting (Development only)
  // @route   POST /api/auth/test-rate-limit
  // @access  Public (Development only)
  router.post("/test-rate-limit", smartAuthLimit, (req, res) => {
    res.json({
      success: true,
      message: "Rate limiting test endpoint",
      environment: "development",
      limits: "25 failed attempts per 5 minutes",
      note: "This endpoint helps verify that rate limiting is working correctly",
      ipv6Support: "enabled", // ✅ NEW: IPv6 support confirmation
      timestamp: new Date().toISOString(),
    });
  });

  // ✅ NEW: Test admin checking (Development only)
  // @desc    Test admin role checking without full middleware
  // @route   GET /api/auth/test-admin-check
  // @access  Private (Development only)
  router.get("/test-admin-check", authenticate, (req, res) => {
    res.json({
      success: true,
      message: "Admin check test endpoint",
      environment: "development",
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role,
        },
        isAdmin: isUserAdmin(req.user),
        adminCheckMethod: "isUserAdmin helper function",
      },
      note: "This endpoint tests the admin checking logic without full middleware",
      timestamp: new Date().toISOString(),
    });
  });

  // @desc    Debug user token (Development only)
  // @route   GET /api/auth/debug-token
  // @access  Private (Development only)
  router.get("/debug-token", authenticate, (req, res) => {
    res.json({
      success: true,
      message: "Token debug information",
      environment: "development",
      data: {
        decodedToken: req.user,
        tokenValid: true,
        timestamp: new Date().toISOString(),
      },
      note: "This endpoint shows decoded token information for debugging",
    });
  });
}

// ================================
// ⚠️ ERROR HANDLING MIDDLEWARE
// ================================

// 404 handler for unknown routes
router.use("*", (req, res) => {
  logger.warn("Invalid auth route accessed", {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });

  const availableRoutes = [
    "POST /signup",
    "POST /login",
    "POST /logout",
    "POST /refresh",
    "GET /verify",
    "GET /check-admin",
    "GET /check-email/:email",
    "GET /health",
    "GET /stats",
    "GET /admin/test",
    "GET /admin/users",
    ...(process.env.NODE_ENV === "development"
      ? ["POST /test-rate-limit", "GET /test-admin-check", "GET /debug-token"]
      : []),
  ];

  res.status(404).json({
    success: false,
    message: `Authentication route ${req.method} ${req.originalUrl} not found`,
    code: "ROUTE_NOT_FOUND",
    timestamp: new Date().toISOString(),
    suggestion:
      "Check the API documentation for available authentication endpoints",
    availableRoutes,
    requestId: req.requestId,
  });
});

// Global error handler for auth routes
router.use((error, req, res, next) => {
  logger.error("Auth route global error", {
    error: error.message,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
    adminUserId: req.adminUser?._id,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  });

  const isDevelopment = process.env.NODE_ENV === "development";

  // Default error response
  const errorResponse = {
    success: false,
    message: isDevelopment ? error.message : "Authentication service error",
    code: error.code || "AUTH_ERROR",
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  };

  // Add debug info in development
  if (isDevelopment) {
    errorResponse.debug = {
      stack: error.stack,
      details: error,
    };
  }

  res.status(error.status || 500).json(errorResponse);
});

module.exports = router;
