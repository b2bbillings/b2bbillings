const Purchase = require("../models/Purchase");
const Item = require("../models/Item");
const Party = require("../models/Party");
const Company = require("../models/Company");
const mongoose = require("mongoose");
const itemController = require("./itemController");

const normalizePaymentMethod = (method) => {
  const methodMapping = {
    // ✅ FIXED: Bank-related methods → bank_transfer
    "bank account": "bank_transfer", // ✅ This was the issue
    bank_account: "bank_transfer",
    "bank transfer": "bank_transfer",
    bank_transfer: "bank_transfer",
    bankaccount: "bank_transfer",
    banktransfer: "bank_transfer",
    "net banking": "bank_transfer",
    netbanking: "bank_transfer",
    neft: "bank_transfer",
    rtgs: "bank_transfer",
    imps: "bank_transfer",
    "wire transfer": "bank_transfer",
    bank: "bank", // Keep as 'bank' since it's a valid enum value

    // Card payments → card
    "credit card": "card",
    "debit card": "card",
    card: "card",
    visa: "card",
    mastercard: "card",
    rupay: "card",

    // Digital/UPI payments → upi
    upi: "upi",
    paytm: "upi",
    phonepe: "upi",
    gpay: "upi",
    googlepay: "upi",
    bhim: "upi",
    "digital wallet": "upi",
    wallet: "upi",
    digital: "upi",

    // Online payments → online
    online: "online",
    "internet banking": "online",
    "web payment": "online",
    gateway: "online",

    // Traditional methods
    cash: "cash",
    cheque: "cheque",
    check: "cheque",
    dd: "cheque", // Demand Draft
    draft: "cheque",
    credit: "credit",
    "credit terms": "credit",
    "on credit": "credit",

    // Common variations and typos
    case: "cash", // Common typo
    cach: "cash", // Common typo
    csh: "cash",
    chque: "cheque", // Common typo
    chek: "cheque", // Common typo
    credt: "credit", // Common typo
    cardt: "card", // Common typo
    onlin: "online", // Common typo
  };

  const inputMethod = method?.toString().toLowerCase().trim() || "";
  const normalized = methodMapping[inputMethod] || "cash";

  const validEnums = [
    "cash",
    "card",
    "upi",
    "bank_transfer", // ✅ This is the correct enum value
    "cheque",
    "credit",
    "online",
    "bank",
  ];
  const isValidEnum = validEnums.includes(normalized);

  // ✅ ENHANCED: Better logging for debugging
  console.log(
    `💳 Payment method normalization: { original: '${method}', normalized: '${normalized}', isValid: ${isValidEnum} }`
  );

  if (!isValidEnum) {
    console.warn(
      `⚠️ Normalized method '${normalized}' is not in valid enum list, using 'cash' instead`
    );
    return "cash";
  }

  return normalized;
};

// ✅ Enhanced validation function
const validatePaymentMethod = (method) => {
  const validEnums = [
    "cash",
    "card",
    "upi",
    "bank_transfer",
    "cheque",
    "credit",
    "online",
    "bank",
  ];
  const normalized = normalizePaymentMethod(method);

  return {
    isValid: validEnums.includes(normalized),
    normalized: normalized,
    original: method,
    validOptions: validEnums,
  };
};

const updateStockForPurchase = async (
  purchase,
  processedItems,
  supplierRecord,
  req
) => {
  console.log("📦 Updating stock for purchase using direct stock updates...");

  const results = [];

  for (const item of processedItems) {
    if (item.itemRef && mongoose.Types.ObjectId.isValid(item.itemRef)) {
      try {
        // ✅ DIRECT STOCK UPDATE (no separate adjustment entry)
        const currentItem = await Item.findById(item.itemRef);
        if (currentItem) {
          const previousStock = currentItem.currentStock || 0;
          const newStock = previousStock + item.quantity; // ✅ ADD for purchase

          // ✅ FIXED: Don't create separate stock history - the purchase transaction itself will be shown
          await Item.findByIdAndUpdate(item.itemRef, {
            $set: {
              currentStock: newStock,
              lastStockUpdate: new Date(),
              lastModifiedBy: req.user?.id || "system",
              updatedAt: new Date(),
            },
          });

          console.log(
            `✅ Stock updated for ${item.itemName}: ${previousStock} → ${newStock} (+${item.quantity})`
          );

          results.push({
            itemName: item.itemName,
            itemId: item.itemRef,
            quantity: item.quantity,
            previousStock: previousStock,
            newStock: newStock,
            success: true,
            method: "direct_stock_update",
          });
        } else {
          throw new Error("Item not found");
        }
      } catch (error) {
        console.error(
          `❌ Stock update failed for ${item.itemName}:`,
          error.message
        );

        results.push({
          itemName: item.itemName,
          itemId: item.itemRef,
          quantity: item.quantity,
          success: false,
          error: error.message,
          method: "direct_stock_update",
        });
      }
    } else {
      console.warn(`⚠️ Invalid item reference for: ${item.itemName}`);
      results.push({
        itemName: item.itemName,
        itemId: item.itemRef,
        quantity: item.quantity,
        success: false,
        error: "Invalid item reference",
        method: "direct_stock_update",
      });
    }
  }

  return results;
};
const purchaseController = {
  // ✅ UPDATED: Generate actual preview purchase number (not just pattern)
  getNextPurchaseNumber: async (req, res) => {
    try {
      const {companyId, purchaseType = "gst"} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      // ✅ Get company details
      const Company = require("../models/Company");
      const company = await Company.findById(companyId).select(
        "businessName code gstin"
      );

      if (!company) {
        return res.status(400).json({
          success: false,
          message: "Company not found",
        });
      }

      // ✅ Generate preview purchase number using same logic as model
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const dateStr = `${year}${month}${day}`;

      // Get company prefix (same as model logic)
      let companyPrefix = "PO";
      if (company?.code) {
        companyPrefix = company.code
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .substring(0, 6);
      } else if (company?.businessName) {
        companyPrefix = company.businessName
          .replace(/[^A-Za-z]/g, "")
          .substring(0, 3)
          .toUpperCase();
      }

      // ✅ Find the next sequence number for today
      const todayStart = new Date(year, today.getMonth(), today.getDate());
      const todayEnd = new Date(year, today.getMonth(), today.getDate() + 1);

      const latestPurchase = await Purchase.findOne({
        companyId: companyId,
        purchaseDate: {$gte: todayStart, $lt: todayEnd},
        purchaseNumber: {$exists: true, $ne: null},
      })
        .sort({purchaseNumber: -1})
        .select("purchaseNumber");

      let nextSequence = 1;
      if (latestPurchase && latestPurchase.purchaseNumber) {
        // Extract sequence from purchase number pattern: PREFIX-GST-YYYYMMDD-XXXX
        const match = latestPurchase.purchaseNumber.match(/-(\d{4})$/);
        if (match) {
          nextSequence = parseInt(match[1], 10) + 1;
        }
      }

      const sequenceStr = String(nextSequence).padStart(4, "0");

      // ✅ Generate actual preview number (same format as model)
      const gstPrefix = purchaseType === "gst" ? "GST-" : "";
      const previewPurchaseNumber = `${companyPrefix}-PO-${gstPrefix}${dateStr}-${sequenceStr}`;

      res.status(200).json({
        success: true,
        data: {
          previewPurchaseNumber,
          nextPurchaseNumber: previewPurchaseNumber, // ✅ Actual preview number
          purchaseType,
          company: {
            id: company._id,
            name: company.businessName,
            code: company.code,
            prefix: companyPrefix,
          },
          numbering: {
            prefix: companyPrefix,
            gstPrefix: purchaseType === "gst" ? "GST-" : "",
            dateString: dateStr,
            sequence: nextSequence,
            formattedSequence: sequenceStr,
          },
          pattern: `${companyPrefix}-PO-[GST-]YYYYMMDD-XXXX`,
          date: today.toISOString().split("T")[0],
          isSequential: true,
          companySpecific: true,
          isPreview: true, // ✅ This is a preview number
          actualNumberGeneratedBy: "model_pre_save_middleware",
          note: "This is a preview. Actual number will be confirmed when saving.",
        },
        message: "Preview purchase number generated successfully",
      });
    } catch (error) {
      console.error("❌ Error generating preview purchase number:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate preview purchase number",
        error: error.message,
      });
    }
  },

  createPurchase: async (req, res) => {
    try {
      const {
        supplierName,
        supplierMobile,
        supplier,
        supplierId,
        purchaseDate,
        gstEnabled = true,
        companyId,
        items,
        payment,
        notes,
        termsAndConditions,
        roundOff = 0,
        roundOffEnabled = false,
        status = "draft",
        taxMode = "without-tax",
        priceIncludesTax = false,
        sourceOrderId,
        sourceOrderNumber,
        sourceOrderType = "purchase_order",
        sourceCompanyId,
        isAutoGenerated = false,
        generatedFrom = "manual",
        convertedBy,
        autoDetectSourceCompany = true,
      } = req.body;

      // Validate required fields
      if (!companyId || !items || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Company ID and Items are required",
        });
      }

      // ✅ Get company details for response only (not for numbering)
      const Company = require("../models/Company");
      const currentCompany = await Company.findById(companyId).select(
        "businessName code gstin"
      );

      if (!currentCompany) {
        return res.status(400).json({
          success: false,
          message: "Company not found",
        });
      }

      // ✅ Handle supplier validation (existing code)
      let supplierRecord = null;
      const finalSupplierId = supplier || supplierId;

      if (finalSupplierId && mongoose.Types.ObjectId.isValid(finalSupplierId)) {
        supplierRecord = await Party.findById(finalSupplierId);

        if (!supplierRecord) {
          return res.status(400).json({
            success: false,
            message: "Supplier not found with provided ID",
          });
        }
      } else if (supplierName && supplierMobile) {
        supplierRecord = await Party.findOne({
          $and: [
            {companyId: companyId},
            {type: "supplier"},
            {
              $or: [{mobile: supplierMobile}, {phoneNumber: supplierMobile}],
            },
          ],
        });

        if (!supplierRecord) {
          // Auto-create supplier
          supplierRecord = new Party({
            name: supplierName,
            mobile: supplierMobile,
            phoneNumber: supplierMobile,
            type: "supplier",
            partyType: "supplier",
            companyId: companyId,
            status: "active",
            createdBy: req.user?.id || "system",
          });
          await supplierRecord.save();
        }
      } else {
        return res.status(400).json({
          success: false,
          message: "Supplier ID or supplier name and mobile are required",
        });
      }

      // FIXED: Sync tax mode fields
      const finalTaxMode =
        taxMode || (priceIncludesTax ? "with-tax" : "without-tax");
      const finalPriceIncludesTax = finalTaxMode === "with-tax";

      // Process items (same as existing)
      const processedItems = [];
      let subtotal = 0;
      let totalDiscount = 0;
      let totalTax = 0;
      let totalTaxableAmount = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Basic validation
        if (!item.itemName || !item.quantity || !item.pricePerUnit) {
          return res.status(400).json({
            success: false,
            message: `Item ${i + 1}: Name, quantity, and price are required`,
          });
        }

        // Parse item values
        const quantity = parseFloat(item.quantity);
        const pricePerUnit = parseFloat(item.pricePerUnit);
        const discountPercent = parseFloat(item.discountPercent || 0);
        const discountAmount = parseFloat(item.discountAmount || 0);
        const taxRate = parseFloat(item.taxRate || 18);

        // Validate numeric values
        if (
          isNaN(quantity) ||
          isNaN(pricePerUnit) ||
          quantity <= 0 ||
          pricePerUnit < 0
        ) {
          return res.status(400).json({
            success: false,
            message: `Item ${i + 1}: Invalid quantity or price values`,
          });
        }

        // FIXED: Determine item-level tax mode
        const itemTaxMode = item.taxMode || finalTaxMode;
        const itemPriceIncludesTax = itemTaxMode === "with-tax";

        // Calculate base amount
        const baseAmount = quantity * pricePerUnit;

        // Calculate discount
        let itemDiscountAmount = discountAmount;
        if (discountAmount === 0 && discountPercent > 0) {
          itemDiscountAmount = (baseAmount * discountPercent) / 100;
        }

        const amountAfterDiscount = baseAmount - itemDiscountAmount;

        // Calculate taxes
        let cgst = 0;
        let sgst = 0;
        let igst = 0;
        let itemAmount = 0;
        let itemTaxableAmount = 0;

        if (gstEnabled && taxRate > 0) {
          const cgstRate = taxRate / 2;
          const sgstRate = taxRate / 2;

          if (itemPriceIncludesTax) {
            // Tax included in price
            const taxMultiplier = 1 + taxRate / 100;
            itemTaxableAmount = amountAfterDiscount / taxMultiplier;
            const totalTaxAmount = amountAfterDiscount - itemTaxableAmount;
            cgst = totalTaxAmount / 2;
            sgst = totalTaxAmount / 2;
            igst = totalTaxAmount;
            itemAmount = amountAfterDiscount;
          } else {
            // Tax added to price
            itemTaxableAmount = amountAfterDiscount;
            cgst = (itemTaxableAmount * cgstRate) / 100;
            sgst = (itemTaxableAmount * sgstRate) / 100;
            igst = (itemTaxableAmount * taxRate) / 100;
            itemAmount = itemTaxableAmount + cgst + sgst + igst;
          }
        } else {
          itemTaxableAmount = amountAfterDiscount;
          itemAmount = amountAfterDiscount;
        }

        // Update totals
        subtotal += baseAmount;
        totalDiscount += itemDiscountAmount;
        totalTaxableAmount += itemTaxableAmount;
        const itemTotalTax = cgst + sgst + igst;
        totalTax += itemTotalTax;

        // Create processed item
        const processedItem = {
          itemRef: item.itemRef || null,
          itemName: item.itemName.trim(),
          itemCode: item.itemCode || "",
          hsnCode: item.hsnCode || "0000",
          category: item.category || "",
          quantity,
          unit: item.unit || "PCS",
          pricePerUnit,
          taxRate: taxRate,
          taxMode: itemTaxMode,
          priceIncludesTax: itemPriceIncludesTax,
          discountPercent,
          discountAmount: parseFloat(itemDiscountAmount.toFixed(2)),
          cgst: parseFloat(cgst.toFixed(2)),
          sgst: parseFloat(sgst.toFixed(2)),
          igst: parseFloat(igst.toFixed(2)),
          cgstAmount: parseFloat(cgst.toFixed(2)),
          sgstAmount: parseFloat(sgst.toFixed(2)),
          igstAmount: parseFloat(igst.toFixed(2)),
          taxableAmount: parseFloat(itemTaxableAmount.toFixed(2)),
          totalTaxAmount: parseFloat(itemTotalTax.toFixed(2)),
          amount: parseFloat(itemAmount.toFixed(2)),
          itemAmount: parseFloat(itemAmount.toFixed(2)),
          receivedQuantity: 0,
          pendingQuantity: quantity,
          lineNumber: i + 1,
        };

        processedItems.push(processedItem);
      }

      // Calculate final totals
      const finalTotal = processedItems.reduce(
        (sum, item) => sum + item.amount,
        0
      );

      // Apply round off if enabled
      let appliedRoundOff = 0;
      let adjustedFinalTotal = finalTotal;
      if (roundOffEnabled && roundOff !== 0) {
        appliedRoundOff = parseFloat(roundOff);
        adjustedFinalTotal = finalTotal + appliedRoundOff;
      }

      // Prepare totals object
      const totals = {
        subtotal: parseFloat(subtotal.toFixed(2)),
        totalQuantity: processedItems.reduce(
          (sum, item) => sum + item.quantity,
          0
        ),
        totalDiscount: parseFloat(totalDiscount.toFixed(2)),
        totalTax: parseFloat(totalTax.toFixed(2)),
        totalCGST: parseFloat(
          processedItems.reduce((sum, item) => sum + item.cgst, 0).toFixed(2)
        ),
        totalSGST: parseFloat(
          processedItems.reduce((sum, item) => sum + item.sgst, 0).toFixed(2)
        ),
        totalIGST: parseFloat(
          processedItems.reduce((sum, item) => sum + item.igst, 0).toFixed(2)
        ),
        totalTaxableAmount: parseFloat(totalTaxableAmount.toFixed(2)),
        finalTotal: parseFloat(adjustedFinalTotal.toFixed(2)),
        roundOff: parseFloat(appliedRoundOff.toFixed(2)),
      };

      const rawPaymentMethod = payment?.method || "credit";
      const normalizedPaymentMethod = normalizePaymentMethod(rawPaymentMethod);

      // ✅ ENHANCED PAYMENT DETAILS WITH PROPER DUE DATE CALCULATION (same as sales)
      const paymentDetails = {
        method: normalizedPaymentMethod,
        status: payment?.status || "pending",
        paidAmount: parseFloat(payment?.paidAmount || 0),
        pendingAmount: 0,
        paymentDate: payment?.paymentDate
          ? new Date(payment.paymentDate)
          : new Date(),
        dueDate: null, // ✅ Initialize as null
        creditDays: parseInt(payment?.creditDays || 0),
        reference: payment?.reference || "",
        notes: payment?.notes || "",
        bankAccountId: payment?.bankAccountId || null,
        bankAccountName: payment?.bankAccountName || null,
      };

      // ✅ FIXED: Calculate due date properly (same as sales)
      if (payment?.dueDate) {
        // If explicit due date is provided
        paymentDetails.dueDate = new Date(payment.dueDate);
      } else if (paymentDetails.creditDays > 0) {
        // Calculate due date from credit days
        const calculatedDueDate = new Date(paymentDetails.paymentDate);
        calculatedDueDate.setDate(
          calculatedDueDate.getDate() + paymentDetails.creditDays
        );
        paymentDetails.dueDate = calculatedDueDate;

        console.log(
          `✅ Calculated due date: ${
            calculatedDueDate.toISOString().split("T")[0]
          } (${paymentDetails.creditDays} days from ${
            paymentDetails.paymentDate.toISOString().split("T")[0]
          })`
        );
      }

      const paidAmount = paymentDetails.paidAmount;
      paymentDetails.pendingAmount = parseFloat(
        (adjustedFinalTotal - paidAmount).toFixed(2)
      );

      // ✅ ENHANCED: Auto-determine payment status with proper due date handling (same as sales)
      if (paidAmount >= adjustedFinalTotal) {
        paymentDetails.status = "paid";
        paymentDetails.pendingAmount = 0;
        paymentDetails.dueDate = null; // Clear due date for fully paid purchases
      } else if (paidAmount > 0) {
        paymentDetails.status = "partial";
        // Keep the calculated due date for partial payments
      } else {
        paymentDetails.status = "pending";
        paymentDetails.pendingAmount = adjustedFinalTotal;
        // Keep the calculated due date for pending payments
      }

      // ✅ Check for overdue status (same as sales)
      if (paymentDetails.dueDate && paymentDetails.pendingAmount > 0) {
        const now = new Date();
        if (now > paymentDetails.dueDate) {
          paymentDetails.status = "overdue";
          console.log(
            `⚠️ Purchase is overdue: Due ${
              paymentDetails.dueDate.toISOString().split("T")[0]
            }, Today ${now.toISOString().split("T")[0]}`
          );
        }
      }

      if (paymentDetails.pendingAmount < 0) {
        paymentDetails.pendingAmount = 0;
      }

      // ✅ FIXED: Initialize payment history with normalized method (same as sales)
      let paymentHistory = [];
      if (paidAmount > 0) {
        paymentHistory.push({
          amount: paidAmount,
          method: normalizedPaymentMethod,
          reference: paymentDetails.reference,
          paymentDate: paymentDetails.paymentDate,
          dueDate: paymentDetails.dueDate, // ✅ Include due date in payment history
          bankAccountId: paymentDetails.bankAccountId,
          bankAccountName: paymentDetails.bankAccountName,
          notes: paymentDetails.notes || "Initial payment",
          createdAt: new Date(),
          createdBy: req.user?.id || "system",
        });
      }

      // Enhanced source company detection
      let finalNotes = notes || "";
      if (sourceOrderId && sourceOrderType) {
        const conversionNote = `Converted from ${sourceOrderType} ${
          sourceOrderNumber || sourceOrderId
        }`;
        finalNotes = finalNotes
          ? `${finalNotes} | ${conversionNote}`
          : conversionNote;
      }

      let finalSourceCompanyId = sourceCompanyId;
      let sourceCompanyDetectionMethod = sourceCompanyId ? "manual" : "none";

      // ✅ Create purchase object WITHOUT manual purchaseNumber - model will auto-generate
      const purchaseData = {
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        purchaseType: gstEnabled ? "gst" : "non-gst",
        supplier: supplierRecord._id,
        supplierMobile: supplierRecord.mobile || supplierMobile,
        gstEnabled,
        taxMode: finalTaxMode,
        priceIncludesTax: finalPriceIncludesTax,
        companyId,
        items: processedItems,
        totals,
        payment: paymentDetails, // ✅ Now includes properly calculated due date
        paymentHistory: paymentHistory,
        notes: finalNotes,
        termsAndConditions: termsAndConditions || "",
        status,

        // Enhanced source tracking
        sourceOrderId: sourceOrderId || null,
        sourceOrderNumber: sourceOrderNumber || null,
        sourceOrderType: sourceOrderId ? sourceOrderType : null,

        ...(finalSourceCompanyId && {
          sourceCompanyId: finalSourceCompanyId,
          isCrossCompanyTransaction: true,
          supplierCompanyId: supplierRecord?.companyId || null,
          sourceCompanyDetectionMethod: sourceCompanyDetectionMethod,
        }),

        ...(!finalSourceCompanyId && {
          isCrossCompanyTransaction: false,
          supplierCompanyId: null,
          sourceCompanyDetectionMethod: sourceCompanyDetectionMethod,
        }),

        isAutoGenerated: isAutoGenerated || false,
        generatedFrom: sourceOrderId ? "purchase_order" : generatedFrom,
        convertedBy: convertedBy || null,

        autoGeneratedSalesInvoice: false,
        salesInvoiceRef: null,
        salesInvoiceNumber: null,
        targetCompanyId: null,

        convertedFromPurchaseOrder:
          !!sourceOrderId && sourceOrderType === "purchase_order",
        purchaseOrderRef:
          sourceOrderId && sourceOrderType === "purchase_order"
            ? sourceOrderId
            : null,
        purchaseOrderNumber:
          sourceOrderId && sourceOrderType === "purchase_order"
            ? sourceOrderNumber
            : null,

        correspondingSalesInvoiceId: null,
        correspondingSalesInvoiceNumber: null,
        correspondingSalesInvoiceCompany: null,

        createdBy: req.user?.id || "system",
        lastModifiedBy: req.user?.id || "system",
      };

      // ✅ Create the purchase - purchase number will be auto-generated by model's pre-save middleware
      const purchase = new Purchase(purchaseData);
      await purchase.save();

      // Populate supplier details for response
      await purchase.populate(
        "supplier",
        "name mobile email address type companyId linkedCompanyId"
      );

      // ===== ✅ ENHANCED STOCK UPDATE USING ITEMCONTROLLER =====
      console.log(
        "📦 Updating stock for purchase using itemController functions..."
      );

      const stockUpdateResults = await updateStockForPurchase(
        purchase,
        processedItems,
        supplierRecord,
        req
      );

      // ✅ Add stock update info to response
      const successfulUpdates = stockUpdateResults.filter((r) => r.success);
      const failedUpdates = stockUpdateResults.filter((r) => !r.success);

      console.log(
        `✅ Stock updates: ${successfulUpdates.length} successful, ${failedUpdates.length} failed`
      );

      // ===== ✅ SIMPLIFIED PAYMENT HANDLING (SAME AS SALES CONTROLLER) =====
      if (paidAmount > 0) {
        console.log(
          `💰 Payment of ₹${paidAmount} recorded in purchase. Financial transaction will be handled by payment system.`
        );
      }

      // Update source purchase order if conversion
      if (sourceOrderId && mongoose.Types.ObjectId.isValid(sourceOrderId)) {
        try {
          const PurchaseOrder = require("../models/PurchaseOrder");
          await PurchaseOrder.findByIdAndUpdate(sourceOrderId, {
            convertedToInvoice: true,
            invoiceRef: purchase._id,
            invoiceNumber: purchase.purchaseNumber,
            convertedAt: new Date(),
            convertedBy: convertedBy || req.user?.id || "system",
            status: "completed",
          });
        } catch (updateError) {
          console.warn(
            "Failed to update source purchase order:",
            updateError.message
          );
        }
      }

      // ✅ SIMPLIFIED RESPONSE (SAME AS SALES CONTROLLER)
      res.status(201).json({
        success: true,
        message: "Purchase created successfully with automatic stock tracking",
        data: {
          purchase,
          bill: {
            purchaseNumber: purchase.purchaseNumber,
            purchaseDate: purchase.purchaseDate,
            companyInfo: {
              id: currentCompany._id,
              name: currentCompany.businessName,
              code: currentCompany.code,
              prefix: purchase.purchaseNumber.split("-")[0],
            },
            supplier: {
              id: supplierRecord._id,
              name: supplierRecord.name,
              mobile: supplierRecord.mobile,
              companyId: supplierRecord.companyId,
              linkedCompanyId: supplierRecord.linkedCompanyId,
            },
            totals: purchase.totals,
            payment: {
              ...purchase.payment,
              dueDate: purchase.payment.dueDate,
              creditDays: purchase.payment.creditDays,
              // ✅ Add due date information to response (same as sales)
              dueDateInfo: purchase.payment.dueDate
                ? {
                    dueDate: purchase.payment.dueDate,
                    formattedDueDate: purchase.payment.dueDate
                      .toISOString()
                      .split("T")[0],
                    daysFromNow: Math.ceil(
                      (purchase.payment.dueDate - new Date()) /
                        (1000 * 60 * 60 * 24)
                    ),
                    isOverdue:
                      new Date() > purchase.payment.dueDate &&
                      purchase.payment.pendingAmount > 0,
                  }
                : null,
            },
            taxMode: purchase.taxMode,
            priceIncludesTax: purchase.priceIncludesTax,
            gstEnabled: purchase.gstEnabled,
            numberingInfo: {
              isSequential: true,
              companySpecific: true,
              autoGenerated: true,
              generatedBy: "model_pre_save_middleware",
              pattern: `${
                purchase.purchaseNumber.split("-")[0]
              }-PO-[GST-]YYYYMMDD-XXXX`,
              modelBased: true,
            },
          },
          stockUpdates: {
            itemsProcessed: processedItems.length,
            successfulUpdates: successfulUpdates.length,
            failedUpdates: failedUpdates.length,
            stockHistoryCreated: true,
            transactionHistoryEnabled: true,
            usingItemController: true,
            results: stockUpdateResults,
          },
          payment: {
            recorded: paidAmount > 0,
            amount: paidAmount,
            method: paymentDetails.method,
            status: paymentDetails.status,
            note:
              paidAmount > 0
                ? "Payment recorded in purchase. Financial transaction will be created when payment is processed through payment system."
                : "No payment recorded",
          },
        },
      });
    } catch (error) {
      console.error(
        "❌ Error creating purchase with enhanced tracking:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to create purchase",
        error: error.message,
      });
    }
  },

  addPayment: async (req, res) => {
    try {
      const {id} = req.params;
      const {
        amount,
        method = "cash",
        reference = "",
        paymentDate,
        dueDate,
        creditDays,
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

      const currentBalance = purchase.balanceAmount;
      if (amount > currentBalance) {
        return res.status(400).json({
          success: false,
          message: `Payment amount cannot exceed balance amount of ₹${currentBalance.toFixed(
            2
          )}`,
        });
      }

      // ✅ FIXED: Normalize payment method (same as sales)
      const normalizedMethod = normalizePaymentMethod(method);

      const newPaidAmount = purchase.payment.paidAmount + parseFloat(amount);
      const newPendingAmount = purchase.totals.finalTotal - newPaidAmount;

      let newPaymentStatus = "pending";
      let newDueDate = purchase.payment.dueDate;

      if (newPaidAmount >= purchase.totals.finalTotal) {
        newPaymentStatus = "paid";
        newDueDate = null;
      } else if (newPaidAmount > 0) {
        newPaymentStatus = "partial";

        if (dueDate) {
          newDueDate = new Date(dueDate);
        } else if (creditDays && creditDays > 0) {
          const calculatedDueDate = new Date();
          calculatedDueDate.setDate(
            calculatedDueDate.getDate() + parseInt(creditDays)
          );
          newDueDate = calculatedDueDate;
        }
      }

      if (newDueDate && new Date() > newDueDate && newPendingAmount > 0) {
        newPaymentStatus = "overdue";
      }

      purchase.payment = {
        ...purchase.payment,
        method: normalizedMethod,
        status: newPaymentStatus,
        paidAmount: parseFloat(newPaidAmount.toFixed(2)),
        pendingAmount: parseFloat(Math.max(0, newPendingAmount).toFixed(2)),
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        dueDate: newDueDate,
        creditDays: creditDays
          ? parseInt(creditDays)
          : purchase.payment.creditDays,
        reference: reference,
        notes: notes,
      };

      if (!purchase.paymentHistory) {
        purchase.paymentHistory = [];
      }

      purchase.paymentHistory.push({
        amount: parseFloat(amount),
        method: normalizedMethod,
        reference,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        dueDate: newDueDate,
        notes,
        createdAt: new Date(),
        createdBy: req.user?.id || "system",
      });

      await purchase.save();

      // ✅ SIMPLIFIED: No financial transaction creation (same as sales)
      res.json({
        success: true,
        message: "Payment added successfully",
        data: {
          purchase,
          payment: {
            recorded: true,
            amount: amount,
            method: normalizedMethod,
            note: "Payment recorded in purchase. Financial transaction will be created when payment is processed through payment system.",
          },
        },
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

      let result;

      if (deleteMethod === "hard" || forceDelete) {
        // ✅ HARD DELETE - Permanently remove

        result = await Purchase.findByIdAndDelete(id);

        if (!result) {
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
              } catch (stockError) {
                console.warn(
                  `⚠️ Could not reverse stock for ${item.itemName}:`,
                  stockError.message
                );
              }
            }
          }
        }
        return res.json({
          success: true,
          message: "Purchase deleted permanently",
          deleteMethod: "hard",
          stockReversed: result.items?.length || 0,
        });
      } else {
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
          return res.json({
            success: true,
            message: "Purchase not found (may have been already deleted)",
            alreadyDeleted: true,
            deleteMethod: "soft",
          });
        }
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

  // ==================== 📊 ADMIN ANALYTICS FUNCTIONS ====================

  /**
   * ✅ NEW: Get all purchases for admin (across all companies)
   */
  getAllPurchasesForAdmin: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 100,
        status,
        paymentStatus,
        dateFrom,
        dateTo,
        companyId: filterCompanyId,
        supplierId,
        search,
        sortBy = "purchaseDate",
        sortOrder = "desc",
      } = req.query;

      // Build admin filter (across all companies)
      const filter = {};

      if (status) {
        filter.status = status.includes(",")
          ? {$in: status.split(",")}
          : status;
      }

      if (paymentStatus) {
        filter["payment.status"] = paymentStatus.includes(",")
          ? {$in: paymentStatus.split(",")}
          : paymentStatus;
      }

      if (filterCompanyId && mongoose.Types.ObjectId.isValid(filterCompanyId)) {
        filter.companyId = filterCompanyId;
      }

      if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) {
        filter.supplier = supplierId;
      }

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

      const sortOptions = {};
      const validSortFields = [
        "purchaseDate",
        "purchaseNumber",
        "status",
        "totals.finalTotal",
        "createdAt",
      ];

      if (validSortFields.includes(sortBy)) {
        sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
      } else {
        sortOptions.purchaseDate = -1;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [purchases, total] = await Promise.all([
        Purchase.find(filter)
          .populate("supplier", "name mobile phoneNumber email")
          .populate("companyId", "businessName email phoneNumber")
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit)),
        Purchase.countDocuments(filter),
      ]);

      // Calculate admin statistics
      const adminStats = {
        totalPurchases: total,
        totalValue: purchases.reduce(
          (sum, purch) => sum + (purch.totals?.finalTotal || 0),
          0
        ),
        purchasesByStatus: await Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$status",
              count: {$sum: 1},
              value: {$sum: "$totals.finalTotal"},
            },
          },
        ]),
        purchasesByCompany: await Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$companyId",
              count: {$sum: 1},
              value: {$sum: "$totals.finalTotal"},
            },
          },
          {$limit: 10},
        ]),
        companiesWithPurchases: await Purchase.distinct("companyId", filter),
        bidirectionalCount: await Purchase.countDocuments({
          ...filter,
          $or: [
            {autoGeneratedSalesInvoice: true},
            {convertedFromPurchaseOrder: true},
            {isAutoGenerated: true},
          ],
        }),
      };

      res.status(200).json({
        success: true,
        data: {
          purchases: purchases,
          bills: purchases,
          invoices: purchases,
          data: purchases,
          count: purchases.length,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalPurchases: total,
            limit: parseInt(limit),
            hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
            hasPrev: parseInt(page) > 1,
          },
          adminStats,
          summary: {
            totalPurchases: total,
            totalValue: adminStats.totalValue,
            activeCompanies: adminStats.companiesWithPurchases.length,
            bidirectional: adminStats.bidirectionalCount,
          },
        },
        message: `Found ${purchases.length} purchases for admin`,
      });
    } catch (error) {
      console.error("❌ Error fetching admin purchases:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch all purchases for admin",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get purchase statistics for admin dashboard
   */
  getPurchaseStatsForAdmin: async (req, res) => {
    try {
      const {dateFrom, dateTo, companyId} = req.query;

      const filter = {};
      if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
        filter.companyId = companyId;
      }
      if (dateFrom || dateTo) {
        filter.purchaseDate = {};
        if (dateFrom) filter.purchaseDate.$gte = new Date(dateFrom);
        if (dateTo) filter.purchaseDate.$lte = new Date(dateTo);
      }

      const [
        totalStats,
        statusBreakdown,
        companyBreakdown,
        monthlyStats,
        paymentStatusBreakdown,
        topSuppliers,
        recentPurchases,
      ] = await Promise.all([
        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: null,
              totalPurchases: {$sum: 1},
              totalAmount: {$sum: "$totals.finalTotal"},
              totalPaid: {$sum: "$payment.paidAmount"},
              totalPending: {$sum: "$payment.pendingAmount"},
              avgPurchaseValue: {$avg: "$totals.finalTotal"},
            },
          },
        ]),

        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$status",
              count: {$sum: 1},
              value: {$sum: "$totals.finalTotal"},
            },
          },
        ]),

        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$companyId",
              count: {$sum: 1},
              value: {$sum: "$totals.finalTotal"},
            },
          },
          {$sort: {value: -1}},
          {$limit: 10},
        ]),

        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: {
                year: {$year: "$purchaseDate"},
                month: {$month: "$purchaseDate"},
              },
              count: {$sum: 1},
              value: {$sum: "$totals.finalTotal"},
            },
          },
          {$sort: {"_id.year": -1, "_id.month": -1}},
          {$limit: 12},
        ]),

        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$payment.status",
              count: {$sum: 1},
              totalAmount: {$sum: "$totals.finalTotal"},
              paidAmount: {$sum: "$payment.paidAmount"},
              pendingAmount: {$sum: "$payment.pendingAmount"},
            },
          },
        ]),

        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$supplier",
              count: {$sum: 1},
              totalAmount: {$sum: "$totals.finalTotal"},
            },
          },
          {$sort: {totalAmount: -1}},
          {$limit: 10},
          {
            $lookup: {
              from: "parties",
              localField: "_id",
              foreignField: "_id",
              as: "supplier",
            },
          },
          {$unwind: {path: "$supplier", preserveNullAndEmptyArrays: true}},
        ]),

        Purchase.find(filter)
          .populate("supplier", "name mobile")
          .populate("companyId", "businessName")
          .sort({createdAt: -1})
          .limit(10),
      ]);

      const stats = totalStats[0] || {
        totalPurchases: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalPending: 0,
        avgPurchaseValue: 0,
      };

      res.status(200).json({
        success: true,
        data: {
          ...stats,
          purchasesByStatus: statusBreakdown.reduce((acc, item) => {
            acc[item._id] = {count: item.count, value: item.value};
            return acc;
          }, {}),
          purchasesByCompany: companyBreakdown,
          monthlyStats: monthlyStats.map((item) => ({
            year: item._id.year,
            month: item._id.month,
            count: item.count,
            value: item.value,
          })),
          paymentStatusBreakdown: paymentStatusBreakdown.reduce((acc, item) => {
            acc[item._id || "unknown"] = {
              count: item.count,
              totalAmount: item.totalAmount,
              paidAmount: item.paidAmount,
              pendingAmount: item.pendingAmount,
            };
            return acc;
          }, {}),
          topSuppliers: topSuppliers.map((item) => ({
            supplierId: item._id,
            supplierName: item.supplier?.name || "Unknown",
            count: item.count,
            totalAmount: item.totalAmount,
          })),
          recentPurchases: recentPurchases,
        },
        message: "Purchase statistics fetched successfully for admin",
      });
    } catch (error) {
      console.error("❌ Error fetching admin purchase stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch purchase statistics for admin",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get admin analytics for purchases
   */
  getAdminPurchaseAnalytics: async (req, res) => {
    try {
      const {dateFrom, dateTo, companyId} = req.query;

      const filter = {};
      if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
        filter.companyId = companyId;
      }
      if (dateFrom || dateTo) {
        filter.purchaseDate = {};
        if (dateFrom) filter.purchaseDate.$gte = new Date(dateFrom);
        if (dateTo) filter.purchaseDate.$lte = new Date(dateTo);
      }

      const [
        valueAnalytics,
        trendAnalytics,
        companyAnalytics,
        supplierAnalytics,
        statusDistribution,
        paymentAnalytics,
      ] = await Promise.all([
        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: null,
              totalPurchaseValue: {$sum: "$totals.finalTotal"},
              averagePurchaseValue: {$avg: "$totals.finalTotal"},
              maxPurchaseValue: {$max: "$totals.finalTotal"},
              minPurchaseValue: {$min: "$totals.finalTotal"},
              totalTax: {$sum: "$totals.totalTax"},
              totalDiscount: {$sum: "$totals.totalDiscount"},
            },
          },
        ]),

        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: {
                year: {$year: "$purchaseDate"},
                month: {$month: "$purchaseDate"},
                week: {$week: "$purchaseDate"},
              },
              purchaseCount: {$sum: 1},
              totalValue: {$sum: "$totals.finalTotal"},
              avgValue: {$avg: "$totals.finalTotal"},
            },
          },
          {$sort: {"_id.year": -1, "_id.month": -1, "_id.week": -1}},
          {$limit: 24},
        ]),

        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$companyId",
              purchaseCount: {$sum: 1},
              totalValue: {$sum: "$totals.finalTotal"},
              avgValue: {$avg: "$totals.finalTotal"},
              lastPurchaseDate: {$max: "$purchaseDate"},
            },
          },
          {$sort: {totalValue: -1}},
          {$limit: 20},
          {
            $lookup: {
              from: "companies",
              localField: "_id",
              foreignField: "_id",
              as: "company",
            },
          },
          {$unwind: {path: "$company", preserveNullAndEmptyArrays: true}},
        ]),

        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$supplier",
              purchaseCount: {$sum: 1},
              totalValue: {$sum: "$totals.finalTotal"},
              avgValue: {$avg: "$totals.finalTotal"},
              lastPurchaseDate: {$max: "$purchaseDate"},
            },
          },
          {$sort: {totalValue: -1}},
          {$limit: 20},
          {
            $lookup: {
              from: "parties",
              localField: "_id",
              foreignField: "_id",
              as: "supplier",
            },
          },
          {$unwind: {path: "$supplier", preserveNullAndEmptyArrays: true}},
        ]),

        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$status",
              count: {$sum: 1},
              value: {$sum: "$totals.finalTotal"},
              percentage: {$sum: 1},
            },
          },
        ]),

        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$payment.status",
              count: {$sum: 1},
              totalAmount: {$sum: "$totals.finalTotal"},
              paidAmount: {$sum: "$payment.paidAmount"},
              pendingAmount: {$sum: "$payment.pendingAmount"},
            },
          },
        ]),
      ]);

      const analytics = valueAnalytics[0] || {
        totalPurchaseValue: 0,
        averagePurchaseValue: 0,
        maxPurchaseValue: 0,
        minPurchaseValue: 0,
        totalTax: 0,
        totalDiscount: 0,
      };

      // Calculate companies with purchases
      const companiesWithPurchases = companyAnalytics.length;

      res.status(200).json({
        success: true,
        data: {
          ...analytics,
          companiesWithPurchases,
          monthlyTrends: trendAnalytics.map((item) => ({
            year: item._id.year,
            month: item._id.month,
            week: item._id.week,
            purchaseCount: item.purchaseCount,
            totalValue: item.totalValue,
            avgValue: item.avgValue,
          })),
          topCompanies: companyAnalytics.map((item) => ({
            companyId: item._id,
            companyName: item.company?.businessName || "Unknown",
            purchaseCount: item.purchaseCount,
            totalValue: item.totalValue,
            avgValue: item.avgValue,
            lastPurchaseDate: item.lastPurchaseDate,
          })),
          supplierAnalytics: supplierAnalytics.map((item) => ({
            supplierId: item._id,
            supplierName: item.supplier?.name || "Unknown",
            purchaseCount: item.purchaseCount,
            totalValue: item.totalValue,
            avgValue: item.avgValue,
            lastPurchaseDate: item.lastPurchaseDate,
          })),
          statusDistribution: statusDistribution.reduce((acc, item) => {
            acc[item._id] = {
              count: item.count,
              value: item.value,
            };
            return acc;
          }, {}),
          paymentStatusDistribution: paymentAnalytics.reduce((acc, item) => {
            acc[item._id || "unknown"] = {
              count: item.count,
              totalAmount: item.totalAmount,
              paidAmount: item.paidAmount,
              pendingAmount: item.pendingAmount,
            };
            return acc;
          }, {}),
        },
        message: "Admin purchase analytics retrieved successfully",
      });
    } catch (error) {
      console.error("❌ Error fetching admin purchase analytics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch admin purchase analytics",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get admin dashboard summary for purchases
   */
  getAdminPurchaseDashboardSummary: async (req, res) => {
    try {
      const {dateFrom, dateTo} = req.query;

      const filter = {};
      if (dateFrom || dateTo) {
        filter.purchaseDate = {};
        if (dateFrom) filter.purchaseDate.$gte = new Date(dateFrom);
        if (dateTo) filter.purchaseDate.$lte = new Date(dateTo);
      }

      const today = new Date();
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

      const [
        totalSummary,
        thisMonthSummary,
        lastMonthSummary,
        recentActivity,
        statusBreakdown,
        topPerformingCompanies,
        paymentSummary,
      ] = await Promise.all([
        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: null,
              totalPurchases: {$sum: 1},
              totalAmount: {$sum: "$totals.finalTotal"},
              activeCompanies: {$addToSet: "$companyId"},
            },
          },
        ]),

        Purchase.aggregate([
          {$match: {...filter, purchaseDate: {$gte: thisMonth}}},
          {
            $group: {
              _id: null,
              thisMonthPurchases: {$sum: 1},
              thisMonthAmount: {$sum: "$totals.finalTotal"},
            },
          },
        ]),

        Purchase.aggregate([
          {
            $match: {
              ...filter,
              purchaseDate: {$gte: lastMonth, $lt: thisMonth},
            },
          },
          {
            $group: {
              _id: null,
              lastMonthPurchases: {$sum: 1},
              lastMonthAmount: {$sum: "$totals.finalTotal"},
            },
          },
        ]),

        Purchase.find(filter)
          .populate("supplier", "name")
          .populate("companyId", "businessName")
          .sort({createdAt: -1})
          .limit(20)
          .select(
            "purchaseNumber purchaseDate totals.finalTotal status createdAt"
          ),

        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$status",
              count: {$sum: 1},
              value: {$sum: "$totals.finalTotal"},
            },
          },
        ]),

        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$companyId",
              count: {$sum: 1},
              value: {$sum: "$totals.finalTotal"},
            },
          },
          {$sort: {value: -1}},
          {$limit: 10},
          {
            $lookup: {
              from: "companies",
              localField: "_id",
              foreignField: "_id",
              as: "company",
            },
          },
          {$unwind: {path: "$company", preserveNullAndEmptyArrays: true}},
        ]),

        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$payment.status",
              count: {$sum: 1},
              totalAmount: {$sum: "$totals.finalTotal"},
              paidAmount: {$sum: "$payment.paidAmount"},
              pendingAmount: {$sum: "$payment.pendingAmount"},
            },
          },
        ]),
      ]);

      const summary = totalSummary[0] || {
        totalPurchases: 0,
        totalAmount: 0,
        activeCompanies: [],
      };

      const thisMonthData = thisMonthSummary[0] || {
        thisMonthPurchases: 0,
        thisMonthAmount: 0,
      };

      const lastMonthData = lastMonthSummary[0] || {
        lastMonthPurchases: 0,
        lastMonthAmount: 0,
      };

      // Calculate growth percentages
      const purchaseGrowth =
        lastMonthData.lastMonthPurchases > 0
          ? (
              ((thisMonthData.thisMonthPurchases -
                lastMonthData.lastMonthPurchases) /
                lastMonthData.lastMonthPurchases) *
              100
            ).toFixed(2)
          : 0;

      const amountGrowth =
        lastMonthData.lastMonthAmount > 0
          ? (
              ((thisMonthData.thisMonthAmount - lastMonthData.lastMonthAmount) /
                lastMonthData.lastMonthAmount) *
              100
            ).toFixed(2)
          : 0;

      res.status(200).json({
        success: true,
        data: {
          totalPurchases: summary.totalPurchases,
          totalAmount: summary.totalAmount,
          activeCompanies: summary.activeCompanies.length,
          thisMonthPurchases: thisMonthData.thisMonthPurchases,
          thisMonthAmount: thisMonthData.thisMonthAmount,
          purchaseGrowth: parseFloat(purchaseGrowth),
          amountGrowth: parseFloat(amountGrowth),
          recentActivity: recentActivity.map((item) => ({
            purchaseId: item._id,
            purchaseNumber: item.purchaseNumber,
            purchaseDate: item.purchaseDate,
            amount: item.totals?.finalTotal || 0,
            status: item.status,
            supplier: item.supplier?.name || "Unknown",
            company: item.companyId?.businessName || "Unknown",
            createdAt: item.createdAt,
          })),
          statusBreakdown: statusBreakdown.reduce((acc, item) => {
            acc[item._id] = {
              count: item.count,
              value: item.value,
            };
            return acc;
          }, {}),
          topPerformers: topPerformingCompanies.map((item) => ({
            companyId: item._id,
            companyName: item.company?.businessName || "Unknown",
            purchaseCount: item.count,
            totalValue: item.value,
          })),
          paymentSummary: paymentSummary.reduce((acc, item) => {
            acc[item._id || "unknown"] = {
              count: item.count,
              totalAmount: item.totalAmount,
              paidAmount: item.paidAmount,
              pendingAmount: item.pendingAmount,
            };
            return acc;
          }, {}),
        },
        message: "Admin purchase dashboard summary retrieved successfully",
      });
    } catch (error) {
      console.error(
        "❌ Error fetching admin purchase dashboard summary:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to fetch admin purchase dashboard summary",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get overdue purchases for admin (across all companies)
   */
  getOverduePurchasesForAdmin: async (req, res) => {
    try {
      const {companyId, limit = 50, sortBy = "payment.dueDate"} = req.query;

      const today = new Date();
      const filter = {
        "payment.dueDate": {$lt: today},
        "payment.pendingAmount": {$gt: 0},
        status: {$ne: "cancelled"},
      };

      if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
        filter.companyId = companyId;
      }

      const overduePurchases = await Purchase.find(filter)
        .populate("supplier", "name mobile email")
        .populate("companyId", "businessName email phoneNumber")
        .sort({[sortBy]: 1})
        .limit(parseInt(limit));

      const overdueStats = await Purchase.aggregate([
        {$match: filter},
        {
          $group: {
            _id: null,
            totalOverdueAmount: {$sum: "$payment.pendingAmount"},
            totalOverdueCount: {$sum: 1},
            avgOverdueAmount: {$avg: "$payment.pendingAmount"},
            maxOverdueAmount: {$max: "$payment.pendingAmount"},
          },
        },
      ]);

      // Calculate days overdue for each purchase
      const enrichedPurchases = overduePurchases.map((purchase) => {
        const dueDate = new Date(purchase.payment.dueDate);
        const daysOverdue = Math.ceil(
          (today - dueDate) / (1000 * 60 * 60 * 24)
        );

        return {
          ...purchase.toObject(),
          daysOverdue,
          overdueCategory:
            daysOverdue <= 7
              ? "recent"
              : daysOverdue <= 30
              ? "medium"
              : "critical",
        };
      });

      res.status(200).json({
        success: true,
        data: {
          purchases: enrichedPurchases,
          count: enrichedPurchases.length,
          stats: overdueStats[0] || {
            totalOverdueAmount: 0,
            totalOverdueCount: 0,
            avgOverdueAmount: 0,
            maxOverdueAmount: 0,
          },
        },
        message: `Found ${enrichedPurchases.length} overdue purchases for admin`,
      });
    } catch (error) {
      console.error("❌ Error fetching overdue purchases for admin:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch overdue purchases for admin",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get purchases due today for admin (across all companies)
   */
  getPurchasesDueTodayForAdmin: async (req, res) => {
    try {
      const {companyId, limit = 50} = req.query;

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

      const filter = {
        "payment.dueDate": {$gte: startOfDay, $lt: endOfDay},
        "payment.pendingAmount": {$gt: 0},
        status: {$ne: "cancelled"},
      };

      if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
        filter.companyId = companyId;
      }

      const purchasesDueToday = await Purchase.find(filter)
        .populate("supplier", "name mobile email")
        .populate("companyId", "businessName email phoneNumber")
        .sort({"payment.dueDate": 1})
        .limit(parseInt(limit));

      const dueTodayStats = await Purchase.aggregate([
        {$match: filter},
        {
          $group: {
            _id: null,
            totalDueTodayAmount: {$sum: "$payment.pendingAmount"},
            totalDueTodayCount: {$sum: 1},
            avgDueTodayAmount: {$avg: "$payment.pendingAmount"},
          },
        },
      ]);

      res.status(200).json({
        success: true,
        data: {
          purchases: purchasesDueToday,
          count: purchasesDueToday.length,
          stats: dueTodayStats[0] || {
            totalDueTodayAmount: 0,
            totalDueTodayCount: 0,
            avgDueTodayAmount: 0,
          },
        },
        message: `Found ${purchasesDueToday.length} purchases due today for admin`,
      });
    } catch (error) {
      console.error("❌ Error fetching purchases due today for admin:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch purchases due today for admin",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get admin bidirectional purchase analytics (like sales)
   */
  getAdminBidirectionalPurchaseAnalytics: async (req, res) => {
    try {
      const {dateFrom, dateTo, companyId} = req.query;

      const filter = {};
      if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
        filter.companyId = companyId;
      }
      if (dateFrom || dateTo) {
        filter.purchaseDate = {};
        if (dateFrom) filter.purchaseDate.$gte = new Date(dateFrom);
        if (dateTo) filter.purchaseDate.$lte = new Date(dateTo);
      }

      // Get bidirectional purchases
      const bidirectionalFilter = {
        ...filter,
        $or: [
          {autoGeneratedSalesInvoice: true},
          {convertedFromPurchaseOrder: true},
          {isAutoGenerated: true},
          {isCrossCompanyTransaction: true},
        ],
      };

      const [
        totalBidirectionalPurchases,
        totalBidirectionalValue,
        companiesUsingBidirectional,
        sourceTypeBreakdown,
        crossCompanyMapping,
        conversionRates,
      ] = await Promise.all([
        Purchase.countDocuments(bidirectionalFilter),

        Purchase.aggregate([
          {$match: bidirectionalFilter},
          {$group: {_id: null, total: {$sum: "$totals.finalTotal"}}},
        ]),

        Purchase.distinct("companyId", bidirectionalFilter),

        Purchase.aggregate([
          {$match: bidirectionalFilter},
          {
            $group: {
              _id: {
                $cond: [
                  {$eq: ["$isAutoGenerated", true]},
                  "auto_generated",
                  {
                    $cond: [
                      {$eq: ["$convertedFromPurchaseOrder", true]},
                      "from_purchase_order",
                      {
                        $cond: [
                          {$eq: ["$autoGeneratedSalesInvoice", true]},
                          "with_sales_invoice",
                          "direct",
                        ],
                      },
                    ],
                  },
                ],
              },
              count: {$sum: 1},
              value: {$sum: "$totals.finalTotal"},
            },
          },
        ]),

        Purchase.aggregate([
          {
            $match: {
              ...filter,
              isCrossCompanyTransaction: true,
              sourceCompanyId: {$exists: true, $ne: null},
            },
          },
          {
            $group: {
              _id: {
                buyingCompany: "$companyId",
                sellingCompany: "$sourceCompanyId",
              },
              count: {$sum: 1},
              value: {$sum: "$totals.finalTotal"},
            },
          },
          {$sort: {count: -1}},
          {$limit: 10},
        ]),

        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: null,
              total: {$sum: 1},
              bidirectional: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        {$eq: ["$autoGeneratedSalesInvoice", true]},
                        {$eq: ["$convertedFromPurchaseOrder", true]},
                        {$eq: ["$isAutoGenerated", true]},
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ]),
      ]);

      const conversionData = conversionRates[0] || {total: 0, bidirectional: 0};
      const bidirectionalPercentage =
        conversionData.total > 0
          ? (
              (conversionData.bidirectional / conversionData.total) *
              100
            ).toFixed(2)
          : 0;

      res.status(200).json({
        success: true,
        data: {
          totalBidirectionalPurchases,
          totalBidirectionalValue: totalBidirectionalValue[0]?.total || 0,
          companiesUsingBidirectional: companiesUsingBidirectional.length,
          bidirectionalSpend: totalBidirectionalValue[0]?.total || 0,
          sourceTypeBreakdown: sourceTypeBreakdown.reduce((acc, item) => {
            acc[item._id] = {count: item.count, value: item.value};
            return acc;
          }, {}),
          crossCompanyMapping: crossCompanyMapping.map((item) => ({
            buyingCompanyId: item._id.buyingCompany,
            sellingCompanyId: item._id.sellingCompany,
            count: item.count,
            value: item.value,
          })),
          conversionRates: {
            bidirectionalPercentage: parseFloat(bidirectionalPercentage),
            totalPurchases: conversionData.total,
            bidirectionalPurchases: conversionData.bidirectional,
          },
        },
        message: "Admin bidirectional purchase analytics fetched successfully",
      });
    } catch (error) {
      console.error(
        "❌ Error fetching admin bidirectional purchase analytics:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to fetch admin bidirectional purchase analytics",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get admin payment analytics for purchases
   */
  getAdminPurchasePaymentAnalytics: async (req, res) => {
    try {
      const {dateFrom, dateTo, companyId} = req.query;

      const filter = {};
      if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
        filter.companyId = companyId;
      }
      if (dateFrom || dateTo) {
        filter.purchaseDate = {};
        if (dateFrom) filter.purchaseDate.$gte = new Date(dateFrom);
        if (dateTo) filter.purchaseDate.$lte = new Date(dateTo);
      }

      const today = new Date();

      const [
        totalPaidAmount,
        totalPendingAmount,
        paymentMethodBreakdown,
        paymentStatusBreakdown,
        overdueAnalysis,
        paymentTrends,
      ] = await Promise.all([
        Purchase.aggregate([
          {$match: filter},
          {$group: {_id: null, total: {$sum: "$payment.paidAmount"}}},
        ]),

        Purchase.aggregate([
          {$match: filter},
          {$group: {_id: null, total: {$sum: "$payment.pendingAmount"}}},
        ]),

        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$payment.method",
              count: {$sum: 1},
              totalAmount: {$sum: "$payment.paidAmount"},
            },
          },
        ]),

        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$payment.status",
              count: {$sum: 1},
              totalAmount: {$sum: "$totals.finalTotal"},
              paidAmount: {$sum: "$payment.paidAmount"},
              pendingAmount: {$sum: "$payment.pendingAmount"},
            },
          },
        ]),

        Purchase.aggregate([
          {
            $match: {
              ...filter,
              "payment.dueDate": {$lt: today},
              "payment.pendingAmount": {$gt: 0},
            },
          },
          {
            $group: {
              _id: null,
              count: {$sum: 1},
              totalOverdueAmount: {$sum: "$payment.pendingAmount"},
            },
          },
        ]),

        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: {
                year: {$year: "$purchaseDate"},
                month: {$month: "$purchaseDate"},
              },
              totalPaid: {$sum: "$payment.paidAmount"},
              totalPending: {$sum: "$payment.pendingAmount"},
              purchaseCount: {$sum: 1},
            },
          },
          {$sort: {"_id.year": -1, "_id.month": -1}},
          {$limit: 12},
        ]),
      ]);

      res.status(200).json({
        success: true,
        data: {
          totalPaidAmount: totalPaidAmount[0]?.total || 0,
          totalPendingAmount: totalPendingAmount[0]?.total || 0,
          totalOverdueAmount: overdueAnalysis[0]?.totalOverdueAmount || 0,
          paymentMethodBreakdown: paymentMethodBreakdown.reduce((acc, item) => {
            acc[item._id || "unknown"] = {
              count: item.count,
              totalAmount: item.totalAmount,
            };
            return acc;
          }, {}),
          paymentStatusBreakdown: paymentStatusBreakdown.reduce((acc, item) => {
            acc[item._id || "unknown"] = {
              count: item.count,
              totalAmount: item.totalAmount,
              paidAmount: item.paidAmount,
              pendingAmount: item.pendingAmount,
            };
            return acc;
          }, {}),
          overdueAnalysis: {
            count: overdueAnalysis[0]?.count || 0,
            totalAmount: overdueAnalysis[0]?.totalOverdueAmount || 0,
          },
          paymentTrends: paymentTrends.map((item) => ({
            year: item._id.year,
            month: item._id.month,
            totalPaid: item.totalPaid,
            totalPending: item.totalPending,
            purchaseCount: item.purchaseCount,
          })),
        },
        message: "Admin purchase payment analytics fetched successfully",
      });
    } catch (error) {
      console.error(
        "❌ Error fetching admin purchase payment analytics:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to fetch admin purchase payment analytics",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get admin supplier analytics
   */
  getAdminSupplierAnalytics: async (req, res) => {
    try {
      const {dateFrom, dateTo, companyId, limit = 10} = req.query;

      const filter = {};
      if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
        filter.companyId = companyId;
      }
      if (dateFrom || dateTo) {
        filter.purchaseDate = {};
        if (dateFrom) filter.purchaseDate.$gte = new Date(dateFrom);
        if (dateTo) filter.purchaseDate.$lte = new Date(dateTo);
      }

      const [
        totalSuppliers,
        activeSuppliers,
        topSuppliers,
        supplierGrowth,
        supplierSegmentation,
      ] = await Promise.all([
        Purchase.distinct("supplier", filter).then(
          (suppliers) => suppliers.length
        ),

        Purchase.aggregate([
          {
            $match: {
              ...filter,
              purchaseDate: {
                $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          },
          {$group: {_id: "$supplier"}},
          {$count: "activeSuppliers"},
        ]),

        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$supplier",
              totalPurchases: {$sum: "$totals.finalTotal"},
              purchaseCount: {$sum: 1},
              lastPurchaseDate: {$max: "$purchaseDate"},
              avgPurchaseValue: {$avg: "$totals.finalTotal"},
            },
          },
          {$sort: {totalPurchases: -1}},
          {$limit: parseInt(limit)},
          {
            $lookup: {
              from: "parties",
              localField: "_id",
              foreignField: "_id",
              as: "supplier",
            },
          },
          {$unwind: {path: "$supplier", preserveNullAndEmptyArrays: true}},
        ]),

        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: {
                year: {$year: "$purchaseDate"},
                month: {$month: "$purchaseDate"},
                supplier: "$supplier",
              },
            },
          },
          {
            $group: {
              _id: {year: "$_id.year", month: "$_id.month"},
              uniqueSuppliers: {$sum: 1},
            },
          },
          {$sort: {"_id.year": -1, "_id.month": -1}},
          {$limit: 12},
        ]),

        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$supplier",
              totalSpent: {$sum: "$totals.finalTotal"},
              purchaseCount: {$sum: 1},
            },
          },
          {
            $bucket: {
              groupBy: "$totalSpent",
              boundaries: [0, 10000, 50000, 100000, 500000, Infinity],
              default: "Other",
              output: {
                count: {$sum: 1},
                suppliers: {$push: "$_id"},
              },
            },
          },
        ]),
      ]);

      res.status(200).json({
        success: true,
        data: {
          totalSuppliers,
          activeSuppliers: activeSuppliers[0]?.activeSuppliers || 0,
          topSuppliers: topSuppliers.map((item) => ({
            supplierId: item._id,
            supplierName: item.supplier?.name || "Unknown",
            supplierEmail: item.supplier?.email,
            supplierPhone: item.supplier?.mobile || item.supplier?.phoneNumber,
            totalPurchases: item.totalPurchases,
            purchaseCount: item.purchaseCount,
            lastPurchaseDate: item.lastPurchaseDate,
            avgPurchaseValue: item.avgPurchaseValue,
          })),
          supplierGrowth: supplierGrowth.map((item) => ({
            year: item._id.year,
            month: item._id.month,
            uniqueSuppliers: item.uniqueSuppliers,
          })),
          supplierSegmentation: supplierSegmentation.reduce((acc, item) => {
            const key = item._id === "Other" ? "other" : `range_${item._id}`;
            acc[key] = {
              count: item.count,
              supplierIds: item.suppliers,
            };
            return acc;
          }, {}),
        },
        message: "Admin supplier analytics fetched successfully",
      });
    } catch (error) {
      console.error("❌ Error fetching admin supplier analytics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch admin supplier analytics",
        error: error.message,
      });
    }
  },
  // ==================== 🔍 ENHANCED SEARCH AND FILTERING ====================

  /**
   * ✅ NEW: Search purchases with advanced filters
   */
  searchPurchases: async (req, res) => {
    try {
      const {
        companyId,
        search,
        status,
        paymentStatus,
        dateFrom,
        dateTo,
        supplierId,
        amountFrom,
        amountTo,
        page = 1,
        limit = 20,
        sortBy = "purchaseDate",
        sortOrder = "desc",
      } = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      // Build search filter
      const filter = {companyId};

      if (search) {
        filter.$or = [
          {purchaseNumber: {$regex: search, $options: "i"}},
          {supplierMobile: {$regex: search, $options: "i"}},
          {notes: {$regex: search, $options: "i"}},
          {"supplier.name": {$regex: search, $options: "i"}},
        ];
      }

      if (status) {
        filter.status = status.includes(",")
          ? {$in: status.split(",")}
          : status;
      }

      if (paymentStatus) {
        filter["payment.status"] = paymentStatus;
      }

      if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) {
        filter.supplier = supplierId;
      }

      if (dateFrom || dateTo) {
        filter.purchaseDate = {};
        if (dateFrom) filter.purchaseDate.$gte = new Date(dateFrom);
        if (dateTo) filter.purchaseDate.$lte = new Date(dateTo);
      }

      if (amountFrom || amountTo) {
        filter["totals.finalTotal"] = {};
        if (amountFrom)
          filter["totals.finalTotal"].$gte = parseFloat(amountFrom);
        if (amountTo) filter["totals.finalTotal"].$lte = parseFloat(amountTo);
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [purchases, total] = await Promise.all([
        Purchase.find(filter)
          .populate("supplier", "name mobile email")
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit)),
        Purchase.countDocuments(filter),
      ]);

      res.status(200).json({
        success: true,
        data: {
          purchases,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
          },
          searchCriteria: {
            search,
            status,
            paymentStatus,
            dateFrom,
            dateTo,
            supplierId,
            amountFrom,
            amountTo,
          },
        },
        message: `Found ${purchases.length} purchases matching search criteria`,
      });
    } catch (error) {
      console.error("❌ Error searching purchases:", error);
      res.status(500).json({
        success: false,
        message: "Failed to search purchases",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get purchases by supplier with enhanced data
   */
  getPurchasesBySupplier: async (req, res) => {
    try {
      const {
        companyId,
        supplierId,
        limit = 10,
        includeStats = true,
      } = req.query;

      if (!companyId || !supplierId) {
        return res.status(400).json({
          success: false,
          message: "Company ID and Supplier ID are required",
        });
      }

      const filter = {
        companyId,
        supplier: supplierId,
        status: {$ne: "cancelled"},
      };

      const purchases = await Purchase.find(filter)
        .populate("supplier", "name mobile email address")
        .sort({purchaseDate: -1})
        .limit(parseInt(limit));

      let supplierStats = null;
      if (includeStats === "true") {
        const stats = await Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: null,
              totalPurchases: {$sum: "$totals.finalTotal"},
              totalBills: {$sum: 1},
              totalPaid: {$sum: "$payment.paidAmount"},
              totalPending: {$sum: "$payment.pendingAmount"},
              avgPurchaseValue: {$avg: "$totals.finalTotal"},
              lastPurchaseDate: {$max: "$purchaseDate"},
              firstPurchaseDate: {$min: "$purchaseDate"},
            },
          },
        ]);

        supplierStats = stats[0] || {
          totalPurchases: 0,
          totalBills: 0,
          totalPaid: 0,
          totalPending: 0,
          avgPurchaseValue: 0,
          lastPurchaseDate: null,
          firstPurchaseDate: null,
        };
      }

      res.status(200).json({
        success: true,
        data: {
          purchases,
          supplierStats,
          count: purchases.length,
        },
        message: `Found ${purchases.length} purchases for supplier`,
      });
    } catch (error) {
      console.error("❌ Error getting purchases by supplier:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get purchases by supplier",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get enhanced payment summary with detailed breakdown
   */
  getEnhancedPaymentSummary: async (req, res) => {
    try {
      const {companyId, dateFrom, dateTo} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const filter = {companyId};
      if (dateFrom || dateTo) {
        filter.purchaseDate = {};
        if (dateFrom) filter.purchaseDate.$gte = new Date(dateFrom);
        if (dateTo) filter.purchaseDate.$lte = new Date(dateTo);
      }

      const today = new Date();

      const [
        totalSummary,
        statusBreakdown,
        paymentMethodBreakdown,
        agingAnalysis,
        overdueAnalysis,
      ] = await Promise.all([
        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: null,
              totalPurchases: {$sum: 1},
              totalAmount: {$sum: "$totals.finalTotal"},
              totalPaid: {$sum: "$payment.paidAmount"},
              totalPending: {$sum: "$payment.pendingAmount"},
              avgPurchaseValue: {$avg: "$totals.finalTotal"},
            },
          },
        ]),

        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$payment.status",
              count: {$sum: 1},
              totalAmount: {$sum: "$totals.finalTotal"},
              paidAmount: {$sum: "$payment.paidAmount"},
              pendingAmount: {$sum: "$payment.pendingAmount"},
            },
          },
        ]),

        Purchase.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$payment.method",
              count: {$sum: 1},
              totalAmount: {$sum: "$payment.paidAmount"},
            },
          },
        ]),

        Purchase.aggregate([
          {$match: {...filter, "payment.pendingAmount": {$gt: 0}}},
          {
            $addFields: {
              ageInDays: {
                $cond: [
                  {$ne: ["$payment.dueDate", null]},
                  {
                    $divide: [
                      {$subtract: [today, "$payment.dueDate"]},
                      1000 * 60 * 60 * 24,
                    ],
                  },
                  0,
                ],
              },
            },
          },
          {
            $group: {
              _id: {
                range: {
                  $switch: {
                    branches: [
                      {case: {$lte: ["$ageInDays", 0]}, then: "Not Due"},
                      {case: {$lte: ["$ageInDays", 7]}, then: "1-7 days"},
                      {case: {$lte: ["$ageInDays", 30]}, then: "8-30 days"},
                      {case: {$lte: ["$ageInDays", 60]}, then: "31-60 days"},
                      {case: {$lte: ["$ageInDays", 90]}, then: "61-90 days"},
                    ],
                    default: "90+ days",
                  },
                },
              },
              count: {$sum: 1},
              totalAmount: {$sum: "$payment.pendingAmount"},
            },
          },
        ]),

        Purchase.aggregate([
          {
            $match: {
              ...filter,
              "payment.dueDate": {$lt: today},
              "payment.pendingAmount": {$gt: 0},
            },
          },
          {
            $group: {
              _id: null,
              overdueCount: {$sum: 1},
              totalOverdueAmount: {$sum: "$payment.pendingAmount"},
              avgOverdueAmount: {$avg: "$payment.pendingAmount"},
            },
          },
        ]),
      ]);

      const summary = totalSummary[0] || {
        totalPurchases: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalPending: 0,
        avgPurchaseValue: 0,
      };

      const overdue = overdueAnalysis[0] || {
        overdueCount: 0,
        totalOverdueAmount: 0,
        avgOverdueAmount: 0,
      };

      res.status(200).json({
        success: true,
        data: {
          ...summary,
          ...overdue,
          paymentStatusBreakdown: statusBreakdown.reduce((acc, item) => {
            acc[item._id || "unknown"] = {
              count: item.count,
              totalAmount: item.totalAmount,
              paidAmount: item.paidAmount,
              pendingAmount: item.pendingAmount,
            };
            return acc;
          }, {}),
          paymentMethodBreakdown: paymentMethodBreakdown.reduce((acc, item) => {
            acc[item._id || "unknown"] = {
              count: item.count,
              totalAmount: item.totalAmount,
            };
            return acc;
          }, {}),
          agingAnalysis: agingAnalysis.reduce((acc, item) => {
            acc[item._id.range] = {
              count: item.count,
              totalAmount: item.totalAmount,
            };
            return acc;
          }, {}),
        },
        message: "Enhanced payment summary retrieved successfully",
      });
    } catch (error) {
      console.error("❌ Error getting enhanced payment summary:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get enhanced payment summary",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get purchases grouped by status with enhanced data
   */
  getPurchasesGroupedByStatus: async (req, res) => {
    try {
      const {companyId} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const today = new Date();
      const filter = {companyId};

      const purchases = await Purchase.find(filter)
        .populate("supplier", "name mobile")
        .sort({purchaseDate: -1});

      const grouped = {
        paid: [],
        partial: [],
        pending: [],
        overdue: [],
        dueToday: [],
        completed: [],
        draft: [],
        cancelled: [],
      };

      purchases.forEach((purchase) => {
        const pending = purchase.payment?.pendingAmount || 0;
        const dueDate = purchase.payment?.dueDate
          ? new Date(purchase.payment.dueDate)
          : null;
        const paymentStatus = purchase.payment?.status || "pending";
        const purchaseStatus = purchase.status || "draft";

        // Add overdue information
        if (dueDate && pending > 0) {
          const daysOverdue = Math.ceil(
            (today - dueDate) / (1000 * 60 * 60 * 24)
          );
          purchase.overdueInfo = {
            isOverdue: daysOverdue > 0,
            daysOverdue: Math.max(0, daysOverdue),
          };
        }

        // Group by status
        if (purchaseStatus === "cancelled") {
          grouped.cancelled.push(purchase);
        } else if (purchaseStatus === "draft") {
          grouped.draft.push(purchase);
        } else if (purchaseStatus === "completed" || paymentStatus === "paid") {
          grouped.completed.push(purchase);
          if (paymentStatus === "paid") {
            grouped.paid.push(purchase);
          }
        } else if (dueDate && pending > 0 && dueDate < today) {
          grouped.overdue.push(purchase);
        } else if (
          dueDate &&
          pending > 0 &&
          dueDate.toDateString() === today.toDateString()
        ) {
          grouped.dueToday.push(purchase);
        } else if (paymentStatus === "partial") {
          grouped.partial.push(purchase);
        } else {
          grouped.pending.push(purchase);
        }
      });

      // Calculate summary for each group
      const summary = {};
      Object.keys(grouped).forEach((status) => {
        const items = grouped[status];
        summary[status] = {
          count: items.length,
          totalAmount: items.reduce(
            (sum, item) => sum + (item.totals?.finalTotal || 0),
            0
          ),
          totalPending: items.reduce(
            (sum, item) => sum + (item.payment?.pendingAmount || 0),
            0
          ),
        };
      });

      res.status(200).json({
        success: true,
        data: {
          grouped,
          summary,
          totalPurchases: purchases.length,
        },
        message: "Purchases grouped by status retrieved successfully",
      });
    } catch (error) {
      console.error("❌ Error getting purchases grouped by status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get purchases grouped by status",
        error: error.message,
      });
    }
  },

  /**
   * ✅ Get purchase bill for printing - Enhanced version
   */
  getPurchaseBillForPrint: async (req, res) => {
    try {
      const {id} = req.params;
      const {format = "a4", template = "standard"} = req.query;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase ID format",
        });
      }

      // Get purchase with populated data
      const purchase = await Purchase.findById(id)
        .populate("supplier", "name mobile email address gstNumber")
        .populate(
          "companyId",
          "businessName gstin address phoneNumber email logo"
        )
        .populate("items.itemRef", "name code hsnCode unit")
        .lean();

      if (!purchase) {
        return res.status(404).json({
          success: false,
          message: "Purchase not found",
        });
      }

      // Transform data for printing
      const billData = {
        company: {
          name: purchase.companyId?.businessName || "Your Company",
          gstin: purchase.companyId?.gstin || "",
          address: purchase.companyId?.address || "",
          phone: purchase.companyId?.phoneNumber || "",
          email: purchase.companyId?.email || "",
          // ✅ Handle logo safely
          logo:
            purchase.companyId?.logo?.base64 &&
            purchase.companyId.logo.base64.trim() !== ""
              ? purchase.companyId.logo.base64
              : null,
        },
        supplier: {
          name:
            purchase.supplier?.name ||
            purchase.supplierName ||
            "Unknown Supplier",
          address: purchase.supplier?.address || purchase.supplierAddress || "",
          mobile: purchase.supplier?.mobile || purchase.supplierMobile || "",
          email: purchase.supplier?.email || purchase.supplierEmail || "",
          gstin:
            purchase.supplier?.gstNumber || purchase.supplierGstNumber || "",
        },
        purchase: {
          id: purchase._id,
          billNumber: purchase.purchaseNumber || purchase.billNumber,
          billDate: purchase.purchaseDate || purchase.billDate,
          dueDate: purchase.dueDate || purchase.payment?.dueDate,
          status: purchase.status,
          notes: purchase.notes || "",
          terms: purchase.termsAndConditions || "",
        },
        items: (purchase.items || []).map((item, index) => ({
          srNo: index + 1,
          name: item.itemName || item.productName || `Item ${index + 1}`,
          hsnCode: item.hsnCode || item.hsnNumber || "",
          quantity: item.quantity || 1,
          unit: item.unit || "PCS",
          rate: item.pricePerUnit || item.rate || 0,
          taxRate: item.taxRate || item.gstRate || 0,
          cgst: item.cgstAmount || item.cgst || 0,
          sgst: item.sgstAmount || item.sgst || 0,
          igst: item.igstAmount || item.igst || 0,
          amount: item.amount || item.totalAmount || 0,
        })),
        totals: {
          subtotal: purchase.totals?.subtotal || 0,
          totalTax: purchase.totals?.totalTax || 0,
          totalCGST: purchase.totals?.totalCGST || 0,
          totalSGST: purchase.totals?.totalSGST || 0,
          totalIGST: purchase.totals?.totalIGST || 0,
          totalDiscount: purchase.totals?.totalDiscount || 0,
          roundOff: purchase.totals?.roundOff || 0,
          finalTotal: purchase.totals?.finalTotal || 0,
        },
        payment: {
          method: purchase.payment?.method || "cash",
          paidAmount: purchase.payment?.paidAmount || 0,
          pendingAmount: purchase.payment?.pendingAmount || 0,
          status: purchase.payment?.status || "pending",
          terms: purchase.termsAndConditions || "",
        },
        meta: {
          format,
          template,
          printDate: new Date(),
          isPurchaseBill: true,
          isGSTBill: purchase.gstEnabled,
        },
      };

      res.json({
        success: true,
        data: billData,
        message: "Purchase bill data prepared for printing",
      });
    } catch (error) {
      console.error("❌ Error getting purchase bill for print:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get purchase bill for printing",
        error: error.message,
      });
    }
  },
};

module.exports = purchaseController;
