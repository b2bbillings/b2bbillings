const Company = require('../models/Company');
const { validationResult } = require('express-validator');

// @desc    Create a new company
// @route   POST /api/companies
// @access  Private (requires authentication)
const createCompany = async (req, res) => {
    try {
        console.log('🏢 Creating company for user:', req.user?.id);

        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.error('❌ Validation errors:', errors.array());
            return res.status(400).json({
                success: false,
                status: 'error',
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        // Ensure user is authenticated
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                status: 'error',
                message: 'User authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        const {
            businessName,
            phoneNumber,
            additionalPhones,
            email,
            businessType,
            businessCategory,
            gstin,
            state,
            pincode,
            city,
            tehsil,
            address,
            logo,
            signatureImage,
            settings
        } = req.body;

        // Check if user already owns a company (for free plan limitations)
        const existingOwnedCompany = await Company.findOne({ 
            owner: req.user.id,
            isActive: true 
        });

        // For now, allow multiple companies per user
        // You can uncomment this for single company limitation
        /*
        if (existingOwnedCompany) {
            return res.status(400).json({
                success: false,
                status: 'error',
                message: 'You already own a company. Upgrade to premium for multiple companies.',
                code: 'COMPANY_LIMIT_EXCEEDED'
            });
        }
        */

        // Check if company with phone number already exists
        const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
        const existingCompany = await Company.findOne({ 
            phoneNumber: cleanPhoneNumber,
            isActive: true 
        });
        
        if (existingCompany) {
            return res.status(400).json({
                success: false,
                status: 'error',
                message: 'Company with this phone number already exists',
                code: 'PHONE_EXISTS'
            });
        }

        // Check if email already exists (if provided)
        if (email) {
            const existingEmail = await Company.findOne({ 
                email: email.toLowerCase(),
                isActive: true 
            });
            if (existingEmail) {
                return res.status(400).json({
                    success: false,
                    status: 'error',
                    message: 'Company with this email already exists',
                    code: 'EMAIL_EXISTS'
                });
            }
        }

        // Check if GSTIN already exists (if provided)
        if (gstin) {
            const existingGSTIN = await Company.findOne({ 
                gstin: gstin.toUpperCase(),
                isActive: true 
            });
            if (existingGSTIN) {
                return res.status(400).json({
                    success: false,
                    status: 'error',
                    message: 'Company with this GSTIN already exists',
                    code: 'GSTIN_EXISTS'
                });
            }
        }

        // Prepare company data
        const companyData = {
            // User association - REQUIRED
            owner: req.user.id,
            
            // Add owner to users array with owner role
            users: [{
                user: req.user.id,
                role: 'owner',
                permissions: [
                    'view_dashboard', 'manage_parties', 'create_invoices', 'view_reports',
                    'manage_inventory', 'manage_users', 'company_settings', 'delete_records'
                ],
                joinedAt: new Date(),
                isActive: true
            }],

            // Business information
            businessName: businessName.trim(),
            phoneNumber: cleanPhoneNumber,
            additionalPhones: additionalPhones ? 
                additionalPhones
                    .filter(phone => phone && phone.trim())
                    .map(phone => phone.replace(/\D/g, ''))
                    .filter(phone => phone.length === 10) 
                : [],
            email: email ? email.toLowerCase().trim() : undefined,
            businessType,
            businessCategory,
            gstin: gstin ? gstin.toUpperCase().trim() : undefined,

            // Address information
            state: state ? state.trim() : undefined,
            pincode: pincode ? pincode.replace(/\D/g, '') : undefined,
            city: city ? city.trim() : undefined,
            tehsil: tehsil ? tehsil.trim() : undefined,
            address: address ? address.trim() : undefined,

            // Images
            logo: logo ? { base64: logo } : undefined,
            signatureImage: signatureImage ? { base64: signatureImage } : undefined,

            // Settings with defaults
            settings: {
                invoicePrefix: settings?.invoicePrefix || 'INV',
                purchasePrefix: settings?.purchasePrefix || 'PUR',
                enableGST: settings?.enableGST !== undefined ? settings.enableGST : true,
                autoGenerateInvoice: settings?.autoGenerateInvoice !== undefined ? settings.autoGenerateInvoice : true,
                allowMultipleUsers: settings?.allowMultipleUsers || false,
                requireApprovalForUsers: settings?.requireApprovalForUsers !== undefined ? settings.requireApprovalForUsers : true
            },

            // Initialize subscription (Free plan)
            subscription: {
                plan: 'Free',
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days free
                maxUsers: 1,
                maxTransactions: 100,
                features: ['basic_invoicing', 'inventory_management', 'reports']
            },

            // Initialize stats
            stats: {
                totalUsers: 1,
                totalParties: 0,
                totalTransactions: 0,
                totalRevenue: 0,
                lastActivityAt: new Date()
            }
        };

        // Remove undefined fields
        Object.keys(companyData).forEach(key => {
            if (companyData[key] === undefined) {
                delete companyData[key];
            }
        });

        // Create new company
        const newCompany = new Company(companyData);

        // Save company to database
        const savedCompany = await newCompany.save();

        console.log('✅ Company created successfully:', {
            id: savedCompany._id,
            name: savedCompany.businessName,
            owner: savedCompany.owner
        });

        // Prepare response (exclude sensitive data)
        const companyResponse = {
            id: savedCompany._id,
            _id: savedCompany._id,
            businessName: savedCompany.businessName,
            phoneNumber: savedCompany.phoneNumber,
            email: savedCompany.email,
            businessType: savedCompany.businessType,
            businessCategory: savedCompany.businessCategory,
            gstin: savedCompany.gstin,
            state: savedCompany.state,
            city: savedCompany.city,
            address: savedCompany.address,
            pincode: savedCompany.pincode,
            tehsil: savedCompany.tehsil,
            isActive: savedCompany.isActive,
            settings: savedCompany.settings,
            subscription: savedCompany.subscription,
            stats: savedCompany.stats,
            createdAt: savedCompany.createdAt,
            updatedAt: savedCompany.updatedAt
        };

        res.status(201).json({
            success: true,
            status: 'success',
            message: 'Company created successfully',
            data: companyResponse
        });

    } catch (error) {
        console.error('❌ Create Company Error:', error);

        // Handle specific MongoDB errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            const fieldName = field === 'phoneNumber' ? 'phone number' : 
                            field === 'gstin' ? 'GSTIN' : field;
            
            return res.status(400).json({
                success: false,
                status: 'error',
                message: `Company with this ${fieldName} already exists`,
                code: 'DUPLICATE_FIELD'
            });
        }

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message
            }));

            return res.status(400).json({
                success: false,
                status: 'error',
                message: 'Validation failed',
                errors: validationErrors,
                code: 'VALIDATION_ERROR'
            });
        }

        res.status(500).json({
            success: false,
            status: 'error',
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get all companies for authenticated user
// @route   GET /api/companies
// @access  Private
const getAllCompanies = async (req, res) => {
    try {
        console.log('🔍 Getting companies for user:', req.user?.id);

        // Ensure user is authenticated
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                status: 'error',
                message: 'User authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        const {
            page = 1,
            limit = 10,
            search = '',
            businessType = '',
            businessCategory = '',
            state = '',
            city = '',
            isActive = 'true'
        } = req.query;

        // Build filter object - ONLY show companies user has access to
        const filter = {
            $or: [
                { owner: req.user.id }, // Companies owned by user
                { 'users.user': req.user.id, 'users.isActive': true } // Companies user is member of
            ]
        };

        // Add search filters
        if (search && search.trim()) {
            filter.$and = filter.$and || [];
            filter.$and.push({
                $or: [
                    { businessName: { $regex: search.trim(), $options: 'i' } },
                    { email: { $regex: search.trim(), $options: 'i' } },
                    { phoneNumber: { $regex: search.trim(), $options: 'i' } },
                    { gstin: { $regex: search.trim(), $options: 'i' } }
                ]
            });
        }

        if (businessType) {
            filter.businessType = businessType;
        }

        if (businessCategory) {
            filter.businessCategory = businessCategory;
        }

        if (state) {
            filter.state = { $regex: state, $options: 'i' };
        }

        if (city) {
            filter.city = { $regex: city, $options: 'i' };
        }

        if (isActive !== '') {
            filter.isActive = isActive === 'true';
        }

        // Calculate pagination
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        console.log('🔍 Company filter:', JSON.stringify(filter, null, 2));

        // Get companies with pagination - INCLUDE users and owner fields for role calculation
        const companies = await Company.find(filter)
            .select('-__v -logo.base64 -signatureImage.base64') // Exclude large data but KEEP users
            .populate('owner', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        // Get total count for pagination
        const total = await Company.countDocuments(filter);

        console.log('✅ Found companies:', {
            count: companies.length,
            total: total,
            userId: req.user.id
        });

        // Calculate pagination info
        const totalPages = Math.ceil(total / limitNum);
        const hasNextPage = pageNum < totalPages;
        const hasPrevPage = pageNum > 1;

        // Add user role information to each company - FIXED
        const companiesWithRole = companies.map(company => {
            // First convert to object
            const companyObj = company.toObject();
            
            // Then manually determine user role
            let userRole = 'employee'; // default
            
            // Check if user is owner
            if (company.owner && company.owner._id.toString() === req.user.id.toString()) {
                userRole = 'owner';
            } else if (company.users && Array.isArray(company.users)) {
                // Check if user is in users array
                const userEntry = company.users.find(user => 
                    user.user && user.user.toString() === req.user.id.toString() && user.isActive
                );
                if (userEntry) {
                    userRole = userEntry.role;
                }
            }
            
            // Add user role to company object
            companyObj.userRole = userRole;
            
            // Remove users array from response to reduce data size
            delete companyObj.users;
            
            return companyObj;
        });

        res.status(200).json({
            success: true,
            status: 'success',
            data: {
                companies: companiesWithRole,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalItems: total,
                    hasNextPage,
                    hasPrevPage,
                    limit: limitNum
                }
            }
        });

    } catch (error) {
        console.error('❌ Get Companies Error:', error);
        res.status(500).json({
            success: false,
            status: 'error',
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get company by ID (with access control)
// @route   GET /api/companies/:id
// @access  Private
const getCompanyById = async (req, res) => {
    try {
        const { id } = req.params;

        console.log('🔍 Getting company by ID:', id, 'for user:', req.user?.id);

        // Ensure user is authenticated
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                status: 'error',
                message: 'User authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        const company = await Company.findById(id)
            .populate('owner', 'name email')
            .populate('users.user', 'name email')
            .select('-__v');

        if (!company) {
            return res.status(404).json({
                success: false,
                status: 'error',
                message: 'Company not found',
                code: 'COMPANY_NOT_FOUND'
            });
        }

        // Check if user has access to this company - FIXED
        let hasAccess = false;
        
        // Check if user is owner
        if (company.owner && company.owner._id.toString() === req.user.id.toString()) {
            hasAccess = true;
        } else if (company.users && Array.isArray(company.users)) {
            // Check if user is in users array
            hasAccess = company.users.some(user => 
                user.user && user.user._id.toString() === req.user.id.toString() && user.isActive
            );
        }

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                status: 'error',
                message: 'Access denied to this company',
                code: 'ACCESS_DENIED'
            });
        }

        // Add user role information - FIXED
        const companyData = company.toObject();
        
        // Manually determine user role
        let userRole = 'employee'; // default
        
        if (company.owner && company.owner._id.toString() === req.user.id.toString()) {
            userRole = 'owner';
        } else if (company.users && Array.isArray(company.users)) {
            const userEntry = company.users.find(user => 
                user.user && user.user._id.toString() === req.user.id.toString() && user.isActive
            );
            if (userEntry) {
                userRole = userEntry.role;
            }
        }
        
        companyData.userRole = userRole;

        console.log('✅ Company found:', {
            id: company._id,
            name: company.businessName,
            userRole: companyData.userRole
        });

        res.status(200).json({
            success: true,
            status: 'success',
            data: companyData
        });

    } catch (error) {
        console.error('❌ Get Company Error:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                status: 'error',
                message: 'Invalid company ID',
                code: 'INVALID_ID'
            });
        }

        res.status(500).json({
            success: false,
            status: 'error',
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Update company (with access control)
// @route   PUT /api/companies/:id
// @access  Private
const updateCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        console.log('📝 Updating company:', id, 'by user:', req.user?.id);

        // Ensure user is authenticated
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                status: 'error',
                message: 'User authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        // Check if company exists and user has access
        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                success: false,
                status: 'error',
                message: 'Company not found',
                code: 'COMPANY_NOT_FOUND'
            });
        }

        // Check if user has permission to update (owner or admin) - FIXED
        let userRole = 'employee'; // default
        
        if (company.owner && company.owner.toString() === req.user.id.toString()) {
            userRole = 'owner';
        } else if (company.users && Array.isArray(company.users)) {
            const userEntry = company.users.find(user => 
                user.user && user.user.toString() === req.user.id.toString() && user.isActive
            );
            if (userEntry) {
                userRole = userEntry.role;
            }
        }
        
        if (!userRole || (userRole !== 'owner' && userRole !== 'admin')) {
            return res.status(403).json({
                success: false,
                status: 'error',
                message: 'Insufficient permissions to update company',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        // Restrict certain fields that only owner can update
        const ownerOnlyFields = ['owner', 'users', 'subscription'];
        if (userRole !== 'owner') {
            ownerOnlyFields.forEach(field => {
                if (updateData[field]) {
                    delete updateData[field];
                }
            });
        }

        // Clean and validate update data
        if (updateData.phoneNumber) {
            updateData.phoneNumber = updateData.phoneNumber.replace(/\D/g, '');
        }

        if (updateData.email) {
            updateData.email = updateData.email.toLowerCase().trim();
        }

        if (updateData.gstin) {
            updateData.gstin = updateData.gstin.toUpperCase().trim();
        }

        if (updateData.businessName) {
            updateData.businessName = updateData.businessName.trim();
        }

        // Update last activity
        updateData['stats.lastActivityAt'] = new Date();

        // Update company
        const updatedCompany = await Company.findByIdAndUpdate(
            id,
            updateData,
            { 
                new: true, 
                runValidators: true,
                select: '-__v -logo.base64 -signatureImage.base64'
            }
        ).populate('owner', 'name email');

        console.log('✅ Company updated successfully:', {
            id: updatedCompany._id,
            name: updatedCompany.businessName
        });

        res.status(200).json({
            success: true,
            status: 'success',
            message: 'Company updated successfully',
            data: updatedCompany
        });

    } catch (error) {
        console.error('❌ Update Company Error:', error);

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message
            }));

            return res.status(400).json({
                success: false,
                status: 'error',
                message: 'Validation failed',
                errors: validationErrors,
                code: 'VALIDATION_ERROR'
            });
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                success: false,
                status: 'error',
                message: `Company with this ${field} already exists`,
                code: 'DUPLICATE_FIELD'
            });
        }

        res.status(500).json({
            success: false,
            status: 'error',
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Delete company (soft delete with access control)
// @route   DELETE /api/companies/:id
// @access  Private
const deleteCompany = async (req, res) => {
    try {
        const { id } = req.params;

        console.log('🗑️ Deleting company:', id, 'by user:', req.user?.id);

        // Ensure user is authenticated
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                status: 'error',
                message: 'User authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                success: false,
                status: 'error',
                message: 'Company not found',
                code: 'COMPANY_NOT_FOUND'
            });
        }

        // Only owner can delete company - FIXED
        const isOwner = company.owner && company.owner.toString() === req.user.id.toString();
        
        if (!isOwner) {
            return res.status(403).json({
                success: false,
                status: 'error',
                message: 'Only company owner can delete the company',
                code: 'OWNER_ONLY_ACTION'
            });
        }

        // Soft delete by setting isActive to false
        company.isActive = false;
        company.stats.lastActivityAt = new Date();
        await company.save();

        console.log('✅ Company soft deleted successfully:', {
            id: company._id,
            name: company.businessName
        });

        res.status(200).json({
            success: true,
            status: 'success',
            message: 'Company deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete Company Error:', error);
        res.status(500).json({
            success: false,
            status: 'error',
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Add user to company
// @route   POST /api/companies/:id/users
// @access  Private
const addUserToCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, role = 'employee', permissions = [] } = req.body;

        console.log('👥 Adding user to company:', { companyId: id, userId, role });

        // Ensure user is authenticated
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                status: 'error',
                message: 'User authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                success: false,
                status: 'error',
                message: 'Company not found',
                code: 'COMPANY_NOT_FOUND'
            });
        }

        // Only owner or admin can add users - FIXED
        let userRole = 'employee'; // default
        
        if (company.owner && company.owner.toString() === req.user.id.toString()) {
            userRole = 'owner';
        } else if (company.users && Array.isArray(company.users)) {
            const userEntry = company.users.find(user => 
                user.user && user.user.toString() === req.user.id.toString() && user.isActive
            );
            if (userEntry) {
                userRole = userEntry.role;
            }
        }
        
        if (!userRole || (userRole !== 'owner' && userRole !== 'admin')) {
            return res.status(403).json({
                success: false,
                status: 'error',
                message: 'Insufficient permissions to add users',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        // Add user to company (you'll need to implement this method in Company model)
        // For now, just add to users array
        company.users.push({
            user: userId,
            role: role,
            permissions: permissions,
            joinedAt: new Date(),
            isActive: true
        });

        await company.save();

        console.log('✅ User added to company successfully');

        res.status(200).json({
            success: true,
            status: 'success',
            message: 'User added to company successfully'
        });

    } catch (error) {
        console.error('❌ Add User to Company Error:', error);
        res.status(500).json({
            success: false,
            status: 'error',
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Remove user from company
// @route   DELETE /api/companies/:id/users/:userId
// @access  Private
const removeUserFromCompany = async (req, res) => {
    try {
        const { id, userId } = req.params;

        console.log('👥 Removing user from company:', { companyId: id, userId });

        // Ensure user is authenticated
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                status: 'error',
                message: 'User authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                success: false,
                status: 'error',
                message: 'Company not found',
                code: 'COMPANY_NOT_FOUND'
            });
        }

        // Only owner can remove users - FIXED
        const isOwner = company.owner && company.owner.toString() === req.user.id.toString();
        
        if (!isOwner) {
            return res.status(403).json({
                success: false,
                status: 'error',
                message: 'Only company owner can remove users',
                code: 'OWNER_ONLY_ACTION'
            });
        }

        // Cannot remove owner - FIXED
        const isTargetOwner = company.owner && company.owner.toString() === userId;
        
        if (isTargetOwner) {
            return res.status(400).json({
                success: false,
                status: 'error',
                message: 'Cannot remove company owner',
                code: 'CANNOT_REMOVE_OWNER'
            });
        }

        // Remove user from company
        company.users = company.users.filter(user => 
            user.user.toString() !== userId
        );

        await company.save();

        console.log('✅ User removed from company successfully');

        res.status(200).json({
            success: true,
            status: 'success',
            message: 'User removed from company successfully'
        });

    } catch (error) {
        console.error('❌ Remove User from Company Error:', error);
        res.status(500).json({
            success: false,
            status: 'error',
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get company statistics
// @route   GET /api/companies/:id/stats
// @access  Private
const getCompanyStats = async (req, res) => {
    try {
        const { id } = req.params;

        console.log('📊 Getting company stats:', id);

        // Ensure user is authenticated
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                status: 'error',
                message: 'User authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        const company = await Company.findById(id).select('stats owner users');
        if (!company) {
            return res.status(404).json({
                success: false,
                status: 'error',
                message: 'Company not found',
                code: 'COMPANY_NOT_FOUND'
            });
        }

        // Check access - FIXED
        let hasAccess = false;
        
        if (company.owner && company.owner.toString() === req.user.id.toString()) {
            hasAccess = true;
        } else if (company.users && Array.isArray(company.users)) {
            hasAccess = company.users.some(user => 
                user.user && user.user.toString() === req.user.id.toString() && user.isActive
            );
        }

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                status: 'error',
                message: 'Access denied to this company',
                code: 'ACCESS_DENIED'
            });
        }

        res.status(200).json({
            success: true,
            status: 'success',
            data: company.stats
        });

    } catch (error) {
        console.error('❌ Get Company Stats Error:', error);
        res.status(500).json({
            success: false,
            status: 'error',
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    createCompany,
    getAllCompanies,
    getCompanyById,
    updateCompany,
    deleteCompany,
    addUserToCompany,
    removeUserFromCompany,
    getCompanyStats
};