const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const Item = require("../models/Item");
const Party = require("../models/Party");
const itemController = require("./itemController");

const updateStockForSale = async (
  sale,
  processedItems,
  customerRecord,
  req
) => {
  const results = [];

  for (const item of processedItems) {
    if (item.itemRef && mongoose.Types.ObjectId.isValid(item.itemRef)) {
      try {
        // ✅ Prepare transaction data for itemController
        const transactionRequest = {
          params: {
            companyId: sale.companyId,
            itemId: item.itemRef,
          },
          body: {
            type: "sale",
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit || 0,
            customerName: customerRecord?.name || "Unknown",
            vendorName: customerRecord?.name || "Unknown", // For compatibility
            invoiceNumber: sale.invoiceNumber,
            referenceNumber: sale.invoiceNumber, // For compatibility
            date: sale.invoiceDate,
            transactionDate: sale.invoiceDate, // For compatibility
            status: "completed",
            reason: `Sale: ${sale.invoiceNumber} - ${
              customerRecord?.name || "Unknown"
            }`,
          },
          user: req.user || {id: "system"},
        };

        // ✅ Mock response object to capture the result
        let transactionResult = null;
        const mockRes = {
          status: (code) => ({
            json: (data) => {
              transactionResult = {code, data};
              return data;
            },
          }),
        };

        // ✅ Call itemController function
        await itemController.createItemTransaction(transactionRequest, mockRes);

        if (
          transactionResult?.code === 201 &&
          transactionResult?.data?.success
        ) {
          results.push({
            itemName: item.itemName,
            itemId: item.itemRef,
            quantity: item.quantity,
            success: true,
            transaction: transactionResult.data.data?.transaction,
          });
        } else {
          throw new Error(
            transactionResult?.data?.message || "Transaction creation failed"
          );
        }
      } catch (error) {
        console.error(
          `❌ Stock update failed for ${item.itemName}:`,
          error.message
        );

        // ✅ FALLBACK: Direct stock update if itemController fails
        try {
          const currentItem = await Item.findById(item.itemRef);
          if (currentItem) {
            const previousStock = currentItem.currentStock || 0;
            const newStock = Math.max(0, previousStock - item.quantity);

            await Item.findByIdAndUpdate(item.itemRef, {
              $set: {currentStock: newStock},
              $push: {
                stockHistory: {
                  date: new Date(),
                  previousStock: previousStock,
                  newStock: newStock,
                  quantity: -item.quantity,
                  adjustmentType: "subtract",
                  reason: `Sale: ${sale.invoiceNumber} - ${
                    customerRecord?.name || "Unknown"
                  }`,
                  adjustedBy: req.user?.id || "system",
                  adjustedAt: new Date(),
                  referenceId: sale._id,
                  referenceType: "sale",
                },
              },
            });
            results.push({
              itemName: item.itemName,
              itemId: item.itemRef,
              quantity: item.quantity,
              success: true,
              method: "fallback_direct_update",
            });
          }
        } catch (fallbackError) {
          console.error(
            `❌ Fallback stock update also failed for ${item.itemName}:`,
            fallbackError.message
          );
          results.push({
            itemName: item.itemName,
            itemId: item.itemRef,
            quantity: item.quantity,
            success: false,
            error: error.message,
            fallbackError: fallbackError.message,
          });
        }
      }
    } else {
      console.warn(`⚠️ Invalid item reference for: ${item.itemName}`);
      results.push({
        itemName: item.itemName,
        itemId: item.itemRef,
        quantity: item.quantity,
        success: false,
        error: "Invalid item reference",
      });
    }
  }

  return results;
};
const saleController = {
  getNextInvoiceNumber: async (req, res) => {
    try {
      const {companyId, invoiceType = "gst"} = req.query;

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

      // ✅ Generate preview invoice number using same logic as model
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const dateStr = `${year}${month}${day}`;

      // Get company prefix (same as model logic)
      let companyPrefix = "INV";
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

      const latestInvoice = await Sale.findOne({
        companyId: companyId,
        invoiceDate: {$gte: todayStart, $lt: todayEnd},
        invoiceNumber: {$exists: true, $ne: null},
      })
        .sort({invoiceNumber: -1})
        .select("invoiceNumber");

      let nextSequence = 1;
      if (latestInvoice && latestInvoice.invoiceNumber) {
        // Extract sequence from invoice number pattern: PREFIX-GST-YYYYMMDD-XXXX
        const match = latestInvoice.invoiceNumber.match(/-(\d{4})$/);
        if (match) {
          nextSequence = parseInt(match[1], 10) + 1;
        }
      }

      const sequenceStr = String(nextSequence).padStart(4, "0");

      // ✅ Generate actual preview number (same format as model)
      const gstPrefix = invoiceType === "gst" ? "GST-" : "";
      const previewInvoiceNumber = `${companyPrefix}-${gstPrefix}${dateStr}-${sequenceStr}`;

      res.status(200).json({
        success: true,
        data: {
          previewInvoiceNumber,
          nextInvoiceNumber: previewInvoiceNumber, // ✅ Actual preview number
          invoiceType,
          company: {
            id: company._id,
            name: company.businessName,
            code: company.code,
            prefix: companyPrefix,
          },
          numbering: {
            prefix: companyPrefix,
            gstPrefix: invoiceType === "gst" ? "GST-" : "",
            dateString: dateStr,
            sequence: nextSequence,
            formattedSequence: sequenceStr,
          },
          pattern: `${companyPrefix}-[GST-]YYYYMMDD-XXXX`,
          date: today.toISOString().split("T")[0],
          isSequential: true,
          companySpecific: true,
          isPreview: true, // ✅ This is a preview number
          actualNumberGeneratedBy: "model_pre_save_middleware",
          note: "This is a preview. Actual number will be confirmed when saving.",
        },
        message: "Preview invoice number generated successfully",
      });
    } catch (error) {
      console.error("❌ Error generating preview invoice number:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate preview invoice number",
        error: error.message,
      });
    }
  },
  createSale: async (req, res) => {
    try {
      const {
        customerName,
        customerMobile,
        customer,
        customerId,
        invoiceDate,
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
        sourceOrderType = "sales_order",
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

      // ✅ Handle customer validation (existing code)
      let customerRecord = null;
      const finalCustomerId = customer || customerId;

      if (finalCustomerId && mongoose.Types.ObjectId.isValid(finalCustomerId)) {
        customerRecord = await Party.findById(finalCustomerId);

        if (!customerRecord) {
          return res.status(400).json({
            success: false,
            message: "Customer not found with provided ID",
          });
        }
      } else if (customerName && customerMobile) {
        customerRecord = await Party.findOne({
          $and: [
            {companyId: companyId},
            {type: "customer"},
            {
              $or: [{mobile: customerMobile}, {phoneNumber: customerMobile}],
            },
          ],
        });

        if (!customerRecord) {
          customerRecord = await Party.findOne({
            companyId: companyId,
            type: "customer",
            name: {$regex: new RegExp(`^${customerName}$`, "i")},
          });
        }

        if (!customerRecord) {
          return res.status(400).json({
            success: false,
            message:
              "Customer not found. Please select an existing customer or create one first.",
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: "Customer ID or customer name and mobile are required",
        });
      }

      // FIXED: Sync tax mode fields
      const finalTaxMode =
        taxMode || (priceIncludesTax ? "with-tax" : "without-tax");
      const finalPriceIncludesTax = finalTaxMode === "with-tax";

      // Process items (existing code continues...)
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
            const taxMultiplier = 1 + taxRate / 100;
            itemTaxableAmount = amountAfterDiscount / taxMultiplier;
            cgst = (itemTaxableAmount * cgstRate) / 100;
            sgst = (itemTaxableAmount * sgstRate) / 100;
            itemAmount = amountAfterDiscount;
          } else {
            itemTaxableAmount = amountAfterDiscount;
            cgst = (itemTaxableAmount * cgstRate) / 100;
            sgst = (itemTaxableAmount * sgstRate) / 100;
            itemAmount = itemTaxableAmount + cgst + sgst;
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

      // ✅ ENHANCED PAYMENT DETAILS WITH PROPER DUE DATE CALCULATION
      const paymentDetails = {
        method: payment?.method || "cash",
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

      // ✅ FIXED: Calculate due date properly
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
      }

      const paidAmount = paymentDetails.paidAmount;
      paymentDetails.pendingAmount = parseFloat(
        (adjustedFinalTotal - paidAmount).toFixed(2)
      );

      // ✅ ENHANCED: Auto-determine payment status with proper due date handling
      if (paidAmount >= adjustedFinalTotal) {
        paymentDetails.status = "paid";
        paymentDetails.pendingAmount = 0;
        paymentDetails.dueDate = null; // Clear due date for fully paid invoices
      } else if (paidAmount > 0) {
        paymentDetails.status = "partial";
        // Keep the calculated due date for partial payments
      } else {
        paymentDetails.status = "pending";
        paymentDetails.pendingAmount = adjustedFinalTotal;
        // Keep the calculated due date for pending payments
      }

      // ✅ Check for overdue status
      if (paymentDetails.dueDate && paymentDetails.pendingAmount > 0) {
        const now = new Date();
        if (now > paymentDetails.dueDate) {
          paymentDetails.status = "overdue";
        }
      }

      if (paymentDetails.pendingAmount < 0) {
        paymentDetails.pendingAmount = 0;
      }

      // Initialize payment history
      let paymentHistory = [];
      if (paidAmount > 0) {
        paymentHistory.push({
          amount: paidAmount,
          method: paymentDetails.method,
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

      // ✅ Create sale object WITHOUT manual invoiceNumber - model will auto-generate
      const saleData = {
        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
        invoiceType: gstEnabled ? "gst" : "non-gst",
        customer: customerRecord._id,
        customerMobile: customerRecord.mobile || customerMobile,
        gstEnabled,
        taxMode: finalTaxMode,
        priceIncludesTax: finalPriceIncludesTax,
        companyId, // ✅ Required for model's automatic numbering
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
          customerCompanyId: customerRecord?.companyId || null,
          sourceCompanyDetectionMethod: sourceCompanyDetectionMethod,
        }),

        ...(!finalSourceCompanyId && {
          isCrossCompanyTransaction: false,
          customerCompanyId: null,
          sourceCompanyDetectionMethod: sourceCompanyDetectionMethod,
        }),

        isAutoGenerated: isAutoGenerated || false,
        generatedFrom: sourceOrderId ? "sales_order" : generatedFrom,
        convertedBy: convertedBy || null,

        autoGeneratedPurchaseInvoice: false,
        purchaseInvoiceRef: null,
        purchaseInvoiceNumber: null,
        targetCompanyId: null,

        convertedFromSalesOrder:
          !!sourceOrderId && sourceOrderType === "sales_order",
        salesOrderRef:
          sourceOrderId && sourceOrderType === "sales_order"
            ? sourceOrderId
            : null,
        salesOrderNumber:
          sourceOrderId && sourceOrderType === "sales_order"
            ? sourceOrderNumber
            : null,

        correspondingPurchaseInvoiceId: null,
        correspondingPurchaseInvoiceNumber: null,
        correspondingPurchaseInvoiceCompany: null,

        createdBy: req.user?.id || "system",
        lastModifiedBy: req.user?.id || "system",
      };

      // ✅ Create the sale - invoice number will be auto-generated by model's pre-save middleware
      const sale = new Sale(saleData);
      await sale.save(); // ✅ Model's pre-save middleware generates invoiceNumber automatically

      // Populate customer details for response
      await sale.populate(
        "customer",
        "name mobile email address type companyId linkedCompanyId"
      );

      // ===== ✅ ENHANCED STOCK UPDATE USING ITEMCONTROLLER =====

      const stockUpdateResults = await updateStockForSale(
        sale,
        processedItems,
        customerRecord,
        req
      );

      // ✅ Add stock update info to response
      const successfulUpdates = stockUpdateResults.filter((r) => r.success);
      const failedUpdates = stockUpdateResults.filter((r) => !r.success);

      // ===== ✅ SIMPLIFIED PAYMENT HANDLING (REMOVED DUPLICATE TRANSACTION CREATION) =====

      // Update source sales order if conversion
      if (sourceOrderId && mongoose.Types.ObjectId.isValid(sourceOrderId)) {
        try {
          const SalesOrder = require("../models/SalesOrder");
          await SalesOrder.findByIdAndUpdate(sourceOrderId, {
            convertedToInvoice: true,
            invoiceRef: sale._id,
            invoiceNumber: sale.invoiceNumber,
            convertedAt: new Date(),
            convertedBy: convertedBy || req.user?.id || "system",
            status: "completed",
          });
        } catch (updateError) {
          console.warn(
            "Failed to update source sales order:",
            updateError.message
          );
        }
      }

      // ✅ Enhanced response with due date information (UPDATED)
      res.status(201).json({
        success: true,
        message: "Sale created successfully with automatic stock tracking",
        data: {
          sale,
          invoice: {
            invoiceNumber: sale.invoiceNumber, // ✅ Generated by model
            invoiceDate: sale.invoiceDate,
            companyInfo: {
              id: currentCompany._id,
              name: currentCompany.businessName,
              code: currentCompany.code,
              prefix: sale.invoiceNumber.split("-")[0], // Extract prefix from generated number
            },
            customer: {
              id: customerRecord._id,
              name: customerRecord.name,
              mobile: customerRecord.mobile,
              companyId: customerRecord.companyId,
              linkedCompanyId: customerRecord.linkedCompanyId,
            },
            totals: sale.totals,
            payment: {
              ...sale.payment,
              dueDate: sale.payment.dueDate, // ✅ Now properly calculated
              creditDays: sale.payment.creditDays,
              // ✅ Add due date information to response
              dueDateInfo: sale.payment.dueDate
                ? {
                    dueDate: sale.payment.dueDate,
                    formattedDueDate: sale.payment.dueDate
                      .toISOString()
                      .split("T")[0],
                    daysFromNow: Math.ceil(
                      (sale.payment.dueDate - new Date()) /
                        (1000 * 60 * 60 * 24)
                    ),
                    isOverdue:
                      new Date() > sale.payment.dueDate &&
                      sale.payment.pendingAmount > 0,
                  }
                : null,
            },
            taxMode: sale.taxMode,
            priceIncludesTax: sale.priceIncludesTax,
            gstEnabled: sale.gstEnabled,
            numberingInfo: {
              isSequential: true,
              companySpecific: true,
              autoGenerated: true,
              generatedBy: "model_pre_save_middleware", // ✅ Clear source
              pattern: `${
                sale.invoiceNumber.split("-")[0]
              }-[GST-]YYYYMMDD-XXXX`,
              modelBased: true, // ✅ Indicate model-based generation
            },
          },
          stockUpdates: {
            itemsProcessed: processedItems.length,
            successfulUpdates: successfulUpdates.length,
            failedUpdates: failedUpdates.length,
            stockHistoryCreated: true,
            transactionHistoryEnabled: true,
            usingItemController: true, // ✅ Indicate we're using itemController
            results: stockUpdateResults,
          },
          payment: {
            recorded: paidAmount > 0,
            amount: paidAmount,
            method: paymentDetails.method,
            status: paymentDetails.status,
            note:
              paidAmount > 0
                ? "Payment recorded in sale. Financial transaction will be created when payment is processed through payment system."
                : "No payment recorded",
          },
        },
      });
    } catch (error) {
      console.error("❌ Error creating sale with enhanced tracking:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create sale",
        error: error.message,
      });
    }
  },

  getSaleById: async (req, res) => {
    try {
      const {id} = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sale ID",
        });
      }

      const sale = await Sale.findById(id)
        .populate("customer", "name mobile email address type gstNumber")
        .populate("items.itemRef", "name itemCode category currentStock");

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: "Sale not found",
        });
      }

      // FIXED: Ensure backward compatibility for tax mode fields
      const compatibleSale = {
        ...sale.toObject(),
        taxMode:
          sale.taxMode || (sale.priceIncludesTax ? "with-tax" : "without-tax"),
        priceIncludesTax: sale.priceIncludesTax ?? sale.taxMode === "with-tax",
        items: sale.items.map((item) => ({
          ...item,
          taxMode: item.taxMode || sale.taxMode || "without-tax",
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
        data: compatibleSale,
      });
    } catch (error) {
      console.error("❌ Error fetching sale:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch sale",
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
          message: "Invalid sale ID",
        });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid payment amount is required",
        });
      }

      const sale = await Sale.findById(id);
      if (!sale) {
        return res.status(404).json({
          success: false,
          message: "Sale not found",
        });
      }

      const currentBalance = sale.balanceAmount;
      if (amount > currentBalance) {
        return res.status(400).json({
          success: false,
          message: `Payment amount cannot exceed balance amount of ₹${currentBalance.toFixed(
            2
          )}`,
        });
      }

      const newPaidAmount = sale.payment.paidAmount + parseFloat(amount);
      const newPendingAmount = sale.totals.finalTotal - newPaidAmount;

      let newPaymentStatus = "pending";
      let newDueDate = sale.payment.dueDate;

      if (newPaidAmount >= sale.totals.finalTotal) {
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

      sale.payment = {
        ...sale.payment,
        method: method,
        status: newPaymentStatus,
        paidAmount: parseFloat(newPaidAmount.toFixed(2)),
        pendingAmount: parseFloat(Math.max(0, newPendingAmount).toFixed(2)),
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        dueDate: newDueDate,
        creditDays: creditDays ? parseInt(creditDays) : sale.payment.creditDays,
        reference: reference,
        notes: notes,
      };

      if (!sale.paymentHistory) {
        sale.paymentHistory = [];
      }

      sale.paymentHistory.push({
        amount: parseFloat(amount),
        method,
        reference,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        dueDate: newDueDate,
        notes,
        createdAt: new Date(),
        createdBy: req.user?.id || "system",
      });

      await sale.save();

      res.status(200).json({
        success: true,
        message: "Payment added successfully",
        data: {
          invoiceNumber: sale.invoiceNumber,
          totalAmount: sale.totals.finalTotal,
          paidAmount: sale.payment.paidAmount,
          pendingAmount: sale.payment.pendingAmount,
          paymentStatus: sale.payment.status,
          paymentMethod: sale.payment.method,
          paymentDate: sale.payment.paymentDate,
          dueDate: sale.payment.dueDate,
          creditDays: sale.payment.creditDays,
          isOverdue: sale.isOverdue,
          daysOverdue: sale.daysOverdue,
          paymentHistory: sale.paymentHistory,
          balanceAmount: sale.balanceAmount,
        },
      });
    } catch (error) {
      console.error("Error adding payment:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add payment",
        error: error.message,
      });
    }
  },
  getAllSales: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        companyId,
        customer,
        status,
        paymentStatus,
        invoiceType,
        dateFrom,
        dateTo,
        search,
      } = req.query;

      const filter = {};

      if (companyId) filter.companyId = companyId;
      if (customer) filter.customer = customer;
      if (status) filter.status = status;
      if (paymentStatus) filter["payment.status"] = paymentStatus;
      if (invoiceType) filter.invoiceType = invoiceType;

      if (dateFrom || dateTo) {
        filter.invoiceDate = {};
        if (dateFrom) filter.invoiceDate.$gte = new Date(dateFrom);
        if (dateTo) filter.invoiceDate.$lte = new Date(dateTo);
      }

      if (search) {
        filter.$or = [
          {invoiceNumber: {$regex: search, $options: "i"}},
          {customerMobile: {$regex: search, $options: "i"}},
          {notes: {$regex: search, $options: "i"}},
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const sales = await Sale.find(filter)
        .populate("customer", "name mobile email address type")
        .sort({createdAt: -1})
        .skip(skip)
        .limit(parseInt(limit));

      const transformedSales = sales.map((sale) => ({
        id: sale._id,
        invoiceNo: sale.invoiceNumber,
        date: sale.invoiceDate,
        partyName: sale.customer?.name || "Unknown",
        partyPhone: sale.customer?.mobile || sale.customerMobile,
        transaction: sale.invoiceType === "gst" ? "GST Invoice" : "Sale",
        paymentType: sale.payment?.method || "cash",
        amount: sale.totals?.finalTotal || 0,
        balance: sale.payment?.pendingAmount || 0,
        cgst: sale.items?.reduce((sum, item) => sum + (item.cgst || 0), 0) || 0,
        sgst: sale.items?.reduce((sum, item) => sum + (item.sgst || 0), 0) || 0,
        igst: sale.items?.reduce((sum, item) => sum + (item.igst || 0), 0) || 0,
        status: sale.status,
        paymentStatus: sale.payment?.status || "pending",
        // ✅ NEW: Add source tracking
        isFromSalesOrder: sale.notes && sale.notes.includes("Converted from"),
        sourceType:
          sale.notes && sale.notes.includes("Converted from")
            ? "sales_order"
            : "direct",
        ...sale.toObject(),
      }));

      const totalSales = await Sale.countDocuments(filter);
      const totalPages = Math.ceil(totalSales / parseInt(limit));

      const summary = await Sale.aggregate([
        {$match: filter},
        {
          $group: {
            _id: null,
            totalAmount: {$sum: "$totals.finalTotal"},
            totalTax: {$sum: "$totals.totalTax"},
            totalDiscount: {$sum: "$totals.totalDiscount"},
            paidAmount: {$sum: "$payment.paidAmount"},
            pendingAmount: {$sum: "$payment.pendingAmount"},
          },
        },
      ]);

      res.status(200).json({
        success: true,
        data: {
          sales: transformedSales,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalSales,
            hasNext: parseInt(page) < totalPages,
            hasPrev: parseInt(page) > 1,
          },
          summary: summary[0] || {
            totalAmount: 0,
            totalTax: 0,
            totalDiscount: 0,
            paidAmount: 0,
            pendingAmount: 0,
          },
        },
      });
    } catch (error) {
      console.error("Error getting sales:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sales",
        error: error.message,
      });
    }
  },

  updateSale: async (req, res) => {
    try {
      const {id} = req.params;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sale ID",
        });
      }

      const existingSale = await Sale.findById(id);
      if (!existingSale) {
        return res.status(404).json({
          success: false,
          message: "Sale not found",
        });
      }

      // Check if sale can be updated
      if (
        existingSale.status === "completed" ||
        existingSale.status === "cancelled"
      ) {
        return res.status(400).json({
          success: false,
          message: "Cannot update completed or cancelled sales",
        });
      }

      // Store original items for stock adjustment
      const originalItems = existingSale.items || [];

      // FIXED: Process updated items if provided
      if (updateData.items && Array.isArray(updateData.items)) {
        const processedItems = [];
        let subtotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;
        let totalTaxableAmount = 0;

        // Get GST and tax mode settings
        const gstEnabled =
          updateData.gstEnabled ?? existingSale.gstEnabled ?? true;
        const taxMode =
          updateData.taxMode || existingSale.taxMode || "exclusive";
        const priceIncludesTax = taxMode === "inclusive";

        // Process each item
        for (let i = 0; i < updateData.items.length; i++) {
          const item = updateData.items[i];

          // Validate item
          if (!item.itemName || !item.quantity || !item.pricePerUnit) {
            return res.status(400).json({
              success: false,
              message: `Item ${i + 1}: Name, quantity, and price are required`,
            });
          }

          // Check stock availability if item reference exists
          if (item.itemRef && mongoose.Types.ObjectId.isValid(item.itemRef)) {
            const itemDetails = await Item.findById(item.itemRef);
            if (itemDetails) {
              // Find original quantity for this item
              const originalItem = originalItems.find(
                (orig) =>
                  orig.itemRef &&
                  orig.itemRef.toString() === item.itemRef.toString()
              );
              const originalQuantity = originalItem ? originalItem.quantity : 0;
              const quantityDifference = item.quantity - originalQuantity;

              // Check if we have enough stock for the increase
              if (
                quantityDifference > 0 &&
                itemDetails.currentStock < quantityDifference
              ) {
                return res.status(400).json({
                  success: false,
                  message: `Item ${i + 1} (${
                    item.itemName
                  }): Insufficient stock. Available: ${
                    itemDetails.currentStock
                  }, Required additional: ${quantityDifference}`,
                });
              }
            }
          }

          // Parse values
          const quantity = parseFloat(item.quantity);
          const pricePerUnit = parseFloat(item.pricePerUnit);
          const discountPercent = parseFloat(item.discountPercent || 0);
          const discountAmount = parseFloat(item.discountAmount || 0);
          const taxRate = parseFloat(item.taxRate || 18);

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

            if (priceIncludesTax) {
              // Tax inclusive calculation
              const taxMultiplier = 1 + taxRate / 100;
              itemTaxableAmount = amountAfterDiscount / taxMultiplier;
              cgst = (itemTaxableAmount * cgstRate) / 100;
              sgst = (itemTaxableAmount * sgstRate) / 100;
              itemAmount = amountAfterDiscount;
            } else {
              // Tax exclusive calculation
              itemTaxableAmount = amountAfterDiscount;
              cgst = (itemTaxableAmount * cgstRate) / 100;
              sgst = (itemTaxableAmount * sgstRate) / 100;
              itemAmount = itemTaxableAmount + cgst + sgst;
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
            taxRate,
            taxMode: item.taxMode || taxMode,
            priceIncludesTax,
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
        const roundOffEnabled =
          updateData.roundOffEnabled ?? existingSale.roundOffEnabled ?? false;
        const roundOff = updateData.roundOff || existingSale.roundOff || 0;
        let appliedRoundOff = 0;
        let adjustedFinalTotal = finalTotal;

        if (roundOffEnabled && roundOff !== 0) {
          appliedRoundOff = parseFloat(roundOff);
          adjustedFinalTotal = finalTotal + appliedRoundOff;
        }

        // Update totals
        updateData.totals = {
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

        updateData.items = processedItems;

        // FIXED: Update payment status based on new total
        if (updateData.totals.finalTotal !== existingSale.totals.finalTotal) {
          const currentPaidAmount = existingSale.payment.paidAmount;
          const newPendingAmount =
            updateData.totals.finalTotal - currentPaidAmount;

          updateData.payment = {
            ...existingSale.payment,
            pendingAmount: parseFloat(Math.max(0, newPendingAmount).toFixed(2)),
          };

          // Update payment status
          if (currentPaidAmount >= updateData.totals.finalTotal) {
            updateData.payment.status = "paid";
            updateData.payment.pendingAmount = 0;
          } else if (currentPaidAmount > 0) {
            updateData.payment.status = "partial";
          } else {
            updateData.payment.status = "pending";
            updateData.payment.pendingAmount = updateData.totals.finalTotal;
          }
        }
      }

      // Add update metadata
      updateData.lastModifiedBy = req.user?.id || "system";
      updateData.lastModifiedAt = new Date();

      // Update the sale
      const updatedSale = await Sale.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      }).populate("customer", "name mobile email address");

      // FIXED: Adjust stock for item changes
      if (updateData.items) {
        // Create maps for easier comparison
        const originalItemsMap = new Map();
        const updatedItemsMap = new Map();

        originalItems.forEach((item) => {
          if (item.itemRef) {
            originalItemsMap.set(item.itemRef.toString(), item.quantity);
          }
        });

        updateData.items.forEach((item) => {
          if (item.itemRef) {
            updatedItemsMap.set(item.itemRef.toString(), item.quantity);
          }
        });

        // Process stock changes
        const allItemRefs = new Set([
          ...originalItemsMap.keys(),
          ...updatedItemsMap.keys(),
        ]);

        for (const itemRef of allItemRefs) {
          const originalQuantity = originalItemsMap.get(itemRef) || 0;
          const updatedQuantity = updatedItemsMap.get(itemRef) || 0;
          const quantityDifference = updatedQuantity - originalQuantity;

          if (
            quantityDifference !== 0 &&
            mongoose.Types.ObjectId.isValid(itemRef)
          ) {
            try {
              await Item.findByIdAndUpdate(
                itemRef,
                {$inc: {currentStock: -quantityDifference}},
                {new: true}
              );
            } catch (stockError) {
              console.warn("Stock adjustment failed:", stockError.message);
            }
          }
        }
      }

      res.status(200).json({
        success: true,
        message: "Sale updated successfully",
        data: updatedSale,
      });
    } catch (error) {
      console.error("❌ Error updating sale:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update sale",
        error: error.message,
      });
    }
  },

  deleteSale: async (req, res) => {
    try {
      const {id} = req.params;
      const {reason = "User requested deletion"} = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sale ID",
        });
      }

      const sale = await Sale.findById(id).populate(
        "customer",
        "name mobile email"
      );
      if (!sale) {
        return res.status(404).json({
          success: false,
          message: "Sale not found",
        });
      }

      // Check if sale can be cancelled
      if (sale.status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Sale is already cancelled",
        });
      }

      if (sale.status === "completed" && sale.payment.status === "paid") {
        return res.status(400).json({
          success: false,
          message:
            "Cannot cancel completed and fully paid sales. Please create a return/refund instead.",
        });
      }

      // FIXED: Restore stock for all items
      if (sale.items && sale.items.length > 0) {
        for (const item of sale.items) {
          if (item.itemRef && mongoose.Types.ObjectId.isValid(item.itemRef)) {
            try {
              const updatedItem = await Item.findByIdAndUpdate(
                item.itemRef,
                {$inc: {currentStock: item.quantity}}, // Restore stock
                {new: true}
              );
            } catch (stockError) {
              console.warn(
                `⚠️ Failed to restore stock for item ${item.itemName}:`,
                stockError.message
              );
            }
          }
        }
      }

      // FIXED: Handle payment cancellation
      const cancellationData = {
        status: "cancelled",
        lastModifiedBy: req.user?.id || "system",
        lastModifiedAt: new Date(),
        cancellationReason: reason,
        cancelledAt: new Date(),
      };

      // If there were payments made, record them in payment history
      if (sale.payment.paidAmount > 0) {
        if (!sale.paymentHistory) {
          sale.paymentHistory = [];
        }

        sale.paymentHistory.push({
          amount: -sale.payment.paidAmount, // Negative amount for refund/cancellation
          method: "cancellation",
          reference: `Cancellation of invoice ${sale.invoiceNumber}`,
          paymentDate: new Date(),
          notes: `Sale cancelled. Reason: ${reason}`,
          createdAt: new Date(),
          createdBy: req.user?.id || "system",
        });

        // Reset payment amounts
        cancellationData.payment = {
          ...sale.payment,
          paidAmount: 0,
          pendingAmount: 0,
          status: "cancelled",
        };

        // Add payment history
        cancellationData.paymentHistory = sale.paymentHistory;
      }

      // Update the sale
      const cancelledSale = await Sale.findByIdAndUpdate(id, cancellationData, {
        new: true,
      }).populate("customer", "name mobile email");

      res.status(200).json({
        success: true,
        message: "Sale cancelled successfully",
        data: {
          invoiceNumber: cancelledSale.invoiceNumber,
          status: cancelledSale.status,
          cancellationReason: reason,
          cancelledAt: cancelledSale.cancelledAt,
          restoredItems: sale.items.length,
          refundAmount: sale.payment.paidAmount,
        },
      });
    } catch (error) {
      console.error("❌ Error deleting/cancelling sale:", error);
      res.status(500).json({
        success: false,
        message: "Failed to cancel sale",
        error: error.message,
      });
    }
  },

  completeSale: async (req, res) => {
    try {
      const {id} = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sale ID",
        });
      }

      const sale = await Sale.findById(id);
      if (!sale) {
        return res.status(404).json({
          success: false,
          message: "Sale not found",
        });
      }

      if (sale.status === "completed") {
        return res.status(400).json({
          success: false,
          message: "Sale is already completed",
        });
      }

      await sale.markAsCompleted();

      res.status(200).json({
        success: true,
        message: "Sale marked as completed",
        data: sale,
      });
    } catch (error) {
      console.error("Error completing sale:", error);
      res.status(500).json({
        success: false,
        message: "Failed to complete sale",
        error: error.message,
      });
    }
  },

  getTodaysSales: async (req, res) => {
    try {
      const {companyId} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const sales = await Sale.getTodaysSales(companyId)
        .populate("customer", "name mobile")
        .select(
          "invoiceNumber invoiceDate totals.finalTotal payment.status items"
        );

      const summary = {
        totalSales: sales.length,
        totalAmount: sales.reduce(
          (sum, sale) => sum + sale.totals.finalTotal,
          0
        ),
        totalItems: sales.reduce((sum, sale) => sum + sale.items.length, 0),
        paidSales: sales.filter((sale) => sale.payment.status === "paid")
          .length,
        pendingSales: sales.filter((sale) => sale.payment.status === "pending")
          .length,
      };

      res.status(200).json({
        success: true,
        data: {
          sales,
          summary,
        },
      });
    } catch (error) {
      console.error("Error getting today's sales:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get today's sales",
        error: error.message,
      });
    }
  },

  getSalesReport: async (req, res) => {
    try {
      const {companyId, startDate, endDate} = req.query;

      if (!companyId || !startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Company ID, start date, and end date are required",
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      const report = await Sale.aggregate([
        {
          $match: {
            companyId: new mongoose.Types.ObjectId(companyId),
            invoiceDate: {$gte: start, $lte: end},
            status: {$ne: "cancelled"},
          },
        },
        {
          $group: {
            _id: null,
            totalSales: {$sum: "$totals.finalTotal"},
            totalInvoices: {$sum: 1},
            totalItems: {$sum: {$size: "$items"}},
            totalTax: {$sum: "$totals.totalTax"},
            avgInvoiceValue: {$avg: "$totals.finalTotal"},
            totalPaid: {$sum: "$payment.paidAmount"},
            totalPending: {$sum: "$payment.pendingAmount"},
          },
        },
      ]);

      res.status(200).json({
        success: true,
        data: report[0] || {
          totalSales: 0,
          totalInvoices: 0,
          totalItems: 0,
          totalTax: 0,
          avgInvoiceValue: 0,
          totalPaid: 0,
          totalPending: 0,
        },
      });
    } catch (error) {
      console.error("Error getting sales report:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sales report",
        error: error.message,
      });
    }
  },

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
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfWeek = new Date(
        today.setDate(today.getDate() - today.getDay())
      );

      const [todaysSales, weekSales, monthSales, recentSales, topCustomers] =
        await Promise.all([
          Sale.aggregate([
            {
              $match: {
                companyId: new mongoose.Types.ObjectId(companyId),
                invoiceDate: {$gte: startOfDay, $lt: endOfDay},
                status: {$ne: "cancelled"},
              },
            },
            {
              $group: {
                _id: null,
                totalSales: {$sum: "$totals.finalTotal"},
                totalInvoices: {$sum: 1},
              },
            },
          ]),

          Sale.aggregate([
            {
              $match: {
                companyId: new mongoose.Types.ObjectId(companyId),
                invoiceDate: {$gte: startOfWeek},
                status: {$ne: "cancelled"},
              },
            },
            {
              $group: {
                _id: null,
                totalSales: {$sum: "$totals.finalTotal"},
                totalInvoices: {$sum: 1},
              },
            },
          ]),

          Sale.aggregate([
            {
              $match: {
                companyId: new mongoose.Types.ObjectId(companyId),
                invoiceDate: {$gte: startOfMonth},
                status: {$ne: "cancelled"},
              },
            },
            {
              $group: {
                _id: null,
                totalSales: {$sum: "$totals.finalTotal"},
                totalInvoices: {$sum: 1},
              },
            },
          ]),

          Sale.find({companyId, status: {$ne: "cancelled"}})
            .populate("customer", "name mobile")
            .sort({createdAt: -1})
            .limit(5)
            .select(
              "invoiceNumber invoiceDate totals.finalTotal payment.status"
            ),

          Sale.aggregate([
            {
              $match: {
                companyId: new mongoose.Types.ObjectId(companyId),
                status: {$ne: "cancelled"},
              },
            },
            {
              $group: {
                _id: "$customer",
                totalPurchases: {$sum: "$totals.finalTotal"},
                invoiceCount: {$sum: 1},
              },
            },
            {
              $lookup: {
                from: "parties",
                localField: "_id",
                foreignField: "_id",
                as: "customerInfo",
              },
            },
            {$unwind: "$customerInfo"},
            {
              $project: {
                name: "$customerInfo.name",
                mobile: "$customerInfo.mobile",
                totalPurchases: 1,
                invoiceCount: 1,
              },
            },
            {$sort: {totalPurchases: -1}},
            {$limit: 5},
          ]),
        ]);

      res.status(200).json({
        success: true,
        data: {
          today: todaysSales[0] || {totalSales: 0, totalInvoices: 0},
          week: weekSales[0] || {totalSales: 0, totalInvoices: 0},
          month: monthSales[0] || {totalSales: 0, totalInvoices: 0},
          recentSales,
          topCustomers,
        },
      });
    } catch (error) {
      console.error("Error getting dashboard data:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get dashboard data",
        error: error.message,
      });
    }
  },

  getPaymentStatus: async (req, res) => {
    try {
      const {id} = req.params;

      const sale = await Sale.findById(id).select(
        "payment totals paymentHistory"
      );

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: "Sale not found",
        });
      }

      res.status(200).json({
        success: true,
        data: {
          paymentStatus: sale.payment.status,
          paidAmount: sale.payment.paidAmount,
          pendingAmount: sale.payment.pendingAmount,
          totalAmount: sale.totals.finalTotal,
          balanceAmount: sale.balanceAmount,
          paymentMethod: sale.payment.method,
          paymentDate: sale.payment.paymentDate,
          paymentHistory: sale.paymentHistory || [],
        },
      });
    } catch (error) {
      console.error("Error getting payment status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get payment status",
        error: error.message,
      });
    }
  },

  getMonthlyReport: async (req, res) => {
    try {
      const {
        companyId,
        year = new Date().getFullYear(),
        month = new Date().getMonth() + 1,
      } = req.query;

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const monthlyData = await Sale.aggregate([
        {
          $match: {
            companyId: new mongoose.Types.ObjectId(companyId),
            invoiceDate: {$gte: startDate, $lte: endDate},
            status: {$ne: "cancelled"},
          },
        },
        {
          $group: {
            _id: {$dayOfMonth: "$invoiceDate"},
            dailySales: {$sum: "$totals.finalTotal"},
            dailyInvoices: {$sum: 1},
            dailyItems: {$sum: {$size: "$items"}},
          },
        },
        {$sort: {_id: 1}},
      ]);

      const summary = await Sale.aggregate([
        {
          $match: {
            companyId: new mongoose.Types.ObjectId(companyId),
            invoiceDate: {$gte: startDate, $lte: endDate},
            status: {$ne: "cancelled"},
          },
        },
        {
          $group: {
            _id: null,
            totalSales: {$sum: "$totals.finalTotal"},
            totalInvoices: {$sum: 1},
            totalTax: {$sum: "$totals.totalTax"},
            avgDailySales: {$avg: "$totals.finalTotal"},
          },
        },
      ]);

      res.status(200).json({
        success: true,
        data: {
          monthlyBreakdown: monthlyData,
          summary: summary[0] || {
            totalSales: 0,
            totalInvoices: 0,
            totalTax: 0,
            avgDailySales: 0,
          },
          period: {year: parseInt(year), month: parseInt(month)},
        },
      });
    } catch (error) {
      console.error("Error getting monthly report:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get monthly report",
        error: error.message,
      });
    }
  },

  getCustomerStats: async (req, res) => {
    try {
      const {companyId, customerId} = req.query;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: "Customer ID is required",
        });
      }

      const customerStats = await Sale.aggregate([
        {
          $match: {
            companyId: new mongoose.Types.ObjectId(companyId),
            customer: new mongoose.Types.ObjectId(customerId),
            status: {$ne: "cancelled"},
          },
        },
        {
          $group: {
            _id: null,
            totalPurchases: {$sum: "$totals.finalTotal"},
            totalInvoices: {$sum: 1},
            totalItems: {$sum: {$size: "$items"}},
            avgInvoiceValue: {$avg: "$totals.finalTotal"},
            lastPurchaseDate: {$max: "$invoiceDate"},
            firstPurchaseDate: {$min: "$invoiceDate"},
          },
        },
      ]);

      const recentPurchases = await Sale.find({
        companyId,
        customer: customerId,
        status: {$ne: "cancelled"},
      })
        .sort({invoiceDate: -1})
        .limit(5)
        .select("invoiceNumber invoiceDate totals.finalTotal payment.status");

      res.status(200).json({
        success: true,
        data: {
          stats: customerStats[0] || {
            totalPurchases: 0,
            totalInvoices: 0,
            totalItems: 0,
            avgInvoiceValue: 0,
            lastPurchaseDate: null,
            firstPurchaseDate: null,
          },
          recentPurchases,
        },
      });
    } catch (error) {
      console.error("Error getting customer stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get customer statistics",
        error: error.message,
      });
    }
  },

  validateStock: async (req, res) => {
    try {
      const {items} = req.body;

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({
          success: false,
          message: "Items array is required",
        });
      }

      const stockValidation = [];

      for (const item of items) {
        if (item.itemRef) {
          const itemDetails = await Item.findById(item.itemRef);
          if (itemDetails) {
            const isAvailable =
              itemDetails.currentStock >= (item.quantity || 0);
            stockValidation.push({
              itemRef: item.itemRef,
              itemName: itemDetails.name,
              requestedQuantity: item.quantity,
              availableStock: itemDetails.currentStock,
              isAvailable,
              shortfall: isAvailable
                ? 0
                : item.quantity - itemDetails.currentStock,
            });
          } else {
            stockValidation.push({
              itemRef: item.itemRef,
              error: "Item not found",
            });
          }
        }
      }

      const allAvailable = stockValidation.every(
        (item) => item.isAvailable !== false
      );

      res.status(200).json({
        success: true,
        data: {
          allItemsAvailable: allAvailable,
          stockValidation,
        },
      });
    } catch (error) {
      console.error("Error validating stock:", error);
      res.status(500).json({
        success: false,
        message: "Failed to validate stock",
        error: error.message,
      });
    }
  },

  exportCSV: async (req, res) => {
    try {
      const {
        companyId,
        customer,
        status,
        paymentStatus,
        invoiceType,
        dateFrom,
        dateTo,
      } = req.query;

      const filter = {companyId};
      if (customer) filter.customer = customer;
      if (status) filter.status = status;
      if (paymentStatus) filter["payment.status"] = paymentStatus;
      if (invoiceType) filter.invoiceType = invoiceType;

      if (dateFrom || dateTo) {
        filter.invoiceDate = {};
        if (dateFrom) filter.invoiceDate.$gte = new Date(dateFrom);
        if (dateTo) filter.invoiceDate.$lte = new Date(dateTo);
      }

      const sales = await Sale.find(filter)
        .populate("customer", "name mobile email")
        .sort({invoiceDate: -1})
        .limit(1000);

      const csvHeaders = [
        "Invoice Number",
        "Invoice Date",
        "Customer Name",
        "Customer Mobile",
        "Invoice Type",
        "Total Amount",
        "Tax Amount",
        "Paid Amount",
        "Pending Amount",
        "Payment Status",
        "Status",
      ];

      const csvRows = sales.map((sale) => [
        sale.invoiceNumber,
        sale.invoiceDate.toISOString().split("T")[0],
        sale.customer?.name || "",
        sale.customer?.mobile || sale.customerMobile || "",
        sale.invoiceType,
        sale.totals.finalTotal,
        sale.totals.totalTax,
        sale.payment.paidAmount,
        sale.payment.pendingAmount,
        sale.payment.status,
        sale.status,
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map((row) => row.map((field) => `"${field}"`).join(","))
        .join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=sales-export.csv"
      );
      res.status(200).send(csvContent);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      res.status(500).json({
        success: false,
        message: "Failed to export CSV",
        error: error.message,
      });
    }
  },

  getOverdueSales: async (req, res) => {
    try {
      const {companyId} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const overdueSales = await Sale.find({
        companyId: companyId,
        status: {$ne: "cancelled"},
        "payment.pendingAmount": {$gt: 0},
        "payment.dueDate": {
          $exists: true,
          $ne: null,
          $lt: today,
        },
      })
        .populate("customer", "name mobile email")
        .sort({"payment.dueDate": 1});

      const salesWithOverdueInfo = overdueSales.map((sale) => {
        const saleObj = sale.toObject();
        const dueDate = new Date(sale.payment.dueDate);
        const diffTime = Math.abs(today - dueDate);
        const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          ...saleObj,
          isOverdue: true,
          daysOverdue: daysOverdue,
        };
      });

      res.status(200).json({
        success: true,
        data: salesWithOverdueInfo,
        message: `Found ${salesWithOverdueInfo.length} overdue sales`,
      });
    } catch (error) {
      console.error("Error getting overdue sales:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get overdue sales",
        error: error.message,
      });
    }
  },
  // NEW: Get sales due today
  getSalesDueToday: async (req, res) => {
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

      // Find sales due today
      const salesDueToday = await Sale.find({
        companyId: companyId,
        status: {$ne: "cancelled"},
        "payment.pendingAmount": {$gt: 0},
        "payment.dueDate": {
          $gte: startOfDay,
          $lt: endOfDay,
        },
      })
        .populate("customer", "name mobile email")
        .sort({"payment.dueDate": 1});

      res.status(200).json({
        success: true,
        data: salesDueToday,
        message: `Found ${salesDueToday.length} sales due today`,
      });
    } catch (error) {
      console.error("Error getting sales due today:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sales due today",
        error: error.message,
      });
    }
  },

  updatePaymentDueDate: async (req, res) => {
    try {
      const {id} = req.params;
      const {dueDate, creditDays} = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sale ID",
        });
      }

      const sale = await Sale.findById(id);
      if (!sale) {
        return res.status(404).json({
          success: false,
          message: "Sale not found",
        });
      }

      // Update due date and credit days
      sale.payment.dueDate = dueDate ? new Date(dueDate) : null;
      sale.payment.creditDays = creditDays ? parseInt(creditDays) : 0;
      sale.lastModifiedBy = req.user?.id || "system";

      await sale.save();
      res.status(200).json({
        success: true,
        data: sale,
        message: "Payment due date updated successfully",
      });
    } catch (error) {
      console.error("Error updating payment due date:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update payment due date",
        error: error.message,
      });
    }
  },

  convertSalesInvoiceToPurchaseInvoice: async (req, res) => {
    try {
      const {salesInvoiceId} = req.params;
      const {convertedBy, customerCompanyId, notes, createdBy, userId} =
        req.body; // ✅ Added userId

      // Validate sales invoice ID
      if (!mongoose.Types.ObjectId.isValid(salesInvoiceId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sales invoice ID",
        });
      }

      // Find the sales invoice
      const salesInvoice = await Sale.findById(salesInvoiceId)
        .populate(
          "customer",
          "name mobile email address gstNumber companyId linkedCompanyId"
        )
        .populate("companyId", "businessName email phoneNumber address gstin");

      if (!salesInvoice) {
        return res.status(404).json({
          success: false,
          message: "Sales invoice not found",
        });
      }

      // Check if already converted
      if (salesInvoice.autoGeneratedPurchaseInvoice) {
        return res.status(400).json({
          success: false,
          message:
            "Sales invoice has already been converted to purchase invoice",
          data: {
            existingPurchaseInvoiceId: salesInvoice.purchaseInvoiceRef,
            existingPurchaseInvoiceNumber: salesInvoice.purchaseInvoiceNumber,
          },
        });
      }

      // ✅ CRITICAL FIX: Determine the customer's company ID
      let purchaseCompanyId = customerCompanyId;

      if (!purchaseCompanyId && salesInvoice.customer?.linkedCompanyId) {
        purchaseCompanyId = salesInvoice.customer.linkedCompanyId;
      }

      if (!purchaseCompanyId && salesInvoice.customer?.companyId) {
        purchaseCompanyId = salesInvoice.customer.companyId;
      }

      if (!purchaseCompanyId) {
        return res.status(400).json({
          success: false,
          message:
            "Customer company ID is required. This invoice will be created as a purchase invoice for the customer's company.",
          hint: "Provide customerCompanyId in the request body or ensure the customer has a linked company",
        });
      }

      // ✅ VALIDATION: Ensure we're not creating for the same company
      if (purchaseCompanyId.toString() === salesInvoice.companyId.toString()) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot create purchase invoice for the same company. Purchase invoice should be created for the customer's company.",
          data: {
            salesCompanyId: salesInvoice.companyId,
            providedCustomerCompanyId: purchaseCompanyId,
          },
        });
      }

      // Import models
      const Purchase = require("../models/Purchase");

      // ✅ CRITICAL FIX: Get valid User ID for createdBy field
      const getValidUserId = async () => {
        // Priority 1: Explicitly provided userId
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
          return userId;
        }

        // Priority 2: Provided createdBy (if it's a valid User ID)
        if (createdBy && mongoose.Types.ObjectId.isValid(createdBy)) {
          return createdBy;
        }

        // Priority 3: Provided convertedBy (if it's a valid User ID)
        if (convertedBy && mongoose.Types.ObjectId.isValid(convertedBy)) {
          return convertedBy;
        }

        // Priority 4: User ID from request
        if (req.user?.id && mongoose.Types.ObjectId.isValid(req.user.id)) {
          return req.user.id;
        }

        // Priority 5: User ID from request._id
        if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
          return req.user._id;
        }

        // ✅ Priority 6: Try to find a system user or create one
        try {
          const User = require("../models/User"); // Adjust path as needed

          // Look for existing system user
          let systemUser = await User.findOne({
            email: "system@crosscompany.internal",
            role: "system",
          });

          if (!systemUser) {
            // Create system user for cross-company operations
            systemUser = new User({
              name: "System User - Cross Company",
              email: "system@crosscompany.internal",
              password: "system123", // You should hash this properly
              role: "system",
              isActive: true,
              isSystemUser: true,
            });
            await systemUser.save();
          }

          return systemUser._id;
        } catch (userError) {
          console.error("❌ Error getting/creating system user:", userError);
          return null;
        }
      };

      const validUserId = await getValidUserId();

      if (!validUserId) {
        return res.status(400).json({
          success: false,
          message:
            "User authentication required for cross-company invoice conversion",
          error: "No valid user ID found for creating supplier party",
          hint: "Please provide userId in the request body or ensure proper user authentication",
        });
      }

      // ✅ ENHANCED: Create supplier party representing the SELLING company
      let supplierParty = await Party.findOne({
        companyId: purchaseCompanyId, // Customer's company
        $or: [
          {name: salesInvoice.companyId.businessName, type: "supplier"},
          {linkedCompanyId: salesInvoice.companyId._id, type: "supplier"},
          // ✅ Also search by phone number to find existing party
          {
            phoneNumber: salesInvoice.companyId.phoneNumber,
            type: "supplier",
            companyId: purchaseCompanyId,
          },
        ],
      });

      if (!supplierParty) {
        // ✅ ENHANCED: Generate unique phone number if duplicate exists
        const generateUniquePhoneNumber = async (
          basePhoneNumber,
          companyId
        ) => {
          let phoneNumber = basePhoneNumber || "9000000000";
          let counter = 1;

          while (true) {
            const existingParty = await Party.findOne({
              companyId: companyId,
              phoneNumber: phoneNumber,
            });

            if (!existingParty) {
              return phoneNumber;
            }

            // ✅ If duplicate, append counter to make it unique
            const baseNumber = basePhoneNumber || "9000000000";
            const paddedCounter = counter.toString().padStart(2, "0");
            phoneNumber = baseNumber.slice(0, -2) + paddedCounter;
            counter++;

            // ✅ Safety check to prevent infinite loop
            if (counter > 99) {
              phoneNumber = `${Date.now()}`.slice(-10); // Use timestamp as fallback
              break;
            }
          }

          return phoneNumber;
        };

        // ✅ Generate unique phone number
        const uniquePhoneNumber = await generateUniquePhoneNumber(
          salesInvoice.companyId.phoneNumber,
          purchaseCompanyId
        );

        // ✅ FIXED: Create supplier party with proper User ID and unique phone
        const supplierPartyData = {
          name: salesInvoice.companyId.businessName || "Supplier Company",
          mobile: uniquePhoneNumber, // ✅ Use unique phone number
          phoneNumber: uniquePhoneNumber, // ✅ Use unique phone number
          email:
            salesInvoice.companyId.email ||
            `supplier-${Date.now()}@company.com`, // ✅ Make email unique too
          address: salesInvoice.companyId.address || "",
          gstNumber: salesInvoice.companyId.gstin || "",
          type: "supplier",
          partyType: "supplier",
          companyId: purchaseCompanyId, // ✅ Customer's company ID
          status: "active",
          creditLimit: 0,
          creditDays: 30,
          currentBalance: 0,
          openingBalance: 0,

          // ✅ CRITICAL FIX: Use valid User ID (not Customer ID)
          userId: validUserId, // ✅ This should be a User ID
          createdBy: validUserId, // ✅ This should be a User ID
          lastModifiedBy: validUserId, // ✅ This should be a User ID

          // ✅ ENHANCED: Cross-company linking
          linkedCompanyId: salesInvoice.companyId._id, // Link to the selling company
          isLinkedSupplier: true,
          enableBidirectionalInvoices: true,
          sourceInvoiceId: salesInvoice._id,
          sourceInvoiceNumber: salesInvoice.invoiceNumber,
          notes: `Auto-created from Sales Invoice ${salesInvoice.invoiceNumber} - Represents ${salesInvoice.companyId.businessName}`,

          // ✅ NEW: Add metadata about phone number modification
          ...(uniquePhoneNumber !== salesInvoice.companyId.phoneNumber && {
            originalPhoneNumber: salesInvoice.companyId.phoneNumber,
            phoneNumberModified: true,
            phoneNumberModificationReason:
              "Avoided duplicate in target company",
          }),
        };

        try {
          supplierParty = new Party(supplierPartyData);
          await supplierParty.save();
        } catch (partyError) {
          console.error("❌ Error creating supplier party:", partyError);

          // ✅ ENHANCED: Check if it's still a duplicate error and try to find existing party
          if (partyError.code === 11000) {
            // Try to find the existing party that's causing the duplicate
            const existingParty = await Party.findOne({
              companyId: purchaseCompanyId,
              $or: [
                {phoneNumber: salesInvoice.companyId.phoneNumber},
                {mobile: salesInvoice.companyId.phoneNumber},
                {name: salesInvoice.companyId.businessName},
              ],
            });

            if (existingParty) {
              // ✅ Update existing party with cross-company linking if needed
              if (!existingParty.linkedCompanyId) {
                existingParty.linkedCompanyId = salesInvoice.companyId._id;
                existingParty.isLinkedSupplier = true;
                existingParty.enableBidirectionalInvoices = true;
                existingParty.notes = `${
                  existingParty.notes || ""
                } | Linked to ${
                  salesInvoice.companyId.businessName
                } via invoice ${salesInvoice.invoiceNumber}`;
                await existingParty.save();
              }

              supplierParty = existingParty;
            } else {
              // If we still can't find the party, return error
              return res.status(500).json({
                success: false,
                message:
                  "Failed to create or find supplier party for cross-company conversion",
                error: "Duplicate phone number constraint violation",
                details: {
                  duplicateField: "phoneNumber",
                  duplicateValue: salesInvoice.companyId.phoneNumber,
                  companyId: purchaseCompanyId,
                  suggestion:
                    "A party with this phone number already exists in the target company",
                },
              });
            }
          } else {
            // For other errors, return the original error response
            return res.status(500).json({
              success: false,
              message:
                "Failed to create supplier party for cross-company conversion",
              error: partyError.message,
              details: {
                requiredField: "userId",
                providedUserId: validUserId,
                partyData: {
                  name: supplierPartyData.name,
                  companyId: supplierPartyData.companyId,
                  type: supplierPartyData.type,
                },
              },
            });
          }
        }
      }

      // Transform sales invoice items
      const purchaseInvoiceItems = salesInvoice.items.map((item, index) => {
        const itemAmount =
          item.itemAmount || item.amount || item.quantity * item.pricePerUnit;

        return {
          itemRef: item.itemRef || null,
          itemName: item.itemName,
          itemCode: item.itemCode || "",
          hsnCode: item.hsnCode || "0000",
          category: item.category || "",
          description: item.description || "",
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit,
          unit: item.unit || "PCS",
          discountPercent: item.discountPercent || 0,
          discountAmount: item.discountAmount || 0,
          taxRate: item.taxRate || 0,
          taxMode: item.taxMode || salesInvoice.taxMode || "without-tax",
          priceIncludesTax:
            item.priceIncludesTax !== undefined
              ? item.priceIncludesTax
              : salesInvoice.priceIncludesTax || false,

          // Tax fields
          cgst: item.cgst || item.cgstAmount || 0,
          sgst: item.sgst || item.sgstAmount || 0,
          igst: item.igst || item.igstAmount || 0,
          cgstAmount: item.cgstAmount || item.cgst || 0,
          sgstAmount: item.sgstAmount || item.sgst || 0,
          igstAmount: item.igstAmount || item.igst || 0,

          taxableAmount: item.taxableAmount || itemAmount,
          totalTaxAmount:
            item.totalTaxAmount ||
            (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0),

          amount: itemAmount,
          itemAmount: itemAmount,
          lineNumber: item.lineNumber || index + 1,
          receivedQuantity: item.quantity,
          pendingQuantity: 0,
        };
      });

      // Generate purchase number for customer's company
      const generatePurchaseNumber = () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const timestamp = Date.now().toString().slice(-4);

        const prefix = salesInvoice.gstEnabled ? "PINV-GST" : "PINV";
        return `${prefix}-${year}${month}${day}-${timestamp}`;
      };

      const purchaseNumber = generatePurchaseNumber();

      // ✅ ENHANCED: Create purchase invoice data for CUSTOMER'S company
      const purchaseInvoiceData = {
        purchaseNumber: purchaseNumber,
        invoiceNumber: purchaseNumber,
        purchaseType: salesInvoice.invoiceType || "gst",
        invoiceType: salesInvoice.invoiceType || "gst",
        purchaseDate: salesInvoice.invoiceDate || new Date(),
        invoiceDate: salesInvoice.invoiceDate || new Date(),
        supplier: supplierParty._id, // Supplier = your company
        supplierMobile: supplierParty.mobile || "",
        companyId: purchaseCompanyId, // ✅ CRITICAL: Customer's company ID
        items: purchaseInvoiceItems,
        totals: {
          subtotal: salesInvoice.totals.subtotal || 0,
          totalQuantity: salesInvoice.totals.totalQuantity || 0,
          totalDiscount: salesInvoice.totals.totalDiscount || 0,
          totalDiscountAmount: salesInvoice.totals.totalDiscountAmount || 0,
          totalTax: salesInvoice.totals.totalTax || 0,
          totalCGST: salesInvoice.totals.totalCGST || 0,
          totalSGST: salesInvoice.totals.totalSGST || 0,
          totalIGST: salesInvoice.totals.totalIGST || 0,
          totalTaxableAmount:
            salesInvoice.totals.totalTaxableAmount ||
            salesInvoice.totals.subtotal ||
            0,
          finalTotal: salesInvoice.totals.finalTotal || 0,
          roundOff: salesInvoice.totals.roundOff || 0,
          withTaxTotal: salesInvoice.totals.withTaxTotal || 0,
          withoutTaxTotal: salesInvoice.totals.withoutTaxTotal || 0,
        },
        payment: {
          method: salesInvoice.payment?.method || "credit",
          status: "paid", // Assume paid since it's based on a completed sale
          paidAmount: salesInvoice.totals.finalTotal || 0,
          pendingAmount: 0,
          paymentDate: new Date(),
          dueDate: null,
          creditDays: 0,
          reference: `Payment for Sales Invoice ${salesInvoice.invoiceNumber}`,
          notes: "Auto-payment for cross-company purchase invoice",
        },
        gstEnabled:
          salesInvoice.gstEnabled !== undefined
            ? salesInvoice.gstEnabled
            : true,
        taxMode: salesInvoice.taxMode || "without-tax",
        priceIncludesTax: salesInvoice.priceIncludesTax || false,

        // ✅ ENHANCED: Bidirectional cross-company tracking
        sourceInvoiceId: salesInvoice._id,
        sourceInvoiceNumber: salesInvoice.invoiceNumber,
        sourceInvoiceType: "sales_invoice",
        sourceCompanyId: salesInvoice.companyId._id, // ✅ Original selling company
        targetCompanyId: purchaseCompanyId, // ✅ Customer's company
        isAutoGenerated: true,
        isCrossCompanyInvoice: true, // ✅ Flag for cross-company
        generatedFrom: "sales_invoice",
        generatedBy: validUserId,
        generatedAt: new Date(),

        // ✅ ENHANCED: Cross-company correspondence
        correspondingSalesInvoiceId: salesInvoice._id,
        correspondingSalesInvoiceNumber: salesInvoice.invoiceNumber,
        correspondingSalesInvoiceCompany: salesInvoice.companyId._id,

        notes:
          notes ||
          `Cross-company purchase invoice generated from Sales Invoice ${salesInvoice.invoiceNumber} of ${salesInvoice.companyId.businessName}`,
        termsAndConditions: salesInvoice.termsAndConditions || "",
        status: "received",
        receivingStatus: "complete",
        createdBy: validUserId,
        lastModifiedBy: validUserId,
      };

      // Create the purchase invoice
      const purchaseInvoice = new Purchase(purchaseInvoiceData);
      await purchaseInvoice.save();

      // ✅ ENHANCED: Update the sales invoice with cross-company references
      salesInvoice.autoGeneratedPurchaseInvoice = true;
      salesInvoice.purchaseInvoiceRef = purchaseInvoice._id;
      salesInvoice.purchaseInvoiceNumber = purchaseInvoice.purchaseNumber;
      salesInvoice.purchaseInvoiceGeneratedAt = new Date();
      salesInvoice.purchaseInvoiceGeneratedBy = validUserId;

      // ✅ ENHANCED: Cross-company tracking
      salesInvoice.targetCompanyId = purchaseCompanyId;
      salesInvoice.correspondingPurchaseInvoiceId = purchaseInvoice._id;
      salesInvoice.correspondingPurchaseInvoiceNumber =
        purchaseInvoice.purchaseNumber;
      salesInvoice.correspondingPurchaseInvoiceCompany = purchaseCompanyId;
      salesInvoice.isCrossCompanyLinked = true;

      await salesInvoice.save();

      res.status(201).json({
        success: true,
        message:
          "Sales invoice converted to cross-company purchase invoice successfully",
        data: {
          purchaseInvoice: {
            _id: purchaseInvoice._id,
            purchaseNumber: purchaseInvoice.purchaseNumber,
            invoiceNumber: purchaseInvoice.invoiceNumber,
            invoiceDate: purchaseInvoice.invoiceDate,
            supplier: {
              _id: supplierParty._id,
              name: supplierParty.name,
              mobile: supplierParty.mobile,
              linkedCompanyId: supplierParty.linkedCompanyId,
            },
            companyId: purchaseCompanyId, // ✅ Customer's company
            totals: purchaseInvoice.totals,
            status: purchaseInvoice.status,
            isCrossCompanyInvoice: true,
            sourceInvoiceId: purchaseInvoice.sourceInvoiceId,
            sourceInvoiceNumber: purchaseInvoice.sourceInvoiceNumber,
            sourceCompanyId: salesInvoice.companyId._id, // ✅ Your company
          },
          salesInvoice: {
            id: salesInvoice._id,
            invoiceNumber: salesInvoice.invoiceNumber,
            autoGeneratedPurchaseInvoice:
              salesInvoice.autoGeneratedPurchaseInvoice,
            purchaseInvoiceRef: salesInvoice.purchaseInvoiceRef,
            purchaseInvoiceNumber: salesInvoice.purchaseInvoiceNumber,
            targetCompanyId: salesInvoice.targetCompanyId,
            isCrossCompanyLinked: true,
          },
          crossCompanyMapping: {
            sellingCompany: salesInvoice.companyId._id,
            buyingCompany: purchaseCompanyId,
            customerName: salesInvoice.customer.name,
            invoiceAmount: salesInvoice.totals.finalTotal,
            conversionDate: new Date(),
          },
        },
      });
    } catch (error) {
      console.error(
        "❌ Error converting sales invoice to cross-company purchase invoice:",
        error
      );
      res.status(500).json({
        success: false,
        message:
          "Failed to convert sales invoice to cross-company purchase invoice",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Get purchase invoices created from sales invoices
  getPurchaseInvoicesFromSalesInvoices: async (req, res) => {
    try {
      const {companyId, page = 1, limit = 10} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Import Purchase model
      const Purchase = require("../models/Purchase");

      // Find purchase invoices that were generated from sales invoices
      const purchaseInvoices = await Purchase.find({
        companyId,
        sourceInvoiceType: "sales_invoice",
        isAutoGenerated: true,
      })
        .populate("supplier", "name mobile email")
        .sort({createdAt: -1})
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Purchase.countDocuments({
        companyId,
        sourceInvoiceType: "sales_invoice",
        isAutoGenerated: true,
      });

      res.status(200).json({
        success: true,
        data: {
          purchaseInvoices,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
            hasPrev: parseInt(page) > 1,
          },
        },
        message: "Purchase invoices from sales invoices retrieved successfully",
      });
    } catch (error) {
      console.error(
        "Error getting purchase invoices from sales invoices:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to get purchase invoices from sales invoices",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Get bidirectional invoice analytics
  getBidirectionalInvoiceAnalytics: async (req, res) => {
    try {
      const {companyId} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const Purchase = require("../models/Purchase");

      const [
        totalSalesInvoices,
        purchaseInvoicesFromSalesInvoices,
        totalPurchaseInvoices,
        autoGeneratedSalesInvoices,
        salesInvoicesWithGeneratedPurchase,
      ] = await Promise.all([
        // Total sales invoices count
        Sale.countDocuments({companyId}),

        // Purchase invoices created from sales invoices
        Purchase.countDocuments({
          companyId,
          sourceInvoiceType: "sales_invoice",
          isAutoGenerated: true,
        }),

        // Total purchase invoices
        Purchase.countDocuments({companyId}),

        // Auto-generated sales invoices (from purchase invoices)
        Sale.countDocuments({
          companyId,
          isAutoGenerated: true,
          generatedFrom: "purchase_invoice",
        }),

        // Sales invoices that generated purchase invoices
        Sale.countDocuments({
          companyId,
          autoGeneratedPurchaseInvoice: true,
        }),
      ]);

      const analytics = {
        salesInvoices: {
          total: totalSalesInvoices,
          autoGenerated: autoGeneratedSalesInvoices,
          withGeneratedPurchase: salesInvoicesWithGeneratedPurchase,
          direct: totalSalesInvoices - autoGeneratedSalesInvoices,
        },
        purchaseInvoices: {
          total: totalPurchaseInvoices,
          fromSalesInvoices: purchaseInvoicesFromSalesInvoices,
          direct: totalPurchaseInvoices - purchaseInvoicesFromSalesInvoices,
        },
        bidirectionalCoverage: {
          percentage:
            totalSalesInvoices > 0
              ? (
                  ((autoGeneratedSalesInvoices +
                    salesInvoicesWithGeneratedPurchase) /
                    totalSalesInvoices) *
                  100
                ).toFixed(2)
              : 0,
          description:
            "Percentage of invoices using bidirectional invoice system",
        },
        conversionRates: {
          salesToPurchase:
            totalSalesInvoices > 0
              ? (
                  (salesInvoicesWithGeneratedPurchase / totalSalesInvoices) *
                  100
                ).toFixed(2)
              : 0,
          purchaseFromSales:
            totalPurchaseInvoices > 0
              ? (
                  (purchaseInvoicesFromSalesInvoices / totalPurchaseInvoices) *
                  100
                ).toFixed(2)
              : 0,
        },
      };

      res.status(200).json({
        success: true,
        data: analytics,
        message: "Bidirectional invoice analytics retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting bidirectional invoice analytics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get bidirectional invoice analytics",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Get invoice conversion status
  getSalesInvoiceConversionStatus: async (req, res) => {
    try {
      const {companyId, salesInvoiceId} = req.query;

      if (!companyId || !salesInvoiceId) {
        return res.status(400).json({
          success: false,
          message: "Company ID and Sales Invoice ID are required",
        });
      }

      const salesInvoice = await Sale.findOne({
        _id: salesInvoiceId,
        companyId,
      }).populate("customer", "name mobile email");

      if (!salesInvoice) {
        return res.status(404).json({
          success: false,
          message: "Sales invoice not found",
        });
      }

      let purchaseInvoice = null;
      if (
        salesInvoice.autoGeneratedPurchaseInvoice &&
        salesInvoice.purchaseInvoiceRef
      ) {
        const Purchase = require("../models/Purchase");
        purchaseInvoice = await Purchase.findById(
          salesInvoice.purchaseInvoiceRef
        ).select("invoiceNumber invoiceDate totals payment status");
      }

      const conversionStatus = {
        salesInvoice: {
          id: salesInvoice._id,
          invoiceNumber: salesInvoice.invoiceNumber,
          invoiceDate: salesInvoice.invoiceDate,
          customer: salesInvoice.customer,
          totalAmount: salesInvoice.totals.finalTotal,
          status: salesInvoice.status,
        },
        conversion: {
          isConverted: salesInvoice.autoGeneratedPurchaseInvoice,
          convertedAt: salesInvoice.purchaseInvoiceGeneratedAt,
          convertedBy: salesInvoice.purchaseInvoiceGeneratedBy,
          canConvert:
            !salesInvoice.autoGeneratedPurchaseInvoice &&
            ["draft", "completed"].includes(salesInvoice.status),
        },
        purchaseInvoice: purchaseInvoice
          ? {
              id: purchaseInvoice._id,
              invoiceNumber: purchaseInvoice.invoiceNumber,
              invoiceDate: purchaseInvoice.invoiceDate,
              totalAmount: purchaseInvoice.totals.finalTotal,
              paymentStatus: purchaseInvoice.payment.status,
              status: purchaseInvoice.status,
            }
          : null,
      };

      res.status(200).json({
        success: true,
        data: conversionStatus,
        message: "Sales invoice conversion status retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting sales invoice conversion status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sales invoice conversion status",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Bulk convert sales invoices to purchase invoices
  bulkConvertSalesInvoicesToPurchaseInvoices: async (req, res) => {
    try {
      const {salesInvoiceIds, convertedBy, targetCompanyId} = req.body;

      if (
        !salesInvoiceIds ||
        !Array.isArray(salesInvoiceIds) ||
        salesInvoiceIds.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Sales invoice IDs array is required",
        });
      }

      const Purchase = require("../models/Purchase");
      const results = {
        successful: [],
        failed: [],
        skipped: [],
      };

      for (const salesInvoiceId of salesInvoiceIds) {
        try {
          if (!mongoose.Types.ObjectId.isValid(salesInvoiceId)) {
            results.failed.push({
              salesInvoiceId,
              error: "Invalid sales invoice ID",
            });
            continue;
          }

          const salesInvoice = await Sale.findById(salesInvoiceId);

          if (!salesInvoice) {
            results.failed.push({
              salesInvoiceId,
              error: "Sales invoice not found",
            });
            continue;
          }

          if (salesInvoice.autoGeneratedPurchaseInvoice) {
            results.skipped.push({
              salesInvoiceId,
              invoiceNumber: salesInvoice.invoiceNumber,
              reason: "Already converted",
              existingPurchaseInvoiceNumber: salesInvoice.purchaseInvoiceNumber,
            });
            continue;
          }

          // Create purchase invoice using the method we created above
          const response = await this.convertSalesInvoiceToPurchaseInvoice(
            {params: {salesInvoiceId}, body: {convertedBy, targetCompanyId}},
            {
              status: (code) => ({
                json: (data) => {
                  if (code === 201) {
                    results.successful.push({
                      salesInvoiceId,
                      invoiceNumber: salesInvoice.invoiceNumber,
                      purchaseInvoiceId: data.data.purchaseInvoice._id,
                      purchaseInvoiceNumber:
                        data.data.purchaseInvoice.invoiceNumber,
                      finalTotal: data.data.purchaseInvoice.totals.finalTotal,
                    });
                  } else {
                    results.failed.push({
                      salesInvoiceId,
                      error: data.message || "Conversion failed",
                    });
                  }
                  return data;
                },
              }),
            }
          );
        } catch (conversionError) {
          results.failed.push({
            salesInvoiceId,
            error: conversionError.message,
          });
        }
      }

      const summary = {
        total: salesInvoiceIds.length,
        successful: results.successful.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
      };
      res.status(200).json({
        success: true,
        message: `Bulk conversion completed: ${summary.successful} successful, ${summary.failed} failed, ${summary.skipped} skipped`,
        data: {
          summary,
          results,
        },
      });
    } catch (error) {
      console.error("❌ Error in bulk invoice conversion:", error);
      res.status(500).json({
        success: false,
        message: "Failed to perform bulk invoice conversion",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Get invoice source tracking (enhanced)
  getSalesInvoiceSourceTracking: async (req, res) => {
    try {
      const {invoiceId} = req.params;

      if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid invoice ID",
        });
      }

      const salesInvoice = await Sale.findById(invoiceId).populate(
        "customer",
        "name mobile email"
      );

      if (!salesInvoice) {
        return res.status(404).json({
          success: false,
          message: "Sales invoice not found",
        });
      }

      // Get the complete tracking chain
      const trackingChain = await salesInvoice.getInvoiceTrackingChain();

      let sourceInfo = {
        salesInvoice: {
          id: salesInvoice._id,
          invoiceNumber: salesInvoice.invoiceNumber,
          invoiceDate: salesInvoice.invoiceDate,
          customer: salesInvoice.customer,
          totalAmount: salesInvoice.totals.finalTotal,
        },
        source: {
          type: "direct_sale",
          description: "Created directly as a sales invoice",
        },
        trackingChain,
        bidirectionalInfo: salesInvoice.invoiceTrackingInfo,
      };

      // Check if this invoice was created from a purchase invoice
      if (
        salesInvoice.sourceInvoiceId &&
        salesInvoice.sourceInvoiceType === "purchase_invoice"
      ) {
        const Purchase = require("../models/Purchase");
        const sourcePurchaseInvoice = await Purchase.findById(
          salesInvoice.sourceInvoiceId
        ).populate("supplier", "name mobile email");

        if (sourcePurchaseInvoice) {
          sourceInfo.source = {
            type: "purchase_invoice",
            description: "Auto-generated from purchase invoice",
            purchaseInvoice: {
              id: sourcePurchaseInvoice._id,
              invoiceNumber: sourcePurchaseInvoice.invoiceNumber,
              invoiceDate: sourcePurchaseInvoice.invoiceDate,
              supplier: sourcePurchaseInvoice.supplier,
              isAutoGenerated: sourcePurchaseInvoice.isAutoGenerated,
              sourceCompanyId: sourcePurchaseInvoice.sourceCompanyId,
            },
          };
        }
      }

      res.status(200).json({
        success: true,
        data: sourceInfo,
        message: "Sales invoice source tracking retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting sales invoice source tracking:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sales invoice source tracking",
        error: error.message,
      });
    }
  },

  getPaymentSummaryWithOverdue: async (req, res) => {
    try {
      const {companyId, dateFrom, dateTo} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      // Build date filter
      const dateFilter = {companyId, status: {$ne: "cancelled"}};
      if (dateFrom || dateTo) {
        dateFilter.invoiceDate = {};
        if (dateFrom) dateFilter.invoiceDate.$gte = new Date(dateFrom);
        if (dateTo) dateFilter.invoiceDate.$lte = new Date(dateTo);
      }

      const today = new Date();
      today.setHours(23, 59, 59, 999);

      // Get comprehensive payment analysis
      const [salesData, overdueSummary, dueTodaySummary] = await Promise.all([
        // Regular sales summary
        Sale.aggregate([
          {$match: dateFilter},
          {
            $group: {
              _id: null,
              totalSales: {$sum: 1},
              totalAmount: {$sum: "$totals.finalTotal"},
              totalPaid: {$sum: "$payment.paidAmount"},
              totalPending: {$sum: "$payment.pendingAmount"},
              paidCount: {
                $sum: {$cond: [{$eq: ["$payment.status", "paid"]}, 1, 0]},
              },
              partialCount: {
                $sum: {$cond: [{$eq: ["$payment.status", "partial"]}, 1, 0]},
              },
              pendingCount: {
                $sum: {$cond: [{$eq: ["$payment.status", "pending"]}, 1, 0]},
              },
            },
          },
        ]),

        // Overdue summary
        Sale.aggregate([
          {
            $match: {
              ...dateFilter,
              "payment.pendingAmount": {$gt: 0},
              "payment.dueDate": {$lt: today},
            },
          },
          {
            $group: {
              _id: null,
              overdueCount: {$sum: 1},
              overdueAmount: {$sum: "$payment.pendingAmount"},
            },
          },
        ]),

        // Due today summary
        Sale.aggregate([
          {
            $match: {
              ...dateFilter,
              "payment.pendingAmount": {$gt: 0},
              "payment.dueDate": {
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
            },
          },
          {
            $group: {
              _id: null,
              dueTodayCount: {$sum: 1},
              dueTodayAmount: {$sum: "$payment.pendingAmount"},
            },
          },
        ]),
      ]);

      const summary = {
        ...(salesData[0] || {
          totalSales: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalPending: 0,
          paidCount: 0,
          partialCount: 0,
          pendingCount: 0,
        }),
        overdueCount: overdueSummary[0]?.overdueCount || 0,
        overdueAmount: overdueSummary[0]?.overdueAmount || 0,
        dueTodayCount: dueTodaySummary[0]?.dueTodayCount || 0,
        dueTodayAmount: dueTodaySummary[0]?.dueTodayAmount || 0,
      };

      res.status(200).json({
        success: true,
        data: {summary},
        message: "Payment summary with overdue analysis retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting payment summary with overdue:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get payment summary",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Convert Sales Order to Invoice (enhanced with bidirectional tracking)
  convertSalesOrderToInvoice: async (req, res) => {
    try {
      const {salesOrderId} = req.params;
      const {convertedBy} = req.body;

      if (!mongoose.Types.ObjectId.isValid(salesOrderId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sales order ID",
        });
      }

      // Import SalesOrder model
      const SalesOrder = require("../models/SalesOrder");

      const salesOrder = await SalesOrder.findById(salesOrderId).populate(
        "customer",
        "name mobile email address"
      );

      if (!salesOrder) {
        return res.status(404).json({
          success: false,
          message: "Sales order not found",
        });
      }

      if (salesOrder.convertedToInvoice) {
        return res.status(400).json({
          success: false,
          message: "Sales order already converted to invoice",
          data: {
            invoiceNumber: salesOrder.invoiceNumber,
            invoiceId: salesOrder.invoiceRef,
          },
        });
      }

      // Set converter info
      salesOrder.convertedBy = convertedBy || req.user?.id || "system";

      // Convert to invoice using the model method
      const invoice = await salesOrder.convertToInvoice();

      res.status(201).json({
        success: true,
        message: "Sales order converted to invoice successfully",
        data: {
          invoice,
          salesOrder: {
            id: salesOrder._id,
            orderNumber: salesOrder.orderNumber,
            convertedToInvoice: true,
            invoiceRef: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
          },
        },
      });
    } catch (error) {
      console.error("❌ Error converting sales order to invoice:", error);
      res.status(500).json({
        success: false,
        message: "Failed to convert sales order to invoice",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Get invoices created from sales orders
  getInvoicesFromSalesOrders: async (req, res) => {
    try {
      const {companyId, page = 1, limit = 10} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Find invoices that have notes indicating they were converted from sales orders
      const invoices = await Sale.find({
        companyId,
        notes: {$regex: /converted from.*sales.*order/i},
      })
        .populate("customer", "name mobile email")
        .sort({createdAt: -1})
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Sale.countDocuments({
        companyId,
        notes: {$regex: /converted from.*sales.*order/i},
      });

      res.status(200).json({
        success: true,
        data: {
          invoices,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
            hasPrev: parseInt(page) > 1,
          },
        },
        message: "Invoices from sales orders retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting invoices from sales orders:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get invoices from sales orders",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Get bidirectional sales analytics
  getBidirectionalSalesAnalytics: async (req, res) => {
    try {
      const {companyId} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const SalesOrder = require("../models/SalesOrder");

      const [
        totalInvoices,
        invoicesFromSalesOrders,
        totalSalesOrders,
        convertedSalesOrders,
        autoGeneratedSalesOrders,
      ] = await Promise.all([
        // Total invoices count
        Sale.countDocuments({companyId}),

        // Invoices created from sales orders
        Sale.countDocuments({
          companyId,
          notes: {$regex: /converted from.*sales.*order/i},
        }),

        // Total sales orders
        SalesOrder.countDocuments({companyId}),

        // Sales orders converted to invoices
        SalesOrder.countDocuments({
          companyId,
          convertedToInvoice: true,
        }),

        // Auto-generated sales orders (from purchase orders)
        SalesOrder.countDocuments({
          companyId,
          isAutoGenerated: true,
        }),
      ]);

      const analytics = {
        invoices: {
          total: totalInvoices,
          fromSalesOrders: invoicesFromSalesOrders,
          directSales: totalInvoices - invoicesFromSalesOrders,
          conversionRate:
            totalSalesOrders > 0
              ? ((invoicesFromSalesOrders / totalSalesOrders) * 100).toFixed(2)
              : 0,
        },
        salesOrders: {
          total: totalSalesOrders,
          converted: convertedSalesOrders,
          autoGenerated: autoGeneratedSalesOrders,
          pending: totalSalesOrders - convertedSalesOrders,
          conversionRate:
            totalSalesOrders > 0
              ? ((convertedSalesOrders / totalSalesOrders) * 100).toFixed(2)
              : 0,
        },
        bidirectionalCoverage: {
          percentage:
            totalInvoices > 0
              ? (
                  ((invoicesFromSalesOrders + autoGeneratedSalesOrders) /
                    totalInvoices) *
                  100
                ).toFixed(2)
              : 0,
          description:
            "Percentage of transactions using bidirectional order system",
        },
      };

      res.status(200).json({
        success: true,
        data: analytics,
        message: "Bidirectional sales analytics retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting bidirectional sales analytics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get bidirectional sales analytics",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Get sales order conversion status
  getSalesOrderConversionStatus: async (req, res) => {
    try {
      const {companyId, salesOrderId} = req.query;

      if (!companyId || !salesOrderId) {
        return res.status(400).json({
          success: false,
          message: "Company ID and Sales Order ID are required",
        });
      }

      const SalesOrder = require("../models/SalesOrder");

      const salesOrder = await SalesOrder.findOne({
        _id: salesOrderId,
        companyId,
      }).populate("customer", "name mobile email");

      if (!salesOrder) {
        return res.status(404).json({
          success: false,
          message: "Sales order not found",
        });
      }

      let invoice = null;
      if (salesOrder.convertedToInvoice && salesOrder.invoiceRef) {
        invoice = await Sale.findById(salesOrder.invoiceRef).select(
          "invoiceNumber invoiceDate totals payment status"
        );
      }

      const conversionStatus = {
        salesOrder: {
          id: salesOrder._id,
          orderNumber: salesOrder.orderNumber,
          orderDate: salesOrder.orderDate,
          customer: salesOrder.customer,
          totalAmount: salesOrder.totals.finalTotal,
          status: salesOrder.status,
        },
        conversion: {
          isConverted: salesOrder.convertedToInvoice,
          convertedAt: salesOrder.convertedAt,
          convertedBy: salesOrder.convertedBy,
          canConvert:
            !salesOrder.convertedToInvoice &&
            ["accepted", "confirmed"].includes(salesOrder.status),
        },
        invoice: invoice
          ? {
              id: invoice._id,
              invoiceNumber: invoice.invoiceNumber,
              invoiceDate: invoice.invoiceDate,
              totalAmount: invoice.totals.finalTotal,
              paymentStatus: invoice.payment.status,
              status: invoice.status,
            }
          : null,
      };

      res.status(200).json({
        success: true,
        data: conversionStatus,
        message: "Sales order conversion status retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting sales order conversion status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sales order conversion status",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Bulk convert sales orders to invoices
  bulkConvertSalesOrdersToInvoices: async (req, res) => {
    try {
      const {salesOrderIds, convertedBy} = req.body;

      if (
        !salesOrderIds ||
        !Array.isArray(salesOrderIds) ||
        salesOrderIds.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Sales order IDs array is required",
        });
      }

      const SalesOrder = require("../models/SalesOrder");
      const results = {
        successful: [],
        failed: [],
        skipped: [],
      };

      for (const salesOrderId of salesOrderIds) {
        try {
          if (!mongoose.Types.ObjectId.isValid(salesOrderId)) {
            results.failed.push({
              salesOrderId,
              error: "Invalid sales order ID",
            });
            continue;
          }

          const salesOrder = await SalesOrder.findById(salesOrderId);

          if (!salesOrder) {
            results.failed.push({
              salesOrderId,
              error: "Sales order not found",
            });
            continue;
          }

          if (salesOrder.convertedToInvoice) {
            results.skipped.push({
              salesOrderId,
              orderNumber: salesOrder.orderNumber,
              reason: "Already converted",
              existingInvoiceNumber: salesOrder.invoiceNumber,
            });
            continue;
          }

          // Set converter info
          salesOrder.convertedBy = convertedBy || "system";

          // Convert to invoice
          const invoice = await salesOrder.convertToInvoice();

          results.successful.push({
            salesOrderId,
            orderNumber: salesOrder.orderNumber,
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            finalTotal: invoice.totals.finalTotal,
          });
        } catch (conversionError) {
          results.failed.push({
            salesOrderId,
            error: conversionError.message,
          });
        }
      }

      const summary = {
        total: salesOrderIds.length,
        successful: results.successful.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
      };
      res.status(200).json({
        success: true,
        message: `Bulk conversion completed: ${summary.successful} successful, ${summary.failed} failed, ${summary.skipped} skipped`,
        data: {
          summary,
          results,
        },
      });
    } catch (error) {
      console.error("❌ Error in bulk conversion:", error);
      res.status(500).json({
        success: false,
        message: "Failed to perform bulk conversion",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Get invoice source tracking
  getInvoiceSourceTracking: async (req, res) => {
    try {
      const {invoiceId} = req.params;

      if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid invoice ID",
        });
      }

      const invoice = await Sale.findById(invoiceId).populate(
        "customer",
        "name mobile email"
      );

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      let sourceInfo = {
        invoice: {
          id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          customer: invoice.customer,
          totalAmount: invoice.totals.finalTotal,
        },
        source: {
          type: "direct_sale",
          description: "Created directly as an invoice",
        },
      };

      // Check if this invoice was created from a sales order
      if (invoice.notes && invoice.notes.includes("Converted from")) {
        const SalesOrder = require("../models/SalesOrder");

        // Try to find the source sales order
        const salesOrder = await SalesOrder.findOne({
          invoiceRef: invoice._id,
          convertedToInvoice: true,
        });

        if (salesOrder) {
          sourceInfo.source = {
            type: "sales_order",
            description: "Converted from sales order",
            salesOrder: {
              id: salesOrder._id,
              orderNumber: salesOrder.orderNumber,
              orderDate: salesOrder.orderDate,
              convertedAt: salesOrder.convertedAt,
              convertedBy: salesOrder.convertedBy,
              isAutoGenerated: salesOrder.isAutoGenerated,
            },
          };

          // Check if the sales order was auto-generated from a purchase order
          if (salesOrder.isAutoGenerated && salesOrder.sourceOrderId) {
            const PurchaseOrder = require("../models/PurchaseOrder");
            const sourcePurchaseOrder = await PurchaseOrder.findById(
              salesOrder.sourceOrderId
            ).populate("supplier", "name mobile");

            if (sourcePurchaseOrder) {
              sourceInfo.source.originalPurchaseOrder = {
                id: sourcePurchaseOrder._id,
                orderNumber: sourcePurchaseOrder.orderNumber,
                orderDate: sourcePurchaseOrder.orderDate,
                supplier: sourcePurchaseOrder.supplier,
                sourceCompany: sourcePurchaseOrder.sourceCompanyId,
              };
              sourceInfo.source.description =
                "Auto-generated from purchase order → sales order → invoice";
            }
          }
        }
      }

      res.status(200).json({
        success: true,
        data: sourceInfo,
        message: "Invoice source tracking retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting invoice source tracking:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get invoice source tracking",
        error: error.message,
      });
    }
  },

  // ==================== 📊 ADMIN ANALYTICS FUNCTIONS ====================

  /**
   * ✅ FIXED: Get all sales invoices for admin (across ALL companies) - NO companyId handling
   */
  getAllSalesInvoicesForAdmin: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 100,
        status,
        paymentStatus,
        dateFrom,
        dateTo,
        companyId: filterCompanyId, // Optional filter for specific company (but DON'T pass as companyId)
        customerId,
        search,
        sortBy = "invoiceDate",
        sortOrder = "desc",
      } = req.query;

      const filter = {};

      // ✅ ONLY apply companyId filter if explicitly requested AND valid
      if (filterCompanyId && mongoose.Types.ObjectId.isValid(filterCompanyId)) {
        filter.companyId = new mongoose.Types.ObjectId(filterCompanyId);
      }

      // Apply other filters (not company-specific)
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

      if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
        filter.customer = new mongoose.Types.ObjectId(customerId);
      }

      // Date range filter
      if (dateFrom || dateTo) {
        filter.invoiceDate = {};
        if (dateFrom) filter.invoiceDate.$gte = new Date(dateFrom);
        if (dateTo) filter.invoiceDate.$lte = new Date(dateTo);
      }

      // Search filter
      if (search) {
        filter.$or = [
          {invoiceNumber: {$regex: search, $options: "i"}},
          {customerMobile: {$regex: search, $options: "i"}},
          {notes: {$regex: search, $options: "i"}},
        ];
      }

      // ✅ Sorting options
      const sortOptions = {};
      const validSortFields = [
        "invoiceDate",
        "invoiceNumber",
        "status",
        "totals.finalTotal",
        "createdAt",
        "companyId", // Add company sorting for admin
      ];

      if (validSortFields.includes(sortBy)) {
        sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
      } else {
        sortOptions.invoiceDate = -1; // Default sort
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // ✅ Execute admin query with enhanced population
      const [invoices, total] = await Promise.all([
        Sale.find(filter)
          .populate("customer", "name mobile phoneNumber email address")
          .populate(
            "companyId",
            "businessName companyName email phoneNumber address gstin code"
          )
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit)),

        Sale.countDocuments(filter),
      ]);

      // ✅ Calculate comprehensive admin statistics
      const [
        adminStats,
        companiesWithInvoices,
        statusBreakdown,
        paymentBreakdown,
        topCompanies,
      ] = await Promise.all([
        // Basic admin stats
        Sale.aggregate([
          {$match: filter},
          {
            $group: {
              _id: null,
              totalInvoices: {$sum: 1},
              totalValue: {$sum: "$totals.finalTotal"},
              totalPaid: {$sum: "$payment.paidAmount"},
              totalPending: {$sum: "$payment.pendingAmount"},
              avgInvoiceValue: {$avg: "$totals.finalTotal"},
            },
          },
        ]),

        // Unique companies
        Sale.distinct("companyId", filter),

        // Status breakdown
        Sale.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$status",
              count: {$sum: 1},
              value: {$sum: "$totals.finalTotal"},
            },
          },
        ]),

        // Payment status breakdown
        Sale.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$payment.status",
              count: {$sum: 1},
              value: {$sum: "$totals.finalTotal"},
              pendingAmount: {$sum: "$payment.pendingAmount"},
            },
          },
        ]),

        // Top companies by invoice count and value
        Sale.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$companyId",
              invoiceCount: {$sum: 1},
              totalValue: {$sum: "$totals.finalTotal"},
              avgValue: {$avg: "$totals.finalTotal"},
            },
          },
          {$sort: {totalValue: -1}},
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
      ]);

      // ✅ Transform invoices for consistent API response
      const transformedInvoices = invoices.map((invoice) => ({
        id: invoice._id,
        invoiceNo: invoice.invoiceNumber,
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.invoiceDate,
        invoiceDate: invoice.invoiceDate,

        // ✅ Enhanced company info for admin
        companyId: invoice.companyId?._id,
        companyName:
          invoice.companyId?.businessName ||
          invoice.companyId?.companyName ||
          "Unknown Company",
        companyEmail: invoice.companyId?.email,
        companyPhone: invoice.companyId?.phoneNumber,
        companyGstin: invoice.companyId?.gstin,
        companyCode: invoice.companyId?.code,

        // Customer info
        customerId: invoice.customer?._id,
        customerName: invoice.customer?.name || "Unknown Customer",
        customerMobile:
          invoice.customer?.mobile ||
          invoice.customer?.phoneNumber ||
          invoice.customerMobile,
        customerEmail: invoice.customer?.email,

        // Financial details
        amount: invoice.totals?.finalTotal || 0,
        finalTotal: invoice.totals?.finalTotal || 0,
        subtotal: invoice.totals?.subtotal || 0,
        totalTax: invoice.totals?.totalTax || 0,
        paidAmount: invoice.payment?.paidAmount || 0,
        pendingAmount: invoice.payment?.pendingAmount || 0,

        // Status info
        status: invoice.status,
        paymentStatus: invoice.payment?.status || "pending",
        paymentMethod: invoice.payment?.method || "cash",

        // ✅ Enhanced admin tracking
        isAutoGenerated: invoice.isAutoGenerated || false,
        isCrossCompanyLinked: invoice.isCrossCompanyLinked || false,
        convertedFromSalesOrder: invoice.convertedFromSalesOrder || false,
        autoGeneratedPurchaseInvoice:
          invoice.autoGeneratedPurchaseInvoice || false,

        // Dates
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,

        // Full invoice object
        ...invoice.toObject(),
      }));

      // ✅ Build comprehensive admin response
      const baseStats = adminStats[0] || {
        totalInvoices: 0,
        totalValue: 0,
        totalPaid: 0,
        totalPending: 0,
        avgInvoiceValue: 0,
      };

      const responseData = {
        success: true,
        data: {
          // ✅ Multiple data keys for frontend compatibility
          salesInvoices: transformedInvoices,
          invoices: transformedInvoices,
          sales: transformedInvoices,
          data: transformedInvoices,

          count: transformedInvoices.length,

          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalInvoices: total,
            totalSales: total,
            limit: parseInt(limit),
            hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
            hasPrev: parseInt(page) > 1,
          },

          // ✅ Comprehensive admin statistics
          adminStats: {
            ...baseStats,
            totalCompanies: companiesWithInvoices.length,
            activeCompanies: companiesWithInvoices.length,

            statusBreakdown: statusBreakdown.reduce((acc, item) => {
              acc[item._id] = {count: item.count, value: item.value};
              return acc;
            }, {}),

            paymentBreakdown: paymentBreakdown.reduce((acc, item) => {
              acc[item._id || "unknown"] = {
                count: item.count,
                value: item.value,
                pendingAmount: item.pendingAmount || 0,
              };
              return acc;
            }, {}),

            topCompanies: topCompanies.map((company) => ({
              companyId: company._id,
              companyName: company.company?.businessName || "Unknown",
              invoiceCount: company.invoiceCount,
              totalValue: company.totalValue,
              avgValue: company.avgValue,
            })),
          },

          summary: {
            totalInvoices: total,
            totalValue: baseStats.totalValue,
            totalPaid: baseStats.totalPaid,
            totalPending: baseStats.totalPending,
            activeCompanies: companiesWithInvoices.length,
            avgInvoiceValue: baseStats.avgInvoiceValue,
          },

          // ✅ Clear admin metadata
          adminInfo: {
            isAdminAccess: true,
            crossAllCompanies: !filterCompanyId,
            filteredByCompany: !!filterCompanyId,
            filterCompanyId: filterCompanyId || null,
            companiesIncluded: companiesWithInvoices.length,
          },
        },
        message: filterCompanyId
          ? `Found ${transformedInvoices.length} invoices for company ${filterCompanyId}`
          : `Found ${transformedInvoices.length} invoices across ${companiesWithInvoices.length} companies`,
      };

      res.status(200).json(responseData);
    } catch (error) {
      console.error("❌ Error fetching admin sales invoices:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch all sales invoices for admin",
        error: error.message,
        data: {
          salesInvoices: [],
          invoices: [],
          sales: [],
          data: [],
          count: 0,
          pagination: {},
          adminStats: {},
          summary: {},
        },
      });
    }
  },

  /**
   * ✅ NEW: Get admin bidirectional sales analytics
   */
  getAdminBidirectionalSalesAnalytics: async (req, res) => {
    try {
      const {dateFrom, dateTo, companyId} = req.query;

      const filter = {};
      if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
        filter.companyId = companyId;
      }
      if (dateFrom || dateTo) {
        filter.invoiceDate = {};
        if (dateFrom) filter.invoiceDate.$gte = new Date(dateFrom);
        if (dateTo) filter.invoiceDate.$lte = new Date(dateTo);
      }

      // Get bidirectional invoices
      const bidirectionalFilter = {
        ...filter,
        $or: [
          {autoGeneratedPurchaseInvoice: true},
          {convertedFromSalesOrder: true},
          {isAutoGenerated: true},
          {isCrossCompanyLinked: true},
        ],
      };

      const [
        totalBidirectionalInvoices,
        totalBidirectionalValue,
        companiesUsingBidirectional,
        sourceTypeBreakdown,
        crossCompanyMapping,
        conversionRates,
      ] = await Promise.all([
        Sale.countDocuments(bidirectionalFilter),

        Sale.aggregate([
          {$match: bidirectionalFilter},
          {$group: {_id: null, total: {$sum: "$totals.finalTotal"}}},
        ]),

        Sale.distinct("companyId", bidirectionalFilter),

        Sale.aggregate([
          {$match: bidirectionalFilter},
          {
            $group: {
              _id: {
                $cond: [
                  {$eq: ["$isAutoGenerated", true]},
                  "auto_generated",
                  {
                    $cond: [
                      {$eq: ["$convertedFromSalesOrder", true]},
                      "from_sales_order",
                      {
                        $cond: [
                          {$eq: ["$autoGeneratedPurchaseInvoice", true]},
                          "with_purchase_invoice",
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

        Sale.aggregate([
          {
            $match: {
              ...filter,
              isCrossCompanyLinked: true,
              targetCompanyId: {$exists: true, $ne: null},
            },
          },
          {
            $group: {
              _id: {
                sourceCompany: "$companyId",
                targetCompany: "$targetCompanyId",
              },
              count: {$sum: 1},
              value: {$sum: "$totals.finalTotal"},
            },
          },
          {$sort: {count: -1}},
          {$limit: 10},
        ]),

        Sale.aggregate([
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
                        {$eq: ["$autoGeneratedPurchaseInvoice", true]},
                        {$eq: ["$convertedFromSalesOrder", true]},
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
          totalBidirectionalInvoices,
          totalBidirectionalValue: totalBidirectionalValue[0]?.total || 0,
          companiesUsingBidirectional: companiesUsingBidirectional.length,
          bidirectionalRevenue: totalBidirectionalValue[0]?.total || 0,
          sourceTypeBreakdown: sourceTypeBreakdown.reduce((acc, item) => {
            acc[item._id] = {count: item.count, value: item.value};
            return acc;
          }, {}),
          crossCompanyMapping: crossCompanyMapping.map((item) => ({
            sourceCompanyId: item._id.sourceCompany,
            targetCompanyId: item._id.targetCompany,
            count: item.count,
            value: item.value,
          })),
          conversionRates: {
            bidirectionalPercentage: parseFloat(bidirectionalPercentage),
            totalInvoices: conversionData.total,
            bidirectionalInvoices: conversionData.bidirectional,
          },
        },
        message: "Admin bidirectional sales analytics fetched successfully",
      });
    } catch (error) {
      console.error(
        "❌ Error fetching admin bidirectional sales analytics:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to fetch admin bidirectional sales analytics",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get admin payment analytics
   */
  getAdminPaymentAnalytics: async (req, res) => {
    try {
      const {dateFrom, dateTo, companyId} = req.query;

      const filter = {};
      if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
        filter.companyId = companyId;
      }
      if (dateFrom || dateTo) {
        filter.invoiceDate = {};
        if (dateFrom) filter.invoiceDate.$gte = new Date(dateFrom);
        if (dateTo) filter.invoiceDate.$lte = new Date(dateTo);
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
        Sale.aggregate([
          {$match: filter},
          {$group: {_id: null, total: {$sum: "$payment.paidAmount"}}},
        ]),

        Sale.aggregate([
          {$match: filter},
          {$group: {_id: null, total: {$sum: "$payment.pendingAmount"}}},
        ]),

        Sale.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$payment.method",
              count: {$sum: 1},
              totalAmount: {$sum: "$payment.paidAmount"},
            },
          },
        ]),

        Sale.aggregate([
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

        Sale.aggregate([
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

        Sale.aggregate([
          {$match: filter},
          {
            $group: {
              _id: {
                year: {$year: "$invoiceDate"},
                month: {$month: "$invoiceDate"},
              },
              totalPaid: {$sum: "$payment.paidAmount"},
              totalPending: {$sum: "$payment.pendingAmount"},
              invoiceCount: {$sum: 1},
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
            invoiceCount: item.invoiceCount,
          })),
        },
        message: "Admin payment analytics fetched successfully",
      });
    } catch (error) {
      console.error("❌ Error fetching admin payment analytics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch admin payment analytics",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get admin customer analytics
   */
  getAdminCustomerAnalytics: async (req, res) => {
    try {
      const {dateFrom, dateTo, companyId, limit = 10} = req.query;

      const filter = {};
      if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
        filter.companyId = companyId;
      }
      if (dateFrom || dateTo) {
        filter.invoiceDate = {};
        if (dateFrom) filter.invoiceDate.$gte = new Date(dateFrom);
        if (dateTo) filter.invoiceDate.$lte = new Date(dateTo);
      }

      const [
        totalCustomers,
        activeCustomers,
        topCustomers,
        customerGrowth,
        customerSegmentation,
      ] = await Promise.all([
        Sale.distinct("customer", filter).then((customers) => customers.length),

        Sale.aggregate([
          {
            $match: {
              ...filter,
              invoiceDate: {
                $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          },
          {$group: {_id: "$customer"}},
          {$count: "activeCustomers"},
        ]),

        Sale.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$customer",
              totalPurchases: {$sum: "$totals.finalTotal"},
              invoiceCount: {$sum: 1},
              lastPurchaseDate: {$max: "$invoiceDate"},
              avgInvoiceValue: {$avg: "$totals.finalTotal"},
            },
          },
          {$sort: {totalPurchases: -1}},
          {$limit: parseInt(limit)},
          {
            $lookup: {
              from: "parties",
              localField: "_id",
              foreignField: "_id",
              as: "customer",
            },
          },
          {$unwind: {path: "$customer", preserveNullAndEmptyArrays: true}},
        ]),

        Sale.aggregate([
          {$match: filter},
          {
            $group: {
              _id: {
                year: {$year: "$invoiceDate"},
                month: {$month: "$invoiceDate"},
                customer: "$customer",
              },
            },
          },
          {
            $group: {
              _id: {year: "$_id.year", month: "$_id.month"},
              uniqueCustomers: {$sum: 1},
            },
          },
          {$sort: {"_id.year": -1, "_id.month": -1}},
          {$limit: 12},
        ]),

        Sale.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$customer",
              totalSpent: {$sum: "$totals.finalTotal"},
              invoiceCount: {$sum: 1},
            },
          },
          {
            $bucket: {
              groupBy: "$totalSpent",
              boundaries: [0, 10000, 50000, 100000, 500000, Infinity],
              default: "Other",
              output: {
                count: {$sum: 1},
                customers: {$push: "$_id"},
              },
            },
          },
        ]),
      ]);

      res.status(200).json({
        success: true,
        data: {
          totalCustomers,
          activeCustomers: activeCustomers[0]?.activeCustomers || 0,
          topCustomers: topCustomers.map((item) => ({
            customerId: item._id,
            customerName: item.customer?.name || "Unknown",
            customerEmail: item.customer?.email,
            customerPhone: item.customer?.mobile || item.customer?.phoneNumber,
            totalPurchases: item.totalPurchases,
            invoiceCount: item.invoiceCount,
            lastPurchaseDate: item.lastPurchaseDate,
            avgInvoiceValue: item.avgInvoiceValue,
          })),
          customerGrowth: customerGrowth.map((item) => ({
            year: item._id.year,
            month: item._id.month,
            uniqueCustomers: item.uniqueCustomers,
          })),
          customerSegmentation: customerSegmentation.reduce((acc, item) => {
            const key = item._id === "Other" ? "other" : `range_${item._id}`;
            acc[key] = {
              count: item.count,
              customerIds: item.customers,
            };
            return acc;
          }, {}),
        },
        message: "Admin customer analytics fetched successfully",
      });
    } catch (error) {
      console.error("❌ Error fetching admin customer analytics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch admin customer analytics",
        error: error.message,
      });
    }
  },

  // ==================== 📊 ENHANCED REPORTING FUNCTIONS ====================

  /**
   * ✅ NEW: Get bidirectional summary report
   */
  getBidirectionalSummaryReport: async (req, res) => {
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
        filter.invoiceDate = {};
        if (dateFrom) filter.invoiceDate.$gte = new Date(dateFrom);
        if (dateTo) filter.invoiceDate.$lte = new Date(dateTo);
      }

      const summary = await Sale.aggregate([
        {$match: filter},
        {
          $group: {
            _id: null,
            totalInvoices: {$sum: 1},
            autoGeneratedInvoices: {
              $sum: {$cond: ["$isAutoGenerated", 1, 0]},
            },
            manualInvoices: {
              $sum: {$cond: [{$not: "$isAutoGenerated"}, 1, 0]},
            },
            invoicesFromSalesOrders: {
              $sum: {$cond: ["$convertedFromSalesOrder", 1, 0]},
            },
            invoicesWithGeneratedPurchase: {
              $sum: {$cond: ["$autoGeneratedPurchaseInvoice", 1, 0]},
            },
            crossCompanyInvoices: {
              $sum: {$cond: ["$isCrossCompanyLinked", 1, 0]},
            },
            totalValue: {$sum: "$totals.finalTotal"},
            autoGeneratedValue: {
              $sum: {$cond: ["$isAutoGenerated", "$totals.finalTotal", 0]},
            },
            manualValue: {
              $sum: {
                $cond: [{$not: "$isAutoGenerated"}, "$totals.finalTotal", 0],
              },
            },
          },
        },
        {
          $project: {
            totalInvoices: 1,
            autoGeneratedInvoices: 1,
            manualInvoices: 1,
            invoicesFromSalesOrders: 1,
            invoicesWithGeneratedPurchase: 1,
            crossCompanyInvoices: 1,
            totalValue: 1,
            autoGeneratedValue: 1,
            manualValue: 1,
            autoGenerationRate: {
              $multiply: [
                {$divide: ["$autoGeneratedInvoices", "$totalInvoices"]},
                100,
              ],
            },
            bidirectionalCoverage: {
              $multiply: [
                {
                  $divide: [
                    {
                      $add: [
                        "$invoicesFromSalesOrders",
                        "$invoicesWithGeneratedPurchase",
                        "$autoGeneratedInvoices",
                      ],
                    },
                    "$totalInvoices",
                  ],
                },
                100,
              ],
            },
            crossCompanyRate: {
              $multiply: [
                {$divide: ["$crossCompanyInvoices", "$totalInvoices"]},
                100,
              ],
            },
            purchaseGenerationRate: {
              $multiply: [
                {$divide: ["$invoicesWithGeneratedPurchase", "$totalInvoices"]},
                100,
              ],
            },
          },
        },
      ]);

      res.status(200).json({
        success: true,
        data: summary[0] || {
          totalInvoices: 0,
          autoGeneratedInvoices: 0,
          manualInvoices: 0,
          invoicesFromSalesOrders: 0,
          invoicesWithGeneratedPurchase: 0,
          crossCompanyInvoices: 0,
          totalValue: 0,
          autoGeneratedValue: 0,
          manualValue: 0,
          autoGenerationRate: 0,
          bidirectionalCoverage: 0,
          crossCompanyRate: 0,
          purchaseGenerationRate: 0,
        },
        message: "Bidirectional summary report retrieved successfully",
      });
    } catch (error) {
      console.error("❌ Error getting bidirectional summary report:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get bidirectional summary report",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Export bidirectional sales data as CSV
   */
  exportBidirectionalCSV: async (req, res) => {
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
        filter.invoiceDate = {};
        if (dateFrom) filter.invoiceDate.$gte = new Date(dateFrom);
        if (dateTo) filter.invoiceDate.$lte = new Date(dateTo);
      }

      // Add bidirectional filter
      filter.$or = [
        {isAutoGenerated: true},
        {convertedFromSalesOrder: true},
        {autoGeneratedPurchaseInvoice: true},
        {isCrossCompanyLinked: true},
      ];

      const sales = await Sale.find(filter)
        .populate("customer", "name mobile email")
        .populate("companyId", "businessName")
        .sort({invoiceDate: -1})
        .limit(10000);

      const csvHeaders = [
        "Invoice Number",
        "Invoice Date",
        "Company",
        "Customer Name",
        "Customer Mobile",
        "Total Amount",
        "Payment Status",
        "Is Auto Generated",
        "Generated From",
        "Converted From Sales Order",
        "Has Generated Purchase Invoice",
        "Purchase Invoice Number",
        "Is Cross Company Linked",
        "Target Company ID",
        "Source Company ID",
        "Created At",
      ];

      const csvRows = sales.map((sale) => [
        sale.invoiceNumber,
        sale.invoiceDate.toISOString().split("T")[0],
        sale.companyId?.businessName || "",
        sale.customer?.name || "",
        sale.customer?.mobile || sale.customerMobile || "",
        sale.totals?.finalTotal || 0,
        sale.payment?.status || "pending",
        sale.isAutoGenerated ? "Yes" : "No",
        sale.generatedFrom || "manual",
        sale.convertedFromSalesOrder ? "Yes" : "No",
        sale.autoGeneratedPurchaseInvoice ? "Yes" : "No",
        sale.purchaseInvoiceNumber || "",
        sale.isCrossCompanyLinked ? "Yes" : "No",
        sale.targetCompanyId || "",
        sale.sourceCompanyId || "",
        sale.createdAt.toISOString().split("T")[0],
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map((row) => row.map((field) => `"${field}"`).join(","))
        .join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="bidirectional-sales-${Date.now()}.csv"`
      );
      res.send(csvContent);
    } catch (error) {
      console.error("❌ Error exporting bidirectional CSV:", error);
      res.status(500).json({
        success: false,
        message: "Failed to export bidirectional sales data",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get enhanced payment summary
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

      const Sale = require("../models/Sale");
      const mongoose = require("mongoose");

      const filter = {status: {$ne: "cancelled"}};

      // ✅ Handle admin vs company-specific access
      if (companyId !== "admin") {
        if (!mongoose.Types.ObjectId.isValid(companyId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid Company ID format",
          });
        }
        filter.companyId = new mongoose.Types.ObjectId(companyId);
      }

      // Add date filters if provided
      if (dateFrom || dateTo) {
        filter.invoiceDate = {};
        if (dateFrom) filter.invoiceDate.$gte = new Date(dateFrom);
        if (dateTo) filter.invoiceDate.$lte = new Date(dateTo);
      }

      const [
        paymentSummary,
        invoicesByStatus,
        paymentMethods,
        overdueInvoices,
      ] = await Promise.all([
        // Payment summary
        Sale.aggregate([
          {$match: filter},
          {
            $group: {
              _id: null,
              totalInvoices: {$sum: 1},
              totalAmount: {$sum: "$totals.finalTotal"},
              totalPaid: {$sum: "$payment.paidAmount"},
              totalPending: {$sum: "$payment.pendingAmount"},
              paidCount: {
                $sum: {$cond: [{$eq: ["$payment.status", "paid"]}, 1, 0]},
              },
              partialCount: {
                $sum: {$cond: [{$eq: ["$payment.status", "partial"]}, 1, 0]},
              },
              pendingCount: {
                $sum: {$cond: [{$eq: ["$payment.status", "pending"]}, 1, 0]},
              },
            },
          },
        ]),

        // Invoices by status
        Sale.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$payment.status",
              count: {$sum: 1},
              amount: {$sum: "$totals.finalTotal"},
            },
          },
        ]),

        // Payment methods breakdown
        Sale.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$payment.method",
              count: {$sum: 1},
              amount: {$sum: "$payment.paidAmount"},
            },
          },
        ]),

        // Overdue invoices
        Sale.find({
          ...filter,
          "payment.dueDate": {$lt: new Date()},
          "payment.pendingAmount": {$gt: 0},
        }).countDocuments(),
      ]);

      const summary = {
        ...(paymentSummary[0] || {
          totalInvoices: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalPending: 0,
          paidCount: 0,
          partialCount: 0,
          pendingCount: 0,
        }),
        overdueCount: overdueInvoices,
        invoicesByStatus: invoicesByStatus.reduce((acc, item) => {
          acc[item._id || "unknown"] = {count: item.count, amount: item.amount};
          return acc;
        }, {}),
        paymentMethods: paymentMethods.reduce((acc, item) => {
          acc[item._id || "cash"] = {count: item.count, amount: item.amount};
          return acc;
        }, {}),
      };

      res.status(200).json({
        success: true,
        data: summary,
        message: "Enhanced payment summary retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting enhanced payment summary:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get enhanced payment summary",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get sales invoice for printing - Enhanced version
   */
  getSalesInvoiceForPrint: async (req, res) => {
    try {
      const {id} = req.params;
      const {format = "a4", template = "standard"} = req.query;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sales invoice ID format",
        });
      }

      // Get sales invoice with populated data
      const sale = await Sale.findById(id)
        .populate("customer", "name mobile email address gstNumber")
        .populate(
          "companyId",
          "businessName gstin address phoneNumber email logo"
        )
        .populate("items.itemRef", "name code hsnCode unit")
        .lean();

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: "Sales invoice not found",
        });
      }

      // Transform data for printing
      const invoiceData = {
        company: {
          name: sale.companyId?.businessName || "Your Company",
          gstin: sale.companyId?.gstin || "",
          address: sale.companyId?.address || "",
          phone: sale.companyId?.phoneNumber || "",
          email: sale.companyId?.email || "",
          // ✅ Handle logo safely
          logo:
            sale.companyId?.logo?.base64 &&
            sale.companyId.logo.base64.trim() !== ""
              ? sale.companyId.logo.base64
              : null,
        },
        customer: {
          name: sale.customer?.name || sale.customerName || "Unknown Customer",
          address: sale.customer?.address || sale.customerAddress || "",
          mobile: sale.customer?.mobile || sale.customerMobile || "",
          email: sale.customer?.email || sale.customerEmail || "",
          gstin: sale.customer?.gstNumber || sale.customerGstNumber || "",
        },
        invoice: {
          id: sale._id,
          invoiceNumber: sale.invoiceNumber,
          invoiceDate: sale.invoiceDate,
          dueDate: sale.dueDate || sale.payment?.dueDate,
          status: sale.status,
          notes: sale.notes || "",
          terms: sale.termsAndConditions || "",
        },
        items: (sale.items || []).map((item, index) => ({
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
          subtotal: sale.totals?.subtotal || 0,
          totalTax: sale.totals?.totalTax || 0,
          totalCGST: sale.totals?.totalCGST || 0,
          totalSGST: sale.totals?.totalSGST || 0,
          totalIGST: sale.totals?.totalIGST || 0,
          totalDiscount: sale.totals?.totalDiscount || 0,
          roundOff: sale.totals?.roundOff || 0,
          finalTotal: sale.totals?.finalTotal || 0,
        },
        payment: {
          method: sale.payment?.method || "cash",
          paidAmount: sale.payment?.paidAmount || 0,
          pendingAmount: sale.payment?.pendingAmount || 0,
          status: sale.payment?.status || "pending",
          terms: sale.termsAndConditions || "",
        },
        meta: {
          format,
          template,
          printDate: new Date(),
          isSalesInvoice: true,
          isGSTInvoice: sale.gstEnabled,
        },
      };

      res.json({
        success: true,
        data: invoiceData,
        message: "Sales invoice data prepared for printing",
      });
    } catch (error) {
      console.error("❌ Error getting sales invoice for print:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sales invoice for printing",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get sales receipt for printing
   */
  getSalesReceiptForPrint: async (req, res) => {
    try {
      const {id} = req.params;
      const {format = "thermal", template = "receipt"} = req.query;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sales invoice ID format",
        });
      }

      const sale = await Sale.findById(id)
        .populate("customer", "name mobile")
        .populate("companyId", "businessName address phoneNumber")
        .lean();

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: "Sales invoice not found",
        });
      }

      // Transform data for receipt printing
      const receiptData = {
        store: {
          name: sale.companyId?.businessName || "Your Store",
          address: sale.companyId?.address || "",
          phone: sale.companyId?.phoneNumber || "",
        },
        transaction: {
          receiptNo: sale.invoiceNumber,
          date: sale.invoiceDate,
          time: sale.createdAt,
          cashier: sale.createdBy || "System",
        },
        customer: {
          name: sale.customer?.name || "Walk-in Customer",
          mobile: sale.customer?.mobile || sale.customerMobile || "",
        },
        items: (sale.items || []).map((item, index) => ({
          name: item.itemName?.substring(0, 20) || `Item ${index + 1}`,
          qty: item.quantity || 1,
          rate: item.pricePerUnit || 0,
          amount: item.amount || 0,
        })),
        totals: {
          subtotal: sale.totals?.subtotal || 0,
          tax: sale.totals?.totalTax || 0,
          discount: sale.totals?.totalDiscount || 0,
          total: sale.totals?.finalTotal || 0,
        },
        payment: {
          method: sale.payment?.method || "cash",
          paid: sale.payment?.paidAmount || 0,
          change: Math.max(
            0,
            (sale.payment?.paidAmount || 0) - (sale.totals?.finalTotal || 0)
          ),
        },
        meta: {
          format,
          template,
          printDate: new Date(),
          isReceipt: true,
          width: format === "thermal" ? 58 : 80, // mm
        },
      };

      res.json({
        success: true,
        data: receiptData,
        message: "Sales receipt data prepared for printing",
      });
    } catch (error) {
      console.error("❌ Error getting sales receipt for print:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sales receipt for printing",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get sales invoice for email/PDF generation
   */
  getSalesInvoiceForEmail: async (req, res) => {
    try {
      const {id} = req.params;
      const {includePaymentLink = false, template = "professional"} = req.query;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sales invoice ID format",
        });
      }

      const sale = await Sale.findById(id)
        .populate("customer", "name mobile email address gstNumber")
        .populate(
          "companyId",
          "businessName gstin address phoneNumber email logo website"
        )
        .populate("items.itemRef", "name code hsnCode unit")
        .lean();

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: "Sales invoice not found",
        });
      }

      // Enhanced data for email template
      const emailData = {
        company: {
          name: sale.companyId?.businessName || "Your Company",
          gstin: sale.companyId?.gstin || "",
          address: sale.companyId?.address || "",
          phone: sale.companyId?.phoneNumber || "",
          email: sale.companyId?.email || "",
          website: sale.companyId?.website || "",
          logo: sale.companyId?.logo?.base64 || null,
        },
        customer: {
          name: sale.customer?.name || "Customer",
          email: sale.customer?.email || "",
          mobile: sale.customer?.mobile || sale.customerMobile || "",
          address: sale.customer?.address || "",
          gstin: sale.customer?.gstNumber || "",
        },
        invoice: {
          id: sale._id,
          invoiceNumber: sale.invoiceNumber,
          invoiceDate: sale.invoiceDate,
          dueDate: sale.payment?.dueDate,
          status: sale.status,
          paymentStatus: sale.payment?.status,
          notes: sale.notes || "",
          terms: sale.termsAndConditions || "",
        },
        items: (sale.items || []).map((item, index) => ({
          srNo: index + 1,
          name: item.itemName || `Item ${index + 1}`,
          description: item.description || "",
          hsnCode: item.hsnCode || "",
          quantity: item.quantity || 1,
          unit: item.unit || "PCS",
          rate: item.pricePerUnit || 0,
          discount: item.discountAmount || 0,
          taxableAmount: item.taxableAmount || 0,
          taxRate: item.taxRate || 0,
          cgst: item.cgstAmount || 0,
          sgst: item.sgstAmount || 0,
          igst: item.igstAmount || 0,
          totalTax: item.totalTaxAmount || 0,
          amount: item.amount || 0,
        })),
        totals: {
          subtotal: sale.totals?.subtotal || 0,
          totalDiscount: sale.totals?.totalDiscount || 0,
          taxableAmount: sale.totals?.totalTaxableAmount || 0,
          totalCGST: sale.totals?.totalCGST || 0,
          totalSGST: sale.totals?.totalSGST || 0,
          totalIGST: sale.totals?.totalIGST || 0,
          totalTax: sale.totals?.totalTax || 0,
          roundOff: sale.totals?.roundOff || 0,
          finalTotal: sale.totals?.finalTotal || 0,
        },
        payment: {
          method: sale.payment?.method || "cash",
          paidAmount: sale.payment?.paidAmount || 0,
          pendingAmount: sale.payment?.pendingAmount || 0,
          status: sale.payment?.status || "pending",
          dueDate: sale.payment?.dueDate,
          creditDays: sale.payment?.creditDays || 0,
        },
        paymentLink:
          includePaymentLink === "true" && sale.payment?.pendingAmount > 0
            ? `${process.env.FRONTEND_URL}/pay/${sale._id}`
            : null,
        meta: {
          template,
          generatedDate: new Date(),
          isEmailVersion: true,
          isGSTInvoice: sale.gstEnabled,
          hasLogo: !!sale.companyId?.logo?.base64,
        },
      };

      res.json({
        success: true,
        data: emailData,
        message: "Sales invoice data prepared for email",
      });
    } catch (error) {
      console.error("❌ Error getting sales invoice for email:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sales invoice for email",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Generate and download sales invoice PDF
   */
  downloadSalesInvoicePDF: async (req, res) => {
    try {
      const {id} = req.params;
      const {template = "standard", format = "a4"} = req.query;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sales invoice ID format",
        });
      }

      const sale = await Sale.findById(id)
        .populate("customer", "name mobile email address gstNumber")
        .populate(
          "companyId",
          "businessName gstin address phoneNumber email logo"
        )
        .lean();

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: "Sales invoice not found",
        });
      }

      // Set appropriate headers for PDF download
      const filename = `invoice-${sale.invoiceNumber || sale._id}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      // Return invoice data with PDF metadata
      // Note: Actual PDF generation should be handled by frontend or a PDF service
      res.json({
        success: true,
        data: {
          filename,
          invoiceNumber: sale.invoiceNumber,
          customerName: sale.customer?.name || "Customer",
          amount: sale.totals?.finalTotal || 0,
          downloadUrl: `/api/sales/${id}/print?template=${template}&format=pdf`,
        },
        message: "PDF download initiated",
        action: "download_pdf",
      });
    } catch (error) {
      console.error("❌ Error generating PDF:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate PDF",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get multiple sales invoices for bulk printing
   */
  getBulkSalesInvoicesForPrint: async (req, res) => {
    try {
      const {ids} = req.body; // Array of invoice IDs
      const {format = "a4", template = "standard"} = req.query;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invoice IDs array is required",
        });
      }

      // Validate all IDs
      const invalidIds = ids.filter(
        (id) => !mongoose.Types.ObjectId.isValid(id)
      );
      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid invoice ID format",
          invalidIds,
        });
      }

      // Get all sales invoices
      const sales = await Sale.find({_id: {$in: ids}})
        .populate("customer", "name mobile email address gstNumber")
        .populate(
          "companyId",
          "businessName gstin address phoneNumber email logo"
        )
        .populate("items.itemRef", "name code hsnCode unit")
        .lean();

      if (sales.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No sales invoices found",
        });
      }

      // Transform each invoice for printing
      const bulkInvoiceData = sales.map((sale) => ({
        company: {
          name: sale.companyId?.businessName || "Your Company",
          gstin: sale.companyId?.gstin || "",
          address: sale.companyId?.address || "",
          phone: sale.companyId?.phoneNumber || "",
          email: sale.companyId?.email || "",
          logo: sale.companyId?.logo?.base64 || null,
        },
        customer: {
          name: sale.customer?.name || "Customer",
          address: sale.customer?.address || "",
          mobile: sale.customer?.mobile || sale.customerMobile || "",
          email: sale.customer?.email || "",
          gstin: sale.customer?.gstNumber || "",
        },
        invoice: {
          id: sale._id,
          invoiceNumber: sale.invoiceNumber,
          invoiceDate: sale.invoiceDate,
          dueDate: sale.payment?.dueDate,
          status: sale.status,
          notes: sale.notes || "",
          terms: sale.termsAndConditions || "",
        },
        items: (sale.items || []).map((item, index) => ({
          srNo: index + 1,
          name: item.itemName || `Item ${index + 1}`,
          hsnCode: item.hsnCode || "",
          quantity: item.quantity || 1,
          unit: item.unit || "PCS",
          rate: item.pricePerUnit || 0,
          taxRate: item.taxRate || 0,
          cgst: item.cgstAmount || 0,
          sgst: item.sgstAmount || 0,
          igst: item.igstAmount || 0,
          amount: item.amount || 0,
        })),
        totals: {
          subtotal: sale.totals?.subtotal || 0,
          totalTax: sale.totals?.totalTax || 0,
          totalCGST: sale.totals?.totalCGST || 0,
          totalSGST: sale.totals?.totalSGST || 0,
          totalIGST: sale.totals?.totalIGST || 0,
          totalDiscount: sale.totals?.totalDiscount || 0,
          roundOff: sale.totals?.roundOff || 0,
          finalTotal: sale.totals?.finalTotal || 0,
        },
        payment: {
          method: sale.payment?.method || "cash",
          paidAmount: sale.payment?.paidAmount || 0,
          pendingAmount: sale.payment?.pendingAmount || 0,
          status: sale.payment?.status || "pending",
        },
      }));

      res.json({
        success: true,
        data: {
          invoices: bulkInvoiceData,
          count: bulkInvoiceData.length,
          requestedCount: ids.length,
          notFound: ids.length - bulkInvoiceData.length,
          meta: {
            format,
            template,
            printDate: new Date(),
            isBulkPrint: true,
          },
        },
        message: `${bulkInvoiceData.length} sales invoices prepared for bulk printing`,
      });
    } catch (error) {
      console.error("❌ Error getting bulk sales invoices for print:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get bulk sales invoices for printing",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get sales invoice for QR code payment
   */
  getSalesInvoiceForQRPayment: async (req, res) => {
    try {
      const {id} = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sales invoice ID format",
        });
      }

      const sale = await Sale.findById(id)
        .populate("customer", "name mobile")
        .populate("companyId", "businessName")
        .lean();

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: "Sales invoice not found",
        });
      }

      if (sale.payment?.status === "paid") {
        return res.status(400).json({
          success: false,
          message: "Invoice is already paid",
        });
      }

      // Generate payment data for QR code
      const paymentData = {
        invoiceId: sale._id,
        invoiceNumber: sale.invoiceNumber,
        companyName: sale.companyId?.businessName || "Company",
        customerName: sale.customer?.name || "Customer",
        amount: sale.payment?.pendingAmount || sale.totals?.finalTotal || 0,
        dueDate: sale.payment?.dueDate,
        // UPI payment string format
        upiString: `upi://pay?pa=${
          process.env.UPI_ID || "merchant@upi"
        }&pn=${encodeURIComponent(
          sale.companyId?.businessName || "Company"
        )}&am=${
          sale.payment?.pendingAmount || sale.totals?.finalTotal || 0
        }&cu=INR&tn=${encodeURIComponent(
          `Payment for Invoice ${sale.invoiceNumber}`
        )}`,
        paymentUrl: `${process.env.FRONTEND_URL}/pay/${sale._id}`,
        qrSize: 256,
        meta: {
          generatedAt: new Date(),
          expiresAt:
            sale.payment?.dueDate ||
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      };

      res.json({
        success: true,
        data: paymentData,
        message: "Payment QR data generated successfully",
      });
    } catch (error) {
      console.error("❌ Error getting sales invoice for QR payment:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sales invoice for QR payment",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get sales invoice summary for quick view
   */
  getSalesInvoiceSummary: async (req, res) => {
    try {
      const {id} = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sales invoice ID format",
        });
      }

      const sale = await Sale.findById(id)
        .populate("customer", "name mobile")
        .populate("companyId", "businessName")
        .lean();

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: "Sales invoice not found",
        });
      }

      // Generate summary data
      const summaryData = {
        basic: {
          invoiceId: sale._id,
          invoiceNumber: sale.invoiceNumber,
          invoiceDate: sale.invoiceDate,
          status: sale.status,
          companyName: sale.companyId?.businessName || "Company",
          customerName: sale.customer?.name || "Customer",
          customerMobile: sale.customer?.mobile || sale.customerMobile || "",
        },
        financial: {
          subtotal: sale.totals?.subtotal || 0,
          totalTax: sale.totals?.totalTax || 0,
          totalDiscount: sale.totals?.totalDiscount || 0,
          finalTotal: sale.totals?.finalTotal || 0,
          paidAmount: sale.payment?.paidAmount || 0,
          pendingAmount: sale.payment?.pendingAmount || 0,
          paymentStatus: sale.payment?.status || "pending",
          paymentMethod: sale.payment?.method || "cash",
        },
        items: {
          totalItems: sale.items?.length || 0,
          totalQuantity: sale.totals?.totalQuantity || 0,
          topItem:
            sale.items && sale.items.length > 0
              ? {
                  name: sale.items[0].itemName,
                  quantity: sale.items[0].quantity,
                  amount: sale.items[0].amount,
                }
              : null,
        },
        timeline: {
          createdAt: sale.createdAt,
          lastModified: sale.updatedAt,
          dueDate: sale.payment?.dueDate,
          isOverdue: sale.payment?.dueDate
            ? new Date() > new Date(sale.payment.dueDate)
            : false,
        },
        actions: {
          canEdit: ["draft", "pending"].includes(sale.status),
          canCancel: !["completed", "cancelled"].includes(sale.status),
          canPrint: true,
          canEmail: !!sale.customer?.email,
          canAddPayment: sale.payment?.pendingAmount > 0,
        },
      };

      res.json({
        success: true,
        data: summaryData,
        message: "Sales invoice summary retrieved successfully",
      });
    } catch (error) {
      console.error("❌ Error getting sales invoice summary:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sales invoice summary",
        error: error.message,
      });
    }
  },

  // ==================== 📊 DAYBOOK SPECIFIC FUNCTIONS ====================

  /**
   * ✅ FIXED: Get DayBook sales summary for receivables (replace existing method)
   */
  getDaybookSummary: async (req, res) => {
    try {
      const {companyId, date = new Date().toISOString().split("T")[0]} =
        req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      // ✅ Validate companyId format
      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all pending receivables for the company
      const receivables = await Sale.find({
        companyId: new mongoose.Types.ObjectId(companyId),
        "payment.pendingAmount": {$gt: 0},
        status: {$ne: "cancelled"},
      })
        .populate("customer", "name mobile email")
        .sort({"payment.dueDate": 1});

      // Categorize receivables
      const summary = {
        totalReceivables: 0,
        overdueReceivables: 0,
        dueTodayReceivables: 0,
        upcomingReceivables: 0,
        overdueCount: 0,
        dueTodayCount: 0,
        upcomingCount: 0,
        totalCount: receivables.length,
      };

      const categorizedReceivables = receivables.map((sale) => {
        const pendingAmount = sale.payment?.pendingAmount || 0;
        summary.totalReceivables += pendingAmount;

        const dueDate = new Date(sale.payment?.dueDate);
        let type = "pending";
        let priority = "low";

        if (dueDate < today) {
          summary.overdueReceivables += pendingAmount;
          summary.overdueCount++;
          type = "overdue";
          priority = "high";
        } else if (dueDate.getTime() === today.getTime()) {
          summary.dueTodayReceivables += pendingAmount;
          summary.dueTodayCount++;
          type = "due_today";
          priority = "medium";
        } else {
          summary.upcomingReceivables += pendingAmount;
          summary.upcomingCount++;
          type = "pending";
          priority = "low";
        }

        return {
          ...sale.toObject(),
          type,
          priority,
          daysOverdue:
            type === "overdue"
              ? Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24))
              : 0,
        };
      });

      res.status(200).json({
        success: true,
        data: {
          summary,
          receivables: categorizedReceivables,
        },
        message: "Sales daybook summary retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting sales daybook summary:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sales daybook summary",
        error: error.message,
      });
    }
  },

  /**
   * ✅ FIXED: Get receivables aging analysis
   */
  getReceivablesAging: async (req, res) => {
    try {
      const {companyId} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      const today = new Date();

      const receivables = await Sale.find({
        companyId: new mongoose.Types.ObjectId(companyId),
        "payment.pendingAmount": {$gt: 0},
        status: {$ne: "cancelled"},
      })
        .populate("customer", "name mobile email")
        .sort({"payment.dueDate": 1});

      const agingBuckets = {
        current: {count: 0, totalAmount: 0, sales: []},
        "0-30": {count: 0, totalAmount: 0, sales: []},
        "30-60": {count: 0, totalAmount: 0, sales: []},
        "60-90": {count: 0, totalAmount: 0, sales: []},
        "90+": {count: 0, totalAmount: 0, sales: []},
      };

      receivables.forEach((sale) => {
        const pendingAmount = sale.payment?.pendingAmount || 0;
        const dueDate = sale.payment?.dueDate;

        if (!dueDate) return;

        const due = new Date(dueDate);
        const daysPastDue = Math.ceil((today - due) / (1000 * 60 * 60 * 24));

        let bucket = "current";
        if (daysPastDue > 90) bucket = "90+";
        else if (daysPastDue > 60) bucket = "60-90";
        else if (daysPastDue > 30) bucket = "30-60";
        else if (daysPastDue > 0) bucket = "0-30";

        agingBuckets[bucket].count++;
        agingBuckets[bucket].totalAmount += pendingAmount;
        agingBuckets[bucket].sales.push({
          ...sale.toObject(),
          daysPastDue: Math.max(0, daysPastDue),
        });
      });

      res.status(200).json({
        success: true,
        data: agingBuckets,
        message: "Receivables aging analysis retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting receivables aging:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get receivables aging analysis",
        error: error.message,
      });
    }
  },

  /**
   * ✅ FIXED: Get top debtors
   */
  getTopDebtors: async (req, res) => {
    try {
      const {companyId, limit = 10} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      const topDebtors = await Sale.aggregate([
        {
          $match: {
            companyId: new mongoose.Types.ObjectId(companyId),
            "payment.pendingAmount": {$gt: 0},
            status: {$ne: "cancelled"},
          },
        },
        {
          $group: {
            _id: "$customer",
            customerName: {$first: "$customerName"},
            customerMobile: {$first: "$customerMobile"},
            totalPending: {$sum: "$payment.pendingAmount"},
            salesCount: {$sum: 1},
            oldestSaleDate: {$min: "$invoiceDate"},
            newestSaleDate: {$max: "$invoiceDate"},
          },
        },
        {
          $lookup: {
            from: "parties",
            localField: "_id",
            foreignField: "_id",
            as: "customerDetails",
          },
        },
        {
          $addFields: {
            customer: {$arrayElemAt: ["$customerDetails", 0]},
          },
        },
        {
          $sort: {totalPending: -1},
        },
        {
          $limit: parseInt(limit),
        },
      ]);

      res.status(200).json({
        success: true,
        data: topDebtors,
        message: "Top debtors retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting top debtors:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get top debtors",
        error: error.message,
      });
    }
  },

  /**
   * ✅ FIXED: Get sales trends
   */
  getSalesTrends: async (req, res) => {
    try {
      const {companyId, period = "7d"} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();

      switch (period) {
        case "7d":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(startDate.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }

      const trends = await Sale.aggregate([
        {
          $match: {
            companyId: new mongoose.Types.ObjectId(companyId),
            invoiceDate: {$gte: startDate, $lte: endDate},
            status: {$ne: "cancelled"},
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {format: "%Y-%m-%d", date: "$invoiceDate"},
            },
            totalSales: {$sum: "$totals.finalTotal"},
            salesCount: {$sum: 1},
            avgSaleValue: {$avg: "$totals.finalTotal"},
          },
        },
        {
          $sort: {_id: 1},
        },
      ]);

      res.status(200).json({
        success: true,
        data: {period, trends},
        message: "Sales trends retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting sales trends:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sales trends",
        error: error.message,
      });
    }
  },

  /**
   * ✅ FIXED: Get collection efficiency
   */
  getCollectionEfficiency: async (req, res) => {
    try {
      const {companyId, dateFrom, dateTo} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      const filter = {
        companyId: new mongoose.Types.ObjectId(companyId),
        status: {$ne: "cancelled"},
      };

      if (dateFrom || dateTo) {
        filter.invoiceDate = {};
        if (dateFrom) filter.invoiceDate.$gte = new Date(dateFrom);
        if (dateTo) filter.invoiceDate.$lte = new Date(dateTo);
      }

      const efficiency = await Sale.aggregate([
        {$match: filter},
        {
          $group: {
            _id: null,
            totalInvoices: {$sum: 1},
            totalAmount: {$sum: "$totals.finalTotal"},
            totalCollected: {$sum: "$payment.paidAmount"},
            totalPending: {$sum: "$payment.pendingAmount"},
            paidInvoices: {
              $sum: {$cond: [{$eq: ["$payment.status", "paid"]}, 1, 0]},
            },
            partialInvoices: {
              $sum: {$cond: [{$eq: ["$payment.status", "partial"]}, 1, 0]},
            },
          },
        },
      ]);

      const result = efficiency[0] || {
        totalInvoices: 0,
        totalAmount: 0,
        totalCollected: 0,
        totalPending: 0,
        paidInvoices: 0,
        partialInvoices: 0,
      };

      result.collectionRate =
        result.totalAmount > 0
          ? ((result.totalCollected / result.totalAmount) * 100).toFixed(2)
          : 0;

      res.status(200).json({
        success: true,
        data: {overall: result},
        message: "Collection efficiency retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting collection efficiency:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get collection efficiency",
        error: error.message,
      });
    }
  },

  /**
   * ✅ FIXED: Get daily cash flow
   */
  getDailyCashFlow: async (req, res) => {
    try {
      const {companyId, date} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      const targetDate = date ? new Date(date) : new Date();

      const startOfDay = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate()
      );
      const endOfDay = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate() + 1
      );

      const cashFlow = await Sale.aggregate([
        {
          $match: {
            companyId: new mongoose.Types.ObjectId(companyId),
            invoiceDate: {$gte: startOfDay, $lt: endOfDay},
            status: {$ne: "cancelled"},
          },
        },
        {
          $group: {
            _id: null,
            totalSales: {$sum: "$totals.finalTotal"},
            totalCollected: {$sum: "$payment.paidAmount"},
            salesCount: {$sum: 1},
            cashSales: {
              $sum: {
                $cond: [
                  {$eq: ["$payment.method", "cash"]},
                  "$payment.paidAmount",
                  0,
                ],
              },
            },
            digitalSales: {
              $sum: {
                $cond: [
                  {$ne: ["$payment.method", "cash"]},
                  "$payment.paidAmount",
                  0,
                ],
              },
            },
          },
        },
      ]);

      const result = cashFlow[0] || {
        totalSales: 0,
        totalCollected: 0,
        salesCount: 0,
        cashSales: 0,
        digitalSales: 0,
      };

      result.netCashFlow = result.totalCollected;

      res.status(200).json({
        success: true,
        data: {
          date,
          sales: result,
          collections: result,
          netCashFlow: result.netCashFlow,
        },
        message: "Daily cash flow retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting daily cash flow:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get daily cash flow",
        error: error.message,
      });
    }
  },

  /**
   * ✅ FIXED: Get payment reminders
   */
  getPaymentReminders: async (req, res) => {
    try {
      const {companyId, reminderType = "due_today"} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let filter = {
        companyId: new mongoose.Types.ObjectId(companyId),
        "payment.pendingAmount": {$gt: 0},
        status: {$ne: "cancelled"},
      };

      switch (reminderType) {
        case "due_today":
          const endOfDay = new Date(today);
          endOfDay.setHours(23, 59, 59, 999);
          filter["payment.dueDate"] = {$gte: today, $lte: endOfDay};
          break;
        case "overdue":
          filter["payment.dueDate"] = {$lt: today};
          break;
        case "upcoming":
          const nextWeek = new Date(today);
          nextWeek.setDate(nextWeek.getDate() + 7);
          filter["payment.dueDate"] = {$gt: today, $lte: nextWeek};
          break;
      }

      const reminders = await Sale.find(filter)
        .populate("customer", "name mobile email")
        .sort({"payment.dueDate": 1});

      res.status(200).json({
        success: true,
        data: {reminderType, count: reminders.length, reminders},
        message: "Payment reminders retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting payment reminders:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get payment reminders",
        error: error.message,
      });
    }
  },
  /**
   * ✅ NEW: Get top debtors (customers with highest pending amounts)
   */
  getTopDebtors: async (req, res) => {
    try {
      const {companyId, limit = 10} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const topDebtors = await Sale.aggregate([
        {
          $match: {
            companyId: new mongoose.Types.ObjectId(companyId),
            "payment.pendingAmount": {$gt: 0},
            status: {$ne: "cancelled"},
          },
        },
        {
          $group: {
            _id: "$customer",
            totalPending: {$sum: "$payment.pendingAmount"},
            invoiceCount: {$sum: 1},
            oldestInvoiceDate: {$min: "$invoiceDate"},
            newestInvoiceDate: {$max: "$invoiceDate"},
            avgInvoiceValue: {$avg: "$totals.finalTotal"},
            invoices: {
              $push: {
                invoiceId: "$_id",
                invoiceNumber: "$invoiceNumber",
                invoiceDate: "$invoiceDate",
                dueDate: "$payment.dueDate",
                pendingAmount: "$payment.pendingAmount",
              },
            },
          },
        },
        {$sort: {totalPending: -1}},
        {$limit: parseInt(limit)},
        {
          $lookup: {
            from: "parties",
            localField: "_id",
            foreignField: "_id",
            as: "customerDetails",
          },
        },
        {$unwind: "$customerDetails"},
      ]);

      const formattedDebtors = topDebtors.map((debtor) => ({
        customerId: debtor._id,
        customerName: debtor.customerDetails.name,
        customerMobile: debtor.customerDetails.mobile,
        customerEmail: debtor.customerDetails.email,
        totalPending: debtor.totalPending,
        invoiceCount: debtor.invoiceCount,
        oldestInvoiceDate: debtor.oldestInvoiceDate,
        newestInvoiceDate: debtor.newestInvoiceDate,
        avgInvoiceValue: debtor.avgInvoiceValue,
        invoices: debtor.invoices,
      }));

      res.status(200).json({
        success: true,
        data: formattedDebtors,
        message: "Top debtors retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting top debtors:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get top debtors",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get sales trends for DayBook dashboard
   */
  getSalesTrends: async (req, res) => {
    try {
      const {companyId, period = "7d"} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      let startDate;
      let groupBy;

      switch (period) {
        case "7d":
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          groupBy = {$dateToString: {format: "%Y-%m-%d", date: "$invoiceDate"}};
          break;
        case "30d":
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          groupBy = {$dateToString: {format: "%Y-%m-%d", date: "$invoiceDate"}};
          break;
        case "3m":
          startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          groupBy = {$dateToString: {format: "%Y-%m", date: "$invoiceDate"}};
          break;
        default:
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          groupBy = {$dateToString: {format: "%Y-%m-%d", date: "$invoiceDate"}};
      }

      const trends = await Sale.aggregate([
        {
          $match: {
            companyId: new mongoose.Types.ObjectId(companyId),
            invoiceDate: {$gte: startDate},
            status: {$ne: "cancelled"},
          },
        },
        {
          $group: {
            _id: groupBy,
            totalSales: {$sum: "$totals.finalTotal"},
            totalInvoices: {$sum: 1},
            paidAmount: {$sum: "$payment.paidAmount"},
            pendingAmount: {$sum: "$payment.pendingAmount"},
            avgInvoiceValue: {$avg: "$totals.finalTotal"},
          },
        },
        {$sort: {_id: 1}},
      ]);

      res.status(200).json({
        success: true,
        data: {
          period,
          trends: trends.map((trend) => ({
            date: trend._id,
            totalSales: trend.totalSales,
            totalInvoices: trend.totalInvoices,
            paidAmount: trend.paidAmount,
            pendingAmount: trend.pendingAmount,
            avgInvoiceValue: trend.avgInvoiceValue,
            collectionRate:
              trend.totalSales > 0
                ? ((trend.paidAmount / trend.totalSales) * 100).toFixed(2)
                : 0,
          })),
        },
        message: "Sales trends retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting sales trends:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sales trends",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get collection efficiency metrics
   */
  getCollectionEfficiency: async (req, res) => {
    try {
      const {companyId, dateFrom, dateTo} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const filter = {companyId, status: {$ne: "cancelled"}};
      if (dateFrom || dateTo) {
        filter.invoiceDate = {};
        if (dateFrom) filter.invoiceDate.$gte = new Date(dateFrom);
        if (dateTo) filter.invoiceDate.$lte = new Date(dateTo);
      }

      const [collectionMetrics, paymentMethodEfficiency] = await Promise.all([
        // Overall collection efficiency
        Sale.aggregate([
          {$match: filter},
          {
            $group: {
              _id: null,
              totalInvoiced: {$sum: "$totals.finalTotal"},
              totalCollected: {$sum: "$payment.paidAmount"},
              totalPending: {$sum: "$payment.pendingAmount"},
              totalInvoices: {$sum: 1},
              paidInvoices: {
                $sum: {$cond: [{$eq: ["$payment.status", "paid"]}, 1, 0]},
              },
              partialInvoices: {
                $sum: {$cond: [{$eq: ["$payment.status", "partial"]}, 1, 0]},
              },
              pendingInvoices: {
                $sum: {$cond: [{$eq: ["$payment.status", "pending"]}, 1, 0]},
              },
              avgDaysToCollection: {
                $avg: {
                  $cond: [
                    {$eq: ["$payment.status", "paid"]},
                    {
                      $divide: [
                        {$subtract: ["$payment.paymentDate", "$invoiceDate"]},
                        86400000,
                      ],
                    },
                    null,
                  ],
                },
              },
            },
          },
        ]),

        // Payment method efficiency
        Sale.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$payment.method",
              totalAmount: {$sum: "$totals.finalTotal"},
              collectedAmount: {$sum: "$payment.paidAmount"},
              invoiceCount: {$sum: 1},
              paidCount: {
                $sum: {$cond: [{$eq: ["$payment.status", "paid"]}, 1, 0]},
              },
            },
          },
        ]),
      ]);

      const metrics = collectionMetrics[0] || {};
      const collectionRate =
        metrics.totalInvoiced > 0
          ? ((metrics.totalCollected / metrics.totalInvoiced) * 100).toFixed(2)
          : 0;

      const paymentMethodStats = paymentMethodEfficiency.map((method) => ({
        method: method._id || "unknown",
        totalAmount: method.totalAmount,
        collectedAmount: method.collectedAmount,
        invoiceCount: method.invoiceCount,
        paidCount: method.paidCount,
        collectionRate:
          method.totalAmount > 0
            ? ((method.collectedAmount / method.totalAmount) * 100).toFixed(2)
            : 0,
        paymentRate:
          method.invoiceCount > 0
            ? ((method.paidCount / method.invoiceCount) * 100).toFixed(2)
            : 0,
      }));

      res.status(200).json({
        success: true,
        data: {
          overall: {
            totalInvoiced: metrics.totalInvoiced || 0,
            totalCollected: metrics.totalCollected || 0,
            totalPending: metrics.totalPending || 0,
            collectionRate: parseFloat(collectionRate),
            totalInvoices: metrics.totalInvoices || 0,
            paidInvoices: metrics.paidInvoices || 0,
            partialInvoices: metrics.partialInvoices || 0,
            pendingInvoices: metrics.pendingInvoices || 0,
            avgDaysToCollection: metrics.avgDaysToCollection || 0,
          },
          paymentMethods: paymentMethodStats,
        },
        message: "Collection efficiency metrics retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting collection efficiency:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get collection efficiency metrics",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get daily cash flow from sales
   */
  getDailyCashFlow: async (req, res) => {
    try {
      const {companyId, date = new Date().toISOString().split("T")[0]} =
        req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      const [dailySales, paymentTransactions] = await Promise.all([
        // Sales created today
        Sale.aggregate([
          {
            $match: {
              companyId: new mongoose.Types.ObjectId(companyId),
              invoiceDate: {$gte: startOfDay, $lte: endOfDay},
              status: {$ne: "cancelled"},
            },
          },
          {
            $group: {
              _id: null,
              totalSales: {$sum: "$totals.finalTotal"},
              totalInvoices: {$sum: 1},
              cashSales: {
                $sum: {
                  $cond: [
                    {$eq: ["$payment.method", "cash"]},
                    "$payment.paidAmount",
                    0,
                  ],
                },
              },
              creditSales: {
                $sum: {
                  $cond: [
                    {$ne: ["$payment.method", "cash"]},
                    "$totals.finalTotal",
                    0,
                  ],
                },
              },
            },
          },
        ]),

        // Payment collections today (from payment history)
        Sale.aggregate([
          {
            $match: {
              companyId: new mongoose.Types.ObjectId(companyId),
              "paymentHistory.paymentDate": {$gte: startOfDay, $lte: endOfDay},
            },
          },
          {$unwind: "$paymentHistory"},
          {
            $match: {
              "paymentHistory.paymentDate": {$gte: startOfDay, $lte: endOfDay},
            },
          },
          {
            $group: {
              _id: "$paymentHistory.method",
              totalCollected: {$sum: "$paymentHistory.amount"},
              transactionCount: {$sum: 1},
            },
          },
        ]),
      ]);

      const salesData = dailySales[0] || {
        totalSales: 0,
        totalInvoices: 0,
        cashSales: 0,
        creditSales: 0,
      };

      const paymentCollections = paymentTransactions.reduce((acc, payment) => {
        acc[payment._id || "unknown"] = {
          amount: payment.totalCollected,
          count: payment.transactionCount,
        };
        return acc;
      }, {});

      const totalCollections = paymentTransactions.reduce(
        (sum, payment) => sum + payment.totalCollected,
        0
      );

      res.status(200).json({
        success: true,
        data: {
          date: date,
          sales: salesData,
          collections: {
            total: totalCollections,
            byMethod: paymentCollections,
          },
          netCashFlow: salesData.cashSales + totalCollections,
          summary: {
            totalCashIn: salesData.cashSales + totalCollections,
            totalCreditSales: salesData.creditSales,
            totalTransactions:
              salesData.totalInvoices + paymentTransactions.length,
          },
        },
        message: "Daily cash flow retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting daily cash flow:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get daily cash flow",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get quick payment reminders data
   */
  getPaymentReminders: async (req, res) => {
    try {
      const {companyId, reminderType = "due_today"} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      let filter = {
        companyId,
        "payment.pendingAmount": {$gt: 0},
        status: {$ne: "cancelled"},
      };

      switch (reminderType) {
        case "overdue":
          filter["payment.dueDate"] = {$lt: today};
          break;
        case "due_today":
          filter["payment.dueDate"] = {
            $gte: new Date(today.setHours(0, 0, 0, 0)),
            $lt: new Date(today.setHours(23, 59, 59, 999)),
          };
          break;
        case "due_tomorrow":
          filter["payment.dueDate"] = {
            $gte: new Date(tomorrow.setHours(0, 0, 0, 0)),
            $lt: new Date(tomorrow.setHours(23, 59, 59, 999)),
          };
          break;
        case "due_this_week":
          filter["payment.dueDate"] = {
            $gte: today,
            $lte: nextWeek,
          };
          break;
        default:
          filter["payment.dueDate"] = {
            $gte: new Date(today.setHours(0, 0, 0, 0)),
            $lt: new Date(today.setHours(23, 59, 59, 999)),
          };
      }

      const reminders = await Sale.find(filter)
        .populate("customer", "name mobile email")
        .sort({"payment.dueDate": 1})
        .limit(50);

      const reminderData = reminders.map((sale) => ({
        invoiceId: sale._id,
        invoiceNumber: sale.invoiceNumber,
        customerName: sale.customer?.name || "Unknown",
        customerMobile: sale.customer?.mobile,
        customerEmail: sale.customer?.email,
        pendingAmount: sale.payment.pendingAmount,
        dueDate: sale.payment.dueDate,
        daysOverdue:
          reminderType === "overdue"
            ? Math.ceil(
                (today - new Date(sale.payment.dueDate)) / (1000 * 60 * 60 * 24)
              )
            : 0,
        priority:
          reminderType === "overdue"
            ? "high"
            : reminderType === "due_today"
            ? "medium"
            : "low",
        reminderSent: false, // You can track this in your system
        lastReminderDate: null, // You can track this in your system
      }));

      res.status(200).json({
        success: true,
        data: {
          reminderType,
          count: reminderData.length,
          totalPendingAmount: reminderData.reduce(
            (sum, item) => sum + item.pendingAmount,
            0
          ),
          reminders: reminderData,
        },
        message: `Payment reminders (${reminderType}) retrieved successfully`,
      });
    } catch (error) {
      console.error("Error getting payment reminders:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get payment reminders",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Mark payment reminder as sent
   */
  markReminderSent: async (req, res) => {
    try {
      const {invoiceId} = req.params;
      const {reminderType, sentAt = new Date()} = req.body;

      if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid invoice ID",
        });
      }

      const sale = await Sale.findByIdAndUpdate(
        invoiceId,
        {
          $push: {
            paymentReminders: {
              type: reminderType,
              sentAt: new Date(sentAt),
              sentBy: req.user?.id || "system",
            },
          },
        },
        {new: true}
      );

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: "Sale not found",
        });
      }

      res.status(200).json({
        success: true,
        data: {
          invoiceId: sale._id,
          invoiceNumber: sale.invoiceNumber,
          reminderSent: true,
          sentAt: sentAt,
        },
        message: "Payment reminder marked as sent",
      });
    } catch (error) {
      console.error("Error marking reminder as sent:", error);
      res.status(500).json({
        success: false,
        message: "Failed to mark reminder as sent",
        error: error.message,
      });
    }
  },
};

module.exports = saleController;
