const User = require("../models/User");
const Profile = require("../models/Profile");
const Company = require("../models/Company");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const validator = require("validator");
const logger = require("../config/logger");

// Simple audit log placeholder
const createAuditLog = async (logData) => {
  try {
    logger.info("Audit Log", logData);
  } catch (error) {
    logger.error("Audit log error", error);
  }
};

// ✅ MULTER CONFIGURATION FOR PROFILE IMAGE UPLOAD
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../uploads/profiles");
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const fieldName = file.fieldname;
    cb(null, `${fieldName}-${req.user.id}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files (JPEG, JPG, PNG, GIF, WebP) are allowed!"));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10, // Maximum 10 files
  },
  fileFilter: fileFilter,
});

// Multiple file upload configuration
const uploadFields = upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
  { name: 'businessLogo', maxCount: 1 },
  { name: 'shopFrontImage', maxCount: 1 },
  { name: 'interiorImages', maxCount: 5 },
  { name: 'productImages', maxCount: 10 },
  { name: 'verificationDocuments', maxCount: 5 }
]);

// ✅ COMPREHENSIVE PROFILE CONTROLLER
const profileController = {
  
  /**
   * ============================================
   * 📋 GET COMPREHENSIVE PROFILE
   * ============================================
   */
  async getProfile(req, res) {
    const startTime = Date.now();
    const clientIp = req.ip || req.connection.remoteAddress;

    try {
      console.log('🔍 Profile GET request received', {
        timestamp: new Date().toISOString(),
        ip: clientIp,
        userAgent: req.headers['user-agent']
      });

      const userId = req.user?.id || req.user?._id;
      console.log('👤 User ID from request:', userId);
      console.log('👤 Full user object:', req.user);

      if (!userId) {
        console.log('❌ No user ID found in request');
        return res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED"
        });
      }

      // Get both User and Profile data
      console.log('🔍 Fetching user and profile data...');
      const [user, profile] = await Promise.all([
        User.findById(userId)
          .select("-password -passwordResetToken -passwordResetExpires -emailVerificationToken"),
        Profile.findOne({ userId }).lean()
      ]);
      
      console.log('👤 User found:', user ? { id: user._id, name: user.name, email: user.email, phone: user.phone } : 'null');
      console.log('📋 Profile found:', profile ? { id: profile._id, profileType: profile.profileType } : 'null');

      if (!user) {
        console.log('❌ User not found in database for ID:', userId);
        return res.status(404).json({
          success: false,
          message: "User not found",
          code: "USER_NOT_FOUND"
        });
      }

      // If no profile exists, create a basic one
      let profileData = profile;
      if (!profile) {
        // Validate required fields before creating profile
        const primaryEmail = user.email;
        const primaryPhone = user.phone;
        
        if (!primaryEmail || !validator.isEmail(primaryEmail)) {
          return res.status(400).json({
            success: false,
            message: "User email is required and must be valid to create profile",
            code: "INVALID_USER_EMAIL"
          });
        }
        
        if (!primaryPhone || !/^[6-9]\d{9}$/.test(primaryPhone)) {
          return res.status(400).json({
            success: false,
            message: "User phone is required and must be a valid 10-digit Indian mobile number to create profile",
            code: "INVALID_USER_PHONE"
          });
        }
        
        try {
          profileData = await Profile.create({
            userId,
            profileType: 'personal',
            contactInfo: {
              primaryEmail,
              primaryPhone
            },
            personalInfo: {
              firstName: user.name?.split(' ')[0] || '',
              lastName: user.name?.split(' ').slice(1).join(' ') || ''
            }
          });
        } catch (createError) {
          logger.error("Error creating profile", {
            userId,
            error: createError.message,
            stack: createError.stack
          });
          
          return res.status(500).json({
            success: false,
            message: "Failed to create profile",
            code: "PROFILE_CREATION_ERROR",
            error: process.env.NODE_ENV === "development" ? createError.message : undefined,
          });
        }
      }

      // Get user's companies
      const companies = await Company.find({
        $or: [
          { createdBy: userId },
          { "staff.userId": userId },
          { "permissions.userId": userId },
        ],
        isActive: true,
      }).select("businessName name email phone city state role");

      logger.info("Comprehensive profile retrieved successfully", {
        userId,
        profileId: profileData._id,
        profileType: profileData.profileType,
        completionPercentage: profileData.completionPercentage,
        responseTime: Date.now() - startTime,
        ip: clientIp,
      });

      // Transform profile data for frontend compatibility
      const flatProfile = transformToFlatStructure(profileData);
      
      // Merge user data with profile data for flat structure
      const combinedProfile = {
        id: user._id,
        name: flatProfile.name || user.name,
        email: flatProfile.email || user.email,
        phone: flatProfile.phone || user.phone,
        bio: flatProfile.bio || '',
        address: flatProfile.address || {
          street: '',
          city: '',
          state: '',
          country: 'India',
          pincode: ''
        },
        company: flatProfile.company || {
          name: '',
          designation: '',
          department: ''
        },
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        avatar: user.avatar,
        lastLogin: user.lastLogin,
        profileImage: profileData.personalInfo?.profileImage || user.avatar,
        completionPercentage: profileData.completionPercentage,
        isComplete: profileData.isComplete,
        profileType: profileData.profileType
      };

      return res.status(200).json({
        success: true,
        message: "Profile retrieved successfully",
        data: combinedProfile,
        // Also include the nested structure for advanced components
        profile: profileData,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          avatar: user.avatar,
          lastLogin: user.lastLogin,
          companies: user.companies || []
        },
        companies,
        summary: {
          completionPercentage: profileData.completionPercentage,
          isComplete: profileData.isComplete,
          profileType: profileData.profileType,
          lastUpdated: profileData.metadata?.lastProfileUpdate || profileData.updatedAt,
          verificationStatus: profileData.businessInfo?.verificationStatus || 'pending'
        },
        meta: {
          responseTime: Date.now() - startTime,
          requestId: req.headers['x-request-id'] || null
        }
      });

    } catch (error) {
      logger.error("Error retrieving comprehensive profile", {
        userId: req.user?.id,
        error: error.message,
        stack: error.stack,
        responseTime: Date.now() - startTime,
        ip: clientIp,
        errorName: error.name,
        errorCode: error.code
      });

      // Handle specific mongoose validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: "Profile validation failed",
          code: "VALIDATION_ERROR",
          errors: validationErrors,
          error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }

      // Handle mongoose cast errors
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: "Invalid data format",
          code: "CAST_ERROR",
          error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Internal server error while retrieving profile",
        code: "PROFILE_RETRIEVAL_ERROR",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  /**
   * ============================================
   * 🔄 UPDATE COMPREHENSIVE PROFILE
   * ============================================
   */
  async updateProfile(req, res) {
    const startTime = Date.now();
    const clientIp = req.ip || req.connection.remoteAddress;
    let updateData = req.body; // ✅ FIX: Move updateData declaration outside try block

    try {
      const userId = req.user?.id || req.user?._id;

      console.log('🔍 Profile Update Request:', {
        userId,
        requestBody: JSON.stringify(updateData, null, 2),
        timestamp: new Date().toISOString()
      });

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED"
        });
      }

      // Validate request body
      if (!updateData || Object.keys(updateData).length === 0) {
        console.log('❌ Empty request body received');
        return res.status(400).json({
          success: false,
          message: "No update data provided",
          code: "INVALID_REQUEST_BODY"
        });
      }

      // Add comprehensive logging before transformation
      console.log('📥 Raw Update Data:', {
        keys: Object.keys(updateData),
        hasPersonalInfo: !!updateData.personalInfo,
        hasContactInfo: !!updateData.contactInfo,
        hasAddressInfo: !!updateData.addressInfo,
        dataTypes: Object.keys(updateData).reduce((acc, key) => {
          acc[key] = typeof updateData[key];
          return acc;
        }, {})
      });

      // Transform flat structure to nested structure for backward compatibility
      try {
        updateData = transformToNestedStructure(updateData);
        console.log('✅ Data transformation completed successfully');
      } catch (transformError) {
        console.error('❌ Data transformation failed:', transformError);
        return res.status(400).json({
          success: false,
          message: "Invalid data format",
          code: "DATA_TRANSFORMATION_ERROR",
          error: process.env.NODE_ENV === "development" ? transformError.message : undefined
        });
      }

      console.log('Transformed update data:', JSON.stringify(updateData, null, 2));

      // Normalize enum values to prevent validation errors
      if (updateData.personalInfo) {
        // Normalize gender (capitalize first letter, lowercase rest)
        if (updateData.personalInfo.gender) {
          const gender = updateData.personalInfo.gender.toLowerCase();
          if (['male', 'female', 'other', 'prefer-not-to-say'].includes(gender)) {
            updateData.personalInfo.gender = gender;
          } else {
            delete updateData.personalInfo.gender; // Remove invalid values
          }
        }
        
        // Normalize maritalStatus - remove empty strings
        if (updateData.personalInfo.maritalStatus === '' || updateData.personalInfo.maritalStatus === null) {
          delete updateData.personalInfo.maritalStatus;
        } else if (updateData.personalInfo.maritalStatus) {
          const maritalStatus = updateData.personalInfo.maritalStatus.toLowerCase();
          if (['single', 'married', 'divorced', 'widowed', 'separated', 'prefer-not-to-say'].includes(maritalStatus)) {
            updateData.personalInfo.maritalStatus = maritalStatus;
          } else {
            delete updateData.personalInfo.maritalStatus; // Remove invalid values
          }
        }
      }

      console.log('📋 Normalized update data:', JSON.stringify(updateData, null, 2));

      // Find existing profile or create new one
      let profile = await Profile.findOne({ userId });
      
      if (!profile) {
        // Create new profile
        profile = new Profile({
          userId,
          profileType: updateData.profileType || 'personal',
          ...updateData
        });
      } else {
        // Clean existing profile data to prevent validation errors
        if (profile.personalInfo) {
          // Fix gender enum values
          if (profile.personalInfo.gender && typeof profile.personalInfo.gender === 'string') {
            const gender = profile.personalInfo.gender.toLowerCase();
            if (!['male', 'female', 'other', 'prefer-not-to-say'].includes(gender)) {
              profile.personalInfo.gender = undefined;
            } else {
              profile.personalInfo.gender = gender;
            }
          }
          
          // Fix maritalStatus enum values
          if (profile.personalInfo.maritalStatus === '' || 
              (profile.personalInfo.maritalStatus && 
               !['single', 'married', 'divorced', 'widowed', 'separated', 'prefer-not-to-say'].includes(profile.personalInfo.maritalStatus.toLowerCase()))) {
            profile.personalInfo.maritalStatus = undefined;
          } else if (profile.personalInfo.maritalStatus) {
            profile.personalInfo.maritalStatus = profile.personalInfo.maritalStatus.toLowerCase();
          }
        }
        
        console.log('🧹 Cleaned existing profile data');
        
        // Update existing profile - use deep merge for nested objects
        Object.keys(updateData).forEach(key => {
          if (key !== '_id' && key !== 'userId' && key !== '__v') {
            if (typeof updateData[key] === 'object' && updateData[key] !== null && !Array.isArray(updateData[key])) {
              // Handle nested objects (deep merge instead of shallow merge)
              if (!profile[key]) profile[key] = {};
              profile[key] = { ...profile[key], ...updateData[key] };
              profile.markModified(key); // Mark as modified for MongoDB
            } else {
              profile[key] = updateData[key];
            }
          }
        });
      }

      // Save the profile (this will trigger pre-save middleware to calculate completion percentage)
      try {
        console.log('💾 Attempting to save profile...');
        await profile.save();
        console.log('✅ Profile saved successfully to database');
      } catch (saveError) {
        console.error('❌ Profile save failed:', {
          error: saveError.message,
          stack: saveError.stack,
          validationErrors: saveError.errors,
          profileData: JSON.stringify(profile.toObject(), null, 2)
        });
        
        // Handle specific validation errors
        if (saveError.name === 'ValidationError') {
          const validationErrors = Object.values(saveError.errors).map(err => ({
            field: err.path,
            message: err.message,
            value: err.value
          }));
          
          return res.status(400).json({
            success: false,
            message: "Profile validation failed",
            code: "PROFILE_VALIDATION_ERROR",
            errors: validationErrors
          });
        }
        
        throw saveError; // Re-throw non-validation errors
      }

      // Update basic user info if provided
      const userUpdateData = {};
      if (updateData.personalInfo?.firstName && updateData.personalInfo?.lastName) {
        userUpdateData.name = `${updateData.personalInfo.firstName} ${updateData.personalInfo.lastName}`.trim();
      }
      if (updateData.contactInfo?.primaryEmail) {
        userUpdateData.email = updateData.contactInfo.primaryEmail;
      }
      if (updateData.contactInfo?.primaryPhone) {
        userUpdateData.phone = updateData.contactInfo.primaryPhone;
      }

      if (Object.keys(userUpdateData).length > 0) {
        try {
          console.log('👤 Updating user data:', userUpdateData);
          await User.findByIdAndUpdate(userId, userUpdateData, { new: true });
          console.log('✅ User data updated successfully');
        } catch (userUpdateError) {
          console.error('❌ User update failed:', userUpdateError.message);
          // Don't fail the entire operation if user update fails
        }
      }

      // Create audit log
      await createAuditLog({
        userId,
        action: profile.isNew ? "CREATE_PROFILE" : "UPDATE_PROFILE",
        entityType: "Profile",
        entityId: profile._id,
        details: {
          updatedFields: Object.keys(updateData),
          profileType: profile.profileType,
          completionPercentage: profile.completionPercentage
        },
        ipAddress: clientIp,
        userAgent: req.headers["user-agent"],
      });

      logger.info("Profile updated successfully", {
        userId,
        profileId: profile._id,
        profileType: profile.profileType,
        completionPercentage: profile.completionPercentage,
        updatedFields: Object.keys(updateData),
        responseTime: Date.now() - startTime,
        ip: clientIp,
      });

      // Get updated user data
      const updatedUser = await User.findById(userId).select("-password -passwordResetToken -passwordResetExpires -emailVerificationToken");
      
      // Transform profile data for frontend compatibility
      const flatProfile = transformToFlatStructure(profile);
      
      // Merge user data with profile data for flat structure
      const combinedProfile = {
        id: updatedUser._id,
        name: flatProfile.name || updatedUser.name,
        email: flatProfile.email || updatedUser.email,
        phone: flatProfile.phone || updatedUser.phone,
        bio: flatProfile.bio || '',
        address: flatProfile.address || {
          street: '',
          city: '',
          state: '',
          country: 'India',
          pincode: ''
        },
        company: flatProfile.company || {
          name: '',
          designation: '',
          department: ''
        },
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        emailVerified: updatedUser.emailVerified,
        avatar: updatedUser.avatar,
        lastLogin: updatedUser.lastLogin,
        profileImage: profile.personalInfo?.profileImage || updatedUser.avatar,
        completionPercentage: profile.completionPercentage,
        isComplete: profile.isComplete,
        profileType: profile.profileType
      };

      return res.status(200).json({
        success: true,
        message: profile.isNew ? "Profile created successfully" : "Profile updated successfully",
        data: combinedProfile,
        // Also include nested structure
        profile,
        user: updatedUser,
        summary: profile.getProfileSummary ? profile.getProfileSummary() : {
          completionPercentage: profile.completionPercentage,
          isComplete: profile.isComplete,
          profileType: profile.profileType
        },
        meta: {
          responseTime: Date.now() - startTime,
          requestId: req.headers['x-request-id'] || null
        }
      });

    } catch (error) {
      // Handle validation errors
      if (error.name === "ValidationError") {
        const validationErrors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message,
          value: err.value
        }));

        logger.error("Profile validation error", {
          userId: req.user?.id,
          validationErrors,
          originalError: error.message,
          updateData: updateData ? JSON.stringify(updateData, null, 2) : 'undefined',
          errorStack: error.stack
        });

        return res.status(400).json({
          success: false,
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          errors: validationErrors
        });
      }

      // Handle duplicate key errors
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Duplicate profile data",
          code: "DUPLICATE_PROFILE",
          details: error.keyPattern
        });
      }

      logger.error("Error updating profile", {
        userId: req.user?.id,
        error: error.message,
        stack: error.stack,
        responseTime: Date.now() - startTime,
        ip: clientIp,
      });

      return res.status(500).json({
        success: false,
        message: "Internal server error while updating profile",
        code: "PROFILE_UPDATE_ERROR",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  /**
   * ============================================
   * 📷 UPLOAD PROFILE IMAGES
   * ============================================
   */
  async uploadProfileImages(req, res) {
    const startTime = Date.now();
    const clientIp = req.ip || req.connection.remoteAddress;

    try {
      const userId = req.user?.id || req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED"
        });
      }

      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No files uploaded",
          code: "NO_FILES_UPLOADED"
        });
      }

      // Find or create profile
      let profile = await Profile.findOne({ userId });
      if (!profile) {
        profile = new Profile({ 
          userId, 
          profileType: 'personal',
          contactInfo: {
            primaryEmail: req.user.email,
            primaryPhone: req.user.phone
          }
        });
      }

      const uploadedFiles = {};
      const baseUrl = `${req.protocol}://${req.get('host')}`;

      // Process each type of uploaded file
      Object.keys(req.files).forEach(fieldName => {
        const files = req.files[fieldName];
        const filePaths = files.map(file => `/uploads/profiles/${file.filename}`);
        
        switch (fieldName) {
          case 'profileImage':
            profile.personalInfo = profile.personalInfo || {};
            profile.personalInfo.profileImage = `${baseUrl}${filePaths[0]}`;
            uploadedFiles.profileImage = profile.personalInfo.profileImage;
            break;
            
          case 'coverImage':
            profile.personalInfo = profile.personalInfo || {};
            profile.personalInfo.coverImage = `${baseUrl}${filePaths[0]}`;
            uploadedFiles.coverImage = profile.personalInfo.coverImage;
            break;
            
          case 'businessLogo':
            profile.businessInfo = profile.businessInfo || {};
            profile.businessInfo.images = profile.businessInfo.images || {};
            profile.businessInfo.images.logo = `${baseUrl}${filePaths[0]}`;
            uploadedFiles.businessLogo = profile.businessInfo.images.logo;
            break;
            
          case 'shopFrontImage':
            profile.businessInfo = profile.businessInfo || {};
            profile.businessInfo.images = profile.businessInfo.images || {};
            profile.businessInfo.images.shopFront = `${baseUrl}${filePaths[0]}`;
            uploadedFiles.shopFrontImage = profile.businessInfo.images.shopFront;
            break;
            
          case 'interiorImages':
            profile.businessInfo = profile.businessInfo || {};
            profile.businessInfo.images = profile.businessInfo.images || {};
            profile.businessInfo.images.interior = filePaths.map(path => `${baseUrl}${path}`);
            uploadedFiles.interiorImages = profile.businessInfo.images.interior;
            break;
            
          case 'productImages':
            profile.businessInfo = profile.businessInfo || {};
            profile.businessInfo.images = profile.businessInfo.images || {};
            profile.businessInfo.images.products = filePaths.map(path => `${baseUrl}${path}`);
            uploadedFiles.productImages = profile.businessInfo.images.products;
            break;
            
          case 'verificationDocuments':
            profile.businessInfo = profile.businessInfo || {};
            profile.businessInfo.verificationDocuments = profile.businessInfo.verificationDocuments || [];
            filePaths.forEach((path, index) => {
              profile.businessInfo.verificationDocuments.push({
                documentType: req.body.documentTypes ? req.body.documentTypes[index] : 'other',
                documentUrl: `${baseUrl}${path}`,
                uploadDate: new Date()
              });
            });
            uploadedFiles.verificationDocuments = profile.businessInfo.verificationDocuments;
            break;
        }
      });

      await profile.save();

      // Update user avatar if profile image was uploaded
      if (uploadedFiles.profileImage) {
        await User.findByIdAndUpdate(userId, { avatar: uploadedFiles.profileImage });
      }

      // Create audit log
      await createAuditLog({
        userId,
        action: "UPLOAD_PROFILE_IMAGES",
        entityType: "Profile",
        entityId: profile._id,
        details: {
          uploadedFiles: Object.keys(uploadedFiles),
          filesCount: Object.keys(req.files).reduce((sum, key) => sum + req.files[key].length, 0)
        },
        ipAddress: clientIp,
        userAgent: req.headers["user-agent"],
      });

      logger.info("Profile images uploaded successfully", {
        userId,
        profileId: profile._id,
        uploadedFiles: Object.keys(uploadedFiles),
        responseTime: Date.now() - startTime,
        ip: clientIp,
      });

      return res.status(200).json({
        success: true,
        message: "Images uploaded successfully",
        data: {
          uploadedFiles,
          profile: profile.getProfileSummary()
        },
        meta: {
          responseTime: Date.now() - startTime,
          requestId: req.headers['x-request-id'] || null
        }
      });

    } catch (error) {
      logger.error("Error uploading profile images", {
        userId: req.user?.id,
        error: error.message,
        stack: error.stack,
        responseTime: Date.now() - startTime,
        ip: clientIp,
      });

      return res.status(500).json({
        success: false,
        message: "Internal server error while uploading images",
        code: "IMAGE_UPLOAD_ERROR",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  /**
   * ============================================
   * � UPLOAD SINGLE PROFILE IMAGE (Legacy)
   * ============================================
   */
  async uploadSingleProfileImage(req, res) {
    const startTime = Date.now();
    const clientIp = req.ip || req.connection.remoteAddress;

    try {
      console.log('🖼️ DEBUG: uploadSingleProfileImage called');
      console.log('📋 Request file:', req.file);
      console.log('📋 Request body:', req.body);
      console.log('📋 User:', req.user);
      
      const userId = req.user?.id || req.user?._id;
      
      if (!userId) {
        console.log('❌ No user ID found');
        return res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED"
        });
      }

      if (!req.file) {
        console.log('❌ No file uploaded in request');
        console.log('📋 Available req properties:', Object.keys(req));
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
          code: "NO_FILE_UPLOADED"
        });
      }

      // Find or create profile
      let profile = await Profile.findOne({ userId });
      if (!profile) {
        profile = new Profile({ 
          userId, 
          profileType: 'personal',
          contactInfo: {
            primaryEmail: req.user.email,
            primaryPhone: req.user.phone
          }
        });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const profileImageUrl = `${baseUrl}/uploads/profiles/${req.file.filename}`;

      // Log for debugging
      const validator = require('validator');
      const relativePath = `/uploads/profiles/${req.file.filename}`;
      console.log('🔍 Upload debug info:', {
        protocol: req.protocol,
        host: req.get('host'),
        baseUrl: baseUrl,
        filename: req.file.filename,
        profileImageUrl: profileImageUrl,
        relativePath: relativePath,
        isValidURL: validator.isURL(profileImageUrl),
        matchesFilePattern: /^\/uploads\//.test(relativePath)
      });

      // Use relative path for database storage (matches schema validation)
      // But return full URL for frontend use
      const imagePathForDb = relativePath; // This will pass schema validation
      
      // Update profile with new image - use direct MongoDB updateOne to bypass all validation
      await Profile.collection.updateOne(
        { _id: profile._id },
        { 
          $set: { 
            'personalInfo.profileImage': imagePathForDb 
          } 
        }
      );

      console.log('✅ Profile image updated successfully with direct MongoDB operation');

      // Update user avatar with full URL
      await User.findByIdAndUpdate(userId, { avatar: profileImageUrl });

      // Create audit log
      await createAuditLog({
        userId,
        action: "UPLOAD_PROFILE_IMAGE",
        entityType: "Profile",
        entityId: profile._id,
        details: {
          fileName: req.file.filename,
          fileSize: req.file.size,
          mimeType: req.file.mimetype
        },
        ipAddress: clientIp,
        userAgent: req.headers["user-agent"],
      });

      logger.info("Profile image uploaded successfully", {
        userId,
        profileId: profile._id,
        fileName: req.file.filename,
        responseTime: Date.now() - startTime,
        ip: clientIp,
      });

      return res.status(200).json({
        success: true,
        message: "Profile image uploaded successfully",
        data: {
          profileImageUrl: profileImageUrl, // Full URL for frontend
          avatarUrl: profileImageUrl // For backward compatibility
        },
        meta: {
          responseTime: Date.now() - startTime,
          requestId: req.headers['x-request-id'] || null
        }
      });

    } catch (error) {
      console.log('❌ ERROR in uploadSingleProfileImage:', error);
      console.log('❌ Error stack:', error.stack);
      
      logger.error("Error uploading profile image", {
        userId: req.user?.id,
        error: error.message,
        stack: error.stack,
        responseTime: Date.now() - startTime,
        ip: clientIp,
      });

      return res.status(500).json({
        success: false,
        message: "Internal server error while uploading image",
        code: "IMAGE_UPLOAD_ERROR",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  /**
   * ============================================
   * �🔍 SEARCH PROFILES
   * ============================================
   */
  async searchProfiles(req, res) {
    const startTime = Date.now();
    try {
      const { 
        q: searchTerm, 
        profileType, 
        businessCategory, 
        location, 
        page = 1, 
        limit = 20 
      } = req.query;

      if (!searchTerm || searchTerm.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "Search term must be at least 2 characters long",
          code: "INVALID_SEARCH_TERM"
        });
      }

      const filters = { userId: { $ne: req.user?.id } }; // Exclude current user
      if (profileType) filters.profileType = profileType;
      if (businessCategory) filters['businessInfo.businessCategory'] = new RegExp(businessCategory, 'i');

      // Text search
      const searchRegex = new RegExp(searchTerm.trim(), 'i');
      filters.$or = [
        { 'personalInfo.firstName': searchRegex },
        { 'personalInfo.lastName': searchRegex },
        { 'businessInfo.businessName': searchRegex },
        { 'businessInfo.businessCategory': searchRegex }
      ];

      const profiles = await Profile.find(filters)
        .populate('userId', 'name email')
        .limit(parseInt(limit))
        .sort({ completionPercentage: -1 })
        .lean();

      return res.status(200).json({
        success: true,
        message: "Search completed successfully",
        data: { profiles, searchTerm, count: profiles.length },
        meta: { responseTime: Date.now() - startTime }
      });

    } catch (error) {
      logger.error("Error searching profiles", { error: error.message });
      return res.status(500).json({
        success: false,
        message: "Internal server error while searching profiles",
        code: "SEARCH_ERROR"
      });
    }
  },

  /**
   * ============================================
   * 🏪 GET BUSINESS PROFILES BY CATEGORY
   * ============================================
   */
  async getBusinessByCategory(req, res) {
    const startTime = Date.now();
    try {
      const { category } = req.params;
      const { limit = 20 } = req.query;

      if (!category) {
        return res.status(400).json({
          success: false,
          message: "Business category is required",
          code: "CATEGORY_REQUIRED"
        });
      }

      const businesses = await Profile.find({
        'businessInfo.businessCategory': new RegExp(category, 'i'),
        profileType: { $in: ['business', 'shop'] }
      })
      .populate('userId', 'name email')
      .limit(parseInt(limit))
      .sort({ completionPercentage: -1 })
      .lean();

      return res.status(200).json({
        success: true,
        message: "Business profiles retrieved successfully",
        data: { businesses, category, count: businesses.length },
        meta: { responseTime: Date.now() - startTime }
      });

    } catch (error) {
      logger.error("Error retrieving business profiles by category", { error: error.message });
      return res.status(500).json({
        success: false,
        message: "Internal server error while retrieving business profiles",
        code: "BUSINESS_RETRIEVAL_ERROR"
      });
    }
  },

  /**
   * ============================================
   * 📍 GET PROFILES BY LOCATION
   * ============================================
   */
  async getProfilesByLocation(req, res) {
    const startTime = Date.now();
    try {
      const { state, city } = req.params;
      const { limit = 20 } = req.query;

      if (!state || !city) {
        return res.status(400).json({
          success: false,
          message: "State and city are required",
          code: "LOCATION_REQUIRED"
        });
      }

      const profiles = await Profile.find({
        $or: [
          { 'addressInfo.permanent.state': new RegExp(state, 'i'), 'addressInfo.permanent.city': new RegExp(city, 'i') },
          { 'addressInfo.current.state': new RegExp(state, 'i'), 'addressInfo.current.city': new RegExp(city, 'i') }
        ]
      })
      .populate('userId', 'name email')
      .limit(parseInt(limit))
      .sort({ completionPercentage: -1 })
      .lean();

      return res.status(200).json({
        success: true,
        message: "Profiles retrieved successfully",
        data: { profiles, location: { state, city }, count: profiles.length },
        meta: { responseTime: Date.now() - startTime }
      });

    } catch (error) {
      logger.error("Error retrieving profiles by location", { error: error.message });
      return res.status(500).json({
        success: false,
        message: "Internal server error while retrieving profiles by location",
        code: "LOCATION_RETRIEVAL_ERROR"
      });
    }
  },

  /**
   * ============================================
   * 🗑️ DELETE PROFILE
   * ============================================
   */
  async deleteProfile(req, res) {
    const startTime = Date.now();
    try {
      const userId = req.user?.id || req.user?._id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED"
        });
      }

      const profile = await Profile.findOne({ userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: "Profile not found",
          code: "PROFILE_NOT_FOUND"
        });
      }

      // Soft delete by marking as inactive
      profile.metadata = profile.metadata || {};
      profile.metadata.isActive = false;
      await profile.save();

      return res.status(200).json({
        success: true,
        message: "Profile deleted successfully",
        data: { profileId: profile._id, deletedAt: new Date() },
        meta: { responseTime: Date.now() - startTime }
      });

    } catch (error) {
      logger.error("Error deleting profile", { error: error.message });
      return res.status(500).json({
        success: false,
        message: "Internal server error while deleting profile",
        code: "PROFILE_DELETE_ERROR"
      });
    }
  },

  /**
   * ============================================
   * 🔒 CHANGE PASSWORD
   * ============================================
   */
  async changePassword(req, res) {
    const startTime = Date.now();
    try {
      const userId = req.user?.id || req.user?._id;
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED"
        });
      }

      // Validate input
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password, new password and confirmation are required",
          code: "MISSING_REQUIRED_FIELDS"
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "New password and confirmation do not match",
          code: "PASSWORD_MISMATCH"
        });
      }

      // Get user with password
      const user = await User.findById(userId).select("+password");
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
          code: "USER_NOT_FOUND"
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
          code: "INVALID_CURRENT_PASSWORD"
        });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await User.findByIdAndUpdate(userId, {
        password: hashedNewPassword,
        passwordChangedAt: new Date()
      });

      return res.status(200).json({
        success: true,
        message: "Password changed successfully",
        data: { changedAt: new Date() },
        meta: { responseTime: Date.now() - startTime }
      });

    } catch (error) {
      logger.error("Error changing password", { error: error.message });
      return res.status(500).json({
        success: false,
        message: "Internal server error while changing password",
        code: "PASSWORD_CHANGE_ERROR"
      });
    }
  },

  // ============================================
  // 📁 MULTER MIDDLEWARE & LEGACY METHODS
  // ============================================
  
  // Multiple file upload middleware
  uploadMiddleware: uploadFields,
  
  // Single file upload middleware (for backwards compatibility)
  uploadProfileImage: upload.single("profileImage"),
  
  // Legacy methods for backwards compatibility
  getUserProfile: async function(req, res) {
    return this.getProfile(req, res);
  },
  
  updateUserProfile: async function(req, res) {
    return this.updateProfile(req, res);
  }
};

/**
 * ============================================
 * 🔄 TRANSFORMATION UTILITIES
 * ============================================
 */

/**
 * Transform flat profile structure to nested structure for backward compatibility
 */
function transformToNestedStructure(data) {
  try {
    console.log('🔄 Starting data transformation...', { inputKeys: Object.keys(data || {}) });
    
    if (!data || typeof data !== 'object') {
      console.log('⚠️ Warning: Invalid data provided to transformToNestedStructure:', data);
      return {};
    }
    
    const transformed = { ...data };

    // Handle flat structure fields - check for existence before processing
    if (data.name || data.email || data.phone || data.bio) {
      console.log('🔄 Processing flat structure fields...');
      
      // Extract first and last name from name field with null checks
      const nameParts = (data.name || '').toString().trim().split(' ').filter(part => part && part.length > 0);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Personal Info - ensure object exists
      if (!transformed.personalInfo) transformed.personalInfo = {};
      if (firstName) transformed.personalInfo.firstName = firstName;
      if (lastName) transformed.personalInfo.lastName = lastName;
      if (data.bio) transformed.personalInfo.bio = data.bio;

      // Contact Info - ensure object exists
      if (!transformed.contactInfo) transformed.contactInfo = {};
      if (data.email) transformed.contactInfo.primaryEmail = data.email;
      if (data.phone) transformed.contactInfo.primaryPhone = data.phone;

      // Remove flat fields to avoid duplication
      delete transformed.name;
      delete transformed.email;
      delete transformed.phone;
      delete transformed.bio;
      
      console.log('✅ Flat structure transformation completed');
    }

  // Handle address transformation
  if (data.address) {
    if (!transformed.addressInfo) transformed.addressInfo = {};
    if (!transformed.addressInfo.permanent) transformed.addressInfo.permanent = {};
    
    if (data.address.street) transformed.addressInfo.permanent.street = data.address.street;
    if (data.address.city) transformed.addressInfo.permanent.city = data.address.city;
    if (data.address.state) transformed.addressInfo.permanent.state = data.address.state;
    if (data.address.country) transformed.addressInfo.permanent.country = data.address.country;
    if (data.address.pincode) transformed.addressInfo.permanent.pincode = data.address.pincode;

    delete transformed.address;
  }

  // NEW: Allow directly provided flat personal fields (firstName/lastName) without wrapping
  if ((data.firstName || data.lastName) && !data.personalInfo) {
    if (!transformed.personalInfo) transformed.personalInfo = {};
    if (data.firstName) transformed.personalInfo.firstName = data.firstName;
    if (data.lastName) transformed.personalInfo.lastName = data.lastName;
    delete transformed.firstName;
    delete transformed.lastName;
  }

  // NEW: Allow directly provided primaryEmail / primaryPhone at root level (legacy forms)
  if ((data.primaryEmail || data.primaryPhone) && !data.contactInfo) {
    if (!transformed.contactInfo) transformed.contactInfo = {};
    if (data.primaryEmail) transformed.contactInfo.primaryEmail = data.primaryEmail;
    if (data.primaryPhone) transformed.contactInfo.primaryPhone = data.primaryPhone;
    delete transformed.primaryEmail;
    delete transformed.primaryPhone;
  }

  // NEW: Support flat company fields (companyName, designation, department) sometimes sent by forms
  if ((data.companyName || data.designation || data.department) && !data.professionalInfo) {
    if (!transformed.professionalInfo) transformed.professionalInfo = {};
    if (data.companyName) transformed.professionalInfo.companyName = data.companyName;
    if (data.designation) transformed.professionalInfo.designation = data.designation;
    if (data.department) transformed.professionalInfo.department = data.department;
    delete transformed.companyName;
    delete transformed.designation;
    delete transformed.department;
  }

  // Handle company transformation
  if (data.company) {
    if (!transformed.professionalInfo) transformed.professionalInfo = {};
    
    if (data.company.name) transformed.professionalInfo.companyName = data.company.name;
    if (data.company.designation) transformed.professionalInfo.designation = data.company.designation;
    if (data.company.department) transformed.professionalInfo.department = data.company.department;

    delete transformed.company;
  }

    console.log('✅ Data transformation completed successfully', { 
      outputKeys: Object.keys(transformed),
      hasPersonalInfo: !!transformed.personalInfo,
      hasContactInfo: !!transformed.contactInfo
    });
    
    return transformed;
  } catch (error) {
    console.error('❌ Error in transformToNestedStructure:', error);
    console.error('❌ Input data that caused error:', JSON.stringify(data, null, 2));
    throw new Error(`Data transformation failed: ${error.message}`);
  }
}

/**
 * Transform nested structure to flat structure for frontend compatibility
 */
function transformToFlatStructure(profile) {
  const flat = {};

  // Basic fields
  if (profile.personalInfo) {
    if (profile.personalInfo.firstName || profile.personalInfo.lastName) {
      flat.name = `${profile.personalInfo.firstName || ''} ${profile.personalInfo.lastName || ''}`.trim();
    }
    if (profile.personalInfo.bio) flat.bio = profile.personalInfo.bio;
    if (profile.personalInfo.profileImage) flat.profileImage = profile.personalInfo.profileImage;
    if (profile.personalInfo.dateOfBirth) flat.dateOfBirth = profile.personalInfo.dateOfBirth;
    if (profile.personalInfo.gender) flat.gender = profile.personalInfo.gender;
  }

  if (profile.contactInfo) {
    if (profile.contactInfo.primaryEmail) flat.email = profile.contactInfo.primaryEmail;
    if (profile.contactInfo.primaryPhone) flat.phone = profile.contactInfo.primaryPhone;
  }

  // Address - ensure we always return an address object
  flat.address = {
    street: '',
    landmark: '',
    village: '',
    taluka: '',
    district: '',
    city: '',
    state: '',
    country: 'India',
    pincode: ''
  };
  
  if (profile.addressInfo && profile.addressInfo.permanent) {
    flat.address = {
      street: profile.addressInfo.permanent.street || '',
      landmark: profile.addressInfo.permanent.landmark || '',
      village: profile.addressInfo.permanent.village || '',
      taluka: profile.addressInfo.permanent.taluka || '',
      district: profile.addressInfo.permanent.district || '',
      city: profile.addressInfo.permanent.city || '',
      state: profile.addressInfo.permanent.state || '',
      country: profile.addressInfo.permanent.country || 'India',
      pincode: profile.addressInfo.permanent.pincode || ''
    };
  }

  // Company - ensure we always return a company object
  flat.company = {
    name: '',
    designation: '',
    department: ''
  };
  
  if (profile.professionalInfo) {
    flat.company = {
      name: profile.professionalInfo.companyName || '',
      designation: profile.professionalInfo.designation || '',
      department: profile.professionalInfo.department || ''
    };
  }

  return flat;
}

module.exports = profileController;