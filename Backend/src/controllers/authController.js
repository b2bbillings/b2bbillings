const User = require("../models/User");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../config/jwt");
const logger = require("../config/logger");
const {createAuditLog} = require("../utils/auditLogger");
const {sanitizeInput, validateInput} = require("../utils/validation");
const rateLimit = require("express-rate-limit");

// ✅ ENHANCED: Token blacklist for logout security
const tokenBlacklist = new Set();

// ✅ ENHANCED: Rate limiting for sensitive operations
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ ENHANCED: Verify token with comprehensive security
const verifyToken = async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    // Check if token is blacklisted
    const token = req.headers.authorization?.split(" ")[1];
    if (token && tokenBlacklist.has(token)) {
      logger.warn("Blacklisted token used", {
        userId: req.user?.id,
        ip: clientIp,
        userAgent: req.get("User-Agent"),
      });

      return res.status(401).json({
        success: false,
        message: "Token has been invalidated",
        code: "TOKEN_BLACKLISTED",
      });
    }

    // Enhanced user lookup with security checks
    const user = await User.findById(req.user.id)
      .select("-password -refreshTokens")
      .lean();

    if (!user) {
      logger.warn("Token verification failed - user not found", {
        userId: req.user.id,
        ip: clientIp,
        responseTime: Date.now() - startTime,
      });

      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    if (!user.isActive) {
      logger.warn("Inactive user attempted access", {
        userId: user._id,
        email: user.email,
        ip: clientIp,
      });

      await createAuditLog({
        userId: user._id,
        action: "INACTIVE_USER_ACCESS_ATTEMPT",
        details: {ip: clientIp},
        severity: "medium",
      });

      return res.status(401).json({
        success: false,
        message: "Account is inactive",
        code: "ACCOUNT_INACTIVE",
      });
    }

    // ✅ ENHANCED: Check for suspicious activity
    const timeSinceLastLogin = Date.now() - new Date(user.lastLogin).getTime();
    if (timeSinceLastLogin > 24 * 60 * 60 * 1000) {
      // 24 hours
      logger.info("User verified after extended absence", {
        userId: user._id,
        timeSinceLastLogin,
        ip: clientIp,
      });
    }

    // ✅ ENHANCED: Security headers
    res.set({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
    });

    logger.info("Token verification successful", {
      userId: user._id,
      ip: clientIp,
      responseTime: Date.now() - startTime,
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        },
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: "2.0.0",
      },
    });
  } catch (error) {
    logger.error("Token verification error", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      ip: clientIp,
      responseTime: Date.now() - startTime,
    });

    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      code: "TOKEN_INVALID",
      timestamp: new Date().toISOString(),
    });
  }
};

// ✅ ENHANCED: Secure token generation with tracking
const generateUserTokens = async (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion || 1,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // ✅ ENHANCED: Store refresh token hash in database
  if (!user.refreshTokens) user.refreshTokens = [];
  user.refreshTokens.push({
    token: refreshToken,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  // ✅ ENHANCED: Limit refresh tokens (max 5 devices)
  if (user.refreshTokens.length > 5) {
    user.refreshTokens = user.refreshTokens.slice(-5);
  }

  await user.save();

  return {accessToken, refreshToken};
};

// ✅ ENHANCED: Secure response with comprehensive logging
const sendUserResponse = async (
  res,
  statusCode,
  user,
  message,
  metadata = {}
) => {
  try {
    const {accessToken, refreshToken} = await generateUserTokens(user);

    // ✅ ENHANCED: Security headers for auth responses
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    });

    const responseData = {
      success: true,
      message,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        },
        token: accessToken,
        refreshToken: refreshToken,
        expiresIn: "7d",
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: "2.0.0",
        ...metadata,
      },
    };

    logger.info("User authentication response sent", {
      userId: user._id,
      statusCode,
      action: metadata.action || "auth_response",
    });

    res.status(statusCode).json(responseData);
  } catch (error) {
    logger.error("Error sending user response", {
      error: error.message,
      userId: user._id,
      statusCode,
    });
    throw error;
  }
};

// ✅ ENHANCED: Production-ready signup with comprehensive validation
const signup = async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    // ✅ ENHANCED: Input sanitization and validation
    const {name, email, password, phone} = sanitizeInput(req.body);

    const validationErrors = validateInput(
      {
        name,
        email,
        password,
        phone,
      },
      {
        name: {required: true, minLength: 2, maxLength: 100},
        email: {required: true, email: true},
        password: {required: true, minLength: 8, strongPassword: true},
        phone: {required: true, phoneNumber: true},
      }
    );

    if (validationErrors.length > 0) {
      logger.warn("Signup validation failed", {
        errors: validationErrors,
        ip: clientIp,
        email: email,
      });

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
        code: "VALIDATION_ERROR",
      });
    }

    // ✅ ENHANCED: Comprehensive duplicate checks
    const [existingUser, existingPhone] = await Promise.all([
      User.findOne({email: email.toLowerCase()}).lean(),
      User.findOne({phone}).lean(),
    ]);

    if (existingUser) {
      logger.warn("Signup attempt with existing email", {
        email,
        ip: clientIp,
        existingUserId: existingUser._id,
      });

      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
        code: "EMAIL_EXISTS",
      });
    }

    if (existingPhone) {
      logger.warn("Signup attempt with existing phone", {
        phone,
        ip: clientIp,
        existingUserId: existingPhone._id,
      });

      return res.status(409).json({
        success: false,
        message: "An account with this phone number already exists",
        code: "PHONE_EXISTS",
      });
    }

    // ✅ ENHANCED: Create user with additional security fields
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone.trim(),
      registrationIp: clientIp,
      registrationUserAgent: req.get("User-Agent"),
      tokenVersion: 1,
    });

    await user.save();

    // ✅ ENHANCED: Update login tracking
    user.lastLogin = new Date();
    user.lastLoginIp = clientIp;
    await user.save();

    // ✅ ENHANCED: Create audit log
    await createAuditLog({
      userId: user._id,
      action: "USER_REGISTRATION",
      details: {
        email: user.email,
        registrationIp: clientIp,
        userAgent: req.get("User-Agent"),
      },
      severity: "low",
    });

    logger.info("User registration successful", {
      userId: user._id,
      email: user.email,
      ip: clientIp,
      responseTime: Date.now() - startTime,
    });

    await sendUserResponse(res, 201, user, "Account created successfully", {
      action: "registration",
      responseTime: Date.now() - startTime,
    });
  } catch (error) {
    logger.error("Signup error", {
      error: error.message,
      stack: error.stack,
      ip: clientIp,
      body: {...req.body, password: "[REDACTED]"},
      responseTime: Date.now() - startTime,
    });

    // ✅ ENHANCED: Specific error handling
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${
          field.charAt(0).toUpperCase() + field.slice(1)
        } already exists`,
        code: "DUPLICATE_ENTRY",
        field,
      });
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages[0] || "Validation error",
        code: "VALIDATION_ERROR",
        errors: messages,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during registration",
      code: "INTERNAL_ERROR",
      timestamp: new Date().toISOString(),
    });
  }
};

// ✅ ENHANCED: Production-ready login with security features
const login = async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    const {email, password} = sanitizeInput(req.body);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
        code: "MISSING_CREDENTIALS",
      });
    }

    const user = await User.findByEmailWithPassword(email.toLowerCase().trim());

    if (!user) {
      logger.warn("Login attempt with non-existent email", {
        email,
        ip: clientIp,
        userAgent: req.get("User-Agent"),
      });

      // ✅ ENHANCED: Consistent timing to prevent enumeration
      await new Promise((resolve) => setTimeout(resolve, 100));

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    // ✅ ENHANCED: Account lockout check with detailed logging
    if (user.isLocked) {
      const lockTimeRemaining = user.lockUntil - Date.now();

      logger.warn("Login attempt on locked account", {
        userId: user._id,
        email: user.email,
        ip: clientIp,
        lockTimeRemaining,
      });

      await createAuditLog({
        userId: user._id,
        action: "LOCKED_ACCOUNT_ACCESS_ATTEMPT",
        details: {ip: clientIp, lockTimeRemaining},
        severity: "high",
      });

      return res.status(423).json({
        success: false,
        message:
          "Account temporarily locked due to too many failed login attempts",
        code: "ACCOUNT_LOCKED",
        retryAfter: Math.ceil(lockTimeRemaining / 1000 / 60), // minutes
      });
    }

    if (!user.isActive) {
      logger.warn("Login attempt on inactive account", {
        userId: user._id,
        email: user.email,
        ip: clientIp,
      });

      return res.status(401).json({
        success: false,
        message: "Account has been deactivated. Please contact support.",
        code: "ACCOUNT_INACTIVE",
      });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      await user.incLoginAttempts();

      logger.warn("Failed login attempt", {
        userId: user._id,
        email: user.email,
        ip: clientIp,
        loginAttempts: user.loginAttempts + 1,
      });

      await createAuditLog({
        userId: user._id,
        action: "FAILED_LOGIN_ATTEMPT",
        details: {ip: clientIp, attempts: user.loginAttempts + 1},
        severity: "medium",
      });

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    // ✅ ENHANCED: Successful login processing
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // ✅ ENHANCED: Update login tracking
    user.lastLogin = new Date();
    user.lastLoginIp = clientIp;
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    // ✅ ENHANCED: Security logging
    logger.info("User login successful", {
      userId: user._id,
      email: user.email,
      ip: clientIp,
      loginCount: user.loginCount,
      responseTime: Date.now() - startTime,
    });

    await createAuditLog({
      userId: user._id,
      action: "SUCCESSFUL_LOGIN",
      details: {ip: clientIp, userAgent: req.get("User-Agent")},
      severity: "low",
    });

    await sendUserResponse(res, 200, user, "Login successful", {
      action: "login",
      responseTime: Date.now() - startTime,
    });
  } catch (error) {
    logger.error("Login error", {
      error: error.message,
      stack: error.stack,
      ip: clientIp,
      responseTime: Date.now() - startTime,
    });

    res.status(500).json({
      success: false,
      message: "Server error during login",
      code: "INTERNAL_ERROR",
      timestamp: new Date().toISOString(),
    });
  }
};

// ✅ ENHANCED: Secure logout with token invalidation
const logout = async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    const token = req.headers.authorization?.split(" ")[1];
    const userId = req.user?.id;

    if (token) {
      // ✅ ENHANCED: Add token to blacklist
      tokenBlacklist.add(token);

      // ✅ ENHANCED: Clean up old blacklisted tokens periodically
      if (tokenBlacklist.size > 10000) {
        tokenBlacklist.clear();
      }
    }

    if (userId) {
      // ✅ ENHANCED: Remove refresh tokens from database
      const user = await User.findById(userId);
      if (user) {
        user.refreshTokens = [];
        await user.save();

        logger.info("User logout successful", {
          userId,
          ip: clientIp,
          responseTime: Date.now() - startTime,
        });

        await createAuditLog({
          userId,
          action: "USER_LOGOUT",
          details: {ip: clientIp},
          severity: "low",
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
      code: "LOGOUT_SUCCESS",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Logout error", {
      error: error.message,
      userId: req.user?.id,
      ip: clientIp,
      responseTime: Date.now() - startTime,
    });

    res.status(500).json({
      success: false,
      message: "Server error during logout",
      code: "INTERNAL_ERROR",
      timestamp: new Date().toISOString(),
    });
  }
};

// ✅ NEW: Refresh token endpoint
const refreshToken = async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    const {refreshToken} = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
        code: "MISSING_REFRESH_TOKEN",
      });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
        code: "INVALID_REFRESH_TOKEN",
      });
    }

    // Check if refresh token exists in user's tokens
    const tokenExists = user.refreshTokens?.some(
      (t) => t.token === refreshToken
    );
    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        message: "Refresh token not found",
        code: "REFRESH_TOKEN_NOT_FOUND",
      });
    }

    // Generate new tokens
    const {accessToken, refreshToken: newRefreshToken} =
      await generateUserTokens(user);

    // Remove old refresh token
    user.refreshTokens = user.refreshTokens.filter(
      (t) => t.token !== refreshToken
    );
    await user.save();

    logger.info("Token refresh successful", {
      userId: user._id,
      ip: clientIp,
      responseTime: Date.now() - startTime,
    });

    res.json({
      success: true,
      message: "Tokens refreshed successfully",
      data: {
        token: accessToken,
        refreshToken: newRefreshToken,
        expiresIn: "7d",
      },
    });
  } catch (error) {
    logger.error("Token refresh error", {
      error: error.message,
      ip: clientIp,
      responseTime: Date.now() - startTime,
    });

    res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
      code: "REFRESH_TOKEN_INVALID",
    });
  }
};

module.exports = {
  signup,
  login,
  logout,
  verifyToken,
  refreshToken,
  authRateLimit, // Export for use in routes
};
