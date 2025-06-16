const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');

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
    if (orderType && !['purchase_order', 'purchase_quotation', 'proforma_purchase'].includes(orderType)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid order type. Must be purchase_order, purchase_quotation, or proforma_purchase'
        });
    }
    next();
};

// ==================== UTILITY ROUTES (MUST BE FIRST) ====================

/**
 * @route   GET /api/purchase-orders/generate-number
 * @desc    Generate next order number
 * @access  Private
 * @query   companyId, orderType
 */
router.get('/generate-number', authenticate, validateCompany, purchaseOrderController.generateOrderNumber);

/**
 * @route   GET /api/purchase-orders/next-order-number
 * @desc    Get next available order number (alternative endpoint)
 * @access  Private
 */
router.get('/next-order-number', authenticate, validateCompany, purchaseOrderController.generateOrderNumber);

/**
 * @route   GET /api/purchase-orders/next-number
 * @desc    Get next available order number (another alternative)
 * @access  Private
 */
router.get('/next-number', authenticate, validateCompany, purchaseOrderController.generateOrderNumber);

// ==================== REPORTING ROUTES (BEFORE PARAMETER ROUTES) ====================

/**
 * @route   GET /api/purchase-orders/reports/dashboard
 * @desc    Get purchase order dashboard summary
 * @access  Private
 */
router.get('/reports/dashboard', authenticate, validateCompany, purchaseOrderController.getDashboardSummary);

/**
 * @route   GET /api/purchase-orders/reports/summary
 * @desc    Get purchase order summary report for date range
 * @access  Private
 */
router.get('/reports/summary', authenticate, validateCompany, (req, res, next) => {
    req.query.page = 1;
    req.query.limit = 1000;
    next();
}, purchaseOrderController.getAllPurchaseOrders);

/**
 * @route   GET /api/purchase-orders/reports/conversion-rate
 * @desc    Get order to purchase invoice conversion rate analysis
 * @access  Private
 */
router.get('/reports/conversion-rate', authenticate, validateCompany, async (req, res) => {
    try {
        const { companyId } = req.query;
        const PurchaseOrder = require('../models/PurchaseOrder');

        const conversionStats = await PurchaseOrder.aggregate([
            { $match: { companyId: new require('mongoose').Types.ObjectId(companyId) } },
            {
                $group: {
                    _id: '$orderType',
                    totalOrders: { $sum: 1 },
                    convertedOrders: { $sum: { $cond: ['$convertedToPurchaseInvoice', 1, 0] } },
                    totalValue: { $sum: '$totals.finalTotal' },
                    convertedValue: {
                        $sum: {
                            $cond: ['$convertedToPurchaseInvoice', '$totals.finalTotal', 0]
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
 * @route   GET /api/purchase-orders/reports/aging
 * @desc    Get purchase order aging report
 * @access  Private
 */
router.get('/reports/aging', authenticate, validateCompany, async (req, res) => {
    try {
        const { companyId } = req.query;
        const PurchaseOrder = require('../models/PurchaseOrder');
        const today = new Date();

        const agingReport = await PurchaseOrder.aggregate([
            {
                $match: {
                    companyId: new require('mongoose').Types.ObjectId(companyId),
                    status: { $nin: ['cancelled', 'completed'] }
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

/**
 * @route   GET /api/purchase-orders/reports/supplier-performance
 * @desc    Get supplier performance analysis
 * @access  Private
 */
router.get('/reports/supplier-performance', authenticate, validateCompany, async (req, res) => {
    try {
        const { companyId } = req.query;
        const PurchaseOrder = require('../models/PurchaseOrder');

        const supplierPerformance = await PurchaseOrder.aggregate([
            { $match: { companyId: new require('mongoose').Types.ObjectId(companyId) } },
            {
                $lookup: {
                    from: 'parties',
                    localField: 'supplier',
                    foreignField: '_id',
                    as: 'supplierDetails'
                }
            },
            { $unwind: '$supplierDetails' },
            {
                $group: {
                    _id: '$supplier',
                    supplierName: { $first: '$supplierDetails.name' },
                    totalOrders: { $sum: 1 },
                    totalValue: { $sum: '$totals.finalTotal' },
                    completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                    onTimeDeliveries: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $ne: ['$deliveryDate', null] },
                                        { $lte: ['$deliveryDate', '$expectedDeliveryDate'] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    averageOrderValue: { $avg: '$totals.finalTotal' },
                    pendingPayment: { $sum: '$payment.pendingAmount' }
                }
            },
            {
                $project: {
                    supplierName: 1,
                    totalOrders: 1,
                    totalValue: 1,
                    completedOrders: 1,
                    onTimeDeliveries: 1,
                    completionRate: {
                        $multiply: [
                            { $divide: ['$completedOrders', '$totalOrders'] },
                            100
                        ]
                    },
                    onTimeRate: {
                        $multiply: [
                            { $divide: ['$onTimeDeliveries', '$totalOrders'] },
                            100
                        ]
                    },
                    averageOrderValue: { $round: ['$averageOrderValue', 2] },
                    pendingPayment: 1
                }
            },
            { $sort: { totalValue: -1 } }
        ]);

        res.json({
            success: true,
            data: supplierPerformance,
            message: 'Supplier performance analysis retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get supplier performance analysis',
            error: error.message
        });
    }
});

// ==================== FILTERING ROUTES (BEFORE PARAMETER ROUTES) ====================

/**
 * @route   GET /api/purchase-orders/by-type/:orderType
 * @desc    Get orders by type (purchase_order, purchase_quotation, proforma_purchase)
 * @access  Private
 */
router.get('/by-type/:orderType', authenticate, validateCompany, (req, res, next) => {
    req.query.orderType = req.params.orderType;
    next();
}, purchaseOrderController.getAllPurchaseOrders);

/**
 * @route   GET /api/purchase-orders/quotations
 * @desc    Get all purchase quotations
 * @access  Private
 */
router.get('/quotations', authenticate, validateCompany, (req, res, next) => {
    req.query.orderType = 'purchase_quotation';
    next();
}, purchaseOrderController.getAllPurchaseOrders);

/**
 * @route   GET /api/purchase-orders/orders
 * @desc    Get all purchase orders
 * @access  Private
 */
router.get('/orders', authenticate, validateCompany, (req, res, next) => {
    req.query.orderType = 'purchase_order';
    next();
}, purchaseOrderController.getAllPurchaseOrders);

/**
 * @route   GET /api/purchase-orders/proforma
 * @desc    Get all proforma purchases
 * @access  Private
 */
router.get('/proforma', authenticate, validateCompany, (req, res, next) => {
    req.query.orderType = 'proforma_purchase';
    next();
}, purchaseOrderController.getAllPurchaseOrders);

/**
 * @route   GET /api/purchase-orders/by-status/:status
 * @desc    Get orders by status
 * @access  Private
 */
router.get('/by-status/:status', authenticate, validateCompany, (req, res, next) => {
    req.query.status = req.params.status;
    next();
}, purchaseOrderController.getAllPurchaseOrders);

/**
 * @route   GET /api/purchase-orders/draft
 * @desc    Get draft orders
 * @access  Private
 */
router.get('/draft', authenticate, validateCompany, (req, res, next) => {
    req.query.status = 'draft';
    next();
}, purchaseOrderController.getAllPurchaseOrders);

/**
 * @route   GET /api/purchase-orders/pending
 * @desc    Get pending orders (draft + sent)
 * @access  Private
 */
router.get('/pending', authenticate, validateCompany, (req, res, next) => {
    req.query.status = 'draft,sent';
    next();
}, purchaseOrderController.getAllPurchaseOrders);

/**
 * @route   GET /api/purchase-orders/active
 * @desc    Get active orders (not cancelled or completed)
 * @access  Private
 */
router.get('/active', authenticate, validateCompany, (req, res, next) => {
    req.query.status = 'draft,sent,confirmed,partially_received';
    next();
}, purchaseOrderController.getAllPurchaseOrders);

/**
 * @route   GET /api/purchase-orders/confirmed
 * @desc    Get confirmed orders
 * @access  Private
 */
router.get('/confirmed', authenticate, validateCompany, (req, res, next) => {
    req.query.status = 'confirmed';
    next();
}, purchaseOrderController.getAllPurchaseOrders);

/**
 * @route   GET /api/purchase-orders/received
 * @desc    Get received orders
 * @access  Private
 */
router.get('/received', authenticate, validateCompany, (req, res, next) => {
    req.query.status = 'received';
    next();
}, purchaseOrderController.getAllPurchaseOrders);

/**
 * @route   GET /api/purchase-orders/converted
 * @desc    Get converted orders
 * @access  Private
 */
router.get('/converted', authenticate, validateCompany, (req, res, next) => {
    req.query.convertedToPurchaseInvoice = 'true';
    next();
}, purchaseOrderController.getAllPurchaseOrders);

/**
 * @route   GET /api/purchase-orders/expired
 * @desc    Get expired purchase orders/quotations
 * @access  Private
 */
router.get('/expired', authenticate, validateCompany, purchaseOrderController.getExpiredOrders);

/**
 * @route   GET /api/purchase-orders/expiring-soon
 * @desc    Get orders expiring within next 7 days
 * @access  Private
 */
router.get('/expiring-soon', authenticate, validateCompany, (req, res, next) => {
    const today = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(today.getDate() + 7);

    req.query.validFrom = today.toISOString();
    req.query.validTo = weekFromNow.toISOString();
    req.query.status = 'draft,sent,confirmed';
    next();
}, purchaseOrderController.getAllPurchaseOrders);

/**
 * @route   GET /api/purchase-orders/pending-payment
 * @desc    Get purchase orders with pending payments
 * @access  Private
 */
router.get('/pending-payment', authenticate, validateCompany, purchaseOrderController.getPendingOrdersForPayment);

/**
 * @route   GET /api/purchase-orders/awaiting-approval
 * @desc    Get purchase orders awaiting approval
 * @access  Private
 */
router.get('/awaiting-approval', authenticate, validateCompany, purchaseOrderController.getOrdersAwaitingApproval);

/**
 * @route   GET /api/purchase-orders/required-by/:date
 * @desc    Get orders required by specific date
 * @access  Private
 */
router.get('/required-by/:date', authenticate, validateCompany, (req, res, next) => {
    req.query.date = req.params.date;
    next();
}, purchaseOrderController.getOrdersRequiredByDate);

/**
 * @route   GET /api/purchase-orders/overdue-delivery
 * @desc    Get orders with overdue delivery
 * @access  Private
 */
router.get('/overdue-delivery', authenticate, validateCompany, (req, res, next) => {
    const today = new Date();
    req.query.expectedDeliveryTo = today.toISOString();
    req.query.status = 'confirmed,partially_received';
    next();
}, purchaseOrderController.getAllPurchaseOrders);

/**
 * @route   GET /api/purchase-orders/search
 * @desc    Search purchase orders by various criteria
 * @access  Private
 */
router.get('/search', authenticate, validateCompany, (req, res, next) => {
    req.query.search = req.query.q || req.query.search;
    next();
}, purchaseOrderController.getAllPurchaseOrders);

// ==================== SUPPLIER-SPECIFIC ROUTES ====================

/**
 * @route   GET /api/purchase-orders/supplier/:supplierId/pending-documents
 * @desc    Get supplier's pending documents (orders + invoices) for payment allocation
 * @access  Private
 */
router.get('/supplier/:supplierId/pending-documents', authenticate, validateCompany, purchaseOrderController.getSupplierPendingDocuments);

/**
 * @route   GET /api/purchase-orders/supplier/pending-documents
 * @desc    Get supplier's pending documents (orders + invoices) for payment allocation
 * @access  Private
 */
router.get('/supplier/pending-documents', authenticate, validateCompany, purchaseOrderController.getSupplierPendingDocuments);

// ==================== PRIORITY ROUTES ====================

/**
 * @route   GET /api/purchase-orders/by-priority/:priority
 * @desc    Get orders by priority (low, normal, high, urgent)
 * @access  Private
 */
router.get('/by-priority/:priority', authenticate, validateCompany, (req, res, next) => {
    req.query.priority = req.params.priority;
    next();
}, purchaseOrderController.getAllPurchaseOrders);

/**
 * @route   GET /api/purchase-orders/urgent
 * @desc    Get urgent priority orders
 * @access  Private
 */
router.get('/urgent', authenticate, validateCompany, (req, res, next) => {
    req.query.priority = 'urgent';
    next();
}, purchaseOrderController.getAllPurchaseOrders);

/**
 * @route   GET /api/purchase-orders/high-priority
 * @desc    Get high priority orders
 * @access  Private
 */
router.get('/high-priority', authenticate, validateCompany, (req, res, next) => {
    req.query.priority = 'high';
    next();
}, purchaseOrderController.getAllPurchaseOrders);

// ==================== EXPORT ROUTES ====================

/**
 * @route   GET /api/purchase-orders/export/csv
 * @desc    Export purchase orders data as CSV
 * @access  Private
 */
router.get('/export/csv', authenticate, validateCompany, async (req, res) => {
    try {
        const { companyId, orderType, status, dateFrom, dateTo, priority } = req.query;

        const filter = { companyId };
        if (orderType) filter.orderType = orderType;
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (dateFrom || dateTo) {
            filter.orderDate = {};
            if (dateFrom) filter.orderDate.$gte = new Date(dateFrom);
            if (dateTo) filter.orderDate.$lte = new Date(dateTo);
        }

        const PurchaseOrder = require('../models/PurchaseOrder');
        const orders = await PurchaseOrder.find(filter)
            .populate('supplier', 'name mobile email')
            .sort({ orderDate: -1 });

        const csvHeaders = [
            'Order Number',
            'Order Type',
            'Date',
            'Supplier Name',
            'Supplier Mobile',
            'Status',
            'Priority',
            'Total Amount',
            'Paid Amount',
            'Pending Amount',
            'Payment Status',
            'Valid Until',
            'Required By',
            'Expected Delivery',
            'Delivery Date',
            'Converted to Invoice',
            'Created At'
        ];

        const csvRows = orders.map(order => [
            order.orderNumber,
            order.orderType,
            order.orderDate.toISOString().split('T')[0],
            order.supplier?.name || '',
            order.supplier?.mobile || order.supplierMobile || '',
            order.status,
            order.priority,
            order.totals?.finalTotal || 0,
            order.payment?.paidAmount || 0,
            order.payment?.pendingAmount || 0,
            order.payment?.status || 'pending',
            order.validUntil ? order.validUntil.toISOString().split('T')[0] : '',
            order.requiredBy ? order.requiredBy.toISOString().split('T')[0] : '',
            order.expectedDeliveryDate ? order.expectedDeliveryDate.toISOString().split('T')[0] : '',
            order.deliveryDate ? order.deliveryDate.toISOString().split('T')[0] : '',
            order.convertedToPurchaseInvoice ? 'Yes' : 'No',
            order.createdAt.toISOString().split('T')[0]
        ]);

        const csvContent = [csvHeaders, ...csvRows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="purchase-orders-${Date.now()}.csv"`);
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
 * @route   POST /api/purchase-orders
 * @desc    Create a new purchase order/quotation/proforma purchase
 * @access  Private
 */
router.post('/', authenticate, validateRequest, validateOrderType, purchaseOrderController.createPurchaseOrder);

/**
 * @route   GET /api/purchase-orders
 * @desc    Get all purchase orders with pagination and filters
 * @access  Private
 */
router.get('/', authenticate, validateCompany, purchaseOrderController.getAllPurchaseOrders);

/**
 * @route   GET /api/purchase-orders/:id
 * @desc    Get purchase order by ID with full details
 * @access  Private
 */
router.get('/:id', authenticate, validateRequest, purchaseOrderController.getPurchaseOrderById);

/**
 * @route   PUT /api/purchase-orders/:id
 * @desc    Update purchase order (only non-converted orders can be updated)
 * @access  Private
 */
router.put('/:id', authenticate, validateRequest, purchaseOrderController.updatePurchaseOrder);

/**
 * @route   DELETE /api/purchase-orders/:id
 * @desc    Cancel purchase order (soft delete)
 * @access  Private
 */
router.delete('/:id', authenticate, validateRequest, purchaseOrderController.deletePurchaseOrder);

// ==================== ORDER CONVERSION ROUTES ====================

/**
 * @route   POST /api/purchase-orders/:id/convert-to-invoice
 * @desc    Convert purchase order to purchase invoice
 * @access  Private
 */
router.post('/:id/convert-to-invoice', authenticate, validateRequest, purchaseOrderController.convertToPurchaseInvoice);

/**
 * @route   POST /api/purchase-orders/:id/convert
 * @desc    Convert purchase order to purchase invoice (alternative endpoint)
 * @access  Private
 */
router.post('/:id/convert', authenticate, validateRequest, purchaseOrderController.convertToPurchaseInvoice);

// ==================== STATUS MANAGEMENT ROUTES ====================

/**
 * @route   PATCH /api/purchase-orders/:id/status
 * @desc    Update purchase order status
 * @access  Private
 */
router.patch('/:id/status', authenticate, validateRequest, purchaseOrderController.updateStatus);

/**
 * @route   PATCH /api/purchase-orders/:id/confirm
 * @desc    Mark purchase order as confirmed
 * @access  Private
 */
router.patch('/:id/confirm', authenticate, validateRequest, (req, res, next) => {
    req.body.status = 'confirmed';
    next();
}, purchaseOrderController.updateStatus);

/**
 * @route   PATCH /api/purchase-orders/:id/send
 * @desc    Mark purchase order as sent
 * @access  Private
 */
router.patch('/:id/send', authenticate, validateRequest, (req, res, next) => {
    req.body.status = 'sent';
    next();
}, purchaseOrderController.updateStatus);

/**
 * @route   PATCH /api/purchase-orders/:id/receive
 * @desc    Mark purchase order as received
 * @access  Private
 */
router.patch('/:id/receive', authenticate, validateRequest, (req, res, next) => {
    req.body.status = 'received';
    next();
}, purchaseOrderController.updateStatus);

/**
 * @route   PATCH /api/purchase-orders/:id/partial-receive
 * @desc    Mark purchase order as partially received
 * @access  Private
 */
router.patch('/:id/partial-receive', authenticate, validateRequest, (req, res, next) => {
    req.body.status = 'partially_received';
    next();
}, purchaseOrderController.updateStatus);

/**
 * @route   PATCH /api/purchase-orders/:id/complete
 * @desc    Mark purchase order as completed
 * @access  Private
 */
router.patch('/:id/complete', authenticate, validateRequest, (req, res, next) => {
    req.body.status = 'completed';
    next();
}, purchaseOrderController.updateStatus);

/**
 * @route   PATCH /api/purchase-orders/:id/cancel
 * @desc    Cancel a purchase order
 * @access  Private
 */
router.patch('/:id/cancel', authenticate, validateRequest, purchaseOrderController.deletePurchaseOrder);

/**
 * @route   PATCH /api/purchase-orders/:id/approve
 * @desc    Approve a purchase order
 * @access  Private
 */
router.patch('/:id/approve', authenticate, validateRequest, (req, res, next) => {
    req.body.status = 'confirmed';
    req.body.approvedBy = req.user?.id || req.body.approvedBy;
    next();
}, purchaseOrderController.updateStatus);

// ==================== PAYMENT ROUTES ====================

/**
 * @route   POST /api/purchase-orders/:id/payment
 * @desc    Add payment to a purchase order
 * @access  Private
 */
router.post('/:id/payment', authenticate, validateRequest, purchaseOrderController.addPayment);

/**
 * @route   POST /api/purchase-orders/:id/payments
 * @desc    Add payment to a purchase order (alternative endpoint)
 * @access  Private
 */
router.post('/:id/payments', authenticate, validateRequest, purchaseOrderController.addPayment);

/**
 * @route   POST /api/purchase-orders/:id/advance-payment
 * @desc    Add advance payment to a purchase order
 * @access  Private
 */
router.post('/:id/advance-payment', authenticate, validateRequest, (req, res, next) => {
    req.body.isAdvancePayment = true;
    next();
}, purchaseOrderController.addPayment);

// ==================== BULK OPERATIONS ROUTES ====================

/**
 * @route   PATCH /api/purchase-orders/bulk/status
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

        const validStatuses = ['draft', 'sent', 'confirmed', 'received', 'partially_received', 'cancelled', 'completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const PurchaseOrder = require('../models/PurchaseOrder');
        const updateResult = await PurchaseOrder.updateMany(
            {
                _id: { $in: orderIds },
                convertedToPurchaseInvoice: false
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
 * @route   POST /api/purchase-orders/bulk/convert
 * @desc    Bulk convert multiple orders to purchase invoices
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

        const PurchaseOrder = require('../models/PurchaseOrder');
        const results = [];
        const errors = [];

        for (const orderId of orderIds) {
            try {
                const order = await PurchaseOrder.findById(orderId);
                if (order && !order.convertedToPurchaseInvoice) {
                    const invoice = await order.convertToPurchaseInvoice();
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

/**
 * @route   PATCH /api/purchase-orders/bulk/approve
 * @desc    Bulk approve multiple orders
 * @access  Private
 */
router.patch('/bulk/approve', authenticate, validateRequest, async (req, res) => {
    try {
        const { orderIds, approvedBy } = req.body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order IDs array is required'
            });
        }

        const PurchaseOrder = require('../models/PurchaseOrder');
        const updateResult = await PurchaseOrder.updateMany(
            {
                _id: { $in: orderIds },
                status: 'draft',
                approvedBy: null
            },
            {
                status: 'confirmed',
                approvedBy: approvedBy || req.user?.id || 'system',
                approvedAt: new Date(),
                lastModifiedBy: req.user?.id || 'system'
            }
        );

        res.json({
            success: true,
            data: {
                modifiedCount: updateResult.modifiedCount,
                matchedCount: updateResult.matchedCount
            },
            message: `${updateResult.modifiedCount} orders approved successfully`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to bulk approve orders',
            error: error.message
        });
    }
});

module.exports = router;