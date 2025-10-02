const mongoose = require('mongoose');
const validator = require('validator');

/**
 * =============================================
 * 📋 COMPREHENSIVE PROFILE SCHEMA
 * =============================================
 * This schema combines personal, business, shop, and professional information
 * into a unified profile system with proper validation and relationships.
 */

const profileSchema = new mongoose.Schema({
  // ============================================
  // 👤 USER REFERENCE AND BASIC INFO
  // ============================================
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  profileType: {
    type: String,
    enum: ['personal', 'business', 'shop', 'professional'],
    default: 'personal',
    required: true
  },
  isComplete: {
    type: Boolean,
    default: false
  },
  completionPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  // ============================================
  // 👨‍💼 PERSONAL INFORMATION
  // ============================================
  personalInfo: {
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
      validate: {
        validator: function (value) {
          if (!value) return true;
          return /^[a-zA-Z\s]+$/.test(value);
        },
        message: "First name can only contain letters and spaces",
      },
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
      validate: {
        validator: function (value) {
          if (!value) return true;
          return /^[a-zA-Z\s]+$/.test(value);
        },
        message: "Last name can only contain letters and spaces",
      },
    },
    middleName: {
      type: String,
      trim: true,
      maxlength: [50, "Middle name cannot exceed 50 characters"],
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [100, "Display name cannot exceed 100 characters"],
    },
    dateOfBirth: {
      type: Date,
      validate: {
        validator: function (value) {
          if (!value) return true;
          const age = Math.floor((Date.now() - value.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          return age >= 16 && age <= 100;
        },
        message: "Age must be between 16 and 100 years",
      },
    },
    gender: {
      type: String,
      enum: {
        values: ["male", "female", "other", "prefer-not-to-say"],
        message: "Gender must be one of: male, female, other, prefer-not-to-say",
      },
    },
    maritalStatus: {
      type: String,
      enum: ["single", "married", "divorced", "widowed", "prefer-not-to-say"],
    },
    nationality: {
      type: String,
      trim: true,
      default: "Indian",
      maxlength: [50, "Nationality cannot exceed 50 characters"],
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [1000, "Bio cannot exceed 1000 characters"],
    },
    profileImage: {
      type: String,
      validate: {
        validator: function (value) {
          if (!value) return true;
          // Allow relative paths starting with /uploads/
          if (/^\/uploads\//.test(value)) return true;
          // Allow localhost URLs and other valid URLs
          if (value.startsWith('http://localhost:') || value.startsWith('https://localhost:')) return true;
          // Validate other URLs with more permissive options
          return validator.isURL(value, { 
            protocols: ['http', 'https'], 
            require_protocol: true,
            allow_localhost: true 
          });
        },
        message: "Profile image must be a valid URL or file path",
      },
    },
    coverImage: {
      type: String,
      validate: {
        validator: function (value) {
          if (!value) return true;
          // Allow relative paths starting with /uploads/
          if (/^\/uploads\//.test(value)) return true;
          // Allow localhost URLs and other valid URLs
          if (value.startsWith('http://localhost:') || value.startsWith('https://localhost:')) return true;
          // Validate other URLs with more permissive options
          return validator.isURL(value, { 
            protocols: ['http', 'https'], 
            require_protocol: true,
            allow_localhost: true 
          });
        },
        message: "Cover image must be a valid URL or file path",
      },
    }
  },

  // ============================================
  // 📞 CONTACT INFORMATION
  // ============================================
  contactInfo: {
    primaryEmail: {
      type: String,
      required: function() {
        // Only require if this is a new profile or contactInfo is being explicitly set
        return this.isNew || (this.contactInfo && this.contactInfo.primaryEmail !== undefined);
      },
      lowercase: true,
      trim: true,
      maxlength: [254, "Email is too long"],
      validate: {
        validator: function (value) {
          if (!value) return true; // Allow empty values for partial updates
          return validator.isEmail(value);
        },
        message: "Please enter a valid email address",
      },
    },
    alternateEmail: {
      type: String,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return validator.isEmail(value);
        },
        message: "Please enter a valid alternate email address",
      },
    },
    primaryPhone: {
      type: String,
      required: function() {
        // Only require if this is a new profile or contactInfo is being explicitly set
        return this.isNew || (this.contactInfo && this.contactInfo.primaryPhone !== undefined);
      },
      trim: true,
      validate: {
        validator: function (value) {
          if (!value) return true; // Allow empty values for partial updates
          return /^[6-9]\d{9}$/.test(value);
        },
        message: "Primary phone must be a valid 10-digit Indian mobile number",
      },
    },
    alternatePhone: {
      type: String,
      trim: true,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return /^[6-9]\d{9}$/.test(value);
        },
        message: "Alternate phone must be a valid 10-digit Indian mobile number",
      },
    },
    whatsappNumber: {
      type: String,
      trim: true,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return /^[6-9]\d{9}$/.test(value);
        },
        message: "WhatsApp number must be a valid 10-digit Indian mobile number",
      },
    },
    linkedinProfile: {
      type: String,
      trim: true,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return /^https:\/\/(www\.)?linkedin\.com\/in\//.test(value);
        },
        message: "LinkedIn URL must be a valid LinkedIn profile URL",
      },
    },
    website: {
      type: String,
      trim: true,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return validator.isURL(value);
        },
        message: "Website must be a valid URL",
      },
    }
  },

  // ============================================
  // 🏠 ADDRESS INFORMATION
  // ============================================
  addressInfo: {
    permanent: {
      street: {
        type: String,
        trim: true,
        maxlength: [200, "Street address cannot exceed 200 characters"],
      },
      landmark: {
        type: String,
        trim: true,
        maxlength: [100, "Landmark cannot exceed 100 characters"],
      },
      village: {
        type: String,
        trim: true,
        maxlength: [100, "Village cannot exceed 100 characters"],
      },
      taluka: {
        type: String,
        trim: true,
        maxlength: [100, "Taluka cannot exceed 100 characters"],
      },
      district: {
        type: String,
        trim: true,
        maxlength: [100, "District cannot exceed 100 characters"],
      },
      city: {
        type: String,
        trim: true,
        maxlength: [100, "City cannot exceed 100 characters"],
      },
      state: {
        type: String,
        trim: true,
        maxlength: [100, "State cannot exceed 100 characters"],
        enum: {
          values: [
            'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
            'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
            'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
            'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
            'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
            'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
            'Lakshadweep', 'Puducherry', 'Andaman and Nicobar Islands'
          ],
          message: "Please select a valid Indian state/UT"
        }
      },
      pincode: {
        type: String,
        trim: true,
        validate: {
          validator: function (value) {
            if (!value) return true;
            return /^[1-9][0-9]{5}$/.test(value);
          },
          message: "Pincode must be a valid 6-digit Indian postal code",
        },
      },
      country: {
        type: String,
        trim: true,
        default: "India",
        maxlength: [100, "Country cannot exceed 100 characters"],
      },
    },
    current: {
      street: {
        type: String,
        trim: true,
        maxlength: [200, "Street address cannot exceed 200 characters"],
      },
      landmark: {
        type: String,
        trim: true,
        maxlength: [100, "Landmark cannot exceed 100 characters"],
      },
      village: {
        type: String,
        trim: true,
        maxlength: [100, "Village cannot exceed 100 characters"],
      },
      taluka: {
        type: String,
        trim: true,
        maxlength: [100, "Taluka cannot exceed 100 characters"],
      },
      district: {
        type: String,
        trim: true,
        maxlength: [100, "District cannot exceed 100 characters"],
      },
      city: {
        type: String,
        trim: true,
        maxlength: [100, "City cannot exceed 100 characters"],
      },
      state: {
        type: String,
        trim: true,
        maxlength: [100, "State cannot exceed 100 characters"],
        enum: {
          values: [
            'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
            'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
            'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
            'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
            'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
            'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
            'Lakshadweep', 'Puducherry', 'Andaman and Nicobar Islands'
          ],
          message: "Please select a valid Indian state/UT"
        }
      },
      pincode: {
        type: String,
        trim: true,
        validate: {
          validator: function (value) {
            if (!value) return true;
            return /^[1-9][0-9]{5}$/.test(value);
          },
          message: "Pincode must be a valid 6-digit Indian postal code",
        },
      },
      country: {
        type: String,
        trim: true,
        default: "India",
        maxlength: [100, "Country cannot exceed 100 characters"],
      },
    },
    isSameAddress: {
      type: Boolean,
      default: true
    }
  },

  // ============================================
  // 💼 PROFESSIONAL INFORMATION
  // ============================================
  professionalInfo: {
    designation: {
      type: String,
      trim: true,
      maxlength: [100, "Designation cannot exceed 100 characters"],
    },
    department: {
      type: String,
      trim: true,
      maxlength: [100, "Department cannot exceed 100 characters"],
    },
    companyName: {
      type: String,
      trim: true,
      maxlength: [150, "Company name cannot exceed 150 characters"],
    },
    employeeId: {
      type: String,
      trim: true,
      maxlength: [50, "Employee ID cannot exceed 50 characters"],
    },
    joiningDate: {
      type: Date,
    },
    experience: {
      type: Number,
      min: [0, "Experience cannot be negative"],
      max: [50, "Experience cannot exceed 50 years"],
    },
    salary: {
      amount: {
        type: Number,
        min: 0
      },
      currency: {
        type: String,
        enum: ["INR", "USD", "EUR", "GBP"],
        default: "INR"
      }
    },
    skills: [{
      name: {
        type: String,
        trim: true,
        maxlength: [50, "Skill name cannot exceed 50 characters"],
      },
      level: {
        type: String,
        enum: ["beginner", "intermediate", "advanced", "expert"],
        default: "intermediate"
      },
      yearsOfExperience: {
        type: Number,
        min: 0,
        max: 50
      }
    }],
    certifications: [{
      name: {
        type: String,
        trim: true,
        maxlength: [100, "Certification name cannot exceed 100 characters"],
      },
      issuingOrganization: {
        type: String,
        trim: true,
        maxlength: [100, "Issuing organization cannot exceed 100 characters"],
      },
      issueDate: {
        type: Date
      },
      expiryDate: {
        type: Date
      },
      credentialId: {
        type: String,
        trim: true
      },
      credentialUrl: {
        type: String,
        trim: true,
        validate: {
          validator: function (value) {
            if (!value) return true;
            return validator.isURL(value);
          },
          message: "Credential URL must be valid",
        },
      }
    }],
    education: [{
      degree: {
        type: String,
        trim: true,
        maxlength: [100, "Degree cannot exceed 100 characters"],
      },
      institution: {
        type: String,
        trim: true,
        maxlength: [150, "Institution cannot exceed 150 characters"],
      },
      fieldOfStudy: {
        type: String,
        trim: true,
        maxlength: [100, "Field of study cannot exceed 100 characters"],
      },
      startYear: {
        type: Number,
        min: 1950,
        max: new Date().getFullYear()
      },
      endYear: {
        type: Number,
        min: 1950,
        max: new Date().getFullYear() + 10
      },
      percentage: {
        type: Number,
        min: 0,
        max: 100
      },
      cgpa: {
        type: Number,
        min: 0,
        max: 10
      }
    }]
  },

  // ============================================
  // 🏪 BUSINESS INFORMATION
  // ============================================
  businessInfo: {
    // Owner Details
    ownerName: {
      type: String,
      trim: true,
      maxlength: [100, "Owner name cannot exceed 100 characters"],
      validate: {
        validator: function (value) {
          if (!value) return true;
          return /^[a-zA-Z\s]+$/.test(value);
        },
        message: "Owner name can only contain letters and spaces",
      },
    },
    ownerPhone: {
      type: String,
      trim: true,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return /^[6-9]\d{9}$/.test(value);
        },
        message: "Owner phone must be a valid 10-digit Indian mobile number",
      },
    },
    ownerEmail: {
      type: String,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return validator.isEmail(value);
        },
        message: "Owner email must be valid",
      },
    },

    // Business Details
    businessName: {
      type: String,
      trim: true,
      maxlength: [150, "Business name cannot exceed 150 characters"],
    },
    shopName: {
      type: String,
      trim: true,
      maxlength: [150, "Shop name cannot exceed 150 characters"],
    },
    businessCategory: {
      type: [String],
      default: [],
      validate: {
        validator: function(categories) {
          if (!categories || !Array.isArray(categories)) return true;
          const validCategories = [
            'Computer and IT', 'Electronics', 'Electrical', 'Automobiles', 'Textiles', 
            'Food & Beverage', 'Healthcare', 'Real Estate', 'Retail', 'Wholesale', 
            'Manufacturing', 'Services', 'Education', 'Construction', 'Transport', 
            'Agriculture', 'Automotive', 'Software', 'Finance', 'Hospitality', 
            'Beauty & Wellness', 'Sports & Fitness', 'Other'
          ];
          return categories.every(cat => validCategories.includes(cat) || cat.trim().length > 0);
        },
        message: "Please select valid business categories"
      }
    },
    businessCategoryOther: {
      type: String,
      trim: true,
      maxlength: [100, "Custom business category cannot exceed 100 characters"]
    },
    businessType: {
      type: [String],
      default: ['retail'],
      validate: {
        validator: function(types) {
          if (!types || !Array.isArray(types)) return true;
          const validTypes = ['retail', 'wholesale', 'manufacturing', 'service', 'distributor', 'other'];
          return types.every(type => validTypes.includes(type) || type.trim().length > 0);
        },
        message: "Please select valid business types"
      }
    },
    businessTypeOther: {
      type: String,
      trim: true,
      maxlength: [100, "Custom business type cannot exceed 100 characters"]
    },
    businessModel: {
      type: String,
      enum: ['b2b', 'b2c', 'both'],
      default: 'both',
    },
    establishedYear: {
      type: Number,
      min: 1900,
      max: new Date().getFullYear()
    },
    employeeCount: {
      type: Number,
      min: 0,
      default: 1
    },
    businessPhone: {
      type: String,
      trim: true,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return /^[6-9]\d{9}$/.test(value);
        },
        message: "Business phone must be a valid 10-digit Indian mobile number",
      },
    },
    businessEmail: {
      type: String,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return validator.isEmail(value);
        },
        message: "Business email must be valid",
      },
    },
    businessWebsite: {
      type: String,
      trim: true,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return validator.isURL(value);
        },
        message: "Business website must be a valid URL",
      },
    },

    // Registration & Legal Information
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value);
        },
        message: "Invalid GST number format (e.g., 22AAAAA0000A1Z5)",
      },
    },
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value);
        },
        message: "Invalid PAN number format (e.g., ABCDE1234F)",
      },
    },
    licenseNumber: {
      type: String,
      trim: true,
      maxlength: [50, "License number cannot exceed 50 characters"],
    },
    trademarkNumber: {
      type: String,
      trim: true,
      maxlength: [50, "Trademark number cannot exceed 50 characters"],
    },
    cinNumber: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return /^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/.test(value);
        },
        message: "Invalid CIN number format",
      },
    },

    // Business Address
    businessAddress: {
      street: {
        type: String,
        trim: true,
        maxlength: [200, "Street address cannot exceed 200 characters"],
      },
      landmark: {
        type: String,
        trim: true,
        maxlength: [100, "Landmark cannot exceed 100 characters"],
      },
      village: {
        type: String,
        trim: true,
        maxlength: [100, "Village cannot exceed 100 characters"],
      },
      taluka: {
        type: String,
        trim: true,
        maxlength: [100, "Taluka cannot exceed 100 characters"],
      },
      district: {
        type: String,
        trim: true,
        maxlength: [100, "District cannot exceed 100 characters"],
      },
      city: {
        type: String,
        trim: true,
        maxlength: [100, "City cannot exceed 100 characters"],
      },
      state: {
        type: String,
        trim: true,
        maxlength: [100, "State cannot exceed 100 characters"],
      },
      pincode: {
        type: String,
        trim: true,
        validate: {
          validator: function (value) {
            if (!value) return true;
            return /^[1-9][0-9]{5}$/.test(value);
          },
          message: "Pincode must be a valid 6-digit Indian postal code",
        },
      },
      country: {
        type: String,
        trim: true,
        default: "India",
        maxlength: [100, "Country cannot exceed 100 characters"],
      },
    },

    // Location Coordinates
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0]
      }
    },

    // Operating Hours
    operatingHours: {
      monday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '18:00' }
      },
      tuesday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '18:00' }
      },
      wednesday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '18:00' }
      },
      thursday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '18:00' }
      },
      friday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '18:00' }
      },
      saturday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '18:00' }
      },
      sunday: {
        isOpen: { type: Boolean, default: false },
        openTime: { type: String, default: '10:00' },
        closeTime: { type: String, default: '17:00' }
      }
    },

    // Services and Products
    services: [{
      name: {
        type: String,
        trim: true,
        maxlength: [100, "Service name cannot exceed 100 characters"],
      },
      description: {
        type: String,
        trim: true,
        maxlength: [500, "Service description cannot exceed 500 characters"],
      },
      price: {
        type: Number,
        min: 0
      },
      isActive: {
        type: Boolean,
        default: true
      }
    }],

    products: [{
      name: {
        type: String,
        trim: true,
        maxlength: [100, "Product name cannot exceed 100 characters"],
      },
      category: {
        type: String,
        trim: true,
        maxlength: [50, "Product category cannot exceed 50 characters"],
      },
      brand: {
        type: String,
        trim: true,
        maxlength: [50, "Brand name cannot exceed 50 characters"],
      },
      price: {
        type: Number,
        min: 0
      },
      inStock: {
        type: Boolean,
        default: true
      },
      isActive: {
        type: Boolean,
        default: true
      }
    }],

    // Payment Methods
    paymentMethods: {
      cash: {
        type: Boolean,
        default: true
      },
      card: {
        type: Boolean,
        default: false
      },
      upi: {
        type: Boolean,
        default: false
      },
      netBanking: {
        type: Boolean,
        default: false
      },
      creditFacility: {
        type: Boolean,
        default: false
      },
      emi: {
        type: Boolean,
        default: false
      }
    },

    // Delivery Information
    delivery: {
      homeDelivery: {
        type: Boolean,
        default: false
      },
      deliveryRadius: {
        type: Number,
        min: 0,
        default: 0,
        max: 100
      },
      deliveryCharge: {
        type: Number,
        min: 0,
        default: 0
      },
      freeDeliveryAbove: {
        type: Number,
        min: 0
      },
      estimatedDeliveryTime: {
        type: String,
        trim: true,
        maxlength: [50, "Delivery time cannot exceed 50 characters"],
      }
    },

    // Business Images
    images: {
      logo: {
        type: String,
        validate: {
          validator: function (value) {
            if (!value) return true;
            return validator.isURL(value) || /^\/uploads\//.test(value);
          },
          message: "Logo must be a valid URL or file path",
        },
      },
      shopFront: {
        type: String,
        validate: {
          validator: function (value) {
            if (!value) return true;
            return validator.isURL(value) || /^\/uploads\//.test(value);
          },
          message: "Shop front image must be a valid URL or file path",
        },
      },
      interior: [{
        type: String,
        validate: {
          validator: function (value) {
            if (!value) return true;
            return validator.isURL(value) || /^\/uploads\//.test(value);
          },
          message: "Interior image must be a valid URL or file path",
        },
      }],
      products: [{
        type: String,
        validate: {
          validator: function (value) {
            if (!value) return true;
            return validator.isURL(value) || /^\/uploads\//.test(value);
          },
          message: "Product image must be a valid URL or file path",
        },
      }]
    },

    // Special Offers
    specialOffers: [{
      title: {
        type: String,
        trim: true,
        maxlength: [100, "Offer title cannot exceed 100 characters"],
      },
      description: {
        type: String,
        trim: true,
        maxlength: [500, "Offer description cannot exceed 500 characters"],
      },
      discountPercentage: {
        type: Number,
        min: 0,
        max: 100
      },
      validFrom: {
        type: Date,
        default: Date.now
      },
      validUntil: {
        type: Date
      },
      isActive: {
        type: Boolean,
        default: true
      }
    }],

    // Business Status
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'in-review'],
      default: 'pending'
    },
    verificationDate: {
      type: Date
    },
    verificationDocuments: [{
      documentType: {
        type: String,
        enum: ['gst-certificate', 'pan-card', 'license', 'incorporation-certificate', 'other'],
        required: true
      },
      documentUrl: {
        type: String,
        required: true
      },
      uploadDate: {
        type: Date,
        default: Date.now
      }
    }]
  },

  // ============================================
  // 🌐 SOCIAL MEDIA & ONLINE PRESENCE
  // ============================================
  socialMedia: {
    facebook: {
      type: String,
      trim: true,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return /^https:\/\/(www\.)?facebook\.com\//.test(value);
        },
        message: "Facebook URL must be a valid Facebook profile/page URL",
      },
    },
    instagram: {
      type: String,
      trim: true,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return /^https:\/\/(www\.)?instagram\.com\//.test(value);
        },
        message: "Instagram URL must be a valid Instagram profile URL",
      },
    },
    twitter: {
      type: String,
      trim: true,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return /^https:\/\/(www\.)?twitter\.com\//.test(value);
        },
        message: "Twitter URL must be a valid Twitter profile URL",
      },
    },
    youtube: {
      type: String,
      trim: true,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return /^https:\/\/(www\.)?youtube\.com\//.test(value);
        },
        message: "YouTube URL must be a valid YouTube channel URL",
      },
    },
    whatsapp: {
      type: String,
      trim: true,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return /^[6-9]\d{9}$/.test(value);
        },
        message: "WhatsApp number must be a valid 10-digit number",
      },
    },
    googleMaps: {
      type: String,
      trim: true,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return /^https:\/\/(www\.)?google\.com\/maps/.test(value);
        },
        message: "Google Maps URL must be a valid Google Maps URL",
      },
    }
  },

  // ============================================
  // 🚨 EMERGENCY CONTACT
  // ============================================
  emergencyContact: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, "Emergency contact name cannot exceed 100 characters"],
    },
    relationship: {
      type: String,
      trim: true,
      enum: ["parent", "spouse", "sibling", "friend", "colleague", "relative", "other"],
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return /^[6-9]\d{9}$/.test(value);
        },
        message: "Emergency contact phone must be a valid 10-digit Indian mobile number",
      },
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return validator.isEmail(value);
        },
        message: "Emergency contact email must be valid",
      },
    },
    address: {
      type: String,
      trim: true,
      maxlength: [300, "Emergency contact address cannot exceed 300 characters"],
    }
  },

  // ============================================
  // ⚙️ PREFERENCES & SETTINGS
  // ============================================
  preferences: {
    language: {
      type: String,
      enum: {
        values: ["english", "hindi", "gujarati", "marathi", "tamil", "telugu", "kannada", "bengali", "punjabi", "malayalam"],
        message: "Language must be a supported language",
      },
      default: "english",
    },
    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },
    currency: {
      type: String,
      default: "INR",
      enum: {
        values: ["INR", "USD", "EUR", "GBP"],
        message: "Currency must be one of: INR, USD, EUR, GBP",
      },
    },
    theme: {
      type: String,
      enum: {
        values: ["light", "dark", "auto"],
        message: "Theme must be one of: light, dark, auto",
      },
      default: "light",
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      whatsapp: {
        type: Boolean,
        default: false
      }
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: ["public", "private", "connections-only"],
        default: "connections-only"
      },
      showEmail: {
        type: Boolean,
        default: false
      },
      showPhone: {
        type: Boolean,
        default: false
      },
      showAddress: {
        type: Boolean,
        default: false
      }
    }
  },

  // ============================================
  // 📊 METADATA & TRACKING
  // ============================================
  metadata: {
    lastProfileUpdate: {
      type: Date,
      default: Date.now
    },
    profileViews: {
      type: Number,
      default: 0
    },
    searchKeywords: [{
      type: String,
      trim: true
    }],
    tags: [{
      type: String,
      trim: true,
      maxlength: [30, "Tag cannot exceed 30 characters"],
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    isPremium: {
      type: Boolean,
      default: false
    },
    verificationScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================
// 📍 INDEXES FOR PERFORMANCE
// ============================================
profileSchema.index({ userId: 1 }, { unique: true });
profileSchema.index({ profileType: 1 });
profileSchema.index({ 'businessInfo.businessCategory': 1 });
profileSchema.index({ 'addressInfo.permanent.state': 1 });
profileSchema.index({ 'addressInfo.permanent.city': 1 });
profileSchema.index({ 'addressInfo.permanent.pincode': 1 });
profileSchema.index({ 'businessInfo.businessAddress.state': 1 });
profileSchema.index({ 'businessInfo.businessAddress.city': 1 });
profileSchema.index({ 'businessInfo.businessAddress.pincode': 1 });
profileSchema.index({ 'businessInfo.location': '2dsphere' });
profileSchema.index({ 'metadata.isActive': 1 });
profileSchema.index({ 'metadata.isFeatured': 1 });
profileSchema.index({ 'metadata.isPremium': 1 });
profileSchema.index({ 'businessInfo.isVerified': 1 });
profileSchema.index({ 'personalInfo.firstName': 'text', 'personalInfo.lastName': 'text', 'businessInfo.businessName': 'text', 'businessInfo.shopName': 'text' });

// ============================================
// 🔧 VIRTUAL FIELDS
// ============================================

// Full name virtual
profileSchema.virtual('fullName').get(function() {
  const { firstName, lastName, middleName } = this.personalInfo || {};
  return [firstName, middleName, lastName].filter(Boolean).join(' ').trim();
});

// Full address virtual for permanent address
profileSchema.virtual('permanentFullAddress').get(function() {
  const addr = this.addressInfo?.permanent;
  if (!addr) return '';
  return [
    addr.street,
    addr.landmark,
    addr.village,
    addr.taluka,
    addr.district,
    addr.city,
    addr.state,
    addr.pincode,
    addr.country
  ].filter(Boolean).join(', ');
});

// Full address virtual for current address
profileSchema.virtual('currentFullAddress').get(function() {
  const addr = this.addressInfo?.current;
  if (!addr) return '';
  return [
    addr.street,
    addr.landmark,
    addr.village,
    addr.taluka,
    addr.district,
    addr.city,
    addr.state,
    addr.pincode,
    addr.country
  ].filter(Boolean).join(', ');
});

// Business full address virtual
profileSchema.virtual('businessFullAddress').get(function() {
  const addr = this.businessInfo?.businessAddress;
  if (!addr) return '';
  return [
    addr.street,
    addr.landmark,
    addr.village,
    addr.taluka,
    addr.district,
    addr.city,
    addr.state,
    addr.pincode,
    addr.country
  ].filter(Boolean).join(', ');
});

// Age calculation virtual
profileSchema.virtual('age').get(function() {
  if (!this.personalInfo?.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.personalInfo.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// ============================================
// 🔄 MIDDLEWARE
// ============================================

// Pre-save middleware to calculate completion percentage
profileSchema.pre('save', function(next) {
  this.completionPercentage = this.calculateCompletionPercentage();
  this.metadata.lastProfileUpdate = new Date();
  
  // Auto-copy current address from permanent if same address is true
  if (this.addressInfo?.isSameAddress && this.addressInfo?.permanent) {
    this.addressInfo.current = { ...this.addressInfo.permanent };
  }
  
  next();
});

// ============================================
// 📋 INSTANCE METHODS
// ============================================

// Calculate profile completion percentage
profileSchema.methods.calculateCompletionPercentage = function() {
  let totalFields = 0;
  let completedFields = 0;

  // Personal Info fields (30% weight)
  const personalFields = [
    'personalInfo.firstName',
    'personalInfo.lastName',
    'personalInfo.dateOfBirth',
    'personalInfo.gender',
    'personalInfo.bio',
    'personalInfo.profileImage'
  ];
  
  personalFields.forEach(field => {
    totalFields++;
    if (this.get(field)) completedFields++;
  });

  // Contact Info fields (25% weight)
  const contactFields = [
    'contactInfo.primaryEmail',
    'contactInfo.primaryPhone',
    'contactInfo.alternatePhone',
    'contactInfo.whatsappNumber',
    'contactInfo.website'
  ];
  
  contactFields.forEach(field => {
    totalFields++;
    if (this.get(field)) completedFields++;
  });

  // Address fields (20% weight)
  const addressFields = [
    'addressInfo.permanent.street',
    'addressInfo.permanent.city',
    'addressInfo.permanent.state',
    'addressInfo.permanent.pincode'
  ];
  
  addressFields.forEach(field => {
    totalFields++;
    if (this.get(field)) completedFields++;
  });

  // Professional/Business fields (25% weight)
  if (this.profileType === 'business' || this.profileType === 'shop') {
    const businessFields = [
      'businessInfo.businessName',
      'businessInfo.businessCategory',
      'businessInfo.ownerName',
      'businessInfo.businessPhone',
      'businessInfo.businessEmail',
      'businessInfo.businessAddress.street',
      'businessInfo.businessAddress.city',
      'businessInfo.businessAddress.state',
      'businessInfo.businessAddress.pincode'
    ];
    
    businessFields.forEach(field => {
      totalFields++;
      if (this.get(field)) completedFields++;
    });
  } else {
    const professionalFields = [
      'professionalInfo.designation',
      'professionalInfo.companyName',
      'professionalInfo.experience',
      'professionalInfo.skills'
    ];
    
    professionalFields.forEach(field => {
      totalFields++;
      if (this.get(field) && (!Array.isArray(this.get(field)) || this.get(field).length > 0)) {
        completedFields++;
      }
    });
  }

  return totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
};

// Check if profile is complete
profileSchema.methods.isProfileComplete = function() {
  return this.completionPercentage >= 80; // Consider 80% as complete
};

// Get profile summary
profileSchema.methods.getProfileSummary = function() {
  return {
    id: this._id,
    userId: this.userId,
    profileType: this.profileType,
    fullName: this.fullName,
    displayName: this.personalInfo?.displayName || this.fullName,
    email: this.contactInfo?.primaryEmail,
    phone: this.contactInfo?.primaryPhone,
    profileImage: this.personalInfo?.profileImage,
    businessName: this.businessInfo?.businessName || this.businessInfo?.shopName,
    businessCategory: this.businessInfo?.businessCategory,
    location: this.businessInfo?.businessAddress?.city || this.addressInfo?.permanent?.city,
    completionPercentage: this.completionPercentage,
    isComplete: this.isComplete,
    isVerified: this.businessInfo?.isVerified || false,
    lastUpdated: this.metadata?.lastProfileUpdate || this.updatedAt
  };
};

// ============================================
// 🗂️ STATIC METHODS
// ============================================

// Find profiles by location
profileSchema.statics.findByLocation = function(state, city, limit = 10) {
  const query = {
    'metadata.isActive': true,
    $or: [
      { 'addressInfo.permanent.state': state, 'addressInfo.permanent.city': city },
      { 'businessInfo.businessAddress.state': state, 'businessInfo.businessAddress.city': city }
    ]
  };
  
  return this.find(query)
    .select('personalInfo.firstName personalInfo.lastName businessInfo.businessName businessInfo.businessCategory contactInfo.primaryEmail contactInfo.primaryPhone')
    .limit(limit)
    .sort({ 'metadata.lastProfileUpdate': -1 });
};

// Find business profiles by category
profileSchema.statics.findBusinessByCategory = function(category, limit = 10) {
  return this.find({
    'businessInfo.businessCategory': category,
    'metadata.isActive': true,
    profileType: { $in: ['business', 'shop'] }
  })
  .select('businessInfo.businessName businessInfo.shopName businessInfo.businessCategory businessInfo.businessAddress contactInfo.primaryPhone businessInfo.businessPhone')
  .limit(limit)
  .sort({ 'businessInfo.isVerified': -1, 'metadata.lastProfileUpdate': -1 });
};

// Search profiles
profileSchema.statics.searchProfiles = function(searchTerm, filters = {}) {
  const query = {
    'metadata.isActive': true,
    $text: { $search: searchTerm }
  };
  
  // Apply filters
  if (filters.profileType) {
    query.profileType = filters.profileType;
  }
  
  if (filters.businessCategory) {
    query['businessInfo.businessCategory'] = filters.businessCategory;
  }
  
  if (filters.location) {
    query.$or = [
      { 'addressInfo.permanent.city': { $regex: filters.location, $options: 'i' } },
      { 'businessInfo.businessAddress.city': { $regex: filters.location, $options: 'i' } }
    ];
  }
  
  return this.find(query)
    .select('personalInfo businessInfo.businessName businessInfo.businessCategory contactInfo.primaryEmail contactInfo.primaryPhone metadata.verificationScore')
    .sort({ score: { $meta: 'textScore' }, 'metadata.verificationScore': -1 })
    .limit(20);
};

module.exports = mongoose.model('Profile', profileSchema);