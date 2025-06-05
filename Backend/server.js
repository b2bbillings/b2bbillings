const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const companyRoutes = require('./src/routes/companies');
const itemRoutes = require('./src/routes/items');
const authRoutes = require('./src/routes/authRoutes'); // Add auth routes

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    console.log('📋 Request params:', req.params);
    console.log('📋 Request query:', req.query);
    console.log('📋 Request body keys:', Object.keys(req.body || {}));
    next();
});

// Routes
// Auth routes (public)
app.use('/api/auth', authRoutes);

// Company routes
app.use('/api/companies', companyRoutes);

// Items routes - nested under companies
// ⭐ Make sure this line is exactly like this:
app.use('/api/companies/:companyId/items', itemRoutes);

// Health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Shop Management API is running! 🚀',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        endpoints: [
            'GET /api/health',
            // Auth endpoints
            'POST /api/auth/signup',
            'POST /api/auth/login',
            'POST /api/auth/logout',
            // Company endpoints
            'GET /api/companies',
            'POST /api/companies',
            'GET /api/companies/:id',
            'PUT /api/companies/:id',
            'DELETE /api/companies/:id',
            // Item endpoints
            'GET /api/companies/:companyId/items',
            'POST /api/companies/:companyId/items',
            'GET /api/companies/:companyId/items/:itemId',
            'PUT /api/companies/:companyId/items/:itemId',
            'DELETE /api/companies/:companyId/items/:itemId',
            'GET /api/companies/:companyId/items/search',
            'GET /api/companies/:companyId/items/categories'
        ]
    });
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Global Error Handler:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        params: req.params,
        body: req.body,
        timestamp: new Date().toISOString()
    });

    const isDevelopment = process.env.NODE_ENV === 'development';

    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Internal Server Error',
        ...(isDevelopment && {
            stack: err.stack,
            details: err
        })
    });
});

// 404 handler
app.use('*', (req, res) => {
    console.log(`🔍 404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        status: 'error',
        message: `Route not found: ${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString()
    });
});

// Database connection and server start
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shop-management';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => {
        console.log('📁 Connected to MongoDB');
        console.log(`🗄️  Database: ${mongoose.connection.name}`);
    })
    .catch((error) => {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Shop Management System Backend Started!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🌐 Server running on: http://localhost:${PORT}`);
    console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
    console.log('🔐 Auth Endpoints:');
    console.log(`   POST ${PORT}/api/auth/signup`);
    console.log(`   POST ${PORT}/api/auth/login`);
    console.log(`   POST ${PORT}/api/auth/logout`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

module.exports = app;