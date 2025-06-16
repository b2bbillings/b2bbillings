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
const salesOrderRoutes = require('./src/routes/salesOrderRoutes');
const purchaseRoutes = require('./src/routes/purchaseRoutes');
const purchaseOrderRoutes = require('./src/routes/purchaseOrderRoutes');
const bankAccountRoutes = require('./src/routes/bankAccountRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');

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

// ================================
// 🔄 ROUTES - PROPERLY ORGANIZED
// ================================

// Health check route (first)
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Shop Management API is running! 🚀',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        features: {
            companies: true,
            items: true,
            parties: true,
            sales: true,
            salesOrders: true,
            purchases: true,
            purchaseOrders: true,
            bankAccounts: true,
            transactions: true,
            payments: true,
            auth: true
        }
    });
});

// Auth routes (public - no company required)
app.use('/api/auth', authRoutes);

// ================================
// 💰 PAYMENT ROUTES (PRIORITY)
// ================================
// Payment routes need to be registered BEFORE parameterized routes
app.use('/api/payments', paymentRoutes);

// ================================
// 🏢 COMPANY ROUTES
// ================================
app.use('/api/companies', companyRoutes);

// ================================
// 🏢 COMPANY-SPECIFIC NESTED ROUTES
// ================================
// These routes are scoped to specific companies

// Items management
app.use('/api/companies/:companyId/items', itemRoutes);

// Party management
app.use('/api/companies/:companyId/parties', partyRoutes);

// Sales management
app.use('/api/companies/:companyId/sales', salesRoutes);

// Sales Order management
app.use('/api/companies/:companyId/sales-orders', salesOrderRoutes);

// Purchase management
app.use('/api/companies/:companyId/purchases', purchaseRoutes);

// Purchase Order management
app.use('/api/companies/:companyId/purchase-orders', purchaseOrderRoutes);

// Bank Account management
app.use('/api/companies/:companyId/bank-accounts', bankAccountRoutes);

// Transaction management (company-specific)
app.use('/api/companies/:companyId/transactions', transactionRoutes);

// Bank Account specific transactions
app.use('/api/companies/:companyId/bank-accounts/:bankAccountId/transactions', transactionRoutes);

// ================================
// 🔄 LEGACY ROUTES (BACKWARD COMPATIBILITY)
// ================================
// These routes maintain backward compatibility with existing frontend code

// Legacy party routes
app.use('/api/parties', partyRoutes);

// Legacy sales routes
app.use('/api/sales', salesRoutes);

// Legacy sales order routes
app.use('/api/sales-orders', salesOrderRoutes);

// Legacy purchase routes
app.use('/api/purchases', purchaseRoutes);

// Legacy purchase order routes
app.use('/api/purchase-orders', purchaseOrderRoutes);

// Legacy bank account routes
app.use('/api/bank-accounts', bankAccountRoutes);

// Legacy transaction routes (MUST BE LAST to avoid conflicts)
app.use('/api/transactions', transactionRoutes);

// ================================
// 📚 API DOCUMENTATION
// ================================
app.get('/api/docs', (req, res) => {
    res.json({
        title: 'Shop Management System API',
        version: '2.0.0',
        description: 'Complete business management system with sales, purchases, inventory, and financial tracking',
        baseUrl: `${req.protocol}://${req.get('host')}/api`,
        endpoints: {
            // Authentication
            auth: {
                base: '/api/auth',
                description: 'User authentication and authorization',
                endpoints: [
                    'POST /login - User login',
                    'POST /register - User registration',
                    'POST /refresh - Refresh token',
                    'POST /logout - User logout',
                    'GET /profile - Get user profile',
                    'PUT /profile - Update user profile'
                ]
            },

            // Company Management
            companies: {
                base: '/api/companies',
                description: 'Company and organization management',
                endpoints: [
                    'GET / - List all companies',
                    'POST / - Create new company',
                    'GET /:id - Get company details',
                    'PUT /:id - Update company',
                    'DELETE /:id - Delete company',
                    'GET /:id/dashboard - Company dashboard',
                    'GET /:id/settings - Company settings'
                ]
            },

            // Payment System
            payments: {
                base: '/api/payments',
                description: 'Payment processing and management',
                endpoints: [
                    'GET /test - Test payment system',
                    'GET /pending-invoices/:partyId - Get pending invoices for payment',
                    'POST /pay-in - Record payment received (Payment In)',
                    'POST /pay-out - Record payment made (Payment Out)',
                    'GET / - Get all payments with filters',
                    'GET /:paymentId - Get specific payment details',
                    'GET /party/:partyId/summary - Get party payment summary',
                    'PATCH /:paymentId/cancel - Cancel payment'
                ],
                features: [
                    'Payment In/Out processing',
                    'Invoice payment allocation',
                    'Multiple payment methods',
                    'Party balance management',
                    'Payment history tracking',
                    'Payment cancellation'
                ]
            },

            // Item Management
            items: {
                base: '/api/companies/:companyId/items',
                description: 'Product and service inventory management',
                endpoints: [
                    'GET / - List all items',
                    'POST / - Create new item',
                    'GET /:id - Get item details',
                    'PUT /:id - Update item',
                    'DELETE /:id - Delete item',
                    'GET /categories - Get item categories',
                    'POST /import - Bulk import items',
                    'GET /export - Export items'
                ]
            },

            // Party Management
            parties: {
                base: '/api/companies/:companyId/parties',
                description: 'Customer and supplier management',
                endpoints: [
                    'GET / - List all parties',
                    'POST / - Create new party',
                    'GET /:id - Get party details',
                    'PUT /:id - Update party',
                    'DELETE /:id - Delete party',
                    'GET /:id/transactions - Party transaction history',
                    'GET /:id/orders - Party order history',
                    'GET /:id/payments - Party payment history',
                    'GET /summary - Party summary statistics'
                ]
            },

            // Sales Management
            sales: {
                base: '/api/companies/:companyId/sales',
                description: 'Sales transaction management',
                endpoints: [
                    'GET / - List all sales',
                    'POST / - Create new sale',
                    'GET /:id - Get sale details',
                    'PUT /:id - Update sale',
                    'DELETE /:id - Delete sale',
                    'POST /:id/payment - Add payment to sale',
                    'GET /dashboard - Sales dashboard',
                    'GET /reports - Sales reports'
                ]
            },

            // Sales Order Management
            salesOrders: {
                base: '/api/companies/:companyId/sales-orders',
                description: 'Quotation, sales order, and proforma invoice management',
                endpoints: [
                    'GET / - List all sales orders',
                    'POST / - Create new sales order',
                    'GET /:id - Get sales order details',
                    'PUT /:id - Update sales order',
                    'DELETE /:id - Delete sales order',
                    'POST /:id/convert-to-invoice - Convert to invoice',
                    'PATCH /:id/status - Update order status',
                    'POST /:id/payment - Add payment',
                    'GET /quotations - Get quotations only',
                    'GET /orders - Get orders only',
                    'GET /proforma - Get proforma invoices only',
                    'GET /expired - Get expired quotations',
                    'GET /pending-payment - Get orders pending payment',
                    'GET /reports/dashboard - Sales order dashboard',
                    'GET /generate-number - Generate order number',
                    'GET /export/csv - Export to CSV'
                ],
                orderTypes: ['quotation', 'sales_order', 'proforma_invoice'],
                statuses: ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted', 'cancelled']
            },

            // Purchase Management
            purchases: {
                base: '/api/companies/:companyId/purchases',
                description: 'Purchase transaction management',
                endpoints: [
                    'GET / - List all purchases',
                    'POST / - Create new purchase',
                    'GET /:id - Get purchase details',
                    'PUT /:id - Update purchase',
                    'DELETE /:id - Delete purchase',
                    'POST /:id/payment - Add payment to purchase',
                    'GET /dashboard - Purchase dashboard',
                    'GET /reports - Purchase reports'
                ]
            },

            // Purchase Order Management
            purchaseOrders: {
                base: '/api/companies/:companyId/purchase-orders',
                description: 'Purchase quotation, order, and proforma purchase management',
                endpoints: [
                    'GET / - List all purchase orders',
                    'POST / - Create new purchase order',
                    'GET /:id - Get purchase order details',
                    'PUT /:id - Update purchase order',
                    'DELETE /:id - Delete purchase order',
                    'POST /:id/convert-to-invoice - Convert to purchase invoice',
                    'PATCH /:id/status - Update order status',
                    'POST /:id/payment - Add payment',
                    'GET /quotations - Get purchase quotations only',
                    'GET /orders - Get purchase orders only',
                    'GET /proforma - Get proforma purchases only',
                    'GET /expired - Get expired quotations',
                    'GET /pending-payment - Get orders pending payment',
                    'GET /awaiting-approval - Get orders awaiting approval',
                    'GET /reports/dashboard - Purchase order dashboard',
                    'GET /reports/supplier-performance - Supplier performance reports',
                    'GET /generate-number - Generate order number',
                    'GET /export/csv - Export to CSV',
                    'PATCH /bulk/status - Bulk status update',
                    'POST /bulk/convert - Bulk conversion',
                    'PATCH /bulk/approve - Bulk approval'
                ],
                orderTypes: ['purchase_quotation', 'purchase_order', 'proforma_purchase'],
                statuses: ['draft', 'sent', 'confirmed', 'received', 'partially_received', 'completed', 'cancelled']
            },

            // Bank Account Management
            bankAccounts: {
                base: '/api/companies/:companyId/bank-accounts',
                description: 'Bank account and financial management',
                endpoints: [
                    'GET / - List all bank accounts',
                    'POST / - Create new bank account',
                    'GET /:id - Get bank account details',
                    'PUT /:id - Update bank account',
                    'DELETE /:id - Delete bank account',
                    'GET /:id/transactions - Get account transactions',
                    'GET /:id/balance - Get account balance',
                    'GET /summary - Account summary',
                    'GET /validate - Validate account details',
                    'PATCH /:id/balance - Update account balance'
                ]
            },

            // Transaction Management
            transactions: {
                base: '/api/companies/:companyId/transactions',
                description: 'Financial transaction tracking and management',
                endpoints: [
                    'GET / - List all transactions',
                    'POST / - Create new transaction',
                    'GET /:id - Get transaction details',
                    'PUT /:id - Update transaction',
                    'DELETE /:id - Delete transaction',
                    'GET /summary - Transaction summary',
                    'PATCH /:id/reconcile - Reconcile transaction',
                    'GET /reports - Transaction reports'
                ],
                transactionTypes: [
                    'purchase', 'sale', 'payment_in', 'payment_out',
                    'expense', 'income', 'transfer', 'adjustment'
                ],
                paymentMethods: [
                    'cash', 'upi', 'bank_transfer', 'cheque', 'card',
                    'online', 'neft', 'rtgs', 'other'
                ]
            }
        },

        // System Features
        systemFeatures: {
            authentication: 'JWT-based authentication with refresh tokens',
            multiCompany: 'Multi-company support with data isolation',
            paymentProcessing: 'Comprehensive payment processing system',
            inventoryManagement: 'Product and service inventory tracking',
            partyManagement: 'Customer and supplier relationship management',
            orderManagement: 'Complete order lifecycle management',
            financialTracking: 'Bank account and transaction management',
            reporting: 'Business intelligence and reporting',
            bulkOperations: 'Bulk data processing capabilities',
            dataExport: 'CSV and Excel export functionality'
        },

        // API Usage Guidelines
        usage: {
            authentication: 'Include JWT token in Authorization header: Bearer <token>',
            companyId: 'Replace :companyId with actual company ID in URLs',
            pagination: 'Use ?page=1&limit=20 for paginated results',
            filtering: 'Use query parameters for filtering: ?status=active&type=customer',
            sorting: 'Use ?sortBy=createdAt&sortOrder=desc for sorting',
            search: 'Use ?search=keyword for text search'
        }
    });
});

// ================================
// ⚠️ ERROR HANDLING
// ================================

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Global Error Handler:', {
        error: err.message,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString(),
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    const isDevelopment = process.env.NODE_ENV === 'development';

    // Handle specific error types
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            status: 'error',
            message: 'Validation Error',
            errors: Object.values(err.errors).map(e => ({
                field: e.path,
                message: e.message,
                value: e.value
            }))
        });
    }

    if (err.name === 'CastError') {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid ID format',
            field: err.path,
            value: err.value
        });
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(409).json({
            status: 'error',
            message: 'Duplicate entry',
            field: field,
            value: err.keyValue[field]
        });
    }

    if (err.name === 'UnauthorizedError' || err.status === 401) {
        return res.status(401).json({
            status: 'error',
            message: 'Authentication required',
            code: 'UNAUTHORIZED'
        });
    }

    if (err.status === 403) {
        return res.status(403).json({
            status: 'error',
            message: 'Access denied',
            code: 'FORBIDDEN'
        });
    }

    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Internal Server Error',
        code: err.code || 'INTERNAL_ERROR',
        ...(isDevelopment && {
            stack: err.stack,
            details: err
        })
    });
});

// 404 handler for unmatched routes
app.use('*', (req, res) => {
    console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        status: 'error',
        message: `Route not found: ${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString(),
        availableEndpoints: {
            health: 'GET /api/health',
            documentation: 'GET /api/docs',
            authentication: 'POST /api/auth/*',
            companies: 'GET /api/companies',
            payments: 'GET /api/payments',
            companySpecific: {
                items: 'GET /api/companies/:companyId/items',
                parties: 'GET /api/companies/:companyId/parties',
                sales: 'GET /api/companies/:companyId/sales',
                salesOrders: 'GET /api/companies/:companyId/sales-orders',
                purchases: 'GET /api/companies/:companyId/purchases',
                purchaseOrders: 'GET /api/companies/:companyId/purchase-orders',
                bankAccounts: 'GET /api/companies/:companyId/bank-accounts',
                transactions: 'GET /api/companies/:companyId/transactions'
            }
        },
        hint: 'Visit /api/docs for complete API documentation'
    });
});

// ================================
// 🗄️ DATABASE CONNECTION
// ================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shop-management';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📁 Connected to MongoDB');
        console.log(`🗄️  Database: ${mongoose.connection.name}`);
        console.log(`🔗 Connection: ${MONGODB_URI}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    })
    .catch((error) => {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    });

// ================================
// 🚀 SERVER START
// ================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Shop Management System Backend Started!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🌐 Server: http://localhost:${PORT}`);
    console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
    console.log(`💰 Payments: http://localhost:${PORT}/api/payments`);
    console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Ready to handle requests!');
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔄 SIGTERM received, shutting down gracefully...');
    mongoose.connection.close(() => {
        console.log('📁 MongoDB connection closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🔄 SIGINT received, shutting down gracefully...');
    mongoose.connection.close(() => {
        console.log('📁 MongoDB connection closed');
        process.exit(0);
    });
});

module.exports = app;