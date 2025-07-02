const User = require("../models/User");
const Company = require("../models/Company");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

// Get all users with pagination and filtering
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      role = "",
      isActive = "",
      emailVerified = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter object
    const filter = {};

    // Search by name or email
    if (search) {
      filter.$or = [
        {name: {$regex: search, $options: "i"}},
        {email: {$regex: search, $options: "i"}},
        {phone: {$regex: search, $options: "i"}},
      ];
    }

    // Filter by role
    if (role) {
      filter.role = role;
    }

    // Filter by active status
    if (isActive !== "") {
      filter.isActive = isActive === "true";
    }

    // Filter by email verification status
    if (emailVerified !== "") {
      filter.emailVerified = emailVerified === "true";
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute query with pagination
    const users = await User.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select("-password -passwordResetToken -emailVerificationToken");

    // Get total count for pagination
    const total = await User.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          limit: parseInt(limit),
        },
      },
      message: "Users fetched successfully",
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

// Get single user by ID
const getUserById = async (req, res) => {
  try {
    const {id} = req.params;

    const user = await User.findById(id).select(
      "-password -passwordResetToken -emailVerificationToken"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
      message: "User fetched successfully",
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error.message,
    });
  }
};

// Create new user (Admin only)
const createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      role = "user",
      isActive = true,
      emailVerified = false,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{email}, {phone}],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          existingUser.email === email
            ? "User with this email already exists"
            : "User with this phone number already exists",
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      phone,
      role,
      isActive,
      emailVerified,
    });

    await user.save();

    // Remove password from response
    const userResponse = user.toJSON();

    res.status(201).json({
      success: true,
      data: userResponse,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message,
    });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const {id} = req.params;
    const updateData = {...req.body};

    // Remove sensitive fields that shouldn't be updated directly
    delete updateData.password;
    delete updateData.passwordResetToken;
    delete updateData.emailVerificationToken;
    delete updateData.loginAttempts;
    delete updateData.lockUntil;

    // If email is being updated, check for duplicates
    if (updateData.email) {
      const existingUser = await User.findOne({
        email: updateData.email,
        _id: {$ne: id},
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    // If phone is being updated, check for duplicates
    if (updateData.phone) {
      const existingUser = await User.findOne({
        phone: updateData.phone,
        _id: {$ne: id},
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Phone number already exists",
        });
      }
    }

    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password -passwordResetToken -emailVerificationToken");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: error.message,
    });
  }
};

// Delete user (Soft delete - set isActive to false)
const deleteUser = async (req, res) => {
  try {
    const {id} = req.params;
    const {permanent = false} = req.query;

    if (permanent === "true") {
      // Permanent delete
      const user = await User.findByIdAndDelete(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "User permanently deleted",
      });
    } else {
      // Soft delete
      const user = await User.findByIdAndUpdate(
        id,
        {isActive: false},
        {new: true}
      ).select("-password -passwordResetToken -emailVerificationToken");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.status(200).json({
        success: true,
        data: user,
        message: "User deactivated successfully",
      });
    }
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
};

// Activate/Deactivate user
const toggleUserStatus = async (req, res) => {
  try {
    const {id} = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    const userResponse = user.toJSON();

    res.status(200).json({
      success: true,
      data: userResponse,
      message: `User ${
        user.isActive ? "activated" : "deactivated"
      } successfully`,
    });
  } catch (error) {
    console.error("Toggle user status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle user status",
      error: error.message,
    });
  }
};

// Change user password (Admin function)
const changeUserPassword = async (req, res) => {
  try {
    const {id} = req.params;
    const {newPassword} = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change user password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change password",
      error: error.message,
    });
  }
};

// Reset user login attempts
const resetLoginAttempts = async (req, res) => {
  try {
    const {id} = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await user.resetLoginAttempts();

    res.status(200).json({
      success: true,
      message: "Login attempts reset successfully",
    });
  } catch (error) {
    console.error("Reset login attempts error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset login attempts",
      error: error.message,
    });
  }
};

// Get user statistics
const getUserStats = async (req, res) => {
  try {
    const stats = await User.getUserStats();

    // Additional statistics
    const recentUsers = await User.find({isActive: true})
      .sort({createdAt: -1})
      .limit(5)
      .select("name email role createdAt");

    const usersByRole = await User.aggregate([
      {$match: {isActive: true}},
      {$group: {_id: "$role", count: {$sum: 1}}},
    ]);

    const monthlyUserGrowth = await User.aggregate([
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

    res.status(200).json({
      success: true,
      data: {
        ...stats,
        recentUsers,
        usersByRole,
        monthlyGrowth: monthlyUserGrowth.reverse(),
      },
      message: "User statistics fetched successfully",
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user statistics",
      error: error.message,
    });
  }
};

// Export user data (CSV format)
const exportUsers = async (req, res) => {
  try {
    const {format = "json"} = req.query;

    const users = await User.find({isActive: true})
      .select(
        "name email phone role isActive emailVerified createdAt lastLogin"
      )
      .sort({createdAt: -1});

    if (format === "csv") {
      // Convert to CSV format
      const csvHeader =
        "Name,Email,Phone,Role,Active,Email Verified,Created At,Last Login\n";
      const csvData = users
        .map(
          (user) =>
            `"${user.name}","${user.email}","${user.phone}","${user.role}","${
              user.isActive
            }","${user.emailVerified}","${user.createdAt}","${
              user.lastLogin || "Never"
            }"`
        )
        .join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=users-export.csv"
      );
      res.status(200).send(csvHeader + csvData);
    } else {
      res.status(200).json({
        success: true,
        data: users,
        message: "Users exported successfully",
      });
    }
  } catch (error) {
    console.error("Export users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export users",
      error: error.message,
    });
  }
};

// Search users with advanced filters
const searchUsers = async (req, res) => {
  try {
    const {
      query,
      role,
      isActive,
      emailVerified,
      dateFrom,
      dateTo,
      limit = 20,
    } = req.query;

    const filter = {};

    // Text search
    if (query) {
      filter.$or = [
        {name: {$regex: query, $options: "i"}},
        {email: {$regex: query, $options: "i"}},
        {phone: {$regex: query, $options: "i"}},
      ];
    }

    // Role filter
    if (role) filter.role = role;

    // Status filters
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (emailVerified !== undefined)
      filter.emailVerified = emailVerified === "true";

    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const users = await User.find(filter)
      .limit(parseInt(limit))
      .sort({createdAt: -1})
      .select("name email phone role isActive emailVerified createdAt");

    res.status(200).json({
      success: true,
      data: users,
      count: users.length,
      message: "Search completed successfully",
    });
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({
      success: false,
      message: "Search failed",
      error: error.message,
    });
  }
};

const getUserDetailsForAdmin = async (req, res) => {
  try {
    const {id} = req.params;

    // Fetch user basic info
    const user = await User.findById(id).select(
      "-password -passwordResetToken -emailVerificationToken"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Fetch detailed company information for owned companies
    const ownedCompanies = await Company.find({owner: id})
      .select(
        "businessName businessType businessCategory email phoneNumber additionalPhones " +
          "address city state pincode tehsil gstin isActive createdAt updatedAt " +
          "subscription.plan subscription.endDate stats logo signatureImage settings"
      )
      .sort({createdAt: -1});

    // Fetch detailed company information for member companies
    const memberCompanies = await Company.find({
      "users.user": id,
      "users.isActive": true,
      owner: {$ne: id},
    })
      .select(
        "businessName businessType businessCategory email phoneNumber additionalPhones " +
          "address city state pincode tehsil gstin isActive createdAt updatedAt " +
          "subscription.plan subscription.endDate stats logo signatureImage users"
      )
      .sort({createdAt: -1});

    // Transform owned companies data
    const transformedOwnedCompanies = ownedCompanies.map((company) => {
      const subscriptionStatus = company.subscription?.endDate
        ? new Date(company.subscription.endDate) > new Date()
          ? "active"
          : "expired"
        : "unknown";

      return {
        id: company._id,
        businessName: company.businessName || "Unknown Business",
        businessType: company.businessType || "Business",
        businessCategory: company.businessCategory || "Other",

        // Contact Information
        email: company.email || "N/A",
        phoneNumber: company.phoneNumber || "N/A",
        additionalPhones: company.additionalPhones || [],

        // Location Information
        address: company.address || "N/A",
        city: company.city || "N/A",
        state: company.state || "N/A",
        pincode: company.pincode || "N/A",
        tehsil: company.tehsil || "N/A",
        fullAddress:
          [company.address, company.city, company.state, company.pincode]
            .filter(Boolean)
            .join(", ") || "N/A",

        // Legal Information
        gstin: company.gstin || "N/A",
        gstEnabled: company.settings?.enableGST || false,

        // Status and Role
        isActive: company.isActive,
        status: company.isActive ? "active" : "inactive",
        userRole: "owner",

        // Subscription and Plan Information
        planType: company.subscription?.plan?.toLowerCase() || "free",
        subscriptionStatus: subscriptionStatus,
        subscriptionEndDate: company.subscription?.endDate || null,
        maxUsers: company.subscription?.maxUsers || 1,
        maxTransactions: company.subscription?.maxTransactions || 100,

        // Company Statistics
        totalUsers: company.stats?.totalUsers || 1,
        totalParties: company.stats?.totalParties || 0,
        totalTransactions: company.stats?.totalTransactions || 0,
        totalRevenue: company.stats?.totalRevenue || 0,

        // Timestamps
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
        lastActivity: company.stats?.lastActivityAt || company.updatedAt,

        // Additional Info
        hasLogo: !!company.logo?.url || !!company.logo?.base64,
        hasSignature:
          !!company.signatureImage?.url || !!company.signatureImage?.base64,
        invoicePrefix: company.settings?.invoicePrefix || "INV",
        purchasePrefix: company.settings?.purchasePrefix || "PUR",
        autoGenerateInvoice: company.settings?.autoGenerateInvoice || true,
        allowMultipleUsers: company.settings?.allowMultipleUsers || false,
      };
    });

    // Transform member companies data
    const transformedMemberCompanies = memberCompanies.map((company) => {
      // Find user's role and permissions in this company
      const userEntry = company.users?.find(
        (u) => u.user && u.user.toString() === id.toString()
      );

      const subscriptionStatus = company.subscription?.endDate
        ? new Date(company.subscription.endDate) > new Date()
          ? "active"
          : "expired"
        : "unknown";

      return {
        id: company._id,
        businessName: company.businessName || "Unknown Business",
        businessType: company.businessType || "Business",
        businessCategory: company.businessCategory || "Other",

        // Contact Information
        email: company.email || "N/A",
        phoneNumber: company.phoneNumber || "N/A",
        additionalPhones: company.additionalPhones || [],

        // Location Information
        address: company.address || "N/A",
        city: company.city || "N/A",
        state: company.state || "N/A",
        pincode: company.pincode || "N/A",
        tehsil: company.tehsil || "N/A",
        fullAddress:
          [company.address, company.city, company.state, company.pincode]
            .filter(Boolean)
            .join(", ") || "N/A",

        // Legal Information
        gstin: company.gstin || "N/A",
        gstEnabled: company.settings?.enableGST || false,

        // Status and Role
        isActive: company.isActive,
        status: company.isActive ? "active" : "inactive",
        userRole: userEntry?.role || "member",
        permissions: userEntry?.permissions || [],
        joinedAt: userEntry?.joinedAt || null,

        // Subscription and Plan Information
        planType: company.subscription?.plan?.toLowerCase() || "free",
        subscriptionStatus: subscriptionStatus,
        subscriptionEndDate: company.subscription?.endDate || null,
        maxUsers: company.subscription?.maxUsers || 1,
        maxTransactions: company.subscription?.maxTransactions || 100,

        // Company Statistics (limited for members)
        totalUsers: company.stats?.totalUsers || 1,
        totalParties: company.stats?.totalParties || 0,
        totalTransactions: company.stats?.totalTransactions || 0,
        // Revenue might be restricted for members based on permissions
        totalRevenue: userEntry?.permissions?.includes("view_reports")
          ? company.stats?.totalRevenue || 0
          : 0,

        // Timestamps
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
        lastActivity: company.stats?.lastActivityAt || company.updatedAt,

        // Additional Info
        hasLogo: !!company.logo?.url || !!company.logo?.base64,
        hasSignature:
          !!company.signatureImage?.url || !!company.signatureImage?.base64,
      };
    });

    // Combine all companies
    const allCompanies = [
      ...transformedOwnedCompanies,
      ...transformedMemberCompanies,
    ];

    // Calculate enhanced statistics
    const totalCompanies = allCompanies.length;
    const activeCompanies = allCompanies.filter(
      (c) => c.status === "active"
    ).length;
    const ownedCompaniesCount = transformedOwnedCompanies.length;
    const memberCompaniesCount = transformedMemberCompanies.length;

    // Plan distribution
    const planDistribution = allCompanies.reduce((acc, company) => {
      const plan = company.planType || "free";
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {});

    // Business type distribution
    const businessTypeDistribution = allCompanies.reduce((acc, company) => {
      const type = company.businessType || "Other";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Revenue and transaction totals (only from owned companies)
    const totalRevenue = transformedOwnedCompanies.reduce(
      (sum, company) => sum + (company.totalRevenue || 0),
      0
    );
    const totalTransactions = transformedOwnedCompanies.reduce(
      (sum, company) => sum + (company.totalTransactions || 0),
      0
    );
    const totalParties = transformedOwnedCompanies.reduce(
      (sum, company) => sum + (company.totalParties || 0),
      0
    );

    // User-focused statistics
    const userStats = {
      totalCompanies,
      ownedCompanies: ownedCompaniesCount,
      memberCompanies: memberCompaniesCount,
      activeCompanies,
      inactiveCompanies: totalCompanies - activeCompanies,
      totalRevenue,
      totalTransactions,
      totalParties,
      planDistribution,
      businessTypeDistribution,
      accountAge: Math.floor(
        (Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)
      ),
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      loginAttempts: user.loginAttempts || 0,
      lastLogin: user.lastLogin,
      role: user.role,
      joinedDate: user.createdAt,
      lastUpdated: user.updatedAt,
    };

    // Recent activity summary
    const recentActivity = {
      totalLogins: user.loginCount || 0,
      lastLoginIP: user.lastLoginIP || null,
      lastLoginDevice: user.lastLoginDevice || null,
      recentCompanies: allCompanies
        .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
        .slice(0, 5)
        .map((company) => ({
          id: company.id,
          name: company.businessName,
          userRole: company.userRole,
          isActive: company.isActive,
          createdAt: company.createdAt,
          lastActivity: company.lastActivity,
        })),
    };

    // Security info
    const securityInfo = {
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified || false,
      twoFactorEnabled: user.twoFactorEnabled || false,
      lastPasswordChange: user.lastPasswordChange || user.createdAt,
      loginAttempts: user.loginAttempts || 0,
      isLocked: user.isLocked || false,
      lockUntil: user.lockUntil || null,
    };

    // Profile completeness
    const profileFields = [
      "name",
      "email",
      "phone",
      "address",
      "city",
      "state",
      "pincode",
    ];
    const completedFields = profileFields.filter(
      (field) => user[field] && user[field].toString().trim() !== ""
    ).length;
    const profileCompleteness = Math.round(
      (completedFields / profileFields.length) * 100
    );

    res.status(200).json({
      success: true,
      data: {
        user: {
          ...user.toObject(),
          stats: userStats,
          recentActivity,
          securityInfo,
          profileCompleteness,
        },
        companies: {
          owned: transformedOwnedCompanies,
          member: transformedMemberCompanies,
          all: allCompanies,
        },
        companySummary: {
          owned: {
            count: ownedCompaniesCount,
            active: transformedOwnedCompanies.filter(
              (c) => c.status === "active"
            ).length,
            recent: transformedOwnedCompanies.slice(0, 3).map((c) => ({
              id: c.id,
              name: c.businessName,
              businessType: c.businessType,
              isActive: c.isActive,
              createdAt: c.createdAt,
              userRole: "owner",
              planType: c.planType,
              city: c.city,
              state: c.state,
              email: c.email,
              phoneNumber: c.phoneNumber,
            })),
          },
          member: {
            count: memberCompaniesCount,
            active: transformedMemberCompanies.filter(
              (c) => c.status === "active"
            ).length,
            recent: transformedMemberCompanies.slice(0, 2).map((c) => ({
              id: c.id,
              name: c.businessName,
              businessType: c.businessType,
              isActive: c.isActive,
              createdAt: c.createdAt,
              userRole: c.userRole,
              planType: c.planType,
              city: c.city,
              state: c.state,
              email: c.email,
              phoneNumber: c.phoneNumber,
              joinedAt: c.joinedAt,
              permissions: c.permissions,
            })),
          },
          total: totalCompanies,
        },
        summary: {
          totalCompanies,
          activeCompanies,
          ownedCompanies: ownedCompaniesCount,
          memberCompanies: memberCompaniesCount,
          totalRevenue,
          totalTransactions,
          totalParties,
          accountAge: userStats.accountAge,
          profileCompleteness,
          lastActivity: user.lastLogin,
          planDistribution,
          businessTypeDistribution,
        },
      },
      message: "Enhanced user details fetched successfully",
      note: "Includes detailed company information with contact, location, and business details",
    });
  } catch (error) {
    console.error("Get user details for admin error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user details",
      error: error.message,
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  changeUserPassword,
  resetLoginAttempts,
  getUserStats,
  exportUsers,
  searchUsers,
  getUserDetailsForAdmin,
};
