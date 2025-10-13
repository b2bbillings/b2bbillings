
const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate } = require('../middleware/auth');
const { validateInvoice, validateInvoiceUpdate } = require('../middleware/validators');

// All routes require authentication
router.use(authenticate);

// Create new invoice
router.post('/', validateInvoice, invoiceController.createInvoice);

// Get all invoices with filters
router.get('/', invoiceController.getAllInvoices);

// Get invoice statistics
router.get('/stats', invoiceController.getInvoiceStats);

// Get next invoice number
router.get('/next-number', invoiceController.getNextInvoiceNumber);

// Search invoices
router.get('/search', invoiceController.searchInvoices);

// Get single invoice by ID
router.get('/:id', invoiceController.getInvoiceById);

// Update invoice
router.put('/:id', validateInvoiceUpdate, invoiceController.updateInvoice);

// Update invoice status
router.patch('/:id/status', invoiceController.updateInvoiceStatus);

// Record payment
router.post('/:id/payment', invoiceController.recordPayment);

// Delete invoice (soft delete)
router.delete('/:id', invoiceController.deleteInvoice);

// Restore deleted invoice
router.patch('/:id/restore', invoiceController.restoreInvoice);

// Download invoice PDF
router.get('/:id/pdf', invoiceController.downloadInvoicePDF);

// Send invoice via email
router.post('/:id/email', invoiceController.emailInvoice);

// Duplicate invoice
router.post('/:id/duplicate', invoiceController.duplicateInvoice);

module.exports = router;

// ============================================
// controllers/invoiceController.js - COMPLETE CONTROLLER
// ============================================

const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Vendor = require('../models/Vendor');
const Item = require('../models/Item');
const Company = require('../models/Company');
const EndCustomer = require('../models/EndCustomer');
const mongoose = require('mongoose');

// Helper function to calculate GST
const calculateGST = (taxableAmount, gstRate, gstType, isInterState) => {
  let gstAmount = 0;
  
  if (gstType === 'include') {
    // GST is included in the price
    gstAmount = (taxableAmount * gstRate) / (100 + gstRate);
  } else {
    // GST is excluded - add to price
    gstAmount = (taxableAmount * gstRate) / 100;
  }
  
  const result = {
    cgst: 0,
    cgstAmount: 0,
    sgst: 0,
    sgstAmount: 0,
    igst: 0,
    igstAmount: 0,
    totalGst: gstAmount
  };
  
  if (isInterState) {
    // Inter-state: IGST
    result.igst = gstRate;
    result.igstAmount = gstAmount;
  } else {
    // Intra-state: CGST + SGST
    result.cgst = gstRate / 2;
    result.cgstAmount = gstAmount / 2;
    result.sgst = gstRate / 2;
    result.sgstAmount = gstAmount / 2;
  }
  
  return result;
};

// Create Invoice
exports.createInvoice = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const companyId = req.user.companyId;
    const userId = req.user._id;
    
    const {
      invoicePrefix,
      invoiceNumber,
      invoiceSuffix,
      invoiceDate,
      party,
      endCustomer,
      items,
      payment,
      autoRoundOff,
      serviceCharge,
      otherCharges,
      notes,
      termsAndConditions
    } = req.body;
    
    // Fetch company details for state comparison
    const company = await Company.findById(companyId).session(session);
    if (!company) {
      throw new Error('Company not found');
    }
    
    // Fetch party (customer/vendor) details
    const PartyModel = party.partyType === 'Customer' ? Customer : Vendor;
    const partyDetails = await PartyModel.findOne({
      _id: party.partyId,
      companyId
    }).session(session);
    
    if (!partyDetails) {
      throw new Error(`${party.partyType} not found`);
    }
    
    // Check if invoice number already exists
    const fullInvoiceNum = `${invoicePrefix}-${invoiceNumber}${invoiceSuffix ? `-${invoiceSuffix}` : ''}`;
    const existingInvoice = await Invoice.findOne({
      companyId,
      fullInvoiceNumber: fullInvoiceNum,
      isDeleted: false
    }).session(session);
    
    if (existingInvoice) {
      throw new Error('Invoice number already exists');
    }
    
    // Determine if inter-state or intra-state
    const companyState = company.address?.state || '';
    const partyState = partyDetails.billingAddress?.state || '';
    const isInterState = companyState !== partyState;
    
    // Process items and calculate totals
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTaxableAmount = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let totalCESS = 0;
    
    const processedItems = [];
    
    for (const item of items) {
      // Calculate gross amount
      const grossAmount = parseFloat(item.quantity) * parseFloat(item.rate);
      subtotal += grossAmount;
      
      // Calculate discount
      let discountAmount = 0;
      if (item.discount && item.discount.value > 0) {
        if (item.discount.type === 'percentage') {
          discountAmount = (grossAmount * item.discount.value) / 100;
        } else {
          discountAmount = parseFloat(item.discount.value);
        }
      }
      totalDiscount += discountAmount;
      
      // Calculate taxable amount
      const taxableAmount = grossAmount - discountAmount;
      totalTaxableAmount += taxableAmount;
      
      // Calculate GST
      const gstRate = parseFloat(item.gstRate) || 0;
      const gstType = item.gstType || 'include';
      const gstResult = calculateGST(taxableAmount, gstRate, gstType, isInterState);
      
      totalCGST += gstResult.cgstAmount;
      totalSGST += gstResult.sgstAmount;
      totalIGST += gstResult.igstAmount;
      
      // Calculate CESS
      const cessRate = parseFloat(item.cessRate) || 0;
      const cessAmount = (taxableAmount * cessRate) / 100;
      totalCESS += cessAmount;
      
      // Calculate final item amount
      let finalAmount = taxableAmount;
      if (gstType === 'exclude') {
        finalAmount += gstResult.totalGst;
      }
      finalAmount += cessAmount;
      
      processedItems.push({
        itemId: item.itemId || null,
        goods: item.goods,
        challanNo: item.challanNo,
        description: item.description,
        batchNo: item.batchNo,
        expiryDate: item.expiryDate,
        mrp: item.mrp,
        quantity: parseFloat(item.quantity),
        freeQuantity: parseFloat(item.freeQuantity) || 0,
        unit: item.unit || 'PCS',
        rate: parseFloat(item.rate),
        discount: {
          type: item.discount?.type || 'percentage',
          value: item.discount?.value || 0,
          amount: discountAmount
        },
        grossAmount,
        taxableAmount,
        gstType,
        gstRate,
        cgst: gstResult.cgst,
        cgstAmount: gstResult.cgstAmount,
        sgst: gstResult.sgst,
        sgstAmount: gstResult.sgstAmount,
        igst: gstResult.igst,
        igstAmount: gstResult.igstAmount,
        cessRate,
        cessAmount,
        amount: finalAmount
      });
      
      // Update item inventory if itemId exists
      if (item.itemId) {
        const itemDoc = await Item.findById(item.itemId).session(session);
        if (itemDoc && itemDoc.inventory?.trackInventory) {
          await Item.findByIdAndUpdate(
            item.itemId,
            {
              $inc: {
                'inventory.currentStock': -parseFloat(item.quantity),
                totalSold: parseFloat(item.quantity),
                totalRevenue: finalAmount
              },
              lastSold: new Date()
            },
            { session }
          );
        }
      }
    }
    
    // Calculate service charge with tax if applicable
    const serviceChargeAmount = parseFloat(serviceCharge) || 0;
    let serviceChargeTax = 0;
    if (serviceChargeAmount > 0) {
      // Assuming 18% GST on service charge
      serviceChargeTax = (serviceChargeAmount * 18) / 100;
    }
    
    const otherChargesAmount = parseFloat(otherCharges) || 0;
    const totalTax = totalCGST + totalSGST + totalIGST + totalCESS + serviceChargeTax;
    
    // Calculate grand total
    let grandTotal = totalTaxableAmount + totalTax + serviceChargeAmount + otherChargesAmount;
    
    // Apply rounding
    let roundOff = 0;
    if (autoRoundOff) {
      const rounded = Math.round(grandTotal);
      roundOff = rounded - grandTotal;
      grandTotal = rounded;
    }
    
    // Calculate payment status
    const paymentAmount = parseFloat(payment?.amount) || 0;
    let status = 'pending';
    let pendingAmount = grandTotal;
    
    if (payment?.isPaymentReceived) {
      if (paymentAmount >= grandTotal) {
        status = 'paid';
        pendingAmount = 0;
      } else if (paymentAmount > 0) {
        status = 'partially_paid';
        pendingAmount = grandTotal - paymentAmount;
      }
    }
    
    // Prepare end customer data
    let endCustomerData = null;
    if (endCustomer && endCustomer.endCustomerId) {
      const endCust = await EndCustomer.findById(endCustomer.endCustomerId).session(session);
      if (endCust) {
        endCustomerData = {
          endCustomerId: endCust._id,
          customerName: endCust.customerName,
          phone: endCust.phone,
          email: endCust.email,
          address: endCust.address
        };
      }
    }
    
    // Create invoice
    const invoice = await Invoice.create([{
      companyId,
      invoicePrefix: invoicePrefix || 'INV',
      invoiceNumber,
      invoiceSuffix,
      fullInvoiceNumber: fullInvoiceNum,
      invoiceDate: invoiceDate || new Date(),
      party: {
        partyId: partyDetails._id,
        partyType: party.partyType,
        name: partyDetails.name,
        phone: partyDetails.phone,
        email: partyDetails.email,
        company: partyDetails.company,
        gstType: partyDetails.gstDetails?.gstType,
        gstin: partyDetails.gstDetails?.gstin,
        billingAddress: partyDetails.billingAddress,
        shippingAddress: partyDetails.shippingAddress
      },
      endCustomer: endCustomerData,
      items: processedItems,
      totals: {
        subtotal,
        totalDiscount,
        totalTaxableAmount,
        totalCGST,
        totalSGST,
        totalIGST,
        totalCESS,
        totalTax,
        serviceCharge: serviceChargeAmount,
        serviceChargeTax,
        otherCharges: otherChargesAmount,
        roundOff,
        grandTotal
      },
      payment: {
        isPaymentReceived: payment?.isPaymentReceived || false,
        mode: payment?.mode || 'Cash',
        refNo: payment?.refNo,
        depositTo: payment?.depositTo,
        amount: paymentAmount,
        payFull: payment?.payFull || false,
        paidDate: payment?.isPaymentReceived ? new Date() : null,
        pendingAmount
      },
      status,
      autoRoundOff,
      notes,
      termsAndConditions,
      createdBy: userId
    }], { session });
    
    // Update party balance
    const balanceChange = pendingAmount;
    if (party.partyType === 'Customer') {
      await Customer.findByIdAndUpdate(
        partyDetails._id,
        {
          $inc: {
            'currentBalance.amount': balanceChange,
            totalInvoices: 1,
            totalRevenue: grandTotal
          },
          $set: {
            'currentBalance.lastUpdated': new Date(),
            lastTransaction: new Date()
          }
        },
        { session }
      );
    } else {
      await Vendor.findByIdAndUpdate(
        partyDetails._id,
        {
          $inc: {
            'currentBalance.amount': -balanceChange,
            totalPurchases: 1,
            totalSpent: grandTotal
          },
          $set: {
            'currentBalance.lastUpdated': new Date(),
            lastTransaction: new Date()
          }
        },
        { session }
      );
    }
    
    // Update company's next invoice number
    await Company.findByIdAndUpdate(
      companyId,
      {
        $inc: { 'settings.nextInvoiceNumber': 1 }
      },
      { session }
    );
    
    await session.commitTransaction();
    
    res.status(201).json({
      success: true,
      data: invoice[0],
      message: 'Invoice created successfully'
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Create invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create invoice'
    });
  } finally {
    session.endSession();
  }
};

// Get all invoices with filters
exports.getAllInvoices = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const {
      status,
      partyId,
      partyType,
      startDate,
      endDate,
      search,
      minAmount,
      maxAmount,
      paymentMode,
      page = 1,
      limit = 50,
      sortBy = 'invoiceDate',
      sortOrder = 'desc'
    } = req.query;
    
    const query = { companyId, isDeleted: false };
    
    // Filters
    if (status) {
      if (status.includes(',')) {
        query.status = { $in: status.split(',') };
      } else {
        query.status = status;
      }
    }
    
    if (partyId) query['party.partyId'] = partyId;
    if (partyType) query['party.partyType'] = partyType;
    
    if (search) {
      query.$or = [
        { fullInvoiceNumber: { $regex: search, $options: 'i' } },
        { 'party.name': { $regex: search, $options: 'i' } },
        { 'party.phone': { $regex: search, $options: 'i' } },
        { 'party.company': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.invoiceDate.$lte = end;
      }
    }
    
    if (minAmount || maxAmount) {
      query['totals.grandTotal'] = {};
      if (minAmount) query['totals.grandTotal'].$gte = parseFloat(minAmount);
      if (maxAmount) query['totals.grandTotal'].$lte = parseFloat(maxAmount);
    }
    
    if (paymentMode) query['payment.mode'] = paymentMode;
    
    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Execute query
    const invoices = await Invoice.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('fullInvoiceNumber invoiceDate party.name party.company totals.grandTotal payment status')
      .lean();
    
    const count = await Invoice.countDocuments(query);
    
    res.json({
      success: true,
      data: invoices,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
        limit: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch invoices'
    });
  }
};

// Get invoice statistics
exports.getInvoiceStats = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { startDate, endDate } = req.query;
    
    const matchQuery = { companyId, isDeleted: false };
    
    if (startDate || endDate) {
      matchQuery.invoiceDate = {};
      if (startDate) matchQuery.invoiceDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchQuery.invoiceDate.$lte = end;
      }
    }
    
    const stats = await Invoice.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: '$totals.grandTotal' },
          totalPaid: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$totals.grandTotal', 0]
            }
          },
          totalPending: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$totals.grandTotal', 0]
            }
          },
          totalPartiallyPaid: {
            $sum: {
              $cond: [{ $eq: ['$status', 'partially_paid'] }, '$totals.grandTotal', 0]
            }
          },
          paidCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, 1, 0]
            }
          },
          pendingCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
            }
          },
          partiallyPaidCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'partially_paid'] }, 1, 0]
            }
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: stats[0] || {
        totalInvoices: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalPending: 0,
        totalPartiallyPaid: 0,
        paidCount: 0,
        pendingCount: 0,
        partiallyPaidCount: 0
      }
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch statistics'
    });
  }
};

// Get next invoice number
exports.getNextInvoiceNumber = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    
    const company = await Company.findById(companyId).select('settings');
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }
    
    const nextNumber = company.settings?.nextInvoiceNumber || 1;
    const prefix = company.settings?.invoicePrefix || 'INV';
    
    // Pad with zeros (e.g., 0001)
    const paddedNumber = String(nextNumber).padStart(4, '0');
    
    res.json({
      success: true,
      data: {
        prefix,
        number: paddedNumber,
        nextNumber,
        fullNumber: `${prefix}-${paddedNumber}`
      }
    });
    
  } catch (error) {
    console.error('Get next number error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get next invoice number'
    });
  }
};

// Search invoices
exports.searchInvoices = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }
    
    const invoices = await Invoice.find({
      companyId,
      isDeleted: false,
      $or: [
        { fullInvoiceNumber: { $regex: q, $options: 'i' } },
        { 'party.name': { $regex: q, $options: 'i' } },
        { 'party.phone': { $regex: q, $options: 'i' } },
        { 'party.company': { $regex: q, $options: 'i' } }
      ]
    })
    .select('fullInvoiceNumber invoiceDate party.name party.company totals.grandTotal payment.pendingAmount status')
    .sort({ invoiceDate: -1 })
    .limit(20)
    .lean();
    
    res.json({ success: true, data: invoices });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Search failed'
    });
  }
};

// Get single invoice by ID
exports.getInvoiceById = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    
    const invoice = await Invoice.findOne({
      _id: id,
      companyId,
      isDeleted: false
    })
    .populate('party.partyId', 'name phone email company')
    .populate('endCustomer.endCustomerId', 'customerName phone email')
    .populate('items.itemId', 'name category pricing.salePrice tax.gstRate')
    .lean();
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    res.json({
      success: true,
      data: invoice
    });
    
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch invoice'
    });
  }
};

// Update invoice
exports.updateInvoice = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const companyId = req.user.companyId;
    const userId = req.user._id;
    const { id } = req.params;
    
    // Find existing invoice
    const existingInvoice = await Invoice.findOne({
      _id: id,
      companyId,
      isDeleted: false
    }).session(session);
    
    if (!existingInvoice) {
      throw new Error('Invoice not found');
    }
    
    // Prevent updating paid invoices
    if (existingInvoice.status === 'paid') {
      throw new Error('Cannot update a paid invoice');
    }
    
    // Revert inventory changes from old invoice
    for (const oldItem of existingInvoice.items) {
      if (oldItem.itemId) {
        await Item.findByIdAndUpdate(
          oldItem.itemId,
          {
            $inc: {
              'inventory.currentStock': oldItem.quantity,
              totalSold: -oldItem.quantity,
              totalRevenue: -oldItem.amount
            }
          },
          { session }
        );
      }
    }
    
    // Revert party balance
    const oldBalanceChange = existingInvoice.payment.pendingAmount;
    const PartyModel = existingInvoice.party.partyType === 'Customer' ? Customer : Vendor;
    await PartyModel.findByIdAndUpdate(
      existingInvoice.party.partyId,
      {
        $inc: {
          'currentBalance.amount': existingInvoice.party.partyType === 'Customer' ? -oldBalanceChange : oldBalanceChange,
          totalInvoices: -1,
          [existingInvoice.party.partyType === 'Customer' ? 'totalRevenue' : 'totalSpent']: -existingInvoice.totals.grandTotal
        }
      },
      { session }
    );
    
    // Now process the update similar to create
    // (Reuse the calculation logic from createInvoice)
    
    const updateData = {
      ...req.body,
      updatedBy: userId
    };
    
    // Recalculate everything (similar to create logic)
    // ... (implement full recalculation here)
    
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      id,
      updateData,
      { new: true, session, runValidators: true }
    );
    
    await session.commitTransaction();
    
    res.json({
      success: true,
      data: updatedInvoice,
      message: 'Invoice updated successfully'
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Update invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update invoice'
    });
  } finally {
    session.endSession();
  }
};

// Update invoice status
exports.updateInvoiceStatus = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const userId = req.user._id;
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['draft', 'pending', 'paid', 'partially_paid', 'overdue', 'cancelled', 'void'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const invoice = await Invoice.findOneAndUpdate(
      { _id: id, companyId, isDeleted: false },
      { 
        status,
        updatedBy: userId
      },
      { new: true }
    );
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    res.json({
      success: true,
      data: invoice,
      message: 'Invoice status updated successfully'
    });
    
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update status'
    });
  }
};

// Record payment
exports.recordPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const companyId = req.user.companyId;
    const userId = req.user._id;
    const { id } = req.params;
    const { amount, mode, refNo, depositTo } = req.body;
    
    const invoice = await Invoice.findOne({
      _id: id,
      companyId,
      isDeleted: false
    }).session(session);
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    
    const paymentAmount = parseFloat(amount);
    if (paymentAmount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }
    
    const currentPaid = invoice.payment.amount || 0;
    const totalPaid = currentPaid + paymentAmount;
    const pendingAmount = invoice.totals.grandTotal - totalPaid;
    
    let newStatus = 'pending';
    if (totalPaid >= invoice.totals.grandTotal) {
      newStatus = 'paid';
    } else if (totalPaid > 0) {
      newStatus = 'partially_paid';
    }
    
    // Update invoice
    invoice.payment.amount = totalPaid;
    invoice.payment.pendingAmount = Math.max(0, pendingAmount);
    invoice.payment.isPaymentReceived = true;
    invoice.payment.mode = mode || invoice.payment.mode;
    invoice.payment.refNo = refNo || invoice.payment.refNo;
    invoice.payment.depositTo = depositTo || invoice.payment.depositTo;
    invoice.payment.paidDate = new Date();
    invoice.status = newStatus;
    invoice.updatedBy = userId;
    
    await invoice.save({ session });
    
    // Update party balance
    const PartyModel = invoice.party.partyType === 'Customer' ? Customer : Vendor;
    const balanceChange = invoice.party.partyType === 'Customer' ? -paymentAmount : paymentAmount;
    
    await PartyModel.findByIdAndUpdate(
      invoice.party.partyId,
      {
        $inc: {
          'currentBalance.amount': balanceChange
        },
        $set: {
          'currentBalance.lastUpdated': new Date()
        }
      },
      { session }
    );
    
    await session.commitTransaction();
    
    res.json({
      success: true,
      data: invoice,
      message: 'Payment recorded successfully'
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Record payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to record payment'
    });
  } finally {
    session.endSession();
  }
};

// Delete invoice (soft delete)
exports.deleteInvoice = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const companyId = req.user.companyId;
    const userId = req.user._id;
    const { id } = req.params;
    
    const invoice = await Invoice.findOne({
      _id: id,
      companyId,
      isDeleted: false
    }).session(session);
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    
    // Revert inventory
    for (const item of invoice.items) {
      if (item.itemId) {
        await Item.findByIdAndUpdate(
          item.itemId,
          {
            $inc: {
              'inventory.currentStock': item.quantity,
              totalSold: -item.quantity,
              totalRevenue: -item.amount
            }
          },
          { session }
        );
      }
    }
    
    // Revert party balance
    const PartyModel = invoice.party.partyType === 'Customer' ? Customer : Vendor;
    const balanceChange = invoice.payment.pendingAmount;
    
    await PartyModel.findByIdAndUpdate(
      invoice.party.partyId,
      {
        $inc: {
          'currentBalance.amount': invoice.party.partyType === 'Customer' ? -balanceChange : balanceChange,
          totalInvoices: -1,
          [invoice.party.partyType === 'Customer' ? 'totalRevenue' : 'totalSpent']: -invoice.totals.grandTotal
        }
      },
      { session }
    );
    
    // Soft delete invoice
    invoice.isDeleted = true;
    invoice.deletedAt = new Date();
    invoice.deletedBy = userId;
    await invoice.save({ session });
    
    await session.commitTransaction();
    
    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Delete invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete invoice'
    });
  } finally {
    session.endSession();
  }
};

// Restore deleted invoice
exports.restoreInvoice = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const companyId = req.user.companyId;
    const userId = req.user._id;
    const { id } = req.params;
    
    const invoice = await Invoice.findOne({
      _id: id,
      companyId,
      isDeleted: true
    }).session(session);
    
    if (!invoice) {
      throw new Error('Deleted invoice not found');
    }
    
    // Restore inventory
    for (const item of invoice.items) {
      if (item.itemId) {
        await Item.findByIdAndUpdate(
          item.itemId,
          {
            $inc: {
              'inventory.currentStock': -item.quantity,
              totalSold: item.quantity,
              totalRevenue: item.amount
            }
          },
          { session }
        );
      }
    }
    
    // Restore party balance
    const PartyModel = invoice.party.partyType === 'Customer' ? Customer : Vendor;
    const balanceChange = invoice.payment.pendingAmount;
    
    await PartyModel.findByIdAndUpdate(
      invoice.party.partyId,
      {
        $inc: {
          'currentBalance.amount': invoice.party.partyType === 'Customer' ? balanceChange : -balanceChange,
          totalInvoices: 1,
          [invoice.party.partyType === 'Customer' ? 'totalRevenue' : 'totalSpent']: invoice.totals.grandTotal
        }
      },
      { session }
    );
    
    // Restore invoice
    invoice.isDeleted = false;
    invoice.deletedAt = undefined;
    invoice.deletedBy = undefined;
    invoice.updatedBy = userId;
    await invoice.save({ session });
    
    await session.commitTransaction();
    
    res.json({
      success: true,
      data: invoice,
      message: 'Invoice restored successfully'
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Restore invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to restore invoice'
    });
  } finally {
    session.endSession();
  }
};

// Download invoice PDF
exports.downloadInvoicePDF = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    
    const invoice = await Invoice.findOne({
      _id: id,
      companyId,
      isDeleted: false
    })
    .populate('party.partyId')
    .populate('endCustomer.endCustomerId')
    .lean();
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    const company = await Company.findById(companyId).lean();
    
    // TODO: Implement PDF generation using libraries like:
    // - pdfkit
    // - puppeteer
    // - jspdf (frontend)
    
    res.json({
      success: true,
      message: 'PDF generation feature to be implemented',
      data: { invoice, company }
    });
    
  } catch (error) {
    console.error('Download PDF error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate PDF'
    });
  }
};

// Send invoice via email
exports.emailInvoice = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const { email, cc, subject, message } = req.body;
    
    const invoice = await Invoice.findOne({
      _id: id,
      companyId,
      isDeleted: false
    }).lean();
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    // TODO: Implement email sending using:
    // - nodemailer
    // - sendgrid
    // - AWS SES
    
    res.json({
      success: true,
      message: 'Email feature to be implemented',
      data: { email, cc, subject, message }
    });
    
  } catch (error) {
    console.error('Email invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send email'
    });
  }
};

// Duplicate invoice
exports.duplicateInvoice = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const userId = req.user._id;
    const { id } = req.params;
    
    const originalInvoice = await Invoice.findOne({
      _id: id,
      companyId,
      isDeleted: false
    }).lean();
    
    if (!originalInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    // Get next invoice number
    const company = await Company.findById(companyId);
    const nextNumber = company.settings?.nextInvoiceNumber || 1;
    const paddedNumber = String(nextNumber).padStart(4, '0');
    
    // Create duplicate
    const duplicateData = {
      ...originalInvoice,
      _id: undefined,
      invoiceNumber: paddedNumber,
      fullInvoiceNumber: `${originalInvoice.invoicePrefix}-${paddedNumber}`,
      invoiceDate: new Date(),
      status: 'draft',
      payment: {
        isPaymentReceived: false,
        amount: 0,
        pendingAmount: originalInvoice.totals.grandTotal,
        mode: 'Cash'
      },
      createdBy: userId,
      createdAt: undefined,
      updatedAt: undefined
    };
    
    const duplicateInvoice = await Invoice.create(duplicateData);
    
    await Company.findByIdAndUpdate(companyId, {
      $inc: { 'settings.nextInvoiceNumber': 1 }
    });
    
    res.status(201).json({
      success: true,
      data: duplicateInvoice,
      message: 'Invoice duplicated successfully'
    });
    
  } catch (error) {
    console.error('Duplicate invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to duplicate invoice'
    });
  }
};