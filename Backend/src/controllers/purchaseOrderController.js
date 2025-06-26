const PurchaseOrder = require("../models/PurchaseOrder");
const Purchase = require("../models/Purchase");
const Item = require("../models/Item");
const Party = require("../models/Party");
const Payment = require("../models/Payment");
const SalesOrder = require("../models/SalesOrder");
const Company = require("../models/Company");
const mongoose = require("mongoose");

// Enhanced findOrCreateSupplier function with better duplicate handling
const findOrCreateSupplier = async (
  supplierName,
  supplierMobile,
  supplierId,
  companyId,
  userId
) => {
  try {
    let supplierRecord;

    if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) {
      const foundSupplier = await Party.findById(supplierId);
      if (
        foundSupplier &&
        foundSupplier.companyId.toString() === companyId.toString()
      ) {
        return foundSupplier;
      }
    }

    if (supplierMobile) {
      const cleanMobile = supplierMobile.toString().replace(/[\s\-\(\)]/g, "");
      const mobileVariations = [
        cleanMobile,
        supplierMobile,
        supplierMobile.toString(),
      ];

      const supplierByMobile = await Party.aggregate([
        {
          $match: {
            companyId: new mongoose.Types.ObjectId(companyId),
            $or: [{type: "supplier"}, {type: {$exists: false}}, {type: null}],
            $or: [
              {mobile: {$in: mobileVariations}},
              {phoneNumber: {$in: mobileVariations}},
              {phone: {$in: mobileVariations}},
              {contactNumber: {$in: mobileVariations}},
            ],
          },
        },
        {$limit: 1},
      ]);

      if (supplierByMobile && supplierByMobile.length > 0) {
        const foundSupplier = await Party.findById(supplierByMobile[0]._id);

        if (supplierName && supplierName.trim() !== foundSupplier.name) {
          foundSupplier.name = supplierName.trim();
          await foundSupplier.save();
        }
        return foundSupplier;
      }

      try {
        const db = mongoose.connection.db;
        const collection = db.collection("parties");

        const rawSupplier = await collection.findOne({
          companyId: new mongoose.Types.ObjectId(companyId),
          $or: [
            {mobile: {$in: mobileVariations}},
            {phoneNumber: {$in: mobileVariations}},
            {phone: {$in: mobileVariations}},
            {contactNumber: {$in: mobileVariations}},
          ],
        });

        if (rawSupplier) {
          const foundSupplier = await Party.findById(rawSupplier._id);

          if (supplierName && supplierName.trim() !== foundSupplier.name) {
            foundSupplier.name = supplierName.trim();
            await foundSupplier.save();
          }
          return foundSupplier;
        }
      } catch (rawQueryError) {
        // Continue to name search
      }
    }

    if (supplierName) {
      const nameVariations = [
        supplierName.trim(),
        supplierName.trim().toLowerCase(),
        supplierName.trim().toUpperCase(),
      ];

      const supplierByName = await Party.findOne({
        companyId: companyId,
        $or: [{type: "supplier"}, {type: {$exists: false}}, {type: null}],
        $or: nameVariations.map((name) => ({
          name: {
            $regex: new RegExp(
              `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
              "i"
            ),
          },
        })),
      });

      if (supplierByName) {
        if (
          supplierMobile &&
          !supplierByName.mobile &&
          !supplierByName.phoneNumber
        ) {
          supplierByName.mobile = supplierMobile;
          supplierByName.phoneNumber = supplierMobile;
          await supplierByName.save();
        }
        return supplierByName;
      }
    }

    if (!supplierName || !supplierName.trim()) {
      throw new Error("Supplier name is required to create new supplier");
    }

    const cleanSupplierData = {
      name: supplierName.trim(),
      mobile: supplierMobile ? supplierMobile.toString() : "",
      phoneNumber: supplierMobile ? supplierMobile.toString() : "",
      type: "supplier",
      partyType: "supplier",
      email: "",
      companyId: companyId,
      userId: userId,
      createdBy: userId,
      homeAddressLine: "",
      address: "",
      gstNumber: "",
      panNumber: "",
      status: "active",
      creditLimit: 0,
      creditDays: 0,
      currentBalance: 0,
      openingBalance: 0,
    };

    if (supplierMobile && supplierMobile.trim()) {
      const existingParty = await Party.findOne({companyId}).select(
        "mobile phoneNumber"
      );

      if (existingParty && existingParty.mobile !== undefined) {
        cleanSupplierData.mobile = supplierMobile.trim();
      } else {
        cleanSupplierData.phoneNumber = supplierMobile.trim();
      }
    }

    try {
      supplierRecord = new Party(cleanSupplierData);
      await supplierRecord.save();
      return supplierRecord;
    } catch (saveError) {
      if (saveError.code === 11000) {
        if (supplierMobile) {
          supplierRecord = await Party.findOne({
            $or: [{mobile: supplierMobile}, {phoneNumber: supplierMobile}],
            type: "supplier",
            companyId,
          });
        }

        if (!supplierRecord && supplierName) {
          supplierRecord = await Party.findOne({
            name: {$regex: new RegExp(`^${supplierName.trim()}$`, "i")},
            type: "supplier",
            companyId,
          });
        }

        if (supplierRecord) {
          return supplierRecord;
        }
      }

      throw new Error(`Failed to create supplier: ${saveError.message}`);
    }

    if (!supplierRecord) {
      throw new Error("Unable to find or create supplier");
    }

    return supplierRecord;
  } catch (error) {
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      throw new Error(
        `Supplier validation failed: ${validationErrors.join(", ")}`
      );
    }

    if (error.name === "CastError") {
      throw new Error(`Invalid data format for supplier: ${error.message}`);
    }

    if (
      error.code === 11000 ||
      error.message.includes("E11000") ||
      error.message.includes("duplicate key")
    ) {
      try {
        const recoverySearches = [];

        if (supplierMobile) {
          const cleanMobile = supplierMobile
            .toString()
            .replace(/[\s\-\(\)]/g, "");

          recoverySearches.push(
            Party.findOne({companyId: companyId, mobile: supplierMobile}),
            Party.findOne({companyId: companyId, phoneNumber: supplierMobile}),
            Party.findOne({companyId: companyId, phone: supplierMobile}),
            Party.findOne({
              companyId: companyId,
              contactNumber: supplierMobile,
            }),
            Party.findOne({companyId: companyId, mobile: cleanMobile}),
            Party.findOne({companyId: companyId, phoneNumber: cleanMobile})
          );
        }

        if (supplierName) {
          recoverySearches.push(
            Party.findOne({companyId: companyId, name: supplierName.trim()}),
            Party.findOne({
              companyId: companyId,
              name: {$regex: new RegExp(`^${supplierName.trim()}$`, "i")},
            })
          );
        }

        const searchResults = await Promise.allSettled(recoverySearches);

        for (const result of searchResults) {
          if (result.status === "fulfilled" && result.value) {
            let needsUpdate = false;

            if (supplierName && result.value.name !== supplierName.trim()) {
              result.value.name = supplierName.trim();
              needsUpdate = true;
            }

            if (supplierMobile && !result.value.mobile) {
              result.value.mobile = supplierMobile;
              needsUpdate = true;
            }

            if (supplierMobile && !result.value.phoneNumber) {
              result.value.phoneNumber = supplierMobile;
              needsUpdate = true;
            }

            if (!result.value.type) {
              result.value.type = "supplier";
              needsUpdate = true;
            }

            if (needsUpdate) {
              try {
                await result.value.save();
              } catch (updateError) {
                // Continue if update fails
              }
            }

            return result.value;
          }
        }

        const db = mongoose.connection.db;
        const collection = db.collection("parties");

        let rawResult = null;

        if (supplierMobile) {
          rawResult = await collection.findOne({
            companyId: new mongoose.Types.ObjectId(companyId),
            $or: [
              {mobile: supplierMobile},
              {phoneNumber: supplierMobile},
              {phone: supplierMobile},
              {contactNumber: supplierMobile},
            ],
          });
        }

        if (!rawResult && supplierName) {
          rawResult = await collection.findOne({
            companyId: new mongoose.Types.ObjectId(companyId),
            name: {$regex: new RegExp(`^${supplierName.trim()}$`, "i")},
          });
        }

        if (rawResult) {
          const recoveredSupplier = await Party.findById(rawResult._id);
          return recoveredSupplier;
        }

        const errorDetails = {
          supplierName,
          supplierMobile,
          companyId,
          searchAttempts: recoverySearches.length,
          duplicateKeyError: error.keyValue || {},
          suggestion: "Check database directly for data inconsistency",
        };

        throw new Error(
          `Supplier already exists but cannot be found. This indicates a database inconsistency. Details: ${JSON.stringify(
            errorDetails
          )}`
        );
      } catch (recoveryError) {
        throw new Error(
          `Database error: Unable to resolve supplier conflict. Original error: ${error.message}. Recovery error: ${recoveryError.message}`
        );
      }
    }

    throw new Error(`Supplier operation failed: ${error.message}`);
  }
};

// Generate next purchase order number with automatic incrementing
const generateNextPurchaseOrderNumber = async (
  companyId,
  orderType = "purchase_order"
) => {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const datePrefix = `${year}${month}${day}`;

    const basePattern = `PO-${datePrefix}`;

    const latestOrder = await PurchaseOrder.findOne({
      companyId: companyId,
      orderNumber: {$regex: `^${basePattern}-`},
    })
      .sort({orderNumber: -1})
      .select("orderNumber")
      .lean();

    let nextSequence = 1;

    if (latestOrder && latestOrder.orderNumber) {
      const match = latestOrder.orderNumber.match(/-(\d+)$/);
      if (match) {
        nextSequence = parseInt(match[1]) + 1;
      }
    }

    const sequenceStr = String(nextSequence).padStart(4, "0");
    const newOrderNumber = `${basePattern}-${sequenceStr}`;

    const existingOrder = await PurchaseOrder.findOne({
      orderNumber: newOrderNumber,
      companyId: companyId,
    });

    if (existingOrder) {
      const fallbackSequence = String(nextSequence + 1).padStart(4, "0");
      const fallbackOrderNumber = `${basePattern}-${fallbackSequence}`;

      const fallbackExists = await PurchaseOrder.findOne({
        orderNumber: fallbackOrderNumber,
        companyId: companyId,
      });

      if (fallbackExists) {
        const timestamp = Date.now().toString().slice(-6);
        return `${basePattern}-${timestamp}`;
      }

      return fallbackOrderNumber;
    }

    return newOrderNumber;
  } catch (error) {
    const timestamp = Date.now();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const emergencyNumber = `PO-EMRG-${timestamp}-${randomNum}`;

    return emergencyNumber;
  }
};

// Add this near other helper functions like generateNextPurchaseOrderNumber
const generateNextSalesOrderNumber = async (companyId) => {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const datePrefix = `${year}${month}${day}`;

    const basePattern = `SO-${datePrefix}`;

    const latestOrder = await SalesOrder.findOne({
      companyId: companyId,
      orderNumber: {$regex: `^${basePattern}-`},
    })
      .sort({orderNumber: -1})
      .select("orderNumber")
      .lean();

    let nextSequence = 1;
    if (latestOrder && latestOrder.orderNumber) {
      const match = latestOrder.orderNumber.match(/-(\d+)$/);
      if (match) {
        nextSequence = parseInt(match[1]) + 1;
      }
    }

    const sequenceStr = String(nextSequence).padStart(4, "0");
    return `${basePattern}-${sequenceStr}`;
  } catch (error) {
    const timestamp = Date.now();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `SO-EMRG-${timestamp}-${randomNum}`;
  }
};

// Auto-detection function to find linked company for supplier
const findLinkedCompanyForSupplier = async (supplier) => {
  try {
    if (supplier.linkedCompanyId) {
      const company = await Company.findById(supplier.linkedCompanyId);
      if (company) {
        return company._id;
      }
    }

    if (supplier.gstNumber) {
      const company = await Company.findOne({
        gstin: supplier.gstNumber,
        isActive: true,
      });
      if (company) {
        return company._id;
      }
    }

    if (supplier.phoneNumber || supplier.mobile) {
      const phoneVariations = [
        supplier.phoneNumber,
        supplier.mobile,
        supplier.phone,
        supplier.contactNumber,
      ].filter(Boolean);

      for (const phone of phoneVariations) {
        const company = await Company.findOne({
          phoneNumber: phone,
          isActive: true,
        });
        if (company) {
          return company._id;
        }
      }
    }

    if (supplier.email) {
      const company = await Company.findOne({
        email: supplier.email,
        isActive: true,
      });
      if (company) {
        return company._id;
      }
    }

    if (supplier.name || supplier.companyName) {
      const supplierName = supplier.name || supplier.companyName;
      const company = await Company.findOne({
        businessName: {$regex: new RegExp(`^${supplierName.trim()}$`, "i")},
        isActive: true,
      });
      if (company) {
        return company._id;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
};

// Automatically create supplier from company details
const autoCreateSupplierFromCompany = async (
  sourceCompany,
  targetCompanyId,
  convertedBy
) => {
  try {
    const existingSupplier = await Party.findOne({
      $or: [
        {phoneNumber: sourceCompany.phoneNumber},
        {email: sourceCompany.email},
        {gstNumber: sourceCompany.gstin},
        {name: {$regex: new RegExp(`^${sourceCompany.businessName}$`, "i")}},
      ],
      companyId: targetCompanyId,
      $or: [{partyType: "supplier"}, {isSupplier: true}, {type: "supplier"}],
    });

    if (existingSupplier) {
      return existingSupplier;
    }

    const supplierData = {
      name: sourceCompany.businessName,
      phoneNumber: sourceCompany.phoneNumber || "",
      mobile: sourceCompany.phoneNumber || "",
      email: sourceCompany.email || "",
      companyId: targetCompanyId,
      partyType: "supplier",
      type: "supplier",
      isSupplier: true,
      isCustomer: false,
      gstNumber: sourceCompany.gstin || "",
      gstType: sourceCompany.gstin ? "regular" : "unregistered",
      isActive: true,
      linkedCompanyId: sourceCompany._id,
      homeAddressLine: sourceCompany.address || "",
      address: sourceCompany.address || "",
      city: sourceCompany.city || "",
      state: sourceCompany.state || "",
      pincode: sourceCompany.pincode || "",
      creditLimit: 0,
      currentBalance: 0,
      openingBalance: 0,
      paymentTerms: "credit",
    };

    if (convertedBy && mongoose.Types.ObjectId.isValid(convertedBy)) {
      supplierData.createdBy = convertedBy;
      supplierData.userId = convertedBy;
    }

    const newSupplier = new Party(supplierData);
    await newSupplier.save();

    return newSupplier;
  } catch (error) {
    throw error;
  }
};

const purchaseOrderController = {
  createPurchaseOrder: async (req, res) => {
    try {
      const {
        supplierName,
        supplierMobile,
        supplierEmail,
        supplier,
        orderNumber,
        orderDate,
        orderType = "purchase_order",
        validUntil,
        expectedDeliveryDate,
        requiredBy,
        gstEnabled = true,
        gstType = "gst",
        companyId,
        items,
        payment,
        notes,
        termsAndConditions,
        supplierNotes,
        internalNotes,
        roundOff = 0,
        roundOffEnabled = false,
        status = "draft",
        priority = "normal",
        departmentRef,
        shippingAddress,
        taxMode = "without-tax",
        priceIncludesTax = false,
        sourceOrderId,
        sourceOrderNumber,
        sourceOrderType,
        sourceCompanyId, // Can be provided manually or auto-detected
        isAutoGenerated = false,
        generatedFrom = "manual",
        generatedBy,
        targetCompanyId,
        autoCreateCorrespondingSO = false,
        employeeName,
        employeeId,
        createdBy,
        lastModifiedBy,
        autoDetectSourceCompany = true, // ✅ NEW: Enable auto-detection
      } = req.body;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
          code: "MISSING_COMPANY_ID",
        });
      }

      // Enhanced supplier validation with better error messages
      const hasSupplierName = supplierName && supplierName.trim();
      const hasSupplierMobile =
        supplierMobile && supplierMobile.toString().trim();
      const hasSupplierId =
        supplier && mongoose.Types.ObjectId.isValid(supplier);

      if (!hasSupplierName && !hasSupplierMobile && !hasSupplierId) {
        return res.status(400).json({
          success: false,
          message: "Supplier information is required",
          code: "MISSING_SUPPLIER_INFO",
          details: {
            receivedData: {
              supplierName: supplierName || null,
              supplierMobile: supplierMobile || null,
              supplier: supplier || null,
            },
            requirements:
              "Provide at least one: supplierName, supplierMobile, or supplier (ID)",
          },
        });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one item is required",
          code: "MISSING_ITEMS",
        });
      }

      const validOrderTypes = [
        "purchase_order",
        "purchase_quotation",
        "proforma_purchase",
      ];
      if (!validOrderTypes.includes(orderType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order type",
          code: "INVALID_ORDER_TYPE",
          provided: orderType,
          validTypes: validOrderTypes,
        });
      }

      if (sourceOrderId && !mongoose.Types.ObjectId.isValid(sourceOrderId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid source order ID",
          code: "INVALID_SOURCE_ORDER_ID",
        });
      }

      if (
        targetCompanyId &&
        !mongoose.Types.ObjectId.isValid(targetCompanyId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid target company ID",
          code: "INVALID_TARGET_COMPANY_ID",
        });
      }

      // ✅ ENHANCED: Generate order number
      let finalOrderNumber = orderNumber;
      if (!finalOrderNumber || finalOrderNumber.trim() === "") {
        try {
          finalOrderNumber = await generateNextPurchaseOrderNumber(
            companyId,
            orderType
          );
        } catch (generationError) {
          return res.status(500).json({
            success: false,
            message: "Failed to generate order number",
            error: generationError.message,
            code: "ORDER_NUMBER_GENERATION_FAILED",
          });
        }
      } else {
        finalOrderNumber = finalOrderNumber.trim();

        if (finalOrderNumber.length < 3 || finalOrderNumber.length > 50) {
          return res.status(400).json({
            success: false,
            message: "Order number must be between 3 and 50 characters",
            code: "INVALID_ORDER_NUMBER_LENGTH",
            provided: finalOrderNumber,
          });
        }

        const existingOrder = await PurchaseOrder.findOne({
          orderNumber: finalOrderNumber,
          companyId: companyId,
        }).lean();

        if (existingOrder) {
          return res.status(400).json({
            success: false,
            message: `Purchase order number "${finalOrderNumber}" already exists for this company`,
            error: "DUPLICATE_ORDER_NUMBER",
            code: "DUPLICATE_ORDER_NUMBER",
            suggestion:
              "Use a different order number or leave empty to auto-generate",
          });
        }
      }

      // ✅ ENHANCED: Find or create supplier with full population
      let supplierRecord;
      try {
        supplierRecord = await findOrCreateSupplier(
          supplierName,
          supplierMobile,
          supplier,
          companyId,
          req.user?.id || employeeId || companyId
        );

        // ✅ NEW: Populate supplier with linkedCompanyId details
        if (supplierRecord && supplierRecord._id) {
          supplierRecord = await Party.findById(supplierRecord._id)
            .populate(
              "linkedCompanyId",
              "businessName email phoneNumber gstin isActive"
            )
            .lean();
        }
      } catch (supplierError) {
        return res.status(400).json({
          success: false,
          message: "Failed to find or create supplier",
          error: supplierError.message,
          code: "SUPPLIER_RESOLUTION_FAILED",
        });
      }

      if (!supplierRecord || !supplierRecord._id) {
        return res.status(400).json({
          success: false,
          message: "Unable to resolve supplier information",
          code: "SUPPLIER_NOT_RESOLVED",
        });
      }

      // ✅ NEW: Auto-detect sourceCompanyId from supplier's linkedCompanyId
      let finalSourceCompanyId = sourceCompanyId;
      let sourceCompanyDetectionMethod = "manual";
      let sourceCompanyDetails = null;

      if (
        autoDetectSourceCompany &&
        !finalSourceCompanyId &&
        supplierRecord.linkedCompanyId
      ) {
        console.log(
          "🔍 Auto-detecting sourceCompanyId from supplier's linkedCompanyId:",
          {
            supplierId: supplierRecord._id,
            supplierName: supplierRecord.name,
            linkedCompanyId:
              supplierRecord.linkedCompanyId._id ||
              supplierRecord.linkedCompanyId,
            currentCompanyId: companyId,
          }
        );

        const linkedCompanyId =
          supplierRecord.linkedCompanyId._id || supplierRecord.linkedCompanyId;

        // ✅ Ensure it's different from current company (avoid circular reference)
        if (linkedCompanyId.toString() !== companyId.toString()) {
          try {
            // Verify the linked company exists and is active
            const linkedCompany = await Company.findById(linkedCompanyId);
            if (linkedCompany && linkedCompany.isActive !== false) {
              finalSourceCompanyId = linkedCompanyId;
              sourceCompanyDetectionMethod = "supplier_linked_company";
              sourceCompanyDetails = {
                id: linkedCompany._id,
                businessName: linkedCompany.businessName,
                email: linkedCompany.email,
                phone: linkedCompany.phoneNumber,
                gstin: linkedCompany.gstin,
              };

              console.log("✅ Auto-detected sourceCompanyId:", {
                sourceCompanyId: finalSourceCompanyId.toString(),
                sourceCompanyName: linkedCompany.businessName,
                detectionMethod: sourceCompanyDetectionMethod,
              });
            } else {
              console.log("⚠️ Linked company is inactive or not found:", {
                linkedCompanyId: linkedCompanyId.toString(),
                isActive: linkedCompany?.isActive,
                exists: !!linkedCompany,
              });
            }
          } catch (companyError) {
            console.error("❌ Error validating linked company:", companyError);
          }
        } else {
          console.log(
            "⚠️ Supplier's linkedCompanyId points to same company - skipping auto-detection:",
            {
              linkedCompanyId: linkedCompanyId.toString(),
              currentCompanyId: companyId.toString(),
            }
          );
        }
      }

      // ✅ ENHANCED: Validate final sourceCompanyId if provided
      if (
        finalSourceCompanyId &&
        !mongoose.Types.ObjectId.isValid(finalSourceCompanyId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid source company ID",
          code: "INVALID_SOURCE_COMPANY_ID",
          provided: finalSourceCompanyId,
          detectionMethod: sourceCompanyDetectionMethod,
        });
      }

      // ✅ Continue with existing logic for GST, tax calculations, etc.
      const finalGstType = gstType || (gstEnabled ? "gst" : "non-gst");
      const finalTaxMode =
        taxMode || (priceIncludesTax ? "with-tax" : "without-tax");
      const finalPriceIncludesTax =
        finalTaxMode === "with-tax" || finalTaxMode === "inclusive";
      const finalGstEnabled = finalGstType === "gst";

      // ... [Keep existing item processing logic] ...
      const processedItems = [];
      let subtotal = 0;
      let totalDiscount = 0;
      let totalTax = 0;
      let totalTaxableAmount = 0;
      let totalQuantity = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        const itemName = item.productName || item.itemName || "";
        const itemCode = item.productCode || item.itemCode || "";
        const pricePerUnit = parseFloat(
          item.price || item.pricePerUnit || item.rate || 0
        );
        const quantity = parseFloat(item.quantity || 0);
        const description = item.description || "";
        const gstRate = parseFloat(item.gstRate || item.taxRate || 18);
        const unit = item.unit === "pcs" ? "PCS" : item.unit || "PCS";
        const hsnNumber = item.hsnNumber || item.hsnCode || "0000";

        if (!itemName || itemName.trim() === "") {
          return res.status(400).json({
            success: false,
            message: `Item ${i + 1}: Product/Item name is required`,
            code: "MISSING_ITEM_NAME",
          });
        }

        if (!quantity || quantity <= 0) {
          return res.status(400).json({
            success: false,
            message: `Item ${i + 1}: Valid quantity is required`,
            code: "INVALID_QUANTITY",
          });
        }

        if (!pricePerUnit || pricePerUnit < 0) {
          return res.status(400).json({
            success: false,
            message: `Item ${i + 1}: Valid price is required`,
            code: "INVALID_PRICE",
          });
        }

        const itemGstMode = item.gstMode || item.taxMode || finalTaxMode;
        const itemPriceIncludesTax =
          itemGstMode === "include" ||
          itemGstMode === "with-tax" ||
          itemGstMode === "inclusive" ||
          item.priceIncludesTax === true;

        const baseAmount = quantity * pricePerUnit;
        const discountPercent = parseFloat(
          item.discountPercent || item.discount || 0
        );
        const discountAmount = parseFloat(item.discountAmount || 0);
        let itemDiscountAmount = discountAmount;
        if (discountAmount === 0 && discountPercent > 0) {
          itemDiscountAmount = (baseAmount * discountPercent) / 100;
        }
        const amountAfterDiscount = baseAmount - itemDiscountAmount;

        let itemCgstRate = 0;
        let itemSgstRate = 0;
        let itemIgstRate = 0;

        if (finalGstEnabled && gstRate > 0) {
          itemCgstRate = gstRate / 2;
          itemSgstRate = gstRate / 2;
          itemIgstRate = 0;
        }

        let cgst = 0;
        let sgst = 0;
        let igst = 0;
        let itemAmount = 0;
        let itemTaxableAmount = 0;

        if (
          finalGstEnabled &&
          (itemCgstRate > 0 || itemSgstRate > 0 || itemIgstRate > 0)
        ) {
          const totalTaxRate = itemCgstRate + itemSgstRate + itemIgstRate;

          if (itemPriceIncludesTax) {
            const taxMultiplier = 1 + totalTaxRate / 100;
            itemTaxableAmount = amountAfterDiscount / taxMultiplier;
            cgst = (itemTaxableAmount * itemCgstRate) / 100;
            sgst = (itemTaxableAmount * itemSgstRate) / 100;
            igst = (itemTaxableAmount * itemIgstRate) / 100;
            itemAmount = amountAfterDiscount;
          } else {
            itemTaxableAmount = amountAfterDiscount;
            cgst = (itemTaxableAmount * itemCgstRate) / 100;
            sgst = (itemTaxableAmount * itemSgstRate) / 100;
            igst = (itemTaxableAmount * itemIgstRate) / 100;
            itemAmount = itemTaxableAmount + cgst + sgst + igst;
          }
        } else {
          itemTaxableAmount = amountAfterDiscount;
          itemAmount = amountAfterDiscount;
        }

        subtotal += baseAmount;
        totalDiscount += itemDiscountAmount;
        totalTaxableAmount += itemTaxableAmount;
        totalQuantity += quantity;
        const itemTotalTax = cgst + sgst + igst;
        totalTax += itemTotalTax;

        const processedItem = {
          itemRef:
            item.selectedProduct &&
            mongoose.Types.ObjectId.isValid(item.selectedProduct)
              ? item.selectedProduct
              : null,
          selectedProduct: item.selectedProduct || "",
          itemName: itemName.trim(),
          productName: itemName.trim(),
          itemCode: itemCode,
          productCode: itemCode,
          description: description,
          hsnCode: hsnNumber,
          hsnNumber: hsnNumber,
          category: item.category || "",
          quantity,
          unit: unit,
          pricePerUnit: pricePerUnit,
          price: pricePerUnit,
          rate: pricePerUnit,
          purchasePrice: pricePerUnit,
          sellingPrice: item.sellingPrice || pricePerUnit,
          taxRate: itemCgstRate + itemSgstRate + itemIgstRate,
          gstRate: itemCgstRate + itemSgstRate + itemIgstRate,
          taxMode: itemPriceIncludesTax ? "with-tax" : "without-tax",
          gstMode: itemPriceIncludesTax ? "include" : "exclude",
          priceIncludesTax: itemPriceIncludesTax,
          availableStock: item.availableStock || 0,
          discountPercent,
          discountAmount: Math.round(itemDiscountAmount * 100) / 100,
          discount: discountPercent,
          discountType: "percentage",
          cgst: Math.round(cgst * 100) / 100,
          sgst: Math.round(sgst * 100) / 100,
          igst: Math.round(igst * 100) / 100,
          cgstAmount: Math.round(cgst * 100) / 100,
          sgstAmount: Math.round(sgst * 100) / 100,
          igstAmount: Math.round(igst * 100) / 100,
          subtotal: Math.round((baseAmount - itemDiscountAmount) * 100) / 100,
          taxableAmount: Math.round(itemTaxableAmount * 100) / 100,
          totalTaxAmount: Math.round(itemTotalTax * 100) / 100,
          gstAmount: Math.round(itemTotalTax * 100) / 100,
          amount: Math.round(itemAmount * 100) / 100,
          itemAmount: Math.round(itemAmount * 100) / 100,
          totalAmount: Math.round(itemAmount * 100) / 100,
          lineNumber: i + 1,
        };

        processedItems.push(processedItem);
      }

      // ... [Keep existing totals and payment logic] ...
      const baseTotal = processedItems.reduce(
        (sum, item) => sum + item.amount,
        0
      );
      let appliedRoundOff = 0;
      let adjustedFinalTotal = baseTotal;

      if (roundOffEnabled && roundOff !== 0) {
        appliedRoundOff = parseFloat(roundOff);
        adjustedFinalTotal = baseTotal + appliedRoundOff;
      }

      const totals = {
        subtotal: Math.round(subtotal * 100) / 100,
        totalQuantity: totalQuantity,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        totalDiscountAmount: Math.round(totalDiscount * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        totalCGST:
          Math.round(
            processedItems.reduce((sum, item) => sum + item.cgst, 0) * 100
          ) / 100,
        totalSGST:
          Math.round(
            processedItems.reduce((sum, item) => sum + item.sgst, 0) * 100
          ) / 100,
        totalIGST:
          Math.round(
            processedItems.reduce((sum, item) => sum + item.igst, 0) * 100
          ) / 100,
        totalTaxableAmount: Math.round(totalTaxableAmount * 100) / 100,
        finalTotal: Math.round(adjustedFinalTotal * 100) / 100,
        roundOff: Math.round(appliedRoundOff * 100) / 100,
        withTaxTotal: finalPriceIncludesTax
          ? Math.round(adjustedFinalTotal * 100) / 100
          : Math.round(
              (totalTaxableAmount + totalTax + appliedRoundOff) * 100
            ) / 100,
        withoutTaxTotal: finalPriceIncludesTax
          ? Math.round(totalTaxableAmount * 100) / 100
          : Math.round(adjustedFinalTotal * 100) / 100,
      };

      const paymentDetails = {
        method: payment?.method || "credit",
        status: payment?.status || "pending",
        paidAmount: Math.max(
          parseFloat(payment?.paidAmount || 0),
          parseFloat(payment?.advanceAmount || 0)
        ),
        advanceAmount: parseFloat(payment?.advanceAmount || 0),
        pendingAmount: 0,
        paymentDate: payment?.paymentDate
          ? new Date(payment.paymentDate)
          : new Date(),
        dueDate: payment?.dueDate ? new Date(payment.dueDate) : null,
        creditDays: parseInt(payment?.creditDays || 30),
        reference: payment?.reference || "",
        notes: payment?.notes || "",
      };

      paymentDetails.pendingAmount =
        Math.round((adjustedFinalTotal - paymentDetails.paidAmount) * 100) /
        100;

      if (paymentDetails.paidAmount >= adjustedFinalTotal) {
        paymentDetails.status = "paid";
        paymentDetails.pendingAmount = 0;
        paymentDetails.dueDate = null;
      } else if (paymentDetails.paidAmount > 0) {
        paymentDetails.status = "partial";
        if (paymentDetails.creditDays > 0 && !paymentDetails.dueDate) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + paymentDetails.creditDays);
          paymentDetails.dueDate = dueDate;
        }
      } else {
        paymentDetails.status = "pending";
        if (paymentDetails.creditDays > 0 && !paymentDetails.dueDate) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + paymentDetails.creditDays);
          paymentDetails.dueDate = dueDate;
        }
      }

      if (paymentDetails.pendingAmount < 0) {
        paymentDetails.pendingAmount = 0;
      }

      let paymentHistory = [];
      if (paymentDetails.paidAmount > 0) {
        paymentHistory.push({
          amount: paymentDetails.paidAmount,
          method: paymentDetails.method,
          reference: paymentDetails.reference,
          paymentDate: paymentDetails.paymentDate,
          notes: paymentDetails.notes || "Initial payment",
          createdAt: new Date(),
          createdBy: req.user?.id || employeeId || "system",
        });
      }

      let orderValidUntil = validUntil ? new Date(validUntil) : null;
      if (!orderValidUntil && orderType === "purchase_quotation") {
        orderValidUntil = new Date();
        orderValidUntil.setDate(orderValidUntil.getDate() + 30);
      }

      // ✅ ENHANCED: Create purchase order data with auto-detected sourceCompanyId
      const purchaseOrderData = {
        orderNumber: finalOrderNumber,
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        orderType,
        validUntil: orderValidUntil,
        expectedDeliveryDate: expectedDeliveryDate
          ? new Date(expectedDeliveryDate)
          : null,
        deliveryDate: null,
        requiredBy: requiredBy ? new Date(requiredBy) : null,
        supplier: supplierRecord._id,
        supplierMobile:
          supplierMobile || supplierRecord.mobile || supplierRecord.phoneNumber,
        gstEnabled: finalGstEnabled,
        gstType: finalGstType,
        taxMode: finalTaxMode,
        priceIncludesTax: finalPriceIncludesTax,
        companyId,
        correspondingSalesOrderId: null,
        correspondingSalesOrderNumber: null,
        sourceOrderId:
          sourceOrderId && mongoose.Types.ObjectId.isValid(sourceOrderId)
            ? sourceOrderId
            : null,
        sourceOrderNumber: sourceOrderNumber || null,
        sourceOrderType:
          sourceOrderType &&
          ["sales-order", "quotation", "proforma-invoice"].includes(
            sourceOrderType
          )
            ? sourceOrderType
            : null,

        // ✅ ENHANCED: Include auto-detected or manual sourceCompanyId
        sourceCompanyId:
          finalSourceCompanyId &&
          mongoose.Types.ObjectId.isValid(finalSourceCompanyId)
            ? finalSourceCompanyId
            : null,

        isAutoGenerated: isAutoGenerated || false,
        generatedFrom:
          generatedFrom &&
          ["sales_order", "manual", "import", "api"].includes(generatedFrom)
            ? generatedFrom
            : "manual",
        generatedBy:
          generatedBy && mongoose.Types.ObjectId.isValid(generatedBy)
            ? generatedBy
            : req.user?.id || employeeId || null,
        generatedAt: isAutoGenerated ? new Date() : null,
        autoGeneratedSalesOrder: false,
        salesOrderRef: null,
        salesOrderNumber: null,
        salesOrderGeneratedAt: null,
        salesOrderGeneratedBy: null,
        targetCompanyId:
          targetCompanyId && mongoose.Types.ObjectId.isValid(targetCompanyId)
            ? targetCompanyId
            : null,
        items: processedItems,
        totals,
        payment: paymentDetails,
        paymentHistory: paymentHistory,
        notes: notes || "",
        termsAndConditions: termsAndConditions || "",
        supplierNotes: supplierNotes || "",
        internalNotes: internalNotes || "",
        status,
        priority,
        departmentRef: departmentRef || null,
        shippingAddress: shippingAddress || {
          street: "",
          city: "",
          state: "",
          zipCode: "",
          country: "India",
        },
        convertedToPurchaseInvoice: false,
        purchaseInvoiceRef: null,
        purchaseInvoiceNumber: null,
        convertedAt: null,
        convertedBy: null,
        roundOff: appliedRoundOff,
        roundOffEnabled: roundOffEnabled,
        createdBy: createdBy || employeeName || req.user?.id || "system",
        lastModifiedBy:
          lastModifiedBy ||
          createdBy ||
          employeeName ||
          req.user?.id ||
          "system",
      };

      // Clean up undefined values
      Object.keys(purchaseOrderData).forEach((key) => {
        if (purchaseOrderData[key] === undefined) {
          delete purchaseOrderData[key];
        }
      });

      if (purchaseOrderData.payment) {
        Object.keys(purchaseOrderData.payment).forEach((key) => {
          if (purchaseOrderData.payment[key] === undefined) {
            delete purchaseOrderData.payment[key];
          }
        });
      }

      if (purchaseOrderData.totals) {
        Object.keys(purchaseOrderData.totals).forEach((key) => {
          if (purchaseOrderData.totals[key] === undefined) {
            delete purchaseOrderData.totals[key];
          }
        });
      }

      if (!supplierRecord || !supplierRecord._id) {
        throw new Error("Supplier not found or invalid supplier data");
      }

      if (!purchaseOrderData.items || purchaseOrderData.items.length === 0) {
        throw new Error("No valid items found for purchase order creation");
      }

      console.log("💾 Creating purchase order with enhanced tracking:", {
        orderNumber: purchaseOrderData.orderNumber,
        supplierId: supplierRecord._id,
        supplierName: supplierRecord.name,
        companyId: purchaseOrderData.companyId,
        sourceCompanyId: purchaseOrderData.sourceCompanyId?.toString(),
        sourceCompanyDetectionMethod,
        hasSourceCompany: !!purchaseOrderData.sourceCompanyId,
        autoDetectedSource:
          sourceCompanyDetectionMethod === "supplier_linked_company",
      });

      // ✅ Create purchase order
      const purchaseOrder = new PurchaseOrder(purchaseOrderData);
      await purchaseOrder.save();

      // ✅ Auto-create corresponding sales order if enabled
      let correspondingSalesOrder = null;
      if (autoCreateCorrespondingSO && targetCompanyId) {
        try {
          if (
            typeof purchaseOrder.createCorrespondingSalesOrder === "function"
          ) {
            correspondingSalesOrder =
              await purchaseOrder.createCorrespondingSalesOrder();
          }
        } catch (correspondingOrderError) {
          console.warn(
            "⚠️ Failed to create corresponding sales order:",
            correspondingOrderError.message
          );
          // Don't fail the main purchase order creation
        }
      }

      // ✅ Populate relationships for response
      await purchaseOrder.populate(
        "supplier",
        "name mobile phoneNumber email address type linkedCompanyId"
      );

      if (purchaseOrder.sourceCompanyId) {
        await purchaseOrder.populate(
          "sourceCompanyId",
          "businessName email phoneNumber gstin"
        );
      }
      if (purchaseOrder.targetCompanyId) {
        await purchaseOrder.populate("targetCompanyId", "businessName email");
      }

      console.log(
        "✅ Purchase order created successfully with enhanced tracking:",
        {
          orderId: purchaseOrder._id,
          orderNumber: purchaseOrder.orderNumber,
          supplierName: supplierRecord.name,
          sourceCompanyId: purchaseOrder.sourceCompanyId?.toString(),
          sourceCompanyName: sourceCompanyDetails?.businessName,
          detectionMethod: sourceCompanyDetectionMethod,
          hasCorrespondingSO: !!correspondingSalesOrder,
        }
      );

      // ✅ ENHANCED: Response with source company tracking details
      res.status(201).json({
        success: true,
        message: `${
          orderType === "purchase_quotation"
            ? "Purchase quotation"
            : orderType === "proforma_purchase"
            ? "Proforma purchase"
            : "Purchase order"
        } created successfully`,
        data: {
          purchaseOrder,
          order: {
            orderNumber: purchaseOrder.orderNumber,
            orderDate: purchaseOrder.orderDate,
            orderType: purchaseOrder.orderType,
            validUntil: purchaseOrder.validUntil,
            supplier: {
              id: supplierRecord._id,
              name: supplierRecord.name,
              mobile: supplierRecord.mobile || supplierRecord.phoneNumber,
              email: supplierRecord.email || "",
              linkedCompanyId:
                supplierRecord.linkedCompanyId?._id ||
                supplierRecord.linkedCompanyId,
              linkedCompanyName: supplierRecord.linkedCompanyId?.businessName,
            },
            totals: purchaseOrder.totals,
            payment: {
              ...purchaseOrder.payment,
              dueDate: purchaseOrder.payment.dueDate,
              creditDays: purchaseOrder.payment.creditDays,
            },
            gstType: purchaseOrder.gstType,
            gstEnabled: purchaseOrder.gstEnabled,
            taxMode: purchaseOrder.taxMode,
            priceIncludesTax: purchaseOrder.priceIncludesTax,
            status: purchaseOrder.status,
            priority: purchaseOrder.priority,
            trackingInfo: {
              isAutoGenerated: purchaseOrder.isAutoGenerated,
              generatedFrom: purchaseOrder.generatedFrom,
              sourceOrderNumber: purchaseOrder.sourceOrderNumber,
              sourceOrderType: purchaseOrder.sourceOrderType,
              hasSource: !!purchaseOrder.sourceOrderId,
              hasCorresponding: !!purchaseOrder.correspondingSalesOrderId,
              hasGenerated: !!purchaseOrder.salesOrderRef,

              // ✅ NEW: Source company tracking
              sourceCompanyId: purchaseOrder.sourceCompanyId?.toString(),
              sourceCompanyDetails,
              sourceCompanyDetectionMethod,
              autoDetectedSourceCompany:
                sourceCompanyDetectionMethod === "supplier_linked_company",
            },
          },
          correspondingSalesOrder: correspondingSalesOrder
            ? {
                id: correspondingSalesOrder._id,
                orderNumber: correspondingSalesOrder.orderNumber,
                companyId: correspondingSalesOrder.companyId,
                status: correspondingSalesOrder.status,
                totalAmount: correspondingSalesOrder.totals.finalTotal,
              }
            : null,
          orderNumberInfo: {
            orderNumber: finalOrderNumber,
            wasAutoGenerated: !orderNumber,
            generatedAt: !orderNumber ? new Date().toISOString() : null,
            isUnique: true,
          },
          supplierInfo: {
            supplierId: supplierRecord._id,
            supplierName: supplierRecord.name,
            wasCreated: !supplier && !supplierMobile,
            resolutionMethod: supplier
              ? "by_id"
              : supplierMobile
              ? "by_mobile"
              : "by_name",
            hasLinkedCompany: !!supplierRecord.linkedCompanyId,
            linkedCompanyId:
              supplierRecord.linkedCompanyId?._id ||
              supplierRecord.linkedCompanyId,
            linkedCompanyName: supplierRecord.linkedCompanyId?.businessName,
          },

          // ✅ NEW: Enhanced source company tracking info
          sourceCompanyTracking: {
            enabled: autoDetectSourceCompany,
            detected: !!finalSourceCompanyId,
            detectionMethod: sourceCompanyDetectionMethod,
            sourceCompanyId: finalSourceCompanyId?.toString(),
            sourceCompanyDetails,
            supplierLinkedCompany: {
              id:
                supplierRecord.linkedCompanyId?._id ||
                supplierRecord.linkedCompanyId,
              name: supplierRecord.linkedCompanyId?.businessName,
              email: supplierRecord.linkedCompanyId?.email,
              gstin: supplierRecord.linkedCompanyId?.gstin,
              isActive: supplierRecord.linkedCompanyId?.isActive,
            },
            explanation:
              sourceCompanyDetectionMethod === "supplier_linked_company"
                ? "Source company auto-detected from supplier's linked company account"
                : sourceCompanyDetectionMethod === "manual"
                ? "Source company provided manually"
                : "No source company detected or provided",
          },
        },
      });
    } catch (error) {
      console.error("❌ Error creating purchase order:", error);

      if (error.code === 11000 && error.keyPattern?.orderNumber) {
        return res.status(400).json({
          success: false,
          message: "Order number already exists (database constraint)",
          error: "DUPLICATE_ORDER_NUMBER_DB",
          code: "DUPLICATE_ORDER_NUMBER_DB",
          suggestion: "This appears to be a race condition. Please try again.",
        });
      }

      if (error.name === "ValidationError") {
        const validationErrors = Object.values(error.errors).map(
          (err) => err.message
        );
        return res.status(400).json({
          success: false,
          message: "Purchase order validation failed",
          error: "VALIDATION_ERROR",
          code: "VALIDATION_ERROR",
          validationErrors,
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to create purchase order",
        error: error.message,
        code: "PURCHASE_ORDER_CREATION_FAILED",
      });
    }
  },

  // Retrieve all purchase orders with advanced filtering and pagination
  getAllPurchaseOrders: async (req, res) => {
    try {
      const {companyId} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const {
        page = 1,
        limit = 10,
        orderType,
        status,
        priority,
        search,
        dateFrom,
        dateTo,
        supplierId,
        convertedToPurchaseInvoice,
        isAutoGenerated,
        generatedFrom,
        hasCorrespondingSO,
        hasGeneratedSO,
        sourceOrderType,
        sourceOrderId,
        targetCompanyId,
        paymentStatus,
        isOverdue,
        isExpired,
        sortBy = "orderDate",
        sortOrder = "desc",
      } = req.query;

      const filter = {companyId};

      if (orderType) {
        if (orderType.includes(",")) {
          filter.orderType = {$in: orderType.split(",")};
        } else {
          filter.orderType = orderType;
        }
      }

      if (status) {
        if (status.includes(",")) {
          filter.status = {$in: status.split(",")};
        } else {
          filter.status = status;
        }
      }

      if (priority) {
        filter.priority = priority;
      }

      if (supplierId) {
        filter.supplier = supplierId;
      }

      if (convertedToPurchaseInvoice !== undefined) {
        filter.convertedToPurchaseInvoice =
          convertedToPurchaseInvoice === "true";
      }

      if (isAutoGenerated !== undefined) {
        filter.isAutoGenerated = isAutoGenerated === "true";
      }

      if (generatedFrom) {
        if (generatedFrom.includes(",")) {
          filter.generatedFrom = {$in: generatedFrom.split(",")};
        } else {
          filter.generatedFrom = generatedFrom;
        }
      }

      if (hasCorrespondingSO === "true") {
        filter.correspondingSalesOrderId = {$exists: true, $ne: null};
      } else if (hasCorrespondingSO === "false") {
        filter.$or = [
          {correspondingSalesOrderId: {$exists: false}},
          {correspondingSalesOrderId: null},
        ];
      }

      if (hasGeneratedSO === "true") {
        filter.autoGeneratedSalesOrder = true;
        filter.salesOrderRef = {$exists: true, $ne: null};
      } else if (hasGeneratedSO === "false") {
        filter.$or = [
          {autoGeneratedSalesOrder: {$ne: true}},
          {salesOrderRef: {$exists: false}},
          {salesOrderRef: null},
        ];
      }

      if (sourceOrderType) {
        if (sourceOrderType.includes(",")) {
          filter.sourceOrderType = {$in: sourceOrderType.split(",")};
        } else {
          filter.sourceOrderType = sourceOrderType;
        }
      }

      if (sourceOrderId && mongoose.Types.ObjectId.isValid(sourceOrderId)) {
        filter.sourceOrderId = sourceOrderId;
      }

      if (targetCompanyId && mongoose.Types.ObjectId.isValid(targetCompanyId)) {
        filter.targetCompanyId = targetCompanyId;
      }

      if (paymentStatus) {
        if (paymentStatus.includes(",")) {
          filter["payment.status"] = {$in: paymentStatus.split(",")};
        } else {
          filter["payment.status"] = paymentStatus;
        }
      }

      if (isOverdue === "true") {
        filter["payment.dueDate"] = {$lt: new Date()};
        filter["payment.pendingAmount"] = {$gt: 0};
      } else if (isOverdue === "false") {
        filter.$or = [
          {"payment.dueDate": {$gte: new Date()}},
          {"payment.dueDate": null},
          {"payment.pendingAmount": {$lte: 0}},
        ];
      }

      if (isExpired === "true") {
        filter.validUntil = {$lt: new Date()};
        filter.status = {$nin: ["completed", "cancelled"]};
      } else if (isExpired === "false") {
        filter.$or = [
          {validUntil: {$gte: new Date()}},
          {validUntil: null},
          {status: {$in: ["completed", "cancelled"]}},
        ];
      }

      if (dateFrom || dateTo) {
        filter.orderDate = {};
        if (dateFrom) filter.orderDate.$gte = new Date(dateFrom);
        if (dateTo) filter.orderDate.$lte = new Date(dateTo);
      }

      if (search) {
        filter.$or = [
          {orderNumber: {$regex: search, $options: "i"}},
          {"items.itemName": {$regex: search, $options: "i"}},
          {notes: {$regex: search, $options: "i"}},
          {sourceOrderNumber: {$regex: search, $options: "i"}},
          {correspondingSalesOrderNumber: {$regex: search, $options: "i"}},
          {salesOrderNumber: {$regex: search, $options: "i"}},
          {purchaseInvoiceNumber: {$regex: search, $options: "i"}},
        ];
      }

      const sortOptions = {};
      const validSortFields = [
        "orderDate",
        "orderNumber",
        "status",
        "priority",
        "totals.finalTotal",
        "payment.dueDate",
        "validUntil",
        "generatedAt",
        "convertedAt",
        "createdAt",
        "updatedAt",
      ];

      if (validSortFields.includes(sortBy)) {
        sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
      } else {
        sortOptions.orderDate = -1;
        sortOptions.orderNumber = -1;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [orders, total] = await Promise.all([
        PurchaseOrder.find(filter)
          .populate("supplier", "name mobile phoneNumber email address")
          .populate("sourceCompanyId", "businessName email")
          .populate("targetCompanyId", "businessName email")
          .populate("salesOrderRef", "orderNumber status totals.finalTotal")
          .populate(
            "purchaseInvoiceRef",
            "invoiceNumber status totals.finalTotal"
          )
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit)),
        PurchaseOrder.countDocuments(filter),
      ]);

      const ordersWithTrackingAndStatus = orders.map((order) => {
        const orderObj = order.toObject();

        return {
          ...orderObj,
          trackingInfo: order.trackingInfo,
          isOverdue: order.isOverdue,
          isExpired: order.isExpired,
          isRequiredDatePassed: order.isRequiredDatePassed,
          balanceAmount: order.balanceAmount,
          hasCorrespondingSalesOrder: order.hasCorrespondingSalesOrder,
          isFromSalesOrder: order.isFromSalesOrder,
          hasGeneratedSalesOrder: order.hasGeneratedSalesOrder,
          relationshipStatus: {
            hasSource: !!order.sourceOrderId,
            hasCorresponding: !!order.correspondingSalesOrderId,
            hasGenerated: !!order.salesOrderRef,
            hasConverted: !!order.purchaseInvoiceRef,
            isAutoGenerated: order.isAutoGenerated,
          },
        };
      });

      const summary = {
        totalOrders: total,
        totalValue: orders.reduce(
          (sum, order) => sum + (order.totals?.finalTotal || 0),
          0
        ),
        pendingPayments: orders.reduce(
          (sum, order) => sum + (order.payment?.pendingAmount || 0),
          0
        ),
        autoGenerated: orders.filter((order) => order.isAutoGenerated).length,
        withCorrespondingSO: orders.filter(
          (order) => order.hasCorrespondingSalesOrder
        ).length,
        withGeneratedSO: orders.filter((order) => order.hasGeneratedSalesOrder)
          .length,
        converted: orders.filter((order) => order.convertedToPurchaseInvoice)
          .length,
        overdue: orders.filter((order) => order.isOverdue).length,
        expired: orders.filter((order) => order.isExpired).length,
      };

      res.json({
        success: true,
        data: {
          orders: ordersWithTrackingAndStatus,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalOrders: total,
            limit: parseInt(limit),
            hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
            hasPrev: parseInt(page) > 1,
          },
          summary,
          filter: {
            companyId,
            orderType,
            status,
            priority,
            search,
            dateFrom,
            dateTo,
            supplierId,
            convertedToPurchaseInvoice,
            isAutoGenerated,
            generatedFrom,
            hasCorrespondingSO,
            hasGeneratedSO,
            sourceOrderType,
            sourceOrderId,
            targetCompanyId,
            paymentStatus,
            isOverdue,
            isExpired,
            sortBy,
            sortOrder,
          },
        },
        message: `Retrieved ${orders.length} purchase orders`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve purchase orders",
        error: error.message,
      });
    }
  },

  // Generate unique purchase order number with validation
  generateOrderNumber: async (req, res) => {
    try {
      const {companyId, orderType = "purchase_order"} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
          code: "MISSING_COMPANY_ID",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid company ID format",
          code: "INVALID_COMPANY_ID",
          provided: companyId,
        });
      }

      const company = await mongoose.connection.db
        .collection("companies")
        .findOne(
          {_id: new mongoose.Types.ObjectId(companyId)},
          {projection: {businessName: 1, isActive: 1}}
        );

      if (!company) {
        return res.status(404).json({
          success: false,
          message: "Company not found",
          code: "COMPANY_NOT_FOUND",
          companyId,
        });
      }

      if (company.isActive === false) {
        return res.status(400).json({
          success: false,
          message: "Company is not active",
          code: "COMPANY_INACTIVE",
          companyName: company.businessName,
        });
      }

      const validOrderTypes = [
        "purchase_order",
        "purchase_quotation",
        "proforma_purchase",
      ];
      if (!validOrderTypes.includes(orderType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order type",
          code: "INVALID_ORDER_TYPE",
          provided: orderType,
          validTypes: validOrderTypes,
        });
      }

      let nextOrderNumber;
      let generationAttempts = 0;
      const maxAttempts = 3;

      while (generationAttempts < maxAttempts) {
        try {
          nextOrderNumber = await generateNextPurchaseOrderNumber(
            companyId,
            orderType
          );

          const finalCheck = await PurchaseOrder.findOne({
            orderNumber: nextOrderNumber,
            companyId: companyId,
          }).lean();

          if (!finalCheck) {
            break;
          }

          generationAttempts++;

          if (generationAttempts >= maxAttempts) {
            throw new Error(
              "Failed to generate unique order number after multiple attempts"
            );
          }

          await new Promise((resolve) => setTimeout(resolve, 10));
        } catch (generationError) {
          generationAttempts++;

          if (generationAttempts >= maxAttempts) {
            throw generationError;
          }
        }
      }

      if (!nextOrderNumber) {
        throw new Error("Order number generation returned empty result");
      }

      res.status(200).json({
        success: true,
        data: {
          nextOrderNumber,
          orderType,
          companyId,
          companyName: company.businessName,
          generatedAt: new Date().toISOString(),
          date: new Date().toISOString().split("T")[0],
          generationAttempts: generationAttempts + 1,
          isUnique: true,
        },
        message: "Order number generated successfully",
        metadata: {
          pattern: nextOrderNumber.includes("PO-")
            ? "PO-YYYYMMDD-NNNN"
            : "Emergency format",
          sequenceType: nextOrderNumber.includes("EMRG")
            ? "emergency"
            : "sequential",
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to generate order number",
        error: error.message,
        code: "ORDER_NUMBER_GENERATION_FAILED",
        details: {
          companyId: req.query.companyId,
          orderType: req.query.orderType,
          timestamp: new Date().toISOString(),
          errorType: error.name || "UnknownError",
        },
        suggestion:
          "Please try again. If the problem persists, contact support.",
      });
    }
  },
  // Retrieve single purchase order by ID with compatibility mapping
  getPurchaseOrderById: async (req, res) => {
    try {
      const {id} = req.params;
      const {populate} = req.query;

      // ✅ Validate purchase order ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase order ID format",
          code: "INVALID_ID_FORMAT",
          provided: id,
        });
      }

      // ✅ Build query with optional population
      let query = PurchaseOrder.findById(id);

      // ✅ Add population if requested
      if (populate) {
        const populateFields = populate.split(",");
        populateFields.forEach((field) => {
          if (field === "supplier") {
            query = query.populate(
              "supplier",
              "name mobile phoneNumber email address type linkedCompanyId gstNumber"
            );
          } else if (field === "companyId") {
            query = query.populate(
              "companyId",
              "businessName email phoneNumber gstin address"
            );
          } else if (field === "sourceCompanyId") {
            query = query.populate(
              "sourceCompanyId",
              "businessName email phoneNumber gstin"
            );
          } else if (field === "targetCompanyId") {
            query = query.populate(
              "targetCompanyId",
              "businessName email phoneNumber gstin"
            );
          } else if (field === "salesOrderRef") {
            query = query.populate(
              "salesOrderRef",
              "orderNumber status totals.finalTotal orderDate"
            );
          } else if (field === "purchaseInvoiceRef") {
            query = query.populate(
              "purchaseInvoiceRef",
              "invoiceNumber status totals.finalTotal invoiceDate"
            );
          } else if (field === "items.itemRef") {
            query = query.populate(
              "items.itemRef",
              "name code category description"
            );
          }
        });
      } else {
        // ✅ Default population for essential fields
        query = query
          .populate(
            "supplier",
            "name mobile phoneNumber email address type linkedCompanyId gstNumber"
          )
          .populate("companyId", "businessName email phoneNumber gstin")
          .populate("sourceCompanyId", "businessName email phoneNumber gstin")
          .populate("targetCompanyId", "businessName email phoneNumber gstin")
          .populate(
            "salesOrderRef",
            "orderNumber status totals.finalTotal orderDate"
          )
          .populate(
            "purchaseInvoiceRef",
            "invoiceNumber status totals.finalTotal invoiceDate"
          )
          .populate("items.itemRef", "name code category description");
      }

      // ✅ Execute query
      const order = await query.exec();

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
          code: "ORDER_NOT_FOUND",
          orderId: id,
        });
      }

      console.log("✅ Purchase order fetched:", {
        id: order._id,
        orderNumber: order.orderNumber,
        supplier: order.supplier,
        companyId: order.companyId,
        hasSourceCompany: !!order.sourceCompanyId,
        hasTargetCompany: !!order.targetCompanyId,
        isAutoGenerated: order.isAutoGenerated,
        hasCorrespondingSO: order.hasCorrespondingSalesOrder,
        hasGeneratedSO: order.hasGeneratedSalesOrder,
      });

      // ✅ FIXED: Safe handling of populated vs non-populated fields
      const compatibleOrder = {
        ...order.toObject(),

        // ✅ GST and Tax compatibility mappings
        gstType: order.gstType || (order.gstEnabled ? "gst" : "non-gst"),
        gstEnabled: order.gstEnabled ?? order.gstType === "gst",
        taxMode:
          order.taxMode ||
          (order.priceIncludesTax ? "with-tax" : "without-tax"),
        priceIncludesTax:
          order.priceIncludesTax ?? order.taxMode === "with-tax",

        // ✅ FIXED: Enhanced supplier information with safe handling
        supplier: order.supplier
          ? {
              ...(typeof order.supplier.toObject === "function"
                ? order.supplier.toObject()
                : order.supplier),
              // Add compatibility fields
              mobile: order.supplier.mobile || order.supplier.phoneNumber,
              phone: order.supplier.phoneNumber || order.supplier.mobile,
              linkedCompanyId:
                order.supplier.linkedCompanyId?._id ||
                order.supplier.linkedCompanyId,
              linkedCompanyName: order.supplier.linkedCompanyId?.businessName,
              hasLinkedCompany: !!order.supplier.linkedCompanyId,
            }
          : null,

        // ✅ FIXED: Enhanced company information with safe handling
        companyId: order.companyId
          ? {
              ...(typeof order.companyId.toObject === "function"
                ? order.companyId.toObject()
                : order.companyId),
              id: order.companyId._id || order.companyId,
              name: order.companyId.businessName || order.companyId.name,
            }
          : order.companyId,

        // ✅ FIXED: Source company information with safe handling
        sourceCompanyId: order.sourceCompanyId
          ? {
              ...(typeof order.sourceCompanyId.toObject === "function"
                ? order.sourceCompanyId.toObject()
                : order.sourceCompanyId),
              id: order.sourceCompanyId._id || order.sourceCompanyId,
              name:
                order.sourceCompanyId.businessName ||
                order.sourceCompanyId.name,
            }
          : order.sourceCompanyId,

        // ✅ FIXED: Target company information with safe handling
        targetCompanyId: order.targetCompanyId
          ? {
              ...(typeof order.targetCompanyId.toObject === "function"
                ? order.targetCompanyId.toObject()
                : order.targetCompanyId),
              id: order.targetCompanyId._id || order.targetCompanyId,
              name:
                order.targetCompanyId.businessName ||
                order.targetCompanyId.name,
            }
          : order.targetCompanyId,

        // ✅ Enhanced items with compatibility mappings
        items: order.items.map((item) => ({
          ...item.toObject(),

          // Product/Item name compatibility
          selectedProduct: item.selectedProduct || item.itemRef?._id || "",
          productName: item.productName || item.itemName,
          itemName: item.itemName || item.productName,
          productCode: item.productCode || item.itemCode,
          itemCode: item.itemCode || item.productCode,

          // Price compatibility
          price: item.price || item.pricePerUnit || item.rate,
          pricePerUnit: item.pricePerUnit || item.price || item.rate,
          rate: item.rate || item.price || item.pricePerUnit,

          // Tax/GST compatibility
          gstRate: item.gstRate || item.taxRate || 0,
          taxRate: item.taxRate || item.gstRate || 0,
          gstMode:
            item.gstMode || (item.priceIncludesTax ? "include" : "exclude"),
          taxMode: item.taxMode || order.taxMode || "without-tax",
          priceIncludesTax:
            item.priceIncludesTax ?? item.taxMode === "with-tax",

          // Amount compatibility
          totalAmount: item.totalAmount || item.itemAmount || item.amount,
          itemAmount: item.itemAmount || item.amount || item.totalAmount,
          amount: item.amount || item.totalAmount || item.itemAmount,

          // Tax amount compatibility
          gstAmount:
            item.gstAmount ||
            item.totalTaxAmount ||
            item.cgst + item.sgst + item.igst,
          totalTaxAmount:
            item.totalTaxAmount ||
            item.gstAmount ||
            item.cgst + item.sgst + item.igst,

          // Subtotal compatibility
          subtotal:
            item.subtotal ||
            item.taxableAmount ||
            item.quantity * (item.price || item.pricePerUnit),
          taxableAmount: item.taxableAmount || item.subtotal,

          // HSN compatibility
          hsnNumber: item.hsnNumber || item.hsnCode || "0000",
          hsnCode: item.hsnCode || item.hsnNumber || "0000",

          // Individual tax amounts
          cgstAmount: item.cgstAmount || item.cgst || 0,
          sgstAmount: item.sgstAmount || item.sgst || 0,
          igstAmount: item.igstAmount || item.igst || 0,
          cgst: item.cgst || item.cgstAmount || 0,
          sgst: item.sgst || item.sgstAmount || 0,
          igst: item.igst || item.igstAmount || 0,

          // ✅ FIXED: Item reference with safe handling
          itemRef: item.itemRef
            ? {
                ...(typeof item.itemRef.toObject === "function"
                  ? item.itemRef.toObject()
                  : item.itemRef),
                id: item.itemRef._id || item.itemRef,
              }
            : item.itemRef,
        })),

        // ✅ Enhanced totals
        totals: order.totals
          ? {
              ...order.totals,
              // Add any missing compatibility fields
              finalTotal: order.totals.finalTotal || order.totals.grandTotal,
              grandTotal: order.totals.grandTotal || order.totals.finalTotal,
              totalTax: order.totals.totalTax || order.totals.totalGST,
              totalGST: order.totals.totalGST || order.totals.totalTax,
            }
          : order.totals,

        // ✅ Enhanced payment information
        payment: order.payment
          ? {
              ...order.payment,
              balanceAmount: order.payment.pendingAmount || 0,
              pendingAmount: order.payment.pendingAmount || 0,
              isOverdue: order.isOverdue || false,
            }
          : order.payment,

        // ✅ FIXED: Bidirectional tracking information with safe field access
        trackingInfo: {
          // Source tracking (what this order was generated from)
          isAutoGenerated: order.isAutoGenerated || false,
          generatedFrom: order.generatedFrom || "manual",
          sourceOrderId: order.sourceOrderId,
          sourceOrderNumber: order.sourceOrderNumber,
          sourceOrderType: order.sourceOrderType,
          sourceCompanyId: order.sourceCompanyId?._id || order.sourceCompanyId,
          sourceCompanyName:
            order.sourceCompanyId?.businessName ||
            order.sourceCompanyId?.name ||
            null,

          // Corresponding tracking (linked orders)
          hasCorrespondingSalesOrder: order.hasCorrespondingSalesOrder || false,
          correspondingSalesOrderId: order.correspondingSalesOrderId,
          correspondingSalesOrderNumber: order.correspondingSalesOrderNumber,

          // Generated tracking (what this order generated)
          hasGeneratedSalesOrder: order.hasGeneratedSalesOrder || false,
          autoGeneratedSalesOrder: order.autoGeneratedSalesOrder || false,
          salesOrderRef: order.salesOrderRef?._id || order.salesOrderRef,
          salesOrderNumber: order.salesOrderNumber,
          salesOrderGeneratedAt: order.salesOrderGeneratedAt,
          salesOrderGeneratedBy: order.salesOrderGeneratedBy,

          // Target tracking
          targetCompanyId: order.targetCompanyId?._id || order.targetCompanyId,
          targetCompanyName:
            order.targetCompanyId?.businessName ||
            order.targetCompanyId?.name ||
            null,

          // Conversion tracking
          convertedToPurchaseInvoice: order.convertedToPurchaseInvoice || false,
          purchaseInvoiceRef:
            order.purchaseInvoiceRef?._id || order.purchaseInvoiceRef,
          purchaseInvoiceNumber: order.purchaseInvoiceNumber,
          convertedAt: order.convertedAt,
          convertedBy: order.convertedBy,
        },

        // ✅ Enhanced status information
        statusInfo: {
          status: order.status,
          priority: order.priority || "normal",
          isOverdue: order.isOverdue || false,
          isExpired: order.isExpired || false,
          isRequiredDatePassed: order.isRequiredDatePassed || false,
          balanceAmount:
            order.balanceAmount || order.payment?.pendingAmount || 0,
        },

        // ✅ Enhanced relationship status
        relationshipStatus: {
          hasSource: !!order.sourceOrderId,
          hasCorresponding: !!order.correspondingSalesOrderId,
          hasGenerated: !!order.salesOrderRef,
          hasConverted: !!order.purchaseInvoiceRef,
          isAutoGenerated: order.isAutoGenerated || false,
          isBidirectional:
            !!order.sourceOrderId ||
            !!order.correspondingSalesOrderId ||
            !!order.salesOrderRef,
        },

        // ✅ FIXED: References for populated documents with safe handling
        references: {
          salesOrder: order.salesOrderRef
            ? {
                id: order.salesOrderRef._id || order.salesOrderRef,
                orderNumber: order.salesOrderRef.orderNumber,
                status: order.salesOrderRef.status,
                totalAmount: order.salesOrderRef.totals?.finalTotal,
                orderDate: order.salesOrderRef.orderDate,
              }
            : null,

          purchaseInvoice: order.purchaseInvoiceRef
            ? {
                id: order.purchaseInvoiceRef._id || order.purchaseInvoiceRef,
                invoiceNumber: order.purchaseInvoiceRef.invoiceNumber,
                status: order.purchaseInvoiceRef.status,
                totalAmount: order.purchaseInvoiceRef.totals?.finalTotal,
                invoiceDate: order.purchaseInvoiceRef.invoiceDate,
              }
            : null,
        },
      };

      // ✅ Remove undefined fields to clean up response
      const cleanResponse = JSON.parse(JSON.stringify(compatibleOrder));

      res.status(200).json({
        success: true,
        data: {
          purchaseOrder: cleanResponse,
          order: cleanResponse, // Alias for compatibility
        },
        message: "Purchase order retrieved successfully",
        metadata: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          orderType: order.orderType,
          status: order.status,
          populated: populate
            ? populate.split(",")
            : [
                "supplier",
                "companyId",
                "sourceCompanyId",
                "targetCompanyId",
                "salesOrderRef",
                "purchaseInvoiceRef",
                "items.itemRef",
              ],
          hasRelationships: !!(
            order.sourceOrderId ||
            order.correspondingSalesOrderId ||
            order.salesOrderRef
          ),
          isBidirectional: !!(
            order.sourceOrderId ||
            order.correspondingSalesOrderId ||
            order.salesOrderRef
          ),
          fetchedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("❌ Error fetching purchase order by ID:", error);

      // ✅ Enhanced error response
      let errorMessage = "Failed to retrieve purchase order";
      let errorCode = "FETCH_FAILED";

      if (error.name === "CastError") {
        errorMessage = "Invalid purchase order ID format";
        errorCode = "INVALID_ID_FORMAT";
      } else if (error.name === "ValidationError") {
        errorMessage = "Purchase order validation error";
        errorCode = "VALIDATION_ERROR";
      } else if (error.message) {
        errorMessage = error.message;
      }

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: error.message,
        code: errorCode,
        details: {
          orderId: req.params.id,
          populate: req.query.populate,
          timestamp: new Date().toISOString(),
          errorType: error.name || "UnknownError",
        },
      });
    }
  },
  addPayment: async (req, res) => {
    try {
      const {id} = req.params;
      const {
        amount,
        method = "bank_transfer",
        reference = "",
        paymentDate,
        dueDate,
        creditDays,
        notes = "",
        isAdvancePayment = false,
        paymentDetails = {},
      } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase order ID",
        });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid payment amount is required",
        });
      }

      const purchaseOrder = await PurchaseOrder.findById(id);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      const currentBalance =
        purchaseOrder.balanceAmount || purchaseOrder.payment.pendingAmount;
      if (amount > currentBalance) {
        return res.status(400).json({
          success: false,
          message: `Payment amount cannot exceed balance amount of ₹${currentBalance.toFixed(
            2
          )}`,
        });
      }

      // Create payment record using Payment model
      const paymentRecord = new Payment({
        party: purchaseOrder.supplier,
        partyType: "supplier",
        amount: parseFloat(amount),
        paymentMethod: method,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        type: "payment_out",
        reference,
        notes:
          notes ||
          `Payment for ${purchaseOrder.orderType} ${purchaseOrder.orderNumber}`,
        internalNotes: `Purchase Order: ${purchaseOrder.orderNumber} (${purchaseOrder.orderType})`,
        paymentDetails,
        company: purchaseOrder.companyId,
        createdBy: req.user?.id || "system",
        status: "completed",
        linkedDocuments: [
          {
            documentType: "purchase_order",
            documentId: purchaseOrder._id,
            documentModel: "PurchaseOrder",
            documentNumber: purchaseOrder.orderNumber,
            documentDate: purchaseOrder.orderDate,
            documentTotal: purchaseOrder.totals.finalTotal,
            allocatedAmount: parseFloat(amount),
            remainingAmount: Math.max(0, currentBalance - parseFloat(amount)),
            allocationDate: new Date(),
            isFullyPaid: currentBalance - parseFloat(amount) <= 0,
          },
        ],
      });

      await paymentRecord.save();

      // Add payment using purchase order model method (if available)
      if (typeof purchaseOrder.addPayment === "function") {
        await purchaseOrder.addPayment(amount, method, reference, notes);
      } else {
        // Manual payment addition
        purchaseOrder.payment.paidAmount += parseFloat(amount);
        purchaseOrder.payment.pendingAmount = Math.max(
          0,
          purchaseOrder.payment.pendingAmount - parseFloat(amount)
        );

        if (purchaseOrder.payment.pendingAmount <= 0) {
          purchaseOrder.payment.status = "paid";
        } else if (purchaseOrder.payment.paidAmount > 0) {
          purchaseOrder.payment.status = "partial";
        }

        purchaseOrder.paymentHistory.push({
          amount: parseFloat(amount),
          method,
          reference,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          notes,
          createdAt: new Date(),
          createdBy: req.user?.id || "system",
        });

        await purchaseOrder.save();
      }

      if (isAdvancePayment) {
        purchaseOrder.payment.advanceAmount =
          (purchaseOrder.payment.advanceAmount || 0) + parseFloat(amount);
        await purchaseOrder.save();
      }

      res.status(200).json({
        success: true,
        message: "Payment added successfully",
        data: {
          orderNumber: purchaseOrder.orderNumber,
          paymentNumber: paymentRecord.paymentNumber,
          paymentId: paymentRecord._id,
          totalAmount: purchaseOrder.totals.finalTotal,
          paidAmount: purchaseOrder.payment.paidAmount,
          advanceAmount: purchaseOrder.payment.advanceAmount,
          pendingAmount: purchaseOrder.payment.pendingAmount,
          paymentStatus: purchaseOrder.payment.status,
          paymentMethod: purchaseOrder.payment.method,
          paymentDate: purchaseOrder.payment.paymentDate,
          dueDate: purchaseOrder.payment.dueDate,
          creditDays: purchaseOrder.payment.creditDays,
          isOverdue: purchaseOrder.isOverdue,
          paymentHistory: purchaseOrder.paymentHistory,
          balanceAmount:
            purchaseOrder.balanceAmount || purchaseOrder.payment.pendingAmount,
          paymentRecord: {
            id: paymentRecord._id,
            paymentNumber: paymentRecord.paymentNumber,
            amount: paymentRecord.amount,
            method: paymentRecord.paymentMethod,
            date: paymentRecord.paymentDate,
            status: paymentRecord.status,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to add payment",
        error: error.message,
      });
    }
  },

  convertToPurchaseInvoice: async (req, res) => {
    try {
      const {id} = req.params;
      const {
        invoiceDate,
        transferAdvancePayment = true,
        convertedBy,
      } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase order ID",
        });
      }

      const purchaseOrder = await PurchaseOrder.findById(id);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      if (purchaseOrder.convertedToPurchaseInvoice) {
        return res.status(400).json({
          success: false,
          message: "Purchase order already converted to invoice",
          data: {
            invoiceNumber: purchaseOrder.purchaseInvoiceNumber,
            invoiceRef: purchaseOrder.purchaseInvoiceRef,
            convertedAt: purchaseOrder.convertedAt,
          },
        });
      }

      if (purchaseOrder.status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Cannot convert cancelled orders",
        });
      }

      // Set convertedBy if provided
      if (convertedBy) {
        purchaseOrder.convertedBy = convertedBy;
      }

      // Convert using the model method
      let purchaseInvoice;
      if (typeof purchaseOrder.convertToPurchaseInvoice === "function") {
        purchaseInvoice = await purchaseOrder.convertToPurchaseInvoice();
      } else {
        // Manual conversion logic
        purchaseOrder.convertedToPurchaseInvoice = true;
        purchaseOrder.convertedAt = new Date();
        purchaseOrder.status = "converted";
        await purchaseOrder.save();

        purchaseInvoice = {
          _id: "manual_conversion_" + Date.now(),
          invoiceNumber: "PI-" + purchaseOrder.orderNumber,
          invoiceDate: invoiceDate || new Date(),
          totals: purchaseOrder.totals,
          status: "draft",
        };
      }

      // Update invoice date if provided
      if (invoiceDate && purchaseInvoice.invoiceDate) {
        purchaseInvoice.invoiceDate = new Date(invoiceDate);
        if (typeof purchaseInvoice.save === "function") {
          await purchaseInvoice.save();
        }
      }

      // Transfer advance payments to invoice
      if (transferAdvancePayment && purchaseOrder.payment.advanceAmount > 0) {
        try {
          const advancePayments = await Payment.find({
            party: purchaseOrder.supplier,
            company: purchaseOrder.companyId,
            "linkedDocuments.documentId": purchaseOrder._id,
            status: "completed",
          });

          for (const payment of advancePayments) {
            const originalNotes = payment.notes || "";
            payment.notes = `${originalNotes} - Transferred to Invoice ${purchaseInvoice.invoiceNumber}`;
            payment.internalNotes = `${
              payment.internalNotes || ""
            } | Transferred from PO ${purchaseOrder.orderNumber} to INV ${
              purchaseInvoice.invoiceNumber
            }`;

            payment.linkedDocuments.push({
              documentType: "purchase",
              documentId: purchaseInvoice._id,
              documentModel: "Purchase",
              documentNumber: purchaseInvoice.invoiceNumber,
              documentDate: purchaseInvoice.invoiceDate,
              documentTotal: purchaseInvoice.totals.finalTotal,
              allocatedAmount: payment.amount,
              remainingAmount: Math.max(
                0,
                purchaseInvoice.totals.finalTotal - payment.amount
              ),
              allocationDate: new Date(),
              isFullyPaid: purchaseInvoice.totals.finalTotal <= payment.amount,
            });

            await payment.save();
          }
        } catch (paymentTransferError) {
          // Don't fail the conversion, just log the warning
        }
      }

      // Populate data for response
      await purchaseOrder.populate("supplier", "name mobile phoneNumber email");

      res.status(200).json({
        success: true,
        message: "Purchase order converted to invoice successfully",
        data: {
          purchaseOrder: {
            id: purchaseOrder._id,
            orderNumber: purchaseOrder.orderNumber,
            orderType: purchaseOrder.orderType,
            status: purchaseOrder.status,
            convertedToPurchaseInvoice:
              purchaseOrder.convertedToPurchaseInvoice,
            purchaseInvoiceNumber: purchaseOrder.purchaseInvoiceNumber,
            convertedAt: purchaseOrder.convertedAt,
            convertedBy: purchaseOrder.convertedBy,
          },
          purchaseInvoice: {
            id: purchaseInvoice._id,
            invoiceNumber: purchaseInvoice.invoiceNumber,
            invoiceDate: purchaseInvoice.invoiceDate,
            totalAmount: purchaseInvoice.totals.finalTotal,
            status: purchaseInvoice.status,
          },
          conversion: {
            orderNumber: purchaseOrder.orderNumber,
            invoiceNumber: purchaseInvoice.invoiceNumber,
            convertedAt: purchaseOrder.convertedAt,
            convertedBy: purchaseOrder.convertedBy,
            advanceTransferred: transferAdvancePayment
              ? purchaseOrder.payment.advanceAmount
              : 0,
            transferredAmount: transferAdvancePayment
              ? purchaseOrder.payment.advanceAmount
              : 0,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to convert purchase order to invoice",
        error: error.message,
      });
    }
  },

  updateStatus: async (req, res) => {
    try {
      const {id} = req.params;
      const {status, approvedBy, reason = ""} = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase order ID",
        });
      }

      const validStatuses = [
        "draft",
        "sent",
        "confirmed",
        "received",
        "partially_received",
        "cancelled",
        "completed",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value",
        });
      }

      const purchaseOrder = await PurchaseOrder.findById(id);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      const previousStatus = purchaseOrder.status;

      // Handle approval workflow
      if (status === "confirmed" && approvedBy) {
        if (typeof purchaseOrder.approve === "function") {
          await purchaseOrder.approve(approvedBy);
        } else {
          purchaseOrder.status = "confirmed";
          purchaseOrder.approvedBy = approvedBy;
          purchaseOrder.approvedAt = new Date();
        }
      } else if (status === "received") {
        if (typeof purchaseOrder.markAsReceived === "function") {
          await purchaseOrder.markAsReceived();
        } else {
          purchaseOrder.status = "received";
          purchaseOrder.deliveryDate = new Date();
        }
      } else if (status === "partially_received") {
        if (typeof purchaseOrder.markAsPartiallyReceived === "function") {
          await purchaseOrder.markAsPartiallyReceived();
        } else {
          purchaseOrder.status = "partially_received";
        }
      } else {
        purchaseOrder.status = status;
      }

      // Add reason to notes if provided
      if (reason) {
        const statusNote = `Status changed from ${previousStatus} to ${status}. Reason: ${reason}`;
        purchaseOrder.notes = purchaseOrder.notes
          ? `${purchaseOrder.notes}\n${statusNote}`
          : statusNote;
      }

      purchaseOrder.lastModifiedBy = req.user?.id || "system";
      await purchaseOrder.save();

      res.status(200).json({
        success: true,
        message: "Purchase order status updated successfully",
        data: {
          id: purchaseOrder._id,
          orderNumber: purchaseOrder.orderNumber,
          previousStatus,
          currentStatus: purchaseOrder.status,
          approvedBy: purchaseOrder.approvedBy,
          approvedAt: purchaseOrder.approvedAt,
          reason,
          updatedAt: purchaseOrder.updatedAt,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update purchase order status",
        error: error.message,
      });
    }
  },

  updatePurchaseOrder: async (req, res) => {
    try {
      const {id} = req.params;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase order ID",
        });
      }

      const purchaseOrder = await PurchaseOrder.findById(id);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      if (purchaseOrder.convertedToPurchaseInvoice) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot update purchase order that has been converted to invoice",
        });
      }

      if (purchaseOrder.status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Cannot update cancelled purchase orders",
        });
      }

      updateData.lastModifiedBy = req.user?.id || "system";

      const updatedPurchaseOrder = await PurchaseOrder.findByIdAndUpdate(
        id,
        updateData,
        {new: true, runValidators: true}
      ).populate("supplier", "name mobile phoneNumber email address");

      res.status(200).json({
        success: true,
        message: "Purchase order updated successfully",
        data: updatedPurchaseOrder,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update purchase order",
        error: error.message,
      });
    }
  },

  // Delete purchase order (cancel)
  deletePurchaseOrder: async (req, res) => {
    try {
      const {id} = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase order ID",
        });
      }

      const purchaseOrder = await PurchaseOrder.findById(id);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      if (purchaseOrder.convertedToPurchaseInvoice) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot delete purchase order that has been converted to invoice",
        });
      }

      purchaseOrder.status = "cancelled";
      purchaseOrder.lastModifiedBy = req.user?.id || "system";
      await purchaseOrder.save();

      res.status(200).json({
        success: true,
        message: "Purchase order cancelled successfully",
      });
    } catch (error) {
      console.error("❌ Error deleting purchase order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete purchase order",
        error: error.message,
      });
    }
  },

  // Get pending orders for payment
  getPendingOrdersForPayment: async (req, res) => {
    try {
      const {companyId, supplierId} = req.query;

      const filter = {
        companyId,
        status: {$nin: ["cancelled", "draft"]},
        "payment.pendingAmount": {$gt: 0},
      };

      if (supplierId) {
        filter.supplier = supplierId;
      }

      const pendingOrders = await PurchaseOrder.find(filter)
        .populate("supplier", "name mobile phoneNumber email")
        .select("orderNumber orderDate supplier totals payment")
        .sort({orderDate: -1});

      res.status(200).json({
        success: true,
        data: pendingOrders,
      });
    } catch (error) {
      console.error("❌ Error getting pending orders:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get pending orders for payment",
        error: error.message,
      });
    }
  },

  // Get supplier pending documents
  getSupplierPendingDocuments: async (req, res) => {
    try {
      const {companyId, supplierId} = req.query;

      if (!supplierId) {
        return res.status(400).json({
          success: false,
          message: "Supplier ID is required",
        });
      }

      const pendingOrders = await PurchaseOrder.find({
        companyId,
        supplier: supplierId,
        status: {$nin: ["cancelled", "completed"]},
        "payment.pendingAmount": {$gt: 0},
      })
        .select("orderNumber orderDate orderType totals payment status")
        .sort({orderDate: -1});

      const summary = {
        totalPendingAmount: pendingOrders.reduce(
          (sum, order) => sum + (order.payment?.pendingAmount || 0),
          0
        ),
        totalOrders: pendingOrders.length,
        overdueOrders: pendingOrders.filter((order) => {
          const dueDate = order.payment?.dueDate;
          return dueDate && new Date() > dueDate;
        }).length,
      };

      res.status(200).json({
        success: true,
        data: {
          orders: pendingOrders,
          summary,
        },
      });
    } catch (error) {
      console.error("❌ Error getting supplier pending documents:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get supplier pending documents",
        error: error.message,
      });
    }
  },

  // Get expired orders
  getExpiredOrders: async (req, res) => {
    try {
      const {companyId} = req.query;

      const expiredOrders = await PurchaseOrder.find({
        companyId,
        validUntil: {$lt: new Date()},
        status: {$nin: ["completed", "cancelled", "converted"]},
      })
        .populate("supplier", "name mobile phoneNumber")
        .sort({validUntil: 1});

      res.status(200).json({
        success: true,
        data: expiredOrders,
        message: `Found ${expiredOrders.length} expired orders`,
      });
    } catch (error) {
      console.error("❌ Error getting expired orders:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get expired orders",
        error: error.message,
      });
    }
  },

  // Get orders awaiting approval
  getOrdersAwaitingApproval: async (req, res) => {
    try {
      const {companyId} = req.query;

      const awaitingApproval = await PurchaseOrder.find({
        companyId,
        status: "draft",
        approvedBy: {$exists: false},
      })
        .populate("supplier", "name mobile phoneNumber")
        .sort({orderDate: -1});

      res.status(200).json({
        success: true,
        data: awaitingApproval,
        message: `Found ${awaitingApproval.length} orders awaiting approval`,
      });
    } catch (error) {
      console.error("❌ Error getting orders awaiting approval:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get orders awaiting approval",
        error: error.message,
      });
    }
  },

  // Get orders required by date
  getOrdersRequiredByDate: async (req, res) => {
    try {
      const {companyId, date} = req.query;

      if (!date) {
        return res.status(400).json({
          success: false,
          message: "Date is required",
        });
      }

      const requiredOrders = await PurchaseOrder.find({
        companyId,
        requiredBy: {$lte: new Date(date)},
        status: {$nin: ["completed", "cancelled", "received"]},
      })
        .populate("supplier", "name mobile phoneNumber")
        .sort({requiredBy: 1});

      res.status(200).json({
        success: true,
        data: requiredOrders,
        message: `Found ${requiredOrders.length} orders required by ${date}`,
      });
    } catch (error) {
      console.error("❌ Error getting orders required by date:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get orders required by date",
        error: error.message,
      });
    }
  },
  generatePurchaseOrder: async (req, res) => {
    try {
      const {id} = req.params;
      let {
        targetCompanyId,
        targetSupplierId,
        targetSupplierMobile,
        targetSupplierName,
        convertedBy,
        notes: conversionNotes = "",
        deliveryDate,
        validUntil,
        orderType = "purchase_order",
      } = req.body;

      console.log("🔄 Starting bidirectional purchase order generation:", {
        salesOrderId: id,
        targetCompanyId,
        targetSupplierId,
        autoDetectionMode: !targetCompanyId,
      });

      // Validate sales order ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sales order ID",
        });
      }

      // Find the sales order with populated customer data
      const salesOrder = await SalesOrder.findById(id)
        .populate(
          "customer",
          "name mobile email companyId gstNumber phoneNumber linkedCompanyId companyName"
        )
        .populate(
          "companyId",
          "businessName email phoneNumber gstin address city state pincode"
        );

      if (!salesOrder) {
        return res.status(404).json({
          success: false,
          message: "Sales order not found",
        });
      }

      console.log("📋 Sales order details:", {
        orderNumber: salesOrder.orderNumber,
        customer: salesOrder.customer?.name,
        customerGST: salesOrder.customer?.gstNumber,
        customerPhone: salesOrder.customer?.phoneNumber,
        sourceCompany: salesOrder.companyId?.businessName,
      });

      // Check if purchase order already generated
      if (salesOrder.autoGeneratedPurchaseOrder) {
        return res.status(400).json({
          success: false,
          message: "Purchase order already generated from this sales order",
          data: {
            purchaseOrderNumber: salesOrder.purchaseOrderNumber,
            generatedAt: salesOrder.purchaseOrderGeneratedAt,
          },
        });
      }

      // 🔥 AUTO-DETECT TARGET COMPANY if not provided
      if (!targetCompanyId) {
        console.log("🔍 Auto-detecting target company...");
        targetCompanyId = await findLinkedCompanyForSupplier(
          salesOrder.customer
        );

        if (!targetCompanyId) {
          return res.status(400).json({
            success: false,
            message:
              "Target company not found. Customer is not linked to any company account.",
            suggestion:
              "Either provide targetCompanyId manually or link the customer to a company account",
            customerInfo: {
              id: salesOrder.customer._id,
              name: salesOrder.customer.name,
              gstNumber: salesOrder.customer.gstNumber,
              phone: salesOrder.customer.phoneNumber,
              email: salesOrder.customer.email,
            },
            autoLinkSuggestions: [
              "Match by GST number: Register company with same GST",
              "Match by phone: Use same phone number in company profile",
              "Manual link: Add linkedCompanyId to customer record",
            ],
          });
        }

        console.log(`🎯 Auto-detected target company: ${targetCompanyId}`);
      }

      // 🔥 FIND OR AUTO-CREATE SUPPLIER
      let supplierRecord = null;

      if (
        targetSupplierId &&
        mongoose.Types.ObjectId.isValid(targetSupplierId)
      ) {
        // Method 1: Find by provided supplier ID
        supplierRecord = await Party.findById(targetSupplierId);
        console.log(`🔍 Looking for supplier by ID: ${targetSupplierId}`);
      } else if (targetSupplierMobile) {
        // Method 2: Find by mobile number
        console.log(
          `🔍 Looking for supplier by mobile: ${targetSupplierMobile}`
        );
        supplierRecord = await Party.findOne({
          phoneNumber: targetSupplierMobile,
          companyId: targetCompanyId,
          $or: [
            {partyType: "supplier"},
            {isSupplier: true},
            {type: "supplier"},
          ],
        });
      } else if (targetSupplierName) {
        // Method 3: Find by name
        console.log(`🔍 Looking for supplier by name: ${targetSupplierName}`);
        supplierRecord = await Party.findOne({
          name: {$regex: new RegExp(`^${targetSupplierName.trim()}$`, "i")},
          companyId: targetCompanyId,
          $or: [
            {partyType: "supplier"},
            {isSupplier: true},
            {type: "supplier"},
          ],
        });
      }

      // 🔥 AUTO-CREATE SUPPLIER if not found and source company exists
      if (!supplierRecord) {
        console.log("👤 Supplier not found, attempting auto-creation...");

        try {
          // Get source company details for supplier creation
          const sourceCompany = salesOrder.companyId;
          if (sourceCompany) {
            supplierRecord = await autoCreateSupplierFromCompany(
              sourceCompany,
              targetCompanyId,
              convertedBy
            );
          } else {
            return res.status(404).json({
              success: false,
              message:
                "Supplier not found and source company details unavailable for auto-creation.",
              suggestion:
                "Provide targetSupplierId, targetSupplierMobile, or targetSupplierName for an existing supplier",
              availableSuppliers: `Use GET /api/parties?isSupplier=true&companyId=${targetCompanyId} to see available suppliers`,
            });
          }
        } catch (supplierCreationError) {
          console.error(
            "❌ Failed to auto-create supplier:",
            supplierCreationError
          );
          return res.status(400).json({
            success: false,
            message: "Supplier not found and auto-creation failed",
            error: supplierCreationError.message,
            suggestion:
              "Provide a valid targetSupplierId or create supplier manually first",
          });
        }
      }

      if (!supplierRecord) {
        return res.status(404).json({
          success: false,
          message: "Supplier not found and could not be created automatically",
          availableSuppliers: `Use GET /api/parties?isSupplier=true&companyId=${targetCompanyId} to see available suppliers`,
        });
      }

      console.log("👤 Using supplier for purchase order:", {
        supplierId: supplierRecord._id,
        supplierName: supplierRecord.name,
        supplierMobile: supplierRecord.phoneNumber || supplierRecord.mobile,
        wasAutoCreated:
          !targetSupplierId && !targetSupplierMobile && !targetSupplierName,
      });

      // ✅ ADDED: Final validation before proceeding
      if (!supplierRecord || !supplierRecord._id || !supplierRecord.name) {
        return res.status(400).json({
          success: false,
          message: "Invalid supplier data",
          debug: {
            hasSupplier: !!supplierRecord,
            supplierId: supplierRecord?._id,
            supplierName: supplierRecord?.name,
            targetCompanyId,
            searchCriteria: {
              targetSupplierId,
              targetSupplierMobile,
              targetSupplierName,
            },
          },
          suggestion: "Ensure supplier has valid _id and name fields",
        });
      }

      // Validate convertedBy user ID
      let validUserId = null;
      if (convertedBy && mongoose.Types.ObjectId.isValid(convertedBy)) {
        validUserId = convertedBy;
      }

      // ✅ FIXED: Set valid default for orderValidUntil
      let orderValidUntil = validUntil ? new Date(validUntil) : null;
      if (!orderValidUntil && orderType === "purchase_quotation") {
        orderValidUntil = new Date();
        orderValidUntil.setDate(orderValidUntil.getDate() + 30);
      }

      // Generate purchase order data with validated supplier
      const purchaseOrderData = {
        orderNumber: await generateNextPurchaseOrderNumber(
          targetCompanyId,
          "purchase_order"
        ),
        orderDate: new Date(),
        orderType: orderType,
        supplier: supplierRecord._id, // ✅ FIXED: Use supplierRecord instead of supplier
        supplierMobile: supplierRecord.phoneNumber || supplierRecord.mobile,
        companyId: targetCompanyId,

        // 🔥 FIXED: BIDIRECTIONAL TRACKING FIELDS with proper enum values
        isAutoGenerated: true,
        sourceOrderId: salesOrder._id,
        sourceOrderNumber: salesOrder.orderNumber,
        sourceOrderType: "sales_order", // ✅ FIXED: Set to valid enum value
        sourceCompanyId: salesOrder.companyId._id || salesOrder.companyId, // ✅ FIXED: Handle populated vs non-populated
        generatedFrom: "sales_order", // ✅ FIXED: Set to valid enum value
        generatedAt: new Date(),
        generatedBy: validUserId,

        // Copy items and totals from sales order
        items: salesOrder.items,
        totals: salesOrder.totals,

        // Set dates
        validUntil: orderValidUntil,
        expectedDeliveryDate: deliveryDate ? new Date(deliveryDate) : null,

        // Copy other relevant fields
        gstEnabled: salesOrder.gstEnabled,
        gstType: salesOrder.gstType,
        taxMode: salesOrder.taxMode,
        priceIncludesTax: salesOrder.priceIncludesTax,

        // Payment settings
        payment: {
          method: "credit",
          creditDays: 30,
          paidAmount: 0,
          pendingAmount: salesOrder.totals?.finalTotal || 0,
          status: "pending",
        },

        status: "draft",
        notes: conversionNotes,
      };

      // ✅ ADDED: Clean up any undefined fields
      Object.keys(purchaseOrderData).forEach((key) => {
        if (purchaseOrderData[key] === undefined) {
          delete purchaseOrderData[key];
        }
      });

      console.log("💾 Creating purchase order with data:", {
        orderNumber: purchaseOrderData.orderNumber,
        sourceOrderType: purchaseOrderData.sourceOrderType, // Should be "sales_order"
        targetCompany: targetCompanyId,
        supplier: supplierRecord.name, // ✅ FIXED: Use supplierRecord instead of supplier
        totalAmount: purchaseOrderData.totals?.finalTotal,
        isAutoGenerated: true,
        hasSupplier: !!supplierRecord,
        supplierId: supplierRecord?._id,
      });

      // Create purchase order
      const purchaseOrder = new PurchaseOrder(purchaseOrderData);
      await purchaseOrder.save();

      // 🔥 UPDATE SALES ORDER WITH BIDIRECTIONAL LINKS
      salesOrder.autoGeneratedPurchaseOrder = true;
      salesOrder.purchaseOrderRef = purchaseOrder._id;
      salesOrder.purchaseOrderNumber = purchaseOrder.orderNumber;
      salesOrder.purchaseOrderGeneratedAt = new Date();
      salesOrder.purchaseOrderGeneratedBy = validUserId;
      salesOrder.targetCompanyId = targetCompanyId;

      if (conversionNotes) {
        salesOrder.notes = salesOrder.notes
          ? `${salesOrder.notes}\n${conversionNotes}`
          : conversionNotes;
      }

      await salesOrder.save();

      console.log("✅ Bidirectional purchase order generated successfully:", {
        salesOrderId: salesOrder._id,
        salesOrderNumber: salesOrder.orderNumber,
        purchaseOrderId: purchaseOrder._id,
        purchaseOrderNumber: purchaseOrder.orderNumber,
        targetCompany: targetCompanyId,
        supplier: supplierRecord.name,
        autoDetectedCompany: !req.body.targetCompanyId,
        autoCreatedSupplier:
          !targetSupplierId && !targetSupplierMobile && !targetSupplierName,
      });

      res.status(201).json({
        success: true,
        message: "Purchase order generated successfully from sales order",
        data: {
          purchaseOrder: {
            _id: purchaseOrder._id,
            orderNumber: purchaseOrder.orderNumber,
            orderType: purchaseOrder.orderType,
            orderDate: purchaseOrder.orderDate,
            supplier: {
              id: supplierRecord._id,
              name: supplierRecord.name,
              mobile: supplierRecord.phoneNumber || supplierRecord.mobile,
            },
            companyId: targetCompanyId,
            isAutoGenerated: true,
            sourceOrderId: salesOrder._id,
            sourceOrderNumber: salesOrder.orderNumber,
            sourceOrderType: "sales_order",
            totals: purchaseOrder.totals,
            status: purchaseOrder.status,
          },
          conversion: {
            sourceType: "sales_order",
            targetType: "purchase_order",
            generatedAt: new Date(),
            generatedBy: validUserId,
            autoDetectedCompany: !req.body.targetCompanyId,
            autoCreatedSupplier:
              !targetSupplierId && !targetSupplierMobile && !targetSupplierName,
            targetCompany: {
              id: targetCompanyId,
              detectionMethod: !req.body.targetCompanyId
                ? "auto-detected"
                : "provided",
            },
          },
          bidirectionalTracking: {
            salesOrder: {
              id: salesOrder._id,
              orderNumber: salesOrder.orderNumber,
              sourceCompany: salesOrder.companyId?.businessName,
            },
            purchaseOrder: {
              id: purchaseOrder._id,
              orderNumber: purchaseOrder.orderNumber,
              targetCompany: targetCompanyId,
            },
            linkageComplete: true,
          },
        },
      });
    } catch (error) {
      console.error(
        "❌ Error generating purchase order from sales order:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to generate purchase order from sales order",
        error: error.message,
        details: {
          salesOrderId: id,
          targetCompanyId,
          errorType: error.name || "GenerationError",
          suggestion: "Check customer-company linkage and supplier details",
        },
      });
    }
  },

  // Get dashboard summary
  getDashboardSummary: async (req, res) => {
    try {
      const {companyId} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const [
        totalOrders,
        pendingOrders,
        confirmedOrders,
        completedOrders,
        totalValue,
        pendingPayments,
        overdueOrders,
        expiredOrders,
        awaitingApproval,
      ] = await Promise.all([
        PurchaseOrder.countDocuments({companyId, status: {$ne: "cancelled"}}),
        PurchaseOrder.countDocuments({
          companyId,
          status: {$in: ["draft", "sent"]},
        }),
        PurchaseOrder.countDocuments({companyId, status: "confirmed"}),
        PurchaseOrder.countDocuments({companyId, status: "completed"}),
        PurchaseOrder.aggregate([
          {
            $match: {
              companyId: new mongoose.Types.ObjectId(companyId),
              status: {$ne: "cancelled"},
            },
          },
          {$group: {_id: null, total: {$sum: "$totals.finalTotal"}}},
        ]),
        PurchaseOrder.aggregate([
          {
            $match: {
              companyId: new mongoose.Types.ObjectId(companyId),
              "payment.pendingAmount": {$gt: 0},
            },
          },
          {$group: {_id: null, total: {$sum: "$payment.pendingAmount"}}},
        ]),
        PurchaseOrder.countDocuments({
          companyId,
          "payment.dueDate": {$lt: new Date()},
          "payment.pendingAmount": {$gt: 0},
        }),
        PurchaseOrder.countDocuments({
          companyId,
          validUntil: {$lt: new Date()},
          status: {$nin: ["completed", "cancelled"]},
        }),
        PurchaseOrder.countDocuments({
          companyId,
          status: "draft",
          approvedBy: null,
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          totalOrders,
          pendingOrders,
          confirmedOrders,
          completedOrders,
          totalValue: totalValue[0]?.total || 0,
          pendingPayments: pendingPayments[0]?.total || 0,
          overdueOrders,
          expiredOrders,
          awaitingApproval,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get dashboard summary",
        error: error.message,
      });
    }
  },
  // ✅ NEW: Get bidirectional analytics
  getBidirectionalAnalytics: async (req, res) => {
    try {
      const {companyId} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const analytics = await PurchaseOrder.getBidirectionalAnalytics(
        companyId
      );

      res.status(200).json({
        success: true,
        data: analytics,
        message: "Bidirectional analytics retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get bidirectional analytics",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Get auto-generated purchase orders
  getAutoGeneratedOrders: async (req, res) => {
    try {
      const {companyId, page = 1, limit = 10} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [orders, total] = await Promise.all([
        PurchaseOrder.getAutoGeneratedOrders(companyId)
          .skip(skip)
          .limit(parseInt(limit)),
        PurchaseOrder.countDocuments({
          companyId,
          isAutoGenerated: true,
          generatedFrom: "sales_order",
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          orders,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalOrders: total,
            limit: parseInt(limit),
          },
        },
        message: `Found ${orders.length} auto-generated purchase orders`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get auto-generated orders",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Get orders with corresponding sales orders
  getOrdersWithCorrespondingSO: async (req, res) => {
    try {
      const {companyId, page = 1, limit = 10} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [orders, total] = await Promise.all([
        PurchaseOrder.getOrdersWithCorrespondingSO(companyId)
          .skip(skip)
          .limit(parseInt(limit)),
        PurchaseOrder.countDocuments({
          companyId,
          correspondingSalesOrderId: {$exists: true, $ne: null},
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          orders,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalOrders: total,
            limit: parseInt(limit),
          },
        },
        message: `Found ${orders.length} purchase orders with corresponding sales orders`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get orders with corresponding sales orders",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Get purchase orders that generated sales orders
  getPurchaseOrdersWithGeneratedSO: async (req, res) => {
    try {
      const {companyId, page = 1, limit = 10} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [orders, total] = await Promise.all([
        PurchaseOrder.getPurchaseOrdersWithGeneratedSO(companyId)
          .skip(skip)
          .limit(parseInt(limit)),
        PurchaseOrder.countDocuments({
          companyId,
          autoGeneratedSalesOrder: true,
          salesOrderRef: {$exists: true, $ne: null},
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          orders,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalOrders: total,
            limit: parseInt(limit),
          },
        },
        message: `Found ${orders.length} purchase orders that generated sales orders`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get purchase orders with generated sales orders",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Get orders from specific sales order
  getOrdersFromSalesOrder: async (req, res) => {
    try {
      const {salesOrderId} = req.params;
      const {page = 1, limit = 10} = req.query;

      if (!salesOrderId || !mongoose.Types.ObjectId.isValid(salesOrderId)) {
        return res.status(400).json({
          success: false,
          message: "Valid Sales Order ID is required",
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [orders, total] = await Promise.all([
        PurchaseOrder.getOrdersFromSalesOrder(salesOrderId)
          .skip(skip)
          .limit(parseInt(limit)),
        PurchaseOrder.countDocuments({
          sourceOrderId: salesOrderId,
          sourceOrderType: "sales_order",
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          orders,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalOrders: total,
            limit: parseInt(limit),
          },
        },
        message: `Found ${orders.length} purchase orders created from sales order ${salesOrderId}`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get orders from sales order",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Get complete tracking chain for an order
  getTrackingChain: async (req, res) => {
    try {
      const {id} = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase order ID",
        });
      }

      const purchaseOrder = await PurchaseOrder.findById(id);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      const trackingChain = await purchaseOrder.getTrackingChain();

      res.status(200).json({
        success: true,
        data: {
          orderNumber: purchaseOrder.orderNumber,
          trackingInfo: purchaseOrder.trackingInfo,
          chain: trackingChain,
        },
        message: "Tracking chain retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get tracking chain",
        error: error.message,
      });
    }
  },

  createCorrespondingSalesOrder: async (req, res) => {
    try {
      const {id} = req.params;
      const {
        targetCompanyId,
        convertedBy,
        notes,
        orderType = "sales_order",
        skipCircularValidation = false,
        autoCreateCustomer = true,
      } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase order ID",
        });
      }

      // ✅ Find and populate the purchase order with supplier details
      const purchaseOrder = await PurchaseOrder.findById(id)
        .populate(
          "supplier",
          "name mobile phoneNumber email linkedCompanyId gstNumber"
        )
        .populate("companyId", "businessName email phoneNumber gstin");

      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      // ✅ Check if already has corresponding sales order
      if (purchaseOrder.correspondingSalesOrderId) {
        return res.status(400).json({
          success: false,
          message: "Purchase order already has a corresponding sales order",
          data: {
            correspondingSalesOrderId: purchaseOrder.correspondingSalesOrderId,
            correspondingSalesOrderNumber:
              purchaseOrder.correspondingSalesOrderNumber,
          },
        });
      }

      console.log("🔄 Creating corresponding sales order for PO:", {
        purchaseOrderNumber: purchaseOrder.orderNumber,
        supplier: purchaseOrder.supplier?.name,
        supplierLinkedCompany: purchaseOrder.supplier?.linkedCompanyId,
        currentCompany: purchaseOrder.companyId?.businessName,
        targetCompanyId,
      });

      // ✅ ENHANCED: Determine target company for sales order
      let finalTargetCompanyId = targetCompanyId;

      // Auto-detect from supplier's linked company if not provided
      if (!finalTargetCompanyId && purchaseOrder.supplier?.linkedCompanyId) {
        finalTargetCompanyId =
          purchaseOrder.supplier.linkedCompanyId._id ||
          purchaseOrder.supplier.linkedCompanyId;
      }

      if (!finalTargetCompanyId) {
        return res.status(400).json({
          success: false,
          message: "Target company ID required for sales order creation",
          code: "MISSING_TARGET_COMPANY",
          suggestion:
            "Provide targetCompanyId or link the supplier to a company account",
          supplierInfo: {
            id: purchaseOrder.supplier._id,
            name: purchaseOrder.supplier.name,
            hasLinkedCompany: !!purchaseOrder.supplier.linkedCompanyId,
          },
        });
      }

      // ✅ CRITICAL: Prevent circular reference
      if (!skipCircularValidation) {
        const buyerCompanyId =
          purchaseOrder.companyId._id || purchaseOrder.companyId;

        if (finalTargetCompanyId.toString() === buyerCompanyId.toString()) {
          return res.status(400).json({
            success: false,
            message:
              "🚨 CIRCULAR REFERENCE ERROR: Cannot create sales order to the same company that made the purchase",
            code: "CIRCULAR_COMPANY_REFERENCE",
            details: {
              buyerCompanyId: buyerCompanyId.toString(),
              targetCompanyId: finalTargetCompanyId.toString(),
              explanation:
                "The supplier's linked company cannot be the same as the buyer company for bidirectional orders",
            },
            solutions: [
              "Link the supplier to a DIFFERENT company account",
              "Provide a different targetCompanyId",
              "Create a separate company account for the supplier",
              "Set supplier's linkedCompanyId to null and provide targetCompanyId manually",
            ],
          });
        }
      }

      // ✅ Find or create customer in target company based on buyer company
      const buyerCompany = purchaseOrder.companyId;
      let customerRecord = null;

      if (autoCreateCustomer) {
        try {
          // Try to find existing customer by company details
          customerRecord = await Party.findOne({
            companyId: finalTargetCompanyId,
            $or: [
              {
                name: {
                  $regex: new RegExp(`^${buyerCompany.businessName}$`, "i"),
                },
              },
              {gstNumber: buyerCompany.gstin},
              {phoneNumber: buyerCompany.phoneNumber},
              {email: buyerCompany.email},
            ],
            $or: [
              {partyType: "customer"},
              {isCustomer: true},
              {type: "customer"},
            ],
          });

          // Auto-create customer if not found
          if (!customerRecord) {
            console.log(
              "👤 Auto-creating customer from buyer company details..."
            );

            customerRecord = new Party({
              name: buyerCompany.businessName,
              companyName: buyerCompany.businessName,
              phoneNumber: buyerCompany.phoneNumber || "",
              mobile: buyerCompany.phoneNumber || "",
              email: buyerCompany.email || "",
              companyId: finalTargetCompanyId,
              partyType: "customer",
              type: "customer",
              isCustomer: true,
              isSupplier: false,
              gstNumber: buyerCompany.gstin || "",
              gstType: buyerCompany.gstin ? "regular" : "unregistered",
              isActive: true,
              linkedCompanyId: buyerCompany._id, // Link back to buyer company
              homeAddressLine: buyerCompany.address || "",
              address: buyerCompany.address || "",
              city: buyerCompany.city || "",
              state: buyerCompany.state || "",
              pincode: buyerCompany.pincode || "",
              creditLimit: 0,
              currentBalance: 0,
              openingBalance: 0,
              paymentTerms: "credit",
            });

            if (convertedBy && mongoose.Types.ObjectId.isValid(convertedBy)) {
              customerRecord.createdBy = convertedBy;
              customerRecord.userId = convertedBy;
            }

            await customerRecord.save();
            console.log(
              "✅ Customer created successfully:",
              customerRecord.name
            );
          }
        } catch (customerError) {
          console.error("❌ Error creating customer:", customerError);
          return res.status(400).json({
            success: false,
            message: "Failed to create customer for sales order",
            error: customerError.message,
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: "Customer required for sales order creation",
          suggestion:
            "Set autoCreateCustomer: true or provide customer details",
        });
      }

      // ✅ Generate sales order number
      const salesOrderNumber = await generateNextSalesOrderNumber(
        finalTargetCompanyId
      );

      // ✅ Create sales order data
      const salesOrderData = {
        orderNumber: salesOrderNumber,
        orderDate: new Date(),
        orderType: orderType,
        customer: customerRecord._id,
        customerMobile: customerRecord.phoneNumber || customerRecord.mobile,
        companyId: finalTargetCompanyId,

        // Bidirectional tracking
        isAutoGenerated: true,
        sourceOrderId: purchaseOrder._id,
        sourceOrderNumber: purchaseOrder.orderNumber,
        sourceOrderType: "purchase_order",
        sourceCompanyId: purchaseOrder.companyId._id || purchaseOrder.companyId,
        generatedFrom: "purchase_order",
        generatedAt: new Date(),
        generatedBy:
          convertedBy && mongoose.Types.ObjectId.isValid(convertedBy)
            ? convertedBy
            : null,

        // Copy order details
        items: purchaseOrder.items.map((item) => ({
          ...item.toObject(),
          _id: undefined, // Remove the _id to create new ones
        })),
        totals: {...purchaseOrder.totals},

        // Payment and other details
        payment: {
          method: "credit",
          creditDays: 30,
          paidAmount: 0,
          pendingAmount: purchaseOrder.totals?.finalTotal || 0,
          status: "pending",
        },

        // Copy relevant settings
        gstEnabled: purchaseOrder.gstEnabled,
        gstType: purchaseOrder.gstType,
        taxMode: purchaseOrder.taxMode,
        priceIncludesTax: purchaseOrder.priceIncludesTax,

        status: "draft",
        priority: purchaseOrder.priority || "normal",
        notes:
          notes || `Generated from Purchase Order ${purchaseOrder.orderNumber}`,

        // Link back to purchase order
        correspondingPurchaseOrderId: purchaseOrder._id,
        correspondingPurchaseOrderNumber: purchaseOrder.orderNumber,
      };

      // ✅ Create the sales order
      const salesOrder = new SalesOrder(salesOrderData);
      await salesOrder.save();

      // ✅ Update purchase order with corresponding sales order details
      purchaseOrder.correspondingSalesOrderId = salesOrder._id;
      purchaseOrder.correspondingSalesOrderNumber = salesOrder.orderNumber;
      purchaseOrder.targetCompanyId = finalTargetCompanyId;

      if (notes) {
        purchaseOrder.notes = purchaseOrder.notes
          ? `${purchaseOrder.notes}\n${notes}`
          : notes;
      }

      await purchaseOrder.save();

      console.log("✅ Corresponding sales order created successfully:", {
        purchaseOrderId: purchaseOrder._id,
        purchaseOrderNumber: purchaseOrder.orderNumber,
        salesOrderId: salesOrder._id,
        salesOrderNumber: salesOrder.orderNumber,
        targetCompany: finalTargetCompanyId,
        customer: customerRecord.name,
      });

      res.status(201).json({
        success: true,
        message: "Corresponding sales order created successfully",
        data: {
          purchaseOrder: {
            id: purchaseOrder._id,
            orderNumber: purchaseOrder.orderNumber,
            correspondingSalesOrderId: salesOrder._id,
            correspondingSalesOrderNumber: salesOrder.orderNumber,
            targetCompanyId: finalTargetCompanyId,
          },
          salesOrder: {
            id: salesOrder._id,
            orderNumber: salesOrder.orderNumber,
            companyId: finalTargetCompanyId,
            customer: {
              id: customerRecord._id,
              name: customerRecord.name,
              wasAutoCreated: autoCreateCustomer,
            },
            status: salesOrder.status,
            totalAmount: salesOrder.totals.finalTotal,
            isAutoGenerated: true,
            sourceOrderNumber: purchaseOrder.orderNumber,
          },
          bidirectionalTracking: {
            purchaseToSales: {
              sourceOrderId: purchaseOrder._id,
              targetOrderId: salesOrder._id,
              linkageComplete: true,
            },
            salesToPurchase: {
              sourceOrderId: salesOrder._id,
              targetOrderId: purchaseOrder._id,
              linkageComplete: true,
            },
          },
        },
      });
    } catch (error) {
      console.error("❌ Error creating corresponding sales order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create corresponding sales order",
        error: error.message,
        code: "CORRESPONDING_SO_CREATION_FAILED",
      });
    }
  },
};

module.exports = purchaseOrderController;
