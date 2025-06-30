const Item = require("../models/Item");
const mongoose = require("mongoose");

const itemController = {
  getItems: async (req, res) => {
    try {
      const {companyId} = req.params;

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      const {
        type,
        category,
        isActive,
        search,
        page = 1,
        limit = 50,
        sortBy = "name",
        sortOrder = "asc",
      } = req.query;

      const filter = {companyId: new mongoose.Types.ObjectId(companyId)};

      if (type) filter.type = type;
      if (category) filter.category = category;
      if (isActive !== undefined) filter.isActive = isActive === "true";

      if (search) {
        filter.$or = [
          {name: {$regex: search, $options: "i"}},
          {itemCode: {$regex: search, $options: "i"}},
          {description: {$regex: search, $options: "i"}},
          {category: {$regex: search, $options: "i"}},
        ];
      }

      const sort = {};
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;

      const skip = (page - 1) * limit;
      const items = await Item.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await Item.countDocuments(filter);

      res.json({
        success: true,
        data: {
          items,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(total / limit),
            count: items.length,
            totalItems: total,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching items",
        error: error.message,
      });
    }
  },

  getItemById: async (req, res) => {
    try {
      const {companyId, itemId} = req.params;

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(itemId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid item ID format",
        });
      }

      const item = await Item.findOne({
        _id: new mongoose.Types.ObjectId(itemId),
        companyId: new mongoose.Types.ObjectId(companyId),
      }).lean();

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found",
        });
      }

      res.json({
        success: true,
        data: {item},
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching item",
        error: error.message,
      });
    }
  },

  createItem: async (req, res) => {
    try {
      const {companyId} = req.params;
      const itemData = req.body;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is missing from request parameters",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
          receivedId: companyId,
          isValidObjectId: mongoose.Types.ObjectId.isValid(companyId),
        });
      }

      const requiredFields = ["name", "category", "unit"];
      const missingFields = requiredFields.filter((field) => !itemData[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
          missingFields,
        });
      }

      if (itemData.itemCode) {
        const existingItem = await Item.findOne({
          companyId: new mongoose.Types.ObjectId(companyId),
          itemCode: itemData.itemCode,
        });

        if (existingItem) {
          return res.status(400).json({
            success: false,
            message: "Item code already exists in this company",
          });
        }
      }

      const newItem = new Item({
        ...itemData,
        companyId: new mongoose.Types.ObjectId(companyId),
        createdBy: req.user?.id || "system",
      });

      if (newItem.type === "service") {
        newItem.currentStock = 0;
        newItem.openingStock = 0;
        newItem.minStockLevel = 0;
      } else {
        newItem.currentStock = newItem.openingStock || 0;
      }

      await newItem.save();

      res.status(201).json({
        success: true,
        message: "Item created successfully",
        data: {item: newItem},
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Item code already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error creating item",
        error: error.message,
      });
    }
  },

  updateItem: async (req, res) => {
    try {
      const {companyId, itemId} = req.params;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(itemId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid item ID format",
        });
      }

      delete updateData._id;
      delete updateData.companyId;
      delete updateData.createdAt;

      const existingItem = await Item.findOne({
        _id: new mongoose.Types.ObjectId(itemId),
        companyId: new mongoose.Types.ObjectId(companyId),
      });

      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: "Item not found",
        });
      }

      if (
        updateData.itemCode &&
        updateData.itemCode !== existingItem.itemCode
      ) {
        const duplicateItem = await Item.findOne({
          companyId: new mongoose.Types.ObjectId(companyId),
          itemCode: updateData.itemCode,
          _id: {$ne: new mongoose.Types.ObjectId(itemId)},
        });

        if (duplicateItem) {
          return res.status(400).json({
            success: false,
            message: "Item code already exists",
          });
        }
      }

      if (updateData.type === "service" && existingItem.type === "product") {
        updateData.currentStock = 0;
        updateData.openingStock = 0;
        updateData.minStockLevel = 0;
      }

      updateData.lastModifiedBy = req.user?.id || "system";
      updateData.updatedAt = new Date();

      const updatedItem = await Item.findByIdAndUpdate(
        new mongoose.Types.ObjectId(itemId),
        updateData,
        {new: true, runValidators: true}
      );

      res.json({
        success: true,
        message: "Item updated successfully",
        data: {item: updatedItem},
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Item code already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error updating item",
        error: error.message,
      });
    }
  },

  deleteItem: async (req, res) => {
    try {
      const {companyId, itemId} = req.params;

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(itemId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid item ID format",
        });
      }

      const item = await Item.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(itemId),
        companyId: new mongoose.Types.ObjectId(companyId),
      });

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found",
        });
      }

      res.json({
        success: true,
        message: "Item deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error deleting item",
        error: error.message,
      });
    }
  },

  adjustStock: async (req, res) => {
    try {
      const {companyId, itemId} = req.params;
      const {adjustmentType, quantity, newStock, reason, asOfDate} = req.body;

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(itemId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid item ID format",
        });
      }

      if (!adjustmentType) {
        return res.status(400).json({
          success: false,
          message: "Adjustment type is required",
        });
      }

      if (quantity === undefined && newStock === undefined) {
        return res.status(400).json({
          success: false,
          message: "Either quantity or newStock is required",
        });
      }

      const item = await Item.findOne({
        _id: new mongoose.Types.ObjectId(itemId),
        companyId: new mongoose.Types.ObjectId(companyId),
      });

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found",
        });
      }

      if (item.type === "service") {
        return res.status(400).json({
          success: false,
          message: "Stock adjustment is not applicable for services",
        });
      }

      const previousStock = item.currentStock || 0;

      let finalStock;
      let actualQuantity = 0;

      switch (adjustmentType) {
        case "set":
          finalStock = Number(quantity) || Number(newStock) || 0;
          actualQuantity = finalStock - previousStock;
          break;
        case "add":
          actualQuantity = Number(quantity) || 0;
          finalStock = previousStock + actualQuantity;
          break;
        case "subtract":
          actualQuantity = -(Number(quantity) || 0);
          finalStock = Math.max(0, previousStock + actualQuantity);
          break;
        default:
          finalStock = Number(newStock) || previousStock;
          actualQuantity = finalStock - previousStock;
      }

      if (finalStock < 0) {
        finalStock = 0;
      }

      const stockHistoryEntry = {
        date: asOfDate ? new Date(asOfDate) : new Date(),
        previousStock: previousStock,
        newStock: finalStock,
        adjustmentType: adjustmentType,
        quantity: actualQuantity,
        reason: reason || "Manual adjustment",
        adjustedBy: req.user?.id || "system",
        adjustedAt: new Date(),
      };

      const updatedItem = await Item.findByIdAndUpdate(
        new mongoose.Types.ObjectId(itemId),
        {
          $set: {
            currentStock: finalStock,
            openingStock: finalStock,
            lastStockUpdate: new Date(),
            lastModifiedBy: req.user?.id || "system",
            updatedAt: new Date(),
          },
          $push: {
            stockHistory: stockHistoryEntry,
          },
        },
        {new: true, runValidators: true}
      );

      res.json({
        success: true,
        message: "Stock adjusted successfully",
        data: {
          item: updatedItem,
          stockAdjustment: {
            previousStock: previousStock,
            newStock: finalStock,
            adjustmentQuantity: actualQuantity,
            adjustmentType: adjustmentType,
            reason: reason || "Manual adjustment",
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error adjusting stock",
        error: error.message,
      });
    }
  },

  getStockHistory: async (req, res) => {
    try {
      const {companyId, itemId} = req.params;
      const {page = 1, limit = 20} = req.query;

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(itemId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid item ID format",
        });
      }

      const item = await Item.findOne({
        _id: new mongoose.Types.ObjectId(itemId),
        companyId: new mongoose.Types.ObjectId(companyId),
      }).select("name stockHistory currentStock");

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found",
        });
      }

      const stockHistory = item.stockHistory || [];
      const sortedHistory = stockHistory.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      const skip = (page - 1) * limit;
      const paginatedHistory = sortedHistory.slice(
        skip,
        skip + parseInt(limit)
      );

      res.json({
        success: true,
        data: {
          item: {
            id: item._id,
            name: item.name,
            currentStock: item.currentStock,
          },
          stockHistory: paginatedHistory,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(stockHistory.length / limit),
            count: paginatedHistory.length,
            totalItems: stockHistory.length,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching stock history",
        error: error.message,
      });
    }
  },

  getCategories: async (req, res) => {
    try {
      const {companyId} = req.params;

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      const categories = await Item.distinct("category", {
        companyId: new mongoose.Types.ObjectId(companyId),
        isActive: true,
      });

      res.json({
        success: true,
        data: {categories},
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching categories",
        error: error.message,
      });
    }
  },

  searchItems: async (req, res) => {
    try {
      const {companyId} = req.params;
      const {q, type, limit = 10} = req.query;

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      if (!q || q.length < 2) {
        return res.json({
          success: true,
          data: {items: []},
        });
      }

      const filter = {
        companyId: new mongoose.Types.ObjectId(companyId),
        isActive: true,
        $or: [
          {name: {$regex: q, $options: "i"}},
          {itemCode: {$regex: q, $options: "i"}},
        ],
      };

      if (type) filter.type = type;

      const items = await Item.find(filter)
        .select(
          "name itemCode hsnNumber category salePrice gstRate unit type currentStock"
        )
        .limit(parseInt(limit))
        .lean();

      res.json({
        success: true,
        data: {items},
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error searching items",
        error: error.message,
      });
    }
  },

  bulkUpdateStock: async (req, res) => {
    try {
      const {companyId} = req.params;
      const {updates} = req.body;

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Updates array is required",
        });
      }

      const bulkOps = updates.map((update) => ({
        updateOne: {
          filter: {
            _id: new mongoose.Types.ObjectId(update.itemId),
            companyId: new mongoose.Types.ObjectId(companyId),
            type: "product",
          },
          update: {
            $set: {
              currentStock: update.newStock,
              updatedAt: new Date(),
              lastModifiedBy: req.user?.id || "system",
            },
          },
        },
      }));

      const result = await Item.bulkWrite(bulkOps);

      res.json({
        success: true,
        message: "Stock updated successfully",
        data: {
          modified: result.modifiedCount,
          matched: result.matchedCount,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating stock",
        error: error.message,
      });
    }
  },

  getLowStockItems: async (req, res) => {
    try {
      const {companyId} = req.params;
      const {limit = 50} = req.query;

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      const lowStockItems = await Item.find({
        companyId: new mongoose.Types.ObjectId(companyId),
        type: "product",
        isActive: true,
        $expr: {
          $lte: [
            {$ifNull: ["$currentStock", 0]},
            {$ifNull: ["$minStockLevel", 0]},
          ],
        },
      })
        .select(
          "name itemCode category currentStock minStockLevel unit salePrice"
        )
        .limit(parseInt(limit))
        .sort({currentStock: 1})
        .lean();

      res.json({
        success: true,
        data: {
          items: lowStockItems,
          count: lowStockItems.length,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching low stock items",
        error: error.message,
      });
    }
  },

  getStockSummary: async (req, res) => {
    try {
      const {companyId} = req.params;

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      const stockSummary = await Item.aggregate([
        {
          $match: {
            companyId: new mongoose.Types.ObjectId(companyId),
            type: "product",
            isActive: true,
          },
        },
        {
          $group: {
            _id: null,
            totalProducts: {$sum: 1},
            totalStockQuantity: {$sum: {$ifNull: ["$currentStock", 0]}},
            totalStockValue: {
              $sum: {
                $multiply: [
                  {$ifNull: ["$currentStock", 0]},
                  {$ifNull: ["$salePrice", 0]},
                ],
              },
            },
            outOfStockItems: {
              $sum: {
                $cond: [{$eq: [{$ifNull: ["$currentStock", 0]}, 0]}, 1, 0],
              },
            },
            lowStockItems: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {$gt: [{$ifNull: ["$currentStock", 0]}, 0]},
                      {
                        $lte: [
                          {$ifNull: ["$currentStock", 0]},
                          {$ifNull: ["$minStockLevel", 0]},
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);

      const summary = stockSummary[0] || {
        totalProducts: 0,
        totalStockQuantity: 0,
        totalStockValue: 0,
        outOfStockItems: 0,
        lowStockItems: 0,
      };

      res.json({
        success: true,
        data: {summary},
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching stock summary",
        error: error.message,
      });
    }
  },
};

module.exports = itemController;
