const jwt = require('jsonwebtoken');
const { verifyJWTToken, isTokenExpired, decodeToken } = require('../config/jwt'); 
const User = require('../models/User');

// Middleware to authenticate and authorize requests
const authenticate = async (req, res, next) => {
    try {
        console.log('🔐 Authentication middleware called for:', req.method, req.path);
        console.log('🔐 Headers received:', {
            authorization: req.headers.authorization ? 'Present' : 'Missing',
            'x-company-id': req.headers['x-company-id'] || 'None',
            'user-agent': req.headers['user-agent'] ? 'Present' : 'Missing'
        });
        
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('❌ No valid authorization header');
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.',
                code: 'NO_TOKEN'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        console.log('🔐 Token extracted, length:', token.length);
        
        if (!token) {
            console.log('❌ Empty token');
            return res.status(401).json({
                success: false,
                message: 'Access denied. Invalid token format.',
                code: 'INVALID_TOKEN_FORMAT'
            });
        }

        // Quick check if token is expired (without verification)
        if (isTokenExpired(token)) {
            console.log('⏰ Token is expired (quick check)');
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please login again.',
                code: 'TOKEN_EXPIRED'
            });
        }

        // Verify the token using utility function from jwt.js
        console.log('🔐 Verifying token...');
        const decoded = verifyJWTToken(token);
        console.log('✅ Token decoded successfully:', { 
            id: decoded.id, 
            email: decoded.email,
            role: decoded.role,
            exp: new Date(decoded.exp * 1000).toISOString()
        });

        // Optionally verify user still exists and is active
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            console.log('❌ User not found for token ID:', decoded.id);
            return res.status(401).json({
                success: false,
                message: 'User not found. Please login again.',
                code: 'USER_NOT_FOUND'
            });
        }

        if (!user.isActive) {
            console.log('❌ User account is inactive:', user.email);
            return res.status(401).json({
                success: false,
                message: 'Account is inactive. Please contact administrator.',
                code: 'ACCOUNT_INACTIVE'
            });
        }

        // Add comprehensive user info to request object
        req.user = {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            phone: user.phone,
            isActive: user.isActive,
            // Include company ID from headers if available
            currentCompany: req.headers['x-company-id'] || null,
            // Token info for debugging
            tokenExp: decoded.exp,
            tokenIat: decoded.iat
        };

        console.log('✅ User authenticated successfully:', {
            email: user.email,
            role: user.role,
            currentCompany: req.user.currentCompany
        });
        
        next();
    } catch (error) {
        console.error('❌ Authentication error:', {
            name: error.name,
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
        
        // Handle specific JWT errors
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please login again.',
                code: 'TOKEN_EXPIRED',
                expiredAt: error.expiredAt
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. Please login again.',
                code: 'INVALID_TOKEN'
            });
        }

        if (error.name === 'NotBeforeError') {
            return res.status(401).json({
                success: false,
                message: 'Token not active yet.',
                code: 'TOKEN_NOT_ACTIVE'
            });
        }
        
        // Generic authentication error
        return res.status(401).json({
            success: false,
            message: 'Authentication failed. Please login again.',
            code: 'AUTH_FAILED'
        });
    }
};

// Middleware to check if user has required role
const authorize = (...roles) => {
    return (req, res, next) => {
        console.log('🔑 Authorization check for roles:', roles);
        console.log('🔑 User role:', req.user?.role);

        if (!req.user) {
            console.log('❌ No user in request object');
            return res.status(401).json({
                success: false,
                message: 'Access denied. Please authenticate first.',
                code: 'NOT_AUTHENTICATED'
            });
        }

        if (!roles.includes(req.user.role)) {
            console.log('❌ Insufficient permissions. Required:', roles, 'Has:', req.user.role);
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.',
                code: 'INSUFFICIENT_PERMISSIONS',
                required: roles,
                current: req.user.role
            });
        }

        console.log('✅ Authorization successful for role:', req.user.role);
        next();
    };
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    console.log('👑 Admin access required');
    return authorize('admin')(req, res, next);
};

// Middleware to check if user is admin or manager
const requireAdminOrManager = (req, res, next) => {
    console.log('👔 Admin or Manager access required');
    return authorize('admin', 'manager')(req, res, next);
};

// Middleware to check if user is manager or above
const requireManagerOrAbove = (req, res, next) => {
    console.log('📊 Manager or above access required');
    return authorize('admin', 'manager')(req, res, next);
};

// Middleware to check if user is employee or above
const requireEmployee = (req, res, next) => {
    console.log('👤 Employee access required');
    return authorize('admin', 'manager', 'employee')(req, res, next);
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    try {
        console.log('🔓 Optional authentication called');
        
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.substring(7);
        }

        if (token) {
            try {
                console.log('🔓 Optional auth: Verifying token...');
                
                // Quick expiry check
                if (isTokenExpired(token)) {
                    console.log('🔓 Optional auth: Token expired, continuing without auth');
                    return next();
                }

                const decoded = verifyJWTToken(token);
                const user = await User.findById(decoded.id).select('-password');

                if (user && user.isActive) {
                    req.user = {
                        id: user._id,
                        email: user.email,
                        role: user.role,
                        name: user.name,
                        phone: user.phone,
                        isActive: user.isActive,
                        currentCompany: req.headers['x-company-id'] || null,
                        tokenExp: decoded.exp,
                        tokenIat: decoded.iat
                    };
                    console.log('✅ Optional auth successful for:', user.email);
                } else {
                    console.log('🔓 Optional auth: User not found or inactive');
                }
            } catch (tokenError) {
                // Silent fail for optional auth
                console.log('🔓 Optional auth token error:', tokenError.message);
            }
        } else {
            console.log('🔓 Optional auth: No token provided');
        }

        next();
    } catch (error) {
        console.error('❌ Optional authentication error:', error);
        next(); // Continue even if there's an error
    }
};

// Middleware to verify company access
const requireCompanyAccess = async (req, res, next) => {
    try {
        console.log('🏢 Company access verification');

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required for company access',
                code: 'NOT_AUTHENTICATED'
            });
        }

        const companyId = req.user.currentCompany || 
                         req.headers['x-company-id'] || 
                         req.body.companyId || 
                         req.params.companyId ||
                         req.query.companyId;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company selection required',
                code: 'COMPANY_REQUIRED'
            });
        }

        // Add company context to request
        req.companyId = companyId;
        console.log('✅ Company access granted for:', companyId);

        next();
    } catch (error) {
        console.error('❌ Company access verification error:', error);
        return res.status(500).json({
            success: false,
            message: 'Company access verification failed',
            code: 'COMPANY_ACCESS_ERROR'
        });
    }
};

// Debug middleware to log authentication state
const debugAuth = (req, res, next) => {
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_MODE === 'true') {
        console.log('🐛 Debug Auth State:', {
            path: req.path,
            method: req.method,
            hasUser: !!req.user,
            userId: req.user?.id,
            userEmail: req.user?.email,
            userRole: req.user?.role,
            companyId: req.user?.currentCompany || req.headers['x-company-id'],
            headers: {
                authorization: req.headers.authorization ? 'Present' : 'Missing',
                'x-company-id': req.headers['x-company-id'] || 'None'
            }
        });
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
    optionalAuth,
    requireCompanyAccess,
    debugAuth
};