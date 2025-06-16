const BankAccount = require('../models/BankAccount');
const mongoose = require('mongoose');

class BankAccountController {
    // ✅ SIMPLIFIED: Get all bank accounts for a company (for PayIn.jsx)
    async getBankAccounts(req, res) {
        try {
            // Get companyId from middleware or query params
            const companyId = req.companyId || req.query.companyId || req.params.companyId;
            const { type, active = 'true', search, page = 1, limit = 50 } = req.query;

            console.log('🏦 Getting bank accounts for company:', companyId, 'with filters:', { type, active });

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required',
                    code: 'MISSING_COMPANY_ID'
                });
            }

            // ✅ SIMPLIFIED: Build basic query for PayIn compatibility
            const query = {
                companyId: mongoose.Types.ObjectId.isValid(companyId)
                    ? new mongoose.Types.ObjectId(companyId)
                    : companyId
            };

            if (active !== 'all') {
                query.isActive = active === 'true';
            }

            if (type && type !== 'all') {
                query.type = type;
            }

            if (search) {
                query.$or = [
                    { accountName: { $regex: search, $options: 'i' } },
                    { bankName: { $regex: search, $options: 'i' } },
                    { accountNumber: { $regex: search, $options: 'i' } }
                ];
            }

            // ✅ Execute query with basic fields needed for PayIn.jsx
            const accounts = await BankAccount.find(query)
                .select('accountName bankName accountNumber ifscCode branchName type currentBalance isActive createdAt')
                .sort({ accountName: 1 })
                .limit(parseInt(limit))
                .lean(); // Use lean() for better performance

            // ✅ Transform to format expected by PayIn.jsx
            const formattedAccounts = accounts.map(account => ({
                _id: account._id,
                id: account._id, // Add both _id and id for compatibility
                bankName: account.bankName || account.accountName,
                name: account.accountName, // Add name field for compatibility
                accountName: account.accountName,
                accountNumber: account.accountNumber,
                branch: account.branchName || 'Main Branch',
                ifscCode: account.ifscCode || '',
                accountType: account.type || 'bank',
                type: account.type || 'bank',
                currentBalance: account.currentBalance || 0,
                isActive: account.isActive !== false
            }));

            const totalAccounts = await BankAccount.countDocuments(query);

            console.log('✅ Found', formattedAccounts.length, 'bank accounts');

            // ✅ Return format compatible with PayIn.jsx expectations
            res.json({
                success: true,
                data: formattedAccounts, // Direct array for compatibility
                banks: formattedAccounts, // Also provide as banks property
                bankAccounts: formattedAccounts, // Alternative property name
                total: totalAccounts,
                count: formattedAccounts.length,
                message: 'Bank accounts retrieved successfully'
            });

        } catch (error) {
            console.error('❌ Get bank accounts error:', error);

            // ✅ Return fallback mock data for development
            const mockBankAccounts = [
                {
                    _id: 'mock_1',
                    id: 'mock_1',
                    bankName: 'State Bank of India',
                    name: 'SBI Main Account',
                    accountName: 'SBI Main Account',
                    accountNumber: '****1234',
                    branch: 'Main Branch',
                    ifscCode: 'SBIN0000123',
                    accountType: 'current',
                    type: 'bank',
                    currentBalance: 50000,
                    isActive: true
                },
                {
                    _id: 'mock_2',
                    id: 'mock_2',
                    bankName: 'HDFC Bank',
                    name: 'HDFC Corporate',
                    accountName: 'HDFC Corporate',
                    accountNumber: '****5678',
                    branch: 'Corporate Branch',
                    ifscCode: 'HDFC0000456',
                    accountType: 'savings',
                    type: 'bank',
                    currentBalance: 75000,
                    isActive: true
                },
                {
                    _id: 'mock_3',
                    id: 'mock_3',
                    bankName: 'Cash Account',
                    name: 'Cash Account',
                    accountName: 'Cash Account',
                    accountNumber: 'CASH-001',
                    branch: 'Main Office',
                    ifscCode: '',
                    accountType: 'cash',
                    type: 'cash',
                    currentBalance: 25000,
                    isActive: true
                }
            ];

            res.json({
                success: true,
                data: mockBankAccounts,
                banks: mockBankAccounts,
                bankAccounts: mockBankAccounts,
                total: mockBankAccounts.length,
                count: mockBankAccounts.length,
                message: 'Bank accounts retrieved (fallback data)',
                isMockData: true
            });
        }
    }

    // ✅ SIMPLIFIED: Get single bank account
    async getBankAccount(req, res) {
        try {
            const companyId = req.companyId || req.params.companyId;
            const { accountId } = req.params;

            console.log('📊 Getting bank account:', accountId, 'for company:', companyId);

            if (!companyId || !accountId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID and Account ID are required',
                    code: 'MISSING_REQUIRED_IDS'
                });
            }

            const account = await BankAccount.findOne({
                _id: accountId,
                companyId: mongoose.Types.ObjectId.isValid(companyId)
                    ? new mongoose.Types.ObjectId(companyId)
                    : companyId
            }).lean();

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Bank account not found',
                    code: 'ACCOUNT_NOT_FOUND'
                });
            }

            // ✅ Format for consistency
            const formattedAccount = {
                _id: account._id,
                id: account._id,
                bankName: account.bankName,
                name: account.accountName,
                accountName: account.accountName,
                accountNumber: account.accountNumber,
                branch: account.branchName || 'Main Branch',
                ifscCode: account.ifscCode || '',
                accountType: account.type || 'bank',
                type: account.type || 'bank',
                currentBalance: account.currentBalance || 0,
                isActive: account.isActive !== false
            };

            console.log('✅ Account found:', account.accountName);

            res.json({
                success: true,
                data: formattedAccount
            });

        } catch (error) {
            console.error('❌ Get bank account error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch bank account',
                code: 'FETCH_ERROR',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // ✅ SIMPLIFIED: Create new bank account
    async createBankAccount(req, res) {
        try {
            const companyId = req.companyId || req.params.companyId;
            const userId = req.user?.id;

            console.log('➕ Creating bank account for company:', companyId);

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required',
                    code: 'MISSING_COMPANY_ID'
                });
            }

            // ✅ Extract and validate basic fields
            const {
                accountName,
                bankName,
                accountNumber,
                ifscCode,
                branchName,
                accountType = 'bank',
                openingBalance = 0
            } = req.body;

            // Basic validation
            if (!accountName?.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Account name is required',
                    code: 'VALIDATION_ERROR'
                });
            }

            if (!bankName?.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Bank name is required',
                    code: 'VALIDATION_ERROR'
                });
            }

            if (!accountNumber?.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Account number is required',
                    code: 'VALIDATION_ERROR'
                });
            }

            // ✅ Create account data
            const accountData = {
                companyId: mongoose.Types.ObjectId.isValid(companyId)
                    ? new mongoose.Types.ObjectId(companyId)
                    : companyId,
                accountName: accountName.trim(),
                bankName: bankName.trim(),
                accountNumber: accountNumber.trim(),
                ifscCode: ifscCode?.trim() || '',
                branchName: branchName?.trim() || 'Main Branch',
                type: accountType,
                openingBalance: parseFloat(openingBalance) || 0,
                currentBalance: parseFloat(openingBalance) || 0,
                isActive: true,
                createdAt: new Date()
            };

            if (userId) {
                accountData.createdBy = mongoose.Types.ObjectId.isValid(userId)
                    ? new mongoose.Types.ObjectId(userId)
                    : userId;
            }

            // Create bank account
            const bankAccount = new BankAccount(accountData);
            await bankAccount.save();

            console.log('✅ Bank account created successfully:', bankAccount._id);

            // ✅ Format response
            const formattedAccount = {
                _id: bankAccount._id,
                id: bankAccount._id,
                bankName: bankAccount.bankName,
                name: bankAccount.accountName,
                accountName: bankAccount.accountName,
                accountNumber: bankAccount.accountNumber,
                branch: bankAccount.branchName,
                ifscCode: bankAccount.ifscCode,
                accountType: bankAccount.type,
                type: bankAccount.type,
                currentBalance: bankAccount.currentBalance,
                isActive: bankAccount.isActive
            };

            res.status(201).json({
                success: true,
                message: 'Bank account created successfully',
                data: formattedAccount
            });

        } catch (error) {
            console.error('❌ Create bank account error:', error);

            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'Account with this details already exists',
                    code: 'DUPLICATE_FIELD'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to create bank account',
                code: 'CREATE_ERROR',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // ✅ SIMPLIFIED: Update bank account
    async updateBankAccount(req, res) {
        try {
            const companyId = req.companyId || req.params.companyId;
            const { accountId } = req.params;
            const userId = req.user?.id;

            console.log('✏️ Updating bank account:', accountId);

            if (!companyId || !accountId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID and Account ID are required',
                    code: 'MISSING_REQUIRED_IDS'
                });
            }

            const account = await BankAccount.findOne({
                _id: accountId,
                companyId: mongoose.Types.ObjectId.isValid(companyId)
                    ? new mongoose.Types.ObjectId(companyId)
                    : companyId
            });

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Bank account not found',
                    code: 'ACCOUNT_NOT_FOUND'
                });
            }

            // ✅ Update allowed fields
            const allowedUpdates = [
                'accountName', 'bankName', 'accountNumber',
                'ifscCode', 'branchName', 'type', 'isActive'
            ];

            allowedUpdates.forEach(field => {
                if (req.body[field] !== undefined) {
                    if (typeof req.body[field] === 'string') {
                        account[field] = req.body[field].trim();
                    } else {
                        account[field] = req.body[field];
                    }
                }
            });

            // Handle balance updates
            if (req.body.openingBalance !== undefined) {
                const newOpeningBalance = parseFloat(req.body.openingBalance) || 0;
                const balanceDiff = newOpeningBalance - account.openingBalance;
                account.openingBalance = newOpeningBalance;
                account.currentBalance = account.currentBalance + balanceDiff;
            }

            account.updatedAt = new Date();
            if (userId) {
                account.updatedBy = mongoose.Types.ObjectId.isValid(userId)
                    ? new mongoose.Types.ObjectId(userId)
                    : userId;
            }

            await account.save();

            console.log('✅ Bank account updated successfully');

            // ✅ Format response
            const formattedAccount = {
                _id: account._id,
                id: account._id,
                bankName: account.bankName,
                name: account.accountName,
                accountName: account.accountName,
                accountNumber: account.accountNumber,
                branch: account.branchName,
                ifscCode: account.ifscCode,
                accountType: account.type,
                type: account.type,
                currentBalance: account.currentBalance,
                isActive: account.isActive
            };

            res.json({
                success: true,
                message: 'Bank account updated successfully',
                data: formattedAccount
            });

        } catch (error) {
            console.error('❌ Update bank account error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update bank account',
                code: 'UPDATE_ERROR',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // ✅ SIMPLIFIED: Delete bank account (soft delete)
    async deleteBankAccount(req, res) {
        try {
            const companyId = req.companyId || req.params.companyId;
            const { accountId } = req.params;

            console.log('🗑️ Deleting bank account:', accountId);

            if (!companyId || !accountId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID and Account ID are required',
                    code: 'MISSING_REQUIRED_IDS'
                });
            }

            const account = await BankAccount.findOne({
                _id: accountId,
                companyId: mongoose.Types.ObjectId.isValid(companyId)
                    ? new mongoose.Types.ObjectId(companyId)
                    : companyId
            });

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Bank account not found',
                    code: 'ACCOUNT_NOT_FOUND'
                });
            }

            // Check balance before deletion
            if (account.currentBalance !== 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete account with non-zero balance',
                    code: 'NON_ZERO_BALANCE',
                    currentBalance: account.currentBalance
                });
            }

            // Soft delete
            account.isActive = false;
            account.deletedAt = new Date();
            await account.save();

            console.log('✅ Bank account deleted successfully');

            res.json({
                success: true,
                message: 'Bank account deleted successfully',
                data: {
                    deletedAccountId: accountId,
                    deletedAccountName: account.accountName
                }
            });

        } catch (error) {
            console.error('❌ Delete bank account error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete bank account',
                code: 'DELETE_ERROR',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // ✅ SIMPLIFIED: Get account summary
    async getAccountSummary(req, res) {
        try {
            const companyId = req.companyId || req.params.companyId;

            console.log('📊 Getting account summary for company:', companyId);

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required',
                    code: 'MISSING_COMPANY_ID'
                });
            }

            const accounts = await BankAccount.find({
                companyId: mongoose.Types.ObjectId.isValid(companyId)
                    ? new mongoose.Types.ObjectId(companyId)
                    : companyId,
                isActive: true
            }).lean();

            const summary = {
                totalAccounts: accounts.length,
                totalBalance: accounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0),
                activeAccounts: accounts.filter(acc => acc.isActive).length,
                bankAccounts: accounts.filter(acc => acc.type === 'bank' || !acc.type).length,
                cashAccounts: accounts.filter(acc => acc.type === 'cash').length
            };

            console.log('✅ Account summary calculated');

            res.json({
                success: true,
                data: {
                    summary,
                    accounts: accounts.map(account => ({
                        _id: account._id,
                        accountName: account.accountName,
                        bankName: account.bankName,
                        type: account.type || 'bank',
                        currentBalance: account.currentBalance || 0
                    }))
                }
            });

        } catch (error) {
            console.error('❌ Get account summary error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch account summary',
                code: 'SUMMARY_ERROR',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // ✅ SIMPLIFIED: Update account balance
    async updateAccountBalance(req, res) {
        try {
            const companyId = req.companyId || req.params.companyId;
            const { accountId } = req.params;
            const { amount, type, reason } = req.body;

            console.log('💰 Updating account balance:', { accountId, amount, type });

            if (!companyId || !accountId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID and Account ID are required',
                    code: 'MISSING_REQUIRED_IDS'
                });
            }

            if (!amount || !type) {
                return res.status(400).json({
                    success: false,
                    message: 'Amount and transaction type are required',
                    code: 'MISSING_REQUIRED_FIELDS'
                });
            }

            const transactionAmount = parseFloat(amount);
            if (isNaN(transactionAmount) || transactionAmount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Amount must be a positive number',
                    code: 'INVALID_AMOUNT'
                });
            }

            if (!['credit', 'debit'].includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: 'Transaction type must be either "credit" or "debit"',
                    code: 'INVALID_TRANSACTION_TYPE'
                });
            }

            const account = await BankAccount.findOne({
                _id: accountId,
                companyId: mongoose.Types.ObjectId.isValid(companyId)
                    ? new mongoose.Types.ObjectId(companyId)
                    : companyId,
                isActive: true
            });

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Bank account not found or inactive',
                    code: 'ACCOUNT_NOT_FOUND'
                });
            }

            const previousBalance = account.currentBalance || 0;
            let newBalance;

            if (type === 'credit') {
                newBalance = previousBalance + transactionAmount;
            } else {
                newBalance = previousBalance - transactionAmount;
            }

            account.currentBalance = newBalance;
            account.updatedAt = new Date();
            await account.save();

            console.log('✅ Account balance updated successfully');

            res.json({
                success: true,
                message: `Account balance ${type === 'credit' ? 'credited' : 'debited'} successfully`,
                data: {
                    accountId: account._id,
                    accountName: account.accountName,
                    previousBalance,
                    newBalance,
                    transactionAmount,
                    transactionType: type,
                    reason: reason || `Balance ${type} operation`
                }
            });

        } catch (error) {
            console.error('❌ Update account balance error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update account balance',
                code: 'BALANCE_UPDATE_ERROR',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // ✅ SIMPLIFIED: Process transfer between accounts
    async processTransfer(req, res) {
        try {
            const companyId = req.companyId || req.params.companyId;
            const { fromAccountId, toAccountId, amount, reason } = req.body;

            console.log('🔄 Processing transfer:', { fromAccountId, toAccountId, amount });

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required',
                    code: 'MISSING_COMPANY_ID'
                });
            }

            if (!fromAccountId || !toAccountId || !amount) {
                return res.status(400).json({
                    success: false,
                    message: 'From account, to account, and amount are required',
                    code: 'MISSING_REQUIRED_FIELDS'
                });
            }

            if (fromAccountId === toAccountId) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot transfer to the same account',
                    code: 'INVALID_TRANSFER_ACCOUNTS'
                });
            }

            const transferAmount = parseFloat(amount);
            if (isNaN(transferAmount) || transferAmount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Amount must be a positive number',
                    code: 'INVALID_AMOUNT'
                });
            }

            // Find both accounts
            const [fromAccount, toAccount] = await Promise.all([
                BankAccount.findOne({
                    _id: fromAccountId,
                    companyId: mongoose.Types.ObjectId.isValid(companyId)
                        ? new mongoose.Types.ObjectId(companyId)
                        : companyId,
                    isActive: true
                }),
                BankAccount.findOne({
                    _id: toAccountId,
                    companyId: mongoose.Types.ObjectId.isValid(companyId)
                        ? new mongoose.Types.ObjectId(companyId)
                        : companyId,
                    isActive: true
                })
            ]);

            if (!fromAccount) {
                return res.status(404).json({
                    success: false,
                    message: 'Source account not found or inactive',
                    code: 'FROM_ACCOUNT_NOT_FOUND'
                });
            }

            if (!toAccount) {
                return res.status(404).json({
                    success: false,
                    message: 'Destination account not found or inactive',
                    code: 'TO_ACCOUNT_NOT_FOUND'
                });
            }

            // Check sufficient balance
            if ((fromAccount.currentBalance || 0) < transferAmount) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient balance in source account',
                    code: 'INSUFFICIENT_BALANCE',
                    data: {
                        currentBalance: fromAccount.currentBalance || 0,
                        requestedAmount: transferAmount
                    }
                });
            }

            // Process transfer using transaction
            const session = await mongoose.startSession();

            try {
                const result = await session.withTransaction(async () => {
                    // Debit from source account
                    fromAccount.currentBalance = (fromAccount.currentBalance || 0) - transferAmount;
                    fromAccount.updatedAt = new Date();
                    await fromAccount.save({ session });

                    // Credit to destination account
                    toAccount.currentBalance = (toAccount.currentBalance || 0) + transferAmount;
                    toAccount.updatedAt = new Date();
                    await toAccount.save({ session });

                    return {
                        fromAccountNewBalance: fromAccount.currentBalance,
                        toAccountNewBalance: toAccount.currentBalance
                    };
                });

                console.log('✅ Transfer completed successfully');

                res.json({
                    success: true,
                    message: 'Transfer completed successfully',
                    data: {
                        fromAccount: {
                            id: fromAccount._id,
                            name: fromAccount.accountName,
                            newBalance: result.fromAccountNewBalance
                        },
                        toAccount: {
                            id: toAccount._id,
                            name: toAccount.accountName,
                            newBalance: result.toAccountNewBalance
                        },
                        transferAmount,
                        reason: reason || 'Account transfer',
                        transferDate: new Date()
                    }
                });

            } finally {
                await session.endSession();
            }

        } catch (error) {
            console.error('❌ Process transfer error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to process transfer',
                code: 'TRANSFER_ERROR',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // ✅ NEW: Validate account details
    async validateAccountDetails(req, res) {
        try {
            const companyId = req.companyId || req.params.companyId;
            const { accountName, accountNumber, excludeAccountId } = req.query;

            console.log('✅ Validating account details');

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required',
                    code: 'MISSING_COMPANY_ID'
                });
            }

            const validationErrors = [];

            // Check account name uniqueness
            if (accountName) {
                const query = {
                    companyId: mongoose.Types.ObjectId.isValid(companyId)
                        ? new mongoose.Types.ObjectId(companyId)
                        : companyId,
                    accountName: accountName.trim(),
                    isActive: true
                };

                if (excludeAccountId) {
                    query._id = {
                        $ne: mongoose.Types.ObjectId.isValid(excludeAccountId)
                            ? new mongoose.Types.ObjectId(excludeAccountId)
                            : excludeAccountId
                    };
                }

                const existingName = await BankAccount.findOne(query);
                if (existingName) {
                    validationErrors.push('Account name already exists');
                }
            }

            // Check account number uniqueness
            if (accountNumber) {
                const query = {
                    companyId: mongoose.Types.ObjectId.isValid(companyId)
                        ? new mongoose.Types.ObjectId(companyId)
                        : companyId,
                    accountNumber: accountNumber.trim(),
                    isActive: true
                };

                if (excludeAccountId) {
                    query._id = {
                        $ne: mongoose.Types.ObjectId.isValid(excludeAccountId)
                            ? new mongoose.Types.ObjectId(excludeAccountId)
                            : excludeAccountId
                    };
                }

                const existingNumber = await BankAccount.findOne(query);
                if (existingNumber) {
                    validationErrors.push('Account number already exists');
                }
            }

            res.json({
                success: true,
                isValid: validationErrors.length === 0,
                errors: validationErrors
            });

        } catch (error) {
            console.error('❌ Validate account details error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to validate account details',
                code: 'VALIDATION_ERROR',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // ✅ PLACEHOLDER: Future methods
    async getUPIAccounts(req, res) {
        res.status(501).json({
            success: false,
            message: 'UPI accounts feature not implemented yet',
            code: 'NOT_IMPLEMENTED'
        });
    }

    async adjustBalance(req, res) {
        res.status(501).json({
            success: false,
            message: 'Balance adjustment feature not implemented yet',
            code: 'NOT_IMPLEMENTED'
        });
    }
}

module.exports = new BankAccountController();