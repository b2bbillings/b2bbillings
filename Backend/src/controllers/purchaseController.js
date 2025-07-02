const Purchase = require("../models/Purchase");
const Item = require("../models/Item");
const Party = require("../models/Party");
const Company = require("../models/Company");
const mongoose = require("mongoose");

const normalizePaymentMethod = (method) => {
  // Valid enum values from Purchase Order schema:
  // ["cash", "card", "upi", "bank_transfer", "cheque", "credit", "online", "bank"]

  const methodMapping = {
    // Bank-related methods → bank_transfer (most appropriate for bank accounts)
    "bank account": "bank_transfer",
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
  const normalized = methodMapping[inputMethod] || "cash"; // Default to cash for unknown methods

  // Validation check
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
  const isValidEnum = validEnums.includes(normalized);

  console.log("💳 Enhanced payment method normalization:", {
    original: method,
    cleaned: inputMethod,
    normalized: normalized,
    isValidEnum: isValidEnum,
    availableEnums: validEnums,
    mappingSource: methodMapping[inputMethod]
      ? "explicit_mapping"
      : "default_fallback",
    recommendedUse: normalized,
  });

  // Double-check validation
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

      console.log(
        "🔢 Generating preview purchase number for company:",
        companyId
      );

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

      console.log("✅ Preview purchase number generated:", {
        companyId,
        companyPrefix,
        dateStr,
        nextSequence,
        previewPurchaseNumber,
      });

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

  // ✅ UPDATED: Enhanced createPurchase with proper payment method normalization
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

      console.log(
        "📥 Creating purchase with model-based automatic numbering:",
        {
          supplierName,
          supplier,
          supplierId,
          taxMode,
          priceIncludesTax,
          gstEnabled,
          itemCount: items?.length || 0,
          companyId,
          sourceOrderId,
          sourceOrderType,
          sourceCompanyId,
          isAutoGenerated,
          generatedFrom,
          autoDetectSourceCompany,
          paymentMethod: payment?.method, // Log original payment method
          modelHandlesNumbering: true,
        }
      );

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

      console.log(
        "🏢 Company details (model will handle numbering automatically):",
        {
          companyId,
          businessName: currentCompany.businessName,
          code: currentCompany.code,
          modelHandlesPurchaseNumberGeneration: true,
        }
      );

      // ✅ Handle supplier validation (existing code)
      let supplierRecord = null;
      const finalSupplierId = supplier || supplierId;

      if (finalSupplierId && mongoose.Types.ObjectId.isValid(finalSupplierId)) {
        console.log("🔍 Finding supplier by ID:", finalSupplierId);
        supplierRecord = await Party.findById(finalSupplierId);

        if (!supplierRecord) {
          return res.status(400).json({
            success: false,
            message: "Supplier not found with provided ID",
          });
        }

        console.log("✅ Found supplier:", {
          id: supplierRecord._id,
          name: supplierRecord.name,
          mobile: supplierRecord.mobile,
          supplierCompanyId: supplierRecord.companyId,
          linkedCompanyId: supplierRecord.linkedCompanyId,
        });
      } else if (supplierName && supplierMobile) {
        console.log(
          "🔍 Finding supplier by name and mobile:",
          supplierName,
          supplierMobile
        );

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
          console.log("✅ Auto-created supplier:", supplierRecord.name);
        }

        console.log("✅ Found supplier by search:", {
          id: supplierRecord._id,
          name: supplierRecord.name,
          mobile: supplierRecord.mobile,
          supplierCompanyId: supplierRecord?.companyId,
          linkedCompanyId: supplierRecord?.linkedCompanyId,
        });
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

      console.log("🔄 Tax mode synchronization:", {
        originalTaxMode: taxMode,
        originalPriceIncludesTax: priceIncludesTax,
        finalTaxMode,
        finalPriceIncludesTax,
      });

      // Process items (similar to sales controller...)
      const processedItems = [];
      let subtotal = 0;
      let totalDiscount = 0;
      let totalTax = 0;
      let totalTaxableAmount = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        console.log(`🔄 Processing item ${i + 1}:`, {
          itemName: item.itemName,
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit,
          taxRate: item.taxRate,
        });

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

        console.log(`✅ Item ${i + 1} processed:`, {
          itemName: processedItem.itemName,
          taxableAmount: processedItem.taxableAmount,
          totalTax: processedItem.totalTaxAmount,
          finalAmount: processedItem.amount,
        });
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

      console.log("💰 Final totals calculated:", totals);

      // ✅ FIXED: Normalize payment method BEFORE creating payment details
      const rawPaymentMethod = payment?.method || "credit";
      const normalizedPaymentMethod = normalizePaymentMethod(rawPaymentMethod);

      console.log("💳 Payment method normalization:", {
        original: rawPaymentMethod,
        normalized: normalizedPaymentMethod,
      });

      // Enhanced payment details with normalized method
      const paymentDetails = {
        method: normalizedPaymentMethod, // ✅ Use normalized method
        status: payment?.status || "pending",
        paidAmount: parseFloat(payment?.paidAmount || 0),
        pendingAmount: 0,
        paymentDate: payment?.paymentDate
          ? new Date(payment.paymentDate)
          : new Date(),
        dueDate: payment?.dueDate ? new Date(payment.dueDate) : null,
        creditDays: parseInt(payment?.creditDays || 0),
        reference: payment?.reference || "",
        notes: payment?.notes || "",
      };

      const paidAmount = paymentDetails.paidAmount;
      paymentDetails.pendingAmount = parseFloat(
        (adjustedFinalTotal - paidAmount).toFixed(2)
      );

      // Auto-determine payment status
      if (paidAmount >= adjustedFinalTotal) {
        paymentDetails.status = "paid";
        paymentDetails.pendingAmount = 0;
        paymentDetails.dueDate = null;
      } else if (paidAmount > 0) {
        paymentDetails.status = "partial";
        if (paymentDetails.creditDays > 0 && !paymentDetails.dueDate) {
          const calculatedDueDate = new Date();
          calculatedDueDate.setDate(
            calculatedDueDate.getDate() + paymentDetails.creditDays
          );
          paymentDetails.dueDate = calculatedDueDate;
        }
      } else {
        paymentDetails.status = "pending";
        paymentDetails.pendingAmount = adjustedFinalTotal;
        if (paymentDetails.creditDays > 0 && !paymentDetails.dueDate) {
          const calculatedDueDate = new Date();
          calculatedDueDate.setDate(
            calculatedDueDate.getDate() + paymentDetails.creditDays
          );
          paymentDetails.dueDate = calculatedDueDate;
        }
      }

      if (paymentDetails.pendingAmount < 0) {
        paymentDetails.pendingAmount = 0;
      }

      // ✅ FIXED: Initialize payment history with normalized method
      let paymentHistory = [];
      if (paidAmount > 0) {
        paymentHistory.push({
          amount: paidAmount,
          method: normalizedPaymentMethod, // ✅ Use normalized method
          reference: paymentDetails.reference,
          paymentDate: paymentDetails.paymentDate,
          dueDate: paymentDetails.dueDate,
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
        payment: paymentDetails,
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

      console.log(
        "💾 Creating purchase - model will auto-generate purchase number:",
        {
          companyId: companyId.toString(),
          companyName: currentCompany.businessName,
          companyCode: currentCompany.code,
          supplier: supplierRecord.name,
          itemCount: purchaseData.items.length,
          finalTotal: purchaseData.totals.finalTotal,
          paymentMethod: purchaseData.payment.method, // ✅ Log normalized method
          modelHandlesNumbering: true,
        }
      );

      // ✅ Create the purchase - purchase number will be auto-generated by model's pre-save middleware
      const purchase = new Purchase(purchaseData);
      await purchase.save();

      // Populate supplier details for response
      await purchase.populate(
        "supplier",
        "name mobile email address type companyId linkedCompanyId"
      );

      // Update item stock (ADD to stock for purchase)
      for (const item of processedItems) {
        if (item.itemRef && mongoose.Types.ObjectId.isValid(item.itemRef)) {
          try {
            await Item.findByIdAndUpdate(
              item.itemRef,
              {$inc: {currentStock: item.quantity}},
              {new: true}
            );
            console.log(
              `📦 Added stock for ${item.itemName}: +${item.quantity}`
            );
          } catch (stockError) {
            console.warn(
              `⚠️ Could not update stock for ${item.itemName}:`,
              stockError.message
            );
          }
        }
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

          console.log("🔗 Updated source purchase order:", {
            sourceOrderId,
            invoiceId: purchase._id,
            invoiceNumber: purchase.purchaseNumber,
          });
        } catch (updateError) {
          console.warn(
            "Failed to update source purchase order:",
            updateError.message
          );
        }
      }

      console.log(
        "✅ Purchase created successfully with model-generated sequential numbering:",
        {
          id: purchase._id,
          purchaseNumber: purchase.purchaseNumber,
          companyId: purchase.companyId.toString(),
          companyName: currentCompany.businessName,
          supplier: supplierRecord.name,
          finalTotal: purchase.totals.finalTotal,
          paymentMethod: purchase.payment.method, // ✅ Confirm normalized method
          numberingSource: "model_pre_save_middleware",
        }
      );

      // ✅ Enhanced response
      res.status(201).json({
        success: true,
        message:
          "Purchase created successfully with automatic model-based sequential numbering",
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
              method: purchase.payment.method, // ✅ Return normalized method
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
            paymentInfo: {
              originalMethod: rawPaymentMethod,
              normalizedMethod: normalizedPaymentMethod,
              methodNormalized: rawPaymentMethod !== normalizedPaymentMethod,
            },
          },
        },
      });
    } catch (error) {
      console.error(
        "❌ Error creating purchase with model-based numbering:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to create purchase",
        error: error.message,
        details: error.errors ? Object.keys(error.errors) : undefined,
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
