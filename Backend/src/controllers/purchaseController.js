const Purchase = require("../models/Purchase");
const Item = require("../models/Item");
const Party = require("../models/Party");
const Company = require("../models/Company");
const mongoose = require("mongoose");

const normalizePaymentMethod = (method) => {
  const methodMapping = {
    "bank account": "bank_account",
    bank_transfer: "bank_transfer",
    bankaccount: "bank_account",
    banktransfer: "bank_transfer",
    "bank transfer": "bank_transfer",
    "credit card": "card",
    "debit card": "card",
    "net banking": "online",
    netbanking: "online",
    cash: "cash",
    upi: "upi",
    cheque: "cheque",
    credit: "credit",
    online: "online",
    bank: "bank",
  };

  return methodMapping[method?.toLowerCase()] || method || "credit";
};

const purchaseController = {
  createPurchase: async (req, res) => {
    try {
      const {
        companyId,
        supplier,
        supplierMobile,
        purchaseNumber,
        purchaseDate,
        purchaseType = "gst",
        gstEnabled = true,
        taxMode = "without-tax",
        priceIncludesTax = false,
        items = [],
        totals = {},
        payment = {},
        notes = "",
        termsAndConditions = "",
        status = "draft",
        createdBy = "system",
        lastModifiedBy = "system",
      } = req.body;

      // Validate required fields
      if (!companyId || !supplier || !items || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: companyId, supplier, or items",
        });
      }

      // FIXED: Sync tax mode fields (matching Sale controller)
      const finalTaxMode =
        taxMode || (priceIncludesTax ? "with-tax" : "without-tax");
      const finalPriceIncludesTax = finalTaxMode === "with-tax";

      console.log("🔄 Tax mode synchronization:", {
        originalTaxMode: taxMode,
        originalPriceIncludesTax: priceIncludesTax,
        finalTaxMode,
        finalPriceIncludesTax,
      });

      // Find or create supplier (matching Sale controller logic)
      let supplierRecord;

      if (supplier && mongoose.Types.ObjectId.isValid(supplier)) {
        supplierRecord = await Party.findById(supplier);
        if (!supplierRecord) {
          return res.status(400).json({
            success: false,
            message: "Supplier not found with provided ID",
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: "Valid supplier ID is required",
        });
      }

      // Process items with proper tax calculations (matching Sale controller)
      const processedItems = [];
      let calculatedTotals = {
        subtotal: 0,
        totalQuantity: 0,
        totalDiscountAmount: 0,
        totalTax: 0,
        totalCGST: 0,
        totalSGST: 0,
        totalIGST: 0,
        totalTaxableAmount: 0,
        finalTotal: 0,
        withTaxTotal: 0,
        withoutTaxTotal: 0,
      };

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Parse basic values
        const quantity = parseFloat(item.quantity) || 0;
        const pricePerUnit = parseFloat(item.pricePerUnit) || 0;
        const discountPercent = parseFloat(item.discountPercent) || 0;
        const discountAmount = parseFloat(item.discountAmount) || 0;
        const taxRate = parseFloat(item.taxRate) || 18;

        // Skip invalid items
        if (quantity <= 0 || pricePerUnit <= 0) {
          console.log(`⚠️ Skipping item ${i + 1} - invalid quantity or price`);
          continue;
        }

        // Determine item tax mode (matching Sale controller)
        const itemTaxMode = item.taxMode || finalTaxMode;
        const itemPriceIncludesTax = itemTaxMode === "with-tax";
        const lineTotalBeforeDiscount = quantity * pricePerUnit;
        const itemDiscountAmount =
          discountAmount || (lineTotalBeforeDiscount * discountPercent) / 100;
        const lineTotalAfterDiscount = Math.max(
          0,
          lineTotalBeforeDiscount - itemDiscountAmount
        );

        // FIXED: Calculate taxes based on item tax mode (matching Sale controller)
        let cgst = 0;
        let sgst = 0;
        let igst = 0;
        let itemTaxableAmount = 0;
        let finalItemAmount = 0;

        if (gstEnabled && taxRate > 0) {
          if (itemPriceIncludesTax) {
            // WITH TAX MODE - Extract tax from amount
            console.log(`🟢 Item ${i + 1}: WITH TAX calculation`);

            const taxMultiplier = 1 + taxRate / 100;
            itemTaxableAmount = lineTotalAfterDiscount / taxMultiplier;

            const totalTaxAmount = lineTotalAfterDiscount - itemTaxableAmount;
            cgst = totalTaxAmount / 2;
            sgst = totalTaxAmount / 2;
            igst = totalTaxAmount;
            finalItemAmount = lineTotalAfterDiscount; // Amount stays same (tax included)
          } else {
            itemTaxableAmount = lineTotalAfterDiscount;
            const totalTaxAmount = (itemTaxableAmount * taxRate) / 100;

            cgst = totalTaxAmount / 2;
            sgst = totalTaxAmount / 2;
            igst = totalTaxAmount;

            finalItemAmount = itemTaxableAmount + totalTaxAmount;
          }
        } else {
          // No GST calculation
          itemTaxableAmount = lineTotalAfterDiscount;
          finalItemAmount = lineTotalAfterDiscount;
          cgst = 0;
          sgst = 0;
          igst = 0;

          console.log(`❌ Item ${i + 1}: NO GST calculation`);
        }

        // Create processed item with all required fields (matching Sale controller)
        const processedItem = {
          itemRef: item.itemRef || null,
          itemName: item.itemName,
          itemCode: item.itemCode || "",
          hsnCode: item.hsnCode || "0000",
          category: item.category || "",
          quantity: quantity,
          unit: item.unit || "PCS",
          pricePerUnit: pricePerUnit,
          taxRate: taxRate,

          // FIXED: Both tax mode fields for compatibility
          taxMode: itemTaxMode,
          priceIncludesTax: itemPriceIncludesTax,

          // Discount fields
          discountPercent: parseFloat(discountPercent.toFixed(2)),
          discountAmount: parseFloat(itemDiscountAmount.toFixed(2)),

          // Tax amounts - both field sets for compatibility
          cgst: parseFloat(cgst.toFixed(2)),
          sgst: parseFloat(sgst.toFixed(2)),
          igst: parseFloat(igst.toFixed(2)),
          cgstAmount: parseFloat(cgst.toFixed(2)),
          sgstAmount: parseFloat(sgst.toFixed(2)),
          igstAmount: parseFloat(igst.toFixed(2)),

          // Calculated amounts
          taxableAmount: parseFloat(itemTaxableAmount.toFixed(2)),
          totalTaxAmount: parseFloat((cgst + sgst + igst).toFixed(2)),

          // Final amounts - both field names for compatibility
          amount: parseFloat(finalItemAmount.toFixed(2)),
          itemAmount: parseFloat(finalItemAmount.toFixed(2)),

          // Purchase-specific fields
          receivedQuantity: 0,
          pendingQuantity: quantity,

          // Line number
          lineNumber: i + 1,
        };

        processedItems.push(processedItem);

        // Update calculated totals
        calculatedTotals.totalQuantity += quantity;
        calculatedTotals.totalDiscountAmount += itemDiscountAmount;
        calculatedTotals.totalCGST += cgst;
        calculatedTotals.totalSGST += sgst;
        calculatedTotals.totalIGST += igst;
        calculatedTotals.totalTaxableAmount += itemTaxableAmount;
        calculatedTotals.finalTotal += finalItemAmount;
      }

      // Calculate final totals (matching Sale controller)
      calculatedTotals.totalTax =
        calculatedTotals.totalCGST +
        calculatedTotals.totalSGST +
        calculatedTotals.totalIGST;
      calculatedTotals.subtotal = calculatedTotals.totalTaxableAmount;
      calculatedTotals.withTaxTotal = calculatedTotals.finalTotal;
      calculatedTotals.withoutTaxTotal = calculatedTotals.totalTaxableAmount;

      const normalizedPaymentMethod = normalizePaymentMethod(payment.method);

      const purchaseData = {
        companyId,
        supplier: supplierRecord._id,
        supplierMobile: supplierMobile || supplierRecord.mobile || "",
        purchaseNumber,
        purchaseDate: new Date(purchaseDate),
        purchaseType,
        gstEnabled,

        // FIXED: Tax mode fields
        taxMode: finalTaxMode,
        priceIncludesTax: finalPriceIncludesTax,

        // Items
        items: processedItems,

        // Totals - use calculated values or provided values
        totals: {
          subtotal: totals.subtotal || calculatedTotals.subtotal,
          totalQuantity: calculatedTotals.totalQuantity,
          totalDiscountAmount: calculatedTotals.totalDiscountAmount,
          totalTax: calculatedTotals.totalTax,
          totalCGST: calculatedTotals.totalCGST,
          totalSGST: calculatedTotals.totalSGST,
          totalIGST: calculatedTotals.totalIGST,
          totalTaxableAmount: calculatedTotals.totalTaxableAmount,
          finalTotal: totals.finalTotal || calculatedTotals.finalTotal,
          roundOff: totals.roundOff || 0,
          withTaxTotal: calculatedTotals.withTaxTotal,
          withoutTaxTotal: calculatedTotals.withoutTaxTotal,
        },

        // ✅ FIXED: Payment information with normalized payment method
        payment: {
          method: normalizedPaymentMethod, // Use normalized method
          status: payment.status || "pending",
          paidAmount: payment.paidAmount || 0,
          pendingAmount: payment.pendingAmount || calculatedTotals.finalTotal,
          paymentDate: payment.paymentDate
            ? new Date(payment.paymentDate)
            : new Date(),
          dueDate: payment.dueDate ? new Date(payment.dueDate) : null,
          creditDays: payment.creditDays || 0,
          reference: payment.reference || "",
          notes: payment.notes || "",
        },

        // Additional fields
        notes,
        termsAndConditions,
        status,
        receivingStatus: "pending",
        createdBy,
        lastModifiedBy,
      };

      console.log("💾 Creating purchase with processed data:", {
        globalTaxMode: purchaseData.taxMode,
        globalPriceIncludesTax: purchaseData.priceIncludesTax,
        itemCount: purchaseData.items.length,
        finalTotal: purchaseData.totals.finalTotal,
        paymentMethod: purchaseData.payment.method, // Log the final payment method
      });

      // Create and save the purchase
      const purchase = new Purchase(purchaseData);
      await purchase.save();

      // Populate supplier details for response
      await purchase.populate("supplier", "name mobile email address type");

      // Update item stock (ADD to stock for purchase)
      for (const item of processedItems) {
        if (item.itemRef && mongoose.Types.ObjectId.isValid(item.itemRef)) {
          await Item.findByIdAndUpdate(
            item.itemRef,
            {$inc: {currentStock: item.quantity}},
            {new: true}
          );
        }
      }

      console.log("✅ Purchase created successfully:", {
        id: purchase._id,
        purchaseNumber: purchase.purchaseNumber,
        taxMode: purchase.taxMode,
        priceIncludesTax: purchase.priceIncludesTax,
        finalTotal: purchase.totals.finalTotal,
        paymentMethod: purchase.payment.method,
      });

      res.status(201).json({
        success: true,
        message: "Purchase created successfully",
        data: {
          purchase,
          bill: {
            purchaseNumber: purchase.purchaseNumber,
            purchaseDate: purchase.purchaseDate,
            supplier: {
              name: supplierRecord.name,
              mobile: supplierRecord.mobile,
            },
            totals: purchase.totals,
            payment: purchase.payment,
            taxMode: purchase.taxMode,
            priceIncludesTax: purchase.priceIncludesTax,
            gstEnabled: purchase.gstEnabled,
          },
        },
      });
    } catch (error) {
      console.error("❌ Error creating purchase:", error);
      res.status(400).json({
        success: false,
        message: "Failed to create purchase",
        error: error.message,
      });
    }
  },
  // FIXED: Get purchase by ID with proper field mapping (matching Sale controller)
  getPurchaseById: async (req, res) => {
    try {
      const {id} = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase ID",
        });
      }

      const purchase = await Purchase.findById(id)
        .populate("supplier", "name mobile email address type gstNumber")
        .populate("items.itemRef", "name itemCode category currentStock");

      if (!purchase) {
        return res.status(404).json({
          success: false,
          message: "Purchase not found",
        });
      }

      // Ensure backward compatibility by mapping fields (matching Sale controller)
      const compatiblePurchase = {
        ...purchase.toObject(),
        taxMode:
          purchase.taxMode ||
          (purchase.priceIncludesTax ? "with-tax" : "without-tax"),
        priceIncludesTax:
          purchase.priceIncludesTax ?? purchase.taxMode === "with-tax",
        items: purchase.items.map((item) => ({
          ...item,
          taxMode: item.taxMode || purchase.taxMode || "without-tax",
          priceIncludesTax:
            item.priceIncludesTax ?? item.taxMode === "with-tax",
          // Ensure frontend compatibility fields
          cgstAmount: item.cgstAmount || item.cgst || 0,
          sgstAmount: item.sgstAmount || item.sgst || 0,
          igstAmount: item.igstAmount || item.igst || 0,
          amount: item.amount || item.itemAmount || 0,
        })),
      };

      console.log("📤 Sending purchase data with tax mode compatibility:", {
        id: purchase._id,
        taxMode: compatiblePurchase.taxMode,
        priceIncludesTax: compatiblePurchase.priceIncludesTax,
        itemCount: compatiblePurchase.items.length,
      });

      res.json({
        success: true,
        data: compatiblePurchase,
      });
    } catch (error) {
      console.error("❌ Error fetching purchase:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch purchase",
        error: error.message,
      });
    }
  },

  // Get all purchases with filtering (matching Sale controller)
  getAllPurchases: async (req, res) => {
    try {
      const {
        companyId,
        page = 1,
        limit = 20,
        status,
        supplier,
        dateFrom,
        dateTo,
        search,
        paymentStatus,
        purchaseType,
        receivingStatus,
      } = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      // Build filter
      const filter = {companyId};
      if (status) filter.status = status;
      if (supplier) filter.supplier = supplier;
      if (paymentStatus) filter["payment.status"] = paymentStatus;
      if (purchaseType) filter.purchaseType = purchaseType;
      if (receivingStatus) filter.receivingStatus = receivingStatus;

      if (dateFrom || dateTo) {
        filter.purchaseDate = {};
        if (dateFrom) filter.purchaseDate.$gte = new Date(dateFrom);
        if (dateTo) filter.purchaseDate.$lte = new Date(dateTo);
      }

      if (search) {
        filter.$or = [
          {purchaseNumber: {$regex: search, $options: "i"}},
          {supplierMobile: {$regex: search, $options: "i"}},
          {notes: {$regex: search, $options: "i"}},
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const purchases = await Purchase.find(filter)
        .populate("supplier", "name mobile email address type")
        .sort({purchaseDate: -1, createdAt: -1})
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Purchase.countDocuments(filter);

      // Calculate summary
      const summary = await Purchase.aggregate([
        {$match: filter},
        {
          $group: {
            _id: null,
            totalAmount: {$sum: "$totals.finalTotal"},
            totalTax: {$sum: "$totals.totalTax"},
            totalDiscount: {$sum: "$totals.totalDiscountAmount"},
            totalPaid: {$sum: "$payment.paidAmount"},
            totalPending: {$sum: "$payment.pendingAmount"},
          },
        },
      ]);

      res.json({
        success: true,
        data: {
          purchases,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
          },
          summary: summary[0] || {
            totalAmount: 0,
            totalTax: 0,
            totalDiscount: 0,
            totalPaid: 0,
            totalPending: 0,
          },
        },
      });
    } catch (error) {
      console.error("❌ Error fetching purchases:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch purchases",
        error: error.message,
      });
    }
  },

  // Update purchase (matching Sale controller)
  updatePurchase: async (req, res) => {
    try {
      const {id} = req.params;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase ID",
        });
      }

      const purchase = await Purchase.findById(id);
      if (!purchase) {
        return res.status(404).json({
          success: false,
          message: "Purchase not found",
        });
      }

      // Check if purchase can be updated
      if (purchase.status === "completed" || purchase.status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Cannot update completed or cancelled purchases",
        });
      }

      // Ensure tax mode consistency
      if (updateData.taxMode) {
        updateData.priceIncludesTax = updateData.taxMode === "with-tax";
      } else if (updateData.priceIncludesTax !== undefined) {
        updateData.taxMode = updateData.priceIncludesTax
          ? "with-tax"
          : "without-tax";
      }

      // Update metadata
      updateData.lastModifiedBy = req.user?.id || "system";

      const updatedPurchase = await Purchase.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      }).populate("supplier", "name mobile email address");

      res.json({
        success: true,
        message: "Purchase updated successfully",
        data: updatedPurchase,
      });
    } catch (error) {
      console.error("❌ Error updating purchase:", error);
      res.status(400).json({
        success: false,
        message: "Failed to update purchase",
        error: error.message,
      });
    }
  },
  // ✅ SIMPLIFIED: Direct delete method
  deletePurchase: async (req, res) => {
    try {
      const {id} = req.params;

      console.log("🗑️ Deleting purchase:", id);

      // Basic ID validation
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase ID format",
        });
      }

      // Get delete method from query parameter
      const deleteMethod = req.query.hard === "true" ? "hard" : "soft";
      const forceDelete = req.query.force === "true";

      console.log("🔧 Delete method:", deleteMethod, "Force:", forceDelete);

      let result;

      if (deleteMethod === "hard" || forceDelete) {
        // ✅ HARD DELETE - Permanently remove
        console.log("🔥 Performing hard delete");

        result = await Purchase.findByIdAndDelete(id);

        if (!result) {
          // Purchase not found - treat as already deleted
          console.log(
            "⚠️ Purchase not found for hard delete - treating as success"
          );
          return res.json({
            success: true,
            message: "Purchase not found (may have been already deleted)",
            alreadyDeleted: true,
            deleteMethod: "hard",
          });
        }

        // Reverse stock changes if needed
        if (result.items && result.items.length > 0) {
          for (const item of result.items) {
            if (item.itemRef && mongoose.Types.ObjectId.isValid(item.itemRef)) {
              try {
                await Item.findByIdAndUpdate(
                  item.itemRef,
                  {$inc: {currentStock: -item.quantity}},
                  {new: true}
                );
                console.log(
                  `📦 Reversed stock for ${item.itemName}: -${item.quantity}`
                );
              } catch (stockError) {
                console.warn(
                  `⚠️ Could not reverse stock for ${item.itemName}:`,
                  stockError.message
                );
              }
            }
          }
        }

        console.log("✅ Purchase hard deleted successfully");

        return res.json({
          success: true,
          message: "Purchase deleted permanently",
          deleteMethod: "hard",
          stockReversed: result.items?.length || 0,
        });
      } else {
        // ✅ SOFT DELETE - Mark as cancelled
        console.log("📝 Performing soft delete");

        result = await Purchase.findByIdAndUpdate(
          id,
          {
            status: "cancelled",
            deletedAt: new Date(),
            deletedBy: req.user?.id || "system",
            lastModifiedBy: req.user?.id || "system",
            deletionReason: req.body.reason || "Deleted by user",
          },
          {new: true}
        );

        if (!result) {
          // Purchase not found - treat as already deleted
          console.log(
            "⚠️ Purchase not found for soft delete - treating as success"
          );
          return res.json({
            success: true,
            message: "Purchase not found (may have been already deleted)",
            alreadyDeleted: true,
            deleteMethod: "soft",
          });
        }

        console.log("✅ Purchase soft deleted successfully");

        return res.json({
          success: true,
          message: "Purchase cancelled successfully",
          deleteMethod: "soft",
          data: {
            id: result._id,
            status: result.status,
            deletedAt: result.deletedAt,
            deletedBy: result.deletedBy,
          },
        });
      }
    } catch (error) {
      console.error("❌ Error deleting purchase:", error);

      // Handle specific errors
      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase ID format",
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to delete purchase",
        error: error.message,
      });
    }
  },
  // ✅ ALSO FIX: Add payment method normalization to addPayment method
  addPayment: async (req, res) => {
    try {
      const {id} = req.params;
      const {
        amount,
        method = "cash",
        reference = "",
        paymentDate,
        dueDate,
        notes = "",
      } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase ID",
        });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid payment amount is required",
        });
      }

      const purchase = await Purchase.findById(id);
      if (!purchase) {
        return res.status(404).json({
          success: false,
          message: "Purchase not found",
        });
      }

      // ✅ FIXED: Normalize payment method
      const normalizedMethod = normalizePaymentMethod(method);

      console.log("💳 Adding payment with normalized method:", {
        original: method,
        normalized: normalizedMethod,
      });

      await purchase.addPayment(
        amount,
        normalizedMethod, // Use normalized method
        reference,
        paymentDate,
        dueDate,
        notes
      );

      res.json({
        success: true,
        message: "Payment added successfully",
        data: purchase,
      });
    } catch (error) {
      console.error("❌ Error adding payment:", error);
      res.status(400).json({
        success: false,
        message: "Failed to add payment",
        error: error.message,
      });
    }
  },

  // Get next purchase number (matching Sale controller)
  getNextPurchaseNumber: async (req, res) => {
    try {
      const {companyId, purchaseType = "gst"} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      // Find the last purchase for today
      const todayStart = new Date(year, date.getMonth(), date.getDate());
      const todayEnd = new Date(year, date.getMonth(), date.getDate() + 1);

      const lastPurchase = await Purchase.findOne({
        companyId,
        purchaseDate: {$gte: todayStart, $lt: todayEnd},
        purchaseNumber: new RegExp(
          `^${purchaseType.toUpperCase()}-${year}${month}${day}`
        ),
      }).sort({purchaseNumber: -1});

      let sequence = 1;
      if (lastPurchase) {
        const lastSequence = parseInt(
          lastPurchase.purchaseNumber.split("-")[2]
        );
        sequence = lastSequence + 1;
      }

      const prefix = purchaseType === "gst" ? "PO-GST" : "PO";
      const nextPurchaseNumber = `${prefix}-${year}${month}${day}-${String(
        sequence
      ).padStart(4, "0")}`;

      res.json({
        success: true,
        data: {nextPurchaseNumber},
      });
    } catch (error) {
      console.error("❌ Error generating purchase number:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate purchase number",
        error: error.message,
      });
    }
  },

  // Get today's purchases (matching Sale controller)
  getTodaysPurchases: async (req, res) => {
    try {
      const {companyId} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const purchases = await Purchase.getTodaysPurchases(companyId).populate(
        "supplier",
        "name mobile"
      );

      res.json({
        success: true,
        data: purchases,
      });
    } catch (error) {
      console.error("❌ Error fetching today's purchases:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch today's purchases",
        error: error.message,
      });
    }
  },
  getPurchasesDueToday: async (req, res) => {
    try {
      const {companyId} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      console.log("🔍 Getting purchases due today for company:", companyId);

      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const endOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1
      );

      const purchasesDueToday = await Purchase.find({
        companyId,
        status: {$ne: "cancelled"},
        "payment.dueDate": {
          $gte: startOfDay,
          $lt: endOfDay,
        },
        "payment.pendingAmount": {$gt: 0},
      }).populate("supplier", "name");

      return res.json({
        success: true,
        message: `Found ${purchasesDueToday.length} purchases due today`,
        data: purchasesDueToday,
      });
    } catch (error) {
      console.error("❌ Get purchases due today error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to get purchases due today",
        error: error.message,
      });
    }
  },
  // Get overdue purchases (matching Sale controller)
  getOverduePurchases: async (req, res) => {
    try {
      const {companyId} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const purchases = await Purchase.getOverduePurchases(companyId);

      res.json({
        success: true,
        data: purchases,
      });
    } catch (error) {
      console.error("❌ Error fetching overdue purchases:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch overdue purchases",
        error: error.message,
      });
    }
  }, // ✅ Add this method if it doesn't exist
  checkPurchaseExists: async (req, res) => {
    try {
      const {id} = req.params;

      console.log("🔍 Checking purchase existence:", id);

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase ID format",
          exists: false,
        });
      }

      const purchase = await Purchase.findById(id);

      if (!purchase) {
        // Also check if it was soft deleted
        const deletedPurchase = await Purchase.findOne({
          _id: id,
          $or: [{status: "cancelled"}, {deletedAt: {$exists: true}}],
        });

        return res.json({
          success: false,
          message: "Purchase not found",
          exists: false,
          wasDeleted: !!deletedPurchase,
          data: {
            deletedPurchase: deletedPurchase
              ? {
                  id: deletedPurchase._id,
                  status: deletedPurchase.status,
                  deletedAt: deletedPurchase.deletedAt,
                  deletedBy: deletedPurchase.deletedBy,
                }
              : null,
          },
        });
      }

      return res.json({
        success: true,
        message: "Purchase found",
        exists: true,
        data: {
          purchase: {
            id: purchase._id,
            purchaseNumber: purchase.purchaseNumber,
            status: purchase.status,
            supplierName: purchase.supplierName,
            amount: purchase.totals?.finalTotal || purchase.amount,
            createdAt: purchase.createdAt,
          },
        },
      });
    } catch (error) {
      console.error("❌ Check purchase existence error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to check purchase existence",
        exists: false,
        error: error.message,
      });
    }
  },

  // ✅ Add this method if it doesn't exist
  validateItems: async (req, res) => {
    try {
      const {items} = req.body;

      console.log("🔍 Validating purchase items:", items?.length || 0);

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Items array is required and cannot be empty",
          errors: ["Items array is required"],
        });
      }

      const errors = [];
      const warnings = [];

      items.forEach((item, index) => {
        // Validate required fields
        if (!item.itemName) {
          errors.push(`Item ${index + 1}: Item name is required`);
        }
        if (!item.quantity || item.quantity <= 0) {
          errors.push(`Item ${index + 1}: Valid quantity is required`);
        }
        if (!item.pricePerUnit || item.pricePerUnit < 0) {
          errors.push(`Item ${index + 1}: Valid price per unit is required`);
        }

        // Validate optional but important fields
        if (!item.hsnCode) {
          warnings.push(`Item ${index + 1}: HSN code is missing`);
        }
        if (!item.unit) {
          warnings.push(`Item ${index + 1}: Unit is missing`);
        }
      });

      return res.json({
        success: errors.length === 0,
        message:
          errors.length === 0
            ? "Items validation passed"
            : "Items validation failed",
        errors: errors,
        warnings: warnings,
        data: {
          validItems: items.length - errors.length,
          totalItems: items.length,
          hasErrors: errors.length > 0,
          hasWarnings: warnings.length > 0,
        },
      });
    } catch (error) {
      console.error("❌ Validate items error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to validate items",
        error: error.message,
      });
    }
  },

  // Get purchases due today (matching Sale controller)
  getPurchasesDueToday: async (req, res) => {
    try {
      const {companyId} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const purchases = await Purchase.getPurchasesDueToday(companyId);

      res.json({
        success: true,
        data: purchases,
      });
    } catch (error) {
      console.error("❌ Error fetching purchases due today:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch purchases due today",
        error: error.message,
      });
    }
  },

  // Complete purchase (matching Sale controller)
  completePurchase: async (req, res) => {
    try {
      const {id} = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase ID",
        });
      }

      const purchase = await Purchase.findById(id);

      if (!purchase) {
        return res.status(404).json({
          success: false,
          message: "Purchase not found",
        });
      }

      await purchase.markAsCompleted();

      res.json({
        success: true,
        message: "Purchase marked as completed",
        data: purchase,
      });
    } catch (error) {
      console.error("❌ Error completing purchase:", error);
      res.status(400).json({
        success: false,
        message: "Failed to complete purchase",
        error: error.message,
      });
    }
  },

  // NEW: Update payment due date (matching Sales controller)
  updatePaymentDueDate: async (req, res) => {
    try {
      const {id} = req.params;
      const {dueDate, creditDays} = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase ID",
        });
      }

      const purchase = await Purchase.findById(id);
      if (!purchase) {
        return res.status(404).json({
          success: false,
          message: "Purchase not found",
        });
      }

      // Update due date
      if (dueDate) {
        purchase.payment.dueDate = new Date(dueDate);
      }

      if (creditDays !== undefined) {
        purchase.payment.creditDays = parseInt(creditDays);

        // If creditDays provided but no dueDate, calculate due date
        if (!dueDate && creditDays > 0) {
          const calculatedDueDate = new Date();
          calculatedDueDate.setDate(
            calculatedDueDate.getDate() + parseInt(creditDays)
          );
          purchase.payment.dueDate = calculatedDueDate;
        }
      }

      purchase.lastModifiedBy = req.user?.id || "system";
      await purchase.save();

      res.json({
        success: true,
        message: "Payment due date updated successfully",
        data: purchase,
      });
    } catch (error) {
      console.error("❌ Error updating payment due date:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update payment due date",
        error: error.message,
      });
    }
  },

  // NEW: Get payment status (matching Sales controller)
  getPaymentStatus: async (req, res) => {
    try {
      const {id} = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase ID",
        });
      }

      const purchase = await Purchase.findById(id).select("payment totals");
      if (!purchase) {
        return res.status(404).json({
          success: false,
          message: "Purchase not found",
        });
      }

      const paymentStatus = {
        status: purchase.payment?.status || "pending",
        totalAmount: purchase.totals?.finalTotal || 0,
        paidAmount: purchase.payment?.paidAmount || 0,
        pendingAmount:
          purchase.payment?.pendingAmount || purchase.totals?.finalTotal || 0,
        dueDate: purchase.payment?.dueDate || null,
        creditDays: purchase.payment?.creditDays || 0,
        isOverdue: purchase.isOverdue || false,
        daysOverdue: purchase.daysOverdue || 0,
      };

      res.json({
        success: true,
        data: paymentStatus,
      });
    } catch (error) {
      console.error("❌ Error getting payment status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get payment status",
        error: error.message,
      });
    }
  },

  // NEW: Get purchases report (matching Sales controller)
  getPurchasesReport: async (req, res) => {
    try {
      const {companyId, startDate, endDate} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const report = await Purchase.getPurchaseSummary(
        companyId,
        startDate
          ? new Date(startDate)
          : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        endDate ? new Date(endDate) : new Date()
      );

      res.json({
        success: true,
        data: report[0] || {
          totalPurchases: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalPending: 0,
          avgPurchaseValue: 0,
          totalTax: 0,
          totalDiscount: 0,
        },
      });
    } catch (error) {
      console.error("❌ Error getting purchases report:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get purchases report",
        error: error.message,
      });
    }
  },

  // NEW: Get monthly report (matching Sales controller)
  getMonthlyReport: async (req, res) => {
    try {
      const {companyId, year, month} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const currentYear = parseInt(year) || new Date().getFullYear();
      const currentMonth = parseInt(month) || new Date().getMonth() + 1;

      const startDate = new Date(currentYear, currentMonth - 1, 1);
      const endDate = new Date(currentYear, currentMonth, 0);

      const purchases = await Purchase.find({
        companyId,
        purchaseDate: {$gte: startDate, $lte: endDate},
        status: {$ne: "cancelled"},
      }).populate("supplier", "name mobile");

      // Group by day
      const dailyReport = {};
      purchases.forEach((purchase) => {
        const day = purchase.purchaseDate.getDate();
        if (!dailyReport[day]) {
          dailyReport[day] = {
            date: day,
            totalAmount: 0,
            totalPurchases: 0,
            totalTax: 0,
          };
        }
        dailyReport[day].totalAmount += purchase.totals?.finalTotal || 0;
        dailyReport[day].totalPurchases += 1;
        dailyReport[day].totalTax += purchase.totals?.totalTax || 0;
      });

      res.json({
        success: true,
        data: {
          summary: {
            month: currentMonth,
            year: currentYear,
            totalPurchases: purchases.length,
            totalAmount: purchases.reduce(
              (sum, p) => sum + (p.totals?.finalTotal || 0),
              0
            ),
            totalTax: purchases.reduce(
              (sum, p) => sum + (p.totals?.totalTax || 0),
              0
            ),
          },
          dailyReport: Object.values(dailyReport).sort(
            (a, b) => a.date - b.date
          ),
          purchases: purchases,
        },
      });
    } catch (error) {
      console.error("❌ Error getting monthly report:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get monthly report",
        error: error.message,
      });
    }
  },

  // NEW: Get top items (matching Sales controller)
  getTopItems: async (req, res) => {
    try {
      const {companyId, limit = 10, dateFrom, dateTo} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const matchFilter = {
        companyId: mongoose.Types.ObjectId(companyId),
        status: {$ne: "cancelled"},
      };

      if (dateFrom || dateTo) {
        matchFilter.purchaseDate = {};
        if (dateFrom) matchFilter.purchaseDate.$gte = new Date(dateFrom);
        if (dateTo) matchFilter.purchaseDate.$lte = new Date(dateTo);
      }

      const topItems = await Purchase.aggregate([
        {$match: matchFilter},
        {$unwind: "$items"},
        {
          $group: {
            _id: "$items.itemName",
            totalQuantity: {$sum: "$items.quantity"},
            totalAmount: {$sum: "$items.itemAmount"},
            purchaseCount: {$sum: 1},
            avgPrice: {$avg: "$items.pricePerUnit"},
          },
        },
        {$sort: {totalAmount: -1}},
        {$limit: parseInt(limit)},
      ]);

      res.json({
        success: true,
        data: topItems,
      });
    } catch (error) {
      console.error("❌ Error getting top items:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get top items",
        error: error.message,
      });
    }
  },

  // NEW: Get supplier stats (matching Sales controller)
  getSupplierStats: async (req, res) => {
    try {
      const {companyId, supplierId} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const matchFilter = {companyId, status: {$ne: "cancelled"}};
      if (supplierId) {
        matchFilter.supplier = mongoose.Types.ObjectId(supplierId);
      }

      const stats = await Purchase.aggregate([
        {$match: matchFilter},
        {
          $lookup: {
            from: "parties",
            localField: "supplier",
            foreignField: "_id",
            as: "supplierInfo",
          },
        },
        {$unwind: "$supplierInfo"},
        {
          $group: {
            _id: "$supplier",
            supplierName: {$first: "$supplierInfo.name"},
            supplierMobile: {$first: "$supplierInfo.mobile"},
            totalPurchases: {$sum: "$totals.finalTotal"},
            totalBills: {$sum: 1},
            totalPaid: {$sum: "$payment.paidAmount"},
            totalPending: {$sum: "$payment.pendingAmount"},
            avgPurchaseValue: {$avg: "$totals.finalTotal"},
            lastPurchaseDate: {$max: "$purchaseDate"},
          },
        },
        {$sort: {totalPurchases: -1}},
      ]);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("❌ Error getting supplier stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get supplier stats",
        error: error.message,
      });
    }
  },

  // NEW: Validate stock (kept for consistency - not applicable for purchases)
  validateStock: async (req, res) => {
    try {
      const {items} = req.body;

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({
          success: false,
          message: "Items array is required",
        });
      }

      // For purchases, we don't need to validate stock availability
      // This is kept for API consistency with sales routes
      const validationResults = items.map((item) => ({
        itemId: item.itemId || item.id,
        itemName: item.itemName || item.name,
        requestedQuantity: item.quantity || 0,
        available: true, // Always true for purchases
        message: "Stock validation not applicable for purchases",
      }));

      res.json({
        success: true,
        message: "Stock validation completed (not applicable for purchases)",
        data: validationResults,
      });
    } catch (error) {
      console.error("❌ Error validating stock:", error);
      res.status(500).json({
        success: false,
        message: "Failed to validate stock",
        error: error.message,
      });
    }
  },

  // NEW: Export CSV (matching Sales controller)
  exportCSV: async (req, res) => {
    try {
      const {companyId} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const purchases = await Purchase.find({
        companyId,
        status: {$ne: "cancelled"},
      })
        .populate("supplier", "name mobile")
        .sort({purchaseDate: -1});

      // Create CSV content
      const csvHeaders = [
        "Purchase Number",
        "Date",
        "Supplier Name",
        "Supplier Mobile",
        "Total Amount",
        "Paid Amount",
        "Pending Amount",
        "Payment Status",
        "Purchase Status",
        "Due Date",
        "Notes",
      ];

      const csvRows = purchases.map((purchase) => [
        purchase.purchaseNumber || "",
        purchase.purchaseDate
          ? purchase.purchaseDate.toISOString().split("T")[0]
          : "",
        purchase.supplier?.name || "",
        purchase.supplier?.mobile || purchase.supplierMobile || "",
        purchase.totals?.finalTotal || 0,
        purchase.payment?.paidAmount || 0,
        purchase.payment?.pendingAmount || 0,
        purchase.payment?.status || "pending",
        purchase.status || "draft",
        purchase.payment?.dueDate
          ? purchase.payment.dueDate.toISOString().split("T")[0]
          : "",
        purchase.notes || "",
      ]);

      const csvContent = [
        csvHeaders.join(","),
        ...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="purchases-${
          new Date().toISOString().split("T")[0]
        }.csv"`
      );
      res.send(csvContent);
    } catch (error) {
      console.error("❌ Error exporting CSV:", error);
      res.status(500).json({
        success: false,
        message: "Failed to export CSV",
        error: error.message,
      });
    }
  },

  // Mark as ordered (purchase-specific)
  markAsOrdered: async (req, res) => {
    try {
      const {id} = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase ID",
        });
      }

      const purchase = await Purchase.findById(id);
      if (!purchase) {
        return res.status(404).json({
          success: false,
          message: "Purchase not found",
        });
      }

      await purchase.markAsOrdered();

      res.json({
        success: true,
        message: "Purchase marked as ordered",
        data: purchase,
      });
    } catch (error) {
      console.error("❌ Error marking purchase as ordered:", error);
      res.status(500).json({
        success: false,
        message: "Failed to mark purchase as ordered",
        error: error.message,
      });
    }
  },

  // Mark as received (purchase-specific)
  markAsReceived: async (req, res) => {
    try {
      const {id} = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase ID",
        });
      }

      const purchase = await Purchase.findById(id);
      if (!purchase) {
        return res.status(404).json({
          success: false,
          message: "Purchase not found",
        });
      }

      await purchase.markAsReceived();

      res.json({
        success: true,
        message: "Purchase marked as received",
        data: purchase,
      });
    } catch (error) {
      console.error("❌ Error marking purchase as received:", error);
      res.status(500).json({
        success: false,
        message: "Failed to mark purchase as received",
        error: error.message,
      });
    }
  },

  // Get payment summary with overdue (matching Sale controller)
  getPaymentSummaryWithOverdue: async (req, res) => {
    try {
      const {companyId, dateFrom, dateTo} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const summary = await Purchase.getPaymentSummaryWithOverdue(
        companyId,
        dateFrom,
        dateTo
      );

      res.json({
        success: true,
        data: summary[0] || {
          totalPurchases: 0,
          totalPaid: 0,
          totalPending: 0,
          totalOverdue: 0,
          overdueCount: 0,
        },
      });
    } catch (error) {
      console.error("❌ Error fetching payment summary:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch payment summary",
        error: error.message,
      });
    }
  },

  // Get dashboard data (matching Sale controller structure)
  getDashboardData: async (req, res) => {
    try {
      const {companyId} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfWeek = new Date(
        today.setDate(today.getDate() - today.getDay())
      );

      // Get various metrics
      const [
        todaysPurchases,
        weekPurchases,
        monthPurchases,
        recentPurchases,
        topSuppliers,
      ] = await Promise.all([
        // Today's purchases
        Purchase.aggregate([
          {
            $match: {
              companyId: new mongoose.Types.ObjectId(companyId),
              purchaseDate: {
                $gte: new Date(
                  today.getFullYear(),
                  today.getMonth(),
                  today.getDate()
                ),
                $lt: new Date(
                  today.getFullYear(),
                  today.getMonth(),
                  today.getDate() + 1
                ),
              },
              status: {$ne: "cancelled"},
            },
          },
          {
            $group: {
              _id: null,
              totalPurchases: {$sum: "$totals.finalTotal"},
              totalBills: {$sum: 1},
            },
          },
        ]),

        // This week's purchases
        Purchase.aggregate([
          {
            $match: {
              companyId: new mongoose.Types.ObjectId(companyId),
              purchaseDate: {$gte: startOfWeek},
              status: {$ne: "cancelled"},
            },
          },
          {
            $group: {
              _id: null,
              totalPurchases: {$sum: "$totals.finalTotal"},
              totalBills: {$sum: 1},
            },
          },
        ]),

        // This month's purchases
        Purchase.aggregate([
          {
            $match: {
              companyId: new mongoose.Types.ObjectId(companyId),
              purchaseDate: {$gte: startOfMonth},
              status: {$ne: "cancelled"},
            },
          },
          {
            $group: {
              _id: null,
              totalPurchases: {$sum: "$totals.finalTotal"},
              totalBills: {$sum: 1},
            },
          },
        ]),

        // Recent purchases
        Purchase.find({companyId, status: {$ne: "cancelled"}})
          .populate("supplier", "name mobile")
          .sort({createdAt: -1})
          .limit(5)
          .select(
            "purchaseNumber purchaseDate totals.finalTotal payment.status"
          ),

        // Top suppliers
        Purchase.aggregate([
          {
            $match: {
              companyId: new mongoose.Types.ObjectId(companyId),
              status: {$ne: "cancelled"},
            },
          },
          {
            $group: {
              _id: "$supplier",
              totalPurchases: {$sum: "$totals.finalTotal"},
              billCount: {$sum: 1},
            },
          },
          {
            $lookup: {
              from: "parties",
              localField: "_id",
              foreignField: "_id",
              as: "supplierInfo",
            },
          },
          {$unwind: "$supplierInfo"},
          {
            $project: {
              name: "$supplierInfo.name",
              mobile: "$supplierInfo.mobile",
              totalPurchases: 1,
              billCount: 1,
            },
          },
          {$sort: {totalPurchases: -1}},
          {$limit: 5},
        ]),
      ]);

      res.json({
        success: true,
        data: {
          today: todaysPurchases[0] || {totalPurchases: 0, totalBills: 0},
          week: weekPurchases[0] || {totalPurchases: 0, totalBills: 0},
          month: monthPurchases[0] || {totalPurchases: 0, totalBills: 0},
          recentPurchases,
          topSuppliers,
        },
      });
    } catch (error) {
      console.error("❌ Error getting dashboard data:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get dashboard data",
        error: error.message,
      });
    }
  },
};

module.exports = purchaseController;
