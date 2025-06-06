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

    // Create new item
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

    // 📊 NEW: Adjust stock for an item
    adjustStock: async (req, res) => {
        try {
            const { companyId, itemId } = req.params;
            const { adjustmentType, quantity, newStock, reason, asOfDate } = req.body;

            console.log(`📊 Adjusting stock for item: ${itemId} in company: ${companyId}`, req.body);

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

            // Validate required fields
            if (!adjustmentType) {
                return res.status(400).json({
                    success: false,
                    message: 'Adjustment type is required'
                });
            }

            if (quantity === undefined && newStock === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Either quantity or newStock is required'
                });
            }

            // Find the item
            const item = await Item.findOne({
                _id: new mongoose.Types.ObjectId(itemId),
                companyId: new mongoose.Types.ObjectId(companyId)
            });

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: 'Item not found'
                });
            }

            // Check if item is a product (services don't have stock)
            if (item.type === 'service') {
                return res.status(400).json({
                    success: false,
                    message: 'Stock adjustment is not applicable for services'
                });
            }

            // Store previous stock for history
            const previousStock = item.currentStock || 0;

            // Calculate new stock based on adjustment type
            let finalStock;
            let actualQuantity = 0;

            switch (adjustmentType) {
                case 'set':
                    finalStock = Number(quantity) || Number(newStock) || 0;
                    actualQuantity = finalStock - previousStock;
                    break;
                case 'add':
                    actualQuantity = Number(quantity) || 0;
                    finalStock = previousStock + actualQuantity;
                    break;
                case 'subtract':
                    actualQuantity = -(Number(quantity) || 0);
                    finalStock = Math.max(0, previousStock + actualQuantity);
                    break;
                default:
                    finalStock = Number(newStock) || previousStock;
                    actualQuantity = finalStock - previousStock;
            }

            // Ensure final stock is not negative
            if (finalStock < 0) {
                finalStock = 0;
            }

            // Create stock history entry
            const stockHistoryEntry = {
                date: asOfDate ? new Date(asOfDate) : new Date(),
                previousStock: previousStock,
                newStock: finalStock,
                adjustmentType: adjustmentType,
                quantity: actualQuantity,
                reason: reason || 'Manual adjustment',
                adjustedBy: req.user?.id || 'system',
                adjustedAt: new Date()
            };

            // Update the item with new stock and add to history
            const updatedItem = await Item.findByIdAndUpdate(
                new mongoose.Types.ObjectId(itemId),
                {
                    $set: {
                        currentStock: finalStock,
                        openingStock: finalStock, // Also update opening stock
                        lastStockUpdate: new Date(),
                        lastModifiedBy: req.user?.id || 'system',
                        updatedAt: new Date()
                    },
                    $push: {
                        stockHistory: stockHistoryEntry
                    }
                },
                { new: true, runValidators: true }
            );

            console.log(`✅ Stock adjusted successfully:`, {
                itemId: itemId,
                previousStock: previousStock,
                newStock: finalStock,
                adjustment: actualQuantity,
                type: adjustmentType
            });

            res.json({
                success: true,
                message: 'Stock adjusted successfully',
                data: {
                    item: updatedItem,
                    stockAdjustment: {
                        previousStock: previousStock,
                        newStock: finalStock,
                        adjustmentQuantity: actualQuantity,
                        adjustmentType: adjustmentType,
                        reason: reason || 'Manual adjustment'
                    }
                }
            });

        } catch (error) {
            console.error('❌ Error adjusting stock:', error);
            res.status(500).json({
                success: false,
                message: 'Error adjusting stock',
                error: error.message
            });
        }
    },

    // 📊 NEW: Get stock history for an item
    getStockHistory: async (req, res) => {
        try {
            const { companyId, itemId } = req.params;
            const { page = 1, limit = 20 } = req.query;

            console.log(`📊 Fetching stock history for item: ${itemId} in company: ${companyId}`);

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

            // Find the item and get stock history
            const item = await Item.findOne({
                _id: new mongoose.Types.ObjectId(itemId),
                companyId: new mongoose.Types.ObjectId(companyId)
            }).select('name stockHistory currentStock');

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: 'Item not found'
                });
            }

            // Sort stock history by date (newest first) and paginate
            const stockHistory = item.stockHistory || [];
            const sortedHistory = stockHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

            const skip = (page - 1) * limit;
            const paginatedHistory = sortedHistory.slice(skip, skip + parseInt(limit));

            res.json({
                success: true,
                data: {
                    item: {
                        id: item._id,
                        name: item.name,
                        currentStock: item.currentStock
                    },
                    stockHistory: paginatedHistory,
                    pagination: {
                        current: parseInt(page),
                        total: Math.ceil(stockHistory.length / limit),
                        count: paginatedHistory.length,
                        totalItems: stockHistory.length
                    }
                }
            });

        } catch (error) {
            console.error('❌ Error fetching stock history:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching stock history',
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
    },

    // 📊 NEW: Get low stock items
    getLowStockItems: async (req, res) => {
        try {
            const { companyId } = req.params;
            const { limit = 50 } = req.query;

            console.log(`⚠️ Fetching low stock items for company: ${companyId}`);

            // Validate companyId
            if (!mongoose.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid company ID format'
                });
            }

            // Find items where current stock is less than or equal to minimum stock level
            const lowStockItems = await Item.find({
                companyId: new mongoose.Types.ObjectId(companyId),
                type: 'product',
                isActive: true,
                $expr: {
                    $lte: [
                        { $ifNull: ['$currentStock', 0] },
                        { $ifNull: ['$minStockLevel', 0] }
                    ]
                }
            })
            .select('name itemCode category currentStock minStockLevel unit salePrice')
            .limit(parseInt(limit))
            .sort({ currentStock: 1 })
            .lean();

            console.log(`⚠️ Found ${lowStockItems.length} low stock items`);

            res.json({
                success: true,
                data: {
                    items: lowStockItems,
                    count: lowStockItems.length
                }
            });

        } catch (error) {
            console.error('❌ Error fetching low stock items:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching low stock items',
                error: error.message
            });
        }
    },

    // 📊 NEW: Get stock summary
    getStockSummary: async (req, res) => {
        try {
            const { companyId } = req.params;

            console.log(`📊 Fetching stock summary for company: ${companyId}`);

            // Validate companyId
            if (!mongoose.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid company ID format'
                });
            }

            // Aggregate stock statistics
            const stockSummary = await Item.aggregate([
                {
                    $match: {
                        companyId: new mongoose.Types.ObjectId(companyId),
                        type: 'product',
                        isActive: true
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalProducts: { $sum: 1 },
                        totalStockQuantity: { $sum: { $ifNull: ['$currentStock', 0] } },
                        totalStockValue: {
                            $sum: {
                                $multiply: [
                                    { $ifNull: ['$currentStock', 0] },
                                    { $ifNull: ['$salePrice', 0] }
                                ]
                            }
                        },
                        outOfStockItems: {
                            $sum: {
                                $cond: [
                                    { $eq: [{ $ifNull: ['$currentStock', 0] }, 0] },
                                    1,
                                    0
                                ]
                            }
                        },
                        lowStockItems: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $gt: [{ $ifNull: ['$currentStock', 0] }, 0] },
                                            {
                                                $lte: [
                                                    { $ifNull: ['$currentStock', 0] },
                                                    { $ifNull: ['$minStockLevel', 0] }
                                                ]
                                            }
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

            const summary = stockSummary[0] || {
                totalProducts: 0,
                totalStockQuantity: 0,
                totalStockValue: 0,
                outOfStockItems: 0,
                lowStockItems: 0
            };

            console.log(`📊 Stock summary generated:`, summary);

            res.json({
                success: true,
                data: { summary }
            });

        } catch (error) {
            console.error('❌ Error fetching stock summary:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching stock summary',
                error: error.message
            });
        }
    }
};

module.exports = itemController;