const jwt = require('jsonwebtoken');

const jwtConfig = {
    // JWT Secret (should be in environment variables)
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',

    // Token expiration times
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',

    // JWT Options
    options: {
        issuer: process.env.JWT_ISSUER || 'shopmanager-app',
        audience: process.env.JWT_AUDIENCE || 'shopmanager-users'
    }
};

// Generate Access Token
const generateAccessToken = (payload) => {
    return jwt.sign(
        payload,
        jwtConfig.secret,
        {
            expiresIn: jwtConfig.accessTokenExpiry,
            issuer: jwtConfig.options.issuer,
            audience: jwtConfig.options.audience
        }
    );
};

// Generate Refresh Token
const generateRefreshToken = (payload) => {
    return jwt.sign(
        payload,
        jwtConfig.secret,
        {
            expiresIn: jwtConfig.refreshTokenExpiry,
            issuer: jwtConfig.options.issuer,
            audience: jwtConfig.options.audience
        }
    );
};

// Verify Token
const verifyToken = (token) => {
    return jwt.verify(token, jwtConfig.secret, {
        issuer: jwtConfig.options.issuer,
        audience: jwtConfig.options.audience
    });
};

// Decode Token (without verification)
const decodeToken = (token) => {
    return jwt.decode(token);
};

module.exports = {
    jwtConfig,
    generateAccessToken,
    generateRefreshToken,
    verifyToken,
    decodeToken
};