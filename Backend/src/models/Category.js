const mongoose = require('mongoose');

// Category Schema
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true,
    maxlength: [100, 'Category name cannot exceed 100 characters'],
    minlength: [2, 'Category name must be at least 2 characters long']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  versionKey: false
});

// Add indexes for better performance
categorySchema.index({ name: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ createdAt: -1 });

// SubCategory Schema
const subCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Sub-category name is required'],
    trim: true,
    maxlength: [100, 'Sub-category name cannot exceed 100 characters'],
    minlength: [2, 'Sub-category name must be at least 2 characters long']
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Parent category is required']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  versionKey: false
});

// Compound index to ensure unique sub-category names within a parent category
subCategorySchema.index({ name: 1, parentCategory: 1 }, { unique: true });
subCategorySchema.index({ parentCategory: 1 });
subCategorySchema.index({ isActive: 1 });
subCategorySchema.index({ createdAt: -1 });

// Pre-save middleware to validate parent category exists
subCategorySchema.pre('save', async function(next) {
  if (this.isModified('parentCategory')) {
    const Category = mongoose.model('Category');
    const parentExists = await Category.findOne({ 
      _id: this.parentCategory, 
      isActive: true 
    });
    
    if (!parentExists) {
      return next(new Error('Parent category does not exist or is inactive'));
    }
  }
  next();
});

// Virtual to get sub-categories count for a category
categorySchema.virtual('subCategoriesCount', {
  ref: 'SubCategory',
  localField: '_id',
  foreignField: 'parentCategory',
  count: true,
  match: { isActive: true }
});

// Virtual to populate sub-categories for a category
categorySchema.virtual('subCategories', {
  ref: 'SubCategory',
  localField: '_id',
  foreignField: 'parentCategory',
  match: { isActive: true }
});

// Methods
categorySchema.methods.toJSON = function() {
  const category = this.toObject();
  return category;
};

subCategorySchema.methods.toJSON = function() {
  const subCategory = this.toObject();
  return subCategory;
};

// Static methods for categories
categorySchema.statics.getActiveCategories = function() {
  return this.find({ isActive: true })
    .populate('subCategories')
    .sort({ name: 1 });
};

categorySchema.statics.getCategoryWithSubCategories = function(categoryId) {
  return this.findOne({ _id: categoryId, isActive: true })
    .populate({
      path: 'subCategories',
      match: { isActive: true },
      options: { sort: { name: 1 } }
    });
};

// Static methods for sub-categories
subCategorySchema.statics.getSubCategoriesByParent = function(parentCategoryId) {
  return this.find({ 
    parentCategory: parentCategoryId, 
    isActive: true 
  })
  .populate('parentCategory', 'name')
  .sort({ name: 1 });
};

subCategorySchema.statics.getActiveSubCategories = function() {
  return this.find({ isActive: true })
    .populate('parentCategory', 'name')
    .sort({ name: 1 });
};

const Category = mongoose.model('Category', categorySchema);
const SubCategory = mongoose.model('SubCategory', subCategorySchema);

module.exports = {
  Category,
  SubCategory
};