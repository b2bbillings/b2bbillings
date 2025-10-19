const express = require("express");
const router = express.Router();
const controller = require("../controllers/salesInvoiceWithGSTController");

// Middleware stubs (replace with your actual auth middleware)
const authenticate = (req, res, next) => next();
const validateCompany = (req, res, next) => {
  const companyId = req.query.companyId || req.body.companyId;
  if (!companyId) {
    return res.status(400).json({ 
      success: false, 
      message: "companyId required" 
    });
  }
  next();
};

/**
 * GET /api/sales-invoices/next-invoice-number
 * Get next available sales invoice number
 */
router.get(
  "/next-invoice-number",
  authenticate,
  validateCompany,
  controller.getNextInvoiceNumber
);

/**
 * POST /api/sales-invoices/with-gst
 * Create a new sales invoice WITH GST
 */
router.post(
  "/with-gst",
  authenticate,
  controller.createSalesInvoiceWithGST
);

/**
 * POST /api/sales-invoices/without-gst
 * Create a new sales invoice WITHOUT GST
 */
router.post(
  "/without-gst",
  authenticate,
  controller.createSalesInvoiceWithoutGST
);

/**
 * GET /api/sales-invoices
 * Get all sales invoices (with pagination and filtering)
 */
router.get(
  "/",
  authenticate,
  validateCompany,
  controller.getSalesInvoices
);

/**
 * GET /api/sales-invoices/:id
 * Get a single sales invoice by ID
 */
router.get(
  "/:id",
  authenticate,
  controller.getSalesInvoiceById
);

/**
 * PUT /api/sales-invoices/:id
 * Update a sales invoice
 */
router.put(
  "/:id",
  authenticate,
  controller.updateSalesInvoice
);

/**
 * DELETE /api/sales-invoices/:id
 * Delete (soft delete/cancel) a sales invoice
 */
router.delete(
  "/:id",
  authenticate,
  controller.deleteSalesInvoice
);

module.exports = router;
