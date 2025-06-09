const Party = require('../models/Party');
const Company = require('../models/Company');
const mongoose = require('mongoose');

const partyController = {
    // Create a new party
    async createParty(req, res) {
        try {
            const {
                partyType = 'customer',
                name,
                email = '',
                phoneNumber,
                companyName = '',
                gstNumber = '',
                gstType = 'unregistered',
                creditLimit = 0,
                openingBalance = 0,
                country = 'INDIA',

                // Home address fields
                homeAddressLine = '',
                homePincode = '',
                homeState = '',
                homeDistrict = '',
                homeTaluka = '',

                // Delivery address fields
                deliveryAddressLine = '',
                deliveryPincode = '',
                deliveryState = '',
                deliveryDistrict = '',
                deliveryTaluka = '',
                sameAsHomeAddress = false,

                // Phone numbers array
                phoneNumbers = []
            } = req.body;

            // Get user and company from request
            const userId = req.user?.id || req.user?._id;
            const companyId = req.user?.currentCompany ||
                req.body.companyId ||
                req.headers['x-company-id'] ||
                req.query.companyId;

            console.log('📝 Creating new party:', {
                name,
                partyType,
                phoneNumber,
                gstType,
                creditLimit,
                userId,
                companyId,
                userObject: req.user ? 'Present' : 'Missing'
            });

            // Validation
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User authentication required'
                });
            }

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company selection required'
                });
            }

            if (!name?.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Party name is required'
                });
            }

            if (!phoneNumber?.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number is required'
                });
            }

            // Validate phone number format
            const phoneRegex = /^[6-9]\d{9}$/;
            if (!phoneRegex.test(phoneNumber.trim())) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide a valid 10-digit phone number starting with 6, 7, 8, or 9'
                });
            }

            // Validate email format if provided
            if (email?.trim()) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email.trim())) {
                    return res.status(400).json({
                        success: false,
                        message: 'Please provide a valid email address'
                    });
                }
            }

            // Validate GST number if provided and type is not unregistered
            if (gstNumber?.trim() && gstType !== 'unregistered') {
                const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
                if (!gstRegex.test(gstNumber.trim().toUpperCase())) {
                    return res.status(400).json({
                        success: false,
                        message: 'Please provide a valid GST number format (e.g., 22AAAAA0000A1Z5)'
                    });
                }
            }

            // Validate credit limit and opening balance
            if (creditLimit < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Credit limit cannot be negative'
                });
            }

            if (openingBalance < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Opening balance cannot be negative'
                });
            }

            // Convert to ObjectId for consistency
            const userObjectId = new mongoose.Types.ObjectId(userId);
            const companyObjectId = new mongoose.Types.ObjectId(companyId);

            // Check if party with same phone number already exists for this company
            const existingParty = await Party.findOne({
                phoneNumber: phoneNumber.trim(),
                companyId: companyObjectId,
                isActive: true
            });

            if (existingParty) {
                return res.status(400).json({
                    success: false,
                    message: `A party with phone number ${phoneNumber.trim()} already exists in this company`
                });
            }

            // Prepare party data
            const partyData = {
                partyType,
                name: name.trim(),
                email: email?.trim() || '',
                phoneNumber: phoneNumber.trim(),
                companyName: companyName?.trim() || '',
                gstNumber: (gstType !== 'unregistered' && gstNumber?.trim()) ? gstNumber.trim().toUpperCase() : '',
                gstType,
                creditLimit: parseFloat(creditLimit) || 0,
                openingBalance: parseFloat(openingBalance) || 0,
                country: country.toUpperCase(),

                // Home Address
                homeAddress: {
                    addressLine: homeAddressLine?.trim() || '',
                    pincode: homePincode?.trim() || '',
                    state: homeState?.trim() || '',
                    district: homeDistrict?.trim() || '',
                    taluka: homeTaluka?.trim() || ''
                },

                // Delivery Address
                deliveryAddress: sameAsHomeAddress ? {
                    addressLine: homeAddressLine?.trim() || '',
                    pincode: homePincode?.trim() || '',
                    state: homeState?.trim() || '',
                    district: homeDistrict?.trim() || '',
                    taluka: homeTaluka?.trim() || ''
                } : {
                    addressLine: deliveryAddressLine?.trim() || '',
                    pincode: deliveryPincode?.trim() || '',
                    state: deliveryState?.trim() || '',
                    district: deliveryDistrict?.trim() || '',
                    taluka: deliveryTaluka?.trim() || ''
                },

                sameAsHomeAddress,

                // Phone numbers - ensure primary phone is included
                phoneNumbers: phoneNumbers.length > 0 ?
                    phoneNumbers.filter(p => p.number?.trim()) :
                    [{ number: phoneNumber.trim(), label: 'Primary' }],

                // Associations
                userId: userObjectId,
                companyId: companyObjectId,
                createdBy: userObjectId
            };

            console.log('💾 Creating party with data:', {
                name: partyData.name,
                phoneNumber: partyData.phoneNumber,
                gstType: partyData.gstType,
                creditLimit: partyData.creditLimit,
                companyId: partyData.companyId,
                partyType: partyData.partyType
            });

            // Create new party
            const newParty = new Party(partyData);
            await newParty.save();

            console.log('✅ Party created successfully:', newParty._id);

            res.status(201).json({
                success: true,
                message: 'Party created successfully',
                data: newParty
            });

        } catch (error) {
            console.error('❌ Error creating party:', error);

            // Handle validation errors
            if (error.name === 'ValidationError') {
                const validationErrors = Object.values(error.errors).map(err => err.message);
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validationErrors
                });
            }

            // Handle duplicate key errors
            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'A party with this phone number already exists in this company'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error creating party',
                error: error.message
            });
        }
    },

    // Create a quick party (minimal data)
    async createQuickParty(req, res) {
        try {
            const { name, phone, type = 'customer' } = req.body;

            // Get user and company from request
            const userId = req.user?.id || req.user?._id;
            const companyId = req.user?.currentCompany ||
                req.body.companyId ||
                req.headers['x-company-id'] ||
                req.query.companyId;

            console.log('⚡ Creating quick party:', {
                name,
                phone,
                type,
                userId,
                companyId
            });

            // Validation
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User authentication required'
                });
            }

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company selection required'
                });
            }

            if (!name?.trim() || !phone?.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and phone number are required'
                });
            }

            // Validate phone number format
            const phoneRegex = /^[6-9]\d{9}$/;
            if (!phoneRegex.test(phone.trim())) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide a valid 10-digit phone number starting with 6, 7, 8, or 9'
                });
            }

            // Convert to ObjectId for consistency
            const userObjectId = new mongoose.Types.ObjectId(userId);
            const companyObjectId = new mongoose.Types.ObjectId(companyId);

            // Check if party with same phone number already exists for this company
            const existingParty = await Party.findOne({
                phoneNumber: phone.trim(),
                companyId: companyObjectId,
                isActive: true
            });

            if (existingParty) {
                return res.status(400).json({
                    success: false,
                    message: `A party with phone number ${phone.trim()} already exists in this company`
                });
            }

            const quickPartyData = {
                partyType: type,
                name: name.trim(),
                phoneNumber: phone.trim(),
                email: '',
                companyName: '',
                gstNumber: '',
                gstType: 'unregistered',
                creditLimit: 0,
                openingBalance: 0,
                country: 'INDIA',
                homeAddress: {
                    addressLine: '',
                    pincode: '',
                    state: '',
                    district: '',
                    taluka: ''
                },
                deliveryAddress: {
                    addressLine: '',
                    pincode: '',
                    state: '',
                    district: '',
                    taluka: ''
                },
                sameAsHomeAddress: false,
                phoneNumbers: [{ number: phone.trim(), label: 'Primary' }],

                // Associations
                userId: userObjectId,
                companyId: companyObjectId,
                createdBy: userObjectId
            };

            const newParty = new Party(quickPartyData);
            await newParty.save();

            console.log('✅ Quick party created successfully:', newParty._id);

            res.status(201).json({
                success: true,
                message: 'Quick party created successfully',
                data: newParty
            });

        } catch (error) {
            console.error('❌ Error creating quick party:', error);

            if (error.name === 'ValidationError') {
                const validationErrors = Object.values(error.errors).map(err => err.message);
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validationErrors
                });
            }

            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'A party with this phone number already exists in this company'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error creating quick party',
                error: error.message
            });
        }
    },

    // Check if phone number exists in company
    async checkPhoneExists(req, res) {
        try {
            const { phoneNumber } = req.params;
            const companyId = req.user?.currentCompany ||
                req.headers['x-company-id'] ||
                req.query.companyId;

            console.log('🔍 Checking phone existence:', phoneNumber, 'in company:', companyId);

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is required'
                });
            }

            if (!phoneNumber?.trim()) {
                return res.json({
                    success: true,
                    exists: false,
                    party: null
                });
            }

            const companyObjectId = new mongoose.Types.ObjectId(companyId);

            const existingParty = await Party.findOne({
                phoneNumber: phoneNumber.trim(),
                companyId: companyObjectId,
                isActive: true
            }).select('name partyType phoneNumber');

            console.log('📞 Phone check result:', existingParty ? 'Found' : 'Not found');

            res.json({
                success: true,
                exists: !!existingParty,
                party: existingParty ? {
                    id: existingParty._id,
                    name: existingParty.name,
                    partyType: existingParty.partyType,
                    phoneNumber: existingParty.phoneNumber
                } : null
            });

        } catch (error) {
            console.error('❌ Error checking phone existence:', error);
            res.status(500).json({
                success: false,
                message: 'Error checking phone number',
                error: error.message
            });
        }
    },

    // Get all parties with optional filtering (filtered by company)
    async getAllParties(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                search = '',
                type = 'all',
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = req.query;

            // Get user and company from request
            const userId = req.user?.id || req.user?._id;
            const companyId = req.user?.currentCompany ||
                req.body.companyId ||
                req.headers['x-company-id'] ||
                req.query.companyId;

            console.log('📋 Fetching parties with filters:', {
                page,
                limit,
                search,
                type,
                userId,
                companyId,
                userObject: req.user ? 'Present' : 'Missing'
            });

            // Validate user and company
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User authentication required'
                });
            }

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company selection required'
                });
            }

            // Convert to ObjectId if it's a string
            const companyObjectId = typeof companyId === 'string' ?
                new mongoose.Types.ObjectId(companyId) : companyId;

            // Build filter object with company filter
            const filter = {
                isActive: true,
                companyId: companyObjectId
            };

            // Add search filter
            if (search && search.trim()) {
                filter.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { phoneNumber: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { companyName: { $regex: search, $options: 'i' } },
                    { gstNumber: { $regex: search, $options: 'i' } }
                ];
            }

            // Add party type filter
            if (type && type !== 'all') {
                filter.partyType = type;
            }

            // Build sort object
            const sort = {};
            sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

            // Execute query with pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const parties = await Party.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            // Get total count for pagination
            const total = await Party.countDocuments(filter);

            console.log(`✅ Found ${parties.length} parties for company ${companyId}`);

            res.json({
                success: true,
                message: 'Parties retrieved successfully',
                data: {
                    parties,
                    pagination: {
                        current: parseInt(page),
                        total: Math.ceil(total / parseInt(limit)),
                        totalItems: total,
                        hasNextPage: parseInt(page) < Math.ceil(total / parseInt(limit)),
                        hasPrevPage: parseInt(page) > 1
                    }
                }
            });

        } catch (error) {
            console.error('❌ Error fetching parties:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching parties',
                error: error.message
            });
        }
    },

    // Get party by ID (with company validation)
    async getPartyById(req, res) {
        try {
            const { id } = req.params;

            // Get user and company from request
            const userId = req.user?.id || req.user?._id;
            const companyId = req.user?.currentCompany ||
                req.headers['x-company-id'] ||
                req.query.companyId;

            console.log('🔍 Fetching party by ID:', id, 'for company:', companyId);

            // Validate user and company
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User authentication required'
                });
            }

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company selection required'
                });
            }

            // Validate ID format
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid party ID format'
                });
            }

            // Convert to ObjectId if it's a string
            const companyObjectId = typeof companyId === 'string' ?
                new mongoose.Types.ObjectId(companyId) : companyId;

            const party = await Party.findOne({
                _id: id,
                companyId: companyObjectId,
                isActive: true
            });

            if (!party) {
                return res.status(404).json({
                    success: false,
                    message: 'Party not found'
                });
            }

            console.log('✅ Party found:', party.name);

            res.json({
                success: true,
                message: 'Party retrieved successfully',
                data: party
            });

        } catch (error) {
            console.error('❌ Error fetching party:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching party',
                error: error.message
            });
        }
    },

    // Update party (with company validation)
    async updateParty(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            // Get user and company from request
            const userId = req.user?.id || req.user?._id;
            const companyId = req.user?.currentCompany ||
                req.body.companyId ||
                req.headers['x-company-id'] ||
                req.query.companyId;

            console.log('📝 Updating party:', id, 'for company:', companyId);

            // Validate user and company
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User authentication required'
                });
            }

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company selection required'
                });
            }

            // Validate ID format
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid party ID format'
                });
            }

            // Convert to ObjectId if it's a string
            const companyObjectId = typeof companyId === 'string' ?
                new mongoose.Types.ObjectId(companyId) : companyId;

            // Find the existing party within the company
            const existingParty = await Party.findOne({
                _id: id,
                companyId: companyObjectId,
                isActive: true
            });

            if (!existingParty) {
                return res.status(404).json({
                    success: false,
                    message: 'Party not found'
                });
            }

            // Check if phone number is being changed and if it conflicts within the company
            if (updateData.phoneNumber && updateData.phoneNumber !== existingParty.phoneNumber) {
                // Validate phone number format
                const phoneRegex = /^[6-9]\d{9}$/;
                if (!phoneRegex.test(updateData.phoneNumber.trim())) {
                    return res.status(400).json({
                        success: false,
                        message: 'Please provide a valid 10-digit phone number starting with 6, 7, 8, or 9'
                    });
                }

                const phoneConflict = await Party.findOne({
                    phoneNumber: updateData.phoneNumber,
                    companyId: companyObjectId,
                    _id: { $ne: id },
                    isActive: true
                });

                if (phoneConflict) {
                    return res.status(400).json({
                        success: false,
                        message: 'A party with this phone number already exists in this company'
                    });
                }
            }

            // Validate email format if provided
            if (updateData.email?.trim()) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(updateData.email.trim())) {
                    return res.status(400).json({
                        success: false,
                        message: 'Please provide a valid email address'
                    });
                }
            }

            // Validate GST number if being updated
            if (updateData.gstNumber?.trim() && updateData.gstType !== 'unregistered') {
                const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
                if (!gstRegex.test(updateData.gstNumber.trim().toUpperCase())) {
                    return res.status(400).json({
                        success: false,
                        message: 'Please provide a valid GST number format (e.g., 22AAAAA0000A1Z5)'
                    });
                }
            }

            // Validate credit limit and opening balance
            if (updateData.creditLimit !== undefined && updateData.creditLimit < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Credit limit cannot be negative'
                });
            }

            if (updateData.openingBalance !== undefined && updateData.openingBalance < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Opening balance cannot be negative'
                });
            }

            // Prepare update data
            const updatedPartyData = {
                ...updateData,
                updatedAt: new Date(),
                updatedBy: new mongoose.Types.ObjectId(userId)
            };

            // Handle address data if provided
            if (updateData.homeAddressLine !== undefined) {
                updatedPartyData.homeAddress = {
                    addressLine: updateData.homeAddressLine || '',
                    pincode: updateData.homePincode || '',
                    state: updateData.homeState || '',
                    district: updateData.homeDistrict || '',
                    taluka: updateData.homeTaluka || ''
                };
            }

            if (updateData.sameAsHomeAddress) {
                updatedPartyData.deliveryAddress = updatedPartyData.homeAddress;
            } else if (updateData.deliveryAddressLine !== undefined) {
                updatedPartyData.deliveryAddress = {
                    addressLine: updateData.deliveryAddressLine || '',
                    pincode: updateData.deliveryPincode || '',
                    state: updateData.deliveryState || '',
                    district: updateData.deliveryDistrict || '',
                    taluka: updateData.deliveryTaluka || ''
                };
            }

            // Handle GST number - clear if type is unregistered
            if (updateData.gstType === 'unregistered') {
                updatedPartyData.gstNumber = '';
            } else if (updateData.gstNumber) {
                updatedPartyData.gstNumber = updateData.gstNumber.trim().toUpperCase();
            }

            // Remove undefined fields to prevent overwriting existing data
            Object.keys(updatedPartyData).forEach(key => {
                if (updatedPartyData[key] === undefined) {
                    delete updatedPartyData[key];
                }
            });

            // Update party
            const updatedParty = await Party.findByIdAndUpdate(
                id,
                updatedPartyData,
                { new: true, runValidators: true }
            );

            console.log('✅ Party updated successfully:', updatedParty._id);

            res.json({
                success: true,
                message: 'Party updated successfully',
                data: updatedParty
            });

        } catch (error) {
            console.error('❌ Error updating party:', error);

            if (error.name === 'ValidationError') {
                const validationErrors = Object.values(error.errors).map(err => err.message);
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validationErrors
                });
            }

            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'A party with this information already exists in this company'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error updating party',
                error: error.message
            });
        }
    },

    // Delete party (soft delete with company validation)
    async deleteParty(req, res) {
        try {
            const { id } = req.params;

            // Get user and company from request
            const userId = req.user?.id || req.user?._id;
            const companyId = req.user?.currentCompany ||
                req.headers['x-company-id'] ||
                req.query.companyId;

            console.log('🗑️ Deleting party:', id, 'for company:', companyId);

            // Validate user and company
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User authentication required'
                });
            }

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company selection required'
                });
            }

            // Validate ID format
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid party ID format'
                });
            }

            // Convert to ObjectId if it's a string
            const companyObjectId = typeof companyId === 'string' ?
                new mongoose.Types.ObjectId(companyId) : companyId;

            const party = await Party.findOneAndUpdate(
                {
                    _id: id,
                    companyId: companyObjectId,
                    isActive: true
                },
                {
                    isActive: false,
                    updatedAt: new Date(),
                    deletedBy: new mongoose.Types.ObjectId(userId),
                    deletedAt: new Date()
                },
                { new: true }
            );

            if (!party) {
                return res.status(404).json({
                    success: false,
                    message: 'Party not found'
                });
            }

            console.log('✅ Party deleted successfully:', id);

            res.json({
                success: true,
                message: 'Party deleted successfully',
                data: null
            });

        } catch (error) {
            console.error('❌ Error deleting party:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting party',
                error: error.message
            });
        }
    },

    // Search parties (within company)
    async searchParties(req, res) {
        try {
            const { query } = req.params;
            const { type, limit = 10 } = req.query;

            // Get user and company from request
            const userId = req.user?.id || req.user?._id;
            const companyId = req.user?.currentCompany ||
                req.headers['x-company-id'] ||
                req.query.companyId;

            console.log('🔍 Searching parties:', {
                query,
                type,
                limit,
                userId,
                companyId
            });

            // Validate user and company
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User authentication required'
                });
            }

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company selection required'
                });
            }

            if (!query || query.length < 2) {
                return res.json({
                    success: true,
                    message: 'Search query too short',
                    data: []
                });
            }

            // Convert to ObjectId if it's a string
            const companyObjectId = typeof companyId === 'string' ?
                new mongoose.Types.ObjectId(companyId) : companyId;

            // Build filter with company restriction
            const filter = {
                isActive: true,
                companyId: companyObjectId,
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { phoneNumber: { $regex: query, $options: 'i' } },
                    { companyName: { $regex: query, $options: 'i' } },
                    { email: { $regex: query, $options: 'i' } },
                    { gstNumber: { $regex: query, $options: 'i' } }
                ]
            };

            if (type && type !== 'all') {
                filter.partyType = type;
            }

            const parties = await Party.find(filter)
                .select('name phoneNumber email companyName partyType currentBalance gstNumber gstType creditLimit')
                .limit(parseInt(limit))
                .lean();

            console.log(`✅ Found ${parties.length} parties matching "${query}" in company ${companyId}`);

            res.json({
                success: true,
                message: 'Search results retrieved successfully',
                data: parties
            });

        } catch (error) {
            console.error('❌ Error searching parties:', error);
            res.status(500).json({
                success: false,
                message: 'Error searching parties',
                error: error.message
            });
        }
    },

    // Get party statistics for the company
    async getPartyStats(req, res) {
        try {
            // Get user and company from request
            const userId = req.user?.id || req.user?._id;
            const companyId = req.user?.currentCompany ||
                req.headers['x-company-id'] ||
                req.query.companyId;

            console.log('📊 Fetching party stats for company:', companyId);

            // Validate user and company
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User authentication required'
                });
            }

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company selection required'
                });
            }

            // Convert to ObjectId if it's a string
            const companyObjectId = typeof companyId === 'string' ?
                new mongoose.Types.ObjectId(companyId) : companyId;

            // Get party statistics
            const stats = await Party.aggregate([
                {
                    $match: {
                        companyId: companyObjectId,
                        isActive: true
                    }
                },
                {
                    $group: {
                        _id: '$partyType',
                        count: { $sum: 1 },
                        totalBalance: { $sum: '$currentBalance' },
                        totalCreditLimit: { $sum: '$creditLimit' },
                        totalOpeningBalance: { $sum: '$openingBalance' },
                        totalReceivable: {
                            $sum: {
                                $cond: [
                                    { $gt: ['$currentBalance', 0] },
                                    '$currentBalance',
                                    0
                                ]
                            }
                        },
                        totalPayable: {
                            $sum: {
                                $cond: [
                                    { $lt: ['$currentBalance', 0] },
                                    { $abs: '$currentBalance' },
                                    0
                                ]
                            }
                        },
                        registeredParties: {
                            $sum: {
                                $cond: [
                                    { $ne: ['$gstType', 'unregistered'] },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]);

            // Format response
            const formattedStats = {
                totalParties: 0,
                customers: {
                    count: 0,
                    receivable: 0,
                    creditLimit: 0,
                    registeredCount: 0
                },
                vendors: {
                    count: 0,
                    payable: 0,
                    creditLimit: 0,
                    registeredCount: 0
                },
                totalReceivable: 0,
                totalPayable: 0,
                totalCreditLimit: 0,
                totalRegisteredParties: 0,
                netBalance: 0
            };

            stats.forEach(stat => {
                formattedStats.totalParties += stat.count;
                formattedStats.totalCreditLimit += stat.totalCreditLimit;
                formattedStats.totalRegisteredParties += stat.registeredParties;

                if (stat._id === 'customer') {
                    formattedStats.customers.count = stat.count;
                    formattedStats.customers.receivable = stat.totalReceivable;
                    formattedStats.customers.creditLimit = stat.totalCreditLimit;
                    formattedStats.customers.registeredCount = stat.registeredParties;
                    formattedStats.totalReceivable += stat.totalReceivable;
                } else if (stat._id === 'vendor' || stat._id === 'supplier') {
                    formattedStats.vendors.count += stat.count;
                    formattedStats.vendors.payable += stat.totalPayable;
                    formattedStats.vendors.creditLimit += stat.totalCreditLimit;
                    formattedStats.vendors.registeredCount += stat.registeredParties;
                    formattedStats.totalPayable += stat.totalPayable;
                }
            });

            formattedStats.netBalance = formattedStats.totalReceivable - formattedStats.totalPayable;

            console.log('✅ Party stats calculated:', formattedStats);

            res.json({
                success: true,
                message: 'Party statistics retrieved successfully',
                data: formattedStats
            });

        } catch (error) {
            console.error('❌ Error fetching party stats:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching party statistics',
                error: error.message
            });
        }
    }
};

module.exports = partyController;