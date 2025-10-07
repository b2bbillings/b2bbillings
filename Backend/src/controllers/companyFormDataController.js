const CompanyFormData = require("../models/CompanyFormData");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

// =============================================================================
// COMPANY FORM DATA CRUD OPERATIONS
// =============================================================================

/**
 * Create new company form data
 */
const createCompanyFormData = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        status: "error",
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        status: "error",
        message: "User authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    const {
      // Basic Information
      companyName,
      displayName,
      legalName,
      logo,
      brandColors,

      // Address Information
      address,

      // Contact Information
      contactInfo,

      // Legal Information
      legalInfo,

      // Financial Information
      financialInfo,

      // Business Information
      businessInfo,

      // Custom Fields
      customFields,

      // Documents
      documents,

      // Key Personnel
      keyPersonnel,

      // Bank Details
      bankDetails,

      // Form Metadata
      formMetadata,

      // Status and Notes
      status,
      submissionNotes,
      internalNotes,
      tags,

      // Settings
      isPublic,
      allowEditing,
    } = req.body;

    // Validation for required fields
    if (!companyName || !companyName.trim()) {
      return res.status(400).json({
        success: false,
        status: "error",
        message: "Company name is required",
        code: "VALIDATION_ERROR",
      });
    }

    // Check for duplicate company name
    const existingCompanyByName = await CompanyFormData.findOne({
      companyName: companyName.trim(),
      isActive: true,
    });

    if (existingCompanyByName) {
      return res.status(400).json({
        success: false,
        status: "error",
        message: "Company with this name already exists",
        code: "COMPANY_NAME_EXISTS",
      });
    }

    // Check for duplicate email if provided
    if (contactInfo?.email) {
      const existingByEmail = await CompanyFormData.findByEmail(contactInfo.email);
      if (existingByEmail) {
        return res.status(400).json({
          success: false,
          status: "error",
          message: "Company with this email already exists",
          code: "EMAIL_EXISTS",
        });
      }
    }

    // Check for duplicate GST number if provided
    if (legalInfo?.gstNumber) {
      const existingByGST = await CompanyFormData.findByGST(legalInfo.gstNumber);
      if (existingByGST) {
        return res.status(400).json({
          success: false,
          status: "error",
          message: "Company with this GST number already exists",
          code: "GST_EXISTS",
        });
      }
    }

    // Check for duplicate PAN number if provided
    if (legalInfo?.panNumber) {
      const existingByPAN = await CompanyFormData.findByPAN(legalInfo.panNumber);
      if (existingByPAN) {
        return res.status(400).json({
          success: false,
          status: "error",
          message: "Company with this PAN number already exists",
          code: "PAN_EXISTS",
        });
      }
    }

    // Prepare company form data
    const companyFormDataObj = {
      createdBy: req.user.id,
      companyName: companyName.trim(),
      displayName: displayName?.trim(),
      legalName: legalName?.trim(),
      logo: logo ? {
        base64: logo.base64,
        url: logo.url,
        publicId: logo.publicId,
        uploadedAt: new Date(),
      } : undefined,
      brandColors,
      address: address ? {
        addressLine1: address.addressLine1?.trim(),
        addressLine2: address.addressLine2?.trim(),
        city: address.city?.trim(),
        state: address.state?.trim(),
        country: address.country?.trim() || "India",
        pincode: address.pincode?.trim(),
        district: address.district?.trim(),
        tehsil: address.tehsil?.trim(),
      } : undefined,
      contactInfo: contactInfo ? {
        primaryMobile: contactInfo.primaryMobile?.replace(/\D/g, ""),
        secondaryMobile: contactInfo.secondaryMobile?.replace(/\D/g, ""),
        landline: contactInfo.landline?.trim(),
        email: contactInfo.email?.toLowerCase().trim(),
        alternateEmail: contactInfo.alternateEmail?.toLowerCase().trim(),
        website: contactInfo.website?.trim(),
        socialMedia: contactInfo.socialMedia,
      } : undefined,
      legalInfo: legalInfo ? {
        gstNumber: legalInfo.gstNumber?.toUpperCase().trim(),
        panNumber: legalInfo.panNumber?.toUpperCase().trim(),
        tanNumber: legalInfo.tanNumber?.toUpperCase().trim(),
        cinNumber: legalInfo.cinNumber?.toUpperCase().trim(),
        registrationNumber: legalInfo.registrationNumber?.trim(),
        udyogAadhar: legalInfo.udyogAadhar?.trim(),
        iecCode: legalInfo.iecCode?.toUpperCase().trim(),
        fssaiLicense: legalInfo.fssaiLicense?.trim(),
        tradeLicense: legalInfo.tradeLicense?.trim(),
      } : undefined,
      financialInfo: financialInfo ? {
        financialYearStart: financialInfo.financialYearStart ? new Date(financialInfo.financialYearStart) : undefined,
        financialYearEnd: financialInfo.financialYearEnd ? new Date(financialInfo.financialYearEnd) : undefined,
        currency: financialInfo.currency?.toUpperCase() || "INR",
        baseCurrency: financialInfo.baseCurrency?.toUpperCase() || "INR",
        authorizedCapital: financialInfo.authorizedCapital,
        paidUpCapital: financialInfo.paidUpCapital,
        annualTurnover: financialInfo.annualTurnover,
        taxRegime: financialInfo.taxRegime || "Regular",
      } : undefined,
      businessInfo: businessInfo ? {
        companyType: businessInfo.companyType || "Private Limited",
        businessType: businessInfo.businessType || "Others",
        industry: businessInfo.industry || "Other",
        subIndustry: businessInfo.subIndustry?.trim(),
        businessDescription: businessInfo.businessDescription?.trim(),
        incorporationDate: businessInfo.incorporationDate ? new Date(businessInfo.incorporationDate) : undefined,
        establishedYear: businessInfo.establishedYear?.trim(),
        employeeCount: businessInfo.employeeCount,
        operatingHours: businessInfo.operatingHours?.trim(),
        servicesOffered: businessInfo.servicesOffered,
        productsManufactured: businessInfo.productsManufactured,
        targetMarket: businessInfo.targetMarket,
      } : undefined,
      customFields: Array.isArray(customFields) ? 
        customFields
          .filter(field => field && field.title && field.value)
          .map(field => ({
            title: field.title.trim(),
            value: field.value,
            type: field.type || "text",
            isRequired: field.isRequired || false,
            options: field.options,
            validation: field.validation,
          })) : [],
      documents: Array.isArray(documents) ? documents : [],
      keyPersonnel: Array.isArray(keyPersonnel) ? keyPersonnel : [],
      bankDetails: Array.isArray(bankDetails) ? bankDetails : [],
      formMetadata: {
        version: "2.0",
        submittedAt: new Date(),
        completionPercentage: 0, // Will be calculated by pre-save middleware
        lastUpdatedStep: formMetadata?.lastUpdatedStep,
        dataSource: "form",
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get("User-Agent"),
        sessionId: req.sessionID,
      },
      status: status || "draft",
      submissionNotes: submissionNotes?.trim(),
      internalNotes: internalNotes?.trim(),
      tags: Array.isArray(tags) ? tags.map(tag => tag.toLowerCase().trim()) : [],
      isPublic: isPublic || false,
      allowEditing: allowEditing !== false, // Default to true
      isActive: true,
      isVerified: false,
    };

    // Remove undefined fields
    Object.keys(companyFormDataObj).forEach((key) => {
      if (companyFormDataObj[key] === undefined) {
        delete companyFormDataObj[key];
      }
    });

    // Create and save the company form data
    const newCompanyFormData = new CompanyFormData(companyFormDataObj);
    
    // Add initial audit entry
    newCompanyFormData.addAuditEntry(
      "created",
      req.user.id,
      { initialData: "Company form data created" },
      req.ip,
      "Initial creation of company form data"
    );

    const savedCompanyFormData = await newCompanyFormData.save();

    // Prepare response data
    const responseData = {
      id: savedCompanyFormData._id,
      _id: savedCompanyFormData._id,
      companyName: savedCompanyFormData.companyName,
      displayName: savedCompanyFormData.displayName,
      legalName: savedCompanyFormData.legalName,
      address: savedCompanyFormData.address,
      contactInfo: savedCompanyFormData.contactInfo,
      legalInfo: savedCompanyFormData.legalInfo,
      financialInfo: savedCompanyFormData.financialInfo,
      businessInfo: savedCompanyFormData.businessInfo,
      customFields: savedCompanyFormData.customFields,
      documents: savedCompanyFormData.documents,
      keyPersonnel: savedCompanyFormData.keyPersonnel,
      bankDetails: savedCompanyFormData.bankDetails,
      formMetadata: savedCompanyFormData.formMetadata,
      status: savedCompanyFormData.status,
      isActive: savedCompanyFormData.isActive,
      isVerified: savedCompanyFormData.isVerified,
      fullAddress: savedCompanyFormData.fullAddress,
      primaryContact: savedCompanyFormData.primaryContact,
      createdAt: savedCompanyFormData.createdAt,
      updatedAt: savedCompanyFormData.updatedAt,
    };

    res.status(201).json({
      success: true,
      status: "success",
      message: "Company form data created successfully",
      data: responseData,
    });

  } catch (error) {
    console.error("Error creating company form data:", error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldName =
        field === "companyName"
          ? "company name"
          : field === "contactInfo.email"
          ? "email"
          : field === "legalInfo.gstNumber"
          ? "GST number"
          : field === "legalInfo.panNumber"
          ? "PAN number"
          : field;

      return res.status(400).json({
        success: false,
        status: "error",
        message: `Company with this ${fieldName} already exists`,
        code: "DUPLICATE_FIELD",
      });
    }

    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        status: "error",
        message: "Validation failed",
        errors: validationErrors,
        code: "VALIDATION_ERROR",
      });
    }

    res.status(500).json({
      success: false,
      status: "error",
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get all company form data with pagination and filters
 */
const getAllCompanyFormData = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      industry,
      city,
      state,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const options = {
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      status,
      industry,
      city,
      state,
    };

    const companies = await CompanyFormData.searchCompanies(search, options);
    const total = await CompanyFormData.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      status: "success",
      data: companies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });

  } catch (error) {
    console.error("Error fetching company form data:", error);
    res.status(500).json({
      success: false,
      status: "error",
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get company form data by ID
 */
const getCompanyFormDataById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        status: "error",
        message: "Invalid company ID",
        code: "INVALID_ID",
      });
    }

    const company = await CompanyFormData.findById(id)
      .populate("createdBy", "username email fullName")
      .populate("reviewedBy", "username email fullName")
      .populate("approvedBy", "username email fullName");

    if (!company) {
      return res.status(404).json({
        success: false,
        status: "error",
        message: "Company not found",
        code: "COMPANY_NOT_FOUND",
      });
    }

    res.status(200).json({
      success: true,
      status: "success",
      data: company,
    });

  } catch (error) {
    console.error("Error fetching company form data by ID:", error);
    res.status(500).json({
      success: false,
      status: "error",
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Update company form data
 */
const updateCompanyFormData = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        status: "error",
        message: "Invalid company ID",
        code: "INVALID_ID",
      });
    }

    const company = await CompanyFormData.findById(id);

    if (!company) {
      return res.status(404).json({
        success: false,
        status: "error",
        message: "Company not found",
        code: "COMPANY_NOT_FOUND",
      });
    }

    // Check if user has permission to update
    if (company.createdBy.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        status: "error",
        message: "You don't have permission to update this company",
        code: "PERMISSION_DENIED",
      });
    }

    // Add audit entry
    company.addAuditEntry(
      "updated",
      req.user.id,
      updateData,
      req.ip,
      "Company form data updated"
    );

    // Update the company
    const updatedCompany = await CompanyFormData.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate("createdBy", "username email fullName");

    res.status(200).json({
      success: true,
      status: "success",
      message: "Company form data updated successfully",
      data: updatedCompany,
    });

  } catch (error) {
    console.error("Error updating company form data:", error);
    res.status(500).json({
      success: false,
      status: "error",
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Delete company form data (soft delete)
 */
const deleteCompanyFormData = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        status: "error",
        message: "Invalid company ID",
        code: "INVALID_ID",
      });
    }

    const company = await CompanyFormData.findById(id);

    if (!company) {
      return res.status(404).json({
        success: false,
        status: "error",
        message: "Company not found",
        code: "COMPANY_NOT_FOUND",
      });
    }

    // Check if user has permission to delete
    if (company.createdBy.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        status: "error",
        message: "You don't have permission to delete this company",
        code: "PERMISSION_DENIED",
      });
    }

    // Soft delete
    company.isActive = false;
    company.status = "archived";
    company.addAuditEntry(
      "deleted",
      req.user.id,
      { isActive: false, status: "archived" },
      req.ip,
      "Company form data deleted (soft delete)"
    );

    await company.save();

    res.status(200).json({
      success: true,
      status: "success",
      message: "Company form data deleted successfully",
    });

  } catch (error) {
    console.error("Error deleting company form data:", error);
    res.status(500).json({
      success: false,
      status: "error",
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get company statistics
 */
const getCompanyFormDataStats = async (req, res) => {
  try {
    const stats = await CompanyFormData.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalCompanies: { $sum: 1 },
          draftCompanies: {
            $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] }
          },
          submittedCompanies: {
            $sum: { $cond: [{ $eq: ["$status", "submitted"] }, 1, 0] }
          },
          approvedCompanies: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] }
          },
          verifiedCompanies: {
            $sum: { $cond: ["$isVerified", 1, 0] }
          },
          avgCompletionPercentage: { $avg: "$formMetadata.completionPercentage" },
        }
      }
    ]);

    const industryStats = await CompanyFormData.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$businessInfo.industry", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const locationStats = await CompanyFormData.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$address.state", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      success: true,
      status: "success",
      data: {
        overview: stats[0] || {
          totalCompanies: 0,
          draftCompanies: 0,
          submittedCompanies: 0,
          approvedCompanies: 0,
          verifiedCompanies: 0,
          avgCompletionPercentage: 0,
        },
        industryDistribution: industryStats,
        locationDistribution: locationStats,
      },
    });

  } catch (error) {
    console.error("Error fetching company form data stats:", error);
    res.status(500).json({
      success: false,
      status: "error",
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  createCompanyFormData,
  getAllCompanyFormData,
  getCompanyFormDataById,
  updateCompanyFormData,
  deleteCompanyFormData,
  getCompanyFormDataStats,
};