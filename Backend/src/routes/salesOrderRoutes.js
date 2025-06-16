const express = require('express');
const router = express.Router();
const salesOrderController = require('../controllers/salesOrderController');

// Middleware for validation
const validateRequest = (req, res, next) => {
    next();
};

// Authentication middleware
const authenticate = (req, res, next) => {
    next();
};

// Company validation middleware
const validateCompany = (req, res, next) => {
    const companyId = req.query.companyId || req.body.companyId;
    if (!companyId) {
        return res.status(400).json({
            success: false,
            message: 'Company ID is required'
        });
    }
    next();
};

// Order type validation middleware
const validateOrderType = (req, res, next) => {
    const orderType = req.body.orderType || req.query.orderType;
    if (orderType && !['quotation', 'sales_order', 'proforma_invoice'].includes(orderType)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid order type. Must be quotation, sales_order, or proforma_invoice'
        });
    }
    next();
};

// ==================== UTILITY ROUTES (MUST BE FIRST) ====================

/**
 * @route   GET /api/sales-orders/generate-number
 * @desc    Generate next order number
 * @access  Private
 * @query   companyId, orderType
 */
router.get('/generate-number', authenticate, validateCompany, salesOrderController.generateOrderNumber);

/**
 * @route   GET /api/sales-orders/next-order-number
 * @desc    Get next available order number (alternative endpoint)
 * @access  Private
 */
router.get('/next-order-number', authenticate, validateCompany, salesOrderController.generateOrderNumber);

/**
 * @route   GET /api/sales-orders/next-number
 * @desc    Get next available order number (another alternative)
 * @access  Private
 */
router.get('/next-number', authenticate, validateCompany, salesOrderController.generateOrderNumber);

// ==================== REPORTING ROUTES (BEFORE PARAMETER ROUTES) ====================

/**
 * @route   GET /api/sales-orders/reports/dashboard
 * @desc    Get sales order dashboard summary
 * @access  Private
 */
router.get('/reports/dashboard', authenticate, validateCompany, salesOrderController.getDashboardSummary);

/**
 * @route   GET /api/sales-orders/reports/summary
 * @desc    Get sales order summary report for date range
 * @access  Private
 */
router.get('/reports/summary', authenticate, validateCompany, (req, res, next) => {
    req.query.page = 1;
    req.query.limit = 1000;
    next();
}, salesOrderController.getAllSalesOrders);

/**
 * @route   GET /api/sales-orders/reports/conversion-rate
 * @desc    Get order to invoice conversion rate analysis
 * @access  Private
 */
router.get('/reports/conversion-rate', authenticate, validateCompany, async (req, res) => {
    try {
        const { companyId } = req.query;
        const SalesOrder = require('../models/SalesOrder');

        const conversionStats = await SalesOrder.aggregate([
            { $match: { companyId: new require('mongoose').Types.ObjectId(companyId) } },
            {
                $group: {
                    _id: '$orderType',
                    totalOrders: { $sum: 1 },
                    convertedOrders: { $sum: { $cond: ['$convertedToInvoice', 1, 0] } },
                    totalValue: { $sum: '$totals.finalTotal' },
                    convertedValue: {
                        $sum: {
                            $cond: ['$convertedToInvoice', '$totals.finalTotal', 0]
                        }
                    }
                }
            },
            {
                $project: {
                    orderType: '$_id',
                    totalOrders: 1,
                    convertedOrders: 1,
                    conversionRate: {
                        $multiply: [
                            { $divide: ['$convertedOrders', '$totalOrders'] },
                            100
                        ]
                    },
                    totalValue: 1,
                    convertedValue: 1,
                    valueConversionRate: {
                        $multiply: [
                            { $divide: ['$convertedValue', '$totalValue'] },
                            100
                        ]
                    }
                }
            }
        ]);

        res.json({
            success: true,
            data: conversionStats,
            message: 'Conversion rate analysis retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get conversion rate analysis',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/sales-orders/reports/aging
 * @desc    Get sales order aging report
 * @access  Private
 */
router.get('/reports/aging', authenticate, validateCompany, async (req, res) => {
    try {
        const { companyId } = req.query;
        const SalesOrder = require('../models/SalesOrder');
        const today = new Date();

        const agingReport = await SalesOrder.aggregate([
            {
                $match: {
                    companyId: new require('mongoose').Types.ObjectId(companyId),
                    status: { $nin: ['cancelled', 'converted'] }
                }
            },
            {
                $addFields: {
                    ageInDays: {
                        $divide: [
                            { $subtract: [today, '$createdAt'] },
                            1000 * 60 * 60 * 24
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: {
                        range: {
                            $switch: {
                                branches: [
                                    { case: { $lte: ['$ageInDays', 7] }, then: '0-7 days' },
                                    { case: { $lte: ['$ageInDays', 30] }, then: '8-30 days' },
                                    { case: { $lte: ['$ageInDays', 60] }, then: '31-60 days' },
                                    { case: { $lte: ['$ageInDays', 90] }, then: '61-90 days' }
                                ],
                                default: '90+ days'
                            }
                        }
                    },
                    count: { $sum: 1 },
                    totalValue: { $sum: '$totals.finalTotal' }
                }
            },
            { $sort: { '_id.range': 1 } }
        ]);

        res.json({
            success: true,
            data: agingReport,
            message: 'Aging report retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get aging report',
            error: error.message
        });
    }
});

// ==================== FILTERING ROUTES (BEFORE PARAMETER ROUTES) ====================

/**
 * @route   GET /api/sales-orders/by-type/:orderType
 * @desc    Get orders by type (quotation, sales_order, proforma_invoice)
 * @access  Private
 */
router.get('/by-type/:orderType', authenticate, validateCompany, (req, res, next) => {
    req.query.orderType = req.params.orderType;
    next();
}, salesOrderController.getAllSalesOrders);

/**
 * @route   GET /api/sales-orders/quotations
 * @desc    Get all quotations
 * @access  Private
 */
router.get('/quotations', authenticate, validateCompany, (req, res, next) => {
    req.query.orderType = 'quotation';
    next();
}, salesOrderController.getAllSalesOrders);

/**
 * @route   GET /api/sales-orders/orders
 * @desc    Get all sales orders
 * @access  Private
 */
router.get('/orders', authenticate, validateCompany, (req, res, next) => {
    req.query.orderType = 'sales_order';
    next();
}, salesOrderController.getAllSalesOrders);

/**
 * @route   GET /api/sales-orders/proforma
 * @desc    Get all proforma invoices
 * @access  Private
 */
router.get('/proforma', authenticate, validateCompany, (req, res, next) => {
    req.query.orderType = 'proforma_invoice';
    next();
}, salesOrderController.getAllSalesOrders);

/**
 * @route   GET /api/sales-orders/by-status/:status
 * @desc    Get orders by status
 * @access  Private
 */
router.get('/by-status/:status', authenticate, validateCompany, (req, res, next) => {
    req.query.status = req.params.status;
    next();
}, salesOrderController.getAllSalesOrders);

/**
 * @route   GET /api/sales-orders/draft
 * @desc    Get draft orders
 * @access  Private
 */
router.get('/draft', authenticate, validateCompany, (req, res, next) => {
    req.query.status = 'draft';
    next();
}, salesOrderController.getAllSalesOrders);

/**
 * @route   GET /api/sales-orders/pending
 * @desc    Get pending orders (draft + sent)
 * @access  Private
 */
router.get('/pending', authenticate, validateCompany, (req, res, next) => {
    req.query.status = 'draft,sent';
    next();
}, salesOrderController.getAllSalesOrders);

/**
 * @route   GET /api/sales-orders/active
 * @desc    Get active orders (not cancelled, expired, or converted)
 * @access  Private
 */
router.get('/active', authenticate, validateCompany, (req, res, next) => {
    req.query.status = 'draft,sent,accepted';
    next();
}, salesOrderController.getAllSalesOrders);

/**
 * @route   GET /api/sales-orders/converted
 * @desc    Get converted orders
 * @access  Private
 */
router.get('/converted', authenticate, validateCompany, (req, res, next) => {
    req.query.status = 'converted';
    next();
}, salesOrderController.getAllSalesOrders);

/**
 * @route   GET /api/sales-orders/expired
 * @desc    Get expired sales orders/quotations
 * @access  Private
 */
router.get('/expired', authenticate, validateCompany, salesOrderController.getExpiredOrders);

/**
 * @route   GET /api/sales-orders/expiring-soon
 * @desc    Get orders expiring within next 7 days
 * @access  Private
 */
router.get('/expiring-soon', authenticate, validateCompany, (req, res, next) => {
    const today = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(today.getDate() + 7);

    req.query.validFrom = today.toISOString();
    req.query.validTo = weekFromNow.toISOString();
    req.query.status = 'draft,sent,accepted';
    next();
}, salesOrderController.getAllSalesOrders);

/**
 * @route   GET /api/sales-orders/pending-payment
 * @desc    Get sales orders with pending payments
 * @access  Private
 */
router.get('/pending-payment', authenticate, validateCompany, salesOrderController.getPendingOrdersForPayment);

/**
 * @route   GET /api/sales-orders/search
 * @desc    Search sales orders by various criteria
 * @access  Private
 */
router.get('/search', authenticate, validateCompany, (req, res, next) => {
    req.query.search = req.query.q || req.query.search;
    next();
}, salesOrderController.getAllSalesOrders);

// ==================== CUSTOMER-SPECIFIC ROUTES ====================

/**
 * @route   GET /api/sales-orders/customer/:customerId/pending-documents
 * @desc    Get customer's pending documents (orders + invoices) for payment allocation
 * @access  Private
 */
router.get('/customer/:customerId/pending-documents', authenticate, validateCompany, salesOrderController.getCustomerPendingDocuments);

/**
 * @route   GET /api/sales-orders/customer/pending-documents
 * @desc    Get customer's pending documents (orders + invoices) for payment allocation
 * @access  Private
 */
router.get('/customer/pending-documents', authenticate, validateCompany, salesOrderController.getCustomerPendingDocuments);

// ==================== EXPORT ROUTES ====================

/**
 * @route   GET /api/sales-orders/export/csv
 * @desc    Export sales orders data as CSV
 * @access  Private
 */
router.get('/export/csv', authenticate, validateCompany, async (req, res) => {
    try {
        const { companyId, orderType, status, dateFrom, dateTo } = req.query;

        const filter = { companyId };
        if (orderType) filter.orderType = orderType;
        if (status) filter.status = status;
        if (dateFrom || dateTo) {
            filter.orderDate = {};
            if (dateFrom) filter.orderDate.$gte = new Date(dateFrom);
            if (dateTo) filter.orderDate.$lte = new Date(dateTo);
        }

        const SalesOrder = require('../models/SalesOrder');
        const orders = await SalesOrder.find(filter)
            .populate('customer', 'name mobile email')
            .sort({ orderDate: -1 });

        const csvHeaders = [
            'Order Number',
            'Order Type',
            'Date',
            'Customer Name',
            'Customer Mobile',
            'Status',
            'Total Amount',
            'Paid Amount',
            'Pending Amount',
            'Payment Status',
            'Valid Until',
            'Priority',
            'Converted to Invoice',
            'Created At'
        ];

        const csvRows = orders.map(order => [
            order.orderNumber,
            order.orderType,
            order.orderDate.toISOString().split('T')[0],
            order.customer?.name || '',
            order.customer?.mobile || order.customerMobile || '',
            order.status,
            order.totals?.finalTotal || 0,
            order.payment?.paidAmount || 0,
            order.payment?.pendingAmount || 0,
            order.payment?.status || 'pending',
            order.validUntil ? order.validUntil.toISOString().split('T')[0] : '',
            order.priority,
            order.convertedToInvoice ? 'Yes' : 'No',
            order.createdAt.toISOString().split('T')[0]
        ]);

        const csvContent = [csvHeaders, ...csvRows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="sales-orders-${Date.now()}.csv"`);
        res.send(csvContent);

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to export CSV',
            error: error.message
        });
    }
});

// ==================== BASIC CRUD ROUTES ====================

/**
 * @route   POST /api/sales-orders
 * @desc    Create a new sales order/quotation/proforma invoice
 * @access  Private
 */
router.post('/', authenticate, validateRequest, validateOrderType, salesOrderController.createSalesOrder);

/**
 * @route   GET /api/sales-orders
 * @desc    Get all sales orders with pagination and filters
 * @access  Private
 */
router.get('/', authenticate, validateCompany, salesOrderController.getAllSalesOrders);

/**
 * @route   GET /api/sales-orders/:id
 * @desc    Get sales order by ID with full details
 * @access  Private
 */
router.get('/:id', authenticate, validateRequest, salesOrderController.getSalesOrderById);

/**
 * @route   PUT /api/sales-orders/:id
 * @desc    Update sales order (only non-converted orders can be updated)
 * @access  Private
 */
router.put('/:id', authenticate, validateRequest, salesOrderController.updateSalesOrder);

/**
 * @route   DELETE /api/sales-orders/:id
 * @desc    Cancel sales order (soft delete)
 * @access  Private
 */
router.delete('/:id', authenticate, validateRequest, salesOrderController.deleteSalesOrder);

// ==================== ORDER CONVERSION ROUTES ====================

/**
 * @route   POST /api/sales-orders/:id/convert-to-invoice
 * @desc    Convert sales order to invoice
 * @access  Private
 */
router.post('/:id/convert-to-invoice', authenticate, validateRequest, salesOrderController.convertToInvoice);

/**
 * @route   POST /api/sales-orders/:id/convert
 * @desc    Convert sales order to invoice (alternative endpoint)
 * @access  Private
 */
router.post('/:id/convert', authenticate, validateRequest, salesOrderController.convertToInvoice);

// ==================== STATUS MANAGEMENT ROUTES ====================

/**
 * @route   PATCH /api/sales-orders/:id/status
 * @desc    Update sales order status
 * @access  Private
 */
router.patch('/:id/status', authenticate, validateRequest, salesOrderController.updateStatus);

/**
 * @route   PATCH /api/sales-orders/:id/accept
 * @desc    Mark sales order as accepted
 * @access  Private
 */
router.patch('/:id/accept', authenticate, validateRequest, (req, res, next) => {
    req.body.status = 'accepted';
    next();
}, salesOrderController.updateStatus);

/**
 * @route   PATCH /api/sales-orders/:id/reject
 * @desc    Mark sales order as rejected
 * @access  Private
 */
router.patch('/:id/reject', authenticate, validateRequest, (req, res, next) => {
    req.body.status = 'rejected';
    next();
}, salesOrderController.updateStatus);

/**
 * @route   PATCH /api/sales-orders/:id/send
 * @desc    Mark sales order as sent
 * @access  Private
 */
router.patch('/:id/send', authenticate, validateRequest, (req, res, next) => {
    req.body.status = 'sent';
    next();
}, salesOrderController.updateStatus);

/**
 * @route   PATCH /api/sales-orders/:id/expire
 * @desc    Mark sales order as expired
 * @access  Private
 */
router.patch('/:id/expire', authenticate, validateRequest, (req, res, next) => {
    req.body.status = 'expired';
    next();
}, salesOrderController.updateStatus);

/**
 * @route   PATCH /api/sales-orders/:id/cancel
 * @desc    Cancel a sales order
 * @access  Private
 */
router.patch('/:id/cancel', authenticate, validateRequest, salesOrderController.deleteSalesOrder);

// ==================== PAYMENT ROUTES ====================

/**
 * @route   POST /api/sales-orders/:id/payment
 * @desc    Add payment to a sales order
 * @access  Private
 */
router.post('/:id/payment', authenticate, validateRequest, salesOrderController.addPayment);

/**
 * @route   POST /api/sales-orders/:id/payments
 * @desc    Add payment to a sales order (alternative endpoint)
 * @access  Private
 */
router.post('/:id/payments', authenticate, validateRequest, salesOrderController.addPayment);

/**
 * @route   POST /api/sales-orders/:id/advance-payment
 * @desc    Add advance payment to a sales order
 * @access  Private
 */
router.post('/:id/advance-payment', authenticate, validateRequest, (req, res, next) => {
    req.body.isAdvancePayment = true;
    next();
}, salesOrderController.addPayment);

// ==================== BULK OPERATIONS ROUTES ====================

/**
 * @route   PATCH /api/sales-orders/bulk/status
 * @desc    Bulk update status for multiple orders
 * @access  Private
 */
router.patch('/bulk/status', authenticate, validateRequest, async (req, res) => {
    try {
        const { orderIds, status, reason = '' } = req.body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order IDs array is required'
            });
        }

        const validStatuses = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const SalesOrder = require('../models/SalesOrder');
        const updateResult = await SalesOrder.updateMany(
            {
                _id: { $in: orderIds },
                convertedToInvoice: false
            },
            {
                status,
                lastModifiedBy: req.user?.id || 'system',
                $push: {
                    notes: reason ? `Bulk status update: ${reason}` : `Bulk status update to ${status}`
                }
            }
        );

        res.json({
            success: true,
            data: {
                modifiedCount: updateResult.modifiedCount,
                matchedCount: updateResult.matchedCount
            },
            message: `${updateResult.modifiedCount} orders updated to ${status}`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to bulk update status',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/sales-orders/bulk/convert
 * @desc    Bulk convert multiple orders to invoices
 * @access  Private
 */
router.post('/bulk/convert', authenticate, validateRequest, async (req, res) => {
    try {
        const { orderIds } = req.body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order IDs array is required'
            });
        }

        const SalesOrder = require('../models/SalesOrder');
        const results = [];
        const errors = [];

        for (const orderId of orderIds) {
            try {
                const order = await SalesOrder.findById(orderId);
                if (order && !order.convertedToInvoice) {
                    const invoice = await order.convertToInvoice();
                    results.push({
                        orderId,
                        orderNumber: order.orderNumber,
                        invoiceId: invoice._id,
                        invoiceNumber: invoice.invoiceNumber
                    });
                } else {
                    errors.push({
                        orderId,
                        error: 'Order not found or already converted'
                    });
                }
            } catch (error) {
                errors.push({
                    orderId,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            data: {
                converted: results,
                errors,
                successCount: results.length,
                errorCount: errors.length
            },
            message: `${results.length} orders converted successfully, ${errors.length} failed`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to bulk convert orders',
            error: error.message
        });
    }
});

module.exports = router;