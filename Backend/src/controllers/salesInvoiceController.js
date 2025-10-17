const mongoose = require("mongoose");
const SalesInvoice = require("../models/SalesInvoice");
const { getNextNumber } = require("../services/invoiceNumberService");

/**
 * Create Sales Invoice
 * POST /api/salesinvoice
 */
exports.createSalesInvoice = async (req, res) => {
  try {
    const body = req.body || {};

    if (!body.companyId) {
      return res.status(400).json({ success: false, message: "companyId is required" });
    }
    if (!body.customer || !body.customer.name) {
      return res.status(400).json({ success: false, message: "customer.name is required" });
    }
    // generate invoice number if not provided
    let invoiceNumber = body.invoiceNumber;
    if (!invoiceNumber) {
      const prefix = body.invoicePrefix || "INV";
      const next = await getNextNumber(body.companyId, prefix);
      invoiceNumber = next.formatted;
    }

    const invoice = new SalesInvoice({
      invoiceNumber,
      invoicePrefix: body.invoicePrefix || "INV",
      invoiceDate: body.invoiceDate || new Date(),
      supplierInvoiceNumber: body.supplierInvoiceNumber,
      supplierDate: body.supplierDate,

      companyId: body.companyId,

      customer: body.customer,
      items: Array.isArray(body.items) ? body.items : [],

      totals: body.totals || {},
      payments: body.payments || [],
      status: body.status || "draft",
      meta: body.meta || {},
    });

    invoice.recalculateTotals();
    await invoice.save();

    res.status(201).json({ success: true, data: invoice, message: "Sales invoice created" });
  } catch (err) {
    console.error("createSalesInvoice error:", err);
    res.status(500).json({ success: false, message: "Failed to create sales invoice", error: err.message });
  }
};

/**
 * Get paginated invoices
 * GET /api/salesinvoice
 */
exports.getSalesInvoices = async (req, res) => {
  try {
    const { companyId, page = 1, limit = 20, status } = req.query;
    if (!companyId) {
      return res.status(400).json({ success: false, message: "companyId required" });
    }
    const query = { companyId };
    if (status) query.status = status;

    const invoices = await SalesInvoice.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await SalesInvoice.countDocuments(query);

    res.json({ success: true, data: invoices, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    console.error("getSalesInvoices error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch invoices", error: err.message });
  }
};

/**
 * Get next invoice number preview
 * GET /api/salesinvoice/next-invoice-number?companyId=...
 */
exports.getNextInvoiceNumber = async (req, res) => {
  try {
    const { companyId, prefix } = req.query;
    if (!companyId) return res.status(400).json({ success: false, message: "companyId required" });

    const next = await getNextNumber(companyId, prefix || "INV");
    // do NOT persist seq here (getNextNumber increments). If you prefer preview-only, implement separate preview method.
    res.json({ success: true, data: next });
  } catch (err) {
    console.error("getNextInvoiceNumber error:", err);
    res.status(500).json({ success: false, message: "Failed to get next invoice number", error: err.message });
  }
};

/**
 * Get by id
 * GET /api/salesinvoice/:id
 */
exports.getSalesInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const invoice = await SalesInvoice.findById(id).lean();
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });

    res.json({ success: true, data: invoice });
  } catch (err) {
    console.error("getSalesInvoiceById error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch invoice", error: err.message });
  }
};

/**
 * Update invoice (partial)
 * PUT /api/salesinvoice/:id
 */
exports.updateSalesInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const changes = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const invoice = await SalesInvoice.findById(id);
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });

    // allow limited updates
    ["invoiceDate", "supplierInvoiceNumber", "supplierDate", "customer", "items", "totals", "status", "meta"].forEach(
      (k) => {
        if (changes[k] !== undefined) invoice[k] = changes[k];
      }
    );

    invoice.recalculateTotals();
    await invoice.save();

    res.json({ success: true, data: invoice, message: "Invoice updated" });
  } catch (err) {
    console.error("updateSalesInvoice error:", err);
    res.status(500).json({ success: false, message: "Failed to update invoice", error: err.message });
  }
};

/**
 * Delete (soft) invoice
 * DELETE /api/salesinvoice/:id
 */
exports.deleteSalesInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const invoice = await SalesInvoice.findById(id);
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });

    invoice.status = "cancelled";
    await invoice.save();

    res.json({ success: true, message: "Invoice cancelled (soft-deleted)", data: invoice });
  } catch (err) {
    console.error("deleteSalesInvoice error:", err);
    res.status(500).json({ success: false, message: "Failed to delete invoice", error: err.message });
  }
};