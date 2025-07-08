const express = require("express");
const router = express.Router();
const salesOrderController = require("../controllers/salesOrderController");

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
      message: "Company ID is required",
    });
  }
  next();
};

// Order type validation middleware
const validateOrderType = (req, res, next) => {
  const orderType = req.body.orderType || req.query.orderType;
  if (
    orderType &&
    !["quotation", "sales_order", "proforma_invoice"].includes(orderType)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid order type. Must be quotation, sales_order, or proforma_invoice",
    });
  }
  next();
};

// Admin validation middleware
const validateAdmin = (req, res, next) => {
  const userRole = req.user?.role || req.headers["x-user-role"];

  if (!userRole || userRole !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
      code: "ADMIN_ACCESS_REQUIRED",
    });
  }

  next();
};

// ==================== ADMIN ROUTES (MUST BE FIRST) ====================

/**
 * @route   GET /api/sales-orders/admin/all
 * @desc    Get all sales orders for admin (across all companies)
 * @access  Private (Admin only)
 */
router.get(
  "/admin/all",
  authenticate,
  // validateAdmin, // Enable when you have proper admin validation
  salesOrderController.getAllSalesOrdersForAdmin
);

/**
 * @route   GET /api/sales-orders/admin/stats
 * @desc    Get sales order statistics for admin dashboard
 * @access  Private (Admin only)
 */
router.get(
  "/admin/stats",
  authenticate,
  // validateAdmin, // Enable when you have proper admin validation
  salesOrderController.getSalesOrderStatsForAdmin
);

/**
 * @route   GET /api/sales-orders/admin/conversion-analysis
 * @desc    Get conversion rate analysis for admin
 * @access  Private (Admin only)
 */
router.get(
  "/admin/conversion-analysis",
  authenticate,
  // validateAdmin, // Enable when you have proper admin validation
  salesOrderController.getConversionRateAnalysisForAdmin
);

// ==================== UTILITY ROUTES (MUST BE FIRST) ====================

/**
 * @route   GET /api/sales-orders/generate-number
 * @desc    Generate next order number
 * @access  Private
 * @query   companyId, orderType
 */
router.get(
  "/generate-number",
  authenticate,
  validateCompany,
  salesOrderController.generateOrderNumber
);

/**
 * @route   GET /api/sales-orders/next-order-number
 * @desc    Get next available order number (alternative endpoint)
 * @access  Private
 */
router.get(
  "/next-order-number",
  authenticate,
  validateCompany,
  salesOrderController.generateOrderNumber
);

/**
 * @route   GET /api/sales-orders/next-number
 * @desc    Get next available order number (another alternative)
 * @access  Private
 */
router.get(
  "/next-number",
  authenticate,
  validateCompany,
  salesOrderController.generateOrderNumber
);

/**
 * @route   GET /api/sales-orders/check-number
 * @desc    Check if order number exists
 * @access  Private
 */
router.get("/check-number", authenticate, validateCompany, async (req, res) => {
  try {
    const {companyId, orderNumber} = req.query;

    if (!companyId || !orderNumber) {
      return res.status(400).json({
        success: false,
        message: "Company ID and order number are required",
      });
    }

    const SalesOrder = require("../models/SalesOrder");
    const existingOrder = await SalesOrder.findOne({
      companyId,
      orderNumber: orderNumber.trim(),
    }).lean();

    res.status(200).json({
      success: true,
      exists: !!existingOrder,
      found: !!existingOrder,
      data: existingOrder
        ? {
            id: existingOrder._id,
            orderNumber: existingOrder.orderNumber,
            createdAt: existingOrder.createdAt,
          }
        : null,
      message: existingOrder
        ? "Order number already exists"
        : "Order number is available",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to check order number",
      error: error.message,
      exists: false,
      found: false,
    });
  }
});

/**
 * @route   GET /api/sales-orders/exists
 * @desc    Check if order number exists (alternative endpoint)
 * @access  Private
 */
router.get("/exists", authenticate, validateCompany, async (req, res) => {
  try {
    const {companyId, orderNumber} = req.query;

    if (!companyId || !orderNumber) {
      return res.status(400).json({
        success: false,
        message: "Company ID and order number are required",
      });
    }

    const SalesOrder = require("../models/SalesOrder");
    const existingOrder = await SalesOrder.findOne({
      companyId,
      orderNumber: orderNumber.trim(),
    }).lean();

    res.status(200).json({
      success: true,
      exists: !!existingOrder,
      found: !!existingOrder,
      data: existingOrder
        ? {
            id: existingOrder._id,
            orderNumber: existingOrder.orderNumber,
            createdAt: existingOrder.createdAt,
          }
        : null,
      message: existingOrder
        ? "Order number already exists"
        : "Order number is available",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to check order number existence",
      error: error.message,
      exists: false,
      found: false,
    });
  }
});

/**
 * @route   GET /api/sales-orders/verify-unique
 * @desc    Verify if order number is unique
 * @access  Private
 */
router.get(
  "/verify-unique",
  authenticate,
  validateCompany,
  async (req, res) => {
    try {
      const {companyId, orderNumber} = req.query;

      if (!companyId || !orderNumber) {
        return res.status(400).json({
          success: false,
          message: "Company ID and order number are required",
        });
      }

      const SalesOrder = require("../models/SalesOrder");
      const existingOrder = await SalesOrder.findOne({
        companyId,
        orderNumber: orderNumber.trim(),
      }).lean();

      const isUnique = !existingOrder;

      res.status(200).json({
        success: true,
        isUnique,
        exists: !!existingOrder,
        found: !!existingOrder,
        data: existingOrder
          ? {
              id: existingOrder._id,
              orderNumber: existingOrder.orderNumber,
              createdAt: existingOrder.createdAt,
            }
          : null,
        message: isUnique
          ? "Order number is unique"
          : "Order number already exists",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to verify order number uniqueness",
        error: error.message,
        isUnique: false,
        exists: false,
        found: false,
      });
    }
  }
);

/**
 * @route   GET /api/sales-orders/stats
 * @desc    Get sales order statistics (company-specific)
 * @access  Private
 */
router.get(
  "/stats",
  authenticate,
  validateCompany,
  salesOrderController.getDashboardSummary
);

// ==================== BIDIRECTIONAL FUNCTIONALITY ROUTES ====================

/**
 * @route   POST /api/sales-orders/generate-from-purchase/:id
 * @desc    Generate sales order from purchase order (BIDIRECTIONAL)
 * @access  Private
 */
router.post(
  "/generate-from-purchase/:id",
  authenticate,
  validateRequest,
  salesOrderController.generateSalesOrder
);

/**
 * @route   POST /api/sales-orders/:id/generate-purchase-order
 * @desc    Generate purchase order from sales order (BIDIRECTIONAL)
 * @access  Private
 */
router.post(
  "/:id/generate-purchase-order",
  authenticate,
  validateRequest,
  salesOrderController.generatePurchaseOrder
);

/**
 * @route   POST /api/sales-orders/bulk/generate-from-purchase
 * @desc    Bulk generate sales orders from multiple purchase orders
 * @access  Private
 */
router.post(
  "/bulk/generate-from-purchase",
  authenticate,
  validateRequest,
  salesOrderController.bulkGenerateSalesOrders
);

/**
 * @route   POST /api/sales-orders/bulk/generate-purchase-orders
 * @desc    Bulk generate purchase orders from multiple sales orders
 * @access  Private
 */
router.post(
  "/bulk/generate-purchase-orders",
  authenticate,
  validateRequest,
  salesOrderController.bulkGeneratePurchaseOrders
);

/**
 * @route   GET /api/sales-orders/analytics/bidirectional
 * @desc    Get bidirectional analytics for company
 * @access  Private
 */
router.get(
  "/analytics/bidirectional",
  authenticate,
  validateCompany,
  salesOrderController.getBidirectionalPurchaseAnalytics
);

/**
 * @route   PUT /api/sales-orders/:id/confirm
 * @desc    Confirm a generated sales order (alternative method)
 * @access  Private
 */
router.put(
  "/:id/confirm",
  authenticate,
  validateRequest,
  salesOrderController.confirmGeneratedSalesOrder
);

/**
 * @route   POST /api/sales-orders/:id/confirm
 * @desc    Confirm a generated sales order
 * @access  Private
 */
router.post(
  "/:id/confirm",
  authenticate,
  validateCompany,
  salesOrderController.confirmGeneratedSalesOrder
);

/**
 * @route   GET /api/sales-orders/needing-confirmation
 * @desc    Get orders needing confirmation
 * @access  Private
 */
router.get(
  "/needing-confirmation",
  authenticate,
  validateCompany,
  salesOrderController.getOrdersNeedingConfirmation
);

/**
 * @route   POST /api/sales-orders/bulk/confirm
 * @desc    Bulk confirm multiple orders
 * @access  Private
 */
router.post(
  "/bulk/confirm",
  authenticate,
  validateRequest,
  salesOrderController.bulkConfirmOrders
);

/**
 * @route   GET /api/sales-orders/analytics/bidirectional-sales
 * @desc    Get bidirectional sales analytics
 * @access  Private
 */
router.get(
  "/analytics/bidirectional-sales",
  authenticate,
  validateCompany,
  async (req, res) => {
    try {
      const {companyId} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const SalesOrder = require("../models/SalesOrder");

      const analytics = await SalesOrder.getBidirectionalAnalytics(companyId);

      res.status(200).json({
        success: true,
        data: analytics,
        message: "Bidirectional sales analytics retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting bidirectional sales analytics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get bidirectional sales analytics",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/sales-orders/auto-generated
 * @desc    Get auto-generated sales orders (from purchase orders)
 * @access  Private
 */
router.get(
  "/auto-generated",
  authenticate,
  validateCompany,
  async (req, res) => {
    try {
      const {companyId} = req.query;
      const SalesOrder = require("../models/SalesOrder");

      const autoGeneratedOrders = await SalesOrder.find({
        companyId,
        isAutoGenerated: true,
        generatedFrom: "purchase_order",
      })
        .populate("customer", "name mobile phoneNumber email")
        .sort({generatedAt: -1});

      res.status(200).json({
        success: true,
        data: autoGeneratedOrders,
        message: "Auto-generated sales orders retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting auto-generated sales orders:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get auto-generated sales orders",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/sales-orders/with-generated-po
 * @desc    Get sales orders that have generated purchase orders
 * @access  Private
 */
router.get(
  "/with-generated-po",
  authenticate,
  validateCompany,
  salesOrderController.getSalesOrdersWithGeneratedPO
);

/**
 * @route   GET /api/sales-orders/purchase-orders-with-sales
 * @desc    Get purchase orders that have generated sales orders
 * @access  Private
 */
router.get(
  "/purchase-orders-with-sales",
  authenticate,
  validateCompany,
  salesOrderController.getPurchaseOrdersWithSalesOrders
);

/**
 * @route   GET /api/sales-orders/from-purchase-orders
 * @desc    Get sales orders created from purchase orders
 * @access  Private
 */
router.get(
  "/from-purchase-orders",
  authenticate,
  validateCompany,
  async (req, res) => {
    try {
      const {companyId} = req.query;
      const SalesOrder = require("../models/SalesOrder");

      const ordersFromPurchaseOrders = await SalesOrder.find({
        companyId,
        sourceOrderType: "purchase_order",
      })
        .populate("customer", "name mobile phoneNumber email")
        .sort({orderDate: -1});

      res.status(200).json({
        success: true,
        data: ordersFromPurchaseOrders,
        message: "Sales orders from purchase orders retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting sales orders from purchase orders:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sales orders from purchase orders",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/sales-orders/from-purchase-order/:purchaseOrderId
 * @desc    Get sales orders created from specific purchase order
 * @access  Private
 */
router.get(
  "/from-purchase-order/:purchaseOrderId",
  authenticate,
  validateRequest,
  async (req, res) => {
    try {
      const {purchaseOrderId} = req.params;
      const SalesOrder = require("../models/SalesOrder");

      const salesOrders = await SalesOrder.getOrdersFromPurchaseOrder(
        purchaseOrderId
      );

      res.status(200).json({
        success: true,
        data: salesOrders,
        message: "Sales orders from purchase order retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting sales orders from purchase order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sales orders from purchase order",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/sales-orders/generation-status
 * @desc    Get purchase order generation status for a sales order
 * @access  Private
 */
router.get(
  "/generation-status",
  authenticate,
  validateCompany,
  salesOrderController.getPurchaseOrderGenerationStatus
);

/**
 * @route   GET /api/sales-orders/sales-generation-status
 * @desc    Get sales order generation status for a purchase order
 * @access  Private
 */
router.get(
  "/sales-generation-status",
  authenticate,
  validateCompany,
  salesOrderController.getSalesOrderGenerationStatus
);

// ==================== TRACKING ROUTES ====================

/**
 * @route   GET /api/sales-orders/source-tracking/:salesOrderId
 * @desc    Get sales order source tracking information
 * @access  Private
 */
router.get(
  "/source-tracking/:salesOrderId",
  authenticate,
  validateRequest,
  salesOrderController.getSalesOrderSourceTracking
);

/**
 * @route   GET /api/sales-orders/purchase-order-tracking/:purchaseOrderId
 * @desc    Get purchase order source tracking information
 * @access  Private
 */
router.get(
  "/purchase-order-tracking/:purchaseOrderId",
  authenticate,
  validateRequest,
  salesOrderController.getPurchaseOrderSourceTracking
);

/**
 * @route   GET /api/sales-orders/:id/tracking-chain
 * @desc    Get complete tracking chain for a sales order
 * @access  Private
 */
router.get(
  "/:id/tracking-chain",
  authenticate,
  validateRequest,
  async (req, res) => {
    try {
      const {id} = req.params;
      const SalesOrder = require("../models/SalesOrder");

      const salesOrder = await SalesOrder.findById(id);
      if (!salesOrder) {
        return res.status(404).json({
          success: false,
          message: "Sales order not found",
        });
      }

      const trackingChain = await salesOrder.getTrackingChain();

      res.status(200).json({
        success: true,
        data: trackingChain,
        message: "Tracking chain retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting tracking chain:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get tracking chain",
        error: error.message,
      });
    }
  }
);

// ==================== REPORTING ROUTES ====================

/**
 * @route   GET /api/sales-orders/reports/dashboard
 * @desc    Get sales order dashboard summary
 * @access  Private
 */
router.get(
  "/reports/dashboard",
  authenticate,
  validateCompany,
  salesOrderController.getDashboardSummary
);

/**
 * @route   GET /api/sales-orders/reports/summary
 * @desc    Get sales order summary report for date range
 * @access  Private
 */
router.get(
  "/reports/summary",
  authenticate,
  validateCompany,
  (req, res, next) => {
    req.query.page = 1;
    req.query.limit = 1000;
    next();
  },
  salesOrderController.getAllSalesOrders
);

/**
 * @route   GET /api/sales-orders/reports/conversion-rate
 * @desc    Get order to invoice conversion rate analysis
 * @access  Private
 */
router.get(
  "/reports/conversion-rate",
  authenticate,
  validateCompany,
  async (req, res) => {
    try {
      const {companyId} = req.query;
      const SalesOrder = require("../models/SalesOrder");

      const conversionStats = await SalesOrder.aggregate([
        {
          $match: {
            companyId: new require("mongoose").Types.ObjectId(companyId),
          },
        },
        {
          $group: {
            _id: "$orderType",
            totalOrders: {$sum: 1},
            convertedOrders: {$sum: {$cond: ["$convertedToInvoice", 1, 0]}},
            totalValue: {$sum: "$totals.finalTotal"},
            convertedValue: {
              $sum: {
                $cond: ["$convertedToInvoice", "$totals.finalTotal", 0],
              },
            },
          },
        },
        {
          $project: {
            orderType: "$_id",
            totalOrders: 1,
            convertedOrders: 1,
            conversionRate: {
              $multiply: [{$divide: ["$convertedOrders", "$totalOrders"]}, 100],
            },
            totalValue: 1,
            convertedValue: 1,
            valueConversionRate: {
              $multiply: [{$divide: ["$convertedValue", "$totalValue"]}, 100],
            },
          },
        },
      ]);

      res.json({
        success: true,
        data: conversionStats,
        message: "Conversion rate analysis retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get conversion rate analysis",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/sales-orders/reports/aging
 * @desc    Get sales order aging report
 * @access  Private
 */
router.get(
  "/reports/aging",
  authenticate,
  validateCompany,
  async (req, res) => {
    try {
      const {companyId} = req.query;
      const SalesOrder = require("../models/SalesOrder");
      const today = new Date();

      const agingReport = await SalesOrder.aggregate([
        {
          $match: {
            companyId: new require("mongoose").Types.ObjectId(companyId),
            status: {$nin: ["cancelled", "converted"]},
          },
        },
        {
          $addFields: {
            ageInDays: {
              $divide: [
                {$subtract: [today, "$createdAt"]},
                1000 * 60 * 60 * 24,
              ],
            },
          },
        },
        {
          $group: {
            _id: {
              range: {
                $switch: {
                  branches: [
                    {case: {$lte: ["$ageInDays", 7]}, then: "0-7 days"},
                    {case: {$lte: ["$ageInDays", 30]}, then: "8-30 days"},
                    {case: {$lte: ["$ageInDays", 60]}, then: "31-60 days"},
                    {case: {$lte: ["$ageInDays", 90]}, then: "61-90 days"},
                  ],
                  default: "90+ days",
                },
              },
            },
            count: {$sum: 1},
            totalValue: {$sum: "$totals.finalTotal"},
          },
        },
        {$sort: {"_id.range": 1}},
      ]);

      res.json({
        success: true,
        data: agingReport,
        message: "Aging report retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get aging report",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/sales-orders/reports/customer-performance
 * @desc    Get customer performance analysis
 * @access  Private
 */
router.get(
  "/reports/customer-performance",
  authenticate,
  validateCompany,
  async (req, res) => {
    try {
      const {companyId} = req.query;
      const SalesOrder = require("../models/SalesOrder");

      const customerPerformance = await SalesOrder.aggregate([
        {
          $match: {
            companyId: new require("mongoose").Types.ObjectId(companyId),
          },
        },
        {
          $lookup: {
            from: "parties",
            localField: "customer",
            foreignField: "_id",
            as: "customerDetails",
          },
        },
        {$unwind: "$customerDetails"},
        {
          $group: {
            _id: "$customer",
            customerName: {$first: "$customerDetails.name"},
            totalOrders: {$sum: 1},
            totalValue: {$sum: "$totals.finalTotal"},
            convertedOrders: {
              $sum: {$cond: ["$convertedToInvoice", 1, 0]},
            },
            averageOrderValue: {$avg: "$totals.finalTotal"},
            totalPaid: {$sum: "$payment.paidAmount"},
            pendingPayment: {$sum: "$payment.pendingAmount"},
            quotations: {
              $sum: {$cond: [{$eq: ["$orderType", "quotation"]}, 1, 0]},
            },
            salesOrders: {
              $sum: {$cond: [{$eq: ["$orderType", "sales_order"]}, 1, 0]},
            },
          },
        },
        {
          $project: {
            customerName: 1,
            totalOrders: 1,
            totalValue: 1,
            convertedOrders: 1,
            conversionRate: {
              $multiply: [{$divide: ["$convertedOrders", "$totalOrders"]}, 100],
            },
            averageOrderValue: {$round: ["$averageOrderValue", 2]},
            totalPaid: 1,
            pendingPayment: 1,
            paymentRate: {
              $multiply: [{$divide: ["$totalPaid", "$totalValue"]}, 100],
            },
            quotations: 1,
            salesOrders: 1,
          },
        },
        {$sort: {totalValue: -1}},
      ]);

      res.json({
        success: true,
        data: customerPerformance,
        message: "Customer performance analysis retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get customer performance analysis",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/sales-orders/reports/bidirectional-summary
 * @desc    Get bidirectional integration summary report
 * @access  Private
 */
router.get(
  "/reports/bidirectional-summary",
  authenticate,
  validateCompany,
  async (req, res) => {
    try {
      const {companyId, dateFrom, dateTo} = req.query;
      const SalesOrder = require("../models/SalesOrder");
      const mongoose = require("mongoose");

      const filter = {companyId: new mongoose.Types.ObjectId(companyId)};

      if (dateFrom || dateTo) {
        filter.orderDate = {};
        if (dateFrom) filter.orderDate.$gte = new Date(dateFrom);
        if (dateTo) filter.orderDate.$lte = new Date(dateTo);
      }

      const summary = await SalesOrder.aggregate([
        {$match: filter},
        {
          $group: {
            _id: null,
            totalOrders: {$sum: 1},
            autoGeneratedOrders: {
              $sum: {$cond: ["$isAutoGenerated", 1, 0]},
            },
            manualOrders: {
              $sum: {$cond: [{$not: "$isAutoGenerated"}, 1, 0]},
            },
            ordersFromPurchaseOrders: {
              $sum: {
                $cond: [{$eq: ["$sourceOrderType", "purchase_order"]}, 1, 0],
              },
            },
            ordersWithCorrespondingPO: {
              $sum: {
                $cond: [{$ne: ["$correspondingPurchaseOrderId", null]}, 1, 0],
              },
            },
            ordersWithGeneratedPO: {
              $sum: {$cond: ["$autoGeneratedPurchaseOrder", 1, 0]},
            },
            convertedToInvoices: {
              $sum: {$cond: ["$convertedToInvoice", 1, 0]},
            },
            totalValue: {$sum: "$totals.finalTotal"},
            autoGeneratedValue: {
              $sum: {$cond: ["$isAutoGenerated", "$totals.finalTotal", 0]},
            },
            manualValue: {
              $sum: {
                $cond: [{$not: "$isAutoGenerated"}, "$totals.finalTotal", 0],
              },
            },
          },
        },
        {
          $project: {
            totalOrders: 1,
            autoGeneratedOrders: 1,
            manualOrders: 1,
            ordersFromPurchaseOrders: 1,
            ordersWithCorrespondingPO: 1,
            ordersWithGeneratedPO: 1,
            convertedToInvoices: 1,
            totalValue: 1,
            autoGeneratedValue: 1,
            manualValue: 1,
            autoGenerationRate: {
              $multiply: [
                {$divide: ["$autoGeneratedOrders", "$totalOrders"]},
                100,
              ],
            },
            bidirectionalCoverage: {
              $multiply: [
                {
                  $divide: [
                    {
                      $add: [
                        "$ordersFromPurchaseOrders",
                        "$ordersWithCorrespondingPO",
                        "$ordersWithGeneratedPO",
                      ],
                    },
                    "$totalOrders",
                  ],
                },
                100,
              ],
            },
            conversionRate: {
              $multiply: [
                {$divide: ["$convertedToInvoices", "$totalOrders"]},
                100,
              ],
            },
            purchaseOrderGenerationRate: {
              $multiply: [
                {$divide: ["$ordersWithGeneratedPO", "$totalOrders"]},
                100,
              ],
            },
          },
        },
      ]);

      res.json({
        success: true,
        data: summary[0] || {
          totalOrders: 0,
          autoGeneratedOrders: 0,
          manualOrders: 0,
          ordersFromPurchaseOrders: 0,
          ordersWithCorrespondingPO: 0,
          ordersWithGeneratedPO: 0,
          convertedToInvoices: 0,
          totalValue: 0,
          autoGeneratedValue: 0,
          manualValue: 0,
          autoGenerationRate: 0,
          bidirectionalCoverage: 0,
          conversionRate: 0,
          purchaseOrderGenerationRate: 0,
        },
        message: "Bidirectional summary report retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get bidirectional summary report",
        error: error.message,
      });
    }
  }
);

// ==================== FILTERING ROUTES (BEFORE PARAMETER ROUTES) ====================

/**
 * @route   GET /api/sales-orders/by-type/:orderType
 * @desc    Get orders by type (quotation, sales_order, proforma_invoice)
 * @access  Private
 */
router.get(
  "/by-type/:orderType",
  authenticate,
  validateCompany,
  (req, res, next) => {
    req.query.orderType = req.params.orderType;
    next();
  },
  salesOrderController.getAllSalesOrders
);

/**
 * @route   GET /api/sales-orders/quotations
 * @desc    Get all quotations
 * @access  Private
 */
router.get(
  "/quotations",
  authenticate,
  validateCompany,
  (req, res, next) => {
    req.query.orderType = "quotation";
    next();
  },
  salesOrderController.getAllSalesOrders
);

/**
 * @route   GET /api/sales-orders/orders
 * @desc    Get all sales orders
 * @access  Private
 */
router.get(
  "/orders",
  authenticate,
  validateCompany,
  (req, res, next) => {
    req.query.orderType = "sales_order";
    next();
  },
  salesOrderController.getAllSalesOrders
);

/**
 * @route   GET /api/sales-orders/proforma
 * @desc    Get all proforma invoices
 * @access  Private
 */
router.get(
  "/proforma",
  authenticate,
  validateCompany,
  (req, res, next) => {
    req.query.orderType = "proforma_invoice";
    next();
  },
  salesOrderController.getAllSalesOrders
);

/**
 * @route   GET /api/sales-orders/by-status/:status
 * @desc    Get orders by status
 * @access  Private
 */
router.get(
  "/by-status/:status",
  authenticate,
  validateCompany,
  (req, res, next) => {
    req.query.status = req.params.status;
    next();
  },
  salesOrderController.getAllSalesOrders
);

/**
 * @route   GET /api/sales-orders/draft
 * @desc    Get draft orders
 * @access  Private
 */
router.get(
  "/draft",
  authenticate,
  validateCompany,
  (req, res, next) => {
    req.query.status = "draft";
    next();
  },
  salesOrderController.getAllSalesOrders
);

/**
 * @route   GET /api/sales-orders/pending
 * @desc    Get pending orders (draft + sent)
 * @access  Private
 */
router.get(
  "/pending",
  authenticate,
  validateCompany,
  (req, res, next) => {
    req.query.status = "draft,sent";
    next();
  },
  salesOrderController.getAllSalesOrders
);

/**
 * @route   GET /api/sales-orders/active
 * @desc    Get active orders (not cancelled, expired, or converted)
 * @access  Private
 */
router.get(
  "/active",
  authenticate,
  validateCompany,
  (req, res, next) => {
    req.query.status = "draft,sent,accepted";
    next();
  },
  salesOrderController.getAllSalesOrders
);

/**
 * @route   GET /api/sales-orders/converted
 * @desc    Get converted orders
 * @access  Private
 */
router.get(
  "/converted",
  authenticate,
  validateCompany,
  (req, res, next) => {
    req.query.status = "converted";
    next();
  },
  salesOrderController.getAllSalesOrders
);

/**
 * @route   GET /api/sales-orders/expired
 * @desc    Get expired sales orders/quotations
 * @access  Private
 */
router.get(
  "/expired",
  authenticate,
  validateCompany,
  salesOrderController.getExpiredOrders
);

/**
 * @route   GET /api/sales-orders/expiring-soon
 * @desc    Get orders expiring within next 7 days
 * @access  Private
 */
router.get(
  "/expiring-soon",
  authenticate,
  validateCompany,
  (req, res, next) => {
    const today = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(today.getDate() + 7);

    req.query.validFrom = today.toISOString();
    req.query.validTo = weekFromNow.toISOString();
    req.query.status = "draft,sent,accepted";
    next();
  },
  salesOrderController.getAllSalesOrders
);

/**
 * @route   GET /api/sales-orders/pending-payment
 * @desc    Get sales orders with pending payments
 * @access  Private
 */
router.get(
  "/pending-payment",
  authenticate,
  validateCompany,
  salesOrderController.getPendingOrdersForPayment
);

/**
 * @route   GET /api/sales-orders/search
 * @desc    Search sales orders by various criteria
 * @access  Private
 */
router.get(
  "/search",
  authenticate,
  validateCompany,
  (req, res, next) => {
    req.query.search = req.query.q || req.query.search;
    next();
  },
  salesOrderController.getAllSalesOrders
);

// ==================== CUSTOMER-SPECIFIC ROUTES ====================

/**
 * @route   GET /api/sales-orders/customer/:customerId/pending-documents
 * @desc    Get customer's pending documents (orders + invoices) for payment allocation
 * @access  Private
 */
router.get(
  "/customer/:customerId/pending-documents",
  authenticate,
  validateCompany,
  salesOrderController.getCustomerPendingDocuments
);

/**
 * @route   GET /api/sales-orders/customer/pending-documents
 * @desc    Get customer's pending documents (orders + invoices) for payment allocation
 * @access  Private
 */
router.get(
  "/customer/pending-documents",
  authenticate,
  validateCompany,
  salesOrderController.getCustomerPendingDocuments
);

// ==================== EXPORT ROUTES ====================

/**
 * @route   GET /api/sales-orders/export/csv
 * @desc    Export sales orders data as CSV
 * @access  Private
 */
router.get("/export/csv", authenticate, validateCompany, async (req, res) => {
  try {
    const {
      companyId,
      orderType,
      status,
      dateFrom,
      dateTo,
      priority,
      isAutoGenerated,
      generatedFrom,
    } = req.query;

    const filter = {companyId};
    if (orderType) filter.orderType = orderType;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (isAutoGenerated !== undefined)
      filter.isAutoGenerated = isAutoGenerated === "true";
    if (generatedFrom) filter.generatedFrom = generatedFrom;
    if (dateFrom || dateTo) {
      filter.orderDate = {};
      if (dateFrom) filter.orderDate.$gte = new Date(dateFrom);
      if (dateTo) filter.orderDate.$lte = new Date(dateTo);
    }

    const SalesOrder = require("../models/SalesOrder");
    const orders = await SalesOrder.find(filter)
      .populate("customer", "name mobile email")
      .populate("sourceCompanyId", "businessName")
      .populate("targetCompanyId", "businessName")
      .sort({orderDate: -1});

    const csvHeaders = [
      "Order Number",
      "Order Type",
      "Date",
      "Customer Name",
      "Customer Mobile",
      "Status",
      "Priority",
      "Total Amount",
      "Paid Amount",
      "Pending Amount",
      "Payment Status",
      "Valid Until",
      "Expected Delivery",
      "Delivery Date",
      "Converted to Invoice",
      "Invoice Number",
      "Is Auto Generated",
      "Generated From",
      "Source Order Number",
      "Source Company",
      "Target Company",
      "Has Generated PO",
      "Generated PO Number",
      "Created At",
    ];

    const csvRows = orders.map((order) => [
      order.orderNumber,
      order.orderType,
      order.orderDate.toISOString().split("T")[0],
      order.customer?.name || "",
      order.customer?.mobile || order.customerMobile || "",
      order.status,
      order.priority,
      order.totals?.finalTotal || 0,
      order.payment?.paidAmount || 0,
      order.payment?.pendingAmount || 0,
      order.payment?.status || "pending",
      order.validUntil ? order.validUntil.toISOString().split("T")[0] : "",
      order.expectedDeliveryDate
        ? order.expectedDeliveryDate.toISOString().split("T")[0]
        : "",
      order.deliveryDate ? order.deliveryDate.toISOString().split("T")[0] : "",
      order.convertedToInvoice ? "Yes" : "No",
      order.invoiceNumber || "",
      order.isAutoGenerated ? "Yes" : "No",
      order.generatedFrom || "manual",
      order.sourceOrderNumber || "",
      order.sourceCompanyId?.businessName || "",
      order.targetCompanyId?.businessName || "",
      order.autoGeneratedPurchaseOrder ? "Yes" : "No",
      order.purchaseOrderNumber || "",
      order.createdAt.toISOString().split("T")[0],
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="sales-orders-${Date.now()}.csv"`
    );
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to export CSV",
      error: error.message,
    });
  }
});

// ==================== BULK OPERATIONS ROUTES ====================

/**
 * @route   PATCH /api/sales-orders/bulk/status
 * @desc    Bulk update status for multiple orders
 * @access  Private
 */
router.patch(
  "/bulk/status",
  authenticate,
  validateRequest,
  async (req, res) => {
    try {
      const {orderIds, status, reason = ""} = req.body;

      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Order IDs array is required",
        });
      }

      const validStatuses = [
        "draft",
        "sent",
        "accepted",
        "rejected",
        "expired",
        "cancelled",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        });
      }

      const SalesOrder = require("../models/SalesOrder");
      const updateResult = await SalesOrder.updateMany(
        {
          _id: {$in: orderIds},
          convertedToInvoice: false,
        },
        {
          status,
          lastModifiedBy: req.user?.id || "system",
          $push: {
            notes: reason
              ? `Bulk status update: ${reason}`
              : `Bulk status update to ${status}`,
          },
        }
      );

      res.json({
        success: true,
        data: {
          modifiedCount: updateResult.modifiedCount,
          matchedCount: updateResult.matchedCount,
        },
        message: `${updateResult.modifiedCount} orders updated to ${status}`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to bulk update status",
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/sales-orders/bulk/convert
 * @desc    Bulk convert multiple orders to invoices
 * @access  Private
 */
router.post(
  "/bulk/convert",
  authenticate,
  validateRequest,
  async (req, res) => {
    try {
      const {orderIds} = req.body;

      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Order IDs array is required",
        });
      }

      const SalesOrder = require("../models/SalesOrder");
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
              invoiceNumber: invoice.invoiceNumber,
            });
          } else {
            errors.push({
              orderId,
              error: "Order not found or already converted",
            });
          }
        } catch (error) {
          errors.push({
            orderId,
            error: error.message,
          });
        }
      }

      res.json({
        success: true,
        data: {
          converted: results,
          errors,
          successCount: results.length,
          errorCount: errors.length,
        },
        message: `${results.length} orders converted successfully, ${errors.length} failed`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to bulk convert orders",
        error: error.message,
      });
    }
  }
);

/**
 * @route   PATCH /api/sales-orders/bulk/send
 * @desc    Bulk send multiple orders to customers
 * @access  Private
 */
router.patch("/bulk/send", authenticate, validateRequest, async (req, res) => {
  try {
    const {orderIds, sendMethod = "email"} = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order IDs array is required",
      });
    }

    const SalesOrder = require("../models/SalesOrder");
    const updateResult = await SalesOrder.updateMany(
      {
        _id: {$in: orderIds},
        status: "draft",
      },
      {
        status: "sent",
        lastModifiedBy: req.user?.id || "system",
        $push: {
          notes: `Bulk sent via ${sendMethod}`,
        },
      }
    );

    res.json({
      success: true,
      data: {
        modifiedCount: updateResult.modifiedCount,
        matchedCount: updateResult.matchedCount,
      },
      message: `${updateResult.modifiedCount} orders sent successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to bulk send orders",
      error: error.message,
    });
  }
});

// ==================== 🔥 MAIN CRUD ROUTES ====================

/**
 * @route   POST /api/sales-orders
 * @desc    Create a new sales order/quotation/proforma invoice
 * @access  Private
 */
router.post(
  "/",
  authenticate,
  validateRequest,
  validateOrderType,
  salesOrderController.createSalesOrder
);

/**
 * 🔥 MAIN ROUTE: Get all sales orders with advanced filtering
 * @route   GET /api/sales-orders
 * @desc    Get all sales orders with pagination and filters (WITH ADMIN SUPPORT)
 * @access  Private
 * @query   companyId, orderType, status, search, dateFrom, dateTo, etc.
 */
router.get("/", authenticate, async (req, res) => {
  try {
    // ✅ Check if this is an admin request
    const isAdminRequest =
      req.query.isAdmin === "true" ||
      req.query.includeAllCompanies === "true" ||
      req.query.adminAccess === "true" ||
      req.headers["x-admin-access"] === "true";

    if (isAdminRequest) {
      return await salesOrderController.getAllSalesOrdersForAdmin(req, res);
    } else {
      // ✅ Check if company validation is needed for regular users
      const companyId = req.query.companyId || req.body.companyId;
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required for regular users",
          code: "COMPANY_ID_REQUIRED",
        });
      }

      return await salesOrderController.getAllSalesOrders(req, res);
    }
  } catch (error) {
    console.error("❌ Error in sales orders main route:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
      data: {
        salesOrders: [],
        orders: [],
        data: [],
        count: 0,
      },
    });
  }
});

// ==================== PARAMETERIZED ROUTES (MUST BE LAST) ====================

/**
 * @route   POST /api/sales-orders/:id/convert-to-invoice
 * @desc    Convert sales order to invoice
 * @access  Private
 */
router.post(
  "/:id/convert-to-invoice",
  authenticate,
  validateRequest,
  salesOrderController.convertToInvoice
);

/**
 * @route   POST /api/sales-orders/:id/convert
 * @desc    Convert sales order to invoice (alternative endpoint)
 * @access  Private
 */
router.post(
  "/:id/convert",
  authenticate,
  validateRequest,
  salesOrderController.convertToInvoice
);

/**
 * @route   PATCH /api/sales-orders/:id/status
 * @desc    Update sales order status
 * @access  Private
 */
router.patch(
  "/:id/status",
  authenticate,
  validateRequest,
  salesOrderController.updateStatus
);

/**
 * @route   PATCH /api/sales-orders/:id/accept
 * @desc    Mark sales order as accepted
 * @access  Private
 */
router.patch(
  "/:id/accept",
  authenticate,
  validateRequest,
  (req, res, next) => {
    req.body.status = "accepted";
    next();
  },
  salesOrderController.updateStatus
);

/**
 * @route   PATCH /api/sales-orders/:id/reject
 * @desc    Mark sales order as rejected
 * @access  Private
 */
router.patch(
  "/:id/reject",
  authenticate,
  validateRequest,
  (req, res, next) => {
    req.body.status = "rejected";
    next();
  },
  salesOrderController.updateStatus
);

/**
 * @route   PATCH /api/sales-orders/:id/send
 * @desc    Mark sales order as sent
 * @access  Private
 */
router.patch(
  "/:id/send",
  authenticate,
  validateRequest,
  (req, res, next) => {
    req.body.status = "sent";
    next();
  },
  salesOrderController.updateStatus
);

/**
 * @route   PATCH /api/sales-orders/:id/expire
 * @desc    Mark sales order as expired
 * @access  Private
 */
router.patch(
  "/:id/expire",
  authenticate,
  validateRequest,
  (req, res, next) => {
    req.body.status = "expired";
    next();
  },
  salesOrderController.updateStatus
);

/**
 * @route   PATCH /api/sales-orders/:id/cancel
 * @desc    Cancel a sales order
 * @access  Private
 */
router.patch(
  "/:id/cancel",
  authenticate,
  validateRequest,
  salesOrderController.deleteSalesOrder
);

/**
 * @route   POST /api/sales-orders/:id/payment
 * @desc    Add payment to a sales order
 * @access  Private
 */
router.post(
  "/:id/payment",
  authenticate,
  validateRequest,
  salesOrderController.addPayment
);

/**
 * @route   POST /api/sales-orders/:id/payments
 * @desc    Add payment to a sales order (alternative endpoint)
 * @access  Private
 */
router.post(
  "/:id/payments",
  authenticate,
  validateRequest,
  salesOrderController.addPayment
);

/**
 * @route   POST /api/sales-orders/:id/advance-payment
 * @desc    Add advance payment to a sales order
 * @access  Private
 */
router.post(
  "/:id/advance-payment",
  authenticate,
  validateRequest,
  (req, res, next) => {
    req.body.isAdvancePayment = true;
    next();
  },
  salesOrderController.addPayment
);

/**
 * @route   GET /api/sales-orders/:id
 * @desc    Get sales order by ID with full details
 * @access  Private
 */
router.get(
  "/:id",
  authenticate,
  validateRequest,
  salesOrderController.getSalesOrderById
);

/**
 * @route   PUT /api/sales-orders/:id
 * @desc    Update sales order (only non-converted orders can be updated)
 * @access  Private
 */
router.put(
  "/:id",
  authenticate,
  validateRequest,
  salesOrderController.updateSalesOrder
);

/**
 * @route   DELETE /api/sales-orders/:id
 * @desc    Cancel sales order (soft delete)
 * @access  Private
 */
router.delete(
  "/:id",
  authenticate,
  validateRequest,
  salesOrderController.deleteSalesOrder
);

// ==================== PRINT AND DOCUMENT ROUTES ====================

/**
 * @route   GET /api/sales-orders/:id/print
 * @desc    Get sales order for printing
 * @access  Private
 */
router.get(
  "/:id/print",
  authenticate,
  validateRequest,
  salesOrderController.getSalesOrderForPrint
);

/**
 * @route   GET /api/sales-orders/:id/email-data
 * @desc    Get sales order data for email/PDF generation
 * @access  Private
 */
router.get(
  "/:id/email-data",
  authenticate,
  validateRequest,
  salesOrderController.getSalesOrderForEmail
);

/**
 * @route   GET /api/sales-orders/:id/download-pdf
 * @desc    Generate and download sales order PDF
 * @access  Private
 */
router.get(
  "/:id/download-pdf",
  authenticate,
  validateRequest,
  salesOrderController.downloadSalesOrderPDF
);

/**
 * @route   POST /api/sales-orders/bulk-print
 * @desc    Get multiple sales orders for bulk printing
 * @access  Private
 */
router.post(
  "/bulk-print",
  authenticate,
  validateRequest,
  salesOrderController.getBulkSalesOrdersForPrint
);

/**
 * @route   GET /api/sales-orders/:id/qr-acceptance
 * @desc    Get sales order for QR code acceptance
 * @access  Private
 */
router.get(
  "/:id/qr-acceptance",
  authenticate,
  validateRequest,
  salesOrderController.getSalesOrderForQRAcceptance
);

/**
 * @route   GET /api/sales-orders/:id/summary
 * @desc    Get sales order summary for quick view
 * @access  Private
 */
router.get(
  "/:id/summary",
  authenticate,
  validateRequest,
  salesOrderController.getSalesOrderSummary
);

/**
 * @route   GET /api/sales-orders/:id/quotation-print
 * @desc    Get quotation for printing (specialized quotation format)
 * @access  Private
 */
router.get(
  "/:id/quotation-print",
  authenticate,
  validateRequest,
  (req, res, next) => {
    // Set template for quotation
    req.query.template = "quotation";
    next();
  },
  salesOrderController.getSalesOrderForPrint
);

/**
 * @route   GET /api/sales-orders/:id/proforma-print
 * @desc    Get proforma invoice for printing
 * @access  Private
 */
router.get(
  "/:id/proforma-print",
  authenticate,
  validateRequest,
  salesOrderController.getProformaInvoiceForPrint
);

// ==================== SPECIALIZED DOCUMENT TYPE ROUTES ====================

/**
 * @route   GET /api/sales-orders/quotations/:id/print
 * @desc    Get quotation for printing (alternative endpoint)
 * @access  Private
 */
router.get(
  "/quotations/:id/print",
  authenticate,
  validateRequest,
  (req, res, next) => {
    req.query.template = "quotation";
    req.query.format = req.query.format || "a4";
    next();
  },
  salesOrderController.getSalesOrderForPrint
);

/**
 * @route   GET /api/sales-orders/proforma/:id/print
 * @desc    Get proforma invoice for printing (alternative endpoint)
 * @access  Private
 */
router.get(
  "/proforma/:id/print",
  authenticate,
  validateRequest,
  salesOrderController.getProformaInvoiceForPrint
);

/**
 * @route   GET /api/sales-orders/orders/:id/print
 * @desc    Get sales order for printing (alternative endpoint)
 * @access  Private
 */
router.get(
  "/orders/:id/print",
  authenticate,
  validateRequest,
  (req, res, next) => {
    req.query.template = "standard";
    req.query.format = req.query.format || "a4";
    next();
  },
  salesOrderController.getSalesOrderForPrint
);

// ==================== EMAIL AND PDF ROUTES ====================

/**
 * @route   GET /api/sales-orders/:id/email
 * @desc    Get sales order data for email (alternative endpoint)
 * @access  Private
 */
router.get(
  "/:id/email",
  authenticate,
  validateRequest,
  salesOrderController.getSalesOrderForEmail
);

/**
 * @route   GET /api/sales-orders/:id/pdf
 * @desc    Generate PDF for sales order (alternative endpoint)
 * @access  Private
 */
router.get(
  "/:id/pdf",
  authenticate,
  validateRequest,
  salesOrderController.downloadSalesOrderPDF
);

/**
 * @route   POST /api/sales-orders/bulk/print-data
 * @desc    Get bulk print data for multiple orders (alternative endpoint)
 * @access  Private
 */
router.post(
  "/bulk/print-data",
  authenticate,
  validateRequest,
  salesOrderController.getBulkSalesOrdersForPrint
);

// ==================== QR CODE AND ACCEPTANCE ROUTES ====================

/**
 * @route   GET /api/sales-orders/:id/qr
 * @desc    Get QR code data for order acceptance (alternative endpoint)
 * @access  Private
 */
router.get(
  "/:id/qr",
  authenticate,
  validateRequest,
  salesOrderController.getSalesOrderForQRAcceptance
);

/**
 * @route   GET /api/sales-orders/:id/accept-qr
 * @desc    Get order acceptance QR code data
 * @access  Private
 */
router.get(
  "/:id/accept-qr",
  authenticate,
  validateRequest,
  salesOrderController.getSalesOrderForQRAcceptance
);

/**
 * @route   GET /api/sales-orders/:id/acceptance-link
 * @desc    Get order acceptance link for sharing
 * @access  Private
 */
router.get(
  "/:id/acceptance-link",
  authenticate,
  validateRequest,
  async (req, res) => {
    try {
      const {id} = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sales order ID format",
        });
      }

      const salesOrder = await SalesOrder.findById(id).select(
        "orderNumber orderType status validUntil"
      );

      if (!salesOrder) {
        return res.status(404).json({
          success: false,
          message: "Sales order not found",
        });
      }

      if (["accepted", "converted", "cancelled"].includes(salesOrder.status)) {
        return res.status(400).json({
          success: false,
          message: "Order cannot be accepted in current status",
        });
      }

      const acceptanceLink = `${process.env.FRONTEND_URL}/order/accept/${id}`;

      res.json({
        success: true,
        data: {
          orderId: id,
          orderNumber: salesOrder.orderNumber,
          orderType: salesOrder.orderType,
          status: salesOrder.status,
          validUntil: salesOrder.validUntil,
          acceptanceLink,
          qrCodeUrl: `${process.env.BACKEND_URL}/api/sales-orders/${id}/qr`,
          shareableText: `Please review and accept ${salesOrder.orderType} ${salesOrder.orderNumber}: ${acceptanceLink}`,
        },
        message: "Order acceptance link generated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to generate acceptance link",
        error: error.message,
      });
    }
  }
);

// ==================== DOCUMENT FORMAT ROUTES ====================

/**
 * @route   GET /api/sales-orders/:id/formats/:format
 * @desc    Get sales order in specific format (pdf, html, json)
 * @access  Private
 */
router.get(
  "/:id/formats/:format",
  authenticate,
  validateRequest,
  async (req, res) => {
    const {id, format} = req.params;
    const {template = "standard"} = req.query;

    const validFormats = ["pdf", "html", "json", "csv"];
    if (!validFormats.includes(format)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid format. Supported formats: " + validFormats.join(", "),
      });
    }

    try {
      switch (format) {
        case "pdf":
          return await salesOrderController.downloadSalesOrderPDF(req, res);
        case "json":
          req.query.template = template;
          return await salesOrderController.getSalesOrderForPrint(req, res);
        case "html":
          req.query.template = "html";
          req.query.format = "html";
          return await salesOrderController.getSalesOrderForEmail(req, res);
        case "csv":
          return res.status(501).json({
            success: false,
            message: "CSV export for individual orders not implemented",
            suggestion: "Use bulk export for CSV format",
          });
        default:
          return res.status(400).json({
            success: false,
            message: "Unsupported format",
          });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to generate ${format} format`,
        error: error.message,
      });
    }
  }
);

// ==================== TEMPLATE-SPECIFIC ROUTES ====================

/**
 * @route   GET /api/sales-orders/:id/templates/:template
 * @desc    Get sales order with specific template
 * @access  Private
 */
router.get(
  "/:id/templates/:template",
  authenticate,
  validateRequest,
  (req, res, next) => {
    const validTemplates = [
      "standard",
      "professional",
      "minimal",
      "detailed",
      "quotation",
      "proforma",
    ];
    if (!validTemplates.includes(req.params.template)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid template. Supported templates: " + validTemplates.join(", "),
      });
    }
    req.query.template = req.params.template;
    next();
  },
  salesOrderController.getSalesOrderForPrint
);

// ==================== PREVIEW ROUTES ====================

/**
 * @route   GET /api/sales-orders/:id/preview
 * @desc    Get sales order preview data
 * @access  Private
 */
router.get(
  "/:id/preview",
  authenticate,
  validateRequest,
  (req, res, next) => {
    req.query.template = "preview";
    req.query.format = "html";
    next();
  },
  salesOrderController.getSalesOrderForEmail
);

/**
 * @route   GET /api/sales-orders/:id/print-preview
 * @desc    Get sales order print preview
 * @access  Private
 */
router.get(
  "/:id/print-preview",
  authenticate,
  validateRequest,
  (req, res, next) => {
    req.query.template = req.query.template || "standard";
    req.query.format = "a4";
    req.query.preview = "true";
    next();
  },
  salesOrderController.getSalesOrderForPrint
);

// ==================== SHARING ROUTES ====================

/**
 * @route   GET /api/sales-orders/:id/share
 * @desc    Get shareable data for sales order
 * @access  Private
 */
router.get("/:id/share", authenticate, validateRequest, async (req, res) => {
  try {
    const {id} = req.params;
    const {method = "link"} = req.query; // link, qr, email

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sales order ID format",
      });
    }

    const salesOrder = await SalesOrder.findById(id)
      .populate("customer", "name mobile email")
      .populate("companyId", "businessName")
      .select(
        "orderNumber orderType status validUntil totals customer companyId"
      );

    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message: "Sales order not found",
      });
    }

    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const shareData = {
      orderId: id,
      orderNumber: salesOrder.orderNumber,
      orderType: salesOrder.orderType,
      status: salesOrder.status,
      companyName: salesOrder.companyId?.businessName,
      customerName: salesOrder.customer?.name,
      amount: salesOrder.totals?.finalTotal,
      validUntil: salesOrder.validUntil,

      links: {
        view: `${baseUrl}/sales-orders/${id}`,
        accept: `${baseUrl}/order/accept/${id}`,
        print: `${baseUrl}/sales-orders/${id}/print`,
        pdf: `${process.env.BACKEND_URL}/api/sales-orders/${id}/pdf`,
      },

      sharing: {
        whatsapp: `https://wa.me/${salesOrder.customer?.mobile}?text=Please review ${salesOrder.orderType} ${salesOrder.orderNumber}: ${baseUrl}/order/accept/${id}`,
        email: `mailto:${salesOrder.customer?.email}?subject=${salesOrder.orderType} ${salesOrder.orderNumber}&body=Please review and accept: ${baseUrl}/order/accept/${id}`,
        sms: `sms:${salesOrder.customer?.mobile}?body=Please review ${salesOrder.orderType} ${salesOrder.orderNumber}: ${baseUrl}/order/accept/${id}`,
      },

      qrCode:
        method === "qr"
          ? {
              acceptanceUrl: `${baseUrl}/order/accept/${id}`,
              qrApiUrl: `${process.env.BACKEND_URL}/api/sales-orders/${id}/qr`,
            }
          : null,
    };

    res.json({
      success: true,
      data: shareData,
      message: "Sharing data generated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate sharing data",
      error: error.message,
    });
  }
});

// ==================== QUICK ACTION ROUTES ====================

/**
 * @route   POST /api/sales-orders/:id/quick-actions
 * @desc    Perform quick actions on sales order
 * @access  Private
 */
router.post(
  "/:id/quick-actions",
  authenticate,
  validateRequest,
  async (req, res) => {
    try {
      const {id} = req.params;
      const {action, ...actionData} = req.body;

      const validActions = [
        "print",
        "email",
        "share",
        "duplicate",
        "send",
        "accept",
        "reject",
        "convert",
      ];

      if (!validActions.includes(action)) {
        return res.status(400).json({
          success: false,
          message: "Invalid action. Valid actions: " + validActions.join(", "),
        });
      }

      // Route to appropriate controller method based on action
      switch (action) {
        case "print":
          req.query.template = actionData.template || "standard";
          req.query.format = actionData.format || "a4";
          return await salesOrderController.getSalesOrderForPrint(req, res);

        case "email":
          req.query.template = actionData.template || "professional";
          req.query.includePaymentLink = actionData.includePaymentLink || false;
          return await salesOrderController.getSalesOrderForEmail(req, res);

        case "share":
          // Redirect to share endpoint
          req.url = `/${id}/share`;
          req.query.method = actionData.method || "link";
          return router.handle(req, res);

        case "send":
          req.body.status = "sent";
          return await salesOrderController.updateStatus(req, res);

        case "accept":
          req.body.status = "accepted";
          return await salesOrderController.updateStatus(req, res);

        case "reject":
          req.body.status = "rejected";
          req.body.reason = actionData.reason || "Customer rejected";
          return await salesOrderController.updateStatus(req, res);

        case "convert":
          return await salesOrderController.convertToInvoice(req, res);

        case "duplicate":
          // Implementation for duplicating order would go here
          return res.status(501).json({
            success: false,
            message: "Duplicate action not yet implemented",
          });

        default:
          return res.status(400).json({
            success: false,
            message: "Action not implemented",
          });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to perform quick action",
        error: error.message,
      });
    }
  }
);

module.exports = router;
