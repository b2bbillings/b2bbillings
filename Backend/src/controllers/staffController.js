const Staff = require("../models/Staff");
const Company = require("../models/Company");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const {validationResult} = require("express-validator");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const companyId = getCompanyId(req);
    const uploadPath = path.join(
      __dirname,
      `../../uploads/staff-documents/${companyId}`
    );
    try {
      await fs.mkdir(uploadPath, {recursive: true});
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.params.staffId || "temp"}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(
        new Error(
          "Only images (jpeg, jpg, png) and documents (pdf, doc, docx) are allowed"
        )
      );
    }
  },
});

// Helper function to handle async errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Helper function to get company ID from request
const getCompanyId = (req) => {
  return req.companyId || req.user?.companyId || req.headers["x-company-id"];
};

// Helper function to validate company access
const validateCompanyAccess = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
        code: "COMPANY_REQUIRED",
      });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    req.company = company;
    req.companyId = companyId;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error validating company access",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// Enhanced error handler
const handleError = (error, req, res, operation) => {
  let statusCode = 500;
  let message = "Internal server error";

  if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    const validationErrors = Object.values(error.errors).map((err) => ({
      field: err.path,
      message: err.message,
    }));
    return res.status(statusCode).json({
      success: false,
      message,
      errors: validationErrors,
    });
  }

  if (error.code === 11000) {
    statusCode = 409;
    message = "Duplicate data detected";
  }

  if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid data format";
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
};

// Generate unique employee ID
const generateEmployeeId = async (companyId) => {
  try {
    const company = await Company.findById(companyId);
    const companyPrefix = company?.name?.substring(0, 3).toUpperCase() || "EMP";
    const staffCount = await Staff.countDocuments({companyId});
    const employeeNumber = String(staffCount + 1).padStart(4, "0");
    const employeeId = `${companyPrefix}${employeeNumber}`;

    const existingStaff = await Staff.findOne({
      employeeId,
      companyId,
    });

    if (existingStaff) {
      const timestamp = Date.now().toString().slice(-4);
      return `${companyPrefix}${employeeNumber}${timestamp}`;
    }

    return employeeId;
  } catch (error) {
    const timestamp = Date.now().toString().slice(-6);
    return `EMP${timestamp}`;
  }
};

// @desc    Create new staff member
// @route   POST /api/staff
// @access  Private
const createStaff = asyncHandler(async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const companyId = getCompanyId(req);
    const currentUser = req.user;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
        code: "COMPANY_REQUIRED",
      });
    }

    const {
      name,
      role,
      post,
      mobileNumbers,
      email,
      address,
      employment,
      permissions,
      emergencyContact,
      bankDetails,
      notifications,
    } = req.body;

    // Basic validation
    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role is required",
      });
    }

    if (!mobileNumbers?.length) {
      return res.status(400).json({
        success: false,
        message: "At least one mobile number is required",
      });
    }

    if (!employment?.joinDate) {
      return res.status(400).json({
        success: false,
        message: "Join date is required",
      });
    }

    if (!address?.street || !address?.city || !address?.state) {
      return res.status(400).json({
        success: false,
        message: "Complete address is required",
      });
    }

    // Check for duplicate email
    if (email) {
      const existingStaffByEmail = await Staff.findOne({
        email,
        companyId,
        isActive: true,
      });
      if (existingStaffByEmail) {
        return res.status(400).json({
          success: false,
          message: "Staff member with this email already exists",
        });
      }
    }

    // Check for duplicate mobile number
    const existingStaffByMobile = await Staff.findOne({
      mobileNumbers: {$in: mobileNumbers},
      companyId,
      isActive: true,
    });
    if (existingStaffByMobile) {
      return res.status(400).json({
        success: false,
        message: "Staff member with this mobile number already exists",
      });
    }

    // Validate reporting structure
    if (employment?.reportingTo) {
      const reportingManager = await Staff.findOne({
        _id: employment.reportingTo,
        companyId,
        isActive: true,
      });
      if (!reportingManager) {
        return res.status(400).json({
          success: false,
          message: "Invalid reporting manager selected",
        });
      }
    }

    const employeeId = await generateEmployeeId(companyId);

    const staffData = {
      companyId,
      employeeId,
      name: name.trim(),
      role,
      post,
      mobileNumbers: mobileNumbers
        .map((num) => num.trim())
        .filter((num) => num),
      email: email?.trim().toLowerCase() || null,
      address,
      employment,
      permissions: permissions || [],
      emergencyContact,
      bankDetails,
      notifications: notifications || {email: true, sms: true, app: false},
      createdBy: currentUser._id || currentUser.id,
      status: "active",
    };

    const staff = new Staff(staffData);
    await staff.save();

    await staff.populate([
      {path: "employment.reportingTo", select: "name role employeeId"},
      {path: "createdBy", select: "name role"},
    ]);

    res.status(201).json({
      success: true,
      message: "Staff member created successfully",
      data: staff,
    });
  } catch (error) {
    handleError(error, req, res, "createStaff");
  }
});

// @desc    Get all staff members for company
// @route   GET /api/staff
// @access  Private
const getAllStaff = asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      status,
      department,
      search,
      sortBy = "name",
      sortOrder = "asc",
    } = req.query;

    const companyId = getCompanyId(req);
    const query = {companyId, isActive: true};

    if (role && role !== "all") query.role = role;
    if (status && status !== "all") query.status = status;
    if (department && department !== "all")
      query["employment.department"] = department;

    if (search) {
      query.$or = [
        {name: {$regex: search, $options: "i"}},
        {employeeId: {$regex: search, $options: "i"}},
        {email: {$regex: search, $options: "i"}},
        {mobileNumbers: {$regex: search, $options: "i"}},
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const [staff, totalCount] = await Promise.all([
      Staff.find(query)
        .populate("employment.reportingTo", "name role employeeId")
        .populate("createdBy", "name role")
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Staff.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      success: true,
      message: "Staff members retrieved successfully",
      data: staff,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    handleError(error, req, res, "getAllStaff");
  }
});

// @desc    Get single staff member
// @route   GET /api/staff/:id
// @access  Private
const getStaffById = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    const staff = await Staff.findOne({
      _id: req.params.id,
      companyId,
      isActive: true,
    })
      .populate("employment.reportingTo", "name role employeeId")
      .populate("createdBy", "name role")
      .populate("updatedBy", "name role")
      .populate("assignedTasks.taskId", "title description dueDate priority");

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Staff member retrieved successfully",
      data: staff,
    });
  } catch (error) {
    handleError(error, req, res, "getStaffById");
  }
});

// @desc    Update staff member
// @route   PUT /api/staff/:id
// @access  Private
const updateStaff = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const currentUser = req.user;

    const staff = await Staff.findOne({
      _id: req.params.id,
      companyId,
      isActive: true,
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    const updateData = {...req.body};
    updateData.updatedBy = currentUser._id || currentUser.id;

    // Check email uniqueness
    if (updateData.email && updateData.email !== staff.email) {
      const existingStaff = await Staff.findOne({
        email: updateData.email,
        companyId,
        _id: {$ne: staff._id},
        isActive: true,
      });
      if (existingStaff) {
        return res.status(400).json({
          success: false,
          message: "Email already exists for another staff member",
        });
      }
    }

    // Check mobile number uniqueness
    if (updateData.mobileNumbers) {
      const existingStaff = await Staff.findOne({
        mobileNumbers: {$in: updateData.mobileNumbers},
        companyId,
        _id: {$ne: staff._id},
        isActive: true,
      });
      if (existingStaff) {
        return res.status(400).json({
          success: false,
          message: "Mobile number already exists for another staff member",
        });
      }
    }

    // Validate reporting structure
    if (updateData.employment?.reportingTo) {
      if (updateData.employment.reportingTo === staff._id.toString()) {
        return res.status(400).json({
          success: false,
          message: "Staff member cannot report to themselves",
        });
      }

      const reportingManager = await Staff.findOne({
        _id: updateData.employment.reportingTo,
        companyId,
        isActive: true,
      });
      if (!reportingManager) {
        return res.status(400).json({
          success: false,
          message: "Invalid reporting manager selected",
        });
      }
    }

    // Update staff member
    Object.keys(updateData).forEach((key) => {
      if (key !== "_id" && key !== "companyId" && key !== "employeeId") {
        if (typeof updateData[key] === "object" && updateData[key] !== null) {
          staff[key] = {...staff[key], ...updateData[key]};
        } else {
          staff[key] = updateData[key];
        }
      }
    });

    await staff.save();

    await staff.populate([
      {path: "employment.reportingTo", select: "name role employeeId"},
      {path: "createdBy", select: "name role"},
      {path: "updatedBy", select: "name role"},
    ]);

    res.status(200).json({
      success: true,
      message: "Staff member updated successfully",
      data: staff,
    });
  } catch (error) {
    handleError(error, req, res, "updateStaff");
  }
});

// @desc    Delete staff member
// @route   DELETE /api/staff/:id?permanent=true
// @access  Private
const deleteStaff = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const currentUser = req.user;
    const {permanent} = req.query;
    const {reason} = req.body;
    const isHardDelete = permanent === "true";

    const staff = await Staff.findOne({
      _id: req.params.id,
      companyId,
      isActive: true,
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    if (isHardDelete) {
      await Staff.findByIdAndDelete(staff._id);
      res.status(200).json({
        success: true,
        message: "Staff member permanently deleted successfully",
        data: {
          deletedId: staff._id,
          permanent: true,
          reason: reason || "No reason provided",
        },
      });
    } else {
      staff.isActive = false;
      staff.status = "terminated";
      staff.updatedBy = currentUser._id || currentUser.id;
      staff.deletedAt = new Date();

      if (reason) {
        staff.deletionReason = reason;
      }

      await staff.save();

      res.status(200).json({
        success: true,
        message: "Staff member deleted successfully",
        data: {
          deletedId: staff._id,
          permanent: false,
          reason: reason || "No reason provided",
        },
      });
    }
  } catch (error) {
    handleError(error, req, res, "deleteStaff");
  }
});

// @desc    Restore deleted staff member
// @route   PUT /api/staff/:id/restore
// @access  Private
const restoreStaff = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const currentUser = req.user;

    const staff = await Staff.findOne({
      _id: req.params.id,
      companyId,
      isActive: false,
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Deleted staff member not found",
      });
    }

    staff.isActive = true;
    staff.status = "active";
    staff.updatedBy = currentUser._id || currentUser.id;
    staff.restoredAt = new Date();
    staff.deletedAt = undefined;
    staff.deletionReason = undefined;

    await staff.save();

    res.status(200).json({
      success: true,
      message: "Staff member restored successfully",
      data: staff,
    });
  } catch (error) {
    handleError(error, req, res, "restoreStaff");
  }
});

// @desc    Get deleted staff members
// @route   GET /api/staff/deleted
// @access  Private
const getDeletedStaff = asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = "deletedAt",
      sortOrder = "desc",
    } = req.query;

    const companyId = getCompanyId(req);
    const query = {
      companyId,
      isActive: false,
      status: "terminated",
    };

    if (search) {
      query.$or = [
        {name: {$regex: search, $options: "i"}},
        {employeeId: {$regex: search, $options: "i"}},
        {email: {$regex: search, $options: "i"}},
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const [staff, totalCount] = await Promise.all([
      Staff.find(query)
        .populate("employment.reportingTo", "name role employeeId")
        .populate("updatedBy", "name role")
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Staff.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      success: true,
      message: "Deleted staff members retrieved successfully",
      data: staff,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    handleError(error, req, res, "getDeletedStaff");
  }
});

// @desc    Upload staff documents
// @route   POST /api/staff/:id/documents
// @access  Private
const uploadDocuments = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    const staff = await Staff.findOne({
      _id: req.params.id,
      companyId,
      isActive: true,
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    upload.array("documents", 10)(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: "File upload error",
          error: err.message,
        });
      }

      if (!req.files?.length) {
        return res.status(400).json({
          success: false,
          message: "No files uploaded",
        });
      }

      try {
        const uploadedDocs = req.files.map((file, index) => ({
          id: Date.now() + Math.random().toString(36).substr(2, 9),
          name: file.originalname,
          type: req.body.documentTypes?.[index] || "Other",
          size: file.size,
          filePath: file.path,
          uploadDate: new Date(),
          isVerified: false,
        }));

        staff.documents.push(...uploadedDocs);
        await staff.save();

        res.status(200).json({
          success: true,
          message: "Documents uploaded successfully",
          data: uploadedDocs,
        });
      } catch (error) {
        // Clean up uploaded files if database operation fails
        await Promise.all(
          req.files.map((file) => fs.unlink(file.path).catch(() => {}))
        );
        throw error;
      }
    });
  } catch (error) {
    handleError(error, req, res, "uploadDocuments");
  }
});

// @desc    Verify document
// @route   PUT /api/staff/:staffId/documents/:docId/verify
// @access  Private
const verifyDocument = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const currentUser = req.user;

    const staff = await Staff.findOne({
      _id: req.params.staffId,
      companyId,
      isActive: true,
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    const document = staff.documents.id(req.params.docId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    document.isVerified = true;
    document.verifiedBy = currentUser._id || currentUser.id;
    document.verificationDate = new Date();

    await staff.save();

    res.status(200).json({
      success: true,
      message: "Document verified successfully",
      data: document,
    });
  } catch (error) {
    handleError(error, req, res, "verifyDocument");
  }
});

// @desc    Set staff password
// @route   PUT /api/staff/:id/password
// @access  Private
const setPassword = asyncHandler(async (req, res) => {
  try {
    const {password, confirmPassword} = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    const companyId = getCompanyId(req);

    const staff = await Staff.findOne({
      _id: req.params.id,
      companyId,
      isActive: true,
    }).select("+loginCredentials.password");

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    staff.loginCredentials.password = password;
    await staff.save();

    res.status(200).json({
      success: true,
      message: "Password set successfully",
    });
  } catch (error) {
    handleError(error, req, res, "setPassword");
  }
});

// @desc    Get staff statistics
// @route   GET /api/staff/statistics
// @access  Private
const getStaffStatistics = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    let stats;
    if (Staff.getStaffStats) {
      const [statsResult] = await Staff.getStaffStats(companyId);
      stats = statsResult;
    } else {
      const totalStaff = await Staff.countDocuments({
        companyId,
        isActive: true,
      });
      const activeStaff = await Staff.countDocuments({
        companyId,
        isActive: true,
        status: "active",
      });
      const inactiveStaff = totalStaff - activeStaff;

      stats = {
        totalStaff,
        activeStaff,
        inactiveStaff,
        totalTasks: 0,
        completedTasks: 0,
        taskCompletionRate: 0,
        averageAttendance: 0,
      };
    }

    const [roleDistribution, departmentDistribution] = await Promise.all([
      Staff.aggregate([
        {$match: {companyId, isActive: true}},
        {$group: {_id: "$role", count: {$sum: 1}}},
        {$sort: {count: -1}},
      ]),
      Staff.aggregate([
        {$match: {companyId, isActive: true}},
        {$group: {_id: "$employment.department", count: {$sum: 1}}},
        {$sort: {count: -1}},
      ]),
    ]);

    res.status(200).json({
      success: true,
      message: "Staff statistics retrieved successfully",
      data: {
        overall: stats,
        roleDistribution,
        departmentDistribution,
      },
    });
  } catch (error) {
    handleError(error, req, res, "getStaffStatistics");
  }
});

// @desc    Search staff members
// @route   GET /api/staff/search
// @access  Private
const searchStaff = asyncHandler(async (req, res) => {
  try {
    const {q, role, status, limit = 10} = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search term must be at least 2 characters long",
      });
    }

    const companyId = getCompanyId(req);
    const searchTerm = q.trim();
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    let staff;
    if (Staff.searchStaff) {
      const options = {
        role: role && role !== "all" ? role : undefined,
        status: status && status !== "all" ? status : undefined,
        limit: limitNum,
      };
      staff = await Staff.searchStaff(companyId, searchTerm, options);
    } else {
      const query = {
        companyId,
        isActive: true,
        $or: [
          {name: {$regex: searchTerm, $options: "i"}},
          {employeeId: {$regex: searchTerm, $options: "i"}},
          {email: {$regex: searchTerm, $options: "i"}},
          {mobileNumbers: {$regex: searchTerm, $options: "i"}},
        ],
      };

      if (role && role !== "all") query.role = role;
      if (status && status !== "all") query.status = status;

      staff = await Staff.find(query)
        .limit(limitNum)
        .populate("employment.reportingTo", "name role employeeId")
        .lean();
    }

    res.status(200).json({
      success: true,
      message: "Search completed successfully",
      data: staff,
      count: staff.length,
    });
  } catch (error) {
    handleError(error, req, res, "searchStaff");
  }
});

// @desc    Get staff by role
// @route   GET /api/staff/by-role/:role
// @access  Private
const getStaffByRole = asyncHandler(async (req, res) => {
  try {
    const {role} = req.params;
    const {status = "active"} = req.query;
    const companyId = getCompanyId(req);

    let staff;
    if (Staff.findByCompany) {
      staff = await Staff.findByCompany(companyId, {role, status});
    } else {
      const query = {
        companyId,
        role,
        isActive: true,
      };

      if (status !== "all") {
        query.status = status;
      }

      staff = await Staff.find(query)
        .populate("employment.reportingTo", "name role employeeId")
        .lean();
    }

    res.status(200).json({
      success: true,
      message: `${role} staff members retrieved successfully`,
      data: staff,
      count: staff.length,
    });
  } catch (error) {
    handleError(error, req, res, "getStaffByRole");
  }
});

// @desc    Update staff status
// @route   PUT /api/staff/:id/status
// @access  Private
const updateStaffStatus = asyncHandler(async (req, res) => {
  try {
    const {status} = req.body;

    if (
      !["active", "inactive", "terminated", "on-leave", "suspended"].includes(
        status
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const companyId = getCompanyId(req);
    const currentUser = req.user;

    const staff = await Staff.findOne({
      _id: req.params.id,
      companyId,
      isActive: true,
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    staff.status = status;
    staff.updatedBy = currentUser._id || currentUser.id;

    if (status === "terminated") {
      staff.isActive = false;
    }

    await staff.save();

    res.status(200).json({
      success: true,
      message: "Staff status updated successfully",
      data: {status: staff.status, isActive: staff.isActive},
    });
  } catch (error) {
    handleError(error, req, res, "updateStaffStatus");
  }
});

// @desc    Assign task to staff
// @route   POST /api/staff/:id/assign-task
// @access  Private
const assignTask = asyncHandler(async (req, res) => {
  try {
    const {taskId} = req.body;
    const companyId = getCompanyId(req);
    const currentUser = req.user;

    const staff = await Staff.findOne({
      _id: req.params.id,
      companyId,
      isActive: true,
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    if (staff.assignTask) {
      await staff.assignTask(taskId);
    } else {
      if (!staff.assignedTasks) {
        staff.assignedTasks = [];
      }
      staff.assignedTasks.push({
        taskId,
        assignedDate: new Date(),
        assignedBy: currentUser._id || currentUser.id,
      });

      if (!staff.performance) {
        staff.performance = {totalTasksAssigned: 0, totalTasksCompleted: 0};
      }
      staff.performance.totalTasksAssigned =
        (staff.performance.totalTasksAssigned || 0) + 1;

      await staff.save();
    }

    res.status(200).json({
      success: true,
      message: "Task assigned successfully",
      data: {
        totalTasksAssigned:
          staff.performance?.totalTasksAssigned ||
          staff.assignedTasks?.length ||
          1,
      },
    });
  } catch (error) {
    handleError(error, req, res, "assignTask");
  }
});

module.exports = {
  createStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
  restoreStaff,
  getDeletedStaff,
  uploadDocuments,
  verifyDocument,
  setPassword,
  getStaffStatistics,
  searchStaff,
  getStaffByRole,
  updateStaffStatus,
  assignTask,
  upload,
  validateCompanyAccess,
};
