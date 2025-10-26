const mongoose = require("mongoose");
const SalesInvoiceWithGST = require("../models/SalesInvoiceWithGST");
const SalesInvoiceWithoutGST = require("../models/SalesInvoiceWithoutGST");
const SalesWithGstCounter = require("../models/SalesWithGstCounter");
const SalesWithoutGstCounter = require("../models/SalesWithoutGstCounter");

/**
 * Get next invoice number for sales (with or without GST)
 * GET /api/sales-invoices/next-invoice-number?companyId=...&type=gst|no-gst
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

    const CounterModel = type === "gst" ? SalesWithGstCounter : SalesWithoutGstCounter;
    const prefix = type === "gst" ? "S-GST" : "S-NGST";

    // Get or create counter
    let counter = await CounterModel.findOne({ companyId });
    
    if (!counter) {
      counter = new CounterModel({ companyId, seq: 0 });
      await counter.save();
    }

    const nextNumber = counter.seq + 1;
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
 * Create Sales Invoice (WITH GST)
 * POST /api/sales-invoices/with-gst
 */
exports.createSalesInvoiceWithGST = async (req, res) => {
  try {
    const {
      companyId,
      customer,
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

    if (!customer || !customer.name) {
      return res.status(400).json({
        success: false,
        message: "Customer information is required",
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
    let finalInvoicePrefix = invoicePrefix;
    
    if (!finalInvoiceNumber) {
      const prefix = invoicePrefix || "S-GST";
      finalInvoicePrefix = prefix;
      
      // Use counter for auto-increment
      let counter = await SalesWithGstCounter.findOne({ companyId });
      if (!counter) {
        counter = new SalesWithGstCounter({ companyId, seq: 0 });
      }
      counter.seq += 1;
      await counter.save();
      
      finalInvoiceNumber = `${prefix}-${String(counter.seq).padStart(4, "0")}`;
    } else {
      // User provided custom invoice number - don't force a prefix
      finalInvoicePrefix = invoicePrefix || "";
    }

    // Create invoice
    const invoice = new SalesInvoiceWithGST({
      invoiceNumber: finalInvoiceNumber,
      invoicePrefix: finalInvoicePrefix,
      invoiceDate: invoiceDate || new Date(),
      companyId,
      customer,
      items,
      status: status || "draft",
      meta: meta || {},
    });

    // Calculate totals
    invoice.recalculateTotals();

    await invoice.save();

    res.status(201).json({
      success: true,
      message: "Sales invoice created successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("createSalesInvoiceWithGST error:", error);
    
    // Check for duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: `Duplicate invoice number. An invoice with number "${error.keyValue?.invoiceNumber}" already exists.`,
        error: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Failed to create sales invoice",
      error: error.message,
    });
  }
};

/**
 * Create Sales Invoice (WITHOUT GST)
 * POST /api/sales-invoices/without-gst
 */
exports.createSalesInvoiceWithoutGST = async (req, res) => {
  try {
    console.log("📥 [createSalesInvoiceWithoutGST] Request body:", JSON.stringify(req.body, null, 2));

    const {
      companyId,
      customer,
      items,
      invoiceNumber,
      invoicePrefix,
      invoiceDate,
      status,
      meta,
    } = req.body;

    // Validation
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      console.error("❌ Invalid companyId:", companyId);
      return res.status(400).json({
        success: false,
        message: "Valid companyId is required",
      });
    }

    if (!customer || !customer.name) {
      console.error("❌ Invalid customer:", customer);
      return res.status(400).json({
        success: false,
        message: "Customer information is required",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error("❌ Invalid items:", items);
      return res.status(400).json({
        success: false,
        message: "At least one item is required",
      });
    }

    console.log("✅ Validation passed. Items count:", items.length);

    // Generate invoice number if not provided
    let finalInvoiceNumber = invoiceNumber;
    let finalInvoicePrefix = invoicePrefix;
    
    if (!finalInvoiceNumber) {
      const prefix = invoicePrefix || "S-NGST";
      finalInvoicePrefix = prefix;
      
      // Use counter for auto-increment
      let counter = await SalesWithoutGstCounter.findOne({ companyId });
      if (!counter) {
        counter = new SalesWithoutGstCounter({ companyId, seq: 0 });
      }
      counter.seq += 1;
      await counter.save();
      
      finalInvoiceNumber = `${prefix}-${String(counter.seq).padStart(4, "0")}`;
    } else {
      // User provided custom invoice number - don't force a prefix
      finalInvoicePrefix = invoicePrefix || "";
    }

    // Create invoice
    const invoice = new SalesInvoiceWithoutGST({
      invoiceNumber: finalInvoiceNumber,
      invoicePrefix: finalInvoicePrefix,
      invoiceDate: invoiceDate || new Date(),
      companyId,
      customer,
      items,
      status: status || "draft",
      meta: meta || {},
    });

    console.log("💾 Created invoice object (before save):", invoice);

    // Calculate totals
    invoice.recalculateTotals();

    console.log("💾 After recalculateTotals:", { subTotal: invoice.totals.subTotal, finalTotal: invoice.totals.finalTotal });

    await invoice.save();

    console.log("✅ [createSalesInvoiceWithoutGST] Invoice saved to database:", invoice._id);

    res.status(201).json({
      success: true,
      message: "Sales invoice created successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("createSalesInvoiceWithoutGST error:", error);
    
    // Check for duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: `Duplicate invoice number. An invoice with number "${error.keyValue?.invoiceNumber}" already exists.`,
        error: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Failed to create sales invoice",
      error: error.message,
    });
  }
};

/**
 * Get all sales invoices (both GST and non-GST)
 * GET /api/sales-invoices?companyId=...&type=gst|no-gst|all
 */
exports.getSalesInvoices = async (req, res) => {
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
      const gstInvoices = await SalesInvoiceWithGST.find(query)
        .sort({ createdAt: -1 })
        .skip(type === "all" ? 0 : skip)
        .limit(type === "all" ? 1000 : limitNum)
        .lean();
      
      const gstTotal = await SalesInvoiceWithGST.countDocuments(query);
      
      invoices = [...invoices, ...gstInvoices.map(inv => ({ ...inv, type: "gst" }))];
      total += gstTotal;
    }

    if (type === "no-gst" || type === "all") {
      const noGstInvoices = await SalesInvoiceWithoutGST.find(query)
        .sort({ createdAt: -1 })
        .skip(type === "all" ? 0 : skip)
        .limit(type === "all" ? 1000 : limitNum)
        .lean();
      
      const noGstTotal = await SalesInvoiceWithoutGST.countDocuments(query);
      
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
    console.error("getSalesInvoices error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sales invoices",
      error: error.message,
    });
  }
};

/**
 * Get sales invoice by ID
 * GET /api/sales-invoices/:id?type=gst|no-gst
 */
exports.getSalesInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const { type = "gst" } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID",
      });
    }

    const Model = type === "gst" ? SalesInvoiceWithGST : SalesInvoiceWithoutGST;
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
    console.error("getSalesInvoiceById error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch invoice",
      error: error.message,
    });
  }
};

/**
 * Update sales invoice
 * PUT /api/sales-invoices/:id?type=gst|no-gst
 */
exports.updateSalesInvoice = async (req, res) => {
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

    const Model = type === "gst" ? SalesInvoiceWithGST : SalesInvoiceWithoutGST;
    const invoice = await Model.findById(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    // Update fields
    const allowedFields = ["invoiceDate", "customer", "items", "status", "meta"];
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
    console.error("updateSalesInvoice error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update invoice",
      error: error.message,
    });
  }
};

/**
 * Delete sales invoice
 * DELETE /api/sales-invoices/:id?type=gst|no-gst
 */
exports.deleteSalesInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { type = "gst" } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID",
      });
    }

    const Model = type === "gst" ? SalesInvoiceWithGST : SalesInvoiceWithoutGST;
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
    console.error("deleteSalesInvoice error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete invoice",
      error: error.message,
    });
  }
};

module.exports = exports;
