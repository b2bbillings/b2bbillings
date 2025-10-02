const Bill = require('../models/Bill');
const Item = require('../models/Item');
const Party = require('../models/Party');
const Company = require('../models/Company');
const User = require('../models/User');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Helper function to generate PDF
const generateBillPDF = async (bill) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const filename = `bill-${bill.billNumber}-${Date.now()}.pdf`;
      const filepath = path.join(__dirname, '../../uploads/bills', filename);
      
      // Ensure directory exists
      const dir = path.dirname(filepath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);
      
      // Header
      doc.fontSize(20).text('BILL', 50, 50);
      doc.fontSize(12);
      
      // Company details (if available)
      if (bill.company) {
        doc.text(`Company: ${bill.company.name || 'N/A'}`, 50, 80);
      }
      
      // Bill details
      doc.text(`Bill Number: ${bill.billNumber}`, 50, 100);
      doc.text(`Invoice Number: ${bill.invoiceNumber}`, 50, 115);
      doc.text(`Invoice Type: ${bill.invoiceType}`, 50, 130);
      doc.text(`Date: ${new Date(bill.invoiceDate).toLocaleDateString()}`, 50, 145);
      doc.text(`Employee: ${bill.employeeName}`, 50, 160);
      
      // Customer details
      if (bill.customerDetails) {
        doc.text(`Customer: ${bill.customerDetails.name || 'N/A'}`, 350, 100);
        doc.text(`Email: ${bill.customerDetails.email || 'N/A'}`, 350, 115);
        doc.text(`Phone: ${bill.customerDetails.phone || 'N/A'}`, 350, 130);
        if (bill.customerDetails.address) {
          doc.text(`Address: ${bill.customerDetails.address.street || ''}, ${bill.customerDetails.address.city || ''}`, 350, 145);
        }
        if (bill.customerDetails.gstin) {
          doc.text(`GSTIN: ${bill.customerDetails.gstin}`, 350, 160);
        }
      }
      
      // Items table
      let yPosition = 200;
      doc.text('Items:', 50, yPosition);
      yPosition += 20;
      
      // Table headers
      doc.text('Product', 50, yPosition);
      doc.text('Qty', 150, yPosition);
      doc.text('Unit', 200, yPosition);
      doc.text('Price', 250, yPosition);
      doc.text('Discount', 300, yPosition);
      doc.text('Tax', 350, yPosition);
      doc.text('Total', 400, yPosition);
      
      yPosition += 15;
      doc.moveTo(50, yPosition).lineTo(500, yPosition).stroke();
      yPosition += 10;
      
      // Items
      bill.items.forEach(item => {
        doc.text(item.productName.substring(0, 15), 50, yPosition);
        doc.text(item.quantity.toString(), 150, yPosition);
        doc.text(item.unit, 200, yPosition);
        doc.text(`₹${item.price.toFixed(2)}`, 250, yPosition);
        doc.text(`₹${item.discount || 0}`, 300, yPosition);
        doc.text(`₹${item.taxAmount.toFixed(2)}`, 350, yPosition);
        doc.text(`₹${item.total.toFixed(2)}`, 400, yPosition);
        yPosition += 20;
      });
      
      // Totals
      yPosition += 20;
      doc.moveTo(300, yPosition).lineTo(500, yPosition).stroke();
      yPosition += 10;
      
      doc.text(`Subtotal: ₹${bill.subtotal.toFixed(2)}`, 350, yPosition);
      yPosition += 15;
      doc.text(`Discount: ₹${bill.totalDiscount.toFixed(2)}`, 350, yPosition);
      yPosition += 15;
      doc.text(`CGST: ₹${bill.cgst.toFixed(2)}`, 350, yPosition);
      yPosition += 15;
      doc.text(`SGST: ₹${bill.sgst.toFixed(2)}`, 350, yPosition);
      yPosition += 15;
      doc.text(`Total Tax: ₹${bill.totalTax.toFixed(2)}`, 350, yPosition);
      yPosition += 15;
      
      if (bill.shippingCharges > 0) {
        doc.text(`Shipping: ₹${bill.shippingCharges.toFixed(2)}`, 350, yPosition);
        yPosition += 15;
      }
      
      doc.fontSize(14).text(`Total Amount: ₹${bill.totalAmount.toFixed(2)}`, 350, yPosition);
      
      // Notes
      if (bill.notes) {
        yPosition += 40;
        doc.fontSize(12).text('Notes:', 50, yPosition);
        yPosition += 15;
        doc.text(bill.notes, 50, yPosition, { width: 500 });
      }
      
      // Terms and conditions
      if (bill.termsAndConditions) {
        yPosition += 40;
        doc.text('Terms & Conditions:', 50, yPosition);
        yPosition += 15;
        doc.text(bill.termsAndConditions, 50, yPosition, { width: 500 });
      }
      
      doc.end();
      
      stream.on('finish', () => {
        resolve({ filepath, filename });
      });
      
      stream.on('error', reject);
      
    } catch (error) {
      reject(error);
    }
  });
};

// Create a new bill
exports.createBill = async (req, res) => {
  try {
    const {
      invoiceType,
      invoiceDate,
      employeeName,
      customer,
      customerInfo,
      items,
      taxMode,
      notes,
      termsAndConditions,
      shippingCharges = 0,
      packingCharges = 0,
      otherCharges = 0
    } = req.body;

    const companyId = req.user.company;
    const userId = req.user.id;

    // Validate required fields
    if (!invoiceType || !invoiceDate || !employeeName || (!customer && !customerInfo) || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: invoiceType, invoiceDate, employeeName, customer/customerInfo, and items are required'
      });
    }

    // Handle customer data - either from existing customer or manual entry
    let customerData = null;
    let customerId = null;
    
    if (customer) {
      // Validate existing customer
      customerData = await Party.findById(customer);
      if (!customerData) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
      customerId = customer;
    } else if (customerInfo) {
      // Use manual customer info
      customerData = {
        name: customerInfo.name,
        email: customerInfo.email || '',
        phone: customerInfo.phone || '',
        address: customerInfo.address || {},
        gstin: customerInfo.gstin || ''
      };
      customerId = null; // No customer ID for manual entries
    }

    // Validate items and get product details
    const validatedItems = [];
    for (const item of items) {
      const product = await Item.findById(item.product);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${item.product} not found`
        });
      }

      validatedItems.push({
        product: item.product,
        productName: product.name,
        description: item.description || '',
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        price: parseFloat(item.price),
        discount: parseFloat(item.discount || 0),
        discountType: item.discountType || 'percentage',
        taxRate: parseFloat(item.taxRate || 0),
        hsnCode: item.hsnCode || '',
        subtotal: 0,
        taxAmount: 0,
        total: 0
      });
    }

    // Generate invoice number
    const billCount = await Bill.countDocuments({ company: companyId });
    const invoiceNumber = `INV-${String(billCount + 1).padStart(6, '0')}`;

    // Create bill
    const bill = new Bill({
      invoiceNumber,
      invoiceType,
      invoiceDate: new Date(invoiceDate),
      company: companyId,
      customer: customerId, // Will be null for manual entries
      customerDetails: {
        name: customerData.name,
        email: customerData.email || '',
        phone: customerData.phone || '',
        address: customerData.address || {},
        gstin: customerData.gstin || ''
      },
      employeeName,
      employeeId: userId,
      items: validatedItems,
      taxMode: taxMode || 'exclusive',
      notes: notes || '',
      termsAndConditions: termsAndConditions || '',
      shippingCharges: parseFloat(shippingCharges),
      packingCharges: parseFloat(packingCharges),
      otherCharges: parseFloat(otherCharges),
      createdBy: userId
    });

    // Calculate totals
    bill.calculateTotals();

    // Save bill
    const savedBill = await bill.save();

    // Populate references
    await savedBill.populate([
      { path: 'customer', select: 'name email phone address gstin' },
      { path: 'createdBy', select: 'name email' },
      { path: 'company', select: 'name email phone address' }
    ]);

    // Generate PDF
    try {
      const pdfResult = await generateBillPDF(savedBill);
      savedBill.pdfPath = pdfResult.filepath;
      savedBill.pdfGenerated = true;
      savedBill.pdfGeneratedAt = new Date();
      await savedBill.save();
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
      // Don't fail the bill creation if PDF generation fails
    }

    res.status(201).json({
      success: true,
      message: 'Bill created successfully',
      data: savedBill
    });

  } catch (error) {
    console.error('Error creating bill:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create bill',
      error: error.message
    });
  }
};

// Get all bills for a company
exports.getBills = async (req, res) => {
  try {
    const companyId = req.user.company;
    const {
      page = 1,
      limit = 10,
      status,
      paymentStatus,
      customer,
      startDate,
      endDate,
      search
    } = req.query;

    // Build query
    const query = { company: companyId, isDeleted: false };

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (customer) query.customer = customer;

    if (startDate && endDate) {
      query.invoiceDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (search) {
      query.$or = [
        { billNumber: { $regex: search, $options: 'i' } },
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { employeeName: { $regex: search, $options: 'i' } },
        { 'customerDetails.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get bills with pagination
    const bills = await Bill.find(query)
      .populate('customer', 'name email phone')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalBills = await Bill.countDocuments(query);

    res.json({
      success: true,
      data: bills,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalBills / parseInt(limit)),
        totalItems: totalBills,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bills',
      error: error.message
    });
  }
};

// Get a single bill
exports.getBill = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company;

    const bill = await Bill.findOne({ _id: id, company: companyId, isDeleted: false })
      .populate('customer', 'name email phone address gstin')
      .populate('createdBy', 'name email')
      .populate('company', 'name email phone address gstin')
      .populate('items.product', 'name description');

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    res.json({
      success: true,
      data: bill
    });

  } catch (error) {
    console.error('Error fetching bill:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bill',
      error: error.message
    });
  }
};

// Update a bill
exports.updateBill = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company;
    const userId = req.user.id;

    const bill = await Bill.findOne({ _id: id, company: companyId, isDeleted: false });
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    // Update fields
    const updateData = { ...req.body };
    updateData.updatedBy = userId;

    // If items are being updated, validate and recalculate
    if (updateData.items) {
      const validatedItems = [];
      for (const item of updateData.items) {
        const product = await Item.findById(item.product);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: `Product with ID ${item.product} not found`
          });
        }

        validatedItems.push({
          product: item.product,
          productName: product.name,
          description: item.description || '',
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          price: parseFloat(item.price),
          discount: parseFloat(item.discount || 0),
          discountType: item.discountType || 'percentage',
          taxRate: parseFloat(item.taxRate || 0),
          hsnCode: item.hsnCode || '',
          subtotal: 0,
          taxAmount: 0,
          total: 0
        });
      }
      updateData.items = validatedItems;
    }

    // Update bill
    Object.assign(bill, updateData);

    // Recalculate totals if items changed
    if (updateData.items) {
      bill.calculateTotals();
    }

    const updatedBill = await bill.save();

    // Populate references
    await updatedBill.populate([
      { path: 'customer', select: 'name email phone address gstin' },
      { path: 'createdBy', select: 'name email' },
      { path: 'updatedBy', select: 'name email' }
    ]);

    res.json({
      success: true,
      message: 'Bill updated successfully',
      data: updatedBill
    });

  } catch (error) {
    console.error('Error updating bill:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bill',
      error: error.message
    });
  }
};

// Delete a bill (soft delete)
exports.deleteBill = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company;
    const userId = req.user.id;

    const bill = await Bill.findOne({ _id: id, company: companyId, isDeleted: false });
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    // Soft delete
    bill.isDeleted = true;
    bill.deletedAt = new Date();
    bill.deletedBy = userId;
    await bill.save();

    res.json({
      success: true,
      message: 'Bill deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting bill:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bill',
      error: error.message
    });
  }
};

// Generate PDF for a bill
exports.generateBillPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company;

    const bill = await Bill.findOne({ _id: id, company: companyId, isDeleted: false })
      .populate('customer', 'name email phone address gstin')
      .populate('company', 'name email phone address gstin');

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    // Generate PDF
    const pdfResult = await generateBillPDF(bill);
    
    // Update bill with PDF info
    bill.pdfPath = pdfResult.filepath;
    bill.pdfGenerated = true;
    bill.pdfGeneratedAt = new Date();
    await bill.save();

    // Send PDF file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfResult.filename}"`);
    
    const fileStream = fs.createReadStream(pdfResult.filepath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message
    });
  }
};

// Get bill statistics
exports.getBillStats = async (req, res) => {
  try {
    const companyId = req.user.company;
    const { startDate, endDate } = req.query;

    const stats = await Bill.getStats(companyId, startDate, endDate);

    const result = stats[0] || {
      totalBills: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      avgBillAmount: 0
    };

    // Get additional stats
    const overdueCount = await Bill.countDocuments({
      company: companyId,
      dueDate: { $lt: new Date() },
      paymentStatus: { $nin: ['paid', 'cancelled'] },
      isDeleted: false
    });

    const statusStats = await Bill.aggregate([
      {
        $match: {
          company: mongoose.Types.ObjectId(companyId),
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    result.overdueCount = overdueCount;
    result.statusBreakdown = statusStats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error fetching bill stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bill statistics',
      error: error.message
    });
  }
};

// Update bill status
exports.updateBillStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const companyId = req.user.company;
    const userId = req.user.id;

    const validStatuses = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const bill = await Bill.findOne({ _id: id, company: companyId, isDeleted: false });
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    bill.status = status;
    bill.updatedBy = userId;
    await bill.save();

    res.json({
      success: true,
      message: 'Bill status updated successfully',
      data: bill
    });

  } catch (error) {
    console.error('Error updating bill status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bill status',
      error: error.message
    });
  }
};

// Duplicate a bill
exports.duplicateBill = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company;
    const userId = req.user.id;

    const originalBill = await Bill.findOne({ _id: id, company: companyId, isDeleted: false });
    if (!originalBill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    // Create duplicate
    const billCount = await Bill.countDocuments({ company: companyId });
    const newInvoiceNumber = `INV-${String(billCount + 1).padStart(6, '0')}`;

    const duplicateData = originalBill.toObject();
    delete duplicateData._id;
    delete duplicateData.billNumber;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;
    delete duplicateData.pdfPath;
    delete duplicateData.pdfGenerated;
    delete duplicateData.pdfGeneratedAt;

    duplicateData.invoiceNumber = newInvoiceNumber;
    duplicateData.invoiceDate = new Date();
    duplicateData.status = 'draft';
    duplicateData.paymentStatus = 'pending';
    duplicateData.paidAmount = 0;
    duplicateData.emailSent = false;
    duplicateData.createdBy = userId;

    const duplicateBill = new Bill(duplicateData);
    const savedBill = await duplicateBill.save();

    await savedBill.populate([
      { path: 'customer', select: 'name email phone' },
      { path: 'createdBy', select: 'name email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Bill duplicated successfully',
      data: savedBill
    });

  } catch (error) {
    console.error('Error duplicating bill:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to duplicate bill',
      error: error.message
    });
  }
};

module.exports = {
  createBill: exports.createBill,
  getBills: exports.getBills,
  getBill: exports.getBill,
  updateBill: exports.updateBill,
  deleteBill: exports.deleteBill,
  generateBillPDF: exports.generateBillPDF,
  getBillStats: exports.getBillStats,
  updateBillStatus: exports.updateBillStatus,
  duplicateBill: exports.duplicateBill
};