const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Party = require('../models/Party');
const { validationResult } = require('express-validator');

console.log('🔧 Production Payment Controller loading...');

// Utility function to generate secure payment number
const generatePaymentNumber = async (type, companyId) => {
    try {
        // Use company-specific counting + timestamp for uniqueness
        const today = new Date();
        const dateStr = today.getFullYear().toString().slice(-2) + 
                       (today.getMonth() + 1).toString().padStart(2, '0') + 
                       today.getDate().toString().padStart(2, '0');
        
        const count = await Payment.countDocuments({
            company: companyId,
            createdAt: {
                $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
            }
        });
        
        const prefix = type === 'payment_in' ? 'PIN' : 'POUT';
        const sequence = String(count + 1).padStart(4, '0');
        const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        
        return `${prefix}-${dateStr}-${sequence}-${random}`;
    } catch (error) {
        console.error('Error generating payment number:', error);
        const prefix = type === 'payment_in' ? 'PIN' : 'POUT';
        const timestamp = Date.now().toString();
        return `${prefix}-${timestamp}`;
    }
};

// Create Payment In (Customer pays us) - FIXED
const createPaymentIn = async (req, res) => {
    try {
        const {
            partyId,
            amount,
            paymentMethod = 'cash',
            paymentDate,
            paymentDetails = {},
            reference = '',
            notes = ''
        } = req.body;

        console.log('💰 Creating Payment In:', { partyId, amount, paymentMethod });

        // Find party
        const party = await Party.findById(partyId);
        if (!party) {
            return res.status(404).json({
                success: false,
                message: 'Party not found'
            });
        }

        console.log('✅ Party found:', party.name, 'Current Balance:', party.currentBalance);

        // Calculate balance with proper decimal handling
        const balanceBefore = parseFloat(party.currentBalance || 0);
        const paymentAmount = parseFloat(amount);
        
        // 🔧 FIXED: Payment In should INCREASE the party balance (we received money)
        const balanceAfter = Math.round((balanceBefore + paymentAmount) * 100) / 100;

        console.log('💰 Payment In Balance Calculation:', {
            balanceBefore,
            paymentAmount,
            balanceAfter,
            change: `+${paymentAmount}`
        });

        // Generate unique payment number
        const paymentNumber = await generatePaymentNumber('payment_in', req.user?.companyId);

        // Create payment
        const payment = new Payment({
            paymentNumber,
            type: 'payment_in',
            party: partyId,
            amount: paymentAmount,
            paymentMethod,
            paymentDate: new Date(paymentDate || Date.now()),
            paymentDetails,
            reference: reference.trim(),
            notes: notes.trim(),
            partyBalanceBefore: balanceBefore,
            partyBalanceAfter: balanceAfter,
            company: req.user?.companyId,
            createdBy: req.user?.id,
            status: 'completed'
        });

        await payment.save();
        console.log('✅ Payment In saved:', payment.paymentNumber);

        // Update party balance
        party.currentBalance = balanceAfter;
        party.lastUpdated = new Date();
        party.lastUpdatedBy = req.user?.id;
        await party.save();

        console.log('✅ Party balance updated:', balanceAfter, `(+${paymentAmount})`);

        // Populate party data for response
        await payment.populate('party', 'name phoneNumber email partyType currentBalance');

        res.status(201).json({
            success: true,
            message: 'Payment received successfully',
            data: {
                payment: {
                    id: payment._id,
                    _id: payment._id,
                    paymentNumber: payment.paymentNumber,
                    type: payment.type,
                    amount: payment.amount,
                    paymentMethod: payment.paymentMethod,
                    paymentDate: payment.paymentDate,
                    reference: payment.reference,
                    notes: payment.notes,
                    status: payment.status,
                    partyBalanceBefore: payment.partyBalanceBefore,
                    partyBalanceAfter: payment.partyBalanceAfter,
                    createdAt: payment.createdAt,
                    updatedAt: payment.updatedAt
                },
                party: {
                    id: party._id,
                    name: party.name,
                    currentBalance: balanceAfter,
                    balanceChange: +paymentAmount // Positive change
                }
            }
        });

    } catch (error) {
        console.error('❌ Error creating Payment In:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Duplicate payment number - please try again'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Payment processing failed. Please try again.',
            errorId: new Date().getTime()
        });
    }
};

// Create Payment Out (We pay supplier) - FIXED
const createPaymentOut = async (req, res) => {
    try {
        const {
            partyId,
            amount,
            paymentMethod = 'cash',
            paymentDate,
            paymentDetails = {},
            reference = '',
            notes = ''
        } = req.body;

        console.log('💸 Creating Payment Out:', { partyId, amount, paymentMethod });

        // Find party
        const party = await Party.findById(partyId);
        if (!party) {
            return res.status(404).json({
                success: false,
                message: 'Party not found'
            });
        }

        console.log('✅ Party found:', party.name, 'Current Balance:', party.currentBalance);

        // Calculate balance with proper decimal handling
        const balanceBefore = parseFloat(party.currentBalance || 0);
        const paymentAmount = parseFloat(amount);
        
        // 🔧 FIXED: Payment Out should DECREASE the party balance (we paid money)
        const balanceAfter = Math.round((balanceBefore - paymentAmount) * 100) / 100;

        console.log('💸 Payment Out Balance Calculation:', {
            balanceBefore,
            paymentAmount,
            balanceAfter,
            change: `-${paymentAmount}`
        });

        // Generate unique payment number
        const paymentNumber = await generatePaymentNumber('payment_out', req.user?.companyId);

        // Create payment
        const payment = new Payment({
            paymentNumber,
            type: 'payment_out',
            party: partyId,
            amount: paymentAmount,
            paymentMethod,
            paymentDate: new Date(paymentDate || Date.now()),
            paymentDetails,
            reference: reference.trim(),
            notes: notes.trim(),
            partyBalanceBefore: balanceBefore,
            partyBalanceAfter: balanceAfter,
            company: req.user?.companyId,
            createdBy: req.user?.id,
            status: 'completed'
        });

        await payment.save();
        console.log('✅ Payment Out saved:', payment.paymentNumber);

        // Update party balance
        party.currentBalance = balanceAfter;
        party.lastUpdated = new Date();
        party.lastUpdatedBy = req.user?.id;
        await party.save();

        console.log('✅ Party balance updated:', balanceAfter, `(-${paymentAmount})`);

        // Populate party data for response
        await payment.populate('party', 'name phoneNumber email partyType currentBalance');

        res.status(201).json({
            success: true,
            message: 'Payment made successfully',
            data: {
                payment: {
                    id: payment._id,
                    _id: payment._id,
                    paymentNumber: payment.paymentNumber,
                    type: payment.type,
                    amount: payment.amount,
                    paymentMethod: payment.paymentMethod,
                    paymentDate: payment.paymentDate,
                    reference: payment.reference,
                    notes: payment.notes,
                    status: payment.status,
                    partyBalanceBefore: payment.partyBalanceBefore,
                    partyBalanceAfter: payment.partyBalanceAfter,
                    createdAt: payment.createdAt,
                    updatedAt: payment.updatedAt
                },
                party: {
                    id: party._id,
                    name: party.name,
                    currentBalance: balanceAfter,
                    balanceChange: -paymentAmount // Negative change
                }
            }
        });

    } catch (error) {
        console.error('❌ Error creating Payment Out:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Duplicate payment number - please try again'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Payment processing failed. Please try again.',
            errorId: new Date().getTime()
        });
    }
};

// Also fix the cancel payment logic
const cancelPayment = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { reason } = req.body;

        console.log('❌ Cancelling payment:', paymentId);

        if (!mongoose.Types.ObjectId.isValid(paymentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment ID format'
            });
        }

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        if (payment.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Payment is already cancelled'
            });
        }

        // 🔧 FIXED: Reverse the balance update correctly
        const party = await Party.findById(payment.party);
        if (party) {
            if (payment.type === 'payment_in') {
                // Reverse payment in: subtract the amount (we're returning the money)
                party.currentBalance = (party.currentBalance || 0) - payment.amount;
            } else if (payment.type === 'payment_out') {
                // Reverse payment out: add the amount (we're getting the money back)
                party.currentBalance = (party.currentBalance || 0) + payment.amount;
            }
            await party.save();
        }

        // Update payment status
        payment.status = 'cancelled';
        payment.notes = payment.notes ? 
            `${payment.notes}\n\nCancelled: ${reason || 'No reason provided'}` : 
            `Cancelled: ${reason || 'No reason provided'}`;
        payment.lastModifiedBy = req.user?.id || 'system';
        
        await payment.save();

        console.log('✅ Payment cancelled successfully:', paymentId);

        res.json({
            success: true,
            message: 'Payment cancelled successfully',
            data: { 
                payment,
                updatedPartyBalance: party?.currentBalance
            }
        });

    } catch (error) {
        console.error('❌ Error cancelling payment:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling payment',
            error: error.message
        });
    }
};

// Get payments with filtering - ENHANCED SORTING
const getPayments = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            partyId,
            type,
            status,
            startDate,
            endDate,
            search,
            sortBy = 'paymentDate', // Default sort by payment date
            sortOrder = 'desc'      // Default recent first
        } = req.query;

        console.log('📋 Fetching payments with filters:', req.query);

        // Build filter object
        const filter = {};

        if (partyId && mongoose.Types.ObjectId.isValid(partyId)) {
            filter.party = new mongoose.Types.ObjectId(partyId);
        }

        if (type) {
            filter.type = type;
        }

        if (status) {
            filter.status = status;
        }

        // Date range filter
        if (startDate || endDate) {
            filter.paymentDate = {};
            if (startDate) {
                filter.paymentDate.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.paymentDate.$lte = new Date(endDate);
            }
        }

        // Search filter for reference, notes, payment number
        if (search && search.trim()) {
            filter.$or = [
                { reference: { $regex: search, $options: 'i' } },
                { notes: { $regex: search, $options: 'i' } },
                { paymentNumber: { $regex: search, $options: 'i' } }
            ];
        }

        // 🔧 ENHANCED: Build sort object with multiple fallbacks
        const sort = {};
        
        // Primary sort
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Secondary sort by creation time for consistent ordering
        if (sortBy !== 'createdAt') {
            sort.createdAt = -1; // Recent created first as fallback
        }
        
        // Tertiary sort by _id for absolute consistency
        sort._id = -1;

        console.log('🔍 Sort configuration:', sort);

        // Execute query with pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const payments = await Payment.find(filter)
            .populate('party', 'name phoneNumber email partyType currentBalance')
            .sort(sort) // Apply enhanced sorting
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Get total count for pagination
        const total = await Payment.countDocuments(filter);
        const totalPages = Math.ceil(total / parseInt(limit));

        console.log(`✅ Found ${payments.length} payments out of ${total} total (sorted by ${sortBy} ${sortOrder})`);

        res.json({
            success: true,
            data: {
                payments: payments.map(payment => ({
                    _id: payment._id,
                    id: payment._id,
                    paymentNumber: payment.paymentNumber,
                    type: payment.type,
                    amount: payment.amount,
                    paymentMethod: payment.paymentMethod,
                    paymentDate: payment.paymentDate,
                    reference: payment.reference,
                    notes: payment.notes,
                    status: payment.status,
                    partyBalanceBefore: payment.partyBalanceBefore,
                    partyBalanceAfter: payment.partyBalanceAfter,
                    createdAt: payment.createdAt,
                    updatedAt: payment.updatedAt,
                    party: payment.party
                })),
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: totalPages,
                    totalRecords: total,
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('❌ Error fetching payments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payments',
            error: error.message
        });
    }
};

// Get payment by ID
const getPaymentById = async (req, res) => {
    try {
        const { paymentId } = req.params;

        console.log('🔍 Fetching payment by ID:', paymentId);

        if (!mongoose.Types.ObjectId.isValid(paymentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment ID format'
            });
        }

        const payment = await Payment.findById(paymentId)
            .populate('party', 'name phoneNumber email partyType companyName currentBalance')
            .lean();

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        console.log('✅ Payment found:', payment.paymentNumber);

        res.json({
            success: true,
            data: { payment }
        });

    } catch (error) {
        console.error('❌ Error fetching payment:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payment',
            error: error.message
        });
    }
};

// Get party payment summary
const getPartyPaymentSummary = async (req, res) => {
    try {
        const { partyId } = req.params;

        console.log('📊 Fetching payment summary for party:', partyId);

        if (!mongoose.Types.ObjectId.isValid(partyId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid party ID format'
            });
        }

        // Get party details
        const party = await Party.findById(partyId).lean();
        if (!party) {
            return res.status(404).json({
                success: false,
                message: 'Party not found'
            });
        }

        // Aggregate payment summary
        const summary = await Payment.aggregate([
            {
                $match: { party: new mongoose.Types.ObjectId(partyId) }
            },
            {
                $group: {
                    _id: '$type',
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 },
                    lastPaymentDate: { $max: '$paymentDate' }
                }
            }
        ]);

        // Format summary
        const payInSummary = summary.find(s => s._id === 'payment_in') || { totalAmount: 0, count: 0 };
        const payOutSummary = summary.find(s => s._id === 'payment_out') || { totalAmount: 0, count: 0 };

        const result = {
            party: {
                id: party._id,
                name: party.name,
                partyType: party.partyType,
                currentBalance: party.currentBalance || 0
            },
            paymentSummary: {
                payIn: {
                    totalAmount: payInSummary.totalAmount,
                    count: payInSummary.count,
                    lastPaymentDate: payInSummary.lastPaymentDate
                },
                payOut: {
                    totalAmount: payOutSummary.totalAmount,
                    count: payOutSummary.count,
                    lastPaymentDate: payOutSummary.lastPaymentDate
                },
                netAmount: payInSummary.totalAmount - payOutSummary.totalAmount,
                totalTransactions: payInSummary.count + payOutSummary.count
            }
        };

        console.log('✅ Payment summary generated for party:', partyId);

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('❌ Error fetching party payment summary:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payment summary',
            error: error.message
        });
    }
};


// Test endpoint
const testPayments = async (req, res) => {
    try {
        console.log('🔧 Payment API test endpoint called');
        
        const stats = await Payment.aggregate([
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]);

        const totalPayments = await Payment.countDocuments();
        const totalParties = await Party.countDocuments();

        res.json({
            success: true,
            message: 'Payment API is working! 🚀',
            timestamp: new Date().toISOString(),
            stats: {
                totalPayments,
                totalParties,
                paymentsByType: stats.reduce((acc, stat) => {
                    acc[stat._id] = {
                        count: stat.count,
                        totalAmount: stat.totalAmount
                    };
                    return acc;
                }, {})
            },
            endpoints: [
                'POST /api/payments/pay-in',
                'POST /api/payments/pay-out', 
                'GET /api/payments',
                'GET /api/payments/:paymentId',
                'GET /api/payments/party/:partyId/summary',
                'PATCH /api/payments/:paymentId/cancel'
            ]
        });

    } catch (error) {
        console.error('❌ Error in test endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Payment API test failed',
            error: error.message
        });
    }
};

module.exports = {
    createPaymentIn,
    createPaymentOut,
    getPayments,
    getPaymentById,
    getPartyPaymentSummary,
    cancelPayment,
    testPayments
};

console.log('✅ Production Payment Controller loaded');