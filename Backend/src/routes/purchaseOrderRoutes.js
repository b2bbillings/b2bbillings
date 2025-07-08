const express = require("express");
const router = express.Router();
const purchaseOrderController = require("../controllers/purchaseOrderController");

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
    !["purchase_order", "purchase_quotation", "proforma_purchase"].includes(
      orderType
    )
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid order type. Must be purchase_order, purchase_quotation, or proforma_purchase",
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
 * @route   GET /api/purchase-orders/admin/all
 * @desc    Get all purchase orders for admin (across all companies)
 * @access  Private (Admin only)
 */
router.get(
  "/admin/all",
  authenticate,
  // validateAdmin, // Enable when you have proper admin validation
  purchaseOrderController.getAllPurchaseOrdersForAdmin
);

/**
 * @route   GET /api/purchase-orders/admin/stats
 * @desc    Get purchase order statistics for admin dashboard
 * @access  Private (Admin only)
 */
router.get(
  "/admin/stats",
  authenticate,
  // validateAdmin, // Enable when you have proper admin validation
  purchaseOrderController.getPurchaseOrderStatsForAdmin
);

/**
 * @route   GET /api/purchase-orders/admin/conversion-analysis
 * @desc    Get conversion rate analysis for admin
 * @access  Private (Admin only)
 */
router.get(
  "/admin/conversion-analysis",
  authenticate,
  // validateAdmin, // Enable when you have proper admin validation
  purchaseOrderController.getConversionRateAnalysisForAdmin
);

/**
 * @route   GET /api/purchase-orders/admin/bidirectional-analytics
 * @desc    Get comprehensive bidirectional analytics for admin
 * @access  Private (Admin only)
 */
router.get(
  "/admin/bidirectional-analytics",
  authenticate,
  // validateAdmin, // Enable when you have proper admin validation
  purchaseOrderController.getAdminBidirectionalAnalytics
);

/**
 * @route   GET /api/purchase-orders/admin/bidirectional-dashboard
 * @desc    Get bidirectional dashboard summary for admin
 * @access  Private (Admin only)
 */
router.get(
  "/admin/bidirectional-dashboard",
  authenticate,
  // validateAdmin, // Enable when you have proper admin validation
  purchaseOrderController.getAdminBidirectionalDashboard
);

// ==================== UTILITY ROUTES (MUST BE FIRST) ====================

/**
 * @route   GET /api/purchase-orders/generate-number
 * @desc    Generate next order number
 * @access  Private
 * @query   companyId, orderType
 */
router.get(
  "/generate-number",
  authenticate,
  validateCompany,
  purchaseOrderController.generateOrderNumber
);

/**
 * @route   GET /api/purchase-orders/next-order-number
 * @desc    Get next available order number (alternative endpoint)
 * @access  Private
 */
router.get(
  "/next-order-number",
  authenticate,
  validateCompany,
  purchaseOrderController.generateOrderNumber
);

/**
 * @route   GET /api/purchase-orders/next-number
 * @desc    Get next available order number (another alternative)
 * @access  Private
 */
router.get(
  "/next-number",
  authenticate,
  validateCompany,
  purchaseOrderController.generateOrderNumber
);

/**
 * @route   GET /api/purchase-orders/check-number
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

    const PurchaseOrder = require("../models/PurchaseOrder");
    const existingOrder = await PurchaseOrder.findOne({
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
 * @route   GET /api/purchase-orders/exists
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

    const PurchaseOrder = require("../models/PurchaseOrder");
    const existingOrder = await PurchaseOrder.findOne({
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
 * @route   GET /api/purchase-orders/verify-unique
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

      const PurchaseOrder = require("../models/PurchaseOrder");
      const existingOrder = await PurchaseOrder.findOne({
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
 * @route   GET /api/purchase-orders/next-invoice-number
 * @desc    Get next purchase invoice number
 * @access  Private
 */
router.get(
  "/next-invoice-number",
  authenticate,
  validateCompany,
  purchaseOrderController.getNextInvoiceNumber
);

/**
 * @route   GET /api/purchase-orders/stats
 * @desc    Get purchase order statistics (company-specific)
 * @access  Private
 */
router.get(
  "/stats",
  authenticate,
  validateCompany,
  purchaseOrderController.getDashboardSummary
);

// ==================== BIDIRECTIONAL FUNCTIONALITY ROUTES ====================

/**
 * @route   POST /api/purchase-orders/generate-from-sales/:id
 * @desc    Generate purchase order from sales order (BIDIRECTIONAL)
 * @access  Private
 */
router.post(
  "/generate-from-sales/:id",
  authenticate,
  validateRequest,
  purchaseOrderController.generatePurchaseOrder
);

/**
 * @route   POST /api/purchase-orders/:id/generate-sales-order
 * @desc    Generate sales order from purchase order (BIDIRECTIONAL)
 * @access  Private
 */
router.post(
  "/:id/generate-sales-order",
  authenticate,
  validateRequest,
  purchaseOrderController.generateSalesOrderFromPurchaseOrder
);

/**
 * @route   POST /api/purchase-orders/bulk/generate-from-sales
 * @desc    Bulk generate purchase orders from multiple sales orders
 * @access  Private
 */
router.post(
  "/bulk/generate-from-sales",
  authenticate,
  validateRequest,
  async (req, res) => {
    try {
      const {
        salesOrderIds,
        targetCompanyId,
        convertedBy,
        notes = "",
      } = req.body;

      if (
        !salesOrderIds ||
        !Array.isArray(salesOrderIds) ||
        salesOrderIds.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Sales order IDs array is required",
        });
      }

      const results = [];
      const errors = [];

      for (const salesOrderId of salesOrderIds) {
        try {
          const mockReq = {
            params: {id: salesOrderId},
            body: {targetCompanyId, convertedBy, notes},
            user: {id: convertedBy},
          };

          let mockRes = {
            statusCode: null,
            jsonData: null,
            status: function (code) {
              this.statusCode = code;
              return this;
            },
            json: function (data) {
              this.jsonData = data;
              return this;
            },
          };

          await purchaseOrderController.generatePurchaseOrder(mockReq, mockRes);

          if (mockRes.statusCode === 201 && mockRes.jsonData.success) {
            results.push({
              salesOrderId,
              purchaseOrder: mockRes.jsonData.data.purchaseOrder,
              success: true,
            });
          } else {
            errors.push({
              salesOrderId,
              error: mockRes.jsonData?.message || "Generation failed",
            });
          }
        } catch (error) {
          errors.push({
            salesOrderId,
            error: error.message,
          });
        }
      }

      res.json({
        success: true,
        data: {
          generated: results,
          errors,
          successCount: results.length,
          errorCount: errors.length,
        },
        message: `${results.length} purchase orders generated successfully, ${errors.length} failed`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to bulk generate purchase orders",
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/purchase-orders/bulk/generate-sales-orders
 * @desc    Bulk generate sales orders from multiple purchase orders
 * @access  Private
 */
router.post(
  "/bulk/generate-sales-orders",
  authenticate,
  validateRequest,
  async (req, res) => {
    try {
      const {
        purchaseOrderIds,
        targetCompanyId,
        targetCustomerId,
        targetCustomerName,
        targetCustomerMobile,
        generatedBy,
      } = req.body;

      if (
        !purchaseOrderIds ||
        !Array.isArray(purchaseOrderIds) ||
        purchaseOrderIds.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Purchase order IDs array is required",
        });
      }

      const results = [];
      const errors = [];

      for (const purchaseOrderId of purchaseOrderIds) {
        try {
          const mockReq = {
            params: {id: purchaseOrderId},
            body: {
              targetCompanyId,
              targetCustomerId,
              targetCustomerName,
              targetCustomerMobile,
              convertedBy: generatedBy,
            },
            user: {id: generatedBy},
          };

          let mockRes = {
            statusCode: null,
            jsonData: null,
            status: function (code) {
              this.statusCode = code;
              return this;
            },
            json: function (data) {
              this.jsonData = data;
              return this;
            },
          };

          await purchaseOrderController.generateSalesOrderFromPurchaseOrder(
            mockReq,
            mockRes
          );

          if (mockRes.statusCode === 201 && mockRes.jsonData.success) {
            results.push({
              purchaseOrderId,
              salesOrder: mockRes.jsonData.data.salesOrder,
              success: true,
            });
          } else {
            errors.push({
              purchaseOrderId,
              error: mockRes.jsonData?.message || "Generation failed",
            });
          }
        } catch (error) {
          errors.push({
            purchaseOrderId,
            error: error.message,
          });
        }
      }

      res.json({
        success: true,
        data: {
          generated: results,
          errors,
          successCount: results.length,
          errorCount: errors.length,
        },
        message: `${results.length} sales orders generated successfully, ${errors.length} failed`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to bulk generate sales orders",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/purchase-orders/analytics/bidirectional
 * @desc    Get bidirectional analytics for company
 * @access  Private
 */
router.get(
  "/analytics/bidirectional",
  authenticate,
  validateCompany,
  purchaseOrderController.getBidirectionalAnalytics
);

/**
 * @route   GET /api/purchase-orders/analytics/bidirectional-purchase
 * @desc    Get bidirectional purchase analytics
 * @access  Private
 */
router.get(
  "/analytics/bidirectional-purchase",
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

      const PurchaseOrder = require("../models/PurchaseOrder");
      const analytics = await PurchaseOrder.getBidirectionalAnalytics(
        companyId
      );

      res.status(200).json({
        success: true,
        data: analytics,
        message: "Bidirectional purchase analytics retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get bidirectional purchase analytics",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/purchase-orders/auto-generated
 * @desc    Get auto-generated purchase orders (from sales orders)
 * @access  Private
 */
router.get(
  "/auto-generated",
  authenticate,
  validateCompany,
  purchaseOrderController.getAutoGeneratedOrders
);

/**
 * @route   GET /api/purchase-orders/with-corresponding-so
 * @desc    Get purchase orders with corresponding sales orders
 * @access  Private
 */
router.get(
  "/with-corresponding-so",
  authenticate,
  validateCompany,
  purchaseOrderController.getOrdersWithCorrespondingSO
);

/**
 * @route   GET /api/purchase-orders/with-generated-so
 * @desc    Get purchase orders that have generated sales orders
 * @access  Private
 */
router.get(
  "/with-generated-so",
  authenticate,
  validateCompany,
  purchaseOrderController.getPurchaseOrdersWithGeneratedSO
);

/**
 * @route   GET /api/purchase-orders/from-sales-orders
 * @desc    Get purchase orders created from sales orders
 * @access  Private
 */
router.get(
  "/from-sales-orders",
  authenticate,
  validateCompany,
  purchaseOrderController.getOrdersFromSalesOrder
);

/**
 * @route   GET /api/purchase-orders/from-sales-order/:salesOrderId
 * @desc    Get purchase orders created from specific sales order
 * @access  Private
 */
router.get(
  "/from-sales-order/:salesOrderId",
  authenticate,
  validateRequest,
  purchaseOrderController.getOrdersFromSalesOrder
);

/**
 * @route   GET /api/purchase-orders/generation-status
 * @desc    Get sales order generation status for a purchase order
 * @access  Private
 */
router.get(
  "/generation-status",
  authenticate,
  validateCompany,
  async (req, res) => {
    try {
      const {companyId, purchaseOrderId} = req.query;

      if (!companyId || !purchaseOrderId) {
        return res.status(400).json({
          success: false,
          message: "Company ID and Purchase Order ID are required",
        });
      }

      const PurchaseOrder = require("../models/PurchaseOrder");
      const purchaseOrder = await PurchaseOrder.findOne({
        _id: purchaseOrderId,
        companyId,
      }).populate("supplier", "name mobile phoneNumber email");

      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      const generationStatus = {
        purchaseOrder: {
          id: purchaseOrder._id,
          orderNumber: purchaseOrder.orderNumber,
          orderDate: purchaseOrder.orderDate,
          supplier: purchaseOrder.supplier,
          totalAmount: purchaseOrder.totals.finalTotal,
          status: purchaseOrder.status,
        },
        salesOrderGeneration: {
          hasGenerated: purchaseOrder.autoGeneratedSalesOrder,
          canGenerate:
            !purchaseOrder.autoGeneratedSalesOrder &&
            !["cancelled"].includes(purchaseOrder.status),
        },
      };

      res.status(200).json({
        success: true,
        data: generationStatus,
        message: "Sales order generation status retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get sales order generation status",
        error: error.message,
      });
    }
  }
);

// ==================== TRACKING ROUTES ====================

/**
 * @route   GET /api/purchase-orders/source-tracking/:purchaseOrderId
 * @desc    Get purchase order source tracking information
 * @access  Private
 */
router.get(
  "/source-tracking/:purchaseOrderId",
  authenticate,
  validateRequest,
  async (req, res) => {
    try {
      const {purchaseOrderId} = req.params;
      const PurchaseOrder = require("../models/PurchaseOrder");

      const sourceInfo = await PurchaseOrder.getSourceTracking(purchaseOrderId);

      res.status(200).json({
        success: true,
        data: sourceInfo,
        message: "Purchase order source tracking retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get purchase order source tracking",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/purchase-orders/:id/tracking-chain
 * @desc    Get complete tracking chain for a purchase order
 * @access  Private
 */
router.get(
  "/:id/tracking-chain",
  authenticate,
  validateRequest,
  purchaseOrderController.getTrackingChain
);

// ==================== REPORTING ROUTES ====================

/**
 * @route   GET /api/purchase-orders/reports/dashboard
 * @desc    Get purchase order dashboard summary
 * @access  Private
 */
router.get(
  "/reports/dashboard",
  authenticate,
  validateCompany,
  purchaseOrderController.getDashboardSummary
);

/**
 * @route   GET /api/purchase-orders/reports/summary
 * @desc    Get purchase order summary report for date range
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
  purchaseOrderController.getAllPurchaseOrders
);

/**
 * @route   GET /api/purchase-orders/reports/conversion-rate
 * @desc    Get order to purchase invoice conversion rate analysis
 * @access  Private
 */
router.get(
  "/reports/conversion-rate",
  authenticate,
  validateCompany,
  async (req, res) => {
    try {
      const {companyId} = req.query;
      const PurchaseOrder = require("../models/PurchaseOrder");

      const conversionStats = await PurchaseOrder.aggregate([
        {
          $match: {
            companyId: new require("mongoose").Types.ObjectId(companyId),
          },
        },
        {
          $group: {
            _id: "$orderType",
            totalOrders: {$sum: 1},
            convertedOrders: {
              $sum: {$cond: ["$convertedToPurchaseInvoice", 1, 0]},
            },
            totalValue: {$sum: "$totals.finalTotal"},
            convertedValue: {
              $sum: {
                $cond: ["$convertedToPurchaseInvoice", "$totals.finalTotal", 0],
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
 * @route   GET /api/purchase-orders/reports/aging
 * @desc    Get purchase order aging report
 * @access  Private
 */
router.get(
  "/reports/aging",
  authenticate,
  validateCompany,
  async (req, res) => {
    try {
      const {companyId} = req.query;
      const PurchaseOrder = require("../models/PurchaseOrder");
      const today = new Date();

      const agingReport = await PurchaseOrder.aggregate([
        {
          $match: {
            companyId: new require("mongoose").Types.ObjectId(companyId),
            status: {$nin: ["cancelled", "completed"]},
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
 * @route   GET /api/purchase-orders/reports/supplier-performance
 * @desc    Get supplier performance analysis
 * @access  Private
 */
router.get(
  "/reports/supplier-performance",
  authenticate,
  validateCompany,
  async (req, res) => {
    try {
      const {companyId} = req.query;
      const PurchaseOrder = require("../models/PurchaseOrder");

      const supplierPerformance = await PurchaseOrder.aggregate([
        {
          $match: {
            companyId: new require("mongoose").Types.ObjectId(companyId),
          },
        },
        {
          $lookup: {
            from: "parties",
            localField: "supplier",
            foreignField: "_id",
            as: "supplierDetails",
          },
        },
        {$unwind: "$supplierDetails"},
        {
          $group: {
            _id: "$supplier",
            supplierName: {$first: "$supplierDetails.name"},
            totalOrders: {$sum: 1},
            totalValue: {$sum: "$totals.finalTotal"},
            completedOrders: {
              $sum: {$cond: [{$eq: ["$status", "completed"]}, 1, 0]},
            },
            onTimeDeliveries: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {$ne: ["$deliveryDate", null]},
                      {$lte: ["$deliveryDate", "$expectedDeliveryDate"]},
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            averageOrderValue: {$avg: "$totals.finalTotal"},
            pendingPayment: {$sum: "$payment.pendingAmount"},
          },
        },
        {
          $project: {
            supplierName: 1,
            totalOrders: 1,
            totalValue: 1,
            completedOrders: 1,
            onTimeDeliveries: 1,
            completionRate: {
              $multiply: [{$divide: ["$completedOrders", "$totalOrders"]}, 100],
            },
            onTimeRate: {
              $multiply: [
                {$divide: ["$onTimeDeliveries", "$totalOrders"]},
                100,
              ],
            },
            averageOrderValue: {$round: ["$averageOrderValue", 2]},
            pendingPayment: 1,
          },
        },
        {$sort: {totalValue: -1}},
      ]);

      res.json({
        success: true,
        data: supplierPerformance,
        message: "Supplier performance analysis retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get supplier performance analysis",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/purchase-orders/reports/bidirectional-summary
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
      const PurchaseOrder = require("../models/PurchaseOrder");
      const mongoose = require("mongoose");

      const filter = {companyId: new mongoose.Types.ObjectId(companyId)};

      if (dateFrom || dateTo) {
        filter.orderDate = {};
        if (dateFrom) filter.orderDate.$gte = new Date(dateFrom);
        if (dateTo) filter.orderDate.$lte = new Date(dateTo);
      }

      const summary = await PurchaseOrder.aggregate([
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
            ordersFromSalesOrders: {
              $sum: {$cond: [{$eq: ["$sourceOrderType", "sales_order"]}, 1, 0]},
            },
            ordersWithCorrespondingSO: {
              $sum: {
                $cond: [{$ne: ["$correspondingSalesOrderId", null]}, 1, 0],
              },
            },
            ordersWithGeneratedSO: {
              $sum: {$cond: ["$autoGeneratedSalesOrder", 1, 0]},
            },
            convertedToPurchaseInvoices: {
              $sum: {$cond: ["$convertedToPurchaseInvoice", 1, 0]},
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
            ordersFromSalesOrders: 1,
            ordersWithCorrespondingSO: 1,
            ordersWithGeneratedSO: 1,
            convertedToPurchaseInvoices: 1,
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
                        "$ordersFromSalesOrders",
                        "$ordersWithCorrespondingSO",
                        "$ordersWithGeneratedSO",
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
                {$divide: ["$convertedToPurchaseInvoices", "$totalOrders"]},
                100,
              ],
            },
            salesOrderGenerationRate: {
              $multiply: [
                {$divide: ["$ordersWithGeneratedSO", "$totalOrders"]},
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
          ordersFromSalesOrders: 0,
          ordersWithCorrespondingSO: 0,
          ordersWithGeneratedSO: 0,
          convertedToPurchaseInvoices: 0,
          totalValue: 0,
          autoGeneratedValue: 0,
          manualValue: 0,
          autoGenerationRate: 0,
          bidirectionalCoverage: 0,
          conversionRate: 0,
          salesOrderGenerationRate: 0,
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
 * @route   GET /api/purchase-orders/by-type/:orderType
 * @desc    Get orders by type (purchase_order, purchase_quotation, proforma_purchase)
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
  purchaseOrderController.getAllPurchaseOrders
);

/**
 * @route   GET /api/purchase-orders/quotations
 * @desc    Get all purchase quotations
 * @access  Private
 */
router.get(
  "/quotations",
  authenticate,
  validateCompany,
  (req, res, next) => {
    req.query.orderType = "purchase_quotation";
    next();
  },
  purchaseOrderController.getAllPurchaseOrders
);

/**
 * @route   GET /api/purchase-orders/orders
 * @desc    Get all purchase orders
 * @access  Private
 */
router.get(
  "/orders",
  authenticate,
  validateCompany,
  (req, res, next) => {
    req.query.orderType = "purchase_order";
    next();
  },
  purchaseOrderController.getAllPurchaseOrders
);

/**
 * @route   GET /api/purchase-orders/proforma
 * @desc    Get all proforma purchases
 * @access  Private
 */
router.get(
  "/proforma",
  authenticate,
  validateCompany,
  (req, res, next) => {
    req.query.orderType = "proforma_purchase";
    next();
  },
  purchaseOrderController.getAllPurchaseOrders
);

/**
 * @route   GET /api/purchase-orders/by-status/:status
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
  purchaseOrderController.getAllPurchaseOrders
);

/**
 * @route   GET /api/purchase-orders/draft
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
  purchaseOrderController.getAllPurchaseOrders
);

/**
 * @route   GET /api/purchase-orders/pending
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
  purchaseOrderController.getAllPurchaseOrders
);

/**
 * @route   GET /api/purchase-orders/active
 * @desc    Get active orders (not cancelled or completed)
 * @access  Private
 */
router.get(
  "/active",
  authenticate,
  validateCompany,
  (req, res, next) => {
    req.query.status = "draft,sent,confirmed,received";
    next();
  },
  purchaseOrderController.getAllPurchaseOrders
);

/**
 * @route   GET /api/purchase-orders/confirmed
 * @desc    Get confirmed orders
 * @access  Private
 */
router.get(
  "/confirmed",
  authenticate,
  validateCompany,
  (req, res, next) => {
    req.query.status = "confirmed";
    next();
  },
  purchaseOrderController.getAllPurchaseOrders
);

/**
 * @route   GET /api/purchase-orders/received
 * @desc    Get received orders
 * @access  Private
 */
router.get(
  "/received",
  authenticate,
  validateCompany,
  (req, res, next) => {
    req.query.status = "received";
    next();
  },
  purchaseOrderController.getAllPurchaseOrders
);

/**
 * @route   GET /api/purchase-orders/expired
 * @desc    Get expired purchase orders/quotations
 * @access  Private
 */
router.get(
  "/expired",
  authenticate,
  validateCompany,
  purchaseOrderController.getExpiredOrders
);

/**
 * @route   GET /api/purchase-orders/expiring-soon
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
    req.query.status = "draft,sent,confirmed";
    next();
  },
  purchaseOrderController.getAllPurchaseOrders
);

/**
 * @route   GET /api/purchase-orders/pending-payment
 * @desc    Get purchase orders with pending payments
 * @access  Private
 */
router.get(
  "/pending-payment",
  authenticate,
  validateCompany,
  purchaseOrderController.getPendingOrdersForPayment
);

/**
 * @route   GET /api/purchase-orders/pending-approval
 * @desc    Get orders awaiting approval
 * @access  Private
 */
router.get(
  "/pending-approval",
  authenticate,
  validateCompany,
  purchaseOrderController.getOrdersAwaitingApproval
);

/**
 * @route   GET /api/purchase-orders/required-by-date
 * @desc    Get orders required by specific date
 * @access  Private
 */
router.get(
  "/required-by-date",
  authenticate,
  validateCompany,
  purchaseOrderController.getOrdersRequiredByDate
);

/**
 * @route   GET /api/purchase-orders/search
 * @desc    Search purchase orders by various criteria
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
  purchaseOrderController.getAllPurchaseOrders
);

// ==================== SUPPLIER-SPECIFIC ROUTES ====================

/**
 * @route   GET /api/purchase-orders/supplier/:supplierId/pending-documents
 * @desc    Get supplier's pending documents (orders + invoices) for payment allocation
 * @access  Private
 */
router.get(
  "/supplier/:supplierId/pending-documents",
  authenticate,
  validateCompany,
  purchaseOrderController.getSupplierPendingDocuments
);

/**
 * @route   GET /api/purchase-orders/supplier/pending-documents
 * @desc    Get supplier's pending documents (orders + invoices) for payment allocation
 * @access  Private
 */
router.get(
  "/supplier/pending-documents",
  authenticate,
  validateCompany,
  purchaseOrderController.getSupplierPendingDocuments
);

// ==================== EXPORT ROUTES ====================

/**
 * @route   GET /api/purchase-orders/export/csv
 * @desc    Export purchase orders data as CSV
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

    const PurchaseOrder = require("../models/PurchaseOrder");
    const orders = await PurchaseOrder.find(filter)
      .populate("supplier", "name mobile email")
      .populate("sourceCompanyId", "businessName")
      .populate("targetCompanyId", "businessName")
      .sort({orderDate: -1});

    const csvHeaders = [
      "Order Number",
      "Order Type",
      "Date",
      "Supplier Name",
      "Supplier Mobile",
      "Status",
      "Priority",
      "Total Amount",
      "Paid Amount",
      "Pending Amount",
      "Payment Status",
      "Valid Until",
      "Required By",
      "Expected Delivery",
      "Delivery Date",
      "Converted to Invoice",
      "Is Auto Generated",
      "Generated From",
      "Source Order Number",
      "Source Company",
      "Target Company",
      "Has Generated SO",
      "Generated SO Number",
      "Created At",
    ];

    const csvRows = orders.map((order) => [
      order.orderNumber,
      order.orderType,
      order.orderDate.toISOString().split("T")[0],
      order.supplier?.name || "",
      order.supplier?.mobile || order.supplierMobile || "",
      order.status,
      order.priority,
      order.totals?.finalTotal || 0,
      order.payment?.paidAmount || 0,
      order.payment?.pendingAmount || 0,
      order.payment?.status || "pending",
      order.validUntil ? order.validUntil.toISOString().split("T")[0] : "",
      order.requiredBy ? order.requiredBy.toISOString().split("T")[0] : "",
      order.expectedDeliveryDate
        ? order.expectedDeliveryDate.toISOString().split("T")[0]
        : "",
      order.deliveryDate ? order.deliveryDate.toISOString().split("T")[0] : "",
      order.convertedToPurchaseInvoice ? "Yes" : "No",
      order.isAutoGenerated ? "Yes" : "No",
      order.generatedFrom || "manual",
      order.sourceOrderNumber || "",
      order.sourceCompanyId?.businessName || "",
      order.targetCompanyId?.businessName || "",
      order.autoGeneratedSalesOrder ? "Yes" : "No",
      order.salesOrderNumber || "",
      order.createdAt.toISOString().split("T")[0],
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="purchase-orders-${Date.now()}.csv"`
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
 * @route   PATCH /api/purchase-orders/bulk/status
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
        "confirmed",
        "received",
        "partially_received",
        "cancelled",
        "completed",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        });
      }

      const PurchaseOrder = require("../models/PurchaseOrder");
      const updateResult = await PurchaseOrder.updateMany(
        {
          _id: {$in: orderIds},
          convertedToPurchaseInvoice: false,
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
 * @route   POST /api/purchase-orders/bulk/convert
 * @desc    Bulk convert multiple orders to purchase invoices
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

      const PurchaseOrder = require("../models/PurchaseOrder");
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
 * @route   PATCH /api/purchase-orders/bulk/approve
 * @desc    Bulk approve multiple orders
 * @access  Private
 */
router.patch(
  "/bulk/approve",
  authenticate,
  validateRequest,
  async (req, res) => {
    try {
      const {orderIds, approvedBy} = req.body;

      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Order IDs array is required",
        });
      }

      const PurchaseOrder = require("../models/PurchaseOrder");
      const updateResult = await PurchaseOrder.updateMany(
        {
          _id: {$in: orderIds},
          status: "draft",
          approvedBy: null,
        },
        {
          status: "confirmed",
          approvedBy: approvedBy || req.user?.id || "system",
          approvedAt: new Date(),
          lastModifiedBy: req.user?.id || "system",
        }
      );

      res.json({
        success: true,
        data: {
          modifiedCount: updateResult.modifiedCount,
          matchedCount: updateResult.matchedCount,
        },
        message: `${updateResult.modifiedCount} orders approved successfully`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to bulk approve orders",
        error: error.message,
      });
    }
  }
);

/**
 * @route   PATCH /api/purchase-orders/bulk/send
 * @desc    Bulk send multiple orders to suppliers
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

    const PurchaseOrder = require("../models/PurchaseOrder");
    const updateResult = await PurchaseOrder.updateMany(
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
 * @route   POST /api/purchase-orders
 * @desc    Create a new purchase order/quotation/proforma purchase
 * @access  Private
 */
router.post(
  "/",
  authenticate,
  validateRequest,
  validateOrderType,
  purchaseOrderController.createPurchaseOrder
);

/**
 * 🔥 MAIN ROUTE: Get all purchase orders with advanced filtering
 * @route   GET /api/purchase-orders
 * @desc    Get all purchase orders with pagination and filters (WITH ADMIN SUPPORT)
 * @access  Private
 * @query   companyId, orderType, status, search, dateFrom, dateTo, etc.
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const isAdminRequest =
      req.query.isAdmin === "true" ||
      req.query.includeAllCompanies === "true" ||
      req.query.adminAccess === "true" ||
      req.headers["x-admin-access"] === "true";

    if (isAdminRequest) {
      return await purchaseOrderController.getAllPurchaseOrdersForAdmin(
        req,
        res
      );
    } else {
      const companyId = req.query.companyId || req.body.companyId;
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required for regular users",
          code: "COMPANY_ID_REQUIRED",
        });
      }

      return await purchaseOrderController.getAllPurchaseOrders(req, res);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
      data: {
        purchaseOrders: [],
        orders: [],
        data: [],
        count: 0,
      },
    });
  }
});

// ==================== PARAMETERIZED ROUTES (MUST BE LAST) ====================

/**
 * @route   POST /api/purchase-orders/:id/create-corresponding-so
 * @desc    Manually create corresponding sales order for purchase order
 * @access  Private
 */
router.post(
  "/:id/create-corresponding-so",
  authenticate,
  validateRequest,
  purchaseOrderController.createCorrespondingSalesOrder
);

/**
 * @route   POST /api/purchase-orders/:id/convert-to-invoice
 * @desc    Convert purchase order to purchase invoice
 * @access  Private
 */
router.post(
  "/:id/convert-to-invoice",
  authenticate,
  validateRequest,
  purchaseOrderController.convertToPurchaseInvoice
);

/**
 * @route   POST /api/purchase-orders/:id/convert
 * @desc    Convert purchase order to purchase invoice (alternative endpoint)
 * @access  Private
 */
router.post(
  "/:id/convert",
  authenticate,
  validateRequest,
  purchaseOrderController.convertToPurchaseInvoice
);

/**
 * @route   PATCH /api/purchase-orders/:id/status
 * @desc    Update purchase order status
 * @access  Private
 */
router.patch(
  "/:id/status",
  authenticate,
  validateRequest,
  purchaseOrderController.updateStatus
);

/**
 * @route   PATCH /api/purchase-orders/:id/confirm
 * @desc    Mark purchase order as confirmed
 * @access  Private
 */
router.patch(
  "/:id/confirm",
  authenticate,
  validateRequest,
  (req, res, next) => {
    req.body.status = "confirmed";
    next();
  },
  purchaseOrderController.updateStatus
);

// ✅ ADD to purchaseOrderRoutes.js
router.post(
  "/:id/confirm",
  authenticate,
  validateRequest,
  purchaseOrderController.confirmPurchaseOrder
);

/**
 * @route   PATCH /api/purchase-orders/:id/receive
 * @desc    Mark purchase order as received
 * @access  Private
 */
router.patch(
  "/:id/receive",
  authenticate,
  validateRequest,
  (req, res, next) => {
    req.body.status = "received";
    next();
  },
  purchaseOrderController.updateStatus
);

/**
 * @route   PATCH /api/purchase-orders/:id/send
 * @desc    Mark purchase order as sent
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
  purchaseOrderController.updateStatus
);

/**
 * @route   PATCH /api/purchase-orders/:id/cancel
 * @desc    Cancel a purchase order
 * @access  Private
 */
router.patch(
  "/:id/cancel",
  authenticate,
  validateRequest,
  purchaseOrderController.deletePurchaseOrder
);

/**
 * @route   POST /api/purchase-orders/:id/payment
 * @desc    Add payment to a purchase order
 * @access  Private
 */
router.post(
  "/:id/payment",
  authenticate,
  validateRequest,
  purchaseOrderController.addPayment
);

/**
 * @route   POST /api/purchase-orders/:id/payments
 * @desc    Add payment to a purchase order (alternative endpoint)
 * @access  Private
 */
router.post(
  "/:id/payments",
  authenticate,
  validateRequest,
  purchaseOrderController.addPayment
);

/**
 * @route   POST /api/purchase-orders/:id/advance-payment
 * @desc    Add advance payment to a purchase order
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
  purchaseOrderController.addPayment
);

/**
 * @route   GET /api/purchase-orders/:id
 * @desc    Get purchase order by ID with full details
 * @access  Private
 */
router.get(
  "/:id",
  authenticate,
  validateRequest,
  purchaseOrderController.getPurchaseOrderById
);

/**
 * @route   PUT /api/purchase-orders/:id
 * @desc    Update purchase order (only non-converted orders can be updated)
 * @access  Private
 */
router.put(
  "/:id",
  authenticate,
  validateRequest,
  purchaseOrderController.updatePurchaseOrder
);

/**
 * @route   DELETE /api/purchase-orders/:id
 * @desc    Cancel purchase order (soft delete)
 * @access  Private
 */
router.delete(
  "/:id",
  authenticate,
  validateRequest,
  purchaseOrderController.deletePurchaseOrder
);

// ==================== 🖨️ PRINT & EXPORT ROUTES ====================

/**
 * @route   GET /api/purchase-orders/:id/print
 * @desc    Get purchase order data for printing
 * @access  Private
 */
router.get(
  "/:id/print",
  authenticate,
  validateRequest,
  purchaseOrderController.getPurchaseOrderForPrint
);

/**
 * @route   GET /api/purchase-orders/:id/email
 * @desc    Get purchase order data for email/PDF generation
 * @access  Private
 */
router.get(
  "/:id/email",
  authenticate,
  validateRequest,
  purchaseOrderController.getPurchaseOrderForEmail
);

/**
 * @route   GET /api/purchase-orders/:id/download-pdf
 * @desc    Download purchase order as PDF
 * @access  Private
 */
router.get(
  "/:id/download-pdf",
  authenticate,
  validateRequest,
  purchaseOrderController.downloadPurchaseOrderPDF
);

/**
 * @route   POST /api/purchase-orders/bulk/print
 * @desc    Get multiple purchase orders for bulk printing
 * @access  Private
 */
router.post(
  "/bulk/print",
  authenticate,
  validateRequest,
  purchaseOrderController.getBulkPurchaseOrdersForPrint
);

/**
 * @route   GET /api/purchase-orders/:id/qr-confirmation
 * @desc    Get purchase order QR confirmation data
 * @access  Private
 */
router.get(
  "/:id/qr-confirmation",
  authenticate,
  validateRequest,
  purchaseOrderController.getPurchaseOrderForQRConfirmation
);

/**
 * @route   GET /api/purchase-orders/:id/summary
 * @desc    Get purchase order summary for quick view
 * @access  Private
 */
router.get(
  "/:id/summary",
  authenticate,
  validateRequest,
  purchaseOrderController.getPurchaseOrderSummary
);

/**
 * @route   GET /api/purchase-orders/quotations/:id/print
 * @desc    Get purchase quotation for printing
 * @access  Private
 */
router.get(
  "/quotations/:id/print",
  authenticate,
  validateRequest,
  purchaseOrderController.getPurchaseQuotationForPrint
);

/**
 * @route   GET /api/purchase-orders/proforma/:id/print
 * @desc    Get proforma purchase order for printing
 * @access  Private
 */
router.get(
  "/proforma/:id/print",
  authenticate,
  validateRequest,
  purchaseOrderController.getProformaPurchaseForPrint
);

// ==================== 📄 DOCUMENT TYPE SPECIFIC PRINT ROUTES ====================

/**
 * @route   GET /api/purchase-orders/print/quotation/:id
 * @desc    Get purchase quotation for printing (alternative endpoint)
 * @access  Private
 */
router.get(
  "/print/quotation/:id",
  authenticate,
  validateRequest,
  purchaseOrderController.getPurchaseQuotationForPrint
);

/**
 * @route   GET /api/purchase-orders/print/proforma/:id
 * @desc    Get proforma purchase for printing (alternative endpoint)
 * @access  Private
 */
router.get(
  "/print/proforma/:id",
  authenticate,
  validateRequest,
  purchaseOrderController.getProformaPurchaseForPrint
);

/**
 * @route   GET /api/purchase-orders/print/order/:id
 * @desc    Get purchase order for printing (alternative endpoint)
 * @access  Private
 */
router.get(
  "/print/order/:id",
  authenticate,
  validateRequest,
  purchaseOrderController.getPurchaseOrderForPrint
);

// ==================== 📧 EMAIL & SHARING ROUTES ====================

/**
 * @route   GET /api/purchase-orders/:id/email-data
 * @desc    Get purchase order email data (alternative endpoint)
 * @access  Private
 */
router.get(
  "/:id/email-data",
  authenticate,
  validateRequest,
  purchaseOrderController.getPurchaseOrderForEmail
);

/**
 * @route   GET /api/purchase-orders/:id/sharing-data
 * @desc    Get purchase order data for sharing
 * @access  Private
 */
router.get(
  "/:id/sharing-data",
  authenticate,
  validateRequest,
  purchaseOrderController.getPurchaseOrderForEmail
);

// ==================== 🔗 QR CODE & CONFIRMATION ROUTES ====================

/**
 * @route   GET /api/purchase-orders/:id/qr-code
 * @desc    Get purchase order QR code data (alternative endpoint)
 * @access  Private
 */
router.get(
  "/:id/qr-code",
  authenticate,
  validateRequest,
  purchaseOrderController.getPurchaseOrderForQRConfirmation
);

/**
 * @route   GET /api/purchase-orders/:id/confirmation-qr
 * @desc    Get purchase order confirmation QR (alternative endpoint)
 * @access  Private
 */
router.get(
  "/:id/confirmation-qr",
  authenticate,
  validateRequest,
  purchaseOrderController.getPurchaseOrderForQRConfirmation
);

// ==================== 📊 QUICK VIEW & PREVIEW ROUTES ====================

/**
 * @route   GET /api/purchase-orders/:id/preview
 * @desc    Get purchase order preview data (alternative endpoint)
 * @access  Private
 */
router.get(
  "/:id/preview",
  authenticate,
  validateRequest,
  purchaseOrderController.getPurchaseOrderSummary
);

/**
 * @route   GET /api/purchase-orders/:id/quick-view
 * @desc    Get purchase order quick view data (alternative endpoint)
 * @access  Private
 */
router.get(
  "/:id/quick-view",
  authenticate,
  validateRequest,
  purchaseOrderController.getPurchaseOrderSummary
);

// ==================== 📁 BULK OPERATIONS FOR PRINTING ====================

/**
 * @route   POST /api/purchase-orders/bulk/email-data
 * @desc    Get multiple purchase orders for bulk email
 * @access  Private
 */
router.post(
  "/bulk/email-data",
  authenticate,
  validateRequest,
  async (req, res) => {
    try {
      const {ids} = req.body;
      const {template = "professional"} = req.query;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Order IDs array is required",
        });
      }

      const results = [];
      const errors = [];

      for (const id of ids) {
        try {
          const mockReq = {
            params: {id},
            query: {template},
            user: req.user,
          };

          let mockRes = {
            statusCode: null,
            jsonData: null,
            status: function (code) {
              this.statusCode = code;
              return this;
            },
            json: function (data) {
              this.jsonData = data;
              return this;
            },
          };

          await purchaseOrderController.getPurchaseOrderForEmail(
            mockReq,
            mockRes
          );

          if (mockRes.statusCode === 200 && mockRes.jsonData.success) {
            results.push({
              orderId: id,
              emailData: mockRes.jsonData.data,
              success: true,
            });
          } else {
            errors.push({
              orderId: id,
              error: mockRes.jsonData?.message || "Failed to get email data",
            });
          }
        } catch (error) {
          errors.push({
            orderId: id,
            error: error.message,
          });
        }
      }

      res.json({
        success: true,
        data: {
          emailData: results,
          errors,
          successCount: results.length,
          errorCount: errors.length,
        },
        message: `${results.length} purchase orders prepared for bulk email`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get bulk email data",
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/purchase-orders/bulk/download-pdf
 * @desc    Download multiple purchase orders as PDFs
 * @access  Private
 */
router.post(
  "/bulk/download-pdf",
  authenticate,
  validateRequest,
  async (req, res) => {
    try {
      const {ids} = req.body;
      const {template = "standard", format = "a4"} = req.query;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Order IDs array is required",
        });
      }

      const validIds = ids.filter((id) =>
        require("mongoose").Types.ObjectId.isValid(id)
      );

      if (validIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid order IDs provided",
        });
      }

      const PurchaseOrder = require("../models/PurchaseOrder");
      const orders = await PurchaseOrder.find({_id: {$in: validIds}})
        .select("orderNumber orderType totals.finalTotal")
        .lean();

      const downloadData = {
        requestId: `bulk-pdf-${Date.now()}`,
        orderIds: validIds,
        orderCount: orders.length,
        totalAmount: orders.reduce(
          (sum, order) => sum + (order.totals?.finalTotal || 0),
          0
        ),
        downloadUrl: `/api/purchase-orders/bulk/print?format=pdf&template=${template}`,
        format,
        template,
        generatedAt: new Date(),
      };

      res.json({
        success: true,
        data: downloadData,
        message: `${orders.length} purchase orders prepared for bulk PDF download`,
        action: "bulk_pdf_download",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to prepare bulk PDF download",
        error: error.message,
      });
    }
  }
);

// ==================== 📱 MOBILE & APP SPECIFIC ROUTES ====================

/**
 * @route   GET /api/purchase-orders/:id/mobile-print
 * @desc    Get purchase order data optimized for mobile printing
 * @access  Private
 */
router.get(
  "/:id/mobile-print",
  authenticate,
  validateRequest,
  (req, res, next) => {
    req.query.format = "mobile";
    req.query.template = "compact";
    next();
  },
  purchaseOrderController.getPurchaseOrderForPrint
);

/**
 * @route   GET /api/purchase-orders/:id/thermal-print
 * @desc    Get purchase order data optimized for thermal printer
 * @access  Private
 */
router.get(
  "/:id/thermal-print",
  authenticate,
  validateRequest,
  (req, res, next) => {
    req.query.format = "thermal";
    req.query.template = "minimal";
    next();
  },
  purchaseOrderController.getPurchaseOrderForPrint
);

/**
 * @route   GET /api/purchase-orders/:id/whatsapp-share
 * @desc    Get purchase order data optimized for WhatsApp sharing
 * @access  Private
 */
router.get(
  "/:id/whatsapp-share",
  authenticate,
  validateRequest,
  (req, res, next) => {
    req.query.template = "whatsapp";
    req.query.includePaymentLink = "true";
    next();
  },
  purchaseOrderController.getPurchaseOrderForEmail
);

// ==================== 🔍 DOCUMENT VALIDATION & PREVIEW ====================

/**
 * @route   GET /api/purchase-orders/:id/validate-print
 * @desc    Validate purchase order data before printing
 * @access  Private
 */
router.get(
  "/:id/validate-print",
  authenticate,
  validateRequest,
  async (req, res) => {
    try {
      const {id} = req.params;

      if (!require("mongoose").Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase order ID format",
        });
      }

      const PurchaseOrder = require("../models/PurchaseOrder");
      const order = await PurchaseOrder.findById(id)
        .populate("supplier", "name mobile email")
        .populate("companyId", "businessName gstin")
        .lean();

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      const validationResults = {
        isValid: true,
        warnings: [],
        errors: [],
        recommendations: [],
      };

      // Validate required fields
      if (!order.supplier) {
        validationResults.errors.push("Supplier information is missing");
        validationResults.isValid = false;
      }

      if (!order.companyId) {
        validationResults.errors.push("Company information is missing");
        validationResults.isValid = false;
      }

      if (!order.items || order.items.length === 0) {
        validationResults.errors.push("No items found in the order");
        validationResults.isValid = false;
      }

      // Check for warnings
      if (!order.companyId?.gstin) {
        validationResults.warnings.push("Company GST number is not set");
      }

      if (!order.supplier?.mobile && !order.supplier?.email) {
        validationResults.warnings.push(
          "Supplier contact information is incomplete"
        );
      }

      if (order.status === "cancelled") {
        validationResults.warnings.push("Order is cancelled");
      }

      // Add recommendations
      if (order.status === "draft") {
        validationResults.recommendations.push(
          "Consider sending the order before printing"
        );
      }

      if (!order.notes && !order.termsAndConditions) {
        validationResults.recommendations.push(
          "Add terms and conditions for better clarity"
        );
      }

      res.json({
        success: true,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          validation: validationResults,
          printReady: validationResults.isValid,
        },
        message: validationResults.isValid
          ? "Order is ready for printing"
          : "Order has validation issues",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to validate order for printing",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/purchase-orders/print-templates
 * @desc    Get available print templates
 * @access  Private
 */
router.get("/print-templates", authenticate, (req, res) => {
  const templates = {
    standard: {
      name: "Standard",
      description: "Default purchase order template",
      features: ["Company logo", "Full item details", "Tax breakdown"],
      formats: ["a4", "letter"],
    },
    compact: {
      name: "Compact",
      description: "Space-saving template for mobile",
      features: ["Essential details only", "Mobile optimized"],
      formats: ["a4", "mobile"],
    },
    professional: {
      name: "Professional",
      description: "Business-oriented template with enhanced formatting",
      features: ["Professional layout", "Enhanced branding", "Detailed terms"],
      formats: ["a4", "letter"],
    },
    quotation: {
      name: "Quotation",
      description: "Template specifically for purchase quotations",
      features: ["Validity information", "Approval workflow", "Quote terms"],
      formats: ["a4", "letter"],
    },
    proforma: {
      name: "Proforma",
      description: "Template for proforma purchase orders",
      features: ["Advance payment terms", "Delivery conditions"],
      formats: ["a4", "letter"],
    },
    minimal: {
      name: "Minimal",
      description: "Basic template for thermal printers",
      features: ["Essential info only", "Thermal printer friendly"],
      formats: ["thermal", "receipt"],
    },
    whatsapp: {
      name: "WhatsApp",
      description: "Template optimized for WhatsApp sharing",
      features: ["Mobile friendly", "Quick summary", "Contact links"],
      formats: ["mobile", "image"],
    },
  };

  res.json({
    success: true,
    data: {
      templates,
      defaultTemplate: "standard",
      defaultFormat: "a4",
    },
    message: "Print templates retrieved successfully",
  });
});

module.exports = router;
