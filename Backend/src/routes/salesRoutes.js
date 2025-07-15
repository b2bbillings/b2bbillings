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

// ==================== DAYBOOK ROUTES (PRIORITY - Before /:id routes) ====================

/**
 * @route   GET /api/sales/daybook-summary
 * @desc    Get sales summary for daybook
 * @access  Private
 */
router.get(
  "/daybook-summary",
  authenticate,
  validateCompany,
  saleController.getDaybookSummary
);

/**
 * @route   GET /api/sales/receivables-aging
 * @desc    Get receivables aging analysis
 * @access  Private
 */
router.get(
  "/receivables-aging",
  authenticate,
  validateCompany,
  saleController.getReceivablesAging
);

/**
 * @route   GET /api/sales/top-debtors
 * @desc    Get top debtors list
 * @access  Private
 */
router.get(
  "/top-debtors",
  authenticate,
  validateCompany,
  saleController.getTopDebtors
);

/**
 * @route   GET /api/sales/trends
 * @desc    Get sales trends for dashboard
 * @access  Private
 */
router.get(
  "/trends",
  authenticate,
  validateCompany,
  saleController.getSalesTrends
);

/**
 * @route   GET /api/sales/collection-efficiency
 * @desc    Get collection efficiency metrics
 * @access  Private
 */
router.get(
  "/collection-efficiency",
  authenticate,
  validateCompany,
  saleController.getCollectionEfficiency
);

/**
 * @route   GET /api/sales/daily-cash-flow
 * @desc    Get daily cash flow from sales
 * @access  Private
 */
router.get(
  "/daily-cash-flow",
  authenticate,
  validateCompany,
  saleController.getDailyCashFlow
);

/**
 * @route   GET /api/sales/payment-reminders
 * @desc    Get payment reminders
 * @access  Private
 */
router.get(
  "/payment-reminders",
  authenticate,
  validateCompany,
  saleController.getPaymentReminders
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

// ==================== BIDIRECTIONAL ORDER ROUTES ====================

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

// ==================== BIDIRECTIONAL INVOICE ROUTES ====================

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

// ==================== REPORTING ROUTES ====================

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
  saleController.getBidirectionalSummaryReport
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
 * @desc    Get bidirectional sales analytics
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
 * @desc    Get bidirectional invoice analytics
 * @access  Private
 */
router.get(
  "/analytics/bidirectional-invoice",
  authenticate,
  validateCompany,
  saleController.getBidirectionalInvoiceAnalytics
);

/**
 * @route   GET /api/sales/analytics/payment-summary
 * @desc    Get payment summary analytics
 * @access  Private
 */
router.get(
  "/analytics/payment-summary",
  authenticate,
  validateCompany,
  saleController.getEnhancedPaymentSummary
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
  saleController.exportBidirectionalCSV
);

// ==================== FILTERING ROUTES ====================

/**
 * @route   GET /api/sales/auto-generated
 * @desc    Get auto-generated sales invoices
 * @access  Private
 */
router.get(
  "/auto-generated",
  authenticate,
  validateCompany,
  (req, res, next) => {
    req.query.isAutoGenerated = "true";
    next();
  },
  saleController.getAllSales
);

/**
 * @route   GET /api/sales/manual
 * @desc    Get manually created sales invoices
 * @access  Private
 */
router.get(
  "/manual",
  authenticate,
  validateCompany,
  (req, res, next) => {
    req.query.isAutoGenerated = "false";
    next();
  },
  saleController.getAllSales
);

/**
 * @route   GET /api/sales/cross-company
 * @desc    Get cross-company linked invoices
 * @access  Private
 */
router.get(
  "/cross-company",
  authenticate,
  validateCompany,
  (req, res, next) => {
    req.query.isCrossCompanyLinked = "true";
    next();
  },
  saleController.getAllSales
);

/**
 * @route   GET /api/sales/with-purchase-invoices
 * @desc    Get sales invoices that have generated purchase invoices
 * @access  Private
 */
router.get(
  "/with-purchase-invoices",
  authenticate,
  validateCompany,
  (req, res, next) => {
    req.query.autoGeneratedPurchaseInvoice = "true";
    next();
  },
  saleController.getAllSales
);

/**
 * @route   GET /api/sales/by-payment-status/:status
 * @desc    Get invoices by payment status
 * @access  Private
 */
router.get(
  "/by-payment-status/:status",
  authenticate,
  validateCompany,
  (req, res, next) => {
    req.query.paymentStatus = req.params.status;
    next();
  },
  saleController.getAllSales
);

/**
 * @route   GET /api/sales/by-source/:source
 * @desc    Get invoices by source type
 * @access  Private
 */
router.get(
  "/by-source/:source",
  authenticate,
  validateCompany,
  (req, res, next) => {
    switch (req.params.source) {
      case "sales-order":
        req.query.convertedFromSalesOrder = "true";
        break;
      case "auto-generated":
        req.query.isAutoGenerated = "true";
        break;
      case "direct":
        req.query.convertedFromSalesOrder = "false";
        req.query.isAutoGenerated = "false";
        break;
      default:
        req.query.generatedFrom = req.params.source;
    }
    next();
  },
  saleController.getAllSales
);

// ==================== ADMIN ROUTES ====================

/**
 * @route   GET /api/sales/admin/sales-invoices
 * @desc    Get all sales invoices for admin (across all companies)
 * @access  Private (Admin only)
 */
router.get(
  "/admin/sales-invoices",
  authenticate,
  saleController.getAllSalesInvoicesForAdmin
);

/**
 * @route   GET /api/sales/admin/sales-invoices/bidirectional-analytics
 * @desc    Get admin bidirectional sales analytics
 * @access  Private (Admin only)
 */
router.get(
  "/admin/sales-invoices/bidirectional-analytics",
  authenticate,
  saleController.getAdminBidirectionalSalesAnalytics
);

/**
 * @route   GET /api/sales/admin/sales-invoices/payment-analytics
 * @desc    Get admin payment analytics
 * @access  Private (Admin only)
 */
router.get(
  "/admin/sales-invoices/payment-analytics",
  authenticate,
  saleController.getAdminPaymentAnalytics
);

/**
 * @route   GET /api/sales/admin/sales-invoices/customer-analytics
 * @desc    Get admin customer analytics
 * @access  Private (Admin only)
 */
router.get(
  "/admin/sales-invoices/customer-analytics",
  authenticate,
  saleController.getAdminCustomerAnalytics
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

// ==================== BIDIRECTIONAL CONVERSION ROUTES (Individual Invoice Operations) ====================

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

// ==================== SOURCE TRACKING ROUTES ====================

/**
 * @route   GET /api/sales/:invoiceId/source-tracking
 * @desc    Get invoice source tracking information
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
 * @desc    Get detailed invoice source tracking with full chain
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

// ==================== DAYBOOK REMINDER ROUTE ====================

/**
 * @route   PUT /api/sales/:invoiceId/reminder-sent
 * @desc    Mark payment reminder as sent
 * @access  Private
 */
router.put(
  "/:invoiceId/reminder-sent",
  authenticate,
  validateCompany,
  saleController.markReminderSent
);

// ==================== PRINT AND DOCUMENT ROUTES ====================

/**
 * @route   GET /api/sales/:id/print
 * @desc    Get sales invoice data for printing (A4 format)
 * @access  Private
 */
router.get(
  "/:id/print",
  authenticate,
  validateRequest,
  saleController.getSalesInvoiceForPrint
);

/**
 * @route   GET /api/sales/:id/receipt
 * @desc    Get sales receipt data for thermal printing
 * @access  Private
 */
router.get(
  "/:id/receipt",
  authenticate,
  validateRequest,
  saleController.getSalesReceiptForPrint
);

/**
 * @route   GET /api/sales/:id/email
 * @desc    Get sales invoice data for email/PDF generation
 * @access  Private
 */
router.get(
  "/:id/email",
  authenticate,
  validateRequest,
  saleController.getSalesInvoiceForEmail
);

/**
 * @route   GET /api/sales/:id/pdf
 * @desc    Generate and download sales invoice PDF
 * @access  Private
 */
router.get(
  "/:id/pdf",
  authenticate,
  validateRequest,
  saleController.downloadSalesInvoicePDF
);

/**
 * @route   POST /api/sales/bulk-print
 * @desc    Get multiple sales invoices for bulk printing
 * @access  Private
 */
router.post(
  "/bulk-print",
  authenticate,
  validateRequest,
  saleController.getBulkSalesInvoicesForPrint
);

/**
 * @route   GET /api/sales/:id/qr-payment
 * @desc    Get sales invoice data for QR code payment
 * @access  Private
 */
router.get(
  "/:id/qr-payment",
  authenticate,
  validateRequest,
  saleController.getSalesInvoiceForQRPayment
);

/**
 * @route   GET /api/sales/:id/summary
 * @desc    Get sales invoice summary for quick view
 * @access  Private
 */
router.get(
  "/:id/summary",
  authenticate,
  validateRequest,
  saleController.getSalesInvoiceSummary
);

module.exports = router;
