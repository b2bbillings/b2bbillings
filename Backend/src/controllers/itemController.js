const Item = require("../models/Item");
const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const Purchase = require("../models/Purchase");

const itemController = {
  // ✅ Existing functions (keep as they are)
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

      // Check for duplicate item code
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

      // ✅ NEW: Create item with name verification
      const newItem = new Item({
        ...itemData,
        companyId: new mongoose.Types.ObjectId(companyId),
        createdBy: req.user?.id || "system",

        // ✅ UPDATED: Always set name verification for new items
        nameVerification: {
          status: "pending",
          originalName: itemData.name,
          verifiedName: null,
          verificationHistory: [
            {
              action: "submitted",
              oldName: null,
              newName: itemData.name,
              date: new Date(),
              reason: "Initial submission - awaiting admin verification",
            },
          ],
        },
      });

      // Handle stock for products vs services
      if (newItem.type === "service") {
        newItem.currentStock = 0;
        newItem.openingStock = 0;
        newItem.minStockLevel = 0;
      } else {
        newItem.currentStock = newItem.openingStock || 0;

        // ✅ Add opening stock to history if > 0
        if (newItem.currentStock > 0) {
          newItem.stockHistory = [
            {
              date: newItem.asOfDate || new Date(),
              previousStock: 0,
              newStock: newItem.currentStock,
              quantity: newItem.currentStock,
              adjustmentType: "set",
              reason: "Opening stock",
              adjustedBy: req.user?.id || "system",
              referenceType: "opening",
              _id: new mongoose.Types.ObjectId(),
            },
          ];
        }
      }

      await newItem.save();

      // ✅ Enhanced response with verification status
      res.status(201).json({
        success: true,
        message:
          "Item created successfully. Name verification pending admin approval.",
        data: {
          item: {
            id: newItem._id,
            name: newItem.name,
            itemCode: newItem.itemCode,
            category: newItem.category,
            type: newItem.type,
            unit: newItem.unit,
            currentStock: newItem.currentStock,
            createdAt: newItem.createdAt,
            companyId: newItem.companyId,

            // ✅ Verification status for UI
            nameVerification: {
              status: "pending",
              originalName: itemData.name,
              needsReview: true,
            },
          },
          verification: {
            status: "pending",
            message:
              "Item created! Admin will verify the name before it becomes fully active.",
            statusBadge: {
              text: "PENDING VERIFICATION",
              color: "warning",
              variant: "warning",
            },
          },
          notification: {
            type: "info",
            title: "Item Created Successfully",
            message: `"${itemData.name}" has been added to your inventory and is pending name verification by admin.`,
          },
        },
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Item code already exists",
          error: "Duplicate item code",
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

      // Calculate final stock based on adjustment type
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

      // Ensure stock doesn't go below 0
      if (finalStock < 0) {
        finalStock = 0;
        actualQuantity = -previousStock; // Adjust quantity to match final stock
      }

      // ✅ CREATE PROPER STOCK HISTORY ENTRY
      const stockHistoryEntry = {
        date: asOfDate ? new Date(asOfDate) : new Date(),
        previousStock: previousStock,
        newStock: finalStock,
        adjustmentType: actualQuantity > 0 ? "add" : "subtract",
        quantity: actualQuantity,
        reason: reason || "Manual stock adjustment",
        adjustedBy: req.user?.id || "system",
        adjustedAt: new Date(),
        // ✅ IMPORTANT: Mark as manual adjustment for transaction filtering
        referenceType: "manual_adjustment",
        referenceId: null,
        _id: new mongoose.Types.ObjectId(),
      };

      // ✅ UPDATE ITEM WITH NEW STOCK AND HISTORY
      const updatedItem = await Item.findByIdAndUpdate(
        new mongoose.Types.ObjectId(itemId),
        {
          $set: {
            currentStock: finalStock,
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
          item: {
            id: updatedItem._id,
            name: updatedItem.name,
            currentStock: finalStock,
            previousStock: previousStock,
          },
          stockAdjustment: {
            previousStock: previousStock,
            newStock: finalStock,
            adjustmentQuantity: actualQuantity,
            adjustmentType: adjustmentType,
            reason: stockHistoryEntry.reason,
          },
          // ✅ Return the stock history entry for verification
          stockHistory: stockHistoryEntry,
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
  // ===== ✅ TRANSACTION CONTROLLER METHODS =====

  getItemTransactions: async (req, res) => {
    try {
      const {companyId, itemId} = req.params;
      const {
        page = 1,
        limit = 50,
        type,
        dateFrom,
        dateTo,
        sortBy = "date",
        sortOrder = "desc",
      } = req.query;

      // Validate inputs
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

      // Verify item exists
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

      // Build date filter
      const dateFilter = {};
      if (dateFrom || dateTo) {
        if (dateFrom) dateFilter.$gte = new Date(dateFrom);
        if (dateTo) dateFilter.$lte = new Date(dateTo);
      }

      // ✅ ENHANCED: Get transactions from multiple sources
      const [salesTransactions, purchaseTransactions, stockAdjustments] =
        await Promise.all([
          // 1. Sales transactions
          type === "adjustment"
            ? []
            : Sale.find({
                companyId: new mongoose.Types.ObjectId(companyId),
                "items.itemRef": new mongoose.Types.ObjectId(itemId),
                ...(dateFilter &&
                  Object.keys(dateFilter).length && {
                    saleDate: dateFilter,
                  }),
              })
                .populate("customer", "name mobile email")
                .sort({saleDate: -1})
                .lean(),

          // 2. Purchase transactions
          type === "adjustment"
            ? []
            : Purchase.find({
                companyId: new mongoose.Types.ObjectId(companyId),
                "items.itemRef": new mongoose.Types.ObjectId(itemId),
                ...(dateFilter &&
                  Object.keys(dateFilter).length && {
                    purchaseDate: dateFilter,
                  }),
              })
                .populate("supplier", "name mobile email")
                .sort({purchaseDate: -1})
                .lean(),

          // 3. Stock adjustments (from item's stock history)
          type === "sale" || type === "purchase"
            ? []
            : Item.findById(itemId).select("stockHistory").lean(),
        ]);

      let allTransactions = [];

      // ✅ Transform sales to transaction format
      if (type !== "adjustment") {
        const salesTransformed = salesTransactions.flatMap((sale) => {
          const itemInSale = sale.items.find(
            (item) => item.itemRef && item.itemRef.toString() === itemId
          );

          if (!itemInSale) return [];

          return {
            id: `sale_${sale._id}`,
            type: "sale",
            transactionType: "out",
            date: sale.saleDate || sale.createdAt,
            transactionDate: sale.saleDate || sale.createdAt,
            invoiceNumber: sale.invoiceNumber,
            referenceNumber: sale.invoiceNumber,
            customerName: sale.customer?.name || sale.customerName || "Unknown",
            vendorName: null,
            quantity: -itemInSale.quantity,
            unit: itemInSale.unit || "PCS",
            pricePerUnit: itemInSale.pricePerUnit || 0,
            status: sale.status || "completed",
            totalAmount:
              itemInSale.amount ||
              itemInSale.quantity * itemInSale.pricePerUnit,
            customerMobile: sale.customer?.mobile,
            paymentStatus: sale.payment?.status,
            saleType: sale.saleType || "gst",
          };
        });

        allTransactions = allTransactions.concat(salesTransformed);
      }

      // ✅ Transform purchases to transaction format
      if (type !== "adjustment") {
        const purchasesTransformed = purchaseTransactions.flatMap(
          (purchase) => {
            const itemInPurchase = purchase.items.find(
              (item) => item.itemRef && item.itemRef.toString() === itemId
            );

            if (!itemInPurchase) return [];

            return {
              id: `purchase_${purchase._id}`,
              type: "purchase",
              transactionType: "in",
              date: purchase.purchaseDate || purchase.createdAt,
              transactionDate: purchase.purchaseDate || purchase.createdAt,
              invoiceNumber: purchase.purchaseNumber || purchase.billNumber,
              referenceNumber: purchase.purchaseNumber || purchase.billNumber,
              customerName: null,
              vendorName:
                purchase.supplier?.name || purchase.supplierName || "Unknown",
              quantity: itemInPurchase.quantity,
              unit: itemInPurchase.unit || "PCS",
              pricePerUnit: itemInPurchase.pricePerUnit || 0,
              status: purchase.status || "completed",
              totalAmount:
                itemInPurchase.amount ||
                itemInPurchase.quantity * itemInPurchase.pricePerUnit,
              supplierMobile: purchase.supplier?.mobile,
              paymentStatus: purchase.payment?.status,
              purchaseType: purchase.purchaseType || "gst",
            };
          }
        );

        allTransactions = allTransactions.concat(purchasesTransformed);
      }

      // ✅ ENHANCED: Transform stock adjustments with price lookup
      if (
        type !== "sale" &&
        type !== "purchase" &&
        stockAdjustments?.stockHistory
      ) {
        // Create a map of purchase prices for reference lookup
        const purchasePriceMap = new Map();

        // Build purchase price map from actual purchase transactions
        purchaseTransactions.forEach((purchase) => {
          const itemInPurchase = purchase.items.find(
            (item) => item.itemRef && item.itemRef.toString() === itemId
          );
          if (itemInPurchase) {
            purchasePriceMap.set(purchase._id.toString(), {
              pricePerUnit: itemInPurchase.pricePerUnit || 0,
              invoiceNumber: purchase.purchaseNumber || purchase.billNumber,
            });
          }
        });

        const adjustmentsTransformed = stockAdjustments.stockHistory
          .filter((adj) => {
            if (!dateFilter || !Object.keys(dateFilter).length) return true;
            const adjDate = new Date(adj.date);
            if (dateFilter.$gte && adjDate < dateFilter.$gte) return false;
            if (dateFilter.$lte && adjDate > dateFilter.$lte) return false;
            return true;
          })
          .map((adj) => {
            // ✅ ENHANCED: Try to get price from linked purchase
            let pricePerUnit = 0;
            let totalAmount = 0;
            let enhancedReason = adj.reason || "Stock adjustment";

            // If this adjustment is linked to a purchase, get the actual price
            if (adj.referenceId && adj.referenceType === "purchase") {
              const purchasePrice = purchasePriceMap.get(
                adj.referenceId.toString()
              );
              if (purchasePrice) {
                pricePerUnit = purchasePrice.pricePerUnit;
                totalAmount = Math.abs(adj.quantity) * pricePerUnit;
                enhancedReason = `Purchase-related stock adjustment: ${purchasePrice.invoiceNumber}`;
              }
            }

            // If no price found, try to use item's current buy price as fallback
            if (pricePerUnit === 0 && adj.adjustmentType === "add") {
              pricePerUnit = item.buyPrice || item.buyPriceWithoutTax || 0;
              if (pricePerUnit > 0) {
                totalAmount = Math.abs(adj.quantity) * pricePerUnit;
                enhancedReason = `Stock adjustment (estimated at current buy price)`;
              }
            }

            return {
              id: `adjustment_${adj._id}`,
              type: "adjustment",
              transactionType: "adjustment",
              date: adj.date,
              transactionDate: adj.date,
              invoiceNumber: null,
              referenceNumber: adj.reference || `ADJ-${Date.parse(adj.date)}`,
              customerName:
                adj.adjustmentType === "add" ? "Stock In" : "Stock Out",
              vendorName:
                adj.adjustmentType === "add" ? "Stock In" : "Stock Out",
              quantity: adj.quantity,
              unit: "PCS",
              pricePerUnit: pricePerUnit, // ✅ ENHANCED: Real price if available
              status: "completed",
              totalAmount: totalAmount, // ✅ ENHANCED: Real amount if available
              // Adjustment-specific fields
              adjustmentType: adj.adjustmentType,
              reason: enhancedReason, // ✅ ENHANCED: Better reason
              adjustedBy: adj.adjustedBy,
              previousStock: adj.previousStock,
              newStock: adj.newStock,
              // Reference information
              referenceId: adj.referenceId,
              referenceType: adj.referenceType,
              originalReason: adj.reason, // Keep original reason for reference
            };
          });

        allTransactions = allTransactions.concat(adjustmentsTransformed);
      }

      // ✅ Filter by type if specified
      if (type && type !== "all") {
        allTransactions = allTransactions.filter((t) => t.type === type);
      }

      // ✅ Sort transactions
      const sortDirection = sortOrder === "desc" ? -1 : 1;
      allTransactions.sort((a, b) => {
        const aVal = new Date(a[sortBy] || a.date);
        const bVal = new Date(b[sortBy] || b.date);
        return sortDirection * (aVal - bVal);
      });

      // ✅ Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedTransactions = allTransactions.slice(startIndex, endIndex);

      // ✅ ENHANCED: Calculate summary with real values
      const summary = {
        totalTransactions: allTransactions.length,
        sales: allTransactions.filter((t) => t.type === "sale").length,
        purchases: allTransactions.filter((t) => t.type === "purchase").length,
        adjustments: allTransactions.filter((t) => t.type === "adjustment")
          .length,
        totalQuantityIn: allTransactions
          .filter((t) => t.quantity > 0)
          .reduce((sum, t) => sum + t.quantity, 0),
        totalQuantityOut: Math.abs(
          allTransactions
            .filter((t) => t.quantity < 0)
            .reduce((sum, t) => sum + t.quantity, 0)
        ),
        totalValue: allTransactions.reduce(
          (sum, t) => sum + (t.totalAmount || 0),
          0
        ),
        // ✅ ENHANCED: Separate financial vs non-financial value
        totalFinancialValue: allTransactions
          .filter((t) => t.type !== "adjustment" || t.pricePerUnit > 0)
          .reduce((sum, t) => sum + (t.totalAmount || 0), 0),
        totalStockAdjustmentValue: allTransactions
          .filter((t) => t.type === "adjustment" && t.pricePerUnit > 0)
          .reduce((sum, t) => sum + (t.totalAmount || 0), 0),
      };

      res.json({
        success: true,
        data: {
          transactions: paginatedTransactions,
          summary,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: allTransactions.length,
            totalPages: Math.ceil(allTransactions.length / limit),
            hasNextPage: endIndex < allTransactions.length,
            hasPrevPage: page > 1,
          },
        },
        message: `Found ${allTransactions.length} transactions for item`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch item transactions",
        error: error.message,
      });
    }
  },

  /**
   * Create transaction for a specific item
   * POST /api/companies/:companyId/items/:itemId/transactions
   */
  createItemTransaction: async (req, res) => {
    try {
      const {companyId, itemId} = req.params;
      const {
        type,
        quantity,
        pricePerUnit,
        customerName,
        vendorName,
        invoiceNumber,
        date,
        status = "completed",
        reason,
      } = req.body;

      // Validate companyId
      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      // Validate itemId
      if (!mongoose.Types.ObjectId.isValid(itemId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid item ID format",
        });
      }

      // Validate required fields
      if (!type || !quantity) {
        return res.status(400).json({
          success: false,
          message: "Type and quantity are required",
        });
      }

      // Check if item exists
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

      // Create transaction based on type
      let transaction;
      const transactionData = {
        companyId: new mongoose.Types.ObjectId(companyId),
        date: date ? new Date(date) : new Date(),
        invoiceNumber: invoiceNumber || `${type.toUpperCase()}-${Date.now()}`,
        status: status,
        items: [
          {
            itemId: new mongoose.Types.ObjectId(itemId),
            quantity: Number(quantity),
            pricePerUnit: Number(pricePerUnit || 0),
            unit: item.unit,
          },
        ],
        total: Number(quantity) * Number(pricePerUnit || 0),
        createdBy: req.user?.id || "system",
      };

      if (type === "sale") {
        // Create sale transaction
        transaction = new Sale({
          ...transactionData,
          customerId: null, // You might want to look up customer by name
          customerName: customerName,
        });

        // Update item stock (decrease)
        if (item.type === "product") {
          await Item.findByIdAndUpdate(itemId, {
            $inc: {currentStock: -Number(quantity)},
            $push: {
              stockHistory: {
                date: new Date(),
                previousStock: item.currentStock,
                newStock: Math.max(0, item.currentStock - Number(quantity)),
                adjustmentType: "subtract",
                quantity: -Number(quantity),
                reason: `Sale: ${invoiceNumber}`,
                adjustedBy: req.user?.id || "system",
              },
            },
          });
        }
      } else if (type === "purchase") {
        // Create purchase transaction
        transaction = new Purchase({
          ...transactionData,
          vendorId: null, // You might want to look up vendor by name
          vendorName: vendorName,
        });

        // Update item stock (increase)
        if (item.type === "product") {
          await Item.findByIdAndUpdate(itemId, {
            $inc: {currentStock: Number(quantity)},
            $push: {
              stockHistory: {
                date: new Date(),
                previousStock: item.currentStock,
                newStock: item.currentStock + Number(quantity),
                adjustmentType: "add",
                quantity: Number(quantity),
                reason: `Purchase: ${invoiceNumber}`,
                adjustedBy: req.user?.id || "system",
              },
            },
          });
        }
      } else if (type === "adjustment") {
        // Create stock adjustment directly in item
        const previousStock = item.currentStock || 0;
        const newStock = Math.max(0, previousStock + Number(quantity));

        await Item.findByIdAndUpdate(itemId, {
          $set: {currentStock: newStock},
          $push: {
            stockHistory: {
              date: new Date(),
              previousStock: previousStock,
              newStock: newStock,
              adjustmentType: Number(quantity) > 0 ? "add" : "subtract",
              quantity: Number(quantity),
              reason: reason || "Manual adjustment",
              adjustedBy: req.user?.id || "system",
            },
          },
        });

        return res.status(201).json({
          success: true,
          message: "Stock adjustment created successfully",
          data: {
            transaction: {
              type: "adjustment",
              quantity: Number(quantity),
              previousStock,
              newStock,
              reason: reason || "Manual adjustment",
            },
          },
        });
      }

      if (transaction) {
        await transaction.save();
      }

      res.status(201).json({
        success: true,
        data: {transaction},
        message: "Transaction created successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create item transaction",
        error: error.message,
      });
    }
  },

  /**
   * Update transaction for a specific item
   * PUT /api/companies/:companyId/items/:itemId/transactions/:transactionId
   */
  updateItemTransaction: async (req, res) => {
    try {
      const {companyId, itemId, transactionId} = req.params;
      const updateData = req.body;

      // Validate IDs
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

      if (!mongoose.Types.ObjectId.isValid(transactionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction ID format",
        });
      }

      // Try to find in Sales collection first
      let transaction = await Sale.findOne({
        _id: new mongoose.Types.ObjectId(transactionId),
        companyId: new mongoose.Types.ObjectId(companyId),
        "items.itemId": new mongoose.Types.ObjectId(itemId),
      });

      if (transaction) {
        // Update sale transaction
        const updatedTransaction = await Sale.findByIdAndUpdate(
          transactionId,
          {$set: updateData},
          {new: true}
        );

        return res.json({
          success: true,
          data: {transaction: updatedTransaction},
          message: "Sale transaction updated successfully",
        });
      }

      // Try to find in Purchases collection
      transaction = await Purchase.findOne({
        _id: new mongoose.Types.ObjectId(transactionId),
        companyId: new mongoose.Types.ObjectId(companyId),
        "items.itemId": new mongoose.Types.ObjectId(itemId),
      });

      if (transaction) {
        // Update purchase transaction
        const updatedTransaction = await Purchase.findByIdAndUpdate(
          transactionId,
          {$set: updateData},
          {new: true}
        );

        return res.json({
          success: true,
          data: {transaction: updatedTransaction},
          message: "Purchase transaction updated successfully",
        });
      }

      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update item transaction",
        error: error.message,
      });
    }
  },

  deleteItemTransaction: async (req, res) => {
    try {
      const {companyId, itemId, transactionId} = req.params;

      // Validate IDs
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

      if (!mongoose.Types.ObjectId.isValid(transactionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction ID format",
        });
      }

      // Try to find and delete from Sales collection first
      let transaction = await Sale.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(transactionId),
        companyId: new mongoose.Types.ObjectId(companyId),
        "items.itemId": new mongoose.Types.ObjectId(itemId),
      });

      if (transaction) {
        // Reverse stock changes for deleted sale
        const itemData = transaction.items.find(
          (item) => item.itemId.toString() === itemId
        );

        if (itemData) {
          await Item.findByIdAndUpdate(itemId, {
            $inc: {currentStock: itemData.quantity}, // Add back the sold quantity
          });
        }

        return res.json({
          success: true,
          data: {transaction},
          message: "Sale transaction deleted successfully",
        });
      }

      // Try to find and delete from Purchases collection
      transaction = await Purchase.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(transactionId),
        companyId: new mongoose.Types.ObjectId(companyId),
        "items.itemId": new mongoose.Types.ObjectId(itemId),
      });

      if (transaction) {
        // Reverse stock changes for deleted purchase
        const itemData = transaction.items.find(
          (item) => item.itemId.toString() === itemId
        );

        if (itemData) {
          await Item.findByIdAndUpdate(itemId, {
            $inc: {currentStock: -itemData.quantity}, // Remove the purchased quantity
          });
        }

        return res.json({
          success: true,
          data: {transaction},
          message: "Purchase transaction deleted successfully",
        });
      }

      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete item transaction",
        error: error.message,
      });
    }
  },

  // ✅ FIXED: Admin functions as object methods (not const declarations)
  getAllItemsAdmin: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        search = "",
        type = "",
        category = "",
        isActive = "",
        companyId = "",
        stockStatus = "",
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      // Build filter object
      const filter = {};

      // Search functionality
      if (search && search.trim()) {
        filter.$or = [
          {name: {$regex: search, $options: "i"}},
          {itemCode: {$regex: search, $options: "i"}},
          {description: {$regex: search, $options: "i"}},
          {category: {$regex: search, $options: "i"}},
          {hsnNumber: {$regex: search, $options: "i"}},
        ];
      }

      // Filter by type
      if (type && type.trim()) {
        filter.type = type;
      }

      // Filter by category
      if (category && category.trim()) {
        filter.category = {$regex: category, $options: "i"};
      }

      // Filter by company
      if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
        filter.companyId = new mongoose.Types.ObjectId(companyId);
      }

      // Filter by active status
      if (isActive !== "") {
        filter.isActive = isActive === "true";
      }

      // Filter by stock status
      if (stockStatus && stockStatus.trim()) {
        switch (stockStatus) {
          case "outOfStock":
            filter.type = "product";
            filter.currentStock = 0;
            break;
          case "lowStock":
            filter.type = "product";
            filter.$expr = {
              $and: [
                {$gt: [{$ifNull: ["$currentStock", 0]}, 0]},
                {
                  $lte: [
                    {$ifNull: ["$currentStock", 0]},
                    {$ifNull: ["$minStockLevel", 0]},
                  ],
                },
              ],
            };
            break;
          case "inStock":
            filter.type = "product";
            filter.$expr = {
              $gt: [
                {$ifNull: ["$currentStock", 0]},
                {$ifNull: ["$minStockLevel", 0]},
              ],
            };
            break;
        }
      }

      // Pagination
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      // Sorting
      const sortObject = {};
      sortObject[sortBy] = sortOrder === "asc" ? 1 : -1;

      // Execute query with company population
      const items = await Item.find(filter)
        .sort(sortObject)
        .skip(skip)
        .limit(limitNum)
        .populate("companyId", "businessName phoneNumber email state city")
        .lean();

      const totalItems = await Item.countDocuments(filter);

      // Calculate additional stats
      const totalActiveItems = await Item.countDocuments({
        ...filter,
        isActive: true,
      });

      const totalProducts = await Item.countDocuments({
        ...filter,
        type: "product",
      });

      const totalServices = await Item.countDocuments({
        ...filter,
        type: "service",
      });

      const pagination = {
        current: pageNum,
        total: Math.ceil(totalItems / limitNum),
        totalItems: totalItems,
        hasNextPage: pageNum < Math.ceil(totalItems / limitNum),
        hasPrevPage: pageNum > 1,
        limit: limitNum,
      };

      // Format items for admin view
      const formattedItems = items.map((item) => ({
        id: item._id,
        name: item.name,
        itemCode: item.itemCode,
        hsnNumber: item.hsnNumber,
        type: item.type,
        category: item.category,
        unit: item.unit,
        description: item.description,

        // Pricing
        buyPrice: item.buyPrice || 0,
        salePrice: item.salePrice || 0,
        gstRate: item.gstRate || 0,

        // Stock info (for products)
        currentStock: item.type === "product" ? item.currentStock || 0 : null,
        minStockLevel: item.type === "product" ? item.minStockLevel || 0 : null,
        stockStatus:
          item.type === "service"
            ? "N/A"
            : item.currentStock === 0
            ? "Out of Stock"
            : item.currentStock <= (item.minStockLevel || 0)
            ? "Low Stock"
            : "In Stock",
        stockHealth:
          item.type === "service"
            ? "good"
            : item.currentStock === 0
            ? "critical"
            : item.currentStock <= (item.minStockLevel || 0)
            ? "warning"
            : "good",

        // Status
        isActive: item.isActive,

        // Company info
        companyInfo: item.companyId
          ? {
              id: item.companyId._id,
              name: item.companyId.businessName,
              phone: item.companyId.phoneNumber,
              email: item.companyId.email,
              location: `${item.companyId.city || ""}, ${
                item.companyId.state || ""
              }`.replace(/^,\s*|,\s*$/g, ""),
            }
          : null,

        // Timestamps
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        createdBy: item.createdBy,
        lastModifiedBy: item.lastModifiedBy,

        // Admin-specific fields
        adminView: true,
        createdDaysAgo: Math.floor(
          (Date.now() - new Date(item.createdAt)) / (1000 * 60 * 60 * 24)
        ),
      }));

      res.json({
        success: true,
        message: `Retrieved ${formattedItems.length} items for admin dashboard`,
        data: {
          items: formattedItems,
          pagination,
          stats: {
            totalItems,
            totalActiveItems,
            totalProducts,
            totalServices,
            inactiveItems: totalItems - totalActiveItems,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error retrieving items for admin",
        error: error.message,
      });
    }
  },

  getAdminItemStats: async (req, res) => {
    try {
      // Basic counts
      const totalItems = await Item.countDocuments();
      const totalProducts = await Item.countDocuments({type: "product"});
      const totalServices = await Item.countDocuments({type: "service"});
      const activeItems = await Item.countDocuments({isActive: true});
      const inactiveItems = totalItems - activeItems;

      // Stock analysis (products only)
      const stockAnalysis = await Item.aggregate([
        {$match: {type: "product", isActive: true}},
        {
          $project: {
            currentStock: {$ifNull: ["$currentStock", 0]},
            minStockLevel: {$ifNull: ["$minStockLevel", 0]},
            stockStatus: {
              $cond: [
                {$eq: [{$ifNull: ["$currentStock", 0]}, 0]},
                "outOfStock",
                {
                  $cond: [
                    {
                      $lte: [
                        {$ifNull: ["$currentStock", 0]},
                        {$ifNull: ["$minStockLevel", 0]},
                      ],
                    },
                    "lowStock",
                    "inStock",
                  ],
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: "$stockStatus",
            count: {$sum: 1},
          },
        },
      ]);

      // Category distribution
      const categoryStats = await Item.aggregate([
        {$match: {isActive: true}},
        {
          $group: {
            _id: "$category",
            count: {$sum: 1},
            products: {
              $sum: {$cond: [{$eq: ["$type", "product"]}, 1, 0]},
            },
            services: {
              $sum: {$cond: [{$eq: ["$type", "service"]}, 1, 0]},
            },
          },
        },
        {$sort: {count: -1}},
        {$limit: 10},
      ]);

      // GST rate distribution
      const gstStats = await Item.aggregate([
        {$match: {isActive: true}},
        {
          $group: {
            _id: "$gstRate",
            count: {$sum: 1},
          },
        },
        {$sort: {_id: 1}},
      ]);

      // Recent items (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentItems = await Item.countDocuments({
        createdAt: {$gte: sevenDaysAgo},
      });

      // Company with most items
      const companyItemStats = await Item.aggregate([
        {$match: {isActive: true}},
        {
          $group: {
            _id: "$companyId",
            itemCount: {$sum: 1},
          },
        },
        {$sort: {itemCount: -1}},
        {$limit: 5},
        {
          $lookup: {
            from: "companies",
            localField: "_id",
            foreignField: "_id",
            as: "company",
          },
        },
        {
          $project: {
            itemCount: 1,
            companyName: {$arrayElemAt: ["$company.businessName", 0]},
          },
        },
      ]);

      // Format stock analysis
      const stockSummary = {
        inStock: 0,
        lowStock: 0,
        outOfStock: 0,
      };

      stockAnalysis.forEach((item) => {
        stockSummary[item._id] = item.count;
      });

      const formattedStats = {
        totalItems,
        totalProducts,
        totalServices,
        activeItems,
        inactiveItems,
        recentItems,
        stockSummary,
        categoryDistribution: categoryStats.reduce((acc, item) => {
          acc[item._id] = {
            total: item.count,
            products: item.products,
            services: item.services,
          };
          return acc;
        }, {}),
        gstDistribution: gstStats.reduce((acc, item) => {
          acc[`${item._id}%`] = item.count;
          return acc;
        }, {}),
        topCompanies: companyItemStats.map((item) => ({
          companyName: item.companyName || "Unknown",
          itemCount: item.itemCount,
        })),
      };

      res.json({
        success: true,
        message: "Admin item statistics retrieved successfully",
        data: formattedStats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error retrieving admin item statistics",
        error: error.message,
      });
    }
  },

  exportAllItemsAdmin: async (req, res) => {
    try {
      const {format = "csv", ...filters} = req.query;

      // Build filter object (same as getAllItemsAdmin)
      const filter = {};

      if (filters.search && filters.search.trim()) {
        filter.$or = [
          {name: {$regex: filters.search, $options: "i"}},
          {itemCode: {$regex: filters.search, $options: "i"}},
          {category: {$regex: filters.search, $options: "i"}},
        ];
      }

      if (filters.type && filters.type.trim()) {
        filter.type = filters.type;
      }

      if (filters.category && filters.category.trim()) {
        filter.category = {$regex: filters.category, $options: "i"};
      }

      if (filters.isActive !== "") {
        filter.isActive = filters.isActive === "true";
      }

      const items = await Item.find(filter)
        .populate("companyId", "businessName phoneNumber email state city")
        .lean();

      // Format for export
      const formattedData = items.map((item) => ({
        "Item Name": item.name,
        "Item Code": item.itemCode || "",
        "HSN Number": item.hsnNumber || "",
        Type: item.type,
        Category: item.category,
        Unit: item.unit,
        Description: item.description || "",
        "Buy Price": item.buyPrice || 0,
        "Sale Price": item.salePrice || 0,
        "GST Rate": `${item.gstRate || 0}%`,
        "Current Stock":
          item.type === "product" ? item.currentStock || 0 : "N/A",
        "Min Stock Level":
          item.type === "product" ? item.minStockLevel || 0 : "N/A",
        "Stock Status":
          item.type === "service"
            ? "N/A"
            : item.currentStock === 0
            ? "Out of Stock"
            : item.currentStock <= (item.minStockLevel || 0)
            ? "Low Stock"
            : "In Stock",
        Status: item.isActive ? "Active" : "Inactive",
        Company: item.companyId?.businessName || "Unknown",
        "Company Phone": item.companyId?.phoneNumber || "",
        "Company Location": `${item.companyId?.city || ""}, ${
          item.companyId?.state || ""
        }`.replace(/^,\s*|,\s*$/g, ""),
        "Created Date": new Date(item.createdAt).toLocaleDateString(),
        "Created By": item.createdBy || "system",
      }));

      if (format === "json") {
        res.json({
          success: true,
          data: formattedData,
          total: formattedData.length,
        });
      } else {
        // For CSV format
        const csv = [
          Object.keys(formattedData[0] || {}).join(","),
          ...formattedData.map((row) =>
            Object.values(row)
              .map((val) => `"${val}"`)
              .join(",")
          ),
        ].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="items_export_${Date.now()}.csv"`
        );
        res.send(csv);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error exporting items",
        error: error.message,
      });
    }
  },

  getAllLowStockItemsAdmin: async (req, res) => {
    try {
      const {limit = 100, companyId = ""} = req.query;

      const filter = {
        type: "product",
        isActive: true,
        $expr: {
          $lte: [
            {$ifNull: ["$currentStock", 0]},
            {$ifNull: ["$minStockLevel", 0]},
          ],
        },
      };

      // Filter by specific company if provided
      if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
        filter.companyId = new mongoose.Types.ObjectId(companyId);
      }

      const lowStockItems = await Item.find(filter)
        .populate("companyId", "businessName phoneNumber email state city")
        .select(
          "name itemCode category currentStock minStockLevel unit salePrice companyId createdAt"
        )
        .limit(parseInt(limit))
        .sort({currentStock: 1})
        .lean();

      const formattedItems = lowStockItems.map((item) => ({
        id: item._id,
        name: item.name,
        itemCode: item.itemCode,
        category: item.category,
        currentStock: item.currentStock || 0,
        minStockLevel: item.minStockLevel || 0,
        unit: item.unit,
        salePrice: item.salePrice || 0,
        stockDeficit: (item.minStockLevel || 0) - (item.currentStock || 0),
        companyInfo: item.companyId
          ? {
              id: item.companyId._id,
              name: item.companyId.businessName,
              phone: item.companyId.phoneNumber,
              location: `${item.companyId.city || ""}, ${
                item.companyId.state || ""
              }`.replace(/^,\s*|,\s*$/g, ""),
            }
          : null,
        urgency: item.currentStock === 0 ? "critical" : "warning",
      }));

      res.json({
        success: true,
        data: {
          items: formattedItems,
          count: formattedItems.length,
          totalStockDeficit: formattedItems.reduce(
            (sum, item) => sum + item.stockDeficit,
            0
          ),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching admin low stock items",
        error: error.message,
      });
    }
  },

  // ===== ✅ ADMIN NAME VERIFICATION FUNCTIONS =====

  /**
   * Get items pending name verification
   * GET /admin/items/pending-verification
   */
  getPendingVerificationItems: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        search = "",
        companyId = "",
        status = "all", // ✅ NEW: all, pending, approved, rejected
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      // ✅ UPDATED: Show all items by default, filter by status if needed
      const filter = {};

      // Status filter
      if (status !== "all") {
        filter["nameVerification.status"] = status;
      }

      // Search filter
      if (search && search.trim()) {
        filter.$or = [
          {"nameVerification.originalName": {$regex: search, $options: "i"}},
          {name: {$regex: search, $options: "i"}}, // ✅ Also search current name
          {itemCode: {$regex: search, $options: "i"}},
          {category: {$regex: search, $options: "i"}},
        ];
      }

      // Company filter
      if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
        filter.companyId = new mongoose.Types.ObjectId(companyId);
      }

      // Pagination
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      // Sorting
      const sortObject = {};
      sortObject[sortBy] = sortOrder === "desc" ? -1 : 1;

      const items = await Item.find(filter)
        .populate("companyId", "businessName phoneNumber email state city")
        .sort(sortObject)
        .skip(skip)
        .limit(limitNum)
        .lean();

      const totalItems = await Item.countDocuments(filter);

      const formattedItems = items.map((item) => ({
        id: item._id,
        currentName: item.name, // ✅ Current name (approved or original)
        originalName: item.nameVerification?.originalName || item.name,
        verifiedName: item.nameVerification?.verifiedName,
        itemCode: item.itemCode,
        category: item.category,
        type: item.type,
        unit: item.unit,
        gstRate: item.gstRate || 0,
        description: item.description || "",

        // Pricing info for admin
        buyPrice: item.buyPrice || 0,
        salePrice: item.salePrice || 0,

        // Stock info
        currentStock: item.type === "product" ? item.currentStock || 0 : "N/A",

        // Company information
        companyInfo: item.companyId
          ? {
              id: item.companyId._id,
              name: item.companyId.businessName,
              phone: item.companyId.phoneNumber,
              email: item.companyId.email,
              location: `${item.companyId.city || ""}, ${
                item.companyId.state || ""
              }`.replace(/^,\s*|,\s*$/g, ""),
            }
          : null,

        // ✅ ENHANCED: Verification details
        verification: {
          status: item.nameVerification?.status || "pending",
          submittedDate: item.createdAt,
          verificationDate: item.nameVerification?.verificationDate,
          verifiedBy: item.nameVerification?.verifiedBy,
          rejectionReason: item.nameVerification?.rejectionReason,
          history: item.nameVerification?.verificationHistory || [],
        },

        // Additional metrics
        daysSinceSubmission: Math.floor(
          (Date.now() - new Date(item.createdAt)) / (1000 * 60 * 60 * 24)
        ),
        needsAttention:
          Math.floor(
            (Date.now() - new Date(item.createdAt)) / (1000 * 60 * 60 * 24)
          ) > 3 && item.nameVerification?.status === "pending",
      }));

      // ✅ ENHANCED: Summary statistics
      const statusCounts = await Item.aggregate([
        {
          $match:
            companyId && mongoose.Types.ObjectId.isValid(companyId)
              ? {companyId: new mongoose.Types.ObjectId(companyId)}
              : {},
        },
        {
          $group: {
            _id: "$nameVerification.status",
            count: {$sum: 1},
          },
        },
      ]);

      const summary = {
        total: totalItems,
        pending: 0,
        approved: 0,
        rejected: 0,
      };

      statusCounts.forEach((stat) => {
        if (stat._id) summary[stat._id] = stat.count;
      });

      const pagination = {
        page: pageNum,
        limit: limitNum,
        total: totalItems,
        totalPages: Math.ceil(totalItems / limitNum),
        hasNextPage: pageNum < Math.ceil(totalItems / limitNum),
        hasPrevPage: pageNum > 1,
      };

      res.json({
        success: true,
        data: {
          items: formattedItems,
          pagination,
          summary,
          filters: {
            currentStatus: status,
            availableStatuses: ["all", "pending", "approved", "rejected"],
          },
        },
        message: `Found ${formattedItems.length} items for verification review`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch items for verification",
        error: error.message,
      });
    }
  },

  /**
   * Approve item name
   * PUT /admin/items/:itemId/approve-name
   */
  approveItemName: async (req, res) => {
    try {
      const {itemId} = req.params;
      const {correctedName, adminId = "admin", adminNotes = ""} = req.body;

      if (!mongoose.Types.ObjectId.isValid(itemId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid item ID format",
        });
      }

      const item = await Item.findById(itemId).populate(
        "companyId",
        "businessName phoneNumber email"
      );

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found",
        });
      }

      // ✅ UPDATED: Admin can approve from any status (not just pending)
      const originalName = item.nameVerification?.originalName || item.name;

      // ✅ NEW: Use corrected name if provided, otherwise keep original
      const finalName =
        correctedName && correctedName.trim()
          ? correctedName.trim()
          : originalName;

      // Check if corrected name already exists in the same company
      if (correctedName && correctedName.trim() !== item.name) {
        const existingItem = await Item.findOne({
          companyId: item.companyId,
          name: finalName,
          _id: {$ne: itemId},
        });

        if (existingItem) {
          return res.status(400).json({
            success: false,
            message: `An item with the name "${finalName}" already exists in this company`,
          });
        }
      }

      // ✅ UPDATED: Determine if name was corrected
      const wasNameCorrected =
        correctedName &&
        correctedName.trim() &&
        correctedName.trim() !== originalName;

      const reasonMessage = wasNameCorrected
        ? `Name corrected by admin: "${originalName}" → "${finalName}". ${adminNotes}`
        : `Name approved as submitted. ${adminNotes}`;

      // Update item with approved/corrected name
      const updatedItem = await Item.findByIdAndUpdate(
        itemId,
        {
          $set: {
            name: finalName, // ✅ Set the final approved name
            "nameVerification.status": "approved",
            "nameVerification.verifiedName": finalName,
            "nameVerification.verifiedBy": adminId,
            "nameVerification.verificationDate": new Date(),
            lastModifiedBy: adminId,
            updatedAt: new Date(),
          },
          $push: {
            "nameVerification.verificationHistory": {
              action: "approved",
              oldName: originalName,
              newName: finalName,
              adminId: adminId,
              date: new Date(),
              reason: reasonMessage,
            },
          },
        },
        {new: true}
      );

      if (wasNameCorrected) {
        // Name was corrected
      } else {
        // Name was approved as submitted
      }

      res.json({
        success: true,
        message: wasNameCorrected
          ? "Item name corrected and approved successfully"
          : "Item name approved successfully",
        data: {
          item: {
            id: updatedItem._id,
            originalName: originalName,
            finalName: finalName,
            wasNameCorrected: wasNameCorrected,
            status: "approved",
            companyName: item.companyId?.businessName || "Unknown",
          },
          verification: {
            action: wasNameCorrected
              ? "corrected_and_approved"
              : "approved_as_submitted",
            approvedBy: adminId,
            approvedAt: new Date(),
            notes: reasonMessage,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to approve item name",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Quick approve multiple items (names are correct as submitted)
  quickApproveItems: async (req, res) => {
    try {
      const {itemIds, adminId = "admin"} = req.body;

      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Item IDs array is required",
        });
      }

      const results = {
        approved: [],
        failed: [],
        total: itemIds.length,
      };

      for (const itemId of itemIds) {
        try {
          if (!mongoose.Types.ObjectId.isValid(itemId)) {
            results.failed.push({
              itemId,
              error: "Invalid item ID format",
            });
            continue;
          }

          const item = await Item.findById(itemId);
          if (!item) {
            results.failed.push({
              itemId,
              error: "Item not found",
            });
            continue;
          }

          const originalName = item.nameVerification?.originalName || item.name;

          // ✅ Quick approve - name is correct as submitted
          await Item.findByIdAndUpdate(itemId, {
            $set: {
              name: originalName, // Keep original name
              "nameVerification.status": "approved",
              "nameVerification.verifiedName": originalName,
              "nameVerification.verifiedBy": adminId,
              "nameVerification.verificationDate": new Date(),
            },
            $push: {
              "nameVerification.verificationHistory": {
                action: "approved",
                oldName: originalName,
                newName: originalName,
                adminId: adminId,
                date: new Date(),
                reason: "Quick approved - name correct as submitted",
              },
            },
          });

          results.approved.push({
            itemId,
            name: originalName,
          });
        } catch (error) {
          results.failed.push({
            itemId,
            error: error.message,
          });
        }
      }

      res.json({
        success: true,
        message: `Quick approval completed: ${results.approved.length} approved, ${results.failed.length} failed`,
        data: results,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to quick approve items",
        error: error.message,
      });
    }
  },

  /**
   * Reject item name
   * PUT /admin/items/:itemId/reject-name
   */
  rejectItemName: async (req, res) => {
    try {
      const {itemId} = req.params;
      const {rejectionReason, adminId, suggestedName} = req.body;

      if (!mongoose.Types.ObjectId.isValid(itemId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid item ID format",
        });
      }

      if (!rejectionReason || !rejectionReason.trim()) {
        return res.status(400).json({
          success: false,
          message: "Rejection reason is required",
        });
      }

      const item = await Item.findById(itemId).populate(
        "companyId",
        "businessName phoneNumber email"
      );

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found",
        });
      }

      if (item.nameVerification.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: `Item is not pending verification (current status: ${item.nameVerification.status})`,
        });
      }

      // Update item with rejection
      const updatedItem = await Item.findByIdAndUpdate(
        itemId,
        {
          $set: {
            "nameVerification.status": "rejected",
            "nameVerification.rejectionReason": rejectionReason.trim(),
            "nameVerification.verifiedBy": adminId || "admin",
            "nameVerification.verificationDate": new Date(),
            lastModifiedBy: adminId || "admin",
            updatedAt: new Date(),
          },
          $push: {
            "nameVerification.verificationHistory": {
              action: "rejected",
              oldName: item.nameVerification.originalName,
              newName: suggestedName || null,
              adminId: adminId || "admin",
              date: new Date(),
              reason: rejectionReason.trim(),
            },
          },
        },
        {new: true}
      );

      // Optional: Send notification to company
      // await notifyCompanyNameRejected(item.companyId, item.name, rejectionReason);

      res.json({
        success: true,
        message: "Item name rejected successfully",
        data: {
          item: {
            id: updatedItem._id,
            originalName: item.nameVerification.originalName,
            status: "rejected",
            companyName: item.companyId?.businessName || "Unknown",
          },
          rejection: {
            reason: rejectionReason.trim(),
            suggestedName: suggestedName || null,
            rejectedBy: adminId || "admin",
            rejectedAt: new Date(),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to reject item name",
        error: error.message,
      });
    }
  },

  /**
   * Get verification history for an item
   * GET /admin/items/:itemId/verification-history
   */
  getVerificationHistory: async (req, res) => {
    try {
      const {itemId} = req.params;

      if (!mongoose.Types.ObjectId.isValid(itemId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid item ID format",
        });
      }

      const item = await Item.findById(itemId)
        .populate("companyId", "businessName phoneNumber email")
        .select("name nameVerification createdAt")
        .lean();

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found",
        });
      }

      const verificationData = {
        item: {
          id: item._id,
          currentName: item.name,
          companyName: item.companyId?.businessName || "Unknown",
          submittedDate: item.createdAt,
        },
        verification: {
          status: item.nameVerification.status,
          originalName: item.nameVerification.originalName,
          verifiedName: item.nameVerification.verifiedName,
          verifiedBy: item.nameVerification.verifiedBy,
          verificationDate: item.nameVerification.verificationDate,
          rejectionReason: item.nameVerification.rejectionReason,
          history: (item.nameVerification.verificationHistory || []).map(
            (entry) => ({
              action: entry.action,
              oldName: entry.oldName,
              newName: entry.newName,
              adminId: entry.adminId,
              date: entry.date,
              reason: entry.reason,
              formattedDate: new Date(entry.date).toLocaleString(),
            })
          ),
        },
      };

      res.json({
        success: true,
        data: verificationData,
        message: "Verification history retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch verification history",
        error: error.message,
      });
    }
  },

  /**
   * Get verification statistics
   * GET /admin/items/verification-stats
   */
  getVerificationStats: async (req, res) => {
    try {
      const {companyId} = req.query;

      // Build match filter
      const matchFilter = {};
      if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
        matchFilter.companyId = new mongoose.Types.ObjectId(companyId);
      }

      const stats = await Item.aggregate([
        {$match: matchFilter},
        {
          $group: {
            _id: "$nameVerification.status",
            count: {$sum: 1},
            items: {$push: "$nameVerification.originalName"},
          },
        },
        {
          $group: {
            _id: null,
            totalItems: {$sum: "$count"},
            statusCounts: {
              $push: {
                status: "$_id",
                count: "$count",
              },
            },
          },
        },
      ]);

      // Recent verification activity (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentActivity = await Item.find({
        ...matchFilter,
        "nameVerification.verificationDate": {$gte: sevenDaysAgo},
      })
        .select(
          "nameVerification.status nameVerification.verificationDate nameVerification.originalName"
        )
        .populate("companyId", "businessName")
        .sort({"nameVerification.verificationDate": -1})
        .limit(10)
        .lean();

      // Average verification time
      const avgVerificationTime = await Item.aggregate([
        {
          $match: {
            ...matchFilter,
            "nameVerification.status": {$in: ["approved", "rejected"]},
            "nameVerification.verificationDate": {$exists: true},
          },
        },
        {
          $project: {
            verificationTime: {
              $divide: [
                {
                  $subtract: [
                    "$nameVerification.verificationDate",
                    "$createdAt",
                  ],
                },
                1000 * 60 * 60 * 24, // Convert to days
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgDays: {$avg: "$verificationTime"},
          },
        },
      ]);

      const formattedStats = {
        total: stats[0]?.totalItems || 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        averageVerificationDays: avgVerificationTime[0]?.avgDays || 0,
        recentActivity: recentActivity.map((item) => ({
          itemName: item.nameVerification.originalName,
          status: item.nameVerification.status,
          verificationDate: item.nameVerification.verificationDate,
          companyName: item.companyId?.businessName || "Unknown",
        })),
      };

      // Process status counts
      if (stats[0]?.statusCounts) {
        stats[0].statusCounts.forEach((statusCount) => {
          formattedStats[statusCount.status] = statusCount.count;
        });
      }

      res.json({
        success: true,
        data: formattedStats,
        message: "Verification statistics retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch verification statistics",
        error: error.message,
      });
    }
  },

  /**
   * Bulk approve multiple items
   * POST /admin/items/bulk-approve
   */
  bulkApproveItems: async (req, res) => {
    try {
      const {items, adminId} = req.body; // items: [{ itemId, verifiedName }]

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Items array is required",
        });
      }

      const results = {
        approved: [],
        failed: [],
        total: items.length,
      };

      for (const itemData of items) {
        try {
          const {itemId, verifiedName} = itemData;

          if (!mongoose.Types.ObjectId.isValid(itemId)) {
            results.failed.push({
              itemId,
              error: "Invalid item ID format",
            });
            continue;
          }

          const item = await Item.findById(itemId);
          if (!item) {
            results.failed.push({
              itemId,
              error: "Item not found",
            });
            continue;
          }

          if (item.nameVerification.status !== "pending") {
            results.failed.push({
              itemId,
              error: `Item not pending verification (status: ${item.nameVerification.status})`,
            });
            continue;
          }

          const finalName = verifiedName || item.nameVerification.originalName;

          await Item.findByIdAndUpdate(itemId, {
            $set: {
              name: finalName,
              "nameVerification.status": "approved",
              "nameVerification.verifiedName": finalName,
              "nameVerification.verifiedBy": adminId || "admin",
              "nameVerification.verificationDate": new Date(),
            },
            $push: {
              "nameVerification.verificationHistory": {
                action: "approved",
                oldName: item.nameVerification.originalName,
                newName: finalName,
                adminId: adminId || "admin",
                date: new Date(),
                reason: "Bulk approved by admin",
              },
            },
          });

          results.approved.push({
            itemId,
            originalName: item.nameVerification.originalName,
            verifiedName: finalName,
          });
        } catch (error) {
          results.failed.push({
            itemId: itemData.itemId,
            error: error.message,
          });
        }
      }

      res.json({
        success: true,
        message: `Bulk approval completed: ${results.approved.length} approved, ${results.failed.length} failed`,
        data: results,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to bulk approve items",
        error: error.message,
      });
    }
  },

  /**
   * Resubmit item for verification (for companies to fix rejected items)
   * PUT /admin/items/:itemId/resubmit
   */
  resubmitForVerification: async (req, res) => {
    try {
      const {itemId} = req.params;
      const {newName, resubmissionReason} = req.body;

      if (!mongoose.Types.ObjectId.isValid(itemId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid item ID format",
        });
      }

      if (!newName || !newName.trim()) {
        return res.status(400).json({
          success: false,
          message: "New name is required for resubmission",
        });
      }

      const item = await Item.findById(itemId);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found",
        });
      }

      if (item.nameVerification.status !== "rejected") {
        return res.status(400).json({
          success: false,
          message: "Only rejected items can be resubmitted",
        });
      }

      // Update item for resubmission
      const updatedItem = await Item.findByIdAndUpdate(
        itemId,
        {
          $set: {
            name: newName.trim(),
            "nameVerification.status": "pending",
            "nameVerification.originalName": newName.trim(),
            "nameVerification.verifiedName": null,
            "nameVerification.verifiedBy": null,
            "nameVerification.verificationDate": null,
            "nameVerification.rejectionReason": null,
            updatedAt: new Date(),
          },
          $push: {
            "nameVerification.verificationHistory": {
              action: "resubmitted",
              oldName: item.nameVerification.originalName,
              newName: newName.trim(),
              date: new Date(),
              reason: resubmissionReason || "Resubmitted after rejection",
            },
          },
        },
        {new: true}
      );

      res.json({
        success: true,
        message: "Item resubmitted for verification successfully",
        data: {
          item: {
            id: updatedItem._id,
            newName: newName.trim(),
            status: "pending",
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to resubmit item for verification",
        error: error.message,
      });
    }
  },
};

module.exports = itemController;
