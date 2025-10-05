const mongoose = require('mongoose');

const expenseCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true,
    maxLength: [50, 'Category name cannot exceed 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxLength: [200, 'Description cannot exceed 200 characters']
  },
  color: {
    type: String,
    default: '#6c757d',
    match: [/^#[0-9A-F]{6}$/i, 'Please provide a valid hex color code']
  },
  icon: {
    type: String,
    default: '💰'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0,
    min: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user ID is required']
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company ID is required']
  }
}, {
  timestamps: true
});

// Index for efficient queries
expenseCategorySchema.index({ companyId: 1, isActive: 1 });
expenseCategorySchema.index({ name: 1, companyId: 1 }, { unique: true });

// Static method to get active categories
expenseCategorySchema.statics.getActiveCategories = function(companyId) {
  return this.find({
    companyId,
    isActive: true
  }).sort({ isDefault: -1, usageCount: -1, name: 1 });
};

// Method to increment usage count
expenseCategorySchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  return this.save();
};

// Static method to create default categories
expenseCategorySchema.statics.createDefaultCategories = async function(companyId, createdBy) {
  const defaultCategories = [
    { name: 'Office Supplies', description: 'Stationery, equipment, and office materials', color: '#007bff', icon: '🏢', isDefault: true },
    { name: 'Travel & Transport', description: 'Business travel, fuel, and transportation costs', color: '#28a745', icon: '🚗', isDefault: true },
    { name: 'Meals & Entertainment', description: 'Business meals and client entertainment', color: '#ffc107', icon: '🍽️', isDefault: true },
    { name: 'Utilities', description: 'Electricity, water, internet, and phone bills', color: '#17a2b8', icon: '⚡', isDefault: true },
    { name: 'Marketing & Advertising', description: 'Promotional activities and advertising costs', color: '#dc3545', icon: '📢', isDefault: true },
    { name: 'Professional Services', description: 'Legal, accounting, and consulting fees', color: '#6f42c1', icon: '👨‍💼', isDefault: true },
    { name: 'Rent & Facilities', description: 'Office rent and facility maintenance', color: '#fd7e14', icon: '🏠', isDefault: true },
    { name: 'Insurance', description: 'Business insurance premiums', color: '#20c997', icon: '🛡️', isDefault: true },
    { name: 'Software & Subscriptions', description: 'Software licenses and subscription services', color: '#6610f2', icon: '💻', isDefault: true },
    { name: 'Miscellaneous', description: 'Other business expenses', color: '#6c757d', icon: '📝', isDefault: true }
  ];

  const categories = defaultCategories.map(cat => ({
    ...cat,
    companyId,
    createdBy
  }));

  return this.insertMany(categories);
};

module.exports = mongoose.model('ExpenseCategory', expenseCategorySchema);