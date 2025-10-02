const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");
const { authenticate } = require("../middleware/authMiddleware");
const { body, query, param } = require("express-validator");
const { handleValidationErrors } = require("../middleware/validation");

/**
 * =============================================
 * 🛡️ APPLY AUTHENTICATION MIDDLEWARE TO ALL ROUTES
 * =============================================
 */
router.use(authenticate);

/**
 * =============================================
 * 📋 PROFILE CRUD OPERATIONS
 * =============================================
 */

/**
 * @route   GET /api/profile
 * @desc    Get comprehensive user profile
 * @access  Private
 */
router.get("/", profileController.getProfile);

/**
 * @route   PUT /api/profile
 * @desc    Update comprehensive user profile
 * @access  Private
 */
router.put(
  "/",
  [
    // Add debug logging middleware to see what's being received
    (req, res, next) => {
      console.log('🔍 DEBUG: Profile PUT request received');
      console.log('📋 Request Body:', JSON.stringify(req.body, null, 2));
      console.log('🔤 Content-Type:', req.headers['content-type']);
      console.log('👤 User:', req.user?.id || 'Not authenticated');
      next();
    },

    // DEBUG: Completely bypass validation to identify 400 error source
    (req, res, next) => {
      console.log('🔍 DEBUG: Profile PUT middleware - bypassing all validation');
      console.log('📋 Request Body Keys:', Object.keys(req.body));
      console.log('📋 Request Body Type:', typeof req.body);
      console.log('📋 Request Body:', JSON.stringify(req.body, null, 2));
      console.log('🔤 Content-Type:', req.headers['content-type']);
      console.log('👤 User ID:', req.user?.id);
      console.log('👤 User Object:', req.user);
      next();
    },

    // Comment out strict validation temporarily to identify the issue
    /*
    // Basic validation for backward compatibility with flat structure
    body("name")
      .optional({ checkFalsy: true, nullable: true })
      .isLength({ min: 1, max: 100 })
      .withMessage("Name must be between 1 and 100 characters"),
    
    body("email")
      .optional({ checkFalsy: true, nullable: true })
      .isEmail()
      .withMessage("Must be a valid email address")
      .normalizeEmail(),
      
    body("phone")
      .optional({ checkFalsy: true, nullable: true })
      .isLength({ min: 0, max: 20 })
      .withMessage("Phone number must be valid"),

    // Personal Info Validation (nested structure)
    body("personalInfo.firstName")
      .optional({ checkFalsy: true, nullable: true })
      .isLength({ min: 1, max: 50 })
      .withMessage("First name must be between 1 and 50 characters"),
    
    body("personalInfo.lastName")
      .optional({ checkFalsy: true, nullable: true })
      .isLength({ min: 1, max: 50 })
      .withMessage("Last name must be between 1 and 50 characters"),

    // Contact Info Validation (nested structure)
    body("contactInfo.primaryEmail")
      .optional({ checkFalsy: true, nullable: true })
      .isEmail()
      .withMessage("Primary email must be a valid email address")
      .normalizeEmail(),
      
    body("contactInfo.primaryPhone")
      .optional({ checkFalsy: true, nullable: true })
      .isLength({ min: 0, max: 20 })
      .withMessage("Primary phone number must be valid"),

    // Address validation (nested structure)
    body("addressInfo.permanent.pincode")
      .optional({ checkFalsy: true, nullable: true })
      .isLength({ min: 0, max: 10 })
      .withMessage("Pincode must be valid"),

    body("profileType")
      .optional({ checkFalsy: true, nullable: true })
      .isIn(["personal", "business", "shop", "professional"])
      .withMessage("Profile type must be one of: personal, business, shop, professional"),

    handleValidationErrors,
    */
  ],
  profileController.updateProfile
);

/**
 * @route   DELETE /api/profile
 * @desc    Delete user profile (soft delete)
 * @access  Private
 */
router.delete("/", profileController.deleteProfile);

/**
 * =============================================
 * 📷 IMAGE UPLOAD OPERATIONS
 * =============================================
 */

/**
 * @route   POST /api/profile/upload
 * @desc    Upload profile images (multiple types)
 * @access  Private
 */
router.post(
  "/upload",
  profileController.uploadMiddleware,
  profileController.uploadProfileImages
);

/**
 * @route   POST /api/profile/upload-image (Legacy)
 * @desc    Upload single profile image (legacy endpoint)
 * @access  Private
 */
router.post(
  "/upload-image",
  (req, res, next) => {
    console.log('🖼️ DEBUG: Image upload route hit');
    console.log('📋 Request headers:', req.headers);
    console.log('📋 Content-Type:', req.headers['content-type']);
    
    // Apply multer middleware with error handling
    profileController.uploadProfileImage(req, res, (err) => {
      if (err) {
        console.log('❌ Multer error:', err);
        return res.status(500).json({
          success: false,
          message: "File upload error",
          error: err.message
        });
      }
      next();
    });
  },
  profileController.uploadSingleProfileImage
);

/**
 * =============================================
 * 🔍 SEARCH & DISCOVERY OPERATIONS
 * =============================================
 */

/**
 * @route   GET /api/profile/search
 * @desc    Search profiles by various criteria
 * @access  Private
 */
router.get(
  "/search",
  [
    query("q")
      .notEmpty()
      .withMessage("Search term is required")
      .isLength({ min: 2, max: 100 })
      .withMessage("Search term must be between 2 and 100 characters"),
      
    query("profileType")
      .optional()
      .isIn(["personal", "business", "shop", "professional"])
      .withMessage("Profile type must be one of: personal, business, shop, professional"),
      
    query("businessCategory")
      .optional()
      .isLength({ max: 100 })
      .withMessage("Business category cannot exceed 100 characters"),
      
    query("location")
      .optional()
      .isLength({ max: 100 })
      .withMessage("Location cannot exceed 100 characters"),
      
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
      
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),

    handleValidationErrors,
  ],
  profileController.searchProfiles
);

/**
 * @route   GET /api/profile/business/:category
 * @desc    Get business profiles by category
 * @access  Private
 */
router.get(
  "/business/:category",
  [
    param("category")
      .notEmpty()
      .withMessage("Business category is required")
      .isLength({ min: 2, max: 100 })
      .withMessage("Business category must be between 2 and 100 characters"),
      
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),

    handleValidationErrors,
  ],
  profileController.getBusinessByCategory
);

/**
 * @route   GET /api/profile/location/:state/:city
 * @desc    Get profiles by location (state and city)
 * @access  Private
 */
router.get(
  "/location/:state/:city",
  [
    param("state")
      .notEmpty()
      .withMessage("State is required")
      .isLength({ min: 2, max: 100 })
      .withMessage("State must be between 2 and 100 characters"),
      
    param("city")
      .notEmpty()
      .withMessage("City is required")
      .isLength({ min: 2, max: 100 })
      .withMessage("City must be between 2 and 100 characters"),
      
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),

    handleValidationErrors,
  ],
  profileController.getProfilesByLocation
);

/**
 * =============================================
 * 🔒 SECURITY OPERATIONS
 * =============================================
 */

/**
 * @route   PUT /api/profile/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put(
  "/change-password",
  [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
      
    body("newPassword")
      .isLength({ min: 8, max: 128 })
      .withMessage("New password must be between 8 and 128 characters")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage("New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"),
      
    body("confirmPassword")
      .notEmpty()
      .withMessage("Password confirmation is required")
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error("Password confirmation does not match new password");
        }
        return true;
      }),

    handleValidationErrors,
  ],
  profileController.changePassword
);

/**
 * =============================================
 * 📊 PROFILE ANALYTICS & INSIGHTS
 * =============================================
 */

/**
 * @route   GET /api/profile/analytics
 * @desc    Get profile analytics and insights
 * @access  Private
 */
router.get("/analytics", async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const Profile = require("../models/Profile");
    
    const profile = await Profile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
        code: "PROFILE_NOT_FOUND"
      });
    }

    const analytics = {
      completionPercentage: profile.completionPercentage,
      isComplete: profile.isComplete,
      profileViews: profile.metadata?.profileViews || 0,
      lastUpdated: profile.metadata?.lastProfileUpdate || profile.updatedAt,
      verificationStatus: profile.businessInfo?.verificationStatus || 'pending',
      verificationScore: profile.metadata?.verificationScore || 0,
      profileType: profile.profileType,
      sectionsCompleted: {
        personalInfo: !!profile.personalInfo?.firstName && !!profile.personalInfo?.lastName,
        contactInfo: !!profile.contactInfo?.primaryEmail && !!profile.contactInfo?.primaryPhone,
        addressInfo: !!profile.addressInfo?.permanent?.city && !!profile.addressInfo?.permanent?.state,
        businessInfo: profile.profileType === 'business' || profile.profileType === 'shop' 
          ? !!profile.businessInfo?.businessName && !!profile.businessInfo?.businessCategory
          : true,
        professionalInfo: profile.profileType === 'professional'
          ? !!profile.professionalInfo?.designation && !!profile.professionalInfo?.companyName
          : true
      }
    };

    return res.status(200).json({
      success: true,
      message: "Profile analytics retrieved successfully",
      data: analytics
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error while retrieving analytics",
      code: "ANALYTICS_ERROR",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Legacy route support for backwards compatibility
router.get("/user", profileController.getUserProfile);
router.put("/user", profileController.updateUserProfile);

module.exports = router;