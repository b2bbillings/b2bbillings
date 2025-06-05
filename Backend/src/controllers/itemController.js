const Item = require('../models/Item');
const mongoose = require('mongoose');

const itemController = {
    // Get all items for a company
    getItems: async (req, res) => {
        try {
            const { companyId } = req.params;

            // Validate companyId
            if (!mongoose.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid company ID format'
                });
            }

            const {
                type,
                category,
                isActive,
                search,
                page = 1,
                limit = 50,
                sortBy = 'name',
                sortOrder = 'asc'
            } = req.query;

            console.log(`📋 Fetching items for company: ${companyId}`);

            // Build filter object with proper ObjectId
            const filter = { companyId: new mongoose.Types.ObjectId(companyId) };

            if (type) filter.type = type;
            if (category) filter.category = category;
            if (isActive !== undefined) filter.isActive = isActive === 'true';

            // Add search functionality
            if (search) {
                filter.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { itemCode: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { category: { $regex: search, $options: 'i' } }
                ];
            }

            // Build sort object
            const sort = {};
            sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

            // Execute query with pagination
            const skip = (page - 1) * limit;
            const items = await Item.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            // Get total count for pagination
            const total = await Item.countDocuments(filter);

            console.log(`✅ Found ${items.length} items for company ${companyId}`);

            res.json({
                success: true,
                data: {
                    items,
                    pagination: {
                        current: parseInt(page),
                        total: Math.ceil(total / limit),
                        count: items.length,
                        totalItems: total
                    }
                }
            });

        } catch (error) {
            console.error('❌ Error fetching items:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching items',
                error: error.message
            });
        }
    },

    // Get single item by ID
    getItemById: async (req, res) => {
        try {
            const { companyId, itemId } = req.params;

            // Validate IDs
            if (!mongoose.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid company ID format'
                });
            }

            if (!mongoose.Types.ObjectId.isValid(itemId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid item ID format'
                });
            }

            const item = await Item.findOne({
                _id: new mongoose.Types.ObjectId(itemId),
                companyId: new mongoose.Types.ObjectId(companyId)
            }).lean();

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: 'Item not found'
                });
            }

            res.json({
                success: true,
                data: { item }
            });

        } catch (error) {
            console.error('❌ Error fetching item:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching item',
                error: error.message
            });
        }
    },

    createItem: async (req, res) => {
        try {
            // Debug: Log all request parameters
            console.log('🔍 Debug - Full req.params:', req.params);
            console.log('🔍 Debug - req.url:', req.url);
            console.log('🔍 Debug - req.route.path:', req.route?.path);
            console.log('🔍 Debug - req.baseUrl:', req.baseUrl);

            const { companyId } = req.params;
            const itemData = req.body;

            console.log(`🆕 Creating new item for company: ${companyId}`, itemData);

            // Check if companyId exists
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Company ID is missing from request parameters',
                    debug: {
                        params: req.params,
                        url: req.url,
                        baseUrl: req.baseUrl
                    }
                });
            }

            // Validate companyId format
            if (!mongoose.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid company ID format',
                    receivedId: companyId,
                    isValidObjectId: mongoose.Types.ObjectId.isValid(companyId)
                });
            }

            // Validate required fields
            const requiredFields = ['name', 'category', 'unit'];
            const missingFields = requiredFields.filter(field => !itemData[field]);

            if (missingFields.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields',
                    missingFields
                });
            }

            // Check for duplicate item code within company
            if (itemData.itemCode) {
                const existingItem = await Item.findOne({
                    companyId: new mongoose.Types.ObjectId(companyId),
                    itemCode: itemData.itemCode
                });

                if (existingItem) {
                    return res.status(400).json({
                        success: false,
                        message: 'Item code already exists in this company'
                    });
                }
            }

            // Create new item with proper ObjectId
            const newItem = new Item({
                ...itemData,
                companyId: new mongoose.Types.ObjectId(companyId),
                createdBy: req.user?.id || 'system'
            });

            // For services, set stock-related fields to null/0
            if (newItem.type === 'service') {
                newItem.currentStock = 0;
                newItem.openingStock = 0;
                newItem.minStockLevel = 0;
            } else {
                // For products, set current stock to opening stock initially
                newItem.currentStock = newItem.openingStock || 0;
            }

            await newItem.save();

            console.log(`✅ Item created successfully: ${newItem._id}`);

            res.status(201).json({
                success: true,
                message: 'Item created successfully',
                data: { item: newItem }
            });

        } catch (error) {
            console.error('❌ Error creating item:', error);

            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'Item code already exists'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error creating item',
                error: error.message
            });
        }
    },

    // Update item
    updateItem: async (req, res) => {
        try {
            const { companyId, itemId } = req.params;
            const updateData = req.body;

            console.log(`📝 Updating item: ${itemId} for company: ${companyId}`);

            // Validate IDs
            if (!mongoose.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid company ID format'
                });
            }

            if (!mongoose.Types.ObjectId.isValid(itemId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid item ID format'
                });
            }

            // Remove fields that shouldn't be updated directly
            delete updateData._id;
            delete updateData.companyId;
            delete updateData.createdAt;

            // Check if item exists
            const existingItem = await Item.findOne({
                _id: new mongoose.Types.ObjectId(itemId),
                companyId: new mongoose.Types.ObjectId(companyId)
            });

            if (!existingItem) {
                return res.status(404).json({
                    success: false,
                    message: 'Item not found'
                });
            }

            // Check for duplicate item code if updating item code
            if (updateData.itemCode && updateData.itemCode !== existingItem.itemCode) {
                const duplicateItem = await Item.findOne({
                    companyId: new mongoose.Types.ObjectId(companyId),
                    itemCode: updateData.itemCode,
                    _id: { $ne: new mongoose.Types.ObjectId(itemId) }
                });

                if (duplicateItem) {
                    return res.status(400).json({
                        success: false,
                        message: 'Item code already exists'
                    });
                }
            }

            // Handle type change from product to service
            if (updateData.type === 'service' && existingItem.type === 'product') {
                updateData.currentStock = 0;
                updateData.openingStock = 0;
                updateData.minStockLevel = 0;
            }

            // Add metadata
            updateData.lastModifiedBy = req.user?.id || 'system';
            updateData.updatedAt = new Date();

            // Update item
            const updatedItem = await Item.findByIdAndUpdate(
                new mongoose.Types.ObjectId(itemId),
                updateData,
                { new: true, runValidators: true }
            );

            console.log(`✅ Item updated successfully: ${updatedItem._id}`);

            res.json({
                success: true,
                message: 'Item updated successfully',
                data: { item: updatedItem }
            });

        } catch (error) {
            console.error('❌ Error updating item:', error);

            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'Item code already exists'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error updating item',
                error: error.message
            });
        }
    },

    // Delete item
    deleteItem: async (req, res) => {
        try {
            const { companyId, itemId } = req.params;

            console.log(`🗑️ Deleting item: ${itemId} for company: ${companyId}`);

            // Validate IDs
            if (!mongoose.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid company ID format'
                });
            }

            if (!mongoose.Types.ObjectId.isValid(itemId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid item ID format'
                });
            }

            const item = await Item.findOneAndDelete({
                _id: new mongoose.Types.ObjectId(itemId),
                companyId: new mongoose.Types.ObjectId(companyId)
            });

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: 'Item not found'
                });
            }

            console.log(`✅ Item deleted successfully: ${itemId}`);

            res.json({
                success: true,
                message: 'Item deleted successfully'
            });

        } catch (error) {
            console.error('❌ Error deleting item:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting item',
                error: error.message
            });
        }
    },

    // Get categories for a company
    getCategories: async (req, res) => {
        try {
            const { companyId } = req.params;

            console.log(`📂 Fetching categories for company: ${companyId}`);

            // Validate companyId
            if (!mongoose.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid company ID format'
                });
            }

            const categories = await Item.distinct('category', {
                companyId: new mongoose.Types.ObjectId(companyId),
                isActive: true
            });

            console.log(`✅ Found ${categories.length} categories`);

            res.json({
                success: true,
                data: { categories }
            });

        } catch (error) {
            console.error('❌ Error fetching categories:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching categories',
                error: error.message
            });
        }
    },

    // Search items (for autocomplete/suggestions)
    searchItems: async (req, res) => {
        try {
            const { companyId } = req.params;
            const { q, type, limit = 10 } = req.query;

            // Validate companyId
            if (!mongoose.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid company ID format'
                });
            }

            if (!q || q.length < 2) {
                return res.json({
                    success: true,
                    data: { items: [] }
                });
            }

            console.log(`🔍 Searching items: "${q}" for company: ${companyId}`);

            const filter = {
                companyId: new mongoose.Types.ObjectId(companyId),
                isActive: true,
                $or: [
                    { name: { $regex: q, $options: 'i' } },
                    { itemCode: { $regex: q, $options: 'i' } }
                ]
            };

            if (type) filter.type = type;

            const items = await Item.find(filter)
                .select('name itemCode hsnNumber category salePrice gstRate unit type currentStock')
                .limit(parseInt(limit))
                .lean();

            console.log(`✅ Found ${items.length} items matching "${q}"`);

            res.json({
                success: true,
                data: { items }
            });

        } catch (error) {
            console.error('❌ Error searching items:', error);
            res.status(500).json({
                success: false,
                message: 'Error searching items',
                error: error.message
            });
        }
    },

    // Bulk update stock
    bulkUpdateStock: async (req, res) => {
        try {
            const { companyId } = req.params;
            const { updates } = req.body; // Array of { itemId, newStock }

            // Validate companyId
            if (!mongoose.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid company ID format'
                });
            }

            if (!Array.isArray(updates) || updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Updates array is required'
                });
            }

            console.log(`📦 Bulk updating stock for ${updates.length} items in company: ${companyId}`);

            const bulkOps = updates.map(update => ({
                updateOne: {
                    filter: {
                        _id: new mongoose.Types.ObjectId(update.itemId),
                        companyId: new mongoose.Types.ObjectId(companyId),
                        type: 'product'
                    },
                    update: {
                        $set: {
                            currentStock: update.newStock,
                            updatedAt: new Date(),
                            lastModifiedBy: req.user?.id || 'system'
                        }
                    }
                }
            }));

            const result = await Item.bulkWrite(bulkOps);

            console.log(`✅ Bulk stock update completed: ${result.modifiedCount} items updated`);

            res.json({
                success: true,
                message: 'Stock updated successfully',
                data: {
                    modified: result.modifiedCount,
                    matched: result.matchedCount
                }
            });

        } catch (error) {
            console.error('❌ Error updating stock:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating stock',
                error: error.message
            });
        }
    }
};

module.exports = itemController;