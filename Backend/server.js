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
const authRoutes = require('./src/routes/authRoutes');
const partyRoutes = require('./src/routes/partyRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const salesRoutes = require('./src/routes/salesRoutes');
const purchaseRoutes = require('./src/routes/purchaseRoutes');

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

// Request logging middleware (only in development)
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
        next();
    });
}

// Routes
// Auth routes (public)
app.use('/api/auth', authRoutes);

// Company routes
app.use('/api/companies', companyRoutes);

// Party routes
app.use('/api/parties', partyRoutes);

// Payment routes
app.use('/api/payments', paymentRoutes);

// Sales routes
app.use('/api/sales', salesRoutes);

// ✅ FIX: Mount purchase routes at /api instead of /api/purchases
// This allows routes like /companies/:companyId/purchases to work
app.use('/api', purchaseRoutes);

// Items routes - nested under companies
app.use('/api/companies/:companyId/items', itemRoutes);

// Health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Shop Management API is running! 🚀',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Global Error Handler:', {
        error: err.message,
        url: req.url,
        method: req.method,
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
    console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        status: 'error',
        message: `Route not found: ${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString(),
        availableRoutes: [
            'GET /api/health',
            'POST /api/companies/:companyId/purchases',
            'GET /api/companies/:companyId/purchases',
            'GET /api/companies/:companyId/purchases/dashboard'
        ]
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
    console.log('');
    console.log('🔗 Main Endpoints:');
    console.log(`   🔐 Auth: http://localhost:${PORT}/api/auth/*`);
    console.log(`   🏢 Companies: http://localhost:${PORT}/api/companies/*`);
    console.log(`   👥 Parties: http://localhost:${PORT}/api/parties/*`);
    console.log(`   💰 Payments: http://localhost:${PORT}/api/payments/*`);
    console.log(`   📊 Sales: http://localhost:${PORT}/api/sales/*`);
    console.log(`   🛒 Purchases: http://localhost:${PORT}/api/companies/:companyId/purchases/*`); // ✅ Updated
    console.log(`   📦 Items: http://localhost:${PORT}/api/companies/:companyId/items/*`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

module.exports = app;