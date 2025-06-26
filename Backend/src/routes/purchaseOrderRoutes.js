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
          // Simulate individual generation call
          req.params.id = salesOrderId;
          req.body = {targetCompanyId, convertedBy, notes};

          const result = await purchaseOrderController.generatePurchaseOrder(
            req,
            {
              status: (code) => ({
                json: (data) => {
                  if (code === 201) {
                    results.push({
                      salesOrderId,
                      purchaseOrder: data.data.purchaseOrder,
                      success: true,
                    });
                  } else {
                    errors.push({
                      salesOrderId,
                      error: data.message || "Generation failed",
                    });
                  }
                },
              }),
            }
          );
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

// ==================== FILTERING ROUTES ====================

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
      "Has Corresponding SO",
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
      order.correspondingSalesOrderNumber ? "Yes" : "No",
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
 * @desc    Get all purchase orders with pagination and filters
 * @access  Private
 * @query   companyId, orderType, status, search, dateFrom, dateTo, etc.
 */
router.get(
  "/",
  authenticate,
  validateCompany,
  purchaseOrderController.getAllPurchaseOrders
);

// ==================== PARAMETERIZED ROUTES (MUST BE LAST) ====================

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

module.exports = router;
