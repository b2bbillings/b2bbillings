const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');


// @desc    Verify JWT token
// @route   GET /api/auth/verify
// @access  Private
const verifyToken = async (req, res) => {
    try {
        console.log('🔍 Token verification request received');
        console.log('🔍 User from middleware:', req.user);
        
        // If we reach here, the token is valid (verified by auth middleware)
        const user = await User.findById(req.user.id).select('-password');
        
        if (!user) {
            console.log('❌ User not found for ID:', req.user.id);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.isActive) {
            console.log('❌ User account is inactive:', user.email);
            return res.status(401).json({
                success: false,
                message: 'Account is inactive'
            });
        }

        console.log('✅ Token verification successful for:', user.email);

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
                    createdAt: user.createdAt
                }
            }
        });
    } catch (error) {
        console.error('❌ Token verification error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};
// Helper function to generate user tokens
const generateUserTokens = (user) => {
    const payload = {
        id: user._id,
        email: user.email,
        role: user.role
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return { accessToken, refreshToken };
};

// Helper function to send user response
const sendUserResponse = (res, statusCode, user, message) => {
    const { accessToken, refreshToken } = generateUserTokens(user);

    res.status(statusCode).json({
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
                createdAt: user.createdAt
            },
            token: accessToken,
            refreshToken: refreshToken
        }
    });
};

// @desc    Register new user
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res) => {
    try {
        const { name, email, password, phone, companyName, companyAddress } = req.body;

        console.log('📝 Signup attempt for:', email);

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Check if phone number already exists
        const existingPhone = await User.findOne({ phone });
        if (existingPhone) {
            return res.status(400).json({
                success: false,
                message: 'User with this phone number already exists'
            });
        }

        // Create new user
        const user = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password,
            phone: phone.trim()
        });

        await user.save();
        console.log('✅ User created successfully:', user.email);

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // TODO: Create company if provided (we'll implement this later)
        if (companyName) {
            console.log('📝 Company creation requested:', companyName);
            // For now, just log it - we'll implement this later
        }

        sendUserResponse(res, 201, user, 'Account created successfully');

    } catch (error) {
        console.error('❌ Signup error:', error);

        if (error.code === 11000) {
            // Duplicate key error
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                success: false,
                message: `${field} already exists`
            });
        }

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: messages[0] || 'Validation error'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('🔐 Login attempt for:', email);

        // Find user with password field
        const user = await User.findByEmailWithPassword(email.toLowerCase().trim());

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if account is locked
        if (user.isLocked) {
            return res.status(423).json({
                success: false,
                message: 'Account temporarily locked due to too many failed login attempts. Please try again later.'
            });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account has been deactivated. Please contact support.'
            });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            // Increment login attempts
            await user.incLoginAttempts();

            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Reset login attempts on successful login
        if (user.loginAttempts > 0) {
            await user.resetLoginAttempts();
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        console.log('✅ Login successful for:', user.email);

        sendUserResponse(res, 200, user, 'Login successful');

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
    try {
        console.log('👋 Logout request from user:', req.user?.email);

        // TODO: Implement token blacklisting if needed
        // For now, client-side token removal is sufficient

        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('❌ Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during logout'
        });
    }
};



module.exports = {
    signup,
    login,
    logout,
    verifyToken
};