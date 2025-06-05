const express = require('express');
const router = express.Router();

// Import controllers
const {
    signup,
    login,
    logout
} = require('../controllers/authController');

// Import middleware
const { authenticate } = require('../middleware/authMiddleware');
const {
    validateSignup,
    validateLogin
} = require('../middleware/validation');

// Public routes
router.post('/signup', validateSignup, signup);
router.post('/login', validateLogin, login);

// Protected routes (require authentication)
router.post('/logout', authenticate, logout);

module.exports = router;