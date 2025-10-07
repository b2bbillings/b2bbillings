const mongoose = require("mongoose");

const newBankDetailsSchema = new mongoose.Schema(
  {
    // Company reference
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // Basic Bank Information (matching AddBankAccountForm fields)
    bankName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    
    accountNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
      validate: {
        validator: function(v) {
          return /^\d{9,18}$/.test(v);
        },
        message: "Account number must be between 9-18 digits"
      }
    },
    
    accountHolderName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    
    accountType: {
      type: String,
      required: true,
      enum: ['Savings', 'Current', 'Fixed Deposit', 'Recurring Deposit', 'NRI Account', 'Joint Account'],
      default: 'Savings',
    },
    
    ifscCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      validate: {
        validator: function(v) {
          return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v);
        },
        message: "Please enter a valid IFSC code format"
      }
    },
    
    branchName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    
    branchAddress: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
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
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: 'newbankdetails', // Explicitly set collection name
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
newBankDetailsSchema.index({ companyId: 1, bankName: 1 });
newBankDetailsSchema.index({ companyId: 1, accountNumber: 1 }, { unique: true });
newBankDetailsSchema.index({ companyId: 1, isActive: 1 });
newBankDetailsSchema.index({ ifscCode: 1 });

// Virtual for display name
newBankDetailsSchema.virtual("displayName").get(function () {
  return `${this.bankName} - ${this.accountType} (${this.accountNumber.slice(-4)})`;
});

// Virtual for masked account number
newBankDetailsSchema.virtual("maskedAccountNumber").get(function () {
  const accountNumber = this.accountNumber;
  if (accountNumber.length <= 4) return accountNumber;
  return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4);
});

// Pre-save middleware
newBankDetailsSchema.pre("save", function (next) {
  // Uppercase IFSC code
  if (this.ifscCode) {
    this.ifscCode = this.ifscCode.toUpperCase();
  }
  
  // Remove spaces from account number
  if (this.accountNumber) {
    this.accountNumber = this.accountNumber.replace(/\s/g, '');
  }
  
  next();
});

const NewBankDetails = mongoose.model("NewBankDetails", newBankDetailsSchema);

module.exports = NewBankDetails;