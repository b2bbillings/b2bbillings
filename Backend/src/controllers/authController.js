const User = require("../models/User");
const logger = require("../config/logger");
const jwt = require("jsonwebtoken");

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
    // ✅ FIXED: Extract fields without requiring termsAccepted
    const {
      name,
      email,
      password,
      phone,
      companyName = "",
      gstNumber = "",
      termsAccepted = true, // ✅ Default to true since no T&C exist yet
    } = req.body;

    console.log("🔐 Signup attempt:", {
      email,
      name,
      phone,
      companyName: companyName || "NOT_PROVIDED",
      gstNumber: gstNumber ? "PROVIDED" : "NOT_PROVIDED",
      termsAccepted: "AUTO_ACCEPTED", // ✅ Since no T&C exist
      ip: clientIp,
      environment: process.env.NODE_ENV,
    });

    // ✅ REMOVED: GST validation (moved to routes)
    // ✅ REMOVED: Terms validation (no T&C exist yet)

    // Check for existing user
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

    // ✅ FIXED: Create user data with automatic terms acceptance
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone.trim(),
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
    const {email, password, rememberMe = false} = req.body;

    console.log("🔐 Login attempt:", {
      email,
      ip: clientIp,
      rememberMe,
      environment: process.env.NODE_ENV,
    });

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
        code: "MISSING_CREDENTIALS",
      });
    }

    // Find user with password using model static method
    const user = await User.findByEmailWithPassword(email);

    if (!user) {
      logger.warn("Login attempt with non-existent email", {
        email,
        ip: clientIp,
        userAgent: req.get("User-Agent"),
      });

      // Consistent timing to prevent enumeration
      await new Promise((resolve) => setTimeout(resolve, 100));

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
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
        ip: clientIp,
        loginAttempts: (user.loginAttempts || 0) + 1,
      });

      await createAuthAuditLog(user._id, "FAILED_LOGIN_ATTEMPT", {
        ip: clientIp,
        attempts: (user.loginAttempts || 0) + 1,
      });

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
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
};
