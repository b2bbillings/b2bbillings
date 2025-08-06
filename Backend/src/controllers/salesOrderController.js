const SalesOrder = require("../models/SalesOrder");
const Sale = require("../models/Sale");
const PurchaseOrder = require("../models/PurchaseOrder"); // ✅ Ensure this exists
const Purchase = require("../models/Purchase"); // ✅ Add this too
const Item = require("../models/Item");
const Party = require("../models/Party");
const Payment = require("../models/Payment");
const Company = require("../models/Company"); // ✅ Add for findLinkedCompany
const mongoose = require("mongoose");

const findOrCreateCustomer = async (
  customerName,
  customerMobile,
  customerId,
  companyId,
  userId
) => {
  try {
    // 1. If customer ID is provided, use it directly
    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      const customerRecord = await Party.findById(customerId);
      if (
        customerRecord &&
        customerRecord.companyId.toString() === companyId.toString()
      ) {
        return customerRecord;
      }
    }

    // 2. ✅ ENHANCED: More comprehensive mobile search with exact matching
    if (customerMobile) {
      // Clean mobile number - remove spaces, dashes, and standardize
      const cleanMobile = customerMobile.toString().replace(/[\s\-\(\)]/g, "");

      // Try different mobile number variations
      const mobileVariations = [
        cleanMobile,
        customerMobile,
        customerMobile.toString(),
      ];

      // ✅ IMPROVED: Use aggregation pipeline for better search
      const customerByMobile = await Party.aggregate([
        {
          $match: {
            companyId: new mongoose.Types.ObjectId(companyId),
            $or: [
              {type: "customer"},
              {type: {$exists: false}}, // Handle legacy records without type
              {type: null},
            ],
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

      if (customerByMobile && customerByMobile.length > 0) {
        const foundCustomer = await Party.findById(customerByMobile[0]._id);

        // Update name if provided and different
        if (customerName && customerName.trim() !== foundCustomer.name) {
          foundCustomer.name = customerName.trim();
          await foundCustomer.save();
        }

        return foundCustomer;
      }

      // ✅ FALLBACK: Try raw MongoDB query
      try {
        const db = mongoose.connection.db;
        const collection = db.collection("parties");

        const rawCustomer = await collection.findOne({
          companyId: new mongoose.Types.ObjectId(companyId),
          $or: [
            {mobile: {$in: mobileVariations}},
            {phoneNumber: {$in: mobileVariations}},
            {phone: {$in: mobileVariations}},
            {contactNumber: {$in: mobileVariations}},
          ],
        });

        if (rawCustomer) {
          const foundCustomer = await Party.findById(rawCustomer._id);

          // Update name if provided and different
          if (customerName && customerName.trim() !== foundCustomer.name) {
            foundCustomer.name = customerName.trim();
            await foundCustomer.save();
          }

          return foundCustomer;
        }
      } catch (rawQueryError) {
        console.warn("⚠️ Raw query failed:", rawQueryError.message);
      }
    }

    // 3. ✅ ENHANCED: Search by name with better regex
    if (customerName) {
      const nameVariations = [
        customerName.trim(),
        customerName.trim().toLowerCase(),
        customerName.trim().toUpperCase(),
      ];

      const customerByName = await Party.findOne({
        companyId: companyId,
        $or: [
          {type: "customer"},
          {type: {$exists: false}}, // Handle legacy records
          {type: null},
        ],
        $or: nameVariations.map((name) => ({
          name: {
            $regex: new RegExp(
              `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
              "i"
            ),
          },
        })),
      });

      if (customerByName) {
        // Update mobile if provided
        if (
          customerMobile &&
          !customerByName.mobile &&
          !customerByName.phoneNumber
        ) {
          customerByName.mobile = customerMobile;
          customerByName.phoneNumber = customerMobile;
          await customerByName.save();
        }

        return customerByName;
      }
    }

    // 4. ✅ ENHANCED: Create new customer with better validation
    if (!customerName || !customerName.trim()) {
      throw new Error("Customer name is required to create new customer");
    }

    // ✅ IMPORTANT: Clean and prepare data before creation
    const cleanCustomerData = {
      name: customerName.trim(),
      mobile: customerMobile ? customerMobile.toString() : "",
      phoneNumber: customerMobile ? customerMobile.toString() : "",
      type: "customer",
      partyType: "customer", // Add this for compatibility
      email: "",
      companyId: companyId,
      userId: userId,
      createdBy: userId,
      homeAddressLine: "", // Use homeAddressLine instead of address object
      address: "", // Keep for compatibility
      gstNumber: "",
      panNumber: "",
      status: "active",
      creditLimit: 0,
      creditDays: 0,
      currentBalance: 0,
      openingBalance: 0,
    };

    const newCustomer = new Party(cleanCustomerData);
    await newCustomer.save();

    return newCustomer;
  } catch (error) {
    console.error("❌ Error in findOrCreateCustomer:", error);

    // ✅ ENHANCED: Handle duplicate key error with comprehensive recovery
    if (
      error.code === 11000 ||
      error.message.includes("E11000") ||
      error.message.includes("duplicate key")
    ) {
      try {
        // ✅ COMPREHENSIVE RECOVERY: Try all possible search methods
        const recoverySearches = [];

        // Search by mobile with all possible field combinations
        if (customerMobile) {
          const cleanMobile = customerMobile
            .toString()
            .replace(/[\s\-\(\)]/g, "");

          recoverySearches.push(
            Party.findOne({
              companyId: companyId,
              mobile: customerMobile,
            }),
            Party.findOne({
              companyId: companyId,
              phoneNumber: customerMobile,
            }),
            Party.findOne({
              companyId: companyId,
              phone: customerMobile,
            }),
            Party.findOne({
              companyId: companyId,
              contactNumber: customerMobile,
            }),
            Party.findOne({
              companyId: companyId,
              mobile: cleanMobile,
            }),
            Party.findOne({
              companyId: companyId,
              phoneNumber: cleanMobile,
            })
          );
        }

        // Search by name
        if (customerName) {
          recoverySearches.push(
            Party.findOne({
              companyId: companyId,
              name: customerName.trim(),
            }),
            Party.findOne({
              companyId: companyId,
              name: {$regex: new RegExp(`^${customerName.trim()}$`, "i")},
            })
          );
        }

        // Execute all searches in parallel
        const searchResults = await Promise.allSettled(recoverySearches);

        // Find the first successful result
        for (const result of searchResults) {
          if (result.status === "fulfilled" && result.value) {
            // Update any missing fields
            let needsUpdate = false;

            if (customerName && result.value.name !== customerName.trim()) {
              result.value.name = customerName.trim();
              needsUpdate = true;
            }

            if (customerMobile && !result.value.mobile) {
              result.value.mobile = customerMobile;
              needsUpdate = true;
            }

            if (customerMobile && !result.value.phoneNumber) {
              result.value.phoneNumber = customerMobile;
              needsUpdate = true;
            }

            if (!result.value.type) {
              result.value.type = "customer";
              needsUpdate = true;
            }

            if (needsUpdate) {
              try {
                await result.value.save();
              } catch (updateError) {
                console.warn(
                  "⚠️ Could not update recovered customer:",
                  updateError.message
                );
              }
            }

            return result.value;
          }
        }

        const db = mongoose.connection.db;
        const collection = db.collection("parties");

        let rawResult = null;

        if (customerMobile) {
          rawResult = await collection.findOne({
            companyId: new mongoose.Types.ObjectId(companyId),
            $or: [
              {mobile: customerMobile},
              {phoneNumber: customerMobile},
              {phone: customerMobile},
              {contactNumber: customerMobile},
            ],
          });
        }

        if (!rawResult && customerName) {
          rawResult = await collection.findOne({
            companyId: new mongoose.Types.ObjectId(companyId),
            name: {$regex: new RegExp(`^${customerName.trim()}$`, "i")},
          });
        }

        if (rawResult) {
          const recoveredCustomer = await Party.findById(rawResult._id);
          return recoveredCustomer;
        }

        // If all recovery attempts fail, provide detailed error
        const errorDetails = {
          customerName,
          customerMobile,
          companyId,
          searchAttempts: recoverySearches.length,
          duplicateKeyError: error.keyValue || {},
          suggestion: "Check database directly for data inconsistency",
        };

        console.error("❌ All recovery attempts failed:", errorDetails);

        throw new Error(
          `Customer already exists but cannot be found. This indicates a database inconsistency. Details: ${JSON.stringify(
            errorDetails
          )}`
        );
      } catch (recoveryError) {
        console.error("❌ Recovery process failed:", recoveryError);
        throw new Error(
          `Database error: Unable to resolve customer conflict. Original error: ${error.message}. Recovery error: ${recoveryError.message}`
        );
      }
    }

    // ✅ ENHANCED: Better error messages for other errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      throw new Error(
        `Customer validation failed: ${validationErrors.join(", ")}`
      );
    }

    if (error.name === "CastError") {
      throw new Error(`Invalid data format for customer: ${error.message}`);
    }

    // Re-throw other errors with additional context
    throw new Error(`Customer operation failed: ${error.message}`);
  }
};

const generateUniqueOrderNumber = async (
  companyId,
  orderType = "sales_order",
  targetCompanyId = null
) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  // ✅ FIXED: Consistent prefix logic
  const prefix =
    orderType === "quotation"
      ? "QUO"
      : orderType === "sales_order"
      ? "SO"
      : orderType === "proforma_invoice"
      ? "PI"
      : "SO";

  const todayStart = new Date(year, date.getMonth(), date.getDate());
  const todayEnd = new Date(year, date.getMonth(), date.getDate() + 1);

  // ✅ FIXED: Use consistent company ID for search
  const searchCompanyId = targetCompanyId || companyId;

  const lastOrder = await SalesOrder.findOne({
    companyId: searchCompanyId,
    orderDate: {$gte: todayStart, $lt: todayEnd},
    orderNumber: new RegExp(`^${prefix}-${year}${month}${day}`),
  }).sort({orderNumber: -1});

  let sequence = 1;
  if (lastOrder && lastOrder.orderNumber) {
    // ✅ FIXED: Handle both formats consistently
    const parts = lastOrder.orderNumber.split("-");
    if (parts.length >= 3) {
      const lastSequenceStr = parts[parts.length - 1]; // Get last part
      const lastSequence = parseInt(lastSequenceStr);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }
  }

  return `${prefix}-${year}${month}${day}-${String(sequence).padStart(4, "0")}`;
};

// ✅ IMPROVED: Enhanced order number generation with retry logic
const generateOrderNumberWithRetry = async (
  companyId,
  orderType = "sales_order",
  targetCompanyId = null,
  maxAttempts = 10
) => {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const orderNumber = await generateUniqueOrderNumber(
        companyId,
        orderType,
        targetCompanyId
      );

      // ✅ Check for duplicates
      const existingOrder = await SalesOrder.findOne({
        orderNumber,
        companyId: targetCompanyId || companyId,
      }).lean();

      if (!existingOrder) {
        return {
          success: true,
          orderNumber,
          attempts: attempts + 1,
        };
      }

      attempts++;

      if (attempts >= maxAttempts) {
        // ✅ Emergency fallback
        const timestamp = Date.now();
        const randomSuffix = Math.floor(100000 + Math.random() * 900000);
        return {
          success: true,
          orderNumber: `${orderType.toUpperCase()}-EMRG-${timestamp}-${randomSuffix}`,
          attempts: attempts + 1,
          emergency: true,
        };
      }

      // ✅ Small delay between attempts
      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch (error) {
      console.error(
        `❌ Order number generation attempt ${attempts + 1} failed:`,
        error
      );
      attempts++;

      if (attempts >= maxAttempts) {
        throw error;
      }
    }
  }
};

const generateNextOrderNumber = async (
  companyId,
  orderType = "sales_order"
) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const todayStart = new Date(year, date.getMonth(), date.getDate());
  const todayEnd = new Date(year, date.getMonth(), date.getDate() + 1);

  const prefix =
    orderType === "quotation"
      ? "QUO"
      : orderType === "sales_order"
      ? "SO"
      : "PI";

  const lastOrder = await SalesOrder.findOne({
    companyId,
    orderDate: {$gte: todayStart, $lt: todayEnd},
    orderNumber: new RegExp(`^${prefix}-${year}${month}${day}`),
  }).sort({orderNumber: -1});

  let sequence = 1;
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.orderNumber.split("-")[3]);
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  return `${prefix}-${year}${month}${day}-${String(sequence).padStart(4, "0")}`;
};

// Auto-detection function to find linked company
const findLinkedCompany = async (supplier) => {
  const Company = require("../models/Company");

  try {
    // Method 1: Check if supplier has linkedCompanyId
    if (supplier.linkedCompanyId) {
      const company = await Company.findById(supplier.linkedCompanyId);
      if (company) {
        return company._id;
      }
    }

    // Method 2: Match by GST number (most reliable)
    if (supplier.gstNumber) {
      const company = await Company.findOne({
        gstin: supplier.gstNumber,
        isActive: true,
      });
      if (company) {
        return company._id;
      }
    }

    // Method 3: Match by phone number
    if (supplier.phoneNumber) {
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

    // Method 4: Match by email
    if (supplier.email) {
      const company = await Company.findOne({
        email: supplier.email,
        isActive: true,
      });
      if (company) {
        return company._id;
      }
    }

    // Method 5: Match by business name (fuzzy matching)
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
    console.error("❌ Error in findLinkedCompany:", error);
    return null;
  }
};

// Auto-create customer from source company
const autoCreateCustomerFromCompany = async (
  sourceCompany,
  targetCompanyId,
  convertedBy
) => {
  try {
    // Look for existing customer record first
    const existingCustomer = await Party.findOne({
      $or: [
        {phoneNumber: sourceCompany.phoneNumber},
        {email: sourceCompany.email},
        {gstNumber: sourceCompany.gstin},
      ],
      companyId: targetCompanyId,
      $or: [{partyType: "customer"}, {isCustomer: true}, {type: "customer"}],
    });

    if (existingCustomer) {
      return existingCustomer;
    }

    // Create new customer from source company details
    const customerData = {
      name: sourceCompany.businessName,
      phoneNumber: sourceCompany.phoneNumber,
      mobile: sourceCompany.phoneNumber,
      email: sourceCompany.email,
      companyId: targetCompanyId,
      partyType: "customer",
      type: "customer",
      isCustomer: true,
      isSupplier: false,
      gstNumber: sourceCompany.gstin,
      gstType: sourceCompany.gstin ? "regular" : "unregistered",
      isActive: true,
      linkedCompanyId: sourceCompany._id, // Link back to source company
      homeAddress: {
        addressLine: sourceCompany.address || "",
        city: sourceCompany.city || "",
        state: sourceCompany.state || "",
        pincode: sourceCompany.pincode || "",
        country: "INDIA",
      },
      creditLimit: 0,
      currentBalance: 0,
      openingBalance: 0,
      paymentTerms: "immediate",
    };

    // Add user fields if provided
    if (convertedBy && mongoose.Types.ObjectId.isValid(convertedBy)) {
      customerData.createdBy = convertedBy;
      customerData.userId = convertedBy;
    }

    const newCustomer = new Party(customerData);
    await newCustomer.save();

    return newCustomer;
  } catch (error) {
    console.error("❌ Error auto-creating customer:", error);
    throw error;
  }
};

const salesOrderController = {
  generateOrderNumber: async (req, res) => {
    try {
      const {companyId, orderType = "quotation"} = req.query;

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

      // ✅ Generate preview order number using same logic as model
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const dateStr = `${year}${month}${day}`;

      // Get company prefix (same as model logic)
      let companyPrefix = "SO";
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

      // ✅ Determine order type prefix
      let orderTypePrefix = "SO"; // Default Sales Order
      if (orderType === "quotation") {
        orderTypePrefix = "QUO";
      } else if (orderType === "proforma_invoice") {
        orderTypePrefix = "PI";
      }

      // ✅ Find the next sequence number for today
      const todayStart = new Date(year, today.getMonth(), today.getDate());
      const todayEnd = new Date(year, today.getMonth(), today.getDate() + 1);

      const latestOrder = await SalesOrder.findOne({
        companyId: companyId,
        orderDate: {$gte: todayStart, $lt: todayEnd},
        orderType: orderType,
        orderNumber: {$exists: true, $ne: null},
      })
        .sort({orderNumber: -1})
        .select("orderNumber");

      let nextSequence = 1;
      if (latestOrder && latestOrder.orderNumber) {
        // Extract sequence from order number pattern: PREFIX-[GST-]YYYYMMDD-XXXX
        const match = latestOrder.orderNumber.match(/-(\d{4})$/);
        if (match) {
          nextSequence = parseInt(match[1], 10) + 1;
        }
      }

      const sequenceStr = String(nextSequence).padStart(4, "0");

      // ✅ Generate actual preview number (same format as model)
      const previewOrderNumber = `${companyPrefix}-${orderTypePrefix}-${dateStr}-${sequenceStr}`;

      res.status(200).json({
        success: true,
        data: {
          previewOrderNumber,
          nextOrderNumber: previewOrderNumber,
          orderType,
          company: {
            id: company._id,
            name: company.businessName,
            code: company.code,
            prefix: companyPrefix,
          },
          numbering: {
            prefix: companyPrefix,
            orderTypePrefix: orderTypePrefix,
            dateString: dateStr,
            sequence: nextSequence,
            formattedSequence: sequenceStr,
          },
          pattern: `${companyPrefix}-{ORDER_TYPE}-[GST-]YYYYMMDD-XXXX`,
          date: today.toISOString().split("T")[0],
          isSequential: true,
          companySpecific: true,
          isPreview: true,
          actualNumberGeneratedBy: "model_pre_validate_middleware",
          note: "This is a preview. Actual number will be confirmed when saving.",
        },
        message: "Preview order number generated successfully",
      });
    } catch (error) {
      console.error("❌ Error generating preview order number:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate preview order number",
        error: error.message,
      });
    }
  },

  createSalesOrder: async (req, res) => {
    try {
      const {
        customerName,
        customerMobile,
        customer,
        orderDate,
        orderType = "quotation",
        validUntil,
        expectedDeliveryDate,
        gstEnabled = true,
        gstType = "gst",
        companyId,
        items,
        payment,
        notes,
        termsAndConditions,
        customerNotes,
        roundOff = 0,
        roundOffEnabled = false,
        status = "draft",
        priority = "normal",
        taxMode = "without-tax",
        priceIncludesTax = false,

        // Enhanced bidirectional tracking fields
        sourceOrderId,
        sourceOrderNumber,
        sourceOrderType,
        sourceCompanyId,
        isAutoGenerated = false,
        generatedFrom = "manual",
        generatedBy,
        targetCompanyId,
        autoCreateCorrespondingPO = false,
        employeeName,
        employeeId,
        createdBy,
        lastModifiedBy,
        autoDetectSourceCompany = true,
      } = req.body;

      // ✅ Get company details for response only (not for numbering)
      const Company = require("../models/Company");
      const currentCompany = await Company.findById(companyId).select(
        "businessName code gstin"
      );

      if (!currentCompany) {
        return res.status(400).json({
          success: false,
          message: "Company not found",
          code: "COMPANY_NOT_FOUND",
        });
      }

      // ✅ Enhanced validation
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
          code: "MISSING_COMPANY_ID",
        });
      }

      // Enhanced customer validation with better error messages
      const hasCustomerName = customerName && customerName.trim();
      const hasCustomerMobile =
        customerMobile && customerMobile.toString().trim();
      const hasCustomerId =
        customer && mongoose.Types.ObjectId.isValid(customer);

      if (!hasCustomerName && !hasCustomerMobile && !hasCustomerId) {
        return res.status(400).json({
          success: false,
          message: "Customer information is required",
          code: "MISSING_CUSTOMER_INFO",
          details: {
            receivedData: {
              customerName: customerName || null,
              customerMobile: customerMobile || null,
              customer: customer || null,
            },
            requirements:
              "Provide at least one: customerName, customerMobile, or customer (ID)",
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

      // Validate order type
      const validOrderTypes = ["quotation", "sales_order", "proforma_invoice"];
      if (!validOrderTypes.includes(orderType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order type",
          code: "INVALID_ORDER_TYPE",
          provided: orderType,
          validTypes: validOrderTypes,
        });
      }

      // ✅ ENHANCED: Source order validation
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

      // ✅ STEP 1: Enhanced customer resolution with proper population
      let customerRecord;
      try {
        customerRecord = await findOrCreateCustomer(
          customerName,
          customerMobile,
          customer,
          companyId,
          req.user?.id || employeeId || companyId
        );

        if (!customerRecord || !customerRecord._id) {
          throw new Error("Failed to find or create customer");
        }

        // ✅ CRITICAL: Re-fetch customer with population
        customerRecord = await Party.findById(customerRecord._id).populate(
          "linkedCompanyId",
          "businessName email phoneNumber gstin isActive"
        );
      } catch (customerError) {
        console.error("❌ Customer resolution failed:", customerError);
        return res.status(400).json({
          success: false,
          message: "Failed to find or create customer",
          error: customerError.message,
          code: "CUSTOMER_RESOLUTION_FAILED",
        });
      }

      // ✅ STEP 2: ENHANCED Auto-detect sourceCompanyId from customer's linkedCompanyId
      let finalSourceCompanyId = sourceCompanyId;
      let sourceCompanyDetectionMethod = sourceCompanyId ? "manual" : "none";
      let sourceCompanyDetails = null;

      const shouldAutoDetect = autoDetectSourceCompany !== false;

      if (shouldAutoDetect && !finalSourceCompanyId && customerRecord) {
        try {
          // ✅ METHOD 1: Use customer's linkedCompanyId (most reliable)
          if (customerRecord.linkedCompanyId) {
            let linkedCompanyId = null;
            let linkedCompany = null;

            // Handle both populated and non-populated linkedCompanyId
            if (
              typeof customerRecord.linkedCompanyId === "object" &&
              customerRecord.linkedCompanyId._id
            ) {
              // Already populated
              linkedCompanyId = customerRecord.linkedCompanyId._id;
              linkedCompany = customerRecord.linkedCompanyId;
            } else if (
              typeof customerRecord.linkedCompanyId === "string" ||
              mongoose.Types.ObjectId.isValid(customerRecord.linkedCompanyId)
            ) {
              // Just an ID, need to fetch
              linkedCompanyId = customerRecord.linkedCompanyId;
              try {
                linkedCompany = await Company.findById(linkedCompanyId).select(
                  "businessName email phoneNumber gstin isActive"
                );
              } catch (fetchError) {
                console.warn(
                  "⚠️ Could not fetch linked company:",
                  fetchError.message
                );
              }
            }

            // ✅ CRITICAL: Ensure it's different from current company
            if (
              linkedCompanyId &&
              linkedCompanyId.toString() !== companyId.toString()
            ) {
              if (linkedCompany && linkedCompany.isActive !== false) {
                finalSourceCompanyId = linkedCompanyId;
                sourceCompanyDetectionMethod = "customer_linked_company";
                sourceCompanyDetails = linkedCompany;
              }
            }
          }

          // ✅ METHOD 2: Auto-detect by customer's GST number
          if (
            !finalSourceCompanyId &&
            customerRecord.autoLinkByGST &&
            customerRecord.gstNumber
          ) {
            try {
              const companyByGST = await Company.findOne({
                gstin: customerRecord.gstNumber,
                isActive: {$ne: false},
                _id: {$ne: companyId},
              });

              if (companyByGST) {
                finalSourceCompanyId = companyByGST._id;
                sourceCompanyDetectionMethod = "customer_gst_matching";
                sourceCompanyDetails = companyByGST;
              }
            } catch (gstError) {
              console.warn(
                "⚠️ GST-based auto-detection failed:",
                gstError.message
              );
            }
          }

          // ✅ METHOD 3: Auto-detect by customer's phone number
          if (
            !finalSourceCompanyId &&
            customerRecord.autoLinkByPhone &&
            customerRecord.phoneNumber
          ) {
            try {
              const phoneVariations = [
                customerRecord.phoneNumber,
                customerRecord.mobile,
              ].filter(Boolean);

              for (const phone of phoneVariations) {
                const companyByPhone = await Company.findOne({
                  phoneNumber: phone,
                  isActive: {$ne: false},
                  _id: {$ne: companyId},
                });

                if (companyByPhone) {
                  finalSourceCompanyId = companyByPhone._id;
                  sourceCompanyDetectionMethod = "customer_phone_matching";
                  sourceCompanyDetails = companyByPhone;
                  break;
                }
              }
            } catch (phoneError) {
              console.warn(
                "⚠️ Phone-based auto-detection failed:",
                phoneError.message
              );
            }
          }

          // ✅ METHOD 4: Auto-detect by customer's email
          if (
            !finalSourceCompanyId &&
            customerRecord.autoLinkByEmail &&
            customerRecord.email
          ) {
            try {
              const companyByEmail = await Company.findOne({
                email: customerRecord.email,
                isActive: {$ne: false},
                _id: {$ne: companyId},
              });

              if (companyByEmail) {
                finalSourceCompanyId = companyByEmail._id;
                sourceCompanyDetectionMethod = "customer_email_matching";
                sourceCompanyDetails = companyByEmail;
              }
            } catch (emailError) {
              console.warn(
                "⚠️ Email-based auto-detection failed:",
                emailError.message
              );
            }
          }
        } catch (autoDetectError) {
          console.error(
            "❌ Error in enhanced auto-detection:",
            autoDetectError
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

      // ✅ Process items (FIXED GST CALCULATION)
      const processedItems = [];
      let subtotal = 0;
      let totalDiscount = 0;
      let totalTax = 0;
      let totalTaxableAmount = 0;
      let totalQuantity = 0;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // ✅ UPDATED: Frontend field mapping
        const itemName = item.productName || item.itemName;
        const itemCode = item.productCode || item.itemCode || "";
        const pricePerUnit = parseFloat(item.price || item.pricePerUnit || 0);
        const quantity = parseFloat(item.quantity);
        const description = item.description || "";
        const gstRate = parseFloat(item.gstRate || item.taxRate || 18);
        const unit = item.unit === "pcs" ? "PCS" : item.unit || "PCS";
        const hsnNumber = item.hsnNumber || item.hsnCode || "0000";

        // ✅ CRITICAL FIX: Properly map GST mode to both gstMode and taxMode fields
        const itemGstMode = item.gstMode || "exclude"; // Frontend sends: "include" or "exclude"

        // Map gstMode to taxMode for schema compatibility
        let itemTaxMode;
        if (itemGstMode === "include") {
          itemTaxMode = "with-tax"; // GST included in price
        } else {
          itemTaxMode = "without-tax"; // GST excluded from price (added on top)
        }

        // Also check if taxMode was sent directly from frontend
        if (item.taxMode) {
          itemTaxMode = item.taxMode;
          // Reverse map taxMode to gstMode for consistency
          if (item.taxMode === "with-tax" || item.taxMode === "inclusive") {
            itemGstMode = "include";
          } else {
            itemGstMode = "exclude";
          }
        }

        // Set priceIncludesTax based on both modes
        const itemPriceIncludesTax =
          itemGstMode === "include" ||
          itemTaxMode === "with-tax" ||
          itemTaxMode === "inclusive";

        // Validation checks...
        if (!itemName || itemName.trim() === "") {
          return res.status(400).json({
            success: false,
            message: `Item ${i + 1}: Name is required`,
            code: "MISSING_ITEM_NAME",
          });
        }

        if (!quantity || quantity <= 0) {
          return res.status(400).json({
            success: false,
            message: `Item ${i + 1}: Valid quantity is required`,
            code: "INVALID_ITEM_QUANTITY",
          });
        }

        if (!pricePerUnit || pricePerUnit < 0) {
          return res.status(400).json({
            success: false,
            message: `Item ${i + 1}: Valid price is required`,
            code: "INVALID_ITEM_PRICE",
          });
        }

        // Calculate base amount
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

        // Set up GST rates
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

        // ✅ CRITICAL FIX: Correct GST calculation based on itemPriceIncludesTax
        if (
          finalGstEnabled &&
          (itemCgstRate > 0 || itemSgstRate > 0 || itemIgstRate > 0)
        ) {
          if (itemPriceIncludesTax) {
            // ✅ GST Include mode: GST is already included in the price
            itemAmount = amountAfterDiscount; // Total stays the same as entered
            // Calculate taxable amount by removing GST from total
            const totalGstRate = itemCgstRate + itemSgstRate + itemIgstRate;
            itemTaxableAmount = amountAfterDiscount / (1 + totalGstRate / 100);
            // Calculate individual GST components
            cgst = (itemTaxableAmount * itemCgstRate) / 100;
            sgst = (itemTaxableAmount * itemSgstRate) / 100;
            igst = (itemTaxableAmount * itemIgstRate) / 100;
          } else {
            // ✅ GST Exclude mode: Add GST on top of the price
            itemTaxableAmount = amountAfterDiscount; // Price is the taxable amount
            cgst = (itemTaxableAmount * itemCgstRate) / 100;
            sgst = (itemTaxableAmount * itemSgstRate) / 100;
            igst = (itemTaxableAmount * itemIgstRate) / 100;
            itemAmount = itemTaxableAmount + cgst + sgst + igst; // Total = Price + GST
          }
        } else {
          // No GST
          itemTaxableAmount = amountAfterDiscount;
          itemAmount = amountAfterDiscount;
        }

        // Update running totals
        subtotal += baseAmount; // ✅ This should be quantity × price (before GST calculation)
        totalDiscount += itemDiscountAmount;
        totalTaxableAmount += itemTaxableAmount;
        totalQuantity += quantity;
        const itemTotalTax = cgst + sgst + igst;
        totalTax += itemTotalTax;

        // ✅ FIXED: Create processed item with BOTH gstMode and taxMode fields
        const processedItem = {
          itemRef:
            item.selectedProduct &&
            mongoose.Types.ObjectId.isValid(item.selectedProduct)
              ? item.selectedProduct
              : null,
          selectedProduct: item.selectedProduct || "",

          // Item details - dual field mapping
          itemName: itemName.trim(),
          productName: itemName.trim(),
          itemCode: itemCode,
          productCode: itemCode,
          description: description,
          hsnCode: hsnNumber,
          hsnNumber: hsnNumber,
          category: item.category || "",

          // Quantity and unit
          quantity,
          unit: unit,

          // Pricing - dual field mapping
          pricePerUnit: pricePerUnit,
          price: pricePerUnit,
          rate: pricePerUnit,
          taxRate: itemCgstRate + itemSgstRate + itemIgstRate,
          gstRate: itemCgstRate + itemSgstRate + itemIgstRate,

          // ✅ CRITICAL FIX: Store BOTH modes correctly to match schema
          taxMode: itemTaxMode, // "with-tax" or "without-tax" (schema enum)
          gstMode: itemGstMode, // "include" or "exclude" (schema enum)
          priceIncludesTax: itemPriceIncludesTax,

          // Stock info
          availableStock: item.availableStock || 0,

          // Discount
          discountPercent,
          discountAmount: Math.round(itemDiscountAmount * 100) / 100,
          discount: discountPercent,
          discountType: "percentage",

          // Tax amounts - dual field mapping
          cgst: Math.round(cgst * 100) / 100,
          sgst: Math.round(sgst * 100) / 100,
          igst: Math.round(igst * 100) / 100,
          cgstAmount: Math.round(cgst * 100) / 100,
          sgstAmount: Math.round(sgst * 100) / 100,
          igstAmount: Math.round(igst * 100) / 100,

          // Calculated amounts - dual field mapping
          subtotal: Math.round(baseAmount * 100) / 100, // ✅ Original quantity × price
          taxableAmount: Math.round(itemTaxableAmount * 100) / 100,
          totalTaxAmount: Math.round(itemTotalTax * 100) / 100,
          gstAmount: Math.round(itemTotalTax * 100) / 100,

          // Final amounts - dual field mapping
          amount: Math.round(itemAmount * 100) / 100,
          itemAmount: Math.round(itemAmount * 100) / 100,
          totalAmount: Math.round(itemAmount * 100) / 100,

          // Line number
          lineNumber: i + 1,
        };

        processedItems.push(processedItem);
      }

      // ✅ FIXED: Calculate final totals correctly
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

      // ✅ FIXED: Totals calculation to match your data structure
      const totals = {
        subtotal: Math.round(subtotal * 100) / 100, // Original subtotal (qty × price before discounts)
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
        withTaxTotal: Math.round(adjustedFinalTotal * 100) / 100,
        withoutTaxTotal: Math.round(totalTaxableAmount * 100) / 100,
      };

      // ✅ Calculate payment details
      const paymentDetails = {
        method: payment?.method || "cash",
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
        creditDays: parseInt(payment?.creditDays || 0),
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
        paymentDetails.pendingAmount = adjustedFinalTotal;
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
      if (!orderValidUntil && orderType === "quotation") {
        orderValidUntil = new Date();
        orderValidUntil.setDate(orderValidUntil.getDate() + 30);
      }

      // ✅ FIXED: Update validSourceOrderTypes to match schema exactly
      const validSourceOrderTypes = [
        "purchase_order",
        "purchase-order",
        "purchase_quotation",
        "purchase-quotation",
        "quotation",
        "proforma-invoice",
        "proforma_purchase",
        "proforma-purchase",
        "sales_order",
        "manual",
      ];

      // ✅ FIXED: Determine sourceOrderType BEFORE creating salesOrderData
      let finalSourceOrderType = "manual"; // Default value

      if (sourceOrderType && validSourceOrderTypes.includes(sourceOrderType)) {
        finalSourceOrderType = sourceOrderType;
      } else {
        // ✅ FIXED: Use valid enum values based on detection method
        if (finalSourceCompanyId) {
          switch (sourceCompanyDetectionMethod) {
            case "customer_linked_company":
              finalSourceOrderType = "quotation"; // Valid enum value
              break;
            case "customer_phone_matching":
            case "customer_gst_matching":
            case "customer_email_matching":
              finalSourceOrderType = "purchase_order"; // Valid enum value
              break;
            case "manual":
              finalSourceOrderType = "manual";
              break;
            default:
              finalSourceOrderType = "manual"; // Safe fallback
          }
        }
      }

      // ✅ Create sales order data WITHOUT manual orderNumber - model will auto-generate
      const salesOrderData = {
        // ❌ NO orderNumber field - let model's pre-validate middleware generate it
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        orderType,
        validUntil: orderValidUntil,
        expectedDeliveryDate: expectedDeliveryDate
          ? new Date(expectedDeliveryDate)
          : null,
        deliveryDate: null,
        customer: customerRecord._id,
        customerMobile:
          customerMobile || customerRecord.mobile || customerRecord.phoneNumber,
        gstEnabled: finalGstEnabled,
        gstType: finalGstType,
        taxMode: finalTaxMode,
        priceIncludesTax: finalPriceIncludesTax,
        companyId, // ✅ Required for model's automatic numbering

        // Enhanced bidirectional tracking
        sourceOrderId:
          sourceOrderId && mongoose.Types.ObjectId.isValid(sourceOrderId)
            ? sourceOrderId
            : null,
        sourceOrderNumber:
          sourceOrderNumber && sourceOrderNumber.trim()
            ? sourceOrderNumber.trim()
            : null,
        sourceOrderType: finalSourceOrderType,
        sourceCompanyId:
          finalSourceCompanyId &&
          mongoose.Types.ObjectId.isValid(finalSourceCompanyId)
            ? finalSourceCompanyId
            : null,
        targetCompanyId:
          targetCompanyId && mongoose.Types.ObjectId.isValid(targetCompanyId)
            ? targetCompanyId
            : null,

        isAutoGenerated: isAutoGenerated || false,
        generatedFrom:
          generatedFrom &&
          ["purchase_order", "manual", "import", "api", "duplicate"].includes(
            generatedFrom
          )
            ? generatedFrom
            : "manual",
        generatedBy:
          generatedBy && mongoose.Types.ObjectId.isValid(generatedBy)
            ? generatedBy
            : req.user?.id && mongoose.Types.ObjectId.isValid(req.user.id)
            ? req.user.id
            : null,
        generatedAt: isAutoGenerated ? new Date() : null,

        // Purchase order generation tracking
        autoGeneratedPurchaseOrder: false,
        purchaseOrderRef: null,
        purchaseOrderNumber: null,
        purchaseOrderGeneratedAt: null,
        purchaseOrderGeneratedBy: null,
        hasGeneratedPurchaseOrder: false,
        correspondingPurchaseOrderId: null,
        correspondingPurchaseOrderNumber: null,
        linkedSupplierId: null,

        // Items and totals
        items: processedItems,
        totals,

        // Payment information
        payment: paymentDetails,
        paymentHistory: paymentHistory,

        // Order details
        status,
        priority,
        convertedToInvoice: false,
        invoiceRef: null,
        invoiceNumber: null,
        convertedAt: null,
        convertedBy: null,

        // Additional fields
        requiredBy: null,
        departmentRef: null,
        approvedBy: null,
        approvedAt: null,

        // Notes and terms
        notes: notes || "",
        termsAndConditions: termsAndConditions || "",
        customerNotes: customerNotes || "",
        internalNotes: "",

        // Address information
        shippingAddress: {
          street: "",
          city: "",
          state: "",
          zipCode: "",
          country: "India",
        },

        // Rounding
        roundOff: appliedRoundOff,
        roundOffEnabled: roundOffEnabled,

        // Metadata
        createdBy: createdBy || employeeName || req.user?.id || "system",
        lastModifiedBy:
          lastModifiedBy ||
          createdBy ||
          employeeName ||
          req.user?.id ||
          "system",
      };

      // ✅ FINAL CLEANUP: Remove any undefined values
      Object.keys(salesOrderData).forEach((key) => {
        if (salesOrderData[key] === undefined) {
          delete salesOrderData[key];
        }
      });

      if (salesOrderData.payment) {
        Object.keys(salesOrderData.payment).forEach((key) => {
          if (salesOrderData.payment[key] === undefined) {
            delete salesOrderData.payment[key];
          }
        });
      }

      if (salesOrderData.totals) {
        Object.keys(salesOrderData.totals).forEach((key) => {
          if (salesOrderData.totals[key] === undefined) {
            delete salesOrderData.totals[key];
          }
        });
      }

      // ✅ VALIDATION: Ensure required fields are present before creating
      if (!customerRecord || !customerRecord._id) {
        throw new Error("Customer not found or invalid customer data");
      }

      if (!salesOrderData.items || salesOrderData.items.length === 0) {
        throw new Error("No valid items found for sales order creation");
      }

      // ✅ Create the sales order - order number will be auto-generated by model's pre-validate middleware
      const salesOrder = new SalesOrder(salesOrderData);
      await salesOrder.save(); // ✅ Model's pre-validate middleware generates orderNumber automatically

      // ✅ Auto-create corresponding purchase order if enabled
      let correspondingPurchaseOrder = null;
      if (autoCreateCorrespondingPO && targetCompanyId) {
        try {
        } catch (correspondingOrderError) {
          console.warn(
            "⚠️ Failed to create corresponding purchase order:",
            correspondingOrderError
          );
        }
      }

      // ✅ Populate relationships for response
      await salesOrder.populate(
        "customer",
        "name mobile phoneNumber email address type linkedCompanyId"
      );

      if (salesOrder.sourceCompanyId) {
        await salesOrder.populate(
          "sourceCompanyId",
          "businessName email phoneNumber gstin"
        );
      }
      if (salesOrder.targetCompanyId) {
        await salesOrder.populate("targetCompanyId", "businessName email");
      }

      // ✅ Enhanced response
      res.status(201).json({
        success: true,
        message: `${
          orderType === "quotation"
            ? "Quotation"
            : orderType === "sales_order"
            ? "Sales order"
            : "Proforma invoice"
        } created successfully with automatic model-based sequential numbering`,
        data: {
          salesOrder,
          order: {
            orderNumber: salesOrder.orderNumber, // ✅ Generated by model
            orderDate: salesOrder.orderDate,
            orderType: salesOrder.orderType,
            validUntil: salesOrder.validUntil,
            customer: {
              id: customerRecord._id,
              name: customerRecord.name,
              mobile: customerRecord.mobile || customerRecord.phoneNumber,
              email: customerRecord.email || "",
              linkedCompanyId:
                customerRecord.linkedCompanyId?._id ||
                customerRecord.linkedCompanyId,
              linkedCompanyName: customerRecord.linkedCompanyId?.businessName,
            },
            totals: salesOrder.totals,
            payment: {
              ...salesOrder.payment,
              dueDate: salesOrder.payment.dueDate,
              creditDays: salesOrder.payment.creditDays,
            },
            gstType: salesOrder.gstType,
            gstEnabled: salesOrder.gstEnabled,
            taxMode: salesOrder.taxMode,
            priceIncludesTax: salesOrder.priceIncludesTax,
            status: salesOrder.status,
            priority: salesOrder.priority,
            trackingInfo: {
              isAutoGenerated: salesOrder.isAutoGenerated,
              generatedFrom: salesOrder.generatedFrom,
              sourceOrderNumber: salesOrder.sourceOrderNumber,
              sourceOrderType: salesOrder.sourceOrderType,
              hasSource: !!salesOrder.sourceOrderId,
              hasCorresponding: !!salesOrder.correspondingPurchaseOrderId,
              hasGenerated: !!salesOrder.purchaseOrderRef,
              sourceCompanyId: salesOrder.sourceCompanyId?.toString(),
              sourceCompanyDetails,
              sourceCompanyDetectionMethod,
              autoDetectedSourceCompany:
                sourceCompanyDetectionMethod === "customer_linked_company",
            },
            numberingInfo: {
              isSequential: true,
              companySpecific: true,
              autoGenerated: true,
              generatedBy: "model_pre_validate_middleware",
              pattern: `${
                salesOrder.orderNumber.split("-")[0]
              }-{ORDER_TYPE}-[GST-]YYYYMMDD-XXXX`,
              modelBased: true,
            },
          },
          correspondingPurchaseOrder: correspondingPurchaseOrder
            ? {
                id: correspondingPurchaseOrder._id,
                orderNumber: correspondingPurchaseOrder.orderNumber,
                companyId: correspondingPurchaseOrder.companyId,
                status: correspondingPurchaseOrder.status,
                totalAmount: correspondingPurchaseOrder.totals.finalTotal,
              }
            : null,
          orderNumberInfo: {
            orderNumber: salesOrder.orderNumber,
            wasAutoGenerated: true,
            generatedAt: new Date().toISOString(),
            isUnique: true,
          },
          customerInfo: {
            customerId: customerRecord._id,
            customerName: customerRecord.name,
            wasCreated: !customer && !customerMobile,
            resolutionMethod: customer
              ? "by_id"
              : customerMobile
              ? "by_mobile"
              : "by_name",
            hasLinkedCompany: !!customerRecord.linkedCompanyId,
            linkedCompanyId:
              customerRecord.linkedCompanyId?._id ||
              customerRecord.linkedCompanyId,
            linkedCompanyName: customerRecord.linkedCompanyId?.businessName,
          },

          // ✅ ENHANCED: Comprehensive source company tracking info
          sourceCompanyTracking: {
            enabled: autoDetectSourceCompany,
            detected: !!finalSourceCompanyId,
            detectionMethod: sourceCompanyDetectionMethod,
            sourceCompanyId: finalSourceCompanyId?.toString(),
            sourceCompanyDetails,
            customerLinkedCompany: {
              id:
                customerRecord.linkedCompanyId?._id ||
                customerRecord.linkedCompanyId,
              name: customerRecord.linkedCompanyId?.businessName,
              email: customerRecord.linkedCompanyId?.email,
              gstin: customerRecord.linkedCompanyId?.gstin,
              isActive: customerRecord.linkedCompanyId?.isActive,
            },
            explanation:
              sourceCompanyDetectionMethod === "customer_linked_company"
                ? "Source company auto-detected from customer's linked company account"
                : sourceCompanyDetectionMethod === "manual"
                ? "Source company provided manually"
                : "No source company detected or provided",
          },
        },
      });
    } catch (error) {
      console.error(
        "❌ Error creating sales order with model-based numbering:",
        error
      );

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
          message: "Sales order validation failed",
          error: "VALIDATION_ERROR",
          code: "VALIDATION_ERROR",
          validationErrors,
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to create sales order",
        error: error.message,
        code: "SALES_ORDER_CREATION_FAILED",
      });
    }
  },
  confirmGeneratedSalesOrder: async (req, res) => {
    try {
      const {id} = req.params;
      const {confirmedBy, notes = "", modifications = null} = req.body;

      const salesOrder = await SalesOrder.findById(id);
      if (!salesOrder) {
        return res.status(404).json({
          success: false,
          message: "Sales order not found",
        });
      }

      // Verify this is an auto-generated order
      if (
        !salesOrder.isAutoGenerated ||
        salesOrder.generatedFrom !== "purchase_order"
      ) {
        return res.status(400).json({
          success: false,
          message: "This sales order was not generated from a purchase order",
        });
      }

      // ✅ Use unified model method
      await salesOrder.confirmOrder(confirmedBy);

      // ✅ CRITICAL: Update corresponding purchase order status
      if (
        salesOrder.sourceOrderId &&
        salesOrder.sourceOrderType === "purchase_order"
      ) {
        const correspondingPurchaseOrder = await PurchaseOrder.findById(
          salesOrder.sourceOrderId
        );
        if (correspondingPurchaseOrder) {
          correspondingPurchaseOrder.status = "confirmed";
          correspondingPurchaseOrder.lastModifiedBy = confirmedBy;
          await correspondingPurchaseOrder.save();
        }
      }

      res.status(200).json({
        success: true,
        message:
          "Generated sales order confirmed successfully and purchase order updated",
        data: {
          salesOrder,
          correspondingPurchaseOrderUpdated: !!salesOrder.sourceOrderId,
        },
      });
    } catch (error) {
      console.error("❌ Error confirming generated sales order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to confirm generated sales order",
        error: error.message,
      });
    }
  },

  getOrdersNeedingConfirmation: async (req, res) => {
    try {
      const {companyId} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      // Get sales orders generated from purchase orders that need confirmation
      const salesOrdersNeedingConfirmation = await SalesOrder.find({
        companyId,
        isAutoGenerated: true,
        generatedFrom: "purchase_order",
        status: "sent", // Generated but not yet confirmed
      })
        .populate("customer", "name mobile email")
        .populate("sourceCompanyId", "businessName")
        .sort({createdAt: -1});

      res.status(200).json({
        success: true,
        data: salesOrdersNeedingConfirmation,
        message: `Found ${salesOrdersNeedingConfirmation.length} sales orders needing confirmation`,
      });
    } catch (error) {
      console.error("Error getting orders needing confirmation:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get orders needing confirmation",
        error: error.message,
      });
    }
  },

  bulkConfirmOrders: async (req, res) => {
    try {
      const {orderIds, confirmedBy} = req.body;

      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Order IDs array is required",
        });
      }

      const results = {
        successful: [],
        failed: [],
      };

      for (const orderId of orderIds) {
        try {
          const salesOrder = await SalesOrder.findById(orderId);
          if (salesOrder && salesOrder.status === "sent") {
            await salesOrder.confirmOrder(confirmedBy);

            // Update corresponding purchase order if exists
            if (salesOrder.sourceOrderId) {
              const purchaseOrder = await PurchaseOrder.findById(
                salesOrder.sourceOrderId
              );
              if (purchaseOrder) {
                purchaseOrder.status = "confirmed";
                await purchaseOrder.save();
              }
            }

            results.successful.push({
              orderId,
              orderNumber: salesOrder.orderNumber,
            });
          }
        } catch (error) {
          results.failed.push({
            orderId,
            error: error.message,
          });
        }
      }

      res.status(200).json({
        success: true,
        message: `Bulk confirmation completed: ${results.successful.length} successful, ${results.failed.length} failed`,
        data: results,
      });
    } catch (error) {
      console.error("❌ Error in bulk confirm orders:", error);
      res.status(500).json({
        success: false,
        message: "Failed to perform bulk confirmation",
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
        isAdvancePayment = false,
        paymentDetails = {}, // Additional payment details for Payment model
      } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sales order ID",
        });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid payment amount is required",
        });
      }

      const salesOrder = await SalesOrder.findById(id);
      if (!salesOrder) {
        return res.status(404).json({
          success: false,
          message: "Sales order not found",
        });
      }

      const currentBalance = salesOrder.balanceAmount;
      if (amount > currentBalance) {
        return res.status(400).json({
          success: false,
          message: `Payment amount cannot exceed balance amount of ₹${currentBalance.toFixed(
            2
          )}`,
        });
      }

      // ✅ CREATE PAYMENT RECORD USING PAYMENT MODEL
      const paymentRecord = new Payment({
        party: salesOrder.customer,
        partyType: "customer",
        amount: parseFloat(amount),
        paymentMethod: method,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        type: "payment_in", // Payment received from customer
        reference,
        notes:
          notes ||
          `Payment for ${salesOrder.orderType} ${salesOrder.orderNumber}`,
        internalNotes: `Sales Order: ${salesOrder.orderNumber} (${salesOrder.orderType})`,
        paymentDetails,
        company: salesOrder.companyId,
        createdBy: req.user?.id || "system",
        status: "completed",
        // Link to the sales order document
        linkedDocuments: [
          {
            documentType: "sales_order",
            documentId: salesOrder._id,
            documentModel: "SalesOrder",
            documentNumber: salesOrder.orderNumber,
            documentDate: salesOrder.orderDate,
            documentTotal: salesOrder.totals.finalTotal,
            allocatedAmount: parseFloat(amount),
            remainingAmount: Math.max(0, currentBalance - parseFloat(amount)),
            allocationDate: new Date(),
            isFullyPaid: currentBalance - parseFloat(amount) <= 0,
          },
        ],
      });

      // Save the payment record
      await paymentRecord.save();

      // Add payment using sales order model method
      await salesOrder.addPayment(amount, method, reference, notes);

      // If this is an advance payment, update the advance amount
      if (isAdvancePayment) {
        salesOrder.payment.advanceAmount =
          (salesOrder.payment.advanceAmount || 0) + parseFloat(amount);
        await salesOrder.save();
      }

      res.status(200).json({
        success: true,
        message: "Payment added successfully",
        data: {
          orderNumber: salesOrder.orderNumber,
          paymentNumber: paymentRecord.paymentNumber,
          paymentId: paymentRecord._id,
          totalAmount: salesOrder.totals.finalTotal,
          paidAmount: salesOrder.payment.paidAmount,
          advanceAmount: salesOrder.payment.advanceAmount,
          pendingAmount: salesOrder.payment.pendingAmount,
          paymentStatus: salesOrder.payment.status,
          paymentMethod: salesOrder.payment.method,
          paymentDate: salesOrder.payment.paymentDate,
          dueDate: salesOrder.payment.dueDate,
          creditDays: salesOrder.payment.creditDays,
          isOverdue: salesOrder.isOverdue,
          paymentHistory: salesOrder.paymentHistory,
          balanceAmount: salesOrder.balanceAmount,
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
      console.error("Error adding payment:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add payment",
        error: error.message,
      });
    }
  },

  getSalesOrderById: async (req, res) => {
    try {
      const {id} = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sales order ID",
        });
      }

      const salesOrder = await SalesOrder.findById(id)
        .populate("customer", "name mobile email address type gstNumber")
        .populate("items.itemRef", "name itemCode category currentStock")
        .populate("invoiceRef", "invoiceNumber invoiceDate");

      if (!salesOrder) {
        return res.status(404).json({
          success: false,
          message: "Sales order not found",
        });
      }

      // Ensure backward compatibility for tax mode fields
      const compatibleSalesOrder = {
        ...salesOrder.toObject(),
        taxMode:
          salesOrder.taxMode ||
          (salesOrder.priceIncludesTax ? "with-tax" : "without-tax"),
        priceIncludesTax:
          salesOrder.priceIncludesTax ?? salesOrder.taxMode === "with-tax",
        items: salesOrder.items.map((item) => ({
          ...item,
          taxMode: item.taxMode || salesOrder.taxMode || "without-tax",
          priceIncludesTax:
            item.priceIncludesTax ?? item.taxMode === "with-tax",
          cgstAmount: item.cgstAmount || item.cgst || 0,
          sgstAmount: item.sgstAmount || item.sgst || 0,
          igstAmount: item.igstAmount || item.igst || 0,
          amount: item.amount || item.itemAmount || 0,
        })),
      };

      res.json({
        success: true,
        data: compatibleSalesOrder,
      });
    } catch (error) {
      console.error("❌ Error fetching sales order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch sales order",
        error: error.message,
      });
    }
  },

  getAllSalesOrders: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        companyId,
        customer,
        status,
        orderType,
        paymentStatus,
        dateFrom,
        dateTo,
        validFrom,
        validTo,
        priority,
        search,
      } = req.query;

      const filter = {};

      if (companyId) filter.companyId = companyId;
      if (customer) filter.customer = customer;
      if (status) filter.status = status;
      if (orderType) filter.orderType = orderType;
      if (paymentStatus) filter["payment.status"] = paymentStatus;
      if (priority) filter.priority = priority;

      if (dateFrom || dateTo) {
        filter.orderDate = {};
        if (dateFrom) filter.orderDate.$gte = new Date(dateFrom);
        if (dateTo) filter.orderDate.$lte = new Date(dateTo);
      }

      if (validFrom || validTo) {
        filter.validUntil = {};
        if (validFrom) filter.validUntil.$gte = new Date(validFrom);
        if (validTo) filter.validUntil.$lte = new Date(validTo);
      }

      if (search) {
        filter.$or = [
          {orderNumber: {$regex: search, $options: "i"}},
          {customerMobile: {$regex: search, $options: "i"}},
          {notes: {$regex: search, $options: "i"}},
          {customerNotes: {$regex: search, $options: "i"}},
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const salesOrders = await SalesOrder.find(filter)
        .populate("customer", "name mobile email address type")
        .populate("invoiceRef", "invoiceNumber")
        .sort({createdAt: -1})
        .skip(skip)
        .limit(parseInt(limit));

      const transformedOrders = salesOrders.map((order) => ({
        id: order._id,
        orderNo: order.orderNumber,
        orderType: order.orderType,
        date: order.orderDate,
        validUntil: order.validUntil,
        partyName: order.customer?.name || "Unknown",
        partyPhone: order.customer?.mobile || order.customerMobile,
        transaction:
          order.orderType === "quotation"
            ? "Quotation"
            : order.orderType === "sales_order"
            ? "Sales Order"
            : "Proforma Invoice",
        paymentType: order.payment?.method || "cash",
        amount: order.totals?.finalTotal || 0,
        balance: order.payment?.pendingAmount || 0,
        status: order.status,
        paymentStatus: order.payment?.status || "pending",
        priority: order.priority,
        convertedToInvoice: order.convertedToInvoice,
        invoiceNumber: order.invoiceRef?.invoiceNumber || null,
        isExpired: order.isExpired,
        isOverdue: order.isOverdue,
        ...order.toObject(),
      }));

      const totalOrders = await SalesOrder.countDocuments(filter);
      const totalPages = Math.ceil(totalOrders / parseInt(limit));

      const summary = await SalesOrder.aggregate([
        {$match: filter},
        {
          $group: {
            _id: null,
            totalAmount: {$sum: "$totals.finalTotal"},
            totalTax: {$sum: "$totals.totalTax"},
            totalDiscount: {$sum: "$totals.totalDiscount"},
            paidAmount: {$sum: "$payment.paidAmount"},
            pendingAmount: {$sum: "$payment.pendingAmount"},
            quotationCount: {
              $sum: {$cond: [{$eq: ["$orderType", "quotation"]}, 1, 0]},
            },
            salesOrderCount: {
              $sum: {$cond: [{$eq: ["$orderType", "sales_order"]}, 1, 0]},
            },
            convertedCount: {$sum: {$cond: ["$convertedToInvoice", 1, 0]}},
          },
        },
      ]);

      res.status(200).json({
        success: true,
        data: {
          salesOrders: transformedOrders,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalOrders,
            hasNext: parseInt(page) < totalPages,
            hasPrev: parseInt(page) > 1,
          },
          summary: summary[0] || {
            totalAmount: 0,
            totalTax: 0,
            totalDiscount: 0,
            paidAmount: 0,
            pendingAmount: 0,
            quotationCount: 0,
            salesOrderCount: 0,
            convertedCount: 0,
          },
        },
      });
    } catch (error) {
      console.error("Error getting sales orders:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sales orders",
        error: error.message,
      });
    }
  },

  convertToInvoice: async (req, res) => {
    try {
      const {id} = req.params;
      const {invoiceDate, transferAdvancePayment = true} = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sales order ID",
        });
      }

      const salesOrder = await SalesOrder.findById(id);
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
        });
      }

      if (
        salesOrder.status === "cancelled" ||
        salesOrder.status === "rejected"
      ) {
        return res.status(400).json({
          success: false,
          message: "Cannot convert cancelled or rejected orders",
        });
      }

      // Convert using the model method
      const invoice = await salesOrder.convertToInvoice();

      // Update invoice date if provided
      if (invoiceDate) {
        invoice.invoiceDate = new Date(invoiceDate);
        await invoice.save();
      }

      // ✅ TRANSFER ADVANCE PAYMENTS TO INVOICE
      if (transferAdvancePayment && salesOrder.payment.advanceAmount > 0) {
        // Find advance payment records for this order
        const advancePayments = await Payment.find({
          party: salesOrder.customer,
          company: salesOrder.companyId,
          "linkedDocuments.documentId": salesOrder._id,
          status: "completed",
        });

        // Update payment records to reference the new invoice
        for (const payment of advancePayments) {
          payment.notes = `${payment.notes} - Transferred to Invoice ${invoice.invoiceNumber}`;

          // Add new document link for the invoice
          payment.linkedDocuments.push({
            documentType: "sale",
            documentId: invoice._id,
            documentModel: "Sale",
            documentNumber: invoice.invoiceNumber,
            documentDate: invoice.invoiceDate,
            documentTotal: invoice.totals.finalTotal,
            allocatedAmount: payment.amount,
            remainingAmount: Math.max(
              0,
              invoice.totals.finalTotal - payment.amount
            ),
            allocationDate: new Date(),
            isFullyPaid: invoice.totals.finalTotal <= payment.amount,
          });

          await payment.save();
        }
      }

      await salesOrder.populate("customer", "name mobile email");
      await invoice.populate("customer", "name mobile email");

      res.status(200).json({
        success: true,
        message: "Sales order converted to invoice successfully",
        data: {
          salesOrder,
          invoice,
          conversion: {
            orderNumber: salesOrder.orderNumber,
            invoiceNumber: invoice.invoiceNumber,
            convertedAt: salesOrder.convertedAt,
            advanceTransferred: transferAdvancePayment
              ? salesOrder.payment.advanceAmount
              : 0,
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

  updateStatus: async (req, res) => {
    try {
      const {id} = req.params;
      const {status, reason = ""} = req.body;

      if (!id || id === "undefined" || id === "null") {
        console.error("❌ INVALID ID RECEIVED:", {
          id,
          params: req.params,
          url: req.url,
          method: req.method,
        });
        return res.status(400).json({
          success: false,
          message: "Order ID is required and cannot be undefined",
          error: "MISSING_ORDER_ID",
          debug: {
            receivedId: id,
            idType: typeof id,
            params: req.params,
            url: req.url,
          },
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.error("❌ INVALID MONGODB ID FORMAT:", {
          id,
          idType: typeof id,
          idLength: id?.length,
        });
        return res.status(400).json({
          success: false,
          message: "Invalid sales order ID format",
          error: "INVALID_ID_FORMAT",
          debug: {
            receivedId: id,
            idType: typeof id,
            expectedFormat: "24-character hex string",
          },
        });
      }

      const validStatuses = [
        "draft",
        "sent",
        "accepted",
        "rejected",
        "expired",
        "converted",
        "cancelled",
        "confirmed", // ✅ ADD: confirmed status
      ];

      if (!status) {
        console.error("❌ MISSING STATUS:", {
          body: req.body,
          status,
          validStatuses,
        });
        return res.status(400).json({
          success: false,
          message: "Status is required",
          error: "MISSING_STATUS",
          validStatuses,
        });
      }

      if (!validStatuses.includes(status)) {
        console.error("❌ INVALID STATUS:", {
          status,
          validStatuses,
          body: req.body,
        });
        return res.status(400).json({
          success: false,
          message:
            "Invalid status. Must be one of: " + validStatuses.join(", "),
          error: "INVALID_STATUS",
          provided: status,
          validStatuses,
        });
      }

      const salesOrder = await SalesOrder.findById(id);
      if (!salesOrder) {
        console.error("❌ SALES ORDER NOT FOUND:", {
          searchId: id,
          isValidId: mongoose.Types.ObjectId.isValid(id),
        });
        return res.status(404).json({
          success: false,
          message: "Sales order not found",
          error: "ORDER_NOT_FOUND",
          searchId: id,
        });
      }

      // Check if status change is allowed
      if (salesOrder.convertedToInvoice && status !== "converted") {
        console.warn("⚠️ STATUS CHANGE BLOCKED:", {
          orderNumber: salesOrder.orderNumber,
          currentStatus: salesOrder.status,
          targetStatus: status,
          convertedToInvoice: salesOrder.convertedToInvoice,
          reason: "Cannot change status of converted orders",
        });
        return res.status(400).json({
          success: false,
          message: "Cannot change status of converted orders",
          error: "STATUS_CHANGE_BLOCKED",
          currentStatus: salesOrder.status,
          targetStatus: status,
        });
      }

      const previousStatus = salesOrder.status;

      salesOrder.status = status;
      salesOrder.lastModifiedBy = req.user?.id || "system";

      // Add reason to notes if provided
      if (reason) {
        const statusNote = `Status changed from ${previousStatus} to ${status}. Reason: ${reason}`;
        salesOrder.notes = salesOrder.notes
          ? `${salesOrder.notes}\n${statusNote}`
          : statusNote;
      }

      await salesOrder.save();

      res.status(200).json({
        success: true,
        message: `Sales order status updated to ${status}`,
        data: {
          orderId: salesOrder._id,
          orderNumber: salesOrder.orderNumber,
          previousStatus,
          currentStatus: salesOrder.status,
          reason,
          updatedAt: salesOrder.updatedAt,
          lastModifiedBy: salesOrder.lastModifiedBy,
        },
      });
    } catch (error) {
      console.error("❌ ERROR IN UPDATE STATUS:", {
        error: error.message,
        stack: error.stack,
        params: req.params,
        body: req.body,
        url: req.url,
      });

      res.status(500).json({
        success: false,
        message: "Failed to update sales order status",
        error: error.message,
        code: "UPDATE_STATUS_FAILED",
      });
    }
  },

  updateSalesOrder: async (req, res) => {
    try {
      const {id} = req.params;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sales order ID",
        });
      }

      const salesOrder = await SalesOrder.findById(id);
      if (!salesOrder) {
        return res.status(404).json({
          success: false,
          message: "Sales order not found",
        });
      }

      if (salesOrder.convertedToInvoice) {
        return res.status(400).json({
          success: false,
          message: "Cannot update converted sales orders",
        });
      }

      if (salesOrder.status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Cannot update cancelled sales orders",
        });
      }

      updateData.lastModifiedBy = req.user?.id || "system";

      const updatedSalesOrder = await SalesOrder.findByIdAndUpdate(
        id,
        updateData,
        {new: true, runValidators: true}
      ).populate("customer", "name mobile email address");

      res.status(200).json({
        success: true,
        message: "Sales order updated successfully",
        data: updatedSalesOrder,
      });
    } catch (error) {
      console.error("Error updating sales order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update sales order",
        error: error.message,
      });
    }
  },

  deleteSalesOrder: async (req, res) => {
    try {
      const {id} = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sales order ID",
        });
      }

      const salesOrder = await SalesOrder.findById(id);
      if (!salesOrder) {
        return res.status(404).json({
          success: false,
          message: "Sales order not found",
        });
      }

      if (salesOrder.convertedToInvoice) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete converted sales orders",
        });
      }

      salesOrder.status = "cancelled";
      salesOrder.lastModifiedBy = req.user?.id || "system";
      await salesOrder.save();

      res.status(200).json({
        success: true,
        message: "Sales order cancelled successfully",
      });
    } catch (error) {
      console.error("Error deleting sales order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete sales order",
        error: error.message,
      });
    }
  },

  getPendingOrdersForPayment: async (req, res) => {
    try {
      const {companyId, customerId} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const filter = {
        companyId,
        "payment.pendingAmount": {$gt: 0},
        status: {$nin: ["cancelled", "rejected"]},
      };

      if (customerId) {
        filter.customer = customerId;
      }

      const pendingOrders = await SalesOrder.find(filter)
        .populate("customer", "name mobile email businessName")
        .select(
          "orderNumber orderDate orderType totals payment customer status"
        )
        .sort({orderDate: -1});

      res.status(200).json({
        success: true,
        data: pendingOrders,
        message: `Found ${pendingOrders.length} pending orders`,
      });
    } catch (error) {
      console.error("Error getting pending orders:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get pending orders",
        error: error.message,
      });
    }
  },

  getCustomerPendingDocuments: async (req, res) => {
    try {
      const {customerId, companyId} = req.query;

      if (!customerId || !companyId) {
        return res.status(400).json({
          success: false,
          message: "Customer ID and Company ID are required",
        });
      }

      // Get pending sales orders
      const pendingOrders = await SalesOrder.find({
        customer: customerId,
        companyId,
        "payment.pendingAmount": {$gt: 0},
        status: {$nin: ["cancelled", "rejected"]},
      }).select("orderNumber orderDate orderType totals payment status");

      // Get pending invoices
      const pendingInvoices = await Sale.find({
        customer: customerId,
        companyId,
        "payment.pendingAmount": {$gt: 0},
        status: {$ne: "cancelled"},
      }).select("invoiceNumber invoiceDate invoiceType totals payment status");

      const documents = [
        ...pendingOrders.map((order) => ({
          id: order._id,
          type: "sales_order",
          number: order.orderNumber,
          date: order.orderDate,
          total: order.totals.finalTotal,
          paid: order.payment.paidAmount,
          pending: order.payment.pendingAmount,
          status: order.status,
          subType: order.orderType,
        })),
        ...pendingInvoices.map((invoice) => ({
          id: invoice._id,
          type: "sale",
          number: invoice.invoiceNumber,
          date: invoice.invoiceDate,
          total: invoice.totals.finalTotal,
          paid: invoice.payment.paidAmount,
          pending: invoice.payment.pendingAmount,
          status: invoice.status,
          subType: invoice.invoiceType,
        })),
      ];

      // Sort by date descending
      documents.sort((a, b) => new Date(b.date) - new Date(a.date));
      res.status(200).json({
        success: true,
        data: documents,
        message: `Found ${documents.length} pending documents`,
      });
    } catch (error) {
      console.error("Error getting customer pending documents:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get customer pending documents",
        error: error.message,
      });
    }
  },

  getExpiredOrders: async (req, res) => {
    try {
      const {companyId} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const today = new Date();

      const expiredOrders = await SalesOrder.find({
        companyId,
        validUntil: {$lt: today},
        status: {$nin: ["converted", "cancelled", "expired"]},
      })
        .populate("customer", "name mobile email")
        .sort({validUntil: 1});

      res.status(200).json({
        success: true,
        data: expiredOrders,
        message: `Found ${expiredOrders.length} expired orders`,
      });
    } catch (error) {
      console.error("Error getting expired orders:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get expired orders",
        error: error.message,
      });
    }
  },

  getDashboardSummary: async (req, res) => {
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

      const [
        totalSummary,
        monthlySummary,
        statusSummary,
        expiredCount,
        pendingPayments,
      ] = await Promise.all([
        // Total summary
        SalesOrder.aggregate([
          {
            $match: {
              companyId: new mongoose.Types.ObjectId(companyId),
              status: {$ne: "cancelled"},
            },
          },
          {
            $group: {
              _id: null,
              totalOrders: {$sum: 1},
              totalValue: {$sum: "$totals.finalTotal"},
              totalPaid: {$sum: "$payment.paidAmount"},
              totalPending: {$sum: "$payment.pendingAmount"},
            },
          },
        ]),

        // Monthly summary
        SalesOrder.aggregate([
          {
            $match: {
              companyId: new mongoose.Types.ObjectId(companyId),
              orderDate: {$gte: startOfMonth},
              status: {$ne: "cancelled"},
            },
          },
          {
            $group: {
              _id: null,
              monthlyOrders: {$sum: 1},
              monthlyValue: {$sum: "$totals.finalTotal"},
            },
          },
        ]),

        // Status summary
        SalesOrder.aggregate([
          {
            $match: {
              companyId: new mongoose.Types.ObjectId(companyId),
            },
          },
          {
            $group: {
              _id: "$status",
              count: {$sum: 1},
              value: {$sum: "$totals.finalTotal"},
            },
          },
        ]),

        // Expired orders count
        SalesOrder.countDocuments({
          companyId,
          validUntil: {$lt: today},
          status: {$nin: ["converted", "cancelled", "expired"]},
        }),

        // Pending payments summary
        SalesOrder.aggregate([
          {
            $match: {
              companyId: new mongoose.Types.ObjectId(companyId),
              "payment.pendingAmount": {$gt: 0},
              status: {$nin: ["cancelled", "rejected"]},
            },
          },
          {
            $group: {
              _id: null,
              pendingPaymentOrders: {$sum: 1},
              pendingPaymentAmount: {$sum: "$payment.pendingAmount"},
            },
          },
        ]),
      ]);

      const summary = {
        total: totalSummary[0] || {
          totalOrders: 0,
          totalValue: 0,
          totalPaid: 0,
          totalPending: 0,
        },
        monthly: monthlySummary[0] || {monthlyOrders: 0, monthlyValue: 0},
        byStatus: statusSummary.reduce((acc, item) => {
          acc[item._id] = {count: item.count, value: item.value};
          return acc;
        }, {}),
        expiredCount,
        pendingPayments: pendingPayments[0] || {
          pendingPaymentOrders: 0,
          pendingPaymentAmount: 0,
        },
      };

      res.status(200).json({
        success: true,
        data: summary,
        message: "Dashboard summary retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting dashboard summary:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get dashboard summary",
        error: error.message,
      });
    }
  },

  generateSalesOrder: async (req, res) => {
    try {
      const {id} = req.params; // Purchase Order ID
      let {
        targetCompanyId, // This should be the SUPPLIER's company ID
        targetCustomerId,
        targetCustomerMobile,
        targetCustomerName,
        convertedBy,
        notes: conversionNotes = "",
        deliveryDate,
        validUntil,
        orderType = "sales_order",
        autoLinkCustomer = true,
        validateBidirectionalSetup = true,
      } = req.body;

      // ✅ CRITICAL FIX: Ensure we have a valid user ID
      let validUserId = null;
      if (convertedBy && mongoose.Types.ObjectId.isValid(convertedBy)) {
        validUserId = convertedBy;
      } else if (req.user?.id && mongoose.Types.ObjectId.isValid(req.user.id)) {
        validUserId = req.user.id;
      } else if (
        req.user?._id &&
        mongoose.Types.ObjectId.isValid(req.user._id)
      ) {
        validUserId = req.user._id;
      } else {
        // ✅ FALLBACK: Create a system default user ID
        validUserId = new mongoose.Types.ObjectId("676e5a123456789012345678");
      }

      // ✅ FIXED: Handle targetCompanyId object format
      if (typeof targetCompanyId === "object") {
        if (targetCompanyId.id) {
          targetCompanyId = targetCompanyId.id;
        } else if (targetCompanyId._id) {
          targetCompanyId = targetCompanyId._id;
        } else {
          targetCompanyId = null;
        }
      }

      // ✅ ENHANCED: Validate purchase order ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase order ID format",
          error: "INVALID_PURCHASE_ORDER_ID",
          code: "VALIDATION_ERROR",
        });
      }

      // ✅ ENHANCED: Find purchase order with comprehensive population
      const purchaseOrder = await PurchaseOrder.findById(id)
        .populate(
          "supplier",
          "name mobile email companyId gstNumber phoneNumber linkedCompanyId companyName isLinkedSupplier enableBidirectionalOrders autoLinkByGST autoLinkByPhone autoLinkByEmail"
        )
        .populate(
          "companyId",
          "businessName email phoneNumber gstin address city state pincode isActive"
        )
        .populate(
          "targetCompanyId",
          "businessName email phoneNumber gstin isActive"
        );

      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
          error: "PURCHASE_ORDER_NOT_FOUND",
          code: "NOT_FOUND",
        });
      }

      // ✅ ENHANCED: Validate purchase order status
      if (["cancelled", "deleted"].includes(purchaseOrder.status)) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot generate sales order from cancelled or deleted purchase order",
          error: "INVALID_PURCHASE_ORDER_STATUS",
          code: "BUSINESS_RULE_VIOLATION",
          data: {
            currentStatus: purchaseOrder.status,
            orderNumber: purchaseOrder.orderNumber,
          },
        });
      }

      // ✅ ENHANCED: Check if sales order already generated
      if (purchaseOrder.autoGeneratedSalesOrder) {
        return res.status(400).json({
          success: false,
          message: "Sales order already generated from this purchase order",
          error: "SALES_ORDER_ALREADY_EXISTS",
          code: "DUPLICATE_OPERATION",
          data: {
            existingSalesOrderNumber: purchaseOrder.salesOrderNumber,
            existingSalesOrderId: purchaseOrder.salesOrderRef,
            generatedAt: purchaseOrder.salesOrderGeneratedAt,
            generatedBy: purchaseOrder.salesOrderGeneratedBy,
          },
        });
      }

      const buyerCompanyId = purchaseOrder.companyId._id.toString();
      const supplierData = purchaseOrder.supplier;

      // ✅ ENHANCED: Auto-detect SUPPLIER's company with improved logic
      if (!targetCompanyId) {
        try {
          let detectionMethod = null;

          // Method 1: Use linkedCompanyId (most reliable)
          if (supplierData.linkedCompanyId) {
            const linkedCompanyId = supplierData.linkedCompanyId.toString();

            if (linkedCompanyId !== buyerCompanyId) {
              const supplierCompany = await Company.findById(
                supplierData.linkedCompanyId
              );
              if (supplierCompany && supplierCompany.isActive !== false) {
                targetCompanyId = supplierCompany._id;
                detectionMethod = "supplier_linked_company";
              }
            }
          }

          // Method 2: GST number matching (if auto-link enabled)
          if (
            !targetCompanyId &&
            supplierData.autoLinkByGST &&
            supplierData.gstNumber
          ) {
            const supplierCompany = await Company.findOne({
              gstin: supplierData.gstNumber,
              isActive: {$ne: false},
              _id: {$ne: purchaseOrder.companyId._id},
            });

            if (supplierCompany) {
              targetCompanyId = supplierCompany._id;
              detectionMethod = "gst_auto_link";
            }
          }

          // Method 3: Phone number matching (if auto-link enabled)
          if (
            !targetCompanyId &&
            supplierData.autoLinkByPhone &&
            supplierData.phoneNumber
          ) {
            const phoneVariations = [
              supplierData.phoneNumber,
              supplierData.mobile,
            ].filter(Boolean);

            for (const phone of phoneVariations) {
              const supplierCompany = await Company.findOne({
                phoneNumber: phone,
                isActive: {$ne: false},
                _id: {$ne: purchaseOrder.companyId._id},
              });

              if (supplierCompany) {
                targetCompanyId = supplierCompany._id;
                detectionMethod = "phone_auto_link";
                break;
              }
            }
          }

          // Method 4: Email matching (if auto-link enabled)
          if (
            !targetCompanyId &&
            supplierData.autoLinkByEmail &&
            supplierData.email
          ) {
            const supplierCompany = await Company.findOne({
              email: supplierData.email,
              isActive: {$ne: false},
              _id: {$ne: purchaseOrder.companyId._id},
            });

            if (supplierCompany) {
              targetCompanyId = supplierCompany._id;
              detectionMethod = "email_auto_link";
            }
          }

          // Method 5: Business name matching (fallback)
          if (
            !targetCompanyId &&
            (supplierData.name || supplierData.companyName)
          ) {
            const supplierName = supplierData.name || supplierData.companyName;
            const supplierCompany = await Company.findOne({
              businessName: {
                $regex: new RegExp(`^${supplierName.trim()}$`, "i"),
              },
              isActive: {$ne: false},
              _id: {$ne: purchaseOrder.companyId._id},
            });

            if (supplierCompany) {
              targetCompanyId = supplierCompany._id;
              detectionMethod = "name_fuzzy_match";
            }
          }
        } catch (autoDetectError) {
          console.error(
            "❌ Error in enhanced auto-detection:",
            autoDetectError
          );
        }
      }

      // ✅ ENHANCED: Validate bidirectional setup if requested (ONLY if we have a target company)
      if (validateBidirectionalSetup && targetCompanyId) {
        const validationErrors = [];

        if (!supplierData.linkedCompanyId) {
          validationErrors.push("Supplier does not have a linked company ID");
        }

        if (!supplierData.isLinkedSupplier) {
          validationErrors.push("Supplier is not marked as a linked supplier");
        }

        if (!supplierData.enableBidirectionalOrders) {
          validationErrors.push(
            "Bidirectional orders are not enabled for this supplier"
          );
        }

        if (validationErrors.length > 0) {
        }
      }

      // ✅ ENHANCED: Better error message if no supplier company found
      if (!targetCompanyId) {
        const troubleshootingInfo = {
          supplier: {
            name: supplierData.name,
            linkedCompanyId: supplierData.linkedCompanyId?.toString(),
            gstNumber: supplierData.gstNumber,
            phoneNumber: supplierData.phoneNumber,
            email: supplierData.email,
            autoLinkSettings: {
              autoLinkByGST: supplierData.autoLinkByGST,
              autoLinkByPhone: supplierData.autoLinkByPhone,
              autoLinkByEmail: supplierData.autoLinkByEmail,
            },
          },
          buyerCompany: {
            id: buyerCompanyId,
            name: purchaseOrder.companyId.businessName,
          },
        };

        return res.status(400).json({
          success: false,
          message:
            "❌ SUPPLIER's company account not found for bidirectional order generation",
          error: "NO_SUPPLIER_COMPANY_FOUND",
          code: "CONFIGURATION_ERROR",
          troubleshooting: troubleshootingInfo,
          explanation:
            "Sales order MUST be created in a DIFFERENT company (supplier's) than the purchase order (buyer's). No separate supplier company account was found.",
          quickSolutions: [
            {
              action: "Create new company",
              description: "Create a new company account for the supplier",
              steps: [
                "Go to Companies → Add New Company",
                "Fill supplier's business details",
                "Link supplier to this company",
              ],
            },
            {
              action: "Link existing company",
              description: "Link supplier to an existing different company",
              steps: [
                "Go to Parties → Edit Supplier",
                "Set linkedCompanyId field",
                "Enable bidirectional orders",
              ],
            },
            {
              action: "Manual target",
              description: "Provide targetCompanyId manually in the request",
              steps: [
                "Find target company ID",
                "Include targetCompanyId in request body",
              ],
            },
          ],
        });
      }

      // ✅ ENHANCED: Final validation with detailed error
      if (targetCompanyId.toString() === buyerCompanyId) {
        return res.status(400).json({
          success: false,
          message: "🚨 CRITICAL ERROR: Target company is same as buyer company",
          error: "SAME_COMPANY_DETECTED",
          code: "BUSINESS_RULE_VIOLATION",
          debug: {
            buyerCompanyId,
            targetCompanyId: targetCompanyId.toString(),
            supplierName: supplierData.name,
            supplierLinkedCompanyId: supplierData.linkedCompanyId?.toString(),
            detectedIssue:
              "Circular company reference - supplier's company points to buyer's company",
          },
          explanation:
            "Sales order must be created in a DIFFERENT company (supplier's) than the purchase order (buyer's)",
          solution:
            "Update the supplier's linkedCompanyId to point to a different company or create a new company for the supplier",
        });
      }

      // ✅ ENHANCED: Validate target company exists and is active
      const targetCompany = await Company.findById(targetCompanyId);
      if (!targetCompany) {
        return res.status(400).json({
          success: false,
          message: "Target company not found",
          error: "TARGET_COMPANY_NOT_FOUND",
          code: "VALIDATION_ERROR",
          data: {targetCompanyId: targetCompanyId.toString()},
        });
      }

      if (targetCompany.isActive === false) {
        return res.status(400).json({
          success: false,
          message: "Target company is inactive",
          error: "TARGET_COMPANY_INACTIVE",
          code: "BUSINESS_RULE_VIOLATION",
          data: {
            targetCompanyId: targetCompanyId.toString(),
            companyName: targetCompany.businessName,
          },
        });
      }

      // ✅ SIMPLIFIED: Find customer (representing the BUYER company) in SUPPLIER's system
      let customer = null;
      const buyerCompany = purchaseOrder.companyId;

      try {
        // Search by specific customer ID first if provided
        if (
          targetCustomerId &&
          mongoose.Types.ObjectId.isValid(targetCustomerId)
        ) {
          customer = await Party.findOne({
            _id: targetCustomerId,
            companyId: targetCompanyId,
            $or: [
              {partyType: "customer"},
              {isCustomer: true},
              {type: "customer"},
            ],
          });
        }

        // Search by mobile number if not found by ID
        if (!customer && targetCustomerMobile) {
          customer = await Party.findOne({
            $or: [
              {phoneNumber: targetCustomerMobile},
              {mobile: targetCustomerMobile},
            ],
            companyId: targetCompanyId,
            $or: [
              {partyType: "customer"},
              {isCustomer: true},
              {type: "customer"},
            ],
          });
        }

        // Search by name if not found by ID or mobile
        if (!customer && targetCustomerName) {
          customer = await Party.findOne({
            name: {$regex: new RegExp(`^${targetCustomerName.trim()}$`, "i")},
            companyId: targetCompanyId,
            $or: [
              {partyType: "customer"},
              {isCustomer: true},
              {type: "customer"},
            ],
          });
        }

        // ✅ NEW: Search for customer representing the buyer company
        if (!customer) {
          // Search by multiple criteria for buyer company
          const buyerCustomerSearchCriteria = {
            companyId: targetCompanyId,
            $or: [
              {partyType: "customer"},
              {isCustomer: true},
              {type: "customer"},
            ],
            $and: [
              {
                $or: [
                  // Search by buyer company's GST number
                  ...(buyerCompany.gstin
                    ? [
                        {gstNumber: buyerCompany.gstin},
                        {
                          gstNumber: {
                            $regex: buyerCompany.gstin,
                            $options: "i",
                          },
                        },
                      ]
                    : []),
                  // Search by buyer company's phone
                  ...(buyerCompany.phoneNumber
                    ? [
                        {phoneNumber: buyerCompany.phoneNumber},
                        {mobile: buyerCompany.phoneNumber},
                      ]
                    : []),
                  // Search by buyer company's email
                  ...(buyerCompany.email
                    ? [
                        {email: buyerCompany.email},
                        {email: {$regex: buyerCompany.email, $options: "i"}},
                      ]
                    : []),
                  // Search by buyer company's business name
                  {
                    name: {
                      $regex: new RegExp(`^${buyerCompany.businessName}$`, "i"),
                    },
                  },
                  {
                    name: {
                      $regex: new RegExp(buyerCompany.businessName, "i"),
                    },
                  },
                  // Search by linked company ID
                  {linkedCompanyId: buyerCompany._id},
                ],
              },
            ],
          };

          customer = await Party.findOne(buyerCustomerSearchCriteria);

          if (customer) {
            // ✅ OPTIONAL: Update linking if auto-link is enabled and not already linked
            if (autoLinkCustomer && !customer.linkedCompanyId) {
              customer.linkedCompanyId = buyerCompany._id;
              customer.isLinkedCustomer = true;
              customer.enableBidirectionalOrders = true;
              await customer.save();
            }
          }
        }

        // ✅ FALLBACK: Search by any available identifier
        if (!customer) {
          const fallbackSearches = [];

          if (buyerCompany.phoneNumber) {
            fallbackSearches.push(
              Party.findOne({
                phoneNumber: buyerCompany.phoneNumber,
                companyId: targetCompanyId,
              }),
              Party.findOne({
                mobile: buyerCompany.phoneNumber,
                companyId: targetCompanyId,
              })
            );
          }

          if (buyerCompany.email) {
            fallbackSearches.push(
              Party.findOne({
                email: buyerCompany.email,
                companyId: targetCompanyId,
              })
            );
          }

          if (buyerCompany.gstin) {
            fallbackSearches.push(
              Party.findOne({
                gstNumber: buyerCompany.gstin,
                companyId: targetCompanyId,
              })
            );
          }

          // Execute fallback searches
          const fallbackResults = await Promise.allSettled(fallbackSearches);
          for (const result of fallbackResults) {
            if (result.status === "fulfilled" && result.value) {
              customer = result.value;

              break;
            }
          }
        }
      } catch (customerSearchError) {
        console.error("❌ Error searching for customer:", customerSearchError);
        return res.status(500).json({
          success: false,
          message: "Failed to search for customer",
          error: "CUSTOMER_SEARCH_FAILED",
          code: "OPERATION_FAILED",
          details: customerSearchError.message,
        });
      }

      // ✅ ERROR: If no customer found, return error (don't create automatically)
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "❌ No customer found representing the buyer company",
          error: "CUSTOMER_NOT_FOUND",
          code: "CUSTOMER_NOT_FOUND",
          details: {
            searchCriteria: {
              buyerCompanyName: buyerCompany.businessName,
              buyerGST: buyerCompany.gstin,
              buyerPhone: buyerCompany.phoneNumber,
              buyerEmail: buyerCompany.email,
              targetCompanyId: targetCompanyId.toString(),
              supplierCompanyName: targetCompany.businessName,
            },
            explanation:
              "A customer record representing the buyer company must exist in the supplier's company before generating a sales order",
            solutions: [
              {
                action: "Create customer manually",
                description: "Create a customer record for the buyer company",
                steps: [
                  `Go to ${targetCompany.businessName} → Parties → Add Customer`,
                  `Use buyer company details: ${buyerCompany.businessName}`,
                  `Add phone: ${buyerCompany.phoneNumber || "N/A"}`,
                  `Add GST: ${buyerCompany.gstin || "N/A"}`,
                  `Enable bidirectional linking if needed`,
                ],
              },
              {
                action: "Use existing customer",
                description: "Provide an existing customer ID in the request",
                steps: [
                  "Find an existing customer in the supplier's company",
                  "Include targetCustomerId in the request body",
                  "Or provide targetCustomerMobile/targetCustomerName",
                ],
              },
              {
                action: "Check party records",
                description: "Verify customer exists with correct details",
                steps: [
                  `Check if customer exists in company: ${targetCompany.businessName}`,
                  "Verify customer type is set to 'customer'",
                  "Check if customer details match buyer company",
                ],
              },
            ],
          },
        });
      }

      // ✅ ENHANCED: Generate unique sales order number with retry logic
      let orderNumber;
      let generationAttempts = 0;
      const maxAttempts = 10;

      while (generationAttempts < maxAttempts) {
        try {
          const date = new Date();
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");

          const prefix =
            orderType === "quotation"
              ? "QUO"
              : orderType === "sales_order"
              ? "SO"
              : "PI";

          const todayStart = new Date(year, date.getMonth(), date.getDate());
          const todayEnd = new Date(year, date.getMonth(), date.getDate() + 1);

          const lastOrder = await SalesOrder.findOne({
            companyId: targetCompanyId,
            orderDate: {$gte: todayStart, $lt: todayEnd},
            orderNumber: new RegExp(`^${prefix}-${year}${month}${day}`),
          }).sort({orderNumber: -1});

          let sequence = 1;
          if (lastOrder) {
            const lastSequence = parseInt(lastOrder.orderNumber.split("-")[3]);
            if (!isNaN(lastSequence)) {
              sequence = lastSequence + 1;
            }
          }

          if (generationAttempts > 0) {
            sequence += generationAttempts * 1000;
          }

          const baseOrderNumber = `${prefix}-${year}${month}${day}-${String(
            sequence
          ).padStart(4, "0")}`;

          const existingOrder = await SalesOrder.findOne({
            orderNumber: baseOrderNumber,
            companyId: targetCompanyId,
          }).lean();

          if (!existingOrder) {
            orderNumber = baseOrderNumber;
            break;
          }

          generationAttempts++;

          if (generationAttempts >= maxAttempts) {
            const emergencyTimestamp = Date.now();
            orderNumber = `SO-EMRG-${emergencyTimestamp}`;
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (generationError) {
          console.error(
            `❌ Order number generation attempt ${
              generationAttempts + 1
            } failed:`,
            generationError
          );
          generationAttempts++;

          if (generationAttempts >= maxAttempts) {
            const emergencyTimestamp = Date.now();
            orderNumber = `SO-EMRG-${emergencyTimestamp}`;
            break;
          }
        }
      }

      if (!orderNumber) {
        return res.status(500).json({
          success: false,
          message:
            "Failed to generate unique sales order number after multiple attempts",
          error: "ORDER_NUMBER_GENERATION_FAILED",
          code: "OPERATION_FAILED",
        });
      }

      // ✅ ENHANCED: Set validity and delivery dates
      let orderValidUntil = validUntil ? new Date(validUntil) : null;
      if (!orderValidUntil) {
        orderValidUntil = new Date();
        if (orderType === "quotation") {
          orderValidUntil.setDate(orderValidUntil.getDate() + 30);
        } else if (orderType === "sales_order") {
          orderValidUntil.setDate(orderValidUntil.getDate() + 90);
        } else {
          orderValidUntil.setDate(orderValidUntil.getDate() + 60);
        }
      }

      const salesOrderData = {
        // Core Order Information
        orderDate: Date, // Order creation date
        orderType: String, // "quotation", "sales_order", "proforma_invoice"
        validUntil: Date, // Order validity date
        expectedDeliveryDate: Date, // Expected delivery date
        deliveryDate: Date, // Actual delivery date (null initially)

        // Customer Information
        customer: ObjectId, // Reference to customer/party
        customerMobile: String, // Customer mobile number

        // GST and Tax Configuration
        gstEnabled: Boolean, // Whether GST is enabled
        gstType: String, // "gst" or "non-gst"
        taxMode: String, // "with-tax" or "without-tax"
        priceIncludesTax: Boolean, // Whether prices include tax

        // Company Information
        companyId: ObjectId, // Reference to company

        // Bidirectional Tracking
        sourceOrderId: ObjectId, // Source order reference
        sourceOrderNumber: String, // Source order number
        sourceOrderType: String, // Type of source order
        sourceCompanyId: ObjectId, // Source company reference
        targetCompanyId: ObjectId, // Target company reference

        // Auto-generation Flags
        isAutoGenerated: Boolean, // Whether order was auto-generated
        generatedFrom: String, // Source of generation
        generatedBy: ObjectId, // User who generated
        generatedAt: Date, // Generation timestamp

        // Purchase Order Generation Tracking
        autoGeneratedPurchaseOrder: Boolean,
        purchaseOrderRef: ObjectId,
        purchaseOrderNumber: String,
        purchaseOrderGeneratedAt: Date,
        purchaseOrderGeneratedBy: ObjectId,
        hasGeneratedPurchaseOrder: Boolean,
        correspondingPurchaseOrderId: ObjectId,
        correspondingPurchaseOrderNumber: String,
        linkedSupplierId: ObjectId,

        // Items Array
        items: [
          {
            // Item References
            itemRef: ObjectId,
            selectedProduct: String,

            // Item Details
            itemName: String,
            productName: String,
            itemCode: String,
            productCode: String,
            description: String,
            hsnCode: String,
            hsnNumber: String,
            category: String,

            // Quantity and Units
            quantity: Number,
            unit: String,

            // Pricing
            pricePerUnit: Number,
            price: Number,
            rate: Number,

            // Tax Configuration
            taxRate: Number,
            gstRate: Number,
            taxMode: String,
            gstMode: String, // "include" or "exclude"
            priceIncludesTax: Boolean,

            // Stock Information
            availableStock: Number,

            // Discounts
            discountPercent: Number,
            discountAmount: Number,
            discount: Number,
            discountType: String,

            // Tax Amounts
            cgst: Number,
            sgst: Number,
            igst: Number,
            cgstAmount: Number,
            sgstAmount: Number,
            igstAmount: Number,

            // Calculated Amounts
            subtotal: Number, // Quantity × Price
            taxableAmount: Number, // Amount subject to tax
            totalTaxAmount: Number, // Total tax amount
            gstAmount: Number, // GST amount

            // Final Amounts
            amount: Number, // Final item amount
            itemAmount: Number, // Same as amount
            totalAmount: Number, // Same as amount

            // Line Information
            lineNumber: Number,
          },
        ],

        // Totals Object
        totals: {
          subtotal: Number, // Sum of all item subtotals
          totalQuantity: Number, // Total quantity of all items
          totalDiscount: Number, // Total discount amount
          totalDiscountAmount: Number, // Same as totalDiscount
          totalTax: Number, // Total tax amount
          totalCGST: Number, // Total CGST
          totalSGST: Number, // Total SGST
          totalIGST: Number, // Total IGST
          totalTaxableAmount: Number, // Total taxable amount
          finalTotal: Number, // Final total after all calculations
          roundOff: Number, // Round off amount
          withTaxTotal: Number, // Total with tax
          withoutTaxTotal: Number, // Total without tax
        },

        // Payment Information
        payment: {
          method: String, // Payment method
          status: String, // Payment status
          paidAmount: Number, // Amount paid
          advanceAmount: Number, // Advance amount
          pendingAmount: Number, // Pending amount
          paymentDate: Date, // Payment date
          dueDate: Date, // Due date
          creditDays: Number, // Credit days
          reference: String, // Payment reference
          notes: String, // Payment notes
        },

        // Payment History
        paymentHistory: [
          {
            amount: Number,
            method: String,
            reference: String,
            paymentDate: Date,
            notes: String,
            createdAt: Date,
            createdBy: ObjectId,
          },
        ],

        // Order Status and Priority
        status: String, // Order status
        priority: String, // Order priority

        // Conversion Tracking
        convertedToInvoice: Boolean,
        invoiceRef: ObjectId,
        invoiceNumber: String,
        convertedAt: Date,
        convertedBy: ObjectId,

        // Additional Fields
        requiredBy: Date,
        departmentRef: ObjectId,
        approvedBy: ObjectId,
        approvedAt: Date,

        // Notes and Terms
        notes: String,
        termsAndConditions: String,
        customerNotes: String,
        internalNotes: String,

        // Address Information
        shippingAddress: {
          street: String,
          city: String,
          state: String,
          zipCode: String,
          country: String,
        },

        // Rounding Configuration
        roundOff: Number,
        roundOffEnabled: Boolean,

        // Metadata
        createdBy: String, // Creator reference
        lastModifiedBy: String, // Last modifier reference
      };

      // Clean up undefined fields
      Object.keys(salesOrderData).forEach((key) => {
        if (salesOrderData[key] === undefined) {
          delete salesOrderData[key];
        }
      });

      // ✅ Create sales order
      const salesOrder = new SalesOrder(salesOrderData);
      await salesOrder.save();

      // ✅ ENHANCED: Update purchase order with comprehensive bidirectional links
      await PurchaseOrder.findByIdAndUpdate(id, {
        $set: {
          autoGeneratedSalesOrder: true,
          salesOrderRef: salesOrder._id,
          salesOrderNumber: salesOrder.orderNumber,
          salesOrderGeneratedAt: new Date(),
          salesOrderGeneratedBy: validUserId,
          targetCompanyId: targetCompanyId,
          hasGeneratedSalesOrder: true,
          correspondingSalesOrderId: salesOrder._id,
          correspondingSalesOrderNumber: salesOrder.orderNumber,
          bidirectionalLinkingComplete: true,
          linkedCustomerId: customer._id,
          notes: conversionNotes
            ? purchaseOrder.notes
              ? `${purchaseOrder.notes}\n${conversionNotes}`
              : conversionNotes
            : purchaseOrder.notes,
          lastModifiedBy: validUserId,
          updatedAt: new Date(),
        },
      });

      // Populate customer details for response
      await salesOrder.populate(
        "customer",
        "name mobile email address type linkedCompanyId enableBidirectionalOrders"
      );

      // ✅ ENHANCED: Comprehensive response
      res.status(201).json({
        success: true,
        message: "✅ Enhanced bidirectional sales order generated successfully",
        data: {
          salesOrder: {
            _id: salesOrder._id,
            orderNumber: salesOrder.orderNumber,
            orderType: salesOrder.orderType,
            orderDate: salesOrder.orderDate,
            validUntil: salesOrder.validUntil,
            customer: {
              id: customer._id,
              name: customer.name,
              mobile: customer.phoneNumber || customer.mobile,
              email: customer.email,
              represents: "Buyer Company",
              linkedCompanyId: customer.linkedCompanyId?.toString(),
              bidirectionalReady: customer.enableBidirectionalOrders,
            },
            companyId: targetCompanyId,
            isAutoGenerated: true,
            sourceOrderId: purchaseOrder._id,
            sourceOrderNumber: purchaseOrder.orderNumber,
            sourceOrderType: "purchase_order",
            sourceCompanyId: salesOrder.sourceCompanyId,
            totals: salesOrder.totals,
            status: salesOrder.status,
            linking: {
              autoLinkingEnabled: autoLinkCustomer,
              bidirectionalSetupValidated: validateBidirectionalSetup,
              linkedOrderType: "bidirectional",
              linkedOrderDirection: "purchase_to_sales",
            },
          },
          conversion: {
            sourceType: "purchase_order",
            targetType: "sales_order",
            generatedAt: new Date(),
            generatedBy: validUserId,
            autoDetectedCompany: !req.body.targetCompanyId,
            existingCustomerUsed: true,
            customerSearchMethod: "database_lookup",
            supplierCompany: {
              id: targetCompanyId.toString(),
              name: targetCompany.businessName,
              detectionMethod: !req.body.targetCompanyId
                ? "auto-detected"
                : "provided",
            },
            orderNumberGeneration: {
              attempts: generationAttempts + 1,
              finalNumber: salesOrder.orderNumber,
              wasUnique: generationAttempts === 0,
            },
          },
          bidirectionalTracking: {
            purchaseOrder: {
              id: purchaseOrder._id,
              orderNumber: purchaseOrder.orderNumber,
              buyerCompany: purchaseOrder.companyId?.businessName,
              companyId: buyerCompanyId,
              supplier: {
                name: supplierData.name,
                linkedCompanyId: supplierData.linkedCompanyId?.toString(),
                bidirectionalEnabled: supplierData.enableBidirectionalOrders,
              },
            },
            salesOrder: {
              id: salesOrder._id,
              orderNumber: salesOrder.orderNumber,
              supplierCompany: targetCompany.businessName,
              companyId: targetCompanyId.toString(),
              customer: {
                name: customer.name,
                linkedCompanyId: customer.linkedCompanyId?.toString(),
                bidirectionalEnabled: customer.enableBidirectionalOrders,
              },
            },
            validation: {
              buyerCompanyId,
              supplierCompanyId: targetCompanyId.toString(),
              sourceCompanyId: salesOrder.sourceCompanyId.toString(),
              targetCompanyId: salesOrder.companyId.toString(),
              companiesAreDifferent:
                targetCompanyId.toString() !== buyerCompanyId,
              sourcePointsToCorrectBuyer:
                salesOrder.sourceCompanyId.toString() === buyerCompanyId,
              targetPointsToCorrectSupplier:
                salesOrder.companyId.toString() === targetCompanyId.toString(),
              linkingComplete: true,
              enhancedFeaturesEnabled:
                autoLinkCustomer && validateBidirectionalSetup,
            },
            explanation:
              "Enhanced sales order created in SUPPLIER's company, selling to existing BUYER company customer with bidirectional linking",
          },
        },
      });
    } catch (error) {
      console.error("❌ Error in enhanced sales order generation:", error);

      const purchaseOrderId = req.params.id;

      if (error.code === 11000 && error.keyPattern?.orderNumber) {
        return res.status(400).json({
          success: false,
          message: "Sales order number already exists (database constraint)",
          error: "DUPLICATE_ORDER_NUMBER_DB",
          code: "DATABASE_CONSTRAINT",
          suggestion: "This appears to be a race condition. Please try again.",
          details: {
            duplicateKey: error.keyValue,
            purchaseOrderId,
          },
        });
      }

      if (error.name === "ValidationError") {
        const validationErrors = Object.values(error.errors).map(
          (err) => err.message
        );
        return res.status(400).json({
          success: false,
          message: "Sales order validation failed",
          error: "VALIDATION_ERROR",
          code: "VALIDATION_ERROR",
          validationErrors,
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to generate enhanced bidirectional sales order",
        error: error.message,
        code: "OPERATION_FAILED",
        details: {
          purchaseOrderId,
          errorType: error.name || "GenerationError",
          suggestion:
            "Check supplier-company linkage and bidirectional configuration",
        },
      });
    }
  },

  generatePurchaseOrder: async (req, res) => {
    try {
      const {id} = req.params; // Sales Order ID
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
        autoLinkSupplier = true, // ✅ NEW: Auto-link supplier back to sales company
        validateBidirectionalSetup = true, // ✅ NEW: Validate bidirectional readiness
      } = req.body;

      // ✅ ENHANCED: Validate sales order ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sales order ID format",
          error: "INVALID_SALES_ORDER_ID",
          code: "VALIDATION_ERROR",
        });
      }

      // ✅ ENHANCED: Find sales order with comprehensive population
      const salesOrder = await SalesOrder.findById(id)
        .populate(
          "customer",
          "name mobile email companyId gstNumber phoneNumber linkedCompanyId companyName isLinkedCustomer enableBidirectionalOrders autoLinkByGST autoLinkByPhone autoLinkByEmail"
        )
        .populate(
          "companyId",
          "businessName email phoneNumber gstin address city state pincode isActive"
        )
        .populate(
          "targetCompanyId",
          "businessName email phoneNumber gstin isActive"
        );

      if (!salesOrder) {
        return res.status(404).json({
          success: false,
          message: "Sales order not found",
          error: "SALES_ORDER_NOT_FOUND",
          code: "NOT_FOUND",
        });
      }

      // ✅ ENHANCED: Validate sales order status
      if (["cancelled", "deleted"].includes(salesOrder.status)) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot generate purchase order from cancelled or deleted sales order",
          error: "INVALID_SALES_ORDER_STATUS",
          code: "BUSINESS_RULE_VIOLATION",
          data: {
            currentStatus: salesOrder.status,
            orderNumber: salesOrder.orderNumber,
          },
        });
      }

      // ✅ ENHANCED: Check if purchase order already generated
      if (salesOrder.autoGeneratedPurchaseOrder) {
        return res.status(400).json({
          success: false,
          message: "Purchase order already generated from this sales order",
          error: "PURCHASE_ORDER_ALREADY_EXISTS",
          code: "DUPLICATE_OPERATION",
          data: {
            existingPurchaseOrderNumber: salesOrder.purchaseOrderNumber,
            existingPurchaseOrderId: salesOrder.purchaseOrderRef,
            generatedAt: salesOrder.purchaseOrderGeneratedAt,
            generatedBy: salesOrder.purchaseOrderGeneratedBy,
          },
        });
      }

      const sellerCompanyId = salesOrder.companyId._id.toString();
      const customerData = salesOrder.customer;

      // ✅ ENHANCED: Validate bidirectional setup if requested
      if (validateBidirectionalSetup) {
        const validationErrors = [];

        if (!customerData.linkedCompanyId) {
          validationErrors.push("Customer does not have a linked company ID");
        }

        if (!customerData.isLinkedCustomer) {
          validationErrors.push("Customer is not marked as a linked customer");
        }

        if (!customerData.enableBidirectionalOrders) {
          validationErrors.push(
            "Bidirectional orders are not enabled for this customer"
          );
        }

        if (validationErrors.length > 0) {
          return res.status(400).json({
            success: false,
            message:
              "Customer is not properly configured for bidirectional orders",
            error: "BIDIRECTIONAL_SETUP_INCOMPLETE",
            code: "CONFIGURATION_ERROR",
            validationErrors,
            suggestions: [
              "Enable bidirectional orders for the customer",
              "Link the customer to the appropriate company",
              "Update customer configuration in the party management system",
            ],
            data: {
              customerName: customerData.name,
              currentLinkedCompanyId: customerData.linkedCompanyId?.toString(),
              isLinkedCustomer: customerData.isLinkedCustomer,
              enableBidirectionalOrders: customerData.enableBidirectionalOrders,
            },
          });
        }
      }

      // ✅ ENHANCED: Auto-detect CUSTOMER's company with improved logic
      if (!targetCompanyId) {
        try {
          let detectionMethod = null;

          // Method 1: Use linkedCompanyId (most reliable)
          if (customerData.linkedCompanyId) {
            const linkedCompanyId = customerData.linkedCompanyId.toString();

            if (linkedCompanyId !== sellerCompanyId) {
              const customerCompany = await Company.findById(
                customerData.linkedCompanyId
              );
              if (customerCompany && customerCompany.isActive !== false) {
                targetCompanyId = customerCompany._id;
                detectionMethod = "linkedCompanyId";
              }
            }
          }

          // Method 2: GST number matching (if auto-link enabled)
          if (
            !targetCompanyId &&
            customerData.autoLinkByGST &&
            customerData.gstNumber
          ) {
            const customerCompany = await Company.findOne({
              gstin: customerData.gstNumber,
              isActive: {$ne: false},
              _id: {$ne: salesOrder.companyId._id},
            });

            if (customerCompany) {
              targetCompanyId = customerCompany._id;
              detectionMethod = "gst_auto_link";
            }
          }

          // Method 3: Phone number matching (if auto-link enabled)
          if (
            !targetCompanyId &&
            customerData.autoLinkByPhone &&
            customerData.phoneNumber
          ) {
            const phoneVariations = [
              customerData.phoneNumber,
              customerData.mobile,
            ].filter(Boolean);

            for (const phone of phoneVariations) {
              const customerCompany = await Company.findOne({
                phoneNumber: phone,
                isActive: {$ne: false},
                _id: {$ne: salesOrder.companyId._id},
              });

              if (customerCompany) {
                targetCompanyId = customerCompany._id;
                detectionMethod = "phone_auto_link";

                break;
              }
            }
          }

          // Method 4: Email matching (if auto-link enabled)
          if (
            !targetCompanyId &&
            customerData.autoLinkByEmail &&
            customerData.email
          ) {
            const customerCompany = await Company.findOne({
              email: customerData.email,
              isActive: {$ne: false},
              _id: {$ne: salesOrder.companyId._id},
            });

            if (customerCompany) {
              targetCompanyId = customerCompany._id;
              detectionMethod = "email_auto_link";
            }
          }

          // Method 5: Business name matching (fallback)
          if (
            !targetCompanyId &&
            (customerData.name || customerData.companyName)
          ) {
            const customerName = customerData.name || customerData.companyName;
            const customerCompany = await Company.findOne({
              businessName: {
                $regex: new RegExp(`^${customerName.trim()}$`, "i"),
              },
              isActive: {$ne: false},
              _id: {$ne: salesOrder.companyId._id},
            });

            if (customerCompany) {
              targetCompanyId = customerCompany._id;
              detectionMethod = "name_fuzzy_match";
            }
          }
        } catch (autoDetectError) {
          console.error(
            "❌ Error in enhanced auto-detection:",
            autoDetectError
          );
        }
      }

      // ✅ ENHANCED: Better error message if no customer company found
      if (!targetCompanyId) {
        const troubleshootingInfo = {
          customer: {
            name: customerData.name,
            linkedCompanyId: customerData.linkedCompanyId?.toString(),
            gstNumber: customerData.gstNumber,
            phoneNumber: customerData.phoneNumber,
            email: customerData.email,
            autoLinkSettings: {
              autoLinkByGST: customerData.autoLinkByGST,
              autoLinkByPhone: customerData.autoLinkByPhone,
              autoLinkByEmail: customerData.autoLinkByEmail,
            },
          },
          sellerCompany: {
            id: sellerCompanyId,
            name: salesOrder.companyId.businessName,
          },
        };

        return res.status(400).json({
          success: false,
          message:
            "❌ CUSTOMER's company account not found for bidirectional order generation",
          error: "NO_CUSTOMER_COMPANY_FOUND",
          code: "CONFIGURATION_ERROR",
          troubleshooting: troubleshootingInfo,
          explanation:
            "Purchase order MUST be created in a DIFFERENT company (customer's) than the sales order (seller's). No separate customer company account was found.",
          quickSolutions: [
            {
              action: "Create new company",
              description: "Create a new company account for the customer",
              steps: [
                "Go to Companies → Add New Company",
                "Fill customer's business details",
                "Link customer to this company",
              ],
            },
            {
              action: "Link existing company",
              description: "Link customer to an existing different company",
              steps: [
                "Go to Parties → Edit Customer",
                "Set linkedCompanyId field",
                "Enable bidirectional orders",
              ],
            },
            {
              action: "Manual target",
              description: "Provide targetCompanyId manually in the request",
              steps: [
                "Find target company ID",
                "Include targetCompanyId in request body",
              ],
            },
            {
              action: "Auto-link setup",
              description: "Configure auto-linking by GST/phone/email",
              steps: [
                "Update customer's GST/phone/email",
                "Enable auto-link settings",
                "Ensure matching company exists",
              ],
            },
          ],
          detailedAnalysis: {
            searchAttempts: [
              {
                method: "linkedCompanyId",
                attempted: !!customerData.linkedCompanyId,
                result: "excluded_same_company_or_not_found",
              },
              {
                method: "gst_matching",
                attempted:
                  customerData.autoLinkByGST && !!customerData.gstNumber,
                result: "no_match_found",
              },
              {
                method: "phone_matching",
                attempted:
                  customerData.autoLinkByPhone && !!customerData.phoneNumber,
                result: "no_match_found",
              },
              {
                method: "email_matching",
                attempted: customerData.autoLinkByEmail && !!customerData.email,
                result: "no_match_found",
              },
              {
                method: "name_matching",
                attempted: true,
                result: "no_match_found",
              },
            ],
            recommendation:
              "The most reliable solution is to create a dedicated company account for the customer and link it via linkedCompanyId",
          },
        });
      }

      // ✅ ENHANCED: Final validation with detailed error
      if (targetCompanyId.toString() === sellerCompanyId) {
        return res.status(400).json({
          success: false,
          message:
            "🚨 CRITICAL ERROR: Target company is same as seller company",
          error: "SAME_COMPANY_DETECTED",
          code: "BUSINESS_RULE_VIOLATION",
          debug: {
            sellerCompanyId,
            targetCompanyId: targetCompanyId.toString(),
            customerName: customerData.name,
            customerLinkedCompanyId: customerData.linkedCompanyId?.toString(),
            detectedIssue:
              "Circular company reference - customer's company points to seller's company",
          },
          explanation:
            "Purchase order must be created in a DIFFERENT company (customer's) than the sales order (seller's)",
          solution:
            "Update the customer's linkedCompanyId to point to a different company or create a new company for the customer",
        });
      }

      // ✅ ENHANCED: Validate target company exists and is active
      const targetCompany = await Company.findById(targetCompanyId);
      if (!targetCompany) {
        return res.status(400).json({
          success: false,
          message: "Target company not found",
          error: "TARGET_COMPANY_NOT_FOUND",
          code: "VALIDATION_ERROR",
          data: {targetCompanyId: targetCompanyId.toString()},
        });
      }

      if (targetCompany.isActive === false) {
        return res.status(400).json({
          success: false,
          message: "Target company is inactive",
          error: "TARGET_COMPANY_INACTIVE",
          code: "BUSINESS_RULE_VIOLATION",
          data: {
            targetCompanyId: targetCompanyId.toString(),
            companyName: targetCompany.businessName,
          },
        });
      }

      // ✅ ENHANCED: Create/find supplier with auto-linking
      let supplier = null;
      const sellerCompany = salesOrder.companyId;

      // Try to find existing supplier
      if (
        targetSupplierId &&
        mongoose.Types.ObjectId.isValid(targetSupplierId)
      ) {
        supplier = await Party.findOne({
          _id: targetSupplierId,
          companyId: targetCompanyId,
        });
      } else if (targetSupplierMobile) {
        supplier = await Party.findOne({
          $or: [
            {phoneNumber: targetSupplierMobile},
            {mobile: targetSupplierMobile},
          ],
          companyId: targetCompanyId,
          $or: [
            {partyType: "supplier"},
            {isSupplier: true},
            {type: "supplier"},
          ],
        });
      } else if (targetSupplierName) {
        supplier = await Party.findOne({
          name: {$regex: new RegExp(`^${targetSupplierName.trim()}$`, "i")},
          companyId: targetCompanyId,
          $or: [
            {partyType: "supplier"},
            {isSupplier: true},
            {type: "supplier"},
          ],
        });
      }

      // ✅ ENHANCED: Auto-create supplier with linking
      if (!supplier) {
        try {
          // Look for existing supplier with seller company details
          const existingSupplier = await Party.findOne({
            $or: [
              {phoneNumber: sellerCompany.phoneNumber},
              {email: sellerCompany.email},
              {gstNumber: sellerCompany.gstin},
              {
                name: {
                  $regex: new RegExp(`^${sellerCompany.businessName}$`, "i"),
                },
              },
            ],
            companyId: targetCompanyId,
            $or: [
              {partyType: "supplier"},
              {isSupplier: true},
              {type: "supplier"},
            ],
          });

          if (existingSupplier) {
            supplier = existingSupplier;

            // ✅ ENHANCED: Update linking if not present
            if (autoLinkSupplier && !existingSupplier.linkedCompanyId) {
              existingSupplier.linkedCompanyId = sellerCompany._id;
              existingSupplier.isLinkedSupplier = true;
              existingSupplier.enableBidirectionalOrders = true;
              await existingSupplier.save();
            }
          } else {
            // ✅ ENHANCED: Create new supplier with advanced features
            const supplierData = {
              name: sellerCompany.businessName,
              phoneNumber: sellerCompany.phoneNumber || "",
              mobile: sellerCompany.phoneNumber || "",
              email: sellerCompany.email || "",
              companyId: targetCompanyId,
              partyType: "supplier",
              type: "supplier",
              isSupplier: true,
              isCustomer: false,
              gstNumber: sellerCompany.gstin || "",
              gstType: sellerCompany.gstin ? "regular" : "unregistered",
              isActive: true,

              // ✅ ENHANCED: Bidirectional linking fields
              linkedCompanyId: autoLinkSupplier ? sellerCompany._id : null,
              isLinkedSupplier: autoLinkSupplier,
              enableBidirectionalOrders: autoLinkSupplier,
              autoLinkByGST: true,
              autoLinkByPhone: true,
              autoLinkByEmail: true,

              // Address information
              homeAddressLine: sellerCompany.address || "",
              address: sellerCompany.address || "",
              city: sellerCompany.city || "",
              state: sellerCompany.state || "",
              pincode: sellerCompany.pincode || "",

              // Financial settings
              creditLimit: 0,
              currentBalance: 0,
              openingBalance: 0,
              paymentTerms: "credit",

              // Metadata
              source: "auto_generated_from_sales_order",
              importedFrom: "manual",
              importedAt: new Date(),
              isVerified: true,
            };

            if (convertedBy && mongoose.Types.ObjectId.isValid(convertedBy)) {
              supplierData.createdBy = convertedBy;
              supplierData.userId = convertedBy;
            }

            supplier = new Party(supplierData);
            await supplier.save();
          }
        } catch (supplierCreationError) {
          console.error(
            "❌ Enhanced supplier creation failed:",
            supplierCreationError
          );
          return res.status(400).json({
            success: false,
            message: "Could not create supplier record for seller company",
            error: "SUPPLIER_CREATION_FAILED",
            code: "OPERATION_FAILED",
            details: supplierCreationError.message,
          });
        }
      }

      if (!supplier) {
        return res.status(500).json({
          success: false,
          message:
            "Could not create or find supplier record for seller company",
          error: "SUPPLIER_RESOLUTION_FAILED",
          code: "OPERATION_FAILED",
        });
      }

      // ✅ ENHANCED: Generate unique purchase order number with retry logic
      let orderNumber;
      let generationAttempts = 0;
      const maxAttempts = 10;

      while (generationAttempts < maxAttempts) {
        try {
          const date = new Date();
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");

          const prefix = "PO";

          const todayStart = new Date(year, date.getMonth(), date.getDate());
          const todayEnd = new Date(year, date.getMonth(), date.getDate() + 1);

          const lastOrder = await PurchaseOrder.findOne({
            companyId: targetCompanyId,
            orderDate: {$gte: todayStart, $lt: todayEnd},
            orderNumber: new RegExp(`^${prefix}-${year}${month}${day}`),
          }).sort({orderNumber: -1});

          let sequence = 1;
          if (lastOrder) {
            const lastSequence = parseInt(lastOrder.orderNumber.split("-")[3]);
            if (!isNaN(lastSequence)) {
              sequence = lastSequence + 1;
            }
          }

          if (generationAttempts > 0) {
            sequence += generationAttempts * 1000;
          }

          const baseOrderNumber = `${prefix}-${year}${month}${day}-${String(
            sequence
          ).padStart(4, "0")}`;

          const existingOrder = await PurchaseOrder.findOne({
            orderNumber: baseOrderNumber,
            companyId: targetCompanyId,
          }).lean();

          if (!existingOrder) {
            orderNumber = baseOrderNumber;
            break;
          }

          generationAttempts++;

          if (generationAttempts >= maxAttempts) {
            const emergencyTimestamp = Date.now();
            orderNumber = `PO-EMRG-${emergencyTimestamp}`;
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (generationError) {
          console.error(
            `❌ Order number generation attempt ${
              generationAttempts + 1
            } failed:`,
            generationError
          );
          generationAttempts++;

          if (generationAttempts >= maxAttempts) {
            const emergencyTimestamp = Date.now();
            orderNumber = `PO-EMRG-${emergencyTimestamp}`;
            break;
          }
        }
      }

      if (!orderNumber) {
        return res.status(500).json({
          success: false,
          message:
            "Failed to generate unique purchase order number after multiple attempts",
          error: "ORDER_NUMBER_GENERATION_FAILED",
          code: "OPERATION_FAILED",
        });
      }

      // ✅ ENHANCED: Set validity and delivery dates
      let validUserId = null;
      if (convertedBy && mongoose.Types.ObjectId.isValid(convertedBy)) {
        validUserId = convertedBy;
      }

      let orderValidUntil = validUntil ? new Date(validUntil) : null;
      if (!orderValidUntil) {
        orderValidUntil = new Date();
        if (orderType === "purchase_quotation") {
          orderValidUntil.setDate(orderValidUntil.getDate() + 30);
        } else if (orderType === "purchase_order") {
          orderValidUntil.setDate(orderValidUntil.getDate() + 90);
        } else {
          orderValidUntil.setDate(orderValidUntil.getDate() + 60);
        }
      }

      // ✅ ENHANCED: Create purchase order with comprehensive data
      const purchaseOrderData = {
        orderNumber,
        orderDate: new Date(),
        orderType,
        supplier: supplier._id,
        supplierMobile: supplier.phoneNumber || supplier.mobile,
        companyId: targetCompanyId,

        // ✅ ENHANCED: Bidirectional tracking fields
        isAutoGenerated: true,
        sourceOrderId: salesOrder._id,
        sourceOrderNumber: salesOrder.orderNumber,
        sourceOrderType:
          salesOrder.orderType === "quotation"
            ? "quotation"
            : salesOrder.orderType === "sales_order"
            ? "sales-order"
            : salesOrder.orderType === "proforma_invoice"
            ? "proforma-invoice"
            : "sales-order", // fallback for any other type

        sourceCompanyId: salesOrder.companyId._id,
        generatedFrom: "sales_order",
        generatedAt: new Date(),
        generatedBy: validUserId || "system",

        // ✅ ENHANCED: Linking metadata
        linkedOrderType: "bidirectional",
        linkedOrderDirection: "sales_to_purchase",
        autoLinkingEnabled: autoLinkSupplier,
        bidirectionalSetupValidated: validateBidirectionalSetup,

        // Copy items and totals from sales order
        items: salesOrder.items.map((item) => ({
          ...item.toObject(),
          _id: undefined, // Remove _id to create new ones
        })),
        totals: salesOrder.totals || {
          subtotal: 0,
          totalQuantity: 0,
          totalDiscount: 0,
          totalTax: 0,
          finalTotal: 0,
        },

        validUntil: orderValidUntil,
        expectedDeliveryDate: deliveryDate ? new Date(deliveryDate) : null,

        // Tax settings
        gstEnabled: salesOrder.gstEnabled ?? true,
        gstType: salesOrder.gstType || "gst",
        taxMode: salesOrder.taxMode || "without-tax",
        priceIncludesTax: salesOrder.priceIncludesTax ?? false,

        // Payment settings
        payment: {
          method: "credit",
          creditDays: 30,
          paidAmount: 0,
          pendingAmount: salesOrder.totals?.finalTotal || 0,
          status: "pending",
          paymentDate: new Date(),
          dueDate: null,
          reference: "",
          notes: "",
        },

        status: "draft",
        notes: conversionNotes
          ? `Generated from SO: ${salesOrder.orderNumber}. ${conversionNotes}`
          : `Auto-generated from Sales Order: ${salesOrder.orderNumber}`,
        termsAndConditions: salesOrder.termsAndConditions || "",
        priority: salesOrder.priority || "normal",
        roundOff: salesOrder.roundOff || 0,
        roundOffEnabled: salesOrder.roundOffEnabled || false,

        createdBy: validUserId || "system",
        lastModifiedBy: validUserId || "system",
      };

      // Clean up undefined fields
      Object.keys(purchaseOrderData).forEach((key) => {
        if (purchaseOrderData[key] === undefined) {
          delete purchaseOrderData[key];
        }
      });

      // ✅ Create purchase order
      const purchaseOrder = new PurchaseOrder(purchaseOrderData);
      await purchaseOrder.save();

      // ✅ ENHANCED: Update sales order with comprehensive bidirectional links
      await SalesOrder.findByIdAndUpdate(id, {
        $set: {
          autoGeneratedPurchaseOrder: true,
          purchaseOrderRef: purchaseOrder._id,
          purchaseOrderNumber: purchaseOrder.orderNumber,
          purchaseOrderGeneratedAt: new Date(),
          purchaseOrderGeneratedBy: validUserId || "system",
          targetCompanyId: targetCompanyId,
          hasGeneratedPurchaseOrder: true,
          correspondingPurchaseOrderId: purchaseOrder._id,
          correspondingPurchaseOrderNumber: purchaseOrder.orderNumber,
          bidirectionalLinkingComplete: true,
          linkedSupplierId: supplier._id,
          notes: conversionNotes
            ? salesOrder.notes
              ? `${salesOrder.notes}\n${conversionNotes}`
              : conversionNotes
            : salesOrder.notes,
          lastModifiedBy: validUserId || "system",
          updatedAt: new Date(),
        },
      });

      // Populate supplier details for response
      await purchaseOrder.populate(
        "supplier",
        "name mobile email address type linkedCompanyId enableBidirectionalOrders"
      );

      // ✅ ENHANCED: Comprehensive response
      res.status(201).json({
        success: true,
        message:
          "✅ Enhanced bidirectional purchase order generated successfully",
        data: {
          purchaseOrder: {
            _id: purchaseOrder._id,
            orderNumber: purchaseOrder.orderNumber,
            orderType: purchaseOrder.orderType,
            orderDate: purchaseOrder.orderDate,
            validUntil: purchaseOrder.validUntil,
            supplier: {
              id: supplier._id,
              name: supplier.name,
              mobile: supplier.phoneNumber || supplier.mobile,
              email: supplier.email,
              represents: "Seller Company",
              linkedCompanyId: supplier.linkedCompanyId?.toString(),
              bidirectionalReady: supplier.enableBidirectionalOrders,
            },
            companyId: targetCompanyId,
            isAutoGenerated: true,
            sourceOrderId: salesOrder._id,
            sourceOrderNumber: salesOrder.orderNumber,
            sourceOrderType: "sales_order",
            sourceCompanyId: purchaseOrder.sourceCompanyId,
            totals: purchaseOrder.totals,
            status: purchaseOrder.status,
            linking: {
              autoLinkingEnabled: autoLinkSupplier,
              bidirectionalSetupValidated: validateBidirectionalSetup,
              linkedOrderType: "bidirectional",
              linkedOrderDirection: "sales_to_purchase",
            },
          },
          conversion: {
            sourceType: "sales_order",
            targetType: "purchase_order",
            generatedAt: new Date(),
            generatedBy: validUserId || "system",
            autoDetectedCompany: !req.body.targetCompanyId,
            autoCreatedSupplier:
              !targetSupplierId && !targetSupplierMobile && !targetSupplierName,
            enhancedLinking: autoLinkSupplier,
            validationPerformed: validateBidirectionalSetup,
            customerCompany: {
              id: targetCompanyId.toString(),
              name: targetCompany.businessName,
              detectionMethod: !req.body.targetCompanyId
                ? "auto-detected"
                : "provided",
            },
            orderNumberGeneration: {
              attempts: generationAttempts + 1,
              finalNumber: purchaseOrder.orderNumber,
              wasUnique: generationAttempts === 0,
            },
          },
          bidirectionalTracking: {
            salesOrder: {
              id: salesOrder._id,
              orderNumber: salesOrder.orderNumber,
              sellerCompany: salesOrder.companyId?.businessName,
              companyId: sellerCompanyId,
              customer: {
                name: customerData.name,
                linkedCompanyId: customerData.linkedCompanyId?.toString(),
                bidirectionalEnabled: customerData.enableBidirectionalOrders,
              },
            },
            purchaseOrder: {
              id: purchaseOrder._id,
              orderNumber: purchaseOrder.orderNumber,
              customerCompany: targetCompany.businessName,
              companyId: targetCompanyId.toString(),
              supplier: {
                name: supplier.name,
                linkedCompanyId: supplier.linkedCompanyId?.toString(),
                bidirectionalEnabled: supplier.enableBidirectionalOrders,
              },
            },
            validation: {
              sellerCompanyId,
              customerCompanyId: targetCompanyId.toString(),
              sourceCompanyId: purchaseOrder.sourceCompanyId.toString(),
              targetCompanyId: purchaseOrder.companyId.toString(),
              companiesAreDifferent:
                targetCompanyId.toString() !== sellerCompanyId,
              sourcePointsToCorrectSeller:
                purchaseOrder.sourceCompanyId.toString() === sellerCompanyId,
              targetPointsToCorrectCustomer:
                purchaseOrder.companyId.toString() ===
                targetCompanyId.toString(),
              linkingComplete: true,
              enhancedFeaturesEnabled:
                autoLinkSupplier && validateBidirectionalSetup,
            },
            explanation:
              "Enhanced purchase order created in CUSTOMER's company, buying from SELLER company with bidirectional linking",
          },
        },
      });
    } catch (error) {
      console.error("❌ Error in enhanced purchase order generation:", error);

      const salesOrderId = req.params.id;

      if (error.code === 11000 && error.keyPattern?.orderNumber) {
        return res.status(400).json({
          success: false,
          message: "Purchase order number already exists (database constraint)",
          error: "DUPLICATE_ORDER_NUMBER_DB",
          code: "DATABASE_CONSTRAINT",
          suggestion: "This appears to be a race condition. Please try again.",
          details: {
            duplicateKey: error.keyValue,
            salesOrderId,
          },
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
        message: "Failed to generate enhanced bidirectional purchase order",
        error: error.message,
        code: "OPERATION_FAILED",
        details: {
          salesOrderId,
          errorType: error.name || "GenerationError",
          suggestion:
            "Check customer-company linkage and bidirectional configuration",
        },
      });
    }
  },

  getSalesOrdersWithGeneratedPO: async (req, res) => {
    try {
      const {companyId, page = 1, limit = 10} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const salesOrdersWithPurchaseOrders = await SalesOrder.find({
        companyId,
        autoGeneratedPurchaseOrder: true,
        purchaseOrderRef: {$exists: true},
      })
        .populate("customer", "name mobile phoneNumber email")
        .sort({purchaseOrderGeneratedAt: -1})
        .skip(skip)
        .limit(parseInt(limit));

      const total = await SalesOrder.countDocuments({
        companyId,
        autoGeneratedPurchaseOrder: true,
        purchaseOrderRef: {$exists: true},
      });

      res.status(200).json({
        success: true,
        data: {
          orders: salesOrdersWithPurchaseOrders,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
            hasPrev: parseInt(page) > 1,
          },
        },
        message: "Sales orders with purchase orders retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting sales orders with purchase orders:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sales orders with purchase orders",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Get purchase order generation status
  getPurchaseOrderGenerationStatus: async (req, res) => {
    try {
      const {companyId, salesOrderId} = req.query;

      if (!companyId || !salesOrderId) {
        return res.status(400).json({
          success: false,
          message: "Company ID and Sales Order ID are required",
        });
      }

      const salesOrder = await SalesOrder.findOne({
        _id: salesOrderId,
        companyId,
      }).populate("customer", "name mobile phoneNumber email");

      if (!salesOrder) {
        return res.status(404).json({
          success: false,
          message: "Sales order not found",
        });
      }

      let purchaseOrder = null;
      if (
        salesOrder.autoGeneratedPurchaseOrder &&
        salesOrder.purchaseOrderRef
      ) {
        purchaseOrder = await PurchaseOrder.findById(
          salesOrder.purchaseOrderRef
        )
          .populate("supplier", "name mobile email")
          .select(
            "orderNumber orderDate supplier totals payment status companyId"
          );
      }

      const generationStatus = {
        salesOrder: {
          id: salesOrder._id,
          orderNumber: salesOrder.orderNumber,
          orderDate: salesOrder.orderDate,
          customer: salesOrder.customer,
          totalAmount: salesOrder.totals.finalTotal,
          status: salesOrder.status,
        },
        purchaseOrderGeneration: {
          hasGenerated: salesOrder.autoGeneratedPurchaseOrder,
          generatedAt: salesOrder.purchaseOrderGeneratedAt,
          generatedBy: salesOrder.purchaseOrderGeneratedBy,
          targetCompanyId: salesOrder.targetCompanyId,
          canGenerate:
            !salesOrder.autoGeneratedPurchaseOrder &&
            !["cancelled"].includes(salesOrder.status),
        },
        purchaseOrder: purchaseOrder
          ? {
              id: purchaseOrder._id,
              orderNumber: purchaseOrder.orderNumber,
              orderDate: purchaseOrder.orderDate,
              supplier: purchaseOrder.supplier,
              totalAmount: purchaseOrder.totals.finalTotal,
              paymentStatus: purchaseOrder.payment.status,
              status: purchaseOrder.status,
              companyId: purchaseOrder.companyId,
            }
          : null,
      };

      res.status(200).json({
        success: true,
        data: generationStatus,
        message: "Purchase order generation status retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting purchase order generation status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get purchase order generation status",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Bulk generate purchase orders from multiple sales orders
  bulkGeneratePurchaseOrders: async (req, res) => {
    try {
      const {
        salesOrderIds,
        targetCompanyId,
        targetSupplierId,
        targetSupplierName,
        targetSupplierMobile,
        generatedBy,
      } = req.body;

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

      if (!targetCompanyId) {
        return res.status(400).json({
          success: false,
          message: "Target company ID is required",
        });
      }

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

          if (salesOrder.autoGeneratedPurchaseOrder) {
            results.skipped.push({
              salesOrderId,
              orderNumber: salesOrder.orderNumber,
              reason: "Purchase order already generated",
              existingPurchaseOrderNumber: salesOrder.purchaseOrderNumber,
            });
            continue;
          }

          // Use the single generation endpoint logic
          const mockReq = {
            params: {id: salesOrderId},
            body: {
              targetCompanyId,
              targetSupplierId,
              targetSupplierName,
              targetSupplierMobile,
              convertedBy: generatedBy,
            },
            user: {id: generatedBy},
          };

          let mockRes = {
            statusCode: null,
            jsonData: null,
            status: function (code) {
              this.statusCode = code;
              return this;
            },
            json: function (data) {
              this.jsonData = data;
              return this;
            },
          };

          // Call the generation function
          await this.generatePurchaseOrder(mockReq, mockRes);

          if (mockRes.statusCode === 201 && mockRes.jsonData.success) {
            results.successful.push({
              salesOrderId,
              orderNumber: salesOrder.orderNumber,
              purchaseOrderId: mockRes.jsonData.data.purchaseOrder._id,
              purchaseOrderNumber:
                mockRes.jsonData.data.purchaseOrder.orderNumber,
              finalTotal: mockRes.jsonData.data.purchaseOrder.totals.finalTotal,
            });
          } else {
            results.failed.push({
              salesOrderId,
              error: mockRes.jsonData?.message || "Unknown error",
            });
          }
        } catch (generationError) {
          results.failed.push({
            salesOrderId,
            error: generationError.message,
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
        message: `Bulk generation completed: ${summary.successful} successful, ${summary.failed} failed, ${summary.skipped} skipped`,
        data: {
          summary,
          results,
        },
      });
    } catch (error) {
      console.error("❌ Error in bulk purchase order generation:", error);
      res.status(500).json({
        success: false,
        message: "Failed to perform bulk purchase order generation",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Get sales order source tracking
  getSalesOrderSourceTracking: async (req, res) => {
    try {
      const {salesOrderId} = req.params;

      if (!mongoose.Types.ObjectId.isValid(salesOrderId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sales order ID",
        });
      }

      const salesOrder = await SalesOrder.findById(salesOrderId).populate(
        "customer",
        "name mobile phoneNumber email"
      );

      if (!salesOrder) {
        return res.status(404).json({
          success: false,
          message: "Sales order not found",
        });
      }

      let sourceInfo = {
        salesOrder: {
          id: salesOrder._id,
          orderNumber: salesOrder.orderNumber,
          orderDate: salesOrder.orderDate,
          customer: salesOrder.customer,
          totalAmount: salesOrder.totals.finalTotal,
          status: salesOrder.status,
        },
        downstream: {
          hasGeneratedPurchaseOrder: salesOrder.autoGeneratedPurchaseOrder,
          hasConvertedToInvoice: salesOrder.convertedToInvoice,
        },
      };

      // Get generated purchase order info
      if (
        salesOrder.autoGeneratedPurchaseOrder &&
        salesOrder.purchaseOrderRef
      ) {
        const purchaseOrder = await PurchaseOrder.findById(
          salesOrder.purchaseOrderRef
        ).populate("supplier", "name mobile email");

        if (purchaseOrder) {
          sourceInfo.downstream.purchaseOrder = {
            id: purchaseOrder._id,
            orderNumber: purchaseOrder.orderNumber,
            orderDate: purchaseOrder.orderDate,
            supplier: purchaseOrder.supplier,
            companyId: purchaseOrder.companyId,
            totalAmount: purchaseOrder.totals.finalTotal,
            status: purchaseOrder.status,
            generatedAt: salesOrder.purchaseOrderGeneratedAt,
            generatedBy: salesOrder.purchaseOrderGeneratedBy,
          };

          // Check if purchase order was converted to invoice
          if (purchaseOrder.convertedToPurchaseInvoice) {
            const Purchase = require("../models/Purchase");
            const invoice = await Purchase.findById(
              purchaseOrder.purchaseInvoiceRef
            ).select("invoiceNumber invoiceDate totals payment status");

            if (invoice) {
              sourceInfo.downstream.purchaseInvoice = {
                id: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                invoiceDate: invoice.invoiceDate,
                totalAmount: invoice.totals.finalTotal,
                paymentStatus: invoice.payment.status,
                status: invoice.status,
                convertedAt: purchaseOrder.convertedAt,
              };
            }
          }
        }
      }

      // Get sales invoice info
      if (salesOrder.convertedToInvoice && salesOrder.invoiceRef) {
        const Sale = require("../models/Sale");
        const salesInvoice = await Sale.findById(salesOrder.invoiceRef).select(
          "invoiceNumber invoiceDate totals payment status"
        );

        if (salesInvoice) {
          sourceInfo.downstream.salesInvoice = {
            id: salesInvoice._id,
            invoiceNumber: salesInvoice.invoiceNumber,
            invoiceDate: salesInvoice.invoiceDate,
            totalAmount: salesInvoice.totals.finalTotal,
            paymentStatus: salesInvoice.payment.status,
            status: salesInvoice.status,
            convertedAt: salesOrder.convertedAt,
          };
        }
      }

      const trackingChain = [];
      trackingChain.push({
        step: 1,
        type: "sales_order",
        document: sourceInfo.salesOrder,
        description: `Sales Order: ${salesOrder.orderNumber}`,
      });

      if (sourceInfo.downstream.purchaseOrder) {
        trackingChain.push({
          step: 2,
          type: "purchase_order",
          document: sourceInfo.downstream.purchaseOrder,
          description: `Generated Purchase Order: ${sourceInfo.downstream.purchaseOrder.orderNumber}`,
        });

        if (sourceInfo.downstream.purchaseInvoice) {
          trackingChain.push({
            step: 3,
            type: "purchase_invoice",
            document: sourceInfo.downstream.purchaseInvoice,
            description: `Converted to Purchase Invoice: ${sourceInfo.downstream.purchaseInvoice.invoiceNumber}`,
          });
        }
      }

      if (sourceInfo.downstream.salesInvoice) {
        trackingChain.push({
          step: trackingChain.length + 1,
          type: "sales_invoice",
          document: sourceInfo.downstream.salesInvoice,
          description: `Converted to Sales Invoice: ${sourceInfo.downstream.salesInvoice.invoiceNumber}`,
        });
      }

      sourceInfo.trackingChain = trackingChain;

      res.status(200).json({
        success: true,
        data: sourceInfo,
        message: "Sales order source tracking retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting sales order source tracking:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sales order source tracking",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Get purchase orders that have generated sales orders
  getPurchaseOrdersWithSalesOrders: async (req, res) => {
    try {
      const {companyId, page = 1, limit = 10} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const purchaseOrdersWithSalesOrders = await PurchaseOrder.find({
        companyId,
        autoGeneratedSalesOrder: true,
        salesOrderRef: {$exists: true},
      })
        .populate("supplier", "name mobile phoneNumber email")
        .sort({salesOrderGeneratedAt: -1})
        .skip(skip)
        .limit(parseInt(limit));

      const total = await PurchaseOrder.countDocuments({
        companyId,
        autoGeneratedSalesOrder: true,
        salesOrderRef: {$exists: true},
      });

      res.status(200).json({
        success: true,
        data: {
          orders: purchaseOrdersWithSalesOrders,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
            hasPrev: parseInt(page) > 1,
          },
        },
        message: "Purchase orders with sales orders retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting purchase orders with sales orders:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get purchase orders with sales orders",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Get bidirectional purchase analytics
  getBidirectionalPurchaseAnalytics: async (req, res) => {
    try {
      const {companyId} = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      const [
        totalPurchaseOrders,
        purchaseOrdersWithSalesOrders,
        convertedToPurchaseInvoices,
        autoGeneratedSalesOrders,
      ] = await Promise.all([
        // Total purchase orders
        PurchaseOrder.countDocuments({companyId}),

        // Purchase orders that generated sales orders
        PurchaseOrder.countDocuments({
          companyId,
          autoGeneratedSalesOrder: true,
        }),

        // Purchase orders converted to purchase invoices
        PurchaseOrder.countDocuments({
          companyId,
          convertedToPurchaseInvoice: true,
        }),

        // Count of auto-generated sales orders from this company's purchase orders
        PurchaseOrder.countDocuments({
          companyId,
          autoGeneratedSalesOrder: true,
          salesOrderRef: {$exists: true},
        }),
      ]);

      const analytics = {
        purchaseOrders: {
          total: totalPurchaseOrders,
          withGeneratedSalesOrders: purchaseOrdersWithSalesOrders,
          convertedToPurchaseInvoices: convertedToPurchaseInvoices,
          directPurchaseOrders:
            totalPurchaseOrders - purchaseOrdersWithSalesOrders,
          salesOrderGenerationRate:
            totalPurchaseOrders > 0
              ? (
                  (purchaseOrdersWithSalesOrders / totalPurchaseOrders) *
                  100
                ).toFixed(2)
              : 0,
        },
        crossCompanyIntegration: {
          totalSalesOrdersGenerated: autoGeneratedSalesOrders,
          integrationCoverage:
            totalPurchaseOrders > 0
              ? (
                  (autoGeneratedSalesOrders / totalPurchaseOrders) *
                  100
                ).toFixed(2)
              : 0,
          description:
            "Percentage of purchase orders that generated sales orders for other companies",
        },
        conversionMetrics: {
          purchaseInvoiceConversionRate:
            totalPurchaseOrders > 0
              ? (
                  (convertedToPurchaseInvoices / totalPurchaseOrders) *
                  100
                ).toFixed(2)
              : 0,
          totalConversions:
            convertedToPurchaseInvoices + purchaseOrdersWithSalesOrders,
          overallUtilizationRate:
            totalPurchaseOrders > 0
              ? (
                  ((convertedToPurchaseInvoices +
                    purchaseOrdersWithSalesOrders) /
                    totalPurchaseOrders) *
                  100
                ).toFixed(2)
              : 0,
        },
      };

      res.status(200).json({
        success: true,
        data: analytics,
        message: "Bidirectional purchase analytics retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting bidirectional purchase analytics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get bidirectional purchase analytics",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Get sales order generation status
  getSalesOrderGenerationStatus: async (req, res) => {
    try {
      const {companyId, purchaseOrderId} = req.query;

      if (!companyId || !purchaseOrderId) {
        return res.status(400).json({
          success: false,
          message: "Company ID and Purchase Order ID are required",
        });
      }

      const purchaseOrder = await PurchaseOrder.findOne({
        _id: purchaseOrderId,
        companyId,
      }).populate("supplier", "name mobile phoneNumber email");

      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      let salesOrder = null;
      if (
        purchaseOrder.autoGeneratedSalesOrder &&
        purchaseOrder.salesOrderRef
      ) {
        const SalesOrder = require("../models/SalesOrder");
        salesOrder = await SalesOrder.findById(purchaseOrder.salesOrderRef)
          .populate("customer", "name mobile email")
          .select(
            "orderNumber orderDate customer totals payment status companyId"
          );
      }

      const generationStatus = {
        purchaseOrder: {
          id: purchaseOrder._id,
          orderNumber: purchaseOrder.orderNumber,
          orderDate: purchaseOrder.orderDate,
          supplier: purchaseOrder.supplier,
          totalAmount: purchaseOrder.totals.finalTotal,
          status: purchaseOrder.status,
        },
        salesOrderGeneration: {
          hasGenerated: purchaseOrder.autoGeneratedSalesOrder,
          generatedAt: purchaseOrder.salesOrderGeneratedAt,
          generatedBy: purchaseOrder.salesOrderGeneratedBy,
          targetCompanyId: purchaseOrder.targetCompanyId,
          canGenerate:
            !purchaseOrder.autoGeneratedSalesOrder &&
            !["cancelled"].includes(purchaseOrder.status),
        },
        salesOrder: salesOrder
          ? {
              id: salesOrder._id,
              orderNumber: salesOrder.orderNumber,
              orderDate: salesOrder.orderDate,
              customer: salesOrder.customer,
              totalAmount: salesOrder.totals.finalTotal,
              paymentStatus: salesOrder.payment.status,
              status: salesOrder.status,
              companyId: salesOrder.companyId,
            }
          : null,
      };

      res.status(200).json({
        success: true,
        data: generationStatus,
        message: "Sales order generation status retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting sales order generation status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sales order generation status",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Bulk generate sales orders from multiple purchase orders
  bulkGenerateSalesOrders: async (req, res) => {
    try {
      const {
        purchaseOrderIds,
        targetCompanyId,
        targetCustomerId,
        targetCustomerName,
        targetCustomerMobile,
        generatedBy,
      } = req.body;

      if (
        !purchaseOrderIds ||
        !Array.isArray(purchaseOrderIds) ||
        purchaseOrderIds.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Purchase order IDs array is required",
        });
      }

      if (!targetCompanyId) {
        return res.status(400).json({
          success: false,
          message: "Target company ID is required",
        });
      }

      const results = {
        successful: [],
        failed: [],
        skipped: [],
      };

      for (const purchaseOrderId of purchaseOrderIds) {
        try {
          if (!mongoose.Types.ObjectId.isValid(purchaseOrderId)) {
            results.failed.push({
              purchaseOrderId,
              error: "Invalid purchase order ID",
            });
            continue;
          }

          const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId);

          if (!purchaseOrder) {
            results.failed.push({
              purchaseOrderId,
              error: "Purchase order not found",
            });
            continue;
          }

          if (purchaseOrder.autoGeneratedSalesOrder) {
            results.skipped.push({
              purchaseOrderId,
              orderNumber: purchaseOrder.orderNumber,
              reason: "Sales order already generated",
              existingSalesOrderNumber: purchaseOrder.salesOrderNumber,
            });
            continue;
          }

          // Use the single generation endpoint logic
          const mockReq = {
            params: {id: purchaseOrderId},
            body: {
              targetCompanyId,
              targetCustomerId,
              targetCustomerName,
              targetCustomerMobile,
              convertedBy: generatedBy,
            },
            user: {id: generatedBy},
          };

          let mockRes = {
            statusCode: null,
            jsonData: null,
            status: function (code) {
              this.statusCode = code;
              return this;
            },
            json: function (data) {
              this.jsonData = data;
              return this;
            },
          };

          // Call the generation function
          await this.generateSalesOrder(mockReq, mockRes);

          if (mockRes.statusCode === 201 && mockRes.jsonData.success) {
            results.successful.push({
              purchaseOrderId,
              orderNumber: purchaseOrder.orderNumber,
              salesOrderId: mockRes.jsonData.data.salesOrder._id,
              salesOrderNumber: mockRes.jsonData.data.salesOrder.orderNumber,
              finalTotal: mockRes.jsonData.data.salesOrder.totals.finalTotal,
            });
          } else {
            results.failed.push({
              purchaseOrderId,
              error: mockRes.jsonData?.message || "Unknown error",
            });
          }
        } catch (generationError) {
          results.failed.push({
            purchaseOrderId,
            error: generationError.message,
          });
        }
      }

      const summary = {
        total: purchaseOrderIds.length,
        successful: results.successful.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
      };
      res.status(200).json({
        success: true,
        message: `Bulk generation completed: ${summary.successful} successful, ${summary.failed} failed, ${summary.skipped} skipped`,
        data: {
          summary,
          results,
        },
      });
    } catch (error) {
      console.error("❌ Error in bulk sales order generation:", error);
      res.status(500).json({
        success: false,
        message: "Failed to perform bulk sales order generation",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Get purchase order source tracking
  getPurchaseOrderSourceTracking: async (req, res) => {
    try {
      const {purchaseOrderId} = req.params;

      if (!mongoose.Types.ObjectId.isValid(purchaseOrderId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase order ID",
        });
      }

      const purchaseOrder = await PurchaseOrder.findById(
        purchaseOrderId
      ).populate("supplier", "name mobile phoneNumber email");

      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      let sourceInfo = {
        purchaseOrder: {
          id: purchaseOrder._id,
          orderNumber: purchaseOrder.orderNumber,
          orderDate: purchaseOrder.orderDate,
          supplier: purchaseOrder.supplier,
          totalAmount: purchaseOrder.totals.finalTotal,
          status: purchaseOrder.status,
        },
        downstream: {
          hasGeneratedSalesOrder: purchaseOrder.autoGeneratedSalesOrder,
          hasConvertedToPurchaseInvoice:
            purchaseOrder.convertedToPurchaseInvoice,
        },
      };

      // Get generated sales order info
      if (
        purchaseOrder.autoGeneratedSalesOrder &&
        purchaseOrder.salesOrderRef
      ) {
        const SalesOrder = require("../models/SalesOrder");
        const salesOrder = await SalesOrder.findById(
          purchaseOrder.salesOrderRef
        ).populate("customer", "name mobile email");

        if (salesOrder) {
          sourceInfo.downstream.salesOrder = {
            id: salesOrder._id,
            orderNumber: salesOrder.orderNumber,
            orderDate: salesOrder.orderDate,
            customer: salesOrder.customer,
            companyId: salesOrder.companyId,
            totalAmount: salesOrder.totals.finalTotal,
            status: salesOrder.status,
            generatedAt: purchaseOrder.salesOrderGeneratedAt,
            generatedBy: purchaseOrder.salesOrderGeneratedBy,
          };

          // Check if sales order was converted to invoice
          if (salesOrder.convertedToInvoice) {
            const Sale = require("../models/Sale");
            const invoice = await Sale.findById(salesOrder.invoiceRef).select(
              "invoiceNumber invoiceDate totals payment status"
            );

            if (invoice) {
              sourceInfo.downstream.invoice = {
                id: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                invoiceDate: invoice.invoiceDate,
                totalAmount: invoice.totals.finalTotal,
                paymentStatus: invoice.payment.status,
                status: invoice.status,
                convertedAt: salesOrder.convertedAt,
              };
            }
          }
        }
      }

      // Get purchase invoice info
      if (
        purchaseOrder.convertedToPurchaseInvoice &&
        purchaseOrder.purchaseInvoiceRef
      ) {
        const Purchase = require("../models/Purchase");
        const purchaseInvoice = await Purchase.findById(
          purchaseOrder.purchaseInvoiceRef
        ).select("invoiceNumber invoiceDate totals payment status");

        if (purchaseInvoice) {
          sourceInfo.downstream.purchaseInvoice = {
            id: purchaseInvoice._id,
            invoiceNumber: purchaseInvoice.invoiceNumber,
            invoiceDate: purchaseInvoice.invoiceDate,
            totalAmount: purchaseInvoice.totals.finalTotal,
            paymentStatus: purchaseInvoice.payment.status,
            status: purchaseInvoice.status,
            convertedAt: purchaseOrder.convertedAt,
          };
        }
      }

      const trackingChain = [];
      trackingChain.push({
        step: 1,
        type: "purchase_order",
        document: sourceInfo.purchaseOrder,
        description: `Purchase Order: ${purchaseOrder.orderNumber}`,
      });

      if (sourceInfo.downstream.salesOrder) {
        trackingChain.push({
          step: 2,
          type: "sales_order",
          document: sourceInfo.downstream.salesOrder,
          description: `Generated Sales Order: ${sourceInfo.downstream.salesOrder.orderNumber}`,
        });

        if (sourceInfo.downstream.invoice) {
          trackingChain.push({
            step: 3,
            type: "sales_invoice",
            document: sourceInfo.downstream.invoice,
            description: `Converted to Sales Invoice: ${sourceInfo.downstream.invoice.invoiceNumber}`,
          });
        }
      }

      if (sourceInfo.downstream.purchaseInvoice) {
        trackingChain.push({
          step: trackingChain.length + 1,
          type: "purchase_invoice",
          document: sourceInfo.downstream.purchaseInvoice,
          description: `Converted to Purchase Invoice: ${sourceInfo.downstream.purchaseInvoice.invoiceNumber}`,
        });
      }

      sourceInfo.trackingChain = trackingChain;

      res.status(200).json({
        success: true,
        data: sourceInfo,
        message: "Purchase order source tracking retrieved successfully",
      });
    } catch (error) {
      console.error("Error getting purchase order source tracking:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get purchase order source tracking",
        error: error.message,
      });
    }
  },

  // ==================== ADMIN FUNCTIONS - FIXED ====================

  /**
   * ✅ Get all sales orders for admin (across all companies)
   */
  getAllSalesOrdersForAdmin: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 100,
        status,
        orderType,
        dateFrom,
        dateTo,
        companyId: filterCompanyId, // Optional filter for specific company
        customerId,
        search,
        sortBy = "orderDate",
        sortOrder = "desc",
        populate,
        statsOnly,
      } = req.query;

      // ✅ Build admin filter - NO automatic companyId restriction
      const filter = {};

      // ✅ ONLY apply companyId filter if explicitly requested AND valid
      if (filterCompanyId && mongoose.Types.ObjectId.isValid(filterCompanyId)) {
        filter.companyId = new mongoose.Types.ObjectId(filterCompanyId);
      }

      if (status) {
        if (status.includes(",")) {
          filter.status = {$in: status.split(",")};
        } else {
          filter.status = status;
        }
      }

      if (orderType) {
        if (orderType.includes(",")) {
          filter.orderType = {$in: orderType.split(",")};
        } else {
          filter.orderType = orderType;
        }
      }

      if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
        filter.customer = new mongoose.Types.ObjectId(customerId);
      }

      if (dateFrom || dateTo) {
        filter.orderDate = {};
        if (dateFrom) filter.orderDate.$gte = new Date(dateFrom);
        if (dateTo) filter.orderDate.$lte = new Date(dateTo);
      }

      if (search) {
        filter.$or = [
          {orderNumber: {$regex: search, $options: "i"}},
          {customerNotes: {$regex: search, $options: "i"}},
          {notes: {$regex: search, $options: "i"}},
          {sourceOrderNumber: {$regex: search, $options: "i"}},
        ];
      }

      const sortOptions = {};
      const validSortFields = [
        "orderDate",
        "orderNumber",
        "status",
        "totals.finalTotal",
        "createdAt",
        "updatedAt",
        "companyId",
      ];

      if (validSortFields.includes(sortBy)) {
        sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
      } else {
        sortOptions.orderDate = -1;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build population based on query parameter
      let populateFields = [];
      if (populate) {
        const fieldsToPopulate = populate.split(",");
        fieldsToPopulate.forEach((field) => {
          if (field === "customer") {
            populateFields.push({
              path: "customer",
              select: "name mobile phoneNumber email",
            });
          }
          if (field === "companyId") {
            populateFields.push({
              path: "companyId",
              select: "businessName email phoneNumber",
            });
          }
        });
      } else {
        // Default population for admin
        populateFields = [
          {path: "customer", select: "name mobile phoneNumber email"},
          {path: "companyId", select: "businessName email phoneNumber"},
        ];
      }

      // ✅ If statsOnly, just return statistics
      if (statsOnly === "true") {
        const [totalOrders, totalRevenue, ordersByStatus, activeCompanies] =
          await Promise.all([
            SalesOrder.countDocuments(filter),
            SalesOrder.aggregate([
              {$match: filter},
              {$group: {_id: null, total: {$sum: "$totals.finalTotal"}}},
            ]),
            SalesOrder.aggregate([
              {$match: filter},
              {
                $group: {
                  _id: "$status",
                  count: {$sum: 1},
                  value: {$sum: "$totals.finalTotal"},
                },
              },
            ]),
            SalesOrder.distinct("companyId", filter),
          ]);

        const adminStatsData = {
          totalOrders,
          totalAmount: totalRevenue[0]?.total || 0,
          totalRevenue: totalRevenue[0]?.total || 0,
          activeCompanies: activeCompanies.length,
          ordersByStatus: ordersByStatus.reduce((acc, item) => {
            acc[item._id] = {count: item.count, value: item.value};
            return acc;
          }, {}),
          isAdminStats: true,
        };
        return res.status(200).json({
          success: true,
          data: adminStatsData,
          message: "Admin statistics fetched successfully (no auth required)",
        });
      }

      const [orders, total] = await Promise.all([
        SalesOrder.find(filter)
          .populate(populateFields)
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit)),
        SalesOrder.countDocuments(filter),
      ]);

      // ✅ Build comprehensive admin response
      const responseData = {
        success: true,
        data: {
          // ✅ Multiple data keys for frontend compatibility
          salesOrders: orders,
          orders: orders,
          data: orders,
          count: orders.length,

          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalOrders: total,
            limit: parseInt(limit),
            hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
            hasPrev: parseInt(page) > 1,
          },

          summary: {
            totalOrders: total,
            totalValue: orders.reduce(
              (sum, order) => sum + (order.totals?.finalTotal || 0),
              0
            ),
          },

          // ✅ Clear admin metadata
          adminInfo: {
            isAdminAccess: true,
            crossAllCompanies: !filterCompanyId,
            filteredByCompany: !!filterCompanyId,
            filterCompanyId: filterCompanyId || null,
          },
        },
        message: filterCompanyId
          ? `Found ${orders.length} sales orders for company ${filterCompanyId}`
          : `Found ${orders.length} sales orders across all companies`,
      };

      return res.status(200).json(responseData);
    } catch (error) {
      console.error("❌ Error in getAllSalesOrdersForAdmin:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch sales orders",
        error: error.message,
        data: {
          salesOrders: [],
          orders: [],
          data: [],
          count: 0,
          pagination: {},
          summary: {},
        },
      });
    }
  },

  /**
   * ✅ Get sales order statistics for admin dashboard
   */
  getSalesOrderStatsForAdmin: async (req, res) => {
    try {
      const {dateFrom, dateTo, companyId: filterCompanyId} = req.query;

      // ✅ Build admin filter - NO automatic companyId restriction
      const filter = {};

      // ✅ ONLY apply companyId filter if explicitly requested
      if (filterCompanyId && mongoose.Types.ObjectId.isValid(filterCompanyId)) {
        filter.companyId = new mongoose.Types.ObjectId(filterCompanyId);
      }

      if (dateFrom || dateTo) {
        filter.orderDate = {};
        if (dateFrom) filter.orderDate.$gte = new Date(dateFrom);
        if (dateTo) filter.orderDate.$lte = new Date(dateTo);
      }

      const [
        totalStats,
        statusBreakdown,
        orderTypeBreakdown,
        activeCompanies,
        recentOrders,
      ] = await Promise.all([
        // Basic stats
        SalesOrder.aggregate([
          {$match: filter},
          {
            $group: {
              _id: null,
              totalOrders: {$sum: 1},
              totalValue: {$sum: "$totals.finalTotal"},
              avgOrderValue: {$avg: "$totals.finalTotal"},
            },
          },
        ]),

        // Status breakdown
        SalesOrder.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$status",
              count: {$sum: 1},
              value: {$sum: "$totals.finalTotal"},
            },
          },
        ]),

        // Order type breakdown
        SalesOrder.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$orderType",
              count: {$sum: 1},
              value: {$sum: "$totals.finalTotal"},
            },
          },
        ]),

        // Active companies
        SalesOrder.distinct("companyId", filter),

        // Recent orders
        SalesOrder.find(filter)
          .populate("customer", "name mobile")
          .populate("companyId", "businessName")
          .sort({createdAt: -1})
          .limit(10),
      ]);

      const baseStats = totalStats[0] || {
        totalOrders: 0,
        totalValue: 0,
        avgOrderValue: 0,
      };

      const adminStats = {
        ...baseStats,
        totalCompanies: activeCompanies.length,
        activeCompanies: activeCompanies.length,

        statusBreakdown: statusBreakdown.reduce((acc, item) => {
          acc[item._id] = {count: item.count, value: item.value};
          return acc;
        }, {}),

        orderTypeBreakdown: orderTypeBreakdown.reduce((acc, item) => {
          acc[item._id] = {count: item.count, value: item.value};
          return acc;
        }, {}),

        recentOrders: recentOrders.slice(0, 5),
      };

      res.status(200).json({
        success: true,
        data: adminStats,
        message: "Admin statistics calculated successfully (no auth required)",
      });
    } catch (error) {
      console.error("❌ Error in getSalesOrderStatsForAdmin:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch admin statistics",
        error: error.message,
        data: {
          totalOrders: 0,
          totalRevenue: 0,
          activeCompanies: 0,
          statusBreakdown: {},
          orderTypeBreakdown: {},
          recentOrders: [],
        },
      });
    }
  },

  /**
   * ✅ FIXED: Get conversion rate analysis for admin - NO companyId restriction
   */
  getConversionRateAnalysisForAdmin: async (req, res) => {
    try {
      const {companyId: filterCompanyId, dateFrom, dateTo} = req.query;

      // ✅ FIXED: Build admin filter - NO automatic companyId restriction
      const filter = {};

      // ✅ ONLY apply companyId filter if explicitly requested AND valid (not "admin")
      if (
        filterCompanyId &&
        filterCompanyId !== "admin" &&
        mongoose.Types.ObjectId.isValid(filterCompanyId)
      ) {
        filter.companyId = new mongoose.Types.ObjectId(filterCompanyId);
      }
      if (dateFrom || dateTo) {
        filter.orderDate = {};
        if (dateFrom) filter.orderDate.$gte = new Date(dateFrom);
        if (dateTo) filter.orderDate.$lte = new Date(dateTo);
      }

      const [
        statusDistribution,
        typeDistribution,
        monthlyTrends,
        topCustomers,
        topCompanies,
        conversionFunnel,
      ] = await Promise.all([
        // Status distribution
        SalesOrder.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$status",
              count: {$sum: 1},
              value: {$sum: "$totals.finalTotal"},
            },
          },
          {$sort: {count: -1}},
        ]),

        // Order type distribution
        SalesOrder.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$orderType",
              count: {$sum: 1},
              value: {$sum: "$totals.finalTotal"},
            },
          },
          {$sort: {count: -1}},
        ]),

        // Monthly trends (last 6 months)
        SalesOrder.aggregate([
          {$match: filter},
          {
            $group: {
              _id: {
                year: {$year: "$orderDate"},
                month: {$month: "$orderDate"},
              },
              totalOrders: {$sum: 1},
              totalAmount: {$sum: "$totals.finalTotal"},
              quotations: {
                $sum: {$cond: [{$eq: ["$orderType", "quotation"]}, 1, 0]},
              },
              salesOrders: {
                $sum: {$cond: [{$eq: ["$orderType", "sales_order"]}, 1, 0]},
              },
              confirmed: {
                $sum: {
                  $cond: [
                    {$in: ["$status", ["accepted", "confirmed", "completed"]]},
                    1,
                    0,
                  ],
                },
              },
            },
          },
          {$sort: {"_id.year": -1, "_id.month": -1}},
          {$limit: 6},
        ]),

        // Top customers
        SalesOrder.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$customer",
              orders: {$sum: 1},
              amount: {$sum: "$totals.finalTotal"},
              confirmedOrders: {
                $sum: {
                  $cond: [
                    {$in: ["$status", ["accepted", "confirmed", "completed"]]},
                    1,
                    0,
                  ],
                },
              },
            },
          },
          {$sort: {amount: -1}},
          {$limit: 10},
          {
            $lookup: {
              from: "parties",
              localField: "_id",
              foreignField: "_id",
              as: "customer",
            },
          },
        ]),

        // Top companies (if admin view - not filtering by specific company)
        !filterCompanyId || filterCompanyId === "admin"
          ? SalesOrder.aggregate([
              {$match: filter},
              {
                $group: {
                  _id: "$companyId",
                  orders: {$sum: 1},
                  amount: {$sum: "$totals.finalTotal"},
                  confirmedOrders: {
                    $sum: {
                      $cond: [
                        {
                          $in: [
                            "$status",
                            ["accepted", "confirmed", "completed"],
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
              {$sort: {amount: -1}},
              {$limit: 10},
              {
                $lookup: {
                  from: "companies",
                  localField: "_id",
                  foreignField: "_id",
                  as: "company",
                },
              },
            ])
          : Promise.resolve([]),

        // Conversion funnel analysis
        SalesOrder.aggregate([
          {$match: filter},
          {
            $group: {
              _id: "$orderType",
              total: {$sum: 1},
              sent: {
                $sum: {$cond: [{$eq: ["$status", "sent"]}, 1, 0]},
              },
              accepted: {
                $sum: {$cond: [{$eq: ["$status", "accepted"]}, 1, 0]},
              },
              converted: {
                $sum: {$cond: [{$eq: ["$status", "converted"]}, 1, 0]},
              },
              completed: {
                $sum: {$cond: [{$eq: ["$status", "completed"]}, 1, 0]},
              },
            },
          },
        ]),
      ]);

      const analysisData = {
        statusDistribution: statusDistribution.reduce((acc, item) => {
          acc[item._id] = {
            count: item.count,
            value: item.value,
            percentage: 0, // Will be calculated below
          };
          return acc;
        }, {}),

        typeDistribution: typeDistribution.reduce((acc, item) => {
          acc[item._id] = {
            count: item.count,
            value: item.value,
            percentage: 0, // Will be calculated below
          };
          return acc;
        }, {}),

        monthlyTrends: monthlyTrends.map((item) => ({
          year: item._id.year,
          month: item._id.month,
          monthName: new Date(item._id.year, item._id.month - 1).toLocaleString(
            "default",
            {month: "short"}
          ),
          totalOrders: item.totalOrders,
          totalAmount: item.totalAmount,
          quotations: item.quotations,
          salesOrders: item.salesOrders,
          confirmed: item.confirmed,
          conversionRate:
            item.totalOrders > 0
              ? ((item.confirmed / item.totalOrders) * 100).toFixed(2)
              : 0,
        })),

        topCustomers: topCustomers.map((item) => ({
          customerId: item._id,
          customerName: item.customer[0]?.name || "Unknown",
          orders: item.orders,
          amount: item.amount,
          confirmedOrders: item.confirmedOrders,
          conversionRate:
            item.orders > 0
              ? ((item.confirmedOrders / item.orders) * 100).toFixed(2)
              : 0,
        })),

        topCompanies: topCompanies.map((item) => ({
          companyId: item._id,
          companyName: item.company[0]?.businessName || "Unknown",
          orders: item.orders,
          amount: item.amount,
          confirmedOrders: item.confirmedOrders,
          conversionRate:
            item.orders > 0
              ? ((item.confirmedOrders / item.orders) * 100).toFixed(2)
              : 0,
        })),

        conversionFunnel: conversionFunnel.map((item) => ({
          orderType: item._id,
          total: item.total,
          sent: item.sent,
          accepted: item.accepted,
          converted: item.converted,
          completed: item.completed,
          sendRate:
            item.total > 0 ? ((item.sent / item.total) * 100).toFixed(2) : 0,
          acceptanceRate:
            item.sent > 0 ? ((item.accepted / item.sent) * 100).toFixed(2) : 0,
          conversionRate:
            item.accepted > 0
              ? ((item.converted / item.accepted) * 100).toFixed(2)
              : 0,
        })),

        performanceMetrics: {
          totalOrders: statusDistribution.reduce(
            (sum, item) => sum + item.count,
            0
          ),
          totalValue: statusDistribution.reduce(
            (sum, item) => sum + item.value,
            0
          ),
          avgOrderValue: 0, // Will be calculated below
          overallConversionRate: 0, // Will be calculated below
        },
      };

      // Calculate percentages and averages
      const totalOrders = analysisData.performanceMetrics.totalOrders;
      const totalValue = analysisData.performanceMetrics.totalValue;

      if (totalOrders > 0) {
        analysisData.performanceMetrics.avgOrderValue = (
          totalValue / totalOrders
        ).toFixed(2);

        // Calculate percentages for status distribution
        Object.keys(analysisData.statusDistribution).forEach((status) => {
          analysisData.statusDistribution[status].percentage = (
            (analysisData.statusDistribution[status].count / totalOrders) *
            100
          ).toFixed(2);
        });

        // Calculate percentages for type distribution
        Object.keys(analysisData.typeDistribution).forEach((type) => {
          analysisData.typeDistribution[type].percentage = (
            (analysisData.typeDistribution[type].count / totalOrders) *
            100
          ).toFixed(2);
        });

        // Calculate overall conversion rate
        const confirmedStatuses = [
          "accepted",
          "confirmed",
          "completed",
          "converted",
        ];
        const confirmedCount = Object.keys(analysisData.statusDistribution)
          .filter((status) => confirmedStatuses.includes(status))
          .reduce(
            (sum, status) =>
              sum + analysisData.statusDistribution[status].count,
            0
          );

        analysisData.performanceMetrics.overallConversionRate = (
          (confirmedCount / totalOrders) *
          100
        ).toFixed(2);
      }

      res.status(200).json({
        success: true,
        data: analysisData,
        message:
          filterCompanyId && filterCompanyId !== "admin"
            ? `Conversion rate analysis completed for company ${filterCompanyId}`
            : "Conversion rate analysis completed across all companies (no auth required)",
        source: "calculated_from_orders",
      });
    } catch (error) {
      console.error("❌ Error in admin conversion rate analysis:", error);

      // Return fallback data
      res.status(200).json({
        success: true,
        data: {
          statusDistribution: {},
          typeDistribution: {},
          monthlyTrends: [],
          topCustomers: [],
          topCompanies: [],
          conversionFunnel: [],
          performanceMetrics: {
            totalOrders: 0,
            totalValue: 0,
            avgOrderValue: 0,
            overallConversionRate: 0,
          },
        },
        message: "Using fallback analysis data (admin endpoint error occurred)",
        source: "fallback",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get sales order for printing - Enhanced version
   */
  getSalesOrderForPrint: async (req, res) => {
    try {
      const {id} = req.params;
      const {format = "a4", template = "standard"} = req.query;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sales order ID format",
        });
      }

      // Get sales order with populated data
      const salesOrder = await SalesOrder.findById(id)
        .populate("customer", "name mobile email address gstNumber")
        .populate(
          "companyId",
          "businessName gstin address phoneNumber email logo"
        )
        .populate("items.itemRef", "name code hsnCode unit")
        .lean();

      if (!salesOrder) {
        return res.status(404).json({
          success: false,
          message: "Sales order not found",
        });
      }

      // Transform data for printing
      const orderData = {
        company: {
          name: salesOrder.companyId?.businessName || "Your Company",
          gstin: salesOrder.companyId?.gstin || "",
          address: salesOrder.companyId?.address || "",
          phone: salesOrder.companyId?.phoneNumber || "",
          email: salesOrder.companyId?.email || "",
          // ✅ Handle logo safely
          logo:
            salesOrder.companyId?.logo?.base64 &&
            salesOrder.companyId.logo.base64.trim() !== ""
              ? salesOrder.companyId.logo.base64
              : null,
        },
        customer: {
          name:
            salesOrder.customer?.name ||
            salesOrder.customerName ||
            "Unknown Customer",
          address:
            salesOrder.customer?.address || salesOrder.customerAddress || "",
          mobile:
            salesOrder.customer?.mobile || salesOrder.customerMobile || "",
          email: salesOrder.customer?.email || salesOrder.customerEmail || "",
          gstin:
            salesOrder.customer?.gstNumber ||
            salesOrder.customerGstNumber ||
            "",
        },
        order: {
          id: salesOrder._id,
          orderNumber: salesOrder.orderNumber,
          orderDate: salesOrder.orderDate,
          orderType: salesOrder.orderType,
          validUntil: salesOrder.validUntil,
          expectedDeliveryDate: salesOrder.expectedDeliveryDate,
          status: salesOrder.status,
          priority: salesOrder.priority,
          notes: salesOrder.notes || "",
          customerNotes: salesOrder.customerNotes || "",
          termsAndConditions: salesOrder.termsAndConditions || "",
        },
        items: (salesOrder.items || []).map((item, index) => ({
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
          subtotal: salesOrder.totals?.subtotal || 0,
          totalTax: salesOrder.totals?.totalTax || 0,
          totalCGST: salesOrder.totals?.totalCGST || 0,
          totalSGST: salesOrder.totals?.totalSGST || 0,
          totalIGST: salesOrder.totals?.totalIGST || 0,
          totalDiscount: salesOrder.totals?.totalDiscount || 0,
          roundOff: salesOrder.totals?.roundOff || 0,
          finalTotal: salesOrder.totals?.finalTotal || 0,
        },
        payment: {
          method: salesOrder.payment?.method || "credit",
          paidAmount: salesOrder.payment?.paidAmount || 0,
          pendingAmount: salesOrder.payment?.pendingAmount || 0,
          status: salesOrder.payment?.status || "pending",
          terms: salesOrder.termsAndConditions || "",
          creditDays: salesOrder.payment?.creditDays || 0,
          dueDate: salesOrder.payment?.dueDate,
        },
        meta: {
          format,
          template,
          printDate: new Date(),
          isSalesOrder: true,
          isQuotation: salesOrder.orderType === "quotation",
          isProformaInvoice: salesOrder.orderType === "proforma_invoice",
          isGSTEnabled: salesOrder.gstEnabled,
        },
      };

      res.json({
        success: true,
        data: orderData,
        message: "Sales order data prepared for printing",
      });
    } catch (error) {
      console.error("❌ Error getting sales order for print:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sales order for printing",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get sales order for email/PDF generation
   */
  getSalesOrderForEmail: async (req, res) => {
    try {
      const {id} = req.params;
      const {includePaymentLink = false, template = "professional"} = req.query;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sales order ID format",
        });
      }

      const salesOrder = await SalesOrder.findById(id)
        .populate("customer", "name mobile email address gstNumber")
        .populate(
          "companyId",
          "businessName gstin address phoneNumber email logo website"
        )
        .populate("items.itemRef", "name code hsnCode unit")
        .lean();

      if (!salesOrder) {
        return res.status(404).json({
          success: false,
          message: "Sales order not found",
        });
      }

      // Enhanced data for email template
      const emailData = {
        company: {
          name: salesOrder.companyId?.businessName || "Your Company",
          gstin: salesOrder.companyId?.gstin || "",
          address: salesOrder.companyId?.address || "",
          phone: salesOrder.companyId?.phoneNumber || "",
          email: salesOrder.companyId?.email || "",
          website: salesOrder.companyId?.website || "",
          logo: salesOrder.companyId?.logo?.base64 || null,
        },
        customer: {
          name: salesOrder.customer?.name || "Customer",
          email: salesOrder.customer?.email || "",
          mobile:
            salesOrder.customer?.mobile || salesOrder.customerMobile || "",
          address: salesOrder.customer?.address || "",
          gstin: salesOrder.customer?.gstNumber || "",
        },
        order: {
          id: salesOrder._id,
          orderNumber: salesOrder.orderNumber,
          orderDate: salesOrder.orderDate,
          orderType: salesOrder.orderType,
          validUntil: salesOrder.validUntil,
          expectedDeliveryDate: salesOrder.expectedDeliveryDate,
          status: salesOrder.status,
          priority: salesOrder.priority,
          notes: salesOrder.notes || "",
          customerNotes: salesOrder.customerNotes || "",
          termsAndConditions: salesOrder.termsAndConditions || "",
        },
        items: (salesOrder.items || []).map((item, index) => ({
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
          subtotal: salesOrder.totals?.subtotal || 0,
          totalDiscount: salesOrder.totals?.totalDiscount || 0,
          taxableAmount: salesOrder.totals?.totalTaxableAmount || 0,
          totalCGST: salesOrder.totals?.totalCGST || 0,
          totalSGST: salesOrder.totals?.totalSGST || 0,
          totalIGST: salesOrder.totals?.totalIGST || 0,
          totalTax: salesOrder.totals?.totalTax || 0,
          roundOff: salesOrder.totals?.roundOff || 0,
          finalTotal: salesOrder.totals?.finalTotal || 0,
        },
        payment: {
          method: salesOrder.payment?.method || "credit",
          paidAmount: salesOrder.payment?.paidAmount || 0,
          pendingAmount: salesOrder.payment?.pendingAmount || 0,
          status: salesOrder.payment?.status || "pending",
          dueDate: salesOrder.payment?.dueDate,
          creditDays: salesOrder.payment?.creditDays || 0,
        },
        acceptanceLink:
          includePaymentLink === "true" && salesOrder.status === "sent"
            ? `${process.env.FRONTEND_URL}/order/accept/${salesOrder._id}`
            : null,
        meta: {
          template,
          generatedDate: new Date(),
          isEmailVersion: true,
          isQuotation: salesOrder.orderType === "quotation",
          isProformaInvoice: salesOrder.orderType === "proforma_invoice",
          isGSTEnabled: salesOrder.gstEnabled,
          hasLogo: !!salesOrder.companyId?.logo?.base64,
        },
      };

      res.json({
        success: true,
        data: emailData,
        message: "Sales order data prepared for email",
      });
    } catch (error) {
      console.error("❌ Error getting sales order for email:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sales order for email",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Generate and download sales order PDF
   */
  downloadSalesOrderPDF: async (req, res) => {
    try {
      const {id} = req.params;
      const {template = "standard", format = "a4"} = req.query;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sales order ID format",
        });
      }

      const salesOrder = await SalesOrder.findById(id)
        .populate("customer", "name mobile email address gstNumber")
        .populate(
          "companyId",
          "businessName gstin address phoneNumber email logo"
        )
        .lean();

      if (!salesOrder) {
        return res.status(404).json({
          success: false,
          message: "Sales order not found",
        });
      }

      // Set appropriate headers for PDF download
      const filename = `${salesOrder.orderType}-${
        salesOrder.orderNumber || salesOrder._id
      }.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      // Return order data with PDF metadata
      res.json({
        success: true,
        data: {
          filename,
          orderNumber: salesOrder.orderNumber,
          orderType: salesOrder.orderType,
          customerName: salesOrder.customer?.name || "Customer",
          amount: salesOrder.totals?.finalTotal || 0,
          downloadUrl: `/api/sales-orders/${id}/print?template=${template}&format=pdf`,
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
   * ✅ NEW: Get multiple sales orders for bulk printing
   */
  getBulkSalesOrdersForPrint: async (req, res) => {
    try {
      const {ids} = req.body; // Array of order IDs
      const {format = "a4", template = "standard"} = req.query;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Order IDs array is required",
        });
      }

      // Validate all IDs
      const invalidIds = ids.filter(
        (id) => !mongoose.Types.ObjectId.isValid(id)
      );
      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid order ID format",
          invalidIds,
        });
      }

      // Get all sales orders
      const orders = await SalesOrder.find({_id: {$in: ids}})
        .populate("customer", "name mobile email address gstNumber")
        .populate(
          "companyId",
          "businessName gstin address phoneNumber email logo"
        )
        .populate("items.itemRef", "name code hsnCode unit")
        .lean();

      if (orders.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No sales orders found",
        });
      }

      // Transform each order for printing
      const bulkOrderData = orders.map((salesOrder) => ({
        company: {
          name: salesOrder.companyId?.businessName || "Your Company",
          gstin: salesOrder.companyId?.gstin || "",
          address: salesOrder.companyId?.address || "",
          phone: salesOrder.companyId?.phoneNumber || "",
          email: salesOrder.companyId?.email || "",
          logo: salesOrder.companyId?.logo?.base64 || null,
        },
        customer: {
          name: salesOrder.customer?.name || "Customer",
          address: salesOrder.customer?.address || "",
          mobile:
            salesOrder.customer?.mobile || salesOrder.customerMobile || "",
          email: salesOrder.customer?.email || "",
          gstin: salesOrder.customer?.gstNumber || "",
        },
        order: {
          id: salesOrder._id,
          orderNumber: salesOrder.orderNumber,
          orderDate: salesOrder.orderDate,
          orderType: salesOrder.orderType,
          validUntil: salesOrder.validUntil,
          expectedDeliveryDate: salesOrder.expectedDeliveryDate,
          status: salesOrder.status,
          priority: salesOrder.priority,
          notes: salesOrder.notes || "",
          customerNotes: salesOrder.customerNotes || "",
          termsAndConditions: salesOrder.termsAndConditions || "",
        },
        items: (salesOrder.items || []).map((item, index) => ({
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
          subtotal: salesOrder.totals?.subtotal || 0,
          totalTax: salesOrder.totals?.totalTax || 0,
          totalCGST: salesOrder.totals?.totalCGST || 0,
          totalSGST: salesOrder.totals?.totalSGST || 0,
          totalIGST: salesOrder.totals?.totalIGST || 0,
          totalDiscount: salesOrder.totals?.totalDiscount || 0,
          roundOff: salesOrder.totals?.roundOff || 0,
          finalTotal: salesOrder.totals?.finalTotal || 0,
        },
        payment: {
          method: salesOrder.payment?.method || "credit",
          paidAmount: salesOrder.payment?.paidAmount || 0,
          pendingAmount: salesOrder.payment?.pendingAmount || 0,
          status: salesOrder.payment?.status || "pending",
        },
      }));

      res.json({
        success: true,
        data: {
          orders: bulkOrderData,
          count: bulkOrderData.length,
          requestedCount: ids.length,
          notFound: ids.length - bulkOrderData.length,
          meta: {
            format,
            template,
            printDate: new Date(),
            isBulkPrint: true,
          },
        },
        message: `${bulkOrderData.length} sales orders prepared for bulk printing`,
      });
    } catch (error) {
      console.error("❌ Error getting bulk sales orders for print:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get bulk sales orders for printing",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get sales order for QR code acceptance
   */
  getSalesOrderForQRAcceptance: async (req, res) => {
    try {
      const {id} = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sales order ID format",
        });
      }

      const salesOrder = await SalesOrder.findById(id)
        .populate("customer", "name mobile")
        .populate("companyId", "businessName")
        .lean();

      if (!salesOrder) {
        return res.status(404).json({
          success: false,
          message: "Sales order not found",
        });
      }

      if (
        salesOrder.status === "accepted" ||
        salesOrder.status === "converted"
      ) {
        return res.status(400).json({
          success: false,
          message: "Order is already accepted",
        });
      }

      // Generate acceptance data for QR code
      const acceptanceData = {
        orderId: salesOrder._id,
        orderNumber: salesOrder.orderNumber,
        orderType: salesOrder.orderType,
        companyName: salesOrder.companyId?.businessName || "Company",
        customerName: salesOrder.customer?.name || "Customer",
        amount: salesOrder.totals?.finalTotal || 0,
        validUntil: salesOrder.validUntil,
        acceptanceUrl: `${process.env.FRONTEND_URL}/order/accept/${salesOrder._id}`,
        qrSize: 256,
        meta: {
          generatedAt: new Date(),
          expiresAt:
            salesOrder.validUntil ||
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      };

      res.json({
        success: true,
        data: acceptanceData,
        message: "Order acceptance QR data generated successfully",
      });
    } catch (error) {
      console.error("❌ Error getting sales order for QR acceptance:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sales order for QR acceptance",
        error: error.message,
      });
    }
  },

  /**
   * ✅ NEW: Get sales order summary for quick view
   */
  getSalesOrderSummary: async (req, res) => {
    try {
      const {id} = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sales order ID format",
        });
      }

      const salesOrder = await SalesOrder.findById(id)
        .populate("customer", "name mobile")
        .populate("companyId", "businessName")
        .lean();

      if (!salesOrder) {
        return res.status(404).json({
          success: false,
          message: "Sales order not found",
        });
      }

      // Generate summary data
      const summaryData = {
        basic: {
          orderId: salesOrder._id,
          orderNumber: salesOrder.orderNumber,
          orderDate: salesOrder.orderDate,
          orderType: salesOrder.orderType,
          status: salesOrder.status,
          priority: salesOrder.priority,
          companyName: salesOrder.companyId?.businessName || "Company",
          customerName: salesOrder.customer?.name || "Customer",
          customerMobile:
            salesOrder.customer?.mobile || salesOrder.customerMobile || "",
        },
        financial: {
          subtotal: salesOrder.totals?.subtotal || 0,
          totalTax: salesOrder.totals?.totalTax || 0,
          totalDiscount: salesOrder.totals?.totalDiscount || 0,
          finalTotal: salesOrder.totals?.finalTotal || 0,
          paidAmount: salesOrder.payment?.paidAmount || 0,
          pendingAmount: salesOrder.payment?.pendingAmount || 0,
          paymentStatus: salesOrder.payment?.status || "pending",
          paymentMethod: salesOrder.payment?.method || "credit",
        },
        items: {
          totalItems: salesOrder.items?.length || 0,
          totalQuantity: salesOrder.totals?.totalQuantity || 0,
          topItem:
            salesOrder.items && salesOrder.items.length > 0
              ? {
                  name: salesOrder.items[0].itemName,
                  quantity: salesOrder.items[0].quantity,
                  amount: salesOrder.items[0].amount,
                }
              : null,
        },
        timeline: {
          createdAt: salesOrder.createdAt,
          lastModified: salesOrder.updatedAt,
          validUntil: salesOrder.validUntil,
          expectedDeliveryDate: salesOrder.expectedDeliveryDate,
          isExpired: salesOrder.validUntil
            ? new Date() > new Date(salesOrder.validUntil)
            : false,
          isOverdue: salesOrder.expectedDeliveryDate
            ? new Date() > new Date(salesOrder.expectedDeliveryDate)
            : false,
        },
        conversion: {
          convertedToInvoice: salesOrder.convertedToInvoice || false,
          invoiceNumber: salesOrder.invoiceNumber || null,
          invoiceRef: salesOrder.invoiceRef || null,
          convertedAt: salesOrder.convertedAt || null,
        },
        actions: {
          canEdit: ["draft", "sent"].includes(salesOrder.status),
          canCancel: !["accepted", "converted", "cancelled"].includes(
            salesOrder.status
          ),
          canAccept: salesOrder.status === "sent",
          canConvert:
            ["accepted", "confirmed"].includes(salesOrder.status) &&
            !salesOrder.convertedToInvoice,
          canPrint: true,
          canEmail: !!salesOrder.customer?.email,
          canAddPayment: salesOrder.payment?.pendingAmount > 0,
        },
      };

      res.json({
        success: true,
        data: summaryData,
        message: "Sales order summary retrieved successfully",
      });
    } catch (error) {
      console.error("❌ Error getting sales order summary:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sales order summary",
        error: error.message,
      });
    }
  },
  /**
   * ✅ NEW: Get proforma invoice for printing
   */
  getProformaInvoiceForPrint: async (req, res) => {
    try {
      const {id} = req.params;
      const {format = "a4", template = "proforma"} = req.query;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid proforma invoice ID format",
        });
      }

      const proforma = await SalesOrder.findOne({
        _id: id,
        orderType: "proforma_invoice",
      })
        .populate("customer", "name mobile email address gstNumber")
        .populate(
          "companyId",
          "businessName gstin address phoneNumber email logo"
        )
        .populate("items.itemRef", "name code hsnCode unit")
        .lean();

      if (!proforma) {
        return res.status(404).json({
          success: false,
          message: "Proforma invoice not found",
        });
      }

      // Transform data for proforma invoice printing
      const proformaData = {
        company: {
          name: proforma.companyId?.businessName || "Your Company",
          gstin: proforma.companyId?.gstin || "",
          address: proforma.companyId?.address || "",
          phone: proforma.companyId?.phoneNumber || "",
          email: proforma.companyId?.email || "",
          logo: proforma.companyId?.logo?.base64 || null,
        },
        customer: {
          name: proforma.customer?.name || "Customer",
          address: proforma.customer?.address || "",
          mobile: proforma.customer?.mobile || proforma.customerMobile || "",
          email: proforma.customer?.email || "",
          gstin: proforma.customer?.gstNumber || "",
        },
        proforma: {
          id: proforma._id,
          proformaNumber: proforma.orderNumber,
          proformaDate: proforma.orderDate,
          validUntil: proforma.validUntil,
          expectedDeliveryDate: proforma.expectedDeliveryDate,
          status: proforma.status,
          priority: proforma.priority,
          notes: proforma.notes || "",
          customerNotes: proforma.customerNotes || "",
          termsAndConditions: proforma.termsAndConditions || "",
        },
        items: (proforma.items || []).map((item, index) => ({
          srNo: index + 1,
          name: item.itemName || `Item ${index + 1}`,
          description: item.description || "",
          hsnCode: item.hsnCode || "",
          quantity: item.quantity || 1,
          unit: item.unit || "PCS",
          rate: item.pricePerUnit || 0,
          discount: item.discountAmount || 0,
          taxRate: item.taxRate || 0,
          cgst: item.cgstAmount || 0,
          sgst: item.sgstAmount || 0,
          igst: item.igstAmount || 0,
          amount: item.amount || 0,
        })),
        totals: {
          subtotal: proforma.totals?.subtotal || 0,
          totalTax: proforma.totals?.totalTax || 0,
          totalCGST: proforma.totals?.totalCGST || 0,
          totalSGST: proforma.totals?.totalSGST || 0,
          totalIGST: proforma.totals?.totalIGST || 0,
          totalDiscount: proforma.totals?.totalDiscount || 0,
          roundOff: proforma.totals?.roundOff || 0,
          finalTotal: proforma.totals?.finalTotal || 0,
        },
        payment: {
          method: proforma.payment?.method || "advance",
          advanceRequired: proforma.payment?.advanceAmount || 0,
          creditDays: proforma.payment?.creditDays || 0,
          paymentTerms:
            proforma.payment?.notes || "50% advance, balance on delivery",
        },
        meta: {
          format,
          template,
          printDate: new Date(),
          isProformaInvoice: true,
          requiresAdvance: (proforma.payment?.advanceAmount || 0) > 0,
          isGSTEnabled: proforma.gstEnabled,
        },
      };

      res.json({
        success: true,
        data: proformaData,
        message: "Proforma invoice data prepared for printing",
      });
    } catch (error) {
      console.error("❌ Error getting proforma invoice for print:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get proforma invoice for printing",
        error: error.message,
      });
    }
  },
};

module.exports = salesOrderController;
