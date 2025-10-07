const mongoose = require("mongoose");

const newUPIDetailsSchema = new mongoose.Schema(
  {
    // Company reference
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // UPI Information (matching AddUPIForm fields)
    upiId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v) {
          return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(v);
        },
        message: "Please enter a valid UPI ID format"
      }
    },
    
    providerName: {
      type: String,
      required: true,
      trim: true,
      enum: ['paytm', 'googlepay', 'phonepe', 'amazonpay', 'bharatpe', 'mobikwik', 'freecharge', 'airtel', 'jio', 'sbi', 'hdfc', 'icici', 'axis', 'other'],
    },
    
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    
    linkedBankAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NewBankDetails", // Reference to the new bank details collection
      required: true,
    },
    
    qrCodeData: {
      type: String,
      trim: true,
    },
    
    qrCodeImage: {
      type: String, // Store image path or base64 data
      trim: true,
    },

    // Additional UPI specific fields
    mobileNumber: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          if (!v) return true; // Optional field
          return /^[6-9]\d{9}$/.test(v);
        },
        message: "Please enter a valid mobile number (10 digits starting with 6-9)"
      }
    },

    // Status and tracking
    isActive: {
      type: Boolean,
      default: true,
    },
    
    // Audit fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Make optional since user might not be available in all contexts
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: 'newupidetails', // Explicitly set collection name
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
newUPIDetailsSchema.index({ companyId: 1, upiId: 1 }, { unique: true });
newUPIDetailsSchema.index({ companyId: 1, providerName: 1 });
newUPIDetailsSchema.index({ companyId: 1, isActive: 1 });
newUPIDetailsSchema.index({ linkedBankAccount: 1 });

// Virtual for display with provider
newUPIDetailsSchema.virtual("displayWithProvider").get(function () {
  const providerMap = {
    paytm: 'Paytm',
    googlepay: 'Google Pay',
    phonepe: 'PhonePe',
    amazonpay: 'Amazon Pay',
    bharatpe: 'BharatPe',
    mobikwik: 'MobiKwik',
    freecharge: 'Freecharge',
    airtel: 'Airtel Money',
    jio: 'JioMoney',
    sbi: 'SBI Pay',
    hdfc: 'HDFC Bank',
    icici: 'ICICI Bank',
    axis: 'Axis Bank',
    other: 'Other'
  };
  
  return `${this.displayName} (${providerMap[this.providerName] || this.providerName})`;
});

// Virtual for masked UPI ID
newUPIDetailsSchema.virtual("maskedUpiId").get(function () {
  const [localPart, domain] = this.upiId.split('@');
  if (localPart.length <= 2) return this.upiId;
  return localPart.slice(0, 2) + '*'.repeat(localPart.length - 2) + '@' + domain;
});

// Pre-save middleware
newUPIDetailsSchema.pre("save", function (next) {
  // Generate QR code data if not provided
  if (!this.qrCodeData && this.upiId && this.displayName) {
    this.qrCodeData = `upi://pay?pa=${this.upiId}&pn=${this.displayName}&cu=INR`;
  }
  
  next();
});

// Pre-save validation
newUPIDetailsSchema.pre("save", async function (next) {
  // Check if linked bank account exists and belongs to the same company
  if (this.linkedBankAccount && this.companyId) {
    const NewBankDetails = mongoose.model('NewBankDetails');
    const linkedBank = await NewBankDetails.findOne({
      _id: this.linkedBankAccount,
      companyId: this.companyId
    });
    
    if (!linkedBank) {
      const error = new Error('Linked bank account must belong to the same company');
      return next(error);
    }
  }
  
  next();
});

const NewUPIDetails = mongoose.model("NewUPIDetails", newUPIDetailsSchema);

module.exports = NewUPIDetails;