const mongoose = require('mongoose');

const incomeCategorySchema = new mongoose.Schema({
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
    default: '#28a745',
    match: [/^#[0-9A-F]{6}$/i, 'Please provide a valid hex color code']
  },
  icon: {
    type: String,
    default: '💚'
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
incomeCategorySchema.index({ companyId: 1, isActive: 1 });
incomeCategorySchema.index({ name: 1, companyId: 1 }, { unique: true });

// Static method to get active categories
incomeCategorySchema.statics.getActiveCategories = function(companyId) {
  return this.find({
    companyId,
    isActive: true
  }).sort({ isDefault: -1, usageCount: -1, name: 1 });
};

// Method to increment usage count
incomeCategorySchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  return this.save();
};

// Static method to create default categories
incomeCategorySchema.statics.createDefaultCategories = async function(companyId, createdBy) {
  const defaultCategories = [
    { name: 'Freelancing', description: 'Income from freelance projects and services', color: '#007bff', icon: '💼', isDefault: true },
    { name: 'Investments', description: 'Returns from stocks, bonds, and other investments', color: '#28a745', icon: '📈', isDefault: true },
    { name: 'Rental Income', description: 'Income from property rentals', color: '#ffc107', icon: '🏠', isDefault: true },
    { name: 'Consulting', description: 'Income from consulting services', color: '#17a2b8', icon: '🎯', isDefault: true },
    { name: 'Royalties', description: 'Income from intellectual property rights', color: '#dc3545', icon: '👑', isDefault: true },
    { name: 'Interest Income', description: 'Interest from savings and deposits', color: '#6f42c1', icon: '🏦', isDefault: true },
    { name: 'Side Business', description: 'Income from side business ventures', color: '#fd7e14', icon: '🚀', isDefault: true },
    { name: 'Online Sales', description: 'Income from e-commerce and online sales', color: '#20c997', icon: '🛒', isDefault: true },
    { name: 'Coaching & Training', description: 'Income from teaching and training services', color: '#6610f2', icon: '🎓', isDefault: true },
    { name: 'Other Income', description: 'Other sources of indirect income', color: '#28a745', icon: '💰', isDefault: true }
  ];

  const categories = defaultCategories.map(cat => ({
    ...cat,
    companyId,
    createdBy
  }));

  return this.insertMany(categories);
};

module.exports = mongoose.model('IncomeCategory', incomeCategorySchema);