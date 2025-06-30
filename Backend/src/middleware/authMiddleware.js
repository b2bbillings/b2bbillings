const jwt = require("jsonwebtoken");
const {verifyJWTToken, isTokenExpired, decodeToken} = require("../config/jwt");
const User = require("../models/User");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
        code: "NO_TOKEN",
      });
    }

    const token = authHeader.substring(7);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Invalid token format.",
        code: "INVALID_TOKEN_FORMAT",
      });
    }

    if (isTokenExpired(token)) {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
        code: "TOKEN_EXPIRED",
      });
    }

    const decoded = verifyJWTToken(token);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please login again.",
        code: "USER_NOT_FOUND",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is inactive. Please contact administrator.",
        code: "ACCOUNT_INACTIVE",
      });
    }

    req.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      isActive: user.isActive,
      currentCompany: req.headers["x-company-id"] || null,
      tokenExp: decoded.exp,
      tokenIat: decoded.iat,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
        code: "TOKEN_EXPIRED",
        expiredAt: error.expiredAt,
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again.",
        code: "INVALID_TOKEN",
      });
    }

    if (error.name === "NotBeforeError") {
      return res.status(401).json({
        success: false,
        message: "Token not active yet.",
        code: "TOKEN_NOT_ACTIVE",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Authentication failed. Please login again.",
      code: "AUTH_FAILED",
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Please authenticate first.",
        code: "NOT_AUTHENTICATED",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
        code: "INSUFFICIENT_PERMISSIONS",
        required: roles,
        current: req.user.role,
      });
    }

    next();
  };
};

const requireAdmin = (req, res, next) => {
  return authorize("admin")(req, res, next);
};

const requireAdminOrManager = (req, res, next) => {
  return authorize("admin", "manager")(req, res, next);
};

const requireManagerOrAbove = (req, res, next) => {
  return authorize("admin", "manager")(req, res, next);
};

const requireEmployee = (req, res, next) => {
  return authorize("admin", "manager", "employee")(req, res, next);
};

const requireViewer = (req, res, next) => {
  return authorize("admin", "manager", "employee", "viewer")(req, res, next);
};

const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.substring(7);
    }

    if (token) {
      try {
        if (isTokenExpired(token)) {
          return next();
        }

        const decoded = verifyJWTToken(token);
        const user = await User.findById(decoded.id).select("-password");

        if (user && user.isActive) {
          req.user = {
            id: user._id,
            email: user.email,
            role: user.role,
            name: user.name,
            phone: user.phone,
            isActive: user.isActive,
            currentCompany: req.headers["x-company-id"] || null,
            tokenExp: decoded.exp,
            tokenIat: decoded.iat,
          };
        }
      } catch (tokenError) {
        // Silent fail for optional auth
      }
    }

    next();
  } catch (error) {
    next();
  }
};

const requireCompanyAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required for company access",
        code: "NOT_AUTHENTICATED",
      });
    }

    const companyId =
      req.params.companyId ||
      req.user.currentCompany ||
      req.headers["x-company-id"] ||
      req.body.companyId ||
      req.query.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message:
          "Company selection required. Please provide company ID in URL, headers, or request body.",
        code: "COMPANY_REQUIRED",
        hint: "Add company ID as URL parameter, x-company-id header, or in request body",
      });
    }

    if (!companyId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID format",
        code: "INVALID_COMPANY_ID",
        provided: companyId,
      });
    }

    req.companyId = companyId;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Company access verification failed",
      code: "COMPANY_ACCESS_ERROR",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const requireBankAccess = (operation = "read") => {
  return (req, res, next) => {
    const role = req.user?.role;

    const permissions = {
      read: ["admin", "manager", "employee", "viewer", "user"],
      create: ["admin", "manager", "employee", "user"],
      update: ["admin", "manager", "employee", "user"],
      delete: ["admin", "manager", "user"],
      balance: ["admin", "manager", "user"],
    };

    const allowedRoles = permissions[operation] || permissions.read;

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${operation} operation requires one of: ${allowedRoles.join(
          ", "
        )}`,
        code: "INSUFFICIENT_BANK_PERMISSIONS",
        operation,
        required: allowedRoles,
        current: role,
        hint: "Your account needs higher permissions for this operation",
      });
    }

    next();
  };
};

const checkRateLimit = (req, res, next) => {
  if (req.user) {
    req.rateLimit = {
      remaining: 100,
      reset: Date.now() + 3600000,
    };
  }
  next();
};

const validateRequest = (req, res, next) => {
  const contentLength = req.headers["content-length"];
  if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) {
    return res.status(413).json({
      success: false,
      message: "Request too large",
      code: "REQUEST_TOO_LARGE",
      limit: "50MB",
    });
  }
  next();
};

const debugAuth = (req, res, next) => {
  if (process.env.NODE_ENV === "development") {
    // Only keep minimal debug info in development
    req.debugInfo = {
      timestamp: new Date().toISOString(),
      path: req.path,
      hasUser: !!req.user,
      userRole: req.user?.role,
    };
  }
  next();
};

module.exports = {
  authenticate,
  authorize,
  requireAdmin,
  requireAdminOrManager,
  requireManagerOrAbove,
  requireEmployee,
  requireViewer,
  optionalAuth,
  requireCompanyAccess,
  requireBankAccess,
  checkRateLimit,
  validateRequest,
  debugAuth,
};
