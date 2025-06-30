const jwt = require("jsonwebtoken");

const jwtConfig = {
  secret:
    process.env.JWT_SECRET ||
    "your-super-secret-jwt-key-change-this-in-production",
  accessTokenExpiry:
    process.env.JWT_EXPIRE || process.env.JWT_ACCESS_EXPIRY || "7d",
  refreshTokenExpiry:
    process.env.JWT_REFRESH_EXPIRE || process.env.JWT_REFRESH_EXPIRY || "30d",
  options: {
    issuer: process.env.JWT_ISSUER || "shop-manager-api",
    audience: process.env.JWT_AUDIENCE || "shop-manager-users",
  },
};

const generateAccessToken = (payload) => {
  try {
    const tokenPayload = {
      id: payload.id || payload._id,
      email: payload.email,
      role: payload.role || "user",
      iat: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(tokenPayload, jwtConfig.secret, {
      expiresIn: jwtConfig.accessTokenExpiry,
      issuer: jwtConfig.options.issuer,
      audience: jwtConfig.options.audience,
      subject: String(payload.id || payload._id),
    });

    return token;
  } catch (error) {
    throw new Error("Failed to generate access token");
  }
};

const generateRefreshToken = (payload) => {
  try {
    const tokenPayload = {
      id: payload.id || payload._id,
      email: payload.email,
      type: "refresh",
      iat: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(tokenPayload, jwtConfig.secret, {
      expiresIn: jwtConfig.refreshTokenExpiry,
      issuer: jwtConfig.options.issuer,
      audience: jwtConfig.options.audience,
      subject: String(payload.id || payload._id),
    });

    return token;
  } catch (error) {
    throw new Error("Failed to generate refresh token");
  }
};

const verifyJWTToken = (token) => {
  try {
    if (!token) {
      throw new Error("No token provided");
    }

    const decoded = jwt.verify(token, jwtConfig.secret, {
      issuer: jwtConfig.options.issuer,
      audience: jwtConfig.options.audience,
    });

    return decoded;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      const expiredError = new Error("Token expired");
      expiredError.name = "TokenExpiredError";
      expiredError.expiredAt = error.expiredAt;
      throw expiredError;
    }

    if (error.name === "JsonWebTokenError") {
      const invalidError = new Error("Invalid token");
      invalidError.name = "JsonWebTokenError";
      throw invalidError;
    }

    if (error.name === "NotBeforeError") {
      const notActiveError = new Error("Token not active");
      notActiveError.name = "NotBeforeError";
      throw notActiveError;
    }

    throw error;
  }
};

const verifyJWTTokenSafe = (token) => {
  try {
    return verifyJWTToken(token);
  } catch (error) {
    return null;
  }
};

const decodeToken = (token) => {
  try {
    const decoded = jwt.decode(token, {complete: true});
    return decoded;
  } catch (error) {
    return null;
  }
};

const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

const getTokenExpiration = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch (error) {
    return null;
  }
};

module.exports = {
  jwtConfig,
  generateAccessToken,
  generateRefreshToken,
  verifyJWTToken,
  verifyJWTTokenSafe,
  decodeToken,
  isTokenExpired,
  getTokenExpiration,
};
