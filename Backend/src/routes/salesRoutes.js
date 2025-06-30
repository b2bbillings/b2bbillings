const express = require("express");
const router = express.Router();
const saleController = require("../controllers/saleController");

// Middleware for validation (you can add authentication middleware here)
const validateRequest = (req, res, next) => {
  // Add any common validation logic here
  next();
};

// Authentication middleware (add your auth logic)
const authenticate = (req, res, next) => {
  // Add your authentication logic here
  // For now, just passing through
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

// ==================== UTILITY ROUTES (Must come FIRST) ====================

/**
 * @route   POST /api/sales/validate-stock
 * @desc    Validate stock availability for items
 * @access  Private
 */
router.post(
  "/validate-stock",
  authenticate,
  validateRequest,
  saleController.validateStock
);

/**
 * @route   GET /api/sales/next-invoice-number
 * @desc    Get next invoice number preview
 * @access  Private
 */
router.get(
  "/next-invoice-number",
  authenticate,
  validateCompany,
  saleController.getNextInvoiceNumber
);

// ==================== BIDIRECTIONAL ORDER ROUTES (NEW) ====================

/**
 * @route   POST /api/sales/convert-from-sales-order/:salesOrderId
 * @desc    Convert sales order to invoice
 * @access  Private
 */
router.post(
  "/convert-from-sales-order/:salesOrderId",
  authenticate,
  validateRequest,
  saleController.convertSalesOrderToInvoice
);

/**
 * @route   POST /api/sales/bulk-convert-sales-orders
 * @desc    Bulk convert multiple sales orders to invoices
 * @access  Private
 */
router.post(
  "/bulk-convert-sales-orders",
  authenticate,
  validateRequest,
  saleController.bulkConvertSalesOrdersToInvoices
);

/**
 * @route   GET /api/sales/from-sales-orders
 * @desc    Get invoices created from sales orders
 * @access  Private
 */
router.get(
  "/from-sales-orders",
  authenticate,
  validateCompany,
  saleController.getInvoicesFromSalesOrders
);

/**
 * @route   GET /api/sales/sales-order-conversion-status
 * @desc    Get sales order conversion status
 * @access  Private
 */
router.get(
  "/sales-order-conversion-status",
  authenticate,
  validateCompany,
  saleController.getSalesOrderConversionStatus
);

// ==================== BIDIRECTIONAL INVOICE ROUTES (NEW) ====================

/**
 * @route   POST /api/sales/:salesInvoiceId/convert-to-purchase-invoice
 * @desc    Convert sales invoice to purchase invoice (bidirectional)
 * @access  Private
 */
router.post(
  "/:salesInvoiceId/convert-to-purchase-invoice",
  authenticate,
  validateRequest,
  saleController.convertSalesInvoiceToPurchaseInvoice
);

/**
 * @route   GET /api/sales/purchase-invoices-from-sales
 * @desc    Get purchase invoices created from sales invoices
 * @access  Private
 */
router.get(
  "/purchase-invoices-from-sales",
  authenticate,
  validateCompany,
  saleController.getPurchaseInvoicesFromSalesInvoices
);

/**
 * @route   GET /api/sales/bidirectional-invoice-analytics
 * @desc    Get bidirectional invoice analytics
 * @access  Private
 */
router.get(
  "/bidirectional-invoice-analytics",
  authenticate,
  validateCompany,
  saleController.getBidirectionalInvoiceAnalytics
);

/**
 * @route   GET /api/sales/invoice-conversion-status
 * @desc    Get sales invoice conversion status
 * @access  Private
 */
router.get(
  "/invoice-conversion-status",
  authenticate,
  validateCompany,
  saleController.getSalesInvoiceConversionStatus
);

/**
 * @route   POST /api/sales/bulk-convert-to-purchase-invoices
 * @desc    Bulk convert sales invoices to purchase invoices
 * @access  Private
 */
router.post(
  "/bulk-convert-to-purchase-invoices",
  authenticate,
  validateRequest,
  saleController.bulkConvertSalesInvoicesToPurchaseInvoices
);

// ==================== REPORTING ROUTES (Must come BEFORE /:id routes) ====================

/**
 * @route   GET /api/sales/reports/today
 * @desc    Get today's sales summary
 * @access  Private
 */
router.get(
  "/reports/today",
  authenticate,
  validateCompany,
  saleController.getTodaysSales
);

/**
 * @route   GET /api/sales/reports/dashboard
 * @desc    Get sales dashboard data (today, week, month metrics)
 * @access  Private
 */
router.get(
  "/reports/dashboard",
  authenticate,
  validateCompany,
  saleController.getDashboardData
);

/**
 * @route   GET /api/sales/reports/summary
 * @desc    Get sales report for date range
 * @access  Private
 */
router.get(
  "/reports/summary",
  authenticate,
  validateCompany,
  saleController.getSalesReport
);

/**
 * @route   GET /api/sales/reports/monthly
 * @desc    Get monthly sales breakdown
 * @access  Private
 */
router.get(
  "/reports/monthly",
  authenticate,
  validateCompany,
  saleController.getMonthlyReport
);

/**
 * @route   GET /api/sales/reports/bidirectional-summary
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

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const Sale = require("../models/Sale");
      const SalesOrder = require("../models/SalesOrder");

      // Build date filter
      const dateFilter = {companyId};
      if (dateFrom || dateTo) {
        dateFilter.invoiceDate = {};
        if (dateFrom) dateFilter.invoiceDate.$gte = new Date(dateFrom);
        if (dateTo) dateFilter.invoiceDate.$lte = new Date(dateTo);
      }

      const salesOrderDateFilter = {companyId};
      if (dateFrom || dateTo) {
        salesOrderDateFilter.orderDate = {};
        if (dateFrom) salesOrderDateFilter.orderDate.$gte = new Date(dateFrom);
        if (dateTo) salesOrderDateFilter.orderDate.$lte = new Date(dateTo);
      }

      const [
        totalSalesInvoices,
        invoicesFromSalesOrders,
        invoicesWithGeneratedPurchaseInvoices,
        autoGeneratedInvoices,
        totalSalesOrders,
        convertedSalesOrders,
        autoGeneratedSalesOrders,
      ] = await Promise.all([
        Sale.countDocuments(dateFilter),
        Sale.countDocuments({
          ...dateFilter,
          convertedFromSalesOrder: true,
        }),
        Sale.countDocuments({
          ...dateFilter,
          autoGeneratedPurchaseInvoice: true,
        }),
        Sale.countDocuments({
          ...dateFilter,
          isAutoGenerated: true,
        }),
        SalesOrder.countDocuments(salesOrderDateFilter),
        SalesOrder.countDocuments({
          ...salesOrderDateFilter,
          convertedToInvoice: true,
        }),
        SalesOrder.countDocuments({
          ...salesOrderDateFilter,
          isAutoGenerated: true,
        }),
      ]);

      const summary = {
        period: {
          from: dateFrom || "All time",
          to: dateTo || "All time",
        },
        salesInvoices: {
          total: totalSalesInvoices,
          fromSalesOrders: invoicesFromSalesOrders,
          withGeneratedPurchaseInvoices: invoicesWithGeneratedPurchaseInvoices,
          autoGenerated: autoGeneratedInvoices,
          directSales:
            totalSalesInvoices -
            invoicesFromSalesOrders -
            autoGeneratedInvoices,
        },
        salesOrders: {
          total: totalSalesOrders,
          converted: convertedSalesOrders,
          autoGenerated: autoGeneratedSalesOrders,
          pending: totalSalesOrders - convertedSalesOrders,
        },
        conversionRates: {
          salesOrderToInvoice:
            totalSalesOrders > 0
              ? ((convertedSalesOrders / totalSalesOrders) * 100).toFixed(2)
              : 0,
          salesInvoiceToPurchaseInvoice:
            totalSalesInvoices > 0
              ? (
                  (invoicesWithGeneratedPurchaseInvoices / totalSalesInvoices) *
                  100
                ).toFixed(2)
              : 0,
        },
        bidirectionalCoverage:
          totalSalesInvoices > 0
            ? (
                ((invoicesFromSalesOrders +
                  invoicesWithGeneratedPurchaseInvoices +
                  autoGeneratedInvoices) /
                  totalSalesInvoices) *
                100
              ).toFixed(2)
            : 0,
      };

      res.status(200).json({
        success: true,
        data: summary,
        message: "Bidirectional integration summary retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get bidirectional summary",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/sales/reports/conversion-analysis
 * @desc    Get detailed conversion analysis between orders and invoices
 * @access  Private
 */
router.get(
  "/reports/conversion-analysis",
  authenticate,
  validateCompany,
  async (req, res) => {
    try {
      const {companyId, period = "month"} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const Sale = require("../models/Sale");
      const SalesOrder = require("../models/SalesOrder");

      // Calculate date range based on period
      const now = new Date();
      let startDate,
        endDate = now;

      switch (period) {
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "quarter":
          const quarterStart = Math.floor(now.getMonth() / 3) * 3;
          startDate = new Date(now.getFullYear(), quarterStart, 1);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const dateFilter = {
        companyId,
        createdAt: {$gte: startDate, $lte: endDate},
      };

      const [conversionTimeline, performanceMetrics] = await Promise.all([
        // Daily conversion timeline
        Sale.aggregate([
          {
            $match: {
              ...dateFilter,
              convertedFromSalesOrder: true,
            },
          },
          {
            $group: {
              _id: {
                $dateToString: {format: "%Y-%m-%d", date: "$createdAt"},
              },
              conversions: {$sum: 1},
              totalValue: {$sum: "$totals.finalTotal"},
            },
          },
          {$sort: {_id: 1}},
        ]),

        // Performance metrics
        Promise.all([
          Sale.aggregate([
            {$match: dateFilter},
            {
              $group: {
                _id: "$convertedFromSalesOrder",
                count: {$sum: 1},
                totalValue: {$sum: "$totals.finalTotal"},
                avgValue: {$avg: "$totals.finalTotal"},
              },
            },
          ]),
          SalesOrder.aggregate([
            {$match: dateFilter},
            {
              $group: {
                _id: "$convertedToInvoice",
                count: {$sum: 1},
                totalValue: {$sum: "$totals.finalTotal"},
                avgValue: {$avg: "$totals.finalTotal"},
              },
            },
          ]),
        ]),
      ]);

      const analysis = {
        period: {
          type: period,
          startDate,
          endDate,
        },
        conversionTimeline,
        performanceMetrics: performanceMetrics.flat(),
        summary: {
          totalConversions: conversionTimeline.reduce(
            (sum, day) => sum + day.conversions,
            0
          ),
          totalConversionValue: conversionTimeline.reduce(
            (sum, day) => sum + day.totalValue,
            0
          ),
          averageDailyConversions:
            conversionTimeline.length > 0
              ? (
                  conversionTimeline.reduce(
                    (sum, day) => sum + day.conversions,
                    0
                  ) / conversionTimeline.length
                ).toFixed(2)
              : 0,
        },
      };

      res.status(200).json({
        success: true,
        data: analysis,
        message: "Conversion analysis retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get conversion analysis",
        error: error.message,
      });
    }
  }
);

// ==================== ANALYTICS ROUTES ====================

/**
 * @route   GET /api/sales/analytics/customer-stats
 * @desc    Get customer purchase statistics
 * @access  Private
 */
router.get(
  "/analytics/customer-stats",
  authenticate,
  validateCompany,
  saleController.getCustomerStats
);

/**
 * @route   GET /api/sales/analytics/bidirectional
 * @desc    Get bidirectional sales analytics (NEW)
 * @access  Private
 */
router.get(
  "/analytics/bidirectional",
  authenticate,
  validateCompany,
  saleController.getBidirectionalSalesAnalytics
);

/**
 * @route   GET /api/sales/analytics/bidirectional-invoice
 * @desc    Get bidirectional invoice analytics (NEW)
 * @access  Private
 */
router.get(
  "/analytics/bidirectional-invoice",
  authenticate,
  validateCompany,
  saleController.getBidirectionalInvoiceAnalytics
);

/**
 * @route   GET /api/sales/analytics/source-breakdown
 * @desc    Get sales source breakdown analytics
 * @access  Private
 */
router.get(
  "/analytics/source-breakdown",
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

      const Sale = require("../models/Sale");

      const sourceBreakdown = await Sale.aggregate([
        {
          $match: {
            companyId: new require("mongoose").Types.ObjectId(companyId),
          },
        },
        {
          $group: {
            _id: {
              isAutoGenerated: "$isAutoGenerated",
              generatedFrom: "$generatedFrom",
              convertedFromSalesOrder: "$convertedFromSalesOrder",
            },
            count: {$sum: 1},
            totalValue: {$sum: "$totals.finalTotal"},
            avgValue: {$avg: "$totals.finalTotal"},
          },
        },
        {
          $project: {
            source: {
              $cond: {
                if: "$_id.convertedFromSalesOrder",
                then: "Sales Order",
                else: {
                  $cond: {
                    if: "$_id.isAutoGenerated",
                    then: {
                      $switch: {
                        branches: [
                          {
                            case: {
                              $eq: ["$_id.generatedFrom", "purchase_invoice"],
                            },
                            then: "Purchase Invoice",
                          },
                          {
                            case: {$eq: ["$_id.generatedFrom", "import"]},
                            then: "Import",
                          },
                          {
                            case: {$eq: ["$_id.generatedFrom", "api"]},
                            then: "API",
                          },
                        ],
                        default: "Auto Generated",
                      },
                    },
                    else: "Direct Sale",
                  },
                },
              },
            },
            count: 1,
            totalValue: 1,
            avgValue: {$round: ["$avgValue", 2]},
            percentage: 1,
          },
        },
        {$sort: {count: -1}},
      ]);

      // Calculate percentages
      const totalCount = sourceBreakdown.reduce(
        (sum, item) => sum + item.count,
        0
      );
      sourceBreakdown.forEach((item) => {
        item.percentage =
          totalCount > 0 ? ((item.count / totalCount) * 100).toFixed(2) : 0;
      });

      res.status(200).json({
        success: true,
        data: {
          breakdown: sourceBreakdown,
          summary: {
            totalInvoices: totalCount,
            totalValue: sourceBreakdown.reduce(
              (sum, item) => sum + item.totalValue,
              0
            ),
            averageValue:
              totalCount > 0
                ? (
                    sourceBreakdown.reduce(
                      (sum, item) => sum + item.totalValue,
                      0
                    ) / totalCount
                  ).toFixed(2)
                : 0,
          },
        },
        message: "Sales source breakdown retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get source breakdown",
        error: error.message,
      });
    }
  }
);

// ==================== DUE DATE MANAGEMENT ROUTES ====================

/**
 * @route   GET /api/sales/overdue
 * @desc    Get overdue sales
 * @access  Private
 */
router.get(
  "/overdue",
  authenticate,
  validateCompany,
  saleController.getOverdueSales
);

/**
 * @route   GET /api/sales/due-today
 * @desc    Get sales due today
 * @access  Private
 */
router.get(
  "/due-today",
  authenticate,
  validateCompany,
  saleController.getSalesDueToday
);

/**
 * @route   GET /api/sales/payment-summary-overdue
 * @desc    Get payment summary with overdue analysis
 * @access  Private
 */
router.get(
  "/payment-summary-overdue",
  authenticate,
  validateCompany,
  saleController.getPaymentSummaryWithOverdue
);

// ==================== EXPORT ROUTES ====================

/**
 * @route   GET /api/sales/export/csv
 * @desc    Export sales data as CSV
 * @access  Private
 */
router.get(
  "/export/csv",
  authenticate,
  validateCompany,
  saleController.exportCSV
);

/**
 * @route   GET /api/sales/export/bidirectional-csv
 * @desc    Export bidirectional sales data as CSV
 * @access  Private
 */
router.get(
  "/export/bidirectional-csv",
  authenticate,
  validateCompany,
  async (req, res) => {
    try {
      const {companyId, dateFrom, dateTo} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const Sale = require("../models/Sale");

      const filter = {companyId, status: {$ne: "cancelled"}};
      if (dateFrom || dateTo) {
        filter.invoiceDate = {};
        if (dateFrom) filter.invoiceDate.$gte = new Date(dateFrom);
        if (dateTo) filter.invoiceDate.$lte = new Date(dateTo);
      }

      const sales = await Sale.find(filter)
        .populate("customer", "name mobile email")
        .sort({invoiceDate: -1})
        .limit(1000);

      const csvHeaders = [
        "Invoice Number",
        "Invoice Date",
        "Customer Name",
        "Customer Mobile",
        "Total Amount",
        "Payment Status",
        "Status",
        "Source Type",
        "Is Auto Generated",
        "Generated From",
        "Sales Order Reference",
        "Has Generated Purchase Invoice",
        "Purchase Invoice Number",
        "Generated At",
      ];

      const csvRows = sales.map((sale) => [
        sale.invoiceNumber,
        sale.invoiceDate.toISOString().split("T")[0],
        sale.customer?.name || "",
        sale.customer?.mobile || sale.customerMobile || "",
        sale.totals.finalTotal,
        sale.payment.status,
        sale.status,
        sale.convertedFromSalesOrder
          ? "Sales Order"
          : sale.isAutoGenerated
          ? "Auto Generated"
          : "Direct Sale",
        sale.isAutoGenerated ? "Yes" : "No",
        sale.generatedFrom || "manual",
        sale.salesOrderNumber || "",
        sale.autoGeneratedPurchaseInvoice ? "Yes" : "No",
        sale.purchaseInvoiceNumber || "",
        sale.generatedAt ? sale.generatedAt.toISOString().split("T")[0] : "",
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map((row) => row.map((field) => `"${field}"`).join(","))
        .join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=bidirectional-sales-export.csv"
      );
      res.status(200).send(csvContent);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to export bidirectional CSV",
        error: error.message,
      });
    }
  }
);

// ==================== BASIC CRUD ROUTES ====================

/**
 * @route   POST /api/sales
 * @desc    Create a new sale/invoice (now supports bidirectional tracking)
 * @access  Private
 */
router.post("/", authenticate, validateRequest, saleController.createSale);

/**
 * @route   GET /api/sales
 * @desc    Get all sales with pagination and filters (enhanced with source tracking)
 * @access  Private
 */
router.get("/", authenticate, validateCompany, saleController.getAllSales);

// ==================== INDIVIDUAL SALE ROUTES (Must come AFTER specific routes) ====================

/**
 * @route   GET /api/sales/:id
 * @desc    Get sale by ID with full details
 * @access  Private
 */
router.get("/:id", authenticate, validateRequest, saleController.getSaleById);

/**
 * @route   PUT /api/sales/:id
 * @desc    Update sale (only draft sales can be updated)
 * @access  Private
 */
router.put("/:id", authenticate, validateRequest, saleController.updateSale);

/**
 * @route   DELETE /api/sales/:id
 * @desc    Cancel sale (soft delete)
 * @access  Private
 */
router.delete("/:id", authenticate, validateRequest, saleController.deleteSale);

// ==================== STATUS MANAGEMENT ROUTES ====================

/**
 * @route   PATCH /api/sales/:id/complete
 * @desc    Mark sale as completed
 * @access  Private
 */
router.patch(
  "/:id/complete",
  authenticate,
  validateRequest,
  saleController.completeSale
);

/**
 * @route   PATCH /api/sales/:id/cancel
 * @desc    Cancel a sale (alternative endpoint)
 * @access  Private
 */
router.patch(
  "/:id/cancel",
  authenticate,
  validateRequest,
  saleController.deleteSale
);

// ==================== DUE DATE UPDATE ROUTE ====================

/**
 * @route   PUT /api/sales/:id/due-date
 * @desc    Update payment due date
 * @access  Private
 */
router.put(
  "/:id/due-date",
  authenticate,
  validateRequest,
  saleController.updatePaymentDueDate
);

// ==================== PAYMENT ROUTES ====================

/**
 * @route   POST /api/sales/:id/payment
 * @desc    Add payment to a sale
 * @access  Private
 */
router.post(
  "/:id/payment",
  authenticate,
  validateRequest,
  saleController.addPayment
);

/**
 * @route   POST /api/sales/:id/payments
 * @desc    Add payment to a sale (alternative endpoint)
 * @access  Private
 */
router.post(
  "/:id/payments",
  authenticate,
  validateRequest,
  saleController.addPayment
);

/**
 * @route   GET /api/sales/:id/payment-status
 * @desc    Get payment status of a sale
 * @access  Private
 */
router.get(
  "/:id/payment-status",
  authenticate,
  validateRequest,
  saleController.getPaymentStatus
);

// ==================== SOURCE TRACKING ROUTES (NEW) ====================

/**
 * @route   GET /api/sales/:invoiceId/source-tracking
 * @desc    Get invoice source tracking information (NEW)
 * @access  Private
 */
router.get(
  "/:invoiceId/source-tracking",
  authenticate,
  validateRequest,
  saleController.getInvoiceSourceTracking
);

/**
 * @route   GET /api/sales/:invoiceId/source-tracking-detailed
 * @desc    Get detailed invoice source tracking with full chain (NEW)
 * @access  Private
 */
router.get(
  "/:invoiceId/source-tracking-detailed",
  authenticate,
  validateRequest,
  saleController.getSalesInvoiceSourceTracking
);

/**
 * @route   GET /api/sales/:invoiceId/bidirectional-info
 * @desc    Get comprehensive bidirectional information for an invoice
 * @access  Private
 */
router.get(
  "/:invoiceId/bidirectional-info",
  authenticate,
  validateRequest,
  async (req, res) => {
    try {
      const {invoiceId} = req.params;

      if (!require("mongoose").Types.ObjectId.isValid(invoiceId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid invoice ID",
        });
      }

      const Sale = require("../models/Sale");

      const invoice = await Sale.findById(invoiceId)
        .populate("customer", "name mobile email")
        .populate("salesOrderRef", "orderNumber orderDate status")
        .populate("purchaseInvoiceRef", "invoiceNumber invoiceDate status");

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      // Get the tracking chain
      const trackingChain = await invoice.getInvoiceTrackingChain();

      const bidirectionalInfo = {
        invoice: {
          id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          customer: invoice.customer,
          totalAmount: invoice.totals.finalTotal,
          status: invoice.status,
        },
        trackingInfo: invoice.invoiceTrackingInfo,
        trackingChain,
        relationships: {
          hasSourceSalesOrder: invoice.isFromSalesOrder,
          hasSourcePurchaseInvoice: invoice.isFromPurchaseInvoice,
          hasGeneratedPurchaseInvoice: invoice.hasGeneratedPurchaseInvoice,
          hasCorrespondingPurchaseInvoice:
            invoice.hasCorrespondingPurchaseInvoice,
        },
        metadata: {
          isAutoGenerated: invoice.isAutoGenerated,
          generatedFrom: invoice.generatedFrom,
          generatedAt: invoice.generatedAt,
          generatedBy: invoice.generatedBy,
        },
      };

      res.status(200).json({
        success: true,
        data: bidirectionalInfo,
        message: "Bidirectional invoice information retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get bidirectional invoice information",
        error: error.message,
      });
    }
  }
);

module.exports = router;
