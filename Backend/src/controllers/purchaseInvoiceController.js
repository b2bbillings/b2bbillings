const mongoose = require("mongoose");
const PurchaseInvoiceWithGST = require("../models/PurchaseInvoiceWithGST");
const PurchaseInvoiceWithoutGST = require("../models/PurchaseInvoiceWithoutGST");

/**
 * Get next invoice number for purchase (with or without GST)
 * GET /api/purchase-invoices/next-invoice-number?companyId=...&type=gst|no-gst
 */
exports.getNextInvoiceNumber = async (req, res) => {
  try {
    const { companyId, type = "gst" } = req.query;
    
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Valid companyId is required" 
      });
    }

    const Model = type === "gst" ? PurchaseInvoiceWithGST : PurchaseInvoiceWithoutGST;
    const prefix = type === "gst" ? "P-GST" : "P-NGST";

    // Find the latest invoice for this company
    const lastInvoice = await Model.findOne({ companyId })
      .sort({ createdAt: -1 })
      .select("invoiceNumber")
      .lean();

    let nextNumber = 1;
    if (lastInvoice && lastInvoice.invoiceNumber) {
      // Extract number from invoice number (e.g., "P-GST-0001" -> 1)
      const match = lastInvoice.invoiceNumber.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const formatted = `${prefix}-${String(nextNumber).padStart(4, "0")}`;

    res.json({
      success: true,
      data: {
        nextNumber,
        formatted,
        prefix,
      },
    });
  } catch (error) {
    console.error("getNextInvoiceNumber error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get next invoice number",
      error: error.message,
    });
  }
};

/**
 * Create Purchase Invoice (WITH GST)
 * POST /api/purchase-invoices/with-gst
 */
exports.createPurchaseInvoiceWithGST = async (req, res) => {
  try {
    const {
      companyId,
      vendor,
      items,
      invoiceNumber,
      invoicePrefix,
      invoiceDate,
      status,
      meta,
    } = req.body;

    // Validation
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Valid companyId is required",
      });
    }

    if (!vendor || !vendor.name) {
      return res.status(400).json({
        success: false,
        message: "Vendor information is required",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one item is required",
      });
    }

    // Generate invoice number if not provided
    let finalInvoiceNumber = invoiceNumber;
    if (!finalInvoiceNumber) {
      const prefix = invoicePrefix || "P-GST";
      const lastInvoice = await PurchaseInvoiceWithGST.findOne({ companyId })
        .sort({ createdAt: -1 })
        .select("invoiceNumber")
        .lean();

      let nextNumber = 1;
      if (lastInvoice && lastInvoice.invoiceNumber) {
        const match = lastInvoice.invoiceNumber.match(/(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      finalInvoiceNumber = `${prefix}-${String(nextNumber).padStart(4, "0")}`;
    }

    // Create invoice
    const invoice = new PurchaseInvoiceWithGST({
      invoiceNumber: finalInvoiceNumber,
      invoicePrefix: invoicePrefix || "P-GST",
      invoiceDate: invoiceDate || new Date(),
      companyId,
      vendor,
      items,
      status: status || "draft",
      meta: meta || {},
    });

    // Calculate totals
    invoice.recalculateTotals();

    await invoice.save();

    res.status(201).json({
      success: true,
      message: "Purchase invoice created successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("createPurchaseInvoiceWithGST error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create purchase invoice",
      error: error.message,
    });
  }
};

/**
 * Create Purchase Invoice (WITHOUT GST)
 * POST /api/purchase-invoices/without-gst
 */
exports.createPurchaseInvoiceWithoutGST = async (req, res) => {
  try {
    const {
      companyId,
      vendor,
      items,
      invoiceNumber,
      invoicePrefix,
      invoiceDate,
      status,
      meta,
    } = req.body;

    // Validation
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Valid companyId is required",
      });
    }

    if (!vendor || !vendor.name) {
      return res.status(400).json({
        success: false,
        message: "Vendor information is required",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one item is required",
      });
    }

    // Generate invoice number if not provided
    let finalInvoiceNumber = invoiceNumber;
    if (!finalInvoiceNumber) {
      const prefix = invoicePrefix || "P-NGST";
      const lastInvoice = await PurchaseInvoiceWithoutGST.findOne({ companyId })
        .sort({ createdAt: -1 })
        .select("invoiceNumber")
        .lean();

      let nextNumber = 1;
      if (lastInvoice && lastInvoice.invoiceNumber) {
        const match = lastInvoice.invoiceNumber.match(/(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      finalInvoiceNumber = `${prefix}-${String(nextNumber).padStart(4, "0")}`;
    }

    // Create invoice
    const invoice = new PurchaseInvoiceWithoutGST({
      invoiceNumber: finalInvoiceNumber,
      invoicePrefix: invoicePrefix || "P-NGST",
      invoiceDate: invoiceDate || new Date(),
      companyId,
      vendor,
      items,
      status: status || "draft",
      meta: meta || {},
    });

    // Calculate totals
    invoice.recalculateTotals();

    await invoice.save();

    res.status(201).json({
      success: true,
      message: "Purchase invoice created successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("createPurchaseInvoiceWithoutGST error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create purchase invoice",
      error: error.message,
    });
  }
};

/**
 * Get all purchase invoices (both GST and non-GST)
 * GET /api/purchase-invoices?companyId=...&type=gst|no-gst|all
 */
exports.getPurchaseInvoices = async (req, res) => {
  try {
    const { companyId, type = "all", page = 1, limit = 20, status } = req.query;

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Valid companyId is required",
      });
    }

    const query = { companyId };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    let invoices = [];
    let total = 0;

    if (type === "gst" || type === "all") {
      const gstInvoices = await PurchaseInvoiceWithGST.find(query)
        .sort({ createdAt: -1 })
        .skip(type === "all" ? 0 : skip)
        .limit(type === "all" ? 1000 : limitNum)
        .lean();
      
      const gstTotal = await PurchaseInvoiceWithGST.countDocuments(query);
      
      invoices = [...invoices, ...gstInvoices.map(inv => ({ ...inv, type: "gst" }))];
      total += gstTotal;
    }

    if (type === "no-gst" || type === "all") {
      const noGstInvoices = await PurchaseInvoiceWithoutGST.find(query)
        .sort({ createdAt: -1 })
        .skip(type === "all" ? 0 : skip)
        .limit(type === "all" ? 1000 : limitNum)
        .lean();
      
      const noGstTotal = await PurchaseInvoiceWithoutGST.countDocuments(query);
      
      invoices = [...invoices, ...noGstInvoices.map(inv => ({ ...inv, type: "no-gst" }))];
      total += noGstTotal;
    }

    // Sort combined results by date
    invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination for "all" type
    if (type === "all") {
      invoices = invoices.slice(skip, skip + limitNum);
    }

    res.json({
      success: true,
      data: invoices,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("getPurchaseInvoices error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch purchase invoices",
      error: error.message,
    });
  }
};

/**
 * Get purchase invoice by ID
 * GET /api/purchase-invoices/:id?type=gst|no-gst
 */
exports.getPurchaseInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const { type = "gst" } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID",
      });
    }

    const Model = type === "gst" ? PurchaseInvoiceWithGST : PurchaseInvoiceWithoutGST;
    const invoice = await Model.findById(id).lean();

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    res.json({
      success: true,
      data: { ...invoice, type },
    });
  } catch (error) {
    console.error("getPurchaseInvoiceById error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch invoice",
      error: error.message,
    });
  }
};

/**
 * Update purchase invoice
 * PUT /api/purchase-invoices/:id?type=gst|no-gst
 */
exports.updatePurchaseInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { type = "gst" } = req.query;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID",
      });
    }

    const Model = type === "gst" ? PurchaseInvoiceWithGST : PurchaseInvoiceWithoutGST;
    const invoice = await Model.findById(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    // Update fields
    const allowedFields = ["invoiceDate", "vendor", "items", "status", "meta"];
    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        invoice[field] = updates[field];
      }
    });

    // Recalculate totals
    invoice.recalculateTotals();

    await invoice.save();

    res.json({
      success: true,
      message: "Invoice updated successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("updatePurchaseInvoice error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update invoice",
      error: error.message,
    });
  }
};

/**
 * Delete purchase invoice
 * DELETE /api/purchase-invoices/:id?type=gst|no-gst
 */
exports.deletePurchaseInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { type = "gst" } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID",
      });
    }

    const Model = type === "gst" ? PurchaseInvoiceWithGST : PurchaseInvoiceWithoutGST;
    const invoice = await Model.findById(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    // Soft delete by setting status to cancelled
    invoice.status = "cancelled";
    await invoice.save();

    res.json({
      success: true,
      message: "Invoice cancelled successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("deletePurchaseInvoice error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete invoice",
      error: error.message,
    });
  }
};

module.exports = exports;
