const Staff = require("../models/Staff");
const Company = require("../models/Company");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const {validationResult} = require("express-validator");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../uploads/staff-documents");
    try {
      await fs.mkdir(uploadPath, {recursive: true});
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      `${req.params.staffId || "temp"}-${uniqueSuffix}${path.extname(
        file.originalname
      )}`
    );
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
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
          "Only images (jpeg, jpg, png) and documents (pdf, doc, docx) are allowed!"
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
  return req.companyId || req.user.companyId || req.headers["x-company-id"];
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
      error: error.message,
    });
  }
};

// @desc    Create new staff member
// @route   POST /api/staff
// @access  Private (Any company user) - REMOVED admin/manager restriction
const createStaff = asyncHandler(async (req, res) => {
  try {
    console.log("🚀 Starting staff creation process...");
    console.log("📝 Request body received:", JSON.stringify(req.body, null, 2));

    // ✅ CHECK VALIDATION ERRORS FIRST
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("❌ Validation errors found:", errors.array());
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    console.log("✅ Validation passed successfully");

    // Get company ID and user info
    const companyId = getCompanyId(req);
    const currentUser = req.user;

    console.log("🔍 Company ID validation:", companyId);
    console.log("👤 Current user:", {
      id: currentUser._id || currentUser.id,
      email: currentUser.email,
      role: currentUser.role,
    });

    if (!companyId) {
      console.log("❌ Company ID missing");
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

    // ✅ ADDITIONAL VALIDATION FOR REQUIRED FIELDS
    console.log("🔍 Checking required fields...");

    if (!name || !name.trim()) {
      console.log("❌ Name validation failed");
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    if (!role) {
      console.log("❌ Role validation failed");
      return res.status(400).json({
        success: false,
        message: "Role is required",
      });
    }

    if (
      !mobileNumbers ||
      !Array.isArray(mobileNumbers) ||
      mobileNumbers.length === 0
    ) {
      console.log("❌ Mobile numbers validation failed", mobileNumbers);
      return res.status(400).json({
        success: false,
        message: "At least one mobile number is required",
      });
    }

    if (!employment || !employment.joinDate) {
      console.log("❌ Employment/Join date validation failed", employment);
      return res.status(400).json({
        success: false,
        message: "Join date is required",
      });
    }

    if (!address || !address.street || !address.city || !address.state) {
      console.log("❌ Address validation failed", address);
      return res.status(400).json({
        success: false,
        message: "Complete address (street, city, state) is required",
      });
    }

    console.log("✅ All required fields validation passed");

    // Check if staff with email already exists (if email provided)
    if (email) {
      console.log("🔍 Checking email uniqueness...");
      const existingStaffByEmail = await Staff.findOne({
        email,
        companyId: companyId,
        isActive: true,
      });
      if (existingStaffByEmail) {
        console.log("❌ Email already exists");
        return res.status(400).json({
          success: false,
          message: "Staff member with this email already exists",
        });
      }
      console.log("✅ Email is unique");
    }

    // Check if mobile number already exists
    console.log("🔍 Checking mobile number uniqueness...");
    const existingStaffByMobile = await Staff.findOne({
      mobileNumbers: {$in: mobileNumbers},
      companyId: companyId,
      isActive: true,
    });
    if (existingStaffByMobile) {
      console.log("❌ Mobile number already exists");
      return res.status(400).json({
        success: false,
        message: "Staff member with this mobile number already exists",
      });
    }
    console.log("✅ Mobile number is unique");

    // Validate reporting structure (prevent circular reference)
    if (employment?.reportingTo) {
      console.log("🔍 Validating reporting structure...");
      const reportingManager = await Staff.findOne({
        _id: employment.reportingTo,
        companyId: companyId,
        isActive: true,
      });
      if (!reportingManager) {
        console.log("❌ Invalid reporting manager");
        return res.status(400).json({
          success: false,
          message: "Invalid reporting manager selected",
        });
      }
      console.log("✅ Reporting structure is valid");
    }

    // Generate employee ID
    console.log("🔢 Generating employee ID...");
    const generateEmployeeId = async () => {
      try {
        const company = await Company.findById(companyId);
        const companyPrefix =
          company?.name?.substring(0, 3).toUpperCase() || "EMP";
        const staffCount = await Staff.countDocuments({companyId: companyId});
        const employeeNumber = String(staffCount + 1).padStart(4, "0");
        const employeeId = `${companyPrefix}${employeeNumber}`;

        const existingStaff = await Staff.findOne({
          employeeId: employeeId,
          companyId: companyId,
        });

        if (existingStaff) {
          const timestamp = Date.now().toString().slice(-4);
          return `${companyPrefix}${employeeNumber}${timestamp}`;
        }

        return employeeId;
      } catch (error) {
        console.error("Error generating employee ID:", error);
        const timestamp = Date.now().toString().slice(-6);
        return `EMP${timestamp}`;
      }
    };

    const employeeId = await generateEmployeeId();
    console.log("✅ Generated employee ID:", employeeId);

    // Create staff member
    const staffData = {
      companyId: companyId,
      employeeId: employeeId,
      name: name?.trim(),
      role,
      post,
      mobileNumbers: mobileNumbers
        ?.map((num) => num.trim())
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

    console.log(
      "💾 Staff data to be saved:",
      JSON.stringify(staffData, null, 2)
    );

    const staff = new Staff(staffData);

    console.log("🔄 Saving staff to database...");
    await staff.save();
    console.log("✅ Staff saved successfully with ID:", staff._id);

    // Populate created staff with references
    console.log("🔗 Populating staff references...");
    await staff.populate([
      {path: "employment.reportingTo", select: "name role employeeId"},
      {path: "createdBy", select: "name role"},
    ]);

    console.log("🎉 Staff creation completed successfully");

    // ✅ ENSURE PROPER SUCCESS RESPONSE
    const response = {
      success: true,
      message: "Staff member created successfully",
      data: staff,
    };

    console.log("📤 Sending success response:", {
      success: response.success,
      message: response.message,
      dataId: response.data._id,
    });

    return res.status(201).json(response);
  } catch (error) {
    console.error("❌ Create staff error:", error);
    console.error("❌ Error stack:", error.stack);

    // ✅ HANDLE MONGOOSE VALIDATION ERRORS
    if (error.name === "ValidationError") {
      console.log("❌ Mongoose validation error detected");
      const validationErrors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
        value: err.value,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // ✅ HANDLE DUPLICATE KEY ERRORS
    if (error.code === 11000) {
      console.log("❌ Duplicate key error detected");
      return res.status(400).json({
        success: false,
        message: "Duplicate field value entered",
        error: "Staff member with this information already exists",
      });
    }

    // ✅ HANDLE CAST ERRORS (ObjectId casting issues)
    if (error.name === "CastError") {
      console.log("❌ Cast error detected");
      return res.status(400).json({
        success: false,
        message: "Invalid data format",
        error: `Invalid ${error.path}: ${error.value}`,
      });
    }

    console.log("❌ Unknown error occurred");
    return res.status(500).json({
      success: false,
      message: "Error creating staff member",
      error: error.message,
    });
  }
});

// @desc    Get all staff members for company
// @route   GET /api/staff
// @access  Private (Any company user)
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

    // Build query
    const query = {
      companyId: companyId,
      isActive: true,
    };

    if (role && role !== "all") query.role = role;
    if (status && status !== "all") query.status = status;
    if (department && department !== "all")
      query["employment.department"] = department;

    // Handle search
    if (search) {
      query.$or = [
        {name: {$regex: search, $options: "i"}},
        {employeeId: {$regex: search, $options: "i"}},
        {email: {$regex: search, $options: "i"}},
        {mobileNumbers: {$regex: search, $options: "i"}},
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Get staff with pagination
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

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.status(200).json({
      success: true,
      message: "Staff members retrieved successfully",
      data: staff,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit: limitNum,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.error("Get all staff error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching staff members",
      error: error.message,
    });
  }
});

// @desc    Get single staff member
// @route   GET /api/staff/:id
// @access  Private (Any company user)
const getStaffById = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    const staff = await Staff.findOne({
      _id: req.params.id,
      companyId: companyId,
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
    console.error("Get staff by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching staff member",
      error: error.message,
    });
  }
});

// @desc    Update staff member
// @route   PUT /api/staff/:id
// @access  Private (Any company user) - REMOVED admin/manager/self restriction
const updateStaff = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const currentUser = req.user;

    const staff = await Staff.findOne({
      _id: req.params.id,
      companyId: companyId,
      isActive: true,
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    // REMOVED: Permission check - now any company user can update staff

    const updateData = {...req.body};

    // Add updatedBy field
    updateData.updatedBy = currentUser._id || currentUser.id;

    // Handle email uniqueness check
    if (updateData.email && updateData.email !== staff.email) {
      const existingStaff = await Staff.findOne({
        email: updateData.email,
        companyId: companyId,
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

    // Handle mobile number uniqueness check
    if (updateData.mobileNumbers) {
      const existingStaff = await Staff.findOne({
        mobileNumbers: {$in: updateData.mobileNumbers},
        companyId: companyId,
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
        companyId: companyId,
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

    // Populate updated staff
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
    console.error("Update staff error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating staff member",
      error: error.message,
    });
  }
});

// @desc    Delete staff member (soft delete by default, hard delete with query param)
// @route   DELETE /api/staff/:id?permanent=true
// @access  Private (Any company user)
const deleteStaff = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const currentUser = req.user;
    const {permanent} = req.query; // Check for permanent delete flag
    const {reason} = req.body; // Get deletion reason from request body
    const isHardDelete = permanent === "true";

    const staff = await Staff.findOne({
      _id: req.params.id,
      companyId: companyId,
      isActive: true,
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    // Check for active dependencies before deletion
    if (isHardDelete) {
      // Add business logic checks for hard delete
      // Example: Check if staff has pending tasks, sales records, etc.

      // You can add more checks here based on your business requirements
      console.log("⚠️ Performing hard delete - checking dependencies...");

      // Example dependency check (uncomment and modify as needed):
      /*
      const hasPendingTasks = await Task.countDocuments({
        assignedTo: staff._id,
        status: { $in: ['pending', 'in-progress'] }
      });
      
      if (hasPendingTasks > 0) {
        return res.status(409).json({
          success: false,
          message: "Cannot permanently delete staff member with pending tasks",
        });
      }
      */
    }

    if (isHardDelete) {
      // ✅ HARD DELETE - Permanently remove from database
      console.log("🗑️ Performing hard delete for staff:", staff._id);

      // Log the deletion with reason
      if (reason) {
        console.log("📝 Deletion reason:", reason);
      }

      await Staff.findByIdAndDelete(staff._id);

      console.log("✅ Staff permanently deleted from database");

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
      // ✅ SOFT DELETE - Mark as inactive (existing logic)
      console.log("🔄 Performing soft delete for staff:", staff._id);

      staff.isActive = false;
      staff.status = "terminated";
      staff.updatedBy = currentUser._id || currentUser.id;
      staff.deletedAt = new Date(); // Add deletion timestamp

      // Store deletion reason if provided
      if (reason) {
        staff.deletionReason = reason;
        console.log("📝 Deletion reason stored:", reason);
      }

      await staff.save();

      console.log("✅ Staff soft deleted (marked as inactive)");

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
    console.error("Delete staff error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting staff member",
      error: error.message,
    });
  }
});

// @desc    Restore deleted staff member (soft-deleted only)
// @route   PUT /api/staff/:id/restore
// @access  Private (Any company user)
const restoreStaff = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const currentUser = req.user;

    const staff = await Staff.findOne({
      _id: req.params.id,
      companyId: companyId,
      isActive: false, // Look for inactive/deleted staff
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Deleted staff member not found",
      });
    }

    // Restore the staff member
    staff.isActive = true;
    staff.status = "active";
    staff.updatedBy = currentUser._id || currentUser.id;
    staff.restoredAt = new Date();

    // Clear deletion fields
    staff.deletedAt = undefined;
    staff.deletionReason = undefined;

    await staff.save();

    console.log("✅ Staff member restored:", staff._id);

    res.status(200).json({
      success: true,
      message: "Staff member restored successfully",
      data: staff,
    });
  } catch (error) {
    console.error("Restore staff error:", error);
    res.status(500).json({
      success: false,
      message: "Error restoring staff member",
      error: error.message,
    });
  }
});

// @desc    Get deleted staff members (soft-deleted only)
// @route   GET /api/staff/deleted
// @access  Private (Any company user)
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

    // Build query for deleted staff
    const query = {
      companyId: companyId,
      isActive: false, // Only get soft-deleted staff
      status: "terminated",
    };

    // Handle search
    if (search) {
      query.$or = [
        {name: {$regex: search, $options: "i"}},
        {employeeId: {$regex: search, $options: "i"}},
        {email: {$regex: search, $options: "i"}},
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Get deleted staff with pagination
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

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.status(200).json({
      success: true,
      message: "Deleted staff members retrieved successfully",
      data: staff,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit: limitNum,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.error("Get deleted staff error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching deleted staff members",
      error: error.message,
    });
  }
});

// @desc    Upload staff documents
// @route   POST /api/staff/:id/documents
// @access  Private (Any company user) - REMOVED admin/manager/self restriction
const uploadDocuments = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    const staff = await Staff.findOne({
      _id: req.params.id,
      companyId: companyId,
      isActive: true,
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    // Use multer middleware
    upload.array("documents", 10)(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: "File upload error",
          error: err.message,
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No files uploaded",
        });
      }

      try {
        const uploadedDocs = req.files.map((file) => ({
          id: Date.now() + Math.random().toString(36).substr(2, 9),
          name: file.originalname,
          type: req.body.documentTypes?.[req.files.indexOf(file)] || "Other",
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
        req.files.forEach(async (file) => {
          try {
            await fs.unlink(file.path);
          } catch (unlinkError) {
            console.error("Error deleting file:", unlinkError);
          }
        });

        throw error;
      }
    });
  } catch (error) {
    console.error("Upload documents error:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading documents",
      error: error.message,
    });
  }
});

// @desc    Verify document
// @route   PUT /api/staff/:staffId/documents/:docId/verify
// @access  Private (Any company user) - REMOVED admin/manager restriction
const verifyDocument = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const currentUser = req.user;

    // REMOVED: Admin/Manager check - now any company user can verify documents

    const staff = await Staff.findOne({
      _id: req.params.staffId,
      companyId: companyId,
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
    console.error("Verify document error:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying document",
      error: error.message,
    });
  }
});

// @desc    Set staff password
// @route   PUT /api/staff/:id/password
// @access  Private (Any company user) - REMOVED admin/self restriction
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
    const currentUser = req.user;

    const staff = await Staff.findOne({
      _id: req.params.id,
      companyId: companyId,
      isActive: true,
    }).select("+loginCredentials.password");

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    // REMOVED: Permission check - now any company user can set passwords

    staff.loginCredentials.password = password;
    await staff.save();

    res.status(200).json({
      success: true,
      message: "Password set successfully",
    });
  } catch (error) {
    console.error("Set password error:", error);
    res.status(500).json({
      success: false,
      message: "Error setting password",
      error: error.message,
    });
  }
});

// @desc    Get staff statistics
// @route   GET /api/staff/statistics
// @access  Private (Any company user)
const getStaffStatistics = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    // Use the Staff model's static method if available
    let stats;
    if (Staff.getStaffStats) {
      const [statsResult] = await Staff.getStaffStats(companyId);
      stats = statsResult;
    } else {
      // Fallback manual calculation
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

    const roleDistribution = await Staff.aggregate([
      {$match: {companyId: companyId, isActive: true}},
      {$group: {_id: "$role", count: {$sum: 1}}},
      {$sort: {count: -1}},
    ]);

    const departmentDistribution = await Staff.aggregate([
      {$match: {companyId: companyId, isActive: true}},
      {$group: {_id: "$employment.department", count: {$sum: 1}}},
      {$sort: {count: -1}},
    ]);

    res.status(200).json({
      success: true,
      message: "Staff statistics retrieved successfully",
      data: {
        overall: stats || {
          totalStaff: 0,
          activeStaff: 0,
          inactiveStaff: 0,
          totalTasks: 0,
          completedTasks: 0,
          taskCompletionRate: 0,
          averageAttendance: 0,
        },
        roleDistribution,
        departmentDistribution,
      },
    });
  } catch (error) {
    console.error("Get staff statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching staff statistics",
      error: error.message,
    });
  }
});

// @desc    Search staff members
// @route   GET /api/staff/search
// @access  Private (Any company user)
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

    const options = {
      role: role && role !== "all" ? role : undefined,
      status: status && status !== "all" ? status : undefined,
      limit: parseInt(limit),
    };

    // Use Staff model's search method if available, otherwise manual search
    let staff;
    if (Staff.searchStaff) {
      staff = await Staff.searchStaff(companyId, q.trim(), options);
    } else {
      // Fallback manual search
      const query = {
        companyId: companyId,
        isActive: true,
        $or: [
          {name: {$regex: q.trim(), $options: "i"}},
          {employeeId: {$regex: q.trim(), $options: "i"}},
          {email: {$regex: q.trim(), $options: "i"}},
          {mobileNumbers: {$regex: q.trim(), $options: "i"}},
        ],
      };

      if (options.role) query.role = options.role;
      if (options.status) query.status = options.status;

      staff = await Staff.find(query)
        .limit(options.limit)
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
    console.error("Search staff error:", error);
    res.status(500).json({
      success: false,
      message: "Error searching staff members",
      error: error.message,
    });
  }
});

// @desc    Get staff by role
// @route   GET /api/staff/by-role/:role
// @access  Private (Any company user)
const getStaffByRole = asyncHandler(async (req, res) => {
  try {
    const {role} = req.params;
    const {status = "active"} = req.query;
    const companyId = getCompanyId(req);

    // Use Staff model's method if available, otherwise manual query
    let staff;
    if (Staff.findByCompany) {
      staff = await Staff.findByCompany(companyId, {role, status});
    } else {
      // Fallback manual query
      const query = {
        companyId: companyId,
        role: role,
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
    console.error("Get staff by role error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching staff by role",
      error: error.message,
    });
  }
});

// @desc    Update staff status
// @route   PUT /api/staff/:id/status
// @access  Private (Any company user) - REMOVED admin/manager restriction
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
      companyId: companyId,
      isActive: true,
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    // REMOVED: Admin/Manager check - now any company user can update status

    staff.status = status;
    staff.updatedBy = currentUser._id || currentUser.id;

    // If terminating, mark as inactive
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
    console.error("Update staff status error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating staff status",
      error: error.message,
    });
  }
});

// @desc    Assign task to staff
// @route   POST /api/staff/:id/assign-task
// @access  Private (Any company user) - REMOVED admin/manager restriction
const assignTask = asyncHandler(async (req, res) => {
  try {
    const {taskId} = req.body;
    const companyId = getCompanyId(req);
    const currentUser = req.user;

    // REMOVED: Admin/Manager check - now any company user can assign tasks

    const staff = await Staff.findOne({
      _id: req.params.id,
      companyId: companyId,
      isActive: true,
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    // Use Staff model's method if available
    if (staff.assignTask) {
      await staff.assignTask(taskId);
    } else {
      // Fallback manual assignment
      if (!staff.assignedTasks) {
        staff.assignedTasks = [];
      }
      staff.assignedTasks.push({
        taskId: taskId,
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
    console.error("Assign task error:", error);
    res.status(500).json({
      success: false,
      message: "Error assigning task",
      error: error.message,
    });
  }
});

module.exports = {
  createStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  deleteStaff, // Updated function
  restoreStaff, // New function
  getDeletedStaff, // New function
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
