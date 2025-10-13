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
      { status, updatedBy: userId },
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
    
    // Update invoice payment details
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
        $inc: { 'currentBalance.amount': balanceChange },
        $set: { 'currentBalance.lastUpdated': new Date() }
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

// Update invoice
exports.updateInvoice = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const companyId = req.user.companyId;
    const userId = req.user._id;
    const { id } = req.params;
    
    const existingInvoice = await Invoice.findOne({
      _id: id,
      companyId,
      isDeleted: false
    }).session(session);
    
    if (!existingInvoice) {
      throw new Error('Invoice not found');
    }
    
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
    
    // Now process the update (similar to create logic)
    const updateData = { ...req.body, updatedBy: userId };
    
    // Recalculate everything if items changed
    if (updateData.items) {
      const company = await Company.findById(companyId).session(session);
      const partyDetails = await PartyModel.findOne({
        _id: updateData.party?.partyId || existingInvoice.party.partyId,
        companyId
      }).session(session);
      
      const companyState = company.address?.state || '';
      const partyState = partyDetails.billingAddress?.state || '';
      
      const itemsResult = await processInvoiceItems(updateData.items, companyState, partyState, session);
      
      // Update totals
      const serviceChargeAmount = parseFloat(updateData.serviceCharge) || 0;
      const serviceChargeTax = serviceChargeAmount > 0 ? (serviceChargeAmount * 18) / 100 : 0;
      const otherChargesAmount = parseFloat(updateData.otherCharges) || 0;
      const totalTax = itemsResult.totalCGST + itemsResult.totalSGST + 
                       itemsResult.totalIGST + itemsResult.totalCESS + serviceChargeTax;
      
      let grandTotal = itemsResult.totalTaxableAmount + totalTax + 
                       serviceChargeAmount + otherChargesAmount;
      
      let roundOff = 0;
      if (updateData.autoRoundOff !== false) {
        const rounded = Math.round(grandTotal);
        roundOff = rounded - grandTotal;
        grandTotal = rounded;
      }
      
      updateData.items = itemsResult.processedItems;
      updateData.totals = {
        subtotal: itemsResult.subtotal,
        totalDiscount: itemsResult.totalDiscount,
        totalTaxableAmount: itemsResult.totalTaxableAmount,
        totalCGST: itemsResult.totalCGST,
        totalSGST: itemsResult.totalSGST,
        totalIGST: itemsResult.totalIGST,
        totalCESS: itemsResult.totalCESS,
        totalTax,
        serviceCharge: serviceChargeAmount,
        serviceChargeTax,
        otherCharges: otherChargesAmount,
        roundOff,
        grandTotal
      };
      
      // Update payment status
      const paymentAmount = parseFloat(updateData.payment?.amount) || 0;
      const pendingAmount = grandTotal - paymentAmount;
      
      let status = 'pending';
      if (updateData.payment?.isPaymentReceived) {
        if (paymentAmount >= grandTotal) status = 'paid';
        else if (paymentAmount > 0) status = 'partially_paid';
      }
      
      updateData.status = status;
      updateData.payment = {
        ...updateData.payment,
        pendingAmount
      };
      
      // Update party balance with new amounts
      await PartyModel.findByIdAndUpdate(
        partyDetails._id,
        {
          $inc: {
            'currentBalance.amount': existingInvoice.party.partyType === 'Customer' ? pendingAmount : -pendingAmount,
            totalInvoices: 1,
            [existingInvoice.party.partyType === 'Customer' ? 'totalRevenue' : 'totalSpent']: grandTotal
          },
          $set: {
            'currentBalance.lastUpdated': new Date(),
            lastTransaction: new Date()
          }
        },
        { session }
      );
    }
    
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

// Download invoice PDF (placeholder)
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
    
    // TODO: Implement PDF generation
    res.json({
      success: true,
      message: 'PDF generation to be implemented',
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

// Send invoice via email (placeholder)
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
    
    // TODO: Implement email sending
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

module.exports = exports;