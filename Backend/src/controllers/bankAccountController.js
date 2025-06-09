const BankAccount = require('../models/BankAccount');
const mongoose = require('mongoose');

class BankAccountController {
    // Get all bank accounts for a company
    async getBankAccounts(req, res) {
        try {
            // ✅ UPDATED: Get companyId from middleware (req.companyId) or params
            const companyId = req.companyId || req.params.companyId;
            const { type, active = 'true', search, page = 1, limit = 50 } = req.query;

            console.log('📊 Getting bank accounts for company:', companyId);

            // Build query
            const query = { companyId };

            if (active !== 'all') {
                query.isActive = active === 'true';
            }

            if (type && type !== 'all') {
                query.type = type;
            }

            if (search) {
                query.$or = [
                    { accountName: { $regex: search, $options: 'i' } },
                    { accountNumber: { $regex: search, $options: 'i' } },
                    { bankName: { $regex: search, $options: 'i' } },
                    { accountHolderName: { $regex: search, $options: 'i' } }
                ];
            }

            // Execute query with pagination<<
            const accounts = await BankAccount.find(query)
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email')
                .sort({ createdAt: -1 })
                .limit(parseInt(limit))
                .skip((parseInt(page) - 1) * parseInt(limit));

            // Get total count
            const totalAccounts = await BankAccount.countDocuments(query);

            // Calculate summary
            const summary = await BankAccount.aggregate([
                { $match: { companyId: new mongoose.Types.ObjectId(companyId), isActive: true } },
                {
                    $group: {
                        _id: '$type',
                        totalBalance: { $sum: '$currentBalance' },
                        count: { $sum: 1 }
                    }
                }
            ]);

            res.json({
                success: true,
                data: {
                    accounts,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(totalAccounts / parseInt(limit)),
                        totalAccounts,
                        limit: parseInt(limit)
                    },
                    summary: summary.reduce((acc, item) => {
                        acc[item._id] = {
                            totalBalance: item.totalBalance,
                            count: item.count
                        };
                        return acc;
                    }, {}),
                    totalBalance: summary.reduce((sum, item) => sum + item.totalBalance, 0)
                }
            });

        } catch (error) {
            console.error('❌ Get bank accounts error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch bank accounts',
                error: error.message
            });
        }
    }

    // Get single bank account
    async getBankAccount(req, res) {
        try {
            const companyId = req.companyId || req.params.companyId;
            const { accountId } = req.params;

            console.log('📊 Getting bank account:', accountId, 'for company:', companyId);

            const account = await BankAccount.findOne({
                _id: accountId,
                companyId
            })
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email');

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Bank account not found'
                });
            }

            res.json({
                success: true,
                data: account
            });

        } catch (error) {
            console.error('❌ Get bank account error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch bank account',
                error: error.message
            });
        }
    }

    // Create new bank account
    async createBankAccount(req, res) {
        try {
            const companyId = req.companyId || req.params.companyId;
            const userId = req.user.id;

            console.log('➕ Creating bank account for company:', companyId, 'by user:', userId);

            // Validate required fields
            const {
                accountName,
                accountNumber,
                bankName,
                branchName,
                ifscCode,
                accountType = 'savings',
                accountHolderName,
                type = 'bank',
                openingBalance = 0,
                asOfDate,
                printUpiQrCodes = false,
                printBankDetails = false,
                upiId
            } = req.body;

            if (!accountName) {
                return res.status(400).json({
                    success: false,
                    message: 'Account name is required'
                });
            }

            // Check for duplicate account name in company
            const existingAccount = await BankAccount.findOne({
                companyId,
                accountName: { $regex: new RegExp(`^${accountName}$`, 'i') },
                isActive: true
            });

            if (existingAccount) {
                return res.status(400).json({
                    success: false,
                    message: 'Account with this name already exists'
                });
            }

            // Check for duplicate account number if provided
            if (accountNumber) {
                const existingAccountNumber = await BankAccount.findOne({
                    companyId,
                    accountNumber,
                    isActive: true
                });

                if (existingAccountNumber) {
                    return res.status(400).json({
                        success: false,
                        message: 'Account with this account number already exists'
                    });
                }
            }

            // Create bank account
            const bankAccount = new BankAccount({
                companyId,
                accountName,
                accountNumber,
                bankName,
                branchName,
                ifscCode: ifscCode?.toUpperCase(),
                accountType,
                accountHolderName,
                type,
                openingBalance: parseFloat(openingBalance) || 0,
                currentBalance: parseFloat(openingBalance) || 0,
                asOfDate: asOfDate || new Date(),
                printUpiQrCodes,
                printBankDetails,
                upiId: upiId?.toLowerCase(),
                createdBy: userId,
                isActive: true
            });

            await bankAccount.save();

            // Populate references
            await bankAccount.populate('createdBy', 'name email');

            console.log('✅ Bank account created successfully:', bankAccount._id);

            res.status(201).json({
                success: true,
                message: 'Bank account created successfully',
                data: bankAccount
            });

        } catch (error) {
            console.error('❌ Create bank account error:', error);

            if (error.name === 'ValidationError') {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: Object.values(error.errors).map(err => err.message)
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to create bank account',
                error: error.message
            });
        }
    }

    // Update bank account
    async updateBankAccount(req, res) {
        try {
            const companyId = req.companyId || req.params.companyId;
            const { accountId } = req.params;
            const userId = req.user.id;

            console.log('✏️ Updating bank account:', accountId, 'for company:', companyId);

            const account = await BankAccount.findOne({
                _id: accountId,
                companyId
            });

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Bank account not found'
                });
            }

            // Check for duplicate account name (excluding current account)
            if (req.body.accountName && req.body.accountName !== account.accountName) {
                const existingAccount = await BankAccount.findOne({
                    companyId,
                    accountName: { $regex: new RegExp(`^${req.body.accountName}$`, 'i') },
                    _id: { $ne: accountId },
                    isActive: true
                });

                if (existingAccount) {
                    return res.status(400).json({
                        success: false,
                        message: 'Account with this name already exists'
                    });
                }
            }

            // Check for duplicate account number (excluding current account)
            if (req.body.accountNumber && req.body.accountNumber !== account.accountNumber) {
                const existingAccountNumber = await BankAccount.findOne({
                    companyId,
                    accountNumber: req.body.accountNumber,
                    _id: { $ne: accountId },
                    isActive: true
                });

                if (existingAccountNumber) {
                    return res.status(400).json({
                        success: false,
                        message: 'Account with this account number already exists'
                    });
                }
            }

            // Update fields
            const updateFields = [
                'accountName', 'accountNumber', 'bankName', 'branchName', 'ifscCode',
                'accountType', 'accountHolderName', 'type', 'printUpiQrCodes',
                'printBankDetails', 'upiId', 'isActive'
            ];

            updateFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    if (field === 'ifscCode') {
                        account[field] = req.body[field]?.toUpperCase();
                    } else if (field === 'upiId') {
                        account[field] = req.body[field]?.toLowerCase();
                    } else {
                        account[field] = req.body[field];
                    }
                }
            });

            account.updatedBy = userId;
            await account.save();

            // Populate references
            await account.populate(['createdBy', 'updatedBy'], 'name email');

            console.log('✅ Bank account updated successfully:', accountId);

            res.json({
                success: true,
                message: 'Bank account updated successfully',
                data: account
            });

        } catch (error) {
            console.error('❌ Update bank account error:', error);

            if (error.name === 'ValidationError') {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: Object.values(error.errors).map(err => err.message)
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to update bank account',
                error: error.message
            });
        }
    }

    // Delete bank account (soft delete)
    async deleteBankAccount(req, res) {
        try {
            const companyId = req.companyId || req.params.companyId;
            const { accountId } = req.params;
            const userId = req.user.id;

            console.log('🗑️ Deleting bank account:', accountId, 'for company:', companyId);

            const account = await BankAccount.findOne({
                _id: accountId,
                companyId
            });

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Bank account not found'
                });
            }

            // Check if account has transactions (you might want to implement this check)
            // const hasTransactions = await Transaction.exists({ accountId: accountId });
            // if (hasTransactions) {
            //     return res.status(400).json({
            //         success: false,
            //         message: 'Cannot delete account with existing transactions'
            //     });
            // }

            // Soft delete
            account.isActive = false;
            account.updatedBy = userId;
            await account.save();

            console.log('✅ Bank account deleted successfully:', accountId);

            res.json({
                success: true,
                message: 'Bank account deleted successfully'
            });

        } catch (error) {
            console.error('❌ Delete bank account error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete bank account',
                error: error.message
            });
        }
    }

    // Get account summary
    async getAccountSummary(req, res) {
        try {
            const companyId = req.companyId || req.params.companyId;

            console.log('📊 Getting account summary for company:', companyId);

            const summary = await BankAccount.aggregate([
                { $match: { companyId: new mongoose.Types.ObjectId(companyId), isActive: true } },
                {
                    $group: {
                        _id: '$type',
                        totalBalance: { $sum: '$currentBalance' },
                        count: { $sum: 1 },
                        accounts: {
                            $push: {
                                _id: '$_id',
                                accountName: '$accountName',
                                currentBalance: '$currentBalance',
                                accountNumber: '$accountNumber'
                            }
                        }
                    }
                }
            ]);

            const totalBalance = summary.reduce((sum, item) => sum + item.totalBalance, 0);
            const totalAccounts = summary.reduce((sum, item) => sum + item.count, 0);

            res.json({
                success: true,
                data: {
                    summary,
                    totalBalance,
                    totalAccounts,
                    breakdown: summary.reduce((acc, item) => {
                        acc[item._id] = {
                            totalBalance: item.totalBalance,
                            count: item.count,
                            accounts: item.accounts
                        };
                        return acc;
                    }, {})
                }
            });

        } catch (error) {
            console.error('❌ Get account summary error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch account summary',
                error: error.message
            });
        }
    }

    // Update account balance
    async updateAccountBalance(req, res) {
        try {
            const companyId = req.companyId || req.params.companyId;
            const { accountId } = req.params;
            const { amount, type, reason } = req.body;

            console.log('💰 Updating account balance:', accountId, type, amount);

            if (!amount || !type) {
                return res.status(400).json({
                    success: false,
                    message: 'Amount and type are required'
                });
            }

            const account = await BankAccount.findOne({
                _id: accountId,
                companyId,
                isActive: true
            });

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Bank account not found'
                });
            }

            // Check if debit is possible
            if (type === 'debit' && !account.canDebit(amount)) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient balance for this transaction'
                });
            }

            // Update balance
            await account.updateBalance(amount, type);

            console.log('✅ Account balance updated successfully:', account.currentBalance);

            res.json({
                success: true,
                message: `Account balance ${type === 'credit' ? 'credited' : 'debited'} successfully`,
                data: {
                    accountId: account._id,
                    newBalance: account.currentBalance,
                    transactionAmount: amount,
                    transactionType: type
                }
            });

        } catch (error) {
            console.error('❌ Update account balance error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update account balance',
                error: error.message
            });
        }
    }

    // Validate account details
    async validateAccountDetails(req, res) {
        try {
            const companyId = req.companyId || req.params.companyId;
            const { accountName, accountNumber, ifscCode } = req.query;

            console.log('✅ Validating account details for company:', companyId);

            const validationErrors = [];

            // Check account name uniqueness
            if (accountName) {
                const existingName = await BankAccount.findOne({
                    companyId,
                    accountName: { $regex: new RegExp(`^${accountName}$`, 'i') },
                    isActive: true
                });

                if (existingName) {
                    validationErrors.push('Account name already exists');
                }
            }

            // Check account number uniqueness
            if (accountNumber) {
                const existingNumber = await BankAccount.findOne({
                    companyId,
                    accountNumber,
                    isActive: true
                });

                if (existingNumber) {
                    validationErrors.push('Account number already exists');
                }
            }

            // Validate IFSC code format
            if (ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase())) {
                validationErrors.push('Invalid IFSC code format');
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
                error: error.message
            });
        }
    }
}

module.exports = new BankAccountController();