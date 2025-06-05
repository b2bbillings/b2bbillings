const Company = require('../models/Company');
const { validationResult } = require('express-validator');

// @desc    Create a new company
// @route   POST /api/companies
// @access  Public
const createCompany = async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array()
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
            signatureImage
        } = req.body;

        // Check if company with phone number already exists
        const existingCompany = await Company.findOne({ phoneNumber: phoneNumber.replace(/\D/g, '') });
        if (existingCompany) {
            return res.status(400).json({
                status: 'error',
                message: 'Company with this phone number already exists'
            });
        }

        // Check if email already exists (if provided)
        if (email) {
            const existingEmail = await Company.findOne({ email: email.toLowerCase() });
            if (existingEmail) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Company with this email already exists'
                });
            }
        }

        // Check if GSTIN already exists (if provided)
        if (gstin) {
            const existingGSTIN = await Company.findOne({ gstin: gstin.toUpperCase() });
            if (existingGSTIN) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Company with this GSTIN already exists'
                });
            }
        }

        // Create new company
        const newCompany = new Company({
            businessName,
            phoneNumber: phoneNumber.replace(/\D/g, ''),
            additionalPhones: additionalPhones ? additionalPhones.filter(phone => phone && phone.trim()) : [],
            email: email ? email.toLowerCase() : undefined,
            businessType,
            businessCategory,
            gstin: gstin ? gstin.toUpperCase() : undefined,
            state,
            pincode,
            city,
            tehsil,
            address,
            logo: logo ? { base64: logo } : undefined,
            signatureImage: signatureImage ? { base64: signatureImage } : undefined,
            settings: {
                invoicePrefix: 'INV',
                purchasePrefix: 'PUR',
                enableGST: true,
                autoGenerateInvoice: true
            }
        });

        // Save company to database
        const savedCompany = await newCompany.save();

        // Remove sensitive data from response
        const companyResponse = savedCompany.toObject();

        res.status(201).json({
            status: 'success',
            message: 'Company created successfully',
            data: {
                company: companyResponse
            }
        });

    } catch (error) {
        console.error('Create Company Error:', error);

        // Handle specific MongoDB errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                status: 'error',
                message: `Company with this ${field} already exists`
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get all companies
// @route   GET /api/companies
// @access  Private
const getAllCompanies = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            businessType = '',
            businessCategory = '',
            state = '',
            city = '',
            isActive = ''
        } = req.query;

        // Build filter object
        const filter = {};

        if (search) {
            filter.$or = [
                { businessName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phoneNumber: { $regex: search, $options: 'i' } },
                { gstin: { $regex: search, $options: 'i' } }
            ];
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

        // Get companies with pagination
        const companies = await Company.find(filter)
            .select('-__v -logo.base64 -signatureImage.base64') // Exclude large base64 data
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        // Get total count for pagination
        const total = await Company.countDocuments(filter);

        // Calculate pagination info
        const totalPages = Math.ceil(total / limitNum);
        const hasNextPage = pageNum < totalPages;
        const hasPrevPage = pageNum > 1;

        res.status(200).json({
            status: 'success',
            data: {
                companies,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalCompanies: total,
                    hasNextPage,
                    hasPrevPage,
                    limit: limitNum
                }
            }
        });

    } catch (error) {
        console.error('Get Companies Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get company by ID
// @route   GET /api/companies/:id
// @access  Private
const getCompanyById = async (req, res) => {
    try {
        const { id } = req.params;

        const company = await Company.findById(id).select('-__v');

        if (!company) {
            return res.status(404).json({
                status: 'error',
                message: 'Company not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                company
            }
        });

    } catch (error) {
        console.error('Get Company Error:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid company ID'
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Update company
// @route   PUT /api/companies/:id
// @access  Private
const updateCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Check if company exists
        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                status: 'error',
                message: 'Company not found'
            });
        }

        // Update company
        const updatedCompany = await Company.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).select('-__v');

        res.status(200).json({
            status: 'success',
            message: 'Company updated successfully',
            data: {
                company: updatedCompany
            }
        });

    } catch (error) {
        console.error('Update Company Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Delete company
// @route   DELETE /api/companies/:id
// @access  Private
const deleteCompany = async (req, res) => {
    try {
        const { id } = req.params;

        const company = await Company.findById(id);
        if (!company) {
            return res.status(404).json({
                status: 'error',
                message: 'Company not found'
            });
        }

        await Company.findByIdAndDelete(id);

        res.status(200).json({
            status: 'success',
            message: 'Company deleted successfully'
        });

    } catch (error) {
        console.error('Delete Company Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    createCompany,
    getAllCompanies,
    getCompanyById,
    updateCompany,
    deleteCompany
};