const Transaction = require('../models/Transaction');
const BankAccount = require('../models/BankAccount');
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');
const mongoose = require('mongoose');

const transactionController = {
    // ✅ ENHANCED: Get all transactions with improved company ID handling
    getAllTransactions: async (req, res) => {
        try {
            const {
                page = 1,
                limit = 50,
                bankAccountId,
                transactionType,
                direction,
                partyId,
                dateFrom,
                dateTo,
                search,
                status = 'completed',
                sortBy = 'transactionDate',
                sortOrder = 'desc'
            } = req.query;

            // ✅ ENHANCED: Multiple fallback sources for company ID
            const companyId =
                req.companyId ||                   // From middleware (preferred)
                req.params.companyId ||            // From URL params
                req.headers['x-company-id'] ||     // From header (backup)
                req.query.companyId ||             // From query (fallback)
                req.user?.currentCompany;          // From user context (last resort)

            console.log('🔍 Company ID Resolution Debug:', {
                fromMiddleware: req.companyId,
                fromParams: req.params.companyId,
                fromHeaders: req.headers['x-company-id'],
                fromQuery: req.query.companyId,
                fromUser: req.user?.currentCompany,
                resolved: companyId,
                route: req.originalUrl
            });

            console.log('🏦 Getting transactions with filters:', {
                companyId,
                bankAccountId,
                transactionType,
                direction,
                page,
                limit
            });

            // ✅ ENHANCED: Better validation with debug info
            if (!companyId) {
                console.error('❌ Company ID validation failed');
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required',
                    debug: {
                        middleware: req.companyId ? 'Present' : 'Missing',
                        params: req.params.companyId ? 'Present' : 'Missing',
                        headers: req.headers['x-company-id'] ? 'Present' : 'Missing',
                        query: req.query.companyId ? 'Present' : 'Missing',
                        user: req.user?.currentCompany ? 'Present' : 'Missing',
                        route: req.originalUrl,
                        suggestion: 'Check route configuration and middleware'
                    }
                });
            }

            if (!mongoose.Types.ObjectId.isValid(companyId)) {
                console.error('❌ Invalid company ID format:', companyId);
                return res.status(400).json({
                    success: false,
                    message: 'Invalid Company ID format',
                    debug: {
                        providedCompanyId: companyId,
                        length: companyId?.length,
                        type: typeof companyId
                    }
                });
            }

            // ✅ ENHANCED: Build filter object with proper ObjectId conversion
            const filter = {
                companyId: new mongoose.Types.ObjectId(companyId),
                status: status || 'completed'
            };

            if (bankAccountId && mongoose.Types.ObjectId.isValid(bankAccountId)) {
                filter.bankAccountId = new mongoose.Types.ObjectId(bankAccountId);
            }

            // Handle comma-separated transaction types
            if (transactionType) {
                if (transactionType.includes(',')) {
                    const types = transactionType.split(',').map(type => type.trim()).filter(Boolean);
                    if (types.length > 0) {
                        filter.transactionType = { $in: types };
                    }
                } else {
                    filter.transactionType = transactionType.trim();
                }
            }

            if (direction && ['in', 'out'].includes(direction)) {
                filter.direction = direction;
            }

            if (partyId && mongoose.Types.ObjectId.isValid(partyId)) {
                filter.partyId = new mongoose.Types.ObjectId(partyId);
            }

            // ✅ ENHANCED: Better date range filter
            if (dateFrom || dateTo) {
                filter.transactionDate = {};
                if (dateFrom) {
                    try {
                        filter.transactionDate.$gte = new Date(dateFrom);
                    } catch (e) {
                        console.warn('Invalid dateFrom:', dateFrom);
                    }
                }
                if (dateTo) {
                    try {
                        const endDate = new Date(dateTo);
                        // Set to end of day for inclusive date range
                        endDate.setHours(23, 59, 59, 999);
                        filter.transactionDate.$lte = endDate;
                    } catch (e) {
                        console.warn('Invalid dateTo:', dateTo);
                    }
                }
            }

            // ✅ ENHANCED: Improved search filter
            if (search && search.trim()) {
                const searchTerm = search.trim();
                filter.$or = [
                    { transactionId: { $regex: searchTerm, $options: 'i' } },
                    { description: { $regex: searchTerm, $options: 'i' } },
                    { partyName: { $regex: searchTerm, $options: 'i' } },
                    { referenceNumber: { $regex: searchTerm, $options: 'i' } },
                    { notes: { $regex: searchTerm, $options: 'i' } },
                    { chequeNumber: { $regex: searchTerm, $options: 'i' } },
                    { upiTransactionId: { $regex: searchTerm, $options: 'i' } }
                ];
            }

            console.log('🔍 Final filter object:', JSON.stringify(filter, null, 2));

            // Calculate pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const limitNum = parseInt(limit);

            // ✅ FIXED: Use standard method without non-existent model methods
            let transactions, totalTransactions, summary;

            try {
                console.log('🔄 Getting transactions with standard method...');

                // Build sort object
                const sortObj = {};
                if (sortBy && ['transactionDate', 'amount', 'createdAt'].includes(sortBy)) {
                    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;
                } else {
                    sortObj.transactionDate = -1;
                    sortObj.createdAt = -1;
                }

                [transactions, totalTransactions] = await Promise.all([
                    Transaction.find(filter)
                        .populate('bankAccountId', 'accountName bankName accountNumber currentBalance accountType')
                        .populate('partyId', 'name mobile email businessName companyName')
                        .populate('referenceId')
                        .sort(sortObj)
                        .skip(skip)
                        .limit(limitNum)
                        .lean(),
                    Transaction.countDocuments(filter)
                ]);

                console.log('✅ Standard method successful:', {
                    transactionCount: transactions.length,
                    totalTransactions
                });

            } catch (fallbackError) {
                console.error('❌ Transaction query failed:', fallbackError);
                throw fallbackError;
            }

            const totalPages = Math.ceil(totalTransactions / limitNum);

            // ✅ FIXED: Simplified summary calculation
            try {
                console.log('📊 Calculating transaction summary...');

                const summaryPipeline = [
                    { $match: filter },
                    {
                        $group: {
                            _id: null,
                            totalTransactions: { $sum: 1 },
                            totalIn: {
                                $sum: {
                                    $cond: [{ $eq: ['$direction', 'in'] }, '$amount', 0]
                                }
                            },
                            totalOut: {
                                $sum: {
                                    $cond: [{ $eq: ['$direction', 'out'] }, '$amount', 0]
                                }
                            },
                            netAmount: {
                                $sum: {
                                    $cond: [
                                        { $eq: ['$direction', 'in'] },
                                        '$amount',
                                        { $multiply: ['$amount', -1] }
                                    ]
                                }
                            }
                        }
                    }
                ];

                const summaryResult = await Transaction.aggregate(summaryPipeline);
                summary = summaryResult[0] || {
                    totalTransactions: totalTransactions,
                    totalIn: 0,
                    totalOut: 0,
                    netAmount: 0
                };

                console.log('✅ Summary calculated:', summary);

            } catch (summaryError) {
                console.error('❌ Summary calculation failed:', summaryError);
                summary = {
                    totalTransactions: totalTransactions,
                    totalIn: 0,
                    totalOut: 0,
                    netAmount: 0
                };
            }

            // ✅ ENHANCED: Response with better metadata
            const response = {
                success: true,
                data: {
                    transactions: transactions || [],
                    pagination: {
                        page: parseInt(page),
                        limit: limitNum,
                        total: totalTransactions,
                        totalPages,
                        hasNext: parseInt(page) < totalPages,
                        hasPrev: parseInt(page) > 1,
                        // Additional pagination metadata
                        from: skip + 1,
                        to: Math.min(skip + limitNum, totalTransactions)
                    },
                    summary: summary || {
                        totalTransactions: 0,
                        totalIn: 0,
                        totalOut: 0,
                        netAmount: 0
                    },
                    // ✅ NEW: Add filter metadata for frontend
                    filters: {
                        applied: {
                            companyId: !!companyId,
                            bankAccountId: !!bankAccountId,
                            transactionType: !!transactionType,
                            direction: !!direction,
                            partyId: !!partyId,
                            dateRange: !!(dateFrom || dateTo),
                            search: !!search
                        },
                        values: {
                            companyId,
                            bankAccountId,
                            transactionType,
                            direction,
                            partyId,
                            dateFrom,
                            dateTo,
                            search
                        }
                    }
                },
                // ✅ NEW: Add performance metadata for debugging
                meta: {
                    timestamp: new Date().toISOString(),
                    processingTime: process.hrtime ? process.hrtime()[1] / 1000000 : null,
                    method: 'getAllTransactions',
                    version: '2.0'
                }
            };

            console.log('✅ Transaction request completed successfully:', {
                transactionCount: transactions?.length || 0,
                totalTransactions,
                page: parseInt(page),
                totalPages
            });

            res.status(200).json(response);

        } catch (error) {
            console.error('❌ Critical error in getAllTransactions:', error);

            res.status(500).json({
                success: false,
                message: 'Failed to get transactions',
                error: {
                    message: error.message,
                    code: error.code || 'INTERNAL_ERROR'
                },
                debug: process.env.NODE_ENV === 'development' ? {
                    stack: error.stack,
                    query: req.query,
                    params: req.params,
                    companyId: req.companyId || req.params.companyId,
                    timestamp: new Date().toISOString()
                } : undefined
            });
        }
    },

    // ✅ ENHANCED: Get transaction by ID with better validation
    getTransactionById: async (req, res) => {
        try {
            const { id } = req.params;
            const companyId = req.companyId || req.params.companyId || req.query.companyId;

            console.log('🔍 Getting transaction by ID:', { transactionId: id, companyId });

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid transaction ID format',
                    providedId: id
                });
            }

            if (!mongoose.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid company ID format',
                    providedCompanyId: companyId
                });
            }

            const transaction = await Transaction.findOne({
                _id: new mongoose.Types.ObjectId(id),
                companyId: new mongoose.Types.ObjectId(companyId)
            })
                .populate('bankAccountId', 'accountName bankName accountNumber accountType currentBalance')
                .populate('partyId', 'name mobile email address businessName companyName type')
                .populate('referenceId')
                .lean();

            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    message: 'Transaction not found or access denied',
                    debug: {
                        transactionId: id,
                        companyId: companyId
                    }
                });
            }

            console.log('✅ Transaction found:', {
                id: transaction._id,
                type: transaction.transactionType,
                amount: transaction.amount
            });

            res.status(200).json({
                success: true,
                data: transaction,
                meta: {
                    timestamp: new Date().toISOString(),
                    method: 'getTransactionById'
                }
            });

        } catch (error) {
            console.error('❌ Error getting transaction by ID:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get transaction',
                error: {
                    message: error.message,
                    code: error.code || 'INTERNAL_ERROR'
                }
            });
        }
    },

    // ✅ ENHANCED: Create transaction with proper balance synchronization
    createTransaction: async (req, res) => {
        try {
            const companyId = req.companyId || req.params.companyId || req.body.companyId;
            const {
                bankAccountId,
                amount,
                direction,
                transactionType,
                paymentMethod = 'cash',
                description,
                notes,
                partyId,
                partyName,
                partyType,
                chequeNumber,
                chequeDate,
                upiTransactionId,
                bankTransactionId,
                referenceId,
                referenceNumber,
                referenceType,
                transactionDate,
                // ✅ NEW: Cash payment specific fields
                isCashTransaction,
                cashAmount,
                cashTransactionType
            } = req.body;

            // ✅ CRITICAL FIX: Detect cash payments
            const isCashPayment = paymentMethod === 'cash' ||
                isCashTransaction === true ||
                cashAmount !== undefined ||
                cashTransactionType !== undefined;

            console.log('🏦 Creating transaction:', {
                companyId,
                bankAccountId,
                amount: parseFloat(amount),
                direction,
                transactionType,
                paymentMethod,
                isCashPayment
            });

            // ✅ ENHANCED: Comprehensive validation with cash payment exemption
            const validationErrors = [];

            if (!companyId) validationErrors.push('Company ID is required');

            // ✅ FIXED: Only require bank account for non-cash payments
            if (!isCashPayment && !bankAccountId) {
                validationErrors.push('Bank account ID is required for non-cash payments');
            }

            if (!amount) validationErrors.push('Amount is required');
            if (!direction) validationErrors.push('Direction is required');
            if (!transactionType) validationErrors.push('Transaction type is required');
            if (!description?.trim()) validationErrors.push('Description is required');

            if (validationErrors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validationErrors,
                    receivedFields: {
                        companyId: !!companyId,
                        bankAccountId: !!bankAccountId,
                        amount: !!amount,
                        direction: !!direction,
                        transactionType: !!transactionType,
                        description: !!description?.trim(),
                        paymentMethod: paymentMethod,
                        isCashPayment: isCashPayment
                    }
                });
            }

            // Validate ObjectIds
            if (!mongoose.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid company ID format'
                });
            }

            // ✅ FIXED: Only validate bank account ID for non-cash payments
            if (!isCashPayment && bankAccountId) {
                if (!mongoose.Types.ObjectId.isValid(bankAccountId)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid bank account ID format'
                    });
                }
            }

            // Parse and validate amount
            const transactionAmount = parseFloat(amount);
            if (isNaN(transactionAmount) || transactionAmount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Amount must be a valid positive number',
                    receivedAmount: amount,
                    parsedAmount: transactionAmount
                });
            }

            // Validate direction
            if (!['in', 'out'].includes(direction)) {
                return res.status(400).json({
                    success: false,
                    message: 'Direction must be either "in" or "out"',
                    receivedDirection: direction
                });
            }

            console.log('📝 Creating transaction...');

            // ✅ FIXED: Handle cash vs bank account transactions differently
            let transaction, updatedBankAccount, finalBalance;

            try {
                // ✅ STEP 1: Create transaction with appropriate structure
                const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // ✅ FIXED: Map referenceType to valid enum values
                let validReferenceType = 'payment'; // Default fallback
                if (referenceType) {
                    const referenceTypeMap = {
                        'payment_in': 'payment',
                        'payment_out': 'payment',
                        'sale': 'sale',
                        'purchase': 'purchase',
                        'invoice': 'invoice',
                        'expense': 'expense',
                        'transfer': 'transfer',
                        'adjustment': 'adjustment'
                    };
                    validReferenceType = referenceTypeMap[referenceType] || referenceType || 'payment';
                }

                const transactionData = {
                    transactionId,
                    companyId: new mongoose.Types.ObjectId(companyId),
                    amount: transactionAmount,
                    direction,
                    transactionType: transactionType.trim(),
                    referenceType: validReferenceType, // ✅ FIXED: Use valid enum value
                    paymentMethod: paymentMethod.trim(),
                    description: description.trim(),
                    notes: notes?.trim() || '',
                    status: 'completed',
                    createdFrom: 'manual',
                    createdBy: req.user?.id || 'system',
                    transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
                    metadata: {
                        userAgent: req.headers['user-agent'],
                        ipAddress: req.ip || req.connection.remoteAddress,
                        timestamp: new Date().toISOString()
                    }
                };

                // ✅ CRITICAL FIX: Handle schema fields based on payment type
                if (isCashPayment) {
                    // ✅ CASH PAYMENT: Don't include bank account fields, use default/null values for required fields
                    transactionData.isCashTransaction = true;
                    transactionData.cashAmount = transactionAmount;
                    transactionData.cashTransactionType = cashTransactionType || (direction === 'in' ? 'cash_in' : 'cash_out');

                    // ✅ SCHEMA FIX: Provide default values for required fields that don't apply to cash
                    // Don't include bankAccountId at all for cash payments
                    // Set balance fields to 0 instead of null if they're required by schema
                    transactionData.balanceBefore = 0;
                    transactionData.balanceAfter = 0;
                } else {
                    // ✅ BANK PAYMENT: Include all bank-related fields
                    if (!bankAccountId) {
                        throw new Error('Bank account ID is required for non-cash payments');
                    }

                    transactionData.bankAccountId = new mongoose.Types.ObjectId(bankAccountId);
                    transactionData.balanceBefore = 0; // Will be updated after bank account operation
                    transactionData.balanceAfter = 0;  // Will be updated after bank account operation
                }

                // Add party information if provided
                if (partyId && mongoose.Types.ObjectId.isValid(partyId)) {
                    transactionData.partyId = new mongoose.Types.ObjectId(partyId);
                }
                if (partyName?.trim()) transactionData.partyName = partyName.trim();
                if (partyType) transactionData.partyType = partyType;

                // Add reference information if provided
                if (referenceId && mongoose.Types.ObjectId.isValid(referenceId)) {
                    transactionData.referenceId = new mongoose.Types.ObjectId(referenceId);
                }
                if (referenceNumber?.trim()) transactionData.referenceNumber = referenceNumber.trim();

                // Add payment-specific details
                if (chequeNumber?.trim()) transactionData.chequeNumber = chequeNumber.trim();
                if (chequeDate) transactionData.chequeDate = new Date(chequeDate);
                if (upiTransactionId?.trim()) transactionData.upiTransactionId = upiTransactionId.trim();
                if (bankTransactionId?.trim()) transactionData.bankTransactionId = bankTransactionId.trim();

                console.log('📤 Transaction data prepared:', {
                    isCashPayment,
                    hasBankAccountId: !!transactionData.bankAccountId,
                    referenceType: transactionData.referenceType,
                    balanceBefore: transactionData.balanceBefore,
                    balanceAfter: transactionData.balanceAfter
                });

                transaction = new Transaction(transactionData);
                await transaction.save();

                console.log(`✅ ${isCashPayment ? 'Cash' : 'Bank'} transaction created`);

                // ✅ STEP 2: Update bank account balance only for non-cash payments
                if (!isCashPayment && bankAccountId) {
                    const bankUpdateOperation = direction === 'in'
                        ? { $inc: { currentBalance: transactionAmount, totalTransactions: 1, totalCredits: transactionAmount } }
                        : { $inc: { currentBalance: -transactionAmount, totalTransactions: 1, totalDebits: transactionAmount } };

                    bankUpdateOperation.$set = { lastTransactionDate: new Date() };

                    // Use findOneAndUpdate with returnDocument: 'after' to get updated balance
                    updatedBankAccount = await BankAccount.findOneAndUpdate(
                        {
                            _id: new mongoose.Types.ObjectId(bankAccountId),
                            companyId: new mongoose.Types.ObjectId(companyId)
                        },
                        bankUpdateOperation,
                        {
                            new: true,
                            runValidators: true,
                            upsert: false
                        }
                    );

                    if (!updatedBankAccount) {
                        throw new Error('Bank account not found or access denied');
                    }

                    finalBalance = parseFloat(updatedBankAccount.currentBalance);
                    const balanceBefore = direction === 'in'
                        ? finalBalance - transactionAmount
                        : finalBalance + transactionAmount;

                    console.log('🏦 Bank account updated:', {
                        balanceBefore,
                        transactionAmount,
                        direction,
                        finalBalance,
                        accountName: updatedBankAccount.accountName
                    });

                    // ✅ STEP 3: Update transaction with actual balance information
                    await Transaction.findByIdAndUpdate(
                        transaction._id,
                        {
                            balanceBefore,
                            balanceAfter: finalBalance
                        }
                    );

                    transaction.balanceBefore = balanceBefore;
                    transaction.balanceAfter = finalBalance;
                } else {
                    console.log('💰 Cash transaction completed - no bank account update needed');
                }

                // Populate transaction for response (conditionally populate bankAccountId)
                const populateOptions = [
                    { path: 'partyId', select: 'name mobile email businessName companyName' },
                    { path: 'referenceId' }
                ];

                if (transaction.bankAccountId) {
                    populateOptions.push({
                        path: 'bankAccountId',
                        select: 'accountName bankName accountNumber accountType currentBalance'
                    });
                }

                await transaction.populate(populateOptions);

                console.log('🎉 Transaction completed successfully!', {
                    transactionId: transaction.transactionId,
                    isCashPayment: isCashPayment,
                    finalBalance: finalBalance || 'N/A (Cash)'
                });

                // ✅ FIXED: Response with proper structure for both cash and bank transactions
                const responseData = {
                    _id: transaction._id,
                    transactionId: transaction.transactionId,
                    amount: transaction.amount,
                    direction: transaction.direction,
                    transactionType: transaction.transactionType,
                    description: transaction.description,
                    status: transaction.status,
                    transactionDate: transaction.transactionDate,
                    paymentMethod: transaction.paymentMethod,
                    notes: transaction.notes,
                    partyId: transaction.partyId,
                    partyName: transaction.partyName,
                    createdAt: transaction.createdAt,
                    // ✅ CONDITIONAL: Include bank-specific fields only for non-cash transactions
                    ...(transaction.bankAccountId && {
                        bankAccountId: transaction.bankAccountId,
                        balanceBefore: transaction.balanceBefore,
                        balanceAfter: transaction.balanceAfter
                    }),
                    // ✅ CASH SPECIFIC: Include cash-specific fields for cash transactions
                    ...(isCashPayment && {
                        isCashTransaction: transaction.isCashTransaction,
                        cashAmount: transaction.cashAmount,
                        cashTransactionType: transaction.cashTransactionType
                    })
                };

                res.status(201).json({
                    success: true,
                    message: `${isCashPayment ? 'Cash' : 'Bank'} transaction created successfully`,
                    data: responseData,
                    // ✅ CONDITIONAL: Add balance info only for bank transactions
                    ...(updatedBankAccount && {
                        balanceInfo: {
                            transactionBalanceAfter: transaction.balanceAfter,
                            bankCurrentBalance: updatedBankAccount.currentBalance,
                            balancesMatch: Math.abs(transaction.balanceAfter - updatedBankAccount.currentBalance) < 0.01,
                            accountName: updatedBankAccount.accountName
                        }
                    }),
                    // ✅ CASH INFO: Add cash transaction info
                    ...(isCashPayment && {
                        cashInfo: {
                            cashAmount: transactionAmount,
                            cashDirection: direction,
                            cashTransactionType: transactionData.cashTransactionType,
                            noBankAccount: 'Cash transaction - no bank account involved'
                        }
                    })
                });

            } catch (operationError) {
                console.error('❌ Error during transaction/bank update:', operationError);

                // If bank account update fails, try to rollback transaction creation
                try {
                    if (transaction && transaction._id) {
                        await Transaction.findByIdAndDelete(transaction._id);
                        console.log('🔄 Transaction rollback completed');
                    }
                } catch (rollbackError) {
                    console.error('❌ Rollback failed:', rollbackError.message);
                }

                throw operationError;
            }

        } catch (error) {
            console.error('❌ Error creating transaction:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create transaction',
                error: {
                    message: error.message,
                    code: error.code || 'INTERNAL_ERROR'
                },
                debug: process.env.NODE_ENV === 'development' ? {
                    stack: error.stack,
                    body: req.body,
                    params: req.params
                } : undefined
            });
        }
    },

    // ✅ FIXED: Update transaction without MongoDB sessions
    updateTransaction: async (req, res) => {
        try {
            const { id } = req.params;
            const companyId = req.companyId || req.params.companyId || req.body.companyId;
            const {
                amount,
                direction,
                transactionType,
                paymentMethod,
                description,
                notes,
                partyId,
                partyName,
                partyType,
                chequeNumber,
                chequeDate,
                upiTransactionId,
                bankTransactionId,
                referenceNumber,
                referenceType,
                transactionDate
            } = req.body;

            console.log('🔄 Updating transaction:', { transactionId: id, companyId });

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid transaction ID format',
                    providedId: id
                });
            }

            if (!mongoose.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid company ID format',
                    providedCompanyId: companyId
                });
            }

            // Find the existing transaction
            const existingTransaction = await Transaction.findOne({
                _id: new mongoose.Types.ObjectId(id),
                companyId: new mongoose.Types.ObjectId(companyId)
            }).populate('bankAccountId');

            if (!existingTransaction) {
                return res.status(404).json({
                    success: false,
                    message: 'Transaction not found or access denied'
                });
            }

            // Check if transaction can be updated
            if (existingTransaction.status === 'reconciled') {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot update reconciled transaction',
                    code: 'TRANSACTION_RECONCILED'
                });
            }

            let updatedTransaction, updatedBankAccount;

            try {
                // Build update data
                const updateData = {
                    lastModifiedBy: req.user?.id || 'admin',
                    lastModifiedDate: new Date()
                };

                let balanceAdjustment = 0;
                let needsBalanceUpdate = false;

                // Handle amount update
                if (amount !== undefined) {
                    const newAmount = parseFloat(amount);
                    if (isNaN(newAmount) || newAmount <= 0) {
                        throw new Error('Amount must be a valid positive number');
                    }

                    const oldAmount = parseFloat(existingTransaction.amount);
                    if (newAmount !== oldAmount) {
                        updateData.amount = newAmount;

                        // Calculate balance adjustment
                        const amountDiff = newAmount - oldAmount;
                        if (existingTransaction.direction === 'in') {
                            balanceAdjustment += amountDiff;
                        } else {
                            balanceAdjustment -= amountDiff;
                        }
                        needsBalanceUpdate = true;
                    }
                }

                // Handle direction update
                if (direction && direction !== existingTransaction.direction) {
                    if (!['in', 'out'].includes(direction)) {
                        throw new Error('Direction must be either "in" or "out"');
                    }

                    updateData.direction = direction;

                    // Direction change requires double adjustment
                    const currentAmount = amount ? parseFloat(amount) : existingTransaction.amount;
                    if (existingTransaction.direction === 'in' && direction === 'out') {
                        // Was adding, now subtracting
                        balanceAdjustment -= (currentAmount * 2);
                    } else if (existingTransaction.direction === 'out' && direction === 'in') {
                        // Was subtracting, now adding
                        balanceAdjustment += (currentAmount * 2);
                    }
                    needsBalanceUpdate = true;
                }

                // Update other fields
                if (transactionType?.trim()) updateData.transactionType = transactionType.trim();
                if (paymentMethod?.trim()) updateData.paymentMethod = paymentMethod.trim();
                if (description?.trim()) updateData.description = description.trim();
                if (notes !== undefined) updateData.notes = notes?.trim() || '';
                if (partyId && mongoose.Types.ObjectId.isValid(partyId)) {
                    updateData.partyId = new mongoose.Types.ObjectId(partyId);
                }
                if (partyName?.trim()) updateData.partyName = partyName.trim();
                if (partyType) updateData.partyType = partyType;
                if (referenceNumber?.trim()) updateData.referenceNumber = referenceNumber.trim();
                if (referenceType?.trim()) updateData.referenceType = referenceType.trim();
                if (chequeNumber?.trim()) updateData.chequeNumber = chequeNumber.trim();
                if (chequeDate) updateData.chequeDate = new Date(chequeDate);
                if (upiTransactionId?.trim()) updateData.upiTransactionId = upiTransactionId.trim();
                if (bankTransactionId?.trim()) updateData.bankTransactionId = bankTransactionId.trim();
                if (transactionDate) updateData.transactionDate = new Date(transactionDate);

                // Update transaction first
                updatedTransaction = await Transaction.findOneAndUpdate(
                    {
                        _id: new mongoose.Types.ObjectId(id),
                        companyId: new mongoose.Types.ObjectId(companyId)
                    },
                    updateData,
                    { new: true, runValidators: true }
                );

                // Update bank account balance if needed
                if (needsBalanceUpdate && balanceAdjustment !== 0) {
                    const bankAccount = existingTransaction.bankAccountId;
                    const currentBalance = parseFloat(bankAccount.currentBalance || 0);
                    const newBalance = currentBalance + balanceAdjustment;

                    // Check for sufficient funds if decreasing balance
                    if (balanceAdjustment < 0 && newBalance < 0) {
                        const allowOverdraft = process.env.ALLOW_OVERDRAFT === 'true' || false;
                        if (!allowOverdraft) {
                            throw new Error('Insufficient funds for transaction update');
                        }
                    }

                    updatedBankAccount = await BankAccount.findByIdAndUpdate(
                        bankAccount._id,
                        {
                            currentBalance: newBalance,
                            lastTransactionDate: new Date()
                        },
                        { new: true }
                    );

                    // Update balance fields in transaction
                    updateData.balanceBefore = currentBalance;
                    updateData.balanceAfter = newBalance;

                    console.log('🏦 Bank account balance updated:', {
                        previousBalance: currentBalance,
                        adjustment: balanceAdjustment,
                        newBalance
                    });
                }

                console.log('✅ Transaction and bank account updated successfully');

            } catch (updateError) {
                console.error('❌ Transaction update failed:', updateError);
                throw updateError;
            }

            // Populate updated transaction for response
            await updatedTransaction.populate([
                { path: 'bankAccountId', select: 'accountName bankName accountNumber accountType currentBalance' },
                { path: 'partyId', select: 'name mobile email businessName companyName' },
                { path: 'referenceId' }
            ]);

            console.log('✅ Transaction updated successfully:', {
                id: updatedTransaction._id,
                type: updatedTransaction.transactionType,
                amount: updatedTransaction.amount
            });

            res.status(200).json({
                success: true,
                message: 'Transaction updated successfully',
                data: {
                    transaction: updatedTransaction.toObject(),
                    bankAccount: updatedBankAccount ? {
                        id: updatedBankAccount._id,
                        name: updatedBankAccount.accountName,
                        newBalance: updatedBankAccount.currentBalance,
                        balanceChange: balanceAdjustment !== 0 ?
                            (balanceAdjustment > 0 ? `+₹${balanceAdjustment}` : `-₹${Math.abs(balanceAdjustment)}`) :
                            'No change'
                    } : null
                },
                meta: {
                    timestamp: new Date().toISOString(),
                    method: 'updateTransaction',
                    updatedFields: Object.keys(updateData || {}),
                    balanceAdjustment
                }
            });

        } catch (error) {
            console.error('❌ Error updating transaction:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update transaction',
                error: {
                    message: error.message,
                    code: error.code || 'INTERNAL_ERROR'
                }
            });
        }
    },

    // ✅ FIXED: Delete transaction without MongoDB sessions
    deleteTransaction: async (req, res) => {
        try {
            const { id } = req.params;
            const companyId = req.companyId || req.params.companyId;

            console.log('🗑️ Deleting transaction:', { transactionId: id, companyId });

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid transaction ID format',
                    providedId: id
                });
            }

            if (!mongoose.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid company ID format',
                    providedCompanyId: companyId
                });
            }

            // Find the transaction first to check if it exists and get bank account info
            const transaction = await Transaction.findOne({
                _id: new mongoose.Types.ObjectId(id),
                companyId: new mongoose.Types.ObjectId(companyId)
            }).populate('bankAccountId');

            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    message: 'Transaction not found or access denied'
                });
            }

            // Check if transaction can be deleted (business logic)
            if (transaction.status === 'reconciled') {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete reconciled transaction',
                    code: 'TRANSACTION_RECONCILED'
                });
            }

            let deletedTransaction, updatedBankAccount;

            try {
                // Store transaction data before deletion
                deletedTransaction = transaction.toObject();

                // Delete the transaction
                await Transaction.findOneAndDelete({
                    _id: new mongoose.Types.ObjectId(id),
                    companyId: new mongoose.Types.ObjectId(companyId)
                });

                // Update bank account balance (reverse the transaction)
                if (transaction.bankAccountId) {
                    const bankAccount = transaction.bankAccountId;
                    const currentBalance = parseFloat(bankAccount.currentBalance || 0);
                    let newBalance;

                    // Reverse the transaction effect on balance
                    if (transaction.direction === 'in') {
                        newBalance = currentBalance - transaction.amount;
                    } else {
                        newBalance = currentBalance + transaction.amount;
                    }

                    const bankUpdateData = {
                        currentBalance: newBalance,
                        lastTransactionDate: new Date(),
                        $inc: {
                            totalTransactions: -1,
                            ...(transaction.direction === 'in'
                                ? { totalCredits: -transaction.amount }
                                : { totalDebits: -transaction.amount }
                            )
                        }
                    };

                    updatedBankAccount = await BankAccount.findByIdAndUpdate(
                        transaction.bankAccountId._id,
                        bankUpdateData,
                        { new: true }
                    );

                    console.log('🏦 Bank account balance updated after deletion:', {
                        previousBalance: currentBalance,
                        newBalance,
                        adjustment: transaction.direction === 'in' ? `-₹${transaction.amount}` : `+₹${transaction.amount}`
                    });
                }

                console.log('✅ Transaction deleted and bank account updated successfully');

            } catch (deleteError) {
                console.error('❌ Transaction deletion failed:', deleteError);
                throw deleteError;
            }

            console.log('🎉 Transaction deleted successfully!', {
                transactionId: id,
                amount: deletedTransaction.amount,
                direction: deletedTransaction.direction
            });

            res.status(200).json({
                success: true,
                message: 'Transaction deleted successfully',
                data: {
                    deletedTransaction: {
                        id: deletedTransaction._id,
                        transactionId: deletedTransaction.transactionId,
                        amount: deletedTransaction.amount,
                        direction: deletedTransaction.direction,
                        description: deletedTransaction.description,
                        transactionDate: deletedTransaction.transactionDate,
                        transactionType: deletedTransaction.transactionType
                    },
                    bankAccountUpdate: updatedBankAccount ? {
                        accountName: updatedBankAccount.accountName,
                        newBalance: updatedBankAccount.currentBalance,
                        balanceAdjustment: deletedTransaction.direction === 'in'
                            ? `-₹${deletedTransaction.amount}`
                            : `+₹${deletedTransaction.amount}`
                    } : null
                },
                meta: {
                    timestamp: new Date().toISOString(),
                    method: 'deleteTransaction'
                }
            });

        } catch (error) {
            console.error('❌ Error deleting transaction:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete transaction',
                error: {
                    message: error.message,
                    code: error.code || 'INTERNAL_ERROR'
                }
            });
        }
    },

    // ✅ ENHANCED: Get bank account transactions with better error handling
    getBankAccountTransactions: async (req, res) => {
        try {
            const { bankAccountId } = req.params;
            const companyId = req.companyId || req.params.companyId || req.query.companyId;
            const { page = 1, limit = 50, dateFrom, dateTo } = req.query;

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            if (!mongoose.Types.ObjectId.isValid(bankAccountId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid bank account ID'
                });
            }

            // ✅ ENHANCED: Build filter with proper ObjectId
            const filter = {
                bankAccountId: new mongoose.Types.ObjectId(bankAccountId),
                companyId: new mongoose.Types.ObjectId(companyId)
            };

            // Date range filter
            if (dateFrom || dateTo) {
                filter.transactionDate = {};
                if (dateFrom) filter.transactionDate.$gte = new Date(dateFrom);
                if (dateTo) {
                    const endDate = new Date(dateTo);
                    endDate.setHours(23, 59, 59, 999);
                    filter.transactionDate.$lte = endDate;
                }
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);
            const limitNum = parseInt(limit);

            const [transactions, totalTransactions, bankAccount] = await Promise.all([
                Transaction.find(filter)
                    .populate('partyId', 'name mobile businessName companyName')
                    .populate('bankAccountId', 'accountName bankName accountNumber')
                    .sort({ transactionDate: -1, createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum)
                    .lean(),
                Transaction.countDocuments(filter),
                BankAccount.findById(bankAccountId)
                    .select('accountName bankName accountNumber currentBalance accountType')
                    .lean()
            ]);

            const totalPages = Math.ceil(totalTransactions / limitNum);

            res.status(200).json({
                success: true,
                data: {
                    transactions,
                    bankAccount,
                    pagination: {
                        page: parseInt(page),
                        limit: limitNum,
                        total: totalTransactions,
                        totalPages,
                        hasNext: parseInt(page) < totalPages,
                        hasPrev: parseInt(page) > 1
                    }
                }
            });

        } catch (error) {
            console.error('❌ Error getting bank account transactions:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get bank account transactions',
                error: {
                    message: error.message,
                    code: error.code || 'INTERNAL_ERROR'
                }
            });
        }
    },

    // ✅ FIXED: Get transaction summary with direct calculation
    getTransactionSummary: async (req, res) => {
        try {
            const companyId = req.companyId || req.params.companyId || req.query.companyId;
            const { bankAccountId, period = 'month', dateFrom, dateTo } = req.query;

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            if (!mongoose.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid company ID format'
                });
            }

            // Calculate date range based on period
            let startDate, endDate;

            if (dateFrom && dateTo) {
                startDate = new Date(dateFrom);
                endDate = new Date(dateTo);
                endDate.setHours(23, 59, 59, 999); // End of day
            } else {
                const now = new Date();
                endDate = new Date(now);
                endDate.setHours(23, 59, 59, 999);

                switch (period) {
                    case 'today':
                        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        break;
                    case 'week':
                        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        break;
                    case 'month':
                        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                        break;
                    case 'year':
                        startDate = new Date(now.getFullYear(), 0, 1);
                        break;
                    default:
                        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                }
            }

            // ✅ FIXED: Direct calculation instead of calling non-existent model method
            const filter = {
                companyId: new mongoose.Types.ObjectId(companyId),
                transactionDate: { $gte: startDate, $lte: endDate }
            };

            if (bankAccountId && mongoose.Types.ObjectId.isValid(bankAccountId)) {
                filter.bankAccountId = new mongoose.Types.ObjectId(bankAccountId);
            }

            const summaryPipeline = [
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        totalTransactions: { $sum: 1 },
                        totalIn: {
                            $sum: {
                                $cond: [{ $eq: ['$direction', 'in'] }, '$amount', 0]
                            }
                        },
                        totalOut: {
                            $sum: {
                                $cond: [{ $eq: ['$direction', 'out'] }, '$amount', 0]
                            }
                        },
                        netAmount: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$direction', 'in'] },
                                    '$amount',
                                    { $multiply: ['$amount', -1] }
                                ]
                            }
                        }
                    }
                }
            ];

            const summaryResult = await Transaction.aggregate(summaryPipeline);
            const summary = summaryResult[0] || {
                totalTransactions: 0,
                totalIn: 0,
                totalOut: 0,
                netAmount: 0
            };

            // Get transaction type breakdown
            let typeBreakdown = [];
            try {
                typeBreakdown = await Transaction.aggregate([
                    { $match: filter },
                    {
                        $group: {
                            _id: '$transactionType',
                            count: { $sum: 1 },
                            totalAmount: { $sum: '$amount' },
                            totalIn: {
                                $sum: {
                                    $cond: [{ $eq: ['$direction', 'in'] }, '$amount', 0]
                                }
                            },
                            totalOut: {
                                $sum: {
                                    $cond: [{ $eq: ['$direction', 'out'] }, '$amount', 0]
                                }
                            }
                        }
                    },
                    { $sort: { totalAmount: -1 } }
                ]);
            } catch (typeError) {
                console.warn('⚠️ Error getting type breakdown:', typeError.message);
                typeBreakdown = [];
            }

            res.status(200).json({
                success: true,
                data: {
                    summary,
                    typeBreakdown,
                    period,
                    dateRange: {
                        startDate,
                        endDate
                    }
                },
                meta: {
                    timestamp: new Date().toISOString(),
                    method: 'getTransactionSummary'
                }
            });

        } catch (error) {
            console.error('❌ Error getting transaction summary:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get transaction summary',
                error: {
                    message: error.message,
                    code: error.code || 'INTERNAL_ERROR'
                }
            });
        }
    },

    // ✅ ENHANCED: Reconcile transaction with better validation
    reconcileTransaction: async (req, res) => {
        try {
            const { id } = req.params;
            const companyId = req.companyId || req.params.companyId;
            const { reconciled = true, notes } = req.body;

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid transaction ID'
                });
            }

            const updateData = {
                reconciled,
                lastModifiedBy: req.user?.id || 'admin',
                lastModifiedDate: new Date()
            };

            if (reconciled) {
                updateData.reconciledDate = new Date();
                updateData.reconciledBy = req.user?.id || 'admin';
            } else {
                updateData.reconciledDate = null;
                updateData.reconciledBy = null;
            }

            if (notes) {
                updateData.notes = notes;
            }

            const transaction = await Transaction.findOneAndUpdate(
                {
                    _id: new mongoose.Types.ObjectId(id),
                    companyId: new mongoose.Types.ObjectId(companyId)
                },
                updateData,
                { new: true, runValidators: true }
            ).populate('bankAccountId', 'accountName bankName accountNumber currentBalance');

            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    message: 'Transaction not found or access denied'
                });
            }

            console.log('✅ Transaction reconciliation updated:', {
                id: transaction._id,
                reconciled: transaction.reconciled,
                reconciledDate: transaction.reconciledDate
            });

            res.status(200).json({
                success: true,
                message: `Transaction ${reconciled ? 'reconciled' : 'unreconciled'} successfully`,
                data: transaction,
                meta: {
                    timestamp: new Date().toISOString(),
                    method: 'reconcileTransaction',
                    action: reconciled ? 'reconciled' : 'unreconciled'
                }
            });

        } catch (error) {
            console.error('❌ Error reconciling transaction:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to reconcile transaction',
                error: {
                    message: error.message,
                    code: error.code || 'INTERNAL_ERROR'
                }
            });
        }
    },

    // ✅ ENHANCED: Bulk reconcile transactions with better validation
    bulkReconcileTransactions: async (req, res) => {
        try {
            const companyId = req.companyId || req.params.companyId;
            const { transactionIds, reconciled = true, notes } = req.body;

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Transaction IDs array is required and cannot be empty'
                });
            }

            if (transactionIds.length > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot process more than 100 transactions at once'
                });
            }

            // Validate all transaction IDs
            const invalidIds = transactionIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
            if (invalidIds.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid transaction IDs found',
                    invalidIds
                });
            }

            const updateData = {
                reconciled,
                lastModifiedBy: req.user?.id || 'admin',
                lastModifiedDate: new Date()
            };

            if (reconciled) {
                updateData.reconciledDate = new Date();
                updateData.reconciledBy = req.user?.id || 'admin';
            } else {
                updateData.reconciledDate = null;
                updateData.reconciledBy = null;
            }

            if (notes) {
                updateData.notes = notes;
            }

            const result = await Transaction.updateMany(
                {
                    _id: { $in: transactionIds.map(id => new mongoose.Types.ObjectId(id)) },
                    companyId: new mongoose.Types.ObjectId(companyId)
                },
                updateData
            );

            console.log('✅ Bulk reconciliation completed:', {
                requested: transactionIds.length,
                matched: result.matchedCount,
                modified: result.modifiedCount,
                action: reconciled ? 'reconciled' : 'unreconciled'
            });

            res.status(200).json({
                success: true,
                message: `${result.modifiedCount} transactions ${reconciled ? 'reconciled' : 'unreconciled'} successfully`,
                data: {
                    matchedCount: result.matchedCount,
                    modifiedCount: result.modifiedCount,
                    requestedCount: transactionIds.length,
                    skippedCount: result.matchedCount - result.modifiedCount
                },
                meta: {
                    timestamp: new Date().toISOString(),
                    method: 'bulkReconcileTransactions',
                    action: reconciled ? 'reconciled' : 'unreconciled'
                }
            });

        } catch (error) {
            console.error('❌ Error bulk reconciling transactions:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to bulk reconcile transactions',
                error: {
                    message: error.message,
                    code: error.code || 'INTERNAL_ERROR'
                }
            });
        }
    },

    // ✅ NEW: Add balance verification method
    verifyBankAccountBalance: async (req, res) => {
        try {
            const { bankAccountId } = req.params;
            const companyId = req.companyId || req.params.companyId;

            if (!bankAccountId || !companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Bank account ID and company ID are required'
                });
            }

            // Get bank account current balance
            const bankAccount = await BankAccount.findOne({
                _id: new mongoose.Types.ObjectId(bankAccountId),
                companyId: new mongoose.Types.ObjectId(companyId)
            });

            if (!bankAccount) {
                return res.status(404).json({
                    success: false,
                    message: 'Bank account not found'
                });
            }

            // Calculate balance from transactions
            const transactions = await Transaction.find({
                bankAccountId: new mongoose.Types.ObjectId(bankAccountId),
                companyId: new mongoose.Types.ObjectId(companyId),
                status: 'completed'
            }).sort({ transactionDate: 1, createdAt: 1 });

            let calculatedBalance = parseFloat(bankAccount.openingBalance || 0);
            const transactionHistory = [];

            transactions.forEach(txn => {
                const prevBalance = calculatedBalance;

                if (txn.direction === 'in') {
                    calculatedBalance += txn.amount;
                } else {
                    calculatedBalance -= txn.amount;
                }

                transactionHistory.push({
                    transactionId: txn.transactionId,
                    amount: txn.amount,
                    direction: txn.direction,
                    balanceBefore: prevBalance,
                    balanceAfter: calculatedBalance,
                    storedBalanceAfter: txn.balanceAfter,
                    match: Math.abs(calculatedBalance - txn.balanceAfter) < 0.01
                });
            });

            const balanceMatch = Math.abs(calculatedBalance - bankAccount.currentBalance) < 0.01;

            res.status(200).json({
                success: true,
                data: {
                    bankAccount: {
                        id: bankAccount._id,
                        accountName: bankAccount.accountName,
                        openingBalance: bankAccount.openingBalance,
                        currentBalance: bankAccount.currentBalance,
                        totalTransactions: bankAccount.totalTransactions
                    },
                    verification: {
                        calculatedBalance,
                        storedBalance: bankAccount.currentBalance,
                        difference: calculatedBalance - bankAccount.currentBalance,
                        balancesMatch: balanceMatch,
                        totalTransactionsProcessed: transactions.length
                    },
                    transactionHistory: transactionHistory.slice(-10), // Last 10 transactions
                    summary: {
                        mismatches: transactionHistory.filter(t => !t.match).length,
                        lastTransaction: transactions[transactions.length - 1]
                    }
                }
            });

        } catch (error) {
            console.error('❌ Error verifying balance:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to verify balance',
                error: error.message
            });
        }
    },
    // ✅ ENHANCED: Get recent transactions with better validation
    getRecentTransactions: async (req, res) => {
        try {
            const companyId = req.companyId || req.params.companyId || req.query.companyId;
            const { limit = 10, bankAccountId, transactionType } = req.query;

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            if (!mongoose.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid company ID format'
                });
            }

            const limitNum = Math.min(parseInt(limit) || 10, 100); // Max 100 transactions

            // Build filter
            const filter = {
                companyId: new mongoose.Types.ObjectId(companyId)
            };

            if (bankAccountId && mongoose.Types.ObjectId.isValid(bankAccountId)) {
                filter.bankAccountId = new mongoose.Types.ObjectId(bankAccountId);
            }

            if (transactionType) {
                filter.transactionType = transactionType;
            }

            const transactions = await Transaction.find(filter)
                .populate('bankAccountId', 'accountName bankName accountNumber')
                .populate('partyId', 'name businessName companyName')
                .sort({ transactionDate: -1, createdAt: -1 })
                .limit(limitNum)
                .lean();

            console.log('✅ Recent transactions retrieved:', {
                count: transactions.length,
                limit: limitNum,
                companyId
            });

            res.status(200).json({
                success: true,
                data: transactions,
                meta: {
                    count: transactions.length,
                    limit: limitNum,
                    timestamp: new Date().toISOString(),
                    method: 'getRecentTransactions'
                }
            });

        } catch (error) {
            console.error('❌ Error getting recent transactions:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get recent transactions',
                error: {
                    message: error.message,
                    code: error.code || 'INTERNAL_ERROR'
                }
            });
        }
    }
};

module.exports = transactionController;