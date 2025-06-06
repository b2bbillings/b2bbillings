const Party = require('../models/Party');
const Company = require('../models/Company'); // Add Company import for validation
const mongoose = require('mongoose');

const partyController = {
    // Create a new party
    async createParty(req, res) {
        try {
            const {
                partyType = 'customer',
                name,
                email,
                phoneNumber,
                companyName,
                gstNumber,
                country = 'INDIA',
                homeAddressLine,
                homePincode,
                homeState,
                homeDistrict,
                homeTaluka,
                deliveryAddressLine,
                deliveryPincode,
                deliveryState,
                deliveryDistrict,
                deliveryTaluka,
                sameAsHomeAddress = false,
                openingBalance = 0,
                openingBalanceType = 'debit',
                phoneNumbers = []
            } = req.body;

            // Get user and company from request (should be set by auth middleware)
            const userId = req.user?.id || req.user?._id;
            const companyId = req.user?.currentCompany || 
                            req.body.companyId || 
                            req.headers['x-company-id'];

            console.log('📝 Creating new party:', { 
                name, 
                partyType, 
                phoneNumber, 
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

            // Convert to ObjectId for consistency
            const userObjectId = new mongoose.Types.ObjectId(userId);
            const companyObjectId = new mongoose.Types.ObjectId(companyId);

            // Check if party with same phone number already exists for this company
            const existingParty = await Party.findOne({ 
                phoneNumber,
                companyId: companyObjectId,
                isActive: true
            });

            if (existingParty) {
                return res.status(400).json({
                    success: false,
                    message: 'A party with this phone number already exists in this company'
                });
            }

            // Prepare party data with user and company association
            const partyData = {
                partyType,
                name: name.trim(),
                email: email?.trim() || '',
                phoneNumber: phoneNumber.trim(),
                companyName: companyName?.trim() || '',
                gstNumber: gstNumber?.toUpperCase() || '',
                country: country.toUpperCase(),
                homeAddress: {
                    addressLine: homeAddressLine || '',
                    pincode: homePincode || '',
                    state: homeState || '',
                    district: homeDistrict || '',
                    taluka: homeTaluka || ''
                },
                deliveryAddress: sameAsHomeAddress ? {
                    addressLine: homeAddressLine || '',
                    pincode: homePincode || '',
                    state: homeState || '',
                    district: homeDistrict || '',
                    taluka: homeTaluka || ''
                } : {
                    addressLine: deliveryAddressLine || '',
                    pincode: deliveryPincode || '',
                    state: deliveryState || '',
                    district: deliveryDistrict || '',
                    taluka: deliveryTaluka || ''
                },
                sameAsHomeAddress,
                openingBalance: parseFloat(openingBalance) || 0,
                openingBalanceType,
                phoneNumbers: phoneNumbers.filter(phone => phone.number && phone.number.trim()),
                // Associate with user and company using ObjectIds
                userId: userObjectId,
                companyId: companyObjectId,
                createdBy: userObjectId
            };

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
                    message: 'Party with this information already exists in this company'
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
                            req.headers['x-company-id'];
            
            console.log('⚡ Creating quick party:', { 
                name, 
                phone, 
                type, 
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

            // Convert to ObjectId for consistency
            const userObjectId = new mongoose.Types.ObjectId(userId);
            const companyObjectId = new mongoose.Types.ObjectId(companyId);

            // Check if party with same phone number already exists for this company
            const existingParty = await Party.findOne({ 
                phoneNumber: phone,
                companyId: companyObjectId,
                isActive: true
            });

            if (existingParty) {
                return res.status(400).json({
                    success: false,
                    message: 'A party with this phone number already exists in this company'
                });
            }

            const quickPartyData = {
                name: name.trim(),
                phoneNumber: phone.trim(),
                partyType: type,
                country: 'INDIA',
                // Associate with user and company
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

            res.status(500).json({
                success: false,
                message: 'Error creating quick party',
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
                userObject: req.user ? 'Present' : 'Missing',
                headers: {
                    'x-company-id': req.headers['x-company-id'],
                    'authorization': req.headers.authorization ? 'Present' : 'Missing'
                }
            });

            // Validate user and company
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User authentication required',
                    debug: {
                        reqUser: req.user,
                        authHeader: req.headers.authorization ? 'Present' : 'Missing'
                    }
                });
            }

            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company selection required',
                    debug: {
                        sources: {
                            userCurrentCompany: req.user?.currentCompany,
                            bodyCompanyId: req.body.companyId,
                            headerCompanyId: req.headers['x-company-id'],
                            queryCompanyId: req.query.companyId
                        }
                    }
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
                    { companyName: { $regex: search, $options: 'i' } }
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
                            req.headers['x-company-id'];

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
                    message: 'Party with this information already exists'
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
                    { companyName: { $regex: query, $options: 'i' } }
                ]
            };

            if (type && type !== 'all') {
                filter.partyType = type;
            }

            const parties = await Party.find(filter)
                .select('name phoneNumber email companyName partyType currentBalance')
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
                        }
                    }
                }
            ]);

            // Format response
            const formattedStats = {
                totalParties: 0,
                customers: { count: 0, receivable: 0 },
                vendors: { count: 0, payable: 0 },
                totalReceivable: 0,
                totalPayable: 0,
                netBalance: 0
            };

            stats.forEach(stat => {
                formattedStats.totalParties += stat.count;
                
                if (stat._id === 'customer') {
                    formattedStats.customers.count = stat.count;
                    formattedStats.customers.receivable = stat.totalReceivable;
                    formattedStats.totalReceivable += stat.totalReceivable;
                } else if (stat._id === 'vendor') {
                    formattedStats.vendors.count = stat.count;
                    formattedStats.vendors.payable = stat.totalPayable;
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