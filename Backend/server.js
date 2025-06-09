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
const bankAccountRoutes = require('./src/routes/bankAccountRoutes'); // ✅ Add bank account routes

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
// ✅ REORGANIZED: Better route organization with consistent patterns

// Auth routes (public)
app.use('/api/auth', authRoutes);

// ✅ IMPROVED: Company-level routes (nested structure)
app.use('/api/companies', companyRoutes);

// ✅ ENHANCED: Company-specific nested routes
// Items routes - nested under companies
app.use('/api/companies/:companyId/items', itemRoutes);

// Party routes - nested under companies  
app.use('/api/companies/:companyId/parties', partyRoutes);

// Sales routes - nested under companies
app.use('/api/companies/:companyId/sales', salesRoutes);

// Purchase routes - nested under companies
app.use('/api/companies/:companyId/purchases', purchaseRoutes);

// ✅ NEW: Bank Account routes - nested under companies
app.use('/api/companies/:companyId/bank-accounts', bankAccountRoutes);

// ✅ LEGACY: Keep these for backward compatibility (if needed)
app.use('/api/parties', partyRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api', purchaseRoutes); // Keep for existing endpoints

// Health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Shop Management API is running! 🚀',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        features: {
            companies: true,
            items: true,
            parties: true,
            sales: true,
            purchases: true,
            bankAccounts: true, // ✅ NEW
            payments: true,
            auth: true
        }
    });
});

// ✅ NEW: API documentation endpoint
app.get('/api/docs', (req, res) => {
    res.json({
        title: 'Shop Management System API',
        version: '1.0.0',
        endpoints: {
            auth: {
                base: '/api/auth',
                endpoints: ['POST /login', 'POST /register', 'POST /refresh', 'POST /logout']
            },
            companies: {
                base: '/api/companies',
                endpoints: ['GET /', 'POST /', 'GET /:id', 'PUT /:id', 'DELETE /:id']
            },
            items: {
                base: '/api/companies/:companyId/items',
                endpoints: ['GET /', 'POST /', 'GET /:id', 'PUT /:id', 'DELETE /:id', 'GET /categories']
            },
            parties: {
                base: '/api/companies/:companyId/parties',
                endpoints: ['GET /', 'POST /', 'GET /:id', 'PUT /:id', 'DELETE /:id', 'GET /summary']
            },
            sales: {
                base: '/api/companies/:companyId/sales',
                endpoints: ['GET /', 'POST /', 'GET /:id', 'PUT /:id', 'DELETE /:id', 'GET /dashboard']
            },
            purchases: {
                base: '/api/companies/:companyId/purchases',
                endpoints: ['GET /', 'POST /', 'GET /:id', 'PUT /:id', 'DELETE /:id', 'GET /dashboard']
            },
            bankAccounts: {
                base: '/api/companies/:companyId/bank-accounts',
                endpoints: [
                    'GET /',
                    'POST /',
                    'GET /:id',
                    'PUT /:id',
                    'DELETE /:id',
                    'GET /summary',
                    'GET /validate',
                    'PATCH /:id/balance'
                ]
            },
            payments: {
                base: '/api/payments',
                endpoints: ['GET /', 'POST /', 'GET /:id', 'PUT /:id', 'DELETE /:id']
            }
        }
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
            'GET /api/health - Health check',
            'GET /api/docs - API documentation',
            'POST /api/auth/* - Authentication',
            'GET /api/companies - Companies',
            'GET /api/companies/:companyId/items - Items',
            'GET /api/companies/:companyId/parties - Parties',
            'GET /api/companies/:companyId/sales - Sales',
            'GET /api/companies/:companyId/purchases - Purchases',
            'GET /api/companies/:companyId/bank-accounts - Bank Accounts', // ✅ NEW
            'GET /api/payments - Payments'
        ],
        hint: 'Visit /api/docs for complete API documentation'
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
    console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`); // ✅ NEW
    console.log('');
    console.log('🔗 Main Endpoints:');
    console.log(`   🔐 Auth: http://localhost:${PORT}/api/auth/*`);
    console.log(`   🏢 Companies: http://localhost:${PORT}/api/companies/*`);
    console.log('');
    console.log('📊 Company-Specific Endpoints:');
    console.log(`   📦 Items: http://localhost:${PORT}/api/companies/:companyId/items/*`);
    console.log(`   👥 Parties: http://localhost:${PORT}/api/companies/:companyId/parties/*`);
    console.log(`   💰 Sales: http://localhost:${PORT}/api/companies/:companyId/sales/*`);
    console.log(`   🛒 Purchases: http://localhost:${PORT}/api/companies/:companyId/purchases/*`);
    console.log(`   🏦 Bank Accounts: http://localhost:${PORT}/api/companies/:companyId/bank-accounts/*`); // ✅ NEW
    console.log('');
    console.log('🔄 Legacy Endpoints (for backward compatibility):');
    console.log(`   👥 Parties: http://localhost:${PORT}/api/parties/*`);
    console.log(`   💳 Payments: http://localhost:${PORT}/api/payments/*`);
    console.log(`   📊 Sales: http://localhost:${PORT}/api/sales/*`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

module.exports = app;