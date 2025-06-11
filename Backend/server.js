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
const bankAccountRoutes = require('./src/routes/bankAccountRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes'); // ✅ NEW: Add transaction routes

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

// ✅ Company-specific nested routes (BEFORE legacy routes)
app.use('/api/companies/:companyId/items', itemRoutes);
app.use('/api/companies/:companyId/parties', partyRoutes);
app.use('/api/companies/:companyId/sales', salesRoutes);
app.use('/api/companies/:companyId/purchases', purchaseRoutes);
app.use('/api/companies/:companyId/bank-accounts', bankAccountRoutes);

// ✅ Transaction routes - Company-specific FIRST
app.use('/api/companies/:companyId/transactions', transactionRoutes);
app.use('/api/companies/:companyId/bank-accounts/:bankAccountId/transactions', transactionRoutes);

app.use('/api/parties', partyRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/transactions', transactionRoutes); // This should be LAST


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
            bankAccounts: true,
            transactions: true, // ✅ NEW
            payments: true,
            auth: true
        }
    });
});

// ✅ UPDATED: API documentation endpoint
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
            // ✅ NEW: Transaction endpoints
            transactions: {
                base: '/api/companies/:companyId/transactions',
                endpoints: [
                    'GET /',
                    'POST /',
                    'GET /:id',
                    'GET /summary',
                    'PATCH /:id/reconcile'
                ],
                bankAccountTransactions: {
                    base: '/api/companies/:companyId/bank-accounts/:bankAccountId/transactions',
                    endpoints: ['GET /']
                },
                legacy: {
                    base: '/api/transactions',
                    endpoints: ['GET /', 'POST /', 'GET /:id']
                }
            },
            payments: {
                base: '/api/payments',
                endpoints: ['GET /', 'POST /', 'GET /:id', 'PUT /:id', 'DELETE /:id']
            }
        },
        // ✅ NEW: Transaction system documentation
        transactionSystem: {
            description: 'Automated bank transaction tracking for purchases and sales',
            features: [
                'Automatic transaction creation on purchase/sale',
                'Real-time bank balance updates',
                'Transaction reconciliation',
                'Payment method tracking',
                'Party-wise transaction history'
            ],
            transactionTypes: [
                'purchase - Purchase payments to suppliers',
                'sale - Sales receipts from customers',
                'payment_in - Direct payments received',
                'payment_out - Direct payments made',
                'expense - Business expenses',
                'income - Business income',
                'transfer - Inter-account transfers',
                'adjustment - Balance adjustments'
            ]
        }
    });
});

// ✅ NEW: Transaction system test endpoint
app.get('/api/transactions/test', (req, res) => {
    res.json({
        success: true,
        message: 'Transaction system is operational! 🏦',
        timestamp: new Date().toISOString(),
        features: {
            automaticTransactionCreation: true,
            bankBalanceUpdates: true,
            paymentMethodTracking: true,
            reconciliation: true,
            partyTracking: true
        },
        supportedPaymentMethods: [
            'cash',
            'upi',
            'bank_transfer',
            'cheque',
            'card',
            'online',
            'neft',
            'rtgs'
        ],
        endpoints: {
            companyTransactions: '/api/companies/:companyId/transactions',
            bankAccountTransactions: '/api/companies/:companyId/bank-accounts/:bankAccountId/transactions',
            transactionSummary: '/api/companies/:companyId/transactions/summary',
            createTransaction: 'POST /api/companies/:companyId/transactions',
            reconcileTransaction: 'PATCH /api/companies/:companyId/transactions/:id/reconcile'
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

// ✅ UPDATED: 404 handler with transaction routes
app.use('*', (req, res) => {
    console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        status: 'error',
        message: `Route not found: ${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString(),
        availableRoutes: [
            'GET /api/health - Health check',
            'GET /api/docs - API documentation',
            'GET /api/transactions/test - Transaction system test', // ✅ NEW
            'POST /api/auth/* - Authentication',
            'GET /api/companies - Companies',
            'GET /api/companies/:companyId/items - Items',
            'GET /api/companies/:companyId/parties - Parties',
            'GET /api/companies/:companyId/sales - Sales',
            'GET /api/companies/:companyId/purchases - Purchases',
            'GET /api/companies/:companyId/bank-accounts - Bank Accounts',
            'GET /api/companies/:companyId/transactions - Transactions', // ✅ NEW
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

        // ✅ NEW: Log transaction system status
        console.log('🏦 Transaction System: Ready');
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
    console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
    console.log(`🏦 Transactions Test: http://localhost:${PORT}/api/transactions/test`); // ✅ NEW
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
    console.log(`   🏦 Bank Accounts: http://localhost:${PORT}/api/companies/:companyId/bank-accounts/*`);
    console.log(`   💳 Transactions: http://localhost:${PORT}/api/companies/:companyId/transactions/*`); // ✅ NEW
    console.log('');
    console.log('🔄 Legacy Endpoints (for backward compatibility):');
    console.log(`   👥 Parties: http://localhost:${PORT}/api/parties/*`);
    console.log(`   💳 Payments: http://localhost:${PORT}/api/payments/*`);
    console.log(`   📊 Sales: http://localhost:${PORT}/api/sales/*`);
    console.log(`   🏦 Transactions: http://localhost:${PORT}/api/transactions/*`); // ✅ NEW
    console.log('');
    console.log('🏦 Transaction System Features:');
    console.log('   ✅ Automatic transaction creation on purchase/sale');
    console.log('   ✅ Real-time bank balance updates');
    console.log('   ✅ Transaction reconciliation support');
    console.log('   ✅ Payment method tracking (Cash, UPI, Bank, Cheque, etc.)');
    console.log('   ✅ Party-wise transaction history');
    console.log('   ✅ Transaction summaries and reporting');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

module.exports = app;