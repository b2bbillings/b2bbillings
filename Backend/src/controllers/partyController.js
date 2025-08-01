const Party = require("../models/Party");
const Company = require("../models/Company");
const mongoose = require("mongoose");
const logger = require("../config/logger");
const {createAuditLog} = require("../utils/auditLogger");
const {sanitizeInput, validateInput} = require("../utils/validation");

const partyController = {
  async createParty(req, res) {
    const startTime = Date.now();
    const clientIp = req.ip || req.connection.remoteAddress;

    try {
      const sanitizedBody = sanitizeInput(req.body);

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
      } = sanitizedBody;

      const userId = req.user?.id || req.user?._id;
      const companyId =
        req.user?.currentCompany ||
        req.body.companyId ||
        req.headers["x-company-id"] ||
        req.query.companyId;

      const validationErrors = validateInput(
        {
          name,
          phoneNumber,
          email: email || "",
          partyType,
          creditLimit,
          openingBalance,
        },
        {
          name: {required: true, minLength: 2, maxLength: 100},
          phoneNumber: {required: true, phoneNumber: true},
          email: {email: true},
          partyType: {required: true},
          creditLimit: {required: false, min: 0},
          openingBalance: {required: false, min: 0},
        }
      );

      if (validationErrors.length > 0) {
        logger.warn("Party creation validation failed", {
          errors: validationErrors,
          userId,
          companyId,
          ip: clientIp,
        });

        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationErrors,
          code: "VALIDATION_ERROR",
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User authentication required",
          code: "AUTHENTICATION_REQUIRED",
        });
      }

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company selection required",
          code: "COMPANY_REQUIRED",
        });
      }

      if (!name?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Party name is required",
          code: "NAME_REQUIRED",
        });
      }

      if (!phoneNumber?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Phone number is required",
          code: "PHONE_REQUIRED",
        });
      }

      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(phoneNumber.trim())) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide a valid 10-digit phone number starting with 6, 7, 8, or 9",
          code: "INVALID_PHONE_FORMAT",
        });
      }

      if (email?.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          return res.status(400).json({
            success: false,
            message: "Please provide a valid email address",
            code: "INVALID_EMAIL_FORMAT",
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
            code: "INVALID_GST_FORMAT",
          });
        }
      }

      if (creditLimit < 0) {
        return res.status(400).json({
          success: false,
          message: "Credit limit cannot be negative",
          code: "NEGATIVE_CREDIT_LIMIT",
        });
      }

      if (openingBalance < 0) {
        return res.status(400).json({
          success: false,
          message: "Opening balance cannot be negative",
          code: "NEGATIVE_OPENING_BALANCE",
        });
      }

      const userObjectId = new mongoose.Types.ObjectId(userId);
      const companyObjectId = new mongoose.Types.ObjectId(companyId);

      let linkedCompanyObjectId = null;
      if (linkedCompanyId) {
        if (!mongoose.Types.ObjectId.isValid(linkedCompanyId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid linked company ID format",
            code: "INVALID_LINKED_COMPANY_ID",
          });
        }

        linkedCompanyObjectId = new mongoose.Types.ObjectId(linkedCompanyId);
        const linkedCompany = await Company.findById(linkedCompanyObjectId);

        if (!linkedCompany) {
          return res.status(400).json({
            success: false,
            message: "Linked company not found",
            code: "LINKED_COMPANY_NOT_FOUND",
          });
        }

        if (linkedCompanyObjectId.toString() === companyObjectId.toString()) {
          return res.status(400).json({
            success: false,
            message: "Cannot link party to their own company",
            code: "SELF_LINKING_NOT_ALLOWED",
          });
        }
      }

      const existingParty = await Party.findOne({
        phoneNumber: phoneNumber.trim(),
        companyId: companyObjectId,
        isActive: true,
      });

      if (existingParty) {
        logger.warn("Duplicate party creation attempt", {
          phoneNumber: phoneNumber.trim(),
          existingPartyId: existingParty._id,
          userId,
          companyId,
          ip: clientIp,
        });

        return res.status(400).json({
          success: false,
          message: `A party with phone number ${phoneNumber.trim()} already exists in this company`,
          code: "DUPLICATE_PHONE_NUMBER",
          existingPartyId: existingParty._id,
        });
      }

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

      const newParty = new Party(partyData);
      await newParty.save();

      await createAuditLog({
        userId: userObjectId,
        action: "PARTY_CREATED",
        resourceType: "Party",
        resourceId: newParty._id,
        details: {
          partyType: newParty.partyType,
          name: newParty.name,
          phoneNumber: newParty.phoneNumber,
          companyName: newParty.companyName,
          linkedCompanyId: newParty.linkedCompanyId,
          isLinkedSupplier: newParty.isLinkedSupplier,
          createdAt: new Date(),
        },
        severity: "low",
        ipAddress: clientIp,
        userAgent: req.get("User-Agent"),
        companyId: companyObjectId,
      });

      const linkingInfo = {
        hasLinkedCompany: !!newParty.linkedCompanyId,
        bidirectionalOrdersReady: newParty.isBidirectionalOrderReady
          ? newParty.isBidirectionalOrderReady()
          : false,
        linkedCompanyId: newParty.linkedCompanyId,
        autoLinkingEnabled: {
          byGST: newParty.autoLinkByGST,
          byPhone: newParty.autoLinkByPhone,
          byEmail: newParty.autoLinkByEmail,
        },
      };

      logger.info("Party created successfully", {
        partyId: newParty._id,
        partyName: newParty.name,
        partyType: newParty.partyType,
        linkedCompanyId: newParty.linkedCompanyId,
        bidirectionalOrdersReady: linkingInfo.bidirectionalOrdersReady,
        userId,
        companyId,
        responseTime: Date.now() - startTime,
        ip: clientIp,
      });

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
        metadata: {
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
        },
      });
    } catch (error) {
      logger.error("Party creation failed", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        companyId: req.user?.currentCompany || req.headers["x-company-id"],
        requestBody: {...req.body, phoneNumber: "[REDACTED]"},
        ip: clientIp,
        responseTime: Date.now() - startTime,
      });

      if (req.user?.id) {
        await createAuditLog({
          userId: req.user.id,
          action: "PARTY_CREATION_FAILED",
          details: {
            error: error.message,
            partyName: req.body.name,
            partyType: req.body.partyType,
          },
          severity: "medium",
          ipAddress: clientIp,
          companyId: req.user?.currentCompany || req.headers["x-company-id"],
        });
      }

      if (error.name === "ValidationError") {
        const validationErrors = Object.values(error.errors).map((err) => ({
          field: err.path,
          message: err.message,
          value: err.value,
        }));

        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationErrors,
          code: "MONGOOSE_VALIDATION_ERROR",
        });
      }

      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({
          success: false,
          message: `Duplicate ${field}: A party with this ${field} already exists`,
          code: "DUPLICATE_ENTRY",
          field,
        });
      }

      res.status(500).json({
        success: false,
        message: "Error creating party",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  },

  async updateParty(req, res) {
    const startTime = Date.now();
    const clientIp = req.ip || req.connection.remoteAddress;

    try {
      const {id} = req.params;
      const sanitizedUpdateData = sanitizeInput(req.body);

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
          code: "AUTHENTICATION_REQUIRED",
        });
      }

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company selection required",
          code: "COMPANY_REQUIRED",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid party ID format",
          code: "INVALID_PARTY_ID",
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
          code: "PARTY_NOT_FOUND",
        });
      }

      const changes = {};
      Object.keys(sanitizedUpdateData).forEach((key) => {
        if (sanitizedUpdateData[key] !== existingParty[key]) {
          changes[key] = {
            old: existingParty[key],
            new: sanitizedUpdateData[key],
          };
        }
      });

      if (sanitizedUpdateData.linkedCompanyId) {
        if (
          !mongoose.Types.ObjectId.isValid(sanitizedUpdateData.linkedCompanyId)
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid linked company ID format",
            code: "INVALID_LINKED_COMPANY_ID",
          });
        }

        const linkedCompanyObjectId = new mongoose.Types.ObjectId(
          sanitizedUpdateData.linkedCompanyId
        );
        const linkedCompany = await Company.findById(linkedCompanyObjectId);

        if (!linkedCompany) {
          return res.status(400).json({
            success: false,
            message: "Linked company not found",
            code: "LINKED_COMPANY_NOT_FOUND",
          });
        }

        if (linkedCompanyObjectId.toString() === companyObjectId.toString()) {
          return res.status(400).json({
            success: false,
            message: "Cannot link party to their own company",
            code: "SELF_LINKING_NOT_ALLOWED",
          });
        }

        sanitizedUpdateData.linkedCompanyId = linkedCompanyObjectId;
      }

      if (
        sanitizedUpdateData.phoneNumber &&
        sanitizedUpdateData.phoneNumber !== existingParty.phoneNumber
      ) {
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(sanitizedUpdateData.phoneNumber.trim())) {
          return res.status(400).json({
            success: false,
            message:
              "Please provide a valid 10-digit phone number starting with 6, 7, 8, or 9",
            code: "INVALID_PHONE_FORMAT",
          });
        }

        const phoneConflict = await Party.findOne({
          phoneNumber: sanitizedUpdateData.phoneNumber,
          companyId: companyObjectId,
          _id: {$ne: id},
          isActive: true,
        });

        if (phoneConflict) {
          return res.status(400).json({
            success: false,
            message:
              "A party with this phone number already exists in this company",
            code: "DUPLICATE_PHONE_NUMBER",
          });
        }
      }

      if (sanitizedUpdateData.email?.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitizedUpdateData.email.trim())) {
          return res.status(400).json({
            success: false,
            message: "Please provide a valid email address",
            code: "INVALID_EMAIL_FORMAT",
          });
        }
      }

      if (
        sanitizedUpdateData.gstNumber?.trim() &&
        sanitizedUpdateData.gstType !== "unregistered"
      ) {
        const gstRegex =
          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (
          !gstRegex.test(sanitizedUpdateData.gstNumber.trim().toUpperCase())
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Please provide a valid GST number format (e.g., 22AAAAA0000A1Z5)",
            code: "INVALID_GST_FORMAT",
          });
        }
      }

      if (
        sanitizedUpdateData.creditLimit !== undefined &&
        sanitizedUpdateData.creditLimit < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Credit limit cannot be negative",
          code: "NEGATIVE_CREDIT_LIMIT",
        });
      }

      if (
        sanitizedUpdateData.openingBalance !== undefined &&
        sanitizedUpdateData.openingBalance < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Opening balance cannot be negative",
          code: "NEGATIVE_OPENING_BALANCE",
        });
      }

      const updatedPartyData = {
        ...sanitizedUpdateData,
        updatedAt: new Date(),
        updatedBy: new mongoose.Types.ObjectId(userId),
      };

      if (sanitizedUpdateData.homeAddressLine !== undefined) {
        updatedPartyData.homeAddress = {
          addressLine: sanitizedUpdateData.homeAddressLine || "",
          pincode: sanitizedUpdateData.homePincode || "",
          state: sanitizedUpdateData.homeState || "",
          district: sanitizedUpdateData.homeDistrict || "",
          taluka: sanitizedUpdateData.homeTaluka || "",
        };
      }

      if (sanitizedUpdateData.sameAsHomeAddress) {
        updatedPartyData.deliveryAddress = updatedPartyData.homeAddress;
      } else if (sanitizedUpdateData.deliveryAddressLine !== undefined) {
        updatedPartyData.deliveryAddress = {
          addressLine: sanitizedUpdateData.deliveryAddressLine || "",
          pincode: sanitizedUpdateData.deliveryPincode || "",
          state: sanitizedUpdateData.deliveryState || "",
          district: sanitizedUpdateData.deliveryDistrict || "",
          taluka: sanitizedUpdateData.deliveryTaluka || "",
        };
      }

      if (sanitizedUpdateData.gstType === "unregistered") {
        updatedPartyData.gstNumber = "";
      } else if (sanitizedUpdateData.gstNumber) {
        updatedPartyData.gstNumber = sanitizedUpdateData.gstNumber
          .trim()
          .toUpperCase();
      }

      if (
        sanitizedUpdateData.linkedCompanyId &&
        sanitizedUpdateData.partyType === "supplier"
      ) {
        updatedPartyData.isLinkedSupplier = true;
        if (updatedPartyData.enableBidirectionalOrders === undefined) {
          updatedPartyData.enableBidirectionalOrders = true;
        }
      }

      if (sanitizedUpdateData.incorporationDate) {
        updatedPartyData.incorporationDate = new Date(
          sanitizedUpdateData.incorporationDate
        );
      }
      if (sanitizedUpdateData.importedAt) {
        updatedPartyData.importedAt = new Date(sanitizedUpdateData.importedAt);
      }

      Object.keys(updatedPartyData).forEach((key) => {
        if (updatedPartyData[key] === undefined) {
          delete updatedPartyData[key];
        }
      });

      const updatedParty = await Party.findByIdAndUpdate(id, updatedPartyData, {
        new: true,
        runValidators: true,
      });

      await createAuditLog({
        userId: new mongoose.Types.ObjectId(userId),
        action: "PARTY_UPDATED",
        resourceType: "Party",
        resourceId: updatedParty._id,
        details: {
          changes,
          partyName: updatedParty.name,
          partyType: updatedParty.partyType,
          linkedCompanyId: updatedParty.linkedCompanyId,
          updatedFields: Object.keys(changes),
        },
        severity: "low",
        ipAddress: clientIp,
        userAgent: req.get("User-Agent"),
        companyId: companyObjectId,
      });

      const linkingInfo = {
        hasLinkedCompany: !!updatedParty.linkedCompanyId,
        bidirectionalOrdersReady: updatedParty.isBidirectionalOrderReady
          ? updatedParty.isBidirectionalOrderReady()
          : false,
        linkedCompanyId: updatedParty.linkedCompanyId,
        autoLinkingEnabled: {
          byGST: updatedParty.autoLinkByGST,
          byPhone: updatedParty.autoLinkByPhone,
          byEmail: updatedParty.autoLinkByEmail,
        },
      };

      logger.info("Party updated successfully", {
        partyId: updatedParty._id,
        partyName: updatedParty.name,
        changesCount: Object.keys(changes).length,
        linkedCompanyId: updatedParty.linkedCompanyId,
        bidirectionalOrdersReady: linkingInfo.bidirectionalOrdersReady,
        userId,
        companyId,
        responseTime: Date.now() - startTime,
        ip: clientIp,
      });

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
        metadata: {
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          changesApplied: Object.keys(changes).length,
        },
      });
    } catch (error) {
      logger.error("Party update failed", {
        error: error.message,
        stack: error.stack,
        partyId: req.params.id,
        userId: req.user?.id,
        companyId: req.user?.currentCompany || req.headers["x-company-id"],
        ip: clientIp,
        responseTime: Date.now() - startTime,
      });

      if (req.user?.id) {
        await createAuditLog({
          userId: req.user.id,
          action: "PARTY_UPDATE_FAILED",
          resourceType: "Party",
          resourceId: req.params.id,
          details: {
            error: error.message,
            updateData: Object.keys(req.body),
          },
          severity: "medium",
          ipAddress: clientIp,
          companyId: req.user?.currentCompany || req.headers["x-company-id"],
        });
      }

      if (error.name === "ValidationError") {
        const validationErrors = Object.values(error.errors).map((err) => ({
          field: err.path,
          message: err.message,
          value: err.value,
        }));

        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationErrors,
          code: "MONGOOSE_VALIDATION_ERROR",
        });
      }

      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({
          success: false,
          message: `Duplicate ${field}: A party with this ${field} already exists`,
          code: "DUPLICATE_ENTRY",
          field,
        });
      }

      res.status(500).json({
        success: false,
        message: "Error updating party",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  },

  async linkSupplierToCompany(req, res) {
    const startTime = Date.now();
    const clientIp = req.ip || req.connection.remoteAddress;

    try {
      const {supplierId, companyId: targetCompanyId} = req.body;
      const userId = req.user?.id || req.user?._id;
      const companyId = req.user?.currentCompany || req.headers["x-company-id"];

      if (!userId || !companyId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        });
      }

      if (!supplierId || !targetCompanyId) {
        return res.status(400).json({
          success: false,
          message: "Supplier ID and target company ID are required",
          code: "MISSING_REQUIRED_FIELDS",
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
          code: "SUPPLIER_NOT_FOUND",
        });
      }

      const targetCompany = await Company.findById(targetCompanyId);
      if (!targetCompany) {
        return res.status(404).json({
          success: false,
          message: "Target company not found",
          code: "TARGET_COMPANY_NOT_FOUND",
        });
      }

      if (targetCompanyId === companyId) {
        return res.status(400).json({
          success: false,
          message: "Cannot link supplier to their own company",
          code: "SELF_LINKING_NOT_ALLOWED",
        });
      }

      supplier.linkedCompanyId = targetCompanyId;
      supplier.isLinkedSupplier = true;
      supplier.enableBidirectionalOrders = true;
      supplier.updatedBy = userId;

      await supplier.save();

      await createAuditLog({
        userId: new mongoose.Types.ObjectId(userId),
        action: "SUPPLIER_LINKED_TO_COMPANY",
        resourceType: "Party",
        resourceId: supplier._id,
        details: {
          supplierId,
          targetCompanyId,
          targetCompanyName: targetCompany.businessName,
        },
        severity: "medium",
        ipAddress: clientIp,
        companyId: new mongoose.Types.ObjectId(companyId),
      });

      logger.info("Supplier linked to company successfully", {
        supplierId,
        targetCompanyId,
        userId,
        companyId,
        responseTime: Date.now() - startTime,
      });

      res.json({
        success: true,
        message: "Supplier linked to company successfully",
        data: {
          supplier,
          linkedCompany: targetCompany,
          bidirectionalOrdersReady: supplier.isBidirectionalOrderReady
            ? supplier.isBidirectionalOrderReady()
            : false,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
        },
      });
    } catch (error) {
      logger.error("Error linking supplier to company", {
        error: error.message,
        stack: error.stack,
        supplierId: req.body.supplierId,
        targetCompanyId: req.body.companyId,
        userId: req.user?.id,
        ip: clientIp,
        responseTime: Date.now() - startTime,
      });

      res.status(500).json({
        success: false,
        message: "Error linking supplier to company",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  },

  async getSuppliersWithLinkedCompanies(req, res) {
    const startTime = Date.now();
    const clientIp = req.ip || req.connection.remoteAddress;

    try {
      const {page = 1, limit = 10, search = ""} = req.query;
      const userId = req.user?.id || req.user?._id;
      const companyId = req.user?.currentCompany || req.headers["x-company-id"];

      if (!userId || !companyId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
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

      logger.info("Linked suppliers retrieved successfully", {
        userId,
        companyId,
        totalRetrieved: suppliers.length,
        totalAvailable: total,
        responseTime: Date.now() - startTime,
        ip: clientIp,
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
        metadata: {
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
        },
      });
    } catch (error) {
      logger.error("Error getting linked suppliers", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        companyId: req.user?.currentCompany || req.headers["x-company-id"],
        ip: clientIp,
        responseTime: Date.now() - startTime,
      });

      res.status(500).json({
        success: false,
        message: "Error retrieving linked suppliers",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  },

  async createQuickParty(req, res) {
    const startTime = Date.now();
    const clientIp = req.ip || req.connection.remoteAddress;

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
          code: "AUTHENTICATION_REQUIRED",
        });
      }

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company selection required",
          code: "COMPANY_REQUIRED",
        });
      }

      if (!name?.trim() || !phone?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name and phone number are required",
          code: "MISSING_REQUIRED_FIELDS",
        });
      }

      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(phone.trim())) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide a valid 10-digit phone number starting with 6, 7, 8, or 9",
          code: "INVALID_PHONE_FORMAT",
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
          code: "DUPLICATE_PHONE_NUMBER",
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

      await createAuditLog({
        userId: userObjectId,
        action: "QUICK_PARTY_CREATED",
        resourceType: "Party",
        resourceId: newParty._id,
        details: {
          partyType: newParty.partyType,
          name: newParty.name,
          phoneNumber: newParty.phoneNumber,
        },
        severity: "low",
        ipAddress: clientIp,
        companyId: companyObjectId,
      });

      logger.info("Quick party created successfully", {
        partyId: newParty._id,
        partyName: newParty.name,
        partyType: newParty.partyType,
        userId,
        companyId,
        responseTime: Date.now() - startTime,
        ip: clientIp,
      });

      res.status(201).json({
        success: true,
        message: "Quick party created successfully",
        data: newParty,
        metadata: {
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
        },
      });
    } catch (error) {
      logger.error("Quick party creation failed", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        requestBody: {...req.body, phone: "[REDACTED]"},
        ip: clientIp,
        responseTime: Date.now() - startTime,
      });

      if (error.name === "ValidationError") {
        const validationErrors = Object.values(error.errors).map(
          (err) => err.message
        );
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationErrors,
          code: "VALIDATION_ERROR",
        });
      }

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message:
            "A party with this phone number already exists in this company",
          code: "DUPLICATE_PHONE_NUMBER",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error creating quick party",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
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
          code: "COMPANY_REQUIRED",
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
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error("Error checking phone number", {
        error: error.message,
        phoneNumber: req.params.phoneNumber,
        userId: req.user?.id,
        companyId: req.user?.currentCompany || req.headers["x-company-id"],
      });

      res.status(500).json({
        success: false,
        message: "Error checking phone number",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  },

  async getAllParties(req, res) {
    const startTime = Date.now();
    const clientIp = req.ip || req.connection.remoteAddress;

    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        type = "all",
        sortBy = "createdAt",
        sortOrder = "desc",
        includeLinked = false,
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
          code: "AUTHENTICATION_REQUIRED",
        });
      }

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company selection required",
          code: "COMPANY_REQUIRED",
        });
      }

      const companyObjectId =
        typeof companyId === "string"
          ? new mongoose.Types.ObjectId(companyId)
          : companyId;

      const filter = {
        isActive: true,
        companyId: companyObjectId,
      };

      if (search && search.trim()) {
        filter.$or = [
          {name: {$regex: search.trim(), $options: "i"}},
          {phoneNumber: {$regex: search.trim(), $options: "i"}},
          {email: {$regex: search.trim(), $options: "i"}},
          {companyName: {$regex: search.trim(), $options: "i"}},
          {gstNumber: {$regex: search.trim(), $options: "i"}},
        ];
      }

      if (type && type !== "all") {
        filter.partyType = type;
      }

      if (includeLinked === "true") {
        filter.isLinkedSupplier = true;
        filter.linkedCompanyId = {$exists: true, $ne: null};
      }

      const sort = {};
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;

      const skip = (parseInt(page) - 1) * parseInt(limit);

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

      const partiesWithLinkingInfo = parties.map((party) => ({
        ...party,
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
        linkingStatus: party.linkedCompanyId
          ? "linked"
          : party.externalCompanyId
          ? "external"
          : "unlinked",
        hasLinkedCompany: !!party.linkedCompanyId,
        hasExternalCompany: !!party.externalCompanyId,
        isUnlinked: !party.linkedCompanyId && !party.externalCompanyId,
      }));

      const stats = {
        total: partiesWithLinkingInfo.length,
        linked: partiesWithLinkingInfo.filter((p) => p.linkedCompanyId).length,
        external: partiesWithLinkingInfo.filter(
          (p) => p.externalCompanyId && !p.linkedCompanyId
        ).length,
        unlinked: partiesWithLinkingInfo.filter(
          (p) => !p.linkedCompanyId && !p.externalCompanyId
        ).length,
        chatEnabled: partiesWithLinkingInfo.filter((p) => p.canChat).length,
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
      };

      logger.info("Parties list retrieved successfully", {
        userId,
        companyId,
        totalRetrieved: partiesWithLinkingInfo.length,
        totalAvailable: total,
        stats,
        responseTime: Date.now() - startTime,
        ip: clientIp,
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
          summary: stats,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          version: "2.0.0",
        },
      });
    } catch (error) {
      logger.error("Failed to retrieve parties list", {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        companyId: req.user?.currentCompany || req.headers["x-company-id"],
        query: req.query,
        ip: clientIp,
        responseTime: Date.now() - startTime,
      });

      res.status(500).json({
        success: false,
        message: "Error fetching parties",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  },

  async getPartyById(req, res) {
    const startTime = Date.now();
    const clientIp = req.ip || req.connection.remoteAddress;

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
          code: "AUTHENTICATION_REQUIRED",
        });
      }

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company selection required",
          code: "COMPANY_REQUIRED",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid party ID format",
          code: "INVALID_PARTY_ID",
        });
      }

      const companyObjectId =
        typeof companyId === "string"
          ? new mongoose.Types.ObjectId(companyId)
          : companyId;

      const party = await Party.findOne({
        _id: id,
        companyId: companyObjectId,
        isActive: true,
      })
        .populate(
          "linkedCompanyId",
          "businessName gstin phoneNumber email isActive"
        )
        .lean();

      if (!party) {
        return res.status(404).json({
          success: false,
          message: "Party not found",
          code: "PARTY_NOT_FOUND",
        });
      }

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

      logger.info("Party retrieved successfully", {
        partyId: party._id,
        partyName: party.name,
        linkedCompanyId: party.linkedCompanyId?._id,
        canChat: enhancedParty.canChat,
        userId,
        companyId,
        responseTime: Date.now() - startTime,
        ip: clientIp,
      });

      res.json({
        success: true,
        message: "Party retrieved successfully",
        data: enhancedParty,
        metadata: {
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
        },
      });
    } catch (error) {
      logger.error("Error fetching party", {
        error: error.message,
        stack: error.stack,
        partyId: req.params.id,
        userId: req.user?.id,
        companyId: req.user?.currentCompany || req.headers["x-company-id"],
        ip: clientIp,
        responseTime: Date.now() - startTime,
      });

      res.status(500).json({
        success: false,
        message: "Error fetching party",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  },

  async deleteParty(req, res) {
    const startTime = Date.now();
    const clientIp = req.ip || req.connection.remoteAddress;

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
          code: "AUTHENTICATION_REQUIRED",
        });
      }

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company selection required",
          code: "COMPANY_REQUIRED",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid party ID format",
          code: "INVALID_PARTY_ID",
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
          code: "PARTY_NOT_FOUND",
        });
      }

      await createAuditLog({
        userId: new mongoose.Types.ObjectId(userId),
        action: "PARTY_DELETED",
        resourceType: "Party",
        resourceId: party._id,
        details: {
          partyName: party.name,
          partyType: party.partyType,
          phoneNumber: party.phoneNumber,
        },
        severity: "medium",
        ipAddress: clientIp,
        companyId: companyObjectId,
      });

      logger.info("Party deleted successfully", {
        partyId: party._id,
        partyName: party.name,
        userId,
        companyId,
        responseTime: Date.now() - startTime,
        ip: clientIp,
      });

      res.json({
        success: true,
        message: "Party deleted successfully",
        data: null,
        metadata: {
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
        },
      });
    } catch (error) {
      logger.error("Error deleting party", {
        error: error.message,
        stack: error.stack,
        partyId: req.params.id,
        userId: req.user?.id,
        companyId: req.user?.currentCompany || req.headers["x-company-id"],
        ip: clientIp,
        responseTime: Date.now() - startTime,
      });

      res.status(500).json({
        success: false,
        message: "Error deleting party",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  },

  async searchParties(req, res) {
    const startTime = Date.now();

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
          code: "AUTHENTICATION_REQUIRED",
        });
      }

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company selection required",
          code: "COMPANY_REQUIRED",
        });
      }

      if (!query || query.length < 2) {
        return res.json({
          success: true,
          message: "Search query too short",
          data: [],
          metadata: {
            timestamp: new Date().toISOString(),
          },
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

      logger.info("Party search completed", {
        query,
        resultsCount: parties.length,
        userId,
        companyId,
        responseTime: Date.now() - startTime,
      });

      res.json({
        success: true,
        message: "Search results retrieved successfully",
        data: parties,
        metadata: {
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
        },
      });
    } catch (error) {
      logger.error("Error searching parties", {
        error: error.message,
        stack: error.stack,
        query: req.params.query,
        userId: req.user?.id,
        companyId: req.user?.currentCompany || req.headers["x-company-id"],
        responseTime: Date.now() - startTime,
      });

      res.status(500).json({
        success: false,
        message: "Error searching parties",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
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
