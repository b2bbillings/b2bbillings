const jwt = require('jsonwebtoken');

const jwtConfig = {
    // JWT Secret (should be in environment variables)
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',

    // Token expiration times - Updated to match your .env file
    accessTokenExpiry: process.env.JWT_EXPIRE || process.env.JWT_ACCESS_EXPIRY || '7d', // Match your .env
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRE || process.env.JWT_REFRESH_EXPIRY || '30d',

    // JWT Options
    options: {
        issuer: process.env.JWT_ISSUER || 'shop-manager-api',
        audience: process.env.JWT_AUDIENCE || 'shop-manager-users'
    }
};

// Generate Access Token
const generateAccessToken = (payload) => {
    try {
        console.log('🔑 Generating access token for:', payload.email || payload.id);
        
        // Ensure payload has required fields
        const tokenPayload = {
            id: payload.id || payload._id,
            email: payload.email,
            role: payload.role || 'user',
            // Add timestamp for debugging
            iat: Math.floor(Date.now() / 1000)
        };

        const token = jwt.sign(
            tokenPayload,
            jwtConfig.secret,
            {
                expiresIn: jwtConfig.accessTokenExpiry,
                issuer: jwtConfig.options.issuer,
                audience: jwtConfig.options.audience,
                subject: String(payload.id || payload._id)
            }
        );

        console.log('✅ Access token generated successfully, expires in:', jwtConfig.accessTokenExpiry);
        return token;
    } catch (error) {
        console.error('❌ Error generating access token:', error);
        throw new Error('Failed to generate access token');
    }
};

// Generate Refresh Token
const generateRefreshToken = (payload) => {
    try {
        console.log('🔄 Generating refresh token for:', payload.email || payload.id);
        
        const tokenPayload = {
            id: payload.id || payload._id,
            email: payload.email,
            type: 'refresh',
            iat: Math.floor(Date.now() / 1000)
        };

        const token = jwt.sign(
            tokenPayload,
            jwtConfig.secret,
            {
                expiresIn: jwtConfig.refreshTokenExpiry,
                issuer: jwtConfig.options.issuer,
                audience: jwtConfig.options.audience,
                subject: String(payload.id || payload._id)
            }
        );

        console.log('✅ Refresh token generated successfully, expires in:', jwtConfig.refreshTokenExpiry);
        return token;
    } catch (error) {
        console.error('❌ Error generating refresh token:', error);
        throw new Error('Failed to generate refresh token');
    }
};

// Verify JWT Token (with proper error handling)
const verifyJWTToken = (token) => {
    try {
        console.log('🔍 Verifying JWT token...');
        
        if (!token) {
            throw new Error('No token provided');
        }

        const decoded = jwt.verify(token, jwtConfig.secret, {
            issuer: jwtConfig.options.issuer,
            audience: jwtConfig.options.audience
        });

        console.log('✅ JWT token verified successfully for user:', decoded.email || decoded.id);
        return decoded;
    } catch (error) {
        console.error('❌ JWT verification failed:', error.message);
        
        // Throw specific error types for better handling
        if (error.name === 'TokenExpiredError') {
            const expiredError = new Error('Token expired');
            expiredError.name = 'TokenExpiredError';
            expiredError.expiredAt = error.expiredAt;
            throw expiredError;
        }
        
        if (error.name === 'JsonWebTokenError') {
            const invalidError = new Error('Invalid token');
            invalidError.name = 'JsonWebTokenError';
            throw invalidError;
        }
        
        if (error.name === 'NotBeforeError') {
            const notActiveError = new Error('Token not active');
            notActiveError.name = 'NotBeforeError';
            throw notActiveError;
        }
        
        // Re-throw the original error if it's not a JWT error
        throw error;
    }
};

// Verify Token Without Throwing (returns null on failure)
const verifyJWTTokenSafe = (token) => {
    try {
        return verifyJWTToken(token);
    } catch (error) {
        console.log('🔍 Token verification failed (safe mode):', error.message);
        return null;
    }
};

// Decode Token (without verification) - useful for debugging
const decodeToken = (token) => {
    try {
        const decoded = jwt.decode(token, { complete: true });
        if (decoded) {
            console.log('📋 Token decoded:', {
                header: decoded.header,
                payload: {
                    id: decoded.payload.id,
                    email: decoded.payload.email,
                    exp: decoded.payload.exp,
                    iat: decoded.payload.iat,
                    expiresAt: new Date(decoded.payload.exp * 1000).toISOString()
                }
            });
        }
        return decoded;
    } catch (error) {
        console.error('❌ Error decoding token:', error);
        return null;
    }
};

// Check if token is expired (without verification)
const isTokenExpired = (token) => {
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) {
            return true;
        }
        
        const currentTime = Math.floor(Date.now() / 1000);
        const isExpired = decoded.exp < currentTime;
        
        if (isExpired) {
            console.log('⏰ Token expired at:', new Date(decoded.exp * 1000).toISOString());
        }
        
        return isExpired;
    } catch (error) {
        console.error('❌ Error checking token expiration:', error);
        return true;
    }
};

// Get token expiration time
const getTokenExpiration = (token) => {
    try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
            return new Date(decoded.exp * 1000);
        }
        return null;
    } catch (error) {
        console.error('❌ Error getting token expiration:', error);
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
    getTokenExpiration
};