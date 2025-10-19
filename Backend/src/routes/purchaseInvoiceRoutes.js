const express = require("express");
const router = express.Router();
const controller = require("../controllers/purchaseInvoiceController");

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
 * GET /api/purchase-invoices/next-invoice-number
 * Get next available purchase invoice number
 */
router.get(
  "/next-invoice-number",
  authenticate,
  validateCompany,
  controller.getNextInvoiceNumber
);

/**
 * POST /api/purchase-invoices/with-gst
 * Create a new purchase invoice WITH GST
 */
router.post(
  "/with-gst",
  authenticate,
  controller.createPurchaseInvoiceWithGST
);

/**
 * POST /api/purchase-invoices/without-gst
 * Create a new purchase invoice WITHOUT GST
 */
router.post(
  "/without-gst",
  authenticate,
  controller.createPurchaseInvoiceWithoutGST
);

/**
 * GET /api/purchase-invoices
 * Get all purchase invoices (with pagination and filtering)
 */
router.get(
  "/",
  authenticate,
  validateCompany,
  controller.getPurchaseInvoices
);

/**
 * GET /api/purchase-invoices/:id
 * Get a single purchase invoice by ID
 */
router.get(
  "/:id",
  authenticate,
  controller.getPurchaseInvoiceById
);

/**
 * PUT /api/purchase-invoices/:id
 * Update a purchase invoice
 */
router.put(
  "/:id",
  authenticate,
  controller.updatePurchaseInvoice
);

/**
 * DELETE /api/purchase-invoices/:id
 * Delete (soft delete/cancel) a purchase invoice
 */
router.delete(
  "/:id",
  authenticate,
  controller.deletePurchaseInvoice
);

module.exports = router;
