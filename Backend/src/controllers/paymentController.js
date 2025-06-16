const mongoose = require('mongoose');

// Helper function to safely require models
const getModel = (modelName) => {
    try {
        return require(`../models/${modelName}`);
    } catch (error) {
        console.warn(`⚠️ ${modelName} model not found:`, error.message);
        return null;
    }
};

// ================================
// 📋 GET PENDING INVOICES FOR PAYMENT
// ================================



const getPendingInvoicesForPayment = async (req, res) => {
    try {
        const { partyId } = req.params;
        const { companyId } = req.query;

        console.log('🔍 Fetching pending invoices for payment:', {
            partyId,
            companyId,
            url: req.originalUrl,
            method: req.method
        });

        // Validation
        if (!partyId) {
            return res.status(400).json({
                success: false,
                message: 'Party ID is required',
                received: { partyId, companyId }
            });
        }

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID is required as query parameter',
                example: '/api/payments/pending-invoices/PARTY_ID?companyId=COMPANY_ID',
                received: { partyId, companyId }
            });
        }

        // Validate MongoDB ObjectIds
        if (!mongoose.Types.ObjectId.isValid(partyId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Party ID format',
                partyId: partyId
            });
        }

        if (!mongoose.Types.ObjectId.isValid(companyId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Company ID format',
                companyId: companyId
            });
        }

        // Get party information
        const Party = getModel('Party');
        let party = null;

        if (Party) {
            try {
                party = await Party.findById(partyId);
                if (!party) {
                    return res.status(404).json({
                        success: false,
                        message: 'Party not found',
                        partyId: partyId
                    });
                }
                console.log('✅ Found party:', party.name);
            } catch (partyError) {
                console.error('❌ Error finding party:', partyError);
                return res.status(404).json({
                    success: false,
                    message: 'Party not found or invalid ID',
                    partyId: partyId,
                    error: partyError.message
                });
            }
        } else {
            return res.status(500).json({
                success: false,
                message: 'Party model not available'
            });
        }

        // ✅ SEARCH ONLY IN SALE COLLECTION (ACTUAL INVOICES)
        let allInvoices = [];

        const Sale = getModel('Sale');
        if (!Sale) {
            return res.status(500).json({
                success: false,
                message: 'Sale model not available - Cannot find invoices'
            });
        }

        try {
            const saleQueryConditions = {
                $and: [
                    { companyId: new mongoose.Types.ObjectId(companyId) },
                    {
                        $or: [
                            { customer: new mongoose.Types.ObjectId(partyId) },
                            { customerId: new mongoose.Types.ObjectId(partyId) },
                            { customerId: partyId },
                            { customerName: party.name }
                        ]
                    },
                    {
                        // Exclude cancelled and draft invoices
                        status: {
                            $nin: ['cancelled', 'draft', 'deleted'],
                            $ne: null
                        }
                    },
                    {
                        // Only get invoices with amounts > 0
                        $or: [
                            { 'totals.finalTotal': { $gt: 0 } },
                            { totalAmount: { $gt: 0 } },
                            { 'totals.grandTotal': { $gt: 0 } },
                            { amount: { $gt: 0 } }
                        ]
                    }
                ]
            };

            console.log('🔍 Searching Sale collection for invoices...');
            console.log('🔍 Sale query conditions:', JSON.stringify(saleQueryConditions, null, 2));

            const sales = await Sale.find(saleQueryConditions)
                .sort({ invoiceDate: -1, createdAt: -1 })
                .limit(100)
                .lean();

            console.log('📋 Found sales invoices:', sales.length);

            // Log sample invoice for debugging
            if (sales.length > 0) {
                console.log('🔍 Sample invoice structure:', {
                    _id: sales[0]._id,
                    invoiceNumber: sales[0].invoiceNumber,
                    invoiceDate: sales[0].invoiceDate,
                    customer: sales[0].customer,
                    customerId: sales[0].customerId,
                    customerName: sales[0].customerName,
                    totals: sales[0].totals,
                    payment: sales[0].payment,
                    status: sales[0].status
                });
            }

            allInvoices = sales;

        } catch (queryError) {
            console.error('❌ Error querying sales invoices:', queryError);
            return res.status(500).json({
                success: false,
                message: 'Failed to query sales invoices',
                error: queryError.message
            });
        }

        console.log('📊 Total invoices found:', allInvoices.length);

        // Transform and filter invoices with due amounts
        const invoicesWithDue = allInvoices.map(invoice => {
            // Handle different possible total amount field names
            const totalAmount = parseFloat(
                invoice.totals?.finalTotal ||
                invoice.totals?.grandTotal ||
                invoice.totalAmount ||
                invoice.amount ||
                0
            );

            // Handle different possible paid amount field names
            const paidAmount = parseFloat(
                invoice.payment?.paidAmount ||
                invoice.payment?.totalPaid ||
                invoice.payment?.amountPaid ||
                invoice.paidAmount ||
                0
            );

            const dueAmount = Math.max(0, totalAmount - paidAmount);

            // Enhanced invoice number generation
            const invoiceNumber = invoice.invoiceNumber ||
                invoice.saleNumber ||
                invoice.billNumber ||
                `INV-${invoice._id}`;

            return {
                _id: invoice._id,
                id: invoice._id,
                orderNumber: invoiceNumber, // For backward compatibility
                invoiceNumber: invoiceNumber,
                saleNumber: invoiceNumber,
                invoiceDate: invoice.invoiceDate || invoice.createdAt,
                orderDate: invoice.invoiceDate || invoice.createdAt, // For backward compatibility  
                totalAmount: totalAmount,
                paidAmount: paidAmount,
                dueAmount: dueAmount,
                paymentStatus: dueAmount > 0 ?
                    (paidAmount > 0 ? 'partial' : 'pending') : 'paid',
                status: invoice.status,
                orderType: 'sale', // Always sale for invoices
                documentType: 'invoice',
                customerName: party.name,
                customerId: party._id,
                items: invoice.items || [],
                createdAt: invoice.createdAt,
                updatedAt: invoice.updatedAt,
                currency: invoice.currency || 'INR',
                taxAmount: invoice.totals?.totalTax || invoice.totals?.tax || 0,
                discountAmount: invoice.totals?.totalDiscount || invoice.totals?.discount || 0,
                // Add debugging fields
                debug: {
                    collection: 'Sale',
                    originalTotalAmount: invoice.totalAmount,
                    originalPaidAmount: invoice.paidAmount,
                    totalsObject: invoice.totals,
                    paymentObject: invoice.payment
                }
            };
        }).filter(invoice => {
            const hasValidAmount = invoice.totalAmount > 0;
            const hasDueAmount = invoice.dueAmount > 0;

            console.log(`📊 Invoice ${invoice.invoiceNumber}: Total=${invoice.totalAmount}, Paid=${invoice.paidAmount}, Due=${invoice.dueAmount}, Valid=${hasValidAmount}, HasDue=${hasDueAmount}`);

            return hasValidAmount && hasDueAmount;
        });

        const totalDueAmount = invoicesWithDue.reduce((sum, invoice) => sum + invoice.dueAmount, 0);

        console.log('✅ Final processed invoices with due amounts:', {
            totalInvoices: allInvoices.length,
            invoicesWithDue: invoicesWithDue.length,
            totalDue: totalDueAmount
        });

        // Return response
        const response = {
            success: true,
            data: {
                invoices: invoicesWithDue, // Main field for frontend
                salesOrders: invoicesWithDue, // Keep for backward compatibility
                orders: invoicesWithDue, // Keep for backward compatibility
                totalInvoices: invoicesWithDue.length,
                totalDueAmount: totalDueAmount,
                party: {
                    id: party._id,
                    _id: party._id,
                    name: party.name,
                    currentBalance: party.currentBalance || 0,
                    partyType: party.partyType || 'customer'
                },
                // Debug information
                debug: {
                    totalInvoicesFound: allInvoices.length,
                    searchedCollections: ['Sale'],
                    partyInfo: {
                        id: party._id,
                        name: party.name
                    },
                    modelAvailability: {
                        Party: !!Party,
                        Sale: !!Sale
                    }
                }
            },
            message: invoicesWithDue.length > 0 ?
                'Pending invoices fetched successfully' :
                'No pending invoices found with due amounts',
            meta: {
                totalInvoices: invoicesWithDue.length,
                totalDueAmount: totalDueAmount,
                partyId: partyId,
                companyId: companyId,
                timestamp: new Date().toISOString()
            }
        };

        res.status(200).json(response);

    } catch (error) {
        console.error('❌ Critical error in getPendingInvoicesForPayment:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending invoices',
            error: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                stack: error.stack?.split('\n').slice(0, 5),
                params: req.params,
                query: req.query
            } : 'Internal server error',
            debug: {
                partyId: req.params.partyId,
                companyId: req.query.companyId,
                timestamp: new Date().toISOString(),
                url: req.originalUrl,
                method: req.method,
                errorType: error.name,
                errorMessage: error.message
            }
        });
    }
};

// ================================
// 💰 CREATE PAYMENT IN
// ================================
const createPaymentIn = async (req, res) => {
    try {
        const {
            partyId,
            amount,
            paymentMethod,
            paymentDate,
            paymentType,
            saleOrderId,
            reference,
            notes,
            bankAccountId,
            employeeName,
            companyId
        } = req.body;

        console.log('💰 Creating Payment In:', req.body);

        // Validate required fields
        if (!partyId || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Party ID and amount are required'
            });
        }

        // Get party information
        const Party = getModel('Party');
        if (!Party) {
            return res.status(500).json({
                success: false,
                message: 'Party model not available'
            });
        }

        const party = await Party.findById(partyId);
        if (!party) {
            return res.status(404).json({
                success: false,
                message: 'Party not found'
            });
        }

        // Get Payment model
        const Payment = getModel('Payment');
        if (!Payment) {
            return res.status(500).json({
                success: false,
                message: 'Payment model not available'
            });
        }

        // Generate payment number
        const paymentCount = await Payment.countDocuments();
        const paymentNumber = `PAY-IN-${String(paymentCount + 1).padStart(6, '0')}`;

        // Create payment record
        const payment = new Payment({
            paymentNumber,
            partyId,
            partyName: party.name,
            amount: parseFloat(amount),
            paymentMethod: paymentMethod || 'cash',
            paymentDate: paymentDate || new Date(),
            paymentType: 'payment_in',
            status: 'completed',
            reference: reference || '',
            notes: notes || '',
            bankAccountId: bankAccountId || null,
            employeeName: employeeName || '',
            createdBy: req.user?.id,
            companyId: companyId || req.user?.companyId
        });

        await payment.save();

        // Update party balance
        party.currentBalance = (party.currentBalance || 0) - parseFloat(amount);
        await party.save();

        console.log('✅ Payment In created successfully:', payment.paymentNumber);

        res.status(201).json({
            success: true,
            message: 'Payment In recorded successfully',
            data: {
                payment: {
                    _id: payment._id,
                    paymentNumber: payment.paymentNumber,
                    partyId: payment.partyId,
                    partyName: payment.partyName,
                    amount: payment.amount,
                    paymentMethod: payment.paymentMethod,
                    paymentDate: payment.paymentDate,
                    paymentType: payment.paymentType,
                    status: payment.status,
                    reference: payment.reference,
                    notes: payment.notes,
                    createdAt: payment.createdAt
                },
                partyBalance: party.currentBalance
            }
        });

    } catch (error) {
        console.error('❌ Error creating Payment In:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create Payment In',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// ================================
// 💸 CREATE PAYMENT OUT
// ================================
const createPaymentOut = async (req, res) => {
    try {
        const {
            partyId,
            amount,
            paymentMethod,
            paymentDate,
            paymentType,
            purchaseOrderId,
            reference,
            notes,
            bankAccountId,
            employeeName,
            companyId
        } = req.body;

        console.log('💸 Creating Payment Out:', req.body);

        // Validate required fields
        if (!partyId || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Party ID and amount are required'
            });
        }

        // Get party information
        const Party = getModel('Party');
        if (!Party) {
            return res.status(500).json({
                success: false,
                message: 'Party model not available'
            });
        }

        const party = await Party.findById(partyId);
        if (!party) {
            return res.status(404).json({
                success: false,
                message: 'Party not found'
            });
        }

        // Get Payment model
        const Payment = getModel('Payment');
        if (!Payment) {
            return res.status(500).json({
                success: false,
                message: 'Payment model not available'
            });
        }

        // Generate payment number
        const paymentCount = await Payment.countDocuments();
        const paymentNumber = `PAY-OUT-${String(paymentCount + 1).padStart(6, '0')}`;

        // Create payment record
        const payment = new Payment({
            paymentNumber,
            partyId,
            partyName: party.name,
            amount: parseFloat(amount),
            paymentMethod: paymentMethod || 'cash',
            paymentDate: paymentDate || new Date(),
            paymentType: 'payment_out',
            status: 'completed',
            reference: reference || '',
            notes: notes || '',
            bankAccountId: bankAccountId || null,
            employeeName: employeeName || '',
            createdBy: req.user?.id,
            companyId: companyId || req.user?.companyId
        });

        await payment.save();

        // Update party balance
        party.currentBalance = (party.currentBalance || 0) + parseFloat(amount);
        await party.save();

        console.log('✅ Payment Out created successfully:', payment.paymentNumber);

        res.status(201).json({
            success: true,
            message: 'Payment Out recorded successfully',
            data: {
                payment: {
                    _id: payment._id,
                    paymentNumber: payment.paymentNumber,
                    partyId: payment.partyId,
                    partyName: payment.partyName,
                    amount: payment.amount,
                    paymentMethod: payment.paymentMethod,
                    paymentDate: payment.paymentDate,
                    paymentType: payment.paymentType,
                    status: payment.status,
                    reference: payment.reference,
                    notes: payment.notes,
                    createdAt: payment.createdAt
                },
                partyBalance: party.currentBalance
            }
        });

    } catch (error) {
        console.error('❌ Error creating Payment Out:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create Payment Out',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// ================================
// 📊 GET PAYMENTS
// ================================
const getPayments = async (req, res) => {
    try {
        const {
            companyId,
            partyId,
            paymentMethod,
            paymentType,
            status,
            startDate,
            endDate,
            page = 1,
            limit = 20
        } = req.query;

        const Payment = getModel('Payment');
        if (!Payment) {
            return res.status(500).json({
                success: false,
                message: 'Payment model not available'
            });
        }

        // Build query conditions
        const queryConditions = {};

        if (companyId) {
            queryConditions.companyId = new mongoose.Types.ObjectId(companyId);
        }

        if (partyId) {
            queryConditions.partyId = new mongoose.Types.ObjectId(partyId);
        }

        if (paymentMethod) {
            queryConditions.paymentMethod = paymentMethod;
        }

        if (paymentType) {
            queryConditions.paymentType = paymentType;
        }

        if (status) {
            queryConditions.status = status;
        }

        if (startDate || endDate) {
            queryConditions.paymentDate = {};
            if (startDate) queryConditions.paymentDate.$gte = new Date(startDate);
            if (endDate) queryConditions.paymentDate.$lte = new Date(endDate);
        }

        // Execute query with pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [payments, totalCount] = await Promise.all([
            Payment.find(queryConditions)
                .sort({ paymentDate: -1, createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Payment.countDocuments(queryConditions)
        ]);

        res.status(200).json({
            success: true,
            data: {
                payments,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount / parseInt(limit)),
                    totalRecords: totalCount,
                    limit: parseInt(limit),
                    hasNextPage: skip + payments.length < totalCount,
                    hasPrevPage: parseInt(page) > 1
                }
            },
            message: 'Payments fetched successfully'
        });

    } catch (error) {
        console.error('❌ Error fetching payments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payments',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// ================================
// 🔍 GET PAYMENT BY ID
// ================================
const getPaymentById = async (req, res) => {
    try {
        const { paymentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(paymentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Payment ID format'
            });
        }

        const Payment = getModel('Payment');
        if (!Payment) {
            return res.status(500).json({
                success: false,
                message: 'Payment model not available'
            });
        }

        const payment = await Payment.findById(paymentId).lean();

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        res.status(200).json({
            success: true,
            data: { payment },
            message: 'Payment fetched successfully'
        });

    } catch (error) {
        console.error('❌ Error fetching payment by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// ================================
// 📊 GET PARTY PAYMENT SUMMARY
// ================================
const getPartyPaymentSummary = async (req, res) => {
    try {
        const { partyId } = req.params;
        const { companyId } = req.query;

        if (!mongoose.Types.ObjectId.isValid(partyId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Party ID format'
            });
        }

        const Payment = getModel('Payment');
        if (!Payment) {
            return res.status(500).json({
                success: false,
                message: 'Payment model not available'
            });
        }

        // Build query conditions
        const queryConditions = { partyId: new mongoose.Types.ObjectId(partyId) };
        if (companyId) {
            queryConditions.companyId = new mongoose.Types.ObjectId(companyId);
        }

        // Aggregate payment summary
        const summary = await Payment.aggregate([
            { $match: queryConditions },
            {
                $group: {
                    _id: '$paymentType',
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const paymentsIn = summary.find(s => s._id === 'payment_in') || { totalAmount: 0, count: 0 };
        const paymentsOut = summary.find(s => s._id === 'payment_out') || { totalAmount: 0, count: 0 };

        res.status(200).json({
            success: true,
            data: {
                totalPaymentsIn: paymentsIn.totalAmount,
                totalPaymentsOut: paymentsOut.totalAmount,
                countPaymentsIn: paymentsIn.count,
                countPaymentsOut: paymentsOut.count,
                netBalance: paymentsIn.totalAmount - paymentsOut.totalAmount
            },
            message: 'Party payment summary fetched successfully'
        });

    } catch (error) {
        console.error('❌ Error fetching party payment summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch party payment summary',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// ================================
// ❌ CANCEL PAYMENT
// ================================
const cancelPayment = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { reason } = req.body;

        if (!mongoose.Types.ObjectId.isValid(paymentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Payment ID format'
            });
        }

        const Payment = getModel('Payment');
        if (!Payment) {
            return res.status(500).json({
                success: false,
                message: 'Payment model not available'
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

        // Update payment status
        payment.status = 'cancelled';
        payment.cancelReason = reason || 'No reason provided';
        payment.cancelledAt = new Date();
        payment.cancelledBy = req.user?.id;

        await payment.save();

        // Reverse party balance changes
        const Party = getModel('Party');
        if (Party) {
            const party = await Party.findById(payment.partyId);
            if (party) {
                if (payment.paymentType === 'payment_in') {
                    party.currentBalance = (party.currentBalance || 0) + payment.amount;
                } else if (payment.paymentType === 'payment_out') {
                    party.currentBalance = (party.currentBalance || 0) - payment.amount;
                }
                await party.save();
            }
        }

        console.log('✅ Payment cancelled successfully:', payment.paymentNumber);

        res.status(200).json({
            success: true,
            message: 'Payment cancelled successfully',
            data: {
                payment: {
                    _id: payment._id,
                    paymentNumber: payment.paymentNumber,
                    status: payment.status,
                    cancelReason: payment.cancelReason,
                    cancelledAt: payment.cancelledAt
                }
            }
        });

    } catch (error) {
        console.error('❌ Error cancelling payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel payment',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// ================================
// 📤 EXPORT ALL FUNCTIONS
// ================================
module.exports = {
    getPendingInvoicesForPayment,
    createPaymentIn,
    createPaymentOut,
    getPayments,
    getPaymentById,
    getPartyPaymentSummary,
    cancelPayment
};