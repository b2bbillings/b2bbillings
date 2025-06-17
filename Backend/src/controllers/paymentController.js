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

// Backend/src/controllers/paymentController.js - Add this new function

// ================================
// 📋 GET PAYMENT ALLOCATION DETAILS
// ================================
const getPaymentAllocations = async (req, res) => {
    try {
        const { paymentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(paymentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Payment ID format'
            });
        }

        const Payment = getModel('Payment');
        const Sale = getModel('Sale');

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

        let allocationDetails = [];

        // Get detailed allocation information
        if (payment.invoiceAllocations && payment.invoiceAllocations.length > 0 && Sale) {
            const invoiceIds = payment.invoiceAllocations.map(alloc => alloc.invoiceId);

            const invoices = await Sale.find({
                _id: { $in: invoiceIds }
            }).lean();

            allocationDetails = payment.invoiceAllocations.map(allocation => {
                const invoice = invoices.find(inv => inv._id.toString() === allocation.invoiceId.toString());

                return {
                    ...allocation,
                    invoiceDetails: invoice ? {
                        invoiceNumber: invoice.invoiceNumber || invoice.saleNumber,
                        invoiceDate: invoice.invoiceDate || invoice.createdAt,
                        totalAmount: invoice.totals?.finalTotal || invoice.totalAmount || 0,
                        currentPaidAmount: invoice.payment?.paidAmount || 0,
                        currentPendingAmount: invoice.payment?.pendingAmount || 0,
                        paymentStatus: invoice.payment?.status || 'pending'
                    } : null
                };
            });
        }

        res.status(200).json({
            success: true,
            data: {
                payment: {
                    _id: payment._id,
                    paymentNumber: payment.paymentNumber,
                    amount: payment.amount,
                    paymentDate: payment.paymentDate,
                    partyName: payment.partyName,
                    paymentMethod: payment.paymentMethod,
                    status: payment.status,
                    notes: payment.notes
                },
                allocations: allocationDetails,
                totalAllocatedAmount: allocationDetails.reduce((sum, alloc) => sum + (alloc.allocatedAmount || 0), 0),
                remainingAmount: payment.amount - allocationDetails.reduce((sum, alloc) => sum + (alloc.allocatedAmount || 0), 0)
            },
            message: 'Payment allocation details retrieved successfully'
        });

    } catch (error) {
        console.error('❌ Error in getPaymentAllocations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment allocation details',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// ================================
// 📋 GET PENDING INVOICES FOR PAYMENT
// ================================
// Backend/src/controllers/paymentController.js - Fix getPendingInvoicesForPayment

const getPendingInvoicesForPayment = async (req, res) => {
    try {
        const { partyId } = req.params;
        const { companyId } = req.query;

        // Validation
        if (!partyId) {
            return res.status(400).json({
                success: false,
                message: 'Party ID is required'
            });
        }

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID is required as query parameter'
            });
        }

        // Validate MongoDB ObjectIds
        if (!mongoose.Types.ObjectId.isValid(partyId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Party ID format'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(companyId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Company ID format'
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

        // Get Sale model
        const Sale = getModel('Sale');
        if (!Sale) {
            return res.status(500).json({
                success: false,
                message: 'Sale model not available'
            });
        }

        // Query conditions for sales
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
                    status: {
                        $nin: ['cancelled', 'draft', 'deleted'],
                        $ne: null
                    }
                },
                {
                    $or: [
                        { 'totals.finalTotal': { $gt: 0 } },
                        { totalAmount: { $gt: 0 } },
                        { 'totals.grandTotal': { $gt: 0 } },
                        { amount: { $gt: 0 } }
                    ]
                }
            ]
        };

        // **ENHANCED: Get fresh data from database to reflect latest payments**
        const sales = await Sale.find(saleQueryConditions)
            .sort({ invoiceDate: -1, createdAt: -1 })
            .limit(100)
            .lean();

        console.log(`📋 Found ${sales.length} sales for party ${party.name}`);

        // Transform and filter invoices with due amounts
        const invoicesWithDue = sales.map(invoice => {
            const totalAmount = parseFloat(
                invoice.totals?.finalTotal ||
                invoice.totals?.grandTotal ||
                invoice.totalAmount ||
                invoice.amount ||
                0
            );

            // **FIXED: Get the most recent paid amount from the updated sale record**
            const paidAmount = parseFloat(
                invoice.payment?.paidAmount ||
                invoice.payment?.totalPaid ||
                invoice.payment?.amountPaid ||
                invoice.paidAmount ||
                0
            );

            const dueAmount = Math.max(0, totalAmount - paidAmount);

            const invoiceNumber = invoice.invoiceNumber ||
                invoice.saleNumber ||
                invoice.billNumber ||
                `INV-${invoice._id}`;

            console.log(`🧾 Invoice ${invoiceNumber}: Total=₹${totalAmount}, Paid=₹${paidAmount}, Due=₹${dueAmount}`);

            return {
                _id: invoice._id,
                id: invoice._id,
                orderNumber: invoiceNumber,
                invoiceNumber: invoiceNumber,
                saleNumber: invoiceNumber,
                invoiceDate: invoice.invoiceDate || invoice.createdAt,
                orderDate: invoice.invoiceDate || invoice.createdAt,
                totalAmount: totalAmount,
                paidAmount: paidAmount,
                dueAmount: dueAmount,
                paymentStatus: dueAmount > 0 ?
                    (paidAmount > 0 ? 'partial' : 'pending') : 'paid',
                status: invoice.status,
                orderType: 'sale',
                documentType: 'invoice',
                customerName: party.name,
                customerId: party._id,
                items: invoice.items || [],
                createdAt: invoice.createdAt,
                updatedAt: invoice.updatedAt,
                currency: invoice.currency || 'INR',
                taxAmount: invoice.totals?.totalTax || invoice.totals?.tax || 0,
                discountAmount: invoice.totals?.totalDiscount || invoice.totals?.discount || 0,
                // **NEW: Include payment history for debugging**
                paymentHistory: invoice.paymentHistory || [],
                lastPaymentDate: invoice.payment?.paymentDate || null
            };
        }).filter(invoice => {
            // **ENHANCED: Only return invoices with actual due amounts**
            const hasDueAmount = invoice.totalAmount > 0 && invoice.dueAmount > 0;
            console.log(`🔍 Invoice ${invoice.invoiceNumber}: Include=${hasDueAmount} (Due: ₹${invoice.dueAmount})`);
            return hasDueAmount;
        });

        const totalDueAmount = invoicesWithDue.reduce((sum, invoice) => sum + invoice.dueAmount, 0);

        console.log(`✅ Returning ${invoicesWithDue.length} invoices with total due: ₹${totalDueAmount}`);

        const response = {
            success: true,
            data: {
                invoices: invoicesWithDue,
                salesOrders: invoicesWithDue,
                orders: invoicesWithDue,
                totalInvoices: invoicesWithDue.length,
                totalDueAmount: totalDueAmount,
                party: {
                    id: party._id,
                    _id: party._id,
                    name: party.name,
                    currentBalance: party.currentBalance || 0,
                    partyType: party.partyType || 'customer'
                }
            },
            message: invoicesWithDue.length > 0 ?
                'Pending invoices fetched successfully' :
                'No pending invoices found with due amounts'
        };

        res.status(200).json(response);

    } catch (error) {
        console.error('❌ Error in getPendingInvoicesForPayment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending invoices',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// ================================
// 💰 CREATE PAYMENT IN
// ================================
// Backend/src/controllers/paymentController.js - Updated createPaymentIn function

// Backend/src/controllers/paymentController.js - Fix the createPaymentIn function

const createPaymentIn = async (req, res) => {
    try {
        const {
            party,
            type,
            companyId,
            amount,
            paymentMethod,
            paymentDate,
            paymentType,
            saleOrderId,
            invoiceId,
            invoiceAllocations,
            reference,
            notes,
            bankAccountId,
            bankAccount,
            employeeName,
            employeeId,
            createdBy,
            status,
            partyName,
            partyId
        } = req.body;

        const effectivePartyId = party || partyId;

        console.log('💰 Creating Payment In with data:', {
            effectivePartyId,
            amount,
            companyId,
            paymentMethod,
            saleOrderId,
            invoiceAllocations: invoiceAllocations?.length || 0
        });

        // Validate required fields
        if (!effectivePartyId || !amount || !type) {
            return res.status(400).json({
                success: false,
                message: 'Party ID, amount, and type are required'
            });
        }

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID is required'
            });
        }

        if (!['in', 'out'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Type must be either "in" or "out"'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(effectivePartyId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Party ID format'
            });
        }

        if (parseFloat(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Payment amount must be greater than 0'
            });
        }

        // Get required models
        const Payment = getModel('Payment');
        const Sale = getModel('Sale');
        const Party = getModel('Party');

        if (!Payment) {
            return res.status(500).json({
                success: false,
                message: 'Payment model not available'
            });
        }

        // Get party information
        const partyDoc = await Party?.findById(effectivePartyId);
        if (!partyDoc) {
            return res.status(404).json({
                success: false,
                message: 'Party not found'
            });
        }

        // Generate payment number
        const paymentCount = await Payment.countDocuments();
        const paymentNumber = type === 'in' ?
            `PAY-IN-${String(paymentCount + 1).padStart(6, '0')}` :
            `PAY-OUT-${String(paymentCount + 1).padStart(6, '0')}`;

        // Create payment record
        const paymentData = {
            paymentNumber,
            party: new mongoose.Types.ObjectId(effectivePartyId),
            type: type === 'in' ? 'payment_in' : 'payment_out',
            partyId: effectivePartyId,
            partyName: partyName || partyDoc.name,
            amount: parseFloat(amount),
            paymentMethod: paymentMethod || 'cash',
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            paymentType: type === 'in' ? 'payment_in' : 'payment_out',
            status: status || 'completed',
            reference: reference || '',
            notes: notes || '',
            employeeName: employeeName || '',
            employeeId: employeeId || '',
            companyId: new mongoose.Types.ObjectId(companyId)
        };

        // Add optional fields
        if (createdBy && mongoose.Types.ObjectId.isValid(createdBy)) {
            paymentData.createdBy = new mongoose.Types.ObjectId(createdBy);
        }

        if (bankAccountId || bankAccount) {
            paymentData.bankAccountId = bankAccountId || bankAccount;
        }

        if (saleOrderId) {
            paymentData.saleOrderId = new mongoose.Types.ObjectId(saleOrderId);
        }

        if (paymentType) {
            paymentData.subType = paymentType;
        }

        // Create and save payment
        const payment = new Payment(paymentData);
        await payment.save();

        console.log('✅ Payment record created:', payment.paymentNumber);

        // **ENHANCED: Handle specific invoice payment vs auto-allocation**
        let updatedInvoices = [];
        let remainingAmount = parseFloat(amount);
        let invoicesUpdated = 0;

        if (Sale && type === 'in') {
            try {
                // **CASE 1: Payment against specific invoice**
                if (saleOrderId && mongoose.Types.ObjectId.isValid(saleOrderId)) {
                    console.log('🎯 Processing payment against specific invoice:', saleOrderId);

                    const specificSale = await Sale.findById(saleOrderId);
                    if (specificSale) {
                        const totalAmount = parseFloat(
                            specificSale.totals?.finalTotal ||
                            specificSale.totals?.grandTotal ||
                            specificSale.totalAmount ||
                            specificSale.amount ||
                            0
                        );

                        const currentPaidAmount = parseFloat(
                            specificSale.payment?.paidAmount ||
                            specificSale.payment?.totalPaid ||
                            specificSale.payment?.amountPaid ||
                            specificSale.paidAmount ||
                            0
                        );

                        const pendingAmount = Math.max(0, totalAmount - currentPaidAmount);

                        if (pendingAmount > 0) {
                            const allocationAmount = Math.min(remainingAmount, pendingAmount);
                            const newPaidAmount = currentPaidAmount + allocationAmount;
                            const newPendingAmount = Math.max(0, totalAmount - newPaidAmount);

                            // Determine payment status
                            let paymentStatus = 'pending';
                            if (newPaidAmount >= totalAmount) {
                                paymentStatus = 'paid';
                            } else if (newPaidAmount > 0) {
                                paymentStatus = 'partial';
                            }

                            // **FIXED: Properly update the sale document**
                            const updateResult = await Sale.findByIdAndUpdate(
                                saleOrderId,
                                {
                                    $set: {
                                        'payment.paidAmount': newPaidAmount,
                                        'payment.pendingAmount': newPendingAmount,
                                        'payment.status': paymentStatus,
                                        'payment.method': paymentMethod,
                                        'payment.paymentDate': new Date(),
                                        'payment.lastUpdated': new Date()
                                    },
                                    $push: {
                                        'paymentHistory': {
                                            amount: allocationAmount,
                                            method: paymentMethod,
                                            reference: paymentNumber,
                                            paymentDate: new Date(),
                                            notes: notes || `Payment ${paymentNumber}`,
                                            paymentId: payment._id,
                                            createdAt: new Date(),
                                            createdBy: createdBy || employeeName || 'system',
                                            type: 'payment_in'
                                        }
                                    }
                                },
                                { new: true }
                            );

                            if (updateResult) {
                                updatedInvoices.push({
                                    invoiceId: specificSale._id,
                                    invoiceNumber: specificSale.invoiceNumber || specificSale.saleNumber || `INV-${specificSale._id}`,
                                    totalAmount: totalAmount,
                                    previousPaidAmount: currentPaidAmount,
                                    allocatedAmount: allocationAmount,
                                    newPaidAmount: newPaidAmount,
                                    newPendingAmount: newPendingAmount,
                                    paymentStatus: paymentStatus
                                });

                                remainingAmount -= allocationAmount;
                                invoicesUpdated = 1;

                                console.log(`✅ Updated specific invoice ${specificSale.invoiceNumber}: ₹${allocationAmount} allocated (Status: ${paymentStatus})`);
                            }
                        }
                    }
                }
                // **CASE 2: Auto-allocation to pending invoices**
                else if (remainingAmount > 0) {
                    console.log('🔄 Auto-allocating remaining amount to pending invoices');

                    // Find pending invoices for this customer
                    const pendingInvoicesQuery = {
                        companyId: new mongoose.Types.ObjectId(companyId),
                        $or: [
                            { customer: new mongoose.Types.ObjectId(effectivePartyId) },
                            { customerId: new mongoose.Types.ObjectId(effectivePartyId) },
                            { customerId: effectivePartyId },
                            { customerName: partyDoc.name }
                        ],
                        status: { $nin: ['cancelled', 'draft', 'deleted'] }
                    };

                    const allInvoices = await Sale.find(pendingInvoicesQuery)
                        .sort({ invoiceDate: 1, createdAt: 1 }) // Oldest first
                        .lean();

                    console.log(`📋 Found ${allInvoices.length} total invoices for auto-allocation`);

                    // Filter invoices with pending amounts
                    const pendingInvoices = allInvoices.filter(invoice => {
                        const totalAmount = parseFloat(
                            invoice.totals?.finalTotal ||
                            invoice.totals?.grandTotal ||
                            invoice.totalAmount ||
                            invoice.amount ||
                            0
                        );

                        const paidAmount = parseFloat(
                            invoice.payment?.paidAmount ||
                            invoice.payment?.totalPaid ||
                            invoice.payment?.amountPaid ||
                            invoice.paidAmount ||
                            0
                        );

                        const dueAmount = Math.max(0, totalAmount - paidAmount);
                        return totalAmount > 0 && dueAmount > 0;
                    });

                    console.log(`💰 Found ${pendingInvoices.length} invoices with pending amounts for auto-allocation`);

                    // Allocate payment to invoices
                    for (const invoice of pendingInvoices) {
                        if (remainingAmount <= 0) break;

                        const totalAmount = parseFloat(
                            invoice.totals?.finalTotal ||
                            invoice.totals?.grandTotal ||
                            invoice.totalAmount ||
                            invoice.amount ||
                            0
                        );

                        const currentPaidAmount = parseFloat(
                            invoice.payment?.paidAmount ||
                            invoice.payment?.totalPaid ||
                            invoice.payment?.amountPaid ||
                            invoice.paidAmount ||
                            0
                        );

                        const pendingAmount = Math.max(0, totalAmount - currentPaidAmount);

                        if (pendingAmount <= 0) continue;

                        const allocationAmount = Math.min(remainingAmount, pendingAmount);
                        const newPaidAmount = currentPaidAmount + allocationAmount;
                        const newPendingAmount = Math.max(0, totalAmount - newPaidAmount);

                        // Determine payment status
                        let paymentStatus = 'pending';
                        if (newPaidAmount >= totalAmount) {
                            paymentStatus = 'paid';
                        } else if (newPaidAmount > 0) {
                            paymentStatus = 'partial';
                        }

                        // **FIXED: Update the invoice document properly**
                        const updateResult = await Sale.findByIdAndUpdate(invoice._id, {
                            $set: {
                                'payment.paidAmount': newPaidAmount,
                                'payment.pendingAmount': newPendingAmount,
                                'payment.status': paymentStatus,
                                'payment.method': paymentMethod,
                                'payment.paymentDate': new Date(),
                                'payment.lastUpdated': new Date()
                            },
                            $push: {
                                'paymentHistory': {
                                    amount: allocationAmount,
                                    method: paymentMethod,
                                    reference: paymentNumber,
                                    paymentDate: new Date(),
                                    notes: `Auto-allocated from payment ${paymentNumber} - ${notes || 'Customer payment'}`,
                                    paymentId: payment._id,
                                    createdAt: new Date(),
                                    createdBy: createdBy || employeeName || 'system',
                                    type: 'payment_in'
                                }
                            }
                        }, { new: true });

                        if (updateResult) {
                            updatedInvoices.push({
                                invoiceId: invoice._id,
                                invoiceNumber: invoice.invoiceNumber || invoice.saleNumber || `INV-${invoice._id}`,
                                totalAmount: totalAmount,
                                previousPaidAmount: currentPaidAmount,
                                allocatedAmount: allocationAmount,
                                newPaidAmount: newPaidAmount,
                                newPendingAmount: newPendingAmount,
                                paymentStatus: paymentStatus
                            });

                            remainingAmount -= allocationAmount;
                            invoicesUpdated++;

                            console.log(`✅ Auto-allocated ₹${allocationAmount} to invoice ${invoice.invoiceNumber || invoice._id} (Status: ${paymentStatus})`);
                        }
                    }
                }

                // Update payment record with allocation details
                if (updatedInvoices.length > 0) {
                    payment.invoiceAllocations = updatedInvoices.map(inv => ({
                        invoiceId: inv.invoiceId,
                        invoiceNumber: inv.invoiceNumber,
                        allocatedAmount: inv.allocatedAmount,
                        allocationDate: new Date()
                    }));

                    const originalNotes = payment.notes || '';
                    payment.notes = `${originalNotes} - Allocated to ${updatedInvoices.length} invoice(s)`.trim();
                    await payment.save();
                }

                console.log(`💰 Payment allocation completed. Updated ${invoicesUpdated} invoices. Remaining: ₹${remainingAmount}`);

            } catch (invoiceUpdateError) {
                console.error('❌ Error updating invoices:', invoiceUpdateError);
                // Don't fail the payment creation, just log the error
            }
        }

        // **ENHANCED: Update party balance more accurately**
        if (type === 'in') {
            // Calculate the actual change in party balance
            const totalAllocatedAmount = updatedInvoices.reduce((sum, inv) => sum + inv.allocatedAmount, 0);
            const advanceAmount = parseFloat(amount) - totalAllocatedAmount;

            // Only reduce party balance by the advance amount (not allocated to invoices)
            partyDoc.currentBalance = (partyDoc.currentBalance || 0) - advanceAmount;

            console.log(`📊 Party balance update: Total payment: ₹${amount}, Allocated: ₹${totalAllocatedAmount}, Advance: ₹${advanceAmount}`);
        } else {
            partyDoc.currentBalance = (partyDoc.currentBalance || 0) + parseFloat(amount);
        }

        await partyDoc.save();

        // **ENHANCED: Prepare detailed response**
        const responseDetails = {
            invoicesUpdated: invoicesUpdated,
            remainingAmount: remainingAmount,
            invoiceList: updatedInvoices.map(inv => ({
                invoiceNumber: inv.invoiceNumber,
                allocatedAmount: inv.allocatedAmount,
                paymentStatus: inv.paymentStatus
            }))
        };

        console.log('✅ Payment In completed successfully:', {
            paymentNumber: payment.paymentNumber,
            amount: payment.amount,
            invoicesUpdated: responseDetails.invoicesUpdated,
            remainingAmount: responseDetails.remainingAmount,
            newPartyBalance: partyDoc.currentBalance
        });

        // **ENHANCED: Send comprehensive success response**
        res.status(201).json({
            success: true,
            message: responseDetails.invoicesUpdated > 0
                ? `Payment of ₹${amount} recorded and allocated to ${responseDetails.invoicesUpdated} invoice(s) successfully`
                : `Payment of ₹${amount} recorded successfully`,
            details: responseDetails,
            data: {
                payment: {
                    _id: payment._id,
                    paymentNumber: payment.paymentNumber,
                    party: payment.party,
                    partyId: payment.partyId,
                    partyName: payment.partyName,
                    type: payment.type,
                    amount: payment.amount,
                    paymentMethod: payment.paymentMethod,
                    paymentDate: payment.paymentDate,
                    paymentType: payment.paymentType,
                    status: payment.status,
                    reference: payment.reference,
                    notes: payment.notes,
                    createdAt: payment.createdAt,
                    invoiceAllocations: payment.invoiceAllocations || []
                },
                partyBalance: partyDoc.currentBalance,
                party: {
                    id: partyDoc._id,
                    name: partyDoc.name,
                    currentBalance: partyDoc.currentBalance
                },
                invoiceAllocations: updatedInvoices,
                remainingAmount: remainingAmount,
                totalInvoicesUpdated: invoicesUpdated
            }
        });

    } catch (error) {
        console.error('❌ Error in createPaymentIn:', error);

        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message
            }));

            return res.status(400).json({
                success: false,
                message: 'Payment validation failed',
                errors: validationErrors
            });
        }

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
            party,
            type,
            companyId,
            amount,
            paymentMethod,
            paymentDate,
            paymentType,
            purchaseOrderId,
            reference,
            notes,
            bankAccountId,
            bankAccount,
            employeeName,
            employeeId,
            createdBy,
            status,
            partyName,
            partyId
        } = req.body;

        const effectivePartyId = party || partyId;

        // Validate required fields
        if (!effectivePartyId || !amount || !type) {
            return res.status(400).json({
                success: false,
                message: 'Party ID, amount, and type are required'
            });
        }

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID is required'
            });
        }

        if (type !== 'out') {
            return res.status(400).json({
                success: false,
                message: 'Type must be "out" for Payment Out'
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

        const partyDoc = await Party.findById(effectivePartyId);
        if (!partyDoc) {
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
        const paymentData = {
            paymentNumber,
            party: new mongoose.Types.ObjectId(effectivePartyId),
            type: 'payment_out',
            partyId: effectivePartyId,
            partyName: partyName || partyDoc.name,
            amount: parseFloat(amount),
            paymentMethod: paymentMethod || 'cash',
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            paymentType: 'payment_out',
            status: status || 'completed',
            reference: reference || '',
            notes: notes || '',
            employeeName: employeeName || '',
            employeeId: employeeId || '',
            companyId: new mongoose.Types.ObjectId(companyId)
        };

        // Add optional fields
        if (createdBy && mongoose.Types.ObjectId.isValid(createdBy)) {
            paymentData.createdBy = new mongoose.Types.ObjectId(createdBy);
        }

        if (bankAccountId || bankAccount) {
            paymentData.bankAccountId = bankAccountId || bankAccount;
        }

        if (purchaseOrderId) {
            paymentData.purchaseOrderId = new mongoose.Types.ObjectId(purchaseOrderId);
        }

        if (paymentType) {
            paymentData.subType = paymentType;
        }

        const payment = new Payment(paymentData);
        await payment.save();

        // Update party balance
        partyDoc.currentBalance = (partyDoc.currentBalance || 0) + parseFloat(amount);
        await partyDoc.save();

        res.status(201).json({
            success: true,
            message: 'Payment Out recorded successfully',
            data: {
                payment: {
                    _id: payment._id,
                    paymentNumber: payment.paymentNumber,
                    party: payment.party,
                    partyId: payment.partyId,
                    partyName: payment.partyName,
                    type: payment.type,
                    amount: payment.amount,
                    paymentMethod: payment.paymentMethod,
                    paymentDate: payment.paymentDate,
                    paymentType: payment.paymentType,
                    status: payment.status,
                    reference: payment.reference,
                    notes: payment.notes,
                    createdAt: payment.createdAt
                },
                partyBalance: partyDoc.currentBalance,
                party: {
                    id: partyDoc._id,
                    name: partyDoc.name,
                    currentBalance: partyDoc.currentBalance
                }
            }
        });

    } catch (error) {
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message
            }));

            return res.status(400).json({
                success: false,
                message: 'Payment validation failed',
                errors: validationErrors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create Payment Out',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// ================================
// 📊 GET PAYMENTS - FIXED
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
            limit = 50,
            sortBy = 'createdAt',
            sortOrder = 'desc'
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
            if (mongoose.Types.ObjectId.isValid(companyId)) {
                queryConditions.companyId = new mongoose.Types.ObjectId(companyId);
            }
        }

        // Handle both 'party' and 'partyId' fields
        if (partyId) {
            if (mongoose.Types.ObjectId.isValid(partyId)) {
                queryConditions.$or = [
                    { party: new mongoose.Types.ObjectId(partyId) },
                    { partyId: new mongoose.Types.ObjectId(partyId) },
                    { partyId: partyId }
                ];
            }
        }

        if (paymentMethod) {
            queryConditions.paymentMethod = paymentMethod;
        }

        if (paymentType) {
            queryConditions.$or = queryConditions.$or || [];
            queryConditions.$or.push(
                { type: paymentType },
                { paymentType: paymentType }
            );
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
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const [payments, totalCount] = await Promise.all([
            Payment.find(queryConditions)
                .sort(sortOptions)
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
            message: payments.length > 0 ? 'Payments fetched successfully' : 'No payments found'
        });

    } catch (error) {
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
    getPaymentAllocations, // NEW: Add this function
    cancelPayment
};