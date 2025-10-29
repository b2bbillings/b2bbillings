const User = require("../models/User");
const logger = require("../config/logger");
const jwt = require("jsonwebtoken");
const { sendOTPEmail, sendPasswordResetSuccessEmail } = require("../utils/emailService");

// ✅ SIMPLE: Token blacklist for logout security (in-memory for development)
const tokenBlacklist = new Set();

// ✅ SIMPLE: Clean up blacklisted tokens periodically
setInterval(() => {
  if (tokenBlacklist.size > 1000) {
    tokenBlacklist.clear();
    logger.info("Token blacklist cleared due to size limit");
  }
}, 60 * 60 * 1000); // Every hour

// ✅ ADDED: Admin role checking helper function
const isUserAdmin = (user) => {
  if (!user) return false;

  return (
    user.role === "admin" ||
    user.role === "administrator" ||
    user.role === "super_admin" ||
    user.userType === "admin" ||
    user.isAdmin === true ||
    (user.roles && Array.isArray(user.roles) && user.roles.includes("admin")) ||
    (user.permissions &&
      Array.isArray(user.permissions) &&
      user.permissions.includes("admin")) ||
    user.email === "admin@b2bbillings.com" // Super admin fallback
  );
};

// ✅ SIMPLE: Audit logging helper
const createAuthAuditLog = async (userId, action, details = {}) => {
  try {
    logger.info(`Auth audit: ${action}`, {
      userId,
      action,
      details: {
        timestamp: new Date().toISOString(),
        ...details,
      },
      severity: "medium",
    });
  } catch (error) {
    logger.error("Failed to create auth audit log", {
      error: error.message,
      action,
      userId,
    });
  }
};

// ✅ FIXED: JWT token generation functions (since User model doesn't have them)
const generateAccessToken = (user) => {
  try {
    const payload = {
      id: user._id || user.id,
      email: user.email,
      role: user.role || "user",
      name: user.name,
      isAdmin: isUserAdmin(user), // ✅ ADDED: Include admin status in token
    };

    const options = {
      expiresIn:
        process.env.JWT_EXPIRE || process.env.JWT_ACCESS_EXPIRY || "7d",
      issuer: process.env.JWT_ISSUER || "shop-manager-api",
      audience: process.env.JWT_AUDIENCE || "shop-manager-users",
    };

    return jwt.sign(payload, process.env.JWT_SECRET, options);
  } catch (error) {
    logger.error("Error generating access token", {
      error: error.message,
      userId: user._id || user.id,
    });
    throw new Error("Failed to generate access token");
  }
};

const generateRefreshToken = (user) => {
  try {
    const payload = {
      id: user._id || user.id,
      email: user.email,
      type: "refresh",
    };

    const options = {
      expiresIn:
        process.env.JWT_REFRESH_EXPIRE ||
        process.env.JWT_REFRESH_EXPIRY ||
        "30d",
      issuer: process.env.JWT_ISSUER || "shop-manager-api",
      audience: process.env.JWT_AUDIENCE || "shop-manager-users",
    };

    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, options);
  } catch (error) {
    logger.error("Error generating refresh token", {
      error: error.message,
      userId: user._id || user.id,
    });
    throw new Error("Failed to generate refresh token");
  }
};

// ✅ FIXED: Verify refresh token function
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    logger.error("Error verifying refresh token", {
      error: error.message,
    });
    throw new Error("Invalid refresh token");
  }
};

// ✅ FIXED: Generate tokens using standalone functions (not User model methods)
const generateUserTokens = async (user) => {
  try {
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    logger.info("Tokens generated successfully", {
      userId: user._id || user.id,
      accessTokenLength: accessToken.length,
      refreshTokenLength: refreshToken.length,
      isAdmin: isUserAdmin(user), // ✅ ADDED: Log admin status
    });

    return {accessToken, refreshToken};
  } catch (error) {
    logger.error("Error generating user tokens", {
      error: error.message,
      userId: user._id || user.id,
    });
    throw error;
  }
};

// ✅ FIXED: Send response with tokens
const sendUserResponse = async (
  res,
  statusCode,
  user,
  message,
  metadata = {}
) => {
  try {
    const {accessToken, refreshToken} = await generateUserTokens(user);
    const userIsAdmin = isUserAdmin(user); // ✅ ADDED: Check admin status

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
          companyName: user.companyName,
          gstNumber: user.gstNumber,
          subscription: user.subscription,
          preferences: user.preferences,
          isAdmin: userIsAdmin, // ✅ ADDED: Include admin status in response
        },
        tokens: {
          accessToken,
          refreshToken,
        },
        expiresIn: process.env.JWT_EXPIRE || "7d",
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: "2.1.0",
        ...metadata,
      },
    };

    // Set HTTP-only cookies for added security
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days for refresh token
    });

    logger.info("User authentication response sent", {
      userId: user._id,
      statusCode,
      action: metadata.action || "auth_response",
      isAdmin: userIsAdmin, // ✅ ADDED: Log admin status
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

// ✅ ADDED: Check admin status endpoint
const checkAdminStatus = async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    // Get user details (req.user is populated by authenticate middleware)
    const user = await User.findById(req.user.id).select("-password").lean();

    if (!user) {
      logger.warn("Admin check failed - user not found", {
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
      logger.warn("Admin check on inactive user", {
        userId: user._id,
        email: user.email,
        ip: clientIp,
      });

      return res.status(401).json({
        success: false,
        message: "Account is inactive",
        code: "ACCOUNT_INACTIVE",
      });
    }

    const userIsAdmin = isUserAdmin(user);

    logger.info("Admin status check", {
      userId: user._id,
      email: user.email,
      role: user.role,
      isAdmin: userIsAdmin,
      ip: clientIp,
      responseTime: Date.now() - startTime,
    });

    // ✅ ADDED: Audit log for admin status checks
    await createAuthAuditLog(user._id, "ADMIN_STATUS_CHECK", {
      ip: clientIp,
      isAdmin: userIsAdmin,
      role: user.role,
    });

    res.status(200).json({
      success: true,
      data: {
        isAdmin: userIsAdmin,
        role: user.role,
        permissions: user.permissions || [],
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: "2.1.0",
        responseTime: Date.now() - startTime,
      },
    });
  } catch (error) {
    logger.error("Admin status check error", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      ip: clientIp,
      responseTime: Date.now() - startTime,
    });

    res.status(500).json({
      success: false,
      message: "Error checking admin status",
      code: "INTERNAL_ERROR",
      timestamp: new Date().toISOString(),
    });
  }
};

// ✅ ADDED: Admin middleware function (can be used in routes)
const requireAdmin = async (req, res, next) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    // Check if token is blacklisted first
    const token = req.headers.authorization?.split(" ")[1];
    if (token && tokenBlacklist.has(token)) {
      logger.warn("Admin access attempted with blacklisted token", {
        userId: req.user?.id,
        ip: clientIp,
      });

      return res.status(401).json({
        success: false,
        message: "Token has been invalidated",
        code: "TOKEN_BLACKLISTED",
      });
    }

    // Get user details (req.user should be populated by authenticate middleware)
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    const user = await User.findById(req.user.id).select("-password").lean();

    if (!user) {
      logger.warn("Admin access attempted - user not found", {
        userId: req.user.id,
        ip: clientIp,
      });

      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    if (!user.isActive) {
      logger.warn("Admin access attempted by inactive user", {
        userId: user._id,
        email: user.email,
        ip: clientIp,
      });

      await createAuthAuditLog(user._id, "INACTIVE_USER_ADMIN_ACCESS_ATTEMPT", {
        ip: clientIp,
      });

      return res.status(401).json({
        success: false,
        message: "Account is inactive",
        code: "ACCOUNT_INACTIVE",
      });
    }

    // Check if user has admin privileges
    const userIsAdmin = isUserAdmin(user);

    if (!userIsAdmin) {
      logger.warn("Non-admin user attempted admin access", {
        userId: user._id,
        email: user.email,
        role: user.role,
        ip: clientIp,
        route: req.originalUrl,
      });

      await createAuthAuditLog(user._id, "UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT", {
        ip: clientIp,
        route: req.originalUrl,
        role: user.role,
      });

      return res.status(403).json({
        success: false,
        message: "Administrator privileges required",
        code: "ADMIN_REQUIRED",
      });
    }

    // ✅ Admin access granted
    logger.info("Admin access granted", {
      userId: user._id,
      email: user.email,
      role: user.role,
      ip: clientIp,
      route: req.originalUrl,
      responseTime: Date.now() - startTime,
    });

    await createAuthAuditLog(user._id, "ADMIN_ACCESS_GRANTED", {
      ip: clientIp,
      route: req.originalUrl,
      role: user.role,
    });

    // Add user info to request for use in route handlers
    req.adminUser = user;
    next();
  } catch (error) {
    logger.error("Admin middleware error", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      ip: clientIp,
      route: req.originalUrl,
      responseTime: Date.now() - startTime,
    });

    res.status(500).json({
      success: false,
      message: "Error verifying admin privileges",
      code: "INTERNAL_ERROR",
      timestamp: new Date().toISOString(),
    });
  }
};

// ✅ FIXED: Verify token endpoint (matches routes expectation)
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

    // Get user details (req.user is populated by authenticate middleware)
    const user = await User.findById(req.user.id).select("-password").lean();

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

      await createAuthAuditLog(user._id, "INACTIVE_USER_ACCESS_ATTEMPT", {
        ip: clientIp,
      });

      return res.status(401).json({
        success: false,
        message: "Account is inactive",
        code: "ACCOUNT_INACTIVE",
      });
    }

    const userIsAdmin = isUserAdmin(user); // ✅ ADDED: Check admin status

    logger.info("Token verification successful", {
      userId: user._id,
      ip: clientIp,
      isAdmin: userIsAdmin, // ✅ ADDED: Log admin status
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
          companyName: user.companyName,
          subscription: user.subscription,
          preferences: user.preferences,
          isAdmin: userIsAdmin, // ✅ ADDED: Include admin status
        },
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: "2.1.0",
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

// Update the signup function (around line 400):
const signup = async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    // ✅ FIXED: Extract fields - only email and password are required
    const {
      name = "",
      email,
      password,
      phone = "",
      companyName = "",
      gstNumber = "",
      termsAccepted = true, // ✅ Default to true since no T&C exist yet
    } = req.body;

    console.log("🔐 Signup attempt:", {
      email,
      name: name || "NOT_PROVIDED",
      phone: phone || "NOT_PROVIDED",
      companyName: companyName || "NOT_PROVIDED",
      gstNumber: gstNumber ? "PROVIDED" : "NOT_PROVIDED",
      termsAccepted: "AUTO_ACCEPTED", // ✅ Since no T&C exist
      ip: clientIp,
      environment: process.env.NODE_ENV,
    });

    // ✅ REMOVED: GST validation (moved to routes)
    // ✅ REMOVED: Terms validation (no T&C exist yet)

    // Check for existing user
    const existingUser = await User.findOne({email: email.toLowerCase()}).lean();

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

    // Check for existing phone only if phone is provided
    if (phone && phone.trim().length > 0) {
      const existingPhone = await User.findOne({phone: phone.trim()}).lean();
      
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
    }

    // ✅ FIXED: Create user data with only required fields (email and password)
    const userData = {
      email: email.toLowerCase().trim(),
      password,
      termsAccepted: true, // ✅ Auto-accept since no T&C exist
      termsAcceptedAt: new Date(), // ✅ Set current timestamp
      metadata: {
        source: "web",
        referrer: req.get("Referer"),
        autoAcceptedTerms: true, // ✅ Flag for future reference
        reason: "No terms and conditions available at signup time",
      },
    };

    // ✅ Add optional fields only if provided
    if (name && name.trim().length > 0) {
      userData.name = name.trim();
    }

    if (phone && phone.trim().length > 0) {
      userData.phone = phone.trim();
    }

    if (companyName && companyName.trim().length > 0) {
      userData.companyName = companyName.trim();
    }

    if (gstNumber && gstNumber.trim().length > 0) {
      userData.gstNumber = gstNumber.trim().toUpperCase();
    }

    console.log("💾 Creating user with data:", {
      ...userData,
      password: "[REDACTED]",
    });

    const user = new User(userData);
    await user.save();

    // Add login history
    await user.addLoginHistory(clientIp, req.get("User-Agent"), true);

    // ✅ Enhanced audit log
    await createAuthAuditLog(user._id, "USER_REGISTRATION", {
      email: user.email,
      registrationIp: clientIp,
      userAgent: req.get("User-Agent"),
      hasCompanyName: !!companyName,
      hasGstNumber: !!gstNumber,
      termsAccepted: true,
      autoAcceptedTerms: true, // ✅ Flag for audit
    });

    logger.info("User registration successful", {
      userId: user._id,
      email: user.email,
      ip: clientIp,
      autoAcceptedTerms: true,
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

    // Handle duplicate key errors
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

    // Handle validation errors
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

// ✅ FIXED: Login controller (using User model methods and validation)
const login = async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    const {email, phone, password, rememberMe = false} = req.body;

    console.log("🔐 Login attempt:", {
      email,
      phone,
      ip: clientIp,
      rememberMe,
      environment: process.env.NODE_ENV,
    });

    if ((!email && !phone) || !password) {
      return res.status(400).json({
        success: false,
        message: "Email or phone number and password are required",
        code: "MISSING_CREDENTIALS",
      });
    }

    // Find user by email or phone with password
    let user;
    if (phone) {
      // Validate phone format
      if (!/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone number format. Must be a 10-digit number starting with 6, 7, 8, or 9",
          code: "INVALID_PHONE_FORMAT",
        });
      }
      user = await User.findByPhoneWithPassword(phone);
    } else {
      user = await User.findByEmailWithPassword(email);
    }

    if (!user) {
      logger.warn("Login attempt with non-existent credentials", {
        email,
        phone,
        ip: clientIp,
        userAgent: req.get("User-Agent"),
      });

      // Consistent timing to prevent enumeration
      await new Promise((resolve) => setTimeout(resolve, 100));

      return res.status(401).json({
        success: false,
        message: phone ? "Invalid phone number or password" : "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Check if account is locked using virtual property
    if (user.isLocked) {
      const lockTimeRemaining = user.lockUntil - Date.now();

      logger.warn("Login attempt on locked account", {
        userId: user._id,
        email: user.email,
        ip: clientIp,
        lockTimeRemaining,
      });

      await createAuthAuditLog(user._id, "LOCKED_ACCOUNT_ACCESS_ATTEMPT", {
        ip: clientIp,
        lockTimeRemaining,
      });

      return res.status(423).json({
        success: false,
        message:
          "Account temporarily locked due to too many failed login attempts",
        code: "ACCOUNT_LOCKED",
        retryAfter: Math.ceil(lockTimeRemaining / 1000 / 60), // minutes
      });
    }

    // Check if account is active
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

    // Verify password using model instance method
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Increment login attempts using model method
      await user.incLoginAttempts();

      logger.warn("Failed login attempt", {
        userId: user._id,
        email: user.email,
        phone: user.phone,
        ip: clientIp,
        loginAttempts: (user.loginAttempts || 0) + 1,
      });

      await createAuthAuditLog(user._id, "FAILED_LOGIN_ATTEMPT", {
        ip: clientIp,
        attempts: (user.loginAttempts || 0) + 1,
      });

      return res.status(401).json({
        success: false,
        message: phone ? "Invalid phone number or password" : "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Successful login processing
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Add login history using model method
    await user.addLoginHistory(clientIp, req.get("User-Agent"), true);

    logger.info("User login successful", {
      userId: user._id,
      email: user.email,
      ip: clientIp,
      isAdmin: isUserAdmin(user), // ✅ ADDED: Log admin status
      responseTime: Date.now() - startTime,
    });

    await createAuthAuditLog(user._id, "SUCCESSFUL_LOGIN", {
      ip: clientIp,
      userAgent: req.get("User-Agent"),
      rememberMe,
      isAdmin: isUserAdmin(user), // ✅ ADDED: Include admin status in audit
    });

    await sendUserResponse(res, 200, user, "Login successful", {
      action: "login",
      responseTime: Date.now() - startTime,
      rememberMe,
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

// ✅ FIXED: Logout controller
const logout = async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    const token = req.headers.authorization?.split(" ")[1];
    const userId = req.user?.id;

    if (token) {
      // Add token to blacklist
      tokenBlacklist.add(token);
    }

    if (userId) {
      logger.info("User logout successful", {
        userId,
        ip: clientIp,
        responseTime: Date.now() - startTime,
      });

      await createAuthAuditLog(userId, "USER_LOGOUT", {
        ip: clientIp,
      });
    }

    // Clear cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

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

// ✅ FIXED: Refresh token controller
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

    // Verify refresh token using our function
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
        code: "INVALID_REFRESH_TOKEN",
      });
    }

    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
        code: "INVALID_REFRESH_TOKEN",
      });
    }

    // Generate new tokens
    const {accessToken, refreshToken: newRefreshToken} =
      await generateUserTokens(user);

    logger.info("Token refresh successful", {
      userId: user._id,
      ip: clientIp,
      isAdmin: isUserAdmin(user), // ✅ ADDED: Log admin status
      responseTime: Date.now() - startTime,
    });

    // Set new cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", newRefreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.json({
      success: true,
      message: "Tokens refreshed successfully",
      data: {
        tokens: {
          accessToken,
          refreshToken: newRefreshToken,
        },
        expiresIn: process.env.JWT_EXPIRE || "7d",
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

// ================================
// FORGOT PASSWORD (OTP-based)
// ================================

const forgotPassword = async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    const {email, phone} = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: "Email or phone number is required",
        code: "MISSING_CREDENTIALS",
      });
    }

    // Find user by email or phone
    let user;
    if (phone) {
      // Validate phone format
      if (!/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone number format",
          code: "INVALID_PHONE_FORMAT",
        });
      }
      user = await User.findOne({phone});
    } else {
      user = await User.findOne({email: email.toLowerCase()});
    }

    // Always return success to prevent enumeration
    if (!user) {
      logger.warn("Password reset requested for non-existent user", {
        email,
        phone,
        ip: clientIp,
      });

      // Consistent timing
      await new Promise((resolve) => setTimeout(resolve, 100));

      return res.status(200).json({
        success: true,
        message: phone 
          ? "If this phone number is registered, you will receive an OTP"
          : "If this email is registered, you will receive an OTP",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash OTP for storage
    const hashedOTP = require("crypto")
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    // Save OTP to user (expires in 10 minutes)
    user.passwordResetToken = hashedOTP;
    user.passwordResetExpires = Date.now() + 600000; // 10 minutes
    await user.save({ validateModifiedOnly: true });

    logger.info("Password reset OTP generated", {
      userId: user._id,
      email: user.email,
      phone: user.phone,
      ip: clientIp,
    });

    // Send OTP via email if email is provided
    if (email && !phone) {
      try {
        await sendOTPEmail(user.email, otp, user.name);
        logger.info("OTP email sent successfully", {
          userId: user._id,
          email: user.email,
        });
      } catch (emailError) {
        logger.error("Failed to send OTP email", {
          error: emailError.message,
          userId: user._id,
        });
        // Continue even if email fails - user can still use phone
      }
    }

    // TODO: Send OTP via SMS if phone is provided
    // For phone-based reset, you'll need to integrate an SMS service like Twilio

    const responseData = {
      success: true,
      message: phone 
        ? `OTP sent to phone number ending in ${phone.slice(-4)}`
        : `OTP sent to ${email}`,
    };

    // In development, include the OTP for testing
    if (process.env.NODE_ENV === "development") {
      responseData.otp = otp;
    }

    res.status(200).json(responseData);
  } catch (error) {
    logger.error("Forgot password error", {
      error: error.message,
      stack: error.stack,
      ip: clientIp,
      responseTime: Date.now() - startTime,
    });

    res.status(500).json({
      success: false,
      message: "Server error processing password reset request",
      code: "INTERNAL_ERROR",
    });
  }
};

// ================================
// VERIFY OTP
// ================================

const verifyOTP = async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    const {email, phone, otp} = req.body;

    if ((!email && !phone) || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email/phone and OTP are required",
        code: "MISSING_FIELDS",
      });
    }

    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "OTP must be a 6-digit number",
        code: "INVALID_OTP_FORMAT",
      });
    }

    // Find user by email or phone
    let user;
    if (phone) {
      user = await User.findOne({phone});
    } else {
      user = await User.findOne({email: email.toLowerCase()});
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Check if OTP exists and not expired
    if (!user.passwordResetToken || !user.passwordResetExpires) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new one",
        code: "NO_OTP",
      });
    }

    if (user.passwordResetExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one",
        code: "OTP_EXPIRED",
      });
    }

    // Hash the provided OTP to compare with stored hash
    const hashedOTP = require("crypto")
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    if (user.passwordResetToken !== hashedOTP) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
        code: "INVALID_OTP",
      });
    }

    // OTP is valid - generate a temporary token for password reset
    const resetToken = require("crypto").randomBytes(32).toString("hex");
    const hashedResetToken = require("crypto")
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Store reset token (valid for 15 minutes)
    user.passwordResetToken = hashedResetToken;
    user.passwordResetExpires = Date.now() + 900000; // 15 minutes
    await user.save({ validateModifiedOnly: true });

    logger.info("OTP verified successfully", {
      userId: user._id,
      email: user.email,
      phone: user.phone,
      ip: clientIp,
    });

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      resetToken: resetToken,
    });
  } catch (error) {
    logger.error("Verify OTP error", {
      error: error.message,
      stack: error.stack,
      ip: clientIp,
      responseTime: Date.now() - startTime,
    });

    res.status(500).json({
      success: false,
      message: "Server error verifying OTP",
      code: "INTERNAL_ERROR",
    });
  }
};

// ================================
// RESET PASSWORD
// ================================

const resetPassword = async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    const {token, newPassword} = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Reset token and new password are required",
        code: "MISSING_FIELDS",
      });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
        code: "WEAK_PASSWORD",
      });
    }

    // Hash the token to compare with stored hash
    const hashedToken = require("crypto")
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: {$gt: Date.now()},
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
        code: "INVALID_TOKEN",
      });
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    
    // Reset login attempts if any
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    await user.save({ validateModifiedOnly: true });

    logger.info("Password reset successful", {
      userId: user._id,
      email: user.email,
      ip: clientIp,
    });

    // Send success notification email
    if (user.email) {
      try {
        await sendPasswordResetSuccessEmail(user.email, user.name);
      } catch (emailError) {
        logger.error("Failed to send password reset success email", {
          error: emailError.message,
          userId: user._id,
        });
        // Don't fail the request if email fails
      }
    }

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    logger.error("Reset password error", {
      error: error.message,
      stack: error.stack,
      ip: clientIp,
      responseTime: Date.now() - startTime,
    });

    res.status(500).json({
      success: false,
      message: "Server error resetting password",
      code: "INTERNAL_ERROR",
    });
  }
};

// ✅ UPDATED: Export all functions including new admin functions
module.exports = {
  signup,
  login,
  logout,
  verifyToken,
  refreshToken,
  checkAdminStatus, // ✅ NEW: Check if user is admin
  requireAdmin, // ✅ NEW: Admin middleware
  isUserAdmin, // ✅ NEW: Helper function to check admin status
  forgotPassword, // ✅ NEW: Forgot password with OTP
  verifyOTP, // ✅ NEW: Verify OTP
  resetPassword, // ✅ NEW: Reset password
};
