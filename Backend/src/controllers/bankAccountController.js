const BankAccount = require('../models/BankAccount');
const mongoose = require('mongoose');

class BankAccountController {
    // Get all bank accounts for a company
    async getBankAccounts(req, res) {
        try {
            // ✅ UPDATED: Get companyId from middleware (req.companyId) or params
            const companyId = req.companyId || req.params.companyId;
            const { type, active = 'true', search, page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

            console.log('📊 Getting bank accounts for company:', companyId, 'with filters:', { type, active, search });

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required',
                    code: 'MISSING_COMPANY_ID'
                });
            }

            // Build query
            const query = { companyId: new mongoose.Types.ObjectId(companyId) };

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
                    { upiId: { $regex: search, $options: 'i' } }, // ✅ Added UPI ID search
                    { mobileNumber: { $regex: search, $options: 'i' } }, // ✅ Added mobile search
                    { accountHolderName: { $regex: search, $options: 'i' } }
                ];
            }

            // ✅ ENHANCED: Build sort object
            const sortObj = {};
            if (sortBy === 'balance') {
                sortObj.currentBalance = sortOrder === 'asc' ? 1 : -1;
            } else if (sortBy === 'name') {
                sortObj.accountName = sortOrder === 'asc' ? 1 : -1;
            } else if (sortBy === 'type') {
                sortObj.type = sortOrder === 'asc' ? 1 : -1;
                sortObj.accountName = 1; // Secondary sort by name
            } else {
                sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;
            }

            // Execute query with pagination
            const accounts = await BankAccount.find(query)
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email')
                .sort(sortObj)
                .limit(parseInt(limit))
                .skip((parseInt(page) - 1) * parseInt(limit));

            // Get total count
            const totalAccounts = await BankAccount.countDocuments(query);

            // ✅ ENHANCED: Calculate summary with UPI stats
            const summary = await BankAccount.aggregate([
                { $match: { companyId: new mongoose.Types.ObjectId(companyId), isActive: true } },
                {
                    $group: {
                        _id: '$type',
                        totalBalance: { $sum: '$currentBalance' },
                        count: { $sum: 1 },
                        avgBalance: { $avg: '$currentBalance' },
                        // ✅ UPI-specific aggregation
                        upiEnabledCount: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$type', 'upi'] },
                                            { $ne: ['$upiId', null] },
                                            { $ne: ['$upiId', ''] },
                                            { $ne: ['$mobileNumber', null] },
                                            { $ne: ['$mobileNumber', ''] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]);

            console.log('✅ Found', accounts.length, 'accounts out of', totalAccounts, 'total');

            res.json({
                success: true,
                data: {
                    accounts,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(totalAccounts / parseInt(limit)),
                        totalAccounts,
                        limit: parseInt(limit),
                        hasNextPage: parseInt(page) < Math.ceil(totalAccounts / parseInt(limit)),
                        hasPrevPage: parseInt(page) > 1
                    },
                    summary: summary.reduce((acc, item) => {
                        acc[item._id] = {
                            totalBalance: item.totalBalance,
                            count: item.count,
                            avgBalance: item.avgBalance,
                            ...(item._id === 'upi' && {
                                upiEnabledCount: item.upiEnabledCount
                            })
                        };
                        return acc;
                    }, {}),
                    totalBalance: summary.reduce((sum, item) => sum + item.totalBalance, 0),
                    filters: { type, active, search, sortBy, sortOrder }
                }
            });

        } catch (error) {
            console.error('❌ Get bank accounts error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch bank accounts',
                code: 'FETCH_ERROR',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // Get single bank account
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
                companyId: new mongoose.Types.ObjectId(companyId)
            })
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email');

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Bank account not found',
                    code: 'ACCOUNT_NOT_FOUND'
                });
            }

            // ✅ ENHANCED: Add account capabilities info
            const accountData = {
                ...account.toObject(),
                capabilities: {
                    canReceiveUPI: account.type === 'upi' && account.upiId && account.mobileNumber && account.isActive,
                    canTransfer: account.isActive && account.currentBalance > 0,
                    canEdit: account.isActive,
                    canDelete: account.isActive && account.currentBalance === 0
                }
            };

            console.log('✅ Account found:', account.accountName, `(${account.type})`);

            res.json({
                success: true,
                data: accountData
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

    // ✅ UPDATED: Create new bank account with enhanced validation
    async createBankAccount(req, res) {
        try {
            const companyId = req.companyId || req.params.companyId;
            const userId = req.user.id;

            console.log('➕ Creating bank account for company:', companyId, 'by user:', userId);
            console.log('📝 Request body:', req.body);

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required',
                    code: 'MISSING_COMPANY_ID'
                });
            }

            // ✅ UPDATED: Extract fields based on new schema
            const {
                accountName,
                type = 'bank',
                bankName,
                accountNumber,
                ifscCode,
                branchName,
                upiId,
                mobileNumber,
                openingBalance = 0,
                asOfDate,
                // Legacy fields for backward compatibility
                accountType = 'savings',
                accountHolderName,
                printUpiQrCodes = false,
                printBankDetails = false
            } = req.body;

            // ✅ ENHANCED: Validate required fields based on account type
            const errors = [];

            if (!accountName?.trim()) {
                errors.push('Account display name is required');
            }

            if (!type || !['bank', 'upi'].includes(type)) {
                errors.push('Account type must be either "bank" or "upi"');
            }

            // ✅ Common bank fields validation (required for both bank and UPI)
            if (!bankName?.trim()) {
                errors.push('Bank name is required');
            }

            if (!accountNumber?.trim()) {
                errors.push('Account number is required');
            }

            if (!ifscCode?.trim()) {
                errors.push('IFSC code is required');
            }

            // ✅ Validate IFSC format
            if (ifscCode) {
                const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
                if (!ifscRegex.test(ifscCode.toUpperCase())) {
                    errors.push('Invalid IFSC code format (e.g., SBIN0001234)');
                }
            }

            // ✅ UPI-specific validation
            if (type === 'upi') {
                if (!upiId?.trim()) {
                    errors.push('UPI ID is required for UPI accounts');
                }

                if (!mobileNumber?.trim()) {
                    errors.push('Mobile number is required for UPI accounts');
                }

                // Validate UPI ID format
                if (upiId) {
                    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
                    if (!upiRegex.test(upiId)) {
                        errors.push('Invalid UPI ID format (e.g., user@paytm)');
                    }
                }

                // Validate mobile number format
                if (mobileNumber) {
                    const mobileRegex = /^[6-9]\d{9}$/;
                    if (!mobileRegex.test(mobileNumber)) {
                        errors.push('Invalid mobile number (10 digits starting with 6-9)');
                    }
                }
            }

            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    errors
                });
            }

            // ✅ ENHANCED: Use model validation method
            const fieldsToValidate = {
                accountName: accountName.trim(),
                accountNumber: accountNumber.trim()
            };

            if (type === 'upi' && upiId) {
                fieldsToValidate.upiId = upiId.toLowerCase().trim();
            }

            const validationResult = await BankAccount.validateUniqueness(companyId, fieldsToValidate);

            if (!validationResult.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    code: 'UNIQUENESS_ERROR',
                    errors: validationResult.errors
                });
            }

            // ✅ UPDATED: Create account data based on type
            const accountData = {
                companyId: new mongoose.Types.ObjectId(companyId),
                accountName: accountName.trim(),
                type,
                bankName: bankName.trim(),
                accountNumber: accountNumber.trim(),
                ifscCode: ifscCode.toUpperCase().trim(),
                branchName: branchName?.trim() || '',
                openingBalance: parseFloat(openingBalance) || 0,
                currentBalance: parseFloat(openingBalance) || 0,
                asOfDate: asOfDate ? new Date(asOfDate) : new Date(),
                createdBy: new mongoose.Types.ObjectId(userId),
                isActive: true,
                // Legacy fields
                accountType,
                accountHolderName: accountHolderName?.trim() || '',
                printUpiQrCodes,
                printBankDetails
            };

            // ✅ Add UPI-specific fields if UPI account
            if (type === 'upi') {
                accountData.upiId = upiId.toLowerCase().trim();
                accountData.mobileNumber = mobileNumber.trim();
            }

            console.log('💾 Creating account with data:', {
                accountName: accountData.accountName,
                type: accountData.type,
                bankName: accountData.bankName,
                hasUpiId: !!accountData.upiId,
                hasMobileNumber: !!accountData.mobileNumber
            });

            // Create bank account
            const bankAccount = new BankAccount(accountData);
            await bankAccount.save();

            // Populate references
            await bankAccount.populate('createdBy', 'name email');

            console.log('✅ Bank account created successfully:', bankAccount._id);

            res.status(201).json({
                success: true,
                message: `${type === 'upi' ? 'UPI' : 'Bank'} account created successfully`,
                data: bankAccount
            });

        } catch (error) {
            console.error('❌ Create bank account error:', error);

            if (error.name === 'ValidationError') {
                const validationErrors = Object.values(error.errors).map(err => err.message);
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    code: 'VALIDATION_ERROR',
                    errors: validationErrors
                });
            }

            if (error.code === 11000) {
                // Handle unique constraint violations
                const field = Object.keys(error.keyPattern)[0];
                return res.status(400).json({
                    success: false,
                    message: `An account with this ${field} already exists`,
                    code: 'DUPLICATE_FIELD',
                    field
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

    // ✅ FULLY UPDATED: Update bank account with enhanced validation and UPI support
    async updateBankAccount(req, res) {
        try {
            const companyId = req.companyId || req.params.companyId;
            const { accountId } = req.params;
            const userId = req.user.id;

            console.log('✏️ Updating bank account:', accountId, 'for company:', companyId);
            console.log('📝 Update data received:', req.body);

            if (!companyId || !accountId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID and Account ID are required',
                    code: 'MISSING_REQUIRED_IDS'
                });
            }

            // ✅ FIXED: Find the account with proper error handling
            const account = await BankAccount.findOne({
                _id: accountId,
                companyId: new mongoose.Types.ObjectId(companyId),
                isActive: true
            });

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Bank account not found or inactive',
                    code: 'ACCOUNT_NOT_FOUND'
                });
            }

            console.log('📋 Current account data:', {
                name: account.accountName,
                type: account.type,
                balance: account.currentBalance,
                upiId: account.upiId,
                mobileNumber: account.mobileNumber
            });

            // ✅ FIXED: Determine final account type after update
            const finalAccountType = req.body.type || account.type;
            const isChangingToUPI = finalAccountType === 'upi';
            const currentlyUPI = account.type === 'upi';

            console.log('🔄 Type change analysis:', {
                currentType: account.type,
                newType: req.body.type,
                finalType: finalAccountType,
                isChangingToUPI,
                currentlyUPI
            });

            // ✅ ENHANCED: Validate uniqueness for changed fields with proper undefined handling
            const fieldsToValidate = {};

            if (req.body.accountName !== undefined && req.body.accountName !== null) {
                const newAccountName = typeof req.body.accountName === 'string' ? req.body.accountName.trim() : String(req.body.accountName).trim();
                if (newAccountName && newAccountName !== account.accountName) {
                    fieldsToValidate.accountName = newAccountName;
                }
            }

            if (req.body.accountNumber !== undefined && req.body.accountNumber !== null) {
                const newAccountNumber = typeof req.body.accountNumber === 'string' ? req.body.accountNumber.trim() : String(req.body.accountNumber).trim();
                if (newAccountNumber && newAccountNumber !== account.accountNumber) {
                    fieldsToValidate.accountNumber = newAccountNumber;
                }
            }

            if (req.body.upiId !== undefined && req.body.upiId !== null) {
                const newUpiId = typeof req.body.upiId === 'string' ? req.body.upiId.toLowerCase().trim() : String(req.body.upiId).toLowerCase().trim();
                const currentUpiId = account.upiId || '';
                if (newUpiId && newUpiId !== currentUpiId) {
                    fieldsToValidate.upiId = newUpiId;
                }
            }

            console.log('🔍 Fields to validate for uniqueness:', fieldsToValidate);

            if (Object.keys(fieldsToValidate).length > 0) {
                try {
                    const validationResult = await BankAccount.validateUniqueness(
                        companyId,
                        fieldsToValidate,
                        accountId
                    );

                    if (!validationResult.isValid) {
                        return res.status(400).json({
                            success: false,
                            message: 'Validation failed',
                            code: 'VALIDATION_ERROR',
                            errors: validationResult.errors
                        });
                    }
                } catch (validationError) {
                    console.error('❌ Validation error:', validationError);
                    return res.status(500).json({
                        success: false,
                        message: 'Error during validation',
                        code: 'VALIDATION_ERROR',
                        error: validationError.message
                    });
                }
            }

            // ✅ FIXED: Enhanced validation for UPI fields
            const validationErrors = [];

            if (req.body.ifscCode) {
                const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
                if (!ifscRegex.test(req.body.ifscCode.toUpperCase())) {
                    validationErrors.push('Invalid IFSC code format (e.g., SBIN0001234)');
                }
            }

            if (req.body.upiId) {
                const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
                if (!upiRegex.test(req.body.upiId)) {
                    validationErrors.push('Invalid UPI ID format (e.g., user@paytm)');
                }
            }

            if (req.body.mobileNumber) {
                const mobileRegex = /^[6-9]\d{9}$/;
                if (!mobileRegex.test(req.body.mobileNumber)) {
                    validationErrors.push('Invalid mobile number (10 digits starting with 6-9)');
                }
            }

            // ✅ FIXED: UPI-specific validation based on final type
            if (isChangingToUPI) {
                const finalUpiId = req.body.upiId || account.upiId;
                const finalMobileNumber = req.body.mobileNumber || account.mobileNumber;

                console.log('🔍 UPI validation check:', {
                    finalUpiId: finalUpiId,
                    finalMobileNumber: finalMobileNumber,
                    hasUpiIdInRequest: !!req.body.upiId,
                    hasMobileInRequest: !!req.body.mobileNumber,
                    hasUpiIdInAccount: !!account.upiId,
                    hasMobileInAccount: !!account.mobileNumber
                });

                if (!finalUpiId || finalUpiId.trim() === '') {
                    validationErrors.push('UPI ID is required for UPI accounts');
                }

                if (!finalMobileNumber || finalMobileNumber.trim() === '') {
                    validationErrors.push('Mobile number is required for UPI accounts');
                }
            }

            if (validationErrors.length > 0) {
                console.log('❌ Validation errors found:', validationErrors);
                return res.status(400).json({
                    success: false,
                    message: 'Field validation failed',
                    code: 'FIELD_VALIDATION_ERROR',
                    errors: validationErrors
                });
            }

            // ✅ ENHANCED: Define updatable fields with validation and transformation
            const updateableFields = {
                // Basic account information
                accountName: (value) => {
                    if (value === undefined || value === null) return account.accountName;
                    const trimmed = typeof value === 'string' ? value.trim() : String(value).trim();
                    return trimmed || account.accountName;
                },
                type: (value) => value || account.type,

                // Bank details (always present)
                bankName: (value) => {
                    if (value === undefined || value === null) return account.bankName;
                    const trimmed = typeof value === 'string' ? value.trim() : String(value).trim();
                    return trimmed || account.bankName;
                },
                accountNumber: (value) => {
                    if (value === undefined || value === null) return account.accountNumber;
                    const trimmed = typeof value === 'string' ? value.trim() : String(value).trim();
                    return trimmed || account.accountNumber;
                },
                ifscCode: (value) => {
                    if (value === undefined || value === null) return account.ifscCode;
                    const trimmed = typeof value === 'string' ? value.toUpperCase().trim() : String(value).toUpperCase().trim();
                    return trimmed || account.ifscCode;
                },
                branchName: (value) => {
                    if (value === undefined) return account.branchName;
                    if (value === null || value === '') return '';
                    return typeof value === 'string' ? value.trim() : String(value).trim();
                },

                // ✅ FIXED: UPI details with proper undefined/null handling
                upiId: (value) => {
                    if (value === undefined) return account.upiId || '';
                    if (value === null || value === '') return '';
                    const trimmed = typeof value === 'string' ? value.toLowerCase().trim() : String(value).toLowerCase().trim();
                    return trimmed;
                },
                mobileNumber: (value) => {
                    if (value === undefined) return account.mobileNumber || '';
                    if (value === null || value === '') return '';
                    return typeof value === 'string' ? value.trim() : String(value).trim();
                },

                // Legacy fields
                accountType: (value) => value || account.accountType,
                accountHolderName: (value) => {
                    if (value === undefined) return account.accountHolderName;
                    if (value === null || value === '') return '';
                    return typeof value === 'string' ? value.trim() : String(value).trim();
                },

                // Settings
                printUpiQrCodes: (value) => value !== undefined ? Boolean(value) : account.printUpiQrCodes,
                printBankDetails: (value) => value !== undefined ? Boolean(value) : account.printBankDetails,
                isActive: (value) => value !== undefined ? Boolean(value) : account.isActive
            };

            // ✅ ENHANCED: Track changes for logging
            const changes = {};
            let hasChanges = false;

            // Apply updates with proper validation and transformation
            Object.keys(updateableFields).forEach(field => {
                if (req.body[field] !== undefined) {
                    const newValue = updateableFields[field](req.body[field]);
                    const oldValue = account[field];

                    if (newValue !== oldValue) {
                        changes[field] = { from: oldValue, to: newValue };
                        account[field] = newValue;
                        hasChanges = true;
                    }
                }
            });

            // ✅ ENHANCED: Handle opening balance updates (special case)
            if (req.body.openingBalance !== undefined) {
                const newOpeningBalance = parseFloat(req.body.openingBalance) || 0;
                if (newOpeningBalance !== account.openingBalance) {
                    const balanceDifference = newOpeningBalance - account.openingBalance;

                    changes.openingBalance = {
                        from: account.openingBalance,
                        to: newOpeningBalance
                    };
                    changes.currentBalance = {
                        from: account.currentBalance,
                        to: account.currentBalance + balanceDifference
                    };

                    account.openingBalance = newOpeningBalance;
                    account.currentBalance = account.currentBalance + balanceDifference;
                    hasChanges = true;

                    console.log('💰 Opening balance updated:', {
                        oldOpening: changes.openingBalance.from,
                        newOpening: newOpeningBalance,
                        oldCurrent: changes.currentBalance.from,
                        newCurrent: account.currentBalance,
                        difference: balanceDifference
                    });
                }
            }

            // ✅ ENHANCED: Handle date updates
            if (req.body.asOfDate) {
                const newAsOfDate = new Date(req.body.asOfDate);
                if (newAsOfDate.getTime() !== account.asOfDate.getTime()) {
                    changes.asOfDate = {
                        from: account.asOfDate,
                        to: newAsOfDate
                    };
                    account.asOfDate = newAsOfDate;
                    hasChanges = true;
                }
            }

            // ✅ FIXED: Handle type-specific changes for UPI conversion
            if (isChangingToUPI && !currentlyUPI) {
                // Converting bank account to UPI account
                console.log('🔄 Converting bank account to UPI account');
                hasChanges = true;
            }

            // ✅ Check if any changes were made
            if (!hasChanges) {
                return res.status(200).json({
                    success: true,
                    message: 'No changes detected',
                    data: account
                });
            }

            // ✅ ENHANCED: Update metadata
            account.updatedBy = new mongoose.Types.ObjectId(userId);
            account.updatedAt = new Date();

            // ✅ FIXED: Save with validation and better error handling
            try {
                console.log('💾 Saving account with final data:', {
                    accountName: account.accountName,
                    type: account.type,
                    hasUpiId: !!account.upiId,
                    hasMobileNumber: !!account.mobileNumber,
                    upiIdValue: account.upiId,
                    mobileNumberValue: account.mobileNumber
                });

                await account.save();

                console.log('✅ Account saved successfully');
            } catch (saveError) {
                console.error('❌ Save error:', saveError);

                if (saveError.name === 'ValidationError') {
                    const validationErrors = Object.values(saveError.errors).map(err => ({
                        field: err.path,
                        message: err.message,
                        value: err.value
                    }));

                    return res.status(400).json({
                        success: false,
                        message: 'Validation failed during save',
                        code: 'VALIDATION_ERROR',
                        errors: validationErrors
                    });
                }

                throw saveError;
            }

            // ✅ ENHANCED: Populate references for response
            await account.populate([
                { path: 'createdBy', select: 'name email' },
                { path: 'updatedBy', select: 'name email' }
            ]);

            // ✅ ENHANCED: Log successful update
            console.log('✅ Bank account updated successfully:', {
                accountId: account._id,
                accountName: account.accountName,
                type: account.type,
                changesCount: Object.keys(changes).length,
                changes: changes
            });

            // ✅ ENHANCED: Comprehensive response
            res.json({
                success: true,
                message: `${account.type === 'upi' ? 'UPI' : 'Bank'} account updated successfully`,
                data: account,
                meta: {
                    changesApplied: Object.keys(changes).length,
                    changes: changes,
                    lastUpdated: account.updatedAt,
                    updatedBy: account.updatedBy
                }
            });

        } catch (error) {
            console.error('❌ Update bank account error:', error);

            // ✅ ENHANCED: Detailed error handling
            if (error.name === 'CastError') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid account ID format',
                    code: 'INVALID_ID_FORMAT',
                    error: error.message
                });
            }

            if (error.name === 'ValidationError') {
                const validationErrors = Object.values(error.errors).map(err => ({
                    field: err.path,
                    message: err.message,
                    value: err.value
                }));

                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    code: 'VALIDATION_ERROR',
                    errors: validationErrors
                });
            }

            if (error.code === 11000) {
                // Handle duplicate key error
                const field = Object.keys(error.keyPattern)[0];
                return res.status(400).json({
                    success: false,
                    message: `Duplicate ${field} detected`,
                    code: 'DUPLICATE_FIELD',
                    field: field
                });
            }

            // ✅ Generic server error
            res.status(500).json({
                success: false,
                message: 'Failed to update bank account',
                code: 'INTERNAL_SERVER_ERROR',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
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

            if (!companyId || !accountId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID and Account ID are required',
                    code: 'MISSING_REQUIRED_IDS'
                });
            }

            const account = await BankAccount.findOne({
                _id: accountId,
                companyId: new mongoose.Types.ObjectId(companyId)
            });

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Bank account not found',
                    code: 'ACCOUNT_NOT_FOUND'
                });
            }

            // ✅ ENHANCED: Check account balance before deletion
            if (account.currentBalance !== 0) {
                console.warn('⚠️ Attempting to delete account with non-zero balance:', account.currentBalance);
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete account with non-zero balance. Please transfer funds first.',
                    code: 'NON_ZERO_BALANCE',
                    currentBalance: account.currentBalance
                });
            }

            // Soft delete
            account.isActive = false;
            account.updatedBy = new mongoose.Types.ObjectId(userId);
            account.deletedAt = new Date();
            await account.save();

            console.log('✅ Bank account deleted successfully:', accountId);

            res.json({
                success: true,
                message: `${account.type === 'upi' ? 'UPI' : 'Bank'} account deleted successfully`,
                data: {
                    deletedAccountId: accountId,
                    deletedAccountName: account.accountName,
                    deletedAt: account.deletedAt
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

    // ✅ ENHANCED: Get account summary with type breakdown
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

            const summary = await BankAccount.aggregate([
                { $match: { companyId: new mongoose.Types.ObjectId(companyId), isActive: true } },
                {
                    $group: {
                        _id: '$type',
                        totalBalance: { $sum: '$currentBalance' },
                        count: { $sum: 1 },
                        avgBalance: { $avg: '$currentBalance' },
                        minBalance: { $min: '$currentBalance' },
                        maxBalance: { $max: '$currentBalance' },
                        accounts: {
                            $push: {
                                _id: '$_id',
                                accountName: '$accountName',
                                currentBalance: '$currentBalance',
                                accountNumber: '$accountNumber',
                                upiId: '$upiId',
                                mobileNumber: '$mobileNumber',
                                canReceiveUPI: {
                                    $and: [
                                        { $eq: ['$type', 'upi'] },
                                        { $ne: ['$upiId', null] },
                                        { $ne: ['$upiId', ''] },
                                        { $ne: ['$mobileNumber', null] },
                                        { $ne: ['$mobileNumber', ''] },
                                        { $eq: ['$isActive', true] }
                                    ]
                                }
                            }
                        }
                    }
                }
            ]);

            const totalBalance = summary.reduce((sum, item) => sum + item.totalBalance, 0);
            const totalAccounts = summary.reduce((sum, item) => sum + item.count, 0);

            // ✅ Enhanced breakdown with UPI capabilities
            const breakdown = summary.reduce((acc, item) => {
                acc[item._id] = {
                    totalBalance: item.totalBalance,
                    count: item.count,
                    avgBalance: item.avgBalance,
                    minBalance: item.minBalance,
                    maxBalance: item.maxBalance,
                    accounts: item.accounts,
                    ...(item._id === 'upi' && {
                        upiEnabledCount: item.accounts.filter(acc => acc.canReceiveUPI).length
                    })
                };
                return acc;
            }, {});

            console.log('✅ Account summary calculated for', totalAccounts, 'accounts');

            res.json({
                success: true,
                data: {
                    summary,
                    totalBalance,
                    totalAccounts,
                    breakdown,
                    stats: {
                        bankAccounts: breakdown.bank?.count || 0,
                        upiAccounts: breakdown.upi?.count || 0,
                        upiEnabledAccounts: breakdown.upi?.upiEnabledCount || 0,
                        totalBankBalance: breakdown.bank?.totalBalance || 0,
                        totalUpiBalance: breakdown.upi?.totalBalance || 0,
                        avgBankBalance: breakdown.bank?.avgBalance || 0,
                        avgUpiBalance: breakdown.upi?.avgBalance || 0
                    },
                    meta: {
                        companyId,
                        generatedAt: new Date()
                    }
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

    // ✅ NEW: Get UPI-enabled accounts
    async getUPIAccounts(req, res) {
        try {
            const companyId = req.companyId || req.params.companyId;

            console.log('📱 Getting UPI-enabled accounts for company:', companyId);

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required',
                    code: 'MISSING_COMPANY_ID'
                });
            }

            const upiAccounts = await BankAccount.find({
                companyId: new mongoose.Types.ObjectId(companyId),
                type: 'upi',
                isActive: true,
                upiId: { $exists: true, $ne: null, $ne: '' },
                mobileNumber: { $exists: true, $ne: null, $ne: '' }
            })
                .select('accountName upiId mobileNumber currentBalance bankName accountNumber ifscCode')
                .populate('createdBy', 'name email')
                .sort({ accountName: 1 });

            const totalBalance = upiAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

            console.log('✅ Found', upiAccounts.length, 'UPI-enabled accounts');

            res.json({
                success: true,
                data: {
                    accounts: upiAccounts,
                    count: upiAccounts.length,
                    totalBalance,
                    avgBalance: upiAccounts.length > 0 ? totalBalance / upiAccounts.length : 0
                }
            });

        } catch (error) {
            console.error('❌ Get UPI accounts error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch UPI accounts',
                code: 'UPI_FETCH_ERROR',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // ✅ UPDATED: Update account balance method 
    async updateAccountBalance(req, res) {
        try {
            const companyId = req.companyId || req.params.companyId;
            const { accountId } = req.params;
            const { amount, type, reason, reference, category } = req.body;

            console.log('💰 Processing balance update:', {
                companyId,
                accountId,
                amount,
                type,
                reason
            });

            // Validate required fields
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

            // Validate amount
            const transactionAmount = parseFloat(amount);
            if (isNaN(transactionAmount) || transactionAmount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Amount must be a positive number',
                    code: 'INVALID_AMOUNT'
                });
            }

            // Validate transaction type
            if (!['credit', 'debit'].includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: 'Transaction type must be either "credit" or "debit"',
                    code: 'INVALID_TRANSACTION_TYPE'
                });
            }

            // Find the account
            const account = await BankAccount.findOne({
                _id: accountId,
                companyId: new mongoose.Types.ObjectId(companyId),
                isActive: true
            });

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Bank account not found or inactive',
                    code: 'ACCOUNT_NOT_FOUND'
                });
            }

            // Calculate new balance
            const previousBalance = parseFloat(account.currentBalance) || 0;
            let newBalance;

            if (type === 'credit') {
                // Adding money (deposit)
                newBalance = previousBalance + transactionAmount;
                console.log(`💰 Credit: ${previousBalance} + ${transactionAmount} = ${newBalance}`);
            } else if (type === 'debit') {
                // Removing money (withdrawal)
                newBalance = previousBalance - transactionAmount;
                console.log(`💸 Debit: ${previousBalance} - ${transactionAmount} = ${newBalance}`);

                // Check for negative balance warning
                if (newBalance < 0) {
                    console.warn('⚠️ Transaction would result in negative balance:', newBalance);
                }
            }

            // Update the account using model method
            account.currentBalance = newBalance;
            account.lastTransactionDate = new Date();
            account.totalTransactions = (account.totalTransactions || 0) + 1;
            account.updatedAt = new Date();

            await account.save();

            console.log('✅ Account balance updated successfully:', {
                accountName: account.accountName,
                accountType: account.type,
                previousBalance,
                newBalance,
                transactionAmount,
                transactionType: type
            });

            res.status(200).json({
                success: true,
                message: `${account.type === 'upi' ? 'UPI' : 'Bank'} account balance ${type === 'credit' ? 'credited' : 'debited'} successfully`,
                data: {
                    accountId: account._id,
                    accountName: account.accountName,
                    accountType: account.type,
                    previousBalance,
                    newBalance,
                    transactionAmount,
                    transactionType: type,
                    reason: reason || `Balance ${type} operation`,
                    reference: reference || null,
                    category: category || 'general',
                    updatedAt: account.updatedAt,
                    totalTransactions: account.totalTransactions
                }
            });

        } catch (error) {
            console.error('❌ Error updating account balance:', error);

            // Handle specific MongoDB errors
            if (error.name === 'ValidationError') {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    code: 'VALIDATION_ERROR',
                    errors: Object.values(error.errors).map(err => ({
                        field: err.path,
                        message: err.message
                    }))
                });
            }

            if (error.name === 'CastError') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid account ID format',
                    code: 'INVALID_ID_FORMAT'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Internal server error while updating account balance',
                code: 'INTERNAL_SERVER_ERROR',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // ✅ ENHANCED: Handle transfer transactions with UPI support
    async processTransfer(req, res) {
        try {
            const companyId = req.companyId || req.params.companyId;
            const {
                fromAccountId,
                toAccountId,
                amount,
                transferType,
                reason,
                reference,
                category = 'transfer'
            } = req.body;

            console.log('🔄 Processing transfer:', {
                companyId,
                fromAccountId,
                toAccountId,
                amount,
                transferType,
                reason
            });

            // Validate required fields
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required',
                    code: 'MISSING_COMPANY_ID'
                });
            }

            if (!fromAccountId || !toAccountId || !amount || !transferType) {
                return res.status(400).json({
                    success: false,
                    message: 'From account, to account, amount, and transfer type are required',
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
                BankAccount.findOne({ _id: fromAccountId, companyId: new mongoose.Types.ObjectId(companyId), isActive: true }),
                BankAccount.findOne({ _id: toAccountId, companyId: new mongoose.Types.ObjectId(companyId), isActive: true })
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
            if (fromAccount.currentBalance < transferAmount) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient balance in source account',
                    code: 'INSUFFICIENT_BALANCE',
                    data: {
                        currentBalance: fromAccount.currentBalance,
                        requestedAmount: transferAmount,
                        deficit: transferAmount - fromAccount.currentBalance
                    }
                });
            }

            // ✅ Validate transfer type compatibility
            const validTransferTypes = [
                'bank-to-bank',
                'bank-to-upi',
                'upi-to-bank',
                'upi-to-upi'
            ];

            if (!validTransferTypes.includes(transferType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid transfer type',
                    code: 'INVALID_TRANSFER_TYPE',
                    validTypes: validTransferTypes
                });
            }

            // Start transaction session for atomic operation
            const session = await mongoose.startSession();

            try {
                const result = await session.withTransaction(async () => {
                    // Debit from source account
                    fromAccount.currentBalance -= transferAmount;
                    fromAccount.lastTransactionDate = new Date();
                    fromAccount.totalTransactions = (fromAccount.totalTransactions || 0) + 1;
                    fromAccount.updatedAt = new Date();
                    await fromAccount.save({ session });

                    // Credit to destination account
                    toAccount.currentBalance += transferAmount;
                    toAccount.lastTransactionDate = new Date();
                    toAccount.totalTransactions = (toAccount.totalTransactions || 0) + 1;
                    toAccount.updatedAt = new Date();
                    await toAccount.save({ session });

                    return {
                        fromAccountNewBalance: fromAccount.currentBalance,
                        toAccountNewBalance: toAccount.currentBalance
                    };
                });

                console.log('✅ Transfer completed successfully:', {
                    from: `${fromAccount.accountName} (${fromAccount.type})`,
                    to: `${toAccount.accountName} (${toAccount.type})`,
                    amount: transferAmount,
                    transferType
                });

                res.json({
                    success: true,
                    message: 'Transfer completed successfully',
                    data: {
                        transferId: new mongoose.Types.ObjectId().toString(),
                        fromAccount: {
                            id: fromAccount._id,
                            name: fromAccount.accountName,
                            type: fromAccount.type,
                            newBalance: result.fromAccountNewBalance
                        },
                        toAccount: {
                            id: toAccount._id,
                            name: toAccount.accountName,
                            type: toAccount.type,
                            newBalance: result.toAccountNewBalance
                        },
                        transferAmount,
                        transferType,
                        reason: reason || `Transfer from ${fromAccount.accountName} to ${toAccount.accountName}`,
                        reference,
                        category,
                        transferDate: new Date()
                    }
                });

            } catch (transferError) {
                console.error('❌ Transfer transaction failed:', transferError);
                throw transferError;
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

    // ✅ ENHANCED: Handle balance adjustments
    async adjustBalance(req, res) {
        try {
            const companyId = req.companyId || req.params.companyId;
            const { accountId } = req.params;
            const {
                adjustmentAmount,
                reason,
                reference,
                category = 'adjustment'
            } = req.body;

            console.log('⚖️ Processing balance adjustment:', {
                companyId,
                accountId,
                adjustmentAmount,
                reason
            });

            if (!companyId || !accountId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID and Account ID are required',
                    code: 'MISSING_REQUIRED_IDS'
                });
            }

            // Validate required fields
            if (adjustmentAmount === undefined || adjustmentAmount === null) {
                return res.status(400).json({
                    success: false,
                    message: 'Adjustment amount is required',
                    code: 'MISSING_ADJUSTMENT_AMOUNT'
                });
            }

            const adjustment = parseFloat(adjustmentAmount);
            if (isNaN(adjustment)) {
                return res.status(400).json({
                    success: false,
                    message: 'Adjustment amount must be a valid number',
                    code: 'INVALID_ADJUSTMENT_AMOUNT'
                });
            }

            const account = await BankAccount.findOne({
                _id: accountId,
                companyId: new mongoose.Types.ObjectId(companyId),
                isActive: true
            });

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Bank account not found or inactive',
                    code: 'ACCOUNT_NOT_FOUND'
                });
            }

            // Apply adjustment
            const previousBalance = account.currentBalance;
            const newBalance = previousBalance + adjustment;

            account.currentBalance = newBalance;
            account.lastTransactionDate = new Date();
            account.totalTransactions = (account.totalTransactions || 0) + 1;
            account.updatedAt = new Date();
            await account.save();

            const adjustmentType = adjustment >= 0 ? 'positive' : 'negative';

            console.log('✅ Balance adjustment completed:', {
                accountName: account.accountName,
                accountType: account.type,
                previousBalance,
                newBalance,
                adjustment,
                adjustmentType
            });

            res.json({
                success: true,
                message: `Balance adjustment completed successfully`,
                data: {
                    accountId: account._id,
                    accountName: account.accountName,
                    accountType: account.type,
                    previousBalance,
                    newBalance,
                    adjustmentAmount: adjustment,
                    adjustmentType,
                    reason: reason || 'Balance adjustment',
                    reference,
                    category,
                    adjustmentDate: new Date(),
                    totalTransactions: account.totalTransactions
                },
                meta: {
                    balanceChange: adjustment >= 0 ? `+${adjustment}` : `${adjustment}`,
                    updatedAt: account.updatedAt
                }
            });

        } catch (error) {
            console.error('❌ Adjust balance error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to adjust account balance',
                code: 'ADJUSTMENT_ERROR',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // ✅ ENHANCED: Validate account details with UPI support
    async validateAccountDetails(req, res) {
        try {
            const companyId = req.companyId || req.params.companyId;
            const { accountName, accountNumber, ifscCode, upiId, type, excludeAccountId } = req.query;

            console.log('✅ Validating account details for company:', companyId);

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
                    companyId: new mongoose.Types.ObjectId(companyId),
                    accountName: { $regex: new RegExp(`^${accountName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
                    isActive: true
                };

                if (excludeAccountId) {
                    query._id = { $ne: new mongoose.Types.ObjectId(excludeAccountId) };
                }

                const existingName = await BankAccount.findOne(query);

                if (existingName) {
                    validationErrors.push('Account name already exists');
                }
            }

            // Check account number uniqueness
            if (accountNumber) {
                const query = {
                    companyId: new mongoose.Types.ObjectId(companyId),
                    accountNumber,
                    isActive: true
                };

                if (excludeAccountId) {
                    query._id = { $ne: new mongoose.Types.ObjectId(excludeAccountId) };
                }

                const existingNumber = await BankAccount.findOne(query);

                if (existingNumber) {
                    validationErrors.push('Account number already exists');
                }
            }

            // ✅ Check UPI ID uniqueness
            if (upiId) {
                const query = {
                    companyId: new mongoose.Types.ObjectId(companyId),
                    upiId: upiId.toLowerCase(),
                    isActive: true
                };

                if (excludeAccountId) {
                    query._id = { $ne: new mongoose.Types.ObjectId(excludeAccountId) };
                }

                const existingUpi = await BankAccount.findOne(query);

                if (existingUpi) {
                    validationErrors.push('UPI ID already exists');
                }

                // Validate UPI ID format
                const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
                if (!upiRegex.test(upiId)) {
                    validationErrors.push('Invalid UPI ID format');
                }
            }

            // Validate IFSC code format
            if (ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase())) {
                validationErrors.push('Invalid IFSC code format');
            }

            console.log('✅ Validation completed:', validationErrors.length === 0 ? 'PASSED' : 'FAILED');

            res.json({
                success: true,
                isValid: validationErrors.length === 0,
                errors: validationErrors,
                meta: {
                    checkedFields: { accountName, accountNumber, ifscCode, upiId, type },
                    companyId,
                    excludeAccountId,
                    validatedAt: new Date()
                }
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
}

module.exports = new BankAccountController();