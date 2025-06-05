const { verifyToken } = require('../config/jwt');
const User = require('../models/User');

// Middleware to authenticate and authorize requests
const authenticate = async (req, res, next) => {
    try {
        let token;

        // Get token from header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        // Check if token exists
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        try {
            // Verify token
            const decoded = verifyToken(token);

            // Get user from database
            const user = await User.findById(decoded.id);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token. User not found.'
                });
            }

            if (!user.isActive) {
                return res.status(401).json({
                    success: false,
                    message: 'Account has been deactivated.'
                });
            }

            // Add user to request object
            req.user = {
                id: user._id,
                email: user.email,
                role: user.role,
                name: user.name
            };

            next();
        } catch (tokenError) {
            if (tokenError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token has expired'
                });
            } else if (tokenError.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token'
                });
            } else {
                throw tokenError;
            }
        }
    } catch (error) {
        console.error('❌ Authentication middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during authentication'
        });
    }
};

// Middleware to check if user has required role
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. Please authenticate first.'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
        }

        next();
    };
};

// Middleware to check if user is admin
const requireAdmin = authorize('admin');

// Middleware to check if user is admin or manager
const requireAdminOrManager = authorize('admin', 'manager');

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (token) {
            try {
                const decoded = verifyToken(token);
                const user = await User.findById(decoded.id);

                if (user && user.isActive) {
                    req.user = {
                        id: user._id,
                        email: user.email,
                        role: user.role,
                        name: user.name
                    };
                }
            } catch (tokenError) {
                // Silent fail for optional auth
                console.log('Optional auth token error:', tokenError.message);
            }
        }

        next();
    } catch (error) {
        console.error('❌ Optional authentication error:', error);
        next(); // Continue even if there's an error
    }
};

module.exports = {
    authenticate,
    authorize,
    requireAdmin,
    requireAdminOrManager,
    optionalAuth
};