const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const Vendor = require('../models/Vendor');
const Party = require('../models/Party');
const BankAccount = require('../models/BankAccount');
const logger = require('../config/logger');

class PaymentService {
  
  // Get all parties (customers and vendors) for payment forms
  async getPartiesForPayment(companyId, searchTerm = '', type = 'all') {
    try {
      let parties = [];
      const searchQuery = {
        companyId,
        ...(searchTerm && {
          $or: [
            { name: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } },
            { phone: { $regex: searchTerm, $options: 'i' } }
          ]
        })
      };

      if (type === 'all' || type === 'customer') {
        const customers = await Customer.find(searchQuery)
          .select('name email phone address gstNumber')
          .limit(50)
          .lean();
        
        parties = parties.concat(
          customers.map(customer => ({
            ...customer,
            partyType: 'customer',
            type: 'customer',
            label: customer.name,
            value: customer._id
          }))
        );
      }

      if (type === 'all' || type === 'vendor') {
        const vendors = await Vendor.find(searchQuery)
          .select('name email phone address gstNumber')
          .limit(50)
          .lean();
        
        parties = parties.concat(
          vendors.map(vendor => ({
            ...vendor,
            partyType: 'vendor',
            type: 'vendor',
            label: vendor.name,
            value: vendor._id
          }))
        );
      }

      // Also check Party collection for legacy data
      const partiesFromPartyCollection = await Party.find({
        ...searchQuery,
        ...(type !== 'all' && { type })
      })
      .select('name email phone address gstNumber type')
      .limit(50)
      .lean();

      parties = parties.concat(
        partiesFromPartyCollection.map(party => ({
          ...party,
          partyType: party.type,
          label: party.name,
          value: party._id
        }))
      );

      // Remove duplicates and sort
      const uniqueParties = parties.filter((party, index, self) => 
        index === self.findIndex(p => p._id.toString() === party._id.toString())
      );

      uniqueParties.sort((a, b) => a.name.localeCompare(b.name));

      return {
        success: true,
        data: uniqueParties,
        count: uniqueParties.length
      };

    } catch (error) {
      logger.error('Error fetching parties for payment:', error);
      throw new Error('Failed to fetch parties: ' + error.message);
    }
  }

  // Get bank accounts for a company
  async getBankAccountsForPayment(companyId) {
    try {
      const bankAccounts = await BankAccount.find({
        companyId,
        isActive: { $ne: false }
      })
      .select('bankName accountHolderName accountNumber ifscCode accountType balance')
      .lean();

      return {
        success: true,
        data: bankAccounts.map(account => ({
          ...account,
          label: `${account.bankName} - ${account.accountNumber}`,
          value: account._id,
          displayName: `${account.accountHolderName} (${account.bankName})`
        }))
      };

    } catch (error) {
      logger.error('Error fetching bank accounts:', error);
      throw new Error('Failed to fetch bank accounts: ' + error.message);
    }
  }

  // Generate payment number
  async generatePaymentNumber(paymentType, companyId) {
    try {
      const prefix = paymentType === 'payment_in' ? 'PIN' : 'POUT';
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      
      // Find the last payment number for this company and type
      const lastPayment = await Payment.findOne({
        companyId,
        type: paymentType,
        paymentNumber: new RegExp(`^${prefix}${year}${month}`)
      }, {}, { sort: { paymentNumber: -1 } });
      
      let sequence = 1;
      if (lastPayment && lastPayment.paymentNumber) {
        const lastSequence = parseInt(lastPayment.paymentNumber.slice(-4));
        sequence = lastSequence + 1;
      }
      
      return `${prefix}${year}${month}${sequence.toString().padStart(4, '0')}`;

    } catch (error) {
      logger.error('Error generating payment number:', error);
      throw new Error('Failed to generate payment number: ' + error.message);
    }
  }

  // Create payment with full validation
  async createPayment(paymentData, userId) {
    try {
      const {
        paymentType,
        partyId,
        partyName,
        amount,
        paymentMethod = 'cash',
        paymentDate,
        bankAccountId,
        paymentDetails = {},
        reference = '',
        notes = '',
        companyId
      } = paymentData;

      // Validate required fields
      if (!paymentType || !partyId || !amount || !companyId) {
        throw new Error('Missing required fields: paymentType, partyId, amount, companyId');
      }

      if (!['payment_in', 'payment_out'].includes(paymentType)) {
        throw new Error('Invalid payment type');
      }

      if (isNaN(amount) || amount <= 0) {
        throw new Error('Amount must be a positive number');
      }

      // Verify party exists
      let party = await Customer.findById(partyId) || 
                  await Vendor.findById(partyId) || 
                  await Party.findById(partyId);

      if (!party) {
        throw new Error('Party not found');
      }

      // Verify bank account if provided
      let bankAccount = null;
      if (bankAccountId) {
        bankAccount = await BankAccount.findById(bankAccountId);
        if (!bankAccount) {
          throw new Error('Bank account not found');
        }
      }

      // Generate payment number
      const paymentNumber = await this.generatePaymentNumber(paymentType, companyId);

      // Create payment object
      const payment = new Payment({
        paymentNumber,
        type: paymentType,
        paymentType: paymentType,
        party: partyId,
        partyId: partyId,
        partyName: partyName || party.name,
        amount: parseFloat(amount),
        paymentMethod,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentDetails,
        reference,
        notes,
        company: companyId,
        companyId: companyId,
        createdBy: userId,
        lastModifiedBy: userId,
        status: 'completed',
        ...(bankAccount && {
          bankAccountId: bankAccountId,
          bankName: bankAccount.bankName,
          bankAccountName: bankAccount.accountHolderName,
          bankAccountNumber: bankAccount.accountNumber
        })
      });

      // Save payment
      await payment.save();

      // Populate related data
      await payment.populate([
        { path: 'party', select: 'name email phone address type' },
        { path: 'bankAccountId', select: 'bankName accountHolderName accountNumber' },
        { path: 'createdBy', select: 'name email' }
      ]);

      logger.info(`Payment created: ${payment.paymentNumber} for company ${companyId} by user ${userId}`);

      return {
        success: true,
        data: payment,
        message: 'Payment created successfully'
      };

    } catch (error) {
      logger.error('Error creating payment:', error);
      throw error;
    }
  }

  // Get payments with filtering and pagination
  async getPayments(companyId, filters = {}, pagination = {}) {
    try {
      const {
        paymentType,
        status,
        paymentMethod,
        partyId,
        dateFrom,
        dateTo,
        search
      } = filters;

      const { page = 1, limit = 10 } = pagination;

      // Build query
      let query = { companyId };

      if (paymentType) query.type = paymentType;
      if (status) query.status = status;
      if (paymentMethod) query.paymentMethod = paymentMethod;
      if (partyId) query.partyId = partyId;

      // Date range filter
      if (dateFrom || dateTo) {
        query.paymentDate = {};
        if (dateFrom) query.paymentDate.$gte = new Date(dateFrom);
        if (dateTo) query.paymentDate.$lte = new Date(dateTo);
      }

      // Search filter
      if (search) {
        query.$or = [
          { paymentNumber: { $regex: search, $options: 'i' } },
          { partyName: { $regex: search, $options: 'i' } },
          { reference: { $regex: search, $options: 'i' } },
          { notes: { $regex: search, $options: 'i' } }
        ];
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get payments
      const payments = await Payment.find(query)
        .populate('party', 'name email phone address type')
        .populate('bankAccountId', 'bankName accountHolderName accountNumber')
        .populate('createdBy', 'name email')
        .sort({ paymentDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count
      const total = await Payment.countDocuments(query);

      // Calculate summary
      const summary = await Payment.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$type',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      const summaryData = {
        totalPaymentIn: 0,
        totalPaymentOut: 0,
        countPaymentIn: 0,
        countPaymentOut: 0,
        netAmount: 0
      };

      summary.forEach(item => {
        if (item._id === 'payment_in') {
          summaryData.totalPaymentIn = item.totalAmount;
          summaryData.countPaymentIn = item.count;
        } else if (item._id === 'payment_out') {
          summaryData.totalPaymentOut = item.totalAmount;
          summaryData.countPaymentOut = item.count;
        }
      });

      summaryData.netAmount = summaryData.totalPaymentIn - summaryData.totalPaymentOut;

      return {
        success: true,
        data: payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        summary: summaryData
      };

    } catch (error) {
      logger.error('Error fetching payments:', error);
      throw new Error('Failed to fetch payments: ' + error.message);
    }
  }

  // Get payment by ID
  async getPaymentById(paymentId, companyId) {
    try {
      const payment = await Payment.findOne({ _id: paymentId, companyId })
        .populate('party', 'name email phone address type')
        .populate('bankAccountId', 'bankName accountHolderName accountNumber ifscCode')
        .populate('createdBy', 'name email')
        .populate('lastModifiedBy', 'name email');

      if (!payment) {
        throw new Error('Payment not found');
      }

      return {
        success: true,
        data: payment
      };

    } catch (error) {
      logger.error('Error fetching payment:', error);
      throw new Error('Failed to fetch payment: ' + error.message);
    }
  }

  // Update payment
  async updatePayment(paymentId, companyId, updateData, userId) {
    try {
      const payment = await Payment.findOne({ _id: paymentId, companyId });
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status === 'cancelled') {
        throw new Error('Cannot update cancelled payment');
      }

      // Validate amount if being updated
      if (updateData.amount !== undefined) {
        if (isNaN(updateData.amount) || updateData.amount <= 0) {
          throw new Error('Amount must be a positive number');
        }
      }

      // Verify party if being updated
      if (updateData.partyId && updateData.partyId !== payment.partyId) {
        let party = await Customer.findById(updateData.partyId) ||
                   await Vendor.findById(updateData.partyId) ||
                   await Party.findById(updateData.partyId);

        if (!party) {
          throw new Error('Party not found');
        }
        updateData.partyName = party.name;
      }

      // Update timestamps
      updateData.lastModifiedBy = userId;
      updateData.updatedAt = new Date();

      // Update payment
      const updatedPayment = await Payment.findByIdAndUpdate(
        paymentId,
        updateData,
        { new: true, runValidators: true }
      ).populate([
        { path: 'party', select: 'name email phone address type' },
        { path: 'bankAccountId', select: 'bankName accountHolderName accountNumber' },
        { path: 'createdBy', select: 'name email' },
        { path: 'lastModifiedBy', select: 'name email' }
      ]);

      logger.info(`Payment updated: ${updatedPayment.paymentNumber} by user ${userId}`);

      return {
        success: true,
        data: updatedPayment,
        message: 'Payment updated successfully'
      };

    } catch (error) {
      logger.error('Error updating payment:', error);
      throw error;
    }
  }

  // Delete payment (soft delete)
  async deletePayment(paymentId, companyId, userId) {
    try {
      const payment = await Payment.findOne({ _id: paymentId, companyId });
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      // Soft delete
      payment.status = 'cancelled';
      payment.cancelledAt = new Date();
      payment.cancelledBy = userId;
      payment.cancellationReason = 'Deleted by user';
      payment.lastModifiedBy = userId;

      await payment.save();

      logger.info(`Payment deleted: ${payment.paymentNumber} by user ${userId}`);

      return {
        success: true,
        message: 'Payment deleted successfully'
      };

    } catch (error) {
      logger.error('Error deleting payment:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();