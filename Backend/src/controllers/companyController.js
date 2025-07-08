const Company = require("../models/Company");
const {validationResult} = require("express-validator");

const healthCheck = async (req, res) => {
  try {
    await Company.findOne().limit(1);

    res.status(200).json({
      success: true,
      status: "healthy",
      message: "Company service is running",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: "unhealthy",
      message: "Service unavailable",
      timestamp: new Date().toISOString(),
      database: "disconnected",
    });
  }
};

const getAllCompaniesAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = "",
      businessType = "",
      businessCategory = "",
      state = "",
      city = "",
      isActive = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter object
    const filter = {};

    // Search functionality
    if (search && search.trim()) {
      filter.$or = [
        {businessName: {$regex: search, $options: "i"}},
        {email: {$regex: search, $options: "i"}},
        {phoneNumber: {$regex: search, $options: "i"}},
        {ownerName: {$regex: search, $options: "i"}},
        {gstin: {$regex: search, $options: "i"}},
      ];
    }

    // Filter by business type
    if (businessType && businessType.trim()) {
      filter.businessType = businessType;
    }

    // Filter by business category
    if (businessCategory && businessCategory.trim()) {
      filter.businessCategory = businessCategory;
    }

    // Filter by state
    if (state && state.trim()) {
      filter.state = state;
    }

    // Filter by city
    if (city && city.trim()) {
      filter.city = city;
    }

    // Filter by active status
    if (isActive !== "") {
      filter.isActive = isActive === "true";
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sortObject = {};
    sortObject[sortBy] = sortOrder === "asc" ? 1 : -1;

    // ✅ FIX: Remove the incorrect populate and use correct field
    const companies = await Company.find(filter)
      .sort(sortObject)
      .skip(skip)
      .limit(limitNum)
      .populate("owner", "name email") // ✅ Use 'owner' instead of 'createdBy'
      .lean();

    const totalCompanies = await Company.countDocuments(filter);

    // ✅ Calculate additional stats for admin
    const totalActiveCompanies = await Company.countDocuments({
      ...filter,
      isActive: true,
    });

    const companiesWithGST = await Company.countDocuments({
      ...filter,
      gstin: {$exists: true, $ne: ""},
    });

    const pagination = {
      current: pageNum,
      total: Math.ceil(totalCompanies / limitNum),
      totalItems: totalCompanies,
      hasNextPage: pageNum < Math.ceil(totalCompanies / limitNum),
      hasPrevPage: pageNum > 1,
      limit: limitNum,
    };

    // ✅ Format companies for admin view
    const formattedCompanies = companies.map((company) => ({
      id: company._id,
      businessName: company.businessName,
      phoneNumber: company.phoneNumber,
      email: company.email || "",
      gstin: company.gstin || "",
      businessType: company.businessType || "",
      businessCategory: company.businessCategory || "",
      state: company.state || "",
      city: company.city || "",
      isActive: company.isActive,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
      ownerName: company.ownerName || "",
      totalActiveUsers: company.totalActiveUsers || 0,
      hasActiveSubscription: company.hasActiveSubscription || false,
      // ✅ FIX: Use 'owner' field instead of 'createdBy'
      owner: company.owner || null,
      ownerInfo: company.owner
        ? {
            id: company.owner._id || company.owner,
            name: company.owner.name || "Unknown",
            email: company.owner.email || "",
          }
        : null,
      // ✅ Admin-specific fields
      adminView: true,
      createdDaysAgo: Math.floor(
        (Date.now() - new Date(company.createdAt)) / (1000 * 60 * 60 * 24)
      ),
    }));

    res.json({
      success: true,
      message: `Retrieved ${formattedCompanies.length} companies for admin dashboard`,
      data: {
        companies: formattedCompanies,
        pagination,
        stats: {
          totalCompanies,
          totalActiveCompanies,
          companiesWithGST,
          inactiveCompanies: totalCompanies - totalActiveCompanies,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error in getAllCompaniesAdmin:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving companies for admin",
      error: error.message,
    });
  }
};
const getAdminCompanyStats = async (req, res) => {
  try {
    // ✅ Get company statistics
    const totalCompanies = await Company.countDocuments();
    const activeCompanies = await Company.countDocuments({isActive: true});
    const inactiveCompanies = totalCompanies - activeCompanies;

    const companiesWithGST = await Company.countDocuments({
      gstin: {$exists: true, $ne: ""},
    });

    // ✅ Get business type distribution
    const businessTypeStats = await Company.aggregate([
      {$match: {isActive: true}},
      {
        $group: {
          _id: "$businessType",
          count: {$sum: 1},
        },
      },
      {$sort: {count: -1}},
    ]);

    // ✅ Get state distribution
    const stateStats = await Company.aggregate([
      {$match: {isActive: true, state: {$exists: true, $ne: ""}}},
      {
        $group: {
          _id: "$state",
          count: {$sum: 1},
        },
      },
      {$sort: {count: -1}},
      {$limit: 10},
    ]);

    // ✅ Get recent companies (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCompanies = await Company.countDocuments({
      createdAt: {$gte: sevenDaysAgo},
    });

    // ✅ Monthly growth data
    const monthlyStats = await Company.aggregate([
      {
        $group: {
          _id: {
            year: {$year: "$createdAt"},
            month: {$month: "$createdAt"},
          },
          count: {$sum: 1},
        },
      },
      {$sort: {"_id.year": -1, "_id.month": -1}},
      {$limit: 12},
    ]);

    const formattedStats = {
      totalCompanies,
      activeCompanies,
      inactiveCompanies,
      companiesWithGST,
      recentCompanies,
      businessTypeDistribution: businessTypeStats.reduce((acc, item) => {
        acc[item._id || "Other"] = item.count;
        return acc;
      }, {}),
      stateDistribution: stateStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      monthlyGrowth: monthlyStats.map((item) => ({
        year: item._id.year,
        month: item._id.month,
        count: item.count,
      })),
    };

    res.json({
      success: true,
      message: "Admin company statistics retrieved successfully",
      data: formattedStats,
    });
  } catch (error) {
    console.error("❌ Error in getAdminCompanyStats:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving admin statistics",
      error: error.message,
    });
  }
};
const searchExternalCompanies = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        status: "error",
        message: "User authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    const {
      page = 1,
      limit = 50,
      search = "",
      businessType = "",
      businessCategory = "",
      state = "",
      city = "",
      isActive = "true",
    } = req.query;

    const filter = {
      owner: {$ne: req.user.id},
      "users.user": {$ne: req.user.id},
      isActive: true,
    };

    if (search && search.trim()) {
      filter.$or = [
        {businessName: {$regex: search.trim(), $options: "i"}},
        {email: {$regex: search.trim(), $options: "i"}},
        {phoneNumber: {$regex: search.trim(), $options: "i"}},
        {gstin: {$regex: search.trim(), $options: "i"}},
        {ownerName: {$regex: search.trim(), $options: "i"}},
        {city: {$regex: search.trim(), $options: "i"}},
        {state: {$regex: search.trim(), $options: "i"}},
        {address: {$regex: search.trim(), $options: "i"}},
        {businessCategory: {$regex: search.trim(), $options: "i"}},
      ];
    }

    if (businessType) {
      filter.businessType = businessType;
    }

    if (businessCategory) {
      filter.businessCategory = businessCategory;
    }

    if (state) {
      filter.state = {$regex: state, $options: "i"};
    }

    if (city) {
      filter.city = {$regex: city, $options: "i"};
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const companies = await Company.find(filter)
      .select(
        "-__v -logo.base64 -signatureImage.base64 -users -subscription -stats"
      )
      .populate("owner", "name email")
      .sort({createdAt: -1, businessName: 1})
      .skip(skip)
      .limit(limitNum);

    const total = await Company.countDocuments(filter);

    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    const formattedCompanies = companies.map((company) => ({
      _id: company._id,
      businessName: company.businessName,
      name: company.businessName,
      phoneNumber: company.phoneNumber,
      additionalPhones: company.additionalPhones,
      email: company.email,
      businessType: company.businessType,
      businessCategory: company.businessCategory,
      gstin: company.gstin,
      state: company.state,
      city: company.city,
      pincode: company.pincode,
      tehsil: company.tehsil,
      address: company.address,
      ownerName: company.ownerName,
      description: company.description,
      establishedYear: company.establishedYear,
      website: company.website,
      isActive: company.isActive,
      createdAt: company.createdAt,
      ownerInfo: company.owner
        ? {
            name: company.owner.name,
            email: company.owner.email,
          }
        : null,
      isExternal: true,
      source: "external_database",
    }));

    res.status(200).json({
      success: true,
      status: "success",
      data: {
        companies: formattedCompanies,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: total,
          hasNextPage,
          hasPrevPage,
          limit: limitNum,
        },
        searchInfo: {
          query: search,
          filters: {
            businessType,
            businessCategory,
            state,
            city,
          },
          excludedUserCompanies: true,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "error",
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const createCompany = async (req, res) => {
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
      businessName,
      phoneNumber,
      additionalPhones,
      email,
      businessType,
      businessCategory,
      gstin,
      state,
      pincode,
      city,
      tehsil,
      address,
      logo,
      signatureImage,
      settings,
      ownerName,
      description,
      establishedYear,
      website,
    } = req.body;

    const existingOwnedCompany = await Company.findOne({
      owner: req.user.id,
      isActive: true,
    });

    const cleanPhoneNumber = phoneNumber.replace(/\D/g, "");
    const existingCompany = await Company.findOne({
      phoneNumber: cleanPhoneNumber,
      isActive: true,
    });

    if (existingCompany) {
      return res.status(400).json({
        success: false,
        status: "error",
        message: "Company with this phone number already exists",
        code: "PHONE_EXISTS",
      });
    }

    if (email) {
      const existingEmail = await Company.findOne({
        email: email.toLowerCase(),
        isActive: true,
      });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          status: "error",
          message: "Company with this email already exists",
          code: "EMAIL_EXISTS",
        });
      }
    }

    if (gstin) {
      const existingGSTIN = await Company.findOne({
        gstin: gstin.toUpperCase(),
        isActive: true,
      });
      if (existingGSTIN) {
        return res.status(400).json({
          success: false,
          status: "error",
          message: "Company with this GSTIN already exists",
          code: "GSTIN_EXISTS",
        });
      }
    }

    const companyData = {
      owner: req.user.id,
      users: [
        {
          user: req.user.id,
          role: "owner",
          permissions: [
            "view_dashboard",
            "manage_parties",
            "create_invoices",
            "view_reports",
            "manage_inventory",
            "manage_users",
            "company_settings",
            "delete_records",
          ],
          joinedAt: new Date(),
          isActive: true,
        },
      ],
      businessName: businessName.trim(),
      phoneNumber: cleanPhoneNumber,
      additionalPhones: additionalPhones
        ? additionalPhones
            .filter((phone) => phone && phone.trim())
            .map((phone) => phone.replace(/\D/g, ""))
            .filter((phone) => phone.length === 10)
        : [],
      email: email ? email.toLowerCase().trim() : undefined,
      businessType,
      businessCategory,
      gstin: gstin ? gstin.toUpperCase().trim() : undefined,
      state: state ? state.trim() : undefined,
      pincode: pincode ? pincode.replace(/\D/g, "") : undefined,
      city: city ? city.trim() : undefined,
      tehsil: tehsil ? tehsil.trim() : undefined,
      address: address ? address.trim() : undefined,
      ownerName: ownerName ? ownerName.trim() : undefined,
      description: description ? description.trim() : undefined,
      establishedYear: establishedYear ? parseInt(establishedYear) : undefined,
      website: website ? website.trim() : undefined,
      logo: logo ? {base64: logo} : undefined,
      signatureImage: signatureImage ? {base64: signatureImage} : undefined,
      settings: {
        invoicePrefix: settings?.invoicePrefix || "INV",
        purchasePrefix: settings?.purchasePrefix || "PUR",
        enableGST:
          settings?.enableGST !== undefined ? settings.enableGST : true,
        autoGenerateInvoice:
          settings?.autoGenerateInvoice !== undefined
            ? settings.autoGenerateInvoice
            : true,
        allowMultipleUsers: settings?.allowMultipleUsers || false,
        requireApprovalForUsers:
          settings?.requireApprovalForUsers !== undefined
            ? settings.requireApprovalForUsers
            : true,
      },
      subscription: {
        plan: "Free",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        maxUsers: 1,
        maxTransactions: 100,
        features: ["basic_invoicing", "inventory_management", "reports"],
      },
      stats: {
        totalUsers: 1,
        totalParties: 0,
        totalTransactions: 0,
        totalRevenue: 0,
        lastActivityAt: new Date(),
      },
    };

    Object.keys(companyData).forEach((key) => {
      if (companyData[key] === undefined) {
        delete companyData[key];
      }
    });

    const newCompany = new Company(companyData);
    const savedCompany = await newCompany.save();

    const companyResponse = {
      id: savedCompany._id,
      _id: savedCompany._id,
      businessName: savedCompany.businessName,
      phoneNumber: savedCompany.phoneNumber,
      email: savedCompany.email,
      businessType: savedCompany.businessType,
      businessCategory: savedCompany.businessCategory,
      gstin: savedCompany.gstin,
      state: savedCompany.state,
      city: savedCompany.city,
      address: savedCompany.address,
      pincode: savedCompany.pincode,
      tehsil: savedCompany.tehsil,
      ownerName: savedCompany.ownerName,
      description: savedCompany.description,
      establishedYear: savedCompany.establishedYear,
      website: savedCompany.website,
      isActive: savedCompany.isActive,
      settings: savedCompany.settings,
      subscription: savedCompany.subscription,
      stats: savedCompany.stats,
      createdAt: savedCompany.createdAt,
      updatedAt: savedCompany.updatedAt,
    };

    res.status(201).json({
      success: true,
      status: "success",
      message: "Company created successfully",
      data: companyResponse,
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldName =
        field === "phoneNumber"
          ? "phone number"
          : field === "gstin"
          ? "GSTIN"
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

// Update the getAllCompanies method (around line 622):

const getAllCompanies = async (req, res) => {
  try {
    // ✅ CRITICAL FIX: Check if this is an admin request
    const isAdminRequest =
      req.query.isAdmin === "true" ||
      req.query.includeAllCompanies === "true" ||
      req.headers["x-admin-access"] === "true" ||
      req.path.includes("/admin/");

    // ✅ For admin requests, skip user authentication requirement
    if (isAdminRequest) {
      return await getAllCompaniesAdmin(req, res);
    }

    // ✅ For regular requests, require authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        status: "error",
        message: "User authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    const {
      page = 1,
      limit = 50,
      search = "",
      businessType = "",
      businessCategory = "",
      state = "",
      city = "",
      isActive = "",
    } = req.query;

    // ✅ Build user-specific filter
    const baseFilter = {
      $or: [
        {owner: req.user.id},
        {
          "users.user": req.user.id,
          "users.isActive": true,
        },
      ],
    };

    // ✅ Add search filter
    if (search && search.trim()) {
      baseFilter.$and = [
        {
          $or: [
            {businessName: {$regex: search.trim(), $options: "i"}},
            {email: {$regex: search.trim(), $options: "i"}},
            {phoneNumber: {$regex: search.trim(), $options: "i"}},
            {gstin: {$regex: search.trim(), $options: "i"}},
            {ownerName: {$regex: search.trim(), $options: "i"}},
          ],
        },
      ];
    }

    // ✅ Apply additional filters
    if (businessType && businessType.trim()) {
      baseFilter.businessType = businessType;
    }

    if (businessCategory && businessCategory.trim()) {
      baseFilter.businessCategory = businessCategory;
    }

    if (state && state.trim()) {
      baseFilter.state = {$regex: state.trim(), $options: "i"};
    }

    if (city && city.trim()) {
      baseFilter.city = {$regex: city.trim(), $options: "i"};
    }

    if (isActive !== "" && isActive !== undefined) {
      baseFilter.isActive = isActive === "true";
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // ✅ Execute database query
    let companies, total;

    try {
      companies = await Company.find(baseFilter)
        .select("-__v -logo.base64 -signatureImage.base64")
        .populate("owner", "name email")
        .sort({createdAt: -1})
        .skip(skip)
        .limit(limitNum)
        .lean();

      total = await Company.countDocuments(baseFilter);
    } catch (dbError) {
      console.error("❌ Database query error:", dbError);
      throw new Error(`Database query failed: ${dbError.message}`);
    }

    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // ✅ Enhanced role determination
    const companiesWithRole = companies.map((company) => {
      let userRole = "employee";

      // Check if user is owner
      if (
        company.owner &&
        company.owner._id.toString() === req.user.id.toString()
      ) {
        userRole = "owner";
      } else if (company.users && Array.isArray(company.users)) {
        // Check if user is in users array
        const userEntry = company.users.find(
          (user) =>
            user.user &&
            user.user.toString() === req.user.id.toString() &&
            user.isActive
        );
        if (userEntry) {
          userRole = userEntry.role || "employee";
        }
      }

      return {
        id: company._id,
        _id: company._id,
        businessName: company.businessName,
        phoneNumber: company.phoneNumber,
        email: company.email,
        businessType: company.businessType,
        businessCategory: company.businessCategory,
        gstin: company.gstin,
        state: company.state,
        city: company.city,
        address: company.address,
        pincode: company.pincode,
        ownerName: company.ownerName,
        isActive: company.isActive,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
        userRole,
        ownerInfo: company.owner
          ? {
              id: company.owner._id,
              name: company.owner.name,
              email: company.owner.email,
            }
          : null,
        totalUsers: (company.users?.length || 0) + 1,
      };
    });

    const responseData = {
      success: true,
      status: "success",
      data: {
        companies: companiesWithRole,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: total,
          hasNextPage,
          hasPrevPage,
          limit: limitNum,
        },
      },
      message: `Found ${companiesWithRole.length} companies`,
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error("❌ Error in getAllCompanies:", error);

    res.status(500).json({
      success: false,
      status: "error",
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

const getCompanyById = async (req, res) => {
  try {
    const {id} = req.params;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        status: "error",
        message: "User authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    const company = await Company.findById(id)
      .populate("owner", "name email")
      .populate("users.user", "name email")
      .select("-__v");

    if (!company) {
      return res.status(404).json({
        success: false,
        status: "error",
        message: "Company not found",
        code: "COMPANY_NOT_FOUND",
      });
    }

    let hasAccess = false;

    if (
      company.owner &&
      company.owner._id.toString() === req.user.id.toString()
    ) {
      hasAccess = true;
    } else if (company.users && Array.isArray(company.users)) {
      hasAccess = company.users.some(
        (user) =>
          user.user &&
          user.user._id.toString() === req.user.id.toString() &&
          user.isActive
      );
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        status: "error",
        message: "Access denied to this company",
        code: "ACCESS_DENIED",
      });
    }

    const companyData = company.toObject();

    let userRole = "employee";

    if (
      company.owner &&
      company.owner._id.toString() === req.user.id.toString()
    ) {
      userRole = "owner";
    } else if (company.users && Array.isArray(company.users)) {
      const userEntry = company.users.find(
        (user) =>
          user.user &&
          user.user._id.toString() === req.user.id.toString() &&
          user.isActive
      );
      if (userEntry) {
        userRole = userEntry.role;
      }
    }

    companyData.userRole = userRole;

    res.status(200).json({
      success: true,
      status: "success",
      data: companyData,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        status: "error",
        message: "Invalid company ID",
        code: "INVALID_ID",
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

const updateCompany = async (req, res) => {
  try {
    const {id} = req.params;
    const updateData = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        status: "error",
        message: "User authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({
        success: false,
        status: "error",
        message: "Company not found",
        code: "COMPANY_NOT_FOUND",
      });
    }

    let userRole = "employee";

    if (company.owner && company.owner.toString() === req.user.id.toString()) {
      userRole = "owner";
    } else if (company.users && Array.isArray(company.users)) {
      const userEntry = company.users.find(
        (user) =>
          user.user &&
          user.user.toString() === req.user.id.toString() &&
          user.isActive
      );
      if (userEntry) {
        userRole = userEntry.role;
      }
    }

    if (!userRole || (userRole !== "owner" && userRole !== "admin")) {
      return res.status(403).json({
        success: false,
        status: "error",
        message: "Insufficient permissions to update company",
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }

    const ownerOnlyFields = ["owner", "users", "subscription"];
    if (userRole !== "owner") {
      ownerOnlyFields.forEach((field) => {
        if (updateData[field]) {
          delete updateData[field];
        }
      });
    }

    if (updateData.phoneNumber) {
      updateData.phoneNumber = updateData.phoneNumber.replace(/\D/g, "");
    }

    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase().trim();
    }

    if (updateData.gstin) {
      updateData.gstin = updateData.gstin.toUpperCase().trim();
    }

    if (updateData.businessName) {
      updateData.businessName = updateData.businessName.trim();
    }

    if (updateData.ownerName) {
      updateData.ownerName = updateData.ownerName.trim();
    }

    if (updateData.description) {
      updateData.description = updateData.description.trim();
    }

    if (updateData.website) {
      updateData.website = updateData.website.trim();
    }

    updateData["stats.lastActivityAt"] = new Date();

    const updatedCompany = await Company.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      select: "-__v -logo.base64 -signatureImage.base64",
    }).populate("owner", "name email");

    res.status(200).json({
      success: true,
      status: "success",
      message: "Company updated successfully",
      data: updatedCompany,
    });
  } catch (error) {
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

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        status: "error",
        message: `Company with this ${field} already exists`,
        code: "DUPLICATE_FIELD",
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

const deleteCompany = async (req, res) => {
  try {
    const {id} = req.params;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        status: "error",
        message: "User authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({
        success: false,
        status: "error",
        message: "Company not found",
        code: "COMPANY_NOT_FOUND",
      });
    }

    const isOwner =
      company.owner && company.owner.toString() === req.user.id.toString();

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        status: "error",
        message: "Only company owner can delete the company",
        code: "OWNER_ONLY_ACTION",
      });
    }

    company.isActive = false;
    company.stats.lastActivityAt = new Date();
    await company.save();

    res.status(200).json({
      success: true,
      status: "success",
      message: "Company deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "error",
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const addUserToCompany = async (req, res) => {
  try {
    const {id} = req.params;
    const {userId, role = "employee", permissions = []} = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        status: "error",
        message: "User authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({
        success: false,
        status: "error",
        message: "Company not found",
        code: "COMPANY_NOT_FOUND",
      });
    }

    let userRole = "employee";

    if (company.owner && company.owner.toString() === req.user.id.toString()) {
      userRole = "owner";
    } else if (company.users && Array.isArray(company.users)) {
      const userEntry = company.users.find(
        (user) =>
          user.user &&
          user.user.toString() === req.user.id.toString() &&
          user.isActive
      );
      if (userEntry) {
        userRole = userEntry.role;
      }
    }

    if (!userRole || (userRole !== "owner" && userRole !== "admin")) {
      return res.status(403).json({
        success: false,
        status: "error",
        message: "Insufficient permissions to add users",
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }

    const existingUser = company.users.find(
      (user) => user.user.toString() === userId
    );

    if (existingUser) {
      return res.status(400).json({
        success: false,
        status: "error",
        message: "User is already a member of this company",
        code: "USER_ALREADY_EXISTS",
      });
    }

    company.users.push({
      user: userId,
      role: role,
      permissions: permissions,
      joinedAt: new Date(),
      isActive: true,
    });

    company.stats.totalUsers = company.users.filter((u) => u.isActive).length;
    company.stats.lastActivityAt = new Date();

    await company.save();

    res.status(200).json({
      success: true,
      status: "success",
      message: "User added to company successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "error",
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const removeUserFromCompany = async (req, res) => {
  try {
    const {id, userId} = req.params;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        status: "error",
        message: "User authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({
        success: false,
        status: "error",
        message: "Company not found",
        code: "COMPANY_NOT_FOUND",
      });
    }

    const isOwner =
      company.owner && company.owner.toString() === req.user.id.toString();

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        status: "error",
        message: "Only company owner can remove users",
        code: "OWNER_ONLY_ACTION",
      });
    }

    const isTargetOwner = company.owner && company.owner.toString() === userId;

    if (isTargetOwner) {
      return res.status(400).json({
        success: false,
        status: "error",
        message: "Cannot remove company owner",
        code: "CANNOT_REMOVE_OWNER",
      });
    }

    company.users = company.users.filter(
      (user) => user.user.toString() !== userId
    );

    company.stats.totalUsers = company.users.filter((u) => u.isActive).length;
    company.stats.lastActivityAt = new Date();

    await company.save();

    res.status(200).json({
      success: true,
      status: "success",
      message: "User removed from company successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "error",
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getCompanyStats = async (req, res) => {
  try {
    const {id} = req.params;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        status: "error",
        message: "User authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    const company = await Company.findById(id).select("stats owner users");
    if (!company) {
      return res.status(404).json({
        success: false,
        status: "error",
        message: "Company not found",
        code: "COMPANY_NOT_FOUND",
      });
    }

    let hasAccess = false;

    if (company.owner && company.owner.toString() === req.user.id.toString()) {
      hasAccess = true;
    } else if (company.users && Array.isArray(company.users)) {
      hasAccess = company.users.some(
        (user) =>
          user.user &&
          user.user.toString() === req.user.id.toString() &&
          user.isActive
      );
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        status: "error",
        message: "Access denied to this company",
        code: "ACCESS_DENIED",
      });
    }

    res.status(200).json({
      success: true,
      status: "success",
      data: company.stats,
    });
  } catch (error) {
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
  healthCheck,
  getAllCompaniesAdmin,
  getAdminCompanyStats,
  searchExternalCompanies,
  createCompany,
  getAllCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  addUserToCompany,
  removeUserFromCompany,
  getCompanyStats,
};
