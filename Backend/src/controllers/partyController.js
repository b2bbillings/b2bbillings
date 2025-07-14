const Party = require("../models/Party");
const Company = require("../models/Company");
const mongoose = require("mongoose");

const partyController = {
  // ✅ ENHANCED: createParty with linking support
  async createParty(req, res) {
    try {
      const {
        partyType = "customer",
        name,
        email = "",
        phoneNumber,
        companyName = "",
        gstNumber = "",
        gstType = "unregistered",
        creditLimit = 0,
        openingBalance = 0,
        country = "INDIA",
        homeAddressLine = "",
        homePincode = "",
        homeState = "",
        homeDistrict = "",
        homeTaluka = "",
        deliveryAddressLine = "",
        deliveryPincode = "",
        deliveryState = "",
        deliveryDistrict = "",
        deliveryTaluka = "",
        sameAsHomeAddress = false,
        phoneNumbers = [],

        // ✅ NEW: Bidirectional linking fields
        linkedCompanyId = null,
        isLinkedSupplier = false,
        enableBidirectionalOrders = false,
        autoLinkByGST = true,
        autoLinkByPhone = true,
        autoLinkByEmail = true,
        externalCompanyId = null,
        isExternalCompany = false,
        importedFrom = null,
        importedAt = null,
        source = null,
        isVerified = false,
        supplierCompanyData = null,

        // ✅ NEW: Additional business fields
        website = "",
        businessType = "",
        businessCategory = "",
        companyType = "",
        incorporationDate = null,
        cinNumber = "",
        authorizedCapital = "",
        paidUpCapital = "",
        establishedYear = "",
        description = "",
        ownerInfo = null,
      } = req.body;

      const userId = req.user?.id || req.user?._id;
      const companyId =
        req.user?.currentCompany ||
        req.body.companyId ||
        req.headers["x-company-id"] ||
        req.query.companyId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User authentication required",
        });
      }

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company selection required",
        });
      }

      if (!name?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Party name is required",
        });
      }

      if (!phoneNumber?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Phone number is required",
        });
      }

      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(phoneNumber.trim())) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide a valid 10-digit phone number starting with 6, 7, 8, or 9",
        });
      }

      if (email?.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          return res.status(400).json({
            success: false,
            message: "Please provide a valid email address",
          });
        }
      }

      if (gstNumber?.trim() && gstType !== "unregistered") {
        const gstRegex =
          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstRegex.test(gstNumber.trim().toUpperCase())) {
          return res.status(400).json({
            success: false,
            message:
              "Please provide a valid GST number format (e.g., 22AAAAA0000A1Z5)",
          });
        }
      }

      if (creditLimit < 0) {
        return res.status(400).json({
          success: false,
          message: "Credit limit cannot be negative",
        });
      }

      if (openingBalance < 0) {
        return res.status(400).json({
          success: false,
          message: "Opening balance cannot be negative",
        });
      }

      const userObjectId = new mongoose.Types.ObjectId(userId);
      const companyObjectId = new mongoose.Types.ObjectId(companyId);

      // ✅ NEW: Validate linked company if provided
      let linkedCompanyObjectId = null;
      if (linkedCompanyId) {
        if (!mongoose.Types.ObjectId.isValid(linkedCompanyId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid linked company ID format",
          });
        }

        linkedCompanyObjectId = new mongoose.Types.ObjectId(linkedCompanyId);

        // Verify linked company exists
        const linkedCompany = await Company.findById(linkedCompanyObjectId);
        if (!linkedCompany) {
          return res.status(400).json({
            success: false,
            message: "Linked company not found",
          });
        }

        // Prevent linking to same company
        if (linkedCompanyObjectId.toString() === companyObjectId.toString()) {
          return res.status(400).json({
            success: false,
            message: "Cannot link party to their own company",
          });
        }
      }

      const existingParty = await Party.findOne({
        phoneNumber: phoneNumber.trim(),
        companyId: companyObjectId,
        isActive: true,
      });

      if (existingParty) {
        return res.status(400).json({
          success: false,
          message: `A party with phone number ${phoneNumber.trim()} already exists in this company`,
        });
      }

      // ✅ ENHANCED: Party data with all linking fields
      const partyData = {
        partyType,
        name: name.trim(),
        email: email?.trim() || "",
        phoneNumber: phoneNumber.trim(),
        companyName: companyName?.trim() || "",
        gstNumber:
          gstType !== "unregistered" && gstNumber?.trim()
            ? gstNumber.trim().toUpperCase()
            : "",
        gstType,
        creditLimit: parseFloat(creditLimit) || 0,
        openingBalance: parseFloat(openingBalance) || 0,
        country: country.toUpperCase(),
        homeAddress: {
          addressLine: homeAddressLine?.trim() || "",
          pincode: homePincode?.trim() || "",
          state: homeState?.trim() || "",
          district: homeDistrict?.trim() || "",
          taluka: homeTaluka?.trim() || "",
        },
        deliveryAddress: sameAsHomeAddress
          ? {
              addressLine: homeAddressLine?.trim() || "",
              pincode: homePincode?.trim() || "",
              state: homeState?.trim() || "",
              district: homeDistrict?.trim() || "",
              taluka: homeTaluka?.trim() || "",
            }
          : {
              addressLine: deliveryAddressLine?.trim() || "",
              pincode: deliveryPincode?.trim() || "",
              state: deliveryState?.trim() || "",
              district: deliveryDistrict?.trim() || "",
              taluka: deliveryTaluka?.trim() || "",
            },
        sameAsHomeAddress,
        phoneNumbers:
          phoneNumbers.length > 0
            ? phoneNumbers.filter((p) => p.number?.trim())
            : [{number: phoneNumber.trim(), label: "Primary"}],
        userId: userObjectId,
        companyId: companyObjectId,
        createdBy: userObjectId,

        // ✅ NEW: Bidirectional linking fields
        linkedCompanyId: linkedCompanyObjectId,
        isLinkedSupplier:
          linkedCompanyObjectId && partyType === "supplier"
            ? true
            : isLinkedSupplier,
        enableBidirectionalOrders:
          linkedCompanyObjectId && partyType === "supplier"
            ? true
            : enableBidirectionalOrders,
        autoLinkByGST,
        autoLinkByPhone,
        autoLinkByEmail,
        externalCompanyId: externalCompanyId?.trim() || null,
        isExternalCompany,
        importedFrom,
        importedAt: importedAt ? new Date(importedAt) : null,
        source: source?.trim() || null,
        isVerified,
        supplierCompanyData,

        // ✅ NEW: Additional business fields
        website: website?.trim() || "",
        businessType: businessType?.trim() || "",
        businessCategory: businessCategory?.trim() || "",
        companyType: companyType?.trim() || "",
        incorporationDate: incorporationDate
          ? new Date(incorporationDate)
          : null,
        cinNumber: cinNumber?.trim()?.toUpperCase() || "",
        authorizedCapital: authorizedCapital?.trim() || "",
        paidUpCapital: paidUpCapital?.trim() || "",
        establishedYear: establishedYear?.trim() || "",
        description: description?.trim() || "",
        ownerInfo,
      };

      console.log("💾 Creating party with linking data:", {
        partyType: partyData.partyType,
        name: partyData.name,
        linkedCompanyId: partyData.linkedCompanyId,
        isLinkedSupplier: partyData.isLinkedSupplier,
        enableBidirectionalOrders: partyData.enableBidirectionalOrders,
        supplierCompanyData: !!partyData.supplierCompanyData,
      });

      const newParty = new Party(partyData);
      await newParty.save();

      // ✅ NEW: Enhanced response with linking information
      const linkingInfo = {
        hasLinkedCompany: !!newParty.linkedCompanyId,
        bidirectionalOrdersReady: newParty.isBidirectionalOrderReady(),
        linkedCompanyId: newParty.linkedCompanyId,
        autoLinkingEnabled: {
          byGST: newParty.autoLinkByGST,
          byPhone: newParty.autoLinkByPhone,
          byEmail: newParty.autoLinkByEmail,
        },
      };

      console.log("✅ Party created with linking info:", linkingInfo);

      res.status(201).json({
        success: true,
        message: linkingInfo.bidirectionalOrdersReady
          ? "Supplier created and linked! Ready for bidirectional order generation."
          : "Party created successfully",
        data: {
          party: newParty,
          linkingInfo,
          linkedCompany: linkedCompanyObjectId
            ? await Company.findById(linkedCompanyObjectId).select(
                "businessName gstin phoneNumber email"
              )
            : null,
        },
      });
    } catch (error) {
      console.error("❌ Error creating party:", error);

      if (error.name === "ValidationError") {
        const validationErrors = Object.values(error.errors).map(
          (err) => err.message
        );
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationErrors,
        });
      }

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message:
            "A party with this phone number already exists in this company",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error creating party",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Enhanced party creation with automatic linking
  async createPartyWithLinking(req, res) {
    try {
      // Use the same logic as createParty but with enhanced auto-linking
      await partyController.createParty(req, res);
    } catch (error) {
      console.error("❌ Error in createPartyWithLinking:", error);
      res.status(500).json({
        success: false,
        message: "Error creating party with linking",
        error: error.message,
      });
    }
  },

  // ✅ ENHANCED: updateParty with linking support
  async updateParty(req, res) {
    try {
      const {id} = req.params;
      const updateData = req.body;

      const userId = req.user?.id || req.user?._id;
      const companyId =
        req.user?.currentCompany ||
        req.body.companyId ||
        req.headers["x-company-id"] ||
        req.query.companyId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User authentication required",
        });
      }

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company selection required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid party ID format",
        });
      }

      const companyObjectId =
        typeof companyId === "string"
          ? new mongoose.Types.ObjectId(companyId)
          : companyId;

      const existingParty = await Party.findOne({
        _id: id,
        companyId: companyObjectId,
        isActive: true,
      });

      if (!existingParty) {
        return res.status(404).json({
          success: false,
          message: "Party not found",
        });
      }

      // ✅ NEW: Validate linked company if being updated
      if (updateData.linkedCompanyId) {
        if (!mongoose.Types.ObjectId.isValid(updateData.linkedCompanyId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid linked company ID format",
          });
        }

        const linkedCompanyObjectId = new mongoose.Types.ObjectId(
          updateData.linkedCompanyId
        );

        // Verify linked company exists
        const linkedCompany = await Company.findById(linkedCompanyObjectId);
        if (!linkedCompany) {
          return res.status(400).json({
            success: false,
            message: "Linked company not found",
          });
        }

        // Prevent linking to same company
        if (linkedCompanyObjectId.toString() === companyObjectId.toString()) {
          return res.status(400).json({
            success: false,
            message: "Cannot link party to their own company",
          });
        }

        updateData.linkedCompanyId = linkedCompanyObjectId;
      }

      // Validate phone number if being updated
      if (
        updateData.phoneNumber &&
        updateData.phoneNumber !== existingParty.phoneNumber
      ) {
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(updateData.phoneNumber.trim())) {
          return res.status(400).json({
            success: false,
            message:
              "Please provide a valid 10-digit phone number starting with 6, 7, 8, or 9",
          });
        }

        const phoneConflict = await Party.findOne({
          phoneNumber: updateData.phoneNumber,
          companyId: companyObjectId,
          _id: {$ne: id},
          isActive: true,
        });

        if (phoneConflict) {
          return res.status(400).json({
            success: false,
            message:
              "A party with this phone number already exists in this company",
          });
        }
      }

      // Validate email if provided
      if (updateData.email?.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updateData.email.trim())) {
          return res.status(400).json({
            success: false,
            message: "Please provide a valid email address",
          });
        }
      }

      // Validate GST number if being updated
      if (
        updateData.gstNumber?.trim() &&
        updateData.gstType !== "unregistered"
      ) {
        const gstRegex =
          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstRegex.test(updateData.gstNumber.trim().toUpperCase())) {
          return res.status(400).json({
            success: false,
            message:
              "Please provide a valid GST number format (e.g., 22AAAAA0000A1Z5)",
          });
        }
      }

      if (updateData.creditLimit !== undefined && updateData.creditLimit < 0) {
        return res.status(400).json({
          success: false,
          message: "Credit limit cannot be negative",
        });
      }

      if (
        updateData.openingBalance !== undefined &&
        updateData.openingBalance < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Opening balance cannot be negative",
        });
      }

      const updatedPartyData = {
        ...updateData,
        updatedAt: new Date(),
        updatedBy: new mongoose.Types.ObjectId(userId),
      };

      // Handle address data
      if (updateData.homeAddressLine !== undefined) {
        updatedPartyData.homeAddress = {
          addressLine: updateData.homeAddressLine || "",
          pincode: updateData.homePincode || "",
          state: updateData.homeState || "",
          district: updateData.homeDistrict || "",
          taluka: updateData.homeTaluka || "",
        };
      }

      if (updateData.sameAsHomeAddress) {
        updatedPartyData.deliveryAddress = updatedPartyData.homeAddress;
      } else if (updateData.deliveryAddressLine !== undefined) {
        updatedPartyData.deliveryAddress = {
          addressLine: updateData.deliveryAddressLine || "",
          pincode: updateData.deliveryPincode || "",
          state: updateData.deliveryState || "",
          district: updateData.deliveryDistrict || "",
          taluka: updateData.deliveryTaluka || "",
        };
      }

      // Handle GST number
      if (updateData.gstType === "unregistered") {
        updatedPartyData.gstNumber = "";
      } else if (updateData.gstNumber) {
        updatedPartyData.gstNumber = updateData.gstNumber.trim().toUpperCase();
      }

      // ✅ NEW: Handle linking field updates
      if (updateData.linkedCompanyId && updateData.partyType === "supplier") {
        updatedPartyData.isLinkedSupplier = true;
        if (updatedPartyData.enableBidirectionalOrders === undefined) {
          updatedPartyData.enableBidirectionalOrders = true;
        }
      }

      // Handle date fields
      if (updateData.incorporationDate) {
        updatedPartyData.incorporationDate = new Date(
          updateData.incorporationDate
        );
      }
      if (updateData.importedAt) {
        updatedPartyData.importedAt = new Date(updateData.importedAt);
      }

      // Remove undefined fields
      Object.keys(updatedPartyData).forEach((key) => {
        if (updatedPartyData[key] === undefined) {
          delete updatedPartyData[key];
        }
      });

      console.log("📝 Updating party with linking data:", {
        partyId: id,
        linkedCompanyId: updatedPartyData.linkedCompanyId,
        isLinkedSupplier: updatedPartyData.isLinkedSupplier,
        enableBidirectionalOrders: updatedPartyData.enableBidirectionalOrders,
      });

      const updatedParty = await Party.findByIdAndUpdate(id, updatedPartyData, {
        new: true,
        runValidators: true,
      });

      // ✅ NEW: Enhanced response with linking information
      const linkingInfo = {
        hasLinkedCompany: !!updatedParty.linkedCompanyId,
        bidirectionalOrdersReady: updatedParty.isBidirectionalOrderReady(),
        linkedCompanyId: updatedParty.linkedCompanyId,
        autoLinkingEnabled: {
          byGST: updatedParty.autoLinkByGST,
          byPhone: updatedParty.autoLinkByPhone,
          byEmail: updatedParty.autoLinkByEmail,
        },
      };

      res.json({
        success: true,
        message: linkingInfo.bidirectionalOrdersReady
          ? "Supplier updated and linked! Ready for bidirectional order generation."
          : "Party updated successfully",
        data: {
          party: updatedParty,
          linkingInfo,
          linkedCompany: updatedParty.linkedCompanyId
            ? await Company.findById(updatedParty.linkedCompanyId).select(
                "businessName gstin phoneNumber email"
              )
            : null,
        },
      });
    } catch (error) {
      console.error("❌ Error updating party:", error);

      if (error.name === "ValidationError") {
        const validationErrors = Object.values(error.errors).map(
          (err) => err.message
        );
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationErrors,
        });
      }

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message:
            "A party with this information already exists in this company",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error updating party",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Enhanced update with linking
  async updatePartyWithLinking(req, res) {
    try {
      // Use the same logic as updateParty
      await partyController.updateParty(req, res);
    } catch (error) {
      console.error("❌ Error in updatePartyWithLinking:", error);
      res.status(500).json({
        success: false,
        message: "Error updating party with linking",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Link supplier to company
  async linkSupplierToCompany(req, res) {
    try {
      const {supplierId, companyId: targetCompanyId} = req.body;

      const userId = req.user?.id || req.user?._id;
      const companyId = req.user?.currentCompany || req.headers["x-company-id"];

      if (!userId || !companyId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      if (!supplierId || !targetCompanyId) {
        return res.status(400).json({
          success: false,
          message: "Supplier ID and target company ID are required",
        });
      }

      const supplier = await Party.findOne({
        _id: supplierId,
        companyId: new mongoose.Types.ObjectId(companyId),
        partyType: "supplier",
        isActive: true,
      });

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: "Supplier not found",
        });
      }

      const targetCompany = await Company.findById(targetCompanyId);
      if (!targetCompany) {
        return res.status(404).json({
          success: false,
          message: "Target company not found",
        });
      }

      // Prevent linking to same company
      if (targetCompanyId === companyId) {
        return res.status(400).json({
          success: false,
          message: "Cannot link supplier to their own company",
        });
      }

      supplier.linkedCompanyId = targetCompanyId;
      supplier.isLinkedSupplier = true;
      supplier.enableBidirectionalOrders = true;
      supplier.updatedBy = userId;

      await supplier.save();

      res.json({
        success: true,
        message: "Supplier linked to company successfully",
        data: {
          supplier,
          linkedCompany: targetCompany,
          bidirectionalOrdersReady: supplier.isBidirectionalOrderReady(),
        },
      });
    } catch (error) {
      console.error("❌ Error linking supplier to company:", error);
      res.status(500).json({
        success: false,
        message: "Error linking supplier to company",
        error: error.message,
      });
    }
  },

  // ✅ NEW: Get suppliers with linked companies
  async getSuppliersWithLinkedCompanies(req, res) {
    try {
      const {page = 1, limit = 10, search = ""} = req.query;

      const userId = req.user?.id || req.user?._id;
      const companyId = req.user?.currentCompany || req.headers["x-company-id"];

      if (!userId || !companyId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const filters = {};
      if (search) {
        filters.$or = [
          {name: {$regex: search, $options: "i"}},
          {companyName: {$regex: search, $options: "i"}},
          {phoneNumber: {$regex: search, $options: "i"}},
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const suppliers = await Party.findSuppliersWithLinkedCompanies(
        new mongoose.Types.ObjectId(companyId),
        filters
      )
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await Party.countDocuments({
        companyId: new mongoose.Types.ObjectId(companyId),
        partyType: "supplier",
        isLinkedSupplier: true,
        linkedCompanyId: {$exists: true, $ne: null},
        isActive: true,
        ...filters,
      });

      res.json({
        success: true,
        message: "Linked suppliers retrieved successfully",
        data: {
          suppliers,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            hasNextPage: parseInt(page) < Math.ceil(total / parseInt(limit)),
            hasPrevPage: parseInt(page) > 1,
          },
        },
      });
    } catch (error) {
      console.error("❌ Error getting linked suppliers:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving linked suppliers",
        error: error.message,
      });
    }
  },

  async createQuickParty(req, res) {
    try {
      const {name, phone, type = "customer"} = req.body;

      const userId = req.user?.id || req.user?._id;
      const companyId =
        req.user?.currentCompany ||
        req.body.companyId ||
        req.headers["x-company-id"] ||
        req.query.companyId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User authentication required",
        });
      }

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company selection required",
        });
      }

      if (!name?.trim() || !phone?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name and phone number are required",
        });
      }

      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(phone.trim())) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide a valid 10-digit phone number starting with 6, 7, 8, or 9",
        });
      }

      const userObjectId = new mongoose.Types.ObjectId(userId);
      const companyObjectId = new mongoose.Types.ObjectId(companyId);

      const existingParty = await Party.findOne({
        phoneNumber: phone.trim(),
        companyId: companyObjectId,
        isActive: true,
      });

      if (existingParty) {
        return res.status(400).json({
          success: false,
          message: `A party with phone number ${phone.trim()} already exists in this company`,
        });
      }

      const quickPartyData = {
        partyType: type,
        name: name.trim(),
        phoneNumber: phone.trim(),
        email: "",
        companyName: "",
        gstNumber: "",
        gstType: "unregistered",
        creditLimit: 0,
        openingBalance: 0,
        country: "INDIA",
        homeAddress: {
          addressLine: "",
          pincode: "",
          state: "",
          district: "",
          taluka: "",
        },
        deliveryAddress: {
          addressLine: "",
          pincode: "",
          state: "",
          district: "",
          taluka: "",
        },
        sameAsHomeAddress: false,
        phoneNumbers: [{number: phone.trim(), label: "Primary"}],
        userId: userObjectId,
        companyId: companyObjectId,
        createdBy: userObjectId,
      };

      const newParty = new Party(quickPartyData);
      await newParty.save();

      res.status(201).json({
        success: true,
        message: "Quick party created successfully",
        data: newParty,
      });
    } catch (error) {
      if (error.name === "ValidationError") {
        const validationErrors = Object.values(error.errors).map(
          (err) => err.message
        );
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationErrors,
        });
      }

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message:
            "A party with this phone number already exists in this company",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error creating quick party",
        error: error.message,
      });
    }
  },

  async checkPhoneExists(req, res) {
    try {
      const {phoneNumber} = req.params;
      const companyId =
        req.user?.currentCompany ||
        req.headers["x-company-id"] ||
        req.query.companyId;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      if (!phoneNumber?.trim()) {
        return res.json({
          success: true,
          exists: false,
          party: null,
        });
      }

      const companyObjectId = new mongoose.Types.ObjectId(companyId);

      const existingParty = await Party.findOne({
        phoneNumber: phoneNumber.trim(),
        companyId: companyObjectId,
        isActive: true,
      }).select("name partyType phoneNumber");

      res.json({
        success: true,
        exists: !!existingParty,
        party: existingParty
          ? {
              id: existingParty._id,
              name: existingParty.name,
              partyType: existingParty.partyType,
              phoneNumber: existingParty.phoneNumber,
            }
          : null,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error checking phone number",
        error: error.message,
      });
    }
  },

  async getAllParties(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        type = "all",
        sortBy = "createdAt",
        sortOrder = "desc",
        includeLinked = false,
        includeChatFields = false,
        includeCompanyData = false,
        populateLinkedCompany = false,
        showAllParties = false, // ✅ NEW: Parameter to show all parties
      } = req.query;

      const userId = req.user?.id || req.user?._id;
      const companyId =
        req.user?.currentCompany ||
        req.body.companyId ||
        req.headers["x-company-id"] ||
        req.query.companyId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User authentication required",
        });
      }

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company selection required",
        });
      }

      const companyObjectId =
        typeof companyId === "string"
          ? new mongoose.Types.ObjectId(companyId)
          : companyId;

      // ✅ FIXED: Base filter - show ALL parties for this company
      const filter = {
        isActive: true,
        companyId: companyObjectId,
      };

      // ✅ FIXED: Only add search filters if provided
      if (search && search.trim()) {
        filter.$or = [
          {name: {$regex: search.trim(), $options: "i"}},
          {phoneNumber: {$regex: search.trim(), $options: "i"}},
          {email: {$regex: search.trim(), $options: "i"}},
          {companyName: {$regex: search.trim(), $options: "i"}},
          {gstNumber: {$regex: search.trim(), $options: "i"}},
        ];
      }

      // ✅ FIXED: Only filter by party type if specified
      if (type && type !== "all") {
        filter.partyType = type;
      }

      // ✅ FIXED: Only filter for linked companies if explicitly requested
      if (includeLinked === "true") {
        filter.isLinkedSupplier = true;
        filter.linkedCompanyId = {$exists: true, $ne: null};
      }

      const sort = {};
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      console.log("🔄 Fetching parties with filter:", {
        filter,
        sort,
        skip,
        limit: parseInt(limit),
        includeLinked: includeLinked === "true",
        populateLinkedCompany: populateLinkedCompany === "true",
        showAllParties: showAllParties === "true",
      });

      // ✅ FIXED: Always populate linked company information (will be null for unlinked parties)
      const parties = await Party.find(filter)
        .populate(
          "linkedCompanyId",
          "businessName gstin phoneNumber email isActive website businessType"
        )
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await Party.countDocuments(filter);

      // ✅ FIXED: Process ALL parties and add comprehensive linking information
      const partiesWithLinkingInfo = parties.map((party) => {
        const enhanced = {
          ...party,
          // ✅ FIXED: Chat capability based on any type of company linking
          canChat: !!(party.linkedCompanyId || party.externalCompanyId),
          chatCompanyId:
            party.linkedCompanyId?._id || party.externalCompanyId || null,
          chatCompanyName: party.linkedCompanyId?.businessName || null,
          bidirectionalOrderReady: !!(
            party.linkedCompanyId &&
            party.isLinkedSupplier &&
            party.enableBidirectionalOrders &&
            party.partyType === "supplier"
          ),
          // ✅ NEW: Enhanced linking status
          linkingStatus: party.linkedCompanyId
            ? "linked"
            : party.externalCompanyId
            ? "external"
            : "unlinked",
          hasLinkedCompany: !!party.linkedCompanyId,
          hasExternalCompany: !!party.externalCompanyId,
          isUnlinked: !party.linkedCompanyId && !party.externalCompanyId,
        };

        return enhanced;
      });

      // ✅ FIXED: Comprehensive statistics for all party types
      const linkedParties = partiesWithLinkingInfo.filter(
        (p) => p.linkedCompanyId
      );
      const externalParties = partiesWithLinkingInfo.filter(
        (p) => p.externalCompanyId && !p.linkedCompanyId
      );
      const unlinkedParties = partiesWithLinkingInfo.filter(
        (p) => !p.linkedCompanyId && !p.externalCompanyId
      );
      const chatEnabledParties = partiesWithLinkingInfo.filter(
        (p) => p.canChat
      );

      console.log(`✅ Retrieved ALL parties with comprehensive linking info:`, {
        total: partiesWithLinkingInfo.length,
        breakdown: {
          linked: linkedParties.length,
          external: externalParties.length,
          unlinked: unlinkedParties.length,
          chatEnabled: chatEnabledParties.length,
        },
        partyTypes: {
          customers: partiesWithLinkingInfo.filter(
            (p) => p.partyType === "customer"
          ).length,
          suppliers: partiesWithLinkingInfo.filter(
            (p) => p.partyType === "supplier"
          ).length,
          vendors: partiesWithLinkingInfo.filter(
            (p) => p.partyType === "vendor"
          ).length,
        },
        filter: filter,
      });

      res.json({
        success: true,
        message: "Parties retrieved successfully",
        data: {
          parties: partiesWithLinkingInfo,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            hasNextPage: parseInt(page) < Math.ceil(total / parseInt(limit)),
            hasPrevPage: parseInt(page) > 1,
          },
          // ✅ NEW: Enhanced summary information
          summary: {
            total: partiesWithLinkingInfo.length,
            linked: linkedParties.length,
            external: externalParties.length,
            unlinked: unlinkedParties.length,
            chatEnabled: chatEnabledParties.length,
            byType: {
              customers: partiesWithLinkingInfo.filter(
                (p) => p.partyType === "customer"
              ).length,
              suppliers: partiesWithLinkingInfo.filter(
                (p) => p.partyType === "supplier"
              ).length,
              vendors: partiesWithLinkingInfo.filter(
                (p) => p.partyType === "vendor"
              ).length,
            },
            linking: {
              linkedSuppliers: linkedParties.filter(
                (p) => p.partyType === "supplier"
              ).length,
              bidirectionalReady: partiesWithLinkingInfo.filter(
                (p) => p.bidirectionalOrderReady
              ).length,
              chatCapable: chatEnabledParties.length,
            },
          },
        },
      });
    } catch (error) {
      console.error("❌ Error fetching parties:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching parties",
        error: error.message,
      });
    }
  },
  // ✅ FIXED: getPartyById method
  async getPartyById(req, res) {
    try {
      const {id} = req.params;
      const {includeChatFields} = req.query;

      const userId = req.user?.id || req.user?._id;
      const companyId =
        req.user?.currentCompany ||
        req.headers["x-company-id"] ||
        req.query.companyId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User authentication required",
        });
      }

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company selection required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid party ID format",
        });
      }

      const companyObjectId =
        typeof companyId === "string"
          ? new mongoose.Types.ObjectId(companyId)
          : companyId;

      // ✅ FIXED: Always populate linkedCompanyId field
      const party = await Party.findOne({
        _id: id,
        companyId: companyObjectId,
        isActive: true,
      })
        .populate(
          "linkedCompanyId",
          "businessName gstin phoneNumber email isActive"
        )
        .lean(); // Use lean() for better performance

      if (!party) {
        return res.status(404).json({
          success: false,
          message: "Party not found",
        });
      }

      // ✅ FIXED: Enhance with chat capability info
      const enhancedParty = {
        ...party,
        canChat: !!(party.linkedCompanyId || party.externalCompanyId),
        chatCompanyId: party.linkedCompanyId?._id || party.externalCompanyId,
        chatCompanyName: party.linkedCompanyId?.businessName || party.name,
        bidirectionalOrderReady: !!(
          party.linkedCompanyId &&
          party.isLinkedSupplier &&
          party.enableBidirectionalOrders &&
          party.partyType === "supplier"
        ),
      };

      console.log("✅ Party retrieved with linking info:", {
        partyId: party._id,
        partyName: party.name,
        linkedCompanyId: party.linkedCompanyId?._id,
        linkedCompanyName: party.linkedCompanyId?.businessName,
        canChat: enhancedParty.canChat,
        chatCompanyId: enhancedParty.chatCompanyId,
      });

      res.json({
        success: true,
        message: "Party retrieved successfully",
        data: enhancedParty,
      });
    } catch (error) {
      console.error("❌ Error fetching party:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching party",
        error: error.message,
      });
    }
  },

  async deleteParty(req, res) {
    try {
      const {id} = req.params;

      const userId = req.user?.id || req.user?._id;
      const companyId =
        req.user?.currentCompany ||
        req.headers["x-company-id"] ||
        req.query.companyId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User authentication required",
        });
      }

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company selection required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid party ID format",
        });
      }

      const companyObjectId =
        typeof companyId === "string"
          ? new mongoose.Types.ObjectId(companyId)
          : companyId;

      const party = await Party.findOneAndUpdate(
        {
          _id: id,
          companyId: companyObjectId,
          isActive: true,
        },
        {
          isActive: false,
          updatedAt: new Date(),
          deletedBy: new mongoose.Types.ObjectId(userId),
          deletedAt: new Date(),
        },
        {new: true}
      );

      if (!party) {
        return res.status(404).json({
          success: false,
          message: "Party not found",
        });
      }

      res.json({
        success: true,
        message: "Party deleted successfully",
        data: null,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error deleting party",
        error: error.message,
      });
    }
  },

  async searchParties(req, res) {
    try {
      const {query} = req.params;
      const {type, limit = 10} = req.query;

      const userId = req.user?.id || req.user?._id;
      const companyId =
        req.user?.currentCompany ||
        req.headers["x-company-id"] ||
        req.query.companyId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User authentication required",
        });
      }

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company selection required",
        });
      }

      if (!query || query.length < 2) {
        return res.json({
          success: true,
          message: "Search query too short",
          data: [],
        });
      }

      const companyObjectId =
        typeof companyId === "string"
          ? new mongoose.Types.ObjectId(companyId)
          : companyId;

      const filter = {
        isActive: true,
        companyId: companyObjectId,
        $or: [
          {name: {$regex: query, $options: "i"}},
          {phoneNumber: {$regex: query, $options: "i"}},
          {companyName: {$regex: query, $options: "i"}},
          {email: {$regex: query, $options: "i"}},
          {gstNumber: {$regex: query, $options: "i"}},
        ],
      };

      if (type && type !== "all") {
        filter.partyType = type;
      }

      const parties = await Party.find(filter)
        .select(
          "name phoneNumber email companyName partyType currentBalance gstNumber gstType creditLimit isLinkedSupplier linkedCompanyId enableBidirectionalOrders"
        )
        .populate("linkedCompanyId", "businessName")
        .limit(parseInt(limit))
        .lean();

      res.json({
        success: true,
        message: "Search results retrieved successfully",
        data: parties,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error searching parties",
        error: error.message,
      });
    }
  },

  async getPartyStats(req, res) {
    try {
      const userId = req.user?.id || req.user?._id;
      const companyId =
        req.user?.currentCompany ||
        req.headers["x-company-id"] ||
        req.query.companyId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User authentication required",
        });
      }

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company selection required",
        });
      }

      const companyObjectId =
        typeof companyId === "string"
          ? new mongoose.Types.ObjectId(companyId)
          : companyId;

      const stats = await Party.aggregate([
        {
          $match: {
            companyId: companyObjectId,
            isActive: true,
          },
        },
        {
          $group: {
            _id: "$partyType",
            count: {$sum: 1},
            totalBalance: {$sum: "$currentBalance"},
            totalCreditLimit: {$sum: "$creditLimit"},
            totalOpeningBalance: {$sum: "$openingBalance"},
            totalReceivable: {
              $sum: {
                $cond: [{$gt: ["$currentBalance", 0]}, "$currentBalance", 0],
              },
            },
            totalPayable: {
              $sum: {
                $cond: [
                  {$lt: ["$currentBalance", 0]},
                  {$abs: "$currentBalance"},
                  0,
                ],
              },
            },
            registeredParties: {
              $sum: {
                $cond: [{$ne: ["$gstType", "unregistered"]}, 1, 0],
              },
            },
            // ✅ NEW: Linked supplier stats
            linkedSuppliers: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {$eq: ["$partyType", "supplier"]},
                      {$eq: ["$isLinkedSupplier", true]},
                      {$ne: ["$linkedCompanyId", null]},
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            bidirectionalReadySuppliers: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {$eq: ["$partyType", "supplier"]},
                      {$eq: ["$isLinkedSupplier", true]},
                      {$eq: ["$enableBidirectionalOrders", true]},
                      {$ne: ["$linkedCompanyId", null]},
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

      const formattedStats = {
        totalParties: 0,
        customers: {
          count: 0,
          receivable: 0,
          creditLimit: 0,
          registeredCount: 0,
        },
        vendors: {
          count: 0,
          payable: 0,
          creditLimit: 0,
          registeredCount: 0,
        },
        suppliers: {
          count: 0,
          payable: 0,
          creditLimit: 0,
          registeredCount: 0,
          linkedCount: 0, // ✅ NEW
          bidirectionalReadyCount: 0, // ✅ NEW
        },
        totalReceivable: 0,
        totalPayable: 0,
        totalCreditLimit: 0,
        totalRegisteredParties: 0,
        totalLinkedSuppliers: 0, // ✅ NEW
        totalBidirectionalReadySuppliers: 0, // ✅ NEW
        netBalance: 0,
      };

      stats.forEach((stat) => {
        formattedStats.totalParties += stat.count;
        formattedStats.totalCreditLimit += stat.totalCreditLimit;
        formattedStats.totalRegisteredParties += stat.registeredParties;
        formattedStats.totalLinkedSuppliers += stat.linkedSuppliers; // ✅ NEW
        formattedStats.totalBidirectionalReadySuppliers +=
          stat.bidirectionalReadySuppliers; // ✅ NEW

        if (stat._id === "customer") {
          formattedStats.customers.count = stat.count;
          formattedStats.customers.receivable = stat.totalReceivable;
          formattedStats.customers.creditLimit = stat.totalCreditLimit;
          formattedStats.customers.registeredCount = stat.registeredParties;
          formattedStats.totalReceivable += stat.totalReceivable;
        } else if (stat._id === "vendor") {
          formattedStats.vendors.count += stat.count;
          formattedStats.vendors.payable += stat.totalPayable;
          formattedStats.vendors.creditLimit += stat.totalCreditLimit;
          formattedStats.vendors.registeredCount += stat.registeredParties;
          formattedStats.totalPayable += stat.totalPayable;
        } else if (stat._id === "supplier") {
          formattedStats.suppliers.count += stat.count;
          formattedStats.suppliers.payable += stat.totalPayable;
          formattedStats.suppliers.creditLimit += stat.totalCreditLimit;
          formattedStats.suppliers.registeredCount += stat.registeredParties;
          formattedStats.suppliers.linkedCount += stat.linkedSuppliers; // ✅ NEW
          formattedStats.suppliers.bidirectionalReadyCount +=
            stat.bidirectionalReadySuppliers; // ✅ NEW
          formattedStats.totalPayable += stat.totalPayable;
        }
      });

      formattedStats.netBalance =
        formattedStats.totalReceivable - formattedStats.totalPayable;

      res.json({
        success: true,
        message: "Party statistics retrieved successfully",
        data: formattedStats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching party statistics",
        error: error.message,
      });
    }
  },

  async searchPartiesGet(req, res) {
    try {
      const {
        search,
        type,
        limit = 20,
        page = 1,
        includeLinked = false,
      } = req.query;

      const userId = req.user?.id || req.user?._id;
      const companyId =
        req.user?.currentCompany ||
        req.headers["x-company-id"] ||
        req.query.companyId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User authentication required",
        });
      }

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company selection required",
        });
      }

      if (!search || search.length < 2) {
        return res.json({
          success: true,
          message: "Search query too short",
          data: [],
        });
      }

      const companyObjectId =
        typeof companyId === "string"
          ? new mongoose.Types.ObjectId(companyId)
          : companyId;

      const filter = {
        isActive: true,
        companyId: companyObjectId,
        $or: [
          {name: {$regex: search, $options: "i"}},
          {phoneNumber: {$regex: search, $options: "i"}},
          {companyName: {$regex: search, $options: "i"}},
          {email: {$regex: search, $options: "i"}},
          {gstNumber: {$regex: search, $options: "i"}},
          {"homeAddress.state": {$regex: search, $options: "i"}},
          {"homeAddress.district": {$regex: search, $options: "i"}},
        ],
      };

      if (type && type !== "all") {
        filter.partyType = type;
      }

      // ✅ NEW: Filter for linked suppliers only
      if (includeLinked === "true") {
        filter.isLinkedSupplier = true;
        filter.linkedCompanyId = {$exists: true, $ne: null};
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const parties = await Party.find(filter)
        .select(
          "name phoneNumber email companyName partyType currentBalance gstNumber gstType creditLimit homeAddress deliveryAddress createdAt businessType website openingBalance isLinkedSupplier linkedCompanyId enableBidirectionalOrders"
        )
        .populate("linkedCompanyId", "businessName gstin phoneNumber email")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({createdAt: -1})
        .lean();

      // ✅ NEW: Add bidirectional order readiness info
      const partiesWithLinkingInfo = parties.map((party) => ({
        ...party,
        bidirectionalOrderReady: !!(
          party.linkedCompanyId &&
          party.isLinkedSupplier &&
          party.enableBidirectionalOrders &&
          party.partyType === "supplier"
        ),
      }));

      res.json({
        success: true,
        message: "Search results retrieved successfully",
        data: partiesWithLinkingInfo,
      });
    } catch (error) {
      console.error("❌ Error searching parties:", error);
      res.status(500).json({
        success: false,
        message: "Error searching parties",
        error: error.message,
      });
    }
  },

  async searchExternalDatabase(req, res) {
    try {
      const {query, filter, source, limit = 10} = req.body;

      const userId = req.user?.id || req.user?._id;
      const companyId =
        req.user?.currentCompany ||
        req.body.companyId ||
        req.headers["x-company-id"];

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User authentication required",
        });
      }

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company selection required",
        });
      }

      if (!query || query.length < 2) {
        return res.json({
          success: true,
          message: "Search query too short",
          data: [],
        });
      }

      console.log("🌐 External database search requested:", {
        query,
        filter,
        source,
      });

      // TODO: Integrate with actual external APIs:
      // - Government business registry APIs (MCA, GSTIN lookup)
      // - Trade directory APIs
      // - Verified business listing APIs
      // - Industry-specific databases

      // For now, return empty results with a message
      res.json({
        success: true,
        message: "External database integration pending",
        data: [],
      });
    } catch (error) {
      console.error("❌ Error searching external database:", error);
      res.status(500).json({
        success: false,
        message: "External database search failed",
        error: error.message,
      });
    }
  },

  async searchCompanies(req, res) {
    try {
      const {q: query, limit = 10} = req.query;

      const userId = req.user?.id || req.user?._id;
      const companyId =
        req.user?.currentCompany ||
        req.headers["x-company-id"] ||
        req.query.companyId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User authentication required",
        });
      }

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company selection required",
        });
      }

      if (!query || query.length < 2) {
        return res.json({
          success: true,
          message: "Search query too short",
          data: [],
        });
      }

      const companyObjectId =
        typeof companyId === "string"
          ? new mongoose.Types.ObjectId(companyId)
          : companyId;

      // Search for unique company names from existing parties
      const companies = await Party.aggregate([
        {
          $match: {
            companyId: companyObjectId,
            isActive: true,
            companyName: {
              $regex: query,
              $options: "i",
              $ne: "",
            },
          },
        },
        {
          $group: {
            _id: "$companyName",
            count: {$sum: 1},
            sample: {$first: "$$ROOT"},
          },
        },
        {
          $project: {
            companyName: "$_id",
            count: 1,
            gstNumber: "$sample.gstNumber",
            address: "$sample.homeAddress",
          },
        },
        {
          $sort: {count: -1},
        },
        {
          $limit: parseInt(limit),
        },
      ]);

      res.json({
        success: true,
        message: "Company search results retrieved successfully",
        data: companies,
      });
    } catch (error) {
      console.error("❌ Error searching companies:", error);
      res.status(500).json({
        success: false,
        message: "Error searching companies",
        error: error.message,
      });
    }
  },
};

module.exports = partyController;
