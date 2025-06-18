const mongoose = require('mongoose');

const getModel = (modelName) => {
    try {
        return require(`../models/${modelName}`);
    } catch (error) {
        return null;
    }
};

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
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment allocation details',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

const getPendingInvoicesForPayment = async (req, res) => {
    try {
        const { partyId } = req.params;
        const { companyId } = req.query;

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

        const Sale = getModel('Sale');
        if (!Sale) {
            return res.status(500).json({
                success: false,
                message: 'Sale model not available'
            });
        }

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

        const sales = await Sale.find(saleQueryConditions)
            .sort({ invoiceDate: -1, createdAt: -1 })
            .limit(100)
            .lean();

        const invoicesWithDue = sales.map(invoice => {
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

            const invoiceNumber = invoice.invoiceNumber ||
                invoice.saleNumber ||
                invoice.billNumber ||
                `INV-${invoice._id}`;

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
                paymentHistory: invoice.paymentHistory || [],
                lastPaymentDate: invoice.payment?.paymentDate || null
            };
        }).filter(invoice => {
            const hasDueAmount = invoice.totalAmount > 0 && invoice.dueAmount > 0;
            return hasDueAmount;
        });

        const totalDueAmount = invoicesWithDue.reduce((sum, invoice) => sum + invoice.dueAmount, 0);

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
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending invoices',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

const createBankTransaction = async (paymentData, payment) => {
    try {
        const Transaction = getModel('Transaction');
        if (!Transaction) {
            return null;
        }

        let bankAccount = null;
        let balanceBefore = 0;
        let balanceAfter = 0;

        if (paymentData.paymentMethod !== 'cash' && paymentData.bankAccountId) {
            const BankAccount = getModel('BankAccount');
            if (BankAccount) {
                bankAccount = await BankAccount.findById(paymentData.bankAccountId);
                if (!bankAccount) {
                    return null;
                }

                balanceBefore = parseFloat(bankAccount.currentBalance || bankAccount.balance || 0);

                if (payment.type === 'payment_in') {
                    balanceAfter = balanceBefore + parseFloat(payment.amount);
                } else {
                    balanceAfter = balanceBefore - parseFloat(payment.amount);
                }

                await BankAccount.findByIdAndUpdate(paymentData.bankAccountId, {
                    currentBalance: balanceAfter,
                    balance: balanceAfter,
                    lastTransactionDate: new Date(),
                    $inc: {
                        transactionCount: 1,
                        ...(payment.type === 'payment_in'
                            ? { totalCredits: parseFloat(payment.amount) }
                            : { totalDebits: parseFloat(payment.amount) }
                        )
                    }
                });
            }
        }

        const direction = payment.type === 'payment_in' ? 'in' : 'out';
        const transactionType = payment.type === 'payment_in' ? 'payment_in' : 'payment_out';

        const description = payment.type === 'payment_in'
            ? `Payment received from ${payment.partyName}`
            : `Payment made to ${payment.partyName}`;

        const transactionData = {
            transactionId: await generateTransactionId(paymentData.companyId),
            companyId: new mongoose.Types.ObjectId(paymentData.companyId),
            amount: parseFloat(payment.amount),
            direction: direction,
            transactionType: transactionType,
            referenceType: 'payment',
            referenceId: payment._id,
            referenceNumber: payment.paymentNumber,
            paymentMethod: payment.paymentMethod,
            partyId: payment.partyId ? new mongoose.Types.ObjectId(payment.partyId) : null,
            partyName: payment.partyName,
            partyType: payment.type === 'payment_in' ? 'customer' : 'supplier',
            description: description,
            notes: paymentData.notes || `Transaction for ${payment.paymentNumber}`,
            status: 'completed',
            createdBy: paymentData.createdBy || paymentData.employeeName || 'system',
            createdFrom: 'payment_system',
            transactionReference: paymentData.reference || payment.paymentNumber,
            transactionDate: payment.paymentDate
        };

        if (paymentData.paymentMethod === 'cash') {
            transactionData.isCashTransaction = true;
            transactionData.cashAmount = parseFloat(payment.amount);
            transactionData.cashTransactionType = direction === 'in' ? 'cash_in' : 'cash_out';
            transactionData.balanceBefore = 0;
            transactionData.balanceAfter = 0;
        } else {
            transactionData.bankAccountId = new mongoose.Types.ObjectId(paymentData.bankAccountId);
            transactionData.balanceBefore = balanceBefore;
            transactionData.balanceAfter = balanceAfter;
            transactionData.isCashTransaction = false;
        }

        const transaction = new Transaction(transactionData);
        await transaction.save();

        return {
            _id: transaction._id,
            transactionNumber: transaction.transactionId,
            transactionType: transaction.direction,
            amount: transaction.amount,
            balance: transaction.balanceAfter || 0,
            bankName: bankAccount?.bankName || 'N/A',
            accountName: bankAccount?.accountName || bankAccount?.name || 'Cash',
            description: transaction.description,
            reference: transaction.transactionReference,
            category: transaction.transactionType,
            status: transaction.status
        };

    } catch (error) {
        return null;
    }
};

const generateTransactionId = async (companyId) => {
    try {
        const Transaction = getModel('Transaction');
        if (!Transaction) {
            return `TXN-${Date.now()}`;
        }

        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        const todayStart = new Date(year, date.getMonth(), date.getDate());
        const todayEnd = new Date(year, date.getMonth(), date.getDate() + 1);

        const lastTransaction = await Transaction.findOne({
            companyId: new mongoose.Types.ObjectId(companyId),
            createdAt: { $gte: todayStart, $lt: todayEnd },
            transactionId: new RegExp(`^TXN-${year}${month}${day}`)
        }).sort({ transactionId: -1 });

        let sequence = 1;
        if (lastTransaction && lastTransaction.transactionId) {
            const parts = lastTransaction.transactionId.split('-');
            if (parts.length >= 3) {
                const lastSequence = parseInt(parts[2]);
                if (!isNaN(lastSequence)) {
                    sequence = lastSequence + 1;
                }
            }
        }

        return `TXN-${year}${month}${day}-${String(sequence).padStart(6, '0')}`;
    } catch (error) {
        return `TXN-${Date.now()}`;
    }
};

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
            invoiceId,
            saleOrderId,
            invoiceAllocations,
            allocations,
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
        const effectiveInvoiceId = invoiceId || saleOrderId;
        const effectiveAllocations = invoiceAllocations || allocations;
        const effectiveBankAccountId = bankAccountId || bankAccount;

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

        if (type !== 'in') {
            return res.status(400).json({
                success: false,
                message: 'Type must be "in" for Payment In'
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

        if (paymentMethod && paymentMethod !== 'cash' && !effectiveBankAccountId) {
            return res.status(400).json({
                success: false,
                message: 'Bank account is required for non-cash payments'
            });
        }

        if (effectiveBankAccountId && !mongoose.Types.ObjectId.isValid(effectiveBankAccountId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Bank Account ID format'
            });
        }

        const Payment = getModel('Payment');
        const Sale = getModel('Sale');
        const Party = getModel('Party');

        if (!Payment) {
            return res.status(500).json({
                success: false,
                message: 'Payment model not available'
            });
        }

        const partyDoc = await Party?.findById(effectivePartyId);
        if (!partyDoc) {
            return res.status(404).json({
                success: false,
                message: 'Party not found'
            });
        }

        let bankAccountDoc = null;
        if (effectiveBankAccountId) {
            const BankAccount = getModel('BankAccount');
            if (BankAccount) {
                bankAccountDoc = await BankAccount.findById(effectiveBankAccountId);
                if (!bankAccountDoc) {
                    return res.status(404).json({
                        success: false,
                        message: 'Bank account not found'
                    });
                }
            }
        }

        const paymentCount = await Payment.countDocuments();
        const paymentNumber = `PAY-IN-${String(paymentCount + 1).padStart(6, '0')}`;

        const paymentData = {
            paymentNumber,
            party: new mongoose.Types.ObjectId(effectivePartyId),
            type: 'payment_in',
            partyId: effectivePartyId,
            partyName: partyName || partyDoc.name,
            amount: parseFloat(amount),
            paymentMethod: paymentMethod || 'cash',
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            paymentType: 'payment_in',
            status: status || 'completed',
            reference: reference || '',
            notes: notes || '',
            employeeName: employeeName || '',
            employeeId: employeeId || '',
            companyId: new mongoose.Types.ObjectId(companyId)
        };

        if (createdBy && mongoose.Types.ObjectId.isValid(createdBy)) {
            paymentData.createdBy = new mongoose.Types.ObjectId(createdBy);
        }

        if (effectiveBankAccountId) {
            paymentData.bankAccountId = new mongoose.Types.ObjectId(effectiveBankAccountId);
        }

        if (effectiveInvoiceId) {
            paymentData.invoiceId = new mongoose.Types.ObjectId(effectiveInvoiceId);
        }

        if (paymentType) {
            paymentData.subType = paymentType;
        }

        const payment = new Payment(paymentData);
        await payment.save();

        let bankTransaction = null;
        try {
            bankTransaction = await createBankTransaction({
                paymentMethod,
                bankAccountId: effectiveBankAccountId,
                companyId,
                reference,
                notes,
                createdBy,
                employeeName
            }, payment);
        } catch (transactionError) {
            // Continue with payment creation even if transaction fails
        }

        // Handle invoice payment allocation
        let updatedInvoices = [];
        let remainingAmount = parseFloat(amount);
        let invoicesUpdated = 0;

        if (Sale && type === 'in') {
            try {
                if (effectiveInvoiceId && mongoose.Types.ObjectId.isValid(effectiveInvoiceId)) {
                    const specificInvoice = await Sale.findById(effectiveInvoiceId);
                    if (specificInvoice) {
                        const totalAmount = parseFloat(
                            specificInvoice.totals?.finalTotal ||
                            specificInvoice.totals?.grandTotal ||
                            specificInvoice.totals?.total ||
                            specificInvoice.totalAmount ||
                            specificInvoice.amount ||
                            0
                        );

                        const currentPaidAmount = parseFloat(
                            specificInvoice.payment?.paidAmount ||
                            specificInvoice.payment?.totalPaid ||
                            specificInvoice.payment?.amountPaid ||
                            specificInvoice.paidAmount ||
                            0
                        );

                        const pendingAmount = Math.max(0, totalAmount - currentPaidAmount);

                        if (pendingAmount > 0) {
                            const allocationAmount = Math.min(remainingAmount, pendingAmount);
                            const newPaidAmount = currentPaidAmount + allocationAmount;
                            const newPendingAmount = Math.max(0, totalAmount - newPaidAmount);

                            let paymentStatus = 'pending';
                            if (newPaidAmount >= totalAmount) {
                                paymentStatus = 'paid';
                            } else if (newPaidAmount > 0) {
                                paymentStatus = 'partial';
                            }

                            const updateResult = await Sale.findByIdAndUpdate(
                                effectiveInvoiceId,
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
                                            notes: `Specific payment ${paymentNumber} - ${notes || 'Customer payment'}`,
                                            paymentId: payment._id,
                                            transactionId: bankTransaction?._id || null,
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
                                    invoiceId: specificInvoice._id,
                                    invoiceNumber: specificInvoice.saleNumber || specificInvoice.invoiceNumber || `SALE-${specificInvoice._id}`,
                                    totalAmount: totalAmount,
                                    previousPaidAmount: currentPaidAmount,
                                    allocatedAmount: allocationAmount,
                                    newPaidAmount: newPaidAmount,
                                    newPendingAmount: newPendingAmount,
                                    paymentStatus: paymentStatus
                                });

                                remainingAmount -= allocationAmount;
                                invoicesUpdated = 1;
                            }
                        }
                    }
                }
            } catch (invoiceUpdateError) {
                // Continue with payment creation even if invoice update fails
            }
        }

        // Update party balance for Payment In
        if (type === 'in') {
            const totalAllocatedAmount = updatedInvoices.reduce((sum, inv) => sum + inv.allocatedAmount, 0);
            const advanceAmount = parseFloat(amount) - totalAllocatedAmount;
            partyDoc.currentBalance = (partyDoc.currentBalance || 0) + advanceAmount;
        }

        await partyDoc.save();

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

        const responseDetails = {
            invoicesUpdated: invoicesUpdated,
            remainingAmount: remainingAmount,
            invoiceList: updatedInvoices.map(inv => ({
                invoiceNumber: inv.invoiceNumber,
                allocatedAmount: inv.allocatedAmount,
                paymentStatus: inv.paymentStatus
            }))
        };

        res.status(201).json({
            success: true,
            message: responseDetails.invoicesUpdated > 0
                ? `Payment of ₹${amount} received and allocated to ${responseDetails.invoicesUpdated} invoice(s) successfully`
                : `Payment of ₹${amount} received successfully`,
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
                    invoiceAllocations: payment.invoiceAllocations || [],
                    bankAccountId: payment.bankAccountId
                },
                bankTransaction: bankTransaction,
                transaction: bankTransaction,
                bankAccount: bankAccountDoc ? {
                    _id: bankAccountDoc._id,
                    bankName: bankAccountDoc.bankName,
                    accountName: bankAccountDoc.accountName,
                    accountNumber: bankAccountDoc.accountNumber,
                    currentBalance: bankAccountDoc.currentBalance
                } : null,
                partyBalance: partyDoc.currentBalance,
                party: {
                    id: partyDoc._id,
                    name: partyDoc.name,
                    currentBalance: partyDoc.currentBalance
                },
                invoiceAllocations: updatedInvoices,
                remainingAmount: remainingAmount,
                totalInvoicesUpdated: invoicesUpdated,
                invoicesUpdated: invoicesUpdated
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
            message: 'Failed to create Payment In',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

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
            purchaseInvoiceId,
            purchaseInvoiceAllocations,
            invoiceId,
            saleOrderId,
            invoiceAllocations,
            allocations,
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
        const effectiveInvoiceId = purchaseInvoiceId || invoiceId || saleOrderId;
        const effectiveAllocations = purchaseInvoiceAllocations || invoiceAllocations || allocations;
        const effectiveBankAccountId = bankAccountId || bankAccount;

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

        if (paymentMethod && paymentMethod !== 'cash' && !effectiveBankAccountId) {
            return res.status(400).json({
                success: false,
                message: 'Bank account is required for non-cash payments'
            });
        }

        if (effectiveBankAccountId && !mongoose.Types.ObjectId.isValid(effectiveBankAccountId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Bank Account ID format'
            });
        }

        const Payment = getModel('Payment');
        const Purchase = getModel('Purchase');
        const Party = getModel('Party');

        if (!Payment) {
            return res.status(500).json({
                success: false,
                message: 'Payment model not available'
            });
        }

        const partyDoc = await Party?.findById(effectivePartyId);
        if (!partyDoc) {
            return res.status(404).json({
                success: false,
                message: 'Party not found'
            });
        }

        let bankAccountDoc = null;
        if (effectiveBankAccountId) {
            const BankAccount = getModel('BankAccount');
            if (BankAccount) {
                bankAccountDoc = await BankAccount.findById(effectiveBankAccountId);
                if (!bankAccountDoc) {
                    return res.status(404).json({
                        success: false,
                        message: 'Bank account not found'
                    });
                }
            }
        }

        const paymentCount = await Payment.countDocuments();
        const paymentNumber = `PAY-OUT-${String(paymentCount + 1).padStart(6, '0')}`;

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

        if (createdBy && mongoose.Types.ObjectId.isValid(createdBy)) {
            paymentData.createdBy = new mongoose.Types.ObjectId(createdBy);
        }

        if (effectiveBankAccountId) {
            paymentData.bankAccountId = new mongoose.Types.ObjectId(effectiveBankAccountId);
        }

        if (effectiveInvoiceId) {
            paymentData.purchaseInvoiceId = new mongoose.Types.ObjectId(effectiveInvoiceId);
        }

        if (paymentType) {
            paymentData.subType = paymentType;
        }

        const payment = new Payment(paymentData);
        await payment.save();

        let bankTransaction = null;
        try {
            bankTransaction = await createBankTransaction({
                paymentMethod,
                bankAccountId: effectiveBankAccountId,
                companyId,
                reference,
                notes,
                createdBy,
                employeeName
            }, payment);
        } catch (transactionError) {
            // Continue with payment creation even if transaction fails
        }

        // Handle purchase invoice payment allocation
        let updatedInvoices = [];
        let remainingAmount = parseFloat(amount);
        let invoicesUpdated = 0;

        if (Purchase && type === 'out') {
            try {
                if (effectiveInvoiceId && mongoose.Types.ObjectId.isValid(effectiveInvoiceId)) {
                    const specificInvoice = await Purchase.findById(effectiveInvoiceId);
                    if (specificInvoice) {
                        const totalAmount = parseFloat(
                            specificInvoice.totals?.finalTotal ||
                            specificInvoice.totals?.grandTotal ||
                            specificInvoice.totals?.total ||
                            specificInvoice.totalAmount ||
                            specificInvoice.amount ||
                            0
                        );

                        const currentPaidAmount = parseFloat(
                            specificInvoice.payment?.paidAmount ||
                            specificInvoice.payment?.totalPaid ||
                            specificInvoice.payment?.amountPaid ||
                            specificInvoice.paidAmount ||
                            0
                        );

                        const pendingAmount = Math.max(0, totalAmount - currentPaidAmount);

                        if (pendingAmount > 0) {
                            const allocationAmount = Math.min(remainingAmount, pendingAmount);
                            const newPaidAmount = currentPaidAmount + allocationAmount;
                            const newPendingAmount = Math.max(0, totalAmount - newPaidAmount);

                            let paymentStatus = 'pending';
                            if (newPaidAmount >= totalAmount) {
                                paymentStatus = 'paid';
                            } else if (newPaidAmount > 0) {
                                paymentStatus = 'partial';
                            }

                            const updateResult = await Purchase.findByIdAndUpdate(
                                effectiveInvoiceId,
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
                                            notes: `Specific payment ${paymentNumber} - ${notes || 'Supplier payment'}`,
                                            paymentId: payment._id,
                                            transactionId: bankTransaction?._id || null,
                                            createdAt: new Date(),
                                            createdBy: createdBy || employeeName || 'system',
                                            type: 'payment_out'
                                        }
                                    }
                                },
                                { new: true }
                            );

                            if (updateResult) {
                                updatedInvoices.push({
                                    invoiceId: specificInvoice._id,
                                    purchaseInvoiceId: specificInvoice._id,
                                    invoiceNumber: specificInvoice.purchaseNumber || specificInvoice.invoiceNumber || `PUR-${specificInvoice._id}`,
                                    totalAmount: totalAmount,
                                    previousPaidAmount: currentPaidAmount,
                                    allocatedAmount: allocationAmount,
                                    newPaidAmount: newPaidAmount,
                                    newPendingAmount: newPendingAmount,
                                    paymentStatus: paymentStatus
                                });

                                remainingAmount -= allocationAmount;
                                invoicesUpdated = 1;
                            }
                        }
                    }
                }
            } catch (invoiceUpdateError) {
                // Continue with payment creation even if invoice update fails
            }
        }

        // Update party balance for Payment Out
        if (type === 'out') {
            const totalAllocatedAmount = updatedInvoices.reduce((sum, inv) => sum + inv.allocatedAmount, 0);
            const advanceAmount = parseFloat(amount) - totalAllocatedAmount;
            partyDoc.currentBalance = (partyDoc.currentBalance || 0) - advanceAmount;
        }

        await partyDoc.save();

        // Update payment record with allocation details
        if (updatedInvoices.length > 0) {
            payment.purchaseInvoiceAllocations = updatedInvoices.map(inv => ({
                purchaseInvoiceId: inv.purchaseInvoiceId || inv.invoiceId,
                invoiceNumber: inv.invoiceNumber,
                allocatedAmount: inv.allocatedAmount,
                allocationDate: new Date()
            }));

            const originalNotes = payment.notes || '';
            payment.notes = `${originalNotes} - Allocated to ${updatedInvoices.length} purchase invoice(s)`.trim();
            await payment.save();
        }

        const responseDetails = {
            invoicesUpdated: invoicesUpdated,
            remainingAmount: remainingAmount,
            invoiceList: updatedInvoices.map(inv => ({
                invoiceNumber: inv.invoiceNumber,
                allocatedAmount: inv.allocatedAmount,
                paymentStatus: inv.paymentStatus
            }))
        };

        res.status(201).json({
            success: true,
            message: responseDetails.invoicesUpdated > 0
                ? `Payment of ₹${amount} made and allocated to ${responseDetails.invoicesUpdated} purchase invoice(s) successfully`
                : `Payment of ₹${amount} made successfully`,
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
                    purchaseInvoiceAllocations: payment.purchaseInvoiceAllocations || [],
                    bankAccountId: payment.bankAccountId
                },
                bankTransaction: bankTransaction,
                transaction: bankTransaction,
                bankAccount: bankAccountDoc ? {
                    _id: bankAccountDoc._id,
                    bankName: bankAccountDoc.bankName,
                    accountName: bankAccountDoc.accountName,
                    accountNumber: bankAccountDoc.accountNumber,
                    currentBalance: bankAccountDoc.currentBalance
                } : null,
                partyBalance: partyDoc.currentBalance,
                party: {
                    id: partyDoc._id,
                    name: partyDoc.name,
                    currentBalance: partyDoc.currentBalance
                },
                purchaseInvoiceAllocations: updatedInvoices,
                invoiceAllocations: updatedInvoices,
                remainingAmount: remainingAmount,
                totalInvoicesUpdated: invoicesUpdated,
                invoicesUpdated: invoicesUpdated
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

        const queryConditions = {};

        if (companyId) {
            if (mongoose.Types.ObjectId.isValid(companyId)) {
                queryConditions.companyId = new mongoose.Types.ObjectId(companyId);
            }
        }

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

        const queryConditions = { partyId: new mongoose.Types.ObjectId(partyId) };
        if (companyId) {
            queryConditions.companyId = new mongoose.Types.ObjectId(companyId);
        }

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

const getPendingPurchaseInvoicesForPayment = async (req, res) => {
    try {
        const { partyId } = req.params;
        const { companyId } = req.query;

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

        const Purchase = getModel('Purchase');
        if (!Purchase) {
            return res.status(500).json({
                success: false,
                message: 'Purchase model not available'
            });
        }

        const purchaseQueryConditions = {
            $and: [
                { companyId: new mongoose.Types.ObjectId(companyId) },
                {
                    $or: [
                        { supplier: new mongoose.Types.ObjectId(partyId) },
                        { supplierId: new mongoose.Types.ObjectId(partyId) },
                        { supplierId: partyId },
                        { supplierName: party.name }
                    ]
                },
                {
                    status: {
                        $nin: ['cancelled', 'deleted'],
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

        const purchases = await Purchase.find(purchaseQueryConditions)
            .sort({ purchaseDate: -1, createdAt: -1 })
            .limit(100)
            .lean();

        const invoicesWithDue = purchases.map(invoice => {
            const totalAmount = parseFloat(
                invoice.totals?.finalTotal ||
                invoice.totals?.grandTotal ||
                invoice.totals?.total ||
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

            const invoiceNumber = invoice.purchaseNumber ||
                invoice.invoiceNumber ||
                invoice.billNumber ||
                `PUR-${invoice._id}`;

            return {
                _id: invoice._id,
                id: invoice._id,
                invoiceNumber: invoiceNumber,
                purchaseNumber: invoiceNumber,
                invoiceDate: invoice.purchaseDate || invoice.invoiceDate || invoice.createdAt,
                purchaseDate: invoice.purchaseDate || invoice.invoiceDate || invoice.createdAt,
                totalAmount: totalAmount,
                paidAmount: paidAmount,
                dueAmount: dueAmount,
                paymentStatus: dueAmount > 0 ?
                    (paidAmount > 0 ? 'partial' : 'pending') : 'paid',
                status: invoice.status,
                orderType: 'purchase_invoice',
                documentType: 'purchase_invoice',
                supplierName: party.name,
                supplierId: party._id,
                items: invoice.items || [],
                createdAt: invoice.createdAt,
                updatedAt: invoice.updatedAt,
                currency: invoice.currency || 'INR',
                taxAmount: invoice.totals?.totalTax || invoice.totals?.tax || 0,
                discountAmount: invoice.totals?.totalDiscount || invoice.totals?.discount || 0,
                paymentHistory: invoice.paymentHistory || [],
                lastPaymentDate: invoice.payment?.paymentDate || null,
                originalInvoice: invoice
            };
        }).filter(invoice => {
            const hasAmount = invoice.totalAmount > 0;
            const shouldInclude = hasAmount && (invoice.dueAmount > 0 || invoice.status === 'draft');
            return shouldInclude;
        });

        const totalDueAmount = invoicesWithDue.reduce((sum, invoice) => sum + invoice.dueAmount, 0);

        const response = {
            success: true,
            data: {
                purchaseInvoices: invoicesWithDue,
                invoices: invoicesWithDue,
                purchases: invoicesWithDue,
                data: invoicesWithDue,
                totalInvoices: invoicesWithDue.length,
                totalDueAmount: totalDueAmount,
                party: {
                    id: party._id,
                    _id: party._id,
                    name: party.name,
                    currentBalance: party.currentBalance || 0,
                    partyType: party.partyType || 'supplier'
                }
            },
            message: invoicesWithDue.length > 0 ?
                `Found ${invoicesWithDue.length} pending purchase invoices` :
                `No pending purchase invoices found with due amounts (${purchases.length} total purchases found)`
        };

        res.status(200).json(response);

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending purchase invoices',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

module.exports = {
    getPendingInvoicesForPayment,
    getPendingPurchaseInvoicesForPayment,
    createPaymentIn,
    createPaymentOut,
    getPayments,
    getPaymentById,
    getPartyPaymentSummary,
    getPaymentAllocations,
    cancelPayment
};